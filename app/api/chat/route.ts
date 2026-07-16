import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { authenticateRequest, AuthError } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getModelInstance(modelName: string) {
  const name = modelName.toLowerCase();

  // 1. Nhóm Gemini
  if (name.includes("gemini") || name.includes("google")) {
    const apiKey = process.env.GEMINI_API_KEY;
    const google = createGoogleGenerativeAI({ apiKey });
    const actualModel = modelName.startsWith("google/") ? modelName.replace("google/", "") : modelName;
    return google(actualModel);
  }

  // 2. Model Auto (OpenRouter)
  if (name.includes("auto") || name.includes("free") || name.includes("openrouter")) {
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    const openrouter = createOpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    return openrouter(modelName);
  }

  // 3. Nhóm GPT & Claude (ShopAIKey)
  const apiKey = process.env.NEXT_PUBLIC_SHOPAIKEY_API_KEY || process.env.SHOPAIKEY_API_KEY || process.env.OPENAI_API_KEY;
  const shopaikey = createOpenAI({
    apiKey,
    baseURL: "https://api.shopaikey.com/v1",
  });
  return shopaikey(modelName);
}

const SYSTEM_PROMPT = `Bạn là Markee AI Assistant — trợ lý AI chuyên nghiệp của Markee AI Ops Center.

Vai trò của bạn:
1. Trợ giúp người dùng tạo prompt chất lượng cao cho các tác vụ Marketing, Sales, Dev, Ops
2. Gợi ý cải thiện quy trình làm việc với AI
3. Trả lời nhanh, chính xác, bằng tiếng Việt
4. Khi được inject asset từ Library, sử dụng kiến thức đó để đưa ra câu trả lời chính xác nhất

Định dạng:
- Trả lời ngắn gọn, có cấu trúc rõ ràng
- Dùng markdown để định dạng (tiêu đề, danh sách, in đậm)
- Luôn ưu tiên tiếng Việt, chỉ dùng tiếng Anh cho thuật ngữ kỹ thuật`;

export async function POST(req: Request) {
  try {
    let user: { id: string; email: string } | null = null;
    let supabase: any = null;

    let secretKey = "";
    const authHeader = req.headers.get("authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // 1. APP BÊN NGOÀI: Bắt buộc check Auth đầy đủ
      secretKey = authHeader.split(" ")[1];
      const authResult = await authenticateRequest(req);
      user = authResult.user;
      supabase = authResult.supabase;

      if (!user || !supabase) {
        return NextResponse.json({ error: "Unauthorized: Access denied (External App)" }, { status: 401 });
      }
    } else {
      // 2. DASHBOARD NỘI BỘ: Cấp quyền tuyệt đối dựa vào ENV Key
      secretKey = process.env.MARKEE_INTERNAL_API_KEY || "";
      if (!secretKey) {
        return NextResponse.json({ error: "Missing Internal API Key" }, { status: 500 });
      }

      // Giả lập user và admin Supabase client để vượt qua các bước check
      user = { id: "admin-internal", email: "admin@markee.io" };

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Fallback anon key if service role is empty
      if (supabaseUrl && supabaseServiceKey) {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
      } else {
        return NextResponse.json({ error: "Missing Supabase Config" }, { status: 500 });
      }
    }

    const body = await req.json();
    const { messages, conversationId, sessionId, model: requestedModel, stream } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Missing messages" }, { status: 400 });
    }

    if (sessionId) {
      const { data: session, error } = await supabase.from("chat_sessions").select("id").eq("id", sessionId).eq("user_id", user.email).single();

      if (error || !session) {
        return Response.json({ error: "Session not found or access denied" }, { status: 403 });
      }
    } else if (conversationId) {
      const { data: conversation, error } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.email).single();

      if (error || !conversation) {
        return Response.json({ error: "Conversation not found or access denied" }, { status: 403 });
      }
    }

    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    const userContent = lastUserMessage ? (typeof lastUserMessage.content === "string" ? lastUserMessage.content : JSON.stringify(lastUserMessage.content)) : "";

    if (userContent) {
      if (sessionId) {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "user",
          content: userContent,
        });
      } else if (conversationId) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          role: "user",
          content: userContent,
        });
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
      }
    }

    const modelName = requestedModel || "gpt-4o";
    const name = modelName.toLowerCase();

    // Xử lý proxy non-streaming cho Client Component
    if (stream === false) {
      // 1. Nhóm Gemini
      if (name.includes("gemini") || name.includes("google")) {
        const geminiModel = modelName.replace("google/", "");
        const geminiKey = process.env.GEMINI_API_KEY || "";

        let systemInstruction = undefined;
        const contents = [];

        for (const m of messages) {
          if (m.role === "system") {
            systemInstruction = {
              parts: [{ text: m.content }],
            };
          } else {
            contents.push({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            });
          }
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            ...(systemInstruction ? { systemInstruction } : {}),
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return NextResponse.json({ error: `Gemini API request failed with status ${response.status}: ${errText}` }, { status: response.status });
        }

        const data = await response.json();

        // Ghi log ngầm cho Gemini (is_free = true)
        const usage = data?.usageMetadata;
        if (usage) {
          console.log("=== SERVER: ĐÃ BẮT ĐƯỢC USAGE (Gemini) ===", usage);
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          fetch(`${baseUrl}/api/log-usage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              secret_key: process.env.MARKEE_INTERNAL_API_KEY,
              model: modelName,
              input_tokens: usage.promptTokenCount || 0,
              output_tokens: usage.candidatesTokenCount || 0,
              total_tokens: usage.totalTokenCount || 0,
              is_free: true,
            }),
          })
            .then((res) => console.log("=== SERVER: GHI LOG WEBHOOK SUCCESS (Gemini) ===", res.status))
            .catch((err) => console.error("=== SERVER: LỖI GHI LOG (Gemini) ===", err));
        }

        return NextResponse.json(data);
      }

      // 2. Nhóm OpenRouter
      if (name.includes("auto") || name.includes("free") || name.includes("openrouter")) {
        const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "";
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "Markee AI",
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return NextResponse.json({ error: `OpenRouter request failed with status ${response.status}: ${errText}` }, { status: response.status });
        }

        const data = await response.json();
        const usage = data?.usage;
        if (usage) {
          console.log("=== SERVER: ĐÃ BẮT ĐƯỢC USAGE (OpenRouter) ===", usage);
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          fetch(`${baseUrl}/api/log-usage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              secret_key: process.env.MARKEE_INTERNAL_API_KEY,
              model: data.model || modelName,
              input_tokens: usage.prompt_tokens || usage.input_tokens || 0,
              output_tokens: usage.completion_tokens || usage.output_tokens || 0,
              total_tokens: usage.total_tokens || 0,
              is_free: true,
            }),
          })
            .then((res) => console.log("=== SERVER: GHI LOG WEBHOOK SUCCESS (OpenRouter) ===", res.status))
            .catch((err) => console.error("=== SERVER: LỖI GHI LOG (OpenRouter) ===", err));
        }

        return NextResponse.json(data);
      }

      // 3. Nhóm ShopAIKey
      const apiKey = process.env.NEXT_PUBLIC_SHOPAIKEY_API_KEY || process.env.SHOPAIKEY_API_KEY || process.env.OPENAI_API_KEY || "";
      const response = await fetch("https://api.shopaikey.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json({ error: `ShopAIKey request failed with status ${response.status}: ${errText}` }, { status: response.status });
      }

      const data = await response.json();
      const usage = data?.usage;
      if (usage) {
        console.log("=== SERVER: ĐÃ BẮT ĐƯỢC USAGE (ShopAIKey) ===", usage);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        fetch(`${baseUrl}/api/log-usage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret_key: process.env.MARKEE_INTERNAL_API_KEY,
            model: data.model || modelName,
            input_tokens: usage.prompt_tokens || usage.input_tokens || 0,
            output_tokens: usage.completion_tokens || usage.output_tokens || 0,
            total_tokens: usage.total_tokens || 0,
            is_free: false,
          }),
        })
          .then((res) => console.log("=== SERVER: GHI LOG WEBHOOK SUCCESS (ShopAIKey) ===", res.status))
          .catch((err) => console.error("=== SERVER: LỖI GHI LOG (ShopAIKey) ===", err));
      }

      return NextResponse.json(data);
    }

    const modelInstance = getModelInstance(modelName);

    const result = streamText({
      model: modelInstance as any,
      system: SYSTEM_PROMPT,
      messages,
      providerOptions: {
        openai: {
          streamOptions: { includeUsage: true },
        },
      },
      onFinish: async (event) => {
        const { text, usage } = event;

        // 1. IN RA RAW DATA ĐỂ DEBUG:
        console.log("=== RAW DATA TỪ SHOPAIKEY ===");
        console.log(JSON.stringify(event, null, 2));
        console.log("=============================");

        if (text) {
          if (sessionId) {
            await supabase.from("chat_messages").insert({
              session_id: sessionId,
              role: "assistant",
              content: text,
            });
          } else if (conversationId) {
            await supabase.from("messages").insert({
              conversation_id: conversationId,
              role: "assistant",
              content: text,
            });
            await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
          }
        }

        // 2. LẤY USAGE VÀ GỬI WEBHOOK:
        console.log("=== BẮT ĐẦU GHI LOG ===", usage);

        if (usage) {
          try {
            const isFree = name.includes("gemini") || name.includes("google") || name.includes("auto") || name.includes("free") || name.includes("openrouter");

            const rawUsage = usage as any;
            const input_tokens = rawUsage.promptTokens || rawUsage.inputTokens || 0;
            const output_tokens = rawUsage.completionTokens || rawUsage.outputTokens || 0;
            const total_tokens = rawUsage.totalTokens || input_tokens + output_tokens || 0;

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const res = await fetch(`${baseUrl}/api/log-usage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                secret_key: process.env.MARKEE_INTERNAL_API_KEY,
                model: modelName,
                input_tokens,
                output_tokens,
                total_tokens,
                is_free: isFree,
              }),
            });
            console.log("=== KẾT QUẢ GHI LOG ===", res.status);
          } catch (error) {
            console.error("=== LỖI GHI LOG ===", error);
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Chat API error:", error);
    return Response.json({ error: "Lỗi hệ thống AI Chat" }, { status: 500 });
  }
}
