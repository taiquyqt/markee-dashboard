'use client';

import React, { useState } from 'react';
import { Plus, Trash2, MessageSquare, Sparkles, MoreVertical, Pencil } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onInjectPrompt: (prompt: string) => void;
  onRenameSession: (id: string, newTitle: string) => void; // Thêm prop này
}

const QUICK_INJECTS = [
  { label: 'Tóm tắt Dự án 📁', prompt: 'Hãy tóm tắt các bản WIP có trong dự án này thành một báo cáo tri thức hoàn chỉnh và khoa học.' },
  { label: 'Kiểm duyệt Kỹ năng 🔍', prompt: 'Hãy đóng vai trò là chuyên gia kiểm duyệt để đánh giá chất lượng prompt/kỹ năng sau đây dựa trên cấu trúc, tính rõ ràng và hiệu suất:' },
  { label: 'Tối ưu hóa SOP ⚙️', prompt: 'Chuyển đổi phần mô tả quy trình sau đây thành một Quy trình Vận hành Tiêu chuẩn (SOP) chi tiết từng bước, kèm theo vai trò và tiêu chí nghiệm thu:' },
  { label: 'Tạo System Prompt 💡', prompt: 'Hãy viết một System Prompt tối ưu nhất cho tác vụ sau đây, sử dụng cấu trúc Role, Context, Constraints và Output Format:' },
];

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onInjectPrompt,
  onRenameSession,
}: ChatSidebarProps) {
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  // Các state mới cho tính năng Menu 3 chấm và Đổi tên
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleSaveRename = (id: string) => {
    if (editTitle.trim() !== '') {
      onRenameSession(id, editTitle);
    }
    setEditingSessionId(null);
  };

  return (
    <>
      <aside className="w-80 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col h-full select-none relative z-10">
        
        {/* Lớp overlay trong suốt để bấm ra ngoài tự đóng menu 3 chấm */}
        {openMenuId && (
          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
        )}

        <div className="p-4 border-b border-slate-200">
          <button
            type="button"
            onClick={onCreateSession}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-markee-primary hover:bg-markee-hover text-white py-2.5 px-4 text-xs font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Phiên trò chuyện mới
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" />
            Lịch sử trò chuyện ({sessions.length})
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 italic">
              Chưa có phiên chat nào
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isEditing = editingSessionId === session.id;
                const isMenuOpen = openMenuId === session.id;
                const dateStr = new Date(session.created_at).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit',
                });

                return (
                  <div
                    key={session.id}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 transition-all text-xs cursor-pointer border ${
                      isActive ? 'bg-white border-slate-200 text-markee-primary font-bold shadow-xs' : 'hover:bg-slate-100 border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => {
                      if (!isEditing) onSelectSession(session.id);
                    }}
                  >
                    <div className="min-w-0 flex-1 pr-6">
                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleSaveRename(session.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(session.id);
                            if (e.key === 'Escape') setEditingSessionId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-xs text-slate-900 px-2 py-1 bg-white border border-red-300 rounded outline-none focus:border-red-500 font-normal"
                        />
                      ) : (
                        <>
                          <div className="truncate text-xs">{session.title || 'Phiên chat mới'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-normal">{dateStr}</div>
                        </>
                      )}
                    </div>

                    {/* Nút 3 chấm */}
                    {!isEditing && (
                      <div className="absolute right-2 z-50">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : session.id);
                          }}
                          className={`p-1 rounded transition-all cursor-pointer ${isMenuOpen ? 'bg-slate-200 text-slate-700 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700'}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-7 w-32 bg-white border border-slate-200 rounded-lg shadow-xl py-1 transform origin-top-right transition-all">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTitle(session.title);
                                setEditingSessionId(session.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Đổi tên
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToDelete(session.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 font-medium"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 bg-white space-y-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Mẫu prompt nhanh
          </div>
          <div className="grid grid-cols-1 gap-2">
            {QUICK_INJECTS.map((qi, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onInjectPrompt(qi.prompt)}
                className="text-left w-full text-[11px] p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-red-50/30 hover:border-red-200 text-slate-600 hover:text-markee-primary font-medium transition-all cursor-pointer shadow-3xs"
              >
                {qi.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* MODAL XÁC NHẬN XÓA */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 transition-opacity">
          <div className="bg-white w-105 rounded-3xl p-6 shadow-2xl mx-4 transform transition-all border border-slate-100">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Bạn muốn xoá cuộc trò chuyện?</h3>
            <p className="text-sm text-slate-600 mb-2 leading-relaxed">
              Thao tác này sẽ xoá đoạn chat này khỏi lịch sử trò chuyện.
            </p>
            <a href="#" className="text-sm text-red-600 hover:text-red-700 underline mb-6 inline-block font-medium">
              Tìm hiểu thêm
            </a>
            
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                Huỷ
              </button>
              <button
                onClick={() => {
                  onDeleteSession(sessionToDelete);
                  setSessionToDelete(null);
                }}
                className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-sm hover:shadow rounded-full transition-all cursor-pointer"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}