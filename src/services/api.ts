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

  // --- STREAM RESOLUTION (Multi-Provider Real-Time Engine) ---
  async getStreamAvailability(animeId: string, episodeNumber = 1): Promise<{
    animeId: string;
    anilistId: number;
    episode: number;
    availableAudios: ('sub' | 'dub' | 'hindi')[];
    languageStatus: {
      sub: 'available' | 'checking' | 'unavailable';
      dub: 'available' | 'checking' | 'unavailable';
      hindi: 'available' | 'checking' | 'unavailable';
    };
    hasHindi: boolean;
    hasDub: boolean;
    hasSub: boolean;
  }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/stream/${animeId}/availability?ep=${episodeNumber}`);
      if (!res.ok) throw new Error('Availability check failed');
      return await res.json();
    } catch {
      return {
        animeId,
        anilistId: parseInt(animeId, 10) || 16498,
        episode: episodeNumber,
        availableAudios: ['sub', 'dub'],
        languageStatus: {
          sub: 'available',
          dub: 'available',
          hindi: 'unavailable',
        },
        hasHindi: false,
        hasDub: true,
        hasSub: true,
      };
    }
  },

  async reportStreamFailure(serverId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/stream/report-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      });
    } catch {}
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
      const isHindi = audio === 'hindi';
      const anilistId = parseInt(animeId, 10) || 16498;

      if (isHindi) {
        return {
          stream: {
            available: false,
            embedUrl: '',
            provider: 'DevilMotion Hindi Stream',
            audio,
            availableAudios: ['sub', 'dub'],
            currentServer: '',
            servers: [],
            message: 'Hindi Dub is currently unavailable for this episode.',
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
          servers: [],
          iframeOptions: {
            allow: 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            referrerPolicy: 'strict-origin-when-cross-origin',
          },
        };
      }

      // Safe fallback prioritizing AniEmbed (Stream 1) and AnimeEmbed (Stream 2)
      const aniEmbedUrl = `https://aniembed.se/e/${anilistId}/${episodeNumber}?lang=${audio}&autoplay=0`;
      const animeEmbedUrl = `https://animeembed.com/embed/ani/${anilistId}/${episodeNumber}?track=${audio}&autoPlay=0&autoSkip=1`;

      const safeServers = [
        { id: 'aniembed-ultra', name: 'Stream 1 (Ultra)', whiteLabelName: 'Stream 1 (Ultra)', priority: 10, isDefault: true },
        { id: 'animeembed-direct', name: 'Stream 2 (Rapid)', whiteLabelName: 'Stream 2 (Rapid)', priority: 8 },
      ];

      return {
        stream: {
          available: true,
          embedUrl: aniEmbedUrl,
          provider: 'Stream 1 (Ultra)',
          audio,
          availableAudios: ['sub', 'dub'],
          currentServer: 'aniembed-ultra',
          servers: safeServers,
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
        servers: safeServers,
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

  // --- AUTHENTICATION & USER MANAGEMENT ---
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    if (data.token) {
      localStorage.setItem('devilmotion_token', data.token);
    }
    return data;
  },

  async register(name: string, email: string, password: string): Promise<{ user: any; token: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    if (data.token) {
      localStorage.setItem('devilmotion_token', data.token);
    }
    return data;
  },

  async getCurrentUser(): Promise<any | null> {
    const token = localStorage.getItem('devilmotion_token');
    if (!token) return null;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  logoutUser() {
    localStorage.removeItem('devilmotion_token');
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
