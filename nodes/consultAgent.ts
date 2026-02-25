// consultAgent.ts
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, START, END } from "@langchain/langgraph";
import { searchProductTool } from "../tools/searchProduct.ts";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { llm } from "./llm.ts";
import type { StateType } from "../graph/state.ts";
import {
  cleanMessagesForLLM,
  stripOrphanToolCalls,
} from "../config/cleanMessages.ts";

export interface ConsultResult {
  source: "consult";
  result: string;
  products?: {
    id?: number;
    name: string;
    price?: number;
    discount?: number;
    image?: string;
  }[];
}

export interface ConsultState {
  messages: (HumanMessage | AIMessage | ToolMessage)[];
  results: ConsultResult[];
  doneAgents: string[];
}

const stateSpec = {
  messages: {
    reducer: (x: any[], y: any[]) => x.concat(y),
    default: () => [],
  },
  results: {
    reducer: (x: any[], y: any[]) => x.concat(y),
    default: () => [],
  },
  doneAgents: {
    reducer: (x: string[], y: string[]) => x.concat(y),
    default: () => [],
  },
};

const llmWithTools = llm.bindTools([searchProductTool]);
// Node 1: Planner
async function plannerNode(state: StateType) {
  const cleanMessages = cleanMessagesForLLM(state.messages);

  console.log("cleanMessages planner", cleanMessages.length);

  const userMsg = state.messages.at(-1)?.content ?? "";
  console.log("🟢 ConsultAgent input:", userMsg);

  const summary = state.summary ?? "";

  const systemPrompt = `
You are a badminton product consultant.
Decide ONE of the following actions:
- If the question needs product knowledge or recommendation → call search_product
- Otherwise → answer directly
- If the answer is already in conversation history, answer directly without calling tools.
`;

  const response = await llmWithTools.invoke([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `
Tóm lược các đoạn hội thoại đã có trước 5 câu hỏi gần nhất:
${summary}\n

Câu hỏi của khách hàng: ${userMsg}\n
      `,
    },
    ...cleanMessages,
  ]);

  const toolCalls = (response as any)?.tool_calls ?? [];

  if (!toolCalls.length) {
    const answer = (response as any)?.content ?? "";
    return {
      messages: [response as AIMessage],
      results: [
        {
          source: "consult",
          result: answer,
        },
      ],
      doneAgents: ["consult"],
    };
  }

  return { messages: [response] };
}

const toolNode = new ToolNode([searchProductTool]);

function shouldRetrieve(state: ConsultState) {
  const last = state.messages[state.messages.length - 1] as any;

  const toolCalls = last?.tool_calls ?? [];

  if (toolCalls.length) {
    return "retrieve";
  }

  return END;
}

// Node 2: Generate final answer

async function generateNode(state: ConsultState) {
  const cleanMessages = stripOrphanToolCalls(state.messages);

  // 🔑 LẤY product từ ToolMessage
  const toolMsg = [...cleanMessages]
    .reverse()
    .find((m) => m instanceof ToolMessage) as ToolMessage | undefined;

  console.log("ToolMessage found:", !!toolMsg);

  let products: any[] = [];

  if (toolMsg?.content) {
    try {
      const parsed =
        typeof toolMsg.content === "string"
          ? JSON.parse(toolMsg.content)
          : toolMsg.content;

      products = parsed?.products ?? [];

      const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL;

      products = products.map((p) => ({
        ...p,
        image: p.image?.startsWith("http")
          ? p.image
          : `${IMAGE_BASE_URL}/${p.image}`,
      }));
    } catch (err) {
      console.error("❌ Failed to parse ToolMessage content:", err);
    }
  }

  console.log("Number of products retrieved!", products);

  const systemPrompt = `You are a professional badminton consultant.
Use the provided product information to give advice.
If products are listed, recommend clearly and ask ONE follow-up question
(e.g. singles/doubles, budget).
Do not invent products.`;

  const response = await llmWithTools.invoke([
    { role: "system", content: systemPrompt },
    ...cleanMessages,
  ]);

  const answer = response.content ?? "";
  return {
    messages: [new AIMessage(answer)],
    results: [
      {
        source: "consult",
        result: answer,
        products,
      },
    ],
    doneAgents: ["consult"],
  };
}

export const consultAgentGraph = new StateGraph<ConsultState>({
  channels: stateSpec,
})
  .addNode("planner", plannerNode)
  .addNode("retrieve", toolNode)
  .addNode("generate", generateNode)

  .addEdge(START, "planner")
  .addConditionalEdges("planner", shouldRetrieve)
  .addEdge("retrieve", "generate")
  .addEdge("generate", END)

  .compile();
