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

// POST: Tạo/Cập nhật share_id cho một đoạn chat session
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { chat_id } = payload;

    if (!chat_id) {
      return NextResponse.json({ error: "Thiếu chat_id" }, { status: 400 });
    }

    // Tự sinh mã UUID ngẫu nhiên
    const share_id = crypto.randomUUID();

    const supabaseAdmin = getSupabaseAdmin();

    // Cập nhật cột share_id trong bảng chat_sessions
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({ share_id })
      .eq("id", chat_id)
      .select("id, share_id")
      .single();

    if (updateError) {
      console.error("Lỗi khi cập nhật share_id cho chat session:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`Đã tạo share link cho chat_id: ${chat_id}, share_id: ${share_id}`);

    return NextResponse.json({ share_id });
  } catch (error: any) {
    console.error("Lỗi POST /api/share:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
