import { Router, Request, Response } from 'express';
import { VidWaveService, VidWaveAudio } from '../services/vidwaveService';
import { sanitizeString, sanitizeNumber } from '../middleware/security';
import { cacheResponse } from '../middleware/cache';

export const streamRouter = Router();

const VALID_AUDIOS: VidWaveAudio[] = ['sub', 'dub', 'hindi'];

/**
 * GET /api/stream/:animeId/availability
 * Check available audio languages for an anime (Cached for 30 minutes)
 */
streamRouter.get('/:animeId/availability', cacheResponse(1800), async (req: Request, res: Response) => {
  try {
    const rawId = sanitizeString(req.params.animeId, 100);
    const anilistNum = parseInt(rawId, 10);
    const resolvedAnilistId = !isNaN(anilistNum) && anilistNum > 0 ? anilistNum : 16498;

    const availableAudios = await VidWaveService.getAvailableAudios(resolvedAnilistId);

    return res.json({
      animeId: rawId,
      anilistId: resolvedAnilistId,
      availableAudios,
      hasHindi: availableAudios.includes('hindi'),
      hasDub: availableAudios.includes('dub'),
      hasSub: availableAudios.includes('sub'),
    });
  } catch (error: any) {
    console.error('[Stream API] Availability check error:', error.message);
    return res.status(500).json({ error: 'Failed to verify audio availability' });
  }
});

/**
 * GET /api/stream/:animeId/:episodeNumber
 * Resolve streaming embed for anime and episode number
 */
streamRouter.get('/:animeId/:episodeNumber', async (req: Request, res: Response) => {
  try {
    const animeId = sanitizeString(req.params.animeId, 100);
    const epNum = sanitizeNumber(req.params.episodeNumber, 1, 5000, 1);

    if (!animeId) {
      return res.status(400).json({ error: 'Valid anime identifier is required' });
    }

    // Support both `audio` and legacy `lang` query params, strictly validated
    const requestedAudio = (req.query.audio || req.query.lang || 'sub') as string;
    const audioParam: VidWaveAudio = VALID_AUDIOS.includes(requestedAudio as any)
      ? (requestedAudio as VidWaveAudio)
      : 'sub';

    const rawServer = req.query.server ? sanitizeString(req.query.server, 50) : undefined;
    const server = rawServer && /^[a-zA-Z0-9\-_]+$/.test(rawServer) ? rawServer : undefined;

    const rawTime = req.query.time ? parseFloat(String(req.query.time)) : undefined;
    const time = rawTime && !isNaN(rawTime) && rawTime >= 0 && rawTime < 100000 ? rawTime : undefined;

    const autoplay = req.query.autoplay !== 'false';
    const autoNext = req.query.autonext !== 'false';

    const streamResult = await VidWaveService.resolveStream({
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
