'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Server, Activity, Monitor, DollarSign } from 'lucide-react';
import VpsManagement from '../VPS/VpsManagement';
import VpsMonitor from '../VPS/VpsMonitor';
import VpsRentalsManagementDashboard from './VpsRentalsManagementDashboard';

interface VpsResourceViewProps {
  initialSubTab?: 'vps-management' | 'vps-monitor' | 'vps-rentals';
}

export default function VpsResourceView({ initialSubTab = 'vps-rentals' }: VpsResourceViewProps) {
  const searchParams = useSearchParams();

  const [activeSubTab, setActiveSubTab] = useState<'vps-management' | 'vps-monitor' | 'vps-rentals'>(() => {
    const sub = searchParams.get('subtab');
    if (sub && ['vps-management', 'vps-monitor', 'vps-rentals', 'rentals'].includes(sub)) {
      return (sub === 'rentals' ? 'vps-rentals' : sub) as 'vps-management' | 'vps-monitor' | 'vps-rentals';
    }
    return initialSubTab;
  });

  useEffect(() => {
    const sub = searchParams.get('subtab');
    if (sub && ['vps-management', 'vps-monitor', 'vps-rentals', 'rentals'].includes(sub)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSubTab((prev) => {
        const target = (sub === 'rentals' ? 'vps-rentals' : sub) as 'vps-management' | 'vps-monitor' | 'vps-rentals';
        return prev !== target ? target : prev;
      });
    }
  }, [searchParams]);

  const handleSubTabChange = (tab: 'vps-management' | 'vps-monitor' | 'vps-rentals') => {
    if (activeSubTab === tab) return;
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
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Quản lý & Giám sát VPS</h1>
            <p className="text-xs text-slate-400 font-semibold">Cấu hình máy chủ ảo VPS, cho thuê VPS và theo dõi hạ tầng hệ thống</p>
          </div>
        </div>

        {/* Sub-tab Pills (Top-Right) */}
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200/80 shadow-inner w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => handleSubTabChange('vps-rentals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-0 ${
              activeSubTab === 'vps-rentals'
                ? 'bg-white text-markee-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Quản lý thuê VPS</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleSubTabChange('vps-management')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-0 ${
              activeSubTab === 'vps-management'
                ? 'bg-white text-markee-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Quản lý VPS</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange('vps-monitor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-0 ${
              activeSubTab === 'vps-monitor'
                ? 'bg-white text-markee-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Giám sát VPS</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Content Area - Keep-Alive Pattern */}
      <div className="flex-1">
        <div className={activeSubTab === 'vps-management' ? 'block animate-in fade-in duration-200' : 'hidden'}>
          <VpsManagement />
        </div>

        <div className={activeSubTab === 'vps-rentals' ? 'block p-5 animate-in fade-in duration-200' : 'hidden'}>
          <VpsRentalsManagementDashboard />
        </div>

        <div className={activeSubTab === 'vps-monitor' ? 'block animate-in fade-in duration-200' : 'hidden'}>
          <VpsMonitor />
        </div>
      </div>
    </div>
  );
}
