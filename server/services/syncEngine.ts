import { prisma } from '../db';
import { AniListService } from './anilistService';
import { AnikotoService } from './anikotoService';
import { AnimeAggregationService } from './animeAggregationService';

export class SyncEngine {
  private static recentIntervalTimer: NodeJS.Timeout | null = null;
  private static metadataIntervalTimer: NodeJS.Timeout | null = null;
  private static jikanIntervalTimer: NodeJS.Timeout | null = null;

  /**
   * Run initial sync on server startup
   */
  static async start(): Promise<void> {
    console.log('[SyncEngine] Initializing background synchronization workers...');

    // Run quick startup sync
    this.runAniListSync('INITIAL_STARTUP')
      .then(() => {
        // After AniList sync, run an initial Jikan enrichment for top items
        this.runJikanEnrichmentSync('INITIAL_STARTUP').catch(e =>
          console.warn('[SyncEngine] Initial Jikan enrichment warning:', e.message)
        );
      })
      .catch(err =>
        console.warn('[SyncEngine] Initial AniList sync warning:', err.message)
      );

    this.runAnikotoSync('INITIAL_STARTUP').catch(err =>
      console.warn('[SyncEngine] Initial Anikoto sync warning:', err.message)
    );

    this.runScheduleSync('INITIAL_STARTUP').catch(err =>
      console.warn('[SyncEngine] Initial Schedule sync warning:', err.message)
    );

    // Schedule periodic metadata sync (every 6 hours)
    const metadataMinutes = parseInt(process.env.SYNC_INTERVAL_METADATA || '360', 10);
    this.metadataIntervalTimer = setInterval(() => {
      this.runAniListSync('SCHEDULED_INTERVAL');
      this.runScheduleSync('SCHEDULED_INTERVAL');
    }, metadataMinutes * 60 * 1000);

    // Schedule periodic episode discovery sync (every 15 min)
    const recentMinutes = parseInt(process.env.SYNC_INTERVAL_RECENT || '15', 10);
    this.recentIntervalTimer = setInterval(() => {
      this.runAnikotoSync('SCHEDULED_INTERVAL');
    }, recentMinutes * 60 * 1000);

    // Schedule periodic Jikan enrichment sync (every 60 min)
    this.jikanIntervalTimer = setInterval(() => {
      this.runJikanEnrichmentSync('SCHEDULED_INTERVAL');
    }, 60 * 60 * 1000);

    console.log(
      `[SyncEngine] Workers active: AniList every ${metadataMinutes}m, Anikoto every ${recentMinutes}m, Jikan every 60m`
    );
  }

  /**
   * Stop workers cleanly
   */
  static stop(): void {
    if (this.metadataIntervalTimer) clearInterval(this.metadataIntervalTimer);
    if (this.recentIntervalTimer) clearInterval(this.recentIntervalTimer);
    if (this.jikanIntervalTimer) clearInterval(this.jikanIntervalTimer);
  }

  /**
   * Synchronize AniList metadata
   */
  static async runAniListSync(triggerType: string): Promise<any> {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'ANILIST_METADATA',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    try {
      console.log(`[SyncEngine] Running AniList metadata sync (${triggerType})...`);
      const trending = await AniListService.getTrending(1, 15);
      await new Promise(r => setTimeout(r, 400));
      const popular = await AniListService.getPopular(1, 15);
      await new Promise(r => setTimeout(r, 400));
      const topRated = await AniListService.getTopRated(1, 15);
      await new Promise(r => setTimeout(r, 400));
      const airing = await AniListService.getCurrentlyAiring(1, 15);

      const totalItems = trending.length + popular.length + topRated.length + airing.length;

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          itemsProcessed: totalItems,
          itemsAdded: totalItems,
          completedAt: new Date(),
        },
      });

      console.log(`[SyncEngine] AniList metadata sync completed: ${totalItems} media processed.`);
      return { status: 'SUCCESS', itemsProcessed: totalItems };
    } catch (error: any) {
      console.error('[SyncEngine] AniList sync failed:', error.message);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * Synchronize Jikan enrichment (characters, voice actors, filler flags)
   */
  static async runJikanEnrichmentSync(triggerType: string): Promise<any> {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'JIKAN_ENRICHMENT',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    try {
      console.log(`[SyncEngine] Running Jikan enrichment sync (${triggerType})...`);

      // Find top anime with malId that don't have characters yet
      const candidateAnime = await prisma.anime.findMany({
        where: {
          malId: { not: null },
          characters: { none: {} },
        },
        take: 10,
        orderBy: { popularity: 'desc' },
      });

      let enrichedCount = 0;
      for (const anime of candidateAnime) {
        try {
          await AnimeAggregationService.enrichDbAnimeWithJikan(anime.id);
          enrichedCount++;
        } catch (err: any) {
          console.warn(`[SyncEngine] Jikan enrichment failed for ${anime.titleEnglish}: ${err.message}`);
        }
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          itemsProcessed: candidateAnime.length,
          itemsUpdated: enrichedCount,
          completedAt: new Date(),
        },
      });

      console.log(`[SyncEngine] Jikan enrichment sync completed: ${enrichedCount} anime enriched.`);
      return { status: 'SUCCESS', candidateCount: candidateAnime.length, enrichedCount };
    } catch (error: any) {
      console.error('[SyncEngine] Jikan enrichment failed:', error.message);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * Synchronize Airing Schedules
   */
  static async runScheduleSync(triggerType: string): Promise<any> {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'SCHEDULE_SYNC',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    try {
      console.log(`[SyncEngine] Running Schedule sync (${triggerType})...`);
      const now = Math.floor(Date.now() / 1000);
      const startOfWeek = now - 86400 * 2;
      const endOfWeek = now + 86400 * 5;

      const schedules = await AniListService.getWeeklySchedule(startOfWeek, endOfWeek);

      let savedCount = 0;
      for (const item of schedules) {
        if (!item.media?.id) continue;
        const anime = await prisma.anime.findUnique({
          where: { anilistId: item.media.id },
        });

        if (anime) {
          await prisma.airingSchedule.upsert({
            where: {
              animeId_episodeNumber: {
                animeId: anime.id,
                episodeNumber: item.episode,
              },
            },
            update: {
              airingAt: new Date(item.airingAt * 1000),
              timeUntilAiring: item.timeUntilAiring,
              lastCheckedAt: new Date(),
            },
            create: {
              animeId: anime.id,
              episodeNumber: item.episode,
              airingAt: new Date(item.airingAt * 1000),
              timeUntilAiring: item.timeUntilAiring,
              source: 'ANILIST',
            },
          });
          savedCount++;
        }
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          itemsProcessed: schedules.length,
          itemsAdded: savedCount,
          completedAt: new Date(),
        },
      });

      console.log(`[SyncEngine] Schedule sync completed: ${savedCount} schedules saved.`);
      return { status: 'SUCCESS', schedulesCount: schedules.length, savedCount };
    } catch (error: any) {
      console.error('[SyncEngine] Schedule sync failed:', error.message);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * Synchronize Anikoto episode mappings
   */
  static async runAnikotoSync(triggerType: string): Promise<any> {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'ANIKOTO_EPISODES',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    try {
      console.log(`[SyncEngine] Running Anikoto episode sync (${triggerType})...`);
      const { processed, mapped } = await AnikotoService.syncEpisodes();

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          itemsProcessed: processed,
          itemsAdded: mapped,
          completedAt: new Date(),
        },
      });

      console.log(`[SyncEngine] Anikoto sync completed: ${processed} processed, ${mapped} mapped.`);
      return { status: 'SUCCESS', processed, mapped };
    } catch (error: any) {
      console.error('[SyncEngine] Anikoto sync failed:', error.message);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }
}
