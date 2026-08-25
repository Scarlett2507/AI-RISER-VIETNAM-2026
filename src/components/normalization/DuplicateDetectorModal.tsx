import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Layers, 
  GitMerge, 
  Check, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  UserCheck,
  Building,
  User,
  Star
} from 'lucide-react';
import { DuplicateGroup, EntityType, Speaker, Enterprise, Guest } from '../../types';
import { normalizeTags, extractErrorsAndCleanTags } from '../../services/normalizer';

interface DuplicateDetectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroups: DuplicateGroup[];
  onMergeGroup: (group: DuplicateGroup, mergedRecord: Speaker | Enterprise | Guest, deletedId: string) => void;
  onIgnoreGroup?: (groupId: string) => void;
}

export const DuplicateDetectorModal: React.FC<DuplicateDetectorModalProps> = ({
  isOpen,
  onClose,
  duplicateGroups = [],
  onMergeGroup,
  onIgnoreGroup,
}) => {
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
  const [fieldSelections, setFieldSelections] = useState<Record<string, 'left' | 'right'>>({});

  if (!isOpen) return null;

  const currentGroup = duplicateGroups[selectedGroupIndex] || null;

  const getRecordA = (): any => currentGroup?.items[0] || {};
  const getRecordB = (): any => currentGroup?.items[1] || {};

  const handleSelectField = (field: string, source: 'left' | 'right') => {
    setFieldSelections(prev => ({
      ...prev,
      [field]: source,
    }));
  };

  const executeMerge = () => {
    if (!currentGroup) return;
    const a = getRecordA();
    const b = getRecordB();

    const merged: any = {
      ...a,
      isNormalized: true,
      updatedAt: new Date().toISOString(),
    };

    // Combine tags and notes cleanly
    const { cleanTags, mergedNote } = extractErrorsAndCleanTags(
      [...(a.tags || []), ...(b.tags || [])],
      [a.note, b.note].filter(Boolean).join(' | ')
    );
    merged.tags = cleanTags;
    merged.note = mergedNote;
    if (a.events || b.events || a.eventsAttended || b.eventsAttended) {
      const combinedEvents = [
        ...(a.events || a.eventsAttended || []),
        ...(b.events || b.eventsAttended || []),
      ];
      if (currentGroup.entityType === 'guest') {
        merged.eventsAttended = Array.from(new Set(combinedEvents));
      } else {
        merged.events = Array.from(new Set(combinedEvents));
      }
    }
    if (a.expertise || b.expertise) {
      merged.expertise = Array.from(new Set([...(a.expertise || []), ...(b.expertise || [])]));
    }
    if (a.participationCount || b.participationCount) {
      merged.participationCount = Math.max(a.participationCount || 0, b.participationCount || 0) + 1;
    }

    // Apply manual field overrides
    Object.keys(fieldSelections).forEach(field => {
      const choice = fieldSelections[field];
      merged[field] = choice === 'right' ? b[field] : a[field];
    });

    // Pick highest rating if applicable
    if (a.rating || b.rating) {
      merged.rating = Math.max(a.rating || 0, b.rating || 0);
    }

    const deletedId = b.id;
    onMergeGroup(currentGroup, merged, deletedId);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    if (selectedGroupIndex >= duplicateGroups.length - 1) {
      setSelectedGroupIndex(Math.max(0, duplicateGroups.length - 2));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Trung Tâm Phát Hiện & Gộp Dữ Liệu Trùng Lặp
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/30 font-medium">
                  {duplicateGroups.length} nhóm phát hiện
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Đối chiếu 2 hồ sơ trùng khớp thông minh, tùy chọn giữ lại thông tin chính xác nhất và làm sạch tự động
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

        {duplicateGroups.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Tuyệt vời! Không phát hiện hồ sơ trùng lặp nào
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Cơ sở dữ liệu của bạn đã được chuẩn hóa sạch sẽ. Hệ thống sẽ tự động quét khi có dữ liệu mới được nhập vào.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              Đóng cửa sổ
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* Sidebar list of duplicate groups */}
            <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto shrink-0 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Danh sách nhóm trùng ({duplicateGroups.length})
              </span>
              {duplicateGroups.map((group, idx) => {
                const isSelected = idx === selectedGroupIndex;
                const itemA = group.items[0] as any;
                const name = itemA.fullName || itemA.name || 'Không rõ tên';
                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroupIndex(idx);
                      setFieldSelections({});
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-900 truncate">{name}</span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        {group.similarityScore}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {group.matchReason}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Main comparison & merge workspace */}
            {currentGroup && (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                
                {/* Match Reason Banner */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-950">Lý do phát hiện: </span>
                      <span>{currentGroup.matchReason}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200/70 text-amber-900">
                    Độ tương đồng: {currentGroup.similarityScore}%
                  </span>
                </div>

                {/* Side by side cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Candidate A (Primary) */}
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                      <span className="text-xs font-bold text-indigo-900 uppercase">Hồ sơ A (Dữ liệu gốc hiện tại)</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        ID: {getRecordA().id}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Họ tên / Tên đơn vị:</span>
                        <div className="flex items-center justify-between font-bold text-slate-900 mt-0.5">
                          <span>{getRecordA().fullName || getRecordA().name}</span>
                          <button
                            onClick={() => handleSelectField(getRecordA().fullName ? 'fullName' : 'name', 'left')}
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              fieldSelections[getRecordA().fullName ? 'fullName' : 'name'] !== 'right'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Chọn A
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">Email:</span>
                        <div className="flex items-center justify-between font-mono text-slate-800 mt-0.5">
                          <span>{getRecordA().email || getRecordA().contactEmail || '-'}</span>
                          <button
                            onClick={() => handleSelectField(getRecordA().email ? 'email' : 'contactEmail', 'left')}
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              fieldSelections[getRecordA().email ? 'email' : 'contactEmail'] !== 'right'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Chọn A
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">Số điện thoại:</span>
                        <div className="flex items-center justify-between font-mono text-slate-800 mt-0.5">
                          <span>{getRecordA().phone || getRecordA().contactPhone || '-'}</span>
                          <button
                            onClick={() => handleSelectField(getRecordA().phone ? 'phone' : 'contactPhone', 'left')}
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              fieldSelections[getRecordA().phone ? 'phone' : 'contactPhone'] !== 'right'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Chọn A
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">Đơn vị / Cơ quan:</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {getRecordA().organization || getRecordA().industry || '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">Chức vụ / Vị trí:</span>
                        <span className="text-slate-800 block mt-0.5">
                          {getRecordA().role || getRecordA().contactPerson || '-'}
                        </span>
                      </div>

                      {getRecordA().rating && (
                        <div className="flex items-center gap-1 text-amber-600 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{getRecordA().rating} / 5.0</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Candidate B (Duplicate) */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <span className="text-xs font-bold text-amber-900 uppercase">Hồ sơ B (Bản ghi trùng)</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        ID: {getRecordB().id}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Họ tên / Tên đơn vị:</span>
                        <div className="flex items-center justify-between font-bold text-slate-900 mt-0.5">
                          <span>{getRecordB().fullName || getRecordB().name}</span>
                          <button
                            onClick={() => handleSelectField(getRecordA().fullName ? 'fullName' : 'name', 'right')}
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              fieldSelections[getRecordA().fullName ? 'fullName' : 'name'] === 'right'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Chọn B
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">Email:</span>
                        <div className="flex items-center justify-between font-mono text-slate-800 mt-0.5">
                          <span>{getRecordB().email || getRecordB().contactEmail || '-'}</span>
                          <button
                            onClick={() => handleSelectField(getRecordA().email ? 'email' : 'contactEmail', 'right')}
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              fieldSelections[getRecordA().email ? 'email' : 'contactEmail'] === 'right'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Chọn B
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">Số điện thoại:</span>
                        <div className="flex items-center justify-between font-mono text-slate-800 mt-0.5">
                          <span>{getRecordB().phone || getRecordB().contactPhone || '-'}</span>
                          <button
                            onClick={() => handleSelectField(getRecordA().phone ? 'phone' : 'contactPhone', 'right')}
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              fieldSelections[getRecordA().phone ? 'phone' : 'contactPhone'] === 'right'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Chọn B
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">Đơn vị / Cơ quan:</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {getRecordB().organization || getRecordB().industry || '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">Chức vụ / Vị trí:</span>
                        <span className="text-slate-800 block mt-0.5">
                          {getRecordB().role || getRecordB().contactPerson || '-'}
                        </span>
                      </div>

                      {getRecordB().rating && (
                        <div className="flex items-center gap-1 text-amber-600 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{getRecordB().rating} / 5.0</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Merge Action Banner */}
                <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                  <div>
                    <span className="text-sm font-bold block">Tự động hợp nhất các mảng Tags & Sự kiện tham dự</span>
                    <span className="text-xs text-slate-400">
                      Tất cả lịch sử tham gia và ghi chú tương tác từ cả 2 hồ sơ sẽ được gộp chung an toàn.
                    </span>
                  </div>
                  <button
                    onClick={executeMerge}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all shrink-0"
                  >
                    <GitMerge className="w-4 h-4" />
                    <span>Xác nhận Gộp & Chuẩn Hóa Hồ Sơ Này</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
