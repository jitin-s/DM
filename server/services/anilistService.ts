import axios from 'axios';
import { prisma } from '../db';
import { AnimeAggregationService } from './animeAggregationService';

const ANILIST_API_URL = process.env.ANILIST_API_URL || 'https://graphql.anilist.co';

export interface AniListMedia {
  id: number;
  idMal?: number;
  title: {
    english?: string;
    romaji?: string;
    native?: string;
  };
  description?: string;
  coverImage?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
    color?: string;
  };
  bannerImage?: string;
  format?: string;
  status?: string;
  episodes?: number;
  duration?: number;
  season?: string;
  seasonYear?: number;
  averageScore?: number;
  popularity?: number;
  genres?: string[];
  studios?: {
    nodes?: { name: string; isAnimationStudio?: boolean }[];
  };
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
  relations?: any;
  recommendations?: any;
}

const MEDIA_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  description(asHtml: false)
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  format
  status
  episodes
  duration
  season
  seasonYear
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  averageScore
  popularity
  genres
  studios(isMain: true) {
    nodes {
      name
    }
  }
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
`;

export class AniListService {
  private static queryCache = new Map<string, { data: any; expiry: number }>();
  private static readonly CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes in-memory cache

  /**
   * Execute raw GraphQL query with axios and in-memory TTL caching
   */
  static async query(query: string, variables: Record<string, any> = {}): Promise<any> {
    const cacheKey = JSON.stringify({ query: query.trim(), variables });
    const cached = this.queryCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const response = await axios.post(
        ANILIST_API_URL,
        { query, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'DevilMotion/2.0 (AnimeStreamingPlatform; +https://devilmotion.com)',
          },
          timeout: 12000,
        }
      );

      const data = response.data?.data;
      if (data) {
        this.queryCache.set(cacheKey, { data, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return data;
    } catch (error: any) {
      // If network fails or times out, serve stale cache if available
      if (cached?.data) {
        console.warn('AniList API Error: serving stale cache:', error.message);
        return cached.data;
      }
      console.error('AniList API Error:', error.response?.data || error.message);
      throw new Error(`AniList query failed: ${error.message}`);
    }
  }

  /**
   * Fetch Trending Anime
   */
  static async getTrending(page = 1, perPage = 18): Promise<AniListMedia[]> {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    // Cache to DB in background without blocking response
    this.cacheAnimeList(items, { isTrending: true }).catch(() => {});
    return items;
  }

  /**
   * Fetch Popular Anime
   */
  static async getPopular(page = 1, perPage = 18): Promise<AniListMedia[]> {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    this.cacheAnimeList(items, { isPopular: true }).catch(() => {});
    return items;
  }

  /**
   * Fetch Top-Rated Masterpieces
   */
  static async getTopRated(page = 1, perPage = 18): Promise<AniListMedia[]> {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: [SCORE_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    this.cacheAnimeList(items, { isTopRated: true }).catch(() => {});
    return items;
  }

  /**
   * Fetch Currently Airing & Recently Updated
   */
  static async getCurrentlyAiring(page = 1, perPage = 18): Promise<AniListMedia[]> {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, status: RELEASING, sort: [UPDATED_AT_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    this.cacheAnimeList(items).catch(() => {});
    return items;
  }

  /**
   * Fetch Upcoming Releases
   */
  static async getUpcoming(page = 1, perPage = 18): Promise<AniListMedia[]> {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    this.cacheAnimeList(items).catch(() => {});
    return items;
  }

  /**
   * Fetch Anime Movies with sorting, pagination, and genre support
   */
  static async getMovies(
    page = 1,
    perPage = 24,
    sort?: string,
    genre?: string
  ): Promise<{ items: AniListMedia[]; total: number; hasNextPage: boolean }> {
    let sortOption = 'POPULARITY_DESC';
    if (sort === 'rating') sortOption = 'SCORE_DESC';
    else if (sort === 'newest') sortOption = 'START_DATE_DESC';
    else if (sort === 'title') sortOption = 'TITLE_ENGLISH_DESC';
    else if (sort === 'popular') sortOption = 'POPULARITY_DESC';

    const gql = `
      query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            hasNextPage
          }
          media(type: ANIME, format: MOVIE, sort: $sort, genre: $genre, isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, {
      page,
      perPage,
      sort: [sortOption],
      genre: genre && genre !== 'ALL' ? genre : undefined,
    });
    const items = data?.Page?.media || [];
    const total = data?.Page?.pageInfo?.total || items.length;
    const hasNextPage = Boolean(data?.Page?.pageInfo?.hasNextPage);
    this.cacheAnimeList(items).catch(() => {});
    return { items, total, hasNextPage };
  }

  /**
   * Fetch Anime By Genre with sorting and pagination
   */
  static async getByGenre(
    genre: string,
    page = 1,
    perPage = 24,
    sort?: string
  ): Promise<{ items: AniListMedia[]; total: number; hasNextPage: boolean }> {
    let sortOption = 'POPULARITY_DESC';
    if (sort === 'rating') sortOption = 'SCORE_DESC';
    else if (sort === 'newest') sortOption = 'START_DATE_DESC';
    else if (sort === 'title') sortOption = 'TITLE_ENGLISH_DESC';
    else if (sort === 'popular') sortOption = 'POPULARITY_DESC';

    const gql = `
      query ($page: Int, $perPage: Int, $genre: String, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            hasNextPage
          }
          media(type: ANIME, genre: $genre, sort: $sort, isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, {
      page,
      perPage,
      genre: genre && genre !== 'ALL' ? genre : undefined,
      sort: [sortOption],
    });
    const items = data?.Page?.media || [];
    const total = data?.Page?.pageInfo?.total || items.length;
    const hasNextPage = Boolean(data?.Page?.pageInfo?.hasNextPage);
    this.cacheAnimeList(items).catch(() => {});
    return { items, total, hasNextPage };
  }

  /**
   * Fetch Dubbed Anime (Hindi / English spotlight collections)
   */
  static async getDubbedCollection(language: 'hindi' | 'english', page = 1, perPage = 18): Promise<AniListMedia[]> {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    const flags = language === 'hindi' ? { isHindiDubbed: true } : { isEnglishDubbed: true };
    this.cacheAnimeList(items, flags).catch(() => {});
    return items;
  }

  /**
   * Search Anime with full filters
   */
  static async search(params: {
    query?: string;
    genre?: string;
    format?: string;
    status?: string;
    year?: number;
    season?: string;
    sort?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: AniListMedia[]; total: number; hasNextPage: boolean }> {
    const {
      query,
      genre,
      format,
      status,
      year,
      season,
      sort,
      page = 1,
      perPage = 20,
    } = params;

    let sortOption: string | undefined = undefined;
    if (sort === 'trending') sortOption = 'TRENDING_DESC';
    else if (sort === 'rating') sortOption = 'SCORE_DESC';
    else if (sort === 'newest') sortOption = 'START_DATE_DESC';
    else if (sort === 'title') sortOption = 'TITLE_ENGLISH_DESC';
    else if (sort === 'popularity') sortOption = 'POPULARITY_DESC';
    else if (!query?.trim()) sortOption = 'POPULARITY_DESC';

    const gql = `
      query ($page: Int, $perPage: Int, $search: String, $genre: String, $format: MediaFormat, $status: MediaStatus, $seasonYear: Int, $season: MediaSeason, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            hasNextPage
          }
          media(
            type: ANIME,
            search: $search,
            genre: $genre,
            format: $format,
            status: $status,
            seasonYear: $seasonYear,
            season: $season,
            sort: $sort,
            isAdult: false
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;

    const variables: Record<string, any> = {
      page,
      perPage,
    };

    if (sortOption) variables.sort = [sortOption];

    if (query?.trim()) variables.search = query.trim();
    if (genre && genre !== 'ALL') variables.genre = genre;
    if (format && format !== 'ALL') variables.format = format;
    if (status && status !== 'ALL') variables.status = status;
    if (year && !isNaN(year)) variables.seasonYear = year;
    if (season && season !== 'ALL') variables.season = season;

    const data = await this.query(gql, variables);
    const items = data?.Page?.media || [];
    const total = data?.Page?.pageInfo?.total || items.length;
    const hasNextPage = data?.Page?.pageInfo?.hasNextPage || false;

    this.cacheAnimeList(items).catch(() => {});

    return { items, total, hasNextPage };
  }

  /**
   * Fetch Single Anime Full Details
   */
  static async getDetails(id: number): Promise<any> {
    const gql = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${MEDIA_FIELDS}
          relations {
            edges {
              relationType
              node {
                id
                idMal
                title {
                  english
                  romaji
                }
                format
                coverImage {
                  large
                }
              }
            }
          }
          recommendations(perPage: 8, sort: RATING_DESC) {
            nodes {
              mediaRecommendation {
                id
                idMal
                title {
                  english
                  romaji
                }
                format
                coverImage {
                  large
                }
                averageScore
              }
            }
          }
        }
      }
    `;

    const data = await this.query(gql, { id });
    const media = data?.Media;
    if (media) {
      try {
        await AnimeAggregationService.ingestAndNormalize(media, { enrichWithJikan: false });
        if (media.idMal) {
          AnimeAggregationService.enrichDbAnimeWithJikan(media.id).catch(() => {});
        }
      } catch (ingestErr: any) {
        console.warn('[AniList] Ingestion to DB notice:', ingestErr.message);
      }
    }
    return media;
  }

  /**
   * Fetch Single Anime Full Details by MyAnimeList ID
   */
  static async getDetailsByMalId(idMal: number): Promise<any> {
    const gql = `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          ${MEDIA_FIELDS}
          relations {
            edges {
              relationType
              node {
                id
                idMal
                title {
                  english
                  romaji
                }
                format
                coverImage {
                  large
                }
              }
            }
          }
          recommendations(perPage: 8, sort: RATING_DESC) {
            nodes {
              mediaRecommendation {
                id
                idMal
                title {
                  english
                  romaji
                }
                format
                coverImage {
                  large
                }
                averageScore
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.query(gql, { idMal });
      const media = data?.Media;
      if (media) {
        try {
          await AnimeAggregationService.ingestAndNormalize(media, { enrichWithJikan: false });
          if (media.idMal) {
            AnimeAggregationService.enrichDbAnimeWithJikan(media.id).catch(() => {});
          }
        } catch (ingestErr: any) {
          console.warn('[AniList] Ingestion to DB notice:', ingestErr.message);
        }
      }
      return media;
    } catch (err: any) {
      console.warn(`[AniList] getDetailsByMalId failed for MAL ID ${idMal}:`, err.message);
      return null;
    }
  }

  /**
   * Fetch Weekly Airing Schedule (Fetches up to 100 entries across the full week)
   */
  static async getWeeklySchedule(startTimestamp: number, endTimestamp: number): Promise<any[]> {
    const gql = `
      query ($start: Int, $end: Int, $page: Int) {
        Page(page: $page, perPage: 50) {
          pageInfo {
            hasNextPage
          }
          airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
            id
            airingAt
            episode
            timeUntilAiring
            media {
              id
              idMal
              title {
                english
                romaji
                native
              }
              coverImage {
                large
              }
              format
              genres
              description(asHtml: false)
            }
          }
        }
      }
    `;

    try {
      const data1 = await this.query(gql, { start: startTimestamp, end: endTimestamp, page: 1 });
      let schedules = data1?.Page?.airingSchedules || [];
      if (data1?.Page?.pageInfo?.hasNextPage) {
        try {
          const data2 = await this.query(gql, { start: startTimestamp, end: endTimestamp, page: 2 });
          if (data2?.Page?.airingSchedules && data2.Page.airingSchedules.length > 0) {
            schedules = schedules.concat(data2.Page.airingSchedules);
          }
        } catch {
          // If page 2 fails, still return page 1
        }
      }
      return schedules;
    } catch (err: any) {
      console.warn('[AniList] getWeeklySchedule failed:', err.message);
      return [];
    }
  }

  /**
   * Upsert Anime into local SQLite Database Cache
   */
  static async cacheAnimeList(
    items: AniListMedia[],
    extraFlags: {
      isTrending?: boolean;
      isPopular?: boolean;
      isTopRated?: boolean;
      isHindiDubbed?: boolean;
      isEnglishDubbed?: boolean;
    } = {}
  ): Promise<void> {
    for (const item of items) {
      if (!item.id) continue;
      try {
        await AnimeAggregationService.ingestAndNormalize(item, { flags: extraFlags, enrichWithJikan: false });
      } catch {
        // continue gracefully
      }
    }
  }
}
