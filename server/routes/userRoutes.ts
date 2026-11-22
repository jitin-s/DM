import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser } from './authRoutes';

export const userRouter = Router();

// Apply auth middleware to all user routes
userRouter.use(authenticateUser);

/**
 * Get User Watchlist
 */
userRouter.get('/watchlist', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const items = await prisma.watchlist.findMany({
      where: { userId },
      include: { anime: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ watchlist: items.map(w => w.anime) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Add Anime to Watchlist
 */
userRouter.post('/watchlist', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { animeId } = req.body;

    if (!animeId) {
      return res.status(400).json({ error: 'animeId is required' });
    }

    // Resolve internal DB anime ID
    const anilistNum = parseInt(animeId, 10);
    const anime = await prisma.anime.findFirst({
      where: isNaN(anilistNum)
        ? { id: animeId }
        : { OR: [{ id: animeId }, { anilistId: anilistNum }] },
    });

    if (!anime) {
      return res.status(404).json({ error: 'Anime not found in registry' });
    }

    const item = await prisma.watchlist.upsert({
      where: {
        userId_animeId: {
          userId,
          animeId: anime.id,
        },
      },
      update: {},
      create: {
        userId,
        animeId: anime.id,
      },
      include: { anime: true },
    });

    return res.status(201).json({ item });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Remove Anime from Watchlist
 */
userRouter.delete('/watchlist/:animeId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { animeId } = req.params;

    const anilistNum = parseInt(animeId, 10);
    const anime = await prisma.anime.findFirst({
      where: isNaN(anilistNum)
        ? { id: animeId }
        : { OR: [{ id: animeId }, { anilistId: anilistNum }] },
    });

    if (anime) {
      await prisma.watchlist.deleteMany({
        where: {
          userId,
          animeId: anime.id,
        },
      });
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get Playback Watch History
 */
userRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const history = await prisma.watchHistory.findMany({
      where: { userId },
      include: { anime: true, episode: true },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    return res.json({ history });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Record or Update Playback Progress
 */
userRouter.post('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { animeId, episodeNumber, progressSeconds, durationSeconds, completed } = req.body;

    const anilistNum = parseInt(animeId, 10);
    const anime = await prisma.anime.findFirst({
      where: isNaN(anilistNum)
        ? { id: animeId }
        : { OR: [{ id: animeId }, { anilistId: anilistNum }] },
      include: { episodes: true },
    });

    if (!anime) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    const episode = anime.episodes.find(e => e.episodeNumber === episodeNumber);

    const historyRecord = await prisma.watchHistory.upsert({
      where: {
        userId_animeId_episodeId: {
          userId,
          animeId: anime.id,
          episodeId: episode ? episode.id : 'ep-default',
        },
      },
      update: {
        episodeNumber,
        progressSeconds: progressSeconds || 0,
        durationSeconds: durationSeconds || 0,
        completed: Boolean(completed),
        updatedAt: new Date(),
      },
      create: {
        userId,
        animeId: anime.id,
        episodeId: episode ? episode.id : 'ep-default',
        episodeNumber,
        progressSeconds: progressSeconds || 0,
        durationSeconds: durationSeconds || 0,
        completed: Boolean(completed),
      },
    });

    return res.json({ history: historyRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
