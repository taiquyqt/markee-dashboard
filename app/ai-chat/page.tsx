'use client';

import { Suspense } from 'react';
import RoleDashboard from '../components/RoleDashboard';

export default function AIChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Đang tải...</div>}>
      <RoleDashboard initialTab="ai_chat" />
    </Suspense>
  );
}
