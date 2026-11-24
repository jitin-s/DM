export type AnimeFormat = 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL';
export type AnimeStatus = 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED';
export type AnimeSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export interface AnimeTitle {
  romaji: string;
  english: string;
  native: string;
  alternative?: string[];
}

export interface AnimeImage {
  extraLarge: string;
  large: string;
  medium: string;
  color?: string;
}

export interface AnimeEpisode {
  id: string;
  number: number;
  title: string;
  japaneseTitle?: string | null;
  hasRealTitle?: boolean;
  isGenericTitle?: boolean;
  thumbnail: string;
  duration: string;
  airDate: string;
  filler?: boolean;
  recap?: boolean;
  metadataSource?: string;
  subAvailable: boolean;
  dubAvailable: boolean;
  description?: string;
}

export interface AnimeCharacterVoiceActor {
  name: string | null;
  language: string | null;
  image: string | null;
}

export interface AnimeCharacter {
  id: string;
  name: string;
  role: string;
  image: string | null;
  voiceActor: AnimeCharacterVoiceActor;
}

export interface AnimeItem {
  id: string;
  dbId?: string;
  anilistId?: number;
  malId?: number | null;
  title: AnimeTitle;
  coverImage: AnimeImage;
  bannerImage: string;
  format: AnimeFormat;
  status: AnimeStatus;
  description: string;
  year: number;
  season?: AnimeSeason;
  episodes: number;
  duration: number; // in mins
  countryOfOrigin?: string;
  rating: number; // 0 - 10
  ratingCount?: number;
  scorePercent?: number; // e.g. 89%
  anilistScore?: number | null;
  malScore?: number | null;
  popularity: number;
  genres: string[];
  studios: string[];
  ageRating: string; // e.g. PG-13, TV-MA
  latestEpisode?: number;
  subAvailable: boolean;
  dubAvailable: boolean;
  isTrending?: boolean;
  isPopular?: boolean;
  isTopRated?: boolean;
  isUpcoming?: boolean;
  isRecentlyUpdated?: boolean;
  isHindiDubbed?: boolean;
  isEnglishDubbed?: boolean;
  ranking?: number;
  releaseSchedule?: {
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    time: string; // "18:30"
    airingDate?: string;
  };
  episodesList: AnimeEpisode[];
  characters?: AnimeCharacter[];
  trailerUrl?: string;
  synonyms?: string[];
  nextAiring?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
  recommendations?: AnimeItem[];
  relations?: AnimeRelation[];
}

export interface AnimeRelation {
  id: string;
  anilistId?: number;
  malId?: number | null;
  title: string;
  relationType: string;
  format: AnimeFormat | string;
  coverImage: string;
  bannerImage?: string;
  status?: string;
  episodes?: number | null;
  year?: number | null;
}

export interface ScheduleDay {
  dayName: string;
  shortName: string;
  dayIndex: number;
  isToday: boolean;
  dateStr: string;
}
