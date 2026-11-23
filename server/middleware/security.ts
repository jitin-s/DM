import { Request, Response, NextFunction } from 'express';

// -------------------------------------------------------------
// 1. Security Headers Middleware (CSP, Anti-Clickjacking, etc.)
// -------------------------------------------------------------
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove information disclosure header
  res.removeHeader('X-Powered-By');

  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Anti-clickjacking for DevilMotion domain
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Cross-Site Scripting protection for legacy browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict sensitive browser features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()'
  );

  // Content Security Policy
  // Allows necessary assets (Google Fonts, VidWave streaming embeds, anime images)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "frame-src 'self' https://embed.vidwave.sbs https://embed.vidwave.site https://megaplay.buzz https://vidsrc.to",
    "connect-src 'self' http://localhost:* http://127.0.0.1:* https://graphql.anilist.co https://api.myanimelist.net https://api.jikan.moe https://embed.vidwave.sbs https://embed.vidwave.site",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // HSTS in production
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

// -------------------------------------------------------------
// 2. High-Performance Sliding Window Rate Limiter
// -------------------------------------------------------------
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStores = {
  global: new Map<string, RateLimitRecord>(),
  auth: new Map<string, RateLimitRecord>(),
  search: new Map<string, RateLimitRecord>(),
};

// Periodic garbage collection for expired rate limit entries
const gcInterval = setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(rateLimitStores)) {
    for (const [key, value] of store.entries()) {
      if (now > value.resetTime) {
        store.delete(key);
      }
    }
  }
}, 60000);
if (gcInterval.unref) gcInterval.unref();

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  storeName?: 'global' | 'auth' | 'search';
}) {
  const { windowMs, max, message = 'Too many requests. Please try again later.', storeName = 'global' } = options;
  const store = rateLimitStores[storeName];

  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client identifier (IP address)
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    let record = store.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      store.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error: message,
        retryAfter: resetSeconds,
      });
    }

    next();
  };
}

export const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: 'Traffic rate limit exceeded. Please slow down your requests.',
  storeName: 'global',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 login attempts per 15 mins to defeat brute-forcing
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  storeName: 'auth',
});

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max 60 searches per minute
  message: 'Search query rate limit reached. Please wait a moment before searching again.',
  storeName: 'search',
});

// -------------------------------------------------------------
// 3. Input Sanitization & Validation Helpers
// -------------------------------------------------------------
export const sanitizeString = (input: unknown, maxLength: number = 200): string => {
  if (typeof input !== 'string') return '';
  // Strip control characters and trim
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength);
};

export const sanitizeNumber = (input: unknown, min: number = 1, max: number = 1000000, fallback: number = 1): number => {
  const num = parseInt(String(input), 10);
  if (isNaN(num)) return fallback;
  return Math.min(Math.max(num, min), max);
};

// -------------------------------------------------------------
// 4. Safe Global Error Handling Middleware
// -------------------------------------------------------------
export const safeErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Safe internal logging without printing credentials
  const sanitizedMessage = err?.message ? String(err.message).replace(/[a-zA-Z0-9_\-\.]{30,}/g, '[REDACTED]') : 'Unknown error';
  console.error(`[Security API Error] [${req.method} ${req.path}]:`, sanitizedMessage);

  if (res.headersSent) {
    return next(err);
  }

  // Never leak internal stack traces or database connection details to visitors
  const status = typeof err.status === 'number' ? err.status : 500;
  return res.status(status).json({
    error: status === 404 ? 'Resource not found' : 'Unable to complete your request. Please try again.',
  });
};
