'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Plus,
  Search,
  AlertTriangle,
  Send,
  Phone,
  Copy,
  Check,
  Trash2,
  Calendar,
  Building2,
  User,
  RefreshCw,
  Clock,
  ShieldAlert,
  Zap,
  Info,
  Pencil,
} from 'lucide-react';

export interface VpsRentalItem {
  id: number;
  customer_name: string;
  company_name?: string | null;
  phone?: string | null;
  vps_ip: string;
  package_name: string;
  expires_at: string;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface RawLeadItem {
  id: number | string;
  name?: string;
  full_name?: string;
  customer_name?: string;
  company?: string;
  company_name?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  deal_stage?: string;
}

export default function VpsRentalsManagementDashboard() {
  const [rentals, setRentals] = useState<VpsRentalItem[]>([]);
  const [rawLeads, setRawLeads] = useState<RawLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'expiring' | 'expired'>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal Thêm / Chỉnh sửa VPS
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<VpsRentalItem | null>(null);

  const [selectedLeadIndex, setSelectedLeadIndex] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [vpsIp, setVpsIp] = useState('');
  const [packageName, setPackageName] = useState('VPS Pro - 4 vCPU / 8GB RAM');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Xóa
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchVpsRentalsData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vps-rentals');
      if (!res.ok) throw new Error('Không thể tải danh sách cho thuê VPS');
      const data = await res.json();
      setRentals(data.rentals || []);
      setRawLeads(data.rawLeads || []);
    } catch (err: any) {
      console.error('Error fetching vps-rentals:', err);
      showToast(err.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVpsRentalsData();
  }, []);

  // Tính toán số ngày còn lại
  const getDaysRemaining = (expiresAtStr: string) => {
    if (!expiresAtStr) return 999;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expDate = new Date(expiresAtStr);
    const expStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
    const diffTime = expStart.getTime() - todayStart.getTime();
    return Math.round(diffTime / (1000 * 3600 * 24));
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalRentals = rentals.length;
    let expiringCount = 0;
    let expiredCount = 0;

    rentals.forEach((item) => {
      const days = getDaysRemaining(item.expires_at);
      if (days < 0) {
        expiredCount++;
      } else if (days <= 7) {
        expiringCount++;
      }
    });

    return {
      totalRentals,
      expiringCount,
      expiredCount,
      totalAlerts: expiringCount + expiredCount,
      leadsCount: rawLeads.length,
    };
  }, [rentals, rawLeads]);

  // Filter rentals
  const filteredRentals = useMemo(() => {
    return rentals.filter((item) => {
      const matchSearch =
        item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vps_ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.phone || '').includes(searchTerm) ||
        item.package_name.toLowerCase().includes(searchTerm.toLowerCase());

      const days = getDaysRemaining(item.expires_at);
      if (filterStatus === 'expiring') {
        return matchSearch && days >= 0 && days <= 7;
      }
      if (filterStatus === 'expired') {
        return matchSearch && days < 0;
      }

      return matchSearch;
    });
  }, [rentals, searchTerm, filterStatus]);

  // Xử lý mở Modal ở chế độ THÊM MỚI
  const handleOpenAddModal = () => {
    setEditingRental(null);
    setCustomerName('');
    setCompanyName('');
    setPhone('');
    setVpsIp('');
    setPackageName('VPS Pro - 4 vCPU / 8GB RAM');
    setExpiresAt('');
    setNotes('');
    setSelectedLeadIndex('');
    setIsAddModalOpen(true);
  };

  // Xử lý mở Modal ở chế độ CHỈNH SỬA / GIA HẠN
  const handleOpenEditModal = (item: VpsRentalItem) => {
    setEditingRental(item);
    setCustomerName(item.customer_name || '');
    setCompanyName(item.company_name || '');
    setPhone(item.phone || '');
    setVpsIp(item.vps_ip || '');
    setPackageName(item.package_name || 'VPS Pro - 4 vCPU / 8GB RAM');
    
    // Định dạng YYYY-MM-DD cho date input
    if (item.expires_at) {
      const formattedDateStr = item.expires_at.includes('T')
        ? item.expires_at.split('T')[0]
        : item.expires_at;
      setExpiresAt(formattedDateStr);
    } else {
      setExpiresAt('');
    }

    setNotes(item.notes || '');
    setSelectedLeadIndex('');
    setIsAddModalOpen(true);
  };

  // Xử lý chọn Lead từ dropdown để Auto-fill
  const handleSelectLead = (indexStr: string) => {
    setSelectedLeadIndex(indexStr);
    if (!indexStr) {
      return;
    }
    const idx = Number(indexStr);
    const lead = rawLeads[idx];
    if (lead) {
      setCustomerName(lead.name || lead.customer_name || lead.full_name || '');
      setCompanyName(lead.company || lead.company_name || '');
      setPhone(lead.phone || lead.mobile || '');
    }
  };

  // Submit Form Thêm mới / Chỉnh sửa VPS
  const handleSaveVpsRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !vpsIp.trim() || !packageName.trim() || !expiresAt) {
      showToast('Vui lòng nhập đầy đủ Tên khách hàng, IP VPS, Gói dịch vụ và Ngày hết hạn.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = editingRental !== null;
      const url = '/api/vps-rentals';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: Record<string, any> = {
        customer_name: customerName,
        company_name: companyName,
        phone: phone,
        vps_ip: vpsIp,
        package_name: packageName,
        expires_at: expiresAt,
        notes: notes,
      };

      if (isEdit) {
        payload.id = editingRental.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isEdit ? 'Lỗi khi cập nhật VPS' : 'Lỗi khi thêm VPS'));

      showToast(isEdit ? 'Cập nhật hợp đồng thuê VPS thành công!' : 'Thêm hợp đồng thuê VPS thành công!', 'success');
      setIsAddModalOpen(false);
      setEditingRental(null);

      // Reset form
      setCustomerName('');
      setCompanyName('');
      setPhone('');
      setVpsIp('');
      setPackageName('VPS Pro - 4 vCPU / 8GB RAM');
      setExpiresAt('');
      setNotes('');
      setSelectedLeadIndex('');

      fetchVpsRentalsData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi khi lưu dữ liệu', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy IP
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    showToast(`Đã sao chép IP: ${ip}`, 'info');
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Xóa VPS
  const handleDeleteRental = async (id: number) => {
    try {
      const res = await fetch(`/api/vps-rentals?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa hợp đồng thuê');
      showToast('Đã xóa thành công!', 'success');
      setRentals((prev) => prev.filter((item) => item.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-70 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white transition-all transform animate-in slide-in-from-top-2 ${
            toast.type === 'error'
              ? 'bg-red-600'
              : toast.type === 'info'
              ? 'bg-sky-600'
              : 'bg-emerald-600'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4" />
          ) : toast.type === 'info' ? (
            <Zap className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top 4 Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số VPS đang thuê */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Tổng VPS đang cho thuê</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.totalRentals}</h3>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
              Đang hoạt động
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Server className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Cần thu cước (<= 7 ngày) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Cần hối cước (≤ 7 ngày)</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.expiringCount}</h3>
            <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1">
              Trong vòng 7 ngày tới
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Đã quá hạn */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Đã quá hạn trả tiền</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.expiredCount}</h3>
            <span className="inline-flex items-center text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full mt-1">
              Cần liên hệ hối cước ngay
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Bot Telegram Nhắc Hạn (Thông Báo Admin) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-400">Bot Telegram Nhắc Hạn (Admin)</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-800">Topic #1523</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 shrink-0">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-2 leading-relaxed">
            Bot tự động gửi thông báo danh sách VPS hết hạn vào Telegram Topic để Admin nắm thông tin và chủ động liên hệ hối cước.
          </p>
        </div>
      </div>

      {/* Thanh Công Cụ: Tìm kiếm, Filter & Nút Thêm Mới */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Ô Tìm kiếm */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Tên khách hàng, Công ty, IP VPS, SĐT hoặc Gói thuê..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-markee-primary/20 focus:border-markee-primary transition-all text-slate-700 font-medium"
          />
        </div>

        {/* Tab Lọc theo trạng thái */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterStatus === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            Tất cả ({rentals.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('expiring')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterStatus === 'expiring'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-amber-700 bg-transparent'
            }`}
          >
            Sắp hết hạn ({stats.expiringCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('expired')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterStatus === 'expired'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-red-700 bg-transparent'
            }`}
          >
            Đã quá hạn ({stats.expiredCount})
          </button>
        </div>

        {/* Buttons Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchVpsRentalsData}
            title="Tải lại dữ liệu"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-markee-primary hover:bg-markee-hover text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm VPS Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* Bảng Danh Sách Thuê VPS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-markee-primary" />
            <p className="text-xs font-semibold">Đang tải danh sách cho thuê VPS...</p>
          </div>
        ) : filteredRentals.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Server className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">Không tìm thấy bản ghi cho thuê VPS nào</p>
            <p className="text-xs text-slate-400">Thêm mới hợp đồng hoặc thay đổi bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">STT</th>
                  <th className="py-3.5 px-4">Khách hàng & Công ty</th>
                  <th className="py-3.5 px-4">IP VPS</th>
                  <th className="py-3.5 px-4">Gói dịch vụ</th>
                  <th className="py-3.5 px-4">Số điện thoại (Gọi hối cước)</th>
                  <th className="py-3.5 px-4">Ngày hết hạn cước</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRentals.map((item, idx) => {
                  const days = getDaysRemaining(item.expires_at);
                  const expDateStr = new Date(item.expires_at).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  // Color coding for expiration status
                  let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  let daysText = `Còn ${days} ngày`;

                  if (days < 0) {
                    badgeBg = 'bg-red-100 text-red-700 border-red-300 font-bold';
                    daysText = `ĐÃ HẾT HẠN ${Math.abs(days)} NGÀY`;
                  } else if (days === 0) {
                    badgeBg = 'bg-red-50 text-red-600 border-red-200 font-bold animate-pulse';
                    daysText = 'HẾT HẠN HÔM NAY';
                  } else if (days <= 3) {
                    badgeBg = 'bg-red-50 text-red-600 border-red-200 font-bold';
                    daysText = `Còn ${days} ngày`;
                  } else if (days <= 7) {
                    badgeBg = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
                    daysText = `Còn ${days} ngày`;
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-400">{idx + 1}</td>

                      {/* Khách hàng & Công ty */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 mt-0.5">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{item.customer_name}</p>
                            {item.company_name ? (
                              <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span>{item.company_name}</span>
                              </p>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Cá nhân</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* IP VPS */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-mono text-xs font-bold text-slate-800">
                          <span>{item.vps_ip}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyIp(item.vps_ip)}
                            title="Sao chép IP"
                            className="text-slate-400 hover:text-markee-primary transition-colors cursor-pointer border-0 bg-transparent p-0.5"
                          >
                            {copiedIp === item.vps_ip ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Gói dịch vụ */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-semibold text-xs">
                          {item.package_name}
                        </span>
                      </td>

                      {/* SĐT với nút gọi nhanh hối cước */}
                      <td className="py-3.5 px-4">
                        {item.phone ? (
                          <a
                            href={`tel:${item.phone}`}
                            title="Bấm để gọi điện hối cước trực tiếp"
                            className="inline-flex items-center gap-1.5 text-slate-800 hover:text-emerald-600 font-bold text-xs hover:underline bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{item.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có SĐT</span>
                        )}
                      </td>

                      {/* Ngày hết hạn cước */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{expDateStr}</span>
                          </span>
                          <span
                            className={`inline-self-start px-2 py-0.5 rounded-md text-[10px] border ${badgeBg}`}
                          >
                            {daysText}
                          </span>
                        </div>
                      </td>

                      {/* Thao tác: Sửa (Edit) & Xóa (Delete) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            title="Chỉnh sửa / Gia hạn hợp đồng"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-markee-primary transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            title="Xóa hợp đồng này"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL THÊM / CHỈNH SỬA / GIA HẠN VPS KHÁCH HÀNG */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-markee-primary flex items-center justify-center font-bold">
                  {editingRental ? <Pencil className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {editingRental ? 'Chỉnh Sửa / Gia Hạn VPS Khách Hàng' : 'Thêm VPS Khách Hàng'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    {editingRental
                      ? 'Cập nhật thông tin máy chủ VPS hoặc điều chỉnh hạn thanh toán cước mới'
                      : 'Tạo thông tin gán IP máy chủ VPS và hạn thanh toán cước'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingRental(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer font-bold border-0 bg-transparent text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveVpsRental} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              {/* TRƯỜNG CHỌN NHANH KHÁCH HÀNG (Supabase ngoài - deal won) - Chỉ hiển thị khi THÊM MỚI */}
              {!editingRental && (
                <div className="bg-sky-50/70 border border-sky-200 p-3.5 rounded-xl space-y-1.5">
                  <label htmlFor="leadSelect" className="block text-xs font-bold text-sky-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-sky-600" />
                    <span>Chọn nhanh từ danh sách khách hàng (Supabase ngoài - deal won)</span>
                  </label>
                  <select
                    id="leadSelect"
                    value={selectedLeadIndex}
                    onChange={(e) => handleSelectLead(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-sky-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-medium cursor-pointer"
                  >
                    <option value="">-- Nhập thủ công (Không chọn) --</option>
                    {rawLeads.map((lead, i) => {
                      const lName = lead.name || lead.customer_name || lead.full_name || 'Khách hàng';
                      const lComp = lead.company || lead.company_name || '';
                      const lPhone = lead.phone || lead.mobile || '';
                      return (
                        <option key={i} value={i}>
                          [WON] {lName} {lComp ? `- ${lComp}` : ''} {lPhone ? `(${lPhone})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-sky-700 italic flex items-center gap-1">
                    <Info className="w-3 h-3 text-sky-500 shrink-0" />
                    <span>
                      Chọn để tự động điền Tên khách hàng, Công ty và SĐT. Nếu khách hàng mới, hãy chọn '-- Nhập thủ công --' và điền vào bên dưới.
                    </span>
                  </p>
                </div>
              )}

              {/* Tên khách hàng */}
              <div>
                <label htmlFor="customerNameInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Khách Hàng <span className="text-red-500">*</span>
                </label>
                <input
                  id="customerNameInput"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nhập tên khách hàng (vd: Nguyễn Văn A)..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-markee-primary font-medium"
                />
              </div>

              {/* Công ty & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="companyNameInput" className="block text-xs font-semibold text-slate-700 mb-1">
                    Công ty / Đơn vị
                  </label>
                  <input
                    id="companyNameInput"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nhập tên công ty..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-markee-primary font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="phoneInput" className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    id="phoneInput"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-markee-primary font-medium"
                  />
                </div>
              </div>

              {/* IP VPS & Gói thuê */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vpsIpInput" className="block text-xs font-semibold text-slate-700 mb-1">
                    Địa chỉ IP VPS <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="vpsIpInput"
                    type="text"
                    required
                    value={vpsIp}
                    onChange={(e) => setVpsIp(e.target.value)}
                    placeholder="103.145.2.10..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-mono focus:outline-none focus:border-markee-primary font-bold"
                  />
                </div>

                <div>
                  <label htmlFor="packageNameInput" className="block text-xs font-semibold text-slate-700 mb-1">
                    Gói dịch vụ VPS <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="packageNameInput"
                    type="text"
                    required
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="VPS Pro - 4 vCPU / 8GB RAM..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-markee-primary font-medium"
                  />
                </div>
              </div>

              {/* Ngày hết hạn cước */}
              <div>
                <label htmlFor="expiresAtInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày hết hạn thanh toán cước <span className="text-red-500">*</span>
                </label>
                <input
                  id="expiresAtInput"
                  type="date"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-markee-primary font-bold cursor-pointer"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label htmlFor="notesInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú thêm
                </label>
                <textarea
                  id="notesInput"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú về cổng kết nối, cấu hình đặc biệt hoặc chu kỳ gia hạn..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-markee-primary font-medium"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingRental(null);
                  }}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-markee-primary hover:bg-markee-hover text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-0 flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting
                    ? 'Đang xử lý...'
                    : editingRental
                    ? 'Cập nhật hợp đồng'
                    : 'Lưu hợp đồng thuê VPS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG XÓA */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Xác nhận xóa bản ghi</h4>
                <p className="text-xs text-slate-500">Bạn có chắc chắn muốn xóa bản ghi cho thuê VPS này không?</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRental(deletingId)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer border-0"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
