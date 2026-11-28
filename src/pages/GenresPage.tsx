import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, Loader2 } from 'lucide-react';
import { GENRES_LIST } from '../constants/animeConstants';
import { api } from '../services/api';
import { AnimeItem } from '../types/anime';
import { AnimeCard } from '../components/cards/AnimeCard';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { AdsterraNativeBanner, AdsterraSmartlinkButton } from '../components/ads/adsterra';

export const GenresPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentGenreParam = searchParams.get('genre') || 'Action';

  const [selectedGenre, setSelectedGenre] = useState(currentGenreParam);
  const [selectedSort, setSelectedSort] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [items, setItems] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Client-side cache for genre results: key -> { items, total, hasNextPage, page }
  const cacheRef = useRef<Map<string, { items: AnimeItem[]; total: number; hasNextPage: boolean; page: number }>>(
    new Map()
  );

  useEffect(() => {
    const g = searchParams.get('genre');
    if (g && g !== selectedGenre) {
      setSelectedGenre(g);
    }
  }, [searchParams]);

  useEffect(() => {
    const cacheKey = `${selectedGenre.toLowerCase()}:${selectedSort}`;
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      setItems(cached.items);
      setTotalCount(cached.total);
      setHasNextPage(cached.hasNextPage);
      setPage(cached.page);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setPage(1);

    api
      .getByGenre(selectedGenre, 1, 24, selectedSort)
      .then(res => {
        if (!active) return;
        const freshItems = res.items || [];
        const freshTotal = res.total || freshItems.length;
        const freshHasNext = Boolean(res.hasNextPage);

        setItems(freshItems);
        setTotalCount(freshTotal);
        setHasNextPage(freshHasNext);
        setPage(1);

        cacheRef.current.set(cacheKey, {
          items: freshItems,
          total: freshTotal,
          hasNextPage: freshHasNext,
          page: 1,
        });
      })
      .catch(err => {
        if (!active) return;
        console.error(`Failed to fetch anime for genre ${selectedGenre}:`, err);
        setItems([]);
        setHasNextPage(false);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedGenre, selectedSort]);

  const handleSelectGenre = (genreName: string) => {
    if (genreName === selectedGenre) return;
    setSelectedGenre(genreName);
    setSearchParams({ genre: genreName });
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasNextPage) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const cacheKey = `${selectedGenre.toLowerCase()}:${selectedSort}`;

    api
      .getByGenre(selectedGenre, nextPage, 24, selectedSort)
      .then(res => {
        if (res.items && res.items.length > 0) {
          setItems(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const freshItems = res.items.filter(item => !existingIds.has(item.id));
            const combined = [...prev, ...freshItems];

            cacheRef.current.set(cacheKey, {
              items: combined,
              total: res.total || totalCount,
              hasNextPage: Boolean(res.hasNextPage),
              page: nextPage,
            });

            return combined;
          });
          setPage(nextPage);
          setHasNextPage(Boolean(res.hasNextPage));
        } else {
          setHasNextPage(false);
        }
      })
      .catch(err => {
        console.error('Failed to load more anime for genre:', err);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  };

  return (
    <div className="pt-24 sm:pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F01428] mb-1 font-display">
            <Layers className="w-3.5 h-3.5" /> Categories
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-heading">
            Explore by Genre
          </h1>
          <p className="text-sm text-[#9E9EB2] mt-1">
            Dive into specialized anime themes from intense dark supernatural action to wholesome slice-of-life and psychological thrillers.
          </p>
        </div>

        {/* Genre Badges / Tiles Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
          {GENRES_LIST.map(g => {
            const isSelected = g.name.toLowerCase() === selectedGenre.toLowerCase();
            return (
              <button
                key={g.name}
                onClick={() => handleSelectGenre(g.name)}
                className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-[#1C1C26] border-[#F01428] shadow-lg shadow-[#F01428]/25 scale-[1.02]'
                    : 'bg-[#121218] border-white/5 hover:border-white/15 hover:bg-[#181822]'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F01428] shadow-[0_0_8px_#F01428]" />
                )}
                <div className="text-sm font-bold text-white font-heading">{g.name}</div>
                <div className="text-xs text-[#9E9EB2] mt-0.5">{g.count.toLocaleString()} Titles</div>
              </button>
            );
          })}
        </div>

        {/* Adsterra Top/Middle Placements for Genres Page */}
        <div className="mb-8 space-y-4">
          <AdsterraSmartlinkButton
            variant="banner"
            label={`⚡ Stream ${selectedGenre} Anime in Ultra HD 4K without Buffer — Connect to VIP Node`}
          />
          <AdsterraNativeBanner title={`Sponsored ${selectedGenre} Picks`} />
        </div>

        {/* Results Bar for Selected Genre with Sort and Counter */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#F01428] rounded-full" />
            <h2 className="text-xl font-bold text-white font-heading">
              {selectedGenre} Anime
            </h2>
            <span className="text-xs text-[#9E9EB2] bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/5 ml-2">
              Showing {items.length} of {totalCount} titles
            </span>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-1 bg-[#15151C] p-1 rounded-xl border border-white/10 text-xs self-start sm:self-auto">
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
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {Array.from({ length: 12 }).map((_, idx) => (
              <CardSkeleton key={idx} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="film"
            title={`No ${selectedGenre} Anime Found`}
            description="We are regularly updating our catalog with more titles in this genre."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {items.map(anime => (
              <AnimeCard key={anime.id} anime={anime} />
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
                  Loading Titles...
                </span>
              ) : (
                `Load More ${selectedGenre} Anime`
              )}
            </Button>
          </div>
        ) : items.length > 0 ? (
          <div className="mt-12 text-center text-xs text-[#9E9EB2]">
            You have reached the end of {selectedGenre} anime ({items.length} titles loaded)
          </div>
        ) : null}
      </div>
    </div>
  );
};
