import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { EntityType } from '../../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityType: EntityType;
  entityName?: string;
  itemCount?: number;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityName,
  itemCount = 1,
}) => {
  if (!isOpen) return null;

  const getEntityTypeName = () => {
    switch (entityType) {
      case 'speaker': return 'Diễn giả / Chuyên gia';
      case 'enterprise': return 'Doanh nghiệp / Đối tác';
      case 'guest': return 'Khách mời / Đại biểu';
      case 'event': return 'Sự kiện';
      default: return 'Hồ sơ';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Danger Accent */}
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 border-4 border-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Trash2 className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">
              {itemCount > 1 ? `Xác nhận xóa ${itemCount} hồ sơ?` : 'Xác nhận xóa hồ sơ?'}
            </h3>
            <p className="text-xs text-slate-500">
              Phân loại: <span className="font-semibold text-slate-700">{getEntityTypeName()}</span>
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-left">
            <p className="text-xs font-bold text-slate-800 break-words line-clamp-2">
              {entityName || (itemCount > 1 ? `${itemCount} mục đã chọn` : 'Hồ sơ được chọn')}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Hành động này sẽ xóa dữ liệu khỏi hệ thống và lưu vết trong Nhật ký Kiểm toán.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 transition-all shadow-xs"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-red-600/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xác nhận xóa vĩnh viễn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
