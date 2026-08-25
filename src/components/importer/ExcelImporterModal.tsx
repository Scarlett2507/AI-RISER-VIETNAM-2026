import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Settings2, 
  Save, 
  Sparkles, 
  HelpCircle,
  FileCheck,
  RefreshCcw,
  SlidersHorizontal,
  Layers,
  GraduationCap,
  Building2,
  Ticket,
  Calendar,
  FolderSync,
  ArrowRightLeft
} from 'lucide-react';
import { EntityType, MappingRule, MappingTemplate, Speaker, Enterprise, Guest, EventItem } from '../../types';
import { 
  CANONICAL_FIELDS, 
  autoMatchHeader, 
  applyFieldTransform, 
  normalizeEmail, 
  normalizeVietnamesePhone, 
  ensureArray, 
  extractErrorsAndCleanTags,
  normalizeEnterpriseTier,
  normalizeEnterpriseSponsorship,
  normalizeGuestTicketType,
  normalizeGuestInterestTopics,
  extractSponsorshipAmountFromRow,
  parseSponsorshipAmount
} from '../../services/normalizer';
import { 
  parseWorkbookIntoCategories, 
  getCategoryLabel, 
  ParsedCategorySection,
  splitMixedRowsIntoCategories,
  detectRowEntityType,
  extractEmbeddedEventsFromRows
} from '../../services/sheetParser';
import { StorageService } from '../../services/storage';
import { AiService } from '../../services/aiService';

interface ExcelImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntityType?: EntityType;
  onImportComplete?: (
    entityType: EntityType | 'all', 
    newRecords: Array<Speaker | Enterprise | Guest | EventItem>,
    summary: { total: number; inserted: number; updated: number; skipped: number }
  ) => void;
  onSaveData?: (
    newSpeakers: Speaker[],
    newEnterprises: Enterprise[],
    newGuests: Guest[],
    newEvents: EventItem[],
    savedTemplate?: MappingTemplate
  ) => void;
  existingData?: {
    speakers?: Speaker[];
    enterprises?: Enterprise[];
    guests?: Guest[];
    events?: EventItem[];
  };
  savedTemplates?: MappingTemplate[];
}

type WizardStep = 'upload' | 'mapping' | 'preview' | 'completed';

export interface CategoryImportSection {
  id: string;
  entityType: EntityType;
  title: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  mappingRules: MappingRule[];
  skippedBanners: string[];
  selectedTemplateId?: string;
}

export const ExcelImporterModal: React.FC<ExcelImporterModalProps> = ({
  isOpen,
  onClose,
  initialEntityType,
  onImportComplete,
  onSaveData,
  existingData,
  savedTemplates,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [defaultEntityType, setDefaultEntityType] = useState<EntityType>(initialEntityType || 'speaker');
  const [fileName, setFileName] = useState<string>('');
  
  // Multi-category sections
  const [sections, setSections] = useState<CategoryImportSection[]>([]);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);

  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [saveTemplateName, setSaveTemplateName] = useState<string>('');
  const [shouldSaveTemplate, setShouldSaveTemplate] = useState<boolean>(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'add'>('update');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const [importSummary, setImportSummary] = useState<{ 
    total: number; 
    inserted: number; 
    updated: number; 
    skipped: number;
    breakdown: Record<string, { total: number; inserted: number; updated: number; skipped: number; title: string }>;
  } | null>(null);

  const [isAiMappingLoading, setIsAiMappingLoading] = useState<boolean>(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  const activeSection: CategoryImportSection | undefined = sections[activeSectionIndex];

  useEffect(() => {
    if (isOpen) {
      setTemplates(StorageService.getTemplates());
      if (initialEntityType) {
        setDefaultEntityType(initialEntityType);
      }
      resetState();
    }
  }, [isOpen, initialEntityType]);

  const resetState = () => {
    setCurrentStep('upload');
    setFileName('');
    setSections([]);
    setActiveSectionIndex(0);
    setSaveTemplateName('');
    setShouldSaveTemplate(false);
    setImportSummary(null);
    setIsAiMappingLoading(false);
    setAiSuccessMessage(null);
  };

  // Helper to build initial mapping rules for a set of headers and entity type
  const buildInitialRules = (headers: string[], rows: Record<string, unknown>[], entityType: EntityType): MappingRule[] => {
    return headers.map(header => {
      const sampleValues = rows.slice(0, 3).map(row => String(row[header] || '')).filter(Boolean);
      const match = autoMatchHeader(header, entityType);
      return {
        sourceColumn: header,
        targetField: match.targetField,
        sampleValues,
        confidence: match.confidence,
        transform: match.transform,
        isIgnored: match.confidence === 0,
      };
    });
  };

  // AI auto map for current active section or all sections
  const handleAiAutoMap = async () => {
    if (!activeSection || activeSection.headers.length === 0) return;
    setIsAiMappingLoading(true);
    setAiSuccessMessage(null);
    try {
      const result = await AiService.suggestColumnMappings(
        activeSection.headers,
        activeSection.rows.slice(0, 3),
        activeSection.entityType
      );

      if (result.success && Array.isArray(result.mappings)) {
        setSections(prevSections =>
          prevSections.map((sec, idx) => {
            if (idx !== activeSectionIndex) return sec;
            const updatedRules = sec.mappingRules.map(rule => {
              const match = result.mappings?.find(m => m.sourceColumn === rule.sourceColumn);
              if (match && match.targetField) {
                return {
                  ...rule,
                  targetField: match.targetField,
                  confidence: match.confidence || 95,
                  transform: (match.suggestedTransform as any) || rule.transform,
                  isIgnored: false,
                };
              }
              return rule;
            });
            return { ...sec, mappingRules: updatedRules };
          })
        );
        setAiSuccessMessage(`Gemini 3.7 Flash đã nhận diện ngữ cảnh mục "${activeSection.title}" và hoàn tất ánh xạ cột thông minh!`);
        setTimeout(() => setAiSuccessMessage(null), 4000);
      } else {
        setAiSuccessMessage('Đã hoàn tất kiểm tra quy tắc ánh xạ tiêu chuẩn.');
        setTimeout(() => setAiSuccessMessage(null), 3000);
      }
    } catch (e) {
      console.warn('AI mapping failed:', e);
    } finally {
      setIsAiMappingLoading(false);
    }
  };

  // Consolidate sections of the same entity type into single unified categories and ensure 4 canonical categories
  const consolidateCategoryImportSections = (rawSections: CategoryImportSection[]): CategoryImportSection[] => {
    if (!rawSections || rawSections.length === 0) return [];

    const map = new Map<EntityType, {
      sheetNames: string[];
      headers: Set<string>;
      rows: Record<string, unknown>[];
      skippedBanners: string[];
    }>();

    const allRows: Record<string, unknown>[] = [];
    const allHeaders: string[] = [];

    rawSections.forEach(sec => {
      allRows.push(...sec.rows);
      allHeaders.push(...sec.headers);

      if (!map.has(sec.entityType)) {
        map.set(sec.entityType, {
          sheetNames: [sec.sheetName],
          headers: new Set(sec.headers),
          rows: [...sec.rows],
          skippedBanners: [...sec.skippedBanners]
        });
      } else {
        const item = map.get(sec.entityType)!;
        if (!item.sheetNames.includes(sec.sheetName)) {
          item.sheetNames.push(sec.sheetName);
        }
        sec.headers.forEach(h => item.headers.add(h));
        item.rows.push(...sec.rows);
        item.skippedBanners.push(...sec.skippedBanners);
      }
    });

    // If no 'event' category, check if events can be extracted from all rows
    if (!map.has('event')) {
      const extractedEvents = extractEmbeddedEventsFromRows(Array.from(new Set(allHeaders)), allRows);
      if (extractedEvents.length > 0) {
        const evtHeaders = Object.keys(extractedEvents[0]);
        map.set('event', {
          sheetNames: ['Sự kiện liên kết'],
          headers: new Set(evtHeaders),
          rows: extractedEvents,
          skippedBanners: []
        });
      }
    }

    const canonicalOrder: EntityType[] = ['speaker', 'enterprise', 'guest', 'event'];
    const result: CategoryImportSection[] = [];

    canonicalOrder.forEach((type, idx) => {
      if (map.has(type)) {
        const item = map.get(type)!;
        const headersArr = Array.from(item.headers);
        const displayName = item.sheetNames.length > 1 ? item.sheetNames.join(', ') : item.sheetNames[0];
        result.push({
          id: `sec-${type}-${Date.now()}-${idx}`,
          entityType: type,
          title: getCategoryLabel(type),
          sheetName: displayName,
          headers: headersArr,
          rows: item.rows,
          skippedBanners: item.skippedBanners,
          mappingRules: buildInitialRules(headersArr, item.rows, type)
        });
      }
    });

    return result;
  };

  // Auto-split sections into distinct categories based on row semantics and consolidate
  const autoSplitSections = (rawSections: CategoryImportSection[]): CategoryImportSection[] => {
    const splitList: CategoryImportSection[] = [];

    rawSections.forEach(sec => {
      const mixed = splitMixedRowsIntoCategories(sec.headers, sec.rows, sec.entityType);
      if (mixed) {
        (Object.keys(mixed) as EntityType[]).forEach((type, idx) => {
          const typeRows = mixed[type] || [];
          if (typeRows.length > 0) {
            splitList.push({
              id: `sec-${type}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
              entityType: type,
              title: getCategoryLabel(type),
              sheetName: sec.sheetName.includes(getCategoryLabel(type))
                ? sec.sheetName
                : `${sec.sheetName} (${getCategoryLabel(type)})`,
              headers: sec.headers,
              rows: typeRows,
              skippedBanners: sec.skippedBanners,
              mappingRules: buildInitialRules(sec.headers, typeRows, type),
            });
          }
        });
      } else {
        splitList.push(sec);
      }
    });

    return consolidateCategoryImportSections(splitList);
  };

  // Handle file input with multi-category / multi-sheet detection
  const processFileData = (fileBuffer: ArrayBuffer, name: string) => {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const parsedSections = parseWorkbookIntoCategories(workbook, defaultEntityType);

      if (parsedSections.length === 0) {
        alert('Tệp Excel không chứa bảng dữ liệu hợp lệ hoặc tệp rỗng.');
        return;
      }

      const formattedSections: CategoryImportSection[] = parsedSections.map(sec => ({
        id: sec.id,
        entityType: sec.entityType,
        title: sec.title,
        sheetName: sec.sheetName,
        headers: sec.headers,
        rows: sec.rows,
        skippedBanners: sec.skippedBannerRows || [],
        mappingRules: buildInitialRules(sec.headers, sec.rows, sec.entityType),
      }));

      // Automatically divide mixed rows into dedicated category sections (Diễn giả, Doanh nghiệp, Khách mời)
      const finalSections = autoSplitSections(formattedSections);

      setSections(finalSections);
      setActiveSectionIndex(0);
      setFileName(name);
      setCurrentStep('mapping');
    } catch (err) {
      console.error(err);
      alert('Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng tệp (.xlsx, .xls, .csv).');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        processFileData(event.target.result as ArrayBuffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Change entity type of a specific section
  const handleSectionTypeChange = (sectionIndex: number, newType: EntityType) => {
    setSections(prevSections =>
      prevSections.map((sec, idx) => {
        if (idx !== sectionIndex) return sec;
        const newRules = buildInitialRules(sec.headers, sec.rows, newType);
        return {
          ...sec,
          entityType: newType,
          title: getCategoryLabel(newType),
          mappingRules: newRules,
        };
      })
    );
  };

  // Load Comprehensive Multi-Category Messy Test Suite (Speakers, Enterprises, Guests)
  const loadComprehensiveMultiCategoryTestSuite = () => {
    const sampleName = 'BO_DU_LIEU_TONG_HOP_DA_MUC_FULL_CASES.xlsx';
    
    // 1. Speakers dataset
    const speakerData = [
      {
        'Họ & Tên Diễn Giả': 'ts. đỗ quang vinh',
        'Mail liên hệ': 'vinh.do@vng.com.vn',
        'Số ĐT Quốc tế & VN': '84912776655',
        'Đơn vị công tác': 'VNG Games & AI Studio',
        'Vị trí / Chức danh': 'Head of AI Engineering',
        'Lĩnh vực chuyên môn': 'AI Agent, Gaming AI, Computer Vision',
        'Đánh giá sao (Rating)': 4.9,
        'Thành phố': 'TP. Hồ Chí Minh',
        'Bộ phận phụ trách (Tags)': 'Ban Nội dung, Ban Kỹ thuật',
        'Ghi chú': 'Đã liên hệ sơ bộ, ưu tiên mời phát biểu phiên chuyên đề GenAI',
      },
      {
        'Họ & Tên Diễn Giả': 'Dr. Alexander Vuong',
        'Mail liên hệ': 'alex.vuong@stanford.edu',
        'Số ĐT Quốc tế & VN': '+1 (415) 555-2671',
        'Đơn vị công tác': 'Stanford AI Lab',
        'Vị trí / Chức danh': 'Distinguished AI Scientist',
        'Lĩnh vực chuyên môn': 'Large Language Models, Robotics, Multi-agent Systems',
        'Đánh giá sao (Rating)': 5.0,
        'Thành phố': 'San Francisco, USA',
        'Bộ phận phụ trách (Tags)': 'VIP, Ban Cố vấn, Quốc tế',
        'Ghi chú': 'Diễn giả danh dự báo cáo Keynote trực tuyến từ Hoa Kỳ',
      },
      {
        'Họ & Tên Diễn Giả': 'HOÀNG THU HÀ',
        'Mail liên hệ': 'HA.HOANG@TECHCOMBANK.COM.VN',
        'Số ĐT Quốc tế & VN': '0988-123-999',
        'Đơn vị công tác': 'Ngân hàng Techcombank',
        'Vị trí / Chức danh': 'Phó Giám đốc Khối Dữ liệu',
        'Lĩnh vực chuyên môn': 'Data Governance, Customer Analytics',
        'Đánh giá sao (Rating)': 4.7,
        'Thành phố': 'Hà Nội',
        'Bộ phận phụ trách (Tags)': 'Ban Đối ngoại, Ban Nội dung',
        'Ghi chú': 'Cần gửi trước bản dự thảo câu hỏi thảo luận bàn tròn',
      },
      {
        'Họ & Tên Diễn Giả': 'TS. Lê Hoàng Nam',
        'Mail liên hệ': 'nam.le@vinai.io',
        'Số ĐT Quốc tế & VN': '0912 345 678',
        'Đơn vị công tác': 'VinAI Research',
        'Vị trí / Chức danh': 'Giám đốc Nghiên cứu AI',
        'Lĩnh vực chuyên môn': 'Trí tuệ nhân tạo, Deep Learning',
        'Đánh giá sao (Rating)': 5.0,
        'Thành phố': 'Hà Nội',
        'Bộ phận phụ trách (Tags)': 'Ban Nội dung, Ban Cố vấn, VIP',
        'Ghi chú': 'Bản ghi ứng viên trùng lặp với dữ liệu diễn giả hiện có',
      },
      {
        'Họ & Tên Diễn Giả': 'Prof. Lim Wei Zhang',
        'Mail liên hệ': 'lim.wz@nus.edu.sg',
        'Số ĐT Quốc tế & VN': '+65 6789 0123',
        'Đơn vị công tác': 'National University of Singapore (NUS)',
        'Vị trí / Chức danh': 'Professor in Quantum Computing',
        'Lĩnh vực chuyên môn': 'Quantum AI, Quantum Machine Learning',
        'Đánh giá sao (Rating)': 4.9,
        'Thành phố': 'Singapore',
        'Bộ phận phụ trách (Tags)': 'Ban Kỹ thuật, VIP, Quốc tế',
        'Ghi chú': 'Chuyên gia khu vực APAC tham gia phiên tọa đàm',
      }
    ];

    // 2. Enterprises dataset
    const enterpriseData = [
      {
        'Tên Doanh Nghiệp': 'TẬP ĐOÀN VNG',
        'Lĩnh vực hoạt động': 'Công nghệ & Game',
        'Người liên hệ hợp tác': 'lê minh quân',
        'Email liên hệ': 'quan.lm@vng.com.vn',
        'Hotline / Số điện thoại': '028 3962 3888',
        'Hạng đối tác tài trợ': 'Diamond',
        'Quy mô công ty': 'Trên 1000',
        'Trang web': 'https://vng.com.vn',
        'Trụ sở chính': 'TP. Hồ Chí Minh',
        'Ban phụ trách (Tags)': 'Ban Đối ngoại, Ban Tài chính',
        'Ghi chú': 'Tài trợ kim cương cho hội thảo AI và gian hàng triển lãm chính',
      },
      {
        'Tên Doanh Nghiệp': 'Tập đoàn FPT',
        'Lĩnh vực hoạt động': 'Công nghệ thông tin & Viễn thông',
        'Người liên hệ hợp tác': 'Nguyễn Bích Thủy',
        'Email liên hệ': 'thuy.nb@fpt.com.vn',
        'Hotline / Số điện thoại': '024 7300 7300',
        'Hạng đối tác tài trợ': 'Strategic',
        'Quy mô công ty': 'Trên 1000',
        'Trang web': 'https://fpt.com.vn',
        'Trụ sở chính': 'Hà Nội',
        'Ban phụ trách (Tags)': 'Ban Đối ngoại, Ban Tổ chức',
        'Ghi chú': 'Đối tác chiến lược toàn diện, duyệt vị trí logo chính',
      },
      {
        'Tên Doanh Nghiệp': 'Trung tâm Không gian Mạng Viettel',
        'Lĩnh vực hoạt động': 'Cybersecurity & Cloud AI',
        'Người liên hệ hợp tác': 'Phạm Thế Vinh',
        'Email liên hệ': 'vinhpt@viettel.com.vn',
        'Hotline / Số điện thoại': '024 6255 6789',
        'Hạng đối tác tài trợ': 'Gold',
        'Quy mô công ty': '200 - 1000',
        'Trang web': 'https://viettel.vn',
        'Trụ sở chính': 'Hà Nội',
        'Ban phụ trách (Tags)': 'Ban Kỹ thuật, Ban Đối ngoại',
        'Ghi chú': 'Đăng ký khu vực demo giải pháp bảo mật đám mây',
      },
      {
        'Tên Doanh Nghiệp': 'Ngân hàng Techcombank',
        'Lĩnh vực hoạt động': 'Tài chính Ngân hàng & Fintech',
        'Người liên hệ hợp tác': 'Trần Phương Nga',
        'Email liên hệ': 'nga.tp@techcombank.com.vn',
        'Hotline / Số điện thoại': '024 3944 6368',
        'Hạng đối tác tài trợ': 'Gold',
        'Quy mô công ty': 'Trên 1000',
        'Trang web': 'https://techcombank.com',
        'Trụ sở chính': 'Hà Nội',
        'Ban phụ trách (Tags)': 'Ban Tài trợ, Ban Lễ tân',
        'Ghi chú': 'Tài trợ phiên chuyên đề Fintech & Chuyển đổi số',
      }
    ];

    // 3. Guests dataset
    const guestData = [
      {
        'Họ tên Khách mời': 'trần đức bảo',
        'Hòm thư đăng ký': 'bao.td@shopee.vn',
        'Số điện thoại': '0903889900',
        'Cơ quan / Đơn vị': 'Shopee Vietnam',
        'Chức danh': 'Lead Product Manager',
        'Hạng vé': 'VIP Pass',
        'Chủ đề quan tâm': 'E-commerce AI, Thanh toán số',
        'Tỉnh thành': 'TP. Hồ Chí Minh',
        'Bộ phận phụ trách (Tags)': 'Ban Khách mời, VIP',
        'Ghi chú': 'Đã gửi thư mời qua email và xác nhận tham dự',
      },
      {
        'Họ tên Khách mời': 'Vũ Thị Minh Hạnh',
        'Hòm thư đăng ký': 'hanh.vm@bidv.com.vn',
        'Số điện thoại': '0978 112 334',
        'Cơ quan / Đơn vị': 'Ngân hàng BIDV',
        'Chức danh': 'Trưởng phòng CNTT',
        'Hạng vé': 'Standard',
        'Chủ đề quan tâm': 'Chuyển đổi số Ngân hàng',
        'Tỉnh thành': 'Hà Nội',
        'Bộ phận phụ trách (Tags)': 'Ban Khách mời, Ban Lễ tân',
        'Ghi chú': 'Cần đón tiếp tại bàn check-in tầng 1',
      },
      {
        'Họ tên Khách mời': 'Nguyễn Hải Đăng',
        'Hòm thư đăng ký': 'dangnh@momo.vn',
        'Số điện thoại': '0918 556 789',
        'Cơ quan / Đơn vị': 'Ví MoMo (M-Service)',
        'Chức danh': 'Senior AI Product Lead',
        'Hạng vé': 'VIP Pass',
        'Chủ đề quan tâm': 'AI Banking, Fraud Detection',
        'Tỉnh thành': 'TP. Hồ Chí Minh',
        'Bộ phận phụ trách (Tags)': 'Ban Khách mời, VIP Pass',
        'Ghi chú': 'Khách mời VIP được bố trí hàng ghế danh dự hàng đầu',
      },
      {
        'Họ tên Khách mời': 'Phạm Quỳnh Nga',
        'Hòm thư đăng ký': 'nga.pq@vietnamnet.vn',
        'Số điện thoại': '0983 456 123',
        'Cơ quan / Đơn vị': 'Báo VietNamNet',
        'Chức danh': 'Phóng viên CNTT & Viễn thông',
        'Hạng vé': 'Press / Media',
        'Chủ đề quan tâm': 'Truyền thông Báo chí, Sự kiện AI',
        'Tỉnh thành': 'Hà Nội',
        'Bộ phận phụ trách (Tags)': 'Ban Truyền thông, Báo chí',
        'Ghi chú': 'Thẻ nhà báo tác nghiệp tại phòng họp báo tầng 2',
      }
    ];

    // 4. Events dataset
    const eventData = [
      {
        'Tên sự kiện / Chương trình': 'Vietnam AI & DeepTech Forum 2025',
        'Mã sự kiện': 'EVT-2025-01',
        'Thời gian tổ chức': '2025-09-15',
        'Địa điểm tổ chức': 'Trung tâm Hội nghị Quốc gia, Hà Nội',
        'Loại hình sự kiện': 'Hội thảo Quốc tế',
        'Chủ đề trọng tâm': 'Generative AI & Agentic Systems',
        'Số lượng khách tham dự': 800,
        'Ngân sách tổ chức (VNĐ)': 750000000,
        'Trạng thái': 'Sắp diễn ra',
        'Đối tượng mục tiêu': 'CTO, Kỹ sư AI, Nhà đầu tư công nghệ',
        'Bộ phận chủ trì (Tags)': 'Ban Tổ chức, Ban Kỹ thuật',
        'Ghi chú': 'Sân khấu chính 3 màn hình LED cong, demo AI Agent',
        'Mô tả tóm tắt': 'Diễn đàn cấp cao thường niên về Trí tuệ nhân tạo và các công nghệ đột phá tại Việt Nam',
      },
      {
        'Tên sự kiện / Chương trình': 'Fintech & Open Banking Summit',
        'Mã sự kiện': 'EVT-2025-02',
        'Thời gian tổ chức': '2025-10-22',
        'Địa điểm tổ chức': 'White Palace, TP. Hồ Chí Minh',
        'Loại hình sự kiện': 'Diễn đàn Doanh nghiệp',
        'Chủ đề trọng tâm': 'Chuyển đổi số Ngân hàng & Thanh toán số',
        'Số lượng khách tham dự': 600,
        'Ngân sách tổ chức (VNĐ)': 500000000,
        'Trạng thái': 'Sắp diễn ra',
        'Đối tượng mục tiêu': 'Lãnh đạo Ngân hàng, Doanh nghiệp Fintech',
        'Bộ phận chủ trì (Tags)': 'Ban Đối ngoại, Ban Nội dung',
        'Ghi chú': 'Có 4 phiên chuyên đề song song',
        'Mô tả tóm tắt': 'Hội nghị quy tụ các tổ chức tài chính và startup Fintech hàng đầu khu vực',
      }
    ];

    const speakerHeaders = Object.keys(speakerData[0]);
    const enterpriseHeaders = Object.keys(enterpriseData[0]);
    const guestHeaders = Object.keys(guestData[0]);
    const eventHeaders = Object.keys(eventData[0]);

    const formattedSections: CategoryImportSection[] = [
      {
        id: 'sec-speaker-0',
        entityType: 'speaker',
        title: getCategoryLabel('speaker'),
        sheetName: 'Sheet_Diễn_Giả',
        headers: speakerHeaders,
        rows: speakerData,
        skippedBanners: ['Dòng tiêu đề mô tả kiểm thử đã được lọc bỏ'],
        mappingRules: buildInitialRules(speakerHeaders, speakerData, 'speaker'),
      },
      {
        id: 'sec-enterprise-1',
        entityType: 'enterprise',
        title: getCategoryLabel('enterprise'),
        sheetName: 'Sheet_Doanh_Nghiệp',
        headers: enterpriseHeaders,
        rows: enterpriseData,
        skippedBanners: [],
        mappingRules: buildInitialRules(enterpriseHeaders, enterpriseData, 'enterprise'),
      },
      {
        id: 'sec-guest-2',
        entityType: 'guest',
        title: getCategoryLabel('guest'),
        sheetName: 'Sheet_Khách_Mời',
        headers: guestHeaders,
        rows: guestData,
        skippedBanners: [],
        mappingRules: buildInitialRules(guestHeaders, guestData, 'guest'),
      },
      {
        id: 'sec-event-3',
        entityType: 'event',
        title: getCategoryLabel('event'),
        sheetName: 'Sheet_Sự_Kiện',
        headers: eventHeaders,
        rows: eventData,
        skippedBanners: [],
        mappingRules: buildInitialRules(eventHeaders, eventData, 'event'),
      }
    ];

    setSections(formattedSections);
    setActiveSectionIndex(0);
    setFileName(sampleName);
    setCurrentStep('mapping');
  };

  // Load Single Preset Sample
  const loadSinglePresetSample = (type: EntityType) => {
    let sampleData: Record<string, unknown>[] = [];
    let sampleName = '';

    if (type === 'speaker') {
      sampleName = 'Danh_Sach_Dien_Gia_AI_Summit.xlsx';
      sampleData = [
        {
          'Họ & Tên Diễn Giả': 'ts. đỗ quang vinh',
          'Mail liên hệ': 'vinh.do@vng.com.vn',
          'Số ĐT Quốc tế & VN': '84912776655',
          'Đơn vị công tác': 'VNG Games & AI Studio',
          'Vị trí / Chức danh': 'Head of AI Engineering',
          'Lĩnh vực chuyên môn': 'AI Agent, Gaming AI, Computer Vision',
          'Đánh giá sao (Rating)': 4.9,
          'Thành phố': 'TP. Hồ Chí Minh',
          'Bộ phận phụ trách (Tags)': 'Ban Nội dung, Ban Kỹ thuật',
          'Ghi chú': 'Đã liên hệ sơ bộ, ưu tiên mời phát biểu phiên chuyên đề GenAI',
        },
        {
          'Họ & Tên Diễn Giả': 'Dr. Alexander Vuong',
          'Mail liên hệ': 'alex.vuong@stanford.edu',
          'Số ĐT Quốc tế & VN': '+1 (415) 555-2671',
          'Đơn vị công tác': 'Stanford AI Lab',
          'Vị trí / Chức danh': 'Distinguished AI Scientist',
          'Lĩnh vực chuyên môn': 'Large Language Models, Robotics, Multi-agent Systems',
          'Đánh giá sao (Rating)': 5.0,
          'Thành phố': 'San Francisco, USA',
          'Bộ phận phụ trách (Tags)': 'VIP, Ban Cố vấn, Quốc tế',
          'Ghi chú': 'Diễn giả danh dự báo cáo Keynote trực tuyến từ Hoa Kỳ',
        }
      ];
    } else if (type === 'enterprise') {
      sampleName = 'Danh_Sach_Doanh_Nghiep_Trien_Lam.xlsx';
      sampleData = [
        {
          'Tên Doanh Nghiệp': 'TẬP ĐOÀN VNG',
          'Lĩnh vực kinh doanh': 'Công nghệ & Game',
          'Người liên hệ': 'lê minh quân',
          'Email công ty': 'quan.lm@vng.com.vn',
          'Hotline': '028 3962 3888',
          'Hạng tài trợ': 'Diamond',
          'Quy mô nhân sự': 'Trên 1000',
          'Website': 'https://vng.com.vn',
          'Trụ sở': 'TP. Hồ Chí Minh',
          'Bộ phận phụ trách (Tags)': 'Ban Đối ngoại, Ban Tài chính',
          'Ghi chú': 'Tài trợ kim cương cho hội thảo AI',
        }
      ];
    } else if (type === 'guest') {
      sampleName = 'Danh_Sach_CheckIn_Khach_Moi.xlsx';
      sampleData = [
        {
          'Họ tên Khách mời': 'trần đức bảo',
          'Hòm thư đăng ký': 'bao.td@shopee.vn',
          'Số điện thoại': '0903889900',
          'Cơ quan / Đơn vị': 'Shopee Vietnam',
          'Chức danh': 'Lead Product Manager',
          'Hạng vé': 'VIP Pass',
          'Chủ đề quan tâm': 'E-commerce AI, Thanh toán số',
          'Tỉnh thành': 'TP. Hồ Chí Minh',
          'Bộ phận phụ trách (Tags)': 'Ban Khách mời, VIP',
          'Ghi chú': 'Đã gửi thư mời qua email và xác nhận tham dự',
        }
      ];
    } else {
      sampleName = 'Danh_Sach_Chuong_Trinh_Su_Kien.xlsx';
      sampleData = [
        {
          'Tên sự kiện / Chương trình': 'Vietnam AI & DeepTech Forum 2025',
          'Mã sự kiện': 'EVT-2025-01',
          'Thời gian tổ chức': '2025-09-15',
          'Địa điểm tổ chức': 'Trung tâm Hội nghị Quốc gia, Hà Nội',
          'Loại hình sự kiện': 'Hội thảo Quốc tế',
          'Chủ đề trọng tâm': 'Generative AI & Agentic Systems',
          'Số lượng khách tham dự': 800,
          'Ngân sách tổ chức (VNĐ)': 750000000,
          'Trạng thái': 'Sắp diễn ra',
          'Đối tượng mục tiêu': 'CTO, Kỹ sư AI, Nhà đầu tư công nghệ',
          'Bộ phận chủ trì (Tags)': 'Ban Tổ chức, Ban Kỹ thuật',
          'Ghi chú': 'Sân khấu chính 3 màn hình LED cong, demo AI Agent',
          'Mô tả tóm tắt': 'Diễn đàn cấp cao thường niên về Trí tuệ nhân tạo và các công nghệ đột phá tại Việt Nam',
        },
        {
          'Tên sự kiện / Chương trình': 'Fintech & Open Banking Summit',
          'Mã sự kiện': 'EVT-2025-02',
          'Thời gian tổ chức': '2025-10-22',
          'Địa điểm tổ chức': 'White Palace, TP. Hồ Chí Minh',
          'Loại hình sự kiện': 'Diễn đàn Doanh nghiệp',
          'Chủ đề trọng tâm': 'Chuyển đổi số Ngân hàng & Thanh toán số',
          'Số lượng khách tham dự': 600,
          'Ngân sách tổ chức (VNĐ)': 500000000,
          'Trạng thái': 'Sắp diễn ra',
          'Đối tượng mục tiêu': 'Lãnh đạo Ngân hàng, Doanh nghiệp Fintech',
          'Bộ phận chủ trì (Tags)': 'Ban Đối ngoại, Ban Nội dung',
          'Ghi chú': 'Có 4 phiên chuyên đề song song',
          'Mô tả tóm tắt': 'Hội nghị quy tụ các tổ chức tài chính và startup Fintech hàng đầu khu vực',
        }
      ];
    }

    const headers = Object.keys(sampleData[0]);
    const formattedSections: CategoryImportSection[] = [
      {
        id: `sec-${type}-0`,
        entityType: type,
        title: getCategoryLabel(type),
        sheetName: sampleName.replace('.xlsx', ''),
        headers,
        rows: sampleData,
        skippedBanners: [],
        mappingRules: buildInitialRules(headers, sampleData, type),
      }
    ];

    setSections(formattedSections);
    setActiveSectionIndex(0);
    setFileName(sampleName);
    setCurrentStep('mapping');
  };

  // Load Messy 1-Sheet Mixed Test Case (Exactly as user requested)
  const loadMessySingleSheetMixedSample = () => {
    const sampleName = 'BANG_EXCEL_LON_XON_15_DONG_4_MUC.xlsx';
    const messyRows: Record<string, unknown>[] = [
      {
        'Mã ID Thô': 'RAW-001',
        'thống': 'Diễn giả',
        'Hạng Vé Khách Mời': 'Speaker VIP',
        'Chủ Đề Sự Kiện': 'EVT2026-001: Hội thảo Toàn cảnh AI & Bán dẫn 2026',
        'Học hàm': 'TS.',
        'Họ và Tên (Thô)': 'ts. ruy-sheng',
        'Đơn vị': 'Đại học Bách Khoa Tokyo',
        'diện Liên hệ': '',
        'trí': 'Principal Scientist',
        'trợ': 'Hỗ trợ Vé MB & KS 5*',
        'Quy đổi': '15,000,000 VNĐ',
        'Tags': 'Ban Nội dung, Diễn giả Quốc tế',
        'Tham gia': 'EVT2026-001',
        'Email Đăng ký (Thô)': 'ruy.sheng@tokyo-tech.ac.jp',
        'SĐT Đăng ký (Thô)': '+81 90 1234 5678',
      },
      {
        'Mã ID Thô': 'RAW-002',
        'thống': 'Diễn giả',
        'Hạng Vé Khách Mời': 'Speaker VIP',
        'Chủ Đề Sự Kiện': 'EVT2026-001: Hội thảo Toàn cảnh AI & Bán dẫn 2026',
        'Học hàm': 'Dr.',
        'Họ và Tên (Thô)': 'Dr. Robert J. Oppenheimer',
        'Đơn vị': 'Viện Nghiên cứu Điện tử Los Alamos',
        'diện Liên hệ': '',
        'trí': 'Chief Quantum Architect',
        'trợ': 'Thù lao Keynote & Vé MB',
        'Quy đổi': '50,000,000 VNĐ',
        'Tags': 'VIP, Keynote Speaker',
        'Tham gia': 'EVT2026-001',
        'Email Đăng ký (Thô)': 'robert.opp@quantum-lab.org',
        'SĐT Đăng ký (Thô)': '+1 (415) 888-9922',
      },
      {
        'Mã ID Thô': 'RAW-003',
        'thống': 'Diễn giả',
        'Hạng Vé Khách Mời': 'Speaker VIP',
        'Chủ Đề Sự Kiện': 'EVT2026-002: Fintech & An ninh mạng Thế hệ mới',
        'Học hàm': '',
        'Họ và Tên (Thô)': 'Tan Wei Ming',
        'Đơn vị': 'Singapore Venture Capital & Fintech',
        'diện Liên hệ': '',
        'trí': 'Managing Partner & Speaker',
        'trợ': 'Vé VIP Pass',
        'Quy đổi': '10,000,000 VNĐ',
        'Tags': 'Ban Nội dung, Quốc tế',
        'Tham gia': 'EVT2026-002',
        'Email Đăng ký (Thô)': 'tan.wm@singapore-vc.sg',
        'SĐT Đăng ký (Thô)': '+65 9123 4567',
      },
      {
        'Mã ID Thô': 'RAW-004',
        'thống': 'Chuyên gia',
        'Hạng Vé Khách Mời': 'Speaker VIP',
        'Chủ Đề Sự Kiện': 'EVT2026-001: Hội thảo Toàn cảnh AI & Bán dẫn 2026',
        'Học hàm': 'TS.',
        'Họ và Tên (Thô)': 'LÊ HOÀNG NAM',
        'Đơn vị': 'VinAI Research Lab',
        'diện Liên hệ': '',
        'trí': 'Senior Director of AI Research',
        'trợ': 'Thù lao chuyên gia',
        'Quy đổi': '25,000,000 VNĐ',
        'Tags': 'Ban Cố vấn, Diễn giả Đầu ngành',
        'Tham gia': 'EVT2026-001',
        'Email Đăng ký (Thô)': 'nam.le@vinai.io',
        'SĐT Đăng ký (Thô)': '0912 345 678',
      },
      {
        'Mã ID Thô': 'RAW-005',
        'thống': 'Diễn giả',
        'Hạng Vé Khách Mời': 'Speaker VIP',
        'Chủ Đề Sự Kiện': 'EVT2026-003: Tự động hóa & Robotics Công nghiệp',
        'Học hàm': 'Dr.',
        'Họ và Tên (Thô)': 'Park Min-Soo',
        'Đơn vị': 'Samsung R&D Center Korea',
        'diện Liên hệ': '',
        'trí': 'Head of Robotics AI',
        'trợ': 'Hỗ trợ lưu trú & Vé MB',
        'Quy đổi': '30,000,000 VNĐ',
        'Tags': 'Ban Kỹ thuật, Diễn giả Quốc tế',
        'Tham gia': 'EVT2026-003',
        'Email Đăng ký (Thô)': 'minsoo.park@samsung.com',
        'SĐT Đăng ký (Thô)': '+82 10 9876 5432',
      },
      {
        'Mã ID Thô': 'RAW-006',
        'thống': 'Doanh nghiệp',
        'Hạng Vé Khách Mời': 'Sponsor Pass',
        'Chủ Đề Sự Kiện': 'EVT2026-001: Hội thảo Toàn cảnh AI & Bán dẫn 2026',
        'Học hàm': '',
        'Họ và Tên (Thô)': 'Công ty TNHH AI Solutions Việt Nam',
        'Đơn vị': 'Công ty TNHH AI Solutions Việt Nam',
        'diện Liên hệ': 'Trần Văn Minh',
        'trí': 'Giám đốc Đối ngoại',
        'trợ': 'Kim Cương (Diamond)',
        'Quy đổi': '200,000,000 VNĐ',
        'Tags': 'Ban Tài trợ, Kim Cương',
        'Tham gia': 'EVT2026-001',
        'Email Đăng ký (Thô)': 'minh.tv@aisolutions.vn',
        'SĐT Đăng ký (Thô)': '024 3888 9999',
      },
      {
        'Mã ID Thô': 'RAW-007',
        'thống': 'Khách mời',
        'Hạng Vé Khách Mời': 'Vé Early Bird VIP',
        'Chủ Đề Sự Kiện': 'EVT2026-001: Hội thảo Toàn cảnh AI & Bán dẫn 2026',
        'Học hàm': '',
        'Họ và Tên (Thô)': 'trần đức bảo',
        'Đơn vị': 'Shopee Vietnam',
        'diện Liên hệ': '',
        'trí': 'Lead Product Manager',
        'trợ': 'Vé VIP Pass',
        'Quy đổi': '2,500,000 VNĐ',
        'Tags': 'Ban Khách mời, VIP Pass',
        'Tham gia': 'EVT2026-001',
        'Email Đăng ký (Thô)': 'bao.td@shopee.vn',
        'SĐT Đăng ký (Thô)': '0903889900',
      },
      {
        'Mã ID Thô': 'RAW-008',
        'thống': 'Doanh nghiệp',
        'Hạng Vé Khách Mời': 'Sponsor Pass',
        'Chủ Đề Sự Kiện': 'EVT2026-002: Fintech & An ninh mạng Thế hệ mới',
        'Học hàm': '',
        'Họ và Tên (Thô)': 'Quỹ Đầu tư VinaInvest Capital',
        'Đơn vị': 'Quỹ Đầu tư VinaInvest Capital',
        'diện Liên hệ': 'Nguyễn Thị Hồng Hạnh',
        'trí': 'Phó Giám đốc Đầu tư',
        'trợ': 'Đồng (Bronze)',
        'Quy đổi': '30,000,000 VNĐ',
        'Tags': 'Ban Đối ngoại, Quỹ Đầu tư',
        'Tham gia': 'EVT2026-002',
        'Email Đăng ký (Thô)': 'hanh.nth@vinainvest.com',
        'SĐT Đăng ký (Thô)': '028 7300 8899',
      },
      {
        'Mã ID Thô': 'RAW-009',
        'thống': 'Doanh nghiệp',
        'Hạng Vé Khách Mời': 'Sponsor Pass',
        'Chủ Đề Sự Kiện': 'EVT2026-002: Fintech & An ninh mạng Thế hệ mới',
        'Học hàm': '',
        'Họ và Tên (Thô)': 'Công ty Cổ phần Fintech Á Châu',
        'Đơn vị': 'Công ty Cổ phần Fintech Á Châu',
        'diện Liên hệ': 'Hoàng Văn Thái',
        'trí': 'Trưởng phòng Hợp tác Doanh nghiệp',
        'trợ': 'Vàng (Gold)',
        'Quy đổi': '100,000,000 VNĐ',
        'Tags': 'Ban Tài trợ, Gold Sponsor',
        'Tham gia': 'EVT2026-002',
        'Email Đăng ký (Thô)': 'thai.hv@achaufintech.vn',
        'SĐT Đăng ký (Thô)': '0988 554 433',
      },
      {
        'Mã ID Thô': 'RAW-010',
        'thống': 'Doanh nghiệp',
        'Hạng Vé Khách Mời': 'Sponsor Pass',
        'Chủ Đề Sự Kiện': 'EVT2026-003: Tự động hóa & Robotics Công nghiệp',
        'Học hàm': '',
        'Họ và Tên (Thô)': 'Tập đoàn Viễn thông & AI GlobalTel',
        'Đơn vị': 'Tập đoàn Viễn thông & AI GlobalTel',
        'diện Liên hệ': 'Đỗ Quốc Tuấn',
        'trí': 'Giám đốc Dự án',
        'trợ': 'Bạc (Silver)',
        'Quy đổi': '50,000,000 VNĐ',
        'Tags': 'Ban Đối ngoại, Silver Sponsor',
        'Tham gia': 'EVT2026-003',
        'Email Đăng ký (Thô)': 'tuan.dq@globaltel.com.vn',
        'SĐT Đăng ký (Thô)': '024 6688 1234',
      },
      {
        'Mã ID Thô': 'RAW-011',
        'thống': 'Doanh nghiệp',
        'Hạng Vé Khách Mời': 'Sponsor Pass',
        'Chủ Đề Sự Kiện': 'EVT2026-004: Hội nghị Thượng đỉnh Năng lượng Xanh & ESG',
        'Học hàm': '',
        'Họ và Tên (Thô)': 'Công ty TNHH Năng Lượng Xanh EcoPower',
        'Đơn vị': 'Công ty TNHH Năng Lượng Xanh EcoPower',
        'diện Liên hệ': 'Bùi Thúy Hằng',
        'trí': 'Trưởng phòng Phát triển bền vững',
        'trợ': 'Đồng (Bronze)',
        'Quy đổi': '30,000,000 VNĐ',
        'Tags': 'Ban Tài trợ, ESG Sponsor',
        'Tham gia': 'EVT2026-004',
        'Email Đăng ký (Thô)': 'hang.bt@ecopower.com.vn',
        'SĐT Đăng ký (Thô)': '0909 112 233',
      },
      {
        'Mã ID Thô': 'RAW-012',
        'thống': 'Chuyên gia',
        'Hạng Vé Khách Mời': 'Speaker VIP',
        'Chủ Đề Sự Kiện': 'EVT2026-004: Hội nghị Thượng đỉnh Năng lượng Xanh & ESG',
        'Học hàm': 'GS.',
        'Họ và Tên (Thô)': 'gs. đặng quốc huy',
        'Đơn vị': 'Viện Năng lượng & Môi trường Quốc gia',
        'diện Liên hệ': '',
        'trí': 'Chủ tịch Hội đồng Khoa học',
        'trợ': 'Thù lao báo cáo Keynote',
        'Quy đổi': '20,000,000 VNĐ',
        'Tags': 'Ban Nội dung, Giáo sư',
        'Tham gia': 'EVT2026-004',
        'Email Đăng ký (Thô)': 'huy.dq@viennangluong.gov.vn',
        'SĐT Đăng ký (Thô)': '0913 221 445',
      },
      {
        'Mã ID Thô': 'RAW-013',
        'thống': 'Chuyên gia',
        'Hạng Vé Khách Mời': 'Speaker VIP',
        'Chủ Đề Sự Kiện': 'EVT2026-005: Đổi mới Sáng tạo & Khởi nghiệp Quốc tế',
        'Học hàm': 'TS.',
        'Họ và Tên (Thô)': 'TS. Nguyễn Thị Mai',
        'Đơn vị': 'Trung tâm Đổi mới Sáng tạo Quốc gia (NIC)',
        'diện Liên hệ': '',
        'trí': 'Giám đốc Chương trình Tăng tốc Khởi nghiệp',
        'trợ': 'Thù lao diễn giả',
        'Quy đổi': '15,000,000 VNĐ',
        'Tags': 'Ban Cố vấn, Startup Mentor',
        'Tham gia': 'EVT2026-005',
        'Email Đăng ký (Thô)': 'mai.nt@nic.gov.vn',
        'SĐT Đăng ký (Thô)': '0982 998 776',
      },
      {
        'Mã ID Thô': 'RAW-014',
        'thống': 'Khách mời',
        'Hạng Vé Khách Mời': 'Vé Phổ Thông',
        'Chủ Đề Sự Kiện': 'EVT2026-002: Fintech & An ninh mạng Thế hệ mới',
        'Học hàm': '',
        'Họ và Tên (Thô)': 'Vũ Thị Minh Hạnh',
        'Đơn vị': 'Ngân hàng BIDV',
        'diện Liên hệ': '',
        'trí': 'Trưởng phòng CNTT',
        'trợ': 'Vé Standard',
        'Quy đổi': '1,000,000 VNĐ',
        'Tags': 'Ban Khách mời, Ban Lễ tân',
        'Tham gia': 'EVT2026-002',
        'Email Đăng ký (Thô)': 'hanh.vm@bidv.com.vn',
        'SĐT Đăng ký (Thô)': '0978 112 334',
      },
      {
        'Mã ID Thô': 'RAW-015',
        'thống': 'Khách mời',
        'Hạng Vé Khách Mời': 'Vé Sinh Viên/Tự Do',
        'Chủ Đề Sự Kiện': 'EVT2026-005: Đổi mới Sáng tạo & Khởi nghiệp Quốc tế',
        'Học hàm': '',
        'Họ và Tên (Thô)': 'Phạm Quỳnh Nga',
        'Đơn vị': 'Báo VietNamNet',
        'diện Liên hệ': '',
        'trí': 'Phóng viên CNTT & Viễn thông',
        'trợ': 'Thẻ Nhà Báo (Press Pass)',
        'Quy đổi': 'Miễn phí',
        'Tags': 'Ban Truyền thông, Báo chí',
        'Tham gia': 'EVT2026-005',
        'Email Đăng ký (Thô)': 'nga.pq@vietnamnet.vn',
        'SĐT Đăng ký (Thô)': '0983 456 123',
      }
    ];

    const rawHeaders = Object.keys(messyRows[0]);
    const mixed = splitMixedRowsIntoCategories(rawHeaders, messyRows, 'speaker');
    const splitSections: CategoryImportSection[] = [];

    // Check if we can extract embedded events
    const extractedEvents = extractEmbeddedEventsFromRows(rawHeaders, messyRows);

    if (mixed) {
      if (mixed.speaker && mixed.speaker.length > 0) {
        splitSections.push({
          id: `sec-speaker-${Date.now()}-0`,
          entityType: 'speaker',
          title: getCategoryLabel('speaker'),
          sheetName: 'Dữ_Liệu_Lộn_Xộn (Diễn giả & Chuyên gia)',
          headers: rawHeaders,
          rows: mixed.speaker,
          skippedBanners: [],
          mappingRules: buildInitialRules(rawHeaders, mixed.speaker, 'speaker'),
        });
      }
      if (mixed.enterprise && mixed.enterprise.length > 0) {
        splitSections.push({
          id: `sec-enterprise-${Date.now()}-1`,
          entityType: 'enterprise',
          title: getCategoryLabel('enterprise'),
          sheetName: 'Dữ_Liệu_Lộn_Xộn (Doanh nghiệp & Đối tác)',
          headers: rawHeaders,
          rows: mixed.enterprise,
          skippedBanners: [],
          mappingRules: buildInitialRules(rawHeaders, mixed.enterprise, 'enterprise'),
        });
      }
      if (mixed.guest && mixed.guest.length > 0) {
        splitSections.push({
          id: `sec-guest-${Date.now()}-2`,
          entityType: 'guest',
          title: getCategoryLabel('guest'),
          sheetName: 'Dữ_Liệu_Lộn_Xộn (Khách mời Tham dự)',
          headers: rawHeaders,
          rows: mixed.guest,
          skippedBanners: [],
          mappingRules: buildInitialRules(rawHeaders, mixed.guest, 'guest'),
        });
      }
      if (extractedEvents.length > 0) {
        const evtHeaders = Object.keys(extractedEvents[0]);
        splitSections.push({
          id: `sec-event-${Date.now()}-3`,
          entityType: 'event',
          title: getCategoryLabel('event'),
          sheetName: 'Dữ_Liệu_Lộn_Xộn (Quản lý Sự kiện)',
          headers: evtHeaders,
          rows: extractedEvents,
          skippedBanners: [],
          mappingRules: buildInitialRules(evtHeaders, extractedEvents, 'event'),
        });
      }
    }

    setSections(splitSections);
    setActiveSectionIndex(0);
    setFileName(sampleName);
    setCurrentStep('mapping');
  };

  // Apply Saved Mapping Template to active section
  const applyTemplateToActiveSection = (templateId: string) => {
    if (!activeSection) return;
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;

    setSections(prevSections =>
      prevSections.map((sec, idx) => {
        if (idx !== activeSectionIndex) return sec;
        const updatedRules = sec.mappingRules.map(rule => {
          if (tpl.mappings[rule.sourceColumn]) {
            const target = tpl.mappings[rule.sourceColumn];
            const canonical = CANONICAL_FIELDS[sec.entityType]?.find(f => f.fieldKey === target);
            return {
              ...rule,
              targetField: target,
              confidence: 100,
              transform: canonical?.transformType || 'none',
              isIgnored: false,
            };
          }
          return rule;
        });
        return { ...sec, mappingRules: updatedRules, selectedTemplateId: templateId };
      })
    );
  };

  // Update a single mapping rule in active section
  const updateRuleInActiveSection = (sourceCol: string, targetField: string) => {
    if (!activeSection) return;
    const canonical = CANONICAL_FIELDS[activeSection.entityType]?.find(f => f.fieldKey === targetField);
    
    setSections(prevSections =>
      prevSections.map((sec, idx) => {
        if (idx !== activeSectionIndex) return sec;
        const updatedRules = sec.mappingRules.map(r => {
          if (r.sourceColumn === sourceCol) {
            return {
              ...r,
              targetField,
              confidence: targetField ? 90 : 0,
              transform: canonical?.transformType || 'none',
              isIgnored: !targetField,
            };
          }
          return r;
        });
        return { ...sec, mappingRules: updatedRules };
      })
    );
  };

  const updateTransformInActiveSection = (sourceCol: string, transform: MappingRule['transform']) => {
    if (!activeSection) return;
    setSections(prevSections =>
      prevSections.map((sec, idx) => {
        if (idx !== activeSectionIndex) return sec;
        const updatedRules = sec.mappingRules.map(r => (r.sourceColumn === sourceCol ? { ...r, transform } : r));
        return { ...sec, mappingRules: updatedRules };
      })
    );
  };

  // Calculate parsed and normalized records for EACH section separately
  const parsedSectionsMap = useMemo(() => {
    const result: Record<string, { records: Record<string, unknown>[]; conflictCount: number }> = {};

    const currentSpeakers = existingData?.speakers || StorageService.getSpeakers();
    const currentEnterprises = existingData?.enterprises || StorageService.getEnterprises();
    const currentGuests = existingData?.guests || StorageService.getGuests();
    const currentEvents = existingData?.events || StorageService.getEvents();

    sections.forEach(sec => {
      let conflicts = 0;
      const records = sec.rows.map((row, index) => {
        const record: Record<string, unknown> = {
          id: `preview-${sec.id}-${index}`,
          isNormalized: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          events: [],
          tags: [],
          note: '',
        };

        sec.mappingRules.forEach(rule => {
          if (rule.targetField && !rule.isIgnored) {
            const rawVal = row[rule.sourceColumn];
            const cleanVal = applyFieldTransform(rawVal, rule.transform);
            record[rule.targetField] = cleanVal;
          }
        });

        // Detect format errors & validation issues
        const validationErrors: string[] = [];
        const email = String(record.email || record.contactEmail || '').trim();
        const phone = String(record.phone || record.contactPhone || '').trim();
        const name = String(record.fullName || record.name || record.title || '').trim();
        const org = String(record.organization || record.name || '').trim();

        if (!name) {
          validationErrors.push('Lỗi: Thiếu thông tin Họ tên / Tên đơn vị');
        }

        // Check sticky / multiple emails
        if (email) {
          if (email.includes(';') || email.includes(',') || (email.match(/@/g) || []).length > 1) {
            validationErrors.push('Tách email dính');
            const firstEmail = email.split(/[,;\s]+/).find(e => e.includes('@'));
            if (firstEmail) {
              if (record.email) record.email = firstEmail.trim().toLowerCase();
              if (record.contactEmail) record.contactEmail = firstEmail.trim().toLowerCase();
            }
          } else if (!email.includes('@') || !email.includes('.')) {
            validationErrors.push(`Email không chuẩn: "${email}"`);
          }
        }

        // Check phone
        if (phone) {
          const digits = phone.replace(/\D/g, '');
          if (digits.length < 9 || digits.length > 15) {
            validationErrors.push(`SĐT cần kiểm tra: "${phone}"`);
          }
        }

        // Check company joined with role
        if (org && (org.includes(' - ') || org.includes(' – '))) {
          const parts = org.split(/\s*[-–]\s*/);
          if (parts.length >= 2 && !record.role && (sec.entityType === 'speaker' || sec.entityType === 'guest')) {
            validationErrors.push('Tách chức danh khỏi tên đơn vị');
            record.organization = parts[0];
            record.role = parts.slice(1).join(' - ');
          }
        }

        // Extract error tags and merge into note
        const { cleanTags, mergedNote: tagsExtractedNote } = extractErrorsAndCleanTags(record.tags, record.note);
        record.tags = cleanTags;

        const existingNote = typeof tagsExtractedNote === 'string' ? tagsExtractedNote.trim() : '';
        const allNotes = [existingNote, ...validationErrors].filter(Boolean);
        const uniqueNotes: string[] = [];
        allNotes.forEach(n => {
          if (!uniqueNotes.some(u => u.toLowerCase() === n.toLowerCase())) {
            uniqueNotes.push(n);
          }
        });
        record.note = uniqueNotes.join(' | ');

        if (sec.entityType === 'speaker') {
          const rawRating = typeof record.rating === 'number' ? record.rating : parseFloat(String(record.rating || ''));
          record.rating = !isNaN(rawRating) && rawRating > 0 ? Number(Math.min(5, Math.max(1, rawRating)).toFixed(1)) : 4.8;
          if (!record.expertise || !Array.isArray(record.expertise) || record.expertise.length === 0) {
            const rawExpertise = row['Lĩnh vực chuyên môn'] || row['Chuyên môn'] || row['chuyên môn'] || row['expertise'];
            if (rawExpertise) {
              record.expertise = ensureArray(rawExpertise).filter(Boolean);
            } else {
              record.expertise = ['Trí tuệ nhân tạo (AI)', 'Chuyển đổi số'];
            }
          }
          if (!record.status) {
            record.status = 'Đã xác nhận';
          }
        } else if (sec.entityType === 'enterprise') {
          const rawSponsorship = record.sponsorshipTotal ?? row['Số tiền tài trợ'] ?? row['tiền tài trợ'] ?? row['sponsorshipTotal'] ?? row['sponsorship'] ?? row['mức tài trợ'] ?? row['kinh phí'];
          const parsedSponsorship = extractSponsorshipAmountFromRow(row, String(record.tier || ''));
          const effectiveSponsorship = (typeof record.sponsorshipTotal === 'number' && record.sponsorshipTotal > 0)
            ? record.sponsorshipTotal
            : (parsedSponsorship > 0 ? parsedSponsorship : parseSponsorshipAmount(rawSponsorship));

          record.tier = normalizeEnterpriseTier(record.tier || row['Hạng đối tác'] || row['Hạng'] || row['tier'] || row['gói tài trợ'], effectiveSponsorship);
          record.sponsorshipTotal = normalizeEnterpriseSponsorship(effectiveSponsorship, String(record.tier));
          if (!record.status) {
            record.status = 'Đang hợp tác';
          }
        } else if (sec.entityType === 'guest') {
          const rawTicket = record.ticketType || row['Hạng vé'] || row['Loại vé'] || row['phân loại vé'] || row['ticket'] || row['ticketType'] || row['pass'];
          record.ticketType = normalizeGuestTicketType(rawTicket, record.role, record.tags, record.note, Boolean(record.vipStatus));
          
          record.vipStatus = record.ticketType === 'VIP Pass' || 
            (Array.isArray(record.tags) && record.tags.some(t => /vip/i.test(String(t)))) ||
            /vip|chủ tịch|giám đốc|director|ceo|c-level/i.test(String(record.role || ''));

          const rawTopics = record.interestTopics || row['Chủ đề quan tâm'] || row['chủ đề'] || row['quan tâm'] || row['topics'] || row['interestTopics'];
          record.interestTopics = normalizeGuestInterestTopics(rawTopics, String(record.organization || ''), String(record.role || ''), record.tags);

          if (!record.checkInStatus) {
            record.checkInStatus = 'Chưa điểm danh';
          }
        } else if (sec.entityType === 'event') {
          const rawAttendees = typeof record.attendeeCount === 'number' ? record.attendeeCount : parseInt(String(record.attendeeCount || '').replace(/\D/g, ''), 10);
          record.attendeeCount = !isNaN(rawAttendees) && rawAttendees > 0 ? rawAttendees : 500;

          const rawBudget = typeof record.budget === 'number' ? record.budget : parseInt(String(record.budget || '').replace(/\D/g, ''), 10);
          record.budget = !isNaN(rawBudget) && rawBudget >= 0 ? rawBudget : 0;

          if (!record.status) {
            record.status = 'Sắp diễn ra';
          }
          if (!record.format) {
            record.format = 'Offline';
          }
          if (!record.speakerIds) record.speakerIds = [];
          if (!record.enterpriseIds) record.enterpriseIds = [];
        }

        // Conflict check against appropriate database table
        let isConflict = false;
        let conflictReason = '';

        if (sec.entityType === 'speaker') {
          const match = currentSpeakers.find(
            s => (email && normalizeEmail(s.email) === normalizeEmail(email)) ||
                 (phone && normalizeVietnamesePhone(s.phone) === normalizeVietnamesePhone(phone))
          );
          if (match) {
            isConflict = true;
            conflicts++;
            conflictReason = `Trùng với diễn giả "${match.fullName}" (${match.organization})`;
            record._conflictWithId = match.id;
          }
        } else if (sec.entityType === 'enterprise') {
          const match = currentEnterprises.find(
            e => (email && normalizeEmail(e.contactEmail) === normalizeEmail(email)) ||
                 (record.name && e.name.toLowerCase() === String(record.name).toLowerCase())
          );
          if (match) {
            isConflict = true;
            conflicts++;
            conflictReason = `Trùng với doanh nghiệp "${match.name}"`;
            record._conflictWithId = match.id;
          }
        } else if (sec.entityType === 'guest') {
          const match = currentGuests.find(
            g => (email && normalizeEmail(g.email) === normalizeEmail(email)) ||
                 (phone && normalizeVietnamesePhone(g.phone) === normalizeVietnamesePhone(phone))
          );
          if (match) {
            isConflict = true;
            conflicts++;
            conflictReason = `Trùng với khách mời "${match.fullName}" (${match.email})`;
            record._conflictWithId = match.id;
          }
        } else if (sec.entityType === 'event') {
          const code = String(record.code || '').trim().toLowerCase();
          const title = String(record.title || '').trim().toLowerCase();
          const date = String(record.date || '').trim();
          const match = currentEvents.find(
            ev => (code && ev.code && ev.code.toLowerCase() === code) ||
                 (title && ev.title && ev.title.toLowerCase() === title) ||
                 (title && date && ev.title && ev.title.toLowerCase().includes(title.slice(0, 15)) && ev.date === date)
          );
          if (match) {
            isConflict = true;
            conflicts++;
            conflictReason = `Trùng với sự kiện "${match.title}" (${match.code || match.date})`;
            record._conflictWithId = match.id;
          }
        }

        record._isConflict = isConflict;
        record._conflictReason = conflictReason;

        return record;
      });

      result[sec.id] = { records, conflictCount: conflicts };
    });

    return result;
  }, [sections, existingData]);

  // Total counts across all sections
  const totalAllRows = sections.reduce((sum, s) => sum + s.rows.length, 0);
  const totalAllConflicts = (Object.values(parsedSectionsMap) as Array<{ records: Record<string, unknown>[]; conflictCount: number }>).reduce(
    (sum, item) => sum + item.conflictCount,
    0
  );

  // Active section records
  const currentSectionParsed = activeSection ? parsedSectionsMap[activeSection.id] : null;
  const currentRecords = currentSectionParsed?.records || [];
  const currentSectionConflicts = currentSectionParsed?.conflictCount || 0;

  // Execute Final Multi-Category Import
  const executeImport = () => {
    setIsProcessing(true);

    setTimeout(() => {
      const breakdownReport: Record<string, { total: number; inserted: number; updated: number; skipped: number; title: string }> = {};

      const speakersToSave: Speaker[] = [];
      const enterprisesToSave: Enterprise[] = [];
      const guestsToSave: Guest[] = [];
      const eventsToSave: EventItem[] = [];

      let totalInserted = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;

      sections.forEach(sec => {
        const secParsed = parsedSectionsMap[sec.id]?.records || [];
        let secInserted = 0;
        let secUpdated = 0;
        let secSkipped = 0;

        secParsed.forEach((rec, idx) => {
          const { _isConflict, _conflictReason, _conflictWithId, ...cleanRecord } = rec;

          if (_isConflict) {
            if (duplicateStrategy === 'skip') {
              secSkipped++;
              return;
            } else if (duplicateStrategy === 'update') {
              secUpdated++;
              const updatedObj = { ...cleanRecord, id: _conflictWithId as string };
              if (sec.entityType === 'speaker') speakersToSave.push(updatedObj as Speaker);
              else if (sec.entityType === 'enterprise') enterprisesToSave.push(updatedObj as Enterprise);
              else if (sec.entityType === 'guest') guestsToSave.push(updatedObj as Guest);
              else if (sec.entityType === 'event') eventsToSave.push(updatedObj as EventItem);
              return;
            }
          }

          secInserted++;
          const uniqueId = `imp-${sec.entityType.slice(0, 3)}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`;
          const newObj = { ...cleanRecord, id: uniqueId };
          
          if (sec.entityType === 'speaker') speakersToSave.push(newObj as Speaker);
          else if (sec.entityType === 'enterprise') enterprisesToSave.push(newObj as Enterprise);
          else if (sec.entityType === 'guest') guestsToSave.push(newObj as Guest);
          else if (sec.entityType === 'event') eventsToSave.push(newObj as EventItem);
        });

        totalInserted += secInserted;
        totalUpdated += secUpdated;
        totalSkipped += secSkipped;

        breakdownReport[sec.id] = {
          total: secParsed.length,
          inserted: secInserted,
          updated: secUpdated,
          skipped: secSkipped,
          title: sec.title,
        };
      });

      // Save template if requested
      let savedTemplateObj: MappingTemplate | undefined;
      if (shouldSaveTemplate && saveTemplateName.trim() && activeSection) {
        const mappingMap: Record<string, string> = {};
        activeSection.mappingRules.forEach(r => {
          if (r.targetField && !r.isIgnored) {
            mappingMap[r.sourceColumn] = r.targetField;
          }
        });

        savedTemplateObj = {
          id: `tpl-${Date.now()}`,
          name: saveTemplateName.trim(),
          entityType: activeSection.entityType,
          mappings: mappingMap,
          createdAt: new Date().toISOString(),
        };

        StorageService.saveTemplate(savedTemplateObj);
      }

      const summary = {
        total: totalAllRows,
        inserted: totalInserted,
        updated: totalUpdated,
        skipped: totalSkipped,
        breakdown: breakdownReport,
      };

      setImportSummary(summary);
      setCurrentStep('completed');
      setIsProcessing(false);

      // Confetti celebration
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
      });

      if (onSaveData) {
        onSaveData(speakersToSave, enterprisesToSave, guestsToSave, eventsToSave, savedTemplateObj);
      }

      if (onImportComplete) {
        const allEmitted = [...speakersToSave, ...enterprisesToSave, ...guestsToSave, ...eventsToSave];
        onImportComplete('all', allEmitted, summary);
      }
    }, 600);
  };

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'speaker': return <GraduationCap className="w-4 h-4" />;
      case 'enterprise': return <Building2 className="w-4 h-4" />;
      case 'guest': return <Ticket className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      default: return <FileSpreadsheet className="w-4 h-4" />;
    }
  };

  const activeCanonicalFields = activeSection ? CANONICAL_FIELDS[activeSection.entityType] || [] : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Trình Nhập Dữ Liệu Excel Phân Loại Tự Động
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 font-medium">
                  Multi-Category AI Router
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tự động phân chia vào đúng mục Diễn giả, Doanh nghiệp, Khách mời — không dồn chung một cụm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold shrink-0">
          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              currentStep === 'upload' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {currentStep !== 'upload' ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
            </span>
            <span className={currentStep === 'upload' ? 'text-indigo-700 font-bold' : 'text-slate-600'}>
              1. Tải tệp & Phân loại
            </span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              currentStep === 'mapping' ? 'bg-indigo-600 text-white' : currentStep === 'preview' || currentStep === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {currentStep === 'preview' || currentStep === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : '2'}
            </span>
            <span className={currentStep === 'mapping' ? 'text-indigo-700 font-bold' : 'text-slate-600'}>
              2. Ánh xạ cột theo Mục {sections.length > 1 ? `(${sections.length} mục)` : ''}
            </span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              currentStep === 'preview' ? 'bg-indigo-600 text-white' : currentStep === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {currentStep === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : '3'}
            </span>
            <span className={currentStep === 'preview' ? 'text-indigo-700 font-bold' : 'text-slate-600'}>
              3. Xem trước & Trùng lặp
            </span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              currentStep === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              4
            </span>
            <span className={currentStep === 'completed' ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
              4. Hoàn tất
            </span>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* STEP 1: UPLOAD & MULTI-CATEGORY AUTO DETECTION */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              
              {/* Default entity fallback */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Mục tiêu mặc định khi tệp không phân chia sheet rõ ràng:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { type: 'speaker' as EntityType, title: 'Diễn giả & Chuyên gia', icon: GraduationCap, desc: 'Họ tên, Đơn vị, Chuyên môn, Rating' },
                    { type: 'enterprise' as EntityType, title: 'Doanh nghiệp & Đối tác', icon: Building2, desc: 'Tên công ty, Hạng tài trợ, Đại diện' },
                    { type: 'guest' as EntityType, title: 'Khách mời & Check-in', icon: Ticket, desc: 'Tên khách, Hạng vé, Cơ quan, Email' },
                    { type: 'event' as EntityType, title: 'Chương trình Sự kiện', icon: Calendar, desc: 'Tên sự kiện, Mã, Ngày, Địa điểm, Quy mô' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setDefaultEntityType(item.type)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          defaultEntityType === item.type
                            ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</span>
                        </div>
                        <span className="block text-[11px] text-slate-500 leading-relaxed">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Tải Tệp Excel Cần Nhập (Hỗ trợ Đa Sheet & Tự Động Phân Loại)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center transition-all bg-slate-50/50 hover:bg-indigo-50/30 group">
                  <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-indigo-600 mx-auto mb-3 transition-colors" />
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    Kéo & thả tệp Excel vào đây, hoặc{' '}
                    <label className="text-indigo-600 hover:text-indigo-700 underline cursor-pointer font-bold">
                      duyệt tệp từ máy tính
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-slate-500 max-w-xl mx-auto">
                    Hệ thống sẽ tự động quét tất cả các Sheet trong file (hoặc phân loại theo cột) để đưa vào từng mục riêng biệt: <strong>Diễn giả</strong>, <strong>Doanh nghiệp</strong>, <strong>Khách mời</strong>, <strong>Sự kiện</strong>.
                  </p>
                </div>
              </div>

              {/* Instant Test Presets */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-900 uppercase">
                      Thử Nghiệm Ngay Với Bộ Dữ Liệu Mẫu Đa Mục
                    </span>
                  </div>
                  <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-100/70 px-2 py-0.5 rounded-full">
                    Tự động phân tách 4 mục
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Primary Multi-Category Preset */}
                  <button
                    onClick={loadComprehensiveMultiCategoryTestSuite}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white hover:from-indigo-700 hover:to-purple-800 shadow-md hover:shadow-lg transition-all text-left flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                          ⚡ DỮ LIỆU ĐA SHEET (4 MỤC)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-mono text-white">
                          Chuẩn hóa
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white">
                        4 Sheet: Diễn giả, Doanh nghiệp, Khách mời, Sự kiện
                      </p>
                      <p className="text-[11px] text-indigo-100">
                        Đầy đủ SĐT quốc tế (+1, +65), rating sao, tier tài trợ, vé VIP, số lượng khách, xử lý trùng lặp
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1.5 transition-transform shrink-0 ml-3" />
                  </button>

                  {/* Messy Single Sheet Mixed Preset */}
                  <button
                    onClick={loadMessySingleSheetMixedSample}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white hover:from-amber-700 hover:to-rose-700 shadow-md hover:shadow-lg transition-all text-left flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-200">
                          🧪 BẢNG EXCEL LỘN XỘN (1 SHEET TRỘN 4 MỤC)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-mono text-white">
                          Test thực tế
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white">
                        15 dòng lộn xộn: Header cắt cụt ('thống', 'trợ', 'Quy đổi')
                      </p>
                      <p className="text-[11px] text-amber-100">
                        Tự động bóc tách thành 4 mục: 7 Diễn giả, 5 Doanh nghiệp, 3 Khách mời và 5 Sự kiện liên kết
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1.5 transition-transform shrink-0 ml-3" />
                  </button>
                </div>

                {/* Individual single-category test cases */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                  <button
                    onClick={() => loadSinglePresetSample('speaker')}
                    className="px-3 py-2 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-950 hover:border-indigo-500 hover:shadow-xs transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">Chỉ mục Diễn giả</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                  <button
                    onClick={() => loadSinglePresetSample('enterprise')}
                    className="px-3 py-2 rounded-lg bg-white border border-purple-200 text-xs font-semibold text-purple-950 hover:border-purple-500 hover:shadow-xs transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">Chỉ mục Doanh nghiệp</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                  <button
                    onClick={() => loadSinglePresetSample('guest')}
                    className="px-3 py-2 rounded-lg bg-white border border-pink-200 text-xs font-semibold text-pink-950 hover:border-pink-500 hover:shadow-xs transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Ticket className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                      <span className="truncate">Chỉ mục Khách mời</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-pink-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                  <button
                    onClick={() => loadSinglePresetSample('event')}
                    className="px-3 py-2 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-emerald-950 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Chỉ mục Sự kiện</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: SMART COLUMN MAPPING MATRIX (PER CATEGORY SECTION) */}
          {currentStep === 'mapping' && activeSection && (
            <div className="space-y-4">
              
              {/* Category Selector Tabs */}
              <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1.5 overflow-x-auto border border-slate-200">
                <span className="text-xs font-bold text-slate-500 px-3 uppercase tracking-wider hidden sm:inline">
                  Danh mục:
                </span>
                {sections.map((sec, idx) => {
                  const isActive = idx === activeSectionIndex;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSectionIndex(idx)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        isActive
                          ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200 ring-2 ring-indigo-500/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      {getEntityIcon(sec.entityType)}
                      <span>{sec.title}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {sec.rows.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Banner filter notification */}
              {activeSection.skippedBanners && activeSection.skippedBanners.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-emerald-950">
                      Đã tự động phát hiện &amp; lọc bỏ {activeSection.skippedBanners.length} dòng thông tin không liên quan ở đầu tệp.
                    </span>
                    <span className="text-emerald-700 ml-1.5 hidden sm:inline">
                      Bảng dữ liệu và hàng tiêu đề đã được nhận diện chuẩn xác.
                    </span>
                  </div>
                </div>
              )}

              {/* Active Section Info & Action Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    {getEntityIcon(activeSection.entityType)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                        <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[11px] font-bold">🎯 Danh mục:</span>
                        <span className="text-indigo-900 font-bold">{activeSection.title}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-900 font-mono font-bold">
                        {activeSection.rows.length} dòng hồ sơ
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Hồ sơ thuộc <strong>{activeSection.title}</strong> ({activeSection.sheetName}).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                  {/* Category switcher dropdown */}
                  <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Chuyển mục:</span>
                    <select
                      value={activeSection.entityType}
                      onChange={(e) => handleSectionTypeChange(activeSectionIndex, e.target.value as EntityType)}
                      className="text-xs font-bold text-indigo-900 bg-transparent focus:outline-hidden cursor-pointer"
                    >
                      <option value="speaker">🎤 Diễn giả & Chuyên gia</option>
                      <option value="enterprise">🏢 Doanh nghiệp & Đối tác</option>
                      <option value="guest">🎟️ Khách mời Tham dự</option>
                      <option value="event">📅 Quản lý Sự kiện</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      const updated = autoSplitSections(sections);
                      setSections(updated);
                      setAiSuccessMessage(`Đã tự động rà soát và chia thành ${updated.length} danh mục độc lập!`);
                      setTimeout(() => setAiSuccessMessage(null), 3500);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:bg-indigo-50/50"
                    title="Rà soát lại toàn bộ dòng trong tệp và tự động bóc tách thành 4 mục độc lập"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                    <span>⚡ Tự động chia 4 mục</span>
                  </button>

                  <button
                    onClick={handleAiAutoMap}
                    disabled={isAiMappingLoading}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isAiMappingLoading ? (
                      <>
                        <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>AI đang phân tích...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Gemini AI Ánh Xạ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {aiSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{aiSuccessMessage}</span>
                </div>
              )}

              {/* Template selector */}
              {templates.filter(t => t.entityType === activeSection.entityType).length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-700">Áp dụng mẫu ánh xạ đã lưu:</span>
                  </div>
                  <select
                    value={activeSection.selectedTemplateId || ''}
                    onChange={(e) => applyTemplateToActiveSection(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- Chọn mẫu đã lưu --</option>
                    {templates
                      .filter(t => t.entityType === activeSection.entityType)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                  </select>
                </div>
              )}

              {/* Mapping Rules Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Ma Trận Cột Nguồn ({activeSection.mappingRules.length} cột trong {activeSection.sheetName})</span>
                  <span>Trường Chuẩn Hóa Hệ Thống</span>
                </div>
                <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto">
                  {activeSection.mappingRules.map((rule, rIdx) => {
                    const matchedCanonical = activeCanonicalFields.find(f => f.fieldKey === rule.targetField);
                    return (
                      <div key={rIdx} className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        rule.isIgnored ? 'bg-slate-50/60 opacity-60' : 'bg-white hover:bg-indigo-50/20'
                      }`}>
                        {/* Source column info */}
                        <div className="sm:w-5/12 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{rule.sourceColumn}</span>
                            {rule.confidence > 0 && !rule.isIgnored && (
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                                rule.confidence >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {rule.confidence}% khớp
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            Mẫu: {(rule.sampleValues || []).slice(0, 2).join(' | ') || '(Trống)'}
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block shrink-0" />

                        {/* Target Canonical Field & Transform */}
                        <div className="sm:w-6/12 flex items-center gap-2">
                          <select
                            value={rule.targetField || ''}
                            onChange={(e) => updateRuleInActiveSection(rule.sourceColumn, e.target.value)}
                            className={`flex-1 text-xs py-1.5 px-2.5 rounded-lg border font-medium transition-all ${
                              rule.targetField
                                ? 'border-indigo-300 bg-white text-slate-900 focus:border-indigo-500'
                                : 'border-slate-200 bg-slate-50 text-slate-400'
                            }`}
                          >
                            <option value="">-- Bỏ qua cột này (Không nhập) --</option>
                            {activeCanonicalFields.map(field => (
                              <option key={field.fieldKey} value={field.fieldKey}>
                                {field.label} {field.required ? '(* Bắt buộc)' : ''}
                              </option>
                            ))}
                          </select>

                          {/* Transform selector */}
                          {rule.targetField && (
                            <select
                              value={rule.transform}
                              onChange={(e) => updateTransformInActiveSection(rule.sourceColumn, e.target.value as any)}
                              className="w-36 text-[11px] py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
                              title="Quy tắc chuẩn hóa dữ liệu"
                            >
                              <option value="none">Giữ nguyên</option>
                              <option value="name_titlecase">Chữ hoa đầu từ</option>
                              <option value="phone_vn">Chuẩn SĐT (+84)</option>
                              <option value="email_lower">Email viết thường</option>
                              <option value="array_split">Tách phẩy mảng</option>
                              <option value="number">Số / Rating</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save mapping template option */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shouldSaveTemplate}
                    onChange={(e) => setShouldSaveTemplate(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Lưu cấu hình ánh xạ này làm mẫu cho lần sau</span>
                </label>
                {shouldSaveTemplate && (
                  <input
                    type="text"
                    placeholder="Đặt tên mẫu (VD: Mẫu Diễn giả 2026)..."
                    value={saveTemplateName}
                    onChange={(e) => setSaveTemplateName(e.target.value)}
                    className="text-xs py-1 px-2.5 rounded-lg border border-slate-300 w-60"
                  />
                )}
              </div>

            </div>
          )}

          {/* STEP 3: CONFLICT CHECK & PREVIEW PER CATEGORY */}
          {currentStep === 'preview' && activeSection && (
            <div className="space-y-4">
              
              {/* Category Selector Tabs */}
              <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1.5 overflow-x-auto border border-slate-200">
                <span className="text-xs font-bold text-slate-500 px-3 uppercase tracking-wider hidden sm:inline">
                  Xem trước:
                </span>
                {sections.map((sec, idx) => {
                  const isActive = idx === activeSectionIndex;
                  const secConflicts = parsedSectionsMap[sec.id]?.conflictCount || 0;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSectionIndex(idx)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        isActive
                          ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200 ring-2 ring-indigo-500/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      {getEntityIcon(sec.entityType)}
                      <span>{sec.title}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {sec.rows.length}
                      </span>
                      {secConflicts > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                          {secConflicts} trùng
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Banner filter notification */}
              {activeSection.skippedBanners && activeSection.skippedBanners.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-emerald-950">
                      Đã tự động phát hiện &amp; lọc bỏ {activeSection.skippedBanners.length} dòng thông tin không liên quan ở đầu tệp.
                    </span>
                    <span className="text-emerald-700 ml-1.5 hidden sm:inline">
                      Bảng dữ liệu đã sẵn sàng để lưu vào hệ thống.
                    </span>
                  </div>
                </div>
              )}

              {/* Global Conflict Status Banner */}
              {totalAllConflicts > 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-xs flex-1">
                    <div>
                      <span className="font-bold text-sm text-amber-950 block">
                        Phát hiện {totalAllConflicts} bản ghi có thể trùng lặp trên toàn bộ các danh mục!
                      </span>
                      <span className="text-amber-800">
                        Hệ thống đối soát theo Email, SĐT và Tên. Vui lòng chọn cách xử lý bên dưới:
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="dupStrategy"
                          value="update"
                          checked={duplicateStrategy === 'update'}
                          onChange={() => setDuplicateStrategy('update')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Cập nhật & Bổ sung thông tin mới vào hồ sơ cũ (Khuyên dùng)</span>
                      </label>
                      <label className="flex items-center gap-2 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="dupStrategy"
                          value="skip"
                          checked={duplicateStrategy === 'skip'}
                          onChange={() => setDuplicateStrategy('skip')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Bỏ qua các dòng trùng</span>
                      </label>
                      <label className="flex items-center gap-2 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="dupStrategy"
                          value="add"
                          checked={duplicateStrategy === 'add'}
                          onChange={() => setDuplicateStrategy('add')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Thêm mới như bản ghi độc lập</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-sm text-emerald-950 block">Dữ liệu hoàn toàn sạch và hợp lệ!</span>
                    <span className="text-emerald-800">Tất cả {totalAllRows} bản ghi trên {sections.length} danh mục đã sẵn sàng để nhập vào hệ thống.</span>
                  </div>
                </div>
              )}

              {/* Preview Table for Current Section */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    {getEntityIcon(activeSection.entityType)}
                    <span>Bản xem trước dữ liệu: {activeSection.title} ({currentRecords.length} dòng)</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal">Đã áp dụng quy tắc chuẩn hóa định dạng</span>
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3">STT</th>
                        <th className="py-2.5 px-3">Trạng Thái</th>
                        {activeCanonicalFields
                          .filter(f => activeSection.mappingRules.some(r => r.targetField === f.fieldKey && !r.isIgnored))
                          .map(f => (
                            <th key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap">{f.label}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {currentRecords.map((rec, idx) => (
                        <tr key={idx} className={rec._isConflict ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            {rec._isConflict ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title={String(rec._conflictReason)}>
                                Trùng lặp
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Mới
                              </span>
                            )}
                          </td>
                          {activeCanonicalFields
                            .filter(f => activeSection.mappingRules.some(r => r.targetField === f.fieldKey && !r.isIgnored))
                            .map(f => {
                              const val = rec[f.fieldKey];
                              if (f.fieldKey === 'rating') {
                                const num = Number(val) || 4.8;
                                return (
                                  <td key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                                      ⭐ {num.toFixed(1)} / 5.0
                                    </span>
                                  </td>
                                );
                              }
                              if (f.fieldKey === 'attendeeCount') {
                                const num = Number(val) || 0;
                                return (
                                  <td key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-xs font-mono">
                                      👥 {num.toLocaleString('vi-VN')} khách
                                    </span>
                                  </td>
                                );
                              }
                              if (f.fieldKey === 'budget') {
                                const num = Number(val) || 0;
                                return (
                                  <td key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 text-xs font-mono">
                                      💰 {num > 0 ? `${num.toLocaleString('vi-VN')} đ` : '0 đ'}
                                    </span>
                                  </td>
                                );
                              }
                              if (f.fieldKey === 'status') {
                                const statusStr = String(val || 'Sắp diễn ra');
                                const isFinished = statusStr === 'Đã kết thúc';
                                const isOngoing = statusStr === 'Đang diễn ra';
                                return (
                                  <td key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                      isFinished
                                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                                        : isOngoing
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                      📅 {statusStr}
                                    </span>
                                  </td>
                                );
                              }
                              if (f.fieldKey === 'code') {
                                return (
                                  <td key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap font-mono text-xs font-bold text-indigo-700">
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                                      {String(val || '-')}
                                    </span>
                                  </td>
                                );
                              }
                              if (f.fieldKey === 'tier') {
                                return (
                                  <td key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                                      💎 {String(val || 'Strategic')}
                                    </span>
                                  </td>
                                );
                              }
                              if (f.fieldKey === 'ticketType') {
                                return (
                                  <td key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold">
                                      🎟️ {String(val || 'Standard')}
                                    </span>
                                  </td>
                                );
                              }
                              if (f.fieldKey === 'tags') {
                                const arr = ensureArray(val);
                                return (
                                  <td key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="flex gap-1 flex-wrap max-w-xs">
                                      {arr.length > 0 ? (
                                        arr.map((t, i) => (
                                          <span key={i} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                            🏢 {t}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-slate-400 text-xs">-</span>
                                      )}
                                    </div>
                                  </td>
                                );
                              }
                              if (f.fieldKey === 'note') {
                                const noteStr = String(val || '').trim();
                                const isError = /lỗi|error|thiếu|sai/i.test(noteStr);
                                return (
                                  <td key={f.fieldKey} className="py-2.5 px-3 max-w-xs truncate text-xs">
                                    {noteStr ? (
                                      <span
                                        className={`inline-block truncate max-w-[200px] px-2 py-0.5 rounded text-[11px] ${
                                          isError
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200 font-medium'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                        title={noteStr}
                                      >
                                        📝 {noteStr}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <td key={f.fieldKey} className="py-2.5 px-3 whitespace-nowrap text-slate-800">
                                  {Array.isArray(val) ? (
                                    <div className="flex gap-1 flex-wrap">
                                      {val.map((t, i) => (
                                        <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    String(val || '-')
                                  )}
                                </td>
                              );
                            })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: COMPLETED SUMMARY (MULTI-CATEGORY BREAKDOWN) */}
          {currentStep === 'completed' && importSummary && (
            <div className="py-6 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Nhập &amp; Phân Loại Dữ Liệu Thành Công!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đã tự động sắp xếp vào từng mục tương ứng trong hệ thống EventData Hub
                </p>
              </div>

              {/* Overall metric stats */}
              <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xl font-extrabold text-slate-900">{importSummary.total}</span>
                  <span className="block text-[11px] text-slate-500 font-medium mt-0.5">Tổng dòng xử lý</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xl font-extrabold text-emerald-700">{importSummary.inserted}</span>
                  <span className="block text-[11px] text-emerald-600 font-medium mt-0.5">Thêm mới</span>
                </div>
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
                  <span className="text-xl font-extrabold text-indigo-700">{importSummary.updated}</span>
                  <span className="block text-[11px] text-indigo-600 font-medium mt-0.5">Cập nhật gộp</span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-xl font-extrabold text-amber-700">{importSummary.skipped}</span>
                  <span className="block text-[11px] text-amber-600 font-medium mt-0.5">Bỏ qua</span>
                </div>
              </div>

              {/* Category Breakdown Cards */}
              <div className="max-w-2xl mx-auto space-y-2 text-left">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Chi tiết nhập theo từng mục:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(importSummary.breakdown).map(([secId, stat]: [string, { total: number; inserted: number; updated: number; skipped: number; title: string }]) => (
                    <div key={secId} className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                      <span className="font-bold text-xs text-slate-900 block truncate">{stat.title}</span>
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Tổng:</span>
                          <span className="font-semibold">{stat.total}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Thêm mới:</span>
                          <span className="font-semibold">+{stat.inserted}</span>
                        </div>
                        <div className="flex justify-between text-indigo-700">
                          <span>Cập nhật:</span>
                          <span className="font-semibold">{stat.updated}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {currentStep !== 'upload' && currentStep !== 'completed' && (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 'mapping') setCurrentStep('upload');
                  if (currentStep === 'preview') setCurrentStep('mapping');
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-all"
              >
                Quay lại
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep === 'upload' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-all"
              >
                Đóng
              </button>
            )}

            {currentStep === 'mapping' && (
              <button
                type="button"
                onClick={() => setCurrentStep('preview')}
                disabled={sections.length === 0}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <span>Tiếp tục: Kiểm tra dữ liệu ({totalAllRows} dòng)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 'preview' && (
              <button
                type="button"
                onClick={executeImport}
                disabled={isProcessing}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-600/30"
              >
                {isProcessing ? (
                  <>
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    <span>Đang chuẩn hóa & Lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận Lưu Dữ Liệu ({totalAllRows} bản ghi vào {sections.length} mục)</span>
                  </>
                )}
              </button>
            )}

            {currentStep === 'completed' && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
              >
                Đóng và Xem Cơ sở Dữ liệu
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
