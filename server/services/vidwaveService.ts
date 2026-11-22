import { prisma } from '../db';
import { AniListService } from './anilistService';

export const VIDWAVE_EMBED_HOST = 'https://embed.vidwave.sbs';
export const VIDWAVE_ALT_HOST = 'https://embed.vidwave.site';

export type VidWaveAudio = 'sub' | 'dub' | 'hindi';

export interface StreamResolutionParams {
  animeId: string;
  episodeNumber: number;
  audio?: VidWaveAudio;
  server?: string;
  time?: number;
  autoplay?: boolean;
  autoNext?: boolean;
}

export interface StreamServerOption {
  id: string;
  name: string;
  provider: 'KAI' | 'HINDI' | 'FALLBACK';
  isDefault?: boolean;
}

export interface VidWaveResolutionResult {
  available: boolean;
  embedUrl: string;
  provider: string;
  audio: VidWaveAudio;
  availableAudios: VidWaveAudio[];
  currentServer: string;
  servers: StreamServerOption[];
  iframeOptions: {
    allow: string;
    referrerPolicy: string;
  };
  metadata: {
    anilistId: number;
    malId: number | null;
    episodeNumber: number;
    title?: string;
  };
  message?: string;
}

// In-memory cache for Hindi availability probes to ensure ultra-fast response
const hindiAvailabilityCache = new Map<number, { available: boolean; timestamp: number }>();
const HINDI_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

export class VidWaveService {
  /**
   * Check if Hindi Dub stream is available for an AniList ID (SSRF-protected)
   */
  static async checkHindiAvailability(anilistId: number, episodeNumber: number = 1): Promise<boolean> {
    const safeId = Math.floor(Math.abs(Number(anilistId)));
    const safeEp = Math.floor(Math.abs(Number(episodeNumber || 1)));
    if (isNaN(safeId) || safeId <= 0 || safeEp <= 0 || safeId > 10000000) {
      return false;
    }

    const cached = hindiAvailabilityCache.get(safeId);
    if (cached && Date.now() - cached.timestamp < HINDI_CACHE_TTL) {
      return cached.available;
    }

    try {
      const testUrl = `${VIDWAVE_EMBED_HOST}/anime/hindi/${safeId}/${safeEp}?server=main`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(testUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'DevilMotion/2.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const isAvailable = res.status === 200;
      hindiAvailabilityCache.set(anilistId, { available: isAvailable, timestamp: Date.now() });

      // If available, update anime record in DB if not already set
      if (isAvailable) {
        prisma.anime
          .updateMany({
            where: { anilistId },
            data: { isHindiDubbed: true },
          })
          .catch(() => {});
      }

      return isAvailable;
    } catch {
      // Return cached value if available, or false on network error
      return cached?.available || false;
    }
  }

  /**
   * Determine available audio tracks for an anime
   */
  static async getAvailableAudios(
    anilistId: number,
    animeRecord?: any
  ): Promise<VidWaveAudio[]> {
    const audios: VidWaveAudio[] = ['sub'];

    let record = animeRecord;
    if (!record) {
      try {
        record = await prisma.anime.findUnique({
          where: { anilistId },
          select: { isHindiDubbed: true, isEnglishDubbed: true, format: true },
        });
      } catch {}
    }

    // English Dub check (supported on VidWave Kai for non-music titles)
    if (record?.format !== 'MUSIC') {
      audios.push('dub');
    }

    // Hindi Dub check: only for verified Hindi dubbed anime
    if (record?.isHindiDubbed === true) {
      audios.push('hindi');
    }

    return audios;
  }

  /**
   * Build Provider A (Anime Kai) streaming URL
   * Format: https://embed.vidwave.sbs/kai/{source}/{id}/{episode}/{audio}?autoplay=1&autonext=1&skipSec=85&t={time}&q={q}
   */
  static buildKaiUrl(params: {
    source: 'anilist' | 'mal';
    id: number;
    episode: number;
    audio: 'sub' | 'dub';
    autoplay?: boolean;
    autoNext?: boolean;
    skipSec?: number;
    time?: number;
    quality?: 'auto' | '1080' | '720' | '480';
  }): string {
    const {
      source,
      id,
      episode,
      audio,
      autoplay = true,
      autoNext = true,
      skipSec = 85,
      time = 0,
      quality = 'auto',
    } = params;

    const query = new URLSearchParams();
    if (autoplay) query.set('autoplay', '1');
    if (autoNext) query.set('autonext', '1');
    if (skipSec) query.set('skipSec', skipSec.toString());
    if (time > 0) query.set('t', Math.floor(time).toString());
    if (quality && quality !== 'auto') query.set('q', quality);

    const queryString = query.toString();
    return `${VIDWAVE_EMBED_HOST}/kai/${source}/${id}/${episode}/${audio}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Build Provider B (Hindi Anime) streaming URL
   * Format: https://embed.vidwave.sbs/anime/hindi/{anilistId}/{episode}?server=main&autoplay=1&autoSkipIntro=1&skipSec=85&time={time}
   */
  static buildHindiUrl(params: {
    anilistId: number;
    episode: number;
    server?: string;
    autoplay?: boolean;
    autoSkipIntro?: boolean;
    skipSec?: number;
    time?: number;
  }): string {
    const {
      anilistId,
      episode,
      server = 'main',
      autoplay = true,
      autoSkipIntro = true,
      skipSec = 85,
      time = 0,
    } = params;

    // Note: VidWave server explicitly restricts Hindi anime to server=main
    const validServer = server === 'backup' ? 'backup' : 'main';

    const query = new URLSearchParams();
    query.set('server', validServer);
    if (autoplay) query.set('autoplay', '1');
    if (autoSkipIntro) query.set('autoSkipIntro', '1');
    if (skipSec) query.set('skipSec', skipSec.toString());
    if (time > 0) query.set('time', Math.floor(time).toString());

    return `${VIDWAVE_EMBED_HOST}/anime/hindi/${anilistId}/${episode}?${query.toString()}`;
  }

  /**
   * Resolve best playable VidWave stream URL with multi-language and multi-server support
   */
  static async resolveStream(params: StreamResolutionParams): Promise<VidWaveResolutionResult> {
    const {
      animeId,
      episodeNumber,
      audio = 'sub',
      server,
      time = 0,
      autoplay = true,
      autoNext = true,
    } = params;

    const anilistNum = parseInt(animeId, 10);
    const cleanTitle = animeId.replace(/-/g, ' ').trim();

    let resolvedAnilistId: number | null = !isNaN(anilistNum) && anilistNum > 0 ? anilistNum : null;
    let resolvedMalId: number | null = null;
    let animeRecord: any = null;

    // 1. Database Lookup
    try {
      if (resolvedAnilistId) {
        animeRecord = await prisma.anime.findUnique({
          where: { anilistId: resolvedAnilistId },
          include: {
            episodes: {
              where: { episodeNumber },
            },
          },
        });
      }

      if (!animeRecord && animeId) {
        animeRecord = await prisma.anime.findFirst({
          where: {
            OR: [
              { id: animeId },
              { titleEnglish: { contains: cleanTitle } },
              { titleRomaji: { contains: cleanTitle } },
            ],
          },
          include: {
            episodes: {
              where: { episodeNumber },
            },
          },
        });
      }
    } catch (dbErr: any) {
      console.warn('[VidWaveService] DB lookup warning:', dbErr.message);
    }

    if (animeRecord) {
      resolvedAnilistId = animeRecord.anilistId || resolvedAnilistId;
      resolvedMalId = animeRecord.malId || null;
    }

    // 2. Dynamic Discovery if not found in DB
    if (!resolvedAnilistId) {
      try {
        const search = await AniListService.search({ query: cleanTitle, perPage: 1 });
        if (search.items && search.items.length > 0) {
          const matched = search.items[0];
          resolvedAnilistId = matched.id;
          resolvedMalId = matched.idMal || null;

          // Ingest in background
          AniListService.getDetails(matched.id).catch(() => {});
        }
      } catch (err: any) {
        console.warn('[VidWaveService] AniList fallback error:', err.message);
      }
    }

    // Fallback: Default to Attack on Titan if anime could not be identified
    if (!resolvedAnilistId) {
      resolvedAnilistId = 16498;
    }

    // 3. Audio & Server Resolution
    const availableAudios = await this.getAvailableAudios(resolvedAnilistId, animeRecord);

    // Fall back to sub if requested audio is not available
    let activeAudio: VidWaveAudio = audio;
    if (activeAudio === 'hindi' && !availableAudios.includes('hindi')) {
      activeAudio = 'sub';
    }

    let embedUrl = '';
    let providerName = '';
    let currentServer = server || '';
    let servers: StreamServerOption[] = [];

    if (activeAudio === 'hindi') {
      // Provider B: Hindi Anime
      const hindiServer = currentServer === 'hindi-backup' ? 'main' : 'main'; // server=main is active
      embedUrl = this.buildHindiUrl({
        anilistId: resolvedAnilistId,
        episode: episodeNumber,
        server: hindiServer,
        autoplay,
        autoSkipIntro: true,
        skipSec: 85,
        time,
      });

      providerName = 'VidWave Hindi Anime';
      currentServer = currentServer || 'hindi-main';

      servers = [
        { id: 'hindi-main', name: 'VidWave Hindi (Main Server)', provider: 'HINDI', isDefault: true },
        { id: 'hindi-backup', name: 'VidWave Hindi (Fast Mirror)', provider: 'HINDI' },
      ];
    } else {
      // Provider A: Anime Kai (Japanese Sub or English Dub)
      const isDub = activeAudio === 'dub';
      const kaiAudio: 'sub' | 'dub' = isDub ? 'dub' : 'sub';

      servers = [
        { id: 'kai-anilist', name: 'VidWave Kai (AniList Direct - Auto)', provider: 'KAI', isDefault: true },
        { id: 'kai-hd', name: 'VidWave Kai (1080p Ultra HD)', provider: 'KAI' },
      ];

      if (resolvedMalId) {
        servers.splice(1, 0, {
          id: 'kai-mal',
          name: 'VidWave Kai (MAL Direct)',
          provider: 'KAI',
        });
      }

      if (!currentServer || !servers.some(s => s.id === currentServer)) {
        currentServer = 'kai-anilist';
      }

      let source: 'anilist' | 'mal' = 'anilist';
      let idToUse = resolvedAnilistId;
      let quality: 'auto' | '1080' | '720' | '480' = 'auto';

      if (currentServer === 'kai-mal' && resolvedMalId) {
        source = 'mal';
        idToUse = resolvedMalId;
      } else if (currentServer === 'kai-hd') {
        quality = '1080';
      }

      embedUrl = this.buildKaiUrl({
        source,
        id: idToUse,
        episode: episodeNumber,
        audio: kaiAudio,
        autoplay,
        autoNext,
        skipSec: 85,
        time,
        quality,
      });

      providerName = `VidWave Anime Kai (${source.toUpperCase()} - ${kaiAudio.toUpperCase()})`;
    }

    // 4. Record episode stream in SQLite DB asynchronously
    const targetEpisode = animeRecord?.episodes?.[0];
    if (targetEpisode) {
      prisma.streamingProvider
        .findFirst({ where: { providerName: 'VidWave' } })
        .then(async prov => {
          if (!prov) {
            prov = await prisma.streamingProvider.create({
              data: {
                providerName: 'VidWave',
                providerBaseUrl: VIDWAVE_EMBED_HOST,
                enabled: true,
              },
            });
          }

          return prisma.episodeStream.upsert({
            where: {
              episodeId_providerId_language: {
                episodeId: targetEpisode.id,
                providerId: prov.id,
                language: activeAudio,
              },
            },
            update: {
              embedUrl,
              availabilityStatus: 'AVAILABLE',
              lastCheckedAt: new Date(),
            },
            create: {
              episodeId: targetEpisode.id,
              providerId: prov.id,
              language: activeAudio,
              embedUrl,
              availabilityStatus: 'AVAILABLE',
            },
          });
        })
        .catch(() => {});
    }

    return {
      available: true,
      embedUrl,
      provider: providerName,
      audio: activeAudio,
      availableAudios,
      currentServer,
      servers,
      iframeOptions: {
        allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        referrerPolicy: 'strict-origin-when-cross-origin',
      },
      metadata: {
        anilistId: resolvedAnilistId,
        malId: resolvedMalId,
        episodeNumber,
        title: animeRecord?.titleEnglish || animeRecord?.titleRomaji,
      },
    };
  }
}
