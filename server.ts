import http from "http";
import jwt from "jsonwebtoken";
import { agent } from "./graph/graph.ts";
import { HumanMessage } from "@langchain/core/messages";
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

http
  .createServer(async (req, res) => {
    if (!req.url?.startsWith("/chat/stream")) {
      res.writeHead(404);
      res.end();
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const q = url.searchParams.get("q") ?? "";

    // ✅ LẤY COOKIE TỪ BILLSHOP
    const cookies = parseCookies(req);
    const token = cookies.access_token;
    const session_id = cookies.chatbot_session || null;

    let email: string | null = null;
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_KEY!);
        email = decoded.email;
      } catch {
        // token invalid → fallback guest
      }
    }

    console.log("👉 EMAIL", email);
    console.log("👉 SESSION_ID", session_id);

    // 👉 THREAD_ID CHUẨN
    const threadId = email ?? session_id;

    console.log("👉 THREAD_ID", threadId);
    const origin = req.headers.origin;
    // SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",

      // ✅ CORS CHO SSE
      "Access-Control-Allow-Origin": origin ?? "http://localhost:3000",
      "Access-Control-Allow-Credentials": "true",
    });

    let finalState: any = null;

    try {
      const stream = agent.streamEvents(
        {
          messages: [new HumanMessage(q)],
          originalUserQuestion: q,
          summarizeOnly: false,
          finalAnswer: null,
          results: [],
          doneAgents: [],
        },
        {
          configurable: { thread_id: threadId },
          version: "v2",
        },
      );

      let synthAnswer = "";

      for await (const event of stream) {
        // Stream token ra FE (chỉ node synthesize)
        if (
          event.event === "on_chat_model_stream" &&
          event.metadata?.langgraph_node === "synthesize"
        ) {
          const token = event.data?.chunk?.content ?? "";
          if (token) {
            synthAnswer += token;
            const safe = token.replace(/\n/g, "\n\n");
            res.write(`data: ${safe}\n\n`);
          }
        }

        // Lấy finalState để dùng summarize
        if (
          event.event === "on_chain_end" &&
          event.metadata?.langgraph_node === "synthesize"
        ) {
          finalState = event.data?.output;
        }
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

      // LƯU CÂU HỎI KHÁCH HÀNG
      if (q?.trim()) {
        await saveChatHistory({
          email,
          session_id: threadId,
          role: "user",
          content: q.trim(),
        });
      }

      console.log("finalState products:", finalState.products);

      // LƯU CÂU TRẢ LỜI CUỐI CÙNG CỦA SYNTH
      if (synthAnswer?.trim()) {
        const contentPayload = {
          answer: synthAnswer.trim(),
          products: normalizedProducts,
        };
        await saveChatHistory({
          email,
          session_id: threadId,
          role: "ai",
          content: JSON.stringify(contentPayload),
        });
      }

      const fullState = await agent.getState({
        configurable: { thread_id: threadId },
      });
      const fullValues = fullState?.values as StateType | undefined;

      console.log("✅ finalState.messages.length", fullValues?.messages.length);

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
