import React from 'react';
import { 
  Database, 
  UploadCloud, 
  CopyCheck, 
  Sparkles, 
  Search, 
  ShieldCheck, 
  RefreshCw, 
  Download,
  AlertTriangle,
  Users,
  CheckCircle2,
  MapPin,
  Share2,
  Bot,
  PhoneCall
} from 'lucide-react';
import { UserRole } from '../../types';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenImporter: () => void;
  onOpenDuplicateDetector: () => void;
  onOpenStandardizer: () => void;
  onOpenAdvancedSearch: () => void;
  onOpenMatchmaker: () => void;
  onOpenPhoneNormalizer?: () => void;
  onOpenMaps?: () => void;
  onOpenWorkspace?: () => void;
  onOpenCopilot?: () => void;
  onResetData: () => void;
  onExportBackup: () => void;
  duplicateCount: number;
  unnormalizedCount: number;
  healthScore: number;
  totalRecords: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onOpenImporter,
  onOpenDuplicateDetector,
  onOpenStandardizer,
  onOpenAdvancedSearch,
  onOpenMatchmaker,
  onOpenPhoneNormalizer,
  onOpenMaps,
  onOpenWorkspace,
  onOpenCopilot,
  onResetData,
  onExportBackup,
  duplicateCount,
  unnormalizedCount,
  healthScore,
  totalRecords,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & App Branding */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/30">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  EventData Hub
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Google Cloud & AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Quản trị & Chuẩn hóa Dữ liệu Sự kiện Tập trung
              </p>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="flex-1 max-w-[220px] lg:max-w-xs hidden md:block">
            <button
              onClick={onOpenAdvancedSearch}
              className="w-full h-9 flex items-center justify-between px-3 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-indigo-500/60 text-slate-300 hover:text-white transition-all text-xs group shadow-inner"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Search className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-indigo-400" />
                <span className="text-xs text-slate-400 group-hover:text-slate-200 truncate whitespace-nowrap">
                  Tìm kiếm nhanh...
                </span>
              </div>
              <kbd className="hidden lg:inline-flex shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Actions & Role Switcher */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Google Maps Button */}
            {onOpenMaps && (
              <button
                onClick={onOpenMaps}
                className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs whitespace-nowrap"
                title="Bản đồ Google Maps & Địa điểm tổ chức sự kiện"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="hidden xl:inline">Maps</span>
              </button>
            )}

            {/* Google Workspace Button */}
            {onOpenWorkspace && (
              <button
                onClick={onOpenWorkspace}
                className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs whitespace-nowrap"
                title="Đồng bộ Google Workspace (Sheets, Calendar, Drive)"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="hidden xl:inline">Workspace</span>
              </button>
            )}

            {/* Gemini Copilot Button */}
            {onOpenCopilot && (
              <button
                onClick={onOpenCopilot}
                className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-sm ring-1 ring-purple-400/40 whitespace-nowrap"
                title="Mở trợ lý thông minh Gemini AI Copilot"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="hidden sm:inline">AI Copilot</span>
              </button>
            )}

            {/* Universal Phone Normalizer Button */}
            {onOpenPhoneNormalizer && (
              <button
                onClick={onOpenPhoneNormalizer}
                className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 transition-all shadow-xs whitespace-nowrap"
                title="Động cơ Chuẩn hóa SĐT Quốc tế E.164 & Audit toàn diện"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden xl:inline">Chuẩn hóa SĐT</span>
              </button>
            )}

            {/* Smart Excel Importer Button */}
            <button
              onClick={onOpenImporter}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 ring-1 ring-indigo-400/50 whitespace-nowrap"
            >
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span>Nhập Excel</span>
            </button>

            {/* Duplicate Detector Badge Button */}
            {duplicateCount > 0 && (
              <button
                onClick={onOpenDuplicateDetector}
                className="relative inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all whitespace-nowrap"
                title={`${duplicateCount} nhóm dữ liệu có khả năng trùng lặp cần xử lý`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce shrink-0" />
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {duplicateCount}
                </span>
              </button>
            )}

            {/* Role Switcher */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800">
              <div className="relative">
                <select
                  value={currentRole}
                  onChange={(e) => onRoleChange(e.target.value as UserRole)}
                  className="appearance-none h-9 text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200 rounded-xl pl-2.5 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[130px] sm:max-w-[160px] truncate"
                  title="Chuyển đổi vai trò người dùng"
                >
                  <option value="Admin">Admin</option>
                  <option value="Event Manager">Event Manager</option>
                  <option value="Data Specialist">Data Specialist</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <ShieldCheck className="w-3 h-3 text-indigo-400 absolute right-2 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Quick System Tools */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={onExportBackup}
                title="Sao lưu toàn bộ cơ sở dữ liệu (JSON)"
                className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onResetData}
                title="Khôi phục dữ liệu mẫu gốc"
                className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
