import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  User, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  Plus,
  Filter,
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { EventItem, OperationalPhase, OperationalTask } from '../../types';
import { getDefaultOperationalPhases, getEventTypeColor } from '../../services/schedulingService';

interface EventGanttViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onUpdateEventPhases?: (eventId: string, phases: OperationalPhase[]) => void;
}

export const EventGanttView: React.FC<EventGanttViewProps> = ({
  events = [],
  onSelectEvent,
  onUpdateEventPhases,
}) => {
  // Selected single event or "all"
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    return events.length > 0 ? events[0].id : '';
  });

  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    pre: true,
    during: true,
    post: true,
  });

  const activeEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || events[0];
  }, [events, selectedEventId]);

  const phases = useMemo(() => {
    if (!activeEvent) return [];
    if (activeEvent.operationalPhases && activeEvent.operationalPhases.length > 0) {
      return activeEvent.operationalPhases;
    }
    return getDefaultOperationalPhases(activeEvent);
  }, [activeEvent]);

  const togglePhase = (phaseKey: string) => {
    setExpandedPhases(prev => ({ ...prev, [phaseKey]: !prev[phaseKey] }));
  };

  // Phase statistics
  const phaseStats = useMemo(() => {
    return phases.map(phase => {
      const total = phase.tasks.length;
      const done = phase.tasks.filter(t => t.status === 'done' || t.progress === 100).length;
      const inProgress = phase.tasks.filter(t => t.status === 'in_progress').length;
      const avgProgress = total > 0 
        ? Math.round(phase.tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / total) 
        : 0;

      return {
        ...phase,
        totalTasks: total,
        doneTasks: done,
        inProgressTasks: inProgress,
        avgProgress,
      };
    });
  }, [phases]);

  // Overall event operational progress
  const overallProgress = useMemo(() => {
    let sum = 0;
    let count = 0;
    phases.forEach(p => {
      p.tasks.forEach(t => {
        sum += t.progress || 0;
        count++;
      });
    });
    return count > 0 ? Math.round(sum / count) : 0;
  }, [phases]);

  const handleToggleTaskStatus = (phaseKey: 'pre' | 'during' | 'post', taskId: string) => {
    if (!activeEvent || !onUpdateEventPhases) return;

    const updatedPhases = phases.map(p => {
      if (p.phaseKey === phaseKey) {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              const isDone = t.status === 'done';
              return {
                ...t,
                status: isDone ? 'in_progress' : ('done' as any),
                progress: isDone ? 50 : 100,
              };
            }
            return t;
          }),
        };
      }
      return p;
    });

    onUpdateEventPhases(activeEvent.id, updatedPhases);
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'content':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">Nội dung</span>;
      case 'tech':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Kỹ thuật & LED</span>;
      case 'logistics':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Hậu cần & Đón tiếp</span>;
      case 'media':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Truyền thông</span>;
      case 'sponsor':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Tài trợ & VIP</span>;
      case 'finance':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Tài chính</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Vận hành</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Event Switcher & Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Tiến Độ Vận Hành 3 Giai Đoạn (Gantt Operational Timeline)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị chuỗi hạng mục công việc Trước sự kiện (Pre), Trong sự kiện (D-Day) và Sau sự kiện (Post-event)
          </p>
        </div>

        {/* Event Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Chọn sự kiện:</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 max-w-xs truncate"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.date})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Event Summary Banner */}
      {activeEvent && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white uppercase">
                  {activeEvent.type}
                </span>
                <span className="text-xs font-mono text-slate-300">Mã: {activeEvent.code}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  activeEvent.status === 'Đang diễn ra' ? 'bg-emerald-500 text-white' :
                  activeEvent.status === 'Sắp diễn ra' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {activeEvent.status}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mt-1.5">{activeEvent.title}</h3>
              <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Ngày D-Day: {new Date(activeEvent.date).toLocaleDateString('vi-VN')} ({activeEvent.startTime || '08:30'} - {activeEvent.endTime || '17:30'})
                </span>
                <span>•</span>
                <span>📍 {activeEvent.venueRoom ? `${activeEvent.venueRoom}, ` : ''}{activeEvent.location}</span>
                <span>•</span>
                <span>👥 {activeEvent.attendeeCount} người</span>
              </div>
            </div>

            {/* Overall Progress Gauge */}
            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 min-w-[220px]">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-300">Tiến độ tổng thể:</span>
                <span className="text-base text-emerald-400 font-extrabold">{overallProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                <span>Khởi tạo</span>
                <span>Hoàn tất nghiệm thu</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3 Phase Cards Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {phaseStats.map((pStat, idx) => (
          <div
            key={pStat.id || idx}
            onClick={() => togglePhase(pStat.phaseKey)}
            className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
              expandedPhases[pStat.phaseKey] ? 'border-indigo-300 ring-2 ring-indigo-500/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                idx === 0 ? 'bg-indigo-100 text-indigo-700' :
                idx === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {idx + 1}
              </span>
              <span className="text-xs font-bold text-indigo-600">{pStat.avgProgress}% hoàn thành</span>
            </div>

            <h4 className="font-bold text-slate-900 text-xs mt-2.5">{pStat.name}</h4>
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{pStat.description}</p>

            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  idx === 0 ? 'bg-indigo-600' : idx === 1 ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
                style={{ width: `${pStat.avgProgress}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-500">
              <span>{pStat.doneTasks}/{pStat.totalTasks} đầu việc xong</span>
              <span className="font-semibold text-slate-700">
                {expandedPhases[pStat.phaseKey] ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gantt / Task Breakdown Table by Phase */}
      <div className="space-y-6">
        {phases.map((phase, pIdx) => {
          const isExpanded = expandedPhases[phase.phaseKey];
          return (
            <div
              key={phase.id || pIdx}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Phase Header */}
              <div
                onClick={() => togglePhase(phase.phaseKey)}
                className={`px-5 py-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
                  phase.phaseKey === 'pre' ? 'bg-indigo-50/50 hover:bg-indigo-50' :
                  phase.phaseKey === 'during' ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'bg-amber-50/50 hover:bg-amber-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{phase.name}</h3>
                    <p className="text-xs text-slate-500">{phase.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    {phase.tasks.length} Hạng mục
                  </span>
                </div>
              </div>

              {/* Task Items Table */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold">
                        <th className="py-3 px-4 w-10 text-center">Trạng thái</th>
                        <th className="py-3 px-4">Tên hạng mục công việc</th>
                        <th className="py-3 px-4">Mảng phụ trách</th>
                        <th className="py-3 px-4">Người phụ trách</th>
                        <th className="py-3 px-4">Thời gian triển khai</th>
                        <th className="py-3 px-4 w-48">Tiến độ thực hiện</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {phase.tasks.map((task) => {
                        const isDone = task.status === 'done' || task.progress === 100;
                        return (
                          <tr
                            key={task.id}
                            className={`hover:bg-slate-50/60 transition-colors ${
                              isDone ? 'bg-slate-50/30' : ''
                            }`}
                          >
                            {/* Checkbox status toggle */}
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleToggleTaskStatus(phase.phaseKey, task.id)}
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                  isDone
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                    : 'border-slate-300 hover:border-indigo-500 text-transparent'
                                }`}
                                title={isDone ? 'Bấm để đánh dấu chưa xong' : 'Bấm để đánh dấu đã hoàn thành 100%'}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </td>

                            {/* Title */}
                            <td className="py-3 px-4">
                              <span
                                className={`font-bold text-slate-900 ${
                                  isDone ? 'line-through text-slate-400' : ''
                                }`}
                              >
                                {task.title}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">{getCategoryBadge(task.category)}</td>

                            {/* Assignee */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[160px]" title={task.assignee}>
                                  {task.assignee}
                                </span>
                              </div>
                            </td>

                            {/* Timeline Date Range */}
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <span>{task.startDate}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span>{task.endDate}</span>
                              </div>
                            </td>

                            {/* Progress bar */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isDone
                                        ? 'bg-emerald-600'
                                        : task.progress > 50
                                        ? 'bg-indigo-600'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${task.progress}%` }}
                                  ></div>
                                </div>
                                <span className="font-mono font-bold text-[11px] text-slate-700 w-8 text-right">
                                  {task.progress}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
