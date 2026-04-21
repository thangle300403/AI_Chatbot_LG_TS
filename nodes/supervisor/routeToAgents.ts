import { END, Send } from "@langchain/langgraph";
import type { StateType } from "../../graph/state.ts";
import { HumanMessage } from "@langchain/core/messages";

export function routeToAgents(state: StateType) {
  if (state.summarizeOnly) {
    return END;
  }

  const nextAgent = state.agents?.[0];

  if (!nextAgent) {
    return "synthesize";
  }

  return new Send(nextAgent.agent, {
    messages: [...state.messages, new HumanMessage(nextAgent.query)],
    user: state.user,
    summary: state.summary,
    originalUserQuestion: state.originalUserQuestion,
  });
}
