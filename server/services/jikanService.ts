import axios from 'axios';
import { prisma } from '../db';

const JIKAN_BASE_URL = process.env.JIKAN_BASE_URL || 'https://api.jikan.moe/v4';

interface QueuedRequest {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export class JikanService {
  private static requestQueue: QueuedRequest[] = [];
  private static isProcessingQueue = false;
  private static lastRequestTimestamp = 0;
  private static readonly MIN_INTERVAL_MS = 360; // Max ~2.7 requests per second to stay safely under Jikan's 3 req/sec limit
  private static memoryCache = new Map<string, { data: any; expiry: number }>();
  private static readonly CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

  /**
   * Enqueue a request to respect Jikan's strict rate limits
   */
  private static async enqueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ fn: requestFn, resolve, reject });
      this.processQueue();
    });
  }

  private static async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastRequestTimestamp;
      if (elapsed < this.MIN_INTERVAL_MS) {
        await new Promise(r => setTimeout(r, this.MIN_INTERVAL_MS - elapsed));
      }

      const item = this.requestQueue.shift();
      if (!item) break;

      this.lastRequestTimestamp = Date.now();

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error: any) {
        // If 429 Too Many Requests, wait and retry once
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '2', 10);
          console.warn(`[Jikan] Rate limited (429). Backing off for ${retryAfter}s...`);
          await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
          try {
            const retryResult = await item.fn();
            item.resolve(retryResult);
          } catch (retryErr) {
            item.reject(retryErr);
          }
        } else {
          item.reject(error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Fetch full anime metadata by MyAnimeList ID
   */
  static async getAnimeFull(malId: number): Promise<any> {
    const cacheKey = `jikan:anime:${malId}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const data = await this.enqueue(async () => {
        const res = await axios.get(`${JIKAN_BASE_URL}/anime/${malId}/full`, {
          timeout: 3500,
        });
        return res.data?.data;
      });

      if (data) {
        this.memoryCache.set(cacheKey, { data, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return data;
    } catch (err: any) {
      console.warn(`[Jikan] Failed to fetch anime full for MAL ID ${malId}:`, err.message);
      return null;
    }
  }

  /**
   * Fetch episodes list with titles, Japanese titles, and filler flags
   */
  static async getAnimeEpisodes(malId: number, page = 1): Promise<any[]> {
    const cacheKey = `jikan:episodes:${malId}:p${page}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const data = await this.enqueue(async () => {
        const res = await axios.get(`${JIKAN_BASE_URL}/anime/${malId}/episodes?page=${page}`, {
          timeout: 3500,
        });
        return res.data?.data || [];
      });

      if (data) {
        this.memoryCache.set(cacheKey, { data, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return data;
    } catch (err: any) {
      console.warn(`[Jikan] Failed to fetch episodes for MAL ID ${malId}:`, err.message);
      return [];
    }
  }

  /**
   * Fetch characters & voice actors
   */
  static async getAnimeCharacters(malId: number): Promise<any[]> {
    const cacheKey = `jikan:characters:${malId}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const data = await this.enqueue(async () => {
        const res = await axios.get(`${JIKAN_BASE_URL}/anime/${malId}/characters`, {
          timeout: 3500,
        });
        return res.data?.data || [];
      });

      if (data) {
        this.memoryCache.set(cacheKey, { data, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return data;
    } catch (err: any) {
      console.warn(`[Jikan] Failed to fetch characters for MAL ID ${malId}:`, err.message);
      return [];
    }
  }

  /**
   * Search MAL via Jikan
   */
  static async searchAnime(query: string, limit = 5): Promise<any[]> {
    try {
      const data = await this.enqueue(async () => {
        const res = await axios.get(`${JIKAN_BASE_URL}/anime`, {
          params: { q: query, limit, sfw: true },
          timeout: 3500,
        });
        return res.data?.data || [];
      });
      return data;
    } catch (err: any) {
      console.warn(`[Jikan] Search failed for query "${query}":`, err.message);
      return [];
    }
  }
}
