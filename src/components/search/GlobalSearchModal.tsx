import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  Mic2, 
  Building2, 
  Users, 
  CalendarDays, 
  Star, 
  MapPin, 
  Tag, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Speaker, Enterprise, Guest, EventItem, EntityType } from '../../types';
import { ensureArray } from '../../services/normalizer';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakers: Speaker[];
  enterprises: Enterprise[];
  guests: Guest[];
  events: EventItem[];
  onOpenProfile: (entity: any, type: EntityType) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  speakers = [],
  enterprises = [],
  guests = [],
  events = [],
  onOpenProfile,
}) => {
  const [query, setQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'speaker' | 'enterprise' | 'guest' | 'event'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  // Search logic across all entities
  const speakerResults = speakers.filter(s => {
    const str = `${s.fullName} ${s.organization} ${s.role} ${ensureArray(s.expertise).join(' ')} ${ensureArray(s.tags).join(' ')} ${s.location} ${s.email} ${s.bio || ''}`.toLowerCase();
    return str.includes(normalizedQuery);
  });

  const enterpriseResults = enterprises.filter(e => {
    const str = `${e.name} ${e.industry} ${e.contactPerson} ${e.contactEmail} ${ensureArray(e.tags).join(' ')} ${e.location} ${e.tier}`.toLowerCase();
    return str.includes(normalizedQuery);
  });

  const guestResults = guests.filter(g => {
    const str = `${g.fullName} ${g.organization} ${g.role} ${g.email} ${ensureArray(g.interestTopics).join(' ')} ${ensureArray(g.tags).join(' ')} ${g.location} ${g.ticketType}`.toLowerCase();
    return str.includes(normalizedQuery);
  });

  const eventResults = events.filter(ev => {
    const str = `${ev.title} ${ev.theme} ${ev.location} ${ev.type} ${ev.description} ${ensureArray(ev.tags).join(' ')}`.toLowerCase();
    return str.includes(normalizedQuery);
  });

  const totalResults = speakerResults.length + enterpriseResults.length + guestResults.length + eventResults.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Tìm kiếm siêu tốc theo tên chuyên gia, công ty, chuyên môn, chủ đề, sự kiện..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
          />
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">
              ESC để đóng
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'all', label: `Tất cả (${totalResults})` },
            { id: 'speaker', label: `Diễn giả (${speakerResults.length})` },
            { id: 'enterprise', label: `Doanh nghiệp (${enterpriseResults.length})` },
            { id: 'guest', label: `Khách mời (${guestResults.length})` },
            { id: 'event', label: `Sự kiện (${eventResults.length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
                activeFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          
          {totalResults === 0 && (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Search className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">Không tìm thấy kết quả nào phù hợp với "{query}"</p>
              <p>Thử nhập từ khóa tổng quát hơn như: AI, FinTech, FPT, Hà Nội, Keynote...</p>
            </div>
          )}

          {/* SPEAKERS RESULTS */}
          {(activeFilter === 'all' || activeFilter === 'speaker') && speakerResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Diễn giả & Chuyên gia ({speakerResults.length})
              </span>
              {speakerResults.map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    onOpenProfile(s, 'speaker');
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {(s.fullName || s.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{s.fullName || 'Diễn giả'}</span>
                        <span className="text-[10px] text-slate-500">• {s.role} ({s.organization})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>📍 {s.location}</span>
                        <span>⭐ {s.rating}</span>
                        <span className="text-purple-600 font-medium">{ensureArray(s.expertise).slice(0, 2).join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* ENTERPRISE RESULTS */}
          {(activeFilter === 'all' || activeFilter === 'enterprise') && enterpriseResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Doanh nghiệp & Đối tác ({enterpriseResults.length})
              </span>
              {enterpriseResults.map(e => (
                <div
                  key={e.id}
                  onClick={() => {
                    onOpenProfile(e, 'enterprise');
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {(e.name || e.fullName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{e.name || 'Doanh nghiệp'}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {e.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>🏢 {e.industry}</span>
                        <span>👤 LH: {e.contactPerson || e.contactEmail}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* GUEST RESULTS */}
          {(activeFilter === 'all' || activeFilter === 'guest') && guestResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Khách mời ({guestResults.length})
              </span>
              {guestResults.map(g => (
                <div
                  key={g.id}
                  onClick={() => {
                    onOpenProfile(g, 'guest');
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {(g.fullName || g.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{g.fullName || 'Khách mời'}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{g.role} • {g.organization}</span>
                        <span className="text-blue-600 font-semibold">{g.ticketType}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* EVENT RESULTS */}
          {(activeFilter === 'all' || activeFilter === 'event') && eventResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Sự kiện ({eventResults.length})
              </span>
              {eventResults.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => {
                    onOpenProfile(ev, 'event');
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      📅
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{ev.title}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>📅 {new Date(ev.date).toLocaleDateString('vi-VN')}</span>
                        <span>📍 {ev.location}</span>
                        <span className="text-emerald-700 font-semibold">{ev.status}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span>Hỗ trợ tìm kiếm theo tiếng Việt có dấu hoặc không dấu</span>
          <span>Phím tắt: <strong>⌘K</strong> / <strong>Ctrl+K</strong></span>
        </div>

      </div>
    </div>
  );
};
