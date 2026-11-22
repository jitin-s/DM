import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  body: any;
  contentType: string;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

// Cache cleaner every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Cache middleware for high-traffic read endpoints (Trending, Popular, Schedule, Details)
 */
export function cacheResponse(ttlSeconds: number = 300) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests without authorization headers
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }

    const cacheKey = `${req.originalUrl || req.url}`;
    const now = Date.now();
    const cached = memoryCache.get(cacheKey);

    if (cached && now < cached.expiresAt) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`);
      res.setHeader('Content-Type', cached.contentType || 'application/json');
      return res.send(cached.body);
    }

    // Capture response to store in cache
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Don't cache error responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(cacheKey, {
          body: JSON.stringify(body),
          contentType: 'application/json',
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate cache by key prefix (e.g. after admin sync)
 */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(prefix)) {
      memoryCache.delete(key);
    }
  }
}
