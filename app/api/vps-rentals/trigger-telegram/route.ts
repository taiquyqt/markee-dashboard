import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getInternalSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

// Hàm gửi tin nhắn qua Telegram Bot vào Topic "Hối Cước VPS" (#1523)
async function sendTelegramRenewalMessage(rental: {
  customer_name: string;
  company_name?: string | null;
  phone?: string | null;
  vps_ip: string;
  package_name: string;
  expires_at: string;
  daysDiff: number;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const threadId = process.env.TELEGRAM_RENEWAL_THREAD_ID;

  if (!botToken || !chatId) {
    console.warn('Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong biến môi trường');
    return { success: false, reason: 'Missing Telegram config' };
  }

  // Định dạng ngày hết hạn DD/MM/YYYY
  const expDateObj = new Date(rental.expires_at);
  const formattedDate = expDateObj.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Đếm ngày còn lại hoặc quá hạn
  let statusText = '';
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
🏢 <b>Công ty:</b> ${rental.company_name || 'Cá nhân / Chưa cập nhật'}
🌐 <b>IP VPS:</b> <code>${rental.vps_ip}</code>
📦 <b>Gói dịch vụ:</b> ${rental.package_name}
📅 <b>Hạn thanh toán:</b> ${formattedDate} (${statusText})
📞 <b>SĐT liên hệ:</b> ${rental.phone ? `<code>${rental.phone}</code>` : 'Chưa có SĐT'}

📌 <i>Vui lòng liên hệ khách hàng để gia hạn dịch vụ VPS đúng hạn!</i>
  `.trim();

  const telegramPayload: Record<string, any> = {
    chat_id: chatId,
    text: messageText,
    parse_mode: 'HTML',
  };

  // QUAN TRỌNG: Truyền message_thread_id để định tuyến tin nhắn vào đúng topic "Hối Cước VPS"
  if (threadId) {
    telegramPayload.message_thread_id = Number(threadId);
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram API error:', data);
      return { success: false, error: data.description };
    }

    return { success: true, result: data.result };
  } catch (err: any) {
    console.error('Lỗi khi gọi Telegram API:', err);
    return { success: false, error: err.message };
  }
}

// Handler xử lý trigger thủ công dành riêng cho Admin trên Giao diện Quản lý
async function handleTriggerTelegram() {
  try {
    const internalSupabase = getInternalSupabase();

    // Query tất cả các VPS đang hoạt động
    const { data: rentals, error } = await internalSupabase
      .from('vps_rentals')
      .select('*')
      .neq('status', 'cancelled');

    if (error) {
      console.error('Lỗi fetch vps_rentals:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rentals || rentals.length === 0) {
      return NextResponse.json({ message: 'Không có VPS nào trong hệ thống', notifiedCount: 0 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const expiringRentals: any[] = [];

    rentals.forEach((r) => {
      if (!r.expires_at) return;
      const expDate = new Date(r.expires_at);
      const expStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());

      // Số ngày còn lại tính từ hôm nay
      const diffTime = expStart.getTime() - todayStart.getTime();
      const daysDiff = Math.round(diffTime / (1000 * 3600 * 24));

      // Điều kiện: Hạn trả tiền nằm trong vòng 1 tuần tới (-2 ngày quá hạn đến 7 ngày tới)
      if (daysDiff >= -2 && daysDiff <= 7) {
        expiringRentals.push({
          ...r,
          daysDiff,
        });
      }
    });

    if (expiringRentals.length === 0) {
      return NextResponse.json({
        message: 'Không có VPS nào sắp hết hạn trong vòng 7 ngày tới.',
        notifiedCount: 0,
      });
    }

    // Gửi tin nhắn Telegram cho từng VPS sắp hết hạn vào Topic #1523
    const results: any[] = [];
    for (const rental of expiringRentals) {
      const res = await sendTelegramRenewalMessage(rental);
      results.push({
        vps_ip: rental.vps_ip,
        customer_name: rental.customer_name,
        daysDiff: rental.daysDiff,
        telegramResult: res,
      });
    }

    return NextResponse.json({
      success: true,
      notifiedCount: expiringRentals.length,
      rentals: results,
    });
  } catch (error: any) {
    console.error('Lỗi API trigger-telegram:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server nội bộ' }, { status: 500 });
  }
}

export async function GET() {
  return handleTriggerTelegram();
}

export async function POST() {
  return handleTriggerTelegram();
}
