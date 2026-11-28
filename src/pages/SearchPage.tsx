import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Flame } from 'lucide-react';
import { api } from '../services/api';
import { AnimeItem } from '../types/anime';
import { AnimeCard } from '../components/cards/AnimeCard';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { AdsterraNativeBanner, AdsterraSmartlinkButton } from '../components/ads/adsterra';

const POPULAR_SEARCH_TAGS = [
  'Solo Leveling',
  'Jujutsu Kaisen',
  'Demon Slayer',
  'Chainsaw Man',
  'Frieren',
  'Attack on Titan',
  'Bleach',
  'One Piece',
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [popularRecs, setPopularRecs] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recommendations when search page opens
  useEffect(() => {
    api.getPopular(1, 6).then(items => {
      setPopularRecs(items || []);
    });
  }, []);

  // Execute real search on query param change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);

    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      api
        .searchAnime({ q: q.trim(), perPage: 24 })
        .then(res => {
          setResults(res.items || []);
        })
        .catch(err => {
          console.error('Search error:', err);
          setResults([]);
        })
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleSelectTag = (tag: string) => {
    setQuery(tag);
    setSearchParams({ q: tag });
  };

  const handleClear = () => {
    setQuery('');
    setSearchParams({});
    setResults([]);
  };

  const activeQuery = searchParams.get('q') || '';

  return (
    <div className="pt-24 sm:pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Input Box */}
        <div className="max-w-3xl mx-auto mb-10">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-5 h-5 text-[#F01428] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by anime title, character, studio, or genre..."
              className="w-full pl-12 pr-12 py-4 bg-[#121218] border border-white/10 rounded-2xl text-base text-white placeholder-[#646478] focus:outline-none focus:border-[#F01428] shadow-2xl shadow-black/60 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#9E9EB2] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </form>

          {/* Popular Tag Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#646478] flex items-center gap-1 font-semibold">
              <Flame className="w-3.5 h-3.5 text-[#F01428]" /> Trending Searches:
            </span>
            {POPULAR_SEARCH_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => handleSelectTag(tag)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#9E9EB2] hover:text-white transition-colors border border-white/5 cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Adsterra Top Search Placement */}
        <div className="mb-8 space-y-4">
          <AdsterraSmartlinkButton
            variant="banner"
            label="⚡ Looking for Uncensored 4K Anime Streams? Connect to VIP Node"
          />
          <AdsterraNativeBanner title="Sponsored Realm Recommendations" />
        </div>

        {/* Results Header */}
        {activeQuery.trim() && (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-[#F01428] rounded-full" />
              <h2 className="text-xl font-bold text-white font-heading">
                Results for "{activeQuery}" ({results.length})
              </h2>
            </div>
          </div>
        )}

        {/* Results Grid or Skeletons or Empty State */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {Array.from({ length: 12 }).map((_, idx) => (
              <CardSkeleton key={idx} />
            ))}
          </div>
        ) : activeQuery.trim() && results.length === 0 ? (
          <EmptyState
            icon="search"
            title="No Matching Anime Found"
            description={`We couldn't find any titles matching "${activeQuery}". Check your spelling or try searching for another series or genre.`}
            actionText="Browse Anime Library"
            actionLink="/anime"
          />
        ) : activeQuery.trim() && results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {results.map(anime => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : null}

        {/* If no query yet, show Recommended Spotlight from real API */}
        {!activeQuery.trim() && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-[#F01428] rounded-full" />
              <h3 className="text-lg font-bold text-white font-heading">
                Popular Recommendations to Explore
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
              {popularRecs.length === 0
                ? Array.from({ length: 6 }).map((_, idx) => <CardSkeleton key={idx} />)
                : popularRecs.map(anime => <AnimeCard key={anime.id} anime={anime} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
