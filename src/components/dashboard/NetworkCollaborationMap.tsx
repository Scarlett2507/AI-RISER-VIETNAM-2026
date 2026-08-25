import React, { useState } from 'react';
import { 
  Network, 
  Building2, 
  Mic2, 
  CalendarDays, 
  Star, 
  Award, 
  ArrowRight, 
  ExternalLink, 
  Sparkles,
  Layers,
  TrendingUp,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { Speaker, Enterprise, EventItem, EntityType } from '../../types';

interface NetworkCollaborationMapProps {
  speakers: Speaker[];
  enterprises: Enterprise[];
  events: EventItem[];
  onOpenProfile: (entity: any, type: EntityType) => void;
  onOpenMatchmaker?: () => void;
}

export const NetworkCollaborationMap: React.FC<NetworkCollaborationMapProps> = ({
  speakers = [],
  enterprises = [],
  events = [],
  onOpenProfile,
  onOpenMatchmaker,
}) => {
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; type: 'enterprise' | 'speaker' | 'event' } | null>(null);
  const [viewMode, setViewMode] = useState<'network' | 'matrix' | 'key_partners'>('network');
  const [filterMinEvents, setFilterMinEvents] = useState<number>(1);

  // Compute partnership and co-occurrence data
  // Map enterprise -> events & co-speakers
  const enterpriseStats = enterprises.map(ent => {
    const entEvents = events.filter(ev => 
      ev.enterpriseIds?.includes(ent.id) || (ent.events || []).includes(ev.title)
    );
    const coSpeakers = speakers.filter(spk => 
      entEvents.some(ev => ev.speakerIds?.includes(spk.id) || (spk.events || []).includes(ev.title))
    );
    const totalSponsorship = ent.sponsorshipTotal || 0;
    const partnershipScore = (entEvents.length * 20) + (ent.tier === 'Strategic' ? 40 : ent.tier === 'Diamond' ? 30 : ent.tier === 'Gold' ? 20 : 10);

    return {
      enterprise: ent,
      eventCount: entEvents.length,
      events: entEvents,
      coSpeakers,
      totalSponsorship,
      partnershipScore,
      isKeyPartner: entEvents.length >= 2 || ent.tier === 'Strategic' || ent.tier === 'Diamond',
    };
  }).sort((a, b) => b.partnershipScore - a.partnershipScore);

  // Speaker partnership stats
  const speakerStats = speakers.map(spk => {
    const spkEvents = events.filter(ev => 
      ev.speakerIds?.includes(spk.id) || (spk.events || []).includes(ev.title)
    );
    const coEnterprises = enterprises.filter(ent => 
      spkEvents.some(ev => ev.enterpriseIds?.includes(ent.id) || (ent.events || []).includes(ev.title))
    );
    return {
      speaker: spk,
      eventCount: spkEvents.length,
      events: spkEvents,
      coEnterprises,
      rating: spk.rating || 4.8,
      isCoreSpeaker: spkEvents.length >= 2 || (spk.rating && spk.rating >= 4.8),
    };
  }).sort((a, b) => b.eventCount - a.eventCount || b.rating - a.rating);

  // Selected item details
  const activeEnterprise = selectedEntity?.type === 'enterprise' 
    ? enterprises.find(e => e.id === selectedEntity.id) 
    : null;
  const activeSpeaker = selectedEntity?.type === 'speaker' 
    ? speakers.find(s => s.id === selectedEntity.id) 
    : null;
  const activeEvent = selectedEntity?.type === 'event' 
    ? events.find(e => e.id === selectedEntity.id) 
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Mạng Lưới Kết Nối & Tần Suất Hợp Tác Đối Tác - Diễn Giả (Network Map)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
              Chiến lược Hệ sinh thái
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Trực quan hóa mức độ gắn kết, sự kiện đồng hành và nhận diện đối tác chiến lược hàng đầu
          </p>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setViewMode('network')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'network' 
                ? 'bg-white text-indigo-700 font-bold shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🕸️ Sơ đồ Mạng lưới
          </button>
          <button
            onClick={() => setViewMode('key_partners')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'key_partners' 
                ? 'bg-white text-indigo-700 font-bold shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⭐ Đối tác Chiến lược
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'matrix' 
                ? 'bg-white text-indigo-700 font-bold shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Ma trận Tương tác
          </button>
        </div>
      </div>

      {/* Mode 1: Interactive Network Visualizer */}
      {viewMode === 'network' && (
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Visual Node-Link Canvas Simulation */}
            <div className="lg:col-span-8 bg-slate-900 rounded-2xl p-5 border border-slate-800 text-white relative min-h-[380px] flex flex-col justify-between overflow-hidden">
              {/* Subtle background grid pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 pointer-events-none" />

              {/* Canvas Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300">
                    Live Collaboration Graph ({events.length} Sự kiện • {enterprises.length} Doanh nghiệp • {speakers.length} Chuyên gia)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                  Nhấp vào Node để xem mạng lưới liên kết
                </span>
              </div>

              {/* Center Interactive Nodes Representation */}
              <div className="relative z-10 py-6 my-auto">
                <div className="flex flex-col gap-6">
                  
                  {/* Events Layer (Hubs) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                      Trung tâm Sự kiện (Event Hubs)
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {events.slice(0, 5).map(ev => {
                        const isSelected = selectedEntity?.type === 'event' && selectedEntity.id === ev.id;
                        return (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEntity({ id: ev.id, type: 'event' })}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-300 shadow-lg shadow-indigo-500/40 scale-105'
                                : 'bg-slate-800/90 hover:bg-slate-800 text-indigo-200 border-slate-700 hover:border-indigo-500'
                            }`}
                          >
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="truncate max-w-[170px]">{(ev.title || 'Sự kiện').split(':')[0]}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 font-mono">
                              {(ev.speakerIds?.length || 0) + (ev.enterpriseIds?.length || 0)} kết nối
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Enterprises Layer */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Đối tác Doanh nghiệp (Enterprise Partners)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {enterprises.slice(0, 8).map(ent => {
                        const isSelected = selectedEntity?.type === 'enterprise' && selectedEntity.id === ent.id;
                        const isKey = ent.tier === 'Strategic' || ent.tier === 'Diamond';
                        return (
                          <button
                            key={ent.id}
                            onClick={() => setSelectedEntity({ id: ent.id, type: 'enterprise' })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-lg shadow-amber-500/30 scale-105'
                                : isKey
                                ? 'bg-slate-800/90 text-amber-200 border-amber-500/40 hover:border-amber-400'
                                : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                          >
                            <Building2 className="w-3 h-3 text-amber-400" />
                            <span className="truncate max-w-[130px]">{(ent.name || 'Doanh nghiệp').split('(')[0]}</span>
                            {isKey && <Award className="w-3 h-3 text-amber-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Speakers Layer */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                      Diễn giả Nòng cốt (Keynote & Panelists)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {speakers.slice(0, 8).map(spk => {
                        const isSelected = selectedEntity?.type === 'speaker' && selectedEntity.id === spk.id;
                        return (
                          <button
                            key={spk.id}
                            onClick={() => setSelectedEntity({ id: spk.id, type: 'speaker' })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                              isSelected
                                ? 'bg-purple-600 text-white font-bold border-purple-300 shadow-lg shadow-purple-500/30 scale-105'
                                : 'bg-slate-800/60 text-purple-200 border-slate-700 hover:border-purple-500'
                            }`}
                          >
                            <Mic2 className="w-3 h-3 text-purple-400" />
                            <span className="truncate max-w-[130px]">{spk.fullName}</span>
                            <span className="text-[10px] text-amber-300 font-bold">★{spk.rating || 4.8}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Canvas Footer Legend */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Sự kiện
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Doanh nghiệp
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500" /> Diễn giả
                  </span>
                </div>
                <span className="text-slate-500">Mô hình liên kết đa chiều theo thời gian thực</span>
              </div>
            </div>

            {/* Entity Quick Inspector Panel */}
            <div className="lg:col-span-4 bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Chi Tiết Liên Kết Hồ Sơ
                  </span>
                  {selectedEntity && (
                    <button
                      onClick={() => setSelectedEntity(null)}
                      className="text-[11px] text-slate-400 hover:text-slate-700 font-medium"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>

                {!selectedEntity && (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <Network className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">Chưa chọn đối tượng nào</p>
                    <p className="text-[11px]">
                      Bấm vào bất kỳ sự kiện, doanh nghiệp hoặc chuyên gia bên cạnh để xem mạng lưới tương tác.
                    </p>
                  </div>
                )}

                {/* Active Enterprise Details */}
                {activeEnterprise && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Hạng {activeEnterprise.tier}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 truncate mt-1">
                          {activeEnterprise.name}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">{activeEnterprise.industry}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Tổng tài trợ:</span>
                        <span className="font-bold text-amber-700">
                          {((activeEnterprise.sponsorshipTotal || 0) / 1000000).toLocaleString('vi-VN')} Triệu đ
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Số sự kiện đồng hành:</span>
                        <span className="font-bold text-slate-900">{activeEnterprise.events?.length || 1} chương trình</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Người liên hệ:</span>
                        <span className="font-medium text-slate-800">{activeEnterprise.contactPerson}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 block">Sự kiện đã tham gia:</span>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {(activeEnterprise.events || []).map((evTitle, idx) => (
                          <div key={idx} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="truncate">{evTitle}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Speaker Details */}
                {activeSpeaker && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <img 
                        src={activeSpeaker.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                        alt={activeSpeaker.fullName} 
                        className="w-10 h-10 rounded-xl object-cover border border-purple-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          Rating ★{activeSpeaker.rating || 4.8}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 truncate mt-1">
                          {activeSpeaker.fullName}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">{activeSpeaker.role} • {activeSpeaker.organization}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Số lần diễn thuyết:</span>
                        <span className="font-bold text-purple-700">{activeSpeaker.participationCount || 1} lần</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Mức thù lao dự kiến:</span>
                        <span className="font-medium text-slate-800">{activeSpeaker.honorariumRange || 'Thỏa thuận'}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Trạng thái:</span>
                        <span className="font-bold text-emerald-600">{activeSpeaker.status || 'Available'}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 block">Chuyên môn cốt lõi:</span>
                      <div className="flex flex-wrap gap-1">
                        {(activeSpeaker.expertise || []).map((exp, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-100">
                            {exp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Event Details */}
                {activeEvent && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          {activeEvent.type}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 truncate mt-1">
                          {activeEvent.title}
                        </h4>
                        <p className="text-xs text-slate-500">📅 {new Date(activeEvent.date).toLocaleDateString('vi-VN')} • 📍 {(activeEvent.location || 'Toàn quốc').split(',')[0]}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Quy mô khách tham dự:</span>
                        <span className="font-bold text-indigo-700">{activeEvent.attendeeCount?.toLocaleString('vi-VN')} khách</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Ngân sách dự kiến:</span>
                        <span className="font-bold text-slate-800">
                          {((activeEvent.budget || 0) / 1000000).toLocaleString('vi-VN')} Triệu đ
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Trạng thái:</span>
                        <span className="font-bold text-emerald-600">{activeEvent.status}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-200 mt-3">
                {selectedEntity && (
                  <button
                    onClick={() => {
                      if (activeEnterprise) onOpenProfile(activeEnterprise, 'enterprise');
                      else if (activeSpeaker) onOpenProfile(activeSpeaker, 'speaker');
                      else if (activeEvent) onOpenProfile(activeEvent, 'event');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>Kích Hoạt Hồ Sơ 360°</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Mode 2: Key Strategic Partners (Tier 1) */}
      {viewMode === 'key_partners' && (
        <div className="p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Danh Sách Đối Tác Chiến Lược & Tài Trợ Cấp Cao (Tier 1 Strategic Partners)
              </span>
              <span className="text-xs text-indigo-600 font-bold">
                {enterpriseStats.filter(e => e.isKeyPartner).length} đơn vị chủ chốt
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enterpriseStats.slice(0, 6).map((item) => (
                <div 
                  key={item.enterprise.id}
                  onClick={() => onOpenProfile(item.enterprise, 'enterprise')}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.enterprise.tier === 'Strategic'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : item.enterprise.tier === 'Diamond'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        Tier: {item.enterprise.tier}
                      </span>
                      <span className="text-xs font-mono font-bold text-indigo-600">
                        Score: {item.partnershipScore} pts
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {item.enterprise.name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{item.enterprise.industry}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Đóng góp tài trợ:</span>
                      <span className="font-bold text-slate-900">
                        {(item.totalSponsorship / 1000000).toLocaleString('vi-VN')} Triệu đ
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sự kiện đồng hành:</span>
                      <span className="font-bold text-indigo-600">{item.eventCount} chương trình</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Co-occurrence Interaction Matrix */}
      {viewMode === 'matrix' && (
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3 font-bold">Doanh nghiệp / Đối tác</th>
                <th className="p-3 font-bold">Hạng tài trợ</th>
                <th className="p-3 font-bold">Sự kiện tham gia</th>
                <th className="p-3 font-bold">Diễn giả cùng phiên</th>
                <th className="p-3 font-bold text-right">Tổng tài trợ</th>
                <th className="p-3 font-bold text-center">Mức độ gắn kết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enterpriseStats.slice(0, 8).map((item) => (
                <tr key={item.enterprise.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-bold text-slate-900">
                    <button 
                      onClick={() => onOpenProfile(item.enterprise, 'enterprise')}
                      className="hover:text-indigo-600 flex items-center gap-1.5"
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.enterprise.name}</span>
                    </button>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {item.enterprise.tier}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-slate-700">{item.eventCount} sự kiện</span>
                  </td>
                  <td className="p-3">
                    <div className="flex -space-x-1 overflow-hidden max-w-[160px]">
                      {(item.coSpeakers || []).slice(0, 3).map(s => (
                        <img 
                          key={s.id}
                          src={s.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                          alt={s.fullName}
                          title={s.fullName}
                          className="w-5 h-5 rounded-full ring-1 ring-white object-cover"
                        />
                      ))}
                      {(item.coSpeakers || []).length > 3 && (
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-[9px] font-bold flex items-center justify-center text-slate-700">
                          +{(item.coSpeakers || []).length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-amber-700">
                    {(item.totalSponsorship / 1000000).toLocaleString('vi-VN')}M đ
                  </td>
                  <td className="p-3 text-center">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[100px] mx-auto">
                      <div 
                        className="bg-indigo-600 h-full rounded-full" 
                        style={{ width: `${Math.min(100, item.partnershipScore)}%` }} 
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
