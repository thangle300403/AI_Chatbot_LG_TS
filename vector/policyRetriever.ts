// retrievers/policyRetriever.ts
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { getCollectionsByAgent } from "./agentCollections.ts";

export function getPolicyRetriever() {
  const collections = getCollectionsByAgent("policyAgent");

  if (!collections.length) {
    throw new Error("❌ policyAgent chưa có collection nào");
  }

  const embedding = new OpenAIEmbeddings({
    modelName: "text-embedding-3-large",
  });

  const retrievers = collections.map((collectionName) =>
    new Chroma(embedding, {
      collectionName,
      url: process.env.CHROMA_URL,
    }).asRetriever({ k: 4 }),
  );

  console.log("✅ policyAgent collections:", collections);

  // unified retriever
  return {
    async _getRelevantDocuments(query: string) {
      const results = await Promise.all(
        retrievers.map((r) => r._getRelevantDocuments(query)),
      );

      // gộp + flatten
      return results.flat();
    },
  };
}
