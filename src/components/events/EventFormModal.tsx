import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  Video, 
  FileText, 
  Check, 
  Sparkles,
  Building2,
  Mic2,
  Wrench,
  Layers
} from 'lucide-react';
import { EventItem, Speaker, Enterprise, EventFormat } from '../../types';
import { computeEventStatus, getEventTypeColor, getDefaultRundown, getDefaultOperationalPhases } from '../../services/schedulingService';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: EventItem | null;
  onSave: (event: Partial<EventItem>) => void;
  speakers: Speaker[];
  enterprises: Enterprise[];
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  onSave,
  speakers = [],
  enterprises = [],
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('17:30');
  const [location, setLocation] = useState('');
  const [venueRoom, setVenueRoom] = useState('');
  const [format, setFormat] = useState<EventFormat>('In-person');
  const [meetUrl, setMeetUrl] = useState('');
  const [type, setType] = useState<EventItem['type']>('Hội thảo');
  const [theme, setTheme] = useState('');
  const [speakerIds, setSpeakerIds] = useState<string[]>([]);
  const [enterpriseIds, setEnterpriseIds] = useState<string[]>([]);
  const [attendeeCount, setAttendeeCount] = useState<number>(500);
  const [capacity, setCapacity] = useState<number>(600);
  const [targetAudience, setTargetAudience] = useState('');
  const [budget, setBudget] = useState<number>(500000000);
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [equipmentInput, setEquipmentInput] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title || '');
      setCode(eventToEdit.code || '');
      setDate(eventToEdit.date ? eventToEdit.date.slice(0, 10) : '');
      setEndDate(eventToEdit.endDate ? eventToEdit.endDate.slice(0, 10) : '');
      setStartTime(eventToEdit.startTime || '08:30');
      setEndTime(eventToEdit.endTime || '17:30');
      setLocation(eventToEdit.location || '');
      setVenueRoom(eventToEdit.venueRoom || '');
      setFormat(eventToEdit.format || 'In-person');
      setMeetUrl(eventToEdit.meetUrl || '');
      setType(eventToEdit.type || 'Hội thảo');
      setTheme(eventToEdit.theme || '');
      setSpeakerIds(eventToEdit.speakerIds || []);
      setEnterpriseIds(eventToEdit.enterpriseIds || []);
      setAttendeeCount(eventToEdit.attendeeCount || 500);
      setCapacity(eventToEdit.capacity || Math.round((eventToEdit.attendeeCount || 500) * 1.2));
      setTargetAudience(eventToEdit.targetAudience || '');
      setBudget(eventToEdit.budget || 500000000);
      setEquipmentList(eventToEdit.equipment || ['Màn hình LED P2.5', 'Micro không dây x4', 'Hệ thống âm thanh hội trường']);
      setDescription(eventToEdit.description || '');
      setNote(eventToEdit.note || '');
    } else {
      // Default new event values
      const todayStr = new Date().toISOString().slice(0, 10);
      setTitle('');
      setCode(`EVT-${Date.now().toString().slice(-4)}`);
      setDate(todayStr);
      setEndDate('');
      setStartTime('08:30');
      setEndTime('17:30');
      setLocation('Trung tâm Hội nghị Quốc gia, Hà Nội');
      setVenueRoom('Hội trường Grand Ballroom A');
      setFormat('In-person');
      setMeetUrl('');
      setType('Hội thảo');
      setTheme('');
      setSpeakerIds([]);
      setEnterpriseIds([]);
      setAttendeeCount(500);
      setCapacity(600);
      setTargetAudience('Lãnh đạo Doanh nghiệp, Chuyên gia và Đối tác');
      setBudget(500000000);
      setEquipmentList(['Màn hình LED P2.5', 'Micro không dây x4', 'Hệ thống âm thanh hội trường']);
      setDescription('');
      setNote('');
    }
  }, [eventToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddEquipment = () => {
    if (equipmentInput.trim() && !equipmentList.includes(equipmentInput.trim())) {
      setEquipmentList([...equipmentList, equipmentInput.trim()]);
      setEquipmentInput('');
    }
  };

  const handleRemoveEquipment = (item: string) => {
    setEquipmentList(equipmentList.filter(e => e !== item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const calculatedStatus = computeEventStatus(date, endDate);

    const eventPayload: Partial<EventItem> = {
      ...(eventToEdit ? { id: eventToEdit.id } : {}),
      title,
      code: code || `EVT-${Date.now().toString().slice(-4)}`,
      date,
      endDate: endDate || undefined,
      startTime,
      endTime,
      location,
      venueRoom: venueRoom || undefined,
      format,
      meetUrl: meetUrl || (format === 'Online' || format === 'Hybrid' ? `https://meet.google.com/${(code || 'meet').toLowerCase()}` : undefined),
      type,
      theme,
      speakerIds,
      enterpriseIds,
      attendeeCount: Number(attendeeCount) || 100,
      capacity: Number(capacity) || Number(attendeeCount) || 100,
      targetAudience,
      budget: Number(budget) || 0,
      status: calculatedStatus,
      equipment: equipmentList,
      description,
      note,
      updatedAt: new Date().toISOString(),
      ...(eventToEdit ? {} : { createdAt: new Date().toISOString() }),
    };

    onSave(eventPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {eventToEdit ? 'Chỉnh Sửa Thông Tin Sự Kiện' : 'Thiết Lập Sự Kiện & Lịch Trình Mới'}
              </h2>
              <p className="text-xs text-indigo-100">
                Tự động đồng bộ trạng thái, kịch bản sân khấu và quét cảnh báo xung đột tài nguyên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Row 1: Title & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Tên sự kiện *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Vietnam AI Summit 2026: Kỷ nguyên GenAI"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mã sự kiện</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="AISUMMIT-2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 2: Type & Format & Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Loại hình sự kiện</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Hội thảo">Hội thảo</option>
                <option value="Diễn đàn Tech">Diễn đàn Tech</option>
                <option value="Khóa đào tạo">Khóa đào tạo</option>
                <option value="Pitching Day">Pitching Day</option>
                <option value="Triển lãm">Triển lãm</option>
                <option value="Networking">Networking</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Hình thức tổ chức</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="In-person">Trực tiếp (In-person)</option>
                <option value="Online">Trực tuyến (Online Meet)</option>
                <option value="Hybrid">Kết hợp (Hybrid)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Chủ đề chính</label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="GenAI, Chuyển đổi số..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 3: Date, End Date, Start Time, End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ngày bắt đầu *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Ngày kết thúc (nếu nhiều ngày)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="08:30"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Giờ kết thúc</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="17:30"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Row 4: Location & Venue Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Địa điểm tổ chức</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Trung tâm Hội nghị Quốc gia, Hà Nội"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phòng / Sảnh hội trường (Venue Room)</label>
              <input
                type="text"
                value={venueRoom}
                onChange={(e) => setVenueRoom(e.target.value)}
                placeholder="Hội trường Grand Ballroom A"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Online Meet Link */}
          {(format === 'Online' || format === 'Hybrid') && (
            <div>
              <label className="block font-bold text-blue-800 mb-1">Link họp trực tuyến (Google Meet / Zoom)</label>
              <input
                type="url"
                value={meetUrl}
                onChange={(e) => setMeetUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full px-3 py-2 border border-blue-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 bg-blue-50/40"
              />
            </div>
          )}

          {/* Row 5: Attendees, Capacity, Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dự kiến tham dự (người)</label>
              <input
                type="number"
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Sức chứa tối đa (Capacity)</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Ngân sách dự toán (VNĐ)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 6: Multi-select Speakers & Enterprises */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Gán Diễn giả & Chuyên gia ({speakerIds.length} đã chọn)
              </label>
              <select
                multiple
                value={speakerIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (opt: HTMLOptionElement) => opt.value);
                  setSpeakerIds(selected);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl h-24 focus:ring-2 focus:ring-indigo-500"
              >
                {speakers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.organization})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Gán Doanh nghiệp Đối tác / Tài trợ ({enterpriseIds.length} đã chọn)
              </label>
              <select
                multiple
                value={enterpriseIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (opt: HTMLOptionElement) => opt.value);
                  setEnterpriseIds(selected);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl h-24 focus:ring-2 focus:ring-indigo-500"
              >
                {enterprises.map(ent => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name} ({ent.tier})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 7: Equipment list */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Thiết bị & Hạ tầng yêu cầu</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={equipmentInput}
                onChange={(e) => setEquipmentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEquipment();
                  }
                }}
                placeholder="Nhập tên thiết bị (ví dụ: Màn hình LED P2.5, Thiết bị cabin dịch...) rồi bấm Thêm"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddEquipment}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
              >
                + Thêm
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {equipmentList.map((eq, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold flex items-center gap-1.5"
                >
                  <Wrench className="w-3 h-3 text-indigo-600" />
                  <span>{eq}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEquipment(eq)}
                    className="text-indigo-400 hover:text-rose-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Description & Internal Note */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Mô tả sự kiện</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu tổng quan về sự kiện, mục tiêu và ý nghĩa..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Ghi chú nội bộ</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lưu ý đón tiếp VIP, điều phối xe đưa đón..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{eventToEdit ? 'Lưu Cập Nhật' : 'Khởi Tạo Sự Kiện'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
