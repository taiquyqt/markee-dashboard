'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Users, Key, Settings } from 'lucide-react';
import type { UserProfile } from '@/lib/dashboard-supabase';
import UserManagement from '../UserManagement/UserManagement';
import ApiManagementDashboard from '../ApiManagement/ApiManagementDashboard';

interface SystemManagementViewProps {
  profile: UserProfile;
  initialSubTab?: 'licenses' | 'users' | 'api';
}

export default function SystemManagementView({ profile, initialSubTab = 'licenses' }: SystemManagementViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSubTab, setActiveSubTab] = useState<'licenses' | 'users' | 'api'>(() => {
    const sub = searchParams.get('subtab');
    if (sub && ['licenses', 'users', 'api'].includes(sub)) {
      return sub as 'licenses' | 'users' | 'api';
    }
    return initialSubTab;
  });

  useEffect(() => {
    const sub = searchParams.get('subtab');
    if (sub && ['licenses', 'users', 'api'].includes(sub)) {
      setActiveSubTab(sub as 'licenses' | 'users' | 'api');
    }
  }, [searchParams]);

  const handleSubTabChange = (tab: 'licenses' | 'users' | 'api') => {
    setActiveSubTab(tab);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('subtab', tab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* Sub-tabs Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-markee-primary shrink-0 shadow-3xs">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Quản lý Hệ thống & User</h1>
            <p className="text-xs text-slate-400 font-semibold">Quản trị bản quyền AI, danh sách nhân sự và hạn mức API</p>
          </div>
        </div>

        {/* Sub-tab Pills (Top-Right) */}
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200/80 shadow-inner w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => handleSubTabChange('licenses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-0 ${
              activeSubTab === 'licenses'
                ? 'bg-white text-markee-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Quản lý Bản quyền AI</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-0 ${
              activeSubTab === 'users'
                ? 'bg-white text-markee-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Danh sách User</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange('api')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-0 ${
              activeSubTab === 'api'
                ? 'bg-white text-markee-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Quản lý API & Chi phí</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Content Area */}
      <div className="flex-1 p-5">
        {activeSubTab === 'licenses' && (
          <div className="animate-in fade-in duration-200">
            <UserManagement profile={profile} initialTab="licenses" hideHeader={true} />
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="animate-in fade-in duration-200">
            <UserManagement profile={profile} initialTab="users" hideHeader={true} />
          </div>
        )}

        {activeSubTab === 'api' && (
          <div className="animate-in fade-in duration-200">
            <ApiManagementDashboard isTab={true} />
          </div>
        )}
      </div>
    </div>
  );
}
