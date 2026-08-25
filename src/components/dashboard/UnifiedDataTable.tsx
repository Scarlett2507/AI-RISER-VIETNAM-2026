import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Columns3, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  ExternalLink, 
  Sparkles, 
  Building2, 
  Mic2, 
  Users, 
  CalendarDays, 
  Star, 
  CheckCircle2, 
  X,
  SlidersHorizontal,
  Download,
  Tag
} from 'lucide-react';
import { Speaker, Enterprise, Guest, EventItem, EntityType } from '../../types';
import { ensureArray } from '../../services/normalizer';

export interface UnifiedRecord {
  id: string;
  type: EntityType;
  primaryName: string;
  secondaryInfo: string;
  email: string;
  phone: string;
  organizationOrIndustry: string;
  location: string;
  tierOrRating: string | number;
  status: string;
  tags: string[];
  rawEntity: Speaker | Enterprise | Guest | EventItem;
}

interface UnifiedDataTableProps {
  speakers: Speaker[];
  enterprises: Enterprise[];
  guests: Guest[];
  events: EventItem[];
  onOpenProfile: (entity: any, type: EntityType) => void;
  filterTimeYear?: string;
  filterEventType?: string;
  filterAudienceGroup?: string;
  filterFormat?: string;
  filterTier?: string;
  filterLocation?: string;
}

export const UnifiedDataTable: React.FC<UnifiedDataTableProps> = ({
  speakers = [],
  enterprises = [],
  guests = [],
  events = [],
  onOpenProfile,
  filterTimeYear = 'all',
  filterEventType = 'all',
  filterAudienceGroup = 'all',
  filterFormat = 'all',
  filterTier = 'all',
  filterLocation = 'all',
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof UnifiedRecord>('primaryName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 8;

  // Customizable column visibility
  const [visibleColumns, setVisibleColumns] = useState<{
    name: boolean;
    type: boolean;
    org: boolean;
    contact: boolean;
    location: boolean;
    ratingOrTier: boolean;
    status: boolean;
    tags: boolean;
  }>({
    name: true,
    type: true,
    org: true,
    contact: true,
    location: true,
    ratingOrTier: true,
    status: true,
    tags: true,
  });

  // Convert all 4 entities to unified structure
  const unifiedData = useMemo<UnifiedRecord[]>(() => {
    const list: UnifiedRecord[] = [];

    // 1. Speakers
    speakers.forEach(s => {
      list.push({
        id: s.id,
        type: 'speaker',
        primaryName: s.fullName,
        secondaryInfo: s.role || 'Chuyên gia',
        email: s.email,
        phone: s.phone,
        organizationOrIndustry: s.organization || 'Độc lập',
        location: s.location || 'Toàn quốc',
        tierOrRating: s.rating ? `★ ${s.rating}` : '★ 4.8',
        status: s.status || 'Active',
        tags: ensureArray(s.tags),
        rawEntity: s,
      });
    });

    // 2. Enterprises
    enterprises.forEach(e => {
      list.push({
        id: e.id,
        type: 'enterprise',
        primaryName: e.name,
        secondaryInfo: e.industry || 'Doanh nghiệp',
        email: e.contactEmail,
        phone: e.contactPhone,
        organizationOrIndustry: e.industry || 'Tập đoàn / Doanh nghiệp',
        location: e.location || 'Toàn quốc',
        tierOrRating: `Tier ${e.tier}`,
        status: e.status || 'Active',
        tags: ensureArray(e.tags),
        rawEntity: e,
      });
    });

    // 3. Guests
    guests.forEach(g => {
      list.push({
        id: g.id,
        type: 'guest',
        primaryName: g.fullName,
        secondaryInfo: g.role || g.ticketType,
        email: g.email,
        phone: g.phone,
        organizationOrIndustry: g.organization || 'Khách mời',
        location: g.location || 'Toàn quốc',
        tierOrRating: g.vipStatus ? '👑 VIP Pass' : g.ticketType || 'Standard',
        status: g.checkInStatus || 'Registered',
        tags: ensureArray(g.tags),
        rawEntity: g,
      });
    });

    // 4. Events
    events.forEach(ev => {
      list.push({
        id: ev.id,
        type: 'event',
        primaryName: ev.title,
        secondaryInfo: `${ev.type} • 📅 ${new Date(ev.date).toLocaleDateString('vi-VN')}`,
        email: ev.code || 'EVT',
        phone: `${ev.attendeeCount || 0} khách`,
        organizationOrIndustry: ev.theme || 'Chủ đề hội nghị',
        location: ev.location || 'Toàn quốc',
        tierOrRating: `${((ev.budget || 0)/1000000).toLocaleString('vi-VN')}M đ`,
        status: ev.status || 'Sắp diễn ra',
        tags: ensureArray(ev.tags),
        rawEntity: ev,
      });
    });

    return list;
  }, [speakers, enterprises, guests, events]);

  // Filter & Search logic
  const filteredData = useMemo(() => {
    return unifiedData.filter(item => {
      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      // Global slicer: Audience Group
      if (filterAudienceGroup !== 'all' && item.type !== filterAudienceGroup) return false;

      // Global slicer: Location
      if (filterLocation !== 'all') {
        const itemLoc = (item.location || '').toLowerCase();
        if (filterLocation === 'Hà Nội' && !itemLoc.includes('hà nội')) return false;
        if (filterLocation === 'TP.HCM' && !itemLoc.includes('hồ chí minh') && !itemLoc.includes('hcm')) return false;
        if (filterLocation === 'Đà Nẵng' && !itemLoc.includes('đà nẵng')) return false;
      }

      // Global slicer: Tier
      if (filterTier !== 'all') {
        if (item.type === 'enterprise') {
          const ent = item.rawEntity as Enterprise;
          if (ent.tier !== filterTier) return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const fullString = `${item.primaryName || ''} ${item.secondaryInfo || ''} ${item.email || ''} ${item.phone || ''} ${item.organizationOrIndustry || ''} ${item.location || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
        if (!fullString.includes(query)) return false;
      }

      return true;
    }).sort((a, b) => {
      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      if (sortDirection === 'asc') return valA.localeCompare(valB, 'vi');
      return valB.localeCompare(valA, 'vi');
    });
  }, [unifiedData, typeFilter, filterAudienceGroup, filterLocation, filterTier, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: keyof UnifiedRecord) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getTypeBadge = (type: EntityType) => {
    switch (type) {
      case 'speaker':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700"><Mic2 className="w-2.5 h-2.5" /> Diễn giả</span>;
      case 'enterprise':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700"><Building2 className="w-2.5 h-2.5" /> Doanh nghiệp</span>;
      case 'guest':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700"><Users className="w-2.5 h-2.5" /> Khách mời</span>;
      case 'event':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700"><CalendarDays className="w-2.5 h-2.5" /> Sự kiện</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Top Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Bảng Tra Cứu Dữ Liệu Chuẩn Hóa Toàn Diện (Unified Data Table)
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
              {filteredData.length} kết quả
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tìm kiếm, tùy biến cột hiển thị và kích hoạt Hồ sơ 360° chỉ bằng 1-click
          </p>
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Lọc tên, email, sđt, ngành..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-indigo-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'speaker', label: 'Diễn giả' },
              { id: 'enterprise', label: 'DN' },
              { id: 'guest', label: 'Khách' },
              { id: 'event', label: 'Sự kiện' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setTypeFilter(t.id); setPage(1); }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  typeFilter === t.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Column Visibility Toggle Button */}
          <div className="relative">
            <button
              onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <Columns3 className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cột</span>
            </button>

            {isColumnConfigOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 space-y-2 animate-in fade-in zoom-in-95">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tùy chỉnh cột hiển thị:
                </span>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.type} 
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, type: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>Phân loại đối tượng</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.org} 
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, org: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>Tổ chức / Ngành</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.contact} 
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, contact: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>Email & SĐT</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.location} 
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, location: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>Khu vực địa lý</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.ratingOrTier} 
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, ratingOrTier: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>Rating / Hạng Tier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.tags} 
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, tags: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span>Thẻ phân loại (Tags)</span>
                  </label>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 select-none">
              <th 
                onClick={() => toggleSort('primaryName')} 
                className="p-3.5 font-bold cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Họ tên / Tên Doanh nghiệp</span>
                  {sortField === 'primaryName' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                  ) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                </div>
              </th>

              {visibleColumns.type && (
                <th 
                  onClick={() => toggleSort('type')} 
                  className="p-3.5 font-bold cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Phân loại</span>
                    {sortField === 'type' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                  </div>
                </th>
              )}

              {visibleColumns.org && (
                <th className="p-3.5 font-bold">Tổ chức / Lĩnh vực</th>
              )}

              {visibleColumns.contact && (
                <th className="p-3.5 font-bold">Email & SĐT liên hệ</th>
              )}

              {visibleColumns.location && (
                <th 
                  onClick={() => toggleSort('location')} 
                  className="p-3.5 font-bold cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Địa điểm</span>
                    {sortField === 'location' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                  </div>
                </th>
              )}

              {visibleColumns.ratingOrTier && (
                <th className="p-3.5 font-bold text-center">Đánh giá / Hạng</th>
              )}

              {visibleColumns.tags && (
                <th className="p-3.5 font-bold">Bộ phận / Tags</th>
              )}

              <th className="p-3.5 font-bold text-right">Kích hoạt 360°</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Không tìm thấy dữ liệu phù hợp với bộ lọc</p>
                  <p className="text-[11px]">Vui lòng thử từ khóa khác hoặc xóa bớt tiêu chí lọc.</p>
                </td>
              </tr>
            ) : (
              paginatedData.map(item => (
                <tr 
                  key={`${item.type}-${item.id}`}
                  onClick={() => onOpenProfile(item.rawEntity, item.type)}
                  className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                >
                  {/* Name & secondary info */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                          <span>{item.primaryName}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                          {item.secondaryInfo}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Type Badge */}
                  {visibleColumns.type && (
                    <td className="p-3.5 whitespace-nowrap">
                      {getTypeBadge(item.type)}
                    </td>
                  )}

                  {/* Org / Industry */}
                  {visibleColumns.org && (
                    <td className="p-3.5 text-slate-700 font-medium truncate max-w-[180px]">
                      {item.organizationOrIndustry}
                    </td>
                  )}

                  {/* Contact */}
                  {visibleColumns.contact && (
                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                      <div className="truncate max-w-[180px] text-slate-800">{item.email}</div>
                      <div className="text-slate-400">{item.phone}</div>
                    </td>
                  )}

                  {/* Location */}
                  {visibleColumns.location && (
                    <td className="p-3.5 text-slate-600 whitespace-nowrap">
                      📍 {(item.location || 'Toàn quốc').split(',')[0]}
                    </td>
                  )}

                  {/* Rating or Tier */}
                  {visibleColumns.ratingOrTier && (
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {item.tierOrRating}
                      </span>
                    </td>
                  )}

                  {/* Tags */}
                  {visibleColumns.tags && (
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {(item.tags || []).slice(0, 2).map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                  )}

                  {/* 1-Click Profile Action */}
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile(item.rawEntity, item.type);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white"
                      title="Mở toàn diện Hồ sơ 360°"
                    >
                      <span>360°</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredData.length)} trên tổng {filteredData.length} bản ghi
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Trang trước
          </button>
          <span className="px-2 font-bold text-slate-700 font-mono">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Trang sau
          </button>
        </div>
      </div>

    </div>
  );
};
