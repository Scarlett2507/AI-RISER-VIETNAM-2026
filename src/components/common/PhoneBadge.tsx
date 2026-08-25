import React, { useState } from 'react';
import { Phone, MessageCircle, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { normalizePhoneField, NormalizedPhoneNumber } from '../../services/phoneNormalizer';

interface PhoneBadgeProps {
  phone?: string;
  className?: string;
  showActions?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PhoneBadge: React.FC<PhoneBadgeProps> = ({
  phone,
  className = '',
  showActions = true,
  size = 'md',
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);

  if (!phone || !phone.trim()) {
    return <span className="text-slate-400 italic text-xs">Chưa có SĐT</span>;
  }

  const result = normalizePhoneField(phone);
  const { primary, secondary, hasMultiple } = result;

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const renderSingleNumber = (num: NormalizedPhoneNumber, label?: string) => {
    if (!num.isValid) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs ${className}`}
          title={`Lỗi: ${num.errorReason || 'Định dạng SĐT không hợp lệ'}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span className="font-semibold">{num.raw}</span>
          <span className="text-[10px] bg-rose-200/70 text-rose-800 px-1 py-0.5 rounded font-sans uppercase">
            Lỗi định dạng
          </span>
        </div>
      );
    }

    const displayE164 = num.e164 || num.cleaned;

    return (
      <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
        {/* Flag + E.164 Number Pill */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono transition-colors shadow-2xs group">
          <span className="text-sm leading-none" title={num.countryName || 'Quốc tế'}>
            {num.countryFlag || '🌐'}
          </span>
          <span className="font-bold tracking-tight text-slate-900">{displayE164}</span>
          {label && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded font-sans font-medium">
              {label}
            </span>
          )}
          {num.numberType && num.numberType !== 'UNKNOWN' && (
            <span className="text-[9px] text-slate-400 font-sans hidden group-hover:inline">
              {num.numberType === 'MOBILE' ? 'Di động' : 'Cố định'}
            </span>
          )}
        </div>

        {/* Quick Action Buttons */}
        {showActions && (
          <div className="inline-flex items-center gap-1">
            {/* Copy Button */}
            <button
              onClick={(e) => handleCopy(displayE164, e)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Sao chép số E.164"
            >
              {copied === displayE164 ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Direct Call (tel:) */}
            {num.telLink && (
              <a
                href={num.telLink}
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                title={`Gọi trực tiếp (${displayE164})`}
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}

            {/* WhatsApp (wa.me) */}
            {num.whatsappLink && (
              <a
                href={num.whatsappLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center"
                title={`Mở WhatsApp (${displayE164})`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
              </a>
            )}

            {/* Zalo (for VN numbers) */}
            {num.zaloLink && (
              <a
                href={num.zaloLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200"
                title={`Mở Zalo (${displayE164})`}
              >
                Zalo
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {renderSingleNumber(primary, hasMultiple ? 'Chính' : undefined)}

      {hasMultiple && secondary && (
        <div>
          {!showSecondary ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSecondary(true);
              }}
              className="text-[11px] text-indigo-600 hover:underline font-medium flex items-center gap-1 mt-0.5"
            >
              <span>+1 số phụ ({secondary.countryFlag || '🌐'} {secondary.e164 || secondary.raw})</span>
            </button>
          ) : (
            <div className="mt-1 pl-2 border-l-2 border-indigo-200 space-y-1">
              {renderSingleNumber(secondary, 'Phụ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
