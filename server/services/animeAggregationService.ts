import { prisma } from '../db';
import { AniListMedia, AniListService } from './anilistService';
import { JikanService } from './jikanService';
import { MalService } from './malService';

export interface NormalizedAnime {
  id: string;
  anilistId: number;
  malId: number | null;
  title: {
    english: string;
    romaji: string;
    native: string;
    alternative: string[];
  };
  description: string;
  coverImage: {
    large: string;
    extraLarge: string;
    medium: string;
  };
  bannerImage: string | null;
  format: string;
  status: string;
  year: number;
  season?: string;
  episodes: number;
  duration: number;
  countryOfOrigin: string;
  rating: number; // 0 - 10 scale
  scorePercent: number; // 0 - 100
  anilistScore: number | null;
  malScore: number | null;
  popularity: number;
  favourites: number;
  genres: string[];
  studios: string[];
  isTrending: boolean;
  isPopular: boolean;
  isTopRated: boolean;
  isHindiDubbed: boolean;
  isEnglishDubbed: boolean;
  isUpcoming: boolean;
}

export class AnimeAggregationService {
  /**
   * Aggregate and normalize AniList data with Jikan & MAL enrichment, then persist into SQLite
   */
  static async ingestAndNormalize(
    aniListMedia: AniListMedia,
    options: {
      enrichWithJikan?: boolean;
      flags?: {
        isTrending?: boolean;
        isPopular?: boolean;
        isTopRated?: boolean;
        isHindiDubbed?: boolean;
        isEnglishDubbed?: boolean;
      };
    } = {}
  ): Promise<NormalizedAnime> {
    const { enrichWithJikan = false, flags = {} } = options;

    const anilistId = aniListMedia.id;
    let malId = aniListMedia.idMal || null;

    // Computed total episodes count available across entire method
    const totalEpisodesCount =
      aniListMedia.episodes ||
      (aniListMedia.nextAiringEpisode ? aniListMedia.nextAiringEpisode.episode - 1 : 12);

    // 1. Prepare Base AniList Information
    const titleEng = aniListMedia.title?.english || aniListMedia.title?.romaji || 'Unknown Title';
    const titleRom = aniListMedia.title?.romaji || titleEng;
    const titleNat = aniListMedia.title?.native || '';
    const desc = (aniListMedia.description || '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    const cover =
      aniListMedia.coverImage?.large ||
      aniListMedia.coverImage?.extraLarge ||
      aniListMedia.coverImage?.medium ||
      '';
    const coverXL = aniListMedia.coverImage?.extraLarge || cover;
    const banner = aniListMedia.bannerImage || null;
    const genres = aniListMedia.genres || [];
    const studios = aniListMedia.studios?.nodes?.map(n => n.name).filter(Boolean) || [];
    const rawScore = aniListMedia.averageScore;
    const anilistScore = rawScore ? (rawScore > 10 ? rawScore / 10 : rawScore) : null;

    let malScore: number | null = null;
    let alternativeTitles: string[] = [];
    let jikanEpisodes: any[] = [];
    let jikanCharacters: any[] = [];
    let jikanFullData: any = null;

    // 2. Fetch Jikan/MAL Data if requested and malId is present
    if (enrichWithJikan && malId) {
      try {
        const [full, epData, charData] = await Promise.all([
          JikanService.getAnimeFull(malId),
          JikanService.getAnimeEpisodes(malId, 1),
          JikanService.getAnimeCharacters(malId),
        ]);

        jikanFullData = full;
        if (full) {
          if (full.score) malScore = full.score;
          if (full.titles && Array.isArray(full.titles)) {
            alternativeTitles = full.titles.map((t: any) => t.title).filter(Boolean);
          }
        }

        jikanEpisodes = epData || [];
        jikanCharacters = charData || [];
      } catch (err: any) {
        console.warn(`[Aggregator] Jikan enrichment skipped for AniList ${anilistId}: ${err.message}`);
      }
    }

    // 3. Save / Upsert Anime in Database
    const avgScore = anilistScore || malScore || 8.0;

    const animeRecord = await prisma.anime.upsert({
      where: { anilistId },
      update: {
        malId: malId || undefined,
        titleEnglish: titleEng,
        titleRomaji: titleRom,
        titleNative: titleNat || undefined,
        alternativeTitles: JSON.stringify(alternativeTitles),
        description: desc,
        coverImage: cover,
        coverImageExtraLarge: coverXL,
        bannerImage: banner,
        genres: JSON.stringify(genres),
        releaseYear: aniListMedia.seasonYear || aniListMedia.startDate?.year || null,
        season: aniListMedia.season || null,
        format: aniListMedia.format || 'TV',
        status: aniListMedia.status || 'FINISHED',
        totalEpisodes: aniListMedia.episodes || null,
        duration: aniListMedia.duration || 24,
        averageScore: avgScore,
        anilistScore: anilistScore,
        malScore: malScore,
        popularity: aniListMedia.popularity || null,
        studios: JSON.stringify(studios),
        lastSyncedAt: new Date(),
        ...flags,
      },
      create: {
        anilistId,
        malId,
        titleEnglish: titleEng,
        titleRomaji: titleRom,
        titleNative: titleNat || null,
        alternativeTitles: JSON.stringify(alternativeTitles),
        description: desc,
        coverImage: cover,
        coverImageExtraLarge: coverXL,
        bannerImage: banner,
        genres: JSON.stringify(genres),
        releaseYear: aniListMedia.seasonYear || aniListMedia.startDate?.year || null,
        season: aniListMedia.season || null,
        format: aniListMedia.format || 'TV',
        status: aniListMedia.status || 'FINISHED',
        totalEpisodes: aniListMedia.episodes || null,
        duration: aniListMedia.duration || 24,
        averageScore: avgScore,
        anilistScore: anilistScore,
        malScore: malScore,
        popularity: aniListMedia.popularity || null,
        studios: JSON.stringify(studios),
        firstSeenAt: new Date(),
        lastSyncedAt: new Date(),
        ...flags,
      },
    });

    // 4. Record Source Metadata Snapshot
    try {
      await prisma.animeSourceMetadata.upsert({
        where: {
          animeId_sourceName: {
            animeId: animeRecord.id,
            sourceName: 'ANILIST',
          },
        },
        update: {
          metadata: JSON.stringify(aniListMedia),
          updatedAt: new Date(),
        },
        create: {
          animeId: animeRecord.id,
          sourceName: 'ANILIST',
          sourceRecordId: String(anilistId),
          metadata: JSON.stringify(aniListMedia),
        },
      });

      if (jikanFullData && malId) {
        await prisma.animeSourceMetadata.upsert({
          where: {
            animeId_sourceName: {
              animeId: animeRecord.id,
              sourceName: 'JIKAN',
            },
          },
          update: {
            metadata: JSON.stringify(jikanFullData),
            updatedAt: new Date(),
          },
          create: {
            animeId: animeRecord.id,
            sourceName: 'JIKAN',
            sourceRecordId: String(malId),
            metadata: JSON.stringify(jikanFullData),
          },
        });
      }
    } catch {}

    // 5. Populate and Upsert Episodes with Jikan enrichment (only on detailed sync, not on broad list ingest)
    if (enrichWithJikan) {
      try {
        const totalCount = totalEpisodesCount;
        const maxEpsToSync = Math.min(totalCount > 0 ? totalCount : 12, 50);

        for (let ep = 1; ep <= maxEpsToSync; ep++) {
          const jikanEp = jikanEpisodes.find((e: any) => e.mal_id === ep);

          const title = jikanEp?.title || `Episode ${ep}`;
          const titleJp = jikanEp?.title_japanese || null;
          const isFiller = Boolean(jikanEp?.filler);
          const isRecap = Boolean(jikanEp?.recap);
          const airedAt = jikanEp?.aired ? new Date(jikanEp.aired) : null;

          await prisma.episode.upsert({
            where: {
              animeId_episodeNumber: {
                animeId: animeRecord.id,
                episodeNumber: ep,
              },
            },
            update: {
              episodeTitle: title,
              japaneseTitle: titleJp,
              filler: isFiller,
              recap: isRecap,
              airedAt: airedAt,
              metadataSource: jikanEp ? 'JIKAN' : 'ANILIST',
              thumbnail: banner || cover,
              thumbnailUrl: banner || cover,
            },
            create: {
              animeId: animeRecord.id,
              episodeNumber: ep,
              episodeTitle: title,
              japaneseTitle: titleJp,
              filler: isFiller,
              recap: isRecap,
              airedAt: airedAt,
              metadataSource: jikanEp ? 'JIKAN' : 'ANILIST',
              thumbnail: banner || cover,
              thumbnailUrl: banner || cover,
              metadataStatus: 'AVAILABLE',
            },
          });
        }
      } catch (epErr: any) {
        console.warn(`[Aggregator] Episode upsert skipped: ${epErr.message}`);
      }
    }

    // 6. Ingest Characters and Voice Actors (if enriched from Jikan)
    if (jikanCharacters.length > 0) {
      // Clear out older character links to prevent duplicates
      await prisma.animeCharacter.deleteMany({ where: { animeId: animeRecord.id } });

      const topCharacters = jikanCharacters.slice(0, 12);
      for (const charItem of topCharacters) {
        const char = charItem.character;
        const voiceActor = charItem.voice_actors?.find(
          (va: any) => va.language === 'Japanese'
        ) || charItem.voice_actors?.[0];

        if (char?.name) {
          await prisma.animeCharacter.create({
            data: {
              animeId: animeRecord.id,
              characterId: char.mal_id ? String(char.mal_id) : null,
              name: char.name,
              role: charItem.role || 'Main',
              imageUrl: char.images?.jpg?.image_url || null,
              voiceActorName: voiceActor?.person?.name || null,
              voiceActorLanguage: voiceActor?.language || 'Japanese',
              voiceActorImage: voiceActor?.person?.images?.jpg?.image_url || null,
            },
          });
        }
      }
    }

    // 7. Ingest Airing Schedule if next airing episode exists
    if (aniListMedia.nextAiringEpisode) {
      const nextEp = aniListMedia.nextAiringEpisode;
      await prisma.airingSchedule.upsert({
        where: {
          animeId_episodeNumber: {
            animeId: animeRecord.id,
            episodeNumber: nextEp.episode,
          },
        },
        update: {
          airingAt: new Date(nextEp.airingAt * 1000),
          timeUntilAiring: nextEp.timeUntilAiring,
          lastCheckedAt: new Date(),
        },
        create: {
          animeId: animeRecord.id,
          episodeNumber: nextEp.episode,
          airingAt: new Date(nextEp.airingAt * 1000),
          timeUntilAiring: nextEp.timeUntilAiring,
          source: 'ANILIST',
        },
      });
    }

    return {
      id: String(anilistId),
      anilistId,
      malId,
      title: {
        english: titleEng,
        romaji: titleRom,
        native: titleNat,
        alternative: alternativeTitles,
      },
      description: desc,
      coverImage: {
        large: cover,
        extraLarge: coverXL,
        medium: cover,
      },
      bannerImage: banner,
      format: aniListMedia.format || 'TV',
      status: aniListMedia.status || 'FINISHED',
      year: aniListMedia.seasonYear || aniListMedia.startDate?.year || 2024,
      season: aniListMedia.season,
      episodes: totalEpisodesCount,
      duration: aniListMedia.duration || 24,
      countryOfOrigin: 'JP',
      rating: avgScore,
      scorePercent: Math.round(avgScore * 10),
      anilistScore,
      malScore,
      popularity: aniListMedia.popularity || 0,
      favourites: 0,
      genres,
      studios,
      isTrending: Boolean(flags.isTrending),
      isPopular: Boolean(flags.isPopular),
      isTopRated: Boolean(flags.isTopRated),
      isHindiDubbed: Boolean(flags.isHindiDubbed),
      isEnglishDubbed: Boolean(flags.isEnglishDubbed),
      isUpcoming: aniListMedia.status === 'NOT_YET_RELEASED',
    };
  }

  /**
   * Enrich an existing DB anime record with Jikan if not enriched yet
   */
  static async enrichDbAnimeWithJikan(identifier: string | number): Promise<void> {
    const numId = typeof identifier === 'number' ? identifier : parseInt(identifier, 10);
    const isNum = !isNaN(numId);

    const anime = await prisma.anime.findFirst({
      where: isNum
        ? {
            OR: [{ anilistId: numId }, { malId: numId }, { id: String(identifier) }],
          }
        : { id: String(identifier) },
      include: {
        characters: true,
        sourceMetadata: true,
      },
    });

    if (!anime || !anime.malId) return;

    const alreadyHasJikan = anime.sourceMetadata.some(s => s.sourceName === 'JIKAN');
    if (alreadyHasJikan && anime.characters.length > 0) return;

    try {
      const [epData, charData] = await Promise.all([
        JikanService.getAnimeEpisodes(anime.malId, 1),
        JikanService.getAnimeCharacters(anime.malId),
      ]);

      // Enrich episodes
      for (const jikanEp of epData) {
        await prisma.episode.updateMany({
          where: {
            animeId: anime.id,
            episodeNumber: jikanEp.mal_id,
          },
          data: {
            episodeTitle: jikanEp.title,
            japaneseTitle: jikanEp.title_japanese || null,
            filler: Boolean(jikanEp.filler),
            recap: Boolean(jikanEp.recap),
            metadataSource: 'JIKAN',
            airedAt: jikanEp.aired ? new Date(jikanEp.aired) : undefined,
          },
        });
      }

      // Enrich characters
      if (charData.length > 0) {
        await prisma.animeCharacter.deleteMany({ where: { animeId: anime.id } });
        for (const charItem of charData.slice(0, 12)) {
          const char = charItem.character;
          const voiceActor = charItem.voice_actors?.find(
            (va: any) => va.language === 'Japanese'
          ) || charItem.voice_actors?.[0];

          if (char?.name) {
            await prisma.animeCharacter.create({
              data: {
                animeId: anime.id,
                characterId: char.mal_id ? String(char.mal_id) : null,
                name: char.name,
                role: charItem.role || 'Main',
                imageUrl: char.images?.jpg?.image_url || null,
                voiceActorName: voiceActor?.person?.name || null,
                voiceActorLanguage: voiceActor?.language || 'Japanese',
                voiceActorImage: voiceActor?.person?.images?.jpg?.image_url || null,
              },
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Aggregator] Background Jikan enrichment failed for ${anime.titleEnglish}: ${err.message}`);
    }
  }
}
