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

  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: `
Bạn là trợ lý quản lý đơn hàng.

Nhiệm vụ duy nhất: HỦY ĐƠN HÀNG.

Quy tắc:
- "hủy đơn hàng số X" → order_id = X
- Hủy đơn = order_status_id = 6

Khi người dùng yêu cầu hủy:
- PHẢI trích xuất order_id từ câu nói
- PHẢI gọi tool update_order_status với:
  {
    order_id: <number>,
    order_status_id: 6,
  }

Nếu KHÔNG xác định được order_id → KHÔNG gọi tool, hãy hỏi lại người dùng.
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
  const last = state.messages.at(-1);

  if (last instanceof AIMessage && last.tool_calls?.length) {
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
  .addEdge("toolNode", "llmCall")
  .compile();
