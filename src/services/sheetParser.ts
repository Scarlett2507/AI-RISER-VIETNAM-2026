import * as XLSX from 'xlsx';
import { EntityType } from '../types';

export interface ParsedSheetResult {
  headers: string[];
  rows: Record<string, unknown>[];
  skippedBannerRows: string[];
  headerRowIndex: number;
  totalRawRows: number;
}

export interface ParsedCategorySection {
  id: string;
  entityType: EntityType;
  title: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  skippedBannerRows: string[];
}

export function getCategoryLabel(type: EntityType): string {
  switch (type) {
    case 'speaker':
      return 'Diễn giả & Chuyên gia';
    case 'enterprise':
      return 'Doanh nghiệp & Đối tác';
    case 'guest':
      return 'Khách mời Tham dự';
    case 'event':
      return 'Quản lý Sự kiện';
    default:
      return 'Dữ liệu';
  }
}

/**
 * Intelligent entity detector that determines whether a sheet or row belongs to
 * 'speaker' | 'enterprise' | 'guest' | 'event'
 */
export function detectEntityTypeFromSheet(
  sheetName: string,
  headers: string[],
  sampleRows: Record<string, unknown>[] = []
): EntityType {
  const sName = (sheetName || '').toLowerCase().trim();

  // 1. Direct match on Sheet Name
  if (sName.includes('diễn giả') || sName.includes('dien gia') || sName.includes('speaker') || sName.includes('chuyên gia') || sName.includes('presenter') || sName.includes('keynote')) {
    return 'speaker';
  }
  if (sName.includes('doanh nghiệp') || sName.includes('doanh nghiep') || sName.includes('đối tác') || sName.includes('doi tac') || sName.includes('enterprise') || sName.includes('partner') || sName.includes('sponsor') || sName.includes('tài trợ') || sName.includes('nhà tài trợ')) {
    return 'enterprise';
  }
  if (sName.includes('khách') || sName.includes('khach moi') || sName.includes('guest') || sName.includes('tham dự') || sName.includes('attendee') || sName.includes('checkin') || sName.includes('check-in') || sName.includes('vé')) {
    return 'guest';
  }
  if (sName.includes('sự kiện') || sName.includes('su kien') || sName.includes('event') || sName.includes('hội thảo') || sName.includes('workshop') || sName.includes('chương trình')) {
    return 'event';
  }

  // 2. Score based on Column Headers
  const joinedHeaders = headers.map(h => h.toLowerCase().trim()).join(' ');

  let speakerScore = 0;
  let enterpriseScore = 0;
  let guestScore = 0;
  let eventScore = 0;

  // Speaker indicators
  if (joinedHeaders.includes('rating') || joinedHeaders.includes('đánh giá') || joinedHeaders.includes('sao') || joinedHeaders.includes('điểm')) speakerScore += 25;
  if (joinedHeaders.includes('chuyên môn') || joinedHeaders.includes('expertise') || joinedHeaders.includes('lĩnh vực chuyên môn')) speakerScore += 25;
  if (joinedHeaders.includes('học hàm') || joinedHeaders.includes('học vị') || joinedHeaders.includes('học hàm / học vị')) speakerScore += 35;
  if (joinedHeaders.includes('tiểu sử') || joinedHeaders.includes('bio')) speakerScore += 20;
  if (joinedHeaders.includes('diễn giả') || joinedHeaders.includes('chuyên gia') || joinedHeaders.includes('báo cáo viên') || joinedHeaders.includes('keynote')) speakerScore += 30;
  if (joinedHeaders.includes('thù lao') || joinedHeaders.includes('honorarium')) speakerScore += 25;

  // Enterprise indicators (Specific to corporate sponsorship, NOT mere employer affiliation)
  if (joinedHeaders.includes('người liên hệ') || joinedHeaders.includes('contact person') || joinedHeaders.includes('đại diện liên hệ') || joinedHeaders.includes('diện liên hệ')) enterpriseScore += 30;
  if (joinedHeaders.includes('hạng đối tác') || joinedHeaders.includes('hạng tài trợ') || joinedHeaders.includes('gói tài trợ') || joinedHeaders.includes('mức tài trợ') || joinedHeaders.includes('tiền tài trợ') || joinedHeaders.includes('số tiền tài trợ') || joinedHeaders.includes('kinh phí tài trợ') || joinedHeaders.includes('sponsorship')) enterpriseScore += 35;
  if (joinedHeaders.includes('quy mô công ty') || joinedHeaders.includes('quy mô doanh nghiệp') || joinedHeaders.includes('số nhân sự')) enterpriseScore += 20;
  if (joinedHeaders.includes('website') || joinedHeaders.includes('trang web')) enterpriseScore += 15;
  if (joinedHeaders.includes('tên công ty') || joinedHeaders.includes('tên doanh nghiệp') || joinedHeaders.includes('tên đối tác')) enterpriseScore += 25;

  // Guest indicators
  if (joinedHeaders.includes('loại vé') || joinedHeaders.includes('hạng vé') || joinedHeaders.includes('hạng vé khách mời') || joinedHeaders.includes('ticket') || joinedHeaders.includes('vé')) guestScore += 35;
  if (joinedHeaders.includes('chủ đề quan tâm') || joinedHeaders.includes('interest') || joinedHeaders.includes('quan tâm')) guestScore += 25;
  if (joinedHeaders.includes('khách mời') || joinedHeaders.includes('tên khách') || joinedHeaders.includes('hòm thư đăng ký') || joinedHeaders.includes('checkin') || joinedHeaders.includes('check-in')) guestScore += 30;

  // Event indicators
  if (joinedHeaders.includes('mã sự kiện') || joinedHeaders.includes('mã sk') || joinedHeaders.includes('event code') || joinedHeaders.includes('mã chương trình')) eventScore += 35;
  if (joinedHeaders.includes('tên sự kiện') || joinedHeaders.includes('tên chương trình') || joinedHeaders.includes('loại hình sự kiện')) eventScore += 35;
  if (joinedHeaders.includes('đối tượng mục tiêu') || joinedHeaders.includes('target audience')) eventScore += 25;
  if (joinedHeaders.includes('ngân sách tổ chức') || joinedHeaders.includes('chi phí tổ chức')) eventScore += 25;
  if (joinedHeaders.includes('ngày tổ chức') || joinedHeaders.includes('địa điểm tổ chức')) eventScore += 25;

  // 3. Inspect sample row values deeply
  if (sampleRows.length > 0) {
    sampleRows.slice(0, 10).forEach(row => {
      const rowType = detectRowEntityType(row, 'speaker');
      if (rowType === 'speaker') speakerScore += 15;
      else if (rowType === 'enterprise') enterpriseScore += 15;
      else if (rowType === 'guest') guestScore += 15;
      else if (rowType === 'event') eventScore += 15;
    });
  }

  const maxScore = Math.max(speakerScore, enterpriseScore, guestScore, eventScore);
  if (maxScore > 0) {
    if (speakerScore === maxScore) return 'speaker';
    if (enterpriseScore === maxScore) return 'enterprise';
    if (guestScore === maxScore) return 'guest';
    if (eventScore === maxScore) return 'event';
  }

  return 'speaker'; // default fallback
}

/**
 * Detect entity type for an individual row based on its values (tags, role, name, notes, ticket, etc.)
 */
export function detectRowEntityType(
  row: Record<string, unknown>,
  fallbackType: EntityType = 'speaker'
): EntityType {
  if (!row || typeof row !== 'object') return fallbackType;

  let guestScore = 0;
  let speakerScore = 0;
  let enterpriseScore = 0;
  let eventScore = 0;

  // Examine all keys and values
  const entries = Object.entries(row);
  const rowStr = entries.map(([k, v]) => `${k}: ${v}`).join(' ').toLowerCase();

  for (const [key, rawVal] of entries) {
    const k = key.trim().toLowerCase();
    const val = String(rawVal || '').trim().toLowerCase();
    if (!val) continue;

    // Explicit Type / Role Column check
    if (
      k === 'thống' ||
      k === 'hệ thống' ||
      k === 'phân loại' ||
      k === 'phân loại hệ thống' ||
      k === 'loại đối tượng' ||
      k === 'loại' ||
      k === 'vai trò' ||
      k === 'role' ||
      k === 'type' ||
      k === 'category' ||
      k === 'đối tượng'
    ) {
      if (val.includes('diễn giả') || val.includes('speaker') || val.includes('chuyên gia') || val.includes('keynote') || val.includes('báo cáo viên') || val.includes('presenter')) {
        speakerScore += 120;
      }
      if (val.includes('doanh nghiệp') || val.includes('đối tác') || val.includes('tài trợ') || val.includes('sponsor') || val.includes('partner') || val.includes('enterprise')) {
        enterpriseScore += 120;
      }
      if (val.includes('khách') || val.includes('guest') || val.includes('tham dự') || val.includes('attendee') || val.includes('đại biểu')) {
        guestScore += 120;
      }
      if (val.includes('sự kiện') || val.includes('event') || val.includes('chương trình') || val.includes('hội thảo')) {
        eventScore += 120;
      }
    }

    // 1. SPEAKER SIGNALS
    if (
      val.startsWith('ts.') ||
      val.startsWith('ths.') ||
      val.startsWith('dr.') ||
      val.startsWith('prof.') ||
      val.startsWith('gs.') ||
      val.startsWith('pgs.') ||
      val.startsWith('bs.') ||
      val.includes('tiến sĩ') ||
      val.includes('giáo sư') ||
      val.includes('bác sĩ') ||
      val.includes('thạc sĩ') ||
      val.includes('speaker vip') ||
      val.includes('keynote speaker') ||
      val.includes('báo cáo viên') ||
      val.includes('diễn giả quốc tế') ||
      val.includes('chuyên gia đầu ngành') ||
      val.includes('chủ tọa') ||
      val.includes('thù lao') ||
      val.includes('hỗ trợ vé mb')
    ) {
      speakerScore += 70;
    }

    // Academic titles in key
    if (k.includes('học hàm') || k.includes('học vị') || k.includes('chuyên môn') || k.includes('tiểu sử') || k.includes('rating') || k.includes('đánh giá')) {
      if (val.length > 0 && val !== 'none' && val !== 'n/a') {
        speakerScore += 45;
      }
    }

    // Expert Job titles in position/role
    if (k.includes('trí') || k.includes('vị trí') || k.includes('chức vụ') || k.includes('role')) {
      if (
        val.includes('scientist') ||
        val.includes('principal') ||
        val.includes('chief') ||
        val.includes('professor') ||
        val.includes('giảng viên') ||
        val.includes('head of ai') ||
        val.includes('researcher') ||
        val.includes('nghiên cứu viên') ||
        val.includes('kiến trúc sư trưởng') ||
        val.includes('architect')
      ) {
        speakerScore += 50;
      }
    }

    // 2. GUEST SIGNALS
    if (
      val.includes('vé early bird') ||
      val.includes('vé phổ thông') ||
      val.includes('vé sinh viên') ||
      val.includes('vé tự do') ||
      val.includes('vé standard') ||
      val.includes('vé vip') ||
      val.includes('standard ticket') ||
      val.includes('vip pass') ||
      val.includes('standard pass') ||
      val.includes('press / media') ||
      val.includes('khách mời vip') ||
      val.includes('khách tham dự') ||
      val.includes('đại biểu tham dự')
    ) {
      guestScore += 70;
    }

    if (
      k.includes('vé') ||
      k.includes('ticket') ||
      k.includes('hạng vé') ||
      k.includes('loại vé') ||
      k.includes('quan tâm') ||
      k.includes('interest')
    ) {
      if (val && !val.includes('mb') && !val.includes('máy bay')) {
        guestScore += 45;
      }
    }

    // 3. ENTERPRISE SIGNALS (Genuine corporate sponsorship & partnerships)
    if (
      val.includes('tài trợ kim cương') ||
      val.includes('tài trợ vàng') ||
      val.includes('tài trợ bạc') ||
      val.includes('tài trợ đồng') ||
      val.includes('kim cương (diamond)') ||
      val.includes('vàng (gold)') ||
      val.includes('bạc (silver)') ||
      val.includes('đồng (bronze)') ||
      val.includes('diamond sponsor') ||
      val.includes('gold sponsor') ||
      val.includes('silver sponsor') ||
      val.includes('strategic partner') ||
      val.includes('đối tác chiến lược') ||
      val.includes('nhà tài trợ chính') ||
      val.includes('đơn vị đồng hành tài trợ')
    ) {
      enterpriseScore += 80;
    }

    // Column triggers for enterprise
    if (k.includes('diện liên hệ') || k.includes('người liên hệ') || k.includes('contact person') || k.includes('đại diện')) {
      if (val.length > 0) enterpriseScore += 40;
    }

    if (k.includes('quy đổi') || k.includes('số tiền tài trợ') || k.includes('mức tài trợ') || k.includes('kinh phí tài trợ')) {
      // If it has a large sponsorship amount (e.g. 30,000,000 to 200,000,000)
      if (/\d{7,}/.test(val.replace(/\D/g, ''))) {
        enterpriseScore += 40;
      }
    }

    if (k.includes('quy mô công ty') || k.includes('quy mô doanh nghiệp') || k.includes('website')) {
      enterpriseScore += 30;
    }

    // 4. EVENT SIGNALS
    if (
      k.includes('mã sự kiện') ||
      k.includes('mã sk') ||
      k.includes('đối tượng mục tiêu') ||
      k.includes('ngày tổ chức') ||
      k.includes('địa điểm tổ chức') ||
      k.includes('ngân sách tổ chức') ||
      k.includes('loại hình sự kiện')
    ) {
      eventScore += 60;
    }

    if (
      val.includes('hội thảo quốc tế') ||
      val.includes('diễn đàn doanh nghiệp') ||
      val.includes('triển lãm công nghệ') ||
      val.includes('pitching day') ||
      val.includes('trung tâm hội nghị') ||
      val.includes('white palace')
    ) {
      eventScore += 50;
    }
  }

  // Row-level fallback checks
  if (guestScore === 0 && (rowStr.includes('vé early bird') || rowStr.includes('vé phổ thông') || rowStr.includes('vé sinh viên') || rowStr.includes('vip pass') || rowStr.includes('khách mời'))) {
    guestScore += 50;
  }
  if (speakerScore === 0 && (rowStr.includes('diễn giả') || rowStr.includes('chuyên gia') || rowStr.includes('tiến sĩ') || rowStr.includes('giáo sư') || rowStr.includes('báo cáo viên') || rowStr.includes('speaker vip'))) {
    speakerScore += 50;
  }
  if (enterpriseScore === 0 && (rowStr.includes('kim cương') || rowStr.includes('tài trợ') || rowStr.includes('quỹ đầu tư') || rowStr.includes('venture capital') || rowStr.includes('strategic partner'))) {
    enterpriseScore += 50;
  }

  const maxScore = Math.max(guestScore, speakerScore, enterpriseScore, eventScore);
  if (maxScore >= 30) {
    if (speakerScore === maxScore) return 'speaker';
    if (enterpriseScore === maxScore) return 'enterprise';
    if (guestScore === maxScore) return 'guest';
    if (eventScore === maxScore) return 'event';
  }

  return fallbackType;
}

/**
 * Check if a single-sheet table contains rows with mixed categories
 * Evaluates both explicit type columns AND individual row semantic classification
 */
export function splitMixedRowsIntoCategories(
  headers: string[],
  rows: Record<string, unknown>[],
  defaultType: EntityType = 'speaker'
): Record<EntityType, Record<string, unknown>[]> | null {
  if (!rows || rows.length === 0) return null;

  // Look for a classification column (including truncated headers like 'thống', 'hệ thống', 'phân loại')
  const typeColHeader = headers.find(h => {
    const clean = h.trim().toLowerCase();
    return (
      clean === 'loại đối tượng' ||
      clean === 'loại' ||
      clean === 'phân loại' ||
      clean === 'phân loại đối tượng' ||
      clean === 'phân loại hệ thống' ||
      clean === 'hệ thống' ||
      clean === 'thống' ||
      clean === 'type' ||
      clean === 'category' ||
      clean === 'vai trò' ||
      clean === 'role' ||
      clean === 'đối tượng' ||
      clean === 'phân loại khách' ||
      clean === 'hạng mục' ||
      clean.includes('phân loại') ||
      clean.includes('hệ thống') ||
      clean.includes('đối tượng') ||
      clean.includes('vai trò') ||
      clean.includes('thống')
    );
  });

  const speakerRows: Record<string, unknown>[] = [];
  const enterpriseRows: Record<string, unknown>[] = [];
  const guestRows: Record<string, unknown>[] = [];
  const eventRows: Record<string, unknown>[] = [];

  rows.forEach(r => {
    if (typeColHeader && r[typeColHeader]) {
      const val = String(r[typeColHeader] || '').toLowerCase().trim();
      if (val.includes('khách') || val.includes('guest') || val.includes('tham dự') || val.includes('attendee') || val.includes('đại biểu')) {
        guestRows.push(r);
        return;
      }
      if (val.includes('doanh nghiệp') || val.includes('đối tác') || val.includes('công ty') || val.includes('enterprise') || val.includes('partner') || val.includes('tài trợ') || val.includes('sponsor')) {
        enterpriseRows.push(r);
        return;
      }
      if (val.includes('diễn giả') || val.includes('speaker') || val.includes('chuyên gia') || val.includes('presenter') || val.includes('keynote') || val.includes('báo cáo viên') || val.includes('mentor')) {
        speakerRows.push(r);
        return;
      }
      if (val.includes('sự kiện') || val.includes('event')) {
        eventRows.push(r);
        return;
      }
    }

    // Semantic row detection (e.g. tag: "Khách mời VIP / Fintech" -> Guest!)
    const detected = detectRowEntityType(r, defaultType);
    if (detected === 'guest') guestRows.push(r);
    else if (detected === 'enterprise') enterpriseRows.push(r);
    else if (detected === 'event') eventRows.push(r);
    else speakerRows.push(r);
  });

  const distinctTypes = [speakerRows.length > 0, enterpriseRows.length > 0, guestRows.length > 0, eventRows.length > 0].filter(Boolean).length;
  if (distinctTypes >= 2) {
    const result: Partial<Record<EntityType, Record<string, unknown>[]>> = {};
    if (speakerRows.length > 0) result.speaker = speakerRows;
    if (enterpriseRows.length > 0) result.enterprise = enterpriseRows;
    if (guestRows.length > 0) result.guest = guestRows;
    if (eventRows.length > 0) result.event = eventRows;
    return result as Record<EntityType, Record<string, unknown>[]>;
  }

  return null;
}

/**
 * Extracts distinct embedded events from rows if the spreadsheet links to events
 * (e.g. columns like 'Chủ Đề Sự Kiện' or 'Tham gia' with values like 'EVT2026-001: Hội thảo...')
 */
export function extractEmbeddedEventsFromRows(
  headers: string[],
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (!rows || rows.length === 0) return [];

  const eventHeader = headers.find(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('chủ đề sự kiện') || clean === 'sự kiện' || clean.includes('mã sk') || clean === 'event';
  });

  if (!eventHeader) return [];

  const uniqueEventsMap = new Map<string, Record<string, unknown>>();

  rows.forEach(r => {
    const rawVal = String(r[eventHeader] || '').trim();
    if (!rawVal) return;

    if (rawVal.includes('EVT') || rawVal.includes('Hội thảo') || rawVal.includes('Hội nghị') || rawVal.includes('Diễn đàn') || rawVal.includes('Summit') || rawVal.includes('Forum')) {
      let code = '';
      let title = rawVal;
      if (rawVal.includes(':')) {
        const parts = rawVal.split(':');
        code = parts[0].trim();
        title = parts.slice(1).join(':').trim();
      } else if (rawVal.startsWith('EVT')) {
        const match = rawVal.match(/^(EVT[-\d]+)\s*[-:]?\s*(.*)$/i);
        if (match) {
          code = match[1].trim();
          title = match[2].trim() || rawVal;
        }
      }

      const key = (code || title).toLowerCase();
      if (!uniqueEventsMap.has(key)) {
        uniqueEventsMap.set(key, {
          'Tên sự kiện / Chương trình': title,
          'Mã sự kiện': code || `EVT-2026-0${uniqueEventsMap.size + 1}`,
          'Thời gian tổ chức': '2026-10-15',
          'Địa điểm tổ chức': 'Trung tâm Hội nghị Quốc gia / White Palace',
          'Loại hình sự kiện': title.toLowerCase().includes('hội thảo') ? 'Hội thảo Quốc tế' : title.toLowerCase().includes('hội nghị') ? 'Hội nghị Thượng đỉnh' : 'Diễn đàn Công nghệ',
          'Chủ đề trọng tâm': title,
          'Số lượng khách tham dự': 500,
          'Ngân sách tổ chức (VNĐ)': 500000000,
          'Trạng thái': 'Sắp diễn ra',
          'Đối tượng mục tiêu': 'Chuyên gia, Doanh nghiệp & Khách mời',
          'Bộ phận chủ trì (Tags)': 'Ban Tổ chức',
          'Ghi chú': `Sự kiện trích xuất tự động từ danh sách tham gia (${rawVal})`
        });
      }
    }
  });

  return Array.from(uniqueEventsMap.values());
}

/**
 * Consolidates multiple sections of the same entity type into single unified categories,
 * combining headers and rows seamlessly, and auto-extracting embedded events if event category is missing.
 */
export function consolidateSectionsByCategory(
  sections: ParsedCategorySection[]
): ParsedCategorySection[] {
  if (!sections || sections.length === 0) return [];

  const categoryMap = new Map<EntityType, {
    sheetNames: string[];
    headers: Set<string>;
    rows: Record<string, unknown>[];
    skippedBanners: string[];
  }>();

  const allRows: Record<string, unknown>[] = [];
  const allHeaders: string[] = [];

  sections.forEach(s => {
    allRows.push(...s.rows);
    allHeaders.push(...s.headers);

    if (!categoryMap.has(s.entityType)) {
      categoryMap.set(s.entityType, {
        sheetNames: [s.sheetName],
        headers: new Set(s.headers),
        rows: [...s.rows],
        skippedBanners: [...(s.skippedBannerRows || [])]
      });
    } else {
      const existing = categoryMap.get(s.entityType)!;
      if (!existing.sheetNames.includes(s.sheetName)) {
        existing.sheetNames.push(s.sheetName);
      }
      s.headers.forEach(h => existing.headers.add(h));
      existing.rows.push(...s.rows);
      if (s.skippedBannerRows) {
        existing.skippedBanners.push(...s.skippedBannerRows);
      }
    }
  });

  // If no 'event' section exists, check if any events can be extracted from all collected rows
  if (!categoryMap.has('event')) {
    const extractedEvents = extractEmbeddedEventsFromRows(Array.from(new Set(allHeaders)), allRows);
    if (extractedEvents.length > 0) {
      const evtHeaders = Object.keys(extractedEvents[0]);
      categoryMap.set('event', {
        sheetNames: ['Sự kiện trích xuất'],
        headers: new Set(evtHeaders),
        rows: extractedEvents,
        skippedBanners: []
      });
    }
  }

  // Canonical ordering: speaker -> enterprise -> guest -> event
  const canonicalOrder: EntityType[] = ['speaker', 'enterprise', 'guest', 'event'];
  const consolidated: ParsedCategorySection[] = [];

  canonicalOrder.forEach((type, idx) => {
    if (categoryMap.has(type)) {
      const item = categoryMap.get(type)!;
      const sheetDisplayName = item.sheetNames.length > 1
        ? item.sheetNames.join(', ')
        : item.sheetNames[0];

      consolidated.push({
        id: `section-${type}-${idx}`,
        entityType: type,
        title: getCategoryLabel(type),
        sheetName: sheetDisplayName,
        headers: Array.from(item.headers),
        rows: item.rows,
        skippedBannerRows: item.skippedBanners
      });
    }
  });

  // Include any other remaining types if any
  categoryMap.forEach((item, type) => {
    if (!canonicalOrder.includes(type)) {
      consolidated.push({
        id: `section-${type}-${consolidated.length}`,
        entityType: type,
        title: getCategoryLabel(type),
        sheetName: item.sheetNames.join(', '),
        headers: Array.from(item.headers),
        rows: item.rows,
        skippedBannerRows: item.skippedBanners
      });
    }
  });

  return consolidated;
}

/**
 * Parses an entire Excel workbook into structured, categorized sections
 * (Diễn giả & Chuyên gia, Doanh nghiệp & Đối tác, Khách mời Tham dự, Quản lý Sự kiện)
 */
export function parseWorkbookIntoCategories(
  workbook: XLSX.WorkBook,
  defaultEntityType: EntityType = 'speaker'
): ParsedCategorySection[] {
  const rawSections: ParsedCategorySection[] = [];
  const sheetNames = workbook.SheetNames || [];

  if (sheetNames.length === 0) return [];

  // Case 1: Multi-sheet workbook
  if (sheetNames.length > 1) {
    sheetNames.forEach((name, idx) => {
      const sheet = workbook.Sheets[name];
      if (!sheet) return;
      const parsed = parseSpreadsheetWithSmartHeaderDetection(sheet);
      if (parsed.rows.length === 0 || parsed.headers.length === 0) return;

      const detectedType = detectEntityTypeFromSheet(name, parsed.headers, parsed.rows);
      
      // Check if this individual sheet has mixed rows inside
      const mixedSplit = splitMixedRowsIntoCategories(parsed.headers, parsed.rows, detectedType);
      if (mixedSplit) {
        (Object.keys(mixedSplit) as EntityType[]).forEach((type, subIdx) => {
          const rows = mixedSplit[type] || [];
          if (rows.length > 0) {
            rawSections.push({
              id: `section-${type}-${idx}-${subIdx}`,
              entityType: type,
              title: getCategoryLabel(type),
              sheetName: `${name} (${getCategoryLabel(type)})`,
              headers: parsed.headers,
              rows,
              skippedBannerRows: parsed.skippedBannerRows,
            });
          }
        });
      } else {
        rawSections.push({
          id: `section-${detectedType}-${idx}`,
          entityType: detectedType,
          title: getCategoryLabel(detectedType),
          sheetName: name,
          headers: parsed.headers,
          rows: parsed.rows,
          skippedBannerRows: parsed.skippedBannerRows,
        });
      }
    });

    if (rawSections.length > 0) {
      return consolidateSectionsByCategory(rawSections);
    }
  }

  // Case 2: Single-sheet workbook
  const firstSheetName = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) return [];

  const parsed = parseSpreadsheetWithSmartHeaderDetection(worksheet);
  if (parsed.rows.length === 0 || parsed.headers.length === 0) return [];

  const detectedSingleType = detectEntityTypeFromSheet(firstSheetName, parsed.headers, parsed.rows) || defaultEntityType;

  // Check if rows can be split by classification column or row-level cues
  const mixedSplit = splitMixedRowsIntoCategories(parsed.headers, parsed.rows, detectedSingleType);
  if (mixedSplit) {
    // If mixedSplit doesn't have events, check if we can extract embedded events
    if (!mixedSplit.event || mixedSplit.event.length === 0) {
      const extractedEvents = extractEmbeddedEventsFromRows(parsed.headers, parsed.rows);
      if (extractedEvents.length > 0) {
        mixedSplit.event = extractedEvents;
      }
    }

    (Object.keys(mixedSplit) as EntityType[]).forEach((type, idx) => {
      const rows = mixedSplit[type] || [];
      if (rows.length > 0) {
        const headersToUse = type === 'event' && rows[0] ? Object.keys(rows[0]) : parsed.headers;
        rawSections.push({
          id: `section-${type}-${idx}`,
          entityType: type,
          title: getCategoryLabel(type),
          sheetName: `${firstSheetName} (${getCategoryLabel(type)})`,
          headers: headersToUse,
          rows,
          skippedBannerRows: parsed.skippedBannerRows,
        });
      }
    });
    return consolidateSectionsByCategory(rawSections);
  }

  // Pure single sheet
  rawSections.push({
    id: `section-${detectedSingleType}-0`,
    entityType: detectedSingleType,
    title: getCategoryLabel(detectedSingleType),
    sheetName: firstSheetName,
    headers: parsed.headers,
    rows: parsed.rows,
    skippedBannerRows: parsed.skippedBannerRows,
  });

  // Even for a single sheet, check if events can be extracted if it references events
  if (detectedSingleType !== 'event') {
    const extractedEvents = extractEmbeddedEventsFromRows(parsed.headers, parsed.rows);
    if (extractedEvents.length > 0) {
      const evtHeaders = Object.keys(extractedEvents[0]);
      rawSections.push({
        id: `section-event-1`,
        entityType: 'event',
        title: getCategoryLabel('event'),
        sheetName: 'Sự kiện liên kết',
        headers: evtHeaders,
        rows: extractedEvents,
        skippedBannerRows: [],
      });
    }
  }

  return consolidateSectionsByCategory(rawSections);
}

// Check if a string looks like a document title, banner, test description or disclaimer
export function isBannerOrDisclaimerText(text: string): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  
  // Specific keywords often found in test data, disclaimers, or sheet headers
  const bannerKeywords = [
    'bộ dữ liệu kiểm thử',
    'full test cases',
    'chuẩn hóa sđt',
    'duplicate merge',
    'file chứa đầy đủ',
    'kịch bản lộn xộn',
    'danh sách chưa chuẩn hóa',
    'mẫu import',
    'hướng dẫn sử dụng',
    'bảng tính tổng hợp',
    'lưu ý:',
    'chú ý:',
    'ghi chú tổng hợp',
    'bản quyền',
    'copyright',
    'metadata',
    'thông tin file',
    'ngày xuất:',
    'người xuất:',
    'dữ liệu mẫu',
    'sample dataset',
    'hết danh sách',
    'tổng số dòng',
    'tổng cộng:',
    'end of file',
  ];

  if (bannerKeywords.some(kw => t.includes(kw))) {
    return true;
  }

  // Long text (> 45 chars) with punctuation and spaces that is clearly a sentence rather than a column header
  if (text.length > 50 && (text.includes('.') || text.includes(':') || text.includes('(') || text.includes('—') || text.includes('-'))) {
    return true;
  }

  return false;
}

// Known column header indicators in Vietnamese & English
const COLUMN_INDICATOR_KEYWORDS = [
  'họ tên', 'họ và tên', 'hoten', 'full name', 'name', 'tên', 'diễn giả', 'khách', 'chuyên gia', 'người',
  'sđt', 'sdt', 'phone', 'điện thoại', 'mobile', 'tel', 'hotline', 'liên hệ', 'contact',
  'email', 'e-mail', 'mail', 'hòm thư',
  'đơn vị', 'công ty', 'tổ chức', 'cơ quan', 'doanh nghiệp', 'company', 'organization',
  'chức vụ', 'chức danh', 'vị trí', 'title', 'role', 'position', 'job',
  'chuyên môn', 'lĩnh vực', 'ngành', 'expertise', 'specialty', 'topic', 'chủ đề',
  'rating', 'đánh giá', 'sao', 'điểm', 'score',
  'địa chỉ', 'khu vực', 'thành phố', 'tỉnh', 'city', 'location', 'trụ sở', 'venue',
  'bộ phận', 'ban', 'tags', 'nhãn', 'phân loại', 'loại', 'tier', 'hạng', 'quy mô', 'scale', 'website', 'web',
  'tài trợ', 'tiền tài trợ', 'số tiền tài trợ', 'mức tài trợ', 'kinh phí tài trợ', 'sponsorship', 'sponsorship total', 'sponsorship amount', 'số tiền', 'giá trị tài trợ', 'ngân sách',
  'ghi chú', 'note', 'lưu ý', 'nhận xét', 'stt', 'no.', 'id', 'mã', 'ticket', 'loại vé', 'ngày', 'date', 'thời gian'
];

/**
 * Calculates a score indicating how likely a row in the spreadsheet is the real column header row
 */
function calculateHeaderRowScore(row: any[]): number {
  if (!Array.isArray(row) || row.length === 0) return -100;

  const filledCells = row.map(c => String(c ?? '').trim()).filter(Boolean);
  if (filledCells.length === 0) return -100;

  // Single cell in row that is long text -> definitely banner / title row
  if (filledCells.length <= 2) {
    const combined = filledCells.join(' ');
    if (isBannerOrDisclaimerText(combined) || combined.length > 35) {
      return -50;
    }
  }

  let score = 0;
  let matchingKeywordCount = 0;

  for (const cell of filledCells) {
    const cleanCell = cell.toLowerCase();

    // Check if cell is a banner
    if (isBannerOrDisclaimerText(cell)) {
      score -= 30;
      continue;
    }

    // Short & concise header text
    if (cell.length > 0 && cell.length <= 35) {
      score += 3;
    } else {
      score -= 5;
    }

    // Matches domain keywords
    const matched = COLUMN_INDICATOR_KEYWORDS.some(kw => cleanCell === kw || cleanCell.includes(kw));
    if (matched) {
      score += 15;
      matchingKeywordCount++;
    }
  }

  // Bonus for having multiple standard column headers
  if (matchingKeywordCount >= 3) {
    score += 40;
  } else if (matchingKeywordCount >= 2) {
    score += 20;
  }

  // Penalty if only 1 cell is filled
  if (filledCells.length === 1) {
    score -= 40;
  } else if (filledCells.length >= 3) {
    score += 10;
  }

  return score;
}

/**
 * Intelligent parser that detects and skips banner rows, title paragraphs, and metadata notes at the top/bottom of spreadsheets
 */
export function parseSpreadsheetWithSmartHeaderDetection(
  worksheet: XLSX.WorkSheet
): ParsedSheetResult {
  // 1. Read sheet as 2D raw array of cells
  const rawRows: any[][] = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawRows || rawRows.length === 0) {
    return {
      headers: [],
      rows: [],
      skippedBannerRows: [],
      headerRowIndex: -1,
      totalRawRows: 0,
    };
  }

  // 2. Scan the first 15 rows to find the true header row with highest score
  const maxScanRows = Math.min(15, rawRows.length);
  let bestHeaderIndex = 0;
  let highestScore = -999;

  for (let i = 0; i < maxScanRows; i++) {
    const row = rawRows[i];
    const score = calculateHeaderRowScore(row);
    if (score > highestScore) {
      highestScore = score;
      bestHeaderIndex = i;
    }
  }

  // 3. Extract skipped banner rows prior to the header row
  const skippedBannerRows: string[] = [];
  for (let i = 0; i < bestHeaderIndex; i++) {
    const text = rawRows[i].map((c: any) => String(c ?? '').trim()).filter(Boolean).join(' | ');
    if (text) {
      skippedBannerRows.push(text);
    }
  }

  // 4. Construct clean, unique headers
  const headerRow = rawRows[bestHeaderIndex] || [];
  const headers: string[] = [];
  const headerCounts = new Map<string, number>();

  headerRow.forEach((cell: any, colIdx: number) => {
    let cleanHeader = String(cell ?? '').trim();
    if (!cleanHeader) {
      cleanHeader = `Cột_${colIdx + 1}`;
    }
    // Discard newline characters in headers
    cleanHeader = cleanHeader.replace(/[\r\n]+/g, ' ').trim();

    // Deduplicate identical headers
    const count = headerCounts.get(cleanHeader) || 0;
    if (count > 0) {
      headerCounts.set(cleanHeader, count + 1);
      cleanHeader = `${cleanHeader} (${count + 1})`;
    } else {
      headerCounts.set(cleanHeader, 1);
    }

    headers.push(cleanHeader);
  });

  // 5. Parse data rows below the header row
  const dataRows: Record<string, unknown>[] = [];
  const rawDataRows = rawRows.slice(bestHeaderIndex + 1);

  for (let rIdx = 0; rIdx < rawDataRows.length; rIdx++) {
    const rawRow = rawDataRows[rIdx];
    if (!Array.isArray(rawRow)) continue;

    const filledCells = rawRow.map((c: any) => String(c ?? '').trim()).filter(Boolean);
    if (filledCells.length === 0) continue; // Skip blank rows

    // Check if this row is a footnote, trailing note, or sub-banner
    if (filledCells.length <= 2) {
      const combined = filledCells.join(' ');
      if (isBannerOrDisclaimerText(combined)) {
        skippedBannerRows.push(combined);
        continue;
      }
    }

    // Build row object
    const rowObj: Record<string, unknown> = {};
    let hasValidContent = false;

    headers.forEach((header, cIdx) => {
      const val = rawRow[cIdx] !== undefined && rawRow[cIdx] !== null ? rawRow[cIdx] : '';
      rowObj[header] = typeof val === 'string' ? val.trim() : val;
      if (rowObj[header] !== '') {
        hasValidContent = true;
      }
    });

    if (hasValidContent) {
      dataRows.push(rowObj);
    }
  }

  return {
    headers,
    rows: dataRows,
    skippedBannerRows,
    headerRowIndex: bestHeaderIndex,
    totalRawRows: rawRows.length,
  };
}
