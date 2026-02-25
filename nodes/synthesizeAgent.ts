// synthesizeNode.ts
import { AIMessage } from "@langchain/core/messages";
import type { StateType } from "../graph/state.ts";
import { llm } from "./llm.ts";

function normalizeMarkdown(text: string) {
  return (
    text
      // list
      .replace(/\n(\d+)\. /g, "\n\n$1. ")
      .replace(/\n- /g, "\n\n- ")
      // paragraph
      .replace(/([^\n])\n([^\n])/g, "$1\n\n$2")
      .trim()
  );
}
export async function synthesizeNode(state: StateType) {
  console.log("SynthesizeNode");
  const userQuestion = state.originalUserQuestion ?? "";
  console.log("User question in synthesize:", userQuestion);
  if (!state.results || state.results.length === 0) {
    return {
      finalAnswer: "❌ Không tìm được thông tin phù hợp để trả lời.",
      messages: [
        new AIMessage(
          "Hiện tại tôi chưa có đủ dữ liệu để trả lời câu hỏi này.",
        ),
      ],
    };
  }

  console.log("Number of results to synthesize:", state.results.length);

  // Format kết quả từ các agent
  const context = state.results
    .map((r, i) => `(${i + 1}) Từ ${r.source.toUpperCase()}:\n${r.result}`)
    .join("\n\n");

  console.log("Context to synthesize:", context);

  const systemPrompt = `
Bạn là trợ lý chuyên về cầu lông (badminton).
Nhiệm vụ của bạn là tổng hợp thông tin từ nhiều nguồn để trả lời người dùng.

QUY TẮC:
- Chỉ trả lời trong domain cầu lông
- Không bịa thông tin
- Khi có danh sách sản phẩm nhớ nếu số thứ tự và tên sản phẩm
- Trả lời gọn, rõ, tự nhiên như người bán hàng chuyên nghiệp
- Không cần hình.
- Trả về chuẩn markdown Không trả json.
`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `
Câu hỏi:
"${userQuestion}"

Thông tin:
${context}

Hãy tổng hợp câu trả lời cuối cùng.
`,
    },
  ];

  const stream = await llm.stream(messages);

  let fullText = "";

  process.stdout.write("AI (SYNTH): ");

  for await (const chunk of stream) {
    let token = "";

    if (typeof chunk.content === "string") {
      token = chunk.content;
    } else {
      continue;
    }
    fullText += token;

    process.stdout.write(token);
  }

  process.stdout.write("\n");

  const normalized = normalizeMarkdown(fullText);

  return {
    finalAnswer: fullText,
    products: state.results.flatMap((r) => r.products ?? []),
    messages: [new AIMessage(`🧠 [SYNTHESIZE]\n${fullText}`)],
  };
}
