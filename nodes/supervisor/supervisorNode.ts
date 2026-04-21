import "dotenv/config";
import { z } from "zod";
import type { StateType } from "../../graph/state.ts";
import { llm } from "../llm.ts";
import { cleanMessagesForLLM } from "../../config/cleanMessages.ts";

const RouterSchema = z.object({
  action: z.enum(["call_agent", "synthesize"]),
  agent: z.enum(["sql", "consult", "decision", "policy"]).nullable(),
  query: z.string().nullable(),
});

export async function supervisorNode(state: StateType) {
  const cleanMessages = cleanMessagesForLLM(state.messages);

  console.log("supervisorNode summarizeOnly", state.summarizeOnly);
  if (state.summarizeOnly) {
    return {
      agents: [],
      results: [],
      doneAgents: [],
    };
  }

  const userMessage =
    state.originalUserQuestion ?? state.messages.at(-1)?.content ?? "";
  const summary = state.summary ?? "";
  const previousResults = (state.results ?? [])
    .map((r, i) => `(${i + 1}) ${r.source}: ${r.result}`)
    .join("\n\n");
  const calledAgents = (state.doneAgents ?? []).join(", ") || "none";

  console.log("Routing message:", userMessage);
  console.log("Summary:", summary);
  console.log("Called agents:", calledAgents);
  // console.log("Previous agent results:", previousResults);

  if (
    (state.doneAgents ?? []).length >= 4 &&
    (state.results ?? []).length > 0
  ) {
    return { agents: [] };
  }

  const routerLLM = llm.withStructuredOutput(RouterSchema);

  const res = await routerLLM.invoke([
    {
      role: "system",
      content: `
You are the SUPERVISOR of a badminton shop chatbot.

Your task:
- Analyze the user question, conversation summary, and any existing agent results.
- If the existing results are enough to answer the user, return action = "synthesize".
- If more information is needed, choose exactly ONE next agent and create a clear sub-query for that agent.

Available agents:
- sql      : prices, inventory, lists, statistics, orders
- consult  : product advice for rackets, shoes, clothes, accessories, player level
- decision : cancel orders
- policy   : warranty, returns, shipping, payment, terms

Rules:
- Do not answer the user.
- Do not explain.
- Do not choose multiple agents.
- After each agent result, you will be called again to evaluate whether the task is done.
- Avoid calling the same agent again unless the previous result is clearly insufficient.
- If enough data exists, or too many agents have already been called, return action = "synthesize".
- Return only JSON matching the schema.
`,
    },
    {
      role: "user",
      content: `
Current user question:
${userMessage}

Already called agents:
${calledAgents}

Existing agent results:
${previousResults || "No agent results yet."}

Conversation summary:
${summary}
      `,
    },
    ...cleanMessages,
  ]);

  console.log("Router decision:", JSON.stringify(res, null, 2));

  return {
    agents:
      res.action === "call_agent" && res.agent && res.query
        ? [{ agent: res.agent, query: res.query }]
        : [],
  };
}
