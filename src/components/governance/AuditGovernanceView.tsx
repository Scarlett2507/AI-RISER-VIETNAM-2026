import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  Download, 
  RefreshCcw, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  Layers,
  Key
} from 'lucide-react';
import { AuditLog, UserRole } from '../../types';
import { StorageService } from '../../services/storage';

interface AuditGovernanceViewProps {
  auditLogs: AuditLog[];
  currentUserRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  onResetData: () => void;
}

export const AuditGovernanceView: React.FC<AuditGovernanceViewProps> = ({
  auditLogs,
  currentUserRole,
  onChangeRole,
  onResetData,
}) => {
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const filteredLogs = auditLogs.filter(log => {
    if (selectedActionFilter !== 'all' && log.action !== selectedActionFilter) {
      return false;
    }
    return true;
  });

  const handleExportBackup = () => {
    const data = StorageService.loadData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EventDataHub_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Role Management Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-xl shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Phân Quyền & Quản Trị Hệ Thống (RBAC)</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                Vai trò hiện tại: {currentUserRole}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kiểm soát quyền truy cập, chỉnh sửa dữ liệu thù lao nhạy cảm, gộp hồ sơ trùng và xuất báo cáo.
            </p>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Chuyển vai trò:</span>
          {(['Admin', 'Manager', 'Staff', 'Viewer'] as UserRole[]).map(role => (
            <button
              key={role}
              onClick={() => onChangeRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentUserRole === role
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Admin (Quản trị cao cấp)</span>
            <Key className="w-4 h-4 text-purple-600" />
          </div>
          <ul className="text-[11px] text-slate-500 space-y-1">
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Toàn quyền tạo/sửa/xóa</li>
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Gộp & chuẩn hóa dữ liệu</li>
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Xem thù lao & tài trợ</li>
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Xuất & khôi phục Backup</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Manager (Quản lý dự án)</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <ul className="text-[11px] text-slate-500 space-y-1">
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Nhập Excel & ánh xạ</li>
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Gắn nhãn & tương tác</li>
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Xem báo cáo thống kê</li>
            <li className="flex items-center gap-1 text-slate-400">✗ Không được xóa hàng loạt</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Staff (Chuyên viên vận hành)</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <ul className="text-[11px] text-slate-500 space-y-1">
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Check-in khách mời</li>
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Thêm ghi chú cuộc gọi</li>
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Tìm kiếm thông tin</li>
            <li className="flex items-center gap-1 text-slate-400">✗ Không xem thù lao bí mật</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Viewer (Khách xem)</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
          <ul className="text-[11px] text-slate-500 space-y-1">
            <li className="flex items-center gap-1 text-emerald-600 font-medium">✓ Chỉ đọc danh sách</li>
            <li className="flex items-center gap-1 text-slate-400">✗ Không được chỉnh sửa</li>
            <li className="flex items-center gap-1 text-slate-400">✗ Không xuất file dữ liệu</li>
            <li className="flex items-center gap-1 text-slate-400">✗ Không gộp hồ sơ</li>
          </ul>
        </div>

      </div>

      {/* Database Backup & Maintenance Hub */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Sao Lưu & Khôi Phục Dữ Liệu (Backup & Recovery)</h3>
            <p className="text-xs text-slate-400">Đảm bảo an toàn dữ liệu, tải về toàn bộ snapshot hệ thống định dạng JSON</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Tải Toàn Bộ Dữ Liệu Backup (.JSON)</span>
          </button>

          {showResetConfirm ? (
            <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-200">
              <span className="text-xs font-bold text-red-700">Khôi phục dữ liệu mẫu gốc?</span>
              <button
                onClick={() => {
                  onResetData();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
              >
                Xác nhận khôi phục
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-1 text-xs text-slate-600"
              >
                Hủy
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4 text-slate-500" />
              <span>Khôi phục dữ liệu mẫu chuẩn</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Activity Feed */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Nhật Ký Thao Tác Hệ Thống (Audit Trail)</h3>
            <p className="text-xs text-slate-400">Theo dõi vết toàn bộ thay đổi dữ liệu, thời gian và người thực hiện</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-700 bg-slate-50"
            >
              <option value="all">Tất cả hành động ({auditLogs.length})</option>
              <option value="IMPORT">Nhập dữ liệu (IMPORT)</option>
              <option value="MERGE">Gộp trùng lặp (MERGE)</option>
              <option value="CREATE">Thêm mới (CREATE)</option>
              <option value="UPDATE">Cập nhật (UPDATE)</option>
              <option value="DELETE">Xóa (DELETE)</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Thời gian</th>
                  <th className="py-2.5 px-4">Người dùng</th>
                  <th className="py-2.5 px-4">Hành động</th>
                  <th className="py-2.5 px-4">Đối tượng</th>
                  <th className="py-2.5 px-4">Chi tiết thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {log.userName}
                      <span className="text-[10px] text-slate-400 font-normal block">({log.userRole})</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'MERGE' ? 'bg-amber-100 text-amber-800' :
                        log.action === 'IMPORT' ? 'bg-indigo-100 text-indigo-800' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 capitalize font-medium">
                      {log.entityType}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
