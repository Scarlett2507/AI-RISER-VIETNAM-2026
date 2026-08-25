export type EntityType = 'speaker' | 'enterprise' | 'guest' | 'event';

export type UserRole = 'Admin' | 'Event Manager' | 'Data Specialist' | 'Viewer';

export interface Speaker {
  id: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  expertise: string[];
  bio: string;
  rating: number; // 1.0 - 5.0
  participationCount: number;
  honorariumRange?: string;
  events: string[]; // event titles or IDs
  tags: string[]; // Department categories (e.g. Ban Nội dung, Ban Đối ngoại, VIP)
  note?: string; // Ghi chú, lưu ý và thông tin lỗi nếu có
  location: string;
  linkedinUrl?: string;
  notesCount?: number;
  status: 'Active' | 'Available' | 'Busy' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  isNormalized?: boolean;
}

export interface Enterprise {
  id: string;
  name: string;
  logoUrl?: string;
  industry: string;
  scale: string; // 'Dưới 50' | '50 - 200' | '200 - 1000' | 'Trên 1000'
  website?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  tier: 'Strategic' | 'Diamond' | 'Gold' | 'Silver' | 'Bronze' | 'Partner';
  events: string[]; // event titles
  sponsorshipTotal?: number; // VND
  tags: string[]; // Department categories (e.g. Ban Đối ngoại, Ban Tài chính, Ban Tổ chức)
  note?: string; // Ghi chú, lưu ý và thông tin lỗi nếu có
  location: string;
  notesCount?: number;
  status: 'Active' | 'Prospect' | 'Past Sponsor' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  isNormalized?: boolean;
}

export interface Guest {
  id: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  vipStatus: boolean;
  ticketType: 'VIP Pass' | 'Standard' | 'Press / Media' | 'Speaker Guest' | 'Student / Early';
  eventsAttended: string[];
  interestTopics: string[];
  tags: string[]; // Department categories (e.g. Ban Tổ chức, Ban Khách mời, VIP)
  note?: string; // Ghi chú, lưu ý và thông tin lỗi nếu có
  location: string;
  checkInStatus: 'Checked-in' | 'Registered' | 'No-show' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
  isNormalized?: boolean;
}

export type EventFormat = 'In-person' | 'Online' | 'Hybrid';

export interface AgendaSlot {
  id: string;
  timeStart: string; // e.g. "08:30"
  timeEnd: string;   // e.g. "09:15"
  title: string;
  type: 'checkin' | 'keynote' | 'panel' | 'presentation' | 'workshop' | 'networking' | 'signing' | 'break' | 'closing';
  speakerIds?: string[];
  speakerNames?: string[];
  moderatorId?: string;
  moderatorName?: string;
  locationRoom?: string;
  description?: string;
  techNotes?: string; // âm thanh, ánh sáng, slide
  slidesUrl?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface OperationalTask {
  id: string;
  title: string;
  phase: 'pre' | 'during' | 'post';
  startDate: string;
  endDate: string;
  progress: number; // 0 - 100
  status: 'todo' | 'in_progress' | 'done' | 'delayed';
  assignee: string;
  category: 'content' | 'logistics' | 'media' | 'sponsor' | 'tech' | 'finance';
}

export interface OperationalPhase {
  id: string;
  phaseKey: 'pre' | 'during' | 'post';
  name: string;
  description: string;
  tasks: OperationalTask[];
}

export interface ConflictAlert {
  id: string;
  type: 'speaker' | 'venue' | 'equipment' | 'time';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  eventIds: string[];
  eventTitles: string[];
  involvedEntityName: string;
  date: string;
  timeSlot?: string;
  resolutionSuggestion: string;
}

export interface EventItem {
  id: string;
  title: string;
  code: string;
  date: string;
  endDate?: string;
  startTime?: string; // "08:30"
  endTime?: string;   // "17:30"
  location: string;
  venueRoom?: string; // "Hội trường Grand Ballroom A"
  format?: EventFormat; // 'In-person' | 'Online' | 'Hybrid'
  meetUrl?: string;     // Google Meet URL
  type: 'Hội thảo' | 'Triển lãm' | 'Diễn đàn Tech' | 'Pitching Day' | 'Networking' | 'Khóa đào tạo';
  theme: string;
  speakerIds: string[];
  enterpriseIds: string[];
  attendeeCount: number;
  capacity?: number;
  registeredCount?: number;
  targetAudience: string;
  budget?: number;
  status: 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã kết thúc';
  tags?: string[]; // Department categories (e.g. Ban Tổ chức, Ban Kỹ thuật)
  note?: string; // Ghi chú, lưu ý và thông tin lỗi nếu có
  description: string;
  colorCode?: string; // e.g. '#4F46E5'
  leadOrganizer?: string;
  equipment?: string[];
  rundown?: AgendaSlot[];
  operationalPhases?: OperationalPhase[];
  createdAt: string;
  updatedAt: string;
}

export interface InteractionNote {
  id: string;
  entityId: string;
  entityType: EntityType;
  authorName: string;
  authorRole: string;
  date: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'contract';
  title: string;
  content: string;
  followUpDate?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: 'IMPORT_EXCEL' | 'MERGE_DUPLICATES' | 'STANDARDIZE_FORMAT' | 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY' | 'BATCH_TAG' | 'EXPORT_DATA' | 'CREATE' | 'UPDATE' | 'DELETE' | 'MERGE' | 'IMPORT' | string;
  target?: string;
  entityType?: string;
  entityId?: string;
  details: string;
}

export interface DuplicateGroup {
  id: string;
  entityType: EntityType;
  similarityScore: number; // 0 - 100
  matchReason: string;
  primaryCandidateId: string;
  items: Array<Speaker | Enterprise | Guest>;
}

export interface MappingFieldDefinition {
  fieldKey: string;
  label: string;
  entityType: EntityType;
  required: boolean;
  aliases: string[];
  transformType: 'none' | 'name_titlecase' | 'phone_vn' | 'phone_e164' | 'email_lower' | 'array_split' | 'number';
  description: string;
}

export interface MappingRule {
  sourceColumn: string;
  targetField: string;
  sampleValues: string[];
  confidence: number;
  transform: 'none' | 'name_titlecase' | 'phone_vn' | 'phone_e164' | 'email_lower' | 'array_split' | 'number';
  isIgnored: boolean;
}

export interface MappingTemplate {
  id: string;
  name: string;
  entityType: EntityType;
  mappings: Record<string, string>; // sourceCol -> targetField
  createdAt: string;
}

export interface AdvancedSearchFilter {
  keyword: string;
  entityType: EntityType | 'all';
  events: string[];
  industries: string[];
  expertises: string[];
  tags: string[];
  location: string;
  minRating: number;
  vipOnly: boolean;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
}
