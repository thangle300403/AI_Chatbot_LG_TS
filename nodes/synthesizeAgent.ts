// synthesizeNode.ts
import { AIMessage } from "@langchain/core/messages";
import type { StateType } from "../graph/state.ts";
import { llm } from "./llm.ts";
import { cleanMessagesForLLM } from "../config/cleanMessages.ts";

function normalizeMarkdown(text: string) {
  return text
    .replace(/\n(\d+)\. /g, "\n\n$1. ")
    .replace(/\n- /g, "\n\n- ")
    .replace(/([^\n])\n([^\n])/g, "$1\n\n$2")
    .trim();
}

export async function synthesizeNode(state: StateType) {
  console.log("SynthesizeNode");
  const userQuestion = state.originalUserQuestion ?? "";
  const summary = state.summary ?? "";
  const recentMessages = cleanMessagesForLLM(state.messages);

  console.log("User question in synthesize:", userQuestion);
  if (!state.results || state.results.length === 0) {
    return {
      finalAnswer: "Khong tim duoc thong tin phu hop de tra loi.",
      messages: [
        new AIMessage(
          "Hien tai toi chua co du du lieu de tra loi cau hoi nay.",
        ),
      ],
    };
  }

  console.log("Number of results to synthesize:", state.results.length);

  const context = state.results
    .map((r, i) => `(${i + 1}) From ${r.source.toUpperCase()}`)
    .join("\n\n");

  console.log("Context to synthesize:", context);

  const systemPrompt = `
You are a professional badminton shop assistant.
Your job is to synthesize agent results into the final answer for the user.

Rules:
- Answer only within the badminton shop domain.
- Do not invent information.
- Use both conversation memory sources:
  1. the summarized old memory;
  2. the recent unsummarized messages.
- If product lists exist, mention product names clearly.
- Answer naturally, concisely, and in Markdown.
- Do not return JSON.
`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `
Original user question:
"${userQuestion}"

Summarized old memory:
${summary || "None."}

Agent information:
${context}

Now write the final answer using the summarized memory, recent messages, and agent information.
`,
    },
    ...recentMessages,
  ];

  const stream = await llm.stream(messages);

  let fullText = "";

  process.stdout.write("AI (SYNTH): ");

  for await (const chunk of stream) {
    let token = "";

    if (typeof chunk.content === "string") {
      token = chunk.content;
    } else {
      continue;
    }
    fullText += token;

    process.stdout.write(token);
  }

  process.stdout.write("\n");

  const normalized = normalizeMarkdown(fullText);

  return {
    finalAnswer: normalized,
    products: state.results.flatMap((r) => r.products ?? []),
    messages: [new AIMessage(`[SYNTHESIZE]\n${normalized}`)],
  };
}
