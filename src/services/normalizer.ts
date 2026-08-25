import { DuplicateGroup, EntityType, MappingFieldDefinition, MappingRule, Speaker, Enterprise, Guest } from '../types';
import { isBannerOrDisclaimerText } from './sheetParser';
import { 
  normalizeSinglePhoneNumber, 
  normalizePhoneField, 
  getCountryFlagEmoji, 
  getCountryNameVi, 
  auditPhoneHealth,
  sanitizeRawPhoneString,
  resolveNumberPrefixes
} from './phoneNormalizer';
export { 
  normalizeSinglePhoneNumber, 
  normalizePhoneField, 
  getCountryFlagEmoji, 
  getCountryNameVi, 
  auditPhoneHealth,
  sanitizeRawPhoneString,
  resolveNumberPrefixes 
};

// Canonical field definitions for mapping
export const CANONICAL_FIELDS: Record<EntityType, MappingFieldDefinition[]> = {
  speaker: [
    { fieldKey: 'fullName', label: 'Họ và tên', entityType: 'speaker', required: true, aliases: ['họ tên', 'hoten', 'full name', 'name', 'tên', 'diễn giả', 'chuyên gia', 'người trình bày', 'họ & tên diễn giả', 'họ & tên', 'họ và tên diễn giả', 'họ tên diễn giả', 'báo cáo viên', 'keynote speaker', 'speaker', 'tên diễn giả', 'chuyên gia / diễn giả', 'họ và tên', 'họ và tên (thô)', 'họ tên thô', 'đại biểu', 'học hàm'], transformType: 'name_titlecase', description: 'Tên đầy đủ của diễn giả' },
    { fieldKey: 'email', label: 'Email liên hệ', entityType: 'speaker', required: true, aliases: ['email', 'e-mail', 'mail', 'email lh', 'hòm thư', 'thư điện tử', 'mail liên hệ', 'email liên hệ', 'contact email', 'email diễn giả', 'địa chỉ mail', 'hòm thư điện tử', 'email đăng ký', 'email đăng ký (thô)', 'mail đăng ký'], transformType: 'email_lower', description: 'Địa chỉ email chính' },
    { fieldKey: 'phone', label: 'Số điện thoại', entityType: 'speaker', required: false, aliases: ['phone', 'sđt', 'sdt', 'tel', 'mobile', 'điện thoại', 'số đt', 'contact phone', 'số đt quốc tế & vn', 'sđt quốc tế', 'số điện thoại', 'mobile phone', 'hotline', 'sđt liên hệ', 'số đt liên hệ', 'số di động', 'sđt đăng ký (thô)', 'sđt đăng ký', 'số đt đăng ký', 'số điện thoại đăng ký', 'sđt thô'], transformType: 'phone_e164', description: 'Số điện thoại chuẩn E.164 (+84... / Quốc tế)' },
    { fieldKey: 'organization', label: 'Đơn vị / Công ty', entityType: 'speaker', required: true, aliases: ['công ty', 'đơn vị', 'tổ chức', 'company', 'organization', 'cơ quan', 'đơn vị công tác', 'doanh nghiệp', 'nơi công tác', 'viện', 'trường', 'đơn vị & chức vụ', 'tổ chức / doanh nghiệp', 'cơ quan công tác', 'nơi làm việc', 'đơn vị làm việc'], transformType: 'none', description: 'Tên tổ chức đang làm việc' },
    { fieldKey: 'role', label: 'Chức danh / Vị trí', entityType: 'speaker', required: false, aliases: ['chức vụ', 'chức danh', 'vị trí', 'title', 'position', 'role', 'job title', 'vị trí / chức danh', 'chức vụ / vị trí', 'vị trí công tác', 'vai trò', 'chức vụ hiện tại', 'trí', 'học hàm', 'học vị'], transformType: 'none', description: 'Chức vụ hiện tại' },
    { fieldKey: 'expertise', label: 'Lĩnh vực chuyên môn', entityType: 'speaker', required: false, aliases: ['chuyên môn', 'lĩnh vực', 'expertise', 'specialty', 'ngành', 'chủ đề', 'lĩnh vực chuyên môn', 'chủ đề báo cáo', 'chuyên ngành', 'bài trình bày', 'lĩnh vực nghiên cứu', 'chuyên môn chính', 'ngành nghề', 'đề tài báo cáo', 'chủ đề chia sẻ', 'chủ đề sự kiện', 'tags', 'lĩnh vực chuyên môn / tags'], transformType: 'array_split', description: 'Các lĩnh vực chuyên môn (ngăn cách bởi dấu phẩy)' },
    { fieldKey: 'bio', label: 'Tiểu sử / Giới thiệu', entityType: 'speaker', required: false, aliases: ['tiểu sử', 'bio', 'giới thiệu', 'summary', 'profile', 'mô tả', 'thông tin diễn giả', 'giới thiệu diễn giả', 'quá trình công tác', 'học hàm', 'thành tích'], transformType: 'none', description: 'Tiểu sử ngắn' },
    { fieldKey: 'rating', label: 'Điểm đánh giá (1-5 ⭐)', entityType: 'speaker', required: false, aliases: ['rating', 'đánh giá', 'điểm', 'score', 'sao', 'điểm sao', 'số sao', 'xếp hạng', 'đánh giá sao', 'đánh giá sao (rating)', 'điểm đánh giá', 'mức đánh giá'], transformType: 'number', description: 'Điểm rating từ 1.0 đến 5.0 (hiển thị kèm ngôi sao ⭐)' },
    { fieldKey: 'location', label: 'Khu vực / Tỉnh thành', entityType: 'speaker', required: false, aliases: ['khu vực', 'thành phố', 'location', 'city', 'tỉnh thành', 'địa chỉ', 'nơi ở', 'quê quán', 'trụ sở', 'tỉnh / thành phố'], transformType: 'none', description: 'Địa điểm sinh sống/làm việc' },
    { fieldKey: 'tags', label: 'Bộ phận phụ trách / Ban (Tags)', entityType: 'speaker', required: false, aliases: ['bộ phận', 'ban', 'tags', 'nhãn bộ phận', 'phân loại ban', 'phòng ban', 'nhóm phụ trách', 'đơn vị phụ trách', 'bộ phận phụ trách', 'bộ phận phụ trách (tags)', 'ban phụ trách', 'ban chuyên trách', 'tham gia', 'mã sk tham gia'], transformType: 'array_split', description: 'Phân loại theo bộ phận (Ban Đối ngoại, Ban Nội dung, Ban Tổ chức, Ban Kỹ thuật, Ban Truyền thông, VIP...)' },
    { fieldKey: 'note', label: 'Ghi chú & Cảnh báo lỗi', entityType: 'speaker', required: false, aliases: ['ghi chú', 'ghichu', 'note', 'notes', 'lưu ý', 'thông tin lỗi', 'lỗi', 'nhận xét', 'cảnh báo', 'comment', 'ghi chú chi tiết', 'lưu ý đón tiếp', 'trợ', 'hỗ trợ di chuyển', 'mã id thô'], transformType: 'none', description: 'Ghi chú chi tiết, lưu ý vận hành hoặc thông tin dữ liệu bị lỗi' },
  ],
  enterprise: [
    { fieldKey: 'name', label: 'Tên Doanh nghiệp / Tổ chức', entityType: 'enterprise', required: true, aliases: ['tên công ty', 'tên doanh nghiệp', 'doanh nghiệp', 'đơn vị', 'company name', 'tổ chức', 'tên đơn vị', 'tên đối tác', 'tên đối tác tài trợ', 'công ty', 'đối tác', 'nhà tài trợ', 'đơn vị tài trợ', 'tên tổ chức', 'tên cty', 'tên cty / doanh nghiệp', 'cơ quan'], transformType: 'none', description: 'Tên pháp lý hoặc thương hiệu' },
    { fieldKey: 'industry', label: 'Ngành nghề / Lĩnh vực', entityType: 'enterprise', required: true, aliases: ['ngành nghề', 'lĩnh vực', 'industry', 'sector', 'mảng kinh doanh', 'lĩnh vực hoạt động', 'lĩnh vực kinh doanh', 'ngành hoạt động', 'ngành', 'lĩnh vực công nghệ', 'mảng hoạt động', 'tags', 'lĩnh vực chuyên môn / tags'], transformType: 'none', description: 'Ngành nghề hoạt động chính' },
    { fieldKey: 'contactPerson', label: 'Người đại diện liên hệ', entityType: 'enterprise', required: false, aliases: ['người liên hệ', 'đại diện', 'contact person', 'người phụ trách', 'pic', 'người liên hệ hợp tác', 'người đại diện', 'đại diện liên hệ', 'đại diện đối tác', 'họ tên người liên hệ', 'nhân sự phụ trách', 'diện liên hệ', 'họ và tên', 'họ tên', 'người đại diện liên hệ'], transformType: 'name_titlecase', description: 'Họ tên nhân sự phụ trách hợp tác' },
    { fieldKey: 'contactEmail', label: 'Email liên hệ', entityType: 'enterprise', required: true, aliases: ['email', 'email công ty', 'mail liên hệ', 'contact email', 'email liên hệ', 'hòm thư', 'thư điện tử', 'email người liên hệ', 'email đại diện', 'địa chỉ mail', 'email đăng ký', 'email đăng ký (thô)'], transformType: 'email_lower', description: 'Email của người đại diện hoặc công ty' },
    { fieldKey: 'contactPhone', label: 'Số điện thoại', entityType: 'enterprise', required: false, aliases: ['sđt', 'sdt', 'phone', 'hotline', 'điện thoại', 'số điện thoại', 'số đt', 'hotline / số điện thoại', 'sđt liên hệ', 'contact phone', 'số liên hệ', 'sđt đăng ký (thô)', 'sđt đăng ký'], transformType: 'phone_e164', description: 'Số hotline hoặc di động chuẩn E.164' },
    { fieldKey: 'tier', label: 'Hạng Đối tác / Tài trợ', entityType: 'enterprise', required: false, aliases: ['hạng', 'tier', 'cấp đối tác', 'mức tài trợ', 'phân hạng', 'hạng tài trợ', 'gói tài trợ', 'hạng đối tác tài trợ', 'sponsor tier', 'sponsorship level', 'package', 'loại tài trợ', 'danh mục tài trợ', 'cấp bậc', 'hạng tài trợ chính', 'hạng đối tác', 'mức gói tài trợ', 'trợ', 'tài trợ'], transformType: 'none', description: 'Hạng đối tác (Strategic, Diamond, Gold, Silver...)' },
    { fieldKey: 'sponsorshipTotal', label: 'Số tiền tài trợ (VNĐ)', entityType: 'enterprise', required: false, aliases: ['số tiền tài trợ', 'tiền tài trợ', 'kinh phí tài trợ', 'sponsorship', 'sponsorship total', 'sponsorship amount', 'tổng tài trợ', 'số tiền', 'giá trị tài trợ', 'hạn mức tài trợ', 'tài trợ (vnd)', 'tài trợ (đ)', 'số tiền (vnd)', 'mức đóng góp', 'ngân sách tài trợ', 'amount', 'tiền', 'gói tài trợ (vnd)', 'tài trợ', 'kinh phí', 'tổng tiền tài trợ', 'mức tài trợ (vnd)', 'giá trị hợp đồng tài trợ', 'giá trị gói', 'tổng tiền (vnd)', 'mức tài trợ', 'quy đổi', 'giá trị quy đổi', 'quy đổi (vnd)'], transformType: 'number', description: 'Số tiền hoặc kinh phí tài trợ bằng VNĐ' },
    { fieldKey: 'scale', label: 'Quy mô nhân sự', entityType: 'enterprise', required: false, aliases: ['quy mô', 'số nhân sự', 'scale', 'size', 'quy mô công ty', 'quy mô nhân sự', 'số lượng nhân viên', 'quy mô doanh nghiệp', 'số nhân viên', 'quy mô tổ chức'], transformType: 'none', description: 'Quy mô số lượng nhân viên' },
    { fieldKey: 'website', label: 'Website', entityType: 'enterprise', required: false, aliases: ['web', 'website', 'trang web', 'url', 'cổng thông tin', 'link web', 'homepage', 'địa chỉ web'], transformType: 'none', description: 'Địa chỉ website công ty' },
    { fieldKey: 'location', label: 'Trụ sở / Địa chỉ', entityType: 'enterprise', required: false, aliases: ['địa chỉ', 'trụ sở', 'location', 'tỉnh thành', 'khu vực', 'trụ sở chính', 'thành phố', 'văn phòng chính', 'địa điểm đặt trụ sở'], transformType: 'none', description: 'Trụ sở chính' },
    { fieldKey: 'tags', label: 'Bộ phận phụ trách / Ban (Tags)', entityType: 'enterprise', required: false, aliases: ['bộ phận', 'ban', 'tags', 'nhãn bộ phận', 'phân loại ban', 'phòng ban', 'nhóm phụ trách', 'bộ phận phụ trách', 'bộ phận phụ trách (tags)', 'ban phụ trách (tags)', 'ban phụ trách', 'chủ đề sự kiện', 'tham gia', 'mã sk tham gia'], transformType: 'array_split', description: 'Phân loại theo bộ phận (Ban Đối ngoại, Ban Tài trợ, Ban Tổ chức, Ban Truyền thông...)' },
    { fieldKey: 'note', label: 'Ghi chú & Cảnh báo lỗi', entityType: 'enterprise', required: false, aliases: ['ghi chú', 'ghichu', 'note', 'notes', 'lưu ý', 'thông tin lỗi', 'lỗi', 'nhận xét', 'cảnh báo', 'ghi chú hợp tác', 'trí', 'chức vụ', 'mã id thô'], transformType: 'none', description: 'Ghi chú chi tiết, lưu ý hợp tác hoặc thông tin lỗi' },
  ],
  guest: [
    { fieldKey: 'fullName', label: 'Họ và tên khách mời', entityType: 'guest', required: true, aliases: ['họ tên', 'hoten', 'tên khách', 'họ và tên', 'full name', 'guest name', 'tên', 'họ tên khách mời', 'họ & tên', 'họ và tên khách mời', 'tên đại biểu', 'họ tên đại biểu', 'người tham dự', 'khách mời', 'họ tên người tham dự', 'đại biểu tham dự', 'họ và tên (thô)'], transformType: 'name_titlecase', description: 'Tên đầy đủ của khách mời tham dự' },
    { fieldKey: 'email', label: 'Email', entityType: 'guest', required: true, aliases: ['email', 'e-mail', 'mail', 'thư điện tử', 'hòm thư đăng ký', 'hòm thư', 'email đăng ký', 'email liên hệ', 'contact email', 'địa chỉ email', 'mail đăng ký', 'email đăng ký (thô)'], transformType: 'email_lower', description: 'Email đăng ký' },
    { fieldKey: 'phone', label: 'Số điện thoại', entityType: 'guest', required: false, aliases: ['sđt', 'sdt', 'phone', 'mobile', 'điện thoại', 'số điện thoại', 'số đt', 'mobile phone', 'sđt liên hệ', 'contact phone', 'số liên lạc', 'số di động', 'sđt đăng ký (thô)', 'sđt đăng ký'], transformType: 'phone_e164', description: 'Số điện thoại liên lạc chuẩn E.164' },
    { fieldKey: 'organization', label: 'Cơ quan / Doanh nghiệp', entityType: 'guest', required: false, aliases: ['công ty', 'đơn vị', 'cơ quan', 'organization', 'company', 'cơ quan / đơn vị', 'đơn vị công tác', 'nơi công tác', 'doanh nghiệp', 'tổ chức', 'cơ quan đơn vị', 'cơ quan công tác', 'nơi làm việc'], transformType: 'none', description: 'Nơi đang công tác' },
    { fieldKey: 'role', label: 'Chức danh', entityType: 'guest', required: false, aliases: ['chức vụ', 'vị trí', 'job title', 'role', 'chức danh', 'vị trí công tác', 'chức danh công việc', 'vị trí / chức danh', 'chức vụ công tác', 'trí'], transformType: 'none', description: 'Chức danh công việc' },
    { fieldKey: 'ticketType', label: 'Loại vé / Phân loại khách', entityType: 'guest', required: false, aliases: ['hạng vé', 'loại vé', 'phân loại vé', 'vé', 'ticket', 'ticket type', 'ticket tier', 'pass', 'ticket pass', 'hạng thẻ', 'loại thẻ', 'phân loại khách', 'hạng', 'tier', 'mức vé', 'loại đại biểu', 'vai trò tham dự', 'loại vé tham dự', 'hạng vé tham dự', 'thẻ đại biểu', 'thẻ tham dự', 'hạng vé mời', 'phân loại vé tham gia', 'gói vé', 'hạng vé khách mời', 'hạng vé khách'], transformType: 'none', description: 'Hạng vé tham dự (VIP, Standard, Press)' },
    { fieldKey: 'interestTopics', label: 'Chủ đề quan tâm', entityType: 'guest', required: false, aliases: ['chủ đề quan tâm', 'chu de quan tam', 'chủ đề', 'quan tâm', 'mối quan tâm', 'lĩnh vực quan tâm', 'nội dung quan tâm', 'interest', 'topics', 'interested topics', 'nhu cầu', 'chuyên đề', 'lĩnh vực', 'mục quan tâm', 'phân ban quan tâm', 'session quan tâm', 'phiên quan tâm', 'lĩnh vực quan tâm chính', 'nhu cầu tìm hiểu', 'đề tài quan tâm', 'chủ đề muốn tham gia', 'nội dung mong muốn', 'chủ đề sự kiện', 'tags'], transformType: 'array_split', description: 'Chủ đề mong muốn tìm hiểu' },
    { fieldKey: 'location', label: 'Tỉnh thành', entityType: 'guest', required: false, aliases: ['tỉnh thành', 'khu vực', 'city', 'location', 'thành phố', 'địa chỉ', 'nơi ở', 'tỉnh', 'tỉnh / thành phố', 'khu vực cư trú'], transformType: 'none', description: 'Tỉnh thành phố' },
    { fieldKey: 'tags', label: 'Bộ phận phụ trách / Ban (Tags)', entityType: 'guest', required: false, aliases: ['bộ phận', 'ban', 'tags', 'nhãn bộ phận', 'phân loại ban', 'phòng ban', 'nhóm phụ trách', 'bộ phận phụ trách', 'bộ phận phụ trách (tags)', 'ban phụ trách', 'ban tiếp đón', 'tham gia', 'mã sk tham gia'], transformType: 'array_split', description: 'Phân loại theo bộ phận (Ban Khách mời, Ban Lễ tân, Ban Tổ chức, VIP...)' },
    { fieldKey: 'note', label: 'Ghi chú & Cảnh báo lỗi', entityType: 'guest', required: false, aliases: ['ghi chú', 'ghichu', 'note', 'notes', 'lưu ý', 'thông tin lỗi', 'lỗi', 'nhận xét', 'cảnh báo', 'lưu ý đón tiếp', 'ghi chú xác nhận', 'mã id thô', 'học hàm'], transformType: 'none', description: 'Ghi chú chi tiết, lưu ý đón tiếp hoặc thông tin lỗi' },
  ],
  event: [
    { fieldKey: 'title', label: 'Tên sự kiện / Chương trình', entityType: 'event', required: true, aliases: ['tên sự kiện', 'tên chương trình', 'event name', 'title', 'tên sk', 'chương trình', 'hội thảo', 'tên hội thảo', 'chủ đề hội thảo', 'tên hội nghị', 'tên diễn đàn'], transformType: 'none', description: 'Tên sự kiện hoặc chương trình' },
    { fieldKey: 'code', label: 'Mã sự kiện', entityType: 'event', required: false, aliases: ['mã', 'code', 'event code', 'mã sự kiện', 'mã sk', 'id sự kiện', 'mã chương trình', 'mã hội thảo'], transformType: 'none', description: 'Mã định danh sự kiện (VD: EVT-2024-01)' },
    { fieldKey: 'date', label: 'Thời gian / Ngày tổ chức', entityType: 'event', required: true, aliases: ['ngày', 'thời gian', 'date', 'ngày tổ chức', 'thời gian tổ chức', 'ngày diễn ra', 'time', 'ngày bắt đầu', 'thời gian diễn ra', 'thời điểm tổ chức'], transformType: 'none', description: 'Ngày hoặc thời gian diễn ra' },
    { fieldKey: 'location', label: 'Địa điểm tổ chức', entityType: 'event', required: true, aliases: ['địa điểm', 'nơi tổ chức', 'location', 'venue', 'khu vực', 'tỉnh thành', 'hội trường', 'địa điểm tổ chức', 'phòng họp', 'địa chỉ tổ chức'], transformType: 'none', description: 'Khách sạn, trung tâm hội nghị hoặc Online' },
    { fieldKey: 'type', label: 'Loại hình sự kiện', entityType: 'event', required: false, aliases: ['loại hình', 'loại sự kiện', 'type', 'event type', 'hình thức', 'thể loại', 'hình thức tổ chức', 'quy mô sự kiện'], transformType: 'none', description: 'Hội thảo, Triển lãm, Tech Forum...' },
    { fieldKey: 'theme', label: 'Chủ đề / Lĩnh vực trọng tâm', entityType: 'event', required: false, aliases: ['chủ đề', 'theme', 'topic', 'lĩnh vực', 'chuyên đề', 'chủ đề chính', 'lĩnh vực trọng tâm', 'chủ đề trọng tâm'], transformType: 'none', description: 'Chủ đề nội dung trọng tâm' },
    { fieldKey: 'attendeeCount', label: 'Số lượng khách / Quy mô', entityType: 'event', required: false, aliases: ['số lượng khách', 'khách tham dự', 'số khách', 'số người', 'quy mô', 'attendees', 'attendee count', 'số lượng tham gia', 'số lượng', 'lượng khách', 'số đại biểu', 'quy mô khách', 'dự kiến khách', 'số lượng người'], transformType: 'number', description: 'Số lượng người tham dự dự kiến hoặc thực tế' },
    { fieldKey: 'budget', label: 'Ngân sách tổ chức (VNĐ)', entityType: 'event', required: false, aliases: ['ngân sách', 'chi phí', 'kinh phí', 'budget', 'tổng ngân sách', 'ngân sách dự kiến', 'chi phí tổ chức', 'ngân sách (vnd)', 'kinh phí (vnd)', 'dự toán', 'tổng chi phí'], transformType: 'number', description: 'Ngân sách hoặc tổng chi phí sự kiện' },
    { fieldKey: 'status', label: 'Trạng thái tổ chức', entityType: 'event', required: false, aliases: ['trạng thái', 'tình trạng', 'status', 'tiến độ', 'giai đoạn', 'trạng thái tổ chức', 'tình trạng tổ chức'], transformType: 'none', description: 'Sắp diễn ra, Đang diễn ra, Đã kết thúc' },
    { fieldKey: 'targetAudience', label: 'Đối tượng mục tiêu', entityType: 'event', required: false, aliases: ['đối tượng', 'target audience', 'khách mục tiêu', 'đối tượng tham gia', 'thành phần tham dự', 'đối tượng hướng tới', 'thành phần khách mời'], transformType: 'none', description: 'Nhóm khách hướng tới' },
    { fieldKey: 'tags', label: 'Bộ phận chủ trì / Ban (Tags)', entityType: 'event', required: false, aliases: ['bộ phận', 'ban', 'tags', 'phân loại ban', 'ban chủ trì', 'nhóm phụ trách', 'bộ phận phụ trách', 'bộ phận phụ trách (tags)', 'ban tổ chức'], transformType: 'array_split', description: 'Bộ phận chủ trì/phối hợp tổ chức sự kiện' },
    { fieldKey: 'note', label: 'Ghi chú & Cảnh báo lỗi', entityType: 'event', required: false, aliases: ['ghi chú', 'ghichu', 'note', 'notes', 'lưu ý', 'thông tin lỗi', 'lỗi', 'nhận xét', 'cảnh báo sự kiện'], transformType: 'none', description: 'Ghi chú chi tiết sự kiện hoặc lưu ý vận hành' },
    { fieldKey: 'description', label: 'Mô tả tóm tắt', entityType: 'event', required: false, aliases: ['mô tả', 'description', 'nội dung', 'tóm tắt', 'giới thiệu', 'nội dung chi tiết', 'mô tả chương trình'], transformType: 'none', description: 'Tóm tắt nội dung sự kiện' },
  ]
};

// Normalize Vietnamese Name to Title Case (e.g. "nguyễn văn an" -> "Nguyễn Văn An")
export function normalizeVietnameseName(str: string): string {
  if (!str || typeof str !== 'string') return '';
  const clean = str.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  return clean
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => (word && word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

// Standardize Vietnam & International Phone Number (E.164 / National)
export function normalizeVietnamesePhone(phoneStr: string, format: '0xxx' | '+84' = '0xxx'): string {
  if (!phoneStr) return '';
  const result = normalizeSinglePhoneNumber(phoneStr, 'VN');
  if (result.isValid) {
    if (format === '+84') {
      return result.e164 || phoneStr;
    }
    return result.national || phoneStr;
  }
  return phoneStr.trim();
}

// Normalize Email (lowercase, trim)
export function normalizeEmail(emailStr: string): string {
  if (!emailStr) return '';
  return emailStr.trim().toLowerCase();
}

// Ensure any value is safely an array of trimmed non-empty strings
export function ensureArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.flatMap(item => {
      if (typeof item === 'string') {
        return item.split(/[,;\n|]/).map(s => s.trim()).filter(Boolean);
      }
      return item !== null && item !== undefined ? String(item).trim() : '';
    }).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val.split(/[,;\n|]/).map(s => s.trim()).filter(Boolean);
  }
  return [String(val).trim()].filter(Boolean);
}

// Normalize Tag List
export function normalizeTags(tagsInput: unknown): string[] {
  if (!tagsInput) return [];
  const rawList = ensureArray(tagsInput);
  return Array.from(
    new Set(
      rawList
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .filter(t => !/lỗi|error|invalid|thiếu|warning|cảnh báo|tách|dính|hợp lệ|chức danh|checkin|sai định dạng|evt\d+/i.test(t))
        .map(t => {
          // ensure nice casing
          return t.charAt(0).toUpperCase() + t.slice(1);
        })
    )
  );
}

// Extract any error descriptions, warnings, or issue tasks out of tags and merge into note
export function extractErrorsAndCleanTags(
  rawTags: unknown,
  existingNote: unknown = ''
): { cleanTags: string[]; mergedNote: string } {
  const rawList = ensureArray(rawTags);
  const cleanTags: string[] = [];
  const extractedErrors: string[] = [];

  const isErrorOrIssue = (tag: string) => {
    const t = String(tag || '').trim();
    if (!t) return false;
    return /lỗi|error|invalid|thiếu|warning|cảnh báo|tách|dính|hợp lệ|chức danh|checkin|sai định dạng|evt\d+/i.test(t);
  };

  rawList.forEach(t => {
    const str = String(t).trim();
    if (!str) return;
    if (isErrorOrIssue(str)) {
      extractedErrors.push(str);
    } else {
      cleanTags.push(str.charAt(0).toUpperCase() + str.slice(1));
    }
  });

  const existing = typeof existingNote === 'string' ? existingNote.trim() : '';
  const allNotes = [existing, ...extractedErrors].filter(Boolean);
  const uniqueNotes: string[] = [];
  allNotes.forEach(n => {
    if (!uniqueNotes.some(u => u.toLowerCase() === n.toLowerCase())) {
      uniqueNotes.push(n);
    }
  });

  return {
    cleanTags: Array.from(new Set(cleanTags)),
    mergedNote: uniqueNotes.join(' | ')
  };
}

// Levenshtein distance for fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

// Helper to strip Vietnamese diacritics and special characters for fuzzy matching
export function normalizeVietnameseNoAccent(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// String similarity score 0 - 100
export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = normalizeVietnameseNoAccent(str1);
  const s2 = normalizeVietnameseNoAccent(str2);
  if (s1 === s2) return 100;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, Math.round(((maxLen - dist) / maxLen) * 100));
}

// Auto-match source Excel header to canonical field
export function autoMatchHeader(header: string, entityType: EntityType): { targetField: string; confidence: number; transform: MappingRule['transform'] } {
  if (!header || isBannerOrDisclaimerText(header)) {
    return { targetField: '', confidence: 0, transform: 'none' };
  }

  const rawClean = header.trim().toLowerCase();
  const unaccentedHeader = normalizeVietnameseNoAccent(rawClean);
  const fields = CANONICAL_FIELDS[entityType] || [];

  let bestMatch = '';
  let bestConfidence = 0;
  let bestTransform: MappingRule['transform'] = 'none';

  for (const field of fields) {
    const unaccentedKey = normalizeVietnameseNoAccent(field.fieldKey);
    const unaccentedLabel = normalizeVietnameseNoAccent(field.label);

    // Exact match on fieldKey or label
    if (rawClean === field.fieldKey.toLowerCase() || rawClean === field.label.toLowerCase() || unaccentedHeader === unaccentedKey || unaccentedHeader === unaccentedLabel) {
      return { targetField: field.fieldKey, confidence: 99, transform: field.transformType };
    }

    // Check alias list (both raw and unaccented)
    for (const alias of field.aliases) {
      const unaccentedAlias = normalizeVietnameseNoAccent(alias);

      if (rawClean === alias || unaccentedHeader === unaccentedAlias) {
        return { targetField: field.fieldKey, confidence: 95, transform: field.transformType };
      }

      if (
        unaccentedHeader.includes(unaccentedAlias) ||
        unaccentedAlias.includes(unaccentedHeader) ||
        rawClean.includes(alias) ||
        alias.includes(rawClean)
      ) {
        const conf = Math.round(78 + (unaccentedAlias.length / Math.max(unaccentedAlias.length, unaccentedHeader.length)) * 16);
        if (conf > bestConfidence) {
          bestConfidence = conf;
          bestMatch = field.fieldKey;
          bestTransform = field.transformType;
        }
      }
    }

    // Fuzzy match on label & key
    const sim = Math.max(stringSimilarity(rawClean, field.label), stringSimilarity(rawClean, field.fieldKey));
    if (sim > 62 && sim > bestConfidence) {
      bestConfidence = sim;
      bestMatch = field.fieldKey;
      bestTransform = field.transformType;
    }
  }

  // Domain-specific keyword heuristics if no match yet
  if (!bestMatch || bestConfidence < 60) {
    if (entityType === 'guest') {
      if (/vé|ve|ticket|pass|the|hạng|hang/i.test(unaccentedHeader)) {
        return { targetField: 'ticketType', confidence: 85, transform: 'none' };
      }
      if (/quan tam|interest|chu de|topic|linh vuc|nganh/i.test(unaccentedHeader)) {
        return { targetField: 'interestTopics', confidence: 85, transform: 'array_split' };
      }
    } else if (entityType === 'enterprise') {
      if (/tai tro|sponsor|kinh phi|tien|so tien|amount|gia tri|vnd/i.test(unaccentedHeader)) {
        return { targetField: 'sponsorshipTotal', confidence: 88, transform: 'number' };
      }
      if (/hang|tier|goi|cap bac|partner/i.test(unaccentedHeader)) {
        return { targetField: 'tier', confidence: 88, transform: 'none' };
      }
    } else if (entityType === 'speaker') {
      if (/danh gia|rating|sao|score|diem/i.test(unaccentedHeader)) {
        return { targetField: 'rating', confidence: 85, transform: 'number' };
      }
      if (/chuyen mon|expertise|linh vuc|de tai/i.test(unaccentedHeader)) {
        return { targetField: 'expertise', confidence: 85, transform: 'array_split' };
      }
    } else if (entityType === 'event') {
      if (/so luong|khach|attendee|quy mo/i.test(unaccentedHeader)) {
        return { targetField: 'attendeeCount', confidence: 85, transform: 'number' };
      }
      if (/ngan sach|kinh phi|budget|chi phi/i.test(unaccentedHeader)) {
        return { targetField: 'budget', confidence: 85, transform: 'number' };
      }
    }
  }

  if (bestConfidence >= 55) {
    return { targetField: bestMatch, confidence: bestConfidence, transform: bestTransform };
  }

  return { targetField: '', confidence: 0, transform: 'none' };
}

// Enterprise Tier Normalizer
export function normalizeEnterpriseTier(
  rawTier: unknown,
  sponsorshipAmount?: number
): 'Strategic' | 'Diamond' | 'Gold' | 'Silver' | 'Bronze' | 'Partner' {
  const str = normalizeVietnameseNoAccent(String(rawTier || ''));

  if (str.includes('strategic') || str.includes('chien luoc') || str.includes('toan dien')) {
    return 'Strategic';
  }
  if (str.includes('diamond') || str.includes('kim cuong') || str.includes('bach kim') || str.includes('platinum')) {
    return 'Diamond';
  }
  if (str.includes('gold') || str.includes('vang')) {
    return 'Gold';
  }
  if (str.includes('silver') || str.includes('bac')) {
    return 'Silver';
  }
  if (str.includes('bronze') || str.includes('dong')) {
    return 'Bronze';
  }
  if (str.includes('partner') || str.includes('dong hanh') || str.includes('trien lam') || str.includes('ho tro')) {
    return 'Partner';
  }

  // Infer from sponsorship amount if available
  if (typeof sponsorshipAmount === 'number' && sponsorshipAmount > 0) {
    if (sponsorshipAmount >= 500_000_000) return 'Strategic';
    if (sponsorshipAmount >= 250_000_000) return 'Diamond';
    if (sponsorshipAmount >= 100_000_000) return 'Gold';
    if (sponsorshipAmount >= 50_000_000) return 'Silver';
    if (sponsorshipAmount >= 20_000_000) return 'Bronze';
    return 'Partner';
  }

  return 'Gold'; // Default standard tier for reputable partners
}

// Enterprise Sponsorship Benchmark Alignment
export function normalizeEnterpriseSponsorship(rawAmount: unknown, tier?: string): number {
  const parsed = parseSponsorshipAmount(rawAmount);
  if (parsed > 0) return parsed;

  const cleanTier = normalizeVietnameseNoAccent(String(tier || ''));
  if (cleanTier.includes('strategic') || cleanTier.includes('chien luoc')) return 500_000_000;
  if (cleanTier.includes('diamond') || cleanTier.includes('kim cuong')) return 250_000_000;
  if (cleanTier.includes('gold') || cleanTier.includes('vang')) return 100_000_000;
  if (cleanTier.includes('silver') || cleanTier.includes('bac')) return 50_000_000;
  if (cleanTier.includes('bronze') || cleanTier.includes('dong')) return 20_000_000;
  if (cleanTier.includes('partner') || cleanTier.includes('dong hanh')) return 10_000_000;

  return 50_000_000;
}

// Guest Ticket Type Normalizer
export function normalizeGuestTicketType(
  rawTicket: unknown,
  role?: unknown,
  tags?: unknown,
  note?: unknown,
  vipStatus?: boolean
): 'VIP Pass' | 'Standard' | 'Press / Media' | 'Speaker Guest' | 'Student / Early' {
  const tStr = normalizeVietnameseNoAccent(String(rawTicket || ''));
  const rStr = normalizeVietnameseNoAccent(String(role || ''));
  const nStr = normalizeVietnameseNoAccent(String(note || ''));
  const tagList = ensureArray(tags).map(t => normalizeVietnameseNoAccent(t));

  const hasVipSignal =
    vipStatus === true ||
    tStr.includes('vip') ||
    rStr.includes('vip') ||
    rStr.includes('chu tich') ||
    rStr.includes('tong giam doc') ||
    rStr.includes('founder') ||
    rStr.includes('ceo') ||
    rStr.includes('c level') ||
    rStr.includes('giam doc') ||
    rStr.includes('director') ||
    rStr.includes('truong doan') ||
    tagList.some(t => t.includes('vip')) ||
    nStr.includes('vip pass');

  if (hasVipSignal) return 'VIP Pass';

  if (
    tStr.includes('press') ||
    tStr.includes('media') ||
    tStr.includes('bao chi') ||
    tStr.includes('phong vien') ||
    tStr.includes('truyen thong') ||
    rStr.includes('phong vien') ||
    rStr.includes('nha bao') ||
    rStr.includes('bien tap vien') ||
    tagList.some(t => t.includes('bao chi') || t.includes('truyen thong'))
  ) {
    return 'Press / Media';
  }

  if (
    tStr.includes('speaker') ||
    tStr.includes('dien gia') ||
    tStr.includes('bao cao vien') ||
    tStr.includes('keynote') ||
    rStr.includes('dien gia') ||
    rStr.includes('speaker')
  ) {
    return 'Speaker Guest';
  }

  if (
    tStr.includes('student') ||
    tStr.includes('sinh vien') ||
    tStr.includes('hoc vien') ||
    tStr.includes('early') ||
    tStr.includes('hoc sinh') ||
    rStr.includes('sinh vien') ||
    rStr.includes('hoc vien')
  ) {
    return 'Student / Early';
  }

  return 'Standard';
}

// Guest Interest Topics Normalizer
export function normalizeGuestInterestTopics(
  rawTopics: unknown,
  company?: string,
  role?: string,
  tags?: unknown
): string[] {
  const explicitList = ensureArray(rawTopics);
  if (explicitList.length > 0) {
    return normalizeTags(explicitList);
  }

  // Derive intelligent relevant topics if empty
  const cStr = normalizeVietnameseNoAccent(String(company || ''));
  const rStr = normalizeVietnameseNoAccent(String(role || ''));
  const tagList = ensureArray(tags).map(t => normalizeVietnameseNoAccent(t));

  const inferred: string[] = [];

  if (cStr.includes('vng') || cStr.includes('game') || cStr.includes('ai') || rStr.includes('ai') || rStr.includes('engineer')) {
    inferred.push('Trí tuệ nhân tạo (AI)', 'GenAI & Machine Learning');
  } else if (cStr.includes('techcombank') || cStr.includes('bidv') || cStr.includes('shopee') || cStr.includes('ngan hang') || cStr.includes('bank') || cStr.includes('fintech') || rStr.includes('fintech') || rStr.includes('thanh toan')) {
    inferred.push('Fintech & Chuyển đổi số', 'Thanh toán điện tử');
  } else if (cStr.includes('fpt') || cStr.includes('viettel') || cStr.includes('cloud') || cStr.includes('cyber') || rStr.includes('cloud') || rStr.includes('security')) {
    inferred.push('Cloud & An toàn thông tin', 'Hạ tầng số');
  } else if (tagList.some(t => t.includes('vip') || t.includes('doi ngoai'))) {
    inferred.push('Kinh tế số 2026', 'Hợp tác & Đầu tư công nghệ');
  } else {
    inferred.push('Chuyển đổi số', 'Ứng dụng công nghệ mới');
  }

  return inferred;
}

// Robust parser for Money / Sponsorship Amount in Vietnamese & Global formats
export function parseSponsorshipAmount(val: unknown): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  const rawStr = String(val).trim();
  if (!rawStr) return 0;
  const str = rawStr.toLowerCase();

  // 1. Text representations: tỷ / tỉ / billion
  const tyMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:tỷ|tỉ|ty|ti|billion|b)\b/i);
  if (tyMatch) {
    const num = parseFloat(tyMatch[1].replace(',', '.'));
    return isNaN(num) ? 0 : Math.round(num * 1_000_000_000);
  }

  // 2. Text representations: triệu / tr / million / m
  const trieuMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:triệu|trieu|triệu|tr|million|m)\b/i);
  if (trieuMatch) {
    const num = parseFloat(trieuMatch[1].replace(',', '.'));
    return isNaN(num) ? 0 : Math.round(num * 1_000_000);
  }

  // 3. Text representations: nghìn / ngàn / k / thousand
  const kMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:k|nghìn|nghin|ngàn|ngan|thousand)\b/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(',', '.'));
    return isNaN(num) ? 0 : Math.round(num * 1_000);
  }

  // 4. Currency with USD: $10,000 -> Convert ~25,000 VND
  const usdMatch = str.match(/(?:\$|usd)\s*([0-9]+(?:[.,][0-9]+)*)/i) || str.match(/([0-9]+(?:[.,][0-9]+)*)\s*(?:\$|usd)/i);
  if (usdMatch) {
    const digitsOnly = usdMatch[1].replace(/,/g, '');
    const num = parseFloat(digitsOnly);
    if (!isNaN(num)) {
      return Math.round(num * 25_000);
    }
  }

  // 5. Clean currency symbols, text and spaces (VNĐ, đ, vnd, đồng, ...)
  let clean = str.replace(/[^0-9.,]/g, '').trim();
  if (!clean) return 0;

  // Case A: Contains both '.' and ',' (e.g. 500.000.000,00 or 500,000,000.00)
  if (clean.includes('.') && clean.includes(',')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // European/VN style: 500.000.000,50 -> remove dots, replace comma with dot
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // US style: 500,000,000.50 -> remove commas
      clean = clean.replace(/,/g, '');
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num);
  }

  // Case B: Contains only '.'
  if (clean.includes('.')) {
    const parts = clean.split('.');
    // If multiple dots (e.g. 500.000.000) or last part is 3 digits (e.g. 500.000)
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      clean = clean.replace(/\./g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Math.round(num);
    } else {
      // Decimal (e.g. 4.8 rating or 500.5)
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
  }

  // Case C: Contains only ','
  if (clean.includes(',')) {
    const parts = clean.split(',');
    // If multiple commas (e.g. 500,000,000) or last part is 3 digits (e.g. 500,000)
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      clean = clean.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Math.round(num);
    } else {
      // Decimal comma (e.g. 4,8 rating)
      clean = clean.replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
  }

  // Case D: Pure integer digits
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}

// Smart heuristic to extract sponsorship amount from an Enterprise record or raw Excel row
export function extractSponsorshipAmountFromRow(row: Record<string, unknown>, tier?: string): number {
  if (!row || typeof row !== 'object') return 0;

  // Check common sponsorship column keys
  const sponsorshipKeys = [
    'sponsorshiptotal', 'sponsorship', 'tiền tài trợ', 'số tiền tài trợ', 
    'mức tài trợ', 'kinh phí tài trợ', 'tổng tài trợ', 'số tiền', 'giá trị tài trợ',
    'hạn mức tài trợ', 'tài trợ (vnd)', 'tài trợ (đ)', 'tài trợ', 'gói tài trợ', 'amount'
  ];

  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null || val === '') continue;
    const lowerKey = key.toLowerCase().trim();
    if (sponsorshipKeys.some(k => lowerKey === k || lowerKey.includes(k))) {
      const parsed = parseSponsorshipAmount(val);
      if (parsed > 0) return parsed;
    }
  }

  // Look inside 'note' or 'ghi chú' or other text fields for money patterns
  for (const [key, val] of Object.entries(row)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('note') || lowerKey.includes('ghi chú') || lowerKey.includes('lưu ý') || lowerKey.includes('gói')) {
      const parsed = parseSponsorshipAmount(val);
      if (parsed > 0) return parsed;
    }
  }

  // Tier default baseline estimates if no amount specified
  const cleanTier = String(tier || row.tier || '').trim().toLowerCase();
  if (cleanTier.includes('strategic') || cleanTier.includes('chiến lược')) return 500_000_000;
  if (cleanTier.includes('diamond') || cleanTier.includes('kim cương')) return 250_000_000;
  if (cleanTier.includes('gold') || cleanTier.includes('vàng')) return 100_000_000;
  if (cleanTier.includes('silver') || cleanTier.includes('bạc')) return 50_000_000;
  if (cleanTier.includes('bronze') || cleanTier.includes('đồng')) return 20_000_000;
  if (cleanTier.includes('partner') || cleanTier.includes('đồng hành')) return 10_000_000;

  return 0;
}

// Apply transformation to a value
export function applyFieldTransform(val: unknown, transformType: MappingRule['transform']): unknown {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();

  switch (transformType) {
    case 'name_titlecase':
      return normalizeVietnameseName(str);
    case 'phone_e164': {
      const fieldRes = normalizePhoneField(str);
      if (fieldRes.hasMultiple) {
        const e164s = fieldRes.allNumbers.map(n => (n.isValid ? n.e164 || n.cleaned : n.raw));
        return e164s.join(' / ');
      }
      return fieldRes.primary.isValid ? (fieldRes.primary.e164 || str) : str;
    }
    case 'phone_vn':
      return normalizeVietnamesePhone(str, '0xxx');
    case 'email_lower':
      return normalizeEmail(str);
    case 'array_split':
      return normalizeTags(str);
    case 'number': {
      return parseSponsorshipAmount(val);
    }
    case 'none':
    default:
      return str;
  }
}

// Duplicate Detection Engine
export function detectDuplicates(
  speakers: Speaker[],
  enterprises: Enterprise[],
  guests: Guest[]
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];

  // 1. Check Speakers
  for (let i = 0; i < speakers.length; i++) {
    for (let j = i + 1; j < speakers.length; j++) {
      const a = speakers[i];
      const b = speakers[j];

      // Exact email match
      if (a.email && b.email && normalizeEmail(a.email) === normalizeEmail(b.email)) {
        groups.push({
          id: `dup-spk-${a.id}-${b.id}`,
          entityType: 'speaker',
          similarityScore: 98,
          matchReason: `Trùng khớp địa chỉ Email chính xác (${a.email})`,
          primaryCandidateId: a.participationCount >= b.participationCount ? a.id : b.id,
          items: [a, b],
        });
        continue;
      }

      // Exact phone match
      const p1 = a.phone?.replace(/\D/g, '');
      const p2 = b.phone?.replace(/\D/g, '');
      if (p1 && p2 && p1.length >= 9 && p1 === p2) {
        groups.push({
          id: `dup-spk-${a.id}-${b.id}`,
          entityType: 'speaker',
          similarityScore: 95,
          matchReason: `Trùng khớp Số điện thoại (${a.phone})`,
          primaryCandidateId: a.id,
          items: [a, b],
        });
        continue;
      }

      // High Name similarity in same organization
      const nameSim = stringSimilarity(a.fullName, b.fullName);
      const orgSim = stringSimilarity(a.organization, b.organization);
      if (nameSim >= 85 && orgSim >= 70) {
        groups.push({
          id: `dup-spk-${a.id}-${b.id}`,
          entityType: 'speaker',
          similarityScore: Math.round((nameSim + orgSim) / 2),
          matchReason: `Tên tương đồng (${nameSim}%) và cùng Đơn vị "${a.organization}"`,
          primaryCandidateId: a.id,
          items: [a, b],
        });
      }
    }
  }

  // 2. Check Enterprises
  for (let i = 0; i < enterprises.length; i++) {
    for (let j = i + 1; j < enterprises.length; j++) {
      const a = enterprises[i];
      const b = enterprises[j];

      const nameSim = stringSimilarity(a.name, b.name);
      if (a.contactEmail && b.contactEmail && normalizeEmail(a.contactEmail) === normalizeEmail(b.contactEmail)) {
        groups.push({
          id: `dup-ent-${a.id}-${b.id}`,
          entityType: 'enterprise',
          similarityScore: 96,
          matchReason: `Trùng email liên hệ doanh nghiệp (${a.contactEmail})`,
          primaryCandidateId: a.tier === 'Strategic' || a.tier === 'Diamond' ? a.id : b.id,
          items: [a, b],
        });
        continue;
      }

      if (nameSim >= 85) {
        groups.push({
          id: `dup-ent-${a.id}-${b.id}`,
          entityType: 'enterprise',
          similarityScore: nameSim,
          matchReason: `Tên doanh nghiệp tương đồng cao (${nameSim}%)`,
          primaryCandidateId: a.id,
          items: [a, b],
        });
      }
    }
  }

  // 3. Check Guests
  for (let i = 0; i < guests.length; i++) {
    for (let j = i + 1; j < guests.length; j++) {
      const a = guests[i];
      const b = guests[j];

      if (a.email && b.email && normalizeEmail(a.email) === normalizeEmail(b.email)) {
        groups.push({
          id: `dup-gst-${a.id}-${b.id}`,
          entityType: 'guest',
          similarityScore: 99,
          matchReason: `Trùng Email đăng ký (${a.email})`,
          primaryCandidateId: a.vipStatus ? a.id : b.id,
          items: [a, b],
        });
        continue;
      }

      const p1 = a.phone?.replace(/\D/g, '');
      const p2 = b.phone?.replace(/\D/g, '');
      if (p1 && p2 && p1.length >= 9 && p1 === p2) {
        groups.push({
          id: `dup-gst-${a.id}-${b.id}`,
          entityType: 'guest',
          similarityScore: 94,
          matchReason: `Trùng Số điện thoại (${a.phone})`,
          primaryCandidateId: a.id,
          items: [a, b],
        });
      }
    }
  }

  return groups;
}

export const detectAllDuplicates = detectDuplicates;
