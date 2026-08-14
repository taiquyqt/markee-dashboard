/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function sendTelegramAlert(
  appName: string,
  providerName: string,
  balance: number,
  limit: number,
  usagePercent: number,
  alertTier: 'warning' | 'critical'
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const threadId = process.env.TELEGRAM_MESSAGE_THREAD_ID;

  if (!token || !chatId) {
    console.error("Thiếu cấu hình Telegram Bot Token hoặc Chat ID trong biến môi trường.");
    return;
  }

  let text = '';
  if (alertTier === 'critical') {
    text = `🚨 <b>KHẨN CẤP: API CẠN KIỆT NGÂN SÁCH</b> 🚨\n\n🚨 KHẨN CẤP: Ứng dụng <b>${appName}</b> (${providerName}) đã cạn kiệt ngân sách (<b>${usagePercent.toFixed(1)}%</b>). Vui lòng nạp tiền ngay để không gián đoạn dịch vụ!\n\nHạn mức còn lại: <code>$${balance.toFixed(2)}</code> (~ ${(balance * 3250).toLocaleString("vi-VN")}đ)\nTổng ngân sách cấp: <code>$${limit.toFixed(2)}</code> (~ ${(limit * 3250).toLocaleString("vi-VN")}đ)`;
  } else {
    text = `⚠️ <b>CẢNH BÁO SẮP HẾT NGÂN SÁCH API</b> ⚠️\n\n⚠️ Chú ý: Ứng dụng <b>${appName}</b> (${providerName}) đã dùng hết <b>${usagePercent.toFixed(1)}%</b> ngân sách (Chỉ còn dưới 10%).\nHạn mức còn lại: <code>$${balance.toFixed(2)}</code> (~ ${(balance * 3250).toLocaleString("vi-VN")}đ)\nTổng ngân sách cấp: <code>$${limit.toFixed(2)}</code> (~ ${(limit * 3250).toLocaleString("vi-VN")}đ)`;
  }

  try {
    const payload: any = {
      chat_id: chatId,
      parse_mode: "HTML",
      text: text,
    };

    if (threadId) {
      payload.message_thread_id = threadId;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Telegram API error (HTTP ${res.status}): ${errorText}`);
    } else {
      console.log(`Đã gửi cảnh báo Telegram (${alertTier}) thành công cho app: ${appName}`);
    }
  } catch (error) {
    console.error("Lỗi khi kết nối gửi tin nhắn Telegram:", error);
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}

async function handleSync(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 2. Lấy tất cả apps
    const { data: apps, error: appsError } = await supabaseAdmin.from("apps").select("*");

    if (appsError) {
      console.error("Lỗi lấy danh sách apps trong cronjob:", appsError);
      return NextResponse.json({ error: appsError.message }, { status: 500 });
    }

    if (!apps || apps.length === 0) {
      return NextResponse.json({ success: true, message: "Không có app nào để đồng bộ", results: [] });
    }

    // Lấy ngày động
    const now = new Date();
    const currentYear = now.getFullYear();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const startDate = `${currentYear}-01-01`;
    const endDate = todayStr;

    const results = [];

    // 3. Lặp qua từng app để đồng bộ số dư
    for (const app of apps) {
      const provider = app.provider || "shopaikey";
      const providerLabel = provider === "dataforseo" ? "DataForSEO" : "ShopAIKey";

      try {
        let hardLimitUsd = 0;
        let totalUsedUsd = 0;
        let balanceUsd = 0;

        if (provider === "dataforseo") {
          const apiLogin = app.api_login;
          const apiPassword = app.secret_key;

          if (!apiLogin || !apiPassword || !apiLogin.trim() || !apiPassword.trim()) {
            results.push({
              app_id: app.id,
              app_name: app.name,
              provider,
              status: "skipped",
              reason: "Thiếu API Login hoặc API Password",
            });
            continue;
          }

          const authHeaderValue = `Basic ${Buffer.from(`${apiLogin.trim()}:${apiPassword.trim()}`).toString("base64")}`;

          const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
            method: "GET",
            headers: {
              Authorization: authHeaderValue,
            },
            cache: "no-store",
          });

          if (res.status === 401) {
            throw new Error("Sai API Login hoặc API Password cho DataForSEO. Vui lòng kiểm tra lại Credentials.");
          }

          if (!res.ok) {
            throw new Error(`DataForSEO API error (HTTP ${res.status})`);
          }

          const data = await res.json();
          if (data.status_code !== 20000) {
            throw new Error(data.message || `DataForSEO API error (Code ${data.status_code})`);
          }

          const moneyData = data.tasks?.[0]?.result?.[0]?.money;
          if (!moneyData) {
            throw new Error("Không thể đọc thông tin số dư tài chính từ DataForSEO");
          }

          balanceUsd = Math.round(Number(moneyData.balance || 0) * 100) / 100;
          hardLimitUsd = Math.round(Number(moneyData.total || 0) * 100) / 100;
          totalUsedUsd = Math.round(Math.max(0, hardLimitUsd - balanceUsd) * 100) / 100;
        } else {
          const key = app.secret_key;
          if (!key || !key.trim()) {
            results.push({
              app_id: app.id,
              app_name: app.name,
              provider,
              status: "skipped",
              reason: "Secret Key rỗng",
            });
            continue;
          }

          // API 1: Lấy billing subscription
          const subRes = await fetch("https://api.shopaikey.com/v1/dashboard/billing/subscription", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${key.trim()}`,
            },
            cache: "no-store",
          });

          if (!subRes.ok) {
            throw new Error(`Billing API error (HTTP ${subRes.status})`);
          }

          const subData = await subRes.json();
          const hardLimitUsdRaw = Number(subData.hard_limit_usd || 0);
          hardLimitUsd = Math.round(hardLimitUsdRaw * 100) / 100;

          // API 2: Lấy usage
          const usageRes = await fetch(`https://api.shopaikey.com/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${key.trim()}`,
            },
            cache: "no-store",
          });

          if (!usageRes.ok) {
            throw new Error(`Usage API error (HTTP ${usageRes.status})`);
          }

          const usageData = await usageRes.json();
          const totalUsageCents = Number(usageData.total_usage || 0);
          totalUsedUsd = Math.round((totalUsageCents / 100) * 100) / 100;

          balanceUsd = Math.round((hardLimitUsd - totalUsedUsd) * 100) / 100;
        }

        const status = balanceUsd > 0 ? "active" : "depleted";

        // Logic Cảnh báo Telegram & Anti-Spam (Mốc 90% & 99%)
        const usagePercent = hardLimitUsd > 0 ? (totalUsedUsd / hardLimitUsd) * 100 : 0;
        const currentAlertLevel = String(app.alert_level || (app.is_low_balance_alerted ? '90' : 'none'));

        let targetAlertLevel = 'none';
        let alertTier: 'none' | 'warning' | 'critical' = 'none';

        if (usagePercent >= 99) {
          targetAlertLevel = '99';
          alertTier = 'critical';
        } else if (usagePercent >= 90) {
          targetAlertLevel = '90';
          alertTier = 'warning';
        } else {
          targetAlertLevel = 'none';
          alertTier = 'none';
        }

        // Chống spam: Chỉ gửi nếu vượt mốc chưa thông báo
        let shouldSendAlert = false;
        if (targetAlertLevel === '99' && currentAlertLevel !== '99') {
          shouldSendAlert = true;
        } else if (targetAlertLevel === '90' && currentAlertLevel !== '90' && currentAlertLevel !== '99') {
          shouldSendAlert = true;
        }

        if (shouldSendAlert) {
          await sendTelegramAlert(app.name, providerLabel, balanceUsd, hardLimitUsd, usagePercent, alertTier as 'warning' | 'critical');
        }

        const isLowBalanceAlerted = targetAlertLevel !== 'none';

        // Update bảng apps
        await supabaseAdmin
          .from("apps")
          .update({
            total_granted: hardLimitUsd,
            total_used: totalUsedUsd,
            balance: balanceUsd,
            status,
            alert_level: targetAlertLevel,
            is_low_balance_alerted: isLowBalanceAlerted,
          })
          .eq("id", app.id);

        // Insert bảng balance_history
        await supabaseAdmin.from("balance_history").insert({
          app_id: app.id,
          total_used: totalUsedUsd,
          balance: balanceUsd,
        });

        results.push({
          app_id: app.id,
          app_name: app.name,
          provider,
          status: "success",
          total_granted: hardLimitUsd,
          total_used: totalUsedUsd,
          balance: balanceUsd,
        });
      } catch (err: any) {
        console.error(`Cron sync failed for app ${app.name} (${providerLabel}):`, err.message || err);

        await supabaseAdmin
          .from("apps")
          .update({
            status: "depleted",
          })
          .eq("id", app.id);

        results.push({
          app_id: app.id,
          app_name: app.name,
          provider,
          status: "failed",
          reason: err.message || String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cronjob đồng bộ số dư hoàn tất",
      date_range: { start_date: startDate, end_date: endDate },
      results,
    });
  } catch (error: any) {
    console.error("Lỗi Cronjob /api/cron/sync-balances:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
