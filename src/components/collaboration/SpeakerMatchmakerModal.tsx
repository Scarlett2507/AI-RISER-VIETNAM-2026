import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Search, 
  Star, 
  CheckCircle2, 
  Calendar, 
  Award, 
  Send, 
  Building2, 
  ArrowRight,
  Filter,
  Users,
  Loader2,
  BrainCircuit,
  MessageSquareQuote
} from 'lucide-react';
import { Speaker, EventItem, EntityType } from '../../types';
import { AiService, MatchmakerReasoningResult } from '../../services/aiService';
import { ensureArray } from '../../services/normalizer';

interface SpeakerMatchmakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakers: Speaker[];
  events: EventItem[];
  onOpenProfile: (speaker: Speaker, type: EntityType) => void;
  onAssignSpeakerToEvent: (speakerId: string, eventId: string) => void;
}

export const SpeakerMatchmakerModal: React.FC<SpeakerMatchmakerModalProps> = ({
  isOpen,
  onClose,
  speakers = [],
  events = [],
  onOpenProfile,
  onAssignSpeakerToEvent,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [customThemeQuery, setCustomThemeQuery] = useState<string>('');
  const [assignedSpeakerIds, setAssignedSpeakerIds] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Gemini Deep Reasoning state
  const [deepReasoningSpeaker, setDeepReasoningSpeaker] = useState<Speaker | null>(null);
  const [deepReasoningResult, setDeepReasoningResult] = useState<MatchmakerReasoningResult | null>(null);
  const [isReasoningLoading, setIsReasoningLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0] || null;
  const activeTheme = customThemeQuery.trim() || currentEvent?.theme || currentEvent?.title || '';

  // Calculate Match Score for each speaker
  const scoredSpeakers = speakers.map(spk => {
    let score = 50; // base score

    const allKeywords = [
      ...(spk.expertise || []),
      ...(spk.tags || []),
      spk.role || '',
      spk.organization || '',
      spk.bio || '',
    ].join(' ').toLowerCase();

    const queryWords = (activeTheme || '').toLowerCase().split(/[\s,+/]+/).filter(w => w.length > 2);
    
    let matchedKeywords: string[] = [];
    queryWords.forEach(word => {
      if (allKeywords.includes(word)) {
        score += 15;
        matchedKeywords.push(word);
      }
    });

    if (spk.rating && spk.rating >= 4.8) score += 10;
    if (spk.status === 'Available') score += 5;
    if (currentEvent && (spk.events || []).includes(currentEvent.title)) {
      score += 10;
    }

    const finalScore = Math.min(99, Math.max(35, score));

    return {
      speaker: spk,
      score: finalScore,
      matchedKeywords: Array.from(new Set(matchedKeywords)),
    };
  }).sort((a, b) => b.score - a.score);

  const handleAssign = (spk: Speaker) => {
    if (!currentEvent) return;
    onAssignSpeakerToEvent(spk.id, currentEvent.id);
    setAssignedSpeakerIds(prev => [...prev, spk.id]);
    setSuccessToast(`Đã đề xuất và gán ${spk.fullName} vào sự kiện ${currentEvent.title}`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDeepAnalyze = async (spk: Speaker) => {
    if (!currentEvent) return;
    setDeepReasoningSpeaker(spk);
    setDeepReasoningResult(null);
    setIsReasoningLoading(true);

    try {
      const result = await AiService.getMatchmakerReasoning(spk, currentEvent);
      setDeepReasoningResult(result);
    } catch (e) {
      console.warn('Reasoning error:', e);
    } finally {
      setIsReasoningLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Trợ Lý AI Gợi Ý & Khớp Nối Chuyên Gia Sự Kiện (Smart Matchmaker)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  Google Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-purple-200/70">
                Thuật toán phân tích tương thích chủ đề, lĩnh vực chuyên môn, điểm uy tín và cơ hội hợp tác
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Query selector & target event bar */}
        <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Sự Kiện Đích Cần Tìm Diễn Giả:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.theme || 'Chủ đề chung'}) - {ev.date}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tìm Theo Từ Khóa Hoặc Chủ Đề Tùy Chỉnh:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={customThemeQuery}
                onChange={(e) => setCustomThemeQuery(e.target.value)}
                placeholder="Ví dụ: Fintech, AI, Chuyển đổi số, Khởi nghiệp..."
                className="w-full text-xs bg-white border border-purple-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

        </div>

        {/* Toast */}
        {successToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-6 py-2.5 flex items-center gap-2 animate-in slide-in-from-top duration-150 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Content Body: Two columns if reasoning open, or list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* Left / Main: Ranked Speaker Cards */}
          <div className={deepReasoningSpeaker ? 'lg:col-span-7 space-y-3' : 'lg:col-span-12 space-y-3'}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Xếp hạng độ tương thích ({scoredSpeakers.length} diễn giả)
              </span>
              <span className="text-xs text-purple-700 font-semibold">
                Chủ đề đang ghép nối: <strong className="text-slate-900 font-bold">{activeTheme || 'Tổng thể'}</strong>
              </span>
            </div>

            {scoredSpeakers.map(({ speaker, score, matchedKeywords }) => {
              const isAssigned = assignedSpeakerIds.includes(speaker.id);
              const isSelectedForReasoning = deepReasoningSpeaker?.id === speaker.id;

              return (
                <div
                  key={speaker.id}
                  className={`p-4 rounded-2xl border transition-all bg-white ${
                    isSelectedForReasoning
                      ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                      : 'border-slate-200 hover:border-purple-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    
                    {/* Left details */}
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                        {(speaker.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 
                            onClick={() => onOpenProfile(speaker, 'speaker')}
                            className="text-sm font-bold text-slate-900 hover:text-purple-600 cursor-pointer transition-colors"
                          >
                            {speaker.fullName || 'Chưa đặt tên'}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {speaker.rating || 4.8}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            • {speaker.location || 'Việt Nam'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-0.5">
                          {speaker.role} <span className="text-slate-400">tại</span> <strong className="text-slate-800">{speaker.organization}</strong>
                        </p>

                        {/* Badges / Matched Keywords */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ensureArray(speaker.expertise).slice(0, 3).map((exp, i) => (
                            <span 
                              key={i} 
                              className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${
                                matchedKeywords.some(mk => exp.toLowerCase().includes(mk))
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300 font-bold'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {exp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right match score & actions */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <div className="text-xl font-black text-purple-700 leading-none">
                          {score}%
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          Độ tương thích
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeepAnalyze(speaker)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1"
                        >
                          <BrainCircuit className="w-3.5 h-3.5" />
                          <span>Gemini Phân Tích</span>
                        </button>

                        <button
                          onClick={() => handleAssign(speaker)}
                          disabled={isAssigned}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                            isAssigned
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                              : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                          }`}
                        >
                          {isAssigned ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Đã Gán</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Mời Diễn Giả</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Gemini Deep AI Reasoning Panel */}
          {deepReasoningSpeaker && (
            <div className="lg:col-span-5 bg-white rounded-2xl border border-purple-200 shadow-md p-5 flex flex-col space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Báo Cáo Phân Tích Chuyên Sâu Gemini</h3>
                    <p className="text-[11px] text-purple-700">{deepReasoningSpeaker.fullName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeepReasoningSpeaker(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isReasoningLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <div className="text-xs font-bold text-slate-700">
                    Gemini 3.7 Flash đang phân tích hồ sơ & chủ đề hội nghị...
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Đánh giá tương quan chuyên môn, tiềm năng thu hút người tham dự và đề xuất chủ đề trình bày
                  </p>
                </div>
              ) : deepReasoningResult ? (
                <div className="space-y-4 text-xs overflow-y-auto max-h-[60vh] pr-1">
                  
                  {/* Score badge */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-purple-200 uppercase font-bold">Điểm tương thích AI</div>
                      <div className="text-2xl font-black text-amber-300">{deepReasoningResult.score}/100</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                      Rất Phù Hợp
                    </span>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Điểm Tương Thích Nổi Bật:
                    </h4>
                    <ul className="space-y-1 pl-1">
                      {deepReasoningResult.matchHighlights.map((hl, i) => (
                        <li key={i} className="text-slate-700 text-[11px] flex items-start gap-1.5">
                          <span className="text-purple-600 font-bold">•</span>
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended talk topics */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Gợi Ý Chủ Đề Bài Nói (Custom Topics):
                    </h4>
                    <div className="space-y-1.5">
                      {deepReasoningResult.recommendedTopics.map((topic, i) => (
                        <div key={i} className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 font-semibold text-[11px]">
                          💬 {topic}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rationale */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <MessageSquareQuote className="w-4 h-4 text-indigo-600" />
                      Nhận Xét & Đánh Giá Tổng Quan:
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {deepReasoningResult.talkingPointsRationale}
                    </p>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleAssign(deepReasoningSpeaker)}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi Thư Mời & Đăng Ký Vào Sự Kiện</span>
                  </button>

                </div>
              ) : null}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Hệ thống gợi ý đa chiều dựa trên mô hình ngôn ngữ lớn Google Gemini
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            Hoàn tất
          </button>
        </div>

      </div>
    </div>
  );
};
