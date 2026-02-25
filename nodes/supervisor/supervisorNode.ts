import "dotenv/config";
import { z } from "zod";
import type { StateType } from "../../graph/state.ts";
import { llm } from "../llm.ts";
import {
  cleanMessagesForLLM,
  stripOrphanToolCalls,
} from "../../config/cleanMessages.ts";

const RouterSchema = z.object({
  agents: z.array(
    z.object({
      agent: z.enum(["sql", "consult", "decision", "policy"]),
      query: z.string(),
    }),
  ),
});

export async function supervisorNode(state: StateType) {
  const cleanMessages = stripOrphanToolCalls(state.messages);

  console.log("supervisorNode summarizeOnly", state.summarizeOnly);
  if (state.summarizeOnly) {
    return {
      agents: [],
      results: [],
      doneAgents: [],
    };
  }
  const userMessage = state.messages.at(-1)?.content ?? "";

  console.log("📡 Routing message:", userMessage);

  const summary = state.summary ?? "";

  console.log("📡 Summary:", summary);

  const routerLLM = llm.withStructuredOutput(RouterSchema);

  const res = await routerLLM.invoke([
    {
      role: "system",
      content: `
Bạn là SUPERVISOR của hệ thống chatbot bán dụng cụ cầu lông.

Nhiệm vụ:
- Phân tích câu hỏi
- Chọn 1 hoặc N agent phù hợp
- Với mỗi agent, tạo 1 sub-query rõ ràng

Các agent có sẵn:
- sql      : giá, tồn kho, danh sách, thống kê, đơn hàng
- consult  : tư vấn chọn vợt, giày, áo, phụ kiện, phù hợp trình độ người chơi
- decision : hủy đơn hàng
- policy   : chính sách bảo hành, đổi trả, vận chuyển, thanh toán, điều khoản

QUY TẮC:
- Dựa vào lịch sử để đưa ra câu hỏi cho các agent.
- Có thể chọn nhiều agent
- KHÔNG trả lời người dùng
- KHÔNG giải thích
- Chỉ trả JSON theo schema 
`,
    },
    {
      role: "user",
      content: `
Câu hỏi hiện tại:
${userMessage}.\n
Tóm lược các đoạn hội thoại đã có trước 5 câu hỏi gần nhất:
${summary}\n
      `,
    },
    ...cleanMessages,
  ]);

  console.log("📦 Router decision:", JSON.stringify(res.agents, null, 2));

  return {
    agents: res.agents,
    results: [],
    doneAgents: [],
  };
}
