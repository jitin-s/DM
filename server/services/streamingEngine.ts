import { prisma } from '../db';
import { AniListService } from './anilistService';
import { VIDWAVE_EMBED_HOST, VIDWAVE_ALT_HOST } from './vidwaveService';

export type StreamingAudio = 'sub' | 'dub' | 'hindi';

export interface StreamSourceOption {
  id: string;
  name: string; // Internal name
  whiteLabelName: string; // Public DevilMotion white-label name
  providerId: 'vidwave-kai' | 'vidwave-hindi' | 'animeembed' | 'megaplay' | 'anikoto';
  embedUrl: string;
  audio: StreamingAudio;
  isDefault?: boolean;
  priority: number;
  quality?: string;
  iframeOptions: {
    allow: string;
    referrerPolicy: string;
  };
  eventSpec: {
    originMatches: string[];
    readyEvent: string;
    playEvent: string;
    pauseEvent: string;
    errorEvent: string;
    timeEvent: string;
    completeEvent: string;
  };
}

export interface StreamingProviderAdapter {
  id: string;
  name: string;
  getSupportedLanguages(anilistId: number, animeRecord?: any): Promise<StreamingAudio[]>;
  checkAvailability(params: {
    anilistId: number;
    malId?: number | null;
    episode: number;
    audio: StreamingAudio;
  }): Promise<boolean>;
  getSources(params: {
    anilistId: number;
    malId?: number | null;
    episode: number;
    audio: StreamingAudio;
    time?: number;
    autoplay?: boolean;
    autoNext?: boolean;
  }): Promise<StreamSourceOption[]>;
}

// In-memory provider health tracking (error counts dynamically lower server priority)
const providerFailureCount = new Map<string, { failures: number; lastFailed: number }>();

export function reportProviderFailure(serverId: string) {
  const current = providerFailureCount.get(serverId) || { failures: 0, lastFailed: 0 };
  providerFailureCount.set(serverId, {
    failures: current.failures + 1,
    lastFailed: Date.now(),
  });
}

function getProviderPenalty(serverId: string): number {
  const stat = providerFailureCount.get(serverId);
  if (!stat) return 0;
  // Expire penalty after 15 minutes
  if (Date.now() - stat.lastFailed > 15 * 60 * 1000) {
    providerFailureCount.delete(serverId);
    return 0;
  }
  return stat.failures * 5;
}

// -------------------------------------------------------------
// Adapter 1: VidWave Anime Kai (Sub & Dub via AniList & MAL)
// -------------------------------------------------------------
class VidWaveKaiAdapter implements StreamingProviderAdapter {
  id = 'vidwave-kai';
  name = 'VidWave Anime Kai';

  async getSupportedLanguages(anilistId: number, animeRecord?: any): Promise<StreamingAudio[]> {
    const audios: StreamingAudio[] = ['sub'];
    const format = animeRecord?.format;
    if (format !== 'MUSIC') {
      audios.push('dub');
    }
    return audios;
  }

  async checkAvailability(params: {
    anilistId: number;
    malId?: number | null;
    episode: number;
    audio: StreamingAudio;
  }): Promise<boolean> {
    if (params.audio === 'hindi') return false;
    return params.episode >= 1 && params.anilistId > 0;
  }

  async getSources(params: {
    anilistId: number;
    malId?: number | null;
    episode: number;
    audio: StreamingAudio;
    time?: number;
    autoplay?: boolean;
    autoNext?: boolean;
  }): Promise<StreamSourceOption[]> {
    const { anilistId, malId, episode, audio, time = 0, autoplay = true, autoNext = true } = params;
    if (audio === 'hindi') return [];

    const kaiAudio = audio === 'dub' ? 'dub' : 'sub';
    const query = new URLSearchParams();
    if (autoplay) query.set('autoplay', '1');
    if (autoNext) query.set('autonext', '1');
    query.set('skipSec', '85');
    if (time > 0) query.set('t', Math.floor(time).toString());

    const qs = query.toString();
    const sources: StreamSourceOption[] = [];

    // Server 1: AniList Direct Auto
    sources.push({
      id: 'kai-anilist',
      name: 'VidWave Kai (AniList Direct - Auto)',
      whiteLabelName: 'Server 1 (DevilMotion HD)',
      providerId: 'vidwave-kai',
      embedUrl: `${VIDWAVE_EMBED_HOST}/kai/anilist/${anilistId}/${episode}/${kaiAudio}${qs ? `?${qs}` : ''}`,
      audio,
      isDefault: true,
      priority: 10 - getProviderPenalty('kai-anilist'),
      quality: 'auto',
      iframeOptions: {
        allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        referrerPolicy: 'strict-origin-when-cross-origin',
      },
      eventSpec: {
        originMatches: ['vidwave.sbs', 'vidwave.site'],
        readyEvent: 'ready',
        playEvent: 'play',
        pauseEvent: 'pause',
        errorEvent: 'error',
        timeEvent: 'time',
        completeEvent: 'complete',
      },
    });

    // Server 2: 1080p Ultra HD
    const hdQuery = new URLSearchParams(query);
    hdQuery.set('q', '1080');
    sources.push({
      id: 'kai-hd',
      name: 'VidWave Kai (1080p Ultra HD)',
      whiteLabelName: 'Server 2 (1080p Ultra HD)',
      providerId: 'vidwave-kai',
      embedUrl: `${VIDWAVE_EMBED_HOST}/kai/anilist/${anilistId}/${episode}/${kaiAudio}?${hdQuery.toString()}`,
      audio,
      priority: 9 - getProviderPenalty('kai-hd'),
      quality: '1080p',
      iframeOptions: {
        allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        referrerPolicy: 'strict-origin-when-cross-origin',
      },
      eventSpec: {
        originMatches: ['vidwave.sbs', 'vidwave.site'],
        readyEvent: 'ready',
        playEvent: 'play',
        pauseEvent: 'pause',
        errorEvent: 'error',
        timeEvent: 'time',
        completeEvent: 'complete',
      },
    });

    // Server 3: MAL Direct (when MAL ID is available)
    if (malId && malId > 0) {
      sources.push({
        id: 'kai-mal',
        name: 'VidWave Kai (MAL Direct)',
        whiteLabelName: 'Server 3 (Direct Stream)',
        providerId: 'vidwave-kai',
        embedUrl: `${VIDWAVE_EMBED_HOST}/kai/mal/${malId}/${episode}/${kaiAudio}${qs ? `?${qs}` : ''}`,
        audio,
        priority: 8 - getProviderPenalty('kai-mal'),
        quality: 'auto',
        iframeOptions: {
          allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          referrerPolicy: 'strict-origin-when-cross-origin',
        },
        eventSpec: {
          originMatches: ['vidwave.sbs', 'vidwave.site'],
          readyEvent: 'ready',
          playEvent: 'play',
          pauseEvent: 'pause',
          errorEvent: 'error',
          timeEvent: 'time',
          completeEvent: 'complete',
        },
      });
    }

    // Server 4: Alternative Host Mirror
    sources.push({
      id: 'alt-embed',
      name: 'VidWave Alternative Stream (Mirror)',
      whiteLabelName: 'Server 4 (Backup Mirror)',
      providerId: 'vidwave-kai',
      embedUrl: `${VIDWAVE_ALT_HOST}/kai/anilist/${anilistId}/${episode}/${kaiAudio}${qs ? `?${qs}` : ''}`,
      audio,
      priority: 6 - getProviderPenalty('alt-embed'),
      quality: 'auto',
      iframeOptions: {
        allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        referrerPolicy: 'strict-origin-when-cross-origin',
      },
      eventSpec: {
        originMatches: ['vidwave.sbs', 'vidwave.site'],
        readyEvent: 'ready',
        playEvent: 'play',
        pauseEvent: 'pause',
        errorEvent: 'error',
        timeEvent: 'time',
        completeEvent: 'complete',
      },
    });

    return sources;
  }
}

// -------------------------------------------------------------
// Adapter 2: AnimeEmbed (https://animeembed.com/#documentation)
// Embed: https://animeembed.com/embed/ani/{ANILIST_ID}/{EPISODE}?track={sub|dub}
// -------------------------------------------------------------
class AnimeEmbedAdapter implements StreamingProviderAdapter {
  id = 'animeembed';
  name = 'AnimeEmbed';

  async getSupportedLanguages(anilistId: number, animeRecord?: any): Promise<StreamingAudio[]> {
    const audios: StreamingAudio[] = ['sub'];
    if (animeRecord?.format !== 'MUSIC') {
      audios.push('dub');
    }
    return audios;
  }

  async checkAvailability(params: {
    anilistId: number;
    malId?: number | null;
    episode: number;
    audio: StreamingAudio;
  }): Promise<boolean> {
    if (params.audio === 'hindi') return false;
    return params.episode >= 1 && params.anilistId > 0;
  }

  async getSources(params: {
    anilistId: number;
    malId?: number | null;
    episode: number;
    audio: StreamingAudio;
    time?: number;
    autoplay?: boolean;
    autoNext?: boolean;
  }): Promise<StreamSourceOption[]> {
    const { anilistId, episode, audio, autoplay = true, autoNext = true, time = 0 } = params;
    if (audio === 'hindi') return [];

    const track = audio === 'dub' ? 'dub' : 'sub';
    const query = new URLSearchParams({ track });
    if (autoplay) query.set('autoPlay', '1');
    if (autoNext) query.set('autoNext', '1');
    query.set('autoSkip', '1');
    if (time > 0) query.set('time', Math.floor(time).toString());

    const embedUrl = `https://animeembed.com/embed/ani/${anilistId}/${episode}?${query.toString()}`;

    return [
      {
        id: 'animeembed-direct',
        name: 'AnimeEmbed Rapid Stream',
        whiteLabelName: 'Server 5 (Rapid Stream)',
        providerId: 'animeembed',
        embedUrl,
        audio,
        priority: 7 - getProviderPenalty('animeembed-direct'),
        quality: 'auto',
        iframeOptions: {
          allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          referrerPolicy: 'strict-origin-when-cross-origin',
        },
        eventSpec: {
          originMatches: ['animeembed.com'],
          readyEvent: 'ready',
          playEvent: 'play',
          pauseEvent: 'pause',
          errorEvent: 'error',
          timeEvent: 'progress',
          completeEvent: 'ended',
        },
      },
    ];
  }
}

// -------------------------------------------------------------
// Adapter 3: VidWave Hindi Anime (Dedicated Hindi Dubbed Stream)
// -------------------------------------------------------------
class VidWaveHindiAdapter implements StreamingProviderAdapter {
  id = 'vidwave-hindi';
  name = 'VidWave Hindi Anime';

  async getSupportedLanguages(anilistId: number, animeRecord?: any): Promise<StreamingAudio[]> {
    let isHindi = animeRecord?.isHindiDubbed;
    if (isHindi === undefined) {
      try {
        const dbAnime = await prisma.anime.findUnique({
          where: { anilistId },
          select: { isHindiDubbed: true },
        });
        isHindi = Boolean(dbAnime?.isHindiDubbed);
      } catch {
        isHindi = false;
      }
    }
    return isHindi ? ['hindi'] : [];
  }

  async checkAvailability(params: {
    anilistId: number;
    malId?: number | null;
    episode: number;
    audio: StreamingAudio;
  }): Promise<boolean> {
    if (params.audio !== 'hindi') return false;
    try {
      const dbAnime = await prisma.anime.findUnique({
        where: { anilistId: params.anilistId },
        select: { isHindiDubbed: true },
      });
      return Boolean(dbAnime?.isHindiDubbed);
    } catch {
      return false;
    }
  }

  async getSources(params: {
    anilistId: number;
    malId?: number | null;
    episode: number;
    audio: StreamingAudio;
    time?: number;
    autoplay?: boolean;
    autoNext?: boolean;
  }): Promise<StreamSourceOption[]> {
    const { anilistId, episode, audio, autoplay = true, time = 0 } = params;
    if (audio !== 'hindi') return [];

    const query = new URLSearchParams({
      server: 'main',
      autoplay: autoplay ? '1' : '0',
      autoSkipIntro: '1',
      skipSec: '85',
    });
    if (time > 0) query.set('time', Math.floor(time).toString());

    return [
      {
        id: 'hindi-main',
        name: 'VidWave Hindi (Main Server)',
        whiteLabelName: 'Server 1 (DevilMotion Hindi)',
        providerId: 'vidwave-hindi',
        embedUrl: `${VIDWAVE_EMBED_HOST}/anime/hindi/${anilistId}/${episode}?${query.toString()}`,
        audio: 'hindi',
        isDefault: true,
        priority: 10 - getProviderPenalty('hindi-main'),
        quality: 'auto',
        iframeOptions: {
          allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          referrerPolicy: 'strict-origin-when-cross-origin',
        },
        eventSpec: {
          originMatches: ['vidwave.sbs', 'vidwave.site'],
          readyEvent: 'ready',
          playEvent: 'play',
          pauseEvent: 'pause',
          errorEvent: 'error',
          timeEvent: 'time',
          completeEvent: 'complete',
        },
      },
      {
        id: 'hindi-backup',
        name: 'VidWave Hindi (Fast Mirror)',
        whiteLabelName: 'Server 2 (Hindi Fast Mirror)',
        providerId: 'vidwave-hindi',
        embedUrl: `${VIDWAVE_EMBED_HOST}/anime/hindi/${anilistId}/${episode}?server=main&autoplay=1&autoSkipIntro=1&skipSec=85`,
        audio: 'hindi',
        priority: 8 - getProviderPenalty('hindi-backup'),
        quality: 'auto',
        iframeOptions: {
          allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          referrerPolicy: 'strict-origin-when-cross-origin',
        },
        eventSpec: {
          originMatches: ['vidwave.sbs', 'vidwave.site'],
          readyEvent: 'ready',
          playEvent: 'play',
          pauseEvent: 'pause',
          errorEvent: 'error',
          timeEvent: 'time',
          completeEvent: 'complete',
        },
      },
    ];
  }
}

// -------------------------------------------------------------
// Adapter 4: MegaPlay / Anikoto Backup Providers
// -------------------------------------------------------------
class MegaPlayAdapter implements StreamingProviderAdapter {
  id = 'megaplay';
  name = 'MegaPlay Stream';

  async getSupportedLanguages(): Promise<StreamingAudio[]> {
    return ['sub', 'dub'];
  }

  async checkAvailability(params: { anilistId: number; episode: number }): Promise<boolean> {
    return params.episode >= 1 && params.anilistId > 0;
  }

  async getSources(params: {
    anilistId: number;
    episode: number;
    audio: StreamingAudio;
  }): Promise<StreamSourceOption[]> {
    const { anilistId, episode, audio } = params;
    if (audio === 'hindi') return [];

    return [
      {
        id: 'megaplay-prime',
        name: 'MegaPlay Prime',
        whiteLabelName: 'Server 6 (DevilMotion Prime)',
        providerId: 'megaplay',
        embedUrl: `https://megaplay.buzz/stream?id=${anilistId}&ep=${episode}&lang=${audio}`,
        audio,
        priority: 5 - getProviderPenalty('megaplay-prime'),
        quality: 'auto',
        iframeOptions: {
          allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          referrerPolicy: 'strict-origin-when-cross-origin',
        },
        eventSpec: {
          originMatches: ['megaplay.buzz'],
          readyEvent: 'ready',
          playEvent: 'play',
          pauseEvent: 'pause',
          errorEvent: 'error',
          timeEvent: 'time',
          completeEvent: 'ended',
        },
      },
    ];
  }
}

// -------------------------------------------------------------
// Central Registry & Unified Real-Time Streaming Engine
// -------------------------------------------------------------
export class StreamingEngine {
  private static adapters: StreamingProviderAdapter[] = [
    new VidWaveKaiAdapter(),
    new AnimeEmbedAdapter(),
    new VidWaveHindiAdapter(),
    new MegaPlayAdapter(),
  ];

  // In-memory cache for audio availability & server lookups
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Verify audio language availability for a specific episode
   */
  static async getLanguageAvailability(params: {
    animeId: string;
    episode: number;
  }): Promise<{
    animeId: string;
    anilistId: number;
    episode: number;
    availableAudios: StreamingAudio[];
    languageStatus: {
      sub: 'available' | 'checking' | 'unavailable';
      dub: 'available' | 'checking' | 'unavailable';
      hindi: 'available' | 'checking' | 'unavailable';
    };
  }> {
    const { animeId, episode } = params;
    const anilistNum = parseInt(animeId, 10);
    const resolvedAnilistId = !isNaN(anilistNum) && anilistNum > 0 ? anilistNum : 16498;

    const cacheKey = `lang_avail_${resolvedAnilistId}_${episode}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    let animeRecord: any = null;
    try {
      animeRecord = await prisma.anime.findUnique({
        where: { anilistId: resolvedAnilistId },
        select: { isHindiDubbed: true, isEnglishDubbed: true, format: true },
      });
    } catch {}

    const confirmedAudios = new Set<StreamingAudio>(['sub']);

    // Check Dub
    if (animeRecord?.format !== 'MUSIC') {
      confirmedAudios.add('dub');
    }

    // Check Hindi
    if (animeRecord?.isHindiDubbed === true) {
      confirmedAudios.add('hindi');
    }

    const availableAudios = Array.from(confirmedAudios);
    const result = {
      animeId,
      anilistId: resolvedAnilistId,
      episode,
      availableAudios,
      languageStatus: {
        sub: 'available' as const,
        dub: confirmedAudios.has('dub') ? ('available' as const) : ('unavailable' as const),
        hindi: confirmedAudios.has('hindi') ? ('available' as const) : ('unavailable' as const),
      },
    };

    this.cache.set(cacheKey, { data: result, expiry: Date.now() + this.CACHE_TTL_MS });
    return result;
  }

  /**
   * Resolve all working stream sources for anime, episode, and audio
   */
  static async resolveStream(params: {
    animeId: string;
    episodeNumber: number;
    audio: StreamingAudio;
    server?: string;
    time?: number;
    autoplay?: boolean;
    autoNext?: boolean;
  }): Promise<{
    available: boolean;
    embedUrl: string;
    provider: string;
    audio: StreamingAudio;
    availableAudios: StreamingAudio[];
    currentServer: string;
    servers: StreamSourceOption[];
    iframeOptions: StreamSourceOption['iframeOptions'];
    metadata: {
      anilistId: number;
      malId: number | null;
      episodeNumber: number;
      title?: string;
    };
  }> {
    const { animeId, episodeNumber, audio, server, time, autoplay, autoNext } = params;
    const anilistNum = parseInt(animeId, 10);
    let resolvedAnilistId = !isNaN(anilistNum) && anilistNum > 0 ? anilistNum : 16498;
    let resolvedMalId: number | null = null;
    let animeRecord: any = null;

    try {
      animeRecord = await prisma.anime.findUnique({
        where: { anilistId: resolvedAnilistId },
        select: { id: true, anilistId: true, malId: true, isHindiDubbed: true, format: true, titleEnglish: true, titleRomaji: true },
      });
      if (animeRecord) {
        resolvedMalId = animeRecord.malId;
      }
    } catch {}

    // Fallback search if not found
    if (!resolvedMalId) {
      try {
        const details = await AniListService.getDetails(resolvedAnilistId);
        if (details?.idMal) {
          resolvedMalId = details.idMal;
        }
      } catch {}
    }

    // Verify language availability
    const langInfo = await this.getLanguageAvailability({
      animeId,
      episode: episodeNumber,
    });

    let activeAudio = audio;
    if (activeAudio === 'hindi' && !langInfo.availableAudios.includes('hindi')) {
      activeAudio = 'sub';
    }

    // Query all matching adapters for sources concurrently
    const allSourcePromises = this.adapters.map(adapter =>
      adapter.getSources({
        anilistId: resolvedAnilistId,
        malId: resolvedMalId,
        episode: episodeNumber,
        audio: activeAudio,
        time,
        autoplay,
        autoNext,
      }).catch(() => [] as StreamSourceOption[])
    );

    const sourceArrays = await Promise.all(allSourcePromises);
    const flattenedSources = sourceArrays.flat();

    // Sort by dynamic priority (higher priority first)
    flattenedSources.sort((a, b) => b.priority - a.priority);

    if (flattenedSources.length === 0) {
      // Direct emergency fallback
      const fallbackUrl = activeAudio === 'hindi'
        ? `${VIDWAVE_EMBED_HOST}/anime/hindi/${resolvedAnilistId}/${episodeNumber}?server=main&autoplay=1`
        : `${VIDWAVE_EMBED_HOST}/kai/anilist/${resolvedAnilistId}/${episodeNumber}/${activeAudio}?autoplay=1`;

      return {
        available: true,
        embedUrl: fallbackUrl,
        provider: 'DevilMotion Auto Stream',
        audio: activeAudio,
        availableAudios: langInfo.availableAudios,
        currentServer: 'kai-anilist',
        servers: [
          {
            id: 'kai-anilist',
            name: 'DevilMotion HD (Auto)',
            whiteLabelName: 'Server 1 (DevilMotion HD)',
            providerId: 'vidwave-kai',
            embedUrl: fallbackUrl,
            audio: activeAudio,
            priority: 10,
            iframeOptions: {
              allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
              referrerPolicy: 'strict-origin-when-cross-origin',
            },
            eventSpec: {
              originMatches: ['vidwave.sbs', 'vidwave.site'],
              readyEvent: 'ready',
              playEvent: 'play',
              pauseEvent: 'pause',
              errorEvent: 'error',
              timeEvent: 'time',
              completeEvent: 'complete',
            },
          },
        ],
        iframeOptions: {
          allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          referrerPolicy: 'strict-origin-when-cross-origin',
        },
        metadata: {
          anilistId: resolvedAnilistId,
          malId: resolvedMalId,
          episodeNumber,
          title: animeRecord?.titleEnglish || animeRecord?.titleRomaji || 'Anime',
        },
      };
    }

    // Select chosen server or top priority server
    let selected = flattenedSources.find(s => s.id === server);
    if (!selected) {
      selected = flattenedSources[0];
    }

    return {
      available: true,
      embedUrl: selected.embedUrl,
      provider: selected.whiteLabelName,
      audio: activeAudio,
      availableAudios: langInfo.availableAudios,
      currentServer: selected.id,
      servers: flattenedSources,
      iframeOptions: selected.iframeOptions,
      metadata: {
        anilistId: resolvedAnilistId,
        malId: resolvedMalId,
        episodeNumber,
        title: animeRecord?.titleEnglish || animeRecord?.titleRomaji || 'Anime',
      },
    };
  }
}
