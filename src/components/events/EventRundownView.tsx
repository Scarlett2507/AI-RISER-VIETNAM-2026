import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Plus, 
  Mic2, 
  Users, 
  Video, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  FileText, 
  Settings2, 
  Edit3, 
  Trash2, 
  Share2, 
  Download, 
  Play, 
  Radio, 
  Calendar,
  ChevronRight,
  ExternalLink,
  Presentation
} from 'lucide-react';
import { EventItem, Speaker, AgendaSlot } from '../../types';
import { getDefaultRundown } from '../../services/schedulingService';

interface EventRundownViewProps {
  events: EventItem[];
  speakers: Speaker[];
  onSelectEvent: (event: EventItem) => void;
  onUpdateEventRundown?: (eventId: string, rundown: AgendaSlot[]) => void;
}

export const EventRundownView: React.FC<EventRundownViewProps> = ({
  events = [],
  speakers = [],
  onSelectEvent,
  onUpdateEventRundown,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    return events.length > 0 ? events[0].id : '';
  });

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<AgendaSlot | null>(null);

  // Form state for add/edit slot
  const [slotTitle, setSlotTitle] = useState('');
  const [slotType, setSlotType] = useState<AgendaSlot['type']>('keynote');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('09:45');
  const [slotRoom, setSlotRoom] = useState('Hội trường chính');
  const [slotSpeakerIds, setSlotSpeakerIds] = useState<string[]>([]);
  const [slotModerator, setSlotModerator] = useState('');
  const [slotDesc, setSlotDesc] = useState('');
  const [slotTech, setSlotTech] = useState('');

  const speakerMap = useMemo(() => {
    const map = new Map<string, Speaker>();
    speakers.forEach(s => map.set(s.id, s));
    return map;
  }, [speakers]);

  const activeEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || events[0];
  }, [events, selectedEventId]);

  const rundown = useMemo(() => {
    if (!activeEvent) return [];
    if (activeEvent.rundown && activeEvent.rundown.length > 0) {
      return activeEvent.rundown;
    }
    return getDefaultRundown(activeEvent, speakers);
  }, [activeEvent, speakers]);

  const getSlotTypeBadge = (type: AgendaSlot['type']) => {
    switch (type) {
      case 'keynote':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">🎙️ Keynote Speaker</span>;
      case 'panel':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">👥 Panel Discussion</span>;
      case 'workshop':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">💻 Workshop & Demo</span>;
      case 'checkin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">🎫 Check-in & Foyer</span>;
      case 'signing':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">✍️ Ký kết MOU</span>;
      case 'networking':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">🥂 VIP Networking</span>;
      case 'closing':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200">🏁 Tổng kết & Bế mạc</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700">📋 Phiên họp</span>;
    }
  };

  const handleOpenAddSlot = () => {
    setEditingSlot(null);
    setSlotTitle('');
    setSlotType('keynote');
    setSlotStart('09:00');
    setSlotEnd('09:45');
    setSlotRoom(activeEvent?.venueRoom || 'Hội trường chính');
    setSlotSpeakerIds([]);
    setSlotModerator('');
    setSlotDesc('');
    setSlotTech('Micro không dây x2, Slide 16:9, Màn hình LED');
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot: AgendaSlot) => {
    setEditingSlot(slot);
    setSlotTitle(slot.title);
    setSlotType(slot.type);
    setSlotStart(slot.timeStart);
    setSlotEnd(slot.timeEnd);
    setSlotRoom(slot.locationRoom || activeEvent?.venueRoom || 'Hội trường chính');
    setSlotSpeakerIds(slot.speakerIds || []);
    setSlotModerator(slot.moderatorName || '');
    setSlotDesc(slot.description || '');
    setSlotTech(slot.techNotes || '');
    setIsSlotModalOpen(true);
  };

  const handleDeleteSlot = (slotId: string) => {
    if (!activeEvent || !onUpdateEventRundown) return;
    const updated = rundown.filter(s => s.id !== slotId);
    onUpdateEventRundown(activeEvent.id, updated);
  };

  const handleSaveSlot = () => {
    if (!activeEvent || !onUpdateEventRundown || !slotTitle.trim()) return;

    const matchedSpeakerNames = slotSpeakerIds.map(id => speakerMap.get(id)?.fullName || id);

    let updated: AgendaSlot[];
    if (editingSlot) {
      updated = rundown.map(s => {
        if (s.id === editingSlot.id) {
          return {
            ...s,
            title: slotTitle,
            type: slotType,
            timeStart: slotStart,
            timeEnd: slotEnd,
            locationRoom: slotRoom,
            speakerIds: slotSpeakerIds,
            speakerNames: matchedSpeakerNames,
            moderatorName: slotModerator,
            description: slotDesc,
            techNotes: slotTech,
          };
        }
        return s;
      });
    } else {
      const newSlot: AgendaSlot = {
        id: `slot-${Date.now()}`,
        title: slotTitle,
        type: slotType,
        timeStart: slotStart,
        timeEnd: slotEnd,
        locationRoom: slotRoom,
        speakerIds: slotSpeakerIds,
        speakerNames: matchedSpeakerNames,
        moderatorName: slotModerator,
        description: slotDesc,
        techNotes: slotTech,
        status: 'pending',
      };
      updated = [...rundown, newSlot].sort((a, b) => a.timeStart.localeCompare(b.timeStart));
    }

    onUpdateEventRundown(activeEvent.id, updated);
    setIsSlotModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Kịch Bản Điều Hành Sân Khấu Chi Tiết (Event Rundown & Agenda)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập timeline chi tiết từng khung giờ/phút, phân công diễn giả và ghi chú kỹ thuật âm thanh ánh sáng
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Event Selector */}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500 max-w-xs truncate"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.date})
              </option>
            ))}
          </select>

          {/* Live Stage Mode Toggle */}
          <button
            onClick={() => setIsLiveMode(!isLiveMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isLiveMode
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isLiveMode ? 'Live Runner Đang Bật' : 'Bật Chế Độ Sân Khấu Live'}</span>
          </button>

          {/* Add Slot button */}
          <button
            onClick={handleOpenAddSlot}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Phiên Mới</span>
          </button>
        </div>
      </div>

      {/* Live Stage Runner Banner */}
      {isLiveMode && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400">
                LIVE STAGE CONTROLLER • ĐANG ĐIỀU HÀNH TRỰC TIẾP
              </span>
              <h4 className="text-base font-bold text-white mt-0.5">
                {activeEvent?.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Đang phát sóng:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {rundown.find(s => s.status === 'in_progress')?.title || 'Phiên Keynote Khai mạc'}
              </span>
            </div>
            <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-right">
              <span className="text-slate-400 block text-[10px]">Tổng số phiên:</span>
              <span className="font-bold text-white text-sm">{rundown.length} Tiết mục</span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Timeline Rundown Cards */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-indigo-200 space-y-6 ml-3">
        {rundown.map((slot, index) => {
          const isSelected = activeSlotId === slot.id;
          const isInProgress = slot.status === 'in_progress';

          return (
            <div
              key={slot.id || index}
              className={`relative bg-white rounded-2xl border p-5 transition-all shadow-xs ${
                isInProgress
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                  : isSelected
                  ? 'border-indigo-400 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Timeline Pin Dot */}
              <div
                className={`absolute -left-[31px] sm:-left-[39px] top-6 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center ${
                  isInProgress
                    ? 'bg-indigo-600 ring-4 ring-indigo-100'
                    : slot.status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-slate-300'
                }`}
              ></div>

              {/* Slot Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Time badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-mono font-bold">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{slot.timeStart} - {slot.timeEnd}</span>
                  </div>

                  {getSlotTypeBadge(slot.type)}

                  <span className="text-xs text-slate-500 font-semibold">
                    📍 {slot.locationRoom || 'Hội trường chính'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditSlot(slot)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                    title="Chỉnh sửa phiên này"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                    title="Xóa phiên này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-3">
                <h3 className="text-base font-bold text-slate-900">
                  {slot.title}
                </h3>
                {slot.description && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {slot.description}
                  </p>
                )}
              </div>

              {/* Speakers / Moderator Assigned Grid */}
              {((slot.speakerIds && slot.speakerIds.length > 0) || slot.moderatorName) && (
                <div className="mt-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs">
                  {slot.speakerIds && slot.speakerIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Mic2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-500">Diễn giả:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {slot.speakerIds.map(spkId => {
                          const spk = speakerMap.get(spkId);
                          return (
                            <span
                              key={spkId}
                              className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-900 font-bold rounded-lg shadow-2xs"
                            >
                              {spk ? spk.fullName : spkId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {slot.moderatorName && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="font-bold text-slate-500">Điều phối viên (Host/MC):</span>
                      <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {slot.moderatorName}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Technical / AV Requirements */}
              {slot.techNotes && (
                <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-600 bg-amber-50/70 border border-amber-200/70 px-3 py-2 rounded-xl">
                  <Settings2 className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-900">Yêu cầu Kỹ thuật & AV:</strong> {slot.techNotes}
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Add / Edit Agenda Slot Modal */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-200">
              {editingSlot ? 'Chỉnh Sửa Tiết Mục Kịch Bản' : 'Thêm Tiết Mục Mới Vào Kịch Bản'}
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Tiết mục / Phiên sự kiện *</label>
                <input
                  type="text"
                  value={slotTitle}
                  onChange={(e) => setSlotTitle(e.target.value)}
                  placeholder="Ví dụ: Phiên Toàn thể: Xu hướng AI Tạo sinh 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại hình phiên</label>
                  <select
                    value={slotType}
                    onChange={(e) => setSlotType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="keynote">Keynote Speaker</option>
                    <option value="panel">Panel Discussion</option>
                    <option value="workshop">Workshop / Demo</option>
                    <option value="checkin">Check-in & Welcome</option>
                    <option value="signing">Ký kết MOU</option>
                    <option value="networking">VIP Networking</option>
                    <option value="closing">Bế mạc</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
                  <input
                    type="text"
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    placeholder="08:30"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  >
                  </input>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ kết thúc</label>
                  <input
                    type="text"
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    placeholder="09:15"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa điểm / Phòng tổ chức</label>
                <input
                  type="text"
                  value={slotRoom}
                  onChange={(e) => setSlotRoom(e.target.value)}
                  placeholder="Hội trường Grand Ballroom A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diễn giả phụ trách</label>
                <select
                  multiple
                  value={slotSpeakerIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (opt: HTMLOptionElement) => opt.value);
                    setSlotSpeakerIds(selected);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl h-24 focus:ring-2 focus:ring-indigo-500"
                >
                  {speakers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.organization} - {s.role})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-0.5">Giữ phím Ctrl (hoặc Cmd) để chọn nhiều diễn giả</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả nội dung chi tiết</label>
                <textarea
                  rows={2}
                  value={slotDesc}
                  onChange={(e) => setSlotDesc(e.target.value)}
                  placeholder="Tóm tắt mục tiêu và nội dung chính của phiên phát biểu..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Yêu cầu Kỹ thuật / Âm thanh / Ánh sáng</label>
                <input
                  type="text"
                  value={slotTech}
                  onChange={(e) => setSlotTech(e.target.value)}
                  placeholder="Micro không dây x2, Slide 16:9, Máy chiếu 4K, Slido Q&A..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveSlot}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
              >
                {editingSlot ? 'Lưu Thay Đổi' : 'Thêm Vào Kịch Bản'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
