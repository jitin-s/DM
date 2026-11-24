import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Flame, Clock, ArrowRight, Star, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AnimeItem } from '../../types/anime';
import { Badge } from '../ui/Badge';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_SEARCHES = [
  'Solo Leveling',
  'Jujutsu Kaisen',
  'Demon Slayer',
  'Chainsaw Man',
  'Attack on Titan',
  'Bleach',
  'One Piece',
  'Frieren',
];

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('devilmotion_recent_searches');
      return saved ? JSON.parse(saved) : ['Solo Leveling', 'Jujutsu Kaisen', 'Demon Slayer'];
    } catch {
      return ['Solo Leveling', 'Jujutsu Kaisen', 'Demon Slayer'];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Real-time live search with debouncing & cancellation of outdated requests
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      api
        .searchAnime({ q: trimmed, perPage: 8 })
        .then(res => {
          if (!controller.signal.aborted) {
            setResults(res.items || []);
          }
        })
        .catch(err => {
          if (!controller.signal.aborted) {
            console.warn('Live search error:', err);
            setResults([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query]);

  const saveRecent = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('devilmotion_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('devilmotion_recent_searches');
    } catch {}
  };

  const handleSelectQuery = (term: string) => {
    saveRecent(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecent(query.trim());
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const handleSelectAnime = (anime: AnimeItem) => {
    const primaryTitle = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Anime';
    saveRecent(primaryTitle);
    navigate(`/anime/${anime.id}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md transition-all duration-300">
      <div
        className="w-full max-w-2xl bg-[#0F0F13] border border-white/10 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <form onSubmit={handleFormSubmit} className="relative flex items-center border-b border-white/10 px-4 py-3.5 bg-[#15151C]">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-[#F01428] shrink-0 mr-3 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-[#F01428] shrink-0 mr-3" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Summon anime title, movie, genre, studio from the archives..."
            className="w-full bg-transparent text-white placeholder-[#646478] text-base focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-[#9E9EB2] hover:text-white mr-2 rounded hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2 py-1 rounded bg-white/10 text-[#9E9EB2] hover:text-white transition-colors cursor-pointer"
          >
            ESC
          </button>
        </form>

        {/* Content Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
          {/* Live Search Results */}
          {query.trim() && (
            <div>
              <div className="flex items-center justify-between text-xs text-[#9E9EB2] uppercase tracking-wider mb-3">
                <span>Matching Titles ({results.length})</span>
                {results.length > 0 && (
                  <button
                    onClick={() => handleSelectQuery(query)}
                    className="text-[#F01428] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    View all results <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {!isSearching && results.length === 0 ? (
                <div className="text-center py-8 text-[#9E9EB2]">
                  <p className="text-sm font-semibold text-white">Even our demons couldn't find "{query}" in the archives</p>
                  <p className="text-xs text-[#646478] mt-1">Try another title or keyword. The realm is vast.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map(anime => {
                    const title = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Untitled Anime';
                    const cover = anime.coverImage?.medium || anime.coverImage?.large || '/logo_cropped.png';

                    return (
                      <div
                        key={anime.id}
                        onClick={() => handleSelectAnime(anime)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#1C1C26] transition-colors cursor-pointer group border border-transparent hover:border-white/5"
                      >
                        <img
                          src={cover}
                          alt={title}
                          onError={e => {
                            const target = e.currentTarget;
                            if (target.src !== window.location.origin + '/logo_cropped.png') {
                              target.src = '/logo_cropped.png';
                            }
                          }}
                          className="w-12 h-16 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform bg-[#15151C]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white group-hover:text-[#F01428] transition-colors truncate">
                              {title}
                            </h4>
                            {anime.year && (
                              <span className="text-xs text-[#646478] shrink-0 font-display">({anime.year})</span>
                            )}
                          </div>
                          {anime.title?.romaji && anime.title?.romaji !== title && (
                            <p className="text-xs text-[#9E9EB2] truncate mt-0.5">{anime.title.romaji}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#9E9EB2]">
                            <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {anime.rating || '8.0'}
                            </span>
                            <span>•</span>
                            <span>{anime.format || 'TV'}</span>
                            {anime.genres && anime.genres.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate">{anime.genres.slice(0, 2).join(', ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="red" size="xs">
                          Watch
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick Shortcuts when empty query */}
          {!query.trim() && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-[#9E9EB2] uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#F01428]" /> Recent Searches
                    </span>
                    <button
                      onClick={clearRecent}
                      className="text-[11px] text-[#646478] hover:text-white transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(term => (
                      <button
                        key={term}
                        onClick={() => handleSelectQuery(term)}
                        className="px-3 py-1.5 rounded-lg bg-[#1C1C26] hover:bg-[#252533] text-xs text-[#F4F4F7] border border-white/5 hover:border-[#F01428]/40 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock className="w-3 h-3 text-[#646478]" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Trending Searches */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#9E9EB2] uppercase tracking-wider mb-2">
                  <Flame className="w-3.5 h-3.5 text-[#F01428]" /> Trending Searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map(term => (
                    <button
                      key={term}
                      onClick={() => handleSelectQuery(term)}
                      className="px-3 py-1.5 rounded-lg bg-[#15151C] hover:bg-[#1C1C26] text-xs text-[#F4F4F7] border border-white/5 hover:border-[#F01428]/40 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Flame className="w-3 h-3 text-[#F01428]" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
