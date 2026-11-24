import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { AniListService } from '../services/anilistService';
import { AnimeAggregationService } from '../services/animeAggregationService';
import { EpisodeMetadataService } from '../services/episodeMetadataService';
import { MalService } from '../services/malService';
import { cacheResponse } from '../middleware/cache';
import { searchRateLimiter, sanitizeString, sanitizeNumber } from '../middleware/security';

export const animeRouter = Router();

// Helper to format anime response consistently
function formatAnimeItem(item: any) {
  let genres = [];
  try {
    genres = typeof item.genres === 'string' ? JSON.parse(item.genres) : item.genres || [];
  } catch {
    genres = [];
  }

  let studios: string[] = [];
  if (Array.isArray(item.studios)) {
    studios = item.studios;
  } else if (item.studios?.nodes && Array.isArray(item.studios.nodes)) {
    studios = item.studios.nodes.map((n: any) => n.name).filter(Boolean);
  } else if (typeof item.studios === 'string') {
    try {
      studios = JSON.parse(item.studios);
    } catch {
      studios = [];
    }
  }

  let altTitles: string[] = [];
  try {
    altTitles = typeof item.alternativeTitles === 'string' ? JSON.parse(item.alternativeTitles) : item.alternativeTitles || [];
  } catch {
    altTitles = [];
  }

  const rawScore = typeof item.averageScore === 'number' ? item.averageScore : 85;
  const normalizedScore = rawScore > 10 ? rawScore / 10 : rawScore;
  const roundedRating = Math.round(normalizedScore * 10) / 10;
  const percentScore = Math.round(normalizedScore * 10);

  const rawCover = item.coverImage;
  let coverUrl = '';
  let xlCoverUrl = '';

  if (typeof rawCover === 'string' && rawCover.trim()) {
    coverUrl = rawCover.trim();
    xlCoverUrl = typeof item.coverImageExtraLarge === 'string' && item.coverImageExtraLarge.trim()
      ? item.coverImageExtraLarge.trim()
      : coverUrl;
  } else if (rawCover && typeof rawCover === 'object') {
    coverUrl = rawCover.extraLarge || rawCover.large || rawCover.medium || '';
    xlCoverUrl = rawCover.extraLarge || rawCover.large || coverUrl;
  }

  if (!coverUrl && typeof item.coverImageExtraLarge === 'string') {
    coverUrl = item.coverImageExtraLarge.trim();
    xlCoverUrl = coverUrl;
  }

  let banner = '';
  if (typeof item.bannerImage === 'string' && item.bannerImage.trim()) {
    banner = item.bannerImage.trim();
  } else if (item.bannerImage && typeof item.bannerImage === 'object' && item.bannerImage.large) {
    banner = item.bannerImage.large;
  } else {
    banner = xlCoverUrl || coverUrl;
  }

  const resolvedAnilistId =
    item.anilistId ||
    (typeof item.id === 'number' ? item.id : null) ||
    (item.sourceRecordId ? parseInt(item.sourceRecordId, 10) : null);
  const resolvedMalId = item.malId || item.idMal || null;

  return {
    id: resolvedAnilistId ? String(resolvedAnilistId) : String(item.id),
    dbId: typeof item.id === 'string' ? item.id : undefined,
    anilistId: resolvedAnilistId,
    malId: resolvedMalId,
    title: {
      english: item.titleEnglish || item.title?.english || item.title?.romaji || 'Unknown Title',
      romaji: item.titleRomaji || item.title?.romaji || '',
      native: item.titleNative || item.title?.native || '',
      alternative: altTitles,
    },
    coverImage: {
      large: coverUrl,
      extraLarge: xlCoverUrl,
      medium: coverUrl,
    },
    bannerImage: banner,
    format: item.format || 'TV',
    status: item.status || 'FINISHED',
    description: item.description || '',
    year: item.releaseYear || item.seasonYear || 2024,
    season: item.season,
    episodes:
      typeof item.totalEpisodes === 'number' && item.totalEpisodes > 0
        ? item.totalEpisodes
        : typeof item.episodes === 'number' && item.episodes > 0
        ? item.episodes
        : Array.isArray(item.episodes) && item.episodes.length > 0
        ? item.episodes.length
        : 12,
    duration: item.duration || 24,
    countryOfOrigin: item.countryOfOrigin || 'JP',
    rating: roundedRating,
    scorePercent: percentScore,
    anilistScore: roundedRating,
    malScore: item.malScore || null,
    popularity: item.popularity || 50000,
    genres,
    studios,
    ageRating: 'PG-13',
    subAvailable: true,
    dubAvailable: true,
    isTrending: Boolean(item.isTrending),
    isPopular: Boolean(item.isPopular),
    isTopRated: Boolean(item.isTopRated),
    isUpcoming: item.status === 'NOT_YET_RELEASED',
  };
}

/**
 * Trending Anime (Cached for 10 minutes)
 */
animeRouter.get('/trending', cacheResponse(600), async (req: Request, res: Response) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);

  try {
    const items = await AniListService.getTrending(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err: any) {
    console.warn('[Trending Route] Live AniList fetch notice:', err.message);
  }

  try {
    const dbItems = await prisma.anime.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { popularity: 'desc' },
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr: any) {
    console.error('[Trending Route] DB fallback error:', dbErr.message);
    return res.json({ items: [] });
  }
});

/**
 * Popular Anime (Cached for 10 minutes)
 */
animeRouter.get('/popular', cacheResponse(600), async (req: Request, res: Response) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);

  try {
    const items = await AniListService.getPopular(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err: any) {
    console.warn('[Popular Route] Live AniList fetch notice:', err.message);
  }

  try {
    const dbItems = await prisma.anime.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { popularity: 'desc' },
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr: any) {
    console.error('[Popular Route] DB fallback error:', dbErr.message);
    return res.json({ items: [] });
  }
});

/**
 * Top-Rated Anime (Cached for 10 minutes)
 */
animeRouter.get('/top-rated', cacheResponse(600), async (req: Request, res: Response) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);

  try {
    const items = await AniListService.getTopRated(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err: any) {
    console.warn('[Top-Rated Route] Live AniList fetch notice:', err.message);
  }

  try {
    const dbItems = await prisma.anime.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { averageScore: 'desc' },
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr: any) {
    console.error('[Top-Rated Route] DB fallback error:', dbErr.message);
    return res.json({ items: [] });
  }
});

/**
 * Airing & Recently Updated Anime (Cached for 5 minutes)
 */
animeRouter.get('/airing', cacheResponse(300), async (req: Request, res: Response) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);

  try {
    const items = await AniListService.getCurrentlyAiring(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err: any) {
    console.warn('[Airing Route] Live AniList fetch notice:', err.message);
  }

  try {
    const dbItems = await prisma.anime.findMany({
      where: { status: 'RELEASING' },
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr: any) {
    console.error('[Airing Route] DB fallback error:', dbErr.message);
    return res.json({ items: [] });
  }
});

/**
 * Upcoming Anime (Cached for 15 minutes)
 */
animeRouter.get('/upcoming', cacheResponse(900), async (req: Request, res: Response) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);

  try {
    const items = await AniListService.getUpcoming(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err: any) {
    console.warn('[Upcoming Route] Live AniList fetch failed, using DB cache:', err.message);
  }

  try {
    const dbItems = await prisma.anime.findMany({
      where: { status: 'NOT_YET_RELEASED' },
      take: perPage,
      skip: (page - 1) * perPage,
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr: any) {
    console.error('[Upcoming Route] DB fallback failed:', dbErr.message);
    return res.json({ items: [] });
  }
});

/**
 * Anime Movies (Cached for 15 minutes)
 */
animeRouter.get('/movies', cacheResponse(900), async (req: Request, res: Response) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 24);
  const sort = req.query.sort ? sanitizeString(req.query.sort, 30) : undefined;
  const genre = req.query.genre ? sanitizeString(req.query.genre, 50) : undefined;

  try {
    const result = await AniListService.getMovies(page, perPage, sort, genre);
    if (result && result.items && result.items.length > 0) {
      return res.json({
        items: result.items.map(formatAnimeItem),
        total: result.total,
        hasNextPage: result.hasNextPage,
      });
    }
  } catch (err: any) {
    console.warn('[Movies Route] Live AniList fetch failed, using DB cache:', err.message);
  }

  try {
    const whereClause: any = { format: 'MOVIE' };
    if (genre && genre !== 'ALL') {
      whereClause.genres = { contains: genre };
    }
    let orderBy: any = { averageScore: 'desc' };
    if (sort === 'popular') orderBy = { popularity: 'desc' };
    else if (sort === 'newest') orderBy = { releaseYear: 'desc' };

    const [dbItems, totalCount] = await Promise.all([
      prisma.anime.findMany({
        where: whereClause,
        take: perPage,
        skip: (page - 1) * perPage,
        orderBy,
      }),
      prisma.anime.count({ where: whereClause }),
    ]);

    return res.json({
      items: dbItems.map(formatAnimeItem),
      total: totalCount,
      hasNextPage: page * perPage < totalCount,
    });
  } catch (dbErr: any) {
    console.error('[Movies Route] DB fallback failed:', dbErr.message);
    return res.json({ items: [], total: 0, hasNextPage: false });
  }
});

/**
 * Dubbed Anime Collections: Hindi & English (Cached for 15 minutes)
 */
animeRouter.get('/dubbed/hindi', cacheResponse(900), async (req: Request, res: Response) => {
  try {
    const items = await AniListService.getDubbedCollection('hindi', 1, 18);
    return res.json({ items: items.map(formatAnimeItem) });
  } catch (err: any) {
    console.warn('[Dubbed Hindi Route] Live AniList fetch notice:', err.message);
    try {
      const dbItems = await prisma.anime.findMany({
        take: 18,
        orderBy: { popularity: 'desc' },
      });
      return res.json({ items: dbItems.map(formatAnimeItem) });
    } catch {
      return res.json({ items: [] });
    }
  }
});

animeRouter.get('/dubbed/english', cacheResponse(900), async (req: Request, res: Response) => {
  try {
    const items = await AniListService.getDubbedCollection('english', 1, 18);
    return res.json({ items: items.map(formatAnimeItem) });
  } catch (err: any) {
    console.warn('[Dubbed English Route] Live AniList fetch notice:', err.message);
    try {
      const dbItems = await prisma.anime.findMany({
        take: 18,
        skip: 2,
        orderBy: { popularity: 'desc' },
      });
      return res.json({ items: dbItems.map(formatAnimeItem) });
    } catch {
      return res.json({ items: [] });
    }
  }
});

/**
 * Anime by Genre (Cached for 10 minutes)
 */
animeRouter.get('/genre/:genre', cacheResponse(600), async (req: Request, res: Response) => {
  const genre = sanitizeString(req.params.genre, 50);
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 24);
  const sort = req.query.sort ? sanitizeString(req.query.sort, 30) : undefined;

  try {
    const result = await AniListService.getByGenre(genre, page, perPage, sort);
    if (result && result.items && result.items.length > 0) {
      return res.json({
        items: result.items.map(formatAnimeItem),
        total: result.total,
        hasNextPage: result.hasNextPage,
      });
    }
  } catch (err: any) {
    console.warn(`[Genre Route] Live fetch notice for ${genre}:`, err.message);
  }

  try {
    const whereClause: any = { genres: { contains: genre } };
    let orderBy: any = { popularity: 'desc' };
    if (sort === 'rating') orderBy = { averageScore: 'desc' };
    else if (sort === 'newest') orderBy = { releaseYear: 'desc' };

    const [dbItems, totalCount] = await Promise.all([
      prisma.anime.findMany({
        where: whereClause,
        take: perPage,
        skip: (page - 1) * perPage,
        orderBy,
      }),
      prisma.anime.count({ where: whereClause }),
    ]);

    return res.json({
      items: dbItems.map(formatAnimeItem),
      total: totalCount,
      hasNextPage: page * perPage < totalCount,
    });
  } catch (dbErr: any) {
    return res.json({ items: [], total: 0, hasNextPage: false });
  }
});

/**
 * Search Anime with Rate Limiting and Caching (Cached for 2 minutes)
 */
animeRouter.get('/search', searchRateLimiter, cacheResponse(120), async (req: Request, res: Response) => {
  try {
    const q = sanitizeString(req.query.q, 100);
    const genre = req.query.genre ? sanitizeString(req.query.genre, 50) : undefined;
    const format = req.query.format ? sanitizeString(req.query.format, 20) : undefined;
    const status = req.query.status ? sanitizeString(req.query.status, 30) : undefined;
    const year = req.query.year ? sanitizeNumber(req.query.year, 1960, 2030, undefined as any) : undefined;
    const season = req.query.season ? sanitizeString(req.query.season, 20) : undefined;
    const sort = req.query.sort ? sanitizeString(req.query.sort, 30) : undefined;
    const page = sanitizeNumber(req.query.page, 1, 100, 1);
    const perPage = sanitizeNumber(req.query.perPage, 1, 50, 24);

    const result = await AniListService.search({
      query: q,
      genre,
      format,
      status,
      year,
      season,
      sort,
      page,
      perPage,
    });

    return res.json({
      items: result.items.map(formatAnimeItem),
      total: result.total,
      hasNextPage: result.hasNextPage,
    });
  } catch (error: any) {
    console.warn('[Search Route] Search query notice:', error.message);
    try {
      const q = sanitizeString(req.query.q, 100);
      const dbItems = await prisma.anime.findMany({
        where: q ? {
          OR: [
            { titleEnglish: { contains: q } },
            { titleRomaji: { contains: q } },
          ],
        } : undefined,
        take: 24,
      });
      return res.json({ items: dbItems.map(formatAnimeItem), total: dbItems.length, hasNextPage: false });
    } catch {
      return res.json({ items: [], total: 0, hasNextPage: false });
    }
  }
});

/**
 * Weekly Airing Schedule (Cached for 30 minutes)
 */
animeRouter.get('/schedule', cacheResponse(1800), async (req: Request, res: Response) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    // Span full week: 1 day in the past to 7 days ahead
    const startOfWeek = now - 86400 * 1;
    const endOfWeek = now + 86400 * 7;

    try {
      const schedules = await AniListService.getWeeklySchedule(startOfWeek, endOfWeek);
      if (schedules && schedules.length > 0) {
        // Deduplicate schedules by anime ID + episode number
        const seenKeys = new Set<string>();
        const formatted: any[] = [];
        for (const item of schedules) {
          const key = `${item.media?.id || item.id}-${item.episode}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            formatted.push({
              id: item.id,
              airingAt: item.airingAt,
              episode: item.episode,
              timeUntilAiring: item.timeUntilAiring,
              anime: formatAnimeItem(item.media),
            });
          }
        }
        return res.json({ schedules: formatted });
      }
    } catch (e: any) {
      console.warn('[Schedule Route] AniList live fetch notice:', e.message);
    }

    // Fallback to SQLite AiringSchedule DB table
    const dbSchedules = await prisma.airingSchedule.findMany({
      take: 60,
      orderBy: { airingAt: 'asc' },
      include: { anime: true },
    });

    const seenDbKeys = new Set<string>();
    const formattedDb: any[] = [];
    for (const s of dbSchedules) {
      const key = `${s.animeId}-${s.episodeNumber}`;
      if (!seenDbKeys.has(key)) {
        seenDbKeys.add(key);
        formattedDb.push({
          id: s.id,
          airingAt: Math.floor(s.airingAt.getTime() / 1000),
          episode: s.episodeNumber,
          timeUntilAiring: s.timeUntilAiring,
          anime: formatAnimeItem(s.anime),
        });
      }
    }

    return res.json({ schedules: formattedDb });
  } catch (error: any) {
    console.error('Schedule fetch error:', error.message);
    return res.json({ schedules: [] });
  }
});

/**
 * Single Anime Details (Cached for 15 minutes)
 */
animeRouter.get('/:id', cacheResponse(900), async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const sourceParam = ((req.query.source as string) || '').toLowerCase();

    const isExplicitMal = sourceParam === 'mal' || rawId.toLowerCase().startsWith('mal-');
    const isExplicitAniList = sourceParam === 'anilist' || rawId.toLowerCase().startsWith('anilist-');

    // Clean prefix if any
    const cleanId = rawId.replace(/^(mal|anilist)-/i, '').trim();
    const numericId = parseInt(cleanId, 10);
    const isNumeric = !isNaN(numericId) && String(numericId) === cleanId;

    let animeData = null;
    let dbRecord = null;

    // STEP 1: Check Database Cache
    try {
      if (isNumeric) {
        if (isExplicitMal) {
          dbRecord = await prisma.anime.findFirst({
            where: { malId: numericId },
            include: {
              episodes: { orderBy: { episodeNumber: 'asc' }, include: { episodeStreams: true } },
              characters: true,
              airingSchedules: true,
            },
          });
        } else if (isExplicitAniList) {
          dbRecord = await prisma.anime.findUnique({
            where: { anilistId: numericId },
            include: {
              episodes: { orderBy: { episodeNumber: 'asc' }, include: { episodeStreams: true } },
              characters: true,
              airingSchedules: true,
            },
          });
        } else {
          // Try AniList ID first, then fallback to MAL ID in DB
          dbRecord = await prisma.anime.findUnique({
            where: { anilistId: numericId },
            include: {
              episodes: { orderBy: { episodeNumber: 'asc' }, include: { episodeStreams: true } },
              characters: true,
              airingSchedules: true,
            },
          });

          if (!dbRecord) {
            dbRecord = await prisma.anime.findFirst({
              where: { malId: numericId },
              include: {
                episodes: { orderBy: { episodeNumber: 'asc' }, include: { episodeStreams: true } },
                characters: true,
                airingSchedules: true,
              },
            });
          }
        }
      } else {
        // Check primary key (CUID)
        dbRecord = await prisma.anime.findUnique({
          where: { id: cleanId },
          include: {
            episodes: { orderBy: { episodeNumber: 'asc' }, include: { episodeStreams: true } },
            characters: true,
            airingSchedules: true,
          },
        });

        if (!dbRecord) {
          const cleanTitle = cleanId.replace(/-/g, ' ').trim();
          dbRecord = await prisma.anime.findFirst({
            where: {
              OR: [
                { titleEnglish: { contains: cleanTitle } },
                { titleRomaji: { contains: cleanTitle } },
              ],
            },
            include: {
              episodes: { orderBy: { episodeNumber: 'asc' }, include: { episodeStreams: true } },
              characters: true,
              airingSchedules: true,
            },
          });
        }
      }
    } catch (dbErr: any) {
      console.warn('[Anime Details] DB cache read notice:', dbErr.message);
      dbRecord = null;
    }

    // STEP 2: External API Fetch (Always ensure live AniList data for relations and real-time airing)
    const targetAnilistId = dbRecord?.anilistId || (isNumeric && !isExplicitMal ? numericId : null);

    if (!animeData) {
      if (targetAnilistId) {
        try {
          animeData = await AniListService.getDetails(targetAnilistId);
        } catch (e: any) {
          console.warn('[Anime Details] AniList getDetails warning:', e.message);
        }
      } else if (isNumeric) {
        if (isExplicitMal) {
          try {
            animeData = await AniListService.getDetailsByMalId(numericId);
          } catch (e: any) {
            console.warn('[Anime Details] AniList getDetailsByMalId warning:', e.message);
          }
        } else {
          try {
            animeData = await AniListService.getDetails(numericId);
          } catch (err: any) {
            console.warn('[Anime Details] AniList ID lookup warning:', err.message);
          }

          if (!animeData) {
            try {
              animeData = await AniListService.getDetailsByMalId(numericId);
            } catch (err: any) {
              console.warn('[Anime Details] MAL ID fallback lookup warning:', err.message);
            }
          }
        }
      } else {
        // String slug or title lookup
        const cleanTitle = cleanId.replace(/-/g, ' ').trim();
        try {
          let searchRes = await AniListService.search({ query: cleanTitle, perPage: 1 });
          if (!searchRes.items || searchRes.items.length === 0) {
            const firstTwoWords = cleanTitle.split(' ').slice(0, 2).join(' ');
            if (firstTwoWords && firstTwoWords !== cleanTitle) {
              searchRes = await AniListService.search({ query: firstTwoWords, perPage: 1 });
            }
          }
          if (searchRes.items && searchRes.items.length > 0) {
            animeData = await AniListService.getDetails(searchRes.items[0].id);
          }
        } catch (err: any) {
          console.warn('[Anime Details] Title search fallback warning:', err.message);
        }
      }
    }

    // Genuinely not found only if DB and all external sources return nothing
    if (!animeData && !dbRecord) {
      return res.status(404).json({ error: 'Anime not found', code: 'NOT_FOUND' });
    }

    // STEP 3: Refresh DB record if we just fetched from live API
    if (animeData && (!dbRecord || dbRecord.characters?.length === 0)) {
      try {
        dbRecord = await prisma.anime.findUnique({
          where: { anilistId: animeData.id },
          include: {
            episodes: {
              orderBy: { episodeNumber: 'asc' },
              include: { episodeStreams: true },
            },
            characters: true,
            airingSchedules: true,
          },
        });
      } catch (dbErr: any) {
        console.warn('[Anime Details] DB record refresh notice:', dbErr.message);
      }
    }

    const base = animeData || dbRecord;
    const formatted = formatAnimeItem(base);

    // STEP 4: High-Performance Non-Blocking Episode Assembly
    // Resolve accurate total episodes (support 1000+ episode anime, releasing shows, movies)
    let resolvedTotalEpisodes: number = 12;
    if (formatted.format === 'MOVIE') {
      resolvedTotalEpisodes = 1;
    } else if (animeData?.nextAiringEpisode?.episode && animeData.nextAiringEpisode.episode > 1) {
      // Releasing anime always uses live nextAiringEpisode (e.g. One Piece ep 1181 next -> 1180 currently released)
      resolvedTotalEpisodes = animeData.nextAiringEpisode.episode - 1;
    } else if (typeof animeData?.episodes === 'number' && animeData.episodes > 0) {
      resolvedTotalEpisodes = animeData.episodes;
    } else if (typeof base.totalEpisodes === 'number' && base.totalEpisodes > 0 && base.status !== 'RELEASING') {
      resolvedTotalEpisodes = base.totalEpisodes;
    } else if (typeof base.episodes === 'number' && base.episodes > 0) {
      resolvedTotalEpisodes = base.episodes;
    } else if (dbRecord && Array.isArray(dbRecord.episodes) && dbRecord.episodes.length > 0) {
      const maxEp = Math.max(...dbRecord.episodes.map((e: any) => e.episodeNumber || 0));
      if (maxEp > 0) resolvedTotalEpisodes = maxEp;
    } else if (base.status === 'RELEASING' && typeof base.latestEpisode === 'number' && base.latestEpisode > 0) {
      resolvedTotalEpisodes = base.latestEpisode;
    }

    const animeLookup = {
      id: dbRecord ? dbRecord.id : (base.dbId || String(base.id || base.anilistId)),
      anilistId: base.anilistId || base.id,
      malId: base.malId || null,
      titleEnglish: formatted.title.english,
      titleRomaji: formatted.title.romaji,
      format: formatted.format,
      totalEpisodes: resolvedTotalEpisodes,
      duration: base.duration || 24,
      coverImage: formatted.coverImage?.large,
      bannerImage: formatted.bannerImage,
    };

    let episodesList: any[] = [];
    const isMovie = formatted.format === 'MOVIE';

    // If DB already has episodes, format them immediately (<1ms)
    if (dbRecord && Array.isArray(dbRecord.episodes) && dbRecord.episodes.length > 0) {
      episodesList = dbRecord.episodes.map((ep: any) => {
        const isGeneric =
          !ep.episodeTitle || Boolean(ep.episodeTitle.toLowerCase().match(/^episode\s+\d+$/i));
        return {
          id: ep.id,
          number: ep.episodeNumber,
          title: ep.episodeTitle || `Episode ${ep.episodeNumber}`,
          japaneseTitle: ep.japaneseTitle || null,
          hasRealTitle: !isGeneric,
          isGenericTitle: isGeneric,
          thumbnail: ep.thumbnail || ep.thumbnailUrl || formatted.bannerImage || formatted.coverImage?.large,
          duration: `${base.duration || 24}m`,
          airDate: ep.airedAt
            ? new Date(ep.airedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : ep.releaseDate || 'TBA',
          filler: Boolean(ep.filler),
          recap: Boolean(ep.recap),
          metadataSource: ep.metadataSource || 'ANILIST',
          subAvailable: true,
          dubAvailable: true,
        };
      });

      // If DB has fewer episodes than resolved total (e.g. only 24 saved for a 500+ or 1000+ episode series), backfill the rest
      const existingEpNums = new Set(episodesList.map(e => e.number));
      if (episodesList.length < resolvedTotalEpisodes) {
        for (let ep = 1; ep <= resolvedTotalEpisodes; ep++) {
          if (!existingEpNums.has(ep)) {
            episodesList.push({
              id: `ep-${animeLookup.id}-${ep}`,
              number: ep,
              title: isMovie ? `${formatted.title.english} (Feature Film)` : `Episode ${ep}`,
              japaneseTitle: null,
              hasRealTitle: isMovie,
              isGenericTitle: !isMovie,
              thumbnail: formatted.bannerImage || formatted.coverImage?.large,
              duration: isMovie ? `${base.duration || 110}m` : `${base.duration || 24}m`,
              airDate: 'TBA',
              filler: false,
              recap: false,
              metadataSource: 'ANILIST',
              subAvailable: true,
              dubAvailable: true,
            });
          }
        }
        episodesList.sort((a, b) => a.number - b.number);
      }

      // If DB episodes don't have real titles yet, trigger background enrichment
      const hasRealTitles = episodesList.some(e => e.hasRealTitle);
      if (!hasRealTitles && animeLookup.malId) {
        EpisodeMetadataService.getEpisodesForAnime(dbRecord, { forceSync: true, maxCount: Math.min(resolvedTotalEpisodes, 500) }).catch(e => {
          console.warn(`[Background Episode Sync] failed for ${dbRecord.id}:`, e.message);
        });
      }
    } else {
      // Fast base episodes generated in <1ms without blocking details response
      for (let ep = 1; ep <= resolvedTotalEpisodes; ep++) {
        episodesList.push({
          id: `ep-${animeLookup.id}-${ep}`,
          number: ep,
          title: isMovie ? `${formatted.title.english} (Feature Film)` : `Episode ${ep}`,
          japaneseTitle: null,
          hasRealTitle: isMovie,
          isGenericTitle: !isMovie,
          thumbnail: formatted.bannerImage || formatted.coverImage?.large,
          duration: isMovie ? `${base.duration || 110}m` : `${base.duration || 24}m`,
          airDate: 'TBA',
          filler: false,
          recap: false,
          metadataSource: 'ANILIST',
          subAvailable: true,
          dubAvailable: true,
        });
      }

      // Trigger asynchronous background sync if DB record exists
      if (dbRecord) {
        EpisodeMetadataService.getEpisodesForAnime(dbRecord, { forceSync: true, maxCount: Math.min(resolvedTotalEpisodes, 500) }).catch(e => {
          console.warn(`[Background Episode Sync] failed for ${dbRecord.id}:`, e.message);
        });
      }
    }

    // Characters & Voice Actors
    const charactersList = (dbRecord?.characters || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      image: c.imageUrl,
      voiceActor: {
        name: c.voiceActorName,
        language: c.voiceActorLanguage,
        image: c.voiceActorImage,
      },
    }));

    // Recommendations
    const recs =
      animeData?.recommendations?.nodes
        ?.map((n: any) => n.mediaRecommendation)
        ?.filter(Boolean)
        ?.map(formatAnimeItem) || [];

    // Franchise & Season Relations (Prequels, Sequels, Side Stories, Movies, OVAs)
    const videoFormats = new Set(['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL']);
    const rawRelations = animeData?.relations?.edges || [];
    const relationsList = rawRelations
      .filter((edge: any) => edge?.node && edge?.relationType && (!edge.node.format || videoFormats.has(edge.node.format)))
      .map((edge: any) => {
        const n = edge.node;
        const titleText = n.title?.english || n.title?.romaji || 'Untitled';
        return {
          id: String(n.id),
          anilistId: n.id,
          malId: n.idMal || null,
          title: titleText,
          relationType: edge.relationType,
          format: n.format || 'TV',
          status: n.status || 'FINISHED',
          episodes: n.episodes || null,
          year: n.seasonYear || null,
          coverImage: n.coverImage?.large || n.coverImage?.medium || '',
          bannerImage: n.bannerImage || '',
        };
      });

    // Next Airing Info
    const nextAiring = animeData?.nextAiringEpisode || dbRecord?.airingSchedules?.[0] || null;

    return res.json({
      anime: {
        ...formatted,
        episodes: resolvedTotalEpisodes,
        totalEpisodes: resolvedTotalEpisodes,
        episodesList,
        characters: charactersList,
        recommendations: recs,
        relations: relationsList,
        nextAiring,
      },
    });
  } catch (error: any) {
    console.error('Details fetch error:', error);
    return res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

/**
 * Get Characters for Anime (Cached for 15 minutes)
 */
animeRouter.get('/:id/characters', cacheResponse(900), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const anilistId = parseInt(id, 10);

    const anime = await prisma.anime.findFirst({
      where: isNaN(anilistId) ? { id } : { anilistId },
      include: { characters: true },
    });

    if (!anime) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    // If no characters yet and has malId, trigger Jikan fetch
    if (anime.characters.length === 0 && anime.malId) {
      await AnimeAggregationService.enrichDbAnimeWithJikan(anime.id);
      const updated = await prisma.anime.findUnique({
        where: { id: anime.id },
        include: { characters: true },
      });
      return res.json({ characters: updated?.characters || [] });
    }

    return res.json({ characters: anime.characters });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get Episodes for Anime (Cached for 10 minutes)
 */
animeRouter.get('/:id/episodes', cacheResponse(600), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const anilistId = parseInt(id, 10);
    const forceSync = req.query.refresh === 'true';

    let anime: any = null;
    try {
      anime = await prisma.anime.findFirst({
        where: isNaN(anilistId) ? { id } : { anilistId },
        include: {
          episodes: {
            orderBy: { episodeNumber: 'asc' },
            include: { episodeStreams: true },
          },
        },
      });
    } catch (dbErr: any) {
      console.warn('[Anime Episodes] DB lookup notice:', dbErr.message);
      anime = null;
    }

    if (!anime && !isNaN(anilistId)) {
      // Fetch details from AniList directly
      try {
        const liveData = await AniListService.getDetails(anilistId);
        if (liveData) {
          try {
            anime = await prisma.anime.findUnique({
              where: { anilistId },
              include: {
                episodes: {
                  orderBy: { episodeNumber: 'asc' },
                  include: { episodeStreams: true },
                },
              },
            });
          } catch {}

          if (!anime) {
            anime = {
              id: String(liveData.id),
              anilistId: liveData.id,
              malId: liveData.idMal || null,
              titleEnglish: liveData.title?.english || liveData.title?.romaji || 'Anime',
              titleRomaji: liveData.title?.romaji || '',
              format: liveData.format || 'TV',
              totalEpisodes: liveData.episodes || 12,
              duration: liveData.duration || 24,
              coverImage: liveData.coverImage?.large || '',
              bannerImage: liveData.bannerImage || '',
              episodes: [],
            };
          }
        }
      } catch (liveErr: any) {
        console.warn('[Anime Episodes] Live AniList fetch notice:', liveErr.message);
      }
    }

    if (!anime) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    const episodes = await EpisodeMetadataService.getEpisodesForAnime(anime, {
      forceSync,
      maxCount: 200,
    });

    return res.json({ episodes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
