import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { AnimeCard } from '../cards/AnimeCard';
import { CardSkeleton } from '../ui/Skeleton';

interface AnimeGridSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  items: AnimeItem[];
  viewAllLink?: string;
  limit?: number;
  loading?: boolean;
}

export const AnimeGridSection: React.FC<AnimeGridSectionProps> = ({
  title,
  subtitle,
  icon,
  items = [],
  viewAllLink,
  limit = 6,
  loading = false,
}) => {
  const displayItems = (items || []).slice(0, limit);

  if (!loading && displayItems.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#F01428] rounded-full shadow-[0_0_10px_#F01428]" />
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight flex items-center gap-2">
                {icon}
                <span>{title}</span>
              </h2>
              {subtitle && <p className="text-xs text-[#9E9EB2] mt-0.5">{subtitle}</p>}
            </div>
          </div>

          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="flex items-center gap-1 text-xs font-bold text-[#F01428] hover:text-[#ff2b44] transition-colors"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {loading
            ? Array.from({ length: limit }).map((_, idx) => <CardSkeleton key={idx} />)
            : displayItems.map(anime => <AnimeCard key={anime.id} anime={anime} />)}
        </div>
      </div>
    </section>
  );
};
