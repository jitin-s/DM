import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Loader2, AlertCircle, RefreshCw, Volume2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { DemonEpisodeLoadingOverlay } from './DemonEpisodeLoadingOverlay';

export type StreamingState =
  | 'IDLE'
  | 'CHECKING'
  | 'LANGUAGE_UNAVAILABLE'
  | 'SOURCE_FOUND'
  | 'INITIALIZING'
  | 'READY'
  | 'BUFFERING'
  | 'PLAYING'
  | 'SWITCHING_SOURCE'
  | 'FAILED'
  | 'RETRYING';

interface VidWavePlayerProps {
  embedUrl: string | null;
  title: string;
  episodeNumber?: number;
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
  streamingState?: StreamingState;
  onSwitchServer?: () => void;
}

export const VidWavePlayer: React.FC<VidWavePlayerProps> = ({
  embedUrl,
  title,
  episodeNumber = 1,
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
  providerName = 'DevilMotion Stream',
  streamingState = 'IDLE',
  onSwitchServer,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [skipNotification, setSkipNotification] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset iframe state when embedUrl changes
  useEffect(() => {
    setIframeLoaded(false);
  }, [embedUrl]);

  // Watchdog timer: if stream takes >8 seconds to load or initialize, prompt failover
  useEffect(() => {
    if (isPlaying && embedUrl && !iframeLoaded) {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = setTimeout(() => {
        if (!iframeLoaded) {
          setStatusNotification('Finding another working stream...');
          onError?.('Stream initialization timeout. Switching to another available stream...');
        }
      }, 8000);
    }

    return () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [isPlaying, embedUrl, iframeLoaded, onError]);

  // Comprehensive multi-provider postMessage event listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      // Validate origin against authorized providers: AniEmbed, AnimeEmbed, VidWave, MegaPlay
      const isAniEmbed = origin.includes('aniembed.se');
      const isAnimeEmbed = origin.includes('animeembed.com');
      const isVidWave = origin.includes('vidwave.sbs') || origin.includes('vidwave.site');
      const isMegaPlay = origin.includes('megaplay.buzz');

      if (!isAniEmbed && !isAnimeEmbed && !isVidWave && !isMegaPlay) {
        return;
      }

      const data = event.data;
      if (!data) return;

      // Clear watchdog timer once player events arrive
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      // --- 1. AniEmbed Events (https://aniembed.se/) ---
      if (isAniEmbed) {
        const eventName = data.name || data.event || data.type;
        if (eventName === 'ready') {
          setIframeLoaded(true);
          setStatusNotification('Your stream is ready.');
          setTimeout(() => setStatusNotification(null), 3000);
        } else if (eventName === 'progress' || eventName === 'time') {
          const payload = data.data || data;
          const currentTime = typeof payload.time === 'number' ? payload.time : (typeof payload.currentTime === 'number' ? payload.currentTime : 0);
          const duration = typeof payload.duration === 'number' ? payload.duration : 0;
          const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
          onTimeUpdate?.(currentTime, duration, percent);
        } else if (eventName === 'ended') {
          onComplete?.();
        } else if (eventName === 'error') {
          setStatusNotification('Finding another working stream...');
          onError?.(data.message || 'Stream playback error');
        }
      }

      // --- 2. AnimeEmbed Events (https://animeembed.com/#documentation) ---
      if (isAnimeEmbed) {
        const eventType = data.event || data.type;
        if (eventType === 'ready') {
          setIframeLoaded(true);
          setStatusNotification('Your stream is ready.');
          setTimeout(() => setStatusNotification(null), 3000);
        } else if (eventType === 'progress' || eventType === 'time') {
          const currentTime = typeof data.currentTime === 'number' ? data.currentTime : (typeof data.time === 'number' ? data.time : 0);
          const duration = typeof data.duration === 'number' ? data.duration : 0;
          const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
          onTimeUpdate?.(currentTime, duration, percent);
        } else if (eventType === 'ended') {
          onComplete?.();
        } else if (eventType === 'error') {
          setStatusNotification('Finding another working stream...');
          onError?.(data.message || 'AnimeEmbed stream error');
        }
      }

      // --- 3. VidWave Events ---
      if (isVidWave) {
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
        } else if (data.event === 'complete') {
          onComplete?.();
        } else if (data.event === 'autonext') {
          onAutoNext?.();
        } else if (data.event === 'skip') {
          setSkipNotification('Intro automatically skipped');
          onSkipIntro?.();
          setTimeout(() => setSkipNotification(null), 3500);
        } else if (data.event === 'error') {
          setStatusNotification('Finding another working stream...');
          onError?.(data.message || 'Stream playback error');
        }
      }

      // --- 4. MegaPlay Events ---
      if (isMegaPlay) {
        if (data.event === 'time') {
          const currentTime = typeof data.time === 'number' ? data.time : 0;
          const duration = typeof data.duration === 'number' ? data.duration : 0;
          const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
          onTimeUpdate?.(currentTime, duration, percent);
        } else if (data.event === 'ended') {
          onComplete?.();
        }
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
          {/* Active Stream Iframe (Zero Third-Party Branding on Wrapper) */}
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            className="w-full h-full border-0 transition-opacity duration-300"
            style={{ opacity: iframeLoaded ? 1 : 0.6 }}
            allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => {
              setIframeLoaded(true);
              setStatusNotification('Your stream is ready.');
              setTimeout(() => setStatusNotification(null), 3000);
            }}
          />

          {/* Demon Episode Loading & Initialization Overlay */}
          <DemonEpisodeLoadingOverlay
            isOpen={!iframeLoaded || isLoading || Boolean(streamError)}
            animeTitle={title}
            episodeNumber={episodeNumber}
            state={streamError ? 'failed' : (isLoading ? 'connecting' : (streamingState.toLowerCase() || 'initializing_player'))}
            error={streamError}
            onRetry={onRetry}
            onSwitchSource={onSwitchServer}
          />

          {/* Real-time Status / Auto-skip Toast */}
          {(statusNotification || skipNotification) && (
            <div className="absolute bottom-6 left-6 z-30 px-3.5 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-[#F01428]/40 text-xs font-semibold text-white shadow-xl animate-fade-in flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F01428] animate-ping" />
              <span>{statusNotification || skipNotification}</span>
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
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none opacity-90">
            <img src="/logo_cropped.png" alt="DevilMotion" className="h-5 sm:h-6 w-auto" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-[#F01428] border border-[#F01428]/30">
              1080p Ultra HD
            </span>
          </div>

          {/* Audio Status Badge top-right */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border backdrop-blur-md shadow-md ${currentAudioInfo.color}`}>
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-current rounded-full animate-soundwave-1" />
                <span className="w-0.5 bg-current rounded-full animate-soundwave-2" />
                <span className="w-0.5 bg-current rounded-full animate-soundwave-3" />
              </span>
              <span>{currentAudioInfo.badge}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[11px] text-white border border-white/10 shadow-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[#9E9EB2]">Node:</span>
              <span className="font-semibold text-white">DevilMotion Verified</span>
            </div>
          </div>

          {/* Center Play Button or Loading / Error State */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-4 text-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-[#F01428] animate-spin" />
                <span className="text-xs text-[#9E9EB2]">Finding the best available stream...</span>
              </div>
            ) : streamError ? (
              <div className="max-w-md bg-black/85 backdrop-blur-md p-5 rounded-xl border border-red-800/40 space-y-3 shadow-2xl">
                <AlertCircle className="w-8 h-8 text-[#F01428] mx-auto" />
                <p className="text-xs text-[#9E9EB2]">{streamError}</p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {onRetry && (
                    <Button variant="primary" size="sm" onClick={onRetry} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                      Retry Stream
                    </Button>
                  )}
                  {onSwitchServer && (
                    <Button variant="outline" size="sm" onClick={onSwitchServer}>
                      Try Another Server
                    </Button>
                  )}
                </div>
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
