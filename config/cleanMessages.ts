import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";

export function cleanMessagesForLLM(messages: BaseMessage[]) {
  return messages.filter((m) => {
    if (m instanceof ToolMessage) return false;

    if (m instanceof AIMessage && (m as any).tool_calls?.length) return false;

    if ((m as any).tool_call_chunks?.length) return false;

    return true;
  });
}

export function stripOrphanToolCalls(messages: BaseMessage[]) {
  const result: BaseMessage[] = [];
  let lastToolCallIds: Set<string> | null = null;

  for (const m of messages) {
    const isToolMsg =
      m instanceof ToolMessage ||
      (m as any)?.role === "tool" ||
      typeof (m as any)?.tool_call_id === "string";

    if (isToolMsg) {
      const toolCallId = (m as any)?.tool_call_id;
      if (lastToolCallIds && toolCallId && lastToolCallIds.has(toolCallId)) {
        result.push(m);
      }
      continue;
    }

    const toolCalls = (m as any)?.tool_calls ?? [];
    if (toolCalls.length) {
      lastToolCallIds = new Set(
        toolCalls.map((c: any) => c?.id).filter(Boolean),
      );
      result.push(m);
      continue;
    }

    lastToolCallIds = null;
    result.push(m);
  }

  return result;
}
