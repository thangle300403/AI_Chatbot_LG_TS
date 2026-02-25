// tools/updateStudentTool.ts
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { db } from "./db.ts";

export const updateStudentTool = tool(
  async ({ id, name, gender, birthday }) => {
    const fields: string[] = [];
    const values: any[] = [];

    if (name) {
      fields.push("name = ?");
      values.push(name);
    }

    if (gender) {
      fields.push("gender = ?");
      values.push(gender);
    }

    if (birthday) {
      fields.push("birthday = ?");
      values.push(birthday);
    }

    if (fields.length === 0) {
      return {
        success: false,
        message: "Không có trường nào để cập nhật",
      };
    }

    values.push(id);

    const sql = `
      UPDATE student
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    const [result]: any = await db.execute(sql, values);

    return {
      success: true,
      studentId: id,
      updatedFields: fields.map((f) => f.split(" = ")[0]),
      affectedRows: result.affectedRows,
    };
  },
  {
    name: "update_student_info",
    description: "Cập nhật thông tin sinh viên theo ID",
    schema: z.object({
      id: z.number().describe("ID sinh viên"),
      name: z.string().optional(),
      gender: z.enum(["nam", "nữ", "khác"]).optional(),
      birthday: z.string().optional().describe("YYYY-MM-DD"),
    }),
  }
);
