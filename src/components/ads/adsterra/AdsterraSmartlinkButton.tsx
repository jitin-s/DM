import React from 'react';
import { ExternalLink, Flame, Sparkles, Download, Zap, Crown } from 'lucide-react';
import { ADS_ENABLED, ADSTERRA_SMARTLINK } from '../../../config/adsConfig';

interface AdsterraSmartlinkButtonProps {
  variant?: 'server' | 'download' | 'nav' | 'details' | 'banner';
  className?: string;
  label?: string;
}

export const AdsterraSmartlinkButton: React.FC<AdsterraSmartlinkButtonProps> = ({
  variant = 'server',
  className = '',
  label,
}) => {
  if (!ADS_ENABLED) return null;

  if (variant === 'nav') {
    return (
      <a
        href={ADSTERRA_SMARTLINK}
        target="_blank"
        rel="noopener noreferrer"
        className={`items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-[#F01428]/25 to-amber-500/20 text-amber-300 hover:text-white hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all duration-200 active:scale-95 group ${className || 'inline-flex'}`}
        title="Access DevilMotion VIP Ultra Stream (Sponsored)"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        <Crown className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
        <span>{label || 'VIP 4K'}</span>
        <ExternalLink className="w-3 h-3 text-amber-400/80" />
      </a>
    );
  }

  if (variant === 'download') {
    return (
      <a
        href={ADSTERRA_SMARTLINK}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-emerald-300 bg-gradient-to-r from-emerald-600/20 via-emerald-500/25 to-teal-500/20 hover:from-emerald-600/35 hover:to-teal-500/35 border border-emerald-500/40 hover:border-emerald-400 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all duration-300 active:scale-95 group cursor-pointer ${className}`}
        title="Download in Ultra HD 1080p / 4K (High Speed)"
      >
        <Download className="w-4 h-4 text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
        <span>{label || '⚡ Download Episode (1080p / 4K)'}</span>
        <ExternalLink className="w-3.5 h-3.5 text-emerald-400/80 ml-auto sm:ml-0" />
      </a>
    );
  }

  if (variant === 'details') {
    return (
      <a
        href={ADSTERRA_SMARTLINK}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-amber-300 bg-gradient-to-r from-amber-500/20 via-[#F01428]/30 to-amber-500/20 hover:from-amber-500/30 hover:to-[#F01428]/45 border border-amber-500/40 hover:border-amber-400 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/15 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer active:scale-98 group ${className}`}
        title="Stream in Ultra HD 4K without buffer"
      >
        <Zap className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
        <span>{label || '⚡ Watch in 4K HDR Ultra (VIP Node)'}</span>
        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
      </a>
    );
  }

  if (variant === 'banner') {
    return (
      <a
        href={ADSTERRA_SMARTLINK}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full p-4 rounded-2xl bg-gradient-to-r from-[#1E1114] via-[#16121D] to-[#1E1114] border border-[#F01428]/30 hover:border-[#F01428]/60 shadow-xl shadow-black/60 flex flex-col sm:flex-row items-center justify-between gap-3 group transition-all duration-300 hover:shadow-[0_0_25px_rgba(240,20,40,0.25)] ${className}`}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F01428] to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-[#F01428]/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#F01428] text-white">
                VIP NODE
              </span>
              <span className="text-xs text-[#9E9EB2]">Zero Buffering • 4K 60FPS</span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
              {label || 'Unlock Ultra HD 4K Cinema Streaming & Fast Mirrors'}
            </h4>
          </div>
        </div>

        <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#F01428] text-white text-xs font-bold shrink-0 shadow-md group-hover:brightness-110 transition-all">
          <span>Access VIP Stream</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </a>
    );
  }

  // Default: server variant
  return (
    <a
      href={ADSTERRA_SMARTLINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-[#F01428]/25 to-amber-500/15 hover:from-amber-500/25 hover:to-[#F01428]/35 text-amber-300 font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm shadow-amber-500/10 active:scale-95 group ${className}`}
      title="Direct VIP 4K Ultra Server (Sponsored)"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
      <Flame className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
      <span>{label || '⚡ VIP 4K Server'}</span>
      <ExternalLink className="w-3 h-3 text-amber-400" />
    </a>
  );
};

export default AdsterraSmartlinkButton;
