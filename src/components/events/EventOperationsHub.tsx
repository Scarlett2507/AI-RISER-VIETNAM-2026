import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  BarChart3, 
  Presentation, 
  ShieldAlert, 
  Table as TableIcon, 
  Plus, 
  Download, 
  Upload, 
  Sparkles, 
  Radio, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Edit3,
  Trash2,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { EventItem, Speaker, Enterprise, Guest, OperationalPhase, AgendaSlot } from '../../types';
import { EventCalendarView } from './EventCalendarView';
import { EventGanttView } from './EventGanttView';
import { EventRundownView } from './EventRundownView';
import { EventConflictRadar } from './EventConflictRadar';
import { EventQuickViewModal } from './EventQuickViewModal';
import { EventFormModal } from './EventFormModal';
import { detectSchedulingConflicts, getEventTypeColor, downloadIcsFile } from '../../services/schedulingService';

interface EventOperationsHubProps {
  events: EventItem[];
  speakers: Speaker[];
  enterprises: Enterprise[];
  guests: Guest[];
  onSaveEvent: (event: Partial<EventItem>) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEventRundown?: (eventId: string, rundown: AgendaSlot[]) => void;
  onUpdateEventPhases?: (eventId: string, phases: OperationalPhase[]) => void;
  onOpenExcelImporter?: () => void;
  onOpenProfile?: (entity: any, type: string) => void;
}

type HubViewMode = 'calendar' | 'gantt' | 'rundown' | 'table' | 'conflicts';

export const EventOperationsHub: React.FC<EventOperationsHubProps> = ({
  events = [],
  speakers = [],
  enterprises = [],
  guests = [],
  onSaveEvent,
  onDeleteEvent,
  onUpdateEventRundown,
  onUpdateEventPhases,
  onOpenExcelImporter,
  onOpenProfile,
}) => {
  const [activeTab, setActiveTab] = useState<HubViewMode>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals state
  const [quickViewEvent, setQuickViewEvent] = useState<EventItem | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventItem | null>(null);

  // Detect conflicts count
  const conflicts = useMemo(() => {
    return detectSchedulingConflicts(events, speakers);
  }, [events, speakers]);

  // Real-time KPI counts
  const liveCount = events.filter(e => e.status === 'Đang diễn ra').length;
  const upcomingCount = events.filter(e => e.status === 'Sắp diễn ra').length;
  const completedCount = events.filter(e => e.status === 'Đã kết thúc').length;

  // Table filtered events
  const tableEvents = useMemo(() => {
    return events.filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchCode = (e.code || '').toLowerCase().includes(q);
        const matchTheme = (e.theme || '').toLowerCase().includes(q);
        const matchLoc = (e.location || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchTheme && !matchLoc) return false;
      }
      return true;
    });
  }, [events, statusFilter, typeFilter, searchQuery]);

  const handleOpenCreate = () => {
    setEventToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (event: EventItem) => {
    setEventToEdit(event);
    setIsFormModalOpen(true);
  };

  const handleOpenQuickView = (event: EventItem) => {
    setQuickViewEvent(event);
    setIsQuickViewOpen(true);
  };

  const handleExportAllIcs = () => {
    events.forEach((ev, idx) => {
      setTimeout(() => {
        downloadIcsFile(ev);
      }, idx * 250);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Multi-View Navigation Hub */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">
                  Phân Hệ Lịch Trình & Điều Hành Vận Hành (Event Operations)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đa chế độ xem Lịch Lưới, Tiến độ Gantt 3 giai đoạn, Kịch bản sân khấu & Radar cảnh báo trùng lịch
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenExcelImporter && (
              <button
                onClick={onOpenExcelImporter}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Nhập danh sách sự kiện từ file Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Nhập Excel Sự Kiện</span>
              </button>
            )}

            <button
              onClick={handleExportAllIcs}
              className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Xuất file .ics tiêu chuẩn cho toàn bộ lịch"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Xuất Lịch (.ics)</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Sự Kiện Mới</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-100 text-xs">
          
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-slate-500 font-bold block text-[11px]">Tổng số sự kiện</span>
            <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{events.length}</span>
          </div>

          <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-emerald-800 font-bold text-[11px]">Đang diễn ra (Live)</span>
            </div>
            <span className="text-lg font-extrabold text-emerald-700 mt-0.5 block">{liveCount}</span>
          </div>

          <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200">
            <span className="text-blue-800 font-bold block text-[11px]">Sắp diễn ra</span>
            <span className="text-lg font-extrabold text-blue-700 mt-0.5 block">{upcomingCount}</span>
          </div>

          <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200">
            <span className="text-slate-600 font-bold block text-[11px]">Đã kết thúc</span>
            <span className="text-lg font-extrabold text-slate-700 mt-0.5 block">{completedCount}</span>
          </div>

          <div 
            onClick={() => setActiveTab('conflicts')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              conflicts.length > 0
                ? 'bg-rose-50 border-rose-200 text-rose-800 hover:shadow-xs'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px]">Radar Xung đột</span>
              {conflicts.length > 0 && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
            </div>
            <span className="text-lg font-extrabold mt-0.5 block">
              {conflicts.length > 0 ? `${conflicts.length} cảnh báo` : 'An toàn 100%'}
            </span>
          </div>

        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
          
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>1. Lịch Lưới Trực Quan (Calendar)</span>
          </button>

          <button
            onClick={() => setActiveTab('gantt')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'gantt'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>2. Tiến Độ Gantt (3 Giai đoạn)</span>
          </button>

          <button
            onClick={() => setActiveTab('rundown')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'rundown'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>3. Kịch Bản Sân Khấu (Rundown)</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>4. Bảng Dữ Liệu Chi Tiết</span>
          </button>

          <button
            onClick={() => setActiveTab('conflicts')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 relative ${
              activeTab === 'conflicts'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>5. Radar Xung Đột Tài Nguyên</span>
            {conflicts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'conflicts' ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
              }`}>
                {conflicts.length}
              </span>
            )}
          </button>

        </div>

      </div>

      {/* RENDER VIEW 1: CALENDAR */}
      {activeTab === 'calendar' && (
        <EventCalendarView
          events={events}
          speakers={speakers}
          onSelectEvent={handleOpenQuickView}
          onOpenCreate={handleOpenCreate}
        />
      )}

      {/* RENDER VIEW 2: GANTT */}
      {activeTab === 'gantt' && (
        <EventGanttView
          events={events}
          onSelectEvent={handleOpenQuickView}
          onUpdateEventPhases={onUpdateEventPhases}
        />
      )}

      {/* RENDER VIEW 3: RUNDOWN */}
      {activeTab === 'rundown' && (
        <EventRundownView
          events={events}
          speakers={speakers}
          onSelectEvent={handleOpenQuickView}
          onUpdateEventRundown={onUpdateEventRundown}
        />
      )}

      {/* RENDER VIEW 4: DATA TABLE */}
      {activeTab === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Table Filters Header */}
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên sự kiện, mã code, chủ đề, địa điểm..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold">Trạng thái:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Đang diễn ra">Đang diễn ra (Live)</option>
                  <option value="Sắp diễn ra">Sắp diễn ra</option>
                  <option value="Đã kết thúc">Đã kết thúc</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold">Loại hình:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">Tất cả loại hình</option>
                  <option value="Hội thảo">Hội thảo</option>
                  <option value="Diễn đàn Tech">Diễn đàn Tech</option>
                  <option value="Khóa đào tạo">Khóa đào tạo</option>
                  <option value="Pitching Day">Pitching Day</option>
                  <option value="Triển lãm">Triển lãm</option>
                </select>
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3.5 px-4">Tên sự kiện & Mã</th>
                  <th className="py-3.5 px-4">Loại hình & Hình thức</th>
                  <th className="py-3.5 px-4">Thời gian tổ chức</th>
                  <th className="py-3.5 px-4">Địa điểm & Sảnh</th>
                  <th className="py-3.5 px-4">Quy mô</th>
                  <th className="py-3.5 px-4">Trạng thái tự động</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableEvents.map((ev) => {
                  const colorInfo = getEventTypeColor(ev.type);
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Title & Code */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div
                          onClick={() => handleOpenQuickView(ev)}
                          className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer line-clamp-1"
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                        <div className="text-[11px] font-mono text-indigo-700 mt-0.5">
                          {ev.code}
                        </div>
                      </td>

                      {/* Type & Format */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${colorInfo.badge}`}>
                          {ev.type}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {ev.format || 'In-person'}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-800">
                          {new Date(ev.date).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {ev.startTime || '08:30'} - {ev.endTime || '17:30'}
                        </div>
                      </td>

                      {/* Location & Room */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-semibold text-slate-800 truncate" title={ev.venueRoom || ev.location}>
                          {ev.venueRoom || ev.location}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate" title={ev.location}>
                          {ev.location}
                        </div>
                      </td>

                      {/* Attendees */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {ev.attendeeCount} người
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {(ev.speakerIds || []).length} diễn giả
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          ev.status === 'Đang diễn ra' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          ev.status === 'Sắp diễn ra' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ev.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenQuickView(ev)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Xem chi tiết (Quick View)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(ev)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteEvent(ev.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                            title="Xóa sự kiện"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* RENDER VIEW 5: CONFLICT RADAR */}
      {activeTab === 'conflicts' && (
        <EventConflictRadar
          events={events}
          speakers={speakers}
          onSelectEvent={handleOpenQuickView}
          onOpenEditEvent={handleOpenEdit}
        />
      )}

      {/* Quick View Modal */}
      <EventQuickViewModal
        event={quickViewEvent}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        speakers={speakers}
        enterprises={enterprises}
        onOpenEdit={handleOpenEdit}
        onOpenProfile={onOpenProfile}
      />

      {/* Create / Edit Form Modal */}
      <EventFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        eventToEdit={eventToEdit}
        onSave={onSaveEvent}
        speakers={speakers}
        enterprises={enterprises}
      />

    </div>
  );
};
