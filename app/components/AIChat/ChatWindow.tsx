'use client';

import React, { useRef, useEffect } from 'react';
import { Send, Sparkles, User, Laptop } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ChatWindowProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (val: string) => void;
  onSendMessage: () => void;
  isGenerating: boolean;
}

export default function ChatWindow({
  messages,
  inputValue,
  setInputValue,
  onSendMessage,
  isGenerating,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Messages viewport */}
      <div className="grow overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-markee-primary border border-red-100">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Trợ lý Trí tuệ Nhân tạo Markee</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hỗ trợ viết prompt, phân loại SOP, tóm tắt các bản WIP trong dự án hoặc trả lời bất cứ câu hỏi chuyên môn nào của bạn.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div key={index} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {/* Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-markee-primary shrink-0 select-none shadow-3xs">
                      <Laptop className="h-4 w-4" />
                    </div>
                  )}

                  {/* Bubble Container */}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-red-50/50 border border-red-100 text-slate-800 rounded-tr-none'
                      : 'bg-slate-50/50 border border-slate-200 text-slate-800 rounded-tl-none shadow-3xs'
                  }`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                          ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                          ol: ({ ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                          li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
                          code: ({ ...props }) => <code className="bg-slate-100 text-red-600 px-1 py-0.5 rounded font-mono text-[11px]" {...props} />,
                          pre: ({ ...props }) => <pre className="bg-slate-800 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto my-2.5 leading-normal" {...props} />,
                          h1: ({ ...props }) => <h1 className="text-sm font-bold my-2" {...props} />,
                          h2: ({ ...props }) => <h2 className="text-xs font-bold my-1.5" {...props} />,
                          h3: ({ ...props }) => <h3 className="text-[11px] font-bold my-1" {...props} />,
                          blockquote: ({ ...props }) => <blockquote className="border-l-4 border-slate-300 pl-3 italic text-slate-500 my-2" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 select-none shadow-3xs">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isGenerating && (
              <div className="flex gap-3.5 justify-start">
                <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-markee-primary shrink-0 animate-pulse">
                  <Laptop className="h-4 w-4" />
                </div>
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3.5 flex items-center gap-1.5 shadow-3xs">
                  <span className="w-1.5 h-1.5 bg-markee-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-markee-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-markee-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input panel */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-end gap-3 max-w-4xl mx-auto border border-slate-200 focus-within:border-markee-primary rounded-2xl bg-slate-50 p-2 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi đáp về tri thức dự án hoặc SOP..."
            className="grow resize-none border-0 bg-transparent text-xs text-slate-800 focus:ring-0 focus:outline-none p-2 leading-relaxed max-h-40 min-h-9"
          />
          <button
            type="button"
            disabled={!inputValue.trim() || isGenerating}
            onClick={onSendMessage}
            className="rounded-xl bg-markee-primary hover:bg-markee-hover disabled:bg-slate-200 text-white p-2.5 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Model: Dynamic Routing (Auto) • Markee AI Gateway
        </p>
      </div>
    </div>
  );
}
