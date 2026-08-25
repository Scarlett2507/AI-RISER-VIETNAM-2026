import React, { useState } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Users, 
  CalendarDays, 
  Star, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Tag, 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  Share2, 
  ExternalLink,
  ShieldCheck,
  Award,
  PhoneCall,
  Briefcase,
  FileText,
  Trash2
} from 'lucide-react';
import { EntityType, Speaker, Enterprise, Guest, EventItem, InteractionNote, AuditLog, UserRole } from '../../types';
import { AiService, EnrichedProfileResult } from '../../services/aiService';
import { ensureArray } from '../../services/normalizer';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../../services/schedulingService';
import { Sparkles, Loader2 } from 'lucide-react';
import { PhoneBadge } from '../common/PhoneBadge';

interface Profile360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Speaker | Enterprise | Guest | null;
  entityType: EntityType;
  allEvents: EventItem[];
  allSpeakers: Speaker[];
  allEnterprises: Enterprise[];
  notes: InteractionNote[];
  onAddNote: (note: Omit<InteractionNote, 'id'>) => void;
  onEditEntity: (entity: any, type: EntityType) => void;
  onDeleteEntity?: (id: string, type: EntityType) => void;
  currentUserRole: UserRole;
}

export const Profile360Modal: React.FC<Profile360ModalProps> = ({
  isOpen,
  onClose,
  entity,
  entityType,
  allEvents = [],
  allSpeakers = [],
  allEnterprises = [],
  notes = [],
  onAddNote,
  onEditEntity,
  onDeleteEntity,
  currentUserRole = 'Admin',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'network' | 'notes'>('overview');
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteType, setNoteType] = useState<InteractionNote['type']>('call');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [isEnrichingLoading, setIsEnrichingLoading] = useState<boolean>(false);
  const [enrichedResult, setEnrichedResult] = useState<EnrichedProfileResult | null>(null);

  if (!isOpen || !entity) return null;

  const handleAiEnrich = async () => {
    setIsEnrichingLoading(true);
    try {
      const result = await AiService.enrichProfile(entity, entityType);
      setEnrichedResult(result);
    } catch (e) {
      console.warn('Enrich error:', e);
    } finally {
      setIsEnrichingLoading(false);
    }
  };

  const entityNotes = notes.filter(n => n.entityId === entity.id);

  // Get linked events
  let linkedEventTitles: string[] = [];
  if (entityType === 'guest') {
    linkedEventTitles = (entity as Guest).eventsAttended || [];
  } else {
    linkedEventTitles = (entity as Speaker | Enterprise).events || [];
  }

  const linkedEvents = allEvents.filter(ev => 
    linkedEventTitles.includes(ev.title) || 
    ev.speakerIds.includes(entity.id) || 
    ev.enterpriseIds.includes(entity.id)
  );

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;

    onAddNote({
      entityId: entity.id,
      entityType,
      authorName: currentUserRole === 'Admin' ? 'Admin (Bạn)' : currentUserRole,
      authorRole: currentUserRole,
      date: new Date().toISOString(),
      type: noteType,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      followUpDate: followUpDate || undefined,
    });

    setNoteTitle('');
    setNoteContent('');
    setFollowUpDate('');
    setIsAddingNote(false);
  };

  const getEntityTitle = () => {
    if (entityType === 'speaker') return (entity as Speaker)?.fullName || (entity as any)?.name || 'Hồ sơ chuyên gia';
    if (entityType === 'enterprise') return (entity as Enterprise)?.name || (entity as any)?.fullName || 'Hồ sơ doanh nghiệp';
    if (entityType === 'guest') return (entity as Guest)?.fullName || (entity as any)?.name || 'Hồ sơ khách mời';
    return (entity as any)?.fullName || (entity as any)?.name || (entity as any)?.title || 'Hồ sơ';
  };

  const getSubtitle = () => {
    if (entityType === 'speaker') {
      const spk = entity as Speaker;
      return `${spk.role} • ${spk.organization}`;
    }
    if (entityType === 'enterprise') {
      const ent = entity as Enterprise;
      return `${ent.industry} • Hạng ${ent.tier}`;
    }
    if (entityType === 'guest') {
      const gst = entity as Guest;
      return `${gst.role || 'Khách mời'} • ${gst.organization || 'Cá nhân'}`;
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Profile Header Hero */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            
            {/* Avatar / Logo */}
            <div className="relative">
              {'avatarUrl' in entity && entity.avatarUrl ? (
                <img
                  src={entity.avatarUrl}
                  alt={getEntityTitle()}
                  referrerPolicy="no-referrer"
                  className="w-18 h-18 rounded-2xl object-cover ring-4 ring-white/10 shadow-lg"
                />
              ) : 'logoUrl' in entity && entity.logoUrl ? (
                <img
                  src={entity.logoUrl}
                  alt={getEntityTitle()}
                  referrerPolicy="no-referrer"
                  className="w-18 h-18 rounded-2xl object-cover bg-white p-1 ring-4 ring-white/10 shadow-lg"
                />
              ) : (
                <div className="w-18 h-18 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/10 shadow-lg">
                  {(getEntityTitle() || '?').charAt(0).toUpperCase()}
                </div>
              )}

              {/* Status indicator */}
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-900">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>
            </div>

            {/* Title & Quick Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-extrabold text-white tracking-tight truncate">
                  {getEntityTitle()}
                </h1>
                
                {/* Badges */}
                {entityType === 'speaker' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    Diễn giả / Chuyên gia
                  </span>
                )}
                {entityType === 'enterprise' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Đối tác {(entity as Enterprise).tier}
                  </span>
                )}
                {entityType === 'guest' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {(entity as Guest).vipStatus ? 'VIP Khách mời' : 'Khách tham dự'}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 mb-2">
                {getSubtitle()}
              </p>

              {/* Quick meta stats */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                {'rating' in entity && (entity as Speaker).rating && (
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-500/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{(entity as Speaker).rating} / 5.0 Rating</span>
                  </div>
                )}
                {'location' in entity && entity.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{entity.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  <span>{linkedEvents.length} sự kiện đã kết nối</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>{entityNotes.length} tương tác ghi chú</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <button
                onClick={handleAiEnrich}
                disabled={isEnrichingLoading}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-semibold border border-purple-400/40 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isEnrichingLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{isEnrichingLoading ? 'Gemini đang phân tích...' : 'Gemini AI Nâng Cấp Hồ Sơ'}</span>
              </button>

              <button
                onClick={() => onEditEntity(entity, entityType)}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sửa hồ sơ</span>
              </button>

              {onDeleteEntity && (
                <button
                  onClick={() => {
                    onDeleteEntity(entity.id, entityType);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 text-xs font-semibold border border-red-500/30 transition-all flex items-center gap-1.5"
                  title="Xóa hồ sơ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-600 shrink-0">
          {[
            { key: 'overview', label: '1. Thông tin 360° Tổng quan' },
            { key: 'events', label: `2. Lịch sử Sự kiện (${linkedEvents.length})` },
            { key: 'network', label: '3. Mạng lưới Liên kết' },
            { key: 'notes', label: `4. Tương tác & Ghi chú (${entityNotes.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column (2 cols) */}
              <div className="md:col-span-2 space-y-6">

                {/* Gemini AI Enriched Insights Card */}
                {enrichedResult && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50/40 border border-purple-200 shadow-xs space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                          Phân Tích Chân Dung Tự Động (Gemini 3.7 Flash)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                        AI Generated
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 italic">
                      "{enrichedResult.executiveHeadline}"
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-white/70 p-3 rounded-xl border border-purple-100">
                      {enrichedResult.enhancedBio}
                    </p>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-purple-900 block">Điểm nổi bật (Highlights):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {enrichedResult.keyHighlights.map((hl, i) => (
                          <div key={i} className="text-[11px] text-slate-700 flex items-start gap-1">
                            <span className="text-purple-600 font-bold">•</span>
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Bio / Summary */}
                {'bio' in entity && entity.bio && !enrichedResult && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Tiểu sử / Giới thiệu
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {entity.bio}
                    </p>
                  </div>
                )}

                {/* Expertise / Topics */}
                {('expertise' in entity || 'interestTopics' in entity) && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Lĩnh vực Chuyên môn & Chủ đề
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[...ensureArray((entity as any).expertise), ...ensureArray((entity as any).interestTopics)].map((exp: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note / System Warnings */}
                {'note' in entity && (entity as any).note && (
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📝 Ghi chú & Lưu ý hệ thống</span>
                    </span>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium bg-white/70 p-2.5 rounded-lg border border-amber-200/50">
                      {(entity as any).note}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {ensureArray(entity.tags).length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Bộ phận phụ trách / Ban (Tags)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ensureArray(entity.tags).map((t, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5"
                        >
                          <span>🏢</span>
                          <span>{t}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Speaker Honorarium / Enterprise Sponsorship */}
                {'honorariumRange' in entity && entity.honorariumRange && (
                  <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-purple-950 block">Mức Thù Lao Diễn Giả Đề Xuất (Honorarium):</span>
                      <span className="text-purple-700">{entity.honorariumRange}</span>
                    </div>
                    <Award className="w-5 h-5 text-purple-500" />
                  </div>
                )}

                {'sponsorshipTotal' in entity && (entity as Enterprise).sponsorshipTotal && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-950 block">Tổng Giá Trị Tài Trợ Đã Hợp Tác:</span>
                      <span className="text-amber-800 text-sm font-extrabold">
                        {((entity as Enterprise).sponsorshipTotal || 0).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                    <Award className="w-5 h-5 text-amber-500" />
                  </div>
                )}

              </div>

              {/* Right Column: Contact & Metadata */}
              <div className="space-y-4">
                
                {/* Contact Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-100 pb-2">
                    Thông tin Liên hệ Chuẩn hóa
                  </span>

                  <div className="space-y-2.5 text-xs">
                    {/* Email */}
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block">Email chính</span>
                        <a href={`mailto:${(entity as any).email || (entity as any).contactEmail}`} className="font-mono text-indigo-600 hover:underline truncate block">
                          {(entity as any).email || (entity as any).contactEmail || 'Chưa cập nhật'}
                        </a>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-2.5 text-slate-700">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Điện thoại / Hotline (Chuẩn E.164 & OTT)</span>
                        {((entity as any).phone || (entity as any).contactPhone) ? (
                          <PhoneBadge phone={(entity as any).phone || (entity as any).contactPhone} showActions={true} />
                        ) : (
                          <span className="text-slate-400 italic">Chưa cập nhật</span>
                        )}
                      </div>
                    </div>

                    {/* Website */}
                    {'website' in entity && entity.website && (
                      <div className="flex items-center gap-2.5 text-slate-700">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 block">Trang web</span>
                          <a href={entity.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate flex items-center gap-1 font-medium">
                            <span>{entity.website}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Contact Person */}
                    {'contactPerson' in entity && entity.contactPerson && (
                      <div className="flex items-center gap-2.5 text-slate-700">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 block">Người đại diện liên hệ</span>
                          <span className="font-semibold text-slate-900 block">{entity.contactPerson}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit metadata */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Mã định danh (ID):</span>
                    <span className="font-mono text-slate-700 font-semibold">{entity.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ngày khởi tạo:</span>
                    <span>{new Date(entity.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cập nhật gần nhất:</span>
                    <span>{new Date(entity.updatedAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span>Chuẩn hóa:</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Đạt chuẩn v2.4
                    </span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: EVENTS PARTICIPATION HISTORY */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Dòng thời gian sự kiện đã tham gia ({linkedEvents.length})
                </span>
              </div>

              {linkedEvents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  Chưa có lịch sử sự kiện nào được ghi nhận cho hồ sơ này.
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedEvents.map((ev) => (
                    <div key={ev.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                            {ev.type}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{ev.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500">{ev.theme}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>📅 {new Date(ev.date).toLocaleDateString('vi-VN')}</span>
                          <span>📍 {ev.location}</span>
                          <span>👥 {ev.attendeeCount} người tham dự</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={generateGoogleCalendarUrl(ev)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1"
                          title="Thêm vào Google Calendar"
                        >
                          <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                          <span>GCal</span>
                        </a>

                        <button
                          onClick={() => downloadIcsFile(ev)}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1"
                          title="Tải tệp .ics"
                        >
                          <span>.ics</span>
                        </button>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                          ev.status === 'Đã kết thúc' 
                            ? 'bg-slate-100 text-slate-700' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {ev.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NETWORK & CONNECTIONS */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Doanh nghiệp & Đơn vị Đồng Hành Liên Quan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allEnterprises.slice(0, 4).map(ent => (
                    <div key={ent.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-indigo-700 shrink-0">
                        {(ent.name || ent.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <span className="font-bold text-slate-900 truncate block">{ent.name || 'Doanh nghiệp'}</span>
                        <span className="text-slate-500 text-[11px]">{ent.industry}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {ent.tier}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Mạng lưới Diễn giả Cùng Chủ đề
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allSpeakers.filter(s => s.id !== entity.id).slice(0, 4).map(spk => (
                    <div key={spk.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                      <img src={spk.avatarUrl} alt={spk.fullName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      <div className="min-w-0 flex-1 text-xs">
                        <span className="font-bold text-slate-900 truncate block">{spk.fullName}</span>
                        <span className="text-slate-500 text-[11px]">{spk.organization}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{spk.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INTERACTION NOTES & AUDIT */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lịch sử Tương tác & Ghi chú Đội ngũ ({entityNotes.length})
                </span>
                {!isAddingNote && (
                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm ghi chú / Cuộc gọi</span>
                  </button>
                )}
              </div>

              {/* Add Note Form */}
              {isAddingNote && (
                <form onSubmit={handleSaveNote} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950">Thêm Tương Tác Mới</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Hủy bỏ
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Tiêu đề tương tác (VD: Trao đổi chủ đề Keynote, Hẹn ký hợp đồng)..."
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <select
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="call">📞 Cuộc gọi điện thoại</option>
                        <option value="meeting">🤝 Họp trực tiếp / Online</option>
                        <option value="email">✉️ Trao đổi qua Email</option>
                        <option value="contract">📑 Ký kết hợp đồng</option>
                        <option value="note">📝 Ghi chú nội bộ</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Nội dung chi tiết cuộc trao đổi, thống nhất yêu cầu hoặc kết quả..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    required
                    className="w-full text-xs p-3 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>Hẹn theo dõi tiếp:</span>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="text-xs px-2 py-1 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500"
                    >
                      Lưu Ghi Chú
                    </button>
                  </div>
                </form>
              )}

              {/* Timeline of notes */}
              {entityNotes.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  Chưa có ghi chú tương tác nào. Hãy ghi lại cuộc gọi hoặc buổi họp đầu tiên với hồ sơ này.
                </div>
              ) : (
                <div className="space-y-3">
                  {entityNotes.map((nt) => (
                    <div key={nt.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {nt.type}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{nt.title}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(nt.date).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {nt.content}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Tác giả: <strong className="text-slate-600">{nt.authorName}</strong> ({nt.authorRole})</span>
                        {nt.followUpDate && (
                          <span className="text-indigo-600 font-semibold">
                            ⏰ Hạn phản hồi: {new Date(nt.followUpDate).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Hồ sơ 360° đã đồng bộ thời gian thực
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
          >
            Đóng Hồ sơ
          </button>
        </div>

      </div>
    </div>
  );
};
