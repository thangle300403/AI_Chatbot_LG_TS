import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const collectionMap: Record<string, Chroma> = {};
export async function getVectorStore(collectionName: string): Promise<Chroma> {
  if (!collectionMap[collectionName]) {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-large",
    });

    const vectorStore = new Chroma(embeddings, {
      collectionName,
      url: process.env.CHROMA_URL,
      collectionMetadata: {
        "hnsw:space": "cosine",
      },
    });

    console.log(
      `✅ Initialized vector store for collection: "${collectionName}"`,
    );

    collectionMap[collectionName] = vectorStore;
  }
  return collectionMap[collectionName];
}
