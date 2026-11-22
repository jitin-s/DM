import React from 'react';
import { PlayCircle } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { EpisodeCard } from '../cards/EpisodeCard';

interface LatestEpisodesSectionProps {
  items: AnimeItem[];
}

export const LatestEpisodesSection: React.FC<LatestEpisodesSectionProps> = ({ items }) => {
  // Extract latest episode representations from airing or recent anime
  const latestEpisodes = (items || []).slice(0, 4).map(anime => {
    const epNum = anime.latestEpisode || (anime.episodesList && anime.episodesList.length > 0 ? anime.episodesList[anime.episodesList.length - 1].number : 1);
    const existingEp = anime.episodesList?.find(e => e.number === epNum);
    const title = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Untitled Anime';
    const fallbackImage = anime.bannerImage || anime.coverImage?.large || anime.coverImage?.medium || '/logo_cropped.png';

    return {
      animeId: anime.id,
      animeTitle: title,
      episode: existingEp || {
        id: `ep-${epNum}`,
        number: epNum,
        title: `Episode ${epNum}`,
        thumbnail: fallbackImage,
        duration: `${anime.duration || 24}m`,
        airDate: 'Newly Released',
        subAvailable: true,
        dubAvailable: true,
      },
    };
  });

  if (!items || items.length === 0) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-1.5 h-6 bg-[#F01428] rounded-full shadow-[0_0_10px_#F01428]" />
            <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-[#F01428]" /> Latest Episode Drops
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 animate-pulse">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-44 rounded-xl bg-[#15151C] border border-white/5" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#F01428] rounded-full shadow-[0_0_10px_#F01428]" />
            <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-[#F01428]" /> Latest Episode Drops
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {latestEpisodes.map(item => (
            <EpisodeCard
              key={`${item.animeId}-${item.episode.id}`}
              animeId={item.animeId}
              animeTitle={item.animeTitle}
              episode={item.episode}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
