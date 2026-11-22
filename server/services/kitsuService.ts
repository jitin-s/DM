import axios from 'axios';

const KITSU_API_BASE = 'https://kitsu.io/api/edge';

export interface KitsuEpisode {
  number: number;
  title: string | null;
  japaneseTitle: string | null;
  airDate: string | null;
  synopsis: string | null;
}

export class KitsuService {
  private static memoryCache = new Map<string, { data: any; expiry: number }>();
  private static readonly CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

  /**
   * Search for anime on Kitsu to get its Kitsu ID
   */
  static async searchAnime(query: string): Promise<string | null> {
    const cleanQuery = query.trim().toLowerCase();
    const cacheKey = `kitsu:search:${cleanQuery}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${KITSU_API_BASE}/anime`, {
        params: {
          'filter[text]': query,
          'page[limit]': 1,
        },
        timeout: 8000,
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
      });

      const firstItem = response.data?.data?.[0];
      const id = firstItem ? String(firstItem.id) : null;
      if (id) {
        this.memoryCache.set(cacheKey, { data: id, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return id;
    } catch (err: any) {
      console.warn(`[Kitsu] Search failed for "${query}":`, err.message);
      return null;
    }
  }

  /**
   * Fetch episode titles, air dates, and synopsis from Kitsu (paginated with max page limit of 20)
   */
  static async getEpisodes(kitsuId: string, limit = 100): Promise<KitsuEpisode[]> {
    const cacheKey = `kitsu:episodes:${kitsuId}:${limit}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const allEpisodes: KitsuEpisode[] = [];
      const pageSize = 20; // Kitsu strictly caps page[limit] at 20
      const pagesToFetch = Math.ceil(Math.min(limit, 100) / pageSize);

      for (let p = 0; p < pagesToFetch; p++) {
        const response = await axios.get(`${KITSU_API_BASE}/anime/${kitsuId}/episodes`, {
          params: {
            'page[limit]': pageSize,
            'page[offset]': p * pageSize,
            sort: 'number',
          },
          timeout: 8000,
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          },
        });

        const items = response.data?.data || [];
        if (items.length === 0) break;

        for (const item of items) {
          const attrs = item.attributes || {};
          allEpisodes.push({
            number: attrs.number,
            title: attrs.canonicalTitle || attrs.titles?.en || attrs.titles?.en_us || attrs.titles?.en_jp || null,
            japaneseTitle: attrs.titles?.ja_jp || null,
            airDate: attrs.airdate || null,
            synopsis: attrs.synopsis || null,
          });
        }

        if (items.length < pageSize) break;
      }

      if (allEpisodes.length > 0) {
        this.memoryCache.set(cacheKey, { data: allEpisodes, expiry: Date.now() + this.CACHE_TTL_MS });
      }

      return allEpisodes;
    } catch (err: any) {
      console.warn(`[Kitsu] Failed to fetch episodes for Kitsu ID ${kitsuId}:`, err.message);
      return [];
    }
  }
}
