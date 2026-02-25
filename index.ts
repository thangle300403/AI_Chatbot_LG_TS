import readline from "readline";
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { agent } from "./graph/graph.ts";
import { summarizeConversation } from "./memory/summarize.ts";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const CURRENT_USER = {
  id: 21,
  email: "thangle300403@gmail.c",
};

async function ask() {
  rl.question("You: ", async (input) => {
    let result;

    //CASE 1: user approve / reject
    if (input === "y" || input === "n") {
      result = await agent.invoke(
        new Command({
          resume: input,
          update: {
            user: CURRENT_USER,
            summarizeOnly: false,
          },
        }),
        {
          configurable: { thread_id: CURRENT_USER.email },
        },
      );
    }

    //CASE 2: user hỏi bình thường
    else {
      result = await agent.invoke(
        {
          messages: [new HumanMessage(input)],
          originalUserQuestion: input,
          user: CURRENT_USER,
          summarizeOnly: false,
        },
        {
          configurable: { thread_id: CURRENT_USER.email },
        },
      );
    }

    //Nếu graph đang chờ approval
    if ((result as any).__interrupt__) {
      const interrupt = (result as any).__interrupt__[0].value;

      console.log("⚠️ CẦN XÁC NHẬN:");
      console.log("Action:", interrupt.tool);
      console.log("Preview:", interrupt.args);
      console.log("👉 Gõ: y/n");
    }

    //AI trả lời bình thường
    else {
      if (result.finalAnswer) {
        console.log("\n✅ [DONE]");
      }

      console.log("result.messages?.length:", result.messages.length);

      if (
        !result.summarizeOnly &&
        result.messages?.length > 5 &&
        result.doneAgents?.length > 0
      ) {
        setTimeout(() => {
          void (async () => {
            try {
              const update = await summarizeConversation(result as any);
              if (update?.summary) {
                await agent.invoke(
                  {
                    summary: update.summary,
                    messages: update.messages,
                    summarizeOnly: true,
                  },
                  { configurable: { thread_id: CURRENT_USER.email } },
                );
              }
            } catch (e) {
              console.error("summarize error:", e);
            }
          })();
        }, 0);
      }
    }

    ask();
  });
}

ask();
