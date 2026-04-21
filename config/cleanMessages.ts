import { BaseMessage } from "@langchain/core/messages";

function getToolCalls(message: any): any[] {
  if (Array.isArray(message?.tool_calls)) return message.tool_calls;
  if (Array.isArray(message?.additional_kwargs?.tool_calls)) {
    return message.additional_kwargs.tool_calls;
  }
  return [];
}

function getToolCallId(message: any): string | null {
  if (typeof message?.tool_call_id === "string") return message.tool_call_id;
  if (typeof message?.additional_kwargs?.tool_call_id === "string") {
    return message.additional_kwargs.tool_call_id;
  }
  return null;
}

function isToolMessageLike(message: any): boolean {
  return (
    message?._getType?.() === "tool" ||
    message?.type === "tool" ||
    message?.role === "tool" ||
    typeof getToolCallId(message) === "string"
  );
}

export function cleanMessagesForLLM(messages: BaseMessage[]) {
  return messages.filter((message) => {
    if (isToolMessageLike(message)) return false;
    if (getToolCalls(message).length) return false;
    if ((message as any)?.tool_call_chunks?.length) return false;
    return true;
  });
}

export function stripOrphanToolCalls(messages: BaseMessage[]) {
  const result: BaseMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i] as any;
    const toolCalls = getToolCalls(message);

    if (toolCalls.length) {
      const expectedIds = new Set(
        toolCalls.map((call: any) => call?.id).filter(Boolean),
      );
      const matchedTools: BaseMessage[] = [];

      let j = i + 1;
      while (j < messages.length && isToolMessageLike(messages[j])) {
        const toolId = getToolCallId(messages[j]);
        if (!expectedIds.size || (toolId && expectedIds.has(toolId))) {
          matchedTools.push(messages[j]);
        }
        j++;
      }

      if (matchedTools.length) {
        result.push(messages[i], ...matchedTools);
      }

      i = j - 1;
      continue;
    }

    if (isToolMessageLike(message)) continue;
    result.push(messages[i]);
  }

  return result;
}
