import axios from 'axios';
import { prisma } from '../db';

const ANIKOTO_API_BASE_URL = process.env.ANIKOTO_API_BASE_URL || 'https://anikotoapi.site';

export interface AnikotoRecentItem {
  id: string | number;
  title: string;
  current_episode?: number;
  latest_episode?: number;
  image?: string;
  sub_or_dub?: string;
  updated_at?: string;
}

export interface AnikotoEpisode {
  episode_number: number;
  title?: string;
  episode_embed_id?: string;
  sub_embed_url?: string;
  dub_embed_url?: string;
  status?: string;
}

export interface AnikotoSeriesDetails {
  id: string | number;
  title: string;
  total_episodes?: number;
  episodes: AnikotoEpisode[];
}

export class AnikotoService {
  /**
   * Fetch Recently updated anime from Anikoto
   */
  static async getRecentAnime(page = 1, perPage = 20): Promise<AnikotoRecentItem[]> {
    try {
      const response = await axios.get(`${ANIKOTO_API_BASE_URL}/recent-anime`, {
        params: { page, per_page: perPage },
        timeout: 6000,
      });
      return response.data?.data || response.data?.items || response.data || [];
    } catch (error: any) {
      console.warn('Anikoto recent anime discovery unavailable or timed out:', error.message);
      return [];
    }
  }

  /**
   * Fetch series details & episode list from Anikoto
   */
  static async getSeriesDetails(seriesId: string | number): Promise<AnikotoSeriesDetails | null> {
    try {
      const response = await axios.get(`${ANIKOTO_API_BASE_URL}/series/${seriesId}`, {
        timeout: 6000,
      });
      return response.data?.data || response.data || null;
    } catch (error: any) {
      console.warn(`Anikoto series lookup for ID ${seriesId} failed:`, error.message);
      return null;
    }
  }

  /**
   * Match recent Anikoto anime and synchronize episode mappings
   */
  static async syncEpisodes(): Promise<{ processed: number; mapped: number }> {
    let processed = 0;
    let mapped = 0;

    try {
      const recentList = await this.getRecentAnime(1, 15);
      if (!Array.isArray(recentList) || recentList.length === 0) {
        return { processed: 0, mapped: 0 };
      }

      let provider = await prisma.streamingProvider.findFirst({
        where: { providerName: 'Anikoto' },
      });

      if (!provider) {
        provider = await prisma.streamingProvider.create({
          data: {
            providerName: 'Anikoto',
            providerBaseUrl: ANIKOTO_API_BASE_URL,
            enabled: true,
          },
        });
      }

      for (const item of recentList) {
        processed++;
        const title = item.title;
        if (!title) continue;

        // Find matching anime in local DB using fuzzy title matching
        const anime = await prisma.anime.findFirst({
          where: {
            OR: [
              { titleEnglish: { contains: title } },
              { titleRomaji: { contains: title } },
            ],
          },
        });

        if (!anime) continue;

        // Upsert provider anime mapping
        await prisma.providerAnimeMapping.upsert({
          where: {
            animeId_providerId: {
              animeId: anime.id,
              providerId: provider.id,
            },
          },
          update: {
            providerAnimeId: String(item.id),
            mappingStatus: 'VERIFIED',
            lastCheckedAt: new Date(),
          },
          create: {
            animeId: anime.id,
            providerId: provider.id,
            providerAnimeId: String(item.id),
            mappingStatus: 'VERIFIED',
          },
        });

        // Fetch detailed episodes for this series
        const seriesDetails = await this.getSeriesDetails(item.id);
        if (seriesDetails && Array.isArray(seriesDetails.episodes)) {
          for (const ep of seriesDetails.episodes) {
            if (!ep.episode_number) continue;

            // Ensure episode record exists
            const episode = await prisma.episode.upsert({
              where: {
                animeId_episodeNumber: {
                  animeId: anime.id,
                  episodeNumber: ep.episode_number,
                },
              },
              update: {
                episodeTitle: ep.title || undefined,
              },
              create: {
                animeId: anime.id,
                episodeNumber: ep.episode_number,
                episodeTitle: ep.title || `Episode ${ep.episode_number}`,
                thumbnail: anime.bannerImage || anime.coverImage,
                metadataStatus: 'AVAILABLE',
              },
            });

            // Map sub stream
            if (ep.episode_embed_id || ep.sub_embed_url) {
              await prisma.episodeStream.upsert({
                where: {
                  episodeId_providerId_language: {
                    episodeId: episode.id,
                    providerId: provider.id,
                    language: 'sub',
                  },
                },
                update: {
                  providerEpisodeId: ep.episode_embed_id || null,
                  embedUrl: ep.sub_embed_url || `https://megaplay.buzz/stream/s-2/${ep.episode_embed_id}/sub`,
                  availabilityStatus: 'AVAILABLE',
                  lastCheckedAt: new Date(),
                },
                create: {
                  episodeId: episode.id,
                  providerId: provider.id,
                  providerEpisodeId: ep.episode_embed_id || null,
                  language: 'sub',
                  embedUrl: ep.sub_embed_url || `https://megaplay.buzz/stream/s-2/${ep.episode_embed_id}/sub`,
                  availabilityStatus: 'AVAILABLE',
                },
              });
              mapped++;
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Anikoto sync error:', err.message);
    }

    return { processed, mapped };
  }
}
