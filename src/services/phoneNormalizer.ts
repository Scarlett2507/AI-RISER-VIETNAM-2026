import { parsePhoneNumberWithError, ParseError, PhoneNumber, CountryCode } from 'libphonenumber-js';

/**
 * Normalized phone number model complying with E.164 & telecom metadata
 */
export interface NormalizedPhoneNumber {
  raw: string;
  cleaned: string;
  isValid: boolean;
  isVietnamese: boolean;
  e164?: string; // e.g. "+84918987654", "+14155552671"
  e164DigitsOnly?: string; // e.g. "84918987654", "14155552671"
  national?: string; // e.g. "0918 987 654"
  international?: string; // e.g. "+84 918 987 654"
  country?: CountryCode; // e.g. "VN", "US", "SG", "JP"
  countryName?: string; // e.g. "Việt Nam", "Hoa Kỳ", "Singapore"
  countryFlag?: string; // e.g. "🇻🇳", "🇺🇸", "🇸🇬"
  countryCallingCode?: string; // e.g. "+84", "+1", "+65"
  numberType?: 'MOBILE' | 'FIXED_LINE' | 'VOIP' | 'UNKNOWN';
  whatsappLink?: string; // https://wa.me/84918987654
  telLink?: string; // tel:+84918987654
  zaloLink?: string; // https://zalo.me/0918987654 or https://zalo.me/84918987654
  errorReason?: 'EMPTY_INPUT' | 'INVALID_PHONE_FORMAT' | 'CONTAINS_LETTERS' | 'TOO_SHORT' | 'TOO_LONG' | 'INVALID_COUNTRY_CODE' | 'UNKNOWN_PARSE_ERROR' | string;
}

/**
 * Result structure when processing a multi-phone Excel cell
 */
export interface PhoneFieldNormalizationResult {
  rawInput: string;
  hasMultiple: boolean;
  primary: NormalizedPhoneNumber;
  secondary?: NormalizedPhoneNumber;
  allNumbers: NormalizedPhoneNumber[];
}

/**
 * Vietnamese & English Country Names Map
 */
export const COUNTRY_NAMES_VI: Record<string, string> = {
  VN: 'Việt Nam',
  US: 'Hoa Kỳ',
  CA: 'Canada',
  SG: 'Singapore',
  JP: 'Nhật Bản',
  KR: 'Hàn Quốc',
  GB: 'Vương quốc Anh',
  FR: 'Pháp',
  DE: 'Đức',
  AU: 'Úc',
  CN: 'Trung Quốc',
  TH: 'Thái Lan',
  MY: 'Malaysia',
  ID: 'Indonesia',
  PH: 'Philippines',
  TW: 'Đài Loan',
  HK: 'Hồng Kông',
  IN: 'Ấn Độ',
  IT: 'Ý',
  ES: 'Tây Ban Nha',
  CH: 'Thụy Sĩ',
  SE: 'Thụy Điển',
  NL: 'Hà Lan',
  RU: 'Nga',
  BR: 'Brazil',
  NZ: 'New Zealand',
  AE: 'UAE (Các TVQ Ả Rập)',
  IL: 'Israel',
  ZA: 'Nam Phi',
  BE: 'Bỉ',
  AT: 'Áo',
  DK: 'Đan Mạch',
  NO: 'Na Uy',
  FI: 'Phần Lan',
  IE: 'Ireland',
  PT: 'Bồ Đào Nha',
  PL: 'Ba Lan',
  CZ: 'Séc',
  HU: 'Hungary',
  GR: 'Hy Lạp',
  TR: 'Thổ Nhĩ Kỳ',
  SA: 'Ả Rập Xê Út',
  KH: 'Campuchia',
  LA: 'Lào',
  MM: 'Myanmar',
};

/**
 * Helper: Generate country flag emoji from ISO-2 country code
 */
export function getCountryFlagEmoji(countryCode?: string | null): string {
  if (!countryCode || typeof countryCode !== 'string' || countryCode.trim().length !== 2) return '🌐';
  try {
    const codePoints = countryCode
      .trim()
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}

/**
 * Helper: Get country Vietnamese name
 */
export function getCountryNameVi(countryCode?: string | null): string {
  if (!countryCode || typeof countryCode !== 'string') return 'Quốc tế';
  const code = countryCode.trim().toUpperCase();
  return COUNTRY_NAMES_VI[code] || code;
}

/**
 * Common prefixes in Vietnamese Excel files
 */
const PREFIX_CLEAN_REGEX = /^(tel|phone|sđt|sdt|mob|mobile|hotline|liên hệ|lh|đt|contact|điện thoại)\s*[:.-]?\s*/i;

/**
 * STEP 1: Raw String Sanitization (Làm sạch Chuỗi Thô)
 * Removes dots, dashes, brackets, spaces, extra labels, and invalid non-standard characters
 */
export function sanitizeRawPhoneString(raw: string): string {
  if (!raw) return '';
  let str = String(raw).trim();

  // 1. Remove label prefixes: "SĐT:", "Tel:", "Mobile:", "Liên hệ:", etc.
  str = str.replace(PREFIX_CLEAN_REGEX, '').trim();

  // 2. If starts with standard international prefix 00 (e.g. 0084, 001), convert to +
  if (/^00\d+/.test(str)) {
    str = '+' + str.slice(2);
  }

  // 3. Detect and remove international trunk zero: e.g. +61 (0) 412 345 678 -> +61 412 345 678, +44 (0) 20 -> +44 20
  str = str.replace(/(\+\d{1,4})\s*\([0oO]\)\s*/g, '$1');
  str = str.replace(/(\+\d{1,4})\s*-\s*\([0oO]\)\s*/g, '$1');

  // 4. Check leading plus
  const hasLeadingPlus = str.startsWith('+');

  // 5. Remove formatting symbols: ., -, (, ), [, ], /, \, _, spaces, etc.
  const digitsOnly = str.replace(/[^\d]/g, '');

  if (hasLeadingPlus) {
    return `+${digitsOnly}`;
  }

  return digitsOnly;
}

/**
 * Known Major ITU Calling Codes (without '+') and their typical national digit lengths
 * To help auto-detect international numbers pasted without the '+' sign in Excel
 * E.g., 821098765432 (KR), 14155552671 (US), 6591234567 (SG), 819012345678 (JP), 33612345678 (FR), etc.
 */
const ITU_KNOWN_PREFIXES: Array<{ prefix: string; country: CountryCode; minLen: number; maxLen: number }> = [
  { prefix: '84', country: 'VN', minLen: 10, maxLen: 12 }, // Vietnam
  { prefix: '1', country: 'US', minLen: 11, maxLen: 11 },   // USA / Canada (1 + 10 digits)
  { prefix: '65', country: 'SG', minLen: 10, maxLen: 10 },  // Singapore (65 + 8 digits)
  { prefix: '81', country: 'JP', minLen: 11, maxLen: 12 },  // Japan (81 + 9/10 digits)
  { prefix: '82', country: 'KR', minLen: 11, maxLen: 12 },  // Korea (82 + 9/10 digits)
  { prefix: '44', country: 'GB', minLen: 11, maxLen: 12 },  // UK (44 + 10 digits)
  { prefix: '33', country: 'FR', minLen: 11, maxLen: 11 },  // France (33 + 9 digits)
  { prefix: '49', country: 'DE', minLen: 11, maxLen: 13 },  // Germany (49 + 10/11 digits)
  { prefix: '61', country: 'AU', minLen: 11, maxLen: 11 },  // Australia (61 + 9 digits)
  { prefix: '86', country: 'CN', minLen: 13, maxLen: 13 },  // China (86 + 11 digits)
  { prefix: '886', country: 'TW', minLen: 11, maxLen: 12 }, // Taiwan (886 + 9 digits)
  { prefix: '852', country: 'HK', minLen: 11, maxLen: 11 }, // Hong Kong (852 + 8 digits)
  { prefix: '66', country: 'TH', minLen: 11, maxLen: 11 },  // Thailand (66 + 9 digits)
  { prefix: '60', country: 'MY', minLen: 11, maxLen: 12 },  // Malaysia (60 + 9/10 digits)
  { prefix: '62', country: 'ID', minLen: 11, maxLen: 13 },  // Indonesia (62 + 9/11 digits)
  { prefix: '63', country: 'PH', minLen: 12, maxLen: 12 },  // Philippines (63 + 10 digits)
  { prefix: '91', country: 'IN', minLen: 12, maxLen: 12 },  // India (91 + 10 digits)
];

/**
 * STEP 3: Auto-detect & Normalize Missing Plus or Leading Zero Dropped by Excel
 */
export function resolveNumberPrefixes(cleanedStr: string): string {
  if (!cleanedStr) return '';

  // Case A: Already has '+' prefix (International explicit)
  if (cleanedStr.startsWith('+')) {
    // If has international trunk zero like +610412345678 or +4402079460912, strip the 0 after country code
    for (const item of ITU_KNOWN_PREFIXES) {
      if (cleanedStr.startsWith(`+${item.prefix}0`)) {
        // e.g. +4402079460912 -> +442079460912
        return `+${item.prefix}${cleanedStr.slice(item.prefix.length + 2)}`;
      }
    }
    return cleanedStr;
  }

  // Case B: Starts with '0' (Domestic VN or standard national)
  if (cleanedStr.startsWith('0')) {
    // 10-digit Vietnamese mobile e.g. 0918987654 -> +84918987654
    if (cleanedStr.length === 10 && /^0[35789]\d{8}$/.test(cleanedStr)) {
      return `+84${cleanedStr.slice(1)}`;
    }
    // 11-digit Vietnamese landline e.g. 02431234567 -> +842431234567
    if (cleanedStr.length === 11 && /^02[48]\d{8}$/.test(cleanedStr)) {
      return `+84${cleanedStr.slice(1)}`;
    }
    // Other 10-11 digit starting with 0
    if (cleanedStr.length >= 10 && cleanedStr.length <= 11) {
      return `+84${cleanedStr.slice(1)}`;
    }
  }

  // Case C: Excel Leading Zero Loss for Vietnamese Mobile (9 digits, e.g. 918987654 -> +84918987654)
  if (cleanedStr.length === 9 && /^[35789]\d{8}$/.test(cleanedStr)) {
    return `+84${cleanedStr}`;
  }

  // Case D: Excel Leading Zero Loss for Vietnamese Landline (10 digits starting with 24 or 28, e.g. 2431234567)
  if (cleanedStr.length === 10 && /^2[48]\d{8}$/.test(cleanedStr)) {
    return `+84${cleanedStr}`;
  }

  // Case E: Missing '+' with ITU Country Code (e.g. 84918987654, 821098765432, 14155552671, 6591234567)
  for (const item of ITU_KNOWN_PREFIXES) {
    if (cleanedStr.startsWith(item.prefix)) {
      const len = cleanedStr.length;
      if (len >= item.minLen && len <= item.maxLen) {
        // Strip trunk zero if present: e.g. 4402079460912 -> 44 + 2079460912
        if (cleanedStr.slice(item.prefix.length).startsWith('0')) {
          return `+${item.prefix}${cleanedStr.slice(item.prefix.length + 1)}`;
        }
        return `+${cleanedStr}`;
      }
    }
  }

  return cleanedStr;
}

/**
 * STEP 4 & 5: Universal E.164 Single Number Normalizer
 * Enforces E.164 format: +[CountryCode][AreaCode][SubscriberNumber]
 */
export function normalizeSinglePhoneNumber(
  singlePhoneRaw: string | number | null | undefined,
  defaultCountry: CountryCode = 'VN'
): NormalizedPhoneNumber {
  const raw = singlePhoneRaw !== null && singlePhoneRaw !== undefined ? String(singlePhoneRaw).trim() : '';

  if (!raw) {
    return {
      raw: '',
      cleaned: '',
      isValid: false,
      isVietnamese: false,
      errorReason: 'EMPTY_INPUT',
    };
  }

  // Check if string has invalid alphabetic characters (e.g. "0977-KHONG-CO", "N/A", "Chưa có")
  const rawWithoutPrefix = raw.replace(PREFIX_CLEAN_REGEX, '').trim();
  if (/[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]/.test(rawWithoutPrefix)) {
    return {
      raw,
      cleaned: raw,
      isValid: false,
      isVietnamese: false,
      errorReason: 'INVALID_PHONE_FORMAT',
    };
  }

  // Step 1: Sanitize raw string
  const cleaned = sanitizeRawPhoneString(raw);

  // Step 3: Resolve prefixes (E.164, missing +, leading zero)
  const resolved = resolveNumberPrefixes(cleaned);

  // Parse with libphonenumber-js
  try {
    let parsed: PhoneNumber | undefined;

    if (resolved.startsWith('+')) {
      parsed = parsePhoneNumberWithError(resolved);
    } else {
      parsed = parsePhoneNumberWithError(resolved, defaultCountry);
    }

    if (parsed && parsed.isValid()) {
      const e164 = parsed.format('E.164'); // e.g. "+84918987654", "+14155552671"
      const e164DigitsOnly = e164.replace(/[^\d]/g, ''); // "84918987654", "14155552671"
      const national = parsed.format('NATIONAL'); // e.g. "091 898 76 54"
      const international = parsed.format('INTERNATIONAL'); // e.g. "+84 918 987 654"
      const country = parsed.country || defaultCountry;
      const isVietnamese = country === 'VN';
      const countryCallingCode = `+${parsed.countryCallingCode}`;
      const countryFlag = getCountryFlagEmoji(country);
      const countryName = getCountryNameVi(country);

      // Step 5: OTT & Direct Action Links
      const whatsappLink = `https://wa.me/${e164DigitsOnly}`;
      const telLink = `tel:${e164}`;
      const zaloLink = isVietnamese 
        ? `https://zalo.me/${national.replace(/\D/g, '')}` 
        : `https://zalo.me/${e164DigitsOnly}`;

      // Line type detection
      const type = parsed.getType();
      let numberType: 'MOBILE' | 'FIXED_LINE' | 'VOIP' | 'UNKNOWN' = 'UNKNOWN';
      if (type === 'MOBILE') numberType = 'MOBILE';
      else if (type === 'FIXED_LINE') numberType = 'FIXED_LINE';
      else if (type === 'VOIP') numberType = 'VOIP';

      return {
        raw,
        cleaned: resolved,
        isValid: true,
        isVietnamese,
        e164,
        e164DigitsOnly,
        national,
        international,
        country,
        countryName,
        countryFlag,
        countryCallingCode,
        numberType,
        whatsappLink,
        telLink,
        zaloLink,
      };
    } else {
      return {
        raw,
        cleaned: resolved || cleaned,
        isValid: false,
        isVietnamese: false,
        errorReason: 'INVALID_PHONE_FORMAT',
      };
    }
  } catch (error) {
    let reason = 'INVALID_PHONE_FORMAT';
    if (error instanceof ParseError) {
      if (error.message === 'TOO_SHORT') reason = 'TOO_SHORT';
      else if (error.message === 'TOO_LONG') reason = 'TOO_LONG';
      else if (error.message === 'INVALID_COUNTRY') reason = 'INVALID_COUNTRY_CODE';
      else reason = 'INVALID_PHONE_FORMAT';
    }
    return {
      raw,
      cleaned: resolved || cleaned,
      isValid: false,
      isVietnamese: false,
      errorReason: reason,
    };
  }
}

/**
 * STEP 2: Multi-Number Splitting (Tách Ô Chứa Nhiều Số Điện Thoại)
 * Handles delimiters: "/", "\", ",", ";", "|", " - ", " hoặc ", " or ", " và ", " and ", "\n", "\r"
 * Splits into Primary Phone and Secondary Phone, normalizing each independently.
 */
export function normalizePhoneField(
  rawInput: string | number | null | undefined,
  defaultCountry: CountryCode = 'VN'
): PhoneFieldNormalizationResult {
  const rawStr = rawInput !== null && rawInput !== undefined ? String(rawInput).trim() : '';

  if (!rawStr) {
    const emptyResult: NormalizedPhoneNumber = {
      raw: '',
      cleaned: '',
      isValid: false,
      isVietnamese: false,
      errorReason: 'EMPTY_INPUT',
    };
    return {
      rawInput: '',
      hasMultiple: false,
      primary: emptyResult,
      allNumbers: [emptyResult],
    };
  }

  // Delimiters for multiple numbers
  const multiSplitRegex = /[\n\r/\\,;|]|\s+hoặc\s+|\s+or\s+|\s+và\s+|\s+and\s+|\s+-\s+/i;
  const segments = rawStr
    .split(multiSplitRegex)
    .map(s => s.trim())
    .filter(Boolean);

  if (segments.length <= 1) {
    const primary = normalizeSinglePhoneNumber(rawStr, defaultCountry);
    return {
      rawInput: rawStr,
      hasMultiple: false,
      primary,
      allNumbers: [primary],
    };
  }

  const allNumbers = segments.map(seg => normalizeSinglePhoneNumber(seg, defaultCountry));
  // Pick the first valid or first number as primary
  const primary = allNumbers.find(n => n.isValid) || allNumbers[0];
  const secondary = allNumbers.find(n => n !== primary);

  return {
    rawInput: rawStr,
    hasMultiple: true,
    primary,
    secondary,
    allNumbers,
  };
}

/**
 * Batch Phone Health Analyzer across entire dataset
 */
export interface PhoneHealthAuditReport {
  totalScanned: number;
  totalValid: number;
  totalInvalid: number;
  totalMissing: number;
  totalInternational: number;
  totalVietnamese: number;
  totalMultiPhone: number;
  invalidItems: Array<{
    id: string;
    entityType: 'speaker' | 'enterprise' | 'guest';
    name: string;
    rawPhone: string;
    errorReason: string;
    suggestion?: string;
  }>;
  validPercentage: number;
}

export function auditPhoneHealth(
  speakers: Array<{ id: string; fullName?: string; name?: string; phone?: string }>,
  enterprises: Array<{ id: string; name?: string; contactPhone?: string }>,
  guests: Array<{ id: string; fullName?: string; name?: string; phone?: string }>
): PhoneHealthAuditReport {
  let totalScanned = 0;
  let totalValid = 0;
  let totalInvalid = 0;
  let totalMissing = 0;
  let totalInternational = 0;
  let totalVietnamese = 0;
  let totalMultiPhone = 0;

  const invalidItems: PhoneHealthAuditReport['invalidItems'] = [];

  const processEntity = (
    id: string,
    entityType: 'speaker' | 'enterprise' | 'guest',
    name: string,
    phoneStr?: string
  ) => {
    totalScanned++;
    if (!phoneStr || !String(phoneStr).trim()) {
      totalMissing++;
      return;
    }

    const res = normalizePhoneField(phoneStr);
    if (res.hasMultiple) totalMultiPhone++;

    if (res.primary.isValid) {
      totalValid++;
      if (res.primary.isVietnamese) totalVietnamese++;
      else totalInternational++;
    } else {
      totalInvalid++;
      invalidItems.push({
        id,
        entityType,
        name: name || 'Chưa đặt tên',
        rawPhone: phoneStr,
        errorReason: res.primary.errorReason || 'INVALID_PHONE_FORMAT',
        suggestion: res.primary.cleaned ? `Thử chuẩn hóa: ${res.primary.cleaned}` : undefined,
      });
    }
  };

  speakers.forEach(s => processEntity(s.id, 'speaker', s.fullName || s.name || '', s.phone));
  enterprises.forEach(e => processEntity(e.id, 'enterprise', e.name || '', e.contactPhone));
  guests.forEach(g => processEntity(g.id, 'guest', g.fullName || g.name || '', g.phone));

  const validPercentage = totalScanned > 0 ? Math.round((totalValid / totalScanned) * 100) : 100;

  return {
    totalScanned,
    totalValid,
    totalInvalid,
    totalMissing,
    totalInternational,
    totalVietnamese,
    totalMultiPhone,
    invalidItems,
    validPercentage,
  };
}
