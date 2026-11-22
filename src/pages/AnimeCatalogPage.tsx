import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, RotateCcw, X, SlidersHorizontal, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { AnimeItem } from '../types/anime';
import { GENRES_LIST } from '../constants/animeConstants';
import { AnimeCard } from '../components/cards/AnimeCard';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

const FORMATS = ['ALL', 'TV', 'MOVIE', 'ONA', 'OVA'];
const STATUSES = ['ALL', 'RELEASING', 'FINISHED', 'NOT_YET_RELEASED'];
const SEASONS = ['ALL', 'WINTER', 'SPRING', 'SUMMER', 'FALL'];
const YEARS = ['ALL', '2024', '2023', '2022', '2020', '2016'];
const SORT_OPTIONS = [
  { label: 'Popularity', value: 'popularity' },
  { label: 'Trending', value: 'trending' },
  { label: 'Rating (Highest)', value: 'rating' },
  { label: 'Release Date (Newest)', value: 'newest' },
  { label: 'Title (A-Z)', value: 'title' },
];

export const AnimeCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get('genre') || 'ALL');
  const [selectedFormat, setSelectedFormat] = useState(searchParams.get('format') || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'ALL');
  const [selectedYear, setSelectedYear] = useState(searchParams.get('year') || 'ALL');
  const [selectedSeason, setSelectedSeason] = useState(searchParams.get('season') || 'ALL');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'popularity');

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [items, setItems] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const yearVal = selectedYear !== 'ALL' ? parseInt(selectedYear, 10) : undefined;

    api
      .searchAnime({
        q: searchQuery,
        genre: selectedGenre !== 'ALL' ? selectedGenre : undefined,
        format: selectedFormat !== 'ALL' ? selectedFormat : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        year: yearVal,
        season: selectedSeason !== 'ALL' ? selectedSeason : undefined,
        sort: sortBy,
        page: 1,
        perPage: 24,
      })
      .then(res => {
        if (!active) return;
        setItems(res.items || []);
        setTotalCount(res.total || 0);
        setHasNextPage(Boolean(res.hasNextPage));
        setPage(1);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, selectedGenre, selectedFormat, selectedStatus, selectedYear, selectedSeason, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('ALL');
    setSelectedFormat('ALL');
    setSelectedStatus('ALL');
    setSelectedYear('ALL');
    setSelectedSeason('ALL');
    setSortBy('popularity');
    setSearchParams({});
  };

  const hasActiveFilters =
    searchQuery ||
    selectedGenre !== 'ALL' ||
    selectedFormat !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedSeason !== 'ALL' ||
    sortBy !== 'popularity';

  const handleLoadMore = () => {
    if (isLoadingMore || !hasNextPage) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const yearVal = selectedYear !== 'ALL' ? parseInt(selectedYear, 10) : undefined;

    api
      .searchAnime({
        q: searchQuery,
        genre: selectedGenre !== 'ALL' ? selectedGenre : undefined,
        format: selectedFormat !== 'ALL' ? selectedFormat : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        year: yearVal,
        season: selectedSeason !== 'ALL' ? selectedSeason : undefined,
        sort: sortBy,
        page: nextPage,
        perPage: 24,
      })
      .then(res => {
        if (res.items && res.items.length > 0) {
          setItems(prev => {
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
        console.error('Error loading more anime:', err);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  };

  return (
    <div className="pt-24 sm:pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F01428] mb-1 font-display">
              <Filter className="w-3.5 h-3.5" /> Full Anime Library
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white font-heading">
              Anime Catalogue
            </h1>
            <p className="text-sm text-[#9E9EB2] mt-1">
              Explore our complete library of animated series, movies, and simulcasts with verified streaming sources.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1C1C26] text-white text-sm font-semibold border border-white/10"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#F01428]" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#F01428] shadow-[0_0_6px_#F01428]" />
              )}
            </button>
            <div className="text-xs text-[#9E9EB2] bg-white/[0.05] px-3 py-2 rounded-lg border border-white/5">
              Showing <span className="font-bold text-white">{items.length}</span> of {totalCount} titles
            </div>
          </div>
        </div>

        {/* Desktop Filter Bar */}
        <div className="hidden lg:block bg-[#121218] border border-white/[0.08] rounded-2xl p-5 mb-8 shadow-xl">
          <div className="grid grid-cols-6 gap-4">
            {/* Search Input */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#9E9EB2] mb-1.5 uppercase tracking-wider">
                Keyword Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#F01428] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by title or studio..."
                  className="w-full pl-9 pr-3 py-2 bg-[#1C1C26] rounded-xl text-sm text-white placeholder-[#646478] border border-white/10 focus:outline-none focus:border-[#F01428]"
                />
              </div>
            </div>

            {/* Genre */}
            <div>
              <label className="block text-xs font-semibold text-[#9E9EB2] mb-1.5 uppercase tracking-wider">
                Genre
              </label>
              <select
                value={selectedGenre}
                onChange={e => setSelectedGenre(e.target.value)}
                className="w-full py-2 px-3 bg-[#1C1C26] rounded-xl text-sm text-white border border-white/10 focus:outline-none focus:border-[#F01428]"
              >
                <option value="ALL">All Genres</option>
                {GENRES_LIST.map(g => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs font-semibold text-[#9E9EB2] mb-1.5 uppercase tracking-wider">
                Format
              </label>
              <select
                value={selectedFormat}
                onChange={e => setSelectedFormat(e.target.value)}
                className="w-full py-2 px-3 bg-[#1C1C26] rounded-xl text-sm text-white border border-white/10 focus:outline-none focus:border-[#F01428]"
              >
                {FORMATS.map(f => (
                  <option key={f} value={f}>
                    {f === 'ALL' ? 'All Formats' : f}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-[#9E9EB2] mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full py-2 px-3 bg-[#1C1C26] rounded-xl text-sm text-white border border-white/10 focus:outline-none focus:border-[#F01428]"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? 'All Status' : s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-semibold text-[#9E9EB2] mb-1.5 uppercase tracking-wider">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full py-2 px-3 bg-[#1C1C26] rounded-xl text-sm text-white border border-white/10 focus:outline-none focus:border-[#F01428]"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Row: Year, Season, Reset */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[#9E9EB2] font-semibold">Year:</span>
              <div className="flex items-center gap-1.5">
                {YEARS.map(y => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedYear === y
                        ? 'bg-[#F01428] text-white font-bold'
                        : 'bg-white/5 text-[#9E9EB2] hover:text-white'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              <span className="text-[#646478] ml-2">•</span>

              <span className="text-[#9E9EB2] font-semibold">Season:</span>
              <div className="flex items-center gap-1.5">
                {SEASONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSeason(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedSeason === s
                        ? 'bg-[#F01428] text-white font-bold'
                        : 'bg-white/5 text-[#9E9EB2] hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 text-xs text-[#F01428] hover:text-[#ff2b44] font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Mobile Slide-Over Filter Drawer */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-black/80 backdrop-blur-md flex justify-end">
            <div className="w-4/5 max-w-sm bg-[#0F0F13] h-full p-6 overflow-y-auto space-y-5 border-l border-white/10 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white font-heading">Filters</h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded-lg text-[#9E9EB2] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#9E9EB2] uppercase block mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Title or keyword..."
                  className="w-full p-2.5 bg-[#1C1C26] rounded-xl text-sm text-white border border-white/10 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#9E9EB2] uppercase block mb-1">
                  Genre
                </label>
                <select
                  value={selectedGenre}
                  onChange={e => setSelectedGenre(e.target.value)}
                  className="w-full p-2.5 bg-[#1C1C26] rounded-xl text-sm text-white border border-white/10"
                >
                  <option value="ALL">All Genres</option>
                  {GENRES_LIST.map(g => (
                    <option key={g.name} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#9E9EB2] uppercase block mb-1">
                  Format
                </label>
                <select
                  value={selectedFormat}
                  onChange={e => setSelectedFormat(e.target.value)}
                  className="w-full p-2.5 bg-[#1C1C26] rounded-xl text-sm text-white border border-white/10"
                >
                  {FORMATS.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#9E9EB2] uppercase block mb-1">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full p-2.5 bg-[#1C1C26] rounded-xl text-sm text-white border border-white/10"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#9E9EB2] uppercase block mb-1">
                  Sort
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full p-2.5 bg-[#1C1C26] rounded-xl text-sm text-white border border-white/10"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setIsMobileFilterOpen(false)}
                >
                  Apply Filters
                </Button>
                {hasActiveFilters && (
                  <Button variant="secondary" onClick={handleResetFilters}>
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        {isLoading && items.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="search"
            title="No Anime Found"
            description="We couldn't find any anime matching your current filter selections. Try clearing your filters or searching a different term."
            actionText="Clear All Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {items.map(anime => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}

        {/* Load More Button & Pagination Status */}
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
                'Load More Titles'
              )}
            </Button>
          </div>
        ) : items.length > 0 ? (
          <div className="mt-12 text-center text-xs text-[#9E9EB2]">
            You have reached the end of the catalogue ({items.length} titles loaded)
          </div>
        ) : null}
      </div>
    </div>
  );
};
