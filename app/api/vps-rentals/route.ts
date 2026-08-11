import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Client Supabase Nội bộ (Targeting internal vps_rentals table)
function getInternalSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

// Client Supabase Phụ / External (Web khách hàng / customer_leads)
function getExternalSupabase() {
  const url = process.env.EXTERNAL_SUPABASE_URL;
  const key = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY || process.env.EXTERNAL_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (err) {
    console.error('Lỗi khởi tạo External Supabase client:', err);
    return null;
  }
}

// GET: Lấy danh sách vps_rentals nội bộ và rawLeads (deal_stage = 'won') từ Supabase phụ
export async function GET() {
  try {
    const internalSupabase = getInternalSupabase();

    // 1. Query danh sách vps_rentals nội bộ
    let rentals: any[] = [];
    const { data: rentalData, error: rentalErr } = await internalSupabase
      .from('vps_rentals')
      .select('*')
      .order('expires_at', { ascending: true });

    if (rentalErr) {
      console.warn('Cảnh báo khi fetch vps_rentals nội bộ:', rentalErr.message);
    } else if (rentalData) {
      rentals = rentalData;
    }

    // 2. Query danh sách customer_leads (bắt buộc deal_stage = 'won') từ Supabase phụ
    let rawLeads: any[] = [];
    const externalSupabase = getExternalSupabase();
    if (externalSupabase) {
      const { data: leadData, error: leadErr } = await externalSupabase
        .from('customer_leads')
        .select('*')
        .eq('deal_stage', 'won')
        .order('created_at', { ascending: false });

      if (leadErr) {
        console.warn('Cảnh báo khi fetch customer_leads từ External Supabase:', leadErr.message);
      } else if (leadData) {
        rawLeads = leadData;
      }
    }

    return NextResponse.json({
      rentals,
      rawLeads,
    });
  } catch (error: any) {
    console.error('Lỗi API GET vps-rentals:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server nội bộ' }, { status: 500 });
  }
}

// POST: Tạo mới bản ghi thuê VPS vào bảng vps_rentals nội bộ
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_name, company_name, phone, vps_ip, package_name, expires_at, notes } = body;

    // Validate các trường bắt buộc
    if (!customer_name || !vps_ip || !package_name || !expires_at) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ các trường bắt buộc: Tên khách hàng, IP VPS, Gói thuê, và Ngày hết hạn.' },
        { status: 400 }
      );
    }

    const internalSupabase = getInternalSupabase();

    const payload = {
      customer_name: customer_name.trim(),
      company_name: company_name ? company_name.trim() : null,
      phone: phone ? phone.trim() : null,
      vps_ip: vps_ip.trim(),
      package_name: package_name.trim(),
      expires_at: expires_at,
      notes: notes ? notes.trim() : null,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await internalSupabase
      .from('vps_rentals')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Lỗi khi lưu vps_rentals:', error);
      return NextResponse.json({ error: error.message || 'Lỗi lưu dữ liệu database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Lỗi API POST vps-rentals:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server nội bộ' }, { status: 500 });
  }
}

// PUT: Cập nhật bản ghi thuê VPS hiện tại (chỉnh sửa / gia hạn cước)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, customer_name, company_name, phone, vps_ip, package_name, expires_at, notes, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID bản ghi cần cập nhật' }, { status: 400 });
    }

    if (!customer_name || !vps_ip || !package_name || !expires_at) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ các trường bắt buộc: Tên khách hàng, IP VPS, Gói thuê, và Ngày hết hạn.' },
        { status: 400 }
      );
    }

    const internalSupabase = getInternalSupabase();

    const updatePayload: Record<string, any> = {
      customer_name: customer_name.trim(),
      company_name: company_name ? company_name.trim() : null,
      phone: phone ? phone.trim() : null,
      vps_ip: vps_ip.trim(),
      package_name: package_name.trim(),
      expires_at: expires_at,
      notes: notes ? notes.trim() : null,
    };

    if (status) {
      updatePayload.status = status;
    }

    const { data, error } = await internalSupabase
      .from('vps_rentals')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Lỗi khi cập nhật vps_rentals:', error);
      return NextResponse.json({ error: error.message || 'Lỗi cập nhật database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Lỗi API PUT vps-rentals:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server nội bộ' }, { status: 500 });
  }
}

// DELETE: Xóa bản ghi thuê VPS theo ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID bản ghi cần xóa' }, { status: 400 });
    }

    const internalSupabase = getInternalSupabase();
    const { error } = await internalSupabase.from('vps_rentals').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server nội bộ' }, { status: 500 });
  }
}
