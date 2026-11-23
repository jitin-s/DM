import { Router, Request, Response } from 'express';
import { StreamingEngine, StreamingAudio, reportProviderFailure } from '../services/streamingEngine';
import { sanitizeString, sanitizeNumber } from '../middleware/security';
import { cacheResponse } from '../middleware/cache';

export const streamRouter = Router();

const VALID_AUDIOS: StreamingAudio[] = ['sub', 'dub', 'hindi'];

/**
 * GET /api/stream/:animeId/availability
 * Check available audio languages for a specific episode (or anime)
 */
streamRouter.get('/:animeId/availability', cacheResponse(300), async (req: Request, res: Response) => {
  try {
    const rawId = sanitizeString(req.params.animeId, 100);
    const episode = sanitizeNumber(req.query.ep, 1, 5000, 1);

    const result = await StreamingEngine.getLanguageAvailability({
      animeId: rawId,
      episode,
    });

    return res.json({
      animeId: rawId,
      anilistId: result.anilistId,
      episode,
      availableAudios: result.availableAudios,
      languageStatus: result.languageStatus,
      hasHindi: result.availableAudios.includes('hindi'),
      hasDub: result.availableAudios.includes('dub'),
      hasSub: result.availableAudios.includes('sub'),
    });
  } catch (error: any) {
    console.error('[Stream API] Availability check error:', error.message);
    return res.status(500).json({ error: 'Failed to verify audio availability' });
  }
});

/**
 * GET /api/stream/:animeId/:episodeNumber
 * Resolve working streaming embeds across all authorized providers
 */
streamRouter.get('/:animeId/:episodeNumber', async (req: Request, res: Response) => {
  try {
    const animeId = sanitizeString(req.params.animeId, 100);
    const epNum = sanitizeNumber(req.params.episodeNumber, 1, 5000, 1);

    if (!animeId) {
      return res.status(400).json({ error: 'Valid anime identifier is required' });
    }

    const requestedAudio = (req.query.audio || req.query.lang || 'sub') as string;
    const audioParam: StreamingAudio = VALID_AUDIOS.includes(requestedAudio as any)
      ? (requestedAudio as StreamingAudio)
      : 'sub';

    const rawServer = req.query.server ? sanitizeString(req.query.server, 50) : undefined;
    const server = rawServer && /^[a-zA-Z0-9\-_]+$/.test(rawServer) ? rawServer : undefined;

    const rawTime = req.query.time ? parseFloat(String(req.query.time)) : undefined;
    const time = rawTime && !isNaN(rawTime) && rawTime >= 0 && rawTime < 100000 ? rawTime : undefined;

    const autoplay = req.query.autoplay !== 'false';
    const autoNext = req.query.autonext !== 'false';

    const streamResult = await StreamingEngine.resolveStream({
      animeId,
      episodeNumber: epNum,
      audio: audioParam,
      server,
      time,
      autoplay,
      autoNext,
    });

    return res.json({
      stream: streamResult,
      servers: streamResult.servers,
      iframeOptions: streamResult.iframeOptions,
    });
  } catch (error: any) {
    console.error('[Stream API] Stream resolution error:', error.message);
    return res.status(500).json({ error: 'Playback source is temporarily unavailable' });
  }
});

/**
 * POST /api/stream/report-failure
 * Dynamic health feedback: penalize unresponsive or broken servers in real-time
 */
streamRouter.post('/report-failure', (req: Request, res: Response) => {
  const { serverId } = req.body || {};
  if (serverId && typeof serverId === 'string') {
    reportProviderFailure(sanitizeString(serverId, 50));
  }
  return res.json({ status: 'recorded' });
});
