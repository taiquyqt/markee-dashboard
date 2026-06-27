import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // 1. Fetch all WIP skills for this project
    const { data: wipSkills, error: fetchError } = await supabase.from("skill_library").select("title, markdown_content, author_id, session_tokens").eq("project_id", projectId).eq("skill_type", "wip");

    if (fetchError) {
      console.error("Error fetching WIP skills:", fetchError);
      return NextResponse.json({ error: "Lỗi cơ sở dữ liệu khi tải WIP" }, { status: 500 });
    }

    if (!wipSkills || wipSkills.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy bản tóm tắt công việc (WIP) nào trong dự án này để tổng hợp." }, { status: 404 });
    }

    // 2. Extract contributors names
    const emails = Array.from(new Set(wipSkills.map((s) => s.author_id).filter(Boolean)));
    let contributors = "Hệ thống";
    if (emails.length > 0) {
      const { data: users } = await supabase.from("users").select("full_name, email").in("email", emails);

      if (users && users.length > 0) {
        contributors = users.map((u) => u.full_name || u.email.split("@")[0]).join(", ");
      } else {
        contributors = emails.map((e) => e.split("@")[0]).join(", ");
      }
    }

    // 3. Aggregate content & tokens
    const totalTokens = wipSkills.reduce((sum, s) => sum + (s.session_tokens || 0), 0);
    const combinedContent = wipSkills.map((s) => `### Tiêu đề: ${s.title}\n\n${s.markdown_content || ""}`).join("\n\n---\n\n");

    // 4. Prompt Gemini
    const systemPrompt = `Bạn là AI Project Architect.

Nhiệm vụ:
Đọc toàn bộ các bản tóm tắt WIP của dự án và hợp nhất chúng thành một Master Summary phản ánh tri thức cốt lõi của dự án.

Mục tiêu:
- Loại bỏ thông tin trùng lặp.
- Hợp nhất các công việc liên quan thành insight cấp cao hơn.
- Tập trung vào kiến trúc, quyết định kỹ thuật, luồng nghiệp vụ, thay đổi quan trọng và bài học rút ra.
- Không liệt kê từng task nhỏ.
- Không mô tả tiến độ cá nhân.
- Ưu tiên tri thức có giá trị cho người mới tiếp quản dự án.

QUY TẮC:
1. Chỉ trả về JSON hợp lệ.
2. Không giải thích ngoài JSON.
3. Mỗi insight phải là một phát hiện hoặc hiểu biết cấp hệ thống.
4. Không lặp lại cùng một ý dưới nhiều cách diễn đạt.
5. Tạo title ngắn gọn phản ánh chủ đề chính của toàn bộ dữ liệu.

Định dạng:
{
  "title": "Tên tri thức tổng hợp",
  "insights": [
    "Insight cấp cao 1",
    "Insight cấp cao 2",
    "Insight cấp cao 3"
  ]
}`;
    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: combinedContent }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });
    } catch (networkError: unknown) {
      console.error("Gemini API Network/Fetch Error:", networkError);
      const message = networkError instanceof Error ? networkError.message : String(networkError);
      return NextResponse.json({ error: `Lỗi kết nối mạng đến API Gemini: ${message}` }, { status: 503 });
    }

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`Gemini API error (Status ${geminiResponse.status}):`, errText);
      let errMsg = `Lỗi kết nối API Gemini (Status: ${geminiResponse.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errMsg += `: ${parsed.error.message}`;
        }
      } catch {
        // Ignore JSON parsing errors for error text
      }
      return NextResponse.json({ error: errMsg }, { status: geminiResponse.status || 502 });
    }

    let geminiData: unknown;
    try {
      geminiData = await geminiResponse.json();
    } catch (jsonError: unknown) {
      console.error("Failed to parse Gemini response as JSON:", jsonError);
      return NextResponse.json({ error: "Phản hồi từ Gemini không phải là JSON hợp lệ" }, { status: 502 });
    }

    let resultJSON;
    try {
      const typedData = geminiData as {
        candidates?: {
          content?: {
            parts?: {
              text?: string;
            }[];
          };
        }[];
      };
      const rawText = typedData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Không tìm thấy text trong candidates");
      }
      const cleanJsonStr = rawText.replace(/```json\n?|\n?```/g, "").trim();
      resultJSON = JSON.parse(cleanJsonStr);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError, geminiData);
      return NextResponse.json({ error: "Lỗi định dạng phản hồi AI từ Gemini" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      title: resultJSON.title || "Tổng hợp tri thức dự án",
      insights: resultJSON.insights || [],
      contributors,
      totalTokens,
      model: "Auto-Summary (Gemini 2.5 Flash)",
    });
  } catch (error) {
    console.error("Internal Server Error in summarize-project:", error);
    return NextResponse.json({ error: "Lỗi hệ thống nội bộ" }, { status: 500 });
  }
}
