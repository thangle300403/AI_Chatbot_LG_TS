import { AIMessage, ToolMessage } from "@langchain/core/messages";
import type { StateType } from "../graph/state.ts";
import { llm } from "./llm.ts";
import { getPolicyRetriever } from "../vector/policyRetriever.ts";
import { cleanMessagesForLLM } from "../config/cleanMessages.ts";

export async function policyAgent(state: StateType) {
  const cleanMessages = cleanMessagesForLLM(state.messages);

  console.log("PolicyAgent");
  const last = state.messages.at(-1);
  const question =
    typeof last?.content === "string"
      ? last.content
      : (last?.content?.map((c: any) => c.text ?? "").join(" ") ?? "");

  console.log("PolicyAgent question:", question);

  const retriever = getPolicyRetriever();

  const docs = await retriever._getRelevantDocuments(question);

  if (!docs.length) {
    return {
      messages: [
        new AIMessage("Chính sách này không được đề cập trong tài liệu."),
      ],
    };
  }

  const summary = state.summary ?? "";

  const context = docs.map((d) => d.pageContent).join("\n---\n");
  const response = await llm.invoke([
    {
      role: "system",
      content: `
You are a POLICY AGENT.
Answer ONLY based on provided policy text.
Do NOT guess.
      `,
    },
    {
      role: "user",
      content: `
Policy: ${context}

Question: ${question}

Tóm lược các đoạn hội thoại đã có trước 5 câu hỏi gần nhất:
 ${summary}\n
      `,
    },
    ...cleanMessages,
  ]);

  console.log("PolicyAgent response:", response.content);

  return {
    messages: [new AIMessage(response.content)],
    results: [
      {
        source: "policy",
        result: response.content ?? "",
      },
    ],
    doneAgents: ["policy"],
  };
}
