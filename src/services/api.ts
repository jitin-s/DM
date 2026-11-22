import { AnimeItem, AnimeCharacter } from '../types/anime';

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('devilmotion_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// High-Performance In-Memory Client Cache & Request Deduplication
const inFlightRequests = new Map<string, Promise<any>>();
const clientCache = new Map<string, { data: any; expiresAt: number }>();

async function cachedFetchJson<T>(url: string, ttlSeconds = 60): Promise<T> {
  const now = Date.now();
  const cached = clientCache.get(url);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  // Deduplicate simultaneous identical requests
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      clientCache.set(url, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
      return data;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, promise);
  return promise;
}

export const api = {
  // --- ANIME QUERIES ---
  async getTrending(page = 1, perPage = 18): Promise<AnimeItem[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/trending?page=${page}&perPage=${perPage}`, 180);
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.warn('Failed to fetch trending anime, returning empty list:', err);
      return [];
    }
  },

  async getPopular(page = 1, perPage = 18): Promise<AnimeItem[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/popular?page=${page}&perPage=${perPage}`, 180);
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.warn('Failed to fetch popular anime, returning empty list:', err);
      return [];
    }
  },

  async getTopRated(page = 1, perPage = 18): Promise<AnimeItem[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/top-rated?page=${page}&perPage=${perPage}`, 180);
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.warn('Failed to fetch top-rated anime, returning empty list:', err);
      return [];
    }
  },

  async getAiring(page = 1, perPage = 18): Promise<AnimeItem[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/airing?page=${page}&perPage=${perPage}`, 120);
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.warn('Failed to fetch airing anime, returning empty list:', err);
      return [];
    }
  },

  async getUpcoming(page = 1, perPage = 18): Promise<AnimeItem[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/upcoming?page=${page}&perPage=${perPage}`, 300);
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.warn('Failed to fetch upcoming anime, returning empty list:', err);
      return [];
    }
  },

  async getMovies(
    page = 1,
    perPage = 24,
    sort = 'popular',
    genre?: string
  ): Promise<{ items: AnimeItem[]; total: number; hasNextPage: boolean }> {
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
        sort,
      });
      if (genre && genre !== 'ALL') queryParams.set('genre', genre);
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/movies?${queryParams.toString()}`, 300);
      return {
        items: Array.isArray(data.items) ? data.items : [],
        total: data.total || 0,
        hasNextPage: Boolean(data.hasNextPage),
      };
    } catch (err) {
      console.warn('Failed to fetch movies, returning empty list:', err);
      return { items: [], total: 0, hasNextPage: false };
    }
  },

  async getHindiDubbed(page = 1, perPage = 18): Promise<AnimeItem[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/dubbed/hindi?page=${page}&perPage=${perPage}`, 300);
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.warn('Failed to fetch Hindi dubbed anime, returning empty list:', err);
      return [];
    }
  },

  async getEnglishDubbed(page = 1, perPage = 18): Promise<AnimeItem[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/dubbed/english?page=${page}&perPage=${perPage}`, 300);
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.warn('Failed to fetch English dubbed anime, returning empty list:', err);
      return [];
    }
  },

  async getByGenre(
    genre: string,
    page = 1,
    perPage = 24,
    sort = 'popular'
  ): Promise<{ items: AnimeItem[]; total: number; hasNextPage: boolean }> {
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
        sort,
      });
      const data = await cachedFetchJson<any>(
        `${API_BASE}/anime/genre/${encodeURIComponent(genre)}?${queryParams.toString()}`,
        180
      );
      return {
        items: Array.isArray(data.items) ? data.items : [],
        total: data.total || 0,
        hasNextPage: Boolean(data.hasNextPage),
      };
    } catch (err) {
      console.warn(`Failed to fetch anime for genre ${genre}:`, err);
      return { items: [], total: 0, hasNextPage: false };
    }
  },

  async searchAnime(params: {
    q?: string;
    genre?: string;
    format?: string;
    status?: string;
    year?: number;
    season?: string;
    sort?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: AnimeItem[]; total: number; hasNextPage: boolean }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.q) queryParams.set('q', params.q);
      if (params.genre) queryParams.set('genre', params.genre);
      if (params.format) queryParams.set('format', params.format);
      if (params.status) queryParams.set('status', params.status);
      if (params.year) queryParams.set('year', params.year.toString());
      if (params.season) queryParams.set('season', params.season);
      if (params.sort) queryParams.set('sort', params.sort);
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.perPage) queryParams.set('perPage', params.perPage.toString());

      const data = await cachedFetchJson<any>(`${API_BASE}/anime/search?${queryParams.toString()}`, 60);
      return {
        items: Array.isArray(data.items) ? data.items : [],
        total: data.total || 0,
        hasNextPage: data.hasNextPage || false,
      };
    } catch (err) {
      console.warn('Failed to search anime:', err);
      return { items: [], total: 0, hasNextPage: false };
    }
  },

  async getAnimeDetails(id: string): Promise<AnimeItem | null> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/${encodeURIComponent(id)}`, 300);
      return data.anime || null;
    } catch (err: any) {
      console.warn(`Failed to fetch details for anime ${id}:`, err);
      throw err;
    }
  },

  async getAnimeCharacters(id: string): Promise<AnimeCharacter[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/${id}/characters`, 300);
      return Array.isArray(data.characters) ? data.characters : [];
    } catch {
      return [];
    }
  },

  async getAnimeEpisodes(id: string): Promise<any[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/${id}/episodes`, 180);
      return Array.isArray(data.episodes) ? data.episodes : [];
    } catch {
      return [];
    }
  },

  async getSchedule(): Promise<any[]> {
    try {
      const data = await cachedFetchJson<any>(`${API_BASE}/anime/schedule`, 300);
      return Array.isArray(data.schedules) ? data.schedules : [];
    } catch (err) {
      console.warn('Failed to fetch airing schedule:', err);
      return [];
    }
  },

  // --- STREAM RESOLUTION (VidWave Integration) ---
  async getStreamAvailability(animeId: string): Promise<{
    animeId: string;
    anilistId: number;
    availableAudios: ('sub' | 'dub' | 'hindi')[];
    hasHindi: boolean;
    hasDub: boolean;
    hasSub: boolean;
  }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/stream/${animeId}/availability`);
      if (!res.ok) throw new Error('Availability check failed');
      return await res.json();
    } catch {
      return {
        animeId,
        anilistId: parseInt(animeId, 10) || 16498,
        availableAudios: ['sub', 'dub'],
        hasHindi: false,
        hasDub: true,
        hasSub: true,
      };
    }
  },

  async getStream(
    animeId: string,
    episodeNumber: number,
    audio: 'sub' | 'dub' | 'hindi' = 'sub',
    server?: string,
    time?: number
  ) {
    try {
      const query = new URLSearchParams({ audio });
      if (server) query.set('server', server);
      if (time && time > 0) query.set('time', Math.floor(time).toString());

      const res = await fetchWithTimeout(`${API_BASE}/stream/${animeId}/${episodeNumber}?${query.toString()}`);
      if (!res.ok) throw new Error('Stream lookup failed');
      return await res.json();
    } catch (err: any) {
      // Fallback direct to VidWave
      const isHindi = audio === 'hindi';
      const anilistId = parseInt(animeId, 10) || 16498;
      const fallbackUrl = isHindi
        ? `https://embed.vidwave.sbs/anime/hindi/${anilistId}/${episodeNumber}?server=main&autoplay=1&autoSkipIntro=1&skipSec=85`
        : `https://embed.vidwave.sbs/kai/anilist/${anilistId}/${episodeNumber}/${audio}?autoplay=1&autonext=1&skipSec=85`;

      return {
        stream: {
          available: true,
          embedUrl: fallbackUrl,
          provider: isHindi ? 'DevilMotion Hindi Player' : 'DevilMotion Player',
          audio,
          availableAudios: isHindi ? ['sub', 'dub', 'hindi'] : ['sub', 'dub'],
          currentServer: isHindi ? 'hindi-main' : 'kai-anilist',
          servers: isHindi
            ? [
                { id: 'hindi-main', name: 'DevilMotion Hindi Server 1', provider: 'HINDI', isDefault: true },
                { id: 'hindi-backup', name: 'DevilMotion Hindi Mirror', provider: 'HINDI' },
              ]
            : [
                { id: 'kai-anilist', name: 'DevilMotion HD (Auto)', provider: 'KAI', isDefault: true },
                { id: 'kai-hd', name: 'DevilMotion 1080p Ultra HD', provider: 'KAI' },
              ],
          iframeOptions: {
            allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            referrerPolicy: 'strict-origin-when-cross-origin',
          },
          metadata: {
            anilistId,
            malId: null,
            episodeNumber,
          },
        },
        servers: isHindi
          ? [
              { id: 'hindi-main', name: 'DevilMotion Hindi Server 1', provider: 'HINDI' },
              { id: 'hindi-backup', name: 'DevilMotion Hindi Mirror', provider: 'HINDI' },
            ]
          : [
              { id: 'kai-anilist', name: 'DevilMotion HD (Auto)', provider: 'KAI' },
              { id: 'kai-hd', name: 'DevilMotion 1080p Ultra HD', provider: 'KAI' },
            ],
        iframeOptions: {
          allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          referrerPolicy: 'strict-origin-when-cross-origin',
        },
      };
    }
  },

  // --- USER WATCHLIST & HISTORY (Stored in localStorage client-side) ---
  async getUserWatchlist(): Promise<AnimeItem[]> {
    return [];
  },

  async addToUserWatchlist(_animeId: string) {
    // Client-side state managed in WatchlistContext / localStorage
  },

  async removeFromUserWatchlist(_animeId: string) {
    // Client-side state managed in WatchlistContext / localStorage
  },

  async getUserHistory() {
    return [];
  },

  async saveUserHistory(_params: {
    animeId: string;
    episodeNumber: number;
    progressSeconds: number;
    durationSeconds: number;
    completed: boolean;
  }) {
    // Client-side playback history managed in localStorage
  },

  // --- ADMIN DASHBOARD ---
  async getAdminStats() {
    const res = await fetchWithTimeout(`${API_BASE}/admin/stats`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Unauthorized or failed to load stats');
    return await res.json();
  },

  async triggerAniListSync() {
    const res = await fetchWithTimeout(`${API_BASE}/admin/sync/anilist`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async triggerAnikotoSync() {
    const res = await fetchWithTimeout(`${API_BASE}/admin/sync/anikoto`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async triggerJikanSync() {
    const res = await fetchWithTimeout(`${API_BASE}/admin/sync/jikan`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async triggerScheduleSync() {
    const res = await fetchWithTimeout(`${API_BASE}/admin/sync/schedule`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async getAdminSyncLogs() {
    const res = await fetchWithTimeout(`${API_BASE}/admin/sync-logs`, { headers: getAuthHeaders() });
    return await res.json();
  },

  async getAdminMappings() {
    const res = await fetchWithTimeout(`${API_BASE}/admin/mappings`, { headers: getAuthHeaders() });
    return await res.json();
  },

  async toggleProvider(providerId: string, enabled: boolean) {
    const res = await fetchWithTimeout(`${API_BASE}/admin/providers/${providerId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    });
    return await res.json();
  },
};
