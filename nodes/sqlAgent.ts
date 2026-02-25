import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import type { StateType } from "../graph/state.ts";

export async function sqlAgent(state: StateType) {
  const userMessage = state.messages.at(-1)?.content ?? "";

  const res = await fetch("http://localhost:5068/sql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: String(userMessage),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      messages: [...state.messages, new AIMessage(`❌ Lỗi SQL Agent: ${text}`)],
    };
  }

  const data = await res.json();
  const answer = data.answer ?? "⚠️ Không có kết quả từ SQL Agent";

  return {
    messages: [new AIMessage(answer)],
    results: [
      {
        source: "sql",
        result: answer,
      },
    ],
    doneAgents: ["sql"],
  };
}
