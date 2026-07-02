'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, User, Laptop } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ── Model catalogue ──
interface ModelDef {
  id: string;
  name: string;
  provider: string;
  label: string;
}

const MODELS: ModelDef[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', label: '4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', label: 'Mini' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', label: 'Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', label: 'Pro' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4', provider: 'Anthropic', label: 'Sonnet' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4', provider: 'Anthropic', label: 'Haiku' },
];

// ── Code block ──
function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = () => {
    const codeContent = preRef.current?.textContent || '';
    if (codeContent) {
      try {
        navigator.clipboard.writeText(codeContent);
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } catch { /* clipboard denied */ }
    }
  };

  return (
    <div className="relative group w-full max-w-full overflow-hidden bg-slate-800 rounded-lg my-2.5 shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/50">
        <span className="text-[10px] text-slate-400 font-mono">Code</span>
        <button onClick={handleCopy} className="text-[10px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 cursor-pointer">
          {copied ? 'Đã copy!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre ref={preRef} className="p-3 text-slate-100 font-mono text-[11px] leading-normal w-max min-w-full">
          {children}
        </pre>
      </div>
    </div>
  );
}

// ── Types ──
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
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  chatError?: string | null;
}

// ── Model Selector ──
function ModelSelector({ selected, onChange }: { selected: string; onChange: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const providers = [...new Set(MODELS.map((m) => m.provider))];

  return (
    <div className="flex items-center justify-center w-full">
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto no-scrollbar px-2 py-1.5"
      >
        {providers.map((provider) => {
          const groupModels = MODELS.filter((m) => m.provider === provider);
          return (
            <React.Fragment key={provider}>
              {/* Subtle provider divider between groups */}
              <span className="text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-300 select-none shrink-0 px-1">
                {provider}
              </span>

              {groupModels.map((m) => {
                const isActive = m.id === selected;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChange(m.id)}
                    title={m.name}
                    className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-all duration-200 cursor-pointer border ${
                      isActive
                        ? 'bg-markee-primary text-white border-markee-primary shadow-sm shadow-red-200/50'
                        : 'bg-white text-slate-500 border-slate-200/80 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse shrink-0" />
                    )}
                    <span>{m.label}</span>
                  </button>
                );
              })}

              {/* Inter-group dot separator (skip last group) */}
              {provider !== providers[providers.length - 1] && (
                <span className="w-px h-3 bg-slate-200 shrink-0 mx-1" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Chat Window ──
export default function ChatWindow({
  messages,
  inputValue,
  setInputValue,
  onSendMessage,
  isGenerating,
  selectedModel,
  onModelChange,
  chatError,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

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
    <div className="flex-1 flex flex-col h-full bg-white min-w-0">
      {/* ── Messages ── */}
      <div className="grow overflow-y-auto p-6 space-y-6 min-w-0">
        {messages.length === 0 && !chatError ? (
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
          <div className="space-y-6 w-full min-w-0">
            {chatError && (
              <div className="text-center py-3">
                <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full">
                  {chatError}
                </span>
              </div>
            )}

            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id ?? index} className={`flex gap-3.5 w-full min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-markee-primary shrink-0 select-none shadow-3xs">
                      <Laptop className="h-4 w-4" />
                    </div>
                  )}

                  <div className={`max-w-[75%] min-w-0 overflow-hidden rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-red-50/50 border border-red-100 text-slate-800 rounded-tr-none'
                      : 'bg-slate-50/50 border border-slate-200 text-slate-800 rounded-tl-none shadow-3xs'
                  }`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                    ) : (
                      <div className="w-full min-w-0 wrap-break-word whitespace-pre-wrap">
                        <ReactMarkdown
                          components={{
                            pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
                            code: ({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
                              const isInline = inline || !/language-(\w+)/.exec(className || '');
                              return isInline ? (
                                <code className="bg-slate-100 text-red-600 px-1 py-0.5 rounded font-mono text-[11px] wrap-break-word" {...props}>{children}</code>
                              ) : (
                                <code className="font-mono text-[11px]" {...props}>{children}</code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
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
              <div className="flex gap-3.5 justify-start w-full">
                <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-markee-primary shrink-0 animate-pulse">
                  <Laptop className="h-4 w-4" />
                </div>
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3.5 flex items-center gap-1.5 shadow-3xs">
                  <span className="w-1.5 h-1.5 bg-markee-primary rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-markee-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-markee-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Model Selector ── */}
      <div className="border-t border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 px-4">
        <ModelSelector selected={selectedModel} onChange={onModelChange} />
      </div>

      {/* ── Input Bar ── */}
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
      </div>
    </div>
  );
}
