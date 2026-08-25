import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCcw, 
  ShieldCheck,
  Phone,
  Mail,
  User,
  Tags
} from 'lucide-react';
import { Speaker, Enterprise, Guest } from '../../types';
import { normalizeVietnameseName, normalizeVietnamesePhone, normalizeEmail, normalizeTags, extractErrorsAndCleanTags } from '../../services/normalizer';

interface FormatStandardizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakers: Speaker[];
  enterprises: Enterprise[];
  guests: Guest[];
  onApplyStandardization: (
    updatedSpeakers: Speaker[],
    updatedEnterprises: Enterprise[],
    updatedGuests: Guest[]
  ) => void;
}

export const FormatStandardizerModal: React.FC<FormatStandardizerModalProps> = ({
  isOpen,
  onClose,
  speakers = [],
  enterprises = [],
  guests = [],
  onApplyStandardization,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'0xxx' | '+84'>('0xxx');
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [hasCompleted, setHasCompleted] = useState<boolean>(false);

  if (!isOpen) return null;

  // Scan un-normalized items
  const unnormalizedItems: Array<{
    id: string;
    type: string;
    name: string;
    changes: Array<{ field: string; before: string; after: string }>;
  }> = [];

  speakers.forEach(s => {
    const changes: Array<{ field: string; before: string; after: string }> = [];
    const cleanName = normalizeVietnameseName(s.fullName);
    if (cleanName !== s.fullName) changes.push({ field: 'Họ tên', before: s.fullName, after: cleanName });

    const cleanPhone = normalizeVietnamesePhone(s.phone, selectedFormat);
    if (cleanPhone && cleanPhone !== s.phone) changes.push({ field: 'Số điện thoại', before: s.phone, after: cleanPhone });

    const cleanEmail = normalizeEmail(s.email);
    if (cleanEmail !== s.email) changes.push({ field: 'Email', before: s.email, after: cleanEmail });

    if (changes.length > 0) {
      unnormalizedItems.push({ id: s.id, type: 'Diễn giả', name: s.fullName, changes });
    }
  });

  enterprises.forEach(e => {
    const changes: Array<{ field: string; before: string; after: string }> = [];
    const cleanEmail = normalizeEmail(e.contactEmail);
    if (cleanEmail !== e.contactEmail) changes.push({ field: 'Email LH', before: e.contactEmail, after: cleanEmail });

    const cleanPerson = normalizeVietnameseName(e.contactPerson);
    if (cleanPerson && cleanPerson !== e.contactPerson) changes.push({ field: 'Người liên hệ', before: e.contactPerson, after: cleanPerson });

    if (changes.length > 0) {
      unnormalizedItems.push({ id: e.id, type: 'Doanh nghiệp', name: e.name, changes });
    }
  });

  guests.forEach(g => {
    const changes: Array<{ field: string; before: string; after: string }> = [];
    const cleanName = normalizeVietnameseName(g.fullName);
    if (cleanName !== g.fullName) changes.push({ field: 'Họ tên', before: g.fullName, after: cleanName });

    const cleanPhone = normalizeVietnamesePhone(g.phone, selectedFormat);
    if (cleanPhone && cleanPhone !== g.phone) changes.push({ field: 'Số điện thoại', before: g.phone, after: cleanPhone });

    const cleanEmail = normalizeEmail(g.email);
    if (cleanEmail !== g.email) changes.push({ field: 'Email', before: g.email, after: cleanEmail });

    if (changes.length > 0) {
      unnormalizedItems.push({ id: g.id, type: 'Khách mời', name: g.fullName, changes });
    }
  });

  const handleExecuteBatchClean = () => {
    setIsFixing(true);

    setTimeout(() => {
      const cleanSpeakers = speakers.map(s => {
        const { cleanTags, mergedNote } = extractErrorsAndCleanTags(s.tags, s.note);
        return {
          ...s,
          fullName: normalizeVietnameseName(s.fullName),
          phone: normalizeVietnamesePhone(s.phone, selectedFormat),
          email: normalizeEmail(s.email),
          tags: cleanTags,
          note: mergedNote,
          isNormalized: true,
          updatedAt: new Date().toISOString(),
        };
      });

      const cleanEnterprises = enterprises.map(e => {
        const { cleanTags, mergedNote } = extractErrorsAndCleanTags(e.tags, e.note);
        return {
          ...e,
          contactPerson: normalizeVietnameseName(e.contactPerson),
          contactEmail: normalizeEmail(e.contactEmail),
          contactPhone: normalizeVietnamesePhone(e.contactPhone, selectedFormat),
          tags: cleanTags,
          note: mergedNote,
          isNormalized: true,
          updatedAt: new Date().toISOString(),
        };
      });

      const cleanGuests = guests.map(g => {
        const { cleanTags, mergedNote } = extractErrorsAndCleanTags(g.tags, g.note);
        return {
          ...g,
          fullName: normalizeVietnameseName(g.fullName),
          phone: normalizeVietnamesePhone(g.phone, selectedFormat),
          email: normalizeEmail(g.email),
          tags: cleanTags,
          note: mergedNote,
          isNormalized: true,
          updatedAt: new Date().toISOString(),
        };
      });

      onApplyStandardization(cleanSpeakers, cleanEnterprises, cleanGuests);
      setIsFixing(false);
      setHasCompleted(true);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Công Cụ Chuẩn Hóa Định Dạng Tự Động (Batch Normalizer)
              </h2>
              <p className="text-xs text-slate-400">
                Tự động chuẩn hóa viết hoa Title Case cho tên, định dạng số điện thoại chuẩn VN và làm sạch email
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Configuration Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Định dạng Số Điện Thoại Chuẩn:</span>
              <span className="text-xs text-slate-500">Chọn quy chuẩn số điện thoại mong muốn áp dụng toàn hệ thống</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFormat('0xxx')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFormat === '0xxx'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                0912 345 678 (Nội địa)
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('+84')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFormat === '+84'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                +84 912 345 678 (Quốc tế)
              </button>
            </div>
          </div>

          {/* Summary & Detection list */}
          {unnormalizedItems.length === 0 || hasCompleted ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-6 ring-emerald-50">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Toàn bộ dữ liệu đã đạt chuẩn 100%!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Không tìm thấy lỗi định dạng nào về viết hoa, định dạng số điện thoại hay email.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Phát hiện {unnormalizedItems.length} hồ sơ cần chuẩn hóa định dạng:</span>
                <span className="text-indigo-600 font-semibold">{unnormalizedItems.reduce((acc, i) => acc + i.changes.length, 0)} trường sẽ được chỉnh sửa</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {unnormalizedItems.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                          {item.type}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {item.changes.map((chg, i) => (
                        <div key={i} className="flex items-center text-xs font-mono gap-2 text-slate-700">
                          <span className="text-[11px] font-sans font-medium text-slate-500 w-24 shrink-0">{chg.field}:</span>
                          <span className="line-through text-red-500 bg-red-50 px-1.5 py-0.5 rounded truncate max-w-xs">{chg.before}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-emerald-700 bg-emerald-50 font-bold px-1.5 py-0.5 rounded truncate max-w-xs">{chg.after}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-all"
          >
            Đóng
          </button>

          {unnormalizedItems.length > 0 && !hasCompleted && (
            <button
              type="button"
              onClick={handleExecuteBatchClean}
              disabled={isFixing}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-600/30"
            >
              {isFixing ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  <span>Đang thực hiện chuẩn hóa...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tự Động Chuẩn Hóa {unnormalizedItems.length} Hồ Sơ (1-Click)</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
