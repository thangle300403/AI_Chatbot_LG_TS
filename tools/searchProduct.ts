// tools/search_product.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchSimilarConsult } from "../vector/searchSimilarConsult.ts";

export const searchProductTool = tool(
  async ({ query }: { query: string }) => {
    console.log(`searchProductTool called with query: "${query}"`);
    const results = await searchSimilarConsult(query, 5);

    console.log(`searchProductTool  results.`, results);

    return {
      products: results.map((r) => ({
        id: r.metadata?.product_id,
        name: r.metadata?.name,
        price: r.metadata?.price,
        discount: r.metadata?.discount_percentage,
        image: `${process.env.IMAGE_BASE_URL}/${r.metadata?.featured_image}`,
        description: r.content,
      })),
    };
  },
  {
    name: "search_product",
    description:
      "Search badminton products for consultation (racket, shoes, shirt, playstyle)",
    schema: z.object({
      query: z.string(),
    }),
  },
);
