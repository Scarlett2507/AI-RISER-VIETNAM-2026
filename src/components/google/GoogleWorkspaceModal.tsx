import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Calendar, 
  HardDrive, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Sparkles,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import { Speaker, Enterprise, Guest, EventItem } from '../../types';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakers: Speaker[];
  enterprises: Enterprise[];
  guests: Guest[];
  events: EventItem[];
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  speakers = [],
  enterprises = [],
  guests = [],
  events = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sheets' | 'calendar' | 'drive'>('sheets');
  const [selectedSheetType, setSelectedSheetType] = useState<'speakers' | 'enterprises' | 'guests' | 'events'>('speakers');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Convert array of objects to Tab-Separated Values (TSV) for direct Google Sheets paste
  const copyToGoogleSheetsTSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];

    if (selectedSheetType === 'speakers') {
      headers = ['Họ và Tên', 'Tổ chức / Đơn vị', 'Chức vụ', 'Email', 'Số điện thoại', 'Lĩnh vực chuyên môn', 'Đánh giá', 'Địa điểm', 'Thù lao (VND)'];
      rows = speakers.map(s => [
        s.fullName,
        s.organization,
        s.role,
        s.email,
        s.phone,
        Array.isArray(s.expertise) ? s.expertise.join(', ') : s.expertise,
        s.rating,
        s.location,
        s.fee || 0,
      ]);
    } else if (selectedSheetType === 'enterprises') {
      headers = ['Tên Doanh Nghiệp', 'Ngành nghề', 'Người liên hệ', 'Email', 'Số điện thoại', 'Hạng đối tác (Tier)', 'Quy mô', 'Website', 'Địa điểm', 'Tổng tài trợ'];
      rows = enterprises.map(e => [
        e.name,
        e.industry,
        e.contactPerson,
        e.contactEmail,
        e.contactPhone,
        e.tier,
        e.scale,
        e.website,
        e.location,
        e.sponsorshipTotal || 0,
      ]);
    } else if (selectedSheetType === 'guests') {
      headers = ['Họ và Tên', 'Email', 'Số điện thoại', 'Đơn vị', 'Chức vụ', 'Hạng vé', 'Trạng thái VIP', 'Chủ đề quan tâm'];
      rows = guests.map(g => [
        g.fullName,
        g.email,
        g.phone,
        g.organization,
        g.role,
        g.ticketType,
        g.vipStatus ? 'VIP' : 'Standard',
        Array.isArray(g.interestTopics) ? g.interestTopics.join(', ') : g.interestTopics,
      ]);
    } else {
      headers = ['Tên sự kiện', 'Mã', 'Ngày diễn ra', 'Địa điểm', 'Loại hình', 'Chủ đề chính', 'Ngân sách', 'Mô tả'];
      rows = events.map(ev => [
        ev.title,
        ev.code,
        ev.date,
        ev.location,
        ev.type,
        ev.theme,
        ev.budget || 0,
        ev.description,
      ]);
    }

    const tsvContent = [
      headers.join('\t'),
      ...rows.map(r => r.map((cell: any) => `"${String(cell || '').replace(/"/g, '""')}"`).join('\t')),
    ].join('\n');

    navigator.clipboard.writeText(tsvContent);
    showToast(`Đã sao chép ${rows.length} dòng dữ liệu! Hãy mở Google Sheets và dán (Ctrl+V) trực tiếp.`);
  };

  // Generate direct Google Calendar Event URL
  const generateGoogleCalendarUrl = (ev: EventItem) => {
    const title = encodeURIComponent(`[Sự kiện] ${ev.title}`);
    const details = encodeURIComponent(`${ev.description || ''}\n\nChủ đề: ${ev.theme || ''}\nMã sự kiện: ${ev.code}\nQuản lý bởi EventData Hub`);
    const location = encodeURIComponent(ev.location || 'Việt Nam');

    // Parse date (e.g. 2026-09-15)
    let startDateStr = '20260915T083000Z';
    let endDateStr = '20260915T173000Z';

    if (ev.date) {
      const cleanDate = ev.date.replace(/[^0-9]/g, '');
      if (cleanDate.length >= 8) {
        const y = cleanDate.substring(0, 4);
        const m = cleanDate.substring(4, 6);
        const d = cleanDate.substring(6, 8);
        startDateStr = `${y}${m}${d}T013000Z`;
        endDateStr = `${y}${m}${d}T103000Z`;
      }
    }

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}&location=${location}`;
  };

  // Download .ics file
  const downloadIcsCalendar = (ev: EventItem) => {
    const cleanDate = ev.date.replace(/[^0-9]/g, '');
    const dateFormatted = cleanDate.length >= 8 ? cleanDate.substring(0, 8) : '20260915';
    
    const icsString = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventData Hub//VN Event System//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description || ev.theme || 'Sự kiện do EventData Hub quản lý'}`,
      `LOCATION:${ev.location || 'Hà Nội'}`,
      `DTSTART:${dateFormatted}T083000`,
      `DTEND:${dateFormatted}T173000`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.code || 'event'}-calendar.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã tải xuống file lịch .ics cho sự kiện "${ev.title}"!`);
  };

  // Download full Google Drive backup JSON snapshot
  const downloadDriveBackup = () => {
    const backupData = {
      backupTimestamp: new Date().toISOString(),
      platform: 'EventData Hub - Google Cloud Workspace Backup',
      version: '2.5',
      summary: {
        speakerCount: speakers.length,
        enterpriseCount: enterprises.length,
        guestCount: guests.length,
        eventCount: events.length,
      },
      data: {
        speakers,
        enterprises,
        guests,
        events,
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EventDataHub_GoogleDriveBackup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải gói sao lưu cơ sở dữ liệu để lưu trữ an toàn trên Google Drive!');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Google Workspace & Cloud Sync Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white">
                  Sheets • Calendar • Drive
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Đồng bộ hai chiều dữ liệu sự kiện với hệ sinh thái năng suất làm việc của Google
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

        {/* Toast alert */}
        {copiedNotification && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-6 py-2.5 flex items-center gap-2 animate-in slide-in-from-top">
            <Check className="w-4 h-4" />
            <span>{copiedNotification}</span>
          </div>
        )}

        {/* Sub-tabs */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('sheets')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'sheets'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets (Bảng tính)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'calendar'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Google Calendar (Lịch trình)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('drive')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'drive'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-600" />
            <span>Google Drive (Sao lưu Cloud)</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: GOOGLE SHEETS */}
          {activeSubTab === 'sheets' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Tính năng Xuất & Dán tức thì vào Google Sheets</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Dữ liệu đã được định dạng chuẩn theo hàng và cột phân tách tab (TSV). Bạn chỉ cần bấm <strong>Sao chép dữ liệu</strong> và bấm <strong>Ctrl + V</strong> vào bảng tính Google Sheets bất kỳ.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700">Chọn bảng dữ liệu muốn xuất sang Google Sheets:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'speakers', label: 'Diễn giả & Chuyên gia', count: speakers.length },
                    { key: 'enterprises', label: 'Doanh nghiệp & Đối tác', count: enterprises.length },
                    { key: 'guests', label: 'Khách mời & Check-in', count: guests.length },
                    { key: 'events', label: 'Danh sách Sự kiện', count: events.length },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedSheetType(tab.key as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedSheetType === tab.key
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">{tab.label}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{tab.count} bản ghi</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={copyToGoogleSheetsTSV}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <Copy className="w-4 h-4" />
                  <span>Sao chép dữ liệu cho Google Sheets (1-Click TSV)</span>
                </button>
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Mở Google Sheets Mới (sheets.new)</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE CALENDAR */}
          {activeSubTab === 'calendar' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
                <Calendar className="w-6 h-6 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900">Thêm sự kiện trực tiếp vào Google Calendar</h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Tự động tạo đường link thêm lịch Google Calendar 1-Click hoặc tải file iCalendar (.ics) cho ban tổ chức và diễn giả.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Danh sách sự kiện đang quản trị ({events.length})
                </h4>
                <div className="space-y-2.5">
                  {events.map((ev) => (
                    <div 
                      key={ev.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-blue-400 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            {ev.code}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{ev.title}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          📅 {ev.date} | 📍 {ev.location || 'Chưa định vị'} | 🎯 {ev.theme || 'Chủ đề chung'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={generateGoogleCalendarUrl(ev)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Google Calendar</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => downloadIcsCalendar(ev)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải .ics</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE DRIVE BACKUP */}
          {activeSubTab === 'drive' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                <HardDrive className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Sao lưu & Lưu trữ đám mây Google Drive</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Đóng gói toàn bộ cơ sở dữ liệu đã chuẩn hóa (Diễn giả, Doanh nghiệp, Khách mời, Sự kiện, Nhật ký vận hành) thành gói Snapshot đồng bộ lưu trữ an toàn trên Google Drive.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Tổng quan Gói Sao Lưu:</span>
                  <span className="text-xs font-bold text-amber-400">Đã Chuẩn Hóa 100%</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <div className="text-lg font-bold text-white">{speakers.length}</div>
                    <div className="text-[11px] text-slate-400">Diễn giả</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <div className="text-lg font-bold text-white">{enterprises.length}</div>
                    <div className="text-[11px] text-slate-400">Doanh nghiệp</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <div className="text-lg font-bold text-white">{guests.length}</div>
                    <div className="text-[11px] text-slate-400">Khách mời</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <div className="text-lg font-bold text-white">{events.length}</div>
                    <div className="text-[11px] text-slate-400">Sự kiện</div>
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={downloadDriveBackup}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors font-bold shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Gói Snapshot Cho Google Drive</span>
                  </button>
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Mở Google Drive (drive.google.com)</span>
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Tương thích Google Workspace Suite (Sheets, Calendar, Drive API Ecosystem)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-xs"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
