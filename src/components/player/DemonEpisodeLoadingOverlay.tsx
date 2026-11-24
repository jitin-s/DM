import React from 'react';
import { Loader2, AlertCircle, RefreshCw, X, ArrowLeft, ShieldCheck } from 'lucide-react';
import { getStreamingLoadingMessage, DEMON_MESSAGES } from '../../config/demonMessages';

export interface DemonEpisodeLoadingOverlayProps {
  isOpen: boolean;
  animeTitle: string;
  episodeNumber: number;
  state: string; // 'fetching_episode' | 'discovering_sources' | 'checking_source' | 'connecting' | 'initializing_player' | 'playing' | 'buffering' | 'retrying' | 'failed' | 'timeout' | 'unavailable';
  error?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
  onSwitchSource?: () => void;
}

export const DemonEpisodeLoadingOverlay: React.FC<DemonEpisodeLoadingOverlayProps> = ({
  isOpen,
  animeTitle,
  episodeNumber,
  state,
  error,
  onRetry,
  onCancel,
  onSwitchSource,
}) => {
  if (!isOpen) return null;

  const isFailed = state === 'failed' || state === 'timeout' || state === 'unavailable' || Boolean(error);
  const loadingMessage = getStreamingLoadingMessage(state);

  return (
    <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
      {/* Background Demonic Glow Orbs */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#F01428]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Title & Cancel */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <img src="/logo_cropped.png" alt="DevilMotion" className="h-4 sm:h-5 w-auto drop-shadow" />
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F01428]/20 text-[#FF4D61] border border-[#F01428]/30">
            EP {episodeNumber}
          </span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            aria-label="Cancel Loading"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9E9EB2] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Center Portal Box */}
      <div className="max-w-md w-full relative z-10 flex flex-col items-center">
        {isFailed ? (
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-[#F01428] shadow-lg shadow-red-500/10">
            <AlertCircle className="w-8 h-8" />
          </div>
        ) : (
          <div className="relative mb-5">
            {/* Spinning Demonic Portal Rings */}
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#F01428]/40 animate-[spin_8s_linear_infinite]" />
            <div className="absolute inset-1 rounded-full border-2 border-t-[#F01428] border-r-[#A855F7] border-b-transparent border-l-transparent animate-[spin_1.5s_linear_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#F01428] animate-spin" />
            </div>
          </div>
        )}

        {/* Selected Anime & Episode Info */}
        <div className="mb-3 text-center">
          <span className="text-[11px] font-bold text-[#F01428] uppercase tracking-wider">
            Episode {episodeNumber}
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white font-heading truncate max-w-sm mt-0.5">
            {animeTitle}
          </h3>
        </div>

        {/* Demon-Themed Stage Status Message */}
        <p className="text-sm font-semibold text-white/90 mb-1 max-w-xs leading-snug">
          {isFailed ? error || DEMON_MESSAGES.errors.streamFailedTitle : loadingMessage}
        </p>
        <p className="text-xs text-[#9E9EB2] mb-6 max-w-xs">
          {isFailed
            ? DEMON_MESSAGES.errors.streamFailedDesc
            : 'Verifying dimensional stream integrity and authorized video servers...'}
        </p>

        {/* Actions / Recovery */}
        {isFailed ? (
          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 rounded-xl bg-[#F01428] hover:bg-[#D01020] text-white text-xs font-bold transition-all shadow-md shadow-[#F01428]/30 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {DEMON_MESSAGES.buttons.retryPlayback}
              </button>
            )}
            {onSwitchSource && (
              <button
                onClick={onSwitchSource}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
              >
                {DEMON_MESSAGES.buttons.switchServer}
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-2 text-xs text-[#9E9EB2] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                {DEMON_MESSAGES.buttons.cancel}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-[#707085]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Demonic Handshake in Progress</span>
          </div>
        )}
      </div>
    </div>
  );
};
