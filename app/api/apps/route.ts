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

// 1. GET: Lấy danh sách apps và tính toán lượng sử dụng thực tế từ bảng api_logs
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Lấy tất cả ứng dụng từ bảng apps
    const { data: appsData, error: appsError } = await supabaseAdmin
      .from("apps")
      .select("*")
      .order("created_at", { ascending: false });

    if (appsError) {
      console.error("Lỗi khi lấy danh sách apps:", appsError);
      return NextResponse.json({ error: appsError.message }, { status: 500 });
    }

    // Lấy thông tin sử dụng từ bảng api_logs
    const { data: logsData, error: logsError } = await supabaseAdmin
      .from("api_logs")
      .select("app_id, total_tokens, cost");

    if (logsError) {
      console.error("Lỗi khi lấy logs sử dụng:", logsError);
    }

    // Gộp dữ liệu apps với lượng sử dụng thực tế
    const appsWithStats = (appsData || []).map((app) => {
      const appLogs = (logsData || []).filter((log) => log.app_id === app.id);
      const tokens_used = appLogs.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
      const requests = appLogs.length;
      const cost = appLogs.reduce((sum, log) => sum + (log.cost || 0), 0);

      return {
        id: app.id,
        name: app.name,
        secret_key: app.secret_key,
        status: "active",
        tokens_used,
        token_limit: 5000000, // Định mức mặc định 5,000,000 tokens
        requests,
        cost,
        created_at: app.created_at ? app.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
      };
    });

    return NextResponse.json(appsWithStats);
  } catch (error: any) {
    console.error("Lỗi GET /api/apps:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// 2. POST: Tạo mới API Key/App
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { name } = payload;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tên ứng dụng là bắt buộc" }, { status: 400 });
    }

    // Sinh secret_key ngẫu nhiên sk_markee_[random_string]
    const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const secret_key = `sk_markee_${randomPart}`;

    const supabaseAdmin = getSupabaseAdmin();

    const { data: newApp, error: insertError } = await supabaseAdmin
      .from("apps")
      .insert({
        name: name.trim(),
        secret_key,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Lỗi khi insert app:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log("Đã tạo app mới:", newApp);

    // Trả về app mới kèm theo các metrics sử dụng bằng 0
    return NextResponse.json({
      id: newApp.id,
      name: newApp.name,
      secret_key: newApp.secret_key,
      status: "active",
      tokens_used: 0,
      token_limit: 5000000,
      requests: 0,
      cost: 0.0,
      created_at: newApp.created_at ? newApp.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
    });
  } catch (error: any) {
    console.error("Lỗi POST /api/apps:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// 3. PUT: Sửa tên ứng dụng
export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const { id, name } = payload;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: "Thiếu id ứng dụng hoặc tên mới" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: updatedApp, error: updateError } = await supabaseAdmin
      .from("apps")
      .update({ name: name.trim() })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Lỗi khi cập nhật app:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedApp);
  } catch (error: any) {
    console.error("Lỗi PUT /api/apps:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// 4. DELETE: Xóa ứng dụng/API Key
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu id ứng dụng cần xóa" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const parsedId = isNaN(Number(id)) ? id : Number(id);

    // Thực hiện xóa dòng trong bảng apps
    const { error: deleteError } = await supabaseAdmin
      .from("apps")
      .delete()
      .eq("id", parsedId);

    if (deleteError) {
      console.error("Lỗi khi xóa app:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Xóa API Key thành công" });
  } catch (error: any) {
    console.error("Lỗi DELETE /api/apps:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
