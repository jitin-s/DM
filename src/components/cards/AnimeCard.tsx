import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Bookmark, BookmarkCheck, Star } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { useWatchlist } from '../../context/WatchlistContext';
import { useNavigationLoading } from '../../context/NavigationLoadingContext';
import { api } from '../../services/api';
import { Badge } from '../ui/Badge';

interface AnimeCardProps {
  anime: AnimeItem;
  rank?: number;
  showEpisodeInfo?: boolean;
  className?: string;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  rank,
  showEpisodeInfo = false,
  className = '',
}) => {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { triggerLoading } = useNavigationLoading();
  const navigate = useNavigate();
  const inWatchlist = isInWatchlist(anime.id);
  const [imgError, setImgError] = useState(false);

  const displayTitle = anime.title?.english || anime.title?.romaji || 'Unknown Title';
  const coverSrc = imgError
    ? '/logo_cropped.png'
    : (anime.coverImage?.large || anime.coverImage?.extraLarge || anime.coverImage?.medium || anime.bannerImage || '/logo_cropped.png');

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(anime.id, anime);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerLoading(`Summoning ${displayTitle}...`, 'Harmonizing high-speed video server nodes...');
    navigate(`/watch/${anime.id}`);
  };

  const handleCardClick = () => {
    triggerLoading(`Summoning ${displayTitle}...`, 'Opening Demon Realm anime archives in Ultra HD...');
  };

  const handleMouseEnter = () => {
    api.prefetchAnimeDetails(anime.id);
  };

  return (
    <div className={`group relative flex flex-col ${className}`}>
      {/* Poster Image Container */}
      <Link
        to={`/anime/${anime.id}`}
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        className="relative block aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#15151C] border border-white/[0.08] group-hover:border-[#F01428] shadow-md shadow-black/40 transition-all duration-200 group-hover:shadow-[0_8px_20px_rgba(240,20,40,0.3)] group-hover:-translate-y-1"
      >
        {/* Cover Image */}
        <img
          src={coverSrc}
          alt={displayTitle}
          loading="lazy"
          decoding="async"
          width="240"
          height="360"
          onError={() => setImgError(true)}
          className={`h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 ${
            imgError ? 'p-6 object-contain bg-[#121218]' : ''
          }`}
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          <Badge variant="glass" size="xs">
            {anime.format || 'TV'}
          </Badge>
          <div className="flex items-center gap-1">
            {anime.subAvailable && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[#B0B0C5] border border-white/10">
                SUB
              </span>
            )}
            {anime.dubAvailable && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F01428]/85 backdrop-blur-md text-white border border-[#F01428]/50 shadow-sm shadow-[#F01428]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_#ffffff]" />
                DUB
              </span>
            )}
            {anime.isHindiDubbed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/90 backdrop-blur-md text-black border border-amber-400/60 shadow-sm shadow-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-black/80 shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
                HINDI
              </span>
            )}
          </div>
        </div>

        {/* Rank Badge if specified */}
        {rank !== undefined && (
          <div className="absolute bottom-2 left-2 z-10 flex items-baseline">
            <span
              className={`text-4xl md:text-5xl font-black font-display italic tracking-tighter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] ${
                rank <= 3
                  ? 'text-transparent bg-clip-text bg-gradient-to-t from-[#F01428] via-[#FF4D61] to-white'
                  : 'text-white/80'
              }`}
            >
              {String(rank).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 z-20">
          {/* Quick Play Button with Arcane Flare */}
          <div className="flex items-center justify-center mb-auto mt-auto">
            <button
              onClick={handlePlayClick}
              aria-label="Play Now"
              className="w-12 h-12 rounded-full bg-[#F01428] hover:bg-[#ff2035] text-white flex items-center justify-center shadow-xl shadow-[#F01428]/60 ring-4 ring-[#F01428]/30 group-hover:ring-[#F01428]/60 transform scale-75 group-hover:scale-100 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white translate-x-0.5" />
            </button>
          </div>

          {/* Bottom Actions inside hover */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{anime.rating || 8.0}</span>
            </div>
            <button
              onClick={handleWatchlistClick}
              title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                inWatchlist
                  ? 'bg-[#F01428] text-white'
                  : 'bg-white/10 hover:bg-white/20 text-[#F4F4F7]'
              }`}
            >
              {inWatchlist ? (
                <BookmarkCheck className="w-4 h-4 fill-white" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </Link>

      {/* Card Info Below Poster */}
      <div className="pt-2.5 flex flex-col flex-grow">
        <Link
          to={`/anime/${anime.id}`}
          onClick={handleCardClick}
          onMouseEnter={handleMouseEnter}
          className="text-sm font-semibold text-[#F4F4F7] group-hover:text-[#F01428] transition-colors line-clamp-2 leading-snug"
          title={displayTitle}
        >
          {displayTitle}
        </Link>

        <div className="mt-1 flex items-center justify-between text-xs text-[#9E9EB2]">
          <span>{anime.year || 2024}</span>
          <span className="flex items-center gap-1 font-medium">
            {showEpisodeInfo && anime.latestEpisode ? (
              <span className="text-[#FF4D61] font-semibold">EP {anime.latestEpisode}</span>
            ) : (
              <span>{anime.episodes ? `${anime.episodes} EPS` : 'TBA'}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
