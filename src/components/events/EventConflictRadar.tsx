import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Mic2, 
  MapPin, 
  Clock, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  Filter, 
  Wrench, 
  Check, 
  ExternalLink,
  Calendar
} from 'lucide-react';
import { EventItem, Speaker, ConflictAlert } from '../../types';
import { detectSchedulingConflicts } from '../../services/schedulingService';

interface EventConflictRadarProps {
  events: EventItem[];
  speakers: Speaker[];
  onSelectEvent: (event: EventItem) => void;
  onOpenEditEvent?: (event: EventItem) => void;
}

export const EventConflictRadar: React.FC<EventConflictRadarProps> = ({
  events = [],
  speakers = [],
  onSelectEvent,
  onOpenEditEvent,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'speaker' | 'venue' | 'equipment' | 'time'>('all');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  // Detect all real conflicts
  const allAlerts = useMemo(() => {
    return detectSchedulingConflicts(events, speakers);
  }, [events, speakers]);

  const activeAlerts = useMemo(() => {
    return allAlerts.filter(a => !resolvedIds.has(a.id));
  }, [allAlerts, resolvedIds]);

  const filteredAlerts = useMemo(() => {
    if (selectedFilter === 'all') return activeAlerts;
    return activeAlerts.filter(a => a.type === selectedFilter);
  }, [activeAlerts, selectedFilter]);

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
  const infoCount = activeAlerts.filter(a => a.severity === 'info').length;

  const handleResolveAlert = (alertId: string) => {
    setResolvedIds(prev => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
  };

  const getSeverityBadge = (severity: ConflictAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            Nghiêm trọng (Critical)
          </span>
        );
      case 'warning':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            Cảnh báo (Warning)
          </span>
        );
      case 'info':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Thông tin (Info)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">
              Radar Cảnh Báo Trùng Lịch & Xung Đột Tài Nguyên Tự Động
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống tự động quét kiểm tra chéo lịch phát biểu Diễn giả, hội trường Địa điểm và Thiết bị dùng chung
          </p>
        </div>

        {/* Filter selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                selectedFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tất cả ({activeAlerts.length})
            </button>
            <button
              onClick={() => setSelectedFilter('speaker')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                selectedFilter === 'speaker' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Diễn giả
            </button>
            <button
              onClick={() => setSelectedFilter('venue')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                selectedFilter === 'venue' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Địa điểm
            </button>
            <button
              onClick={() => setSelectedFilter('equipment')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                selectedFilter === 'equipment' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Thiết bị
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng điểm xung đột</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {activeAlerts.length}
          </div>
          <span className="text-[11px] text-slate-400">cần xem xét điều phối</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Trùng lịch nghiêm trọng</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">
            {criticalCount}
          </div>
          <span className="text-[11px] text-rose-600/80">Trùng Diễn giả / Địa điểm</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Cảnh báo tài nguyên</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">
            {warningCount}
          </div>
          <span className="text-[11px] text-amber-600/80">Trùng thiết bị & hạ tầng</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Đã giải quyết</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            {resolvedIds.size}
          </div>
          <span className="text-[11px] text-emerald-600/80">xung đột đã xử lý xong</span>
        </div>

      </div>

      {/* Conflicts List */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Lịch Trình Vận Hành Hoàn Hảo</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Không phát hiện bất kỳ xung đột nào về Diễn giả, Địa điểm tổ chức hay Thiết bị hạ tầng giữa các sự kiện trong hệ sinh thái.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs hover:shadow-md ${
                  isCritical ? 'border-rose-300 bg-rose-50/10' :
                  isWarning ? 'border-amber-300 bg-amber-50/10' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getSeverityBadge(alert.severity)}
                    <span className="font-mono text-xs font-bold text-slate-600">
                      📅 Ngày: {new Date(alert.date).toLocaleDateString('vi-VN')}
                    </span>
                    {alert.timeSlot && (
                      <span className="text-xs text-slate-500 font-mono">
                        ⏰ Khung giờ: {alert.timeSlot}
                      </span>
                    )}
                  </div>

                  {/* Resolve 1-click button */}
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đánh dấu Đã xử lý</span>
                  </button>
                </div>

                {/* Title & Detailed Narrative */}
                <div className="mt-3.5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {alert.type === 'speaker' && <Mic2 className="w-4 h-4 text-indigo-600" />}
                    {alert.type === 'venue' && <MapPin className="w-4 h-4 text-rose-600" />}
                    {alert.type === 'equipment' && <Wrench className="w-4 h-4 text-amber-600" />}
                    {alert.type === 'time' && <Clock className="w-4 h-4 text-blue-600" />}
                    <span>{alert.title}</span>
                  </h3>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                {/* Events Comparison Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5">
                  {alert.eventTitles.map((title, idx) => {
                    const evId = alert.eventIds[idx];
                    const matchedEvent = events.find(e => e.id === evId);
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="text-[10px] font-bold text-slate-400 block">SỰ KIỆN {idx + 1}:</span>
                          <span className="text-xs font-bold text-slate-900 truncate block" title={title}>
                            {title}
                          </span>
                        </div>
                        {matchedEvent && (
                          <button
                            onClick={() => onSelectEvent(matchedEvent)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 shrink-0 flex items-center gap-1"
                          >
                            <span>Xem</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* AI Smart Resolution Suggestion */}
                <div className="mt-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-indigo-950">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-indigo-900 font-bold">Giải pháp tối ưu đề xuất:</strong>{' '}
                    <span>{alert.resolutionSuggestion}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
