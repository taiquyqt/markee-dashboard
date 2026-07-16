import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { secret_key, model, input_tokens = 0, output_tokens = 0, cache_read_tokens = 0, cache_write_tokens = 0, total_tokens = 0, cost = 0, is_free = false } = payload;

    if (!secret_key) {
      return NextResponse.json({ error: "Unauthorized: missing secret_key" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Server config error: Missing Supabase URL or Service Role Key.");
      return NextResponse.json({ error: "Internal Server Error: Server misconfiguration" }, { status: 500 });
    }

    // Khởi tạo Supabase Admin Client với service role key để bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 1. Xác thực secret_key tồn tại trong bảng apps
    const { data: app, error: appError } = await supabaseAdmin.from("apps").select("id").eq("secret_key", secret_key).single();

    if (appError || !app) {
      return NextResponse.json({ error: "Unauthorized: Invalid secret_key" }, { status: 401 });
    }

    // 2. Truy vấn bảng pricing_models để tính toán chi phí động
    let calculatedCost = 0;
    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from("pricing_models")
      .select("*")
      .eq("model_name", model)
      .maybeSingle();

    if (pricingError) {
      console.error("Lỗi khi truy vấn pricing_models:", pricingError);
    }

    if (pricing) {
      const inputPrice = pricing.input_price || 0;
      const outputPrice = pricing.output_price || 0;
      const cachePrice = pricing.cache_price || 0;
      const cacheTokens = (cache_read_tokens || 0) + (cache_write_tokens || 0);
      calculatedCost = ((input_tokens * inputPrice) + (output_tokens * outputPrice) + (cacheTokens * cachePrice)) / 1000000;
    } else {
      // Không tìm thấy model: cost = 0, tự động insert model mới vào pricing_models
      calculatedCost = 0;
      
      // Nếu là model free, ta vẫn insert vào bảng giá nhưng set giá = 0 và không cần cảnh báo.
      const shouldAlert = !is_free;

      // Thực hiện insert bất đồng bộ model mới
      supabaseAdmin
        .from("pricing_models")
        .insert({
          model_name: model,
          input_price: 0,
          output_price: 0,
          cache_price: 0,
          is_alert: shouldAlert
        })
        .then(({ error: insertError }) => {
          if (insertError) {
            console.error("Lỗi khi tự động thêm model vào pricing_models:", insertError);
          } else {
            console.log(`Đã tự động thêm model mới '${model}' vào pricing_models (shouldAlert: ${shouldAlert})`);
          }
        });
    }

    // 3. Ghi nhận thông tin sử dụng vào bảng api_logs
    const { error: logError } = await supabaseAdmin.from("api_logs").insert({
      app_id: app.id,
      model,
      input_tokens,
      output_tokens,
      cache_read_tokens,
      cache_write_tokens,
      total_tokens,
      cost: calculatedCost,
      is_free,
    });

    if (logError) {
      console.error("Database insertion failed:", logError);
      return NextResponse.json({ error: "Internal Server Error: Failed to write logs" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "API usage log created successfully", cost: calculatedCost }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message || String(error) }, { status: 500 });
  }
}
