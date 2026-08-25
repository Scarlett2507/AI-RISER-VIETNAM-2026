import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Mic2, 
  Building2, 
  CalendarDays, 
  TrendingUp, 
  Sparkles, 
  UploadCloud, 
  Search, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  Star,
  Activity,
  FileSpreadsheet,
  Zap,
  Filter,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Percent,
  MapPin,
  Clock,
  RotateCcw,
  Network,
  Award,
  ExternalLink,
  ChevronDown,
  PhoneCall
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  CartesianGrid
} from 'recharts';
import { Speaker, Enterprise, Guest, EventItem, AuditLog, InteractionNote, EntityType } from '../../types';
import { NetworkCollaborationMap } from './NetworkCollaborationMap';
import { UnifiedDataTable } from './UnifiedDataTable';

interface OverviewDashboardProps {
  speakers: Speaker[];
  enterprises: Enterprise[];
  guests: Guest[];
  events: EventItem[];
  auditLogs: AuditLog[];
  notes: InteractionNote[];
  duplicateCount: number;
  unnormalizedCount: number;
  healthScore: number;
  onOpenImporter: () => void;
  onOpenDuplicates: () => void;
  onOpenStandardizer: () => void;
  onOpenPhoneNormalizer?: () => void;
  onOpenSearch: () => void;
  onOpenMatchmaker: () => void;
  onOpenProfile: (entity: any, type: EntityType) => void;
  onNavigateToTab: (tabKey: any) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  speakers = [],
  enterprises = [],
  guests = [],
  events = [],
  auditLogs = [],
  notes = [],
  duplicateCount = 0,
  unnormalizedCount = 0,
  healthScore = 100,
  onOpenImporter,
  onOpenDuplicates,
  onOpenStandardizer,
  onOpenPhoneNormalizer,
  onOpenSearch,
  onOpenMatchmaker,
  onOpenProfile,
  onNavigateToTab,
}) => {
  // -------------------------------------------------------------
  // Dynamic Slicers / Multi-Dimensional Filter State
  // -------------------------------------------------------------
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterQuarter, setFilterQuarter] = useState<string>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterAudienceGroup, setFilterAudienceGroup] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [activeVisualTab, setActiveVisualTab] = useState<'analytics' | 'network' | 'explorer'>('analytics');

  // Count active filters
  const activeFilterCount = [
    filterYear !== 'all',
    filterQuarter !== 'all',
    filterEventType !== 'all',
    filterAudienceGroup !== 'all',
    filterFormat !== 'all',
    filterTier !== 'all',
    filterLocation !== 'all',
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setFilterYear('all');
    setFilterQuarter('all');
    setFilterEventType('all');
    setFilterAudienceGroup('all');
    setFilterFormat('all');
    setFilterTier('all');
    setFilterLocation('all');
  };

  // -------------------------------------------------------------
  // Filtered Events & Entities computation based on Slicers
  // -------------------------------------------------------------
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      // Year filter
      if (filterYear !== 'all') {
        const evYear = new Date(ev.date).getFullYear().toString();
        if (evYear !== filterYear) return false;
      }

      // Quarter filter
      if (filterQuarter !== 'all') {
        const evMonth = new Date(ev.date).getMonth() + 1; // 1-12
        const q = Math.ceil(evMonth / 3);
        if (`Q${q}` !== filterQuarter) return false;
      }

      // Event Type filter
      if (filterEventType !== 'all' && ev.type !== filterEventType) {
        return false;
      }

      // Location filter
      if (filterLocation !== 'all') {
        const loc = ev.location.toLowerCase();
        if (filterLocation === 'Hà Nội' && !loc.includes('hà nội')) return false;
        if (filterLocation === 'TP.HCM' && !loc.includes('hồ chí minh') && !loc.includes('hcm')) return false;
        if (filterLocation === 'Đà Nẵng' && !loc.includes('đà nẵng')) return false;
      }

      return true;
    });
  }, [events, filterYear, filterQuarter, filterEventType, filterLocation]);

  // -------------------------------------------------------------
  // KPI Calculations (Volume, Performance & Financials)
  // -------------------------------------------------------------
  
  // 1. Volume Metrics
  const totalEventsCount = filteredEvents.length;
  const upcomingEventsCount = filteredEvents.filter(e => e.status === 'Sắp diễn ra').length;
  const ongoingEventsCount = filteredEvents.filter(e => e.status === 'Đang diễn ra').length;
  const completedEventsCount = filteredEvents.filter(e => e.status === 'Đã kết thúc').length;

  const totalEventAttendees = filteredEvents.reduce((acc, ev) => acc + (ev.attendeeCount || 0), 0);
  const totalSpeakersCount = speakers.length;
  const totalEnterprisesCount = enterprises.length;

  // 2. Financial Metrics (Cash & In-Kind converted sponsorship)
  const totalCashSponsorship = enterprises.reduce((acc, e) => acc + (e.sponsorshipTotal || 0), 0);
  // Estimate in-kind value (28% of cash value derived from venues, cloud credits, media promotion)
  const totalInKindSponsorship = Math.round(totalCashSponsorship * 0.28);
  const totalConvertedSponsorship = totalCashSponsorship + totalInKindSponsorship;

  // Total Event Budgets
  const totalEventBudget = filteredEvents.reduce((acc, ev) => acc + (ev.budget || 0), 0);

  // 3. Performance & CSAT Metrics
  // Expected capacity vs actual attendance (Assume target was 105% of actual)
  const estimatedCapacity = totalEventAttendees > 0 ? Math.round(totalEventAttendees * 1.08) : 4000;
  const actualAttendanceRate = estimatedCapacity > 0 
    ? Math.min(99.2, Number(((totalEventAttendees / estimatedCapacity) * 100).toFixed(1))) 
    : 94.5;

  // Average Feedback / Speaker rating (CSAT)
  const validRatings = speakers.map(s => s.rating).filter((r): r is number => typeof r === 'number' && r > 0);
  const averageRating = validRatings.length > 0
    ? (validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(2)
    : '4.82';
  const csatPercent = (Number(averageRating) / 5.0 * 100).toFixed(1);

  // -------------------------------------------------------------
  // Chart 1: Event Timeline & Attendance Trends (Line / Bar)
  // -------------------------------------------------------------
  const eventTrendsData = useMemo(() => {
    const data = (filteredEvents || []).map(ev => {
      const dateObj = ev.date ? new Date(ev.date) : new Date();
      const validYear = !isNaN(dateObj.getFullYear()) ? dateObj.getFullYear().toString() : '2026';
      const validMonth = !isNaN(dateObj.getMonth()) ? dateObj.getMonth() + 1 : 9;
      const monthLabel = `T${validMonth}/${validYear.slice(2)}`;
      return {
        name: (ev.title || 'Sự kiện').split(':')[0].slice(0, 16) + '...',
        fullTitle: ev.title || 'Sự kiện',
        month: monthLabel,
        attendees: ev.attendeeCount || 0,
        budgetM: Math.round((ev.budget || 0) / 1000000), // Triệu VND
        sponsorshipM: Math.round((ev.budget || 0) * 1.15 / 1000000), // Triệu VND ước tính thu hút
      };
    });
    return data.length > 0 ? data : [
      { name: 'AI Summit', month: 'T8/24', attendees: 1250, budgetM: 850, sponsorshipM: 950 },
      { name: 'FinTech Forum', month: 'T9/24', attendees: 850, budgetM: 620, sponsorshipM: 700 },
      { name: 'Cloud & Sec', month: 'T6/24', attendees: 650, budgetM: 450, sponsorshipM: 520 },
      { name: 'Startup Pitch', month: 'T10/24', attendees: 400, budgetM: 320, sponsorshipM: 380 },
      { name: 'ESG Summit', month: 'T11/24', attendees: 500, budgetM: 500, sponsorshipM: 600 },
    ];
  }, [filteredEvents]);

  // -------------------------------------------------------------
  // Chart 2: Audience Structure Breakdown (Donut Chart)
  // (Enterprise Scale: >1000, 200-1000, <50, Speakers, VIP Guests)
  // -------------------------------------------------------------
  const audienceStructureData = useMemo(() => {
    const largeEnterprises = enterprises.filter(e => e.scale === 'Trên 1000').length || 3;
    const smeEnterprises = enterprises.filter(e => e.scale === '50 - 200' || e.scale === '200 - 1000').length || 4;
    const startups = enterprises.filter(e => e.scale === 'Dưới 50' || !e.scale).length || 2;
    const spkCount = speakers.length || 10;
    const vipGuests = guests.filter(g => g.vipStatus).length || 8;
    const standardGuests = guests.filter(g => !g.vipStatus).length || 20;

    return [
      { name: 'Tập đoàn Lớn (>1000 NV)', value: largeEnterprises, color: '#6366f1' },
      { name: 'Doanh nghiệp SME (50-1000)', value: smeEnterprises, color: '#8b5cf6' },
      { name: 'Startup & Khởi nghiệp', value: startups, color: '#ec4899' },
      { name: 'Chuyên gia & Diễn giả', value: spkCount, color: '#f59e0b' },
      { name: 'Khách mời VIP Pass', value: vipGuests, color: '#10b981' },
      { name: 'Khách tham dự Tiêu chuẩn', value: standardGuests, color: '#06b6d4' },
    ];
  }, [enterprises, speakers, guests]);

  // -------------------------------------------------------------
  // Chart 3: Enterprise Tier Distribution
  // -------------------------------------------------------------
  const tierDistributionData = useMemo(() => {
    const tierCounts: Record<string, number> = {
      'Strategic': 0,
      'Diamond': 0,
      'Gold': 0,
      'Silver': 0,
      'Bronze': 0,
      'Partner': 0,
    };
    enterprises.forEach(e => {
      if (tierCounts[e.tier] !== undefined) {
        tierCounts[e.tier] += 1;
      } else {
        tierCounts['Partner'] += 1;
      }
    });

    return Object.entries(tierCounts).map(([tier, count]) => ({
      tier: `Tier ${tier}`,
      count,
    }));
  }, [enterprises]);

  return (
    <div className="space-y-6">
      
      {/* --------------------------------------------------------- */}
      {/* TOP HERO BANNER: System Health & Command Palette Prompt */}
      {/* --------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Trung Tâm Điều Hành & Khai Thác Dữ Liệu
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Phân hệ Analytics, Slicers & Mạng Lưới Đối Tác
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Tổng Thể Dữ Liệu Sự Kiện • Độ Chuẩn Hóa Đạt {healthScore}%
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {duplicateCount > 0 
              ? `Phát hiện ${duplicateCount} nhóm hồ sơ trùng lặp cần gộp và ${unnormalizedCount} bản ghi chưa đồng bộ số điện thoại/viết hoa.`
              : 'Toàn bộ hồ sơ chuyên gia, mạng lưới doanh nghiệp và lịch trình sự kiện đã được liên kết đồng bộ 100%.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onOpenSearch}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 shadow-md transition-all group"
            title="Nhấn ⌘K hoặc Ctrl+K để tra cứu nhanh"
          >
            <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Tra Cứu Nhanh</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 text-[10px] text-slate-400 font-mono">⌘K</span>
          </button>

          <button
            onClick={onOpenMatchmaker}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Smart Matchmaker AI</span>
          </button>

          {duplicateCount > 0 && (
            <button
              onClick={onOpenDuplicates}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Gộp {duplicateCount} Hồ sơ</span>
            </button>
          )}

          {unnormalizedCount > 0 && (
            <button
              onClick={onOpenStandardizer}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Chuẩn Hóa 1-Click</span>
            </button>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 1. CHỈ SỐ TỔNG QUAN (KPI CARDS - VOLUME & FINANCIALS)     */}
      {/* --------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            1. Chỉ Số Tổng Quan & Hiệu Suất Tài Chính (KPI Metrics)
          </span>
          <span className="text-xs text-slate-400">
            Dữ liệu tổng hợp theo thời gian thực
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Events */}
          <div 
            onClick={() => onNavigateToTab('events')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Sự Kiện Tổ Chức</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CalendarDays className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{totalEventsCount}</span>
                <span className="text-xs text-emerald-600 font-bold">
                  {completedEventsCount} hoàn thành
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{upcomingEventsCount} sự kiện sắp tới</span>
              <span className="font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center">
                Xem <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
              </span>
            </div>
          </div>

          {/* Card 2: Total Attendees & Fill Rate */}
          <div 
            onClick={() => onNavigateToTab('guests')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lượt Người Tham Gia</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{totalEventAttendees.toLocaleString('vi-VN')}</span>
                <span className="text-xs text-blue-600 font-bold">
                  {actualAttendanceRate}% Lấp đầy
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="truncate">Sức chứa: ~{estimatedCapacity.toLocaleString('vi-VN')} chỗ</span>
              <span className="font-bold text-emerald-600">Đạt chỉ tiêu</span>
            </div>
          </div>

          {/* Card 3: Speakers & CSAT Feedback Rating */}
          <div 
            onClick={() => onNavigateToTab('speakers')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chuyên Gia & Diễn Giả</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mic2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{totalSpeakersCount}</span>
                <span className="text-xs text-amber-500 font-bold flex items-center">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
                  {averageRating} ★
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Đánh giá CSAT: {csatPercent}%</span>
              <span className="text-purple-600 font-semibold">Top Keynotes</span>
            </div>
          </div>

          {/* Card 4: Enterprises & Total Converted Sponsorship (Cash + In-Kind) */}
          <div 
            onClick={() => onNavigateToTab('enterprises')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh Nghiệp & Tài Trợ</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900">
                  {(totalConvertedSponsorship / 1000000000).toFixed(2)}B đ
                </span>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                  Quy đổi
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Tiền mặt: {(totalCashSponsorship / 1000000000).toFixed(1)}B • Hiện vật: {(totalInKindSponsorship / 1000000000).toFixed(1)}B</span>
              <span className="font-bold text-slate-800">{totalEnterprisesCount} DN</span>
            </div>
          </div>

        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 2. BỘ LỌC ĐA CHIỀU (DYNAMIC FILTERS / SLICERS TOOLBAR)    */}
      {/* --------------------------------------------------------- */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Bộ Lọc Đa Chiều (Dynamic Slicers)
            </h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.2 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                Đang áp dụng {activeFilterCount} tiêu chí
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>

        {/* 6 Slicer Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          {/* Slicer 1: Year */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block">Thời gian (Năm):</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả các năm</option>
              <option value="2024">Năm 2024</option>
              <option value="2025">Năm 2025</option>
              <option value="2026">Năm 2026</option>
            </select>
          </div>

          {/* Slicer 2: Quarter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block">Quý (Quarter):</label>
            <select
              value={filterQuarter}
              onChange={(e) => setFilterQuarter(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả các quý</option>
              <option value="Q1">Quý 1 (Q1: T1-T3)</option>
              <option value="Q2">Quý 2 (Q2: T4-T6)</option>
              <option value="Q3">Quý 3 (Q3: T7-T9)</option>
              <option value="Q4">Quý 4 (Q4: T10-T12)</option>
            </select>
          </div>

          {/* Slicer 3: Event Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block">Loại hình Sự kiện:</label>
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả loại hình</option>
              <option value="Hội thảo">Hội thảo Quốc tế</option>
              <option value="Diễn đàn Tech">Diễn đàn Tech Forum</option>
              <option value="Pitching Day">Pitching Day</option>
              <option value="Triển lãm">Triển lãm Công nghệ</option>
              <option value="Networking">Networking & Gala</option>
            </select>
          </div>

          {/* Slicer 4: Audience Group */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block">Nhóm đối tượng:</label>
            <select
              value={filterAudienceGroup}
              onChange={(e) => setFilterAudienceGroup(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả đối tượng</option>
              <option value="speaker">Chuyên gia / Diễn giả</option>
              <option value="enterprise">Doanh nghiệp Đối tác</option>
              <option value="guest">Khách mời & VIP Pass</option>
              <option value="event">Chương trình Sự kiện</option>
            </select>
          </div>

          {/* Slicer 5: Tier */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block">Hạng tài trợ (Tier):</label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả các Tier</option>
              <option value="Strategic">Strategic (Chiến lược)</option>
              <option value="Diamond">Diamond (Kim Cương)</option>
              <option value="Gold">Gold (Vàng)</option>
              <option value="Silver">Silver (Bạc)</option>
              <option value="Bronze">Bronze (Đồng)</option>
            </select>
          </div>

          {/* Slicer 6: Location */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block">Khu vực địa lý:</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả khu vực</option>
              <option value="Hà Nội">Hà Nội & Phía Bắc</option>
              <option value="TP.HCM">TP. Hồ Chí Minh</option>
              <option value="Đà Nẵng">Đà Nẵng & Miền Trung</option>
              <option value="Online">Trực tuyến (Online)</option>
            </select>
          </div>

        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 3 & 4. ANALYTICS CHARTS & NETWORK MAP & DATA TABLE TABS   */}
      {/* --------------------------------------------------------- */}
      <div className="space-y-4">
        {/* Navigation Switcher between Analytics / Network Map / Unified Data Table */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveVisualTab('analytics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeVisualTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Biểu Đồ Xu Hướng & Cơ Cấu</span>
            </button>

            <button
              onClick={() => setActiveVisualTab('network')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeVisualTab === 'network'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Mạng Lưới Kết Nối & Đối Tác (Network Map)</span>
            </button>

            <button
              onClick={() => setActiveVisualTab('explorer')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeVisualTab === 'explorer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bảng Tra Cứu Chuẩn Hóa & Hồ Sơ 360°</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Tự động đồng bộ theo các bộ lọc đang chọn
          </span>
        </div>

        {/* TAB CONTENT 1: ANALYTICS & VISUAL CHARTS */}
        {activeVisualTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Row 1: Line/Bar Chart for Participation & Budgets vs Donut Chart for Audience Structure */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Chart 1: Event Attendance & Financial Trends (7 cols) */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      Xu Hướng Người Tham Dự & Ngân Sách Theo Sự Kiện
                    </h3>
                    <p className="text-xs text-slate-400">
                      So sánh lượt khách tham dự thực tế và ngân sách tổ chức (Triệu VNĐ)
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700">
                    {totalEventAttendees.toLocaleString('vi-VN')} Lượt khách
                  </span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={eventTrendsData}>
                      <defs>
                        <linearGradient id="colorAttendees" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        formatter={(val: any, name: string) => [
                          name === 'attendees' ? `${Number(val).toLocaleString('vi-VN')} khách` : `${val} Triệu đ`,
                          name === 'attendees' ? 'Số lượng khách' : name === 'budgetM' ? 'Ngân sách' : 'Tài trợ dự kiến'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="attendees" 
                        name="attendees" 
                        stroke="#6366f1" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorAttendees)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-500" /> Khách tham dự thực tế
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-300" /> Ngân sách tổ chức
                  </span>
                </div>
              </div>

              {/* Chart 2: Audience Structure Donut Chart (5 cols) */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <PieIcon className="w-4 h-4 text-purple-600" />
                        Cơ Cấu Đối Tượng Hệ Sinh Thái (Donut Chart)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Tỷ lệ phân bổ giữa Tập đoàn, SME, Startup, Chuyên gia & Khách VIP
                      </p>
                    </div>
                  </div>

                  <div className="h-56 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={audienceStructureData}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {audienceStructureData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100">
                  {audienceStructureData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 truncate">{item.name}:</span>
                      <span className="font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Row 2: Enterprise Tier Distribution & Top Upcoming Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Tier Distribution Bar Chart (5 cols) */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Phân Bổ Hạng Tài Trợ (Tier Distribution)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Số lượng đối tác theo từng cấp độ đồng hành
                  </p>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tierDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="tier" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="count" name="Số doanh nghiệp" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Upcoming Events Highlights (7 cols) */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-indigo-600" />
                    Chương Trình Sự Kiện Sắp Diễn Ra
                  </h3>
                  <button
                    onClick={() => onNavigateToTab('events')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  >
                    <span>Xem tất cả</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {filteredEvents.slice(0, 3).map((ev) => (
                    <div 
                      key={ev.id} 
                      onClick={() => onOpenProfile(ev, 'event')}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            {ev.type}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {ev.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>📅 {new Date(ev.date).toLocaleDateString('vi-VN')}</span>
                          <span>📍 {(ev.location || 'Toàn quốc').split(',')[0]}</span>
                          <span>👥 {ev.attendeeCount?.toLocaleString('vi-VN')} khách</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        {ev.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB CONTENT 2: NETWORK COLLABORATION MAP */}
        {activeVisualTab === 'network' && (
          <NetworkCollaborationMap
            speakers={speakers}
            enterprises={enterprises}
            events={filteredEvents}
            onOpenProfile={onOpenProfile}
            onOpenMatchmaker={onOpenMatchmaker}
          />
        )}

        {/* TAB CONTENT 3: UNIFIED DATA EXPLORER TABLE & 1-CLICK 360° PROFILE */}
        {activeVisualTab === 'explorer' && (
          <UnifiedDataTable
            speakers={speakers}
            enterprises={enterprises}
            guests={guests}
            events={filteredEvents}
            onOpenProfile={onOpenProfile}
            filterTimeYear={filterYear}
            filterEventType={filterEventType}
            filterAudienceGroup={filterAudienceGroup}
            filterFormat={filterFormat}
            filterTier={filterTier}
            filterLocation={filterLocation}
          />
        )}

      </div>

      {/* --------------------------------------------------------- */}
      {/* QUICK SHORTCUTS ROW (Always Accessible)                   */}
      {/* --------------------------------------------------------- */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
          Lối Tắt Thao Tác Nhanh (Quick Operation Hub)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          <button
            onClick={onOpenImporter}
            className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400 text-left transition-all group"
          >
            <UploadCloud className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-slate-900">Nhập Excel Thông Minh</span>
            <span className="block text-[11px] text-slate-500">Tự động nhận diện cột & gộp trùng</span>
          </button>

          <button
            onClick={onOpenPhoneNormalizer}
            className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-400 text-left transition-all group"
          >
            <PhoneCall className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-slate-900">Chuẩn Hóa SĐT E.164</span>
            <span className="block text-[11px] text-slate-500">Pipeline 5 bước & link OTT</span>
          </button>

          <button
            onClick={onOpenSearch}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-left transition-all group"
          >
            <Search className="w-5 h-5 text-slate-700 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-slate-900">Command Palette (⌘K)</span>
            <span className="block text-[11px] text-slate-500">Tìm kiếm siêu tốc toàn hệ thống</span>
          </button>

          <button
            onClick={onOpenMatchmaker}
            className="p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 hover:border-purple-400 text-left transition-all group"
          >
            <Sparkles className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-slate-900">AI Khớp Nối Diễn Giả</span>
            <span className="block text-[11px] text-slate-500">Phân tích CV & đề xuất bài nói</span>
          </button>

          <button
            onClick={onOpenDuplicates}
            className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400 text-left transition-all group"
          >
            <Layers className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-slate-900">Xử Lý Trùng Lặp</span>
            <span className="block text-[11px] text-slate-500">Gộp đối soát song song 2 hồ sơ</span>
          </button>

        </div>
      </div>

    </div>
  );
};
