// tools/updateOrderStatusTool.ts
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { db2 } from "./db.ts";
import { AIMessage } from "langchain";

export const updateOrderStatusTool = tool(
  async ({ order_id, order_status_id, user_id }) => {
    const customer_id = user_id;

    console.log(
      `Updating order ID ${order_id} to status ID ${order_status_id} for user ID ${user_id}`,
    );

    // SELECT order
    const [rows]: any = await db2.execute(
      `SELECT id, customer_id, order_status_id
       FROM \`order\`
       WHERE id = ?`,
      [order_id],
    );

    if (rows.length === 0) {
      return {
        success: false,
        message: `Không tìm thấy đơn hàng ID = ${order_id}`,
      };
    }

    const order = rows[0];

    if (order.customer_id !== customer_id) {
      return {
        success: false,
        message: "Đơn hàng không thuộc về bạn",
      };
    }

    // UPDATE
    await db2.execute(
      `UPDATE \`order\`
       SET order_status_id = ?
       WHERE id = ?`,
      [order_status_id, order_id],
    );

    return {
      messages: [
        new AIMessage(`✅ Đơn hàng ${order_id} đã được hủy thành công.`),
      ],
      results: [
        {
          source: "policy",
          result: `✅ Đơn hàng ${order_id} đã được hủy thành công.`,
        },
      ],
    };
  },
  {
    name: "update_order_status",
    schema: z.object({
      order_id: z.number(),
      order_status_id: z.literal(6),
      user_id: z.number().optional(),
    }),
  },
);
