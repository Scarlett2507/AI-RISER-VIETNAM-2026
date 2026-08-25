import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  HelpCircle, 
  MessageSquare, 
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Speaker, Enterprise, Guest, EventItem } from '../../types';
import { AiService } from '../../services/aiService';

interface GeminiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  speakers: Speaker[];
  enterprises: Enterprise[];
  guests: Guest[];
  events: EventItem[];
  onOpenProfile?: (entity: any, type: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export const GeminiCopilotDrawer: React.FC<GeminiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  speakers = [],
  enterprises = [],
  guests = [],
  events = [],
  onNavigateToTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      role: 'model',
      content: `Xin chào! Tôi là **Trợ lý AI Gemini** của hệ thống **EventData Hub** 🚀.\n\nTôi có thể giúp bạn:\n- 🎯 Gợi ý diễn giả phù hợp theo từng chủ đề sự kiện\n- 💼 Tra cứu thông tin đối tác tài trợ & phân khúc doanh nghiệp\n- 📊 Đánh giá chất lượng dữ liệu & các bước chuẩn hóa\n- 🌐 Hướng dẫn đồng bộ Google Maps & Google Workspace (Sheets, Calendar)\n\nBạn muốn tìm kiếm hoặc phân tích thông tin gì hôm nay?`,
      timestamp: 'Vừa xong',
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    'Gợi ý 3 diễn giả hàng đầu về Trí tuệ nhân tạo (AI)',
    'Doanh nghiệp nào có tiềm năng tài trợ lớn nhất?',
    'Phân tích sự kiện sắp diễn ra tại Hà Nội và địa điểm tổ chức',
    'Hướng dẫn đồng bộ dữ liệu với Google Sheets',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const contextData = {
        speakerCount: speakers.length,
        enterpriseCount: enterprises.length,
        guestCount: guests.length,
        eventCount: events.length,
        speakersSample: speakers.slice(0, 10).map(s => ({
          name: s.fullName,
          role: s.role,
          org: s.organization,
          exp: s.expertise,
          rating: s.rating,
          loc: s.location,
        })),
        enterprisesSample: enterprises.slice(0, 10).map(e => ({
          name: e.name,
          industry: e.industry,
          tier: e.tier,
          scale: e.scale,
          loc: e.location,
          sponsorship: e.sponsorshipTotal,
        })),
        eventsSample: events.map(e => ({
          title: e.title,
          date: e.date,
          location: e.location,
          theme: e.theme,
        })),
      };

      const reply = await AiService.sendCopilotMessage(query.trim(), contextData, historyPayload);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: 'Xin lỗi, đã có lỗi xảy ra khi kết nối với Gemini. Vui lòng thử lại!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold">EventData AI Copilot</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                Gemini 3.7 Flash
              </span>
            </div>
            <p className="text-[11px] text-indigo-200">
              Trợ lý thông minh khai thác dữ liệu sự kiện
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs'
              }`}
            >
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              <div
                className={`text-[10px] mt-1.5 text-right ${
                  m.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}
              >
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-xs flex items-center gap-2 text-xs text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>Gemini đang phân tích kho dữ liệu sự kiện...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-3 bg-white border-t border-slate-100">
        <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
          <span>Gợi ý câu hỏi nhanh:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors text-left truncate max-w-full"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Hỏi Gemini về chuyên gia, sự kiện hoặc tài trợ..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-hidden text-xs text-slate-900 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
