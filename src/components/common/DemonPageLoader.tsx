import React, { useMemo } from 'react';
import { Sparkles, Flame, ShieldAlert } from 'lucide-react';
import { DEMON_MESSAGES } from '../../config/demonMessages';

interface DemonPageLoaderProps {
  message?: string;
  subMessage?: string;
  destination?: string;
  fullScreen?: boolean;
}

export const DemonPageLoader: React.FC<DemonPageLoaderProps> = ({
  message,
  subMessage,
  destination,
  fullScreen = true,
}) => {
  // Infer destination-specific demon flavor text if none provided
  const info = useMemo(() => {
    if (message) {
      return {
        title: message,
        subtitle: subMessage || 'Channeling DevilMotion high-speed streaming node...',
      };
    }

    const path = (destination || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')).toLowerCase();

    if (path.includes('/movies') || path.includes('movie')) {
      return {
        title: 'Opening Theatrical Chronicles & Feature Films...',
        subtitle: 'Summoning cinematic anime masterpieces in pristine Ultra HD...',
      };
    }

    if (path.includes('tv') || path.includes('format=tv')) {
      return {
        title: 'Summoning Episodic TV Series Chronicles...',
        subtitle: 'Channeling broadcast archives across dimensional airwaves...',
      };
    }

    if (path.includes('/schedule')) {
      return {
        title: 'Aligning Celestial Airing Gates & Schedule...',
        subtitle: 'Calculating exact breach times of upcoming realm releases...',
      };
    }

    if (path.includes('/genres')) {
      return {
        title: 'Cataloging Mystical Dimensions & Genres...',
        subtitle: 'Unsealing arcane categories and emotional realms...',
      };
    }

    if (path.includes('/watchlist')) {
      return {
        title: 'Unsealing the Dark Grimoire & History...',
        subtitle: 'Retrieving your marked pacts and tracked footsteps...',
      };
    }

    if (path.includes('/watch')) {
      return {
        title: 'Preparing Demonic Streaming Chamber...',
        subtitle: 'Harmonizing high-speed video servers for zero-buffer playback...',
      };
    }

    if (path.includes('/search')) {
      return {
        title: 'Searching the Eternal Anime Archives...',
        subtitle: 'Scouring thousands of titles through the infinite abyss...',
      };
    }

    if (path.includes('/anime')) {
      return {
        title: 'Summoning Demon Realm Anime Archives...',
        subtitle: 'Consulting the eternal AniList grimoire of animated legends...',
      };
    }

    return {
      title: DEMON_MESSAGES.loading.portal,
      subtitle: DEMON_MESSAGES.loading.connecting,
    };
  }, [message, subMessage, destination]);

  return (
    <div
      className={`${
        fullScreen
          ? 'fixed inset-0 z-50 flex items-center justify-center bg-[#08080A]/95 backdrop-blur-xl'
          : 'w-full py-28 flex flex-col items-center justify-center'
      } relative overflow-hidden select-none transition-opacity duration-300`}
      style={{
        background: fullScreen
          ? 'radial-gradient(circle at center, rgba(240, 20, 40, 0.16) 0%, rgba(8, 8, 10, 0.98) 70%)'
          : undefined,
      }}
    >
      {/* Mystical Background Grid & Sigils */}
      <div className="absolute inset-0 bg-[radial-gradient(#F01428_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

      {/* Center Summoning Aura */}
      <div className="relative flex flex-col items-center text-center px-4 max-w-md mx-auto z-10">
        {/* Animated Brand Logo */}
        <div className="relative mb-6">
          <img
            src="/logo_cropped.png"
            alt="DEVILMOTION"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_0_25px_rgba(240,20,40,0.6)] animate-demon-pulse"
          />
        </div>

        {/* Dual Concentric Arcane Rings */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-6 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#F01428]/40 animate-spin [animation-duration:12s]" />

          {/* Inner Counter-rotating Ring */}
          <div className="absolute inset-2 rounded-full border-2 border-dotted border-red-500/50 animate-reverse-spin" />

          {/* Glowing Center Sigil */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#F01428]/15 border border-[#F01428] flex items-center justify-center shadow-[0_0_25px_rgba(240,20,40,0.5)]">
            <Flame className="w-7 h-7 text-[#F01428] animate-pulse" />
          </div>

          {/* Floating arcane sparks */}
          <span className="absolute top-0 right-2 w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
          <span className="absolute bottom-2 left-1 w-2 h-2 rounded-full bg-amber-400/80 animate-ping [animation-delay:400ms]" />
        </div>

        {/* Destination-Specific Demon Title */}
        <h2 className="text-base sm:text-lg font-black text-white font-heading tracking-wide drop-shadow-[0_2px_12px_rgba(240,20,40,0.4)]">
          {info.title}
        </h2>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-[#9E9EB2] font-medium mt-1.5 leading-relaxed max-w-sm">
          {info.subtitle}
        </p>

        {/* Glowing Demonic Loading Bar */}
        <div className="w-52 sm:w-64 h-1.5 bg-[#1C1C26] rounded-full overflow-hidden border border-white/10 mt-5 relative shadow-inner">
          <div className="h-full bg-gradient-to-r from-[#8B0000] via-[#F01428] to-[#FF4500] rounded-full w-full relative overflow-hidden shadow-[0_0_12px_#F01428]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-bar" />
          </div>
        </div>

        {/* Status Gateway Pill */}
        <div className="mt-5 flex items-center gap-2 px-3 py-1 rounded-full bg-[#15151C] border border-white/10 text-[10px] sm:text-xs font-bold text-[#F01428] tracking-wider uppercase font-mono shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F01428] animate-ping" />
          <span>DEVILMOTION REALM GATEWAY • ULTRA HD NODE</span>
        </div>
      </div>
    </div>
  );
};
