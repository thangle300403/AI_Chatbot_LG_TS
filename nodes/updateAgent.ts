// agents/updateAgent.ts
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { llm } from "./llm.ts";
import { AIMessage } from "@langchain/core/messages";
import { approvalNode } from "./approvalNode.ts";
import { updateOrderStatusTool } from "../tools/updateOrder.ts";
import { State } from "../graph/state.ts";
import { cleanMessagesForLLM } from "../config/cleanMessages.ts";

const llmWithTools = llm.bindTools([updateOrderStatusTool]);

async function llmCall(state: typeof State.State) {
  console.log("UpdateAgent");
  console.log("User", state.user);
  const cleanMessages = cleanMessagesForLLM(state.messages);
  const summary = state.summary ?? "";

  const lastMessage = state.messages.at(-1)?.content;
  const userMessage =
    typeof lastMessage === "string"
      ? lastMessage
      : typeof state.originalUserQuestion === "string"
        ? state.originalUserQuestion
        : "";

  console.log("📡 User message in update agent:", userMessage);

  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: `
Bạn là trợ lý quản lý đơn hàng.

Nhiệm vụ duy nhất: HỦY ĐƠN HÀNG.

Quy tắc:
- Hủy đơn = order_status_id = 6
- Mã đơn hàng nằm trong câu nói của người dùng, bạn cần trích xuất nó ra để gọi tool.

Khi người dùng yêu cầu hủy:
- PHẢI trích xuất order_id từ câu nói
- Bắt buộc gọi tool update_order_status
- Khi thấy tool đã trả về kết quả, phải trả lời người dùng rằng đơn hàng đã được hủy thành công.
`,
    },
    {
      role: "user",
      content: `
Câu hỏi hiện tại:
${userMessage}.\n
Tóm lược các đoạn hội thoại cũ:
${summary}\n
      `,
    },
    ...cleanMessages,
  ]);
  return {
    messages: [result],
  };
}

const toolNode = new ToolNode([updateOrderStatusTool]);

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const last = state.messages.at(-1) as any;
  if (Array.isArray(last?.tool_calls) && last.tool_calls.length > 0) {
    return "approval";
  }

  return "__end__";
}

export const updateAgent = new StateGraph(State)
  .addNode("llmCall", llmCall)
  .addNode("approval", approvalNode, { ends: ["toolNode", "__end__"] })
  .addNode("toolNode", toolNode)

  .addEdge("__start__", "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["approval", "__end__"])
  .addEdge("toolNode", "__end__")
  .compile();
