import http from "http";
import jwt from "jsonwebtoken";
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { agent } from "./graph/graph.ts";
import { summarizeConversation } from "./memory/summarize.ts";
import type { StateType } from "./graph/state.ts";
import { saveChatHistory } from "./memory/saveChatHistory.ts";

const PORT = 3001;

function parseCookies(req: http.IncomingMessage) {
  const raw = req.headers.cookie;
  if (!raw) return {};
  return Object.fromEntries(
    raw.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    }),
  );
}

function writeSseData(res: http.ServerResponse, data: string) {
  const safe = data.replace(/\n/g, "\n\n");
  res.write(`data: ${safe}\n\n`);
}

function getFirstInterrupt(snapshot: any) {
  const interrupts = snapshot?.tasks?.flatMap(
    (task: any) => task?.interrupts ?? [],
  );
  return interrupts?.[0]?.value ?? null;
}

http
  .createServer(async (req, res) => {
    if (!req.url?.startsWith("/chat/stream")) {
      res.writeHead(404);
      res.end();
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const q = url.searchParams.get("q") ?? "";

    const cookies = parseCookies(req);
    const token = cookies.access_token;
    const session_id = cookies.chatbot_session || null;

    let email: string | null = null;
    let userId: number | null = null;
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_KEY!);
        email = decoded.email ?? null;

        const rawUserId =
          decoded.id ??
          decoded.user_id ??
          decoded.customer_id ??
          decoded.sub ??
          null;
        const parsedUserId = Number(rawUserId);
        userId = Number.isFinite(parsedUserId) ? parsedUserId : null;
      } catch {
        // token invalid, fallback guest
      }
    }

    console.log("EMAIL", email);
    console.log("USER_ID", userId);
    console.log("SESSION_ID", session_id);

    const threadId = email ?? session_id;
    const user = email && userId ? { id: userId, email } : null;

    console.log("THREAD_ID", threadId);
    const origin = req.headers.origin;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": origin ?? "http://localhost:3000",
      "Access-Control-Allow-Credentials": "true",
    });

    let finalState: any = null;

    try {
      let synthAnswer = "";
      let aiContent = "";
      const config = {
        configurable: { thread_id: threadId },
      };

      if (q === "y" || q === "n") {
        finalState = await agent.invoke(
          new Command({
            resume: q,
            update: {
              user,
              summarizeOnly: false,
            },
          }),
          config,
        );

        const answer =
          finalState?.results?.[0]?.result ??
          finalState?.messages?.[0]?.kwargs?.content ??
          finalState?.messages?.at(-1)?.content ??
          "";

        if (typeof answer === "string" && answer.trim()) {
          aiContent = answer.trim();
          synthAnswer = aiContent;

          console.log("AI content after approval decision:", aiContent);

          writeSseData(res, aiContent);
        }
      } else {
        const stream = agent.streamEvents(
          {
            messages: [new HumanMessage(q)],
            originalUserQuestion: q,
            user,
            summarizeOnly: false,
            finalAnswer: null,
            results: [],
            doneAgents: [],
          },
          {
            ...config,
            version: "v2",
          },
        );

        for await (const event of stream) {
          if (
            event.event === "on_chat_model_stream" &&
            event.metadata?.langgraph_node === "synthesize"
          ) {
            const token = event.data?.chunk?.content ?? "";
            if (token) {
              synthAnswer += token;
              writeSseData(res, token);
            }
          }

          if (
            event.event === "on_chain_end" &&
            event.metadata?.langgraph_node === "synthesize"
          ) {
            finalState = event.data?.output;
          }
        }
      }

      const snapshot = await agent.getState(config);
      const interrupt = getFirstInterrupt(snapshot);
      const interruptQuestion = interrupt?.question;
      const interruptArgs = interrupt?.args ?? {};

      if (!synthAnswer.trim() && interruptQuestion) {
        const orderId = interruptArgs.order_id;
        const confirmationText =
          typeof orderId === "number"
            ? `Bạn có muốn hủy đơn hàng số ${orderId} không?`
            : interruptQuestion;
        aiContent = confirmationText;
        synthAnswer = confirmationText;
        writeSseData(res, confirmationText);
      }

      res.write(`data: [DONE]\n\n`);

      const imageBaseUrl = process.env.IMAGE_BASE_URL ?? "";
      const normalizedProducts = (finalState?.products ?? []).map((p: any) => {
        const raw = p?.image ?? "";
        if (!raw || raw.startsWith("http")) return p;
        if (!imageBaseUrl) return p;
        const cleaned = raw.replace(/^\/+/, "");
        return { ...p, image: `${imageBaseUrl}/${cleaned}` };
      });

      if (normalizedProducts.length) {
        res.write(
          `event: products\ndata: ${JSON.stringify(normalizedProducts)}\n\n`,
        );
      }
      res.end();

      if (q?.trim()) {
        await saveChatHistory({
          email,
          session_id: threadId,
          role: "user",
          content: q.trim(),
        });
      }

      if (synthAnswer?.trim()) {
        const contentPayload =
          q === "y" || q === "n"
            ? aiContent || synthAnswer.trim()
            : JSON.stringify({
                answer: synthAnswer.trim(),
                products: normalizedProducts,
              });
        await saveChatHistory({
          email,
          session_id: threadId,
          role: "ai",
          content: contentPayload,
        });
      }

      const fullValues = snapshot?.values as StateType | undefined;

      console.log("finalState.messages.length", fullValues?.messages.length);

      if (
        fullValues &&
        fullValues.messages?.length > 10 &&
        fullValues.doneAgents?.length > 0 &&
        !fullValues.summarizeOnly
      ) {
        setImmediate(async () => {
          try {
            const update = await summarizeConversation(fullValues);
            if (update?.summary) {
              await agent.invoke(
                {
                  summary: update.summary,
                  messages: update.messages,
                  summarizeOnly: true,
                },
                { configurable: { thread_id: threadId } },
              );
            }
          } catch (e) {
            console.error("summarize error:", e);
          }
        });
      }
    } catch (e) {
      console.error(e);
      res.end();
    }
  })
  .listen(PORT, () => {
    console.log(`AI server listening on http://localhost:${PORT}`);
  });
