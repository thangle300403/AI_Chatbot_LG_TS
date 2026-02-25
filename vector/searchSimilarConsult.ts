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
  similarity: number;
}

export async function searchSimilarConsult(
  query: string,
  topK = 5,
  minScore = 0.5,
) {
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
        const results = await vectorStore.similaritySearchWithScore(
          query,
          topK,
        );

        console.log(`📊 Raw results from "${collectionName}":`, results);

        return results.map(([doc, distance]) => {
          const similarity = 1 - Math.min(Math.max(distance, 0), 1);
          return {
            content: doc.pageContent,
            metadata: {
              ...(doc.metadata as ProductMetadata),
              collection: collectionName,
            },
            similarity,
          };
        });
      }),
    );

    return allResults
      .flat()
      .filter((r) => r.similarity >= minScore)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  } catch (err) {
    console.error("❌ searchSimilarConsult ERROR:", err);
    return [];
  }
}
