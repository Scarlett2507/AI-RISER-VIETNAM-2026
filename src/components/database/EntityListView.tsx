import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  Table as TableIcon, 
  Plus, 
  Download, 
  Tag, 
  Trash2, 
  Edit3, 
  Eye, 
  Star, 
  MapPin, 
  Building2, 
  Mail, 
  Phone, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square,
  Sparkles,
  Award,
  Calendar,
  Layers,
  ArrowUpDown,
  ArrowRightLeft,
  UploadCloud
} from 'lucide-react';
import { EntityType, Speaker, Enterprise, Guest, EventItem, UserRole } from '../../types';
import { StorageService } from '../../services/storage';
import { ensureArray } from '../../services/normalizer';
import { detectRowEntityType } from '../../services/sheetParser';
import { PhoneBadge } from '../common/PhoneBadge';

interface EntityListViewProps {
  entityType: EntityType;
  speakers: Speaker[];
  enterprises: Enterprise[];
  guests: Guest[];
  events: EventItem[];
  onOpenProfile: (entity: any, type: EntityType) => void;
  onOpenCreate: (type: EntityType) => void;
  onOpenEdit: (entity: any, type: EntityType) => void;
  onDeleteEntity: (id: string, type: EntityType) => void;
  onBatchTag: (ids: string[], type: EntityType, tags: string[]) => void;
  onBatchDelete: (ids: string[], type: EntityType) => void;
  onMoveCategory?: (id: string, fromType: EntityType, toType: EntityType) => void;
  onOpenImporter?: (defaultType?: EntityType) => void;
  currentUserRole: UserRole;
}

export const EntityListView: React.FC<EntityListViewProps> = ({
  entityType,
  speakers = [],
  enterprises = [],
  guests = [],
  events = [],
  onOpenProfile,
  onOpenCreate,
  onOpenEdit,
  onDeleteEntity,
  onBatchTag,
  onBatchDelete,
  onMoveCategory,
  onOpenImporter,
  currentUserRole = 'Admin',
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [batchTagInput, setBatchTagInput] = useState<string>('');
  const [isBatchTagOpen, setIsBatchTagOpen] = useState<boolean>(false);

  // Determine current active dataset with guaranteed key uniqueness
  const rawData = useMemo(() => {
    let list: any[] = [];
    if (entityType === 'speaker') list = speakers;
    else if (entityType === 'enterprise') list = enterprises;
    else if (entityType === 'guest') list = guests;
    else list = events;

    const seen = new Set<string>();
    return list.filter((item: any) => {
      if (!item || !item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [entityType, speakers, enterprises, guests, events]);

  // Detect misplaced records in the current view
  const misplacedItems = useMemo(() => {
    if (entityType === 'speaker') {
      return rawData.filter((item: any) => {
        const detected = detectRowEntityType(item, 'speaker');
        const hasGuestTag = ensureArray(item.tags).some((t: string) => /khách mời|guest|vip pass/i.test(t));
        const hasGuestRole = /khách mời|tham dự/i.test(item.role || '');
        return detected === 'guest' || hasGuestTag || hasGuestRole;
      });
    }
    if (entityType === 'guest') {
      return rawData.filter((item: any) => {
        const detected = detectRowEntityType(item, 'guest');
        const hasSpeakerTag = ensureArray(item.tags).some((t: string) => /diễn giả|keynote|speaker/i.test(t));
        const hasSpeakerRole = /diễn giả|báo cáo viên|speaker/i.test(item.role || '');
        return detected === 'speaker' || hasSpeakerTag || hasSpeakerRole;
      });
    }
    return [];
  }, [rawData, entityType]);

  // Reset selected IDs when changing entity type
  useEffect(() => {
    setSelectedIds([]);
  }, [entityType]);

  // Clean selected IDs if any items were deleted
  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => rawData.some((item: any) => item.id === id)));
  }, [rawData]);

  // Extract unique filters
  const allLocations = useMemo(() => {
    const locs = rawData.map((d: any) => d.location).filter(Boolean);
    return Array.from(new Set(locs));
  }, [rawData]);

  const allTags = useMemo(() => {
    const tags: string[] = [];
    rawData.forEach((d: any) => {
      tags.push(...ensureArray(d.tags));
    });
    return Array.from(new Set(tags));
  }, [rawData]);

  // Filter & Sort Logic
  const filteredData = useMemo(() => {
    return rawData.filter((item: any) => {
      // Search
      const searchTerms = [
        item.fullName,
        item.name,
        item.title,
        item.organization,
        item.industry,
        item.email,
        item.contactEmail,
        item.phone,
        item.role,
        ...ensureArray(item.expertise),
        ...ensureArray(item.tags),
        ...ensureArray(item.interestTopics),
        item.theme,
      ].filter(Boolean).join(' ').toLowerCase();

      if (searchQuery.trim() && !searchTerms.includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Event filter
      if (selectedEventFilter !== 'all') {
        const itemEvents = [...ensureArray(item.events), ...ensureArray(item.eventsAttended)];
        if (!itemEvents.includes(selectedEventFilter) && item.title !== selectedEventFilter) {
          return false;
        }
      }

      // Tag filter
      if (selectedTagFilter !== 'all') {
        if (!ensureArray(item.tags).includes(selectedTagFilter)) {
          return false;
        }
      }

      // Location filter
      if (selectedLocationFilter !== 'all') {
        if (item.location !== selectedLocationFilter) {
          return false;
        }
      }

      // Tier filter (for enterprises)
      if (selectedTierFilter !== 'all' && entityType === 'enterprise') {
        if (item.tier !== selectedTierFilter) {
          return false;
        }
      }

      // Rating filter (for speakers)
      if (minRatingFilter > 0 && entityType === 'speaker') {
        if (!item.rating || item.rating < minRatingFilter) {
          return false;
        }
      }

      return true;
    }).sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'rating' || sortField === 'sponsorshipTotal' || sortField === 'attendeeCount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rawData, searchQuery, selectedEventFilter, selectedTagFilter, selectedLocationFilter, selectedTierFilter, minRatingFilter, sortField, sortDirection, entityType]);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((d: any) => d.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportExcel = () => {
    const exportRows = filteredData.map((d: any) => {
      const row: any = { ...d };
      if (Array.isArray(row.tags)) row.tags = row.tags.join(', ');
      if (Array.isArray(row.expertise)) row.expertise = row.expertise.join(', ');
      if (Array.isArray(row.events)) row.events = row.events.join(', ');
      if (Array.isArray(row.eventsAttended)) row.eventsAttended = row.eventsAttended.join(', ');
      return row;
    });

    const entityNames = {
      speaker: 'Danh_Sach_Dien_Gia',
      enterprise: 'Danh_Sach_Doanh_Nghiep_Doi_Tac',
      guest: 'Danh_Sach_Khach_Moi',
      event: 'Danh_Sach_Su_Kien',
    };

    StorageService.exportToExcel(exportRows, entityNames[entityType]);
  };

  const handleApplyBatchTag = () => {
    if (!batchTagInput.trim() || selectedIds.length === 0) return;
    const newTags = batchTagInput.split(',').map(t => t.trim()).filter(Boolean);
    onBatchTag(selectedIds, entityType, newTags);
    setBatchTagInput('');
    setIsBatchTagOpen(false);
    setSelectedIds([]);
  };

  const getEntityTypeName = () => {
    if (entityType === 'speaker') return 'Diễn giả & Chuyên gia';
    if (entityType === 'enterprise') return 'Doanh nghiệp & Đối tác';
    if (entityType === 'guest') return 'Khách mời Tham dự';
    return 'Chương trình Sự kiện';
  };

  return (
    <div className="space-y-4">
      
      {/* Smart Misplaced Category Banner */}
      {misplacedItems.length > 0 && onMoveCategory && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold text-base shrink-0">
              ⚡
            </div>
            <div>
              <span className="font-bold text-sm text-amber-950 block">
                Phát hiện {misplacedItems.length} hồ sơ có dấu hiệu sai danh mục ({misplacedItems.map(i => i.fullName || i.name).slice(0, 2).join(', ')}{misplacedItems.length > 2 ? ` và ${misplacedItems.length - 2} hồ sơ khác` : ''})
              </span>
              <span className="text-amber-800 text-xs">
                Hệ thống nhận diện các hồ sơ này mang nhãn / vai trò của {entityType === 'speaker' ? 'Khách Mời Tham Dự' : 'Diễn Giả'}.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                misplacedItems.forEach(item => {
                  const targetType = entityType === 'speaker' ? 'guest' : 'speaker';
                  onMoveCategory(item.id, entityType, targetType);
                });
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Tự động chuyển tất cả sang đúng mục</span>
            </button>
          </div>
        </div>
      )}

      {/* Top action & filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        
        {/* Row 1: Search & Primary Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Tìm nhanh trong ${filteredData.length} ${getEntityTypeName().toLowerCase()}...`}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Xem dạng Bảng (Table View)"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Xem dạng Thẻ (Card View)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Xuất danh sách đã lọc ra Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>

            {/* Import Excel Button */}
            {onOpenImporter && (
              <button
                onClick={() => onOpenImporter(entityType)}
                className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                title={`Nhập tệp Excel cho ${getEntityTypeName()} (Tự động nhận diện cột & đối soát trùng lặp)`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                <span>Nhập Excel</span>
              </button>
            )}

            {/* Create New Entity Button */}
            <button
              onClick={() => onOpenCreate(entityType)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mới</span>
            </button>

          </div>

        </div>

        {/* Row 2: Multi-faceted Filter chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Bộ lọc:</span>
          </span>

          {/* Event filter */}
          <select
            value={selectedEventFilter}
            onChange={(e) => setSelectedEventFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả sự kiện</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.title}>{ev.title}</option>
            ))}
          </select>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả Tags ({allTags.length})</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          )}

          {/* Location filter */}
          {allLocations.length > 0 && (
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả khu vực</option>
              {allLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          )}

          {/* Enterprise Tier filter */}
          {entityType === 'enterprise' && (
            <select
              value={selectedTierFilter}
              onChange={(e) => setSelectedTierFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả hạng tài trợ</option>
              <option value="Strategic">Strategic (Chiến lược)</option>
              <option value="Diamond">Diamond (Kim Cương)</option>
              <option value="Gold">Gold (Vàng)</option>
              <option value="Silver">Silver (Bạc)</option>
            </select>
          )}

          {/* Speaker Rating Filter */}
          {entityType === 'speaker' && (
            <select
              value={minRatingFilter}
              onChange={(e) => setMinRatingFilter(parseFloat(e.target.value))}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="0">Tất cả điểm Rating</option>
              <option value="4.8">Rating &gt;= 4.8 ★</option>
              <option value="4.5">Rating &gt;= 4.5 ★</option>
              <option value="4.0">Rating &gt;= 4.0 ★</option>
            </select>
          )}

          {/* Clear Filters */}
          {(selectedEventFilter !== 'all' || selectedTagFilter !== 'all' || selectedLocationFilter !== 'all' || selectedTierFilter !== 'all' || minRatingFilter > 0 || searchQuery) && (
            <button
              onClick={() => {
                setSelectedEventFilter('all');
                setSelectedTagFilter('all');
                setSelectedLocationFilter('all');
                setSelectedTierFilter('all');
                setMinRatingFilter(0);
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline ml-auto"
            >
              Xóa tất cả lọc
            </button>
          )}

        </div>

      </div>

      {/* Batch Actions Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white">
              {selectedIds.length}
            </span>
            <span>hồ sơ được chọn</span>
          </div>

          <div className="flex items-center gap-2">
            {isBatchTagOpen ? (
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg">
                <input
                  type="text"
                  placeholder="Nhập thẻ (VD: VIP, Khách mời đặc biệt)..."
                  value={batchTagInput}
                  onChange={(e) => setBatchTagInput(e.target.value)}
                  className="text-xs px-2.5 py-1 bg-slate-900 text-white border border-slate-700 rounded-md w-60"
                />
                <button
                  onClick={handleApplyBatchTag}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md text-xs font-bold"
                >
                  Gắn
                </button>
                <button
                  onClick={() => setIsBatchTagOpen(false)}
                  className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsBatchTagOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700"
              >
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gắn nhãn đồng loạt</span>
              </button>
            )}

            <button
              onClick={() => onBatchDelete(selectedIds, entityType)}
              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {filteredData.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Không tìm thấy hồ sơ phù hợp</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại các tiêu chí bộ lọc.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              
              {/* Table Head */}
              <thead className="bg-slate-100 font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <button onClick={handleSelectAll} className="flex items-center text-slate-400 hover:text-slate-700">
                      {selectedIds.length === filteredData.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>

                  {/* Columns for SPEAKER */}
                  {entityType === 'speaker' && (
                    <>
                      <th className="py-3 px-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('fullName')}>
                        <div className="flex items-center gap-1">
                          <span>Diễn giả / Chuyên gia</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4">Đơn vị & Vị trí</th>
                      <th className="py-3 px-4">Lĩnh vực chuyên môn</th>
                      <th className="py-3 px-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('rating')}>
                        <div className="flex items-center gap-1">
                          <span>Rating</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4">Liên hệ</th>
                      <th className="py-3 px-4">Tags</th>
                    </>
                  )}

                  {/* Columns for ENTERPRISE */}
                  {entityType === 'enterprise' && (
                    <>
                      <th className="py-3 px-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          <span>Doanh nghiệp / Tổ chức</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4">Ngành nghề</th>
                      <th className="py-3 px-4">Hạng Đối tác</th>
                      <th className="py-3 px-4">Người đại diện</th>
                      <th className="py-3 px-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('sponsorshipTotal')}>
                        <div className="flex items-center gap-1">
                          <span>Tài trợ (VNĐ)</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4">Tags</th>
                    </>
                  )}

                  {/* Columns for GUEST */}
                  {entityType === 'guest' && (
                    <>
                      <th className="py-3 px-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('fullName')}>
                        <div className="flex items-center gap-1">
                          <span>Khách mời</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4">Cơ quan / Vị trí</th>
                      <th className="py-3 px-4">Hạng vé</th>
                      <th className="py-3 px-4">Chủ đề quan tâm</th>
                      <th className="py-3 px-4">Trạng thái Check-in</th>
                    </>
                  )}

                  {/* Columns for EVENT */}
                  {entityType === 'event' && (
                    <>
                      <th className="py-3 px-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('title')}>
                        <div className="flex items-center gap-1">
                          <span>Tên sự kiện</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4">Ngày tổ chức</th>
                      <th className="py-3 px-4">Loại hình</th>
                      <th className="py-3 px-4">Quy mô khách</th>
                      <th className="py-3 px-4">Trạng thái</th>
                    </>
                  )}

                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredData.map((item: any) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                      
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <button onClick={() => handleToggleSelect(item.id)} className="flex items-center text-slate-400 hover:text-slate-700">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* SPEAKER ROW */}
                      {entityType === 'speaker' && (
                        <>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              {item.avatarUrl ? (
                                <img src={item.avatarUrl} alt={item.fullName || 'Speaker'} className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                  {(item.fullName || item.name || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="hover:text-indigo-600 cursor-pointer" onClick={() => onOpenProfile(item, 'speaker')}>
                                  {item.fullName}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-normal">{item.location}</span>
                                {(detectRowEntityType(item, 'speaker') === 'guest' || ensureArray(item.tags).some((t: string) => /khách mời|vip pass/i.test(t))) && onMoveCategory && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMoveCategory(item.id, 'speaker', 'guest');
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold hover:bg-amber-200 transition-colors"
                                    title="Hồ sơ mang đặc trưng Khách Mời. Bấm để chuyển ngay sang mục Khách Mời."
                                  >
                                    <span>⚡ Chuyển sang Khách Mời</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <span className="font-semibold block">{item.organization}</span>
                            <span className="text-[11px] text-slate-500">{item.role}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1 flex-wrap max-w-xs">
                              {ensureArray(item.expertise).slice(0, 2).map((e: string, i: number) => (
                                <span key={i} className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium text-[10px]">
                                  {e}
                                </span>
                              ))}
                              {ensureArray(item.expertise).length > 2 && (
                                <span className="text-[10px] text-slate-400 font-semibold">+{ensureArray(item.expertise).length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs whitespace-nowrap">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                              <span>{Number(item.rating || 4.8).toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            <div className="font-sans text-xs text-indigo-600 mb-1">{item.email}</div>
                            <PhoneBadge phone={item.phone} size="sm" />
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex gap-1 flex-wrap max-w-xs">
                                {ensureArray(item.tags).length > 0 ? (
                                  ensureArray(item.tags).slice(0, 2).map((t: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 text-[10px] whitespace-nowrap">
                                      🏢 {t}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                                {ensureArray(item.tags).length > 2 && (
                                  <span className="text-[10px] text-slate-400 font-semibold">+{ensureArray(item.tags).length - 2}</span>
                                )}
                              </div>
                              {item.note && (
                                <div className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded max-w-[180px] truncate" title={item.note}>
                                  📝 {item.note}
                                </div>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      {/* ENTERPRISE ROW */}
                      {entityType === 'enterprise' && (
                        <>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-indigo-700 shrink-0">
                                {(item.name || item.fullName || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="hover:text-indigo-600 cursor-pointer" onClick={() => onOpenProfile(item, 'enterprise')}>
                                  {item.name}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-normal">{item.scale} nhân sự • {item.location}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{item.industry}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.tier === 'Strategic' ? 'bg-purple-100 text-purple-800' :
                              item.tier === 'Diamond' ? 'bg-blue-100 text-blue-800' :
                              item.tier === 'Gold' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.tier}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold block">{item.contactPerson || '-'}</span>
                            <span className="text-[11px] font-mono text-slate-500 block mb-1">{item.contactEmail}</span>
                            <PhoneBadge phone={item.contactPhone} size="sm" />
                          </td>
                          <td className="py-3 px-4 font-extrabold text-indigo-700">
                            {(item.sponsorshipTotal || 0).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex gap-1 flex-wrap max-w-xs">
                                {ensureArray(item.tags).length > 0 ? (
                                  ensureArray(item.tags).slice(0, 2).map((t: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 text-[10px] whitespace-nowrap">
                                      🏢 {t}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                                {ensureArray(item.tags).length > 2 && (
                                  <span className="text-[10px] text-slate-400 font-semibold">+{ensureArray(item.tags).length - 2}</span>
                                )}
                              </div>
                              {item.note && (
                                <div className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded max-w-[180px] truncate" title={item.note}>
                                  📝 {item.note}
                                </div>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      {/* GUEST ROW */}
                      {entityType === 'guest' && (
                        <>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => onOpenProfile(item, 'guest')}>
                              {item.fullName}
                            </span>
                            <div className="text-[11px] font-sans text-indigo-600 font-normal">{item.email}</div>
                            {item.phone && (
                              <div className="mt-1">
                                <PhoneBadge phone={item.phone} size="sm" />
                              </div>
                            )}
                            {item.note && (
                              <div className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded max-w-[180px] truncate mt-1" title={item.note}>
                                📝 {item.note}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold block">{item.organization || 'Cá nhân'}</span>
                            <span className="text-[11px] text-slate-500">{item.role}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.ticketType === 'VIP Pass' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.ticketType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {ensureArray(item.interestTopics).slice(0, 2).join(', ') || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                                item.checkInStatus === 'Checked-in' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.checkInStatus}
                              </span>
                              {ensureArray(item.tags).length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {ensureArray(item.tags).slice(0, 1).map((t: string, i: number) => (
                                    <span key={i} className="px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[9px] font-medium">
                                      🏢 {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      {/* EVENT ROW */}
                      {entityType === 'event' && (
                        <>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <span>{item.title}</span>
                            <div className="text-[11px] text-slate-400 font-normal">📍 {item.location}</div>
                            {item.note && (
                              <div className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded max-w-[200px] truncate mt-1" title={item.note}>
                                📝 {item.note}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {new Date(item.date).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {item.attendeeCount} người
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'Đã kết thúc' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {entityType !== 'event' && (
                            <button
                              onClick={() => onOpenProfile(item, entityType)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Xem Hồ sơ 360°"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onOpenEdit(item, entityType)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteEntity(item.id, entityType)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </div>

      ) : (

        /* CARDS / BENTO GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((item: any) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={item.fullName} className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {(item.fullName || item.name || item.title || '').charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4
                        className="text-xs font-bold text-slate-900 hover:text-indigo-600 cursor-pointer line-clamp-1"
                        onClick={() => onOpenProfile(item, entityType)}
                      >
                        {item.fullName || item.name || item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {item.organization || item.industry || item.theme || item.role}
                      </p>
                    </div>
                  </div>

                  {item.rating && (
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{item.rating}</span>
                    </div>
                  )}
                </div>

                {item.bio && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2">
                    {item.bio}
                  </p>
                )}

                {/* Phone Badge on Card */}
                {(item.phone || item.contactPhone) && (
                  <div className="pt-1">
                    <PhoneBadge phone={item.phone || item.contactPhone} size="sm" />
                  </div>
                )}

                {/* Tags */}
                {ensureArray(item.tags).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ensureArray(item.tags).slice(0, 3).map((t: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{item.location || 'Toàn quốc'}</span>
                <div className="flex items-center gap-1">
                  {entityType !== 'event' && (
                    <button
                      onClick={() => onOpenProfile(item, entityType)}
                      className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                    >
                      360° Profile
                    </button>
                  )}
                  <button
                    onClick={() => onOpenEdit(item, entityType)}
                    className="p-1 text-slate-500 hover:text-slate-800"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      )}

    </div>
  );
};
