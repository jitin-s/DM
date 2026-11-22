import { prisma } from '../db';
import { JikanService } from './jikanService';
import { KitsuService } from './kitsuService';
import { MalService } from './malService';

export interface FormattedEpisode {
  id: string;
  number: number;
  title: string;
  japaneseTitle: string | null;
  hasRealTitle: boolean;
  isGenericTitle: boolean;
  thumbnail: string;
  duration: string;
  airDate: string;
  filler: boolean;
  recap: boolean;
  metadataSource: string;
  subAvailable: boolean;
  dubAvailable: boolean;
}

export class EpisodeMetadataService {
  /**
   * Resolve episodes for an anime: checks local DB, enriches with MAL/Jikan/Kitsu if needed
   */
  static async getEpisodesForAnime(
    anime: {
      id: string;
      anilistId: number;
      malId?: number | null;
      titleEnglish: string;
      titleRomaji: string;
      format?: string | null;
      totalEpisodes?: number | null;
      duration?: number | null;
      coverImage?: string | null;
      bannerImage?: string | null;
    },
    options: { forceSync?: boolean; maxCount?: number } = {}
  ): Promise<FormattedEpisode[]> {
    const { forceSync = false, maxCount = 100 } = options;

    // 1. Check existing episodes in database
    const dbEpisodes = await prisma.episode.findMany({
      where: { animeId: anime.id },
      orderBy: { episodeNumber: 'asc' },
      include: { episodeStreams: true },
    });

    const hasRealTitlesInDb = dbEpisodes.some(
      ep =>
        ep.episodeTitle &&
        !ep.episodeTitle.toLowerCase().match(/^episode\s+\d+$/i) &&
        (ep.metadataSource === 'JIKAN' || ep.metadataSource === 'KITSU' || ep.metadataSource === 'MAL')
    );

    // If we have verified real episodes in DB and not forcing sync, format and return immediately
    if (dbEpisodes.length > 0 && hasRealTitlesInDb && !forceSync) {
      return this.formatDbEpisodes(dbEpisodes, anime);
    }

    // 2. Determine target episode count
    // Use MAL official count if available, otherwise fallback to anime.totalEpisodes or dbEpisodes.length
    let officialMalCount: number | null = null;
    if (anime.malId && MalService.isConfigured()) {
      try {
        officialMalCount = await MalService.getOfficialEpisodeCount(anime.malId);
      } catch {}
    }

    const totalCount =
      officialMalCount ||
      (typeof anime.totalEpisodes === 'number' && anime.totalEpisodes > 0 ? anime.totalEpisodes : null) ||
      (dbEpisodes.length > 0 ? dbEpisodes.length : null) ||
      (anime.format === 'MOVIE' ? 1 : 12);

    // If DB already has records and no external fetch needed, return DB formatted
    if (dbEpisodes.length >= totalCount && hasRealTitlesInDb && !forceSync) {
      return this.formatDbEpisodes(dbEpisodes, anime);
    }

    // 3. Attempt enrichment from Jikan / Kitsu
    const enrichmentData = await this.fetchExternalEpisodes(anime, totalCount);

    if (enrichmentData.length > 0) {
      // Upsert episodes into SQLite
      const upserted = await this.persistEpisodes(anime.id, enrichmentData, anime);
      return this.formatDbEpisodes(upserted, anime);
    }

    // 4. If DB already has some episodes, return them
    if (dbEpisodes.length > 0) {
      return this.formatDbEpisodes(dbEpisodes, anime);
    }

    // 5. Fallback: generate clean, honest numbered entries clearly tagged as Title TBA / Unreleased
    return this.generateFallbackEpisodes(anime, totalCount, maxCount);
  }

  /**
   * Fetch episode titles and air dates from Jikan (primary) with Kitsu fallback
   */
  private static async fetchExternalEpisodes(
    anime: {
      id: string;
      malId?: number | null;
      titleEnglish: string;
      titleRomaji: string;
      format?: string | null;
    },
    targetCount: number
  ): Promise<
    Array<{
      episodeNumber: number;
      title: string | null;
      japaneseTitle: string | null;
      airDate: Date | null;
      filler: boolean;
      recap: boolean;
      source: 'JIKAN' | 'KITSU' | 'MAL';
    }>
  > {
    const results: Array<{
      episodeNumber: number;
      title: string | null;
      japaneseTitle: string | null;
      airDate: Date | null;
      filler: boolean;
      recap: boolean;
      source: 'JIKAN' | 'KITSU' | 'MAL';
    }> = [];

    // Attempt Jikan if malId is present
    if (anime.malId) {
      try {
        const jikanEpisodes = await JikanService.getAnimeEpisodes(anime.malId, 1);
        if (Array.isArray(jikanEpisodes) && jikanEpisodes.length > 0) {
          for (const ep of jikanEpisodes) {
            results.push({
              episodeNumber: ep.mal_id,
              title: ep.title && !ep.title.toLowerCase().match(/^episode\s+\d+$/i) ? ep.title : null,
              japaneseTitle: ep.title_japanese || null,
              airDate: ep.aired ? new Date(ep.aired) : null,
              filler: Boolean(ep.filler),
              recap: Boolean(ep.recap),
              source: 'JIKAN',
            });
          }
          if (results.some(r => r.title !== null)) {
            return results;
          }
        }
      } catch (err: any) {
        console.warn(`[EpisodeService] Jikan episodes fetch failed for MAL ID ${anime.malId}:`, err.message);
      }
    }

    // Fallback to Kitsu API
    try {
      const searchTitle = anime.titleEnglish || anime.titleRomaji;
      const kitsuId = await KitsuService.searchAnime(searchTitle);
      if (kitsuId) {
        const kitsuEpisodes = await KitsuService.getEpisodes(kitsuId, Math.min(targetCount, 100));
        if (Array.isArray(kitsuEpisodes) && kitsuEpisodes.length > 0) {
          for (const ep of kitsuEpisodes) {
            results.push({
              episodeNumber: ep.number,
              title: ep.title && !ep.title.toLowerCase().match(/^episode\s+\d+$/i) ? ep.title : null,
              japaneseTitle: ep.japaneseTitle || null,
              airDate: ep.airDate ? new Date(ep.airDate) : null,
              filler: false,
              recap: false,
              source: 'KITSU',
            });
          }
          return results;
        }
      }
    } catch (kitsuErr: any) {
      console.warn(`[EpisodeService] Kitsu fallback failed for ${anime.titleEnglish}:`, kitsuErr.message);
    }

    return results;
  }

  /**
   * Persist enriched episodes to SQLite
   */
  private static async persistEpisodes(
    animeId: string,
    episodes: Array<{
      episodeNumber: number;
      title: string | null;
      japaneseTitle: string | null;
      airDate: Date | null;
      filler: boolean;
      recap: boolean;
      source: string;
    }>,
    anime: { coverImage?: string | null; bannerImage?: string | null; format?: string | null; titleEnglish?: string }
  ) {
    const defaultThumbnail = anime.bannerImage || anime.coverImage || null;

    for (const ep of episodes) {
      let finalTitle = ep.title;
      if (!finalTitle && anime.format === 'MOVIE') {
        finalTitle = `${anime.titleEnglish || 'Movie'} (Feature Film)`;
      }

      await prisma.episode.upsert({
        where: {
          animeId_episodeNumber: {
            animeId,
            episodeNumber: ep.episodeNumber,
          },
        },
        update: {
          episodeTitle: finalTitle,
          japaneseTitle: ep.japaneseTitle,
          airedAt: ep.airDate,
          filler: ep.filler,
          recap: ep.recap,
          metadataSource: ep.source,
          metadataStatus: finalTitle ? 'AVAILABLE' : 'PENDING',
          thumbnail: defaultThumbnail,
          thumbnailUrl: defaultThumbnail,
        },
        create: {
          animeId,
          episodeNumber: ep.episodeNumber,
          episodeTitle: finalTitle,
          japaneseTitle: ep.japaneseTitle,
          airedAt: ep.airDate,
          filler: ep.filler,
          recap: ep.recap,
          metadataSource: ep.source,
          metadataStatus: finalTitle ? 'AVAILABLE' : 'PENDING',
          thumbnail: defaultThumbnail,
          thumbnailUrl: defaultThumbnail,
        },
      });
    }

    return prisma.episode.findMany({
      where: { animeId },
      orderBy: { episodeNumber: 'asc' },
    });
  }

  /**
   * Format DB records into clean API output
   */
  private static formatDbEpisodes(
    dbEpisodes: any[],
    anime: { duration?: number | null; coverImage?: string | null; bannerImage?: string | null; format?: string | null }
  ): FormattedEpisode[] {
    const fallbackThumb = anime.bannerImage || anime.coverImage || '/logo_cropped.png';

    return dbEpisodes.map(ep => {
      const isGeneric =
        !ep.episodeTitle || Boolean(ep.episodeTitle.toLowerCase().match(/^episode\s+\d+$/i));
      const hasRealTitle = !isGeneric;
      const displayTitle = ep.episodeTitle || `Episode ${ep.episodeNumber}`;

      let airDateFormatted = 'TBA';
      if (ep.airedAt) {
        airDateFormatted = new Date(ep.airedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } else if (ep.releaseDate && ep.releaseDate !== 'HD Available') {
        airDateFormatted = ep.releaseDate;
      }

      return {
        id: ep.id,
        number: ep.episodeNumber,
        title: displayTitle,
        japaneseTitle: ep.japaneseTitle || null,
        hasRealTitle,
        isGenericTitle: isGeneric,
        thumbnail: ep.thumbnail || ep.thumbnailUrl || fallbackThumb,
        duration: `${anime.duration || 24}m`,
        airDate: airDateFormatted,
        filler: Boolean(ep.filler),
        recap: Boolean(ep.recap),
        metadataSource: ep.metadataSource || 'ANILIST',
        subAvailable: true,
        dubAvailable: true,
      };
    });
  }

  /**
   * Generate honest, clearly tagged fallback episodes
   */
  private static generateFallbackEpisodes(
    anime: {
      id: string;
      duration?: number | null;
      coverImage?: string | null;
      bannerImage?: string | null;
      format?: string | null;
      titleEnglish?: string;
    },
    count: number,
    maxCount: number
  ): FormattedEpisode[] {
    const fallbackThumb = anime.bannerImage || anime.coverImage || '/logo_cropped.png';
    const totalToGenerate = Math.min(count, maxCount);
    const episodes: FormattedEpisode[] = [];

    const isMovie = anime.format === 'MOVIE';

    for (let ep = 1; ep <= totalToGenerate; ep++) {
      const title = isMovie ? `${anime.titleEnglish || 'Movie'} (Feature Film)` : `Episode ${ep}`;
      episodes.push({
        id: `ep-${anime.id}-${ep}`,
        number: ep,
        title,
        japaneseTitle: null,
        hasRealTitle: isMovie,
        isGenericTitle: !isMovie,
        thumbnail: fallbackThumb,
        duration: isMovie ? `${anime.duration || 110}m` : `${anime.duration || 24}m`,
        airDate: 'TBA',
        filler: false,
        recap: false,
        metadataSource: 'PLACEHOLDER',
        subAvailable: true,
        dubAvailable: true,
      });
    }

    return episodes;
  }
}
