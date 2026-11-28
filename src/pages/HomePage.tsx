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
import { AnimeQuoteTicker } from '../components/common/AnimeQuoteTicker';
import { AdsterraNativeBanner, AdsterraBanner300x250 } from '../components/ads/adsterra';

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

      {/* 1.2 Legendary Anime Decrees & Quotes Ticker */}
      <AnimeQuoteTicker />

      {/* 1.5 Continue Watching (Recorded History) */}
      {historyItems.length > 0 && (
        <AnimeGridSection
          title="Continue Your Journey"
          subtitle="Resume playback where your footsteps paused in the realm"
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

      {/* Adsterra Native Sponsored Recommendations (Clean in-stream placement, max 1 on page) */}
      <AdsterraNativeBanner title="Sponsored Realm Recommendations" />

      {/* 6. Browse by Genre */}
      <BrowseGenresSection />

      {/* 7. Top-Rated Anime */}
      <AnimeGridSection
        title="Summoned Masterpieces"
        subtitle="Critically acclaimed series with the highest praise across all dimensions"
        icon={<Award className="w-5 h-5 text-[#F01428]" />}
        items={topRated}
        viewAllLink="/anime?sort=rating"
        limit={6}
        loading={loading.topRated}
      />

      {/* 8. Hindi Dubbed Anime */}
      <AnimeGridSection
        title="Hindi Dubbed Archives"
        subtitle="Popular action and fantasy anime summoned with authentic Hindi voice casting"
        icon={<Languages className="w-5 h-5 text-[#F01428]" />}
        items={hindiDubbed}
        viewAllLink="/anime?genre=Action"
        limit={6}
        loading={loading.hindi}
      />

      {/* 9. English Dubbed Anime */}
      <AnimeGridSection
        title="English Dubbed Chronicles"
        subtitle="Full English vocal performances synchronized for the realm"
        icon={<Globe className="w-5 h-5 text-[#F01428]" />}
        items={englishDubbed}
        viewAllLink="/anime?genre=Fantasy"
        limit={6}
        loading={loading.english}
      />

      {/* 10. Recently Released Anime Movies */}
      <AnimeGridSection
        title="Theatrical Chronicles"
        subtitle="Feature-length cinematic legends that transcend ordinary stories"
        icon={<Clapperboard className="w-5 h-5 text-[#F01428]" />}
        items={movies}
        viewAllLink="/movies"
        limit={6}
        loading={loading.movies}
      />

      {/* Adsterra Sponsored Portal Banner Showcase */}
      <div className="py-4 flex flex-col items-center justify-center">
        <AdsterraBanner300x250 />
      </div>

      {/* 11. Upcoming Anime */}
      <AnimeGridSection
        title="Upcoming Realm Arrivals"
        subtitle="Most anticipated premieres breaching the gates next broadcast season"
        icon={<Calendar className="w-5 h-5 text-[#F01428]" />}
        items={upcoming}
        viewAllLink="/anime?status=NOT_YET_RELEASED"
        limit={6}
        loading={loading.upcoming}
      />

      {/* 12. Recommended Anime */}
      <AnimeGridSection
        title="Demonic Recommendations"
        subtitle="Curated dark fantasy, action, and supernatural legends discovered for you"
        icon={<ThumbsUp className="w-5 h-5 text-[#F01428]" />}
        items={popular.slice(3, 9)}
        viewAllLink="/anime"
        limit={6}
        loading={loading.popular}
      />
    </div>
  );
};
