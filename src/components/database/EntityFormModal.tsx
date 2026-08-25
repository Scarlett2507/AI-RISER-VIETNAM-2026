import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles } from 'lucide-react';
import { EntityType, Speaker, Enterprise, Guest, EventItem } from '../../types';
import { normalizeVietnameseName, normalizeVietnamesePhone, normalizeEmail, normalizeTags } from '../../services/normalizer';

interface EntityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  initialData?: any | null;
  onSave: (type: EntityType, data: any) => void;
}

export const EntityFormModal: React.FC<EntityFormModalProps> = ({
  isOpen,
  onClose,
  entityType,
  initialData,
  onSave,
}) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        note: initialData.note || initialData.notes || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : (initialData.tags || ''),
        expertise: Array.isArray(initialData.expertise) ? initialData.expertise.join(', ') : (initialData.expertise || ''),
        interestTopics: Array.isArray(initialData.interestTopics) ? initialData.interestTopics.join(', ') : (initialData.interestTopics || ''),
      });
    } else {
      // Defaults
      if (entityType === 'speaker') {
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          organization: '',
          role: '',
          expertise: '',
          bio: '',
          rating: 4.8,
          location: 'Hà Nội',
          honorariumRange: '20 - 30 Triệu VNĐ',
          tags: 'Ban Nội dung, Ban Cố vấn',
          note: '',
          status: 'Available',
        });
      } else if (entityType === 'enterprise') {
        setFormData({
          name: '',
          industry: 'Công nghệ thông tin',
          scale: '200 - 1000',
          contactPerson: '',
          contactEmail: '',
          contactPhone: '',
          tier: 'Gold',
          website: '',
          location: 'Hà Nội',
          tags: 'Ban Đối ngoại, Ban Tài trợ',
          note: '',
          status: 'Active',
        });
      } else if (entityType === 'guest') {
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          organization: '',
          role: '',
          vipStatus: false,
          ticketType: 'Standard',
          interestTopics: 'Trí tuệ nhân tạo, Chuyển đổi số',
          location: 'TP. Hồ Chí Minh',
          tags: 'Ban Khách mời, VIP',
          note: '',
          checkInStatus: 'Registered',
        });
      } else {
        setFormData({
          title: '',
          code: `EVT-${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString().slice(0, 10),
          location: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
          type: 'Hội thảo',
          theme: '',
          targetAudience: 'Giám đốc Công nghệ, Kỹ sư và Nhà đầu tư',
          budget: 500000000,
          status: 'Sắp diễn ra',
          description: '',
          tags: 'Ban Tổ chức, Ban Kỹ thuật',
          note: '',
          speakerIds: [],
          enterpriseIds: [],
          attendeeCount: 500,
        });
      }
    }
  }, [isOpen, initialData, entityType]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSmartClean = () => {
    setFormData((prev: any) => ({
      ...prev,
      fullName: prev.fullName ? normalizeVietnameseName(prev.fullName) : prev.fullName,
      name: prev.name ? prev.name.trim() : prev.name,
      contactPerson: prev.contactPerson ? normalizeVietnameseName(prev.contactPerson) : prev.contactPerson,
      email: prev.email ? normalizeEmail(prev.email) : prev.email,
      contactEmail: prev.contactEmail ? normalizeEmail(prev.contactEmail) : prev.contactEmail,
      phone: prev.phone ? normalizeVietnamesePhone(prev.phone) : prev.phone,
      contactPhone: prev.contactPhone ? normalizeVietnamesePhone(prev.contactPhone) : prev.contactPhone,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanData = {
      ...formData,
      id: initialData?.id || `${entityType.slice(0, 3)}-${Date.now()}`,
      isNormalized: true,
      updatedAt: new Date().toISOString(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
      tags: typeof formData.tags === 'string' ? normalizeTags(formData.tags) : formData.tags,
      expertise: typeof formData.expertise === 'string' ? normalizeTags(formData.expertise) : formData.expertise,
      interestTopics: typeof formData.interestTopics === 'string' ? normalizeTags(formData.interestTopics) : formData.interestTopics,
    };

    onSave(entityType, cleanData);
    onClose();
  };

  const getTitle = () => {
    const action = initialData ? 'Chỉnh Sửa' : 'Thêm Mới';
    if (entityType === 'speaker') return `${action} Diễn Giả & Chuyên Gia`;
    if (entityType === 'enterprise') return `${action} Doanh Nghiệp & Đối Tác`;
    if (entityType === 'guest') return `${action} Khách Mời Tham Dự`;
    return `${action} Sự Kiện`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <h2 className="text-base font-bold">{getTitle()}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSmartClean}
              title="Tự động chuẩn hóa viết hoa và định dạng số điện thoại"
              className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold hover:bg-indigo-600/50 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chuẩn hóa nhanh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          {/* SPEAKER FORM */}
          {entityType === 'speaker' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên diễn giả (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName || ''}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="TS. Nguyễn Văn A..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cơ quan / Đơn vị (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.organization || ''}
                    onChange={(e) => handleChange('organization', e.target.value)}
                    placeholder="Viện AI, FPT Software, Techcombank..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email liên hệ (*)</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại di động</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức danh / Vị trí</label>
                  <input
                    type="text"
                    value={formData.role || ''}
                    onChange={(e) => handleChange('role', e.target.value)}
                    placeholder="Giám đốc Nghiên cứu, Head of AI..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Điểm đánh giá (1.0 - 5.0 ⭐)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formData.rating || 4.8}
                    onChange={(e) => handleChange('rating', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold text-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lĩnh vực chuyên môn (ngăn cách bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={formData.expertise || ''}
                  onChange={(e) => handleChange('expertise', e.target.value)}
                  placeholder="Trí tuệ nhân tạo, GenAI, FinTech, Big Data..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiểu sử tóm tắt (Bio)</label>
                <textarea
                  rows={2}
                  value={formData.bio || ''}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Kinh nghiệm, bằng cấp, thành tích nổi bật..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thù lao dự kiến</label>
                  <input
                    type="text"
                    value={formData.honorariumRange || ''}
                    onChange={(e) => handleChange('honorariumRange', e.target.value)}
                    placeholder="20 - 35 Triệu VNĐ"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bộ phận phụ trách / Ban (Tags)</label>
                  <input
                    type="text"
                    value={formData.tags || ''}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="Ban Nội dung, Ban Cố vấn, VIP..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Ghi chú / Thông tin cảnh báo & lỗi (Note)</span>
                  <span className="text-[11px] font-normal text-slate-400">Các ghi chú hoặc lỗi dữ liệu cần theo dõi</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.note || ''}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Nhập ghi chú hoặc lưu ý phát sinh cho diễn giả này..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>
            </>
          )}

          {/* ENTERPRISE FORM */}
          {entityType === 'enterprise' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên Doanh nghiệp (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Tập đoàn FPT, VNG Corporation..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngành nghề hoạt động (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.industry || ''}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    placeholder="Công nghệ thông tin, Viễn thông, Tài chính..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người đại diện liên hệ</label>
                  <input
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    placeholder="Nguyễn Văn B..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hạng Đối tác / Tài trợ</label>
                  <select
                    value={formData.tier || 'Gold'}
                    onChange={(e) => handleChange('tier', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Strategic">Strategic (Chiến lược)</option>
                    <option value="Diamond">Diamond (Kim Cương)</option>
                    <option value="Gold">Gold (Vàng)</option>
                    <option value="Silver">Silver (Bạc)</option>
                    <option value="Bronze">Bronze (Đồng)</option>
                    <option value="Partner">Partner (Đồng hành)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email liên hệ (*)</label>
                  <input
                    type="email"
                    required
                    value={formData.contactEmail || ''}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    placeholder="contact@fpt.com.vn"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hotline / SĐT</label>
                  <input
                    type="text"
                    value={formData.contactPhone || ''}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    placeholder="024 7300 7300"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://fpt.com.vn"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quy mô nhân sự</label>
                  <select
                    value={formData.scale || '200 - 1000'}
                    onChange={(e) => handleChange('scale', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Dưới 50">Dưới 50 nhân sự</option>
                    <option value="50 - 200">50 - 200 nhân sự</option>
                    <option value="200 - 1000">200 - 1000 nhân sự</option>
                    <option value="Trên 1000">Trên 1000 nhân sự</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bộ phận phụ trách / Ban (Tags)</label>
                <input
                  type="text"
                  value={formData.tags || ''}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="Ban Đối ngoại, Ban Tài trợ..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Ghi chú / Thông tin cảnh báo & lỗi (Note)</span>
                  <span className="text-[11px] font-normal text-slate-400">Các ghi chú theo dõi đối tác</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.note || ''}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Nhập ghi chú hoặc tiến độ đàm phán hợp đồng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>
            </>
          )}

          {/* GUEST FORM */}
          {entityType === 'guest' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ tên khách mời (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName || ''}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="Nguyễn Thành Trung..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email đăng ký (*)</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="trung.nt@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cơ quan / Doanh nghiệp</label>
                  <input
                    type="text"
                    value={formData.organization || ''}
                    onChange={(e) => handleChange('organization', e.target.value)}
                    placeholder="Sky Mavis, VNPT, Shopee..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức danh / Vị trí</label>
                  <input
                    type="text"
                    value={formData.role || ''}
                    onChange={(e) => handleChange('role', e.target.value)}
                    placeholder="CEO, CTO, Trưởng phòng..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hạng vé tham dự</label>
                  <select
                    value={formData.ticketType || 'Standard'}
                    onChange={(e) => handleChange('ticketType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="VIP Pass">VIP Pass (Khách mời VIP)</option>
                    <option value="Standard">Standard (Vé Tiêu chuẩn)</option>
                    <option value="Press / Media">Press / Media (Báo chí)</option>
                    <option value="Speaker Guest">Speaker Guest (Khách của Diễn giả)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="0912 888 999"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chủ đề quan tâm</label>
                <input
                  type="text"
                  value={formData.interestTopics || ''}
                  onChange={(e) => handleChange('interestTopics', e.target.value)}
                  placeholder="AI, Blockchain, Khởi nghiệp, Fintech"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bộ phận phụ trách / Ban (Tags)</label>
                  <input
                    type="text"
                    value={formData.tags || ''}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="Ban Khách mời, Ban Lễ tân, VIP..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tình trạng Check-in</label>
                  <select
                    value={formData.checkInStatus || 'Registered'}
                    onChange={(e) => handleChange('checkInStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Registered">Registered (Đã đăng ký)</option>
                    <option value="Checked-in">Checked-in (Đã tới sự kiện)</option>
                    <option value="Cancelled">Cancelled (Hủy tham gia)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Ghi chú / Thông tin cảnh báo & lỗi (Note)</span>
                  <span className="text-[11px] font-normal text-slate-400">Các lưu ý đón tiếp hoặc hỗ trợ đặc biệt</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.note || ''}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Nhập ghi chú yêu cầu đón tiếp, chỗ ngồi..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>
            </>
          )}

          {/* EVENT FORM */}
          {entityType === 'event' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên sự kiện (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Vietnam AI Summit 2025..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã sự kiện</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => handleChange('code', e.target.value)}
                    placeholder="AISUMMIT-2025"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian tổ chức (*)</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại hình sự kiện</label>
                  <select
                    value={formData.type || 'Hội thảo'}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Hội thảo">Hội thảo</option>
                    <option value="Diễn đàn Tech">Diễn đàn Tech</option>
                    <option value="Triển lãm">Triển lãm</option>
                    <option value="Pitching Day">Pitching Day</option>
                    <option value="Networking">Networking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa điểm tổ chức (*)</label>
                <input
                  type="text"
                  required
                  value={formData.location || ''}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Trung tâm Hội nghị Quốc gia, Hà Nội / GEM Center..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chủ đề trọng tâm</label>
                <input
                  type="text"
                  value={formData.theme || ''}
                  onChange={(e) => handleChange('theme', e.target.value)}
                  placeholder="Trí tuệ nhân tạo, GenAI, Chuyển đổi số..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bộ phận phụ trách / Ban (Tags)</label>
                <input
                  type="text"
                  value={formData.tags || ''}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="Ban Tổ chức, Ban Kỹ thuật, Ban Truyền thông..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú & Lưu ý điều phối nội bộ (Note)</label>
                <textarea
                  rows={2}
                  value={formData.note || ''}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Lưu ý về kế hoạch setup sân khấu, backdrop, tài liệu..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả tóm tắt</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Mục tiêu chương trình, đối tượng hướng tới..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* Submit Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Hồ Sơ</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
