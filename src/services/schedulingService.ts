import { EventItem, Speaker, AgendaSlot, OperationalPhase, ConflictAlert } from '../types';

/**
 * Tự động tính toán trạng thái sự kiện theo thời gian thực (Real-time Date Comparison):
 * - Đã qua thời gian tổ chức -> "Đã kết thúc"
 * - Ngày tổ chức là hôm nay -> "Đang diễn ra"
 * - Chưa tới ngày tổ chức -> "Sắp diễn ra"
 */
export function computeEventStatus(
  dateStr?: string,
  endDateStr?: string
): 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã kết thúc' {
  if (!dateStr || typeof dateStr !== 'string') return 'Sắp diễn ra';

  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = String(now.getMonth() + 1).padStart(2, '0');
  const todayD = String(now.getDate()).padStart(2, '0');
  const todayStr = `${todayY}-${todayM}-${todayD}`;

  const cleanStart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim().slice(0, 10);
  const cleanEnd = endDateStr && typeof endDateStr === 'string'
    ? endDateStr.includes('T')
      ? endDateStr.split('T')[0]
      : endDateStr.trim().slice(0, 10)
    : cleanStart;

  if (cleanEnd < todayStr) {
    return 'Đã kết thúc';
  } else if (cleanStart <= todayStr && todayStr <= cleanEnd) {
    return 'Đang diễn ra';
  } else {
    return 'Sắp diễn ra';
  }
}

/**
 * Cung cấp mã màu nhận diện thương hiệu chuẩn theo loại hình sự kiện
 */
export function getEventTypeColor(type?: string): {
  bg: string;
  text: string;
  border: string;
  badge: string;
  hex: string;
  pill: string;
} {
  switch (type) {
    case 'Hội thảo':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        badge: 'bg-indigo-600 text-white',
        hex: '#4F46E5',
        pill: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      };
    case 'Diễn đàn Tech':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        badge: 'bg-blue-600 text-white',
        hex: '#2563EB',
        pill: 'bg-blue-100 text-blue-800 border-blue-200',
      };
    case 'Khóa đào tạo':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        badge: 'bg-emerald-600 text-white',
        hex: '#059669',
        pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    case 'Pitching Day':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        badge: 'bg-amber-600 text-white',
        hex: '#D97706',
        pill: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    case 'Triển lãm':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        badge: 'bg-purple-600 text-white',
        hex: '#7C3AED',
        pill: 'bg-purple-100 text-purple-800 border-purple-200',
      };
    case 'Networking':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        badge: 'bg-rose-600 text-white',
        hex: '#E11D48',
        pill: 'bg-rose-100 text-rose-800 border-rose-200',
      };
    default:
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        border: 'border-teal-200',
        badge: 'bg-teal-600 text-white',
        hex: '#0D9488',
        pill: 'bg-teal-100 text-teal-800 border-teal-200',
      };
  }
}

/**
 * Tự động quét và phát hiện xung đột lịch trình và tài nguyên (Smart Conflict Detection):
 * 1. Speaker Overlap: Cùng diễn giả phát biểu ở 2 sự kiện cùng ngày/khung giờ.
 * 2. Venue Overlap: Cùng địa điểm hoặc cùng phòng hội nghị bị trùng lịch.
 * 3. Equipment Overlap: Thiết bị quan trọng bị gán đồng thời.
 */
export function detectSchedulingConflicts(
  events: EventItem[],
  speakers: Speaker[]
): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];
  const speakerMap = new Map<string, Speaker>();
  speakers.forEach((s) => speakerMap.set(s.id, s));

  // 1. Quét Speaker Overlap giữa các sự kiện
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const e1 = events[i];
      const e2 = events[j];

      // Nếu cùng ngày tổ chức
      const date1 = (e1.date && typeof e1.date === 'string' ? e1.date.slice(0, 10) : '');
      const date2 = (e2.date && typeof e2.date === 'string' ? e2.date.slice(0, 10) : '');

      if (date1 && date2 && date1 === date2) {
        // Kiểm tra Diễn giả chung
        const commonSpeakers = (e1.speakerIds || []).filter((spkId) =>
          (e2.speakerIds || []).includes(spkId)
        );

        commonSpeakers.forEach((spkId) => {
          const spk = speakerMap.get(spkId);
          const spkName = spk ? spk.fullName : `Chuyên gia #${spkId}`;

          alerts.push({
            id: `conflict-spk-${e1.id}-${e2.id}-${spkId}`,
            type: 'speaker',
            severity: 'critical',
            title: `Trùng lịch Diễn giả: ${spkName}`,
            description: `Diễn giả "${spkName}" đang được gán lịch trình đồng thời tại 2 sự kiện trong cùng ngày (${new Date(date1).toLocaleDateString('vi-VN')}): "${e1.title}" và "${e2.title}".`,
            eventIds: [e1.id, e2.id],
            eventTitles: [e1.title, e2.title],
            involvedEntityName: spkName,
            date: date1,
            timeSlot: `${e1.startTime || '08:30'} - ${e1.endTime || '17:30'}`,
            resolutionSuggestion: `Đề xuất: Tách lệch khung giờ phát biểu (ví dụ e1 sáng, e2 chiều), gán diễn giả dự phòng hoặc chuyển sang hình thức Tele-Keynote trực tuyến (Online).`,
          });
        });

        // Kiểm tra Xung đột Địa điểm (Venue Overlap)
        if (
          e1.location &&
          e2.location &&
          e1.location.trim().toLowerCase() === e2.location.trim().toLowerCase()
        ) {
          const room1 = (e1.venueRoom || '').trim().toLowerCase();
          const room2 = (e2.venueRoom || '').trim().toLowerCase();

          // Trùng cùng phòng hoặc không chỉ định phòng riêng
          if (!room1 || !room2 || room1 === room2) {
            alerts.push({
              id: `conflict-venue-${e1.id}-${e2.id}`,
              type: 'venue',
              severity: 'critical',
              title: `Xung đột Địa điểm tổ chức: ${e1.location}`,
              description: `Hai sự kiện "${e1.title}" và "${e2.title}" cùng được xếp lịch tại cùng một địa điểm "${e1.location}" ${e1.venueRoom ? `(${e1.venueRoom})` : ''} vào ngày ${new Date(date1).toLocaleDateString('vi-VN')}.`,
              eventIds: [e1.id, e2.id],
              eventTitles: [e1.title, e2.title],
              involvedEntityName: e1.location,
              date: date1,
              resolutionSuggestion: `Đề xuất: Đổi hội trường sang sảnh tiệc phụ hoặc dời lịch một trong hai sự kiện sang ngày khác.`,
            });
          }
        }

        // Kiểm tra Xung đột Thiết bị đặc biệt (Equipment Overlap)
        const eq1 = e1.equipment || [];
        const eq2 = e2.equipment || [];
        const commonEq = eq1.filter((item) => eq2.includes(item));
        if (commonEq.length > 0) {
          alerts.push({
            id: `conflict-eq-${e1.id}-${e2.id}`,
            type: 'equipment',
            severity: 'warning',
            title: `Xung đột Thiết bị & Hạ tầng: ${commonEq.join(', ')}`,
            description: `Cả hai sự kiện đều yêu cầu cùng tài nguyên thiết bị giới hạn "${commonEq.join(', ')}" vào ngày ${new Date(date1).toLocaleDateString('vi-VN')}.`,
            eventIds: [e1.id, e2.id],
            eventTitles: [e1.title, e2.title],
            involvedEntityName: commonEq.join(', '),
            date: date1,
            resolutionSuggestion: `Đề xuất: Thuê thêm đơn vị âm thanh ánh sáng dự phòng (Sub-contractor) hoặc sắp xếp dùng chung hạ tầng.`,
          });
        }
      }
    }
  }

  // 2. Quét Xung đột trong chính Agenda Slots của từng sự kiện (Internal Agenda Overlap)
  events.forEach((ev) => {
    const slots = ev.rundown || [];
    for (let s1 = 0; s1 < slots.length; s1++) {
      for (let s2 = s1 + 1; s2 < slots.length; s2++) {
        const slotA = slots[s1];
        const slotB = slots[s2];
        // Nếu trùng thời gian bắt đầu hoặc đè lên nhau
        if (slotA.timeStart && slotB.timeStart && slotA.timeStart === slotB.timeStart) {
          alerts.push({
            id: `conflict-slot-${ev.id}-${slotA.id}-${slotB.id}`,
            type: 'time',
            severity: 'info',
            title: `Trùng giờ phiên Agenda: ${slotA.title} & ${slotB.title}`,
            description: `Trong sự kiện "${ev.title}", hai phiên "${slotA.title}" và "${slotB.title}" đang được cấu hình cùng lúc lúc ${slotA.timeStart}.`,
            eventIds: [ev.id],
            eventTitles: [ev.title],
            involvedEntityName: `${slotA.timeStart} Slot`,
            date: (ev.date && typeof ev.date === 'string' ? ev.date.slice(0, 10) : '2026-09-15'),
            resolutionSuggestion: `Kiểm tra nếu đây là 2 phiên Breakout Track song song, hoặc điều chỉnh lại thứ tự thời gian.`,
          });
        }
      }
    }
  });

  return alerts;
}

/**
 * Tạo link 1-Click đồng bộ trực tiếp sang Google Calendar
 */
export function generateGoogleCalendarUrl(ev: EventItem, speakers?: Speaker[]): string {
  const title = encodeURIComponent(`[Event] ${ev.title || 'Sự kiện'}`);
  
  // Format speaker line-up text
  let speakerListText = '';
  if (speakers && ev.speakerIds && ev.speakerIds.length > 0) {
    const matched = speakers.filter((s) => ev.speakerIds.includes(s.id));
    if (matched.length > 0) {
      speakerListText = `\n\n🎙️ DIỄN GIẢ & CHUYÊN GIA:\n` + matched.map((s) => `• ${s.fullName} (${s.role} - ${s.organization})`).join('\n');
    }
  }

  const meetText = ev.meetUrl ? `\n\n🔗 LINK HỌP TRỰC TUYẾN / GOOGLE MEET: ${ev.meetUrl}` : '';
  const venueText = ev.venueRoom ? `\n📍 Phòng/Hội trường: ${ev.venueRoom}` : '';

  const details = encodeURIComponent(
    `${ev.description || ''}\n\nChủ đề: ${ev.theme || ''}\nMã sự kiện: ${ev.code || 'EVT'}${venueText}${meetText}${speakerListText}\n\nĐược điều phối tự động bởi EventData Hub.`
  );

  const location = encodeURIComponent(
    ev.venueRoom ? `${ev.venueRoom}, ${ev.location || 'Việt Nam'}` : ev.location || 'Việt Nam'
  );

  // Xử lý ngày & giờ format Google Calendar: YYYYMMDDTHHmmssZ
  let startClean = String(ev.date || '20260915').replace(/[^0-9]/g, '');
  if (startClean.length < 8) startClean = '20260915';
  else startClean = startClean.substring(0, 8);

  const startHour = String(ev.startTime || '08:30').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);
  const endHour = String(ev.endTime || '17:30').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);

  const startDateStr = `${startClean}T${startHour}00`;
  const endDateStr = `${startClean}T${endHour}00`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}&location=${location}`;
}

/**
 * Tạo nội dung file tiêu chuẩn iCalendar (.ics) RFC 5545
 */
export function generateIcsContent(items: EventItem | EventItem[]): string {
  const eventsList = Array.isArray(items) ? items : [items];

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventData Hub Vietnam//Event Scheduling Engine v2.0//VN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Lịch Trình Sự Kiện EventData Hub',
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
  ];

  const body = eventsList.map((ev) => {
    let startClean = String(ev.date || '20260915').replace(/[^0-9]/g, '');
    if (startClean.length < 8) startClean = '20260915';
    else startClean = startClean.substring(0, 8);

    const startHour = String(ev.startTime || '08:30').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);
    const endHour = String(ev.endTime || '17:30').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);

    const dtStart = `${startClean}T${startHour}00`;
    const dtEnd = `${startClean}T${endHour}00`;

    const summary = (ev.title || 'Sự kiện').replace(/\n/g, ' ');
    const desc = `${ev.description || ''} | Chủ đề: ${ev.theme || ''} | Mã: ${ev.code || 'EVT'}${ev.meetUrl ? ` | Online Meet: ${ev.meetUrl}` : ''}`
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,');
    const loc = `${ev.venueRoom ? `${ev.venueRoom}, ` : ''}${ev.location || 'Việt Nam'}`
      .replace(/\n/g, ' ')
      .replace(/,/g, '\\,');

    return [
      'BEGIN:VEVENT',
      `UID:${ev.id}-${Date.now()}@eventdatahub.vn`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${loc}`,
      `STATUS:CONFIRMED`,
      ev.meetUrl ? `URL:${ev.meetUrl}` : '',
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n');
  });

  const footer = ['END:VCALENDAR'];

  return [...header, ...body, ...footer].join('\r\n');
}

/**
 * Tải trực tiếp file .ics xuống trình duyệt
 */
export function downloadIcsFile(items: EventItem | EventItem[], customFilename?: string): void {
  const content = generateIcsContent(items);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  let filename = customFilename;
  if (!filename) {
    if (Array.isArray(items)) {
      filename = `Lich_Trinh_Su_Kien_${new Date().toISOString().slice(0, 10)}.ics`;
    } else {
      filename = `${items.code || 'Su_Kien'}_Lich_Trinh.ics`;
    }
  }

  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Khởi tạo dữ liệu mẫu kịch bản chi tiết (Rundown) nếu sự kiện chưa có
 */
export function getDefaultRundown(event: Partial<EventItem>, speakers: Speaker[]): AgendaSlot[] {
  const spkIds = event.speakerIds || [];
  const spk1 = speakers.find((s) => s.id === spkIds[0]);
  const spk2 = speakers.find((s) => s.id === spkIds[1]);

  return [
    {
      id: `slot-1-${event.id || 'def'}`,
      timeStart: '08:00',
      timeEnd: '08:45',
      title: 'Đón tiếp Khách mời & Check-in QR / Networking Coffee',
      type: 'checkin',
      locationRoom: event.venueRoom || 'Sảnh đón tiếp & Foyer',
      description: 'Khách mời quét mã QR qua ứng dụng EventData Hub nhận thẻ VIP Pass, dùng teabreak và kết nối tự do.',
      techNotes: 'Nhạc nền Background Music 40dB, 4 máy quét QR, Banner Led hiển thị Welcome.',
      status: 'completed',
    },
    {
      id: `slot-2-${event.id || 'def'}`,
      timeStart: '08:45',
      timeEnd: '09:00',
      title: 'Khai mạc Sự kiện & Phát biểu Chào mừng của Ban Tổ Chức',
      type: 'keynote',
      locationRoom: event.venueRoom || 'Hội trường chính',
      description: 'Tuyên bố lý do, giới thiệu Đại biểu danh dự và Nhà tài trợ Kim Cương.',
      techNotes: 'Micro không dây x2, Video Trailer 3 phút, Hiệu ứng ánh sáng Spotlight.',
      status: 'completed',
    },
    {
      id: `slot-3-${event.id || 'def'}`,
      timeStart: '09:00',
      timeEnd: '09:45',
      title: `Phiên Toàn thể: ${event.theme || 'Báo cáo Xu hướng Đột phá'}`,
      type: 'keynote',
      speakerIds: spk1 ? [spk1.id] : [],
      speakerNames: spk1 ? [spk1.fullName] : ['Diễn giả Chính'],
      locationRoom: event.venueRoom || 'Hội trường chính',
      description: `Báo cáo nghiên cứu chiến lược chuyên sâu trình bày bởi ${spk1 ? spk1.fullName : 'chuyên gia nòng cốt'}.`,
      techNotes: 'Màn hình LED chính tỷ lệ 16:9, Bộ chuyển slide không dây, Micro cài áo.',
      status: 'in_progress',
    },
    {
      id: `slot-4-${event.id || 'def'}`,
      timeStart: '09:45',
      timeEnd: '10:45',
      title: 'Tọa đàm Chuyên gia (Panel Discussion): Cơ hội & Thách thức',
      type: 'panel',
      speakerIds: spkIds.slice(0, 3),
      speakerNames: spkIds.slice(0, 3).map((id) => speakers.find((s) => s.id === id)?.fullName || id),
      moderatorName: spk2 ? spk2.fullName : 'Chuyên gia Điều phối',
      locationRoom: event.venueRoom || 'Hội trường chính',
      description: 'Đối thoại trực tiếp giữa Lãnh đạo Cơ quan ban ngành, Doanh nghiệp và Chuyên gia công nghệ.',
      techNotes: 'Bố trí 5 ghế Sofa, 5 Micro không dây, Màn hình phụ hiển thị Slido Q&A.',
      status: 'pending',
    },
    {
      id: `slot-5-${event.id || 'def'}`,
      timeStart: '10:45',
      timeEnd: '11:15',
      title: 'Lễ Ký kết Thỏa thuận Hợp tác Chiến lược (MOU Signing)',
      type: 'signing',
      locationRoom: event.venueRoom || 'Hội trường chính',
      description: 'Ký kết hợp tác mở rộng mạng lưới kinh doanh giữa các Tập đoàn và Doanh nghiệp đối tác.',
      techNotes: 'Bàn ký kết phủ khăn nhung, bút ký cao cấp, Nhạc chúc mừng Fanfare.',
      status: 'pending',
    },
    {
      id: `slot-6-${event.id || 'def'}`,
      timeStart: '11:15',
      timeEnd: '11:45',
      title: 'Hỏi đáp Mở (Q&A Session) & Tổng kết Bế mạc',
      type: 'closing',
      locationRoom: event.venueRoom || 'Hội trường chính',
      description: 'Trả lời câu hỏi từ hội trường và nền tảng trực tuyến, trao kỷ niệm chương cho Diễn giả.',
      techNotes: '2 Micro chạy cánh, hoa tươi và quà tặng lưu niệm.',
      status: 'pending',
    },
    {
      id: `slot-7-${event.id || 'def'}`,
      timeStart: '11:45',
      timeEnd: '13:30',
      title: 'Tiệc Trưa Kết nối Doanh nghiệp (VIP Networking Lunch)',
      type: 'networking',
      locationRoom: 'Khu vực Ballroom Dining',
      description: 'Giao lưu tiệc buffet trưa dành cho Diễn giả, Nhà tài trợ và Khách mời VIP Pass.',
      techNotes: 'Nhạc Acoustic nhẹ nhàng, standee giới thiệu đơn vị tài trợ.',
      status: 'pending',
    },
  ];
}

/**
 * Khởi tạo dữ liệu mẫu 3 giai đoạn vận hành (Pre - During - Post Gantt Phases)
 */
export function getDefaultOperationalPhases(event: Partial<EventItem>): OperationalPhase[] {
  const evDate = event.date ? event.date.slice(0, 10) : '2026-09-15';
  const baseD = new Date(evDate);

  // Pre-event (D-30 to D-1)
  const dMinus30 = new Date(baseD);
  dMinus30.setDate(baseD.getDate() - 30);
  const dMinus25 = new Date(baseD);
  dMinus25.setDate(baseD.getDate() - 25);
  const dMinus15 = new Date(baseD);
  dMinus15.setDate(baseD.getDate() - 15);
  const dMinus10 = new Date(baseD);
  dMinus10.setDate(baseD.getDate() - 10);
  const dMinus5 = new Date(baseD);
  dMinus5.setDate(baseD.getDate() - 5);
  const dMinus1 = new Date(baseD);
  dMinus1.setDate(baseD.getDate() - 1);

  // Post-event (D+1 to D+7)
  const dPlus1 = new Date(baseD);
  dPlus1.setDate(baseD.getDate() + 1);
  const dPlus3 = new Date(baseD);
  dPlus3.setDate(baseD.getDate() + 3);
  const dPlus5 = new Date(baseD);
  dPlus5.setDate(baseD.getDate() + 5);
  const dPlus7 = new Date(baseD);
  dPlus7.setDate(baseD.getDate() + 7);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return [
    {
      id: `phase-pre-${event.id || 'def'}`,
      phaseKey: 'pre',
      name: '1. Giai đoạn Trước Sự Kiện (Pre-event Preparation)',
      description: 'Chuẩn bị kịch bản nội dung, chốt diễn giả, tài trợ, truyền thông và tổng duyệt kỹ thuật sân khấu.',
      tasks: [
        {
          id: `task-pre-1-${event.id}`,
          title: 'Xây dựng Concept, Chủ đề & Khung chương trình chi tiết',
          phase: 'pre',
          startDate: fmt(dMinus30),
          endDate: fmt(dMinus15),
          progress: 100,
          status: 'done',
          assignee: 'Trần Hồng Quân (Ban Nội dung)',
          category: 'content',
        },
        {
          id: `task-pre-2-${event.id}`,
          title: 'Gửi thư mời & Ký thỏa thuận tham gia Diễn giả / Chuyên gia',
          phase: 'pre',
          startDate: fmt(dMinus25),
          endDate: fmt(dMinus10),
          progress: 100,
          status: 'done',
          assignee: 'Phạm Minh Hằng (Ban Đối ngoại)',
          category: 'sponsor',
        },
        {
          id: `task-pre-3-${event.id}`,
          title: 'Thiết kế bộ nhận diện thương hiệu, Backdrop, Standee & Slide Master',
          phase: 'pre',
          startDate: fmt(dMinus15),
          endDate: fmt(dMinus5),
          progress: 90,
          status: 'in_progress',
          assignee: 'ThS. Hoàng Bích Ngọc (Lead Design)',
          category: 'media',
        },
        {
          id: `task-pre-4-${event.id}`,
          title: 'Setup & Khảo sát kỹ thuật âm thanh, ánh sáng, màn hình LED tại địa điểm',
          phase: 'pre',
          startDate: fmt(dMinus5),
          endDate: fmt(dMinus1),
          progress: 80,
          status: 'in_progress',
          assignee: 'Nguyễn Thành Nam (Ban Kỹ thuật)',
          category: 'tech',
        },
      ],
    },
    {
      id: `phase-during-${event.id || 'def'}`,
      phaseKey: 'during',
      name: '2. Giai đoạn Trong Sự Kiện (D-Day Execution)',
      description: 'Điều phối vận hành ngày D-Day, đón tiếp VIP, điều hành phiên toàn thể, panel và kiểm soát kịch bản.',
      tasks: [
        {
          id: `task-dur-1-${event.id}`,
          title: 'Đón tiếp đại biểu VIP, Quét mã QR Check-in & Phát thẻ đeo',
          phase: 'during',
          startDate: fmt(baseD),
          endDate: fmt(baseD),
          progress: 100,
          status: 'done',
          assignee: 'Lê Thu Trang (Trưởng ban Đón tiếp)',
          category: 'logistics',
        },
        {
          id: `task-dur-2-${event.id}`,
          title: 'Điều phối sân khấu chính, MC, Micro, Slide Trình chiếu và Livestream',
          phase: 'during',
          startDate: fmt(baseD),
          endDate: fmt(baseD),
          progress: 75,
          status: 'in_progress',
          assignee: 'Vũ Đức Minh (Stage Director)',
          category: 'tech',
        },
        {
          id: `task-dur-3-${event.id}`,
          title: 'Vận hành tiệc Networking Lunch & Hỗ trợ phòng tiếp khách riêng VIP',
          phase: 'during',
          startDate: fmt(baseD),
          endDate: fmt(baseD),
          progress: 50,
          status: 'in_progress',
          assignee: 'Nguyễn Phương Anh (Ban Hậu cần)',
          category: 'logistics',
        },
      ],
    },
    {
      id: `phase-post-${event.id || 'def'}`,
      phaseKey: 'post',
      name: '3. Giai đoạn Sau Sự Kiện (Post-event Follow-up)',
      description: 'Khảo sát CSAT, thanh quyết toán thù lao đối tác, gửi thư cảm ơn và báo cáo tổng kết ROI.',
      tasks: [
        {
          id: `task-post-1-${event.id}`,
          title: 'Gửi Email cảm ơn kèm link tài liệu thuyết trình & Slide Deck cho Khách mời',
          phase: 'post',
          startDate: fmt(dPlus1),
          endDate: fmt(dPlus3),
          progress: 25,
          status: 'todo',
          assignee: 'Ban Truyền thông & Khách mời',
          category: 'media',
        },
        {
          id: `task-post-2-${event.id}`,
          title: 'Tổng hợp phản hồi CSAT, Đánh giá chất lượng Diễn giả & Thống kê số liệu',
          phase: 'post',
          startDate: fmt(dPlus1),
          endDate: fmt(dPlus5),
          progress: 10,
          status: 'todo',
          assignee: 'Data Specialist',
          category: 'content',
        },
        {
          id: `task-post-3-${event.id}`,
          title: 'Nghiệm thu hợp đồng tài trợ, thanh toán thù lao Diễn giả & Quyết toán chi phí',
          phase: 'post',
          startDate: fmt(dPlus3),
          endDate: fmt(dPlus7),
          progress: 0,
          status: 'todo',
          assignee: 'Ban Tài chính & Pháp chế',
          category: 'finance',
        },
      ],
    },
  ];
}
