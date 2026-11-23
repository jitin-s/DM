import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimeItem } from '../types/anime';
import { api } from '../services/api';

interface WatchlistContextType {
  watchlistIds: string[];
  addToWatchlist: (id: string, animeItem?: AnimeItem) => void;
  removeFromWatchlist: (id: string) => void;
  toggleWatchlist: (id: string, animeItem?: AnimeItem) => void;
  isInWatchlist: (id: string) => boolean;
  watchlistItems: AnimeItem[];
  historyIds: string[];
  addToHistory: (id: string, animeItem?: AnimeItem) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  historyItems: AnimeItem[];
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('devilmotion_watchlist');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [historyIds, setHistoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('devilmotion_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [cachedAnime, setCachedAnime] = useState<Record<string, AnimeItem>>(() => {
    try {
      const saved = localStorage.getItem('devilmotion_cached_anime');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const attemptedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem('devilmotion_watchlist', JSON.stringify(watchlistIds));
    } catch {}
  }, [watchlistIds]);

  useEffect(() => {
    try {
      localStorage.setItem('devilmotion_history', JSON.stringify(historyIds));
    } catch {}
  }, [historyIds]);

  useEffect(() => {
    try {
      localStorage.setItem('devilmotion_cached_anime', JSON.stringify(cachedAnime));
    } catch {}
  }, [cachedAnime]);

  // Safely fetch missing anime records without infinite loops
  useEffect(() => {
    const allIds = [...watchlistIds, ...historyIds];
    const missingIds = allIds.filter(id => id && !cachedAnime[id] && !attemptedIdsRef.current.has(id));

    if (missingIds.length > 0) {
      missingIds.slice(0, 4).forEach(id => {
        attemptedIdsRef.current.add(id);
        api.getAnimeDetails(id).then(item => {
          if (item) {
            setCachedAnime(prev => ({ ...prev, [id]: item }));
          }
        }).catch(() => {});
      });
    }
  }, [watchlistIds, historyIds]);

  const addToWatchlist = useCallback((id: string, animeItem?: AnimeItem) => {
    setWatchlistIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    if (animeItem) {
      setCachedAnime(prev => ({ ...prev, [id]: animeItem }));
    }
    api.addToUserWatchlist(id).catch(() => {});
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlistIds(prev => prev.filter(item => item !== id));
    api.removeFromUserWatchlist(id).catch(() => {});
  }, []);

  const toggleWatchlist = useCallback((id: string, animeItem?: AnimeItem) => {
    setWatchlistIds(prev => {
      const exists = prev.includes(id);
      if (exists) {
        api.removeFromUserWatchlist(id).catch(() => {});
        return prev.filter(item => item !== id);
      } else {
        if (animeItem) {
          setCachedAnime(c => ({ ...c, [id]: animeItem }));
        }
        api.addToUserWatchlist(id).catch(() => {});
        return [...prev, id];
      }
    });
  }, []);

  const isInWatchlist = useCallback((id: string) => watchlistIds.includes(id), [watchlistIds]);

  const addToHistory = useCallback((id: string, animeItem?: AnimeItem) => {
    setHistoryIds(prev => [id, ...prev.filter(item => item !== id)].slice(0, 30));
    if (animeItem) {
      setCachedAnime(c => ({ ...c, [id]: animeItem }));
    }
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistoryIds(prev => prev.filter(item => item !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistoryIds([]);
    try {
      localStorage.removeItem('devilmotion_history');
    } catch {}
  }, []);

  const watchlistItems = useMemo(
    () => watchlistIds.map(id => cachedAnime[id]).filter(Boolean),
    [watchlistIds, cachedAnime]
  );

  const historyItems = useMemo(
    () => historyIds.map(id => cachedAnime[id]).filter(Boolean),
    [historyIds, cachedAnime]
  );

  const value = useMemo(
    () => ({
      watchlistIds,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      isInWatchlist,
      watchlistItems,
      historyIds,
      addToHistory,
      removeFromHistory,
      clearHistory,
      historyItems,
    }),
    [
      watchlistIds,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      isInWatchlist,
      watchlistItems,
      historyIds,
      addToHistory,
      removeFromHistory,
      clearHistory,
      historyItems,
    ]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};
