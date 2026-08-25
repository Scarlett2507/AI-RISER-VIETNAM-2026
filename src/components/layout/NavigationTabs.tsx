import React from 'react';
import { 
  LayoutDashboard, 
  Mic2, 
  Building2, 
  Users, 
  CalendarDays, 
  ShieldCheck, 
  Sparkles, 
  Layers
} from 'lucide-react';

export type NavTabKey = 
  | 'overview' 
  | 'speakers' 
  | 'enterprises' 
  | 'guests' 
  | 'events' 
  | 'governance';

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  counts?: {
    speakers?: number;
    enterprises?: number;
    guests?: number;
    events?: number;
    duplicates?: number;
    unnormalized?: number;
  };
  speakerCount?: number;
  enterpriseCount?: number;
  guestCount?: number;
  eventCount?: number;
  duplicateCount?: number;
  unnormalizedCount?: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
  speakerCount,
  enterpriseCount,
  guestCount,
  eventCount,
}) => {
  const spkCount = counts?.speakers ?? speakerCount ?? 0;
  const entCount = counts?.enterprises ?? enterpriseCount ?? 0;
  const gstCount = counts?.guests ?? guestCount ?? 0;
  const evCount = counts?.events ?? eventCount ?? 0;

  const tabs = [
    {
      key: 'overview',
      label: 'Tổng quan & Sức khỏe Dữ liệu',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      key: 'speakers',
      label: 'Diễn giả & Chuyên gia',
      icon: Mic2,
      badge: spkCount,
    },
    {
      key: 'enterprises',
      label: 'Doanh nghiệp & Đối tác',
      icon: Building2,
      badge: entCount,
    },
    {
      key: 'guests',
      label: 'Khách mời & Check-in',
      icon: Users,
      badge: gstCount,
    },
    {
      key: 'events',
      label: 'Quản lý Sự kiện',
      icon: CalendarDays,
      badge: evCount,
    },
    {
      key: 'governance',
      label: 'Phân quyền & Nhật ký (Audit)',
      icon: ShieldCheck,
      badge: null,
    },
  ];

  return (
    <nav className="bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 overflow-hidden">
      <div className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
