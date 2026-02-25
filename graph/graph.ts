// graph/agent.ts
import "dotenv/config";
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { State } from "./state.ts";
import type { StateType } from "./state.ts";
import { sqlAgent } from "../nodes/sqlAgent.ts";
import { updateAgent } from "../nodes/updateAgent.ts";
import { consultAgentGraph } from "../nodes/consultAgent.ts";
import { routeToAgents } from "../nodes/supervisor/routeToAgents.ts";
import { synthesizeNode } from "../nodes/synthesizeAgent.ts";
import { supervisorNode } from "../nodes/supervisor/supervisorNode.ts";
import { policyAgent } from "../nodes/policyAgent.ts";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DB_URI =
  "postgresql://postgres:postgres@localhost:5442/langgraph?sslmode=disable";

const checkpointer = PostgresSaver.fromConnString(DB_URI);

export function collectNode(state: StateType) {
  const expected = state.agents.length;
  const done = new Set(state.doneAgents).size;

  console.log("===========Expected:", expected, "Done:", done);

  if (done < expected) {
    return {};
  }
  return {};
}

function routeFromCollect(state: StateType) {
  const expected = state.agents.length;
  const done = new Set(state.doneAgents).size;

  return done === expected ? "synthesize" : END;
}

const graph = new StateGraph(State)
  .addNode("router", supervisorNode)
  .addNode("sql", sqlAgent)
  .addNode("decision", updateAgent)
  .addNode("consult", consultAgentGraph)
  .addNode("policy", policyAgent)
  .addNode("collect", collectNode)
  .addNode("synthesize", synthesizeNode)

  .addEdge(START, "router")

  .addConditionalEdges("router", routeToAgents, [
    "decision",
    "consult",
    "sql",
    "policy",
  ])

  .addEdge("consult", "collect")
  .addEdge("policy", "collect")
  .addEdge("sql", "collect")
  .addEdge("decision", END)

  .addConditionalEdges("collect", routeFromCollect, ["synthesize", END])
  .addEdge("synthesize", END);

export const agent = graph.compile({ checkpointer });
