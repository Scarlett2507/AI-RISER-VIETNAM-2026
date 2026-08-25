import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Navigation, 
  Building2, 
  CalendarDays, 
  ExternalLink, 
  Compass, 
  Users, 
  Sparkles,
  Map,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { EventItem, Speaker, Enterprise } from '../../types';

interface GoogleMapsVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  speakers: Speaker[];
  enterprises: Enterprise[];
  onOpenProfile?: (entity: any, type: string) => void;
}

export const GoogleMapsVenueModal: React.FC<GoogleMapsVenueModalProps> = ({
  isOpen,
  onClose,
  events = [],
  speakers = [],
  enterprises = [],
}) => {
  const [selectedCity, setSelectedCity] = useState<'all' | 'Hà Nội' | 'TP. Hồ Chí Minh' | 'Đà Nẵng' | 'Khác'>('all');
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');

  if (!isOpen) return null;

  // Curated list of premier event venues in Vietnam
  const venueDirectory = [
    {
      id: 'v1',
      name: 'Trung tâm Hội nghị Quốc gia (NCC)',
      city: 'Hà Nội',
      address: 'Số 57 đường Phạm Hùng, Mễ Trì, Nam Từ Liêm, Hà Nội',
      capacity: '3,800 khách',
      type: 'Trung tâm Hội nghị Quốc gia',
      events: events.filter(e => e.location?.includes('Hà Nội') || e.location?.includes('NCC')),
      coordinates: { lat: 21.0084, lng: 105.7877 },
    },
    {
      id: 'v2',
      name: 'Trung tâm Hội chợ và Triển lãm Sài Gòn (SECC)',
      city: 'TP. Hồ Chí Minh',
      address: '799 Nguyễn Văn Linh, Tân Phú, Quận 7, TP. Hồ Chí Minh',
      capacity: '5,000+ khách',
      type: 'Trung tâm Triển lãm Quốc tế',
      events: events.filter(e => e.location?.includes('Hồ Chí Minh') || e.location?.includes('SECC') || e.location?.includes('TP.HCM')),
      coordinates: { lat: 10.7303, lng: 106.7214 },
    },
    {
      id: 'v3',
      name: 'Cung Hội nghị Quốc tế Ariyana Đà Nẵng',
      city: 'Đà Nẵng',
      address: '107 Võ Nguyên Giáp, Khuê Mỹ, Ngũ Hành Sơn, Đà Nẵng',
      capacity: '2,500 khách',
      type: 'Khu nghỉ dưỡng & Hội nghị APEC',
      events: events.filter(e => e.location?.includes('Đà Nẵng') || e.location?.includes('Ariyana')),
      coordinates: { lat: 16.0378, lng: 108.2464 },
    },
    {
      id: 'v4',
      name: 'Gem Center Sài Gòn',
      city: 'TP. Hồ Chí Minh',
      address: '8 Nguyễn Bỉnh Khiêm, Đa Kao, Quận 1, TP. Hồ Chí Minh',
      capacity: '1,500 khách',
      type: 'Trung tâm Hội nghị & Yến tiệc Cao cấp',
      events: events.filter(e => e.location?.includes('Gem Center') || e.location?.includes('Quận 1')),
      coordinates: { lat: 10.7876, lng: 106.7001 },
    },
  ];

  const filteredVenues = venueDirectory.filter(v => {
    if (selectedCity === 'all') return true;
    return v.city === selectedCity;
  });

  // Calculate local speakers and enterprises for the selected city
  const activeEvent = events.find(e => e.id === selectedEventId) || events[0];
  const eventCity = activeEvent?.location?.includes('Hà Nội') 
    ? 'Hà Nội' 
    : activeEvent?.location?.includes('Đà Nẵng') 
    ? 'Đà Nẵng' 
    : 'TP. Hồ Chí Minh';

  const localSpeakers = speakers.filter(s => s.location?.toLowerCase().includes(eventCity.toLowerCase().replace('tp. ', '')));
  const localEnterprises = enterprises.filter(e => e.location?.toLowerCase().includes(eventCity.toLowerCase().replace('tp. ', '')));

  const openGoogleMaps = (query: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  const openGoogleMapsDirections = (destination: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Google Maps & Phân Tích Địa Điểm Sự Kiện</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white">
                  Google Maps Platform
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Bản đồ địa điểm hội nghị, định vị sự kiện và liên kết mạng lưới diễn giả theo khu vực
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Lọc theo khu vực:</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['all', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'] as const).map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCity === city
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  {city === 'all' ? 'Toàn quốc' : city}
                </button>
              ))}
            </div>
          </div>

          {/* Venues Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Trung Tâm Hội Nghị & Địa Điểm Tổ Chức Tiêu Biểu ({filteredVenues.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVenues.map((venue) => (
                <div 
                  key={venue.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-white hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {venue.city}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{venue.name}</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                      {venue.capacity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{venue.address}</span>
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{venue.events.length}</span> sự kiện đăng ký
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openGoogleMaps(venue.address)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Google Maps
                      </button>
                      <button
                        onClick={() => openGoogleMapsDirections(venue.address)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Chỉ đường
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Geo-Matching Section */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Gợi ý Chuyên gia & Doanh nghiệp Cùng Khu vực Sự kiện</h3>
              </div>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-slate-800 text-white text-xs border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-400"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.location || 'Chưa định vị'})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-300">
              Khu vực sự kiện: <span className="font-bold text-emerald-400">{eventCity}</span>. Hệ thống tự động lọc các chuyên gia và đối tác bản địa giúp tối ưu ngân sách di chuyển và tăng tính kết nối cộng đồng.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Local Speakers */}
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Diễn giả tại {eventCity} ({localSpeakers.length})</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Tối ưu công tác</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {localSpeakers.length > 0 ? (
                    localSpeakers.map((spk) => (
                      <div key={spk.id} className="p-2 rounded-lg bg-slate-700/50 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{spk.fullName}</div>
                          <div className="text-[11px] text-slate-400">{spk.role} - {spk.organization}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                          {spk.rating || 4.8} ★
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 py-2 text-center">Chưa có chuyên gia nào ghi nhận tại khu vực này</div>
                  )}
                </div>
              </div>

              {/* Local Enterprises */}
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Đối tác & Doanh nghiệp tại {eventCity} ({localEnterprises.length})</span>
                  <span className="text-[10px] text-teal-400 font-normal">Tiềm năng tài trợ</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {localEnterprises.length > 0 ? (
                    localEnterprises.map((ent) => (
                      <div key={ent.id} className="p-2 rounded-lg bg-slate-700/50 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{ent.name}</div>
                          <div className="text-[11px] text-slate-400">{ent.industry} - {ent.tier} Tier</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-300 font-bold">
                          {ent.scale || 'Doanh nghiệp'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 py-2 text-center">Chưa có doanh nghiệp nào ghi nhận tại khu vực này</div>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Tích hợp dịch vụ định vị Google Maps API URL Schemes chuẩn hóa
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-xs"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
