import React, { useEffect, useRef, useState } from 'react';
import { Play, Loader2, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface VidWavePlayerProps {
  embedUrl: string | null;
  title: string;
  posterUrl?: string;
  isPlaying: boolean;
  onPlay: () => void;
  onTimeUpdate?: (currentTime: number, duration: number, percent: number) => void;
  onComplete?: () => void;
  onAutoNext?: () => void;
  onError?: (message: string) => void;
  onSkipIntro?: () => void;
  isLoading?: boolean;
  streamError?: string | null;
  onRetry?: () => void;
  audio?: 'sub' | 'dub' | 'hindi';
  providerName?: string;
}

export const VidWavePlayer: React.FC<VidWavePlayerProps> = ({
  embedUrl,
  title,
  posterUrl,
  isPlaying,
  onPlay,
  onTimeUpdate,
  onComplete,
  onAutoNext,
  onError,
  onSkipIntro,
  isLoading = false,
  streamError = null,
  onRetry,
  audio = 'sub',
  providerName = 'DevilMotion Player',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [skipNotification, setSkipNotification] = useState<string | null>(null);

  // Reset iframeLoaded state whenever embedUrl changes (e.g. language/server switch)
  useEffect(() => {
    setIframeLoaded(false);
  }, [embedUrl]);

  // VidWave postMessage communication listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin: accept vidwave.sbs and vidwave.site
      if (!event.origin.includes('vidwave.sbs') && !event.origin.includes('vidwave.site')) {
        return;
      }

      const data = event.data;
      if (!data) return;

      // 1. Time update & watching log
      if (data.event === 'time') {
        const currentTime = typeof data.time === 'number' ? data.time : 0;
        const duration = typeof data.duration === 'number' ? data.duration : 0;
        const percent = typeof data.percent === 'number' ? data.percent : (duration > 0 ? (currentTime / duration) * 100 : 0);
        onTimeUpdate?.(currentTime, duration, percent);
      } else if (data.type === 'watching-log') {
        const currentTime = typeof data.currentTime === 'number' ? data.currentTime : 0;
        const duration = typeof data.duration === 'number' ? data.duration : 0;
        const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
        onTimeUpdate?.(currentTime, duration, percent);
      }

      // 2. Playback completion / Auto next
      if (data.event === 'complete') {
        onComplete?.();
      } else if (data.event === 'autonext') {
        onAutoNext?.();
      }

      // 3. Skip intro
      if (data.event === 'skip') {
        setSkipNotification('Intro automatically skipped');
        onSkipIntro?.();
        setTimeout(() => setSkipNotification(null), 3500);
      }

      // 4. Stream error
      if (data.event === 'error') {
        onError?.(data.message || 'Stream encounter error');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onTimeUpdate, onComplete, onAutoNext, onError, onSkipIntro]);

  const audioLabels: Record<'sub' | 'dub' | 'hindi', { label: string; badge: string; color: string }> = {
    sub: { label: 'Japanese Audio', badge: 'SUB', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    dub: { label: 'English Audio', badge: 'ENG DUB', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    hindi: { label: 'Hindi Audio', badge: 'HINDI DUB', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  };

  const currentAudioInfo = audioLabels[audio] || audioLabels.sub;

  return (
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl shadow-black group">
      {isPlaying && embedUrl ? (
        <>
          {/* Active VidWave Stream Iframe */}
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            className="w-full h-full border-0 transition-opacity duration-300"
            style={{ opacity: iframeLoaded ? 1 : 0.6 }}
            allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setIframeLoaded(true)}
          />

          {/* Buffering/Loading Indicator during stream initialization or switch */}
          {(!iframeLoaded || isLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none transition-opacity">
              <Loader2 className="w-8 h-8 text-[#F01428] animate-spin mb-2" />
              <span className="text-xs text-white/80 font-medium">Connecting to {providerName}...</span>
            </div>
          )}

          {/* Intro Skip Toast Notification */}
          {skipNotification && (
            <div className="absolute bottom-6 left-6 z-30 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-[#F01428]/40 text-xs font-semibold text-white shadow-xl animate-fade-in flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F01428] animate-ping" />
              {skipNotification}
            </div>
          )}
        </>
      ) : (
        /* Poster Viewport with Play Trigger */
        <>
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover filter brightness-[0.35]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#121218] to-[#08080A]" />
          )}

          {/* Watermark Logo top-left */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none opacity-85">
            <img src="/logo_cropped.png" alt="DevilMotion" className="h-5 sm:h-6 w-auto" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-[#F01428] border border-[#F01428]/30">
              1080p Ultra HD
            </span>
          </div>

          {/* Provider & Audio Status Badge top-right */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border backdrop-blur-md ${currentAudioInfo.color}`}>
              <Volume2 className="w-3.5 h-3.5" />
              <span>{currentAudioInfo.badge}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[11px] text-white border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[#9E9EB2]">Node:</span>
              <span className="font-semibold text-white">DevilMotion Verified</span>
            </div>
          </div>

          {/* Center Play Button or Loading/Error State */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-4 text-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-[#F01428] animate-spin" />
                <span className="text-xs text-[#9E9EB2]">Connecting to DevilMotion Player...</span>
              </div>
            ) : streamError ? (
              <div className="max-w-md bg-black/85 backdrop-blur-md p-5 rounded-xl border border-red-800/40 space-y-3 shadow-2xl">
                <AlertCircle className="w-8 h-8 text-[#F01428] mx-auto" />
                <p className="text-xs text-[#9E9EB2]">{streamError}</p>
                {onRetry && (
                  <Button variant="primary" size="sm" onClick={onRetry} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                    Retry Stream
                  </Button>
                )}
              </div>
            ) : (
              <button
                onClick={onPlay}
                aria-label="Start Streaming"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 shadow-2xl bg-[#F01428] hover:bg-[#ff2035] text-white glow-red-lg scale-100 cursor-pointer hover:scale-105"
              >
                <Play className="w-8 h-8 fill-white translate-x-1" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
