import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Info, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Star, Flame } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { useWatchlist } from '../../context/WatchlistContext';
import { useNavigationLoading } from '../../context/NavigationLoadingContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { HeroSkeleton } from '../ui/Skeleton';
import { AnimeEmberParticles } from '../common/AnimeEmberParticles';

interface HeroCarouselProps {
  items: AnimeItem[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { triggerLoading } = useNavigationLoading();
  const navigate = useNavigate();

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlay || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isAutoPlay, items.length]);

  if (!items || items.length === 0) return <HeroSkeleton />;
  const current = items[currentIndex];
  const inWatchlist = isInWatchlist(current.id);

  const handlePrev = () => {
    setIsAutoPlay(false);
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setIsAutoPlay(false);
    setCurrentIndex(prev => (prev + 1) % items.length);
  };

  return (
    <div
      className="relative w-full min-h-[75vh] md:min-h-[85vh] flex items-end pb-12 sm:pb-20 pt-28 overflow-hidden bg-[#08080A]"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
    >
      {/* Background Banner with Crossfade & Parallax effect */}
      <div className="absolute inset-0 z-0 bg-[#0C0C12]">
        <img
          key={current.id}
          src={current.bannerImage || current.coverImage?.extraLarge || current.coverImage?.large || '/logo.png'}
          alt={current.title?.english || current.title?.romaji || 'Anime Banner'}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/logo.png') target.src = '/logo.png';
          }}
          className="w-full h-full object-cover object-top transition-opacity duration-1000 ease-in-out filter brightness-[0.75] contrast-[1.05]"
        />

        {/* Master Dark Vignette & Gradient Overlays */}
        {/* Left-to-right fade for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080A] via-[#08080A]/80 to-transparent w-full md:w-3/4 z-10" />
        {/* Bottom fade into page content */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#08080A] via-[#08080A]/80 to-transparent z-10" />
        {/* Top fade for navbar */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#08080A]/90 to-transparent z-10" />
        {/* Subtle devil red atmospheric accent */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#F01428]/15 rounded-full blur-3xl pointer-events-none z-10" />

        {/* Floating Demonic Embers Detailing (Performance optimized) */}
        <AnimeEmberParticles count={8} className="opacity-60 z-15" />
      </div>

      {/* Hero Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl lg:max-w-3xl space-y-4 md:space-y-5">
          {/* Spotlight & Meta Pill Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F01428] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#F01428]/40 animate-pulse">
              <Flame className="w-3.5 h-3.5" /> Spotlight #{currentIndex + 1}
            </span>
            <Badge variant="glass" size="sm">
              {current.format || 'TV'}
            </Badge>
            <Badge variant="green" size="sm">
              {current.status || 'RELEASING'}
            </Badge>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md border border-white/10">
              <Star className="w-3 h-3 fill-amber-400" />
              {current.rating || 8.5}
            </span>
            <span className="text-xs text-[#9E9EB2] font-semibold">{current.year || 2024}</span>
            <span className="text-xs text-[#646478]">•</span>
            <span className="text-xs text-[#9E9EB2] font-semibold">{current.ageRating || 'PG-13'}</span>
          </div>

          {/* Title with Japanese subtitle */}
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#F01428] uppercase font-display">
              {current.title?.native ? `${current.title.native} • ` : ''}{current.title?.romaji || ''}
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-heading tracking-tight leading-[1.08] drop-shadow-md">
              {current.title?.english || current.title?.romaji || 'Featured Anime'}
            </h1>
          </div>

          {/* Genres row */}
          {Array.isArray(current.genres) && current.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {current.genres.map(genre => (
                <span
                  key={genre}
                  className="text-xs px-2.5 py-1 rounded-md bg-white/[0.07] text-[#E0E0EC] border border-white/10 backdrop-blur-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <p className="text-sm sm:text-base text-[#C0C0D0] line-clamp-3 sm:line-clamp-4 leading-relaxed max-w-2xl font-body">
            {current.description || ''}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              icon={<Play className="w-5 h-5 fill-white" />}
              onClick={() => {
                const title = current.title?.english || current.title?.romaji || 'Anime';
                triggerLoading(`Summoning ${title}...`, 'Harmonizing high-speed streaming node...');
                navigate(`/watch/${current.id}`);
              }}
              className="glow-red"
            >
              Summon & Watch
            </Button>

            <Link
              to={`/anime/${current.id}`}
              onClick={() => {
                const title = current.title?.english || current.title?.romaji || 'Anime';
                triggerLoading(`Opening ${title}...`, 'Consulting complete archives in Ultra HD...');
              }}
            >
              <Button
                variant="secondary"
                size="lg"
                icon={<Info className="w-5 h-5 text-[#9E9EB2]" />}
              >
                Inspect Archives
              </Button>
            </Link>

            <button
              onClick={() => toggleWatchlist(current.id)}
              aria-label="Add to Watchlist"
              className={`p-3.5 rounded-lg border transition-all ${
                inWatchlist
                  ? 'bg-[#F01428] text-white border-[#F01428] shadow-lg shadow-[#F01428]/40'
                  : 'bg-[#1C1C26]/90 text-[#9E9EB2] hover:text-white border-white/10 hover:border-white/20'
              }`}
            >
              {inWatchlist ? (
                <BookmarkCheck className="w-5 h-5 fill-white" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Carousel Slide Indicators & Controls */}
        <div className="flex items-center justify-between pt-8 sm:pt-10">
          {/* Thumbnails / Indicators */}
          <div className="flex items-center gap-2 sm:gap-3">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  setIsAutoPlay(false);
                  setCurrentIndex(idx);
                }}
                className={`group relative h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-8 sm:w-12 bg-[#F01428] shadow-[0_0_10px_#F01428]'
                    : 'w-3 sm:w-4 bg-white/20 hover:bg-white/40'
                }`}
                title={item.title.english}
              />
            ))}
          </div>

          {/* Arrow Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-[#F01428] text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all duration-200 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next Slide"
              className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-[#F01428] text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all duration-200 active:scale-95"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
