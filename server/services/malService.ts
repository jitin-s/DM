import axios from 'axios';

const MAL_API_BASE = 'https://api.myanimelist.net/v2';
const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID || '';

export interface MalAnimeDetails {
  id: number;
  title: string;
  main_picture?: {
    medium?: string;
    large?: string;
  };
  alternative_titles?: {
    synonyms?: string[];
    en?: string;
    ja?: string;
  };
  start_date?: string;
  end_date?: string;
  synopsis?: string;
  mean?: number;
  rank?: number;
  popularity?: number;
  num_list_users?: number;
  num_scoring_users?: number;
  nsfw?: string;
  genres?: Array<{ id: number; name: string }>;
  media_type?: string;
  status?: string;
  num_episodes?: number;
  start_season?: {
    year: number;
    season: string;
  };
  broadcast?: {
    day_of_the_week?: string;
    start_time?: string;
  };
  source?: string;
  average_episode_duration?: number;
  rating?: string;
  studios?: Array<{ id: number; name: string }>;
}

export class MalService {
  private static memoryCache = new Map<string, { data: any; expiry: number }>();
  private static readonly CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

  /**
   * Check if official MAL API is configured with Client ID
   */
  static isConfigured(): boolean {
    return Boolean(MAL_CLIENT_ID && MAL_CLIENT_ID.trim().length > 0);
  }

  /**
   * Fetch anime details directly from MyAnimeList v2 API
   */
  static async getAnimeDetails(malId: number): Promise<MalAnimeDetails | null> {
    if (!this.isConfigured() || !malId) {
      return null;
    }

    const cacheKey = `mal:details:${malId}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const response = await axios.get<MalAnimeDetails>(`${MAL_API_BASE}/anime/${malId}`, {
        headers: {
          'X-MAL-CLIENT-ID': MAL_CLIENT_ID,
        },
        params: {
          fields:
            'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,nsfw,genres,media_type,status,num_episodes,start_season,broadcast,source,average_episode_duration,rating,studios',
        },
        timeout: 5000,
      });

      if (response.data) {
        this.memoryCache.set(cacheKey, { data: response.data, expiry: Date.now() + this.CACHE_TTL_MS });
      }

      return response.data;
    } catch (error: any) {
      console.warn(`[MAL API] Failed to fetch MAL anime ID ${malId}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get official episode count from MyAnimeList
   */
  static async getOfficialEpisodeCount(malId: number): Promise<number | null> {
    const details = await this.getAnimeDetails(malId);
    if (details && typeof details.num_episodes === 'number' && details.num_episodes > 0) {
      return details.num_episodes;
    }
    return null;
  }

  /**
   * Search MyAnimeList v2
   */
  static async searchAnime(query: string, limit = 10): Promise<any[]> {
    if (!this.isConfigured() || !query) {
      return [];
    }

    const cacheKey = `mal:search:${query}:${limit}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${MAL_API_BASE}/anime`, {
        headers: {
          'X-MAL-CLIENT-ID': MAL_CLIENT_ID,
        },
        params: {
          q: query,
          limit,
          fields: 'id,title,main_picture,synopsis,mean,media_type,num_episodes',
        },
        timeout: 5000,
      });

      const items = response.data?.data?.map((d: any) => d.node) || [];
      if (items.length > 0) {
        this.memoryCache.set(cacheKey, { data: items, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return items;
    } catch (error: any) {
      console.warn(`[MAL API] Search failed for "${query}":`, error.response?.data || error.message);
      return [];
    }
  }
}
