import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, requireAdmin } from './authRoutes';
import { SyncEngine } from '../services/syncEngine';
import { invalidateCache } from '../middleware/cache';

export const adminRouter = Router();

// Apply auth and require admin role
adminRouter.use(authenticateUser);
adminRouter.use(requireAdmin);

/**
 * Get Platform Operational Statistics
 */
adminRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalAnime,
      totalEpisodes,
      totalStreams,
      totalUsers,
      recentSyncLogs,
      providers,
    ] = await Promise.all([
      prisma.anime.count(),
      prisma.episode.count(),
      prisma.episodeStream.count(),
      prisma.user.count(),
      prisma.syncLog.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
      }),
      prisma.streamingProvider.findMany({
        include: {
          _count: {
            select: { episodeStreams: true, animeMappings: true },
          },
        },
      }),
    ]);

    return res.json({
      stats: {
        totalAnime,
        totalEpisodes,
        totalStreams,
        totalUsers,
      },
      providers,
      recentSyncLogs,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger Manual AniList Metadata Synchronization
 */
adminRouter.post('/sync/anilist', async (req: Request, res: Response) => {
  try {
    const result = await SyncEngine.runAniListSync('ADMIN_MANUAL_TRIGGER');
    invalidateCache();
    return res.json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger Manual Anikoto Episode Discovery Synchronization
 */
adminRouter.post('/sync/anikoto', async (req: Request, res: Response) => {
  try {
    const result = await SyncEngine.runAnikotoSync('ADMIN_MANUAL_TRIGGER');
    invalidateCache();
    return res.json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger Manual Jikan Metadata Enrichment
 */
adminRouter.post('/sync/jikan', async (req: Request, res: Response) => {
  try {
    const result = await SyncEngine.runJikanEnrichmentSync('ADMIN_MANUAL_TRIGGER');
    invalidateCache();
    return res.json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger Manual Airing Schedule Synchronization
 */
adminRouter.post('/sync/schedule', async (req: Request, res: Response) => {
  try {
    const result = await SyncEngine.runScheduleSync('ADMIN_MANUAL_TRIGGER');
    invalidateCache();
    return res.json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get Full Sync History Logs
 */
adminRouter.get('/sync-logs', async (req: Request, res: Response) => {
  try {
    const logs = await prisma.syncLog.findMany({
      take: 50,
      orderBy: { startedAt: 'desc' },
    });
    return res.json({ logs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Inspect Provider Mappings & Stream Availability
 */
adminRouter.get('/mappings', async (req: Request, res: Response) => {
  try {
    const anime = await prisma.anime.findMany({
      take: 30,
      orderBy: { updatedAt: 'desc' },
      include: {
        episodes: {
          take: 5,
          include: {
            episodeStreams: true,
          },
        },
        providerMappings: {
          include: { provider: true },
        },
      },
    });

    const statusReport = anime.map(a => {
      const totalEp = a.episodes.length;
      const mappedStreams = a.episodes.flatMap(e => e.episodeStreams).length;

      let mappingStatus = 'METADATA_ONLY';
      if (mappedStreams > 0) mappingStatus = 'AVAILABLE';
      else if (a.providerMappings.length > 0) mappingStatus = 'WAITING_FOR_EPISODES';

      return {
        id: a.id,
        anilistId: a.anilistId,
        title: a.titleEnglish,
        format: a.format,
        totalEpisodes: a.totalEpisodes,
        cachedEpisodes: totalEp,
        mappedStreams,
        status: mappingStatus,
        lastUpdated: a.updatedAt,
      };
    });

    return res.json({ mappings: statusReport });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Toggle Streaming Provider Status
 */
adminRouter.patch('/providers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const updated = await prisma.streamingProvider.update({
      where: { id },
      data: { enabled: Boolean(enabled) },
    });

    return res.json({ provider: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
