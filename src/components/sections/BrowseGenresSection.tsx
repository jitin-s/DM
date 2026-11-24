import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';
import { GENRES_LIST } from '../../constants/animeConstants';

export const BrowseGenresSection: React.FC = () => {
  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#F01428] rounded-full shadow-[0_0_10px_#F01428]" />
            <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#F01428]" /> Browse by Genre
            </h2>
          </div>
          <Link
            to="/genres"
            className="flex items-center gap-1 text-xs font-bold text-[#F01428] hover:text-[#ff2b44] transition-colors"
          >
            All Genres <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {GENRES_LIST.map(genre => (
            <Link
              key={genre.name}
              to={`/anime?genre=${encodeURIComponent(genre.name)}`}
              className="group relative h-28 sm:h-32 rounded-xl overflow-hidden border border-white/10 hover:border-[#F01428]/60 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#F01428]/15"
            >
              {/* Background Art */}
              <img
                src={genre.banner}
                alt={genre.name}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter brightness-[0.4] group-hover:brightness-[0.55]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Title & Count Overlay */}
              <div className="absolute inset-0 p-3 flex flex-col justify-end">
                <span className="text-sm sm:text-base font-bold text-white group-hover:text-[#F01428] transition-colors font-heading">
                  {genre.name}
                </span>
                <span className="text-[11px] text-[#9E9EB2]">
                  {genre.count.toLocaleString()} Titles
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
