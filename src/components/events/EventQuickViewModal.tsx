import React from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  Share2, 
  Download, 
  ExternalLink, 
  Mic2, 
  Building2, 
  Sparkles, 
  Edit3, 
  CheckCircle2,
  Layers,
  Coins,
  Copy,
  Check
} from 'lucide-react';
import { EventItem, Speaker, Enterprise } from '../../types';
import { generateGoogleCalendarUrl, downloadIcsFile, getEventTypeColor } from '../../services/schedulingService';

interface EventQuickViewModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  speakers: Speaker[];
  enterprises: Enterprise[];
  onOpenEdit?: (event: EventItem) => void;
  onOpenProfile?: (entity: any, type: string) => void;
}

export const EventQuickViewModal: React.FC<EventQuickViewModalProps> = ({
  event,
  isOpen,
  onClose,
  speakers = [],
  enterprises = [],
  onOpenEdit,
  onOpenProfile,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (!isOpen || !event) return null;

  const colorInfo = getEventTypeColor(event.type);
  const matchedSpeakers = speakers.filter(s => (event.speakerIds || []).includes(s.id));
  const matchedEnterprises = enterprises.filter(e => (event.enterpriseIds || []).includes(e.id));

  const gCalUrl = generateGoogleCalendarUrl(event, speakers);

  const handleDownloadIcs = () => {
    downloadIcsFile(event);
  };

  const handleCopyMeet = () => {
    if (event.meetUrl) {
      navigator.clipboard.writeText(event.meetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const registered = event.registeredCount || event.attendeeCount || 0;
  const cap = event.capacity || Math.round(registered * 1.15);
  const occupancyPercent = Math.min(100, Math.round((registered / cap) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Event Type Color banner */}
        <div className={`px-6 py-5 border-b border-slate-100 flex items-center justify-between ${colorInfo.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-2xs ${colorInfo.badge}`}>
              {event.type}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500">Mã: {event.code}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  event.status === 'Đang diễn ra' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  event.status === 'Sắp diễn ra' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-700'
                }`}>
                  {event.status}
                </span>
                {event.format && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    {event.format === 'Online' ? '🌐 Trực tuyến' : event.format === 'Hybrid' ? '⚡ Hybrid' : '🏢 Trực tiếp'}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {event.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Key Facts Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            
            <div>
              <span className="text-slate-400 font-bold block">NGÀY TỔ CHỨC</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                {new Date(event.date).toLocaleDateString('vi-VN')}
              </span>
              <span className="text-slate-500 text-[11px] font-mono">
                {event.startTime || '08:30'} - {event.endTime || '17:30'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-bold block">ĐỊA ĐIỂM & SẢNH</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate" title={event.location}>
                {event.venueRoom || event.location}
              </span>
              <span className="text-slate-500 text-[11px] truncate block" title={event.location}>
                {event.location}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-bold block">QUY MÔ THAM DỰ</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-extrabold text-slate-900 text-sm">{registered}</span>
                <span className="text-slate-400">/ {cap} chỗ</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${occupancyPercent}%` }}></div>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-bold block">NGÂN SÁCH TỔ CHỨC</span>
              <span className="font-extrabold text-indigo-700 text-sm mt-0.5 block">
                {((event.budget || 500000000) / 1000000).toLocaleString('vi-VN')} Tr VNĐ
              </span>
              <span className="text-slate-500 text-[11px]">Dự toán phê duyệt</span>
            </div>

          </div>

          {/* Online Google Meet link button if present */}
          {event.meetUrl && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 text-xs">Phòng Họp Trực Tuyến (Google Meet / Zoom)</h4>
                  <p className="text-[11px] text-blue-700 font-mono mt-0.5">{event.meetUrl}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyMeet}
                  className="px-3 py-1.5 rounded-xl bg-white border border-blue-300 text-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Đã chép' : 'Sao chép'}</span>
                </button>
                <a
                  href={event.meetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <span>Tham gia</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Description & Theme */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
              Chủ đề & Giới thiệu Sự kiện
            </h4>
            <p className="text-xs font-semibold text-indigo-950 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
              💡 {event.theme}
            </p>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Speakers Line-up */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Đội ngũ Diễn giả & Chuyên gia ({matchedSpeakers.length})
              </h4>
            </div>
            {matchedSpeakers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa gán diễn giả chính thức</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedSpeakers.map(spk => (
                  <div
                    key={spk.id}
                    onClick={() => onOpenProfile && onOpenProfile(spk, 'speaker')}
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer flex items-center gap-3 group"
                  >
                    {spk.avatarUrl ? (
                      <img src={spk.avatarUrl} alt={spk.fullName} className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {spk.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block truncate">
                        {spk.fullName}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {spk.role} • {spk.organization}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sponsor Enterprises */}
          {matchedEnterprises.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Doanh nghiệp Tài trợ & Đối tác ({matchedEnterprises.length})
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                {matchedEnterprises.map(ent => (
                  <div
                    key={ent.id}
                    onClick={() => onOpenProfile && onOpenProfile(ent, 'enterprise')}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{ent.name}</span>
                    <span className="text-[10px] font-normal text-slate-400">({ent.tier})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rundown Summary */}
          {event.rundown && event.rundown.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Kịch bản Timeline Dự kiến ({event.rundown.length} phiên)
              </h4>
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {event.rundown.slice(0, 5).map((slot, sIdx) => (
                  <div key={sIdx} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 w-24 shrink-0">
                        {slot.timeStart} - {slot.timeEnd}
                      </span>
                      <span className="font-semibold text-slate-800 truncate max-w-sm">
                        {slot.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      📍 {slot.locationRoom || 'Hội trường'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* 1-Click Google Calendar & iCal */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={gCalUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              title="Đồng bộ trực tiếp lên Google Calendar cá nhân"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Thêm vào Google Calendar</span>
            </a>

            <button
              onClick={handleDownloadIcs}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              title="Tải tệp .ics cho Outlook / Apple Calendar"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tải file .ics</span>
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {onOpenEdit && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEdit(event);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh Sửa Sự Kiện</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              Đóng
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
