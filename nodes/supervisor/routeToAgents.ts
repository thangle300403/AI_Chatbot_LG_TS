import { Send } from "@langchain/langgraph";
import type { State, StateType } from "../../graph/state.ts";
import { HumanMessage } from "@langchain/core/messages";

export function routeToAgents(state: StateType): Send[] {
  if (!state.agents || state.agents.length === 0) {
    return [];
  }

  return state.agents.map((a) => {
    return new Send(a.agent, {
      messages: [...state.messages, new HumanMessage(a.query)],
      user: state.user,
      summary: state.summary,
    });
  });
}
