import { interrupt, Command } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { State } from "../graph/state.ts";

export async function approvalNode(state: typeof State.State) {
  const last = state.messages.at(-1);

  if (!(last instanceof AIMessage) || !last.tool_calls?.length) {
    return new Command({ goto: "__end__" });
  }

  const toolCall = last.tool_calls[0];

  toolCall.args = {
    ...toolCall.args,
    user_id: state.user!.id,
  };

  const decision = interrupt({
    type: "approve_cancel_order",
    tool: toolCall.name,
    args: toolCall.args,
    question: "Bạn có muốn hủy đơn hàng này không?",
  });

  if (decision === "y") {
    return new Command({ goto: "toolNode" });
  }

  if (decision === "n") {
    return new Command({ goto: "__end__" });
  }

  return new Command({ goto: "__end__" });
}
