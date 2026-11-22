import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { AnimeCard } from '../cards/AnimeCard';
import { CardSkeleton } from '../ui/Skeleton';

interface RecentlyUpdatedSectionProps {
  items: AnimeItem[];
}

export const RecentlyUpdatedSection: React.FC<RecentlyUpdatedSectionProps> = ({ items }) => {
  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#F01428] rounded-full shadow-[0_0_10px_#F01428]" />
            <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F01428]" /> Recently Updated
            </h2>
          </div>
          <Link
            to="/anime?status=RELEASING"
            className="flex items-center gap-1 text-xs font-bold text-[#F01428] hover:text-[#ff2b44] transition-colors"
          >
            See More <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {items.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => <CardSkeleton key={idx} />)
            : items.slice(0, 6).map(anime => (
                <AnimeCard key={anime.id} anime={anime} showEpisodeInfo={true} />
              ))}
        </div>
      </div>
    </section>
  );
};
