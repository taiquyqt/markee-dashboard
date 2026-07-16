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

// 1. GET: Lấy danh sách bảng giá các model từ bảng pricing_models
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: pricingModels, error } = await supabaseAdmin
      .from("pricing_models")
      .select("*")
      .order("model_name", { ascending: true });

    if (error) {
      console.error("Lỗi khi lấy pricing_models:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(pricingModels || []);
  } catch (error: any) {
    console.error("Lỗi GET /api/pricing-models:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// 2. PUT: Cập nhật cấu hình giá của một model
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { model_name, input_price, output_price, cache_price } = body;

    if (!model_name) {
      return NextResponse.json({ error: "Thiếu tên model_name cần cập nhật" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Thực hiện cập nhật bảng pricing_models và reset is_alert về false
    const { data: updatedData, error } = await supabaseAdmin
      .from("pricing_models")
      .update({
        input_price: Number(input_price) || 0,
        output_price: Number(output_price) || 0,
        cache_price: Number(cache_price) || 0,
        is_alert: false // Reset cảnh báo
      })
      .eq("model_name", model_name)
      .select()
      .single();

    if (error) {
      console.error("Lỗi khi cập nhật pricing_models:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedData);
  } catch (error: any) {
    console.error("Lỗi PUT /api/pricing-models:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
