import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock } from 'lucide-react';
import { AnimeEpisode } from '../../types/anime';
import { Badge } from '../ui/Badge';
import { useNavigationLoading } from '../../context/NavigationLoadingContext';
import { api } from '../../services/api';

interface EpisodeCardProps {
  animeId: string;
  animeTitle: string;
  episode: AnimeEpisode;
  isActive?: boolean;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  animeId,
  animeTitle,
  episode,
  isActive = false,
}) => {
  const { triggerLoading } = useNavigationLoading();

  const handleClick = () => {
    triggerLoading(
      `Loading Episode ${episode.number}...`,
      `Channeling ${animeTitle} in Ultra HD...`
    );
  };

  const handleMouseEnter = () => {
    api.prefetchStream(animeId, episode.number);
  };

  return (
    <Link
      to={`/watch/${animeId}?ep=${episode.number}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={`group relative flex flex-col rounded-xl overflow-hidden bg-[#15151C] border transition-all duration-200 ${
        isActive
          ? 'border-[#F01428] shadow-md shadow-[#F01428]/30 bg-[#1C1C26] ring-1 ring-[#F01428]/50'
          : 'border-white/[0.08] hover:border-white/20 hover:bg-[#1A1A22] hover:-translate-y-0.5'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        <img
          src={episode.thumbnail || '/logo_cropped.png'}
          alt={episode.title || 'Episode'}
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== window.location.origin + '/logo_cropped.png') {
              target.src = '/logo_cropped.png';
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        {/* Play Icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-10 h-10 rounded-full bg-[#F01428] text-white flex items-center justify-center shadow-lg shadow-[#F01428]/50 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-4 h-4 fill-white translate-x-0.5" />
          </div>
        </div>

        {/* Episode badge top-left */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <Badge variant={isActive ? 'red' : 'glass'} size="xs">
            EP {episode.number}
          </Badge>
          {episode.filler && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/80 text-black">
              Filler
            </span>
          )}
          {episode.recap && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/80 text-white">
              Recap
            </span>
          )}
        </div>

        {/* Duration bottom-right */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[11px] text-white/90 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-sm">
          <Clock className="w-3 h-3 text-[#9E9EB2]" />
          <span>{episode.duration}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-start justify-between gap-1">
          <h4
            className="text-sm font-semibold text-white group-hover:text-[#F01428] transition-colors truncate flex-1"
            title={episode.japaneseTitle ? `${episode.title} (${episode.japaneseTitle})` : episode.title}
          >
            {episode.title}
          </h4>
          {episode.hasRealTitle === false && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/[0.06] text-[#9E9EB2] border border-white/5">
              Title TBA
            </span>
          )}
        </div>

        {episode.japaneseTitle && (
          <p className="text-[11px] text-[#707085] truncate font-sans">
            {episode.japaneseTitle}
          </p>
        )}

        {isActive ? (
          <div className="flex items-center gap-1.5 text-xs text-[#FF4D61] font-bold">
            <span className="flex items-end gap-0.5 h-2.5">
              <span className="w-0.5 bg-[#FF4D61] rounded-full animate-soundwave-1" />
              <span className="w-0.5 bg-[#FF4D61] rounded-full animate-soundwave-2" />
              <span className="w-0.5 bg-[#FF4D61] rounded-full animate-soundwave-3" />
            </span>
            <span>Now Streaming</span>
          </div>
        ) : (
          <p className="text-xs text-[#9E9EB2] truncate">{animeTitle}</p>
        )}

        <div className="flex items-center justify-between text-[11px] text-[#646478] mt-auto pt-1">
          <span className="text-[11px] text-[#9E9EB2]/80">
            {episode.airDate && episode.airDate !== 'TBA' ? episode.airDate : 'Release TBA'}
          </span>
          <div className="flex items-center gap-1">
            {episode.subAvailable && <span className="text-emerald-400 font-semibold">SUB</span>}
            {episode.dubAvailable && <span className="text-[#FF4D61] font-semibold">DUB</span>}
          </div>
        </div>
      </div>
    </Link>
  );
};
