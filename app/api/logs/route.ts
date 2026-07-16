import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Khởi tạo Supabase Admin Client
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

// GET: Lấy lịch sử sử dụng logs của một app cụ thể
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("app_id");

    if (!appId) {
      return NextResponse.json({ error: "Thiếu tham số app_id" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Kiểm tra ID xem là số hay UUID
    const parsedAppId = isNaN(Number(appId)) ? appId : Number(appId);

    // 2. Truy vấn bảng api_logs lọc theo app_id, sắp xếp created_at desc
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("api_logs")
      .select("*")
      .eq("app_id", parsedAppId)
      .order("created_at", { ascending: false });

    if (logsError) {
      console.error("Lỗi khi lấy log từ api_logs:", logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    return NextResponse.json(logs || []);
  } catch (error: any) {
    console.error("Lỗi GET /api/logs:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
