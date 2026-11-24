import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  SkipBack,
  SkipForward,
  Server,
  List,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Search,
  ArrowLeft,
  Volume2,
  Globe2,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { useWatchlist } from '../context/WatchlistContext';
import { Badge } from '../components/ui/Badge';
import { AnimeCard } from '../components/cards/AnimeCard';
import { EmptyState } from '../components/ui/EmptyState';
import { VidWavePlayer } from '../components/player/VidWavePlayer';

// Helper to ensure 100% white-label DevilMotion server presentation
const formatServerLabel = (server: { id: string; name: string; whiteLabelName?: string }, index?: number): string => {
  if (server.whiteLabelName) return server.whiteLabelName;
  const { id } = server;
  if (id === 'aniembed-ultra') return 'Stream 1 (Ultra)';
  if (id === 'animeembed-direct') return 'Stream 2 (Rapid)';
  if (id === 'alt-embed') return 'Stream 3 (Mirror)';
  if (id === 'kai-mal') return 'Stream 4 (Direct Mirror)';
  if (id === 'hindi-main') return 'Stream 1 (Hindi Direct)';
  if (id === 'hindi-backup') return 'Stream 2 (Hindi Mirror)';
  if (id === 'megaplay-prime') return 'Stream 5 (Backup)';

  return typeof index === 'number' ? `Stream ${index + 1}` : (server.name || 'Stream');
};

export const WatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isInWatchlist, toggleWatchlist, addToHistory } = useWatchlist();

  const [anime, setAnime] = useState<any>(null);
  const [isAnimeLoading, setIsAnimeLoading] = useState(true);
  const currentEpNum = parseInt(searchParams.get('ep') || '1', 10);

  // VidWave Stream state
  const [streamData, setStreamData] = useState<any>(null);
  const [isStreamLoading, setIsStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamingState, setStreamingState] = useState<'IDLE' | 'CHECKING' | 'LANGUAGE_UNAVAILABLE' | 'SOURCE_FOUND' | 'INITIALIZING' | 'READY' | 'BUFFERING' | 'PLAYING' | 'SWITCHING_SOURCE' | 'FAILED' | 'RETRYING'>('IDLE');

  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string>('aniembed-ultra');
  const [audioTrack, setAudioTrack] = useState<'sub' | 'dub' | 'hindi'>('sub');
  const [availableAudios, setAvailableAudios] = useState<('sub' | 'dub' | 'hindi')[]>(['sub', 'dub']);
  const [languageStatus, setLanguageStatus] = useState<{
    sub: 'available' | 'checking' | 'unavailable';
    dub: 'available' | 'checking' | 'unavailable';
    hindi: 'available' | 'checking' | 'unavailable';
  }>({
    sub: 'available',
    dub: 'checking',
    hindi: 'checking',
  });
  const [cinemaMode, setCinemaMode] = useState(false);
  const [epSearch, setEpSearch] = useState('');
  const lastSavedTimeRef = useRef<number>(0);
  const lastProgressSecondsRef = useRef<number>(0);

  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`devilmotion_watched_${id}`);
      return saved ? JSON.parse(saved) : [1];
    } catch {
      return [1];
    }
  });

  // Fetch anime metadata
  useEffect(() => {
    if (!id) return;
    setIsAnimeLoading(true);
    api
      .getAnimeDetails(id)
      .then(res => {
        if (res) {
          setAnime(res);
          const audios: ('sub' | 'dub' | 'hindi')[] = ['sub', 'dub'];
          if (res.isHindiDubbed) audios.push('hindi');
          setAvailableAudios(audios);
        }
      })
      .catch((err) => {
        console.error('Failed to load anime for watch page:', err);
      })
      .finally(() => {
        setIsAnimeLoading(false);
      });
  }, [id]);

  // Check live stream audio availability whenever anime or episode changes
  useEffect(() => {
    if (!anime) return;
    const animeIdentifier = anime.anilistId || anime.id;
    setLanguageStatus(prev => ({ ...prev, dub: 'checking', hindi: 'checking' }));

    api
      .getStreamAvailability(animeIdentifier, currentEpNum)
      .then(res => {
        if (res?.availableAudios) {
          setAvailableAudios(res.availableAudios);
        }
        if (res?.languageStatus) {
          setLanguageStatus(res.languageStatus);
        }
        // If current audio is not available on this episode (and user didn't explicitly pick hindi), auto-switch
        if (audioTrack !== 'hindi' && res?.availableAudios && !res.availableAudios.includes(audioTrack)) {
          const fallback = res.availableAudios.includes('sub') ? 'sub' : res.availableAudios[0];
          if (fallback && fallback !== audioTrack) {
            setAudioTrack(fallback);
          }
        }
      })
      .catch(() => {
        setLanguageStatus({
          sub: 'available',
          dub: 'available',
          hindi: 'unavailable',
        });
      });
  }, [anime?.id, anime?.anilistId, currentEpNum]);

  // Track watch history
  useEffect(() => {
    if (anime?.id) {
      addToHistory(anime.id, anime);
      api
        .saveUserHistory({
          animeId: anime.id,
          episodeNumber: currentEpNum,
          progressSeconds: 0,
          durationSeconds: 1440,
          completed: false,
        })
        .catch(() => {});
    }
  }, [anime, currentEpNum, addToHistory]);

  // Mark episode as watched in local storage
  useEffect(() => {
    setWatchedEpisodes(prev => {
      if (prev.includes(currentEpNum)) return prev;
      const updated = [...prev, currentEpNum];
      try {
        localStorage.setItem(`devilmotion_watched_${id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [currentEpNum, id]);

  // Resolve Real-Time Stream Embed across all configured providers
  const fetchStreamData = useCallback((targetAudio?: 'sub' | 'dub' | 'hindi', targetServer?: string, seekTime?: number) => {
    if (!anime) return;
    setIsStreamLoading(true);
    setStreamError(null);
    setStreamingState('CHECKING');

    const activeAudio = targetAudio || audioTrack;
    const activeServer = targetServer !== undefined ? targetServer : selectedServer;
    const animeIdentifier = anime.anilistId || anime.id;
    const timeToSeek = seekTime !== undefined ? seekTime : lastProgressSecondsRef.current;

    api
      .getStream(animeIdentifier, currentEpNum, activeAudio, activeServer, timeToSeek)
      .then(data => {
        setStreamData(data);
        setStreamingState('SOURCE_FOUND');
        if (data?.stream?.availableAudios) {
          setAvailableAudios(data.stream.availableAudios);
        }
        if (data?.stream?.currentServer && targetServer === undefined) {
          setSelectedServer(data.stream.currentServer);
        }
        if (!data?.stream?.available && !data?.stream?.embedUrl) {
          setStreamingState('FAILED');
          setStreamError('Playback is temporarily unavailable. Please retry or switch servers.');
        } else {
          setStreamingState('READY');
        }
      })
      .catch(() => {
        setStreamingState('FAILED');
        setStreamError('Failed to establish connection with DevilMotion streaming node.');
      })
      .finally(() => {
        setIsStreamLoading(false);
      });
  }, [anime, currentEpNum, audioTrack, selectedServer]);

  useEffect(() => {
    fetchStreamData();
  }, [fetchStreamData]);

  // Handle switching audio track cleanly
  const handleAudioSwitch = (newAudio: 'sub' | 'dub' | 'hindi') => {
    if (newAudio === audioTrack) return;
    setAudioTrack(newAudio);

    // Pick appropriate default server for new audio
    const defaultServer = newAudio === 'hindi' ? 'hindi-main' : 'aniembed-ultra';
    setSelectedServer(defaultServer);
    fetchStreamData(newAudio, defaultServer, lastProgressSecondsRef.current);
  };

  // Handle switching streaming server
  const handleServerSwitch = (newServerId: string) => {
    if (newServerId === selectedServer) return;
    setSelectedServer(newServerId);
    fetchStreamData(audioTrack, newServerId, lastProgressSecondsRef.current);
  };

  // Handle player error with automatic failover to the next available server
  const handlePlayerError = (msg?: string) => {
    if (selectedServer) {
      api.reportStreamFailure(selectedServer).catch(() => {});
    }

    const serversList = streamData?.servers || [];
    const currentIndex = serversList.findIndex((s: any) => s.id === selectedServer);
    if (currentIndex !== -1 && currentIndex < serversList.length - 1) {
      const nextServer = serversList[currentIndex + 1];
      console.log(`[Playback Auto-Switch] Switching from ${selectedServer} to ${nextServer.id}`);
      setStreamingState('SWITCHING_SOURCE');
      setSelectedServer(nextServer.id);
      fetchStreamData(audioTrack, nextServer.id, lastProgressSecondsRef.current);
    } else {
      setStreamingState('FAILED');
      setStreamError(msg || 'Playback is temporarily unavailable. Please try switching servers or audio.');
    }
  };

  if (isAnimeLoading) {
    return (
      <div className="pt-40 pb-32 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-4 border-[#F01428] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-[#9E9EB2]">Connecting to DevilMotion Streaming Node...</p>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="pt-32 pb-20">
        <EmptyState
          icon="alert"
          title="Anime Not Found"
          description="Could not locate stream source for this requested title."
          actionText="Back to Catalog"
          actionLink="/anime"
        />
      </div>
    );
  }

  const rawEpisodes = (anime.episodesList && anime.episodesList.length > 0)
    ? [...anime.episodesList]
    : [];

  const targetCount = anime.episodes || anime.totalEpisodes || rawEpisodes.length || 12;

  if (rawEpisodes.length < targetCount) {
    const existing = new Set(rawEpisodes.map((e: any) => e.number));
    for (let i = 1; i <= targetCount; i++) {
      if (!existing.has(i)) {
        rawEpisodes.push({
          id: `ep-${i}`,
          number: i,
          title: `Episode ${i}`,
          thumbnail: anime.bannerImage || anime.coverImage?.large,
          duration: '24m',
          subAvailable: true,
          dubAvailable: true,
        });
      }
    }
    rawEpisodes.sort((a: any, b: any) => a.number - b.number);
  }

  const episodes = rawEpisodes.length > 0 ? rawEpisodes : Array.from({ length: targetCount }).map((_, i) => ({
    id: `ep-${i + 1}`,
    number: i + 1,
    title: `Episode ${i + 1}`,
    thumbnail: anime.bannerImage || anime.coverImage?.large,
    duration: '24m',
    subAvailable: true,
    dubAvailable: true,
  }));

  const EP_PAGE_SIZE = episodes.length > 200 ? 100 : episodes.length > 50 ? 50 : 25;
  const numEpRanges = Math.ceil(episodes.length / EP_PAGE_SIZE);
  const currentEpRangeIndex = Math.min(Math.max(0, Math.floor((currentEpNum - 1) / EP_PAGE_SIZE)), Math.max(0, numEpRanges - 1));
  const [selectedEpRange, setSelectedEpRange] = useState<number>(0);

  useEffect(() => {
    setSelectedEpRange(currentEpRangeIndex);
  }, [currentEpNum, numEpRanges]);

  const epRanges = Array.from({ length: numEpRanges }, (_, i) => ({
    start: i * EP_PAGE_SIZE + 1,
    end: Math.min((i + 1) * EP_PAGE_SIZE, episodes.length),
  }));

  const searchedEpisodes = epSearch.trim()
    ? episodes.filter(
        (ep: any) =>
          ep.title?.toLowerCase().includes(epSearch.toLowerCase()) ||
          ep.number.toString().includes(epSearch.trim())
      )
    : null;

  const displayedPlaylistEpisodes = searchedEpisodes
    ? searchedEpisodes
    : numEpRanges > 1
    ? episodes.slice(selectedEpRange * EP_PAGE_SIZE, (selectedEpRange + 1) * EP_PAGE_SIZE)
    : episodes;

  const relations = anime?.relations || [];

  const currentEpisode = episodes.find((e: any) => e.number === currentEpNum) || episodes[0];
  const hasPrev = currentEpNum > 1;
  const hasNext = currentEpNum < episodes.length;

  const handlePrevEp = () => {
    if (hasPrev) {
      setSearchParams({ ep: (currentEpNum - 1).toString() });
      setIsPlaying(true);
    }
  };

  const handleNextEp = () => {
    if (hasNext) {
      setSearchParams({ ep: (currentEpNum + 1).toString() });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    lastProgressSecondsRef.current = currentTime;
    // Debounce saving progress to user history every 15 seconds
    if (Math.abs(currentTime - lastSavedTimeRef.current) > 15 && anime?.id) {
      lastSavedTimeRef.current = currentTime;
      api
        .saveUserHistory({
          animeId: anime.id,
          episodeNumber: currentEpNum,
          progressSeconds: Math.floor(currentTime),
          durationSeconds: Math.floor(duration) || 1440,
          completed: duration > 0 ? currentTime / duration > 0.88 : false,
        })
        .catch(() => {});
    }
  };

  const filteredEpisodes = episodes.filter(
    (ep: any) =>
      ep.title.toLowerCase().includes(epSearch.toLowerCase()) ||
      ep.number.toString().includes(epSearch)
  );

  const inWatchlist = isInWatchlist(anime.id);
  const embedUrl = streamData?.stream?.embedUrl || null;

  return (
    <div
      className={`min-h-screen pt-20 sm:pt-24 pb-20 transition-colors duration-500 ${
        cinemaMode ? 'bg-[#040406]' : 'bg-[#08080A]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between text-xs text-[#9E9EB2] mb-4">
          <div className="flex items-center gap-2">
            <Link to="/anime" className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Catalog
            </Link>
            <span>/</span>
            <Link to={`/anime/${anime.id || anime.anilistId}`} className="hover:text-white truncate max-w-[200px] sm:max-w-md">
              {anime.title.english || anime.title.romaji}
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">Episode {currentEpisode?.number || 1}</span>
          </div>

          <button
            onClick={() => setCinemaMode(!cinemaMode)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors border cursor-pointer ${
              cinemaMode
                ? 'bg-[#F01428] text-white border-[#F01428]'
                : 'bg-white/5 text-[#9E9EB2] hover:text-white border-white/10'
            }`}
          >
            {cinemaMode ? 'Exit Cinema Mode' : 'Cinema Mode'}
          </button>
        </div>

        {/* Master Watch Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Stream Player Container */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dedicated Responsive DevilMotion Real-Time Player */}
            <VidWavePlayer
              embedUrl={embedUrl}
              title={`${anime.title.english || anime.title.romaji} - Episode ${currentEpNum}`}
              posterUrl={currentEpisode?.thumbnail || anime.bannerImage || anime.coverImage?.large}
              isPlaying={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onTimeUpdate={handleTimeUpdate}
              onComplete={handleNextEp}
              onAutoNext={handleNextEp}
              onError={handlePlayerError}
              isLoading={isStreamLoading}
              streamError={streamError}
              onRetry={() => fetchStreamData()}
              audio={audioTrack}
              providerName="DevilMotion Stream Node"
              streamingState={streamingState}
              onSwitchServer={() => handlePlayerError()}
            />

            {/* Explicit Notice when Hindi Dub is requested but unavailable for this episode */}
            {audioTrack === 'hindi' && (languageStatus.hindi === 'unavailable' || (streamData && streamData?.stream?.available === false)) && (
              <div className="bg-[#1C1C26] border border-amber-500/40 rounded-2xl p-4 sm:p-5 text-center space-y-3 backdrop-blur-md shadow-xl animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-white">Hindi Dub is currently unavailable for this episode.</h3>
                  <p className="text-xs text-[#9E9EB2] max-w-md mx-auto">
                    This episode has not been dubbed or released in Hindi yet. You can enjoy this episode in Japanese Sub or English Dub.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={() => handleAudioSwitch('sub')}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🇯🇵</span>
                    <span>Switch to Japanese Sub</span>
                  </button>
                  <button
                    onClick={() => handleAudioSwitch('dub')}
                    className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🇬🇧</span>
                    <span>Switch to English Dub</span>
                  </button>
                </div>
              </div>
            )}

            {/* Video Meta & Controls Strip */}
            <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="red" size="xs">
                      EP {currentEpisode?.number || currentEpNum}
                    </Badge>
                    {currentEpisode?.hasRealTitle === false && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.06] text-[#9E9EB2] border border-white/5">
                        Title TBA
                      </span>
                    )}
                    {currentEpisode?.filler && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/80 text-black">
                        Filler
                      </span>
                    )}
                    <span className="text-xs text-[#9E9EB2] font-semibold">{currentEpisode?.duration || '24m'}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white font-heading mt-1">
                    {currentEpisode?.title || `Episode ${currentEpNum}`}
                  </h2>
                  {currentEpisode?.japaneseTitle && (
                    <p className="text-xs text-[#707085] mt-0.5">
                      {currentEpisode.japaneseTitle}
                    </p>
                  )}
                  <Link
                    to={`/anime/${anime.id || anime.anilistId}`}
                    className="text-xs text-[#F01428] hover:underline font-semibold block mt-1"
                  >
                    {anime.title.english || anime.title.romaji}
                  </Link>
                </div>

                {/* Sub / Dub / Hindi Audio Selector & Nav buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex p-0.5 rounded-lg bg-[#1C1C26] border border-white/10 shadow-inner">
                    <button
                      onClick={() => handleAudioSwitch('sub')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        audioTrack === 'sub'
                          ? 'bg-[#F01428] text-white shadow-md shadow-[#F01428]/30 font-extrabold'
                          : 'text-[#9E9EB2] hover:text-white'
                      }`}
                      title="Japanese Audio (Verified for Episode)"
                    >
                      <span>🇯🇵</span>
                      <span>SUB</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </button>

                    <button
                      onClick={() => handleAudioSwitch('dub')}
                      disabled={languageStatus.dub === 'unavailable'}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                        audioTrack === 'dub'
                          ? 'bg-[#F01428] text-white shadow-md shadow-[#F01428]/30 font-extrabold'
                          : 'text-[#9E9EB2] hover:text-white'
                      }`}
                      title={languageStatus.dub === 'unavailable' ? 'English Dub not available for this episode' : 'English Dubbed Audio'}
                    >
                      <span>🇬🇧</span>
                      <span>DUB</span>
                      {languageStatus.dub === 'checking' ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      ) : languageStatus.dub === 'available' ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      ) : null}
                    </button>

                    {availableAudios.includes('hindi') && (
                      <button
                        onClick={() => handleAudioSwitch('hindi')}
                        disabled={languageStatus.hindi === 'unavailable'}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                          audioTrack === 'hindi'
                            ? 'bg-[#F01428] text-white shadow-md shadow-[#F01428]/30 font-extrabold'
                            : 'text-[#9E9EB2] hover:text-white'
                        }`}
                        title={languageStatus.hindi === 'unavailable' ? 'Hindi Dub not available for this episode' : 'Hindi Dubbed Audio'}
                      >
                        <span>🇮🇳</span>
                        <span>HINDI</span>
                        {languageStatus.hindi === 'checking' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        ) : languageStatus.hindi === 'available' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ) : null}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handlePrevEp}
                    disabled={!hasPrev}
                    className="p-2 rounded-lg bg-[#1C1C26] hover:bg-[#252533] text-white disabled:opacity-30 border border-white/10 cursor-pointer"
                    title="Previous Episode"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextEp}
                    disabled={!hasNext}
                    className="p-2 rounded-lg bg-[#1C1C26] hover:bg-[#252533] text-white disabled:opacity-30 border border-white/10 cursor-pointer"
                    title="Next Episode"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleWatchlist(anime.id)}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      inWatchlist
                        ? 'bg-[#F01428] text-white border-[#F01428]'
                        : 'bg-[#1C1C26] text-[#9E9EB2] hover:text-white border-white/10'
                    }`}
                    title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                  >
                    {inWatchlist ? <BookmarkCheck className="w-4 h-4 fill-white" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Streaming Server Switcher */}
              <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#9E9EB2] font-semibold flex items-center gap-1.5 mr-1">
                  <Server className="w-3.5 h-3.5 text-[#F01428]" /> Stream:
                </span>
                {(streamData?.servers?.length ? streamData.servers : (
                  audioTrack === 'hindi'
                    ? [
                        { id: 'hindi-main', name: 'Stream 1 (Hindi Direct)', whiteLabelName: 'Stream 1 (Hindi Direct)' },
                        { id: 'hindi-backup', name: 'Stream 2 (Hindi Mirror)', whiteLabelName: 'Stream 2 (Hindi Mirror)' },
                      ]
                    : [
                        { id: 'aniembed-ultra', name: 'Stream 1 (Ultra)', whiteLabelName: 'Stream 1 (Ultra)' },
                        { id: 'animeembed-direct', name: 'Stream 2 (Rapid)', whiteLabelName: 'Stream 2 (Rapid)' },
                        { id: 'alt-embed', name: 'Stream 3 (Mirror)', whiteLabelName: 'Stream 3 (Mirror)' },
                      ]
                )).map((srv: any, idx: number) => (
                  <button
                    key={srv.id}
                    onClick={() => handleServerSwitch(srv.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedServer === srv.id
                        ? 'bg-[#F01428]/20 text-[#FF4D61] border-[#F01428] font-bold shadow-sm shadow-[#F01428]/20'
                        : 'bg-[#1C1C26] text-[#9E9EB2] hover:text-white border-white/5'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedServer === srv.id ? 'bg-[#F01428] animate-pulse' : 'bg-[#646478]'}`} />
                    <span>{formatServerLabel(srv, idx)}</span>
                  </button>
                ))}

                {/* Audio Track Tag indicator */}
                <div className="ml-auto hidden md:flex items-center gap-1.5 text-xs text-[#9E9EB2]">
                  <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Audio: <strong className="text-white uppercase">{audioTrack}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Episode Selector & Playlist */}
          <div className="space-y-4">
            <div className="bg-[#121218] border border-white/[0.08] rounded-2xl p-4 shadow-xl flex flex-col h-[600px]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-[#F01428]" />
                  <h3 className="text-sm font-bold text-white font-heading">Episodes List</h3>
                </div>
                <span className="text-xs text-[#9E9EB2] bg-white/5 px-2 py-0.5 rounded">
                  {episodes.length} Episodes
                </span>
              </div>

              {/* Franchise / Season Quick Switcher */}
              {relations.length > 0 && (
                <div className="pt-2 pb-1 border-b border-white/[0.08]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-[#9E9EB2] uppercase tracking-wider flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#F01428]" /> Franchise & Seasons
                    </span>
                    <span className="text-[10px] text-[#F01428] font-bold">{relations.length} titles</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F01428] text-white shrink-0 shadow-sm shadow-[#F01428]/30">
                      Current
                    </span>
                    {relations.map((rel: any) => (
                      <Link
                        key={rel.id}
                        to={`/watch/${rel.id}?ep=1`}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1C1C26] text-[#9E9EB2] hover:text-white hover:bg-white/10 shrink-0 border border-white/5 transition-all truncate max-w-[120px]"
                        title={rel.title}
                      >
                        {rel.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Episode Search Bar */}
              <div className="relative my-3">
                <Search className="w-3.5 h-3.5 text-[#646478] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={epSearch}
                  onChange={e => setEpSearch(e.target.value)}
                  placeholder="Find episode number or title..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#1C1C26] rounded-lg text-xs text-white placeholder-[#646478] border border-white/10 focus:outline-none focus:border-[#F01428]"
                />
              </div>

              {/* Range Selector if > 25 episodes */}
              {epRanges.length > 1 && !epSearch.trim() && (
                <div className="flex flex-wrap gap-1 pb-2">
                  {epRanges.map((range, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedEpRange(idx)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                        selectedEpRange === idx
                          ? 'bg-[#F01428] text-white border-[#F01428] font-bold shadow-sm shadow-[#F01428]/30'
                          : 'bg-[#15151C] text-[#9E9EB2] border-white/10 hover:text-white'
                      }`}
                    >
                      EP {range.start} - {range.end}
                    </button>
                  ))}
                </div>
              )}

              {/* Scrollable Episodes List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {displayedPlaylistEpisodes.map((ep: any) => {
                  const isActive = ep.number === currentEpNum;
                  const isWatched = watchedEpisodes.includes(ep.number);

                  return (
                    <div
                      key={ep.id || ep.number}
                      onClick={() => {
                        setSearchParams({ ep: ep.number.toString() });
                        setIsPlaying(true);
                      }}
                      className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer group border ${
                        isActive
                          ? 'bg-[#1C1C26] border-[#F01428] shadow-md shadow-[#F01428]/20'
                          : 'bg-[#16161E]/60 hover:bg-[#1C1C26] border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-20 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                        <img
                          src={ep.thumbnail || anime.bannerImage || anime.coverImage?.large}
                          alt={ep.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-[#F01428]/40 flex items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isActive ? 'text-[#F01428]' : 'text-white'
                            }`}
                          >
                            EP {ep.number}
                          </span>
                          {ep.filler && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/80 text-black">
                              Filler
                            </span>
                          )}
                          {isWatched && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-[#9E9EB2] group-hover:text-white truncate flex-1">
                            {ep.title}
                          </p>
                          {ep.hasRealTitle === false && (
                            <span className="shrink-0 px-1 py-0.2 rounded text-[8px] font-medium bg-white/5 text-[#9E9EB2]">
                              TBA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#646478] mt-0.5">
                          <span>{ep.duration || '24m'}</span>
                          {ep.airDate && ep.airDate !== 'TBA' && (
                            <span className="text-[9px] text-[#707085]">{ep.airDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Seasons & Franchise Relations */}
        {relations.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#F01428]" />
                <h3 className="text-lg font-bold text-white font-heading">
                  Connected Seasons & Franchise
                </h3>
              </div>
              <span className="text-xs text-[#9E9EB2] font-semibold">{relations.length} Titles Available</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relations.map((rel: any) => {
                const badgeLabel = rel.relationType === 'SEQUEL'
                  ? 'Sequel'
                  : rel.relationType === 'PREQUEL'
                  ? 'Prequel'
                  : rel.relationType === 'SIDE_STORY'
                  ? 'Side Story'
                  : rel.relationType === 'SPIN_OFF'
                  ? 'Spin-Off'
                  : rel.relationType === 'ALTERNATIVE'
                  ? 'Alt Story'
                  : rel.relationType?.replace(/_/g, ' ') || 'Related';

                return (
                  <div
                    key={rel.id}
                    className="flex flex-col bg-[#121218] border border-white/[0.08] hover:border-[#F01428]/40 rounded-xl overflow-hidden group transition-all"
                  >
                    <Link to={`/watch/${rel.id}?ep=1`} className="relative aspect-[3/4] overflow-hidden bg-black/60">
                      <img
                        src={rel.coverImage || '/logo_cropped.png'}
                        alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#F01428] text-white uppercase tracking-wider shadow">
                          {badgeLabel}
                        </span>
                      </div>
                      {rel.episodes && (
                        <div className="absolute bottom-2 right-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-white">
                            {rel.episodes} EPS
                          </span>
                        </div>
                      )}
                    </Link>
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <Link
                        to={`/watch/${rel.id}?ep=1`}
                        className="text-xs font-bold text-white font-heading line-clamp-2 hover:text-[#F01428] transition-colors"
                        title={rel.title}
                      >
                        {rel.title}
                      </Link>
                      <div className="flex items-center justify-between text-[10px] text-[#9E9EB2] mt-2">
                        <span>{rel.format || 'TV'}</span>
                        {rel.year && <span>{rel.year}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations Below Player */}
        {anime?.recommendations && anime.recommendations.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-5 bg-[#F01428] rounded-full" />
              <h3 className="text-lg font-bold text-white font-heading">
                You May Also Like
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {anime.recommendations.slice(0, 6).map((item: any) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
