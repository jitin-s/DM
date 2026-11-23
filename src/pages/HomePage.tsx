import React, { useState, useEffect } from 'react';
import { Award, Calendar, Clapperboard, ThumbsUp, Languages, Globe, History } from 'lucide-react';
import { api } from '../services/api';
import { AnimeItem } from '../types/anime';
import { useWatchlist } from '../context/WatchlistContext';
import { HeroCarousel } from '../components/hero/HeroCarousel';
import { TrendingSection } from '../components/sections/TrendingSection';
import { RecentlyUpdatedSection } from '../components/sections/RecentlyUpdatedSection';
import { LatestEpisodesSection } from '../components/sections/LatestEpisodesSection';
import { PopularRankedSection } from '../components/sections/PopularRankedSection';
import { BrowseGenresSection } from '../components/sections/BrowseGenresSection';
import { AnimeGridSection } from '../components/sections/AnimeGridSection';

export const HomePage: React.FC = () => {
  const { historyItems } = useWatchlist();
  const [trending, setTrending] = useState<AnimeItem[]>([]);
  const [popular, setPopular] = useState<AnimeItem[]>([]);
  const [airing, setAiring] = useState<AnimeItem[]>([]);
  const [topRated, setTopRated] = useState<AnimeItem[]>([]);
  const [upcoming, setUpcoming] = useState<AnimeItem[]>([]);
  const [movies, setMovies] = useState<AnimeItem[]>([]);
  const [hindiDubbed, setHindiDubbed] = useState<AnimeItem[]>([]);
  const [englishDubbed, setEnglishDubbed] = useState<AnimeItem[]>([]);

  // Independent loading states per section to prevent monolithic blocking
  const [loading, setLoading] = useState({
    trending: true,
    popular: true,
    airing: true,
    topRated: true,
    upcoming: true,
    movies: true,
    hindi: true,
    english: true,
  });

  useEffect(() => {
    // Decoupled independent fetches: fastest endpoints display immediately
    api.getTrending(1, 10)
      .then(items => setTrending(items || []))
      .catch(err => console.error('Trending fetch error:', err))
      .finally(() => setLoading(prev => ({ ...prev, trending: false })));

    api.getPopular(1, 15)
      .then(items => setPopular(items || []))
      .catch(err => console.error('Popular fetch error:', err))
      .finally(() => setLoading(prev => ({ ...prev, popular: false })));

    api.getAiring(1, 12)
      .then(items => setAiring(items || []))
      .catch(err => console.error('Airing fetch error:', err))
      .finally(() => setLoading(prev => ({ ...prev, airing: false })));

    api.getTopRated(1, 10)
      .then(items => setTopRated(items || []))
      .catch(err => console.error('TopRated fetch error:', err))
      .finally(() => setLoading(prev => ({ ...prev, topRated: false })));

    api.getUpcoming(1, 10)
      .then(items => setUpcoming(items || []))
      .catch(err => console.error('Upcoming fetch error:', err))
      .finally(() => setLoading(prev => ({ ...prev, upcoming: false })));

    api.getMovies(1, 10)
      .then(res => setMovies(res.items || []))
      .catch(err => console.error('Movies fetch error:', err))
      .finally(() => setLoading(prev => ({ ...prev, movies: false })));

    api.getHindiDubbed(1, 6)
      .then(items => setHindiDubbed(items || []))
      .catch(err => console.error('Hindi dubbed fetch error:', err))
      .finally(() => setLoading(prev => ({ ...prev, hindi: false })));

    api.getEnglishDubbed(1, 6)
      .then(items => setEnglishDubbed(items || []))
      .catch(err => console.error('English dubbed fetch error:', err))
      .finally(() => setLoading(prev => ({ ...prev, english: false })));
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Featured Anime Hero Banner (DevilMotion Live Spotlight) */}
      <HeroCarousel items={trending.slice(0, 5)} />

      {/* 1.5 Continue Watching (Recorded History) */}
      {historyItems.length > 0 && (
        <AnimeGridSection
          title="Continue Watching"
          subtitle="Resume playback where you left off"
          icon={<History className="w-5 h-5 text-[#F01428]" />}
          items={historyItems}
          viewAllLink="/history"
          limit={6}
          loading={false}
        />
      )}

      {/* 2. Trending Anime */}
      <TrendingSection items={trending} />

      {/* 3. Recently Updated Anime */}
      <RecentlyUpdatedSection items={airing} />

      {/* 4. Latest Episode Drops */}
      <LatestEpisodesSection items={airing} />

      {/* 5. Popular Anime (Top 10 Ranked) */}
      <PopularRankedSection items={popular} />

      {/* 6. Browse by Genre */}
      <BrowseGenresSection />

      {/* 7. Top-Rated Anime */}
      <AnimeGridSection
        title="Top Rated Masterpieces"
        subtitle="Critically acclaimed series with the highest community ratings on DevilMotion"
        icon={<Award className="w-5 h-5 text-[#F01428]" />}
        items={topRated}
        viewAllLink="/anime?sort=rating"
        limit={6}
        loading={loading.topRated}
      />

      {/* 8. Hindi Dubbed Anime */}
      <AnimeGridSection
        title="Hindi Dubbed Anime"
        subtitle="Popular action and fantasy anime featuring verified Hindi language audio"
        icon={<Languages className="w-5 h-5 text-[#F01428]" />}
        items={hindiDubbed}
        viewAllLink="/anime?genre=Action"
        limit={6}
        loading={loading.hindi}
      />

      {/* 9. English Dubbed Anime */}
      <AnimeGridSection
        title="English Dubbed Anime"
        subtitle="Full English voice casts for international streaming"
        icon={<Globe className="w-5 h-5 text-[#F01428]" />}
        items={englishDubbed}
        viewAllLink="/anime?genre=Fantasy"
        limit={6}
        loading={loading.english}
      />

      {/* 10. Recently Released Anime Movies */}
      <AnimeGridSection
        title="Anime Feature Films"
        subtitle="Theatrical releases and animated cinematic experiences"
        icon={<Clapperboard className="w-5 h-5 text-[#F01428]" />}
        items={movies}
        viewAllLink="/movies"
        limit={6}
        loading={loading.movies}
      />

      {/* 11. Upcoming Anime */}
      <AnimeGridSection
        title="Upcoming Releases"
        subtitle="Most anticipated premieres arriving next broadcast season"
        icon={<Calendar className="w-5 h-5 text-[#F01428]" />}
        items={upcoming}
        viewAllLink="/anime?status=NOT_YET_RELEASED"
        limit={6}
        loading={loading.upcoming}
      />

      {/* 12. Recommended Anime */}
      <AnimeGridSection
        title="Recommended For You"
        subtitle="Curated dark fantasy, action, and supernatural series"
        icon={<ThumbsUp className="w-5 h-5 text-[#F01428]" />}
        items={popular.slice(3, 9)}
        viewAllLink="/anime"
        limit={6}
        loading={loading.popular}
      />
    </div>
  );
};
