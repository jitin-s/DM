import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Bookmark,
  BookmarkCheck,
  Star,
  Calendar,
  Clock,
  Tv,
  Share2,
  Check,
  Loader2,
  Users,
  Layers,
  Flame,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { useWatchlist } from '../context/WatchlistContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EpisodeCard } from '../components/cards/EpisodeCard';
import { AnimeCard } from '../components/cards/AnimeCard';
import { EmptyState } from '../components/ui/EmptyState';

export const AnimeDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const [activeTab, setActiveTab] = useState<'episodes' | 'seasons' | 'characters' | 'overview' | 'related'>('episodes');
  const [copied, setCopied] = useState(false);
  const [anime, setAnime] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<'NOT_FOUND' | 'NETWORK_ERROR' | null>(null);
  const [epSearch, setEpSearch] = useState('');
  const [selectedRange, setSelectedRange] = useState(0);

  const fetchAnime = () => {
    if (!id) return;
    setIsLoading(true);
    setErrorType(null);
    api
      .getAnimeDetails(id)
      .then(res => {
        if (res) {
          setAnime(res);
          setErrorType(null);
        } else {
          setAnime(null);
          setErrorType('NOT_FOUND');
        }
      })
      .catch(err => {
        console.error('Failed to load anime details:', err);
        setAnime(null);
        setErrorType('NETWORK_ERROR');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAnime();
  }, [id]);

  if (isLoading) {
    return (
      <div className="pt-40 pb-32 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-10 h-10 text-[#F01428] animate-spin mb-4" />
        <p className="text-sm text-[#9E9EB2]">Loading anime information...</p>
      </div>
    );
  }

  if (errorType === 'NETWORK_ERROR') {
    return (
      <div className="pt-32 pb-20">
        <EmptyState
          icon="alert"
          title="Connection Temporarily Unavailable"
          description="Unable to load anime information. Please check your network connection and retry."
          actionText="Retry Connection"
          onAction={fetchAnime}
        />
      </div>
    );
  }

  if (!anime || errorType === 'NOT_FOUND') {
    return (
      <div className="pt-32 pb-20">
        <EmptyState
          icon="alert"
          title="Anime Not Found"
          description="No anime found matching this identifier. It may have been unlisted or the ID is invalid."
          actionText="Discover Trending Anime"
          actionLink="/"
        />
      </div>
    );
  }

  const inWatchlist = isInWatchlist(anime.id);
  const recommendations = anime.recommendations || [];
  const characters = anime.characters || [];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allEpisodes = anime?.episodesList || [];
  const relations = anime?.relations || [];
  const totalEpisodesCount = allEpisodes.length;
  // Dynamic page size for clean range tabs (100 for >200 eps, 50 for >50 eps, 24 for shorter series)
  const PAGE_SIZE = totalEpisodesCount > 200 ? 100 : totalEpisodesCount > 50 ? 50 : 24;
  const numRanges = Math.ceil(totalEpisodesCount / PAGE_SIZE);
  const ranges = Array.from({ length: numRanges }, (_, i) => ({
    start: i * PAGE_SIZE + 1,
    end: Math.min((i + 1) * PAGE_SIZE, totalEpisodesCount),
  }));

  const searchedEpisodes = epSearch.trim()
    ? allEpisodes.filter((ep: any) =>
        ep.title?.toLowerCase().includes(epSearch.toLowerCase()) ||
        String(ep.number).includes(epSearch.trim()) ||
        ep.japaneseTitle?.toLowerCase().includes(epSearch.toLowerCase())
      )
    : null;

  const displayedEpisodes = searchedEpisodes
    ? searchedEpisodes
    : numRanges > 1
    ? allEpisodes.slice(selectedRange * PAGE_SIZE, (selectedRange + 1) * PAGE_SIZE)
    : allEpisodes;

  return (
    <div className="min-h-screen pb-20">
      {/* 1. Backdrop Banner Header */}
      <div className="relative w-full h-[55vh] md:h-[65vh] overflow-hidden bg-[#08080A]">
        <img
          src={anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large}
          alt={anime.title.english}
          className="w-full h-full object-cover object-top filter brightness-[0.6] contrast-[1.1]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-[#08080A]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080A]/90 via-[#08080A]/40 to-transparent" />
      </div>

      {/* 2. Main Details Floating Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-44 sm:-mt-56 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster Box */}
          <div className="w-48 sm:w-60 md:w-64 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#15151C] border-2 border-white/10 shadow-2xl shadow-black/80 group relative">
              <img
                src={anime.coverImage?.extraLarge || anime.coverImage?.large}
                alt={anime.title.english}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <Badge variant="red" size="sm">
                  {anime.format || 'TV'}
                </Badge>
              </div>
            </div>

            {/* Quick Action buttons */}
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<Play className="w-5 h-5 fill-white" />}
                onClick={() => navigate(`/watch/${anime.id || anime.anilistId}?ep=1`)}
                className="glow-red"
              >
                Summon & Watch Ep 1
              </Button>
              <Button
                variant={inWatchlist ? 'primary' : 'secondary'}
                fullWidth
                icon={
                  inWatchlist ? (
                    <BookmarkCheck className="w-4 h-4 fill-white" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )
                }
                onClick={() => toggleWatchlist(anime.id)}
              >
                {inWatchlist ? 'In Dark Grimoire' : 'Add to Grimoire'}
              </Button>

              {/* Direct Link Ad - High Speed Stream */}
              <a
                href="https://uplcm.com/4/12340281"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-amber-300 bg-gradient-to-r from-amber-500/15 via-[#F01428]/20 to-amber-500/15 hover:from-amber-500/25 hover:to-[#F01428]/30 border border-amber-500/30 transition-all flex items-center justify-center gap-2 shadow-sm shadow-amber-500/10 cursor-pointer"
                title="Direct Ultra Speed Mirror (Sponsored)"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ VIP Stream Server (Ad)</span>
                <ExternalLink className="w-3 h-3 text-amber-400" />
              </a>
            </div>
          </div>

          {/* Details Content Right */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-[#F01428] uppercase font-display tracking-wider">
                {anime.title?.native} • {anime.title?.romaji}
              </p>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-heading leading-tight">
                {anime.title?.english || anime.title?.romaji}
              </h1>
            </div>

            {/* Badges & Meta Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <span className="flex items-center gap-1 text-sm font-bold text-amber-400 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10">
                <Star className="w-4 h-4 fill-amber-400" />
                {anime.rating} / 10
              </span>
              {anime.malScore && (
                <span className="text-xs text-blue-400 bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-500/20 font-semibold">
                  Community: {anime.malScore}
                </span>
              )}
              <Badge variant="green" size="sm">
                {anime.status}
              </Badge>
              <Badge variant="glass" size="sm">
                {anime.ageRating || 'PG-13'}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-[#9E9EB2] bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/5">
                <Calendar className="w-3.5 h-3.5" /> {anime.year} {anime.season || ''}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#9E9EB2] bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/5">
                <Clock className="w-3.5 h-3.5" /> {anime.duration || 24} mins/ep
              </span>
              <span className="flex items-center gap-1 text-xs text-[#9E9EB2] bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/5">
                <Tv className="w-3.5 h-3.5" /> {anime.episodes ? `${anime.episodes} Episodes` : 'Simulcast'}
              </span>
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                🇯🇵 SUB
              </span>
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                🇬🇧 ENG DUB
              </span>
              {anime.isHindiDubbed && (
                <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 font-extrabold animate-pulse">
                  🇮🇳 HINDI DUB
                </span>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs text-[#9E9EB2] hover:text-white bg-white/[0.05] hover:bg-white/10 px-3 py-1 rounded-lg border border-white/5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Link!' : 'Share'}</span>
              </button>
            </div>

            {/* Genres Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {anime.genres?.map((genre: string) => (
                <Link
                  key={genre}
                  to={`/anime?genre=${encodeURIComponent(genre)}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#1C1C26] hover:bg-[#F01428] text-white border border-white/10 hover:border-transparent transition-colors font-medium"
                >
                  {genre}
                </Link>
              ))}
            </div>

            {/* Synopsis */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9E9EB2] mb-1 font-heading">
                Synopsis
              </h3>
              <p className="text-sm sm:text-base text-[#D0D0E0] leading-relaxed font-body">
                {anime.description?.replace(/<[^>]*>?/gm, '')}
              </p>
            </div>

            {/* Metadata Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#121218] border border-white/[0.06] text-xs">
              <div>
                <span className="text-[#646478] block">Studios</span>
                <span className="font-semibold text-white">
                  {Array.isArray(anime.studios) && anime.studios.length > 0
                    ? anime.studios.join(', ')
                    : 'Animation Studio'}
                </span>
              </div>
              <div>
                <span className="text-[#646478] block">Audio Languages</span>
                <span className="font-semibold text-white">Japanese (Sub), English (Dub){anime.isHindiDubbed ? ', Hindi (Dub)' : ''}</span>
              </div>
              <div>
                <span className="text-[#646478] block">Library ID</span>
                <span className="font-semibold text-white font-mono">
                  #{anime.anilistId || anime.id}
                </span>
              </div>
              <div>
                <span className="text-[#646478] block">Community Score</span>
                <span className="font-semibold text-emerald-400">{anime.scorePercent || 85}% Positive</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Tabbed Navigation Section */}
        <div className="mt-14 border-b border-white/[0.08] flex flex-wrap gap-4 sm:gap-8">
          <button
            onClick={() => setActiveTab('episodes')}
            className={`pb-4 text-base font-bold font-heading transition-colors relative cursor-pointer ${
              activeTab === 'episodes' ? 'text-white' : 'text-[#9E9EB2] hover:text-white'
            }`}
          >
            Episodes ({allEpisodes.length || anime.episodes || 12})
            {activeTab === 'episodes' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F01428] shadow-[0_0_8px_#F01428]" />
            )}
          </button>

          {relations.length > 0 && (
            <button
              onClick={() => setActiveTab('seasons')}
              className={`pb-4 text-base font-bold font-heading transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'seasons' ? 'text-white' : 'text-[#9E9EB2] hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 text-[#F01428]" /> Seasons & Franchise ({relations.length})
              {activeTab === 'seasons' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F01428] shadow-[0_0_8px_#F01428]" />
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('characters')}
            className={`pb-4 text-base font-bold font-heading transition-colors relative cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'characters' ? 'text-white' : 'text-[#9E9EB2] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Characters & Cast ({characters.length})
            {activeTab === 'characters' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F01428] shadow-[0_0_8px_#F01428]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-base font-bold font-heading transition-colors relative cursor-pointer ${
              activeTab === 'overview' ? 'text-white' : 'text-[#9E9EB2] hover:text-white'
            }`}
          >
            Overview & Details
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F01428] shadow-[0_0_8px_#F01428]" />
            )}
          </button>

          {recommendations.length > 0 && (
            <button
              onClick={() => setActiveTab('related')}
              className={`pb-4 text-base font-bold font-heading transition-colors relative cursor-pointer ${
                activeTab === 'related' ? 'text-white' : 'text-[#9E9EB2] hover:text-white'
              }`}
            >
              Recommendations ({recommendations.length})
              {activeTab === 'related' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F01428] shadow-[0_0_8px_#F01428]" />
              )}
            </button>
          )}
        </div>

        {/* 4. Tab Content */}
        <div className="mt-8">
          {/* EPISODES TAB */}
          {activeTab === 'episodes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#9E9EB2]">
                <div className="flex items-center gap-2">
                  <span>Episodes:</span>
                  <span className="text-[#F01428] font-bold">1 - {allEpisodes.length || 12}</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white/70">DevilMotion Verified Information</span>
                </div>
                {/* Search / filter in episodes */}
                {allEpisodes.length > 6 && (
                  <input
                    type="text"
                    value={epSearch}
                    onChange={e => setEpSearch(e.target.value)}
                    placeholder="Find episode title or number..."
                    className="px-3 py-1.5 bg-[#16161E] border border-white/10 rounded-lg text-xs text-white placeholder-[#646478] focus:outline-none focus:border-[#F01428] w-full sm:w-60"
                  />
                )}
              </div>

              {/* Range Selector if > 24 episodes */}
              {ranges.length > 1 && !epSearch.trim() && (
                <div className="flex flex-wrap gap-2 pt-1 pb-1">
                  {ranges.map((range, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedRange(idx)}
                      className={`text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                        selectedRange === idx
                          ? 'bg-[#F01428] text-white border-[#F01428] font-bold shadow-sm shadow-[#F01428]/30'
                          : 'bg-[#15151C] text-[#9E9EB2] border-white/10 hover:text-white'
                      }`}
                    >
                      EP {range.start} - {range.end}
                    </button>
                  ))}
                </div>
              )}

              {displayedEpisodes.length === 0 ? (
                <div className="text-center py-12 text-[#9E9EB2]">
                  <p>No episodes matching "{epSearch}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedEpisodes.map((episode: any) => (
                    <EpisodeCard
                      key={episode.id || episode.number}
                      animeId={anime.id || anime.anilistId}
                      animeTitle={anime.title.english || anime.title.romaji}
                      episode={episode}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SEASONS & FRANCHISE TAB */}
          {activeTab === 'seasons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-[#9E9EB2]">
                <p>All connected seasons, prequels, sequels, movies, and spin-offs in this franchise:</p>
                <span className="text-[#F01428] font-bold">{relations.length} Connected Titles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {relations.map((rel: any) => {
                  const formatRelType = (t: string) => {
                    switch (t) {
                      case 'SEQUEL':
                        return { label: 'Sequel / Next Season', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
                      case 'PREQUEL':
                        return { label: 'Prequel / Previous', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
                      case 'SIDE_STORY':
                        return { label: 'Side Story', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
                      case 'SPIN_OFF':
                        return { label: 'Spin-Off', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
                      case 'ALTERNATIVE':
                        return { label: 'Alternative Version', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
                      case 'PARENT':
                        return { label: 'Main Series', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
                      default:
                        return { label: t.replace(/_/g, ' '), color: 'bg-white/10 text-white border-white/20' };
                    }
                  };
                  const badgeInfo = formatRelType(rel.relationType || 'RELATED');

                  return (
                    <div
                      key={rel.id}
                      className="flex flex-col bg-[#121218] border border-white/[0.08] hover:border-[#F01428]/40 rounded-xl overflow-hidden group transition-all duration-300"
                    >
                      <div className="flex gap-3 p-3 flex-1">
                        <Link to={`/anime/${rel.id}`} className="relative w-20 aspect-[3/4] rounded-lg overflow-hidden shrink-0 bg-black/60">
                          <img
                            src={rel.coverImage || '/logo_cropped.png'}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider mb-1.5 ${badgeInfo.color}`}>
                              {badgeInfo.label}
                            </span>
                            <Link
                              to={`/anime/${rel.id}`}
                              className="text-sm font-bold text-white font-heading line-clamp-2 hover:text-[#F01428] transition-colors"
                            >
                              {rel.title}
                            </Link>
                          </div>
                          <div className="text-[11px] text-[#9E9EB2] flex flex-wrap items-center gap-2 mt-2">
                            <span className="font-semibold text-white/80">{rel.format || 'TV'}</span>
                            {rel.year && (
                              <>
                                <span>•</span>
                                <span>{rel.year}</span>
                              </>
                            )}
                            {rel.episodes && (
                              <>
                                <span>•</span>
                                <span className="text-[#F01428] font-bold">{rel.episodes} EPS</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#16161E] px-3 py-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                        <Link
                          to={`/anime/${rel.id}`}
                          className="text-xs text-[#9E9EB2] hover:text-white font-semibold transition-colors flex-1 text-center py-1 rounded-md bg-white/5 hover:bg-white/10"
                        >
                          View Details
                        </Link>
                        <Link
                          to={`/watch/${rel.id}?ep=1`}
                          className="text-xs text-white font-bold transition-colors flex-1 text-center py-1 rounded-md bg-[#F01428] hover:bg-[#D01020] shadow-sm shadow-[#F01428]/30 flex items-center justify-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-white" /> Watch
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHARACTERS & VOICE ACTORS TAB */}
          {activeTab === 'characters' && (
            <div className="space-y-4">
              {characters.length === 0 ? (
                <div className="text-center py-12 text-[#9E9EB2]">
                  <p>Cast & character details are currently being updated.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {characters.map((c: any) => (
                    <div
                      key={c.id || c.name}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#121218] border border-white/5 hover:border-white/10 transition-colors"
                    >
                      {/* Character Left */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-14 rounded-lg overflow-hidden bg-black/40 shrink-0">
                          {c.image ? (
                            <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-white/30">
                              No pic
                            </div>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-white line-clamp-1">{c.name}</p>
                          <span className="text-[10px] text-[#9E9EB2] uppercase font-semibold">
                            {c.role || 'Main'}
                          </span>
                        </div>
                      </div>

                      {/* Voice Actor Right */}
                      {c.voiceActor?.name && (
                        <div className="flex items-center gap-2 text-right">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-[#E0E0EC] line-clamp-1">
                              {c.voiceActor.name}
                            </p>
                            <span className="text-[10px] text-[#F01428] font-bold">
                              {c.voiceActor.language || 'Japanese'}
                            </span>
                          </div>
                          {c.voiceActor.image && (
                            <img
                              src={c.voiceActor.image}
                              alt={c.voiceActor.name}
                              className="w-9 h-11 rounded-lg object-cover bg-black/40 shrink-0"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h4 className="text-base font-bold text-white font-heading mb-2">About the Story</h4>
                  <p className="text-sm text-[#C0C0D0] leading-relaxed">
                    {anime.description?.replace(/<[^>]*>?/gm, '')}
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-[#121218] border border-white/[0.06] h-fit">
                <h4 className="text-sm font-bold text-white font-heading uppercase tracking-wider text-[#F01428]">
                  Anime Information
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#646478]">Format</span>
                    <span className="text-white font-semibold">{anime.format}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#646478]">Status</span>
                    <span className="text-emerald-400 font-semibold">{anime.status}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#646478]">Year</span>
                    <span className="text-white font-semibold">{anime.year}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#646478]">Platform Rating</span>
                    <span className="text-amber-400 font-semibold">{anime.rating} / 10</span>
                  </div>
                  {anime.malScore && (
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-[#646478]">Community Score</span>
                      <span className="text-blue-400 font-semibold">{anime.malScore} / 10</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RELATED / RECOMMENDATIONS TAB */}
          {activeTab === 'related' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
              {recommendations.map((item: any) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
