import fs from "fs";
import path from "path";
import "dotenv/config";

const AGENT_COLLECTION_PATH =
  process.env.AGENT_COLLECTION_PATH || "E:/qlsv_chatbot/agent_collections.json";

export function getCollectionsByAgent(agentName: string): string[] {
  if (!fs.existsSync(AGENT_COLLECTION_PATH)) return [];

  const raw = fs.readFileSync(AGENT_COLLECTION_PATH, "utf8");
  const config = JSON.parse(raw);

  return config
    .filter((c: any) => c.agent_name === agentName)
    .map((c: any) => c.collection_name);
}
