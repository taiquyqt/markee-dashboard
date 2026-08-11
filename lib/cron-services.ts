/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

// Khởi tạo Supabase Admin Client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Thiếu cấu hình Supabase URL hoặc Service Role Key trong .env");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Helper gửi Telegram Message chung với định tuyến Topic/Thread ID
export async function sendTelegramMessage(text: string, threadId?: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[Telegram Cron] Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong .env");
    return { success: false, reason: "Missing Telegram config" };
  }

  const payload: Record<string, any> = {
    chat_id: chatId,
    parse_mode: "HTML",
    text,
  };

  if (threadId) {
    payload.message_thread_id = Number(threadId);
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("[Telegram Cron] Telegram API error:", data);
      return { success: false, error: data.description };
    }

    return { success: true, result: data.result };
  } catch (err: any) {
    console.error("[Telegram Cron] Error sending Telegram message:", err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// LUỒNG 1: QUÉT BẢN QUYỀN AI HẾT HẠN (Thread ID: TELEGRAM_EXPIRATION_THREAD_ID)
// ==========================================
export async function runAIExpirationCheck() {
  console.log("[Cron Service] Starting AI Expiration Check...");
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Múi giờ Việt Nam (Asia/Ho_Chi_Minh)
    const vnNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const vnTomorrow = new Date(vnNow);
    vnTomorrow.setDate(vnTomorrow.getDate() + 1);

    const yyyy = vnTomorrow.getFullYear();
    const mm = String(vnTomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(vnTomorrow.getDate()).padStart(2, "0");

    const tomorrowDbStr = `${yyyy}-${mm}-${dd}`;
    const tomorrowDisplayStr = `${dd}/${mm}/${yyyy}`;

    const { data: licenses, error } = await supabaseAdmin.from("ai_licenses").select("*").eq("expiration_date", tomorrowDbStr);

    if (error) {
      console.error("[Cron Service] Error fetching ai_licenses:", error.message);
      return { success: false, error: error.message };
    }

    if (!licenses || licenses.length === 0) {
      console.log(`[Cron Service] Không có license AI nào hết hạn ngày mai (${tomorrowDbStr})`);
      return { success: true, message: `Không có license nào hết hạn ngày mai (${tomorrowDbStr})`, notifiedCount: 0 };
    }

    // Lọc license Công ty có phí
    const companyLicenses = licenses.filter((lic) => {
      const isPersonal = lic.plan_name && lic.plan_name.includes("(Cá nhân)");
      const hasCost = lic.monthly_cost && lic.monthly_cost > 0;
      return !isPersonal && hasCost;
    });

    if (companyLicenses.length === 0) {
      console.log(`[Cron Service] Không có license Công ty có phí nào hết hạn ngày mai (${tomorrowDbStr})`);
      return { success: true, message: `Không có license Công ty có phí hết hạn ngày mai`, notifiedCount: 0 };
    }

    const lines: string[] = [];
    companyLicenses.forEach((lic) => {
      const costFormatted = (lic.monthly_cost || 0).toLocaleString("vi-VN");
      lines.push(`- <code>${lic.email}</code> (Công cụ: ${lic.ai_tool} - Gói: ${lic.plan_name}) - Chi phí: ${costFormatted} VNĐ`);
    });

    const messageText = `⚠️ <b>BÁO CÁO SẮP HẾT HẠN BẢN QUYỀN AI</b>\n\n⏳ <b>CÁC TÀI KHOẢN SẼ HẾT HẠN VÀO NGÀY MAI (${tomorrowDisplayStr}):</b>\n${lines.join("\n")}\n\n👉 Đề nghị bộ phận liên quan chuẩn bị gia hạn để không gián đoạn dịch vụ!`;

    const threadId = process.env.TELEGRAM_EXPIRATION_THREAD_ID;
    const res = await sendTelegramMessage(messageText, threadId);

    return {
      success: true,
      notifiedCount: companyLicenses.length,
      telegramResult: res,
    };
  } catch (err: any) {
    console.error("[Cron Service] Exception in runAIExpirationCheck:", err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// LUỒNG 2: HỐI CƯỚC THUÊ VPS (Thread ID: TELEGRAM_RENEWAL_THREAD_ID)
// ==========================================
export async function runVpsRenewalCheck() {
  console.log("[Cron Service] Starting VPS Renewal Check...");
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: rentals, error } = await supabaseAdmin.from("vps_rentals").select("*").neq("status", "cancelled");

    if (error) {
      console.error("[Cron Service] Error fetching vps_rentals:", error.message);
      return { success: false, error: error.message };
    }

    if (!rentals || rentals.length === 0) {
      console.log("[Cron Service] Không có VPS nào trong hệ thống");
      return { success: true, message: "Không có VPS nào trong hệ thống", notifiedCount: 0 };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const expiringRentals: any[] = [];
    rentals.forEach((r) => {
      if (!r.expires_at) return;
      const expDate = new Date(r.expires_at);
      const expStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      const diffTime = expStart.getTime() - todayStart.getTime();
      const daysDiff = Math.round(diffTime / (1000 * 3600 * 24));

      // Hạn trả tiền nằm trong vòng 1 tuần tới (-2 ngày quá hạn đến 7 ngày tới)
      if (daysDiff >= -2 && daysDiff <= 7) {
        expiringRentals.push({
          ...r,
          daysDiff,
        });
      }
    });

    if (expiringRentals.length === 0) {
      console.log("[Cron Service] Không có VPS nào sắp hết hạn trong vòng 7 ngày tới.");
      return { success: true, message: "Không có VPS nào sắp hết hạn trong vòng 7 ngày tới.", notifiedCount: 0 };
    }

    const threadId = process.env.TELEGRAM_RENEWAL_THREAD_ID;
    const results: any[] = [];

    for (const rental of expiringRentals) {
      const expDateObj = new Date(rental.expires_at);
      const formattedDate = expDateObj.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      let statusText = "";
      if (rental.daysDiff < 0) {
        statusText = `<b>⚠️ ĐÃ HẾT HẠN ${Math.abs(rental.daysDiff)} NGÀY!</b>`;
      } else if (rental.daysDiff === 0) {
        statusText = `<b>🚨 HẾT HẠN HÔM NAY!</b>`;
      } else {
        statusText = `<b>⏳ Còn ${rental.daysDiff} ngày nữa hết hạn</b>`;
      }

      const messageText = `
🖥️ <b>[THÔNG BÁO HỐI CƯỚC THUÊ VPS]</b>

👤 <b>Khách hàng:</b> ${rental.customer_name}
🏢 <b>Công ty:</b> ${rental.company_name || "Cá nhân / Chưa cập nhật"}
🌐 <b>IP VPS:</b> <code>${rental.vps_ip}</code>
📦 <b>Gói dịch vụ:</b> ${rental.package_name}
📅 <b>Hạn thanh toán:</b> ${formattedDate} (${statusText})
📞 <b>SĐT liên hệ:</b> ${rental.phone ? `<code>${rental.phone}</code>` : "Chưa có SĐT"}

📌 <i>Vui lòng liên hệ khách hàng để gia hạn dịch vụ VPS đúng hạn!</i>
      `.trim();

      const res = await sendTelegramMessage(messageText, threadId);
      results.push({ vps_ip: rental.vps_ip, customer_name: rental.customer_name, result: res });
    }

    return {
      success: true,
      notifiedCount: expiringRentals.length,
      rentals: results,
    };
  } catch (err: any) {
    console.error("[Cron Service] Exception in runVpsRenewalCheck:", err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// LUỒNG 3: BÁO HẾT TIỀN API / HẠN MỨC (Thread ID: TELEGRAM_MESSAGE_THREAD_ID)
// ==========================================
export async function runApiBalanceSyncCheck() {
  console.log("[Cron Service] Starting API Balance Sync Check...");
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: apps, error: appsError } = await supabaseAdmin.from("apps").select("*");

    if (appsError) {
      console.error("[Cron Service] Error fetching apps:", appsError.message);
      return { success: false, error: appsError.message };
    }

    if (!apps || apps.length === 0) {
      console.log("[Cron Service] Không có app nào để đồng bộ số dư");
      return { success: true, message: "Không có app nào để đồng bộ", results: [] };
    }

    const threadId = process.env.TELEGRAM_MESSAGE_THREAD_ID;
    const alertResults: any[] = [];

    for (const app of apps) {
      const balance = Number(app.remaining_balance || 0);
      const limit = Number(app.monthly_budget_usd || 0);
      const providerName = app.provider || "AI Provider";

      // Cảnh báo nếu số dư khả dụng <= 15% hạn mức ngân sách
      const warningThreshold = limit * 0.15;
      if (limit > 0 && balance <= warningThreshold) {
        const usagePercent = limit > 0 ? ((limit - balance) / limit) * 100 : 0;
        const text = `⚠️ <b>CẢNH BÁO SẮP CẠN SỐ DƯ API</b> ⚠️\n\nỨng dụng: <b>${app.name}</b> (${providerName})\nHạn mức còn lại: <code>$${balance.toFixed(2)}</code> (~ ${(balance * 3250).toLocaleString("vi-VN")}đ)\nTổng ngân sách cấp: <code>$${limit.toFixed(2)}</code> (~ ${(limit * 3250).toLocaleString("vi-VN")}đ)\nTỷ lệ sử dụng: <b>${usagePercent.toFixed(1)}%</b>\n\n🔴 <i>Vui lòng nạp thêm ngân sách tại ${providerName} để tránh gián đoạn dịch vụ.</i>`;

        const res = await sendTelegramMessage(text, threadId);
        alertResults.push({ app: app.name, balance, result: res });
      }
    }

    return {
      success: true,
      checkedAppsCount: apps.length,
      alertsSent: alertResults.length,
      alertResults,
    };
  } catch (err: any) {
    console.error("[Cron Service] Exception in runApiBalanceSyncCheck:", err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// HÀM TỔNG CHẠY TẤT CẢ 3 LUỒNG CRON
// ==========================================
export async function runAllCronTasks() {
  console.log("[Cron Scheduler] Triggering all 3 cron tasks...");
  const res1 = await runAIExpirationCheck();
  const res2 = await runVpsRenewalCheck();
  const res3 = await runApiBalanceSyncCheck();
  return {
    aiExpiration: res1,
    vpsRenewal: res2,
    apiBalanceSync: res3,
  };
}
