import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  ExternalLink,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { EventItem, Speaker } from '../../types';
import { getEventTypeColor } from '../../services/schedulingService';

interface EventCalendarViewProps {
  events: EventItem[];
  speakers: Speaker[];
  onSelectEvent: (event: EventItem) => void;
  onOpenCreate: () => void;
}

type CalendarSubView = 'month' | 'week' | 'day';

export const EventCalendarView: React.FC<EventCalendarViewProps> = ({
  events = [],
  speakers = [],
  onSelectEvent,
  onOpenCreate,
}) => {
  // Current viewing date anchor (defaults to current date or closest event date)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Look for nearest upcoming or current event, or use now
    if (events.length > 0) {
      const firstValid = events.find(e => e.date);
      if (firstValid) {
        const d = new Date(firstValid.date);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return new Date();
  });

  const [calendarView, setCalendarView] = useState<CalendarSubView>('month');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const speakerMap = useMemo(() => {
    const map = new Map<string, Speaker>();
    speakers.forEach(s => map.set(s.id, s));
    return map;
  }, [speakers]);

  // Filter events by type
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (selectedTypeFilter !== 'all' && ev.type !== selectedTypeFilter) return false;
      return true;
    });
  }, [events, selectedTypeFilter]);

  // Year & Month calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const daysOfWeek = ['T2 (Hai)', 'T3 (Ba)', 'T4 (Tư)', 'T5 (Năm)', 'T6 (Sáu)', 'T7 (Bảy)', 'CN (Chủ Nhật)'];

  // Month grid generator
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday = 1, Sunday = 0 -> adjust so Monday is first (index 0)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: EventItem[];
    }> = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    // Prev month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dNum);
      const dStr = prevDate.toISOString().slice(0, 10);
      days.push({
        dateStr: dStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        events: filteredEvents.filter(e => e.date && e.date.slice(0, 10) === dStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const dStr = curDate.toISOString().slice(0, 10);
      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        events: filteredEvents.filter(e => e.date && e.date.slice(0, 10) === dStr),
      });
    }

    // Next month filling days to complete 35 or 42 grid slots
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remainingSlots = totalSlots - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dStr = nextDate.toISOString().slice(0, 10);
      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        events: filteredEvents.filter(e => e.date && e.date.slice(0, 10) === dStr),
      });
    }

    return days;
  }, [year, month, filteredEvents]);

  // Week View calculation
  const weekDays = useMemo(() => {
    const cur = new Date(currentDate);
    const dayOfWeek = cur.getDay(); // 0 is Sunday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(cur);
    monday.setDate(cur.getDate() + distanceToMonday);

    const days: Array<{
      date: Date;
      dateStr: string;
      dayName: string;
      dayNumber: number;
      isToday: boolean;
      events: EventItem[];
    }> = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().slice(0, 10);
      days.push({
        date: d,
        dateStr: dStr,
        dayName: daysOfWeek[i],
        dayNumber: d.getDate(),
        isToday: dStr === todayStr,
        events: filteredEvents.filter(e => e.date && e.date.slice(0, 10) === dStr),
      });
    }
    return days;
  }, [currentDate, filteredEvents]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (calendarView === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (calendarView === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (calendarView === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (calendarView === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Day hours for Week & Day views (07:00 to 20:00)
  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  return (
    <div className="space-y-4">
      
      {/* Calendar Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Navigation & Current Date Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition-all"
              title="Lùi lại"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-xs rounded-lg transition-all"
            >
              Hôm nay
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition-all"
              title="Tiến tới"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              <span>
                {calendarView === 'month' && `${monthNames[month]} năm ${year}`}
                {calendarView === 'week' && `Tuần ${weekDays[0]?.dayNumber}/${weekDays[0]?.date.getMonth() + 1} - ${weekDays[6]?.dayNumber}/${weekDays[6]?.date.getMonth() + 1}/${year}`}
                {calendarView === 'day' && `${currentDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Tổng cộng {filteredEvents.length} sự kiện trong hệ thống
            </p>
          </div>
        </div>

        {/* Right: View mode selector & Type filter */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">Tất cả loại hình</option>
              <option value="Hội thảo">Hội thảo</option>
              <option value="Diễn đàn Tech">Diễn đàn Tech</option>
              <option value="Khóa đào tạo">Khóa đào tạo</option>
              <option value="Pitching Day">Pitching Day</option>
              <option value="Triển lãm">Triển lãm</option>
              <option value="Networking">Networking</option>
            </select>
          </div>

          {/* Subview Mode Switcher: Month / Week / Day */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                calendarView === 'month'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                calendarView === 'week'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                calendarView === 'day'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ngày
            </button>
          </div>

        </div>

      </div>

      {/* Color Coding Legend Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 overflow-x-auto text-xs">
        <span className="font-bold text-slate-500 shrink-0">Mã màu phân loại:</span>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
            <span className="text-slate-700 font-medium">Hội thảo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span>
            <span className="text-slate-700 font-medium">Diễn đàn Tech</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
            <span className="text-slate-700 font-medium">Khóa đào tạo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-600"></span>
            <span className="text-slate-700 font-medium">Pitching Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600"></span>
            <span className="text-slate-700 font-medium">Triển lãm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600"></span>
            <span className="text-slate-700 font-medium">Networking</span>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: MONTH GRID VIEW */}
      {calendarView === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700 py-3">
            {daysOfWeek.map((dayName, idx) => (
              <div key={idx} className={idx >= 5 ? 'text-amber-700' : ''}>
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[580px]">
            {monthDays.map((dayItem, index) => {
              return (
                <div
                  key={index}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                    !dayItem.isCurrentMonth
                      ? 'bg-slate-50/60 text-slate-400'
                      : 'bg-white text-slate-800'
                  } ${dayItem.isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/20' : 'hover:bg-slate-50/80'}`}
                >
                  
                  {/* Top Day Number & Status */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        dayItem.isToday
                          ? 'bg-indigo-600 text-white'
                          : dayItem.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayItem.dayNumber}
                    </span>

                    {dayItem.events.length > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {dayItem.events.length} sự kiện
                      </span>
                    )}
                  </div>

                  {/* Events list in this day */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[130px] no-scrollbar">
                    {dayItem.events.map((ev) => {
                      const colorInfo = getEventTypeColor(ev.type);
                      const isLive = ev.status === 'Đang diễn ra';

                      return (
                        <div
                          key={ev.id}
                          onClick={() => onSelectEvent(ev)}
                          className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${colorInfo.bg} ${colorInfo.border} hover:shadow-md group`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[9px] font-extrabold uppercase px-1 rounded ${colorInfo.badge}`}>
                              {ev.type}
                            </span>
                            {isLive ? (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                LIVE
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-500">
                                {ev.startTime || '08:30'}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] font-bold text-slate-900 line-clamp-2 mt-1 leading-tight group-hover:text-indigo-600 transition-colors">
                            {ev.title}
                          </p>

                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                            <span className="truncate max-w-[90px]" title={ev.venueRoom || ev.location}>
                              📍 {ev.venueRoom || ev.location}
                            </span>
                            <span className="font-semibold text-slate-700">
                              👥 {ev.attendeeCount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {dayItem.events.length === 0 && dayItem.isCurrentMonth && (
                    <div className="h-4"></div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* VIEW MODE 2: WEEK VIEW */}
      {calendarView === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          <div className="min-w-[800px]">
            
            {/* Week Header */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
              <div className="p-3 text-center border-r border-slate-200 text-slate-400">
                Khung Giờ
              </div>
              {weekDays.map((wDay, idx) => (
                <div
                  key={idx}
                  className={`p-3 text-center border-r border-slate-100 ${
                    wDay.isToday ? 'bg-indigo-50 text-indigo-700 font-extrabold' : ''
                  }`}
                >
                  <div>{wDay.dayName}</div>
                  <div className="text-base font-extrabold mt-0.5">{wDay.dayNumber}</div>
                </div>
              ))}
            </div>

            {/* Time Rows */}
            <div className="divide-y divide-slate-100">
              {hours.map((hour, hIdx) => (
                <div key={hIdx} className="grid grid-cols-8 min-h-[70px]">
                  
                  {/* Time label */}
                  <div className="p-2 text-center text-xs font-mono font-semibold text-slate-400 border-r border-slate-200 bg-slate-50/50 flex items-center justify-center">
                    {hour}
                  </div>

                  {/* 7 Days cells */}
                  {weekDays.map((wDay, dIdx) => {
                    const cellEvents = wDay.events.filter(e => {
                      const startH = e.startTime ? e.startTime.slice(0, 2) : '08';
                      return startH === hour.slice(0, 2);
                    });

                    return (
                      <div
                        key={dIdx}
                        className={`p-1.5 border-r border-slate-100 transition-colors ${
                          wDay.isToday ? 'bg-indigo-50/15' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {cellEvents.map((ev) => {
                          const colorInfo = getEventTypeColor(ev.type);
                          return (
                            <div
                              key={ev.id}
                              onClick={() => onSelectEvent(ev)}
                              className={`p-2 rounded-xl border text-xs cursor-pointer ${colorInfo.bg} ${colorInfo.border} hover:shadow-md transition-all`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-bold px-1 rounded ${colorInfo.badge}`}>
                                  {ev.type}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {ev.startTime} - {ev.endTime}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 mt-1 line-clamp-1">
                                {ev.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 truncate">
                                📍 {ev.venueRoom || ev.location}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* VIEW MODE 3: DAY VIEW */}
      {calendarView === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Lịch trình chi tiết ngày: {currentDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi điều hành khung giờ thực tế cho các phiên sự kiện
              </p>
            </div>
            <button
              onClick={onOpenCreate}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
            >
              + Tạo Sự kiện Trong Ngày
            </button>
          </div>

          {/* List events on current date */}
          {(() => {
            const dateStr = currentDate.toISOString().slice(0, 10);
            const dayEvents = filteredEvents.filter(e => e.date && e.date.slice(0, 10) === dateStr);

            if (dayEvents.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400">
                  <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-sm text-slate-600">Không có sự kiện nào trong ngày này</p>
                  <p className="text-xs text-slate-400 mt-1">Chọn ngày khác trên thanh điều hướng hoặc tạo sự kiện mới.</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {dayEvents.map((ev) => {
                  const colorInfo = getEventTypeColor(ev.type);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className={`p-5 rounded-2xl border ${colorInfo.bg} ${colorInfo.border} hover:shadow-md transition-all cursor-pointer`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1.5 rounded-xl font-bold text-xs ${colorInfo.badge}`}>
                            {ev.type}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                              {ev.title}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Mã: <span className="font-mono font-bold text-indigo-700">{ev.code}</span> • Chủ đề: {ev.theme}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            ev.status === 'Đang diễn ra' ? 'bg-emerald-100 text-emerald-800' :
                            ev.status === 'Sắp diễn ra' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {ev.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-700">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          <span>Thời gian: <strong>{ev.startTime || '08:30'} - {ev.endTime || '17:30'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-indigo-600" />
                          <span className="truncate">Địa điểm: <strong>{ev.venueRoom ? `${ev.venueRoom}, ` : ''}{ev.location}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span>Dự kiến: <strong>{ev.attendeeCount} người tham dự</strong></span>
                        </div>
                      </div>

                      {/* Rundown Preview */}
                      {ev.rundown && ev.rundown.length > 0 && (
                        <div className="mt-4 bg-white/80 p-3 rounded-xl border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            Kịch bản Timeline ({ev.rundown.length} phiên):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {ev.rundown.slice(0, 4).map((slot, sIdx) => (
                              <div key={sIdx} className="text-xs flex items-center gap-2 text-slate-700">
                                <span className="font-mono font-bold text-indigo-600 shrink-0">
                                  {slot.timeStart}
                                </span>
                                <span className="truncate font-medium">{slot.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
};
