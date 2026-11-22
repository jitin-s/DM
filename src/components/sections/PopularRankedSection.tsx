import React from 'react';
import { Trophy } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { AnimeCard } from '../cards/AnimeCard';
import { CardSkeleton } from '../ui/Skeleton';

interface PopularRankedSectionProps {
  items: AnimeItem[];
}

export const PopularRankedSection: React.FC<PopularRankedSectionProps> = ({ items }) => {
  // Sort by rating or popularity
  const top10 = [...items]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10);

  return (
    <section className="py-10 bg-gradient-to-b from-transparent via-[#0F0F13]/50 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#F01428] rounded-full shadow-[0_0_10px_#F01428]" />
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#F01428]" /> Top 10 Ranked Anime
              </h2>
              <p className="text-xs text-[#9E9EB2] mt-0.5">Voted by the DevilMotion global community</p>
            </div>
          </div>
        </div>

        {/* 5-column grid for top 10 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {items.length === 0
            ? Array.from({ length: 10 }).map((_, idx) => <CardSkeleton key={idx} />)
            : top10.map((anime, idx) => (
                <AnimeCard key={anime.id} anime={anime} rank={idx + 1} />
              ))}
        </div>
      </div>
    </section>
  );
};
