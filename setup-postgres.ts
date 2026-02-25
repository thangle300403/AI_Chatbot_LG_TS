import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DB_URI =
  "postgresql://postgres:postgres@localhost:5442/langgraph?sslmode=disable";

async function main() {
  const checkpointer = PostgresSaver.fromConnString(DB_URI);
  await checkpointer.setup();
  console.log("✅ PostgresSaver setup completed");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Setup failed", err);
  process.exit(1);
});
