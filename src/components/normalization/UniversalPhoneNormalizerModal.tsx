import React, { useState, useMemo } from 'react';
import { 
  X, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Globe, 
  MessageCircle, 
  Copy, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  Zap, 
  FileSpreadsheet, 
  Filter,
  Search,
  CheckCheck
} from 'lucide-react';
import { Speaker, Enterprise, Guest, EntityType } from '../../types';
import { 
  normalizePhoneField, 
  auditPhoneHealth, 
  sanitizeRawPhoneString, 
  resolveNumberPrefixes,
  NormalizedPhoneNumber
} from '../../services/phoneNormalizer';
import { PhoneBadge } from '../common/PhoneBadge';

interface UniversalPhoneNormalizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakers: Speaker[];
  enterprises: Enterprise[];
  guests: Guest[];
  onBatchUpdatePhones: (
    updates: {
      speakers?: Array<{ id: string; phone: string }>;
      enterprises?: Array<{ id: string; contactPhone: string }>;
      guests?: Array<{ id: string; phone: string }>;
    }
  ) => void;
}

const SAMPLE_PRESETS = [
  { label: 'VN Mất số 0 đầu (Excel)', value: '918987654' },
  { label: 'VN Có định dạng chấm', value: '0918.987.654' },
  { label: 'VN Kèm tiền tố SĐT', value: 'SĐT: 0903 123 456' },
  { label: 'Mỹ (US/Canada)', value: '+1 (415) 555-2671' },
  { label: 'Úc có số (0) thừa', value: '+61 (0) 412 345 678' },
  { label: 'Anh có số (0) thừa', value: '+44 (0) 20 7946 0912' },
  { label: 'Hàn Quốc thiếu dấu +', value: '821098765432' },
  { label: 'Singapore thiếu dấu +', value: '6591234567' },
  { label: '2 Số điện thoại (Nhật)', value: '+81 90 1234 5678 / +81 3 5555 0143' },
  { label: 'Lỗi chứa chữ (Invalid)', value: '0977-KHONG-CO' },
];

export const UniversalPhoneNormalizerModal: React.FC<UniversalPhoneNormalizerModalProps> = ({
  isOpen,
  onClose,
  speakers,
  enterprises,
  guests,
  onBatchUpdatePhones,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'tester'>('audit');
  const [testInput, setTestInput] = useState('+81 90 1234 5678 / +81 3 5555 0143');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'invalid' | 'international' | 'multi'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Run audit on current database
  const auditReport = useMemo(() => {
    return auditPhoneHealth(speakers, enterprises, guests);
  }, [speakers, enterprises, guests]);

  // Real-time analysis for tester
  const testAnalysis = useMemo(() => {
    const raw = testInput.trim();
    const sanitized = sanitizeRawPhoneString(raw);
    const resolved = resolveNumberPrefixes(sanitized);
    const fullResult = normalizePhoneField(raw);
    return {
      raw,
      sanitized,
      resolved,
      fullResult,
    };
  }, [testInput]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Convert all items to clean E.164
  const handleApplyE164ToAll = () => {
    const speakerUpdates: Array<{ id: string; phone: string }> = [];
    const enterpriseUpdates: Array<{ id: string; contactPhone: string }> = [];
    const guestUpdates: Array<{ id: string; phone: string }> = [];

    speakers.forEach(s => {
      if (s.phone) {
        const res = normalizePhoneField(s.phone);
        if (res.primary.isValid) {
          const newPhone = res.hasMultiple
            ? res.allNumbers.map(n => n.e164 || n.raw).join(' / ')
            : res.primary.e164 || s.phone;
          if (newPhone !== s.phone) {
            speakerUpdates.push({ id: s.id, phone: newPhone });
          }
        }
      }
    });

    enterprises.forEach(e => {
      if (e.contactPhone) {
        const res = normalizePhoneField(e.contactPhone);
        if (res.primary.isValid) {
          const newPhone = res.hasMultiple
            ? res.allNumbers.map(n => n.e164 || n.raw).join(' / ')
            : res.primary.e164 || e.contactPhone;
          if (newPhone !== e.contactPhone) {
            enterpriseUpdates.push({ id: e.id, contactPhone: newPhone });
          }
        }
      }
    });

    guests.forEach(g => {
      if (g.phone) {
        const res = normalizePhoneField(g.phone);
        if (res.primary.isValid) {
          const newPhone = res.hasMultiple
            ? res.allNumbers.map(n => n.e164 || n.raw).join(' / ')
            : res.primary.e164 || g.phone;
          if (newPhone !== g.phone) {
            guestUpdates.push({ id: g.id, phone: newPhone });
          }
        }
      }
    });

    onBatchUpdatePhones({
      speakers: speakerUpdates,
      enterprises: enterpriseUpdates,
      guests: guestUpdates,
    });

    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 3000);
  };

  // Build full item list for table view
  const allDatabaseEntities = [
    ...speakers.map(s => ({
      id: s.id,
      entityType: 'speaker' as EntityType,
      name: s.fullName,
      phone: s.phone,
      organization: s.organization,
      role: s.role,
    })),
    ...enterprises.map(e => ({
      id: e.id,
      entityType: 'enterprise' as EntityType,
      name: e.name,
      phone: e.contactPhone,
      organization: e.industry,
      role: e.contactPerson || 'Đại diện',
    })),
    ...guests.map(g => ({
      id: g.id,
      entityType: 'guest' as EntityType,
      name: g.fullName,
      phone: g.phone,
      organization: g.organization,
      role: g.ticketType,
    })),
  ];

  const filteredEntities = allDatabaseEntities.filter(item => {
    if (!item.phone || !item.phone.trim()) return false;
    const res = normalizePhoneField(item.phone);

    if (selectedFilter === 'invalid' && res.primary.isValid) return false;
    if (selectedFilter === 'international' && (!res.primary.isValid || res.primary.isVietnamese)) return false;
    if (selectedFilter === 'multi' && !res.hasMultiple) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = item.name.toLowerCase().includes(term);
      const matchPhone = item.phone.toLowerCase().includes(term);
      const matchOrg = item.organization.toLowerCase().includes(term);
      return matchName || matchPhone || matchOrg;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Động Cơ Chuẩn Hóa Số Điện Thoại Quốc Tế (E.164 Universal)</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold">
                  E.164 Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Tự động nhận diện, tách đa số, xử lý lỗi mất số 0 Excel, phân loại quốc gia và tạo link OTT 1-click
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đối Soát SĐT Toàn Hệ Thống ({auditReport.totalScanned})</span>
            </button>
            <button
              onClick={() => setActiveTab('tester')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'tester'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Phòng Thử Nghiệm Quy Trình 5 Bước (Pipeline Playground)</span>
            </button>
          </div>

          {activeTab === 'audit' && (
            <div className="flex items-center gap-2">
              {appliedSuccess && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCheck className="w-4 h-4" /> Đã chuẩn hóa E.164 thành công!
                </span>
              )}
              <button
                onClick={handleApplyE164ToAll}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Chuẩn Hóa Hàng Loạt Về E.164</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: AUDIT & HEALTH REPORT */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                
                {/* Score */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Độ Chuẩn Xác</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-emerald-400">{auditReport.validPercentage}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Chuẩn E.164</span>
                </div>

                {/* Valid */}
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-700 font-medium">SĐT Hợp Lệ</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-emerald-900">{auditReport.totalValid}</span>
                    <span className="text-xs text-emerald-600">/{auditReport.totalScanned}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 mt-1">Đã kiểm định E.164</span>
                </div>

                {/* Vietnamese */}
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col justify-between">
                  <span className="text-[11px] text-indigo-700 font-medium">Việt Nam (+84)</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-indigo-900">{auditReport.totalVietnamese}</span>
                  </div>
                  <span className="text-[10px] text-indigo-600 mt-1">Đầu số nội địa</span>
                </div>

                {/* International */}
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex flex-col justify-between">
                  <span className="text-[11px] text-purple-700 font-medium">Quốc Tế (🌍)</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-purple-900">{auditReport.totalInternational}</span>
                  </div>
                  <span className="text-[10px] text-purple-600 mt-1">Giữ nguyên mã gốc</span>
                </div>

                {/* Multi phone */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col justify-between">
                  <span className="text-[11px] text-amber-700 font-medium">Ô Chứa Đa Số</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-amber-900">{auditReport.totalMultiPhone}</span>
                  </div>
                  <span className="text-[10px] text-amber-600 mt-1">Tách Chính / Phụ</span>
                </div>

                {/* Invalid */}
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex flex-col justify-between">
                  <span className="text-[11px] text-rose-700 font-medium">Lỗi Định Dạng</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-rose-900">{auditReport.totalInvalid}</span>
                  </div>
                  <span className="text-[10px] text-rose-600 mt-1">Cần đối soát</span>
                </div>

              </div>

              {/* Filter and search bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({allDatabaseEntities.filter(i => i.phone).length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('invalid')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      selectedFilter === 'invalid' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    <span>Lỗi cần sửa</span>
                    {auditReport.totalInvalid > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px]">
                        {auditReport.totalInvalid}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedFilter('international')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedFilter === 'international' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-purple-700'
                    }`}
                  >
                    Quốc tế ({auditReport.totalInternational})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('multi')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedFilter === 'multi' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-amber-700'
                    }`}
                  >
                    Đa số ({auditReport.totalMultiPhone})
                  </button>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm tên, SĐT, công ty..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Phân loại</th>
                        <th className="py-2.5 px-3 font-bold">Họ tên / Đơn vị</th>
                        <th className="py-2.5 px-3 font-bold">SĐT Gốc Trong File</th>
                        <th className="py-2.5 px-3 font-bold">Chuẩn Hóa E.164 & Thao Tác 1-Click</th>
                        <th className="py-2.5 px-3 font-bold">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEntities.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                            Không tìm thấy bản ghi nào khớp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        filteredEntities.map((item) => {
                          const res = normalizePhoneField(item.phone);
                          return (
                            <tr key={`${item.entityType}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.entityType === 'speaker' ? 'bg-indigo-100 text-indigo-800' :
                                  item.entityType === 'enterprise' ? 'bg-amber-100 text-amber-800' :
                                  'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {item.entityType === 'speaker' ? 'Diễn giả' :
                                   item.entityType === 'enterprise' ? 'Doanh nghiệp' : 'Khách mời'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-900 block">{item.name}</span>
                                <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                                  {item.role} • {item.organization}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {item.phone}
                              </td>
                              <td className="py-2.5 px-3">
                                <PhoneBadge phone={item.phone} />
                              </td>
                              <td className="py-2.5 px-3">
                                {res.primary.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Hợp lệ ({res.primary.country || 'VN'})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-[11px]">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>{res.primary.errorReason || 'Lỗi SĐT'}</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: 5-STEP PIPELINE TESTER */}
          {activeTab === 'tester' && (
            <div className="space-y-6">
              
              {/* Presets */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Dữ Liệu Thử Nghiệm Mẫu (Preset Test Cases):
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTestInput(p.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        testInput === p.value
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}: <span className="font-mono text-slate-800">{p.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Nhập Chuỗi Số Điện Thoại Cần Xử Lý:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Nhập bất kỳ định dạng SĐT nào..."
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-300 bg-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    onClick={() => setTestInput('')}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-semibold"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              {/* 5-Step Visual Pipeline Cards */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <span>Quy Trình 5 Bước Tự Động Xử Lý:</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  
                  {/* Step 1 */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold mb-1">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[11px]">1</span>
                        <span>Làm Sạch Thô</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Loại bỏ dấu chấm, gạch ngang, nhãn SĐT:, và số (0) mã vùng thừa.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 font-mono text-xs text-slate-800 break-all font-bold">
                      {testAnalysis.sanitized || '—'}
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold mb-1">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[11px]">2</span>
                        <span>Tách Đa Số</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Phân tách theo dấu /, ,, ;, hoặc, and thành SĐT Chính và SĐT Phụ.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-800">
                      {testAnalysis.fullResult.hasMultiple ? (
                        <span className="text-amber-700 font-bold">
                          Đã tách {testAnalysis.fullResult.allNumbers.length} số độc lập
                        </span>
                      ) : (
                        <span className="text-slate-600">Số đơn nhất</span>
                      )}
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold mb-1">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[11px]">3</span>
                        <span>Chuẩn Hóa E.164</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Bù +84 cho lỗi rụng 0 Excel, đối soát ITU bù dấu +, giữ nguyên mã quốc tế.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100 font-mono text-xs text-indigo-900 font-bold flex items-center gap-1">
                      <span>{testAnalysis.fullResult.primary.countryFlag || '🌐'}</span>
                      <span className="truncate">{testAnalysis.fullResult.primary.e164 || testAnalysis.resolved || '—'}</span>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold mb-1">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[11px]">4</span>
                        <span>Kiểm Tra Lỗi</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Xác thực độ dài theo chuẩn viễn thông quốc gia hoặc gắn cờ báo lỗi.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg text-xs font-bold">
                      {testAnalysis.fullResult.primary.isValid ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hợp lệ E.164
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {testAnalysis.fullResult.primary.errorReason || 'Lỗi định dạng'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold mb-1">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[11px]">5</span>
                        <span>Sinh Link OTT</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Tự động sinh link WhatsApp (wa.me), Gọi điện (tel:) và Zalo.
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {testAnalysis.fullResult.primary.whatsappLink && (
                        <a
                          href={testAnalysis.fullResult.primary.whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          title="Mở WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {testAnalysis.fullResult.primary.telLink && (
                        <a
                          href={testAnalysis.fullResult.primary.telLink}
                          className="p-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                          title="Gọi điện"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Detailed Output Breakdown */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-100 pb-2">
                  Kết Quả Chuẩn Hóa Chi Tiết & Tương Tác:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Primary Phone */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <span>📱 Số Điện Thoại Chính (Primary Phone)</span>
                      </span>
                      <span className="text-lg">
                        {testAnalysis.fullResult.primary.countryFlag || '🌐'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Định dạng E.164 Chuẩn:</span>
                        <span className="font-mono font-bold text-indigo-700">
                          {testAnalysis.fullResult.primary.e164 || 'Chưa hợp lệ'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Quốc Gia:</span>
                        <span className="font-medium text-slate-800">
                          {testAnalysis.fullResult.primary.countryName} ({testAnalysis.fullResult.primary.country || 'N/A'})
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Mã Vùng Quốc Tế:</span>
                        <span className="font-mono text-slate-800 font-semibold">
                          {testAnalysis.fullResult.primary.countryCallingCode || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Loại Đường Truyền:</span>
                        <span className="text-slate-800">
                          {testAnalysis.fullResult.primary.numberType === 'MOBILE' ? 'Di động (Mobile)' :
                           testAnalysis.fullResult.primary.numberType === 'FIXED_LINE' ? 'Cố định (Fixed Line)' : 'Không xác định'}
                        </span>
                      </div>
                    </div>

                    {/* Action Links */}
                    {testAnalysis.fullResult.primary.isValid && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {testAnalysis.fullResult.primary.whatsappLink && (
                          <a
                            href={testAnalysis.fullResult.primary.whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Nhắn tin WhatsApp</span>
                          </a>
                        )}
                        {testAnalysis.fullResult.primary.telLink && (
                          <a
                            href={testAnalysis.fullResult.primary.telLink}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Gọi Điện</span>
                          </a>
                        )}
                        {testAnalysis.fullResult.primary.zaloLink && (
                          <a
                            href={testAnalysis.fullResult.primary.zaloLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>Zalo Chat</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Secondary Phone (if exists) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>📞 Số Điện Thoại Phụ (Secondary Phone)</span>
                      </span>
                      {testAnalysis.fullResult.secondary && (
                        <span className="text-lg">
                          {testAnalysis.fullResult.secondary.countryFlag || '🌐'}
                        </span>
                      )}
                    </div>

                    {testAnalysis.fullResult.secondary ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Định dạng E.164:</span>
                          <span className="font-mono font-bold text-indigo-700">
                            {testAnalysis.fullResult.secondary.e164 || 'Chưa hợp lệ'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Quốc Gia:</span>
                          <span className="font-medium text-slate-800">
                            {testAnalysis.fullResult.secondary.countryName} ({testAnalysis.fullResult.secondary.country || 'N/A'})
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Mã Vùng:</span>
                          <span className="font-mono text-slate-800 font-semibold">
                            {testAnalysis.fullResult.secondary.countryCallingCode || '—'}
                          </span>
                        </div>
                        <div className="pt-2 flex flex-wrap gap-2">
                          {testAnalysis.fullResult.secondary.whatsappLink && (
                            <a
                              href={testAnalysis.fullResult.secondary.whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          {testAnalysis.fullResult.secondary.telLink && (
                            <a
                              href={testAnalysis.fullResult.secondary.telLink}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Gọi</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-400 italic text-xs">
                        Ô dữ liệu này không chứa số phụ thứ hai.
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Chuẩn viễn thông Quốc tế ITU-T Recommendation E.164 & ISO 3166-1 alpha-2</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
