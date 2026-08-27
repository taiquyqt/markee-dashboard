'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Loader,
  AlertTriangle,
  FileText,
  Code,
  Minimize2,
  Maximize2,
  Download,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  Info,
  Layers,
  FileCode2,
  Check
} from 'lucide-react';
import { MarkdownRenderer } from '@/app/components/AIChat/MarkdownRenderer';

export interface PreviewFileItem {
  file_name: string;
  storage_path?: string;
  mime_type?: string;
  source_url: string;
  description?: string;
  created_at?: string;
  file_size?: number | string | null;
  version?: string | number;
  author_name?: string;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: PreviewFileItem | null;
  wipContent?: string;
  filesList?: PreviewFileItem[];
  onSelectForChat?: (file: PreviewFileItem) => void;
}

// Regex trích xuất phiên bản từ tên tệp (VD: -v1, _v2, -v3.5, v2, _v1.0)
const extractVersionFromFileName = (name: string): string | null => {
  if (!name) return null;
  const match =
    name.match(/(?:[-_]v|v)(\d+(?:\.\d+)?)(?=\.[a-z0-9]+$|$)/i) ||
    name.match(/[-_](\d+(?:\.\d+)?)(?=\.[a-z0-9]+$|$)/i);
  if (match && match[1]) {
    return `v${match[1]}`;
  }
  return null;
};

export default function FilePreviewModal({
  isOpen,
  onClose,
  file,
  wipContent,
  filesList = [],
  onSelectForChat,
}: FilePreviewModalProps) {
  const [activeFile, setActiveFile] = useState<PreviewFileItem | null>(null);
  const [viewMode, setViewMode] = useState<'fullscreen' | 'minimized'>('fullscreen');
  const [activeTab, setActiveTab] = useState<'description' | 'versions' | 'files'>('description');

  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cập nhật activeFile khi modal mở hoặc prop file thay đổi
  useEffect(() => {
    if (isOpen && file) {
      setActiveFile(file);
      setViewMode('fullscreen');
      setActiveTab('description');
    } else {
      setActiveFile(null);
      setTextContent('');
      setFetchError(null);
    }
  }, [isOpen, file]);

  // Thông báo tới Sidebar chính về trạng thái Full-screen của Preview Modal
  useEffect(() => {
    const isFullscreenActive = isOpen && !!file && viewMode === 'fullscreen';
    window.dispatchEvent(
      new CustomEvent('preview-fullscreen-change', {
        detail: { isFullscreen: isFullscreenActive },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent('preview-fullscreen-change', {
          detail: { isFullscreen: false },
        })
      );
    };
  }, [isOpen, file, viewMode]);

  // Danh sách tệp đính kèm hiển thị để chuyển đổi
  const currentFilesList = React.useMemo(() => {
    if (filesList && filesList.length > 0) {
      return filesList;
    }
    return activeFile ? [activeFile] : [];
  }, [filesList, activeFile]);

  // Tải nội dung tệp nếu là văn bản / HTML / mã nguồn
  useEffect(() => {
    if (!isOpen || !activeFile) {
      setTextContent('');
      setFetchError(null);
      return;
    }

    const rawUrl = activeFile.source_url || '';
    const sourceUrl = rawUrl.split('?')[0];
    const name = activeFile.file_name.toLowerCase();
    const mime = (activeFile.mime_type || '').toLowerCase();

    const isTextCodeOrHtml =
      name.endsWith('.txt') ||
      name.endsWith('.json') ||
      name.endsWith('.js') ||
      name.endsWith('.jsx') ||
      name.endsWith('.ts') ||
      name.endsWith('.tsx') ||
      name.endsWith('.py') ||
      name.endsWith('.md') ||
      name.endsWith('.css') ||
      name.endsWith('.html') ||
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'application/javascript';

    if (isTextCodeOrHtml) {
      setLoadingText(true);
      setFetchError(null);
      setTextContent('');

      fetch(sourceUrl)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Không thể tải nội dung tệp (${res.status})`);
          }
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch((err) => {
          console.error(err);
          setFetchError(err.message || 'Lỗi khi tải nội dung tệp');
          setLoadingText(false);
        });
    }
  }, [isOpen, activeFile]);

  if (!isOpen || !activeFile) return null;

  const fileName = activeFile.file_name;
  const mimeType = activeFile.mime_type || '';
  const rawUrl = activeFile.source_url || '';
  const sourceUrl = rawUrl.split('?')[0];
  const nameLower = fileName.toLowerCase();

  const isTextCodeOrHtml =
    nameLower.endsWith('.txt') ||
    nameLower.endsWith('.json') ||
    nameLower.endsWith('.js') ||
    nameLower.endsWith('.jsx') ||
    nameLower.endsWith('.ts') ||
    nameLower.endsWith('.tsx') ||
    nameLower.endsWith('.py') ||
    nameLower.endsWith('.md') ||
    nameLower.endsWith('.css') ||
    nameLower.endsWith('.html') ||
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript';

  const isHtml = nameLower.endsWith('.html');

  // Xác định định dạng render
  let renderType: 'html-iframe' | 'text' | 'office-pdf' = 'office-pdf';
  if (isTextCodeOrHtml) {
    if (isHtml) {
      renderType = 'html-iframe';
    } else {
      renderType = 'text';
    }
  }

  // Format dung lượng tệp
  const formatSize = (bytes?: number | string | null) => {
    if (bytes === undefined || bytes === null || bytes === '') return 'Không rõ';
    const num = typeof bytes === 'number' ? bytes : parseInt(String(bytes), 10);
    if (isNaN(num)) return String(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* ==========================================
          CHẾ ĐỘ 1: THU NHỎ (COMPACT MODAL - GIỐNG HỆT ẢNH MẪU)
         ========================================== */}
      {viewMode === 'minimized' && (
        <>
          {/* Backdrop nền mờ tối đè lên trang chính */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[99998] transition-opacity"
            onClick={onClose}
          />

          {/* Modal Container Nổi ở giữa màn hình */}
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              
              {/* Header Sáng với Icon Tím */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl shrink-0">
                    {renderType === 'text' ? <Code className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm md:text-base truncate" title={fileName}>
                      Xem trước: {fileName}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">
                      Định dạng: {mimeType || 'Không xác định'}
                    </p>
                  </div>
                </div>

                {/* Nút Phóng to & Nút Đóng */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('fullscreen')}
                    title="Phóng to Full-screen"
                    className="text-slate-400 hover:text-purple-600 transition-colors p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Phóng to</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    title="Đóng xem trước"
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body xem trước file */}
              <div className="flex-1 min-h-[50vh] max-h-[70vh] bg-slate-100 relative overflow-hidden">
                {renderType === 'text' && (
                  <div className="w-full h-full p-4 overflow-auto bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed select-text">
                    {loadingText ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-slate-400">
                        <Loader className="w-6 h-6 animate-spin text-purple-500" />
                        <span>Đang tải nội dung tệp...</span>
                      </div>
                    ) : fetchError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-rose-400 px-4 text-center">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mb-1" />
                        <span className="font-bold text-sm">Không thể xem trực tiếp nội dung</span>
                        <span className="text-[11px] text-slate-400">{fetchError}</span>
                      </div>
                    ) : (
                      <pre className="overflow-auto whitespace-pre-wrap break-all select-text font-mono">
                        <code>{textContent}</code>
                      </pre>
                    )}
                  </div>
                )}

                {renderType === 'html-iframe' && (
                  <div className="w-full h-full relative bg-white">
                    {loadingText ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white text-slate-500">
                        <Loader className="w-6 h-6 animate-spin text-purple-500" />
                        <span>Đang tải trang HTML...</span>
                      </div>
                    ) : fetchError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white text-rose-500 px-4 text-center">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mb-1" />
                        <span className="font-bold text-sm">Không thể xem trực tiếp HTML</span>
                        <span className="text-[11px] text-slate-400">{fetchError}</span>
                      </div>
                    ) : (
                      <iframe
                        srcDoc={textContent}
                        className="min-h-[70vh] w-full overflow-auto border-0 bg-white"
                        title={fileName}
                      />
                    )}
                  </div>
                )}

                {renderType === 'office-pdf' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-700 p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mb-2" />
                    <span className="font-bold text-base">Trình duyệt chặn hiển thị trực tiếp định dạng này.</span>
                    <p className="text-xs text-slate-400 max-w-md font-medium leading-relaxed">
                      Bạn có thể mở tệp trong thẻ trình duyệt mới hoặc tải tệp xuống máy tính để xem bằng phần mềm chuyên dụng.
                    </p>
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Mở file trong Tab mới
                    </a>
                  </div>
                )}
              </div>

              {/* Footer với Nút Đóng và Nút Tải file xuống máy */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 sticky bottom-0 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition-all cursor-pointer shadow-3xs"
                >
                  Đóng
                </button>
                <a
                  href={`${sourceUrl}?download=${encodeURIComponent(fileName)}`}
                  download={fileName}
                  onClick={onClose}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-200"
                >
                  ⬇️ Tải file xuống máy
                </a>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ==========================================
          CHẾ ĐỘ 2: PHÓNG TO (FULLSCREEN OVERLAY SPLIT-PANE)
         ========================================== */}
      {viewMode === 'fullscreen' && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-20 z-[99999] bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-150">
          <div className="w-full h-full flex flex-col overflow-hidden bg-slate-950">
            {/* Header Bar Tối */}
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl shrink-0">
                  {renderType === 'text' ? <Code className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold shrink-0">Xem trước:</span>
                    
                    {currentFilesList.length > 1 ? (
                      <div className="relative max-w-xs md:max-w-md">
                        <select
                          value={activeFile.file_name}
                          onChange={(e) => {
                            const targetFile = currentFilesList.find((f) => f.file_name === e.target.value);
                            if (targetFile) setActiveFile(targetFile);
                          }}
                          className="w-full bg-slate-800 text-purple-300 font-mono font-bold text-xs md:text-sm border border-slate-700 rounded-lg px-2.5 py-1 pr-8 outline-none cursor-pointer hover:border-purple-500 transition-colors appearance-none truncate"
                        >
                          {currentFilesList.map((f, i) => (
                            <option key={i} value={f.file_name} className="bg-slate-900 text-slate-200">
                              📄 {f.file_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    ) : (
                      <h3 className="font-bold text-slate-100 text-sm md:text-base truncate font-mono text-purple-300" title={fileName}>
                        {fileName}
                      </h3>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5 flex items-center gap-2">
                    <span>Định dạng: {mimeType || 'Tệp dữ liệu'}</span>
                    {activeFile.file_size && (
                      <>
                        <span>•</span>
                        <span>Kích thước: {formatSize(activeFile.file_size)}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Nút điều khiển góc phải */}
              <div className="flex items-center gap-2 shrink-0">
                {onSelectForChat && (
                  <button
                    type="button"
                    onClick={() => onSelectForChat(activeFile)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Dùng trong Chat</span>
                  </button>
                )}

                <a
                  href={`${sourceUrl}?download=${encodeURIComponent(fileName)}`}
                  download={fileName}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  title="Tải tệp về máy"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tải về</span>
                </a>

                <button
                  type="button"
                  onClick={() => setViewMode('minimized')}
                  title="Thu nhỏ về dạng Modal lơ lửng"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  title="Đóng xem trước (Esc)"
                  className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Split-pane Body (Vùng Trái Iframe + Vùng Phải Info Panel ~350px) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-slate-950">
              {/* Vùng Trái (Main Preview Iframe / Text) */}
              <div className="flex-1 h-full relative overflow-hidden bg-slate-950 flex flex-col">
                {renderType === 'text' && (
                  <div className="w-full h-full p-4 md:p-6 overflow-auto bg-slate-950 text-slate-200 font-mono text-xs md:text-sm leading-relaxed select-text">
                    {loadingText ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-slate-400">
                        <Loader className="w-6 h-6 animate-spin text-purple-500" />
                        <span>Đang tải nội dung tệp...</span>
                      </div>
                    ) : fetchError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-rose-400 px-4 text-center">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mb-1" />
                        <span className="font-bold text-sm">Không thể xem trực tiếp nội dung</span>
                        <span className="text-[11px] text-slate-400">{fetchError}</span>
                      </div>
                    ) : (
                      <pre className="overflow-auto whitespace-pre-wrap break-all select-text font-mono">
                        <code>{textContent}</code>
                      </pre>
                    )}
                  </div>
                )}

                {renderType === 'html-iframe' && (
                  <div className="w-full h-full relative bg-white">
                    {loadingText ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white text-slate-500">
                        <Loader className="w-6 h-6 animate-spin text-purple-500" />
                        <span>Đang tải trang HTML...</span>
                      </div>
                    ) : fetchError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white text-rose-500 px-4 text-center">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mb-1" />
                        <span className="font-bold text-sm">Không thể xem trực tiếp HTML</span>
                        <span className="text-[11px] text-slate-400">{fetchError}</span>
                      </div>
                    ) : (
                      <iframe
                        srcDoc={textContent}
                        className="w-full h-full border-0 bg-white"
                        title={fileName}
                      />
                    )}
                  </div>
                )}

                {renderType === 'office-pdf' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-200 p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-1">
                      <FileText className="w-8 h-8" />
                    </div>
                    <span className="font-bold text-base text-slate-100">Định dạng tệp này không hỗ trợ đọc trực tiếp</span>
                    <p className="text-xs text-slate-400 max-w-md font-medium leading-relaxed">
                      Bạn có thể mở tệp trong thẻ trình duyệt mới hoặc tải tệp xuống máy tính để xem bằng phần mềm chuyên dụng.
                    </p>
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Mở tệp trong Tab mới</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Vùng Phải (Info Panel) Rộng ~350px với 3 Tabs (Light Mode) */}
              <div className="w-full md:w-80 lg:w-[350px] bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0">
                {/* Header Tab Bar */}
                <div className="flex items-center border-b border-slate-200 bg-slate-50 p-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('description')}
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                      activeTab === 'description'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Mô tả</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('versions')}
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                      activeTab === 'versions'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Phiên bản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('files')}
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                      activeTab === 'files'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>Tệp ({currentFilesList.length})</span>
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden text-xs text-slate-800 bg-white">
                  {/* TAB 1: MÔ TẢ (Markdown Typography Nền Sáng) */}
                  {activeTab === 'description' && (
                    <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden bg-white">
                      <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5 text-xs shrink-0">
                        <span>Nội dung bài viết / Mô tả:</span>
                      </h5>
                      <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 md:p-5 rounded-xl border border-slate-200 text-slate-800 text-xs md:text-sm leading-relaxed select-text">
                        {wipContent || activeFile.description ? (
                          <div className="prose prose-sm prose-slate max-w-none text-slate-800 select-text">
                            <MarkdownRenderer content={wipContent || activeFile.description || ''} />
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có mô tả chi tiết cho tệp này.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PHIÊN BẢN (Giao diện Light Mode + Thông tin tệp & Regex) */}
                  {activeTab === 'versions' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                      {/* Khối 1: Thông tin tệp */}
                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-800 text-xs">Thông tin tệp:</h5>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-semibold">Tên tệp:</span>
                            <span className="font-bold text-slate-900 font-mono text-[11px] truncate max-w-[200px]" title={fileName}>
                              {fileName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-semibold">Kích thước:</span>
                            <span className="font-bold text-purple-700">{formatSize(activeFile.file_size)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-semibold">Định dạng:</span>
                            <span className="font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                              {mimeType || 'Tệp dữ liệu'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Khối 2: Kiểm tra phiên bản tệp (Regex) */}
                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-800 text-xs">Kiểm tra phiên bản tệp:</h5>
                        {(() => {
                          const versionTag = extractVersionFromFileName(fileName);
                          return (
                            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                                  {versionTag ? (
                                    <span>Phiên bản hiện tại: <strong className="text-purple-700 text-sm font-mono">{versionTag}</strong></span>
                                  ) : (
                                    <span>Phiên bản gốc <span className="text-slate-500 font-normal">(Không có hậu tố version)</span></span>
                                  )}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  Active
                                </span>
                              </div>
                              
                              <p className="text-[11px] text-slate-500 font-medium">
                                Tên gốc: <span className="font-mono text-slate-700">{fileName}</span>
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TỆP (Quick Switch Attachment List - Light Mode) */}
                  {activeTab === 'files' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-bold text-slate-800">Danh sách tệp ({currentFilesList.length}):</h5>
                        <span className="text-[10px] text-slate-400 italic">Click để đổi tệp</span>
                      </div>

                      <div className="space-y-2">
                        {currentFilesList.map((fItem, i) => {
                          const isSelected = fItem.file_name === activeFile.file_name;
                          const fNameLower = fItem.file_name.toLowerCase();

                          let icon = '📄';
                          if (fNameLower.endsWith('.html') || fNameLower.endsWith('.css')) icon = '🌐';
                          else if (fNameLower.endsWith('.json') || fNameLower.endsWith('.js') || fNameLower.endsWith('.py')) icon = '💻';
                          else if (fNameLower.endsWith('.png') || fNameLower.endsWith('.jpg')) icon = '🖼️';

                          return (
                            <div
                              key={i}
                              onClick={() => setActiveFile(fItem)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                                isSelected
                                  ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-3xs font-bold'
                                  : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-base shrink-0">{icon}</span>
                                <div className="min-w-0">
                                  <p className={`truncate text-xs ${isSelected ? 'font-bold text-purple-900' : 'font-semibold text-slate-800'}`} title={fItem.file_name}>
                                    {fItem.file_name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    {formatSize(fItem.file_size)}
                                  </p>
                                </div>
                              </div>

                              {isSelected && (
                                <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-[10px] font-bold rounded-md shrink-0 border border-purple-300">
                                  Đang xem
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
