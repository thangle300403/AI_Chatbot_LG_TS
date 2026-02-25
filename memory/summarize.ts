import {
  AIMessage,
  HumanMessage,
  RemoveMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { llm } from "../nodes/llm.ts";
import type { StateType } from "../graph/state.ts";
import { cleanMessagesForLLM } from "../config/cleanMessages.ts";

const KEEP_LAST = 10;

export const summarizeConversation = async (state: StateType) => {
  console.log("summarizeConversation");
  const { summary, messages } = state;

  // Các message cần summarize (cũ hơn 5)
  const oldMessages = messages.slice(0, -KEEP_LAST);

  // Tránh lỗi tool_calls: loại các AIMessage có tool_calls và ToolMessage liên quan
  const cleanMessages = cleanMessagesForLLM(state.messages);

  if (cleanMessages.length === 0) {
    return {};
  }

  const prompt = summary
    ? `Current summary (max 5 bullets): ${summary}

Update the summary using ONLY the new information above.
Rules:
- Max 5 bullet points
- Each bullet ≤ 15 words
- Focus on: user intent, decisions, constraints
- NO examples, NO explanations`
    : `Summarize the conversation above.

Rules:
- Max 5 bullet points
- Focus on: user intent, decisions, constraints
- NO examples, NO explanations`;

  const response = await llm.invoke([
    ...cleanMessages,
    new HumanMessage({ content: prompt }),
  ]);

  const deleteMessages = oldMessages.map(
    (m) => new RemoveMessage({ id: m.id! }),
  );

  const summaryText =
    typeof response.content === "string"
      ? response.content
      : response.content.map((c) => ("text" in c ? c.text : "")).join(" ");

  return {
    summary: summaryText,
    messages: deleteMessages,
  };
};
