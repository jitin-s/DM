import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { AnimeCard } from '../cards/AnimeCard';
import { CardSkeleton } from '../ui/Skeleton';

interface TrendingSectionProps {
  items: AnimeItem[];
}

export const TrendingSection: React.FC<TrendingSectionProps> = ({ items }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-8 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#F01428] rounded-full shadow-[0_0_10px_#F01428]" />
            <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#F01428]" /> Trending Now
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/anime?sort=trending"
              className="hidden sm:flex items-center gap-1 text-xs font-bold text-[#F01428] hover:text-[#ff2b44] transition-colors mr-2"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="p-2 rounded-lg bg-[#15151C] hover:bg-[#1C1C26] text-[#9E9EB2] hover:text-white border border-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="p-2 rounded-lg bg-[#15151C] hover:bg-[#1C1C26] text-[#9E9EB2] hover:text-white border border-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 hide-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {items.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="min-w-[160px] sm:min-w-[190px] md:min-w-[210px] max-w-[210px] shrink-0 snap-start"
                >
                  <CardSkeleton />
                </div>
              ))
            : items.map(anime => (
                <div
                  key={anime.id}
                  className="min-w-[160px] sm:min-w-[190px] md:min-w-[210px] max-w-[210px] shrink-0 snap-start"
                >
                  <AnimeCard anime={anime} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
};
