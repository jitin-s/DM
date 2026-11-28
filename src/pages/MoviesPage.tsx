import React, { useState, useEffect } from 'react';
import { Clapperboard, Filter, Loader2, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import { AnimeItem } from '../types/anime';
import { AnimeCard } from '../components/cards/AnimeCard';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { GENRES_LIST } from '../constants/animeConstants';
import { AdsterraNativeBanner } from '../components/ads/adsterra';

export const MoviesPage: React.FC = () => {
  const [selectedSort, setSelectedSort] = useState<'rating' | 'popular' | 'newest'>('popular');
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [movies, setMovies] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch initial page when filters change
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setPage(1);

    api
      .getMovies(1, 24, selectedSort, selectedGenre !== 'ALL' ? selectedGenre : undefined)
      .then(res => {
        if (!active) return;
        setMovies(res.items || []);
        setTotalCount(res.total || (res.items || []).length);
        setHasNextPage(Boolean(res.hasNextPage));
      })
      .catch(err => {
        if (!active) return;
        console.error('Failed to load anime movies:', err);
        setMovies([]);
        setHasNextPage(false);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSort, selectedGenre]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasNextPage) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    api
      .getMovies(nextPage, 24, selectedSort, selectedGenre !== 'ALL' ? selectedGenre : undefined)
      .then(res => {
        if (res.items && res.items.length > 0) {
          setMovies(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const freshItems = res.items.filter(item => !existingIds.has(item.id));
            return [...prev, ...freshItems];
          });
          setPage(nextPage);
          setHasNextPage(Boolean(res.hasNextPage));
        } else {
          setHasNextPage(false);
        }
      })
      .catch(err => {
        console.error('Failed to load more movies:', err);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  };

  const handleResetFilters = () => {
    setSelectedSort('popular');
    setSelectedGenre('ALL');
  };

  return (
    <div className="pt-24 sm:pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F01428] mb-1 font-display">
              <Clapperboard className="w-3.5 h-3.5" /> Cinematic Anime
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white font-heading">
              Anime Feature Films
            </h1>
            <p className="text-sm text-[#9E9EB2] mt-1">
              Theatrical masterpieces, acclaimed film series, and standalone animated movies in pristine high quality.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Genre Filter */}
            <div className="flex items-center gap-1.5 bg-[#15151C] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#F01428]" />
              <select
                value={selectedGenre}
                onChange={e => setSelectedGenre(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#1C1C26]">All Genres</option>
                {GENRES_LIST.map(g => (
                  <option key={g.name} value={g.name} className="bg-[#1C1C26]">
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Switcher */}
            <div className="flex items-center gap-1 bg-[#15151C] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setSelectedSort('popular')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedSort === 'popular' ? 'bg-[#F01428] text-white' : 'text-[#9E9EB2] hover:text-white'
                }`}
              >
                Most Popular
              </button>
              <button
                onClick={() => setSelectedSort('rating')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedSort === 'rating' ? 'bg-[#F01428] text-white' : 'text-[#9E9EB2] hover:text-white'
                }`}
              >
                Top Rated
              </button>
              <button
                onClick={() => setSelectedSort('newest')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedSort === 'newest' ? 'bg-[#F01428] text-white' : 'text-[#9E9EB2] hover:text-white'
                }`}
              >
                Latest
              </button>
            </div>

            {/* Total Badge */}
            <div className="text-xs text-[#9E9EB2] bg-white/[0.05] px-3 py-2 rounded-lg border border-white/5">
              Showing <span className="font-bold text-white">{movies.length}</span> of {totalCount} films
            </div>
          </div>
        </div>

        {/* Adsterra Native Sponsored Recommendations (Top/Middle of Movies Page) */}
        <AdsterraNativeBanner title="Sponsored Feature Film Picks" />

        {/* Movies Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {Array.from({ length: 12 }).map((_, idx) => (
              <CardSkeleton key={idx} />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <EmptyState
            icon="film"
            title="No Feature Films Found"
            description="No anime movies matched your current filters. Try selecting a different genre or sorting order."
            actionText="Reset Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {movies.map(movie => (
              <AnimeCard key={movie.id} anime={movie} />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasNextPage ? (
          <div className="mt-12 text-center">
            <Button
              variant="secondary"
              size="lg"
              disabled={isLoadingMore}
              onClick={handleLoadMore}
              className="min-w-[200px]"
            >
              {isLoadingMore ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#F01428]" />
                  Loading Feature Films...
                </span>
              ) : (
                'Load More Feature Films'
              )}
            </Button>
          </div>
        ) : movies.length > 0 ? (
          <div className="mt-12 text-center text-xs text-[#9E9EB2]">
            You have reached the end of the feature film catalogue ({movies.length} films loaded)
          </div>
        ) : null}
      </div>
    </div>
  );
};
