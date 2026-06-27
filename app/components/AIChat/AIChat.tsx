'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { type UserProfile } from '@/lib/dashboard-supabase';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface AIChatProps {
  profile: UserProfile;
}

function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function AIChat({ profile }: AIChatProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Load chat sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      if (!profile?.authUser?.id) return;
      setLoadingSessions(true);
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', profile.authUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
        if (data && data.length > 0) {
          setActiveSessionId(data[0].id);
        }
      } catch (e) {
        console.error('Error loading chat sessions:', e);
      } finally {
        setLoadingSessions(false);
      }
    };

    loadSessions();
  }, [profile?.authUser?.id]);

  // Load messages when active session changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeSessionId) {
        setMessages([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', activeSessionId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (e) {
        console.error('Error loading chat messages:', e);
      }
    };

    loadMessages();
  }, [activeSessionId]);

  const handleCreateSession = async () => {
    if (!profile?.authUser?.id) return;
    try {
      const newSessionId = generateUUID();
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          id: newSessionId,
          title: 'Phiên trò chuyện mới',
          user_id: profile.authUser.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      setSessions((prev) => [data, ...prev]);
      setActiveSessionId(data.id);
      setMessages([]);
    } catch (e) {
      console.error('Error creating chat session:', e);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Delete messages first due to foreign key
      await supabase.from('chat_messages').delete().eq('session_id', sessionId);
      const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
      if (error) throw error;

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error('Error deleting chat session:', e);
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title: newTitle.trim() })
        .eq('id', sessionId);

      if (error) throw error;

      // Cập nhật lại UI ngay lập tức
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s))
      );
    } catch (e) {
      console.error('Error renaming chat session:', e);
    }
  };

  const handleInjectPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleSendMessage = async () => {
    const content = inputValue.trim();
    if (!content || isGenerating) return;

    setInputValue('');
    setIsGenerating(true);

    let currentSessionId = activeSessionId;

    try {
      // 1. Create a new session if none is selected
      if (!currentSessionId) {
        if (!profile?.authUser?.id) return;
        const newSessionId = generateUUID();
        const { data: newSess, error: sessErr } = await supabase
          .from('chat_sessions')
          .insert({
            id: newSessionId,
            title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
            user_id: profile.authUser.id,
          })
          .select('*')
          .single();

        if (sessErr) throw sessErr;
        currentSessionId = newSessionId;
        setSessions((prev) => [newSess, ...prev]);
        setActiveSessionId(newSessionId);
      }

      // 2. Insert user message to Supabase
      const { error: userMsgErr } = await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        role: 'user',
        content,
      });
      if (userMsgErr) throw userMsgErr;

      // 3. Update local state
      const newUserMsg: Message = { role: 'user', content };
      setMessages((prev) => [...prev, newUserMsg]);

      // 4. Update session title if it was the default title
      const activeSessionObj = sessions.find((s) => s.id === currentSessionId);
      if (activeSessionObj && activeSessionObj.title === 'Phiên trò chuyện mới') {
        const truncatedTitle = content.slice(0, 30) + (content.length > 30 ? '...' : '');
        await supabase
          .from('chat_sessions')
          .update({ title: truncatedTitle })
          .eq('id', currentSessionId);

        setSessions((prev) =>
          prev.map((s) => (s.id === currentSessionId ? { ...s, title: truncatedTitle } : s))
        );
      }

      // 5. Build context history for OpenRouter
      const history = [...messages, newUserMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 6. Fetch from OpenRouter API
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          'X-Title': 'Markee AI',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: history,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter request failed with status ${response.status}`);
      }

      const resData = await response.json();
      const aiReply = resData.choices?.[0]?.message?.content || '';

      // 7. Insert AI response to Supabase
      const { error: aiMsgErr } = await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: aiReply,
      });
      if (aiMsgErr) throw aiMsgErr;

      // 8. Update local state with assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: aiReply }]);
    } catch (e) {
      console.error('Error sending message/getting reply:', e);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Có lỗi xảy ra trong quá trình xử lý. Vui lòng kiểm tra lại API Key hoặc kết nối mạng.',
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-xs">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        onInjectPrompt={handleInjectPrompt}
        onRenameSession={handleRenameSession}
      />
      
      {loadingSessions ? (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
          Đang tải phiên trò chuyện...
        </div>
      ) : (
        <ChatWindow
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
}
