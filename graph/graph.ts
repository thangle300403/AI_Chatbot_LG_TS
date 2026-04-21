// graph/agent.ts
import "dotenv/config";
import { StateGraph, START, END } from "@langchain/langgraph";
import { State } from "./state.ts";
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

const graph = new StateGraph(State)
  .addNode("router", supervisorNode)
  .addNode("sql", sqlAgent)
  .addNode("decision", updateAgent)
  .addNode("consult", consultAgentGraph)
  .addNode("policy", policyAgent)
  .addNode("synthesize", synthesizeNode)

  .addEdge(START, "router")

  .addConditionalEdges("router", routeToAgents, [
    "decision",
    "consult",
    "sql",
    "policy",
    "synthesize",
    END,
  ])

  .addEdge("consult", "router")
  .addEdge("policy", "router")
  .addEdge("sql", "router")
  .addEdge("decision", "router")
  .addEdge("synthesize", END);

export const agent = graph.compile({ checkpointer });
