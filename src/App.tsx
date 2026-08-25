import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  EntityType, 
  Speaker, 
  Enterprise, 
  Guest, 
  EventItem, 
  DuplicateGroup, 
  InteractionNote, 
  AuditLog, 
  UserRole,
  MappingTemplate
} from './types';
import { StorageService, deduplicateById } from './services/storage';
import { detectAllDuplicates, normalizeVietnameseName, normalizeVietnamesePhone, normalizeEmail } from './services/normalizer';

import { Header } from './components/layout/Header';
import { NavigationTabs } from './components/layout/NavigationTabs';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { EntityListView } from './components/database/EntityListView';
import { ExcelImporterModal } from './components/importer/ExcelImporterModal';
import { DuplicateDetectorModal } from './components/normalization/DuplicateDetectorModal';
import { FormatStandardizerModal } from './components/normalization/FormatStandardizerModal';
import { UniversalPhoneNormalizerModal } from './components/normalization/UniversalPhoneNormalizerModal';
import { Profile360Modal } from './components/database/Profile360Modal';
import { EntityFormModal } from './components/database/EntityFormModal';
import { SpeakerMatchmakerModal } from './components/collaboration/SpeakerMatchmakerModal';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { AuditGovernanceView } from './components/governance/AuditGovernanceView';
import { GoogleMapsVenueModal } from './components/google/GoogleMapsVenueModal';
import { GoogleWorkspaceModal } from './components/google/GoogleWorkspaceModal';
import { GeminiCopilotDrawer } from './components/ai/GeminiCopilotDrawer';
import { DeleteConfirmModal } from './components/database/DeleteConfirmModal';
import { EventOperationsHub } from './components/events/EventOperationsHub';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export function App() {
  // Main Data States
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notes, setNotes] = useState<InteractionNote[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Admin');

  // UI States
  const [activeTab, setActiveTab] = useState<'overview' | 'speakers' | 'enterprises' | 'guests' | 'events' | 'governance'>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modals
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  const [importerDefaultType, setImporterDefaultType] = useState<EntityType>('speaker');
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState<boolean>(false);
  const [isStandardizerOpen, setIsStandardizerOpen] = useState<boolean>(false);
  const [isPhoneNormalizerOpen, setIsPhoneNormalizerOpen] = useState<boolean>(false);
  const [isMatchmakerOpen, setIsMatchmakerOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMapsOpen, setIsMapsOpen] = useState<boolean>(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);

  const handleOpenImporter = (type?: EntityType) => {
    setImporterDefaultType(type || (activeTab === 'events' ? 'event' : activeTab === 'enterprises' ? 'enterprise' : activeTab === 'guests' ? 'guest' : 'speaker'));
    setIsImporterOpen(true);
  };

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    isOpen: boolean;
    type: EntityType;
    ids: string[];
    entityName?: string;
  }>({
    isOpen: false,
    type: 'speaker',
    ids: [],
  });

  // Profile Modal
  const [profileEntity, setProfileEntity] = useState<any | null>(null);
  const [profileEntityType, setProfileEntityType] = useState<EntityType>('speaker');

  // Helper for notification toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  // Form Modal (Create / Edit)
  const [formConfig, setFormConfig] = useState<{
    isOpen: boolean;
    type: EntityType;
    initialData: any | null;
  }>({
    isOpen: false,
    type: 'speaker',
    initialData: null,
  });

  // Load Initial Data on Mount
  useEffect(() => {
    const data = StorageService.loadData();
    setSpeakers(data.speakers);
    setEnterprises(data.enterprises);
    setGuests(data.guests);
    setEvents(data.events);
    setTemplates(data.templates);
    setAuditLogs(data.auditLogs);
    setNotes(data.notes);
    setCurrentUserRole(data.currentUserRole || 'Admin');
  }, []);

  // Save changes to localStorage whenever core data changes
  const persistState = (
    newSpeakers = speakers,
    newEnterprises = enterprises,
    newGuests = guests,
    newEvents = events,
    newTemplates = templates,
    newAuditLogs = auditLogs,
    newNotes = notes,
    newRole = currentUserRole
  ) => {
    StorageService.saveData({
      speakers: newSpeakers,
      enterprises: newEnterprises,
      guests: newGuests,
      events: newEvents,
      templates: newTemplates,
      auditLogs: newAuditLogs,
      notes: newNotes,
      currentUserRole: newRole,
    });
  };

  // Duplicate Groups Calculation
  const duplicateGroups: DuplicateGroup[] = useMemo(() => {
    return detectAllDuplicates(speakers, enterprises, guests);
  }, [speakers, enterprises, guests]);

  // Unnormalized Items Calculation (Title case, phone, email)
  const unnormalizedCount = useMemo(() => {
    let count = 0;
    speakers.forEach(s => {
      if (normalizeVietnameseName(s.fullName) !== s.fullName || normalizeEmail(s.email) !== s.email) count++;
    });
    enterprises.forEach(e => {
      if (normalizeEmail(e.contactEmail) !== e.contactEmail) count++;
    });
    guests.forEach(g => {
      if (normalizeVietnameseName(g.fullName) !== g.fullName || normalizeEmail(g.email) !== g.email) count++;
    });
    return count;
  }, [speakers, enterprises, guests]);

  // Overall Health Score Calculation
  const healthScore = useMemo(() => {
    const totalRecords = speakers.length + enterprises.length + guests.length;
    if (totalRecords === 0) return 100;
    const deductions = (duplicateGroups.length * 5) + (unnormalizedCount * 2);
    return Math.max(70, Math.min(100, 100 - deductions));
  }, [speakers.length, enterprises.length, guests.length, duplicateGroups.length, unnormalizedCount]);

  // Handlers
  const handleOpenProfile = (entity: any, type: EntityType) => {
    setProfileEntity(entity);
    setProfileEntityType(type);
  };

  const handleOpenCreate = (type: EntityType) => {
    setFormConfig({
      isOpen: true,
      type,
      initialData: null,
    });
  };

  const handleOpenEdit = (entity: any, type: EntityType) => {
    setFormConfig({
      isOpen: true,
      type,
      initialData: entity,
    });
  };

  const handleSaveEntity = (type: EntityType, savedData: any) => {
    let newSpeakers = [...speakers];
    let newEnterprises = [...enterprises];
    let newGuests = [...guests];
    let newEvents = [...events];

    const isUpdate = (
      (type === 'speaker' && speakers.some(s => s.id === savedData.id)) ||
      (type === 'enterprise' && enterprises.some(e => e.id === savedData.id)) ||
      (type === 'guest' && guests.some(g => g.id === savedData.id)) ||
      (type === 'event' && events.some(ev => ev.id === savedData.id))
    );

    if (type === 'speaker') {
      newSpeakers = isUpdate
        ? newSpeakers.map(s => s.id === savedData.id ? savedData : s)
        : [savedData, ...newSpeakers];
    } else if (type === 'enterprise') {
      newEnterprises = isUpdate
        ? newEnterprises.map(e => e.id === savedData.id ? savedData : e)
        : [savedData, ...newEnterprises];
    } else if (type === 'guest') {
      newGuests = isUpdate
        ? newGuests.map(g => g.id === savedData.id ? savedData : g)
        : [savedData, ...newGuests];
    } else if (type === 'event') {
      newEvents = isUpdate
        ? newEvents.map(ev => ev.id === savedData.id ? savedData : ev)
        : [savedData, ...newEvents];
    }

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUserRole === 'Admin' ? 'Admin (Quản trị viên)' : currentUserRole,
      userRole: currentUserRole,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      entityType: type,
      entityId: savedData.id,
      details: `${isUpdate ? 'Cập nhật' : 'Thêm mới'} hồ sơ: ${savedData.fullName || savedData.name || savedData.title}`,
    };

    const newLogs = [newLog, ...auditLogs];

    setSpeakers(newSpeakers);
    setEnterprises(newEnterprises);
    setGuests(newGuests);
    setEvents(newEvents);
    setAuditLogs(newLogs);

    persistState(newSpeakers, newEnterprises, newGuests, newEvents, templates, newLogs);
  };

  const handleSaveEventDirect = (eventData: Partial<EventItem>) => {
    let newEvents = [...events];
    const isUpdate = Boolean(eventData.id && events.some(e => e.id === eventData.id));
    let savedEvent: EventItem;

    if (isUpdate) {
      newEvents = newEvents.map(e => e.id === eventData.id ? { ...e, ...eventData, updatedAt: new Date().toISOString() } as EventItem : e);
      savedEvent = newEvents.find(e => e.id === eventData.id)!;
    } else {
      savedEvent = {
        ...eventData,
        id: eventData.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as EventItem;
      newEvents = [savedEvent, ...newEvents];
    }

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUserRole === 'Admin' ? 'Admin (Quản trị viên)' : currentUserRole,
      userRole: currentUserRole,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      entityType: 'event',
      entityId: savedEvent.id,
      details: `${isUpdate ? 'Cập nhật' : 'Thêm mới'} sự kiện vận hành: ${savedEvent.title}`,
    };

    const newLogs = [newLog, ...auditLogs];
    setEvents(newEvents);
    setAuditLogs(newLogs);
    persistState(speakers, enterprises, guests, newEvents, templates, newLogs);
    showToast(`Đã ${isUpdate ? 'cập nhật' : 'tạo mới'} thành công sự kiện: ${savedEvent.title}`);
  };

  const handleUpdateEventRundown = (eventId: string, rundown: any[]) => {
    const updated = events.map(e => e.id === eventId ? { ...e, rundown, updatedAt: new Date().toISOString() } : e);
    setEvents(updated);
    persistState(speakers, enterprises, guests, updated, templates, auditLogs);
    showToast('Đã lưu kịch bản timeline sân khấu thành công!');
  };

  const handleUpdateEventPhases = (eventId: string, operationalPhases: any[]) => {
    const updated = events.map(e => e.id === eventId ? { ...e, operationalPhases, updatedAt: new Date().toISOString() } : e);
    setEvents(updated);
    persistState(speakers, enterprises, guests, updated, templates, auditLogs);
    showToast('Đã cập nhật tiến độ công việc 3 giai đoạn!');
  };

  const handleDeleteEntity = (id: string, type: EntityType) => {
    let name = '';
    if (type === 'speaker') {
      const item = speakers.find(s => s.id === id);
      name = item?.fullName || 'Hồ sơ Diễn giả';
    } else if (type === 'enterprise') {
      const item = enterprises.find(e => e.id === id);
      name = item?.name || 'Hồ sơ Doanh nghiệp';
    } else if (type === 'guest') {
      const item = guests.find(g => g.id === id);
      name = item?.fullName || 'Hồ sơ Khách mời';
    } else {
      const item = events.find(ev => ev.id === id);
      name = item?.title || 'Sự kiện';
    }

    setDeleteTarget({
      isOpen: true,
      type,
      ids: [id],
      entityName: name,
    });
  };

  const handleBatchDelete = (ids: string[], type: EntityType) => {
    if (!ids || ids.length === 0) return;
    setDeleteTarget({
      isOpen: true,
      type,
      ids,
      entityName: `${ids.length} hồ sơ đã chọn`,
    });
  };

  const handleConfirmDelete = () => {
    const { ids, type, entityName } = deleteTarget;
    if (!ids || ids.length === 0) {
      setDeleteTarget({ isOpen: false, type: 'speaker', ids: [] });
      return;
    }

    let newSpeakers = speakers;
    let newEnterprises = enterprises;
    let newGuests = guests;
    let newEvents = events;

    if (type === 'speaker') {
      newSpeakers = speakers.filter(s => !ids.includes(s.id));
    } else if (type === 'enterprise') {
      newEnterprises = enterprises.filter(e => !ids.includes(e.id));
    } else if (type === 'guest') {
      newGuests = guests.filter(g => !ids.includes(g.id));
    } else if (type === 'event') {
      newEvents = events.filter(ev => !ids.includes(ev.id));
    }

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUserRole,
      userRole: currentUserRole,
      action: 'DELETE',
      entityType: type,
      entityId: ids.join(', '),
      details: `Đã xóa ${ids.length} hồ sơ: ${entityName || ids.join(', ')}`,
    };

    const newLogs = [newLog, ...auditLogs];

    setSpeakers(newSpeakers);
    setEnterprises(newEnterprises);
    setGuests(newGuests);
    setEvents(newEvents);
    setAuditLogs(newLogs);

    // If active in profile modal and deleted, close modal
    if (profileEntity && ids.includes(profileEntity.id)) {
      setProfileEntity(null);
    }

    persistState(newSpeakers, newEnterprises, newGuests, newEvents, templates, newLogs);
    setDeleteTarget({ isOpen: false, type: 'speaker', ids: [] });
    showToast(`Đã xóa thành công ${ids.length > 1 ? `${ids.length} hồ sơ` : (entityName || 'hồ sơ')}`);
  };

  const handleBatchTag = (ids: string[], type: EntityType, newTags: string[]) => {
    if (type === 'speaker') {
      const updated = speakers.map(s => {
        if (ids.includes(s.id)) {
          return { ...s, tags: Array.from(new Set([...(s.tags || []), ...newTags])) };
        }
        return s;
      });
      setSpeakers(updated);
      persistState(updated);
      showToast(`Đã gắn nhãn cho ${ids.length} hồ sơ diễn giả`);
    } else if (type === 'enterprise') {
      const updated = enterprises.map(e => {
        if (ids.includes(e.id)) {
          return { ...e, tags: Array.from(new Set([...(e.tags || []), ...newTags])) };
        }
        return e;
      });
      setEnterprises(updated);
      persistState(speakers, updated);
      showToast(`Đã gắn nhãn cho ${ids.length} đối tác`);
    } else if (type === 'guest') {
      const updated = guests.map(g => {
        if (ids.includes(g.id)) {
          return { ...g, tags: Array.from(new Set([...(g.tags || []), ...newTags])) };
        }
        return g;
      });
      setGuests(updated);
      persistState(speakers, enterprises, updated);
      showToast(`Đã gắn nhãn cho ${ids.length} khách mời`);
    }
  };

  const handleSaveImportedData = (
    newSpeakers: Speaker[],
    newEnterprises: Enterprise[],
    newGuests: Guest[],
    newEvents: EventItem[],
    savedTemplate?: MappingTemplate
  ) => {
    // Merge by ID: if an incoming record has an ID that already exists, it updates it, otherwise prepends
    const mergeEntities = <T extends { id: string }>(incoming: T[], current: T[], prefix: string): T[] => {
      const map = new Map<string, T>();
      current.forEach(item => {
        if (item.id) map.set(item.id, item);
      });
      incoming.forEach(item => {
        if (item.id) map.set(item.id, item);
      });
      return deduplicateById(Array.from(map.values()), prefix);
    };

    const combinedSpeakers = mergeEntities(newSpeakers, speakers, 'spk');
    const combinedEnterprises = mergeEntities(newEnterprises, enterprises, 'ent');
    const combinedGuests = mergeEntities(newGuests, guests, 'gst');
    const combinedEvents = mergeEntities(newEvents, events, 'evt');
    const combinedTemplates = savedTemplate 
      ? [savedTemplate, ...templates.filter(t => t.id !== savedTemplate.id)]
      : templates;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUserRole,
      userRole: currentUserRole,
      action: 'IMPORT',
      entityType: 'general',
      details: `Đã nhập và chuẩn hóa thành công ${newSpeakers.length + newEnterprises.length + newGuests.length + newEvents.length} bản ghi mới từ tệp Excel`,
    };

    const newLogs = [newLog, ...auditLogs];

    setSpeakers(combinedSpeakers);
    setEnterprises(combinedEnterprises);
    setGuests(combinedGuests);
    setEvents(combinedEvents);
    setTemplates(combinedTemplates);
    setAuditLogs(newLogs);

    persistState(combinedSpeakers, combinedEnterprises, combinedGuests, combinedEvents, combinedTemplates, newLogs);
  };

  const handleMergeDuplicate = (group: DuplicateGroup, mergedRecord: any, deletedId: string) => {
    let newSpeakers = [...speakers];
    let newEnterprises = [...enterprises];
    let newGuests = [...guests];

    if (group.entityType === 'speaker') {
      newSpeakers = newSpeakers
        .filter(s => s.id !== deletedId)
        .map(s => s.id === mergedRecord.id ? mergedRecord : s);
    } else if (group.entityType === 'enterprise') {
      newEnterprises = newEnterprises
        .filter(e => e.id !== deletedId)
        .map(e => e.id === mergedRecord.id ? mergedRecord : e);
    } else if (group.entityType === 'guest') {
      newGuests = newGuests
        .filter(g => g.id !== deletedId)
        .map(g => g.id === mergedRecord.id ? mergedRecord : g);
    }

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUserRole,
      userRole: currentUserRole,
      action: 'MERGE',
      entityType: group.entityType,
      entityId: mergedRecord.id,
      details: `Đã gộp hồ sơ trùng lặp (ID: ${mergedRecord.id}) và xóa bản ghi trùng (ID: ${deletedId})`,
    };

    const newLogs = [newLog, ...auditLogs];

    setSpeakers(newSpeakers);
    setEnterprises(newEnterprises);
    setGuests(newGuests);
    setAuditLogs(newLogs);

    persistState(newSpeakers, newEnterprises, newGuests, events, templates, newLogs);
  };

  const handleApplyStandardization = (
    cleanSpeakers: Speaker[],
    cleanEnterprises: Enterprise[],
    cleanGuests: Guest[]
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUserRole,
      userRole: currentUserRole,
      action: 'UPDATE',
      entityType: 'general',
      details: `Đã thực hiện chuẩn hóa tự động Title Case, làm sạch Email và định dạng SĐT VN cho toàn bộ hệ thống`,
    };

    const newLogs = [newLog, ...auditLogs];

    setSpeakers(cleanSpeakers);
    setEnterprises(cleanEnterprises);
    setGuests(cleanGuests);
    setAuditLogs(newLogs);

    persistState(cleanSpeakers, cleanEnterprises, cleanGuests, events, templates, newLogs);
  };

  const handleBatchUpdatePhones = (
    updatedSpeakers: Speaker[],
    updatedEnterprises: Enterprise[],
    updatedGuests: Guest[]
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUserRole,
      userRole: currentUserRole,
      action: 'UPDATE',
      entityType: 'general',
      details: `Đã áp dụng chuẩn hóa số điện thoại E.164 toàn hệ thống qua Universal E.164 Phone Normalizer`,
    };

    const newLogs = [newLog, ...auditLogs];
    setSpeakers(updatedSpeakers);
    setEnterprises(updatedEnterprises);
    setGuests(updatedGuests);
    setAuditLogs(newLogs);
    persistState(updatedSpeakers, updatedEnterprises, updatedGuests, events, templates, newLogs);
    showToast('Đã chuẩn hóa toàn bộ số điện thoại sang định dạng E.164 quốc tế thành công!');
  };

  const handleMoveEntityCategory = (id: string, fromType: EntityType, toType: EntityType) => {
    let itemToMove: any = null;
    let newSpeakers = [...speakers];
    let newEnterprises = [...enterprises];
    let newGuests = [...guests];
    let newEvents = [...events];

    if (fromType === 'speaker') {
      itemToMove = speakers.find(s => s.id === id);
      newSpeakers = speakers.filter(s => s.id !== id);
    } else if (fromType === 'enterprise') {
      itemToMove = enterprises.find(e => e.id === id);
      newEnterprises = enterprises.filter(e => e.id !== id);
    } else if (fromType === 'guest') {
      itemToMove = guests.find(g => g.id === id);
      newGuests = guests.filter(g => g.id !== id);
    } else if (fromType === 'event') {
      itemToMove = events.find(ev => ev.id === id);
      newEvents = events.filter(ev => ev.id !== id);
    }

    if (!itemToMove) return;

    const itemName = itemToMove.fullName || itemToMove.name || itemToMove.title || 'Hồ sơ';
    const targetId = `${toType.slice(0, 3)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const categoryLabels: Record<EntityType, string> = {
      speaker: 'Diễn giả & Chuyên gia',
      enterprise: 'Doanh nghiệp & Đối tác',
      guest: 'Khách mời Tham dự',
      event: 'Sự kiện',
    };

    if (toType === 'guest') {
      const convertedGuest: Guest = {
        id: targetId,
        fullName: itemToMove.fullName || itemToMove.name || '',
        avatarUrl: itemToMove.avatarUrl,
        email: itemToMove.email || itemToMove.contactEmail || '',
        phone: itemToMove.phone || itemToMove.contactPhone || '',
        organization: itemToMove.organization || itemToMove.name || '',
        role: itemToMove.role || 'Khách mời',
        vipStatus: Boolean(itemToMove.vipStatus || itemToMove.tags?.some((t: string) => /vip/i.test(t))),
        ticketType: itemToMove.ticketType || (itemToMove.tags?.some((t: string) => /vip/i.test(t)) ? 'VIP Pass' : 'Standard'),
        checkInStatus: itemToMove.checkInStatus || 'Registered',
        interestTopics: itemToMove.expertise || itemToMove.interestTopics || [],
        tags: itemToMove.tags || ['Khách mời VIP'],
        eventsAttended: itemToMove.events || itemToMove.eventsAttended || [],
        location: itemToMove.location || 'Hà Nội',
        note: itemToMove.note || '',
        createdAt: itemToMove.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isNormalized: true,
      };
      newGuests = [convertedGuest, ...newGuests];
    } else if (toType === 'speaker') {
      const convertedSpeaker: Speaker = {
        id: targetId,
        fullName: itemToMove.fullName || '',
        avatarUrl: itemToMove.avatarUrl,
        email: itemToMove.email || '',
        phone: itemToMove.phone || '',
        organization: itemToMove.organization || '',
        role: itemToMove.role || 'Diễn giả',
        bio: itemToMove.bio || '',
        expertise: itemToMove.expertise || itemToMove.interestTopics || [],
        rating: itemToMove.rating || 4.8,
        participationCount: itemToMove.participationCount || 1,
        honorariumRange: itemToMove.honorariumRange || 'Thỏa thuận',
        events: itemToMove.events || itemToMove.eventsAttended || [],
        tags: itemToMove.tags || [],
        location: itemToMove.location || 'Hà Nội',
        status: itemToMove.status || 'Available',
        note: itemToMove.note || '',
        createdAt: itemToMove.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isNormalized: true,
      };
      newSpeakers = [convertedSpeaker, ...newSpeakers];
    } else if (toType === 'enterprise') {
      const convertedEnterprise: Enterprise = {
        id: targetId,
        name: itemToMove.organization || itemToMove.name || itemToMove.fullName || '',
        logoUrl: itemToMove.logoUrl,
        industry: itemToMove.industry || 'Công nghệ',
        contactPerson: itemToMove.fullName || itemToMove.contactPerson || '',
        contactEmail: itemToMove.email || itemToMove.contactEmail || '',
        contactPhone: itemToMove.phone || itemToMove.contactPhone || '',
        tier: itemToMove.tier || 'Strategic',
        scale: itemToMove.scale || '200 - 1000',
        website: itemToMove.website || '',
        location: itemToMove.location || 'Hà Nội',
        events: itemToMove.events || [],
        sponsorshipTotal: itemToMove.sponsorshipTotal || 0,
        tags: itemToMove.tags || [],
        status: itemToMove.status || 'Active',
        note: itemToMove.note || '',
        createdAt: itemToMove.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isNormalized: true,
      };
      newEnterprises = [convertedEnterprise, ...newEnterprises];
    }

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUserRole,
      userRole: currentUserRole,
      action: 'UPDATE',
      entityType: toType,
      entityId: targetId,
      details: `Đã tự động chuyển hồ sơ "${itemName}" từ mục ${categoryLabels[fromType]} sang đúng mục ${categoryLabels[toType]}`,
    };

    const newLogs = [newLog, ...auditLogs];
    setSpeakers(newSpeakers);
    setEnterprises(newEnterprises);
    setGuests(newGuests);
    setEvents(newEvents);
    setAuditLogs(newLogs);

    persistState(newSpeakers, newEnterprises, newGuests, newEvents, templates, newLogs);
    showToast(`Đã chuyển thành công "${itemName}" sang mục ${categoryLabels[toType]}!`);
  };

  const handleAddInteractionNote = (noteData: Omit<InteractionNote, 'id'>) => {
    const newNote: InteractionNote = {
      ...noteData,
      id: `note-${Date.now()}`,
    };
    const newNotes = [newNote, ...notes];
    setNotes(newNotes);
    persistState(speakers, enterprises, guests, events, templates, auditLogs, newNotes);
  };

  const handleAssignSpeakerToEvent = (speakerId: string, eventId: string) => {
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) return;

    const updatedEvents = events.map(ev => {
      if (ev.id === eventId) {
        return {
          ...ev,
          speakerIds: Array.from(new Set([...ev.speakerIds, speakerId])),
        };
      }
      return ev;
    });

    const updatedSpeakers = speakers.map(spk => {
      if (spk.id === speakerId) {
        return {
          ...spk,
          events: Array.from(new Set([...(spk.events || []), targetEvent.title])),
        };
      }
      return spk;
    });

    setEvents(updatedEvents);
    setSpeakers(updatedSpeakers);
    persistState(updatedSpeakers, enterprises, guests, updatedEvents);

    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
  };

  const handleExportFullBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      speakers,
      enterprises,
      guests,
      events,
      templates,
      auditLogs,
      notes,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EventDataHub_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    StorageService.clearData();
    const data = StorageService.loadData();
    setSpeakers(data.speakers);
    setEnterprises(data.enterprises);
    setGuests(data.guests);
    setEvents(data.events);
    setTemplates(data.templates);
    setAuditLogs(data.auditLogs);
    setNotes(data.notes);
    setCurrentUserRole('Admin');
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      
      {/* Global Application Header */}
      <Header
        currentRole={currentUserRole}
        onRoleChange={(role) => {
          setCurrentUserRole(role);
          persistState(speakers, enterprises, guests, events, templates, auditLogs, notes, role);
        }}
        onOpenImporter={() => setIsImporterOpen(true)}
        onOpenDuplicateDetector={() => setIsDuplicatesOpen(true)}
        onOpenStandardizer={() => setIsStandardizerOpen(true)}
        onOpenPhoneNormalizer={() => setIsPhoneNormalizerOpen(true)}
        onOpenAdvancedSearch={() => setIsSearchOpen(true)}
        onOpenMatchmaker={() => setIsMatchmakerOpen(true)}
        onOpenMaps={() => setIsMapsOpen(true)}
        onOpenWorkspace={() => setIsWorkspaceOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onResetData={handleResetData}
        onExportBackup={handleExportFullBackup}
        duplicateCount={duplicateGroups.length}
        unnormalizedCount={unnormalizedCount}
        healthScore={healthScore}
        totalRecords={speakers.length + enterprises.length + guests.length + events.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <NavigationTabs
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          speakerCount={speakers.length}
          enterpriseCount={enterprises.length}
          guestCount={guests.length}
          eventCount={events.length}
        />

        {/* Dynamic View Router */}
        {activeTab === 'overview' && (
          <OverviewDashboard
            speakers={speakers}
            enterprises={enterprises}
            guests={guests}
            events={events}
            auditLogs={auditLogs}
            notes={notes}
            duplicateCount={duplicateGroups.length}
            unnormalizedCount={unnormalizedCount}
            healthScore={healthScore}
            onOpenImporter={() => handleOpenImporter()}
            onOpenDuplicates={() => setIsDuplicatesOpen(true)}
            onOpenStandardizer={() => setIsStandardizerOpen(true)}
            onOpenPhoneNormalizer={() => setIsPhoneNormalizerOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenMatchmaker={() => setIsMatchmakerOpen(true)}
            onOpenProfile={handleOpenProfile}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {(activeTab === 'speakers' || activeTab === 'enterprises' || activeTab === 'guests') && (
          <EntityListView
            entityType={activeTab === 'speakers' ? 'speaker' : activeTab === 'enterprises' ? 'enterprise' : 'guest'}
            speakers={speakers}
            enterprises={enterprises}
            guests={guests}
            events={events}
            onOpenProfile={handleOpenProfile}
            onOpenCreate={handleOpenCreate}
            onOpenEdit={handleOpenEdit}
            onDeleteEntity={handleDeleteEntity}
            onBatchTag={handleBatchTag}
            onBatchDelete={handleBatchDelete}
            onMoveCategory={handleMoveEntityCategory}
            onOpenImporter={handleOpenImporter}
            currentUserRole={currentUserRole}
          />
        )}

        {activeTab === 'events' && (
          <EventOperationsHub
            events={events}
            speakers={speakers}
            enterprises={enterprises}
            guests={guests}
            onSaveEvent={handleSaveEventDirect}
            onDeleteEvent={(id) => handleDeleteEntity(id, 'event')}
            onUpdateEventRundown={handleUpdateEventRundown}
            onUpdateEventPhases={handleUpdateEventPhases}
            onOpenExcelImporter={() => handleOpenImporter('event')}
            onOpenProfile={handleOpenProfile}
          />
        )}

        {activeTab === 'governance' && (
          <AuditGovernanceView
            auditLogs={auditLogs}
            currentUserRole={currentUserRole}
            onChangeRole={(role) => {
              setCurrentUserRole(role);
              persistState(speakers, enterprises, guests, events, templates, auditLogs, notes, role);
            }}
            onResetData={handleResetData}
          />
        )}

      </main>

      {/* MODALS */}

      {/* 1. Smart Excel Importer & Mapping Wizard */}
      <ExcelImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onSaveData={handleSaveImportedData}
        savedTemplates={templates}
        existingData={{ speakers, enterprises, guests, events }}
        initialEntityType={importerDefaultType}
      />

      {/* 2. Duplicate Detection & Side-by-Side Merge Studio */}
      <DuplicateDetectorModal
        isOpen={isDuplicatesOpen}
        onClose={() => setIsDuplicatesOpen(false)}
        duplicateGroups={duplicateGroups}
        onMergeGroup={handleMergeDuplicate}
      />

      {/* 3. 1-Click Format Standardizer */}
      <FormatStandardizerModal
        isOpen={isStandardizerOpen}
        onClose={() => setIsStandardizerOpen(false)}
        speakers={speakers}
        enterprises={enterprises}
        guests={guests}
        onApplyStandardization={handleApplyStandardization}
      />

      {/* 3b. Universal E.164 Phone Normalizer & Health Audit Modal */}
      <UniversalPhoneNormalizerModal
        isOpen={isPhoneNormalizerOpen}
        onClose={() => setIsPhoneNormalizerOpen(false)}
        speakers={speakers}
        enterprises={enterprises}
        guests={guests}
        onApplyBatchUpdate={handleBatchUpdatePhones}
      />

      {/* 4. 360° Profile View Drawer */}
      <Profile360Modal
        isOpen={Boolean(profileEntity)}
        onClose={() => setProfileEntity(null)}
        entity={profileEntity}
        entityType={profileEntityType}
        allEvents={events}
        allSpeakers={speakers}
        allEnterprises={enterprises}
        notes={notes}
        onAddNote={handleAddInteractionNote}
        onEditEntity={handleOpenEdit}
        onDeleteEntity={handleDeleteEntity}
        currentUserRole={currentUserRole}
      />

      {/* 5. Entity Form (Create/Edit) */}
      <EntityFormModal
        isOpen={formConfig.isOpen}
        onClose={() => setFormConfig(prev => ({ ...prev, isOpen: false }))}
        entityType={formConfig.type}
        initialData={formConfig.initialData}
        onSave={handleSaveEntity}
      />

      {/* 6. AI Smart Matchmaker */}
      <SpeakerMatchmakerModal
        isOpen={isMatchmakerOpen}
        onClose={() => setIsMatchmakerOpen(false)}
        speakers={speakers}
        events={events}
        onOpenProfile={handleOpenProfile}
        onAssignSpeakerToEvent={handleAssignSpeakerToEvent}
      />

      {/* 7. Global Search (⌘K Command Palette) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        speakers={speakers}
        enterprises={enterprises}
        guests={guests}
        events={events}
        onOpenProfile={handleOpenProfile}
      />

      {/* 8. Google Maps & Event Venues Modal */}
      <GoogleMapsVenueModal
        isOpen={isMapsOpen}
        onClose={() => setIsMapsOpen(false)}
        events={events}
        speakers={speakers}
        enterprises={enterprises}
        onSelectEvent={(ev) => {
          setIsMapsOpen(false);
          setActiveTab('events');
        }}
      />

      {/* 9. Google Workspace Integration Modal (Sheets, Calendar, Drive) */}
      <GoogleWorkspaceModal
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        speakers={speakers}
        enterprises={enterprises}
        guests={guests}
        events={events}
      />

      {/* 10. Gemini AI Copilot Drawer */}
      <GeminiCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        speakers={speakers}
        enterprises={enterprises}
        guests={guests}
        events={events}
        onOpenProfile={handleOpenProfile}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* 11. Delete Confirmation In-App Modal */}
      <DeleteConfirmModal
        isOpen={deleteTarget.isOpen}
        onClose={() => setDeleteTarget(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        entityType={deleteTarget.type}
        entityName={deleteTarget.entityName}
        itemCount={deleteTarget.ids.length}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 animate-slideInRight text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating AI Copilot Trigger Button */}
      <button
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/20 group"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </div>
        <span>Gemini AI Copilot</span>
      </button>

    </div>
  );
}

export default App;

