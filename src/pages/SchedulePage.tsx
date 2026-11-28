import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Play, Loader2, ChevronLeft, ChevronRight, RotateCcw, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getScheduleDays } from '../constants/animeConstants';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { AdsterraNativeBanner, AdsterraSmartlinkButton } from '../components/ads/adsterra';

export const SchedulePage: React.FC = () => {
  const scheduleDays = getScheduleDays();
  const todayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [liveSchedules, setLiveSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
    } catch {
      return 'Local Time';
    }
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .getSchedule()
      .then(data => {
        if (!active) return;
        if (data && data.length > 0) {
          setLiveSchedules(data);
        }
      })
      .catch(err => {
        if (!active) return;
        console.error('Failed to load live schedule:', err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filter and deduplicate anime for selected day
  const displayList = useMemo(() => {
    const nowEpoch = Math.floor(Date.now() / 1000);
    const seen = new Set<string>();

    return liveSchedules
      .filter(s => {
        if (!s?.airingAt || !s?.anime) return false;
        // Convert UTC epoch seconds to local Date
        const localDate = new Date(s.airingAt * 1000);
        return localDate.getDay() === selectedDay;
      })
      .filter(s => {
        const uniqueKey = `${s.anime?.id || s.id}-${s.episode}`;
        if (seen.has(uniqueKey)) return false;
        seen.add(uniqueKey);
        return true;
      })
      .sort((a, b) => (a.airingAt || 0) - (b.airingAt || 0))
      .map(s => {
        const localDate = new Date(s.airingAt * 1000);
        const timeDiff = s.airingAt - nowEpoch;

        let statusText = '';
        let isLiveSoon = false;

        if (timeDiff < -3600) {
          statusText = 'Aired';
        } else if (timeDiff < 0) {
          statusText = 'Airing Now';
          isLiveSoon = true;
        } else if (timeDiff < 3600) {
          const mins = Math.max(1, Math.floor(timeDiff / 60));
          statusText = `In ${mins}m`;
          isLiveSoon = true;
        } else if (timeDiff < 86400) {
          const hours = Math.floor(timeDiff / 3600);
          statusText = `In ${hours}h`;
        }

        return {
          id: s.anime?.id || s.id,
          title: s.anime?.title || { english: 'Simulcast Anime' },
          format: s.anime?.format || 'TV',
          coverImage: s.anime?.coverImage || { large: '/logo_cropped.png', medium: '/logo_cropped.png' },
          genres: s.anime?.genres || [],
          description: s.anime?.description || '',
          airingEpisode: s.episode,
          time: localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          statusText,
          isLiveSoon,
        };
      });
  }, [liveSchedules, selectedDay]);

  const handlePrevDay = () => {
    setSelectedDay(prev => (prev === 0 ? 6 : prev - 1));
  };

  const handleNextDay = () => {
    setSelectedDay(prev => (prev === 6 ? 0 : prev + 1));
  };

  const handleJumpToday = () => {
    setSelectedDay(todayIndex);
  };

  const selectedDayMeta = scheduleDays.find(d => d.dayIndex === selectedDay);

  return (
    <div className="pt-24 sm:pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F01428] mb-1 font-display">
              <Calendar className="w-3.5 h-3.5" /> Simulcast Calendar
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white font-heading">
              Weekly Airing Schedule
            </h1>
            <p className="text-sm text-[#9E9EB2] mt-1">
              Synchronized Japanese broadcast times converted automatically to your local timezone.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-[#9E9EB2] bg-white/[0.05] px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#F01428]" />
              <span>{userTimezone}</span>
            </div>

            {/* Quick Navigation Buttons */}
            <div className="flex items-center gap-1 bg-[#15151C] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg text-[#9E9EB2] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleJumpToday}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedDay === todayIndex
                    ? 'bg-[#F01428] text-white'
                    : 'text-[#9E9EB2] hover:text-white hover:bg-white/5'
                }`}
              >
                Today
              </button>

              <button
                onClick={handleNextDay}
                className="p-1.5 rounded-lg text-[#9E9EB2] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Days Selector */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 mb-8 hide-scrollbar">
          {scheduleDays.map(day => {
            const isSelected = selectedDay === day.dayIndex;
            return (
              <button
                key={day.dayName}
                onClick={() => setSelectedDay(day.dayIndex)}
                className={`flex-1 min-w-[100px] sm:min-w-[120px] p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#F01428] text-white border-[#F01428] shadow-lg shadow-[#F01428]/30 font-bold scale-[1.02]'
                    : 'bg-[#121218] text-[#9E9EB2] border-white/5 hover:border-white/15 hover:bg-[#181822]'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs uppercase tracking-wider opacity-80">{day.shortName}</span>
                  {day.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Today" />
                  )}
                </div>
                <div className="text-base sm:text-lg font-bold font-heading mt-0.5">{day.dayName}</div>
                <div className="text-[11px] opacity-70 mt-1">{day.dateStr}</div>
              </button>
            );
          })}
        </div>

        {/* Adsterra Top/Middle Simulcast Calendar Placement */}
        <div className="mb-8 space-y-4">
          <AdsterraSmartlinkButton
            variant="banner"
            label="⚡ Stream Live Simulcast Releases in Ultra HD 4K without Buffer"
          />
          <AdsterraNativeBanner title="Sponsored Simulcast Releases" />
        </div>

        {/* Selected Day Info Banner */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#F01428] rounded-full" />
            <h2 className="text-xl font-bold text-white font-heading">
              {selectedDayMeta?.dayName || 'Airing'} Releases ({displayList.length})
            </h2>
          </div>
          {selectedDay === todayIndex && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Today's Broadcasts</span>
            </div>
          )}
        </div>

        {/* Airing Anime List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-[#F01428] animate-spin mb-3" />
            <p className="text-xs text-[#9E9EB2]">Loading broadcasting schedule...</p>
          </div>
        ) : displayList.length === 0 ? (
          <EmptyState
            icon="film"
            title="No Simulcasts Scheduled"
            description={`There are no scheduled releases for ${selectedDayMeta?.dayName || 'this day'}. Try checking surrounding days for new episodes!`}
            actionText="Go to Today"
            onAction={handleJumpToday}
          />
        ) : (
          <div className="space-y-4">
            {displayList.map(anime => (
              <div
                key={`${anime.id}-${anime.airingEpisode}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#121218] border border-white/[0.08] hover:border-[#F01428]/50 transition-all duration-300 shadow-md group"
              >
                <div className="flex items-center gap-4">
                  <Link
                    to={`/anime/${anime.id}`}
                    className="relative w-16 sm:w-20 aspect-[2/3] rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10"
                  >
                    <img
                      src={anime.coverImage.medium || anime.coverImage.large}
                      alt={anime.title.english || anime.title.romaji || 'Anime'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </Link>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="red" size="xs">
                        EP {anime.airingEpisode}
                      </Badge>
                      <span className="text-xs text-[#9E9EB2] font-semibold">{anime.format || 'TV'}</span>
                      <span className="text-xs text-[#646478]">•</span>
                      <span className="text-xs text-[#9E9EB2]">
                        {Array.isArray(anime.genres) ? anime.genres.slice(0, 2).join(', ') : ''}
                      </span>
                      {anime.statusText && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            anime.isLiveSoon
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-white/5 text-[#9E9EB2]'
                          }`}
                        >
                          {anime.statusText}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/anime/${anime.id}`}
                      className="text-base sm:text-lg font-bold text-white group-hover:text-[#F01428] transition-colors font-heading block"
                    >
                      {anime.title.english || anime.title.romaji}
                    </Link>

                    <p className="text-xs text-[#9E9EB2] line-clamp-1 max-w-xl">
                      {anime.description?.replace(/<[^>]*>?/gm, '')}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-white/5 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{anime.time}</span>
                  </div>

                  <Link
                    to={`/anime/${anime.id}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#F01428] hover:bg-[#ff2035] px-3.5 py-1.5 rounded-lg shadow-md shadow-[#F01428]/30 transition-all hover:scale-105 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Stream Series</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
