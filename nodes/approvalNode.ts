import { interrupt, Command } from "@langchain/langgraph";
import { State } from "../graph/state.ts";

export async function approvalNode(state: typeof State.State) {
  console.log("ApprovalNode");
  const last = state.messages.at(-1) as any;

  if (!Array.isArray(last?.tool_calls) || !last.tool_calls.length) {
    return new Command({ goto: "__end__" });
  }

  const toolCall = last.tool_calls[0];
  const userId = state.user?.id;
  console.log("User ID in approval node:", userId);
  if (!userId) {
    return new Command({ goto: "__end__" });
  }

  toolCall.args = {
    ...toolCall.args,
    user_id: userId,
  };

  console.log("Before interrupt");

  const decision = interrupt({
    type: "approve_cancel_order",
    tool: toolCall.name,
    args: toolCall.args,
    question: "Bạn có muốn hủy đơn hàng này không?",
  });

  console.log("After interrupt:", decision);

  if (decision === "y") {
    return new Command({ goto: "toolNode" });
  }

  if (decision === "n") {
    return new Command({ goto: "__end__" });
  }

  return new Command({ goto: "__end__" });
}
