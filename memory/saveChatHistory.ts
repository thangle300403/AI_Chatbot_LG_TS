import { encrypt } from "../config/encrypt.ts";
import { db2 } from "../tools/db.ts";

type SaveChatHistoryInput = {
  email?: string | null;
  session_id?: string | null;
  role: "user" | "ai";
  content: string;
};

export const saveChatHistory = async ({
  email = null,
  session_id = null,
  role,
  content,
}: SaveChatHistoryInput) => {
  const [result] = await db2.execute(
    `INSERT INTO chatbot_history_role 
         (user_email, session_id, role, content, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
    [email, session_id, role, encrypt(content)],
  );

  return (result as any).insertId;
};
