import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration env variables.");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { share_id, user_id } = payload;

    if (!share_id) {
      return NextResponse.json({ error: "Thiếu share_id" }, { status: 400 });
    }
    if (!user_id) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục trò chuyện" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Tìm chat session gốc từ share_id
    const { data: originalSession, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("*")
      .eq("share_id", share_id)
      .single();

    if (sessionError || !originalSession) {
      console.error("Không tìm thấy session gốc:", sessionError);
      return NextResponse.json({ error: "Không tìm thấy đoạn chat được chia sẻ" }, { status: 404 });
    }

    // 2. Lấy tất cả tin nhắn của session gốc
    const { data: originalMessages, error: messagesError } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("session_id", originalSession.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Lỗi khi lấy tin nhắn gốc:", messagesError);
      return NextResponse.json({ error: "Không thể tải tin nhắn của đoạn chat được chia sẻ" }, { status: 500 });
    }

    // 3. Tạo một session mới thuộc về user hiện tại
    const newSessionId = crypto.randomUUID();
    const newTitle = originalSession.title.startsWith("[Copy]") 
      ? originalSession.title 
      : `[Copy] ${originalSession.title}`;

    const { data: newSession, error: createSessionError } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        id: newSessionId,
        title: newTitle,
        user_id,
        project_id: null // Clone sang không thuộc dự án cũ của người khác
      })
      .select("*")
      .single();

    if (createSessionError) {
      console.error("Lỗi khi tạo session mới:", createSessionError);
      return NextResponse.json({ error: createSessionError.message }, { status: 500 });
    }

    // 4. Copy toàn bộ tin nhắn sang session mới
    if (originalMessages && originalMessages.length > 0) {
      const messagesToInsert = originalMessages.map((msg) => ({
        session_id: newSessionId,
        role: msg.role,
        content: msg.content,
        attached_knowledge: msg.attached_knowledge,
      }));

      const { error: insertMessagesError } = await supabaseAdmin
        .from("chat_messages")
        .insert(messagesToInsert);

      if (insertMessagesError) {
        console.error("Lỗi khi copy tin nhắn:", insertMessagesError);
        // Xóa session rỗng vừa tạo để rollback
        await supabaseAdmin.from("chat_sessions").delete().eq("id", newSessionId);
        return NextResponse.json({ error: "Lỗi trong quá trình sao chép các tin nhắn" }, { status: 500 });
      }
    }

    console.log(`Đã nhân bản chat session thành công! Session ID mới: ${newSessionId}`);

    return NextResponse.json({ success: true, new_session_id: newSessionId });
  } catch (error: any) {
    console.error("Lỗi POST /api/share/clone:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
