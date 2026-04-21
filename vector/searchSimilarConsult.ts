import { getCollectionsByAgent } from "./agentCollections.ts";
import { getVectorStore } from "./vectorStore.ts";

export interface ProductMetadata {
  name?: string;
  price?: number;
  discount_percentage?: number;
  featured_image?: string;
  product_id?: number;
  collection?: string;
}

export interface ConsultProductResult {
  content: string;
  metadata: ProductMetadata;
}

export async function searchSimilarConsult(query: string, topK = 5) {
  try {
    const collections = getCollectionsByAgent("consultAgent");

    if (!collections.length) {
      console.warn("⚠️ consultAgent chưa có collection");
      return [];
    }

    console.log("🔍 consultAgent collections:", collections);

    const allResults = await Promise.all(
      collections.map(async (collectionName) => {
        const vectorStore = await getVectorStore(collectionName);
        const retriever = vectorStore.asRetriever({ k: topK });
        const docs = await retriever._getRelevantDocuments(query);

        return docs.map((doc) => ({
          content: doc.pageContent,
          metadata: {
            ...(doc.metadata as ProductMetadata),
            collection: collectionName,
          },
        }));
      }),
    );

    console.log("✅ searchSimilarConsult results:", allResults);

    return allResults.flat().slice(0, topK);
  } catch (err) {
    console.error("❌ searchSimilarConsult ERROR:", err);
    return [];
  }
}
