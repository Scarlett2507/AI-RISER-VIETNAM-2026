import * as XLSX from 'xlsx';
import { Speaker, Enterprise, Guest, EventItem, InteractionNote, AuditLog, MappingTemplate, UserRole } from '../types';
import { INITIAL_SPEAKERS, INITIAL_ENTERPRISES, INITIAL_GUESTS, INITIAL_EVENTS, INITIAL_NOTES, INITIAL_AUDIT_LOGS, INITIAL_MAPPING_TEMPLATES } from '../data/initialData';
import { ensureArray, extractErrorsAndCleanTags } from './normalizer';
import { computeEventStatus, getEventTypeColor, getDefaultRundown, getDefaultOperationalPhases } from './schedulingService';

const STORAGE_KEYS = {
  SPEAKERS: 'eventdata_speakers_v1',
  ENTERPRISES: 'eventdata_enterprises_v1',
  GUESTS: 'eventdata_guests_v1',
  EVENTS: 'eventdata_events_v1',
  NOTES: 'eventdata_notes_v1',
  AUDIT_LOGS: 'eventdata_audit_logs_v1',
  TEMPLATES: 'eventdata_mapping_templates_v1',
  CURRENT_ROLE: 'eventdata_current_role_v1',
};

// Guarantee 100% unique keys across all entities in storage & state
export function deduplicateById<T extends { id?: string }>(items: T[], prefix: string): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  items.forEach((item, index) => {
    let id = item.id ? String(item.id).trim() : '';
    if (!id || seen.has(id)) {
      id = `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}`;
    }
    seen.add(id);
    result.push({ ...item, id });
  });
  return result;
}

const sanitizeSpeaker = (s: any): Speaker => {
  const { cleanTags, mergedNote } = extractErrorsAndCleanTags(
    s.tags,
    typeof s.note === 'string' ? s.note : (s.notes || s.internalNotes || '')
  );
  return {
    ...s,
    id: s.id || `spk-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    fullName: s.fullName || s.name || 'Chuyên gia',
    rating: typeof s.rating === 'number' && !isNaN(s.rating) ? Number(s.rating.toFixed(1)) : 4.8,
    expertise: ensureArray(s.expertise),
    tags: cleanTags,
    events: ensureArray(s.events),
    note: mergedNote,
  };
};

const sanitizeEnterprise = (e: any): Enterprise => {
  const { cleanTags, mergedNote } = extractErrorsAndCleanTags(
    e.tags,
    typeof e.note === 'string' ? e.note : (e.notes || e.internalNotes || '')
  );
  return {
    ...e,
    id: e.id || `ent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: e.name || e.fullName || 'Doanh nghiệp',
    tags: cleanTags,
    events: ensureArray(e.events),
    note: mergedNote,
  };
};

const sanitizeGuest = (g: any): Guest => {
  const { cleanTags, mergedNote } = extractErrorsAndCleanTags(
    g.tags,
    typeof g.note === 'string' ? g.note : (g.notes || g.internalNotes || '')
  );
  return {
    ...g,
    id: g.id || `gst-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    fullName: g.fullName || g.name || 'Khách mời',
    interestTopics: ensureArray(g.interestTopics),
    tags: cleanTags,
    eventsAttended: ensureArray(g.eventsAttended),
    note: mergedNote,
  };
};

const sanitizeEvent = (ev: any): EventItem => {
  const { cleanTags, mergedNote } = extractErrorsAndCleanTags(
    ev.tags,
    typeof ev.note === 'string' ? ev.note : (ev.notes || '')
  );
  const calculatedStatus = computeEventStatus(ev.date, ev.endDate);
  const colorInfo = getEventTypeColor(ev.type);

  return {
    ...ev,
    id: ev.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    status: calculatedStatus,
    speakerIds: ensureArray(ev.speakerIds),
    enterpriseIds: ensureArray(ev.enterpriseIds),
    startTime: ev.startTime || '08:30',
    endTime: ev.endTime || '17:30',
    venueRoom: ev.venueRoom || 'Hội trường Grand Ballroom',
    format: ev.format || (ev.location && ev.location.includes('Online') ? 'Online' : 'In-person'),
    meetUrl: ev.meetUrl || (ev.format === 'Online' || ev.format === 'Hybrid' ? `https://meet.google.com/${(ev.code || 'event').toLowerCase()}-hub` : undefined),
    capacity: typeof ev.capacity === 'number' ? ev.capacity : (ev.attendeeCount ? Math.round(ev.attendeeCount * 1.15) : 500),
    registeredCount: typeof ev.registeredCount === 'number' ? ev.registeredCount : (ev.attendeeCount || 400),
    colorCode: ev.colorCode || colorInfo.hex,
    equipment: ensureArray(ev.equipment).length > 0 ? ensureArray(ev.equipment) : ['Màn hình LED P2.5', 'Hệ thống âm thanh hội trường', 'Micro không dây x4', 'Thiết bị Livestream Full HD'],
    rundown: Array.isArray(ev.rundown) && ev.rundown.length > 0 ? ev.rundown : getDefaultRundown(ev, INITIAL_SPEAKERS),
    operationalPhases: Array.isArray(ev.operationalPhases) && ev.operationalPhases.length > 0 ? ev.operationalPhases : getDefaultOperationalPhases(ev),
    tags: cleanTags,
    note: mergedNote,
  };
};

export const StorageService = {
  getSpeakers(): Speaker[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SPEAKERS);
      const parsed: any[] = data ? JSON.parse(data) : INITIAL_SPEAKERS;
      const sanitized = (Array.isArray(parsed) ? parsed : INITIAL_SPEAKERS).map(sanitizeSpeaker);
      return deduplicateById(sanitized, 'spk');
    } catch {
      return deduplicateById(INITIAL_SPEAKERS.map(sanitizeSpeaker), 'spk');
    }
  },

  saveSpeakers(speakers: Speaker[]): void {
    const sanitized = deduplicateById((Array.isArray(speakers) ? speakers : []).map(sanitizeSpeaker), 'spk');
    localStorage.setItem(STORAGE_KEYS.SPEAKERS, JSON.stringify(sanitized));
  },

  getEnterprises(): Enterprise[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ENTERPRISES);
      const parsed: any[] = data ? JSON.parse(data) : INITIAL_ENTERPRISES;
      const sanitized = (Array.isArray(parsed) ? parsed : INITIAL_ENTERPRISES).map(sanitizeEnterprise);
      return deduplicateById(sanitized, 'ent');
    } catch {
      return deduplicateById(INITIAL_ENTERPRISES.map(sanitizeEnterprise), 'ent');
    }
  },

  saveEnterprises(enterprises: Enterprise[]): void {
    const sanitized = deduplicateById((Array.isArray(enterprises) ? enterprises : []).map(sanitizeEnterprise), 'ent');
    localStorage.setItem(STORAGE_KEYS.ENTERPRISES, JSON.stringify(sanitized));
  },

  getGuests(): Guest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GUESTS);
      const parsed: any[] = data ? JSON.parse(data) : INITIAL_GUESTS;
      const sanitized = (Array.isArray(parsed) ? parsed : INITIAL_GUESTS).map(sanitizeGuest);
      return deduplicateById(sanitized, 'gst');
    } catch {
      return deduplicateById(INITIAL_GUESTS.map(sanitizeGuest), 'gst');
    }
  },

  saveGuests(guests: Guest[]): void {
    const sanitized = deduplicateById((Array.isArray(guests) ? guests : []).map(sanitizeGuest), 'gst');
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(sanitized));
  },

  getEvents(): EventItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
      const parsed: any[] = data ? JSON.parse(data) : INITIAL_EVENTS;
      const sanitized = (Array.isArray(parsed) ? parsed : INITIAL_EVENTS).map(sanitizeEvent);
      return deduplicateById(sanitized, 'evt');
    } catch {
      return deduplicateById(INITIAL_EVENTS.map(sanitizeEvent), 'evt');
    }
  },

  saveEvents(events: EventItem[]): void {
    const sanitized = deduplicateById((Array.isArray(events) ? events : []).map(sanitizeEvent), 'evt');
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(sanitized));
  },

  getNotes(): InteractionNote[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      return data ? JSON.parse(data) : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  },

  saveNotes(notes: InteractionNote[]): void {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  },

  getAuditLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  },

  addAuditLog(action: AuditLog['action'], target: string, details: string, userRole: UserRole = 'Admin', userName: string = 'Admin (Bạn)'): void {
    const current = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName,
      userRole,
      action,
      target,
      details,
    };
    const updated = [newLog, ...current.slice(0, 100)];
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
  },

  getTemplates(): MappingTemplate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      return data ? JSON.parse(data) : INITIAL_MAPPING_TEMPLATES;
    } catch {
      return INITIAL_MAPPING_TEMPLATES;
    }
  },

  saveTemplate(template: MappingTemplate): void {
    const list = this.getTemplates();
    const filtered = list.filter(t => t.id !== template.id);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify([template, ...filtered]));
  },

  getCurrentRole(): UserRole {
    try {
      const role = localStorage.getItem(STORAGE_KEYS.CURRENT_ROLE);
      return (role as UserRole) || 'Admin';
    } catch {
      return 'Admin';
    }
  },

  saveCurrentRole(role: UserRole): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, role);
  },

  loadData() {
    return {
      speakers: this.getSpeakers(),
      enterprises: this.getEnterprises(),
      guests: this.getGuests(),
      events: this.getEvents(),
      templates: this.getTemplates(),
      auditLogs: this.getAuditLogs(),
      notes: this.getNotes(),
      currentUserRole: this.getCurrentRole(),
    };
  },

  saveData(data: {
    speakers?: Speaker[];
    enterprises?: Enterprise[];
    guests?: Guest[];
    events?: EventItem[];
    templates?: MappingTemplate[];
    auditLogs?: AuditLog[];
    notes?: InteractionNote[];
    currentUserRole?: UserRole;
  }) {
    if (data.speakers) this.saveSpeakers(data.speakers);
    if (data.enterprises) this.saveEnterprises(data.enterprises);
    if (data.guests) this.saveGuests(data.guests);
    if (data.events) this.saveEvents(data.events);
    if (data.templates) localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(data.templates));
    if (data.auditLogs) localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(data.auditLogs));
    if (data.notes) this.saveNotes(data.notes);
    if (data.currentUserRole) this.saveCurrentRole(data.currentUserRole);
  },

  clearData(): void {
    this.resetToDefault();
  },

  resetToDefault(): void {
    localStorage.setItem(STORAGE_KEYS.SPEAKERS, JSON.stringify(INITIAL_SPEAKERS));
    localStorage.setItem(STORAGE_KEYS.ENTERPRISES, JSON.stringify(INITIAL_ENTERPRISES));
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(INITIAL_GUESTS));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(INITIAL_NOTES));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_MAPPING_TEMPLATES));
  },

  // Export all database to JSON
  exportDatabaseJSON(): void {
    const payload = {
      exportedAt: new Date().toISOString(),
      speakers: this.getSpeakers(),
      enterprises: this.getEnterprises(),
      guests: this.getGuests(),
      events: this.getEvents(),
      notes: this.getNotes(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EventData_Hub_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Export active list to Excel
  exportToExcel(data: Record<string, unknown>[], filename: string): void {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  // Generate Sample Messy Excel Template for Testing Smart Importer
  generateSampleExcelFile(type: 'speaker' | 'enterprise' | 'guest'): void {
    let data: Record<string, string | number>[] = [];
    let filename = '';

    if (type === 'speaker') {
      filename = 'Mau_Excel_Dien_Gia_Chua_Chuan_Hoa.xlsx';
      data = [
        {
          'Tên diễn giả': 'nguyễn bảo ngọc',
          'Mail liên hệ': 'ngoc.bao@ai-viet.org',
          'SoDT': '0908123456',
          'Đơn vị công tác': 'Viện Nghiên Cứu AI Quốc Gia',
          'Chức vụ': 'Senior AI Scientist',
          'Lĩnh vực': 'NLP, Large Language Models, Generative AI',
          'Rating': 4.9,
          'Thành phố': 'Hà Nội',
          'Thẻ nhãn': 'Keynote Speaker, VIP',
        },
        {
          'Tên diễn giả': 'LÊ VĂN TÀI',
          'Mail liên hệ': 'TAI.LE@FINTECH.VN',
          'SoDT': '84913998877',
          'Đơn vị công tác': 'NextTech Group of Technopreneurs',
          'Chức vụ': 'Chief Innovation Officer',
          'Lĩnh vực': 'FinTech, Blockchain, Đầu tư Khởi nghiệp',
          'Rating': 4.6,
          'Thành phố': 'TP.HCM',
          'Thẻ nhãn': 'FinTech, Investor',
        },
        {
          'Tên diễn giả': 'Bùi Thị Thanh Hằng',
          'Mail liên hệ': 'hang.bui@viettel.vn',
          'SoDT': '+84 988 123 789',
          'Đơn vị công tác': 'Viettel Cyber Security',
          'Chức vụ': 'Lead Security Specialist',
          'Lĩnh vực': 'Cybersecurity, Cloud Security, Zero Trust',
          'Rating': 4.8,
          'Thành phố': 'Đà Nẵng',
          'Thẻ nhãn': 'Cybersecurity, Speaker',
        },
      ];
    } else if (type === 'enterprise') {
      filename = 'Mau_Excel_Doanh_Nghiep_Doi_Tac.xlsx';
      data = [
        {
          'Tên công ty': 'Công ty Cổ phần VNPAY',
          'Ngành kinh doanh': 'Cổng thanh toán & Giải pháp Fintech',
          'Người đại diện': 'hoàng quang huy',
          'Email LH': 'huy.hq@vnpay.vn',
          'Hotline': '024 3776 4443',
          'Hạng tài trợ': 'Gold',
          'Quy mô': 'Trên 1000',
          'Web': 'https://vnpay.vn',
          'Trụ sở': 'Hà Nội',
          'Nhãn': 'Fintech Leader, Cổng thanh toán',
        },
        {
          'Tên công ty': 'VinBrain (Vingroup)',
          'Ngành kinh doanh': 'Y tế Thông minh & AI Healthcare',
          'Người đại diện': 'Trương Quốc Hùng',
          'Email LH': 'hung.tq@vinbrain.net',
          'Hotline': '024 3974 9999',
          'Hạng tài trợ': 'Diamond',
          'Quy mô': '200 - 1000',
          'Web': 'https://vinbrain.net',
          'Trụ sở': 'Hà Nội',
          'Nhãn': 'AI Health, Đối tác Chiến lược',
        }
      ];
    } else {
      filename = 'Mau_Excel_Danh_Sach_Khach_Moi.xlsx';
      data = [
        {
          'Họ & Tên khách': 'vũ đình phong',
          'Hòm thư': 'phong.vd@vingroup.net',
          'Điện thoại': '0909556677',
          'Cơ quan': 'Vingroup JSC',
          'Vị trí': 'Trưởng phòng Chuyển đổi số',
          'Hạng vé': 'VIP Pass',
          'Chủ đề yêu thích': 'Trí tuệ nhân tạo, Tự động hóa',
          'Tỉnh thành': 'Hà Nội',
          'Nhãn': 'VIP, Chuyển đổi số',
        },
        {
          'Họ & Tên khách': 'Hoàng Minh Châu',
          'Hòm thư': 'chau.hm@vietcombank.com.vn',
          'Điện thoại': '0983 223 344',
          'Cơ quan': 'Ngân hàng TMCP Ngoại thương (VCB)',
          'Vị trí': 'Phó Giám đốc Khối CNTT',
          'Hạng vé': 'VIP Pass',
          'Chủ đề yêu thích': 'Ngân hàng số, Bảo mật dữ liệu',
          'Tỉnh thành': 'TP. Hồ Chí Minh',
          'Nhãn': 'VIP Doanh nghiệp',
        }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename);
  }
};
