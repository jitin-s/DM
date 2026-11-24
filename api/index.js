// server/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt2 from "bcryptjs";

// server/db.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import os from "os";
var prismaInstance = null;
try {
  if (process.env.VERCEL) {
    const currentDbUrl = process.env.DATABASE_URL || "";
    if (!currentDbUrl || currentDbUrl.includes("dev.db")) {
      const tmpDbPath = path.join(os.tmpdir(), "dev.db");
      if (!fs.existsSync(tmpDbPath)) {
        const candidates = [
          path.join(process.cwd(), "prisma", "dev.db"),
          path.join(process.cwd(), "dev.db")
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            try {
              fs.copyFileSync(c, tmpDbPath);
              break;
            } catch {
            }
          }
        }
      }
      if (fs.existsSync(tmpDbPath)) {
        const cleanUrl = tmpDbPath.replace(/\\/g, "/");
        process.env.DATABASE_URL = `file:${cleanUrl}?connection_limit=1&timeout=20000`;
      }
    }
  }
  const globalForPrisma = global;
  prismaInstance = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaInstance;
  if (!process.env.VERCEL && prismaInstance) {
    prismaInstance.$queryRawUnsafe("PRAGMA journal_mode = WAL;").then(() => prismaInstance.$queryRawUnsafe("PRAGMA busy_timeout = 20000;")).then(() => prismaInstance.$queryRawUnsafe("PRAGMA synchronous = NORMAL;")).catch((err) => console.warn("[Prisma SQLite Pragmas]", err?.message));
  }
} catch (initErr) {
  console.warn("[Prisma Initialization Warning]:", initErr?.message);
  prismaInstance = null;
}
function createSafeModelDelegate(modelName) {
  return new Proxy({}, {
    get(_, method) {
      return async (...args) => {
        try {
          if (prismaInstance && prismaInstance[modelName]) {
            const delegate = prismaInstance[modelName];
            if (typeof delegate[method] === "function") {
              return await delegate[method](...args);
            }
          }
        } catch (dbErr) {
          console.warn(`[Safe DB Warning] ${modelName}.${method} failed, using safe fallback:`, dbErr?.message);
        }
        if (method === "findMany") return [];
        if (method === "count") return 0;
        if (method === "upsert" || method === "create" || method === "update") {
          return args[0]?.create || args[0]?.data || null;
        }
        return null;
      };
    }
  });
}
var prisma = new Proxy({}, {
  get(target, prop) {
    if (prop === "$queryRaw" || prop === "$queryRawUnsafe" || prop === "$executeRaw" || prop === "$executeRawUnsafe") {
      return async () => [];
    }
    if (prop === "$connect" || prop === "$disconnect") {
      return async () => {
      };
    }
    if (prop === "$transaction") {
      return async (cb) => {
        if (typeof cb === "function") {
          return await cb(prisma);
        }
        if (Array.isArray(cb)) {
          return await Promise.all(cb);
        }
        return null;
      };
    }
    return createSafeModelDelegate(prop);
  }
});

// server/routes/authRoutes.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// server/middleware/security.ts
var securityHeaders = (req, res, next) => {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()"
  );
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "frame-src 'self' https://aniembed.se https://embed.vidwave.sbs https://embed.vidwave.site https://animeembed.com https://megaplay.buzz https://vidsrc.to https://anikotoapi.site",
    "connect-src 'self' http://localhost:* http://127.0.0.1:* https://graphql.anilist.co https://api.myanimelist.net https://api.jikan.moe https://aniembed.se https://embed.vidwave.sbs https://embed.vidwave.site https://animeembed.com https://anikotoapi.site https://va.vercel-scripts.com https://vitals.vercel-insights.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  res.setHeader("Content-Security-Policy", cspDirectives.join("; "));
  if (process.env.NODE_ENV === "production" && req.secure) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
};
var rateLimitStores = {
  global: /* @__PURE__ */ new Map(),
  auth: /* @__PURE__ */ new Map(),
  search: /* @__PURE__ */ new Map()
};
var gcInterval = setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(rateLimitStores)) {
    for (const [key, value] of store.entries()) {
      if (now > value.resetTime) {
        store.delete(key);
      }
    }
  }
}, 6e4);
if (gcInterval.unref) gcInterval.unref();
function createRateLimiter(options) {
  const { windowMs, max, message = "Too many requests. Please try again later.", storeName = "global" } = options;
  const store = rateLimitStores[storeName];
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let record = store.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      store.set(ip, record);
    } else {
      record.count += 1;
    }
    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1e3);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);
    if (record.count > max) {
      res.setHeader("Retry-After", resetSeconds);
      return res.status(429).json({
        error: message,
        retryAfter: resetSeconds
      });
    }
    next();
  };
}
var globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 200,
  message: "Traffic rate limit exceeded. Please slow down your requests.",
  storeName: "global"
});
var authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 15,
  // Max 15 login attempts per 15 mins to defeat brute-forcing
  message: "Too many authentication attempts. Please try again in 15 minutes.",
  storeName: "auth"
});
var searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 60,
  // Max 60 searches per minute
  message: "Search query rate limit reached. Please wait a moment before searching again.",
  storeName: "search"
});
var sanitizeString = (input, maxLength = 200) => {
  if (typeof input !== "string") return "";
  return input.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLength);
};
var sanitizeNumber = (input, min = 1, max = 1e6, fallback = 1) => {
  const num = parseInt(String(input), 10);
  if (isNaN(num)) return fallback;
  return Math.min(Math.max(num, min), max);
};
var safeErrorHandler = (err, req, res, next) => {
  const sanitizedMessage = err?.message ? String(err.message).replace(/[a-zA-Z0-9_\-\.]{30,}/g, "[REDACTED]") : "Unknown error";
  console.error(`[Security API Error] [${req.method} ${req.path}]:`, sanitizedMessage);
  if (res.headersSent) {
    return next(err);
  }
  const status = typeof err.status === "number" ? err.status : 500;
  return res.status(status).json({
    error: status === 404 ? "Resource not found" : "Unable to complete your request. Please try again."
  });
};

// server/routes/authRoutes.ts
var authRouter = Router();
var AUTH_SECRET = process.env.AUTH_SECRET || "devilmotion_super_secret_jwt_key_9988_2026";
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, AUTH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, avatar: true }
    });
    if (!user) {
      return res.status(401).json({ error: "User account not found" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }
};
var requireAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }
  next();
};
authRouter.post("/register", authRateLimiter, async (req, res) => {
  try {
    const name = sanitizeString(req.body.name, 100);
    const email = sanitizeString(req.body.email, 255).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!name || name.length < 2) {
      return res.status(400).json({ error: "A valid name (at least 2 characters) is required" });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "A valid email address is required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters in length" });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: "Password must not exceed 128 characters" });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "USER";
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role
      }
    });
    const token = jwt.sign({ userId: user.id, role: user.role }, AUTH_SECRET, {
      expiresIn: "7d"
    });
    return res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    console.error("[Auth API] Registration error:", error.message);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});
authRouter.post("/login", authRateLimiter, async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 255).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, AUTH_SECRET, {
      expiresIn: "7d"
    });
    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      token
    });
  } catch (error) {
    console.error("[Auth API] Login error:", error.message);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});
authRouter.get("/me", authenticateUser, async (req, res) => {
  const user = req.user;
  return res.json({ user });
});

// server/routes/animeRoutes.ts
import { Router as Router2 } from "express";

// server/services/anilistService.ts
import axios2 from "axios";

// server/services/jikanService.ts
import axios from "axios";
var JIKAN_BASE_URL = process.env.JIKAN_BASE_URL || "https://api.jikan.moe/v4";
var JikanService = class {
  static requestQueue = [];
  static isProcessingQueue = false;
  static lastRequestTimestamp = 0;
  static MIN_INTERVAL_MS = 360;
  // Max ~2.7 requests per second to stay safely under Jikan's 3 req/sec limit
  static memoryCache = /* @__PURE__ */ new Map();
  static CACHE_TTL_MS = 1e3 * 60 * 60 * 12;
  // 12 hours
  /**
   * Enqueue a request to respect Jikan's strict rate limits
   */
  static async enqueue(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ fn: requestFn, resolve, reject });
      this.processQueue();
    });
  }
  static async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    this.isProcessingQueue = true;
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastRequestTimestamp;
      if (elapsed < this.MIN_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, this.MIN_INTERVAL_MS - elapsed));
      }
      const item = this.requestQueue.shift();
      if (!item) break;
      this.lastRequestTimestamp = Date.now();
      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response?.headers?.["retry-after"] || "2", 10);
          console.warn(`[Jikan] Rate limited (429). Backing off for ${retryAfter}s...`);
          await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1e3));
          try {
            const retryResult = await item.fn();
            item.resolve(retryResult);
          } catch (retryErr) {
            item.reject(retryErr);
          }
        } else {
          item.reject(error);
        }
      }
    }
    this.isProcessingQueue = false;
  }
  /**
   * Fetch full anime metadata by MyAnimeList ID
   */
  static async getAnimeFull(malId) {
    const cacheKey = `jikan:anime:${malId}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    try {
      const data = await this.enqueue(async () => {
        const res = await axios.get(`${JIKAN_BASE_URL}/anime/${malId}/full`, {
          timeout: 3500
        });
        return res.data?.data;
      });
      if (data) {
        this.memoryCache.set(cacheKey, { data, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return data;
    } catch (err) {
      console.warn(`[Jikan] Failed to fetch anime full for MAL ID ${malId}:`, err.message);
      return null;
    }
  }
  /**
   * Fetch episodes list with titles, Japanese titles, and filler flags
   */
  static async getAnimeEpisodes(malId, page = 1) {
    const cacheKey = `jikan:episodes:${malId}:p${page}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    try {
      const data = await this.enqueue(async () => {
        const res = await axios.get(`${JIKAN_BASE_URL}/anime/${malId}/episodes?page=${page}`, {
          timeout: 3500
        });
        return res.data?.data || [];
      });
      if (data) {
        this.memoryCache.set(cacheKey, { data, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return data;
    } catch (err) {
      console.warn(`[Jikan] Failed to fetch episodes for MAL ID ${malId}:`, err.message);
      return [];
    }
  }
  /**
   * Fetch characters & voice actors
   */
  static async getAnimeCharacters(malId) {
    const cacheKey = `jikan:characters:${malId}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    try {
      const data = await this.enqueue(async () => {
        const res = await axios.get(`${JIKAN_BASE_URL}/anime/${malId}/characters`, {
          timeout: 3500
        });
        return res.data?.data || [];
      });
      if (data) {
        this.memoryCache.set(cacheKey, { data, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return data;
    } catch (err) {
      console.warn(`[Jikan] Failed to fetch characters for MAL ID ${malId}:`, err.message);
      return [];
    }
  }
  /**
   * Search MAL via Jikan
   */
  static async searchAnime(query, limit = 5) {
    try {
      const data = await this.enqueue(async () => {
        const res = await axios.get(`${JIKAN_BASE_URL}/anime`, {
          params: { q: query, limit, sfw: true },
          timeout: 3500
        });
        return res.data?.data || [];
      });
      return data;
    } catch (err) {
      console.warn(`[Jikan] Search failed for query "${query}":`, err.message);
      return [];
    }
  }
};

// server/services/animeAggregationService.ts
var AnimeAggregationService = class {
  /**
   * Aggregate and normalize AniList data with Jikan & MAL enrichment, then persist into SQLite
   */
  static async ingestAndNormalize(aniListMedia, options = {}) {
    const { enrichWithJikan = false, flags = {} } = options;
    const anilistId = aniListMedia.id;
    let malId = aniListMedia.idMal || null;
    const totalEpisodesCount = aniListMedia.episodes || (aniListMedia.nextAiringEpisode ? aniListMedia.nextAiringEpisode.episode - 1 : 12);
    const titleEng = aniListMedia.title?.english || aniListMedia.title?.romaji || "Unknown Title";
    const titleRom = aniListMedia.title?.romaji || titleEng;
    const titleNat = aniListMedia.title?.native || "";
    const desc = (aniListMedia.description || "").replace(/<br\s*[\/]?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
    const cover = aniListMedia.coverImage?.large || aniListMedia.coverImage?.extraLarge || aniListMedia.coverImage?.medium || "";
    const coverXL = aniListMedia.coverImage?.extraLarge || cover;
    const banner = aniListMedia.bannerImage || null;
    const genres = aniListMedia.genres || [];
    const studios = aniListMedia.studios?.nodes?.map((n) => n.name).filter(Boolean) || [];
    const rawScore = aniListMedia.averageScore;
    const anilistScore = rawScore ? rawScore > 10 ? rawScore / 10 : rawScore : null;
    let malScore = null;
    let alternativeTitles = [];
    let jikanEpisodes = [];
    let jikanCharacters = [];
    let jikanFullData = null;
    if (enrichWithJikan && malId) {
      try {
        const [full, epData, charData] = await Promise.all([
          JikanService.getAnimeFull(malId),
          JikanService.getAnimeEpisodes(malId, 1),
          JikanService.getAnimeCharacters(malId)
        ]);
        jikanFullData = full;
        if (full) {
          if (full.score) malScore = full.score;
          if (full.titles && Array.isArray(full.titles)) {
            alternativeTitles = full.titles.map((t) => t.title).filter(Boolean);
          }
        }
        jikanEpisodes = epData || [];
        jikanCharacters = charData || [];
      } catch (err) {
        console.warn(`[Aggregator] Jikan enrichment skipped for AniList ${anilistId}: ${err.message}`);
      }
    }
    const avgScore = anilistScore || malScore || 8;
    const animeRecord = await prisma.anime.upsert({
      where: { anilistId },
      update: {
        malId: malId || void 0,
        titleEnglish: titleEng,
        titleRomaji: titleRom,
        titleNative: titleNat || void 0,
        alternativeTitles: JSON.stringify(alternativeTitles),
        description: desc,
        coverImage: cover,
        coverImageExtraLarge: coverXL,
        bannerImage: banner,
        genres: JSON.stringify(genres),
        releaseYear: aniListMedia.seasonYear || aniListMedia.startDate?.year || null,
        season: aniListMedia.season || null,
        format: aniListMedia.format || "TV",
        status: aniListMedia.status || "FINISHED",
        totalEpisodes: aniListMedia.episodes || null,
        duration: aniListMedia.duration || 24,
        averageScore: avgScore,
        anilistScore,
        malScore,
        popularity: aniListMedia.popularity || null,
        studios: JSON.stringify(studios),
        lastSyncedAt: /* @__PURE__ */ new Date(),
        ...flags
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
        format: aniListMedia.format || "TV",
        status: aniListMedia.status || "FINISHED",
        totalEpisodes: aniListMedia.episodes || null,
        duration: aniListMedia.duration || 24,
        averageScore: avgScore,
        anilistScore,
        malScore,
        popularity: aniListMedia.popularity || null,
        studios: JSON.stringify(studios),
        firstSeenAt: /* @__PURE__ */ new Date(),
        lastSyncedAt: /* @__PURE__ */ new Date(),
        ...flags
      }
    });
    try {
      await prisma.animeSourceMetadata.upsert({
        where: {
          animeId_sourceName: {
            animeId: animeRecord.id,
            sourceName: "ANILIST"
          }
        },
        update: {
          metadata: JSON.stringify(aniListMedia),
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          animeId: animeRecord.id,
          sourceName: "ANILIST",
          sourceRecordId: String(anilistId),
          metadata: JSON.stringify(aniListMedia)
        }
      });
      if (jikanFullData && malId) {
        await prisma.animeSourceMetadata.upsert({
          where: {
            animeId_sourceName: {
              animeId: animeRecord.id,
              sourceName: "JIKAN"
            }
          },
          update: {
            metadata: JSON.stringify(jikanFullData),
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            animeId: animeRecord.id,
            sourceName: "JIKAN",
            sourceRecordId: String(malId),
            metadata: JSON.stringify(jikanFullData)
          }
        });
      }
    } catch {
    }
    if (enrichWithJikan) {
      try {
        const totalCount = totalEpisodesCount;
        const maxEpsToSync = Math.min(totalCount > 0 ? totalCount : 12, 50);
        for (let ep = 1; ep <= maxEpsToSync; ep++) {
          const jikanEp = jikanEpisodes.find((e) => e.mal_id === ep);
          const title = jikanEp?.title || `Episode ${ep}`;
          const titleJp = jikanEp?.title_japanese || null;
          const isFiller = Boolean(jikanEp?.filler);
          const isRecap = Boolean(jikanEp?.recap);
          const airedAt = jikanEp?.aired ? new Date(jikanEp.aired) : null;
          await prisma.episode.upsert({
            where: {
              animeId_episodeNumber: {
                animeId: animeRecord.id,
                episodeNumber: ep
              }
            },
            update: {
              episodeTitle: title,
              japaneseTitle: titleJp,
              filler: isFiller,
              recap: isRecap,
              airedAt,
              metadataSource: jikanEp ? "JIKAN" : "ANILIST",
              thumbnail: banner || cover,
              thumbnailUrl: banner || cover
            },
            create: {
              animeId: animeRecord.id,
              episodeNumber: ep,
              episodeTitle: title,
              japaneseTitle: titleJp,
              filler: isFiller,
              recap: isRecap,
              airedAt,
              metadataSource: jikanEp ? "JIKAN" : "ANILIST",
              thumbnail: banner || cover,
              thumbnailUrl: banner || cover,
              metadataStatus: "AVAILABLE"
            }
          });
        }
      } catch (epErr) {
        console.warn(`[Aggregator] Episode upsert skipped: ${epErr.message}`);
      }
    }
    if (jikanCharacters.length > 0) {
      await prisma.animeCharacter.deleteMany({ where: { animeId: animeRecord.id } });
      const topCharacters = jikanCharacters.slice(0, 12);
      for (const charItem of topCharacters) {
        const char = charItem.character;
        const voiceActor = charItem.voice_actors?.find(
          (va) => va.language === "Japanese"
        ) || charItem.voice_actors?.[0];
        if (char?.name) {
          await prisma.animeCharacter.create({
            data: {
              animeId: animeRecord.id,
              characterId: char.mal_id ? String(char.mal_id) : null,
              name: char.name,
              role: charItem.role || "Main",
              imageUrl: char.images?.jpg?.image_url || null,
              voiceActorName: voiceActor?.person?.name || null,
              voiceActorLanguage: voiceActor?.language || "Japanese",
              voiceActorImage: voiceActor?.person?.images?.jpg?.image_url || null
            }
          });
        }
      }
    }
    if (aniListMedia.nextAiringEpisode) {
      const nextEp = aniListMedia.nextAiringEpisode;
      await prisma.airingSchedule.upsert({
        where: {
          animeId_episodeNumber: {
            animeId: animeRecord.id,
            episodeNumber: nextEp.episode
          }
        },
        update: {
          airingAt: new Date(nextEp.airingAt * 1e3),
          timeUntilAiring: nextEp.timeUntilAiring,
          lastCheckedAt: /* @__PURE__ */ new Date()
        },
        create: {
          animeId: animeRecord.id,
          episodeNumber: nextEp.episode,
          airingAt: new Date(nextEp.airingAt * 1e3),
          timeUntilAiring: nextEp.timeUntilAiring,
          source: "ANILIST"
        }
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
        alternative: alternativeTitles
      },
      description: desc,
      coverImage: {
        large: cover,
        extraLarge: coverXL,
        medium: cover
      },
      bannerImage: banner,
      format: aniListMedia.format || "TV",
      status: aniListMedia.status || "FINISHED",
      year: aniListMedia.seasonYear || aniListMedia.startDate?.year || 2024,
      season: aniListMedia.season,
      episodes: totalEpisodesCount,
      duration: aniListMedia.duration || 24,
      countryOfOrigin: "JP",
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
      isUpcoming: aniListMedia.status === "NOT_YET_RELEASED"
    };
  }
  /**
   * Enrich an existing DB anime record with Jikan if not enriched yet
   */
  static async enrichDbAnimeWithJikan(identifier) {
    const numId = typeof identifier === "number" ? identifier : parseInt(identifier, 10);
    const isNum = !isNaN(numId);
    const anime = await prisma.anime.findFirst({
      where: isNum ? {
        OR: [{ anilistId: numId }, { malId: numId }, { id: String(identifier) }]
      } : { id: String(identifier) },
      include: {
        characters: true,
        sourceMetadata: true
      }
    });
    if (!anime || !anime.malId) return;
    const alreadyHasJikan = anime.sourceMetadata.some((s) => s.sourceName === "JIKAN");
    if (alreadyHasJikan && anime.characters.length > 0) return;
    try {
      const [epData, charData] = await Promise.all([
        JikanService.getAnimeEpisodes(anime.malId, 1),
        JikanService.getAnimeCharacters(anime.malId)
      ]);
      for (const jikanEp of epData) {
        await prisma.episode.updateMany({
          where: {
            animeId: anime.id,
            episodeNumber: jikanEp.mal_id
          },
          data: {
            episodeTitle: jikanEp.title,
            japaneseTitle: jikanEp.title_japanese || null,
            filler: Boolean(jikanEp.filler),
            recap: Boolean(jikanEp.recap),
            metadataSource: "JIKAN",
            airedAt: jikanEp.aired ? new Date(jikanEp.aired) : void 0
          }
        });
      }
      if (charData.length > 0) {
        await prisma.animeCharacter.deleteMany({ where: { animeId: anime.id } });
        for (const charItem of charData.slice(0, 12)) {
          const char = charItem.character;
          const voiceActor = charItem.voice_actors?.find(
            (va) => va.language === "Japanese"
          ) || charItem.voice_actors?.[0];
          if (char?.name) {
            await prisma.animeCharacter.create({
              data: {
                animeId: anime.id,
                characterId: char.mal_id ? String(char.mal_id) : null,
                name: char.name,
                role: charItem.role || "Main",
                imageUrl: char.images?.jpg?.image_url || null,
                voiceActorName: voiceActor?.person?.name || null,
                voiceActorLanguage: voiceActor?.language || "Japanese",
                voiceActorImage: voiceActor?.person?.images?.jpg?.image_url || null
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[Aggregator] Background Jikan enrichment failed for ${anime.titleEnglish}: ${err.message}`);
    }
  }
};

// server/services/anilistService.ts
var ANILIST_API_URL = process.env.ANILIST_API_URL || "https://graphql.anilist.co";
var MEDIA_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  description(asHtml: false)
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  format
  status
  episodes
  duration
  season
  seasonYear
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  averageScore
  popularity
  genres
  studios(isMain: true) {
    nodes {
      name
    }
  }
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
`;
var AniListService = class {
  static queryCache = /* @__PURE__ */ new Map();
  static CACHE_TTL_MS = 1e3 * 60 * 15;
  // 15 minutes in-memory cache
  /**
   * Execute raw GraphQL query with axios and in-memory TTL caching
   */
  static async query(query, variables = {}) {
    const cacheKey = JSON.stringify({ query: query.trim(), variables });
    const cached = this.queryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    try {
      const response = await axios2.post(
        ANILIST_API_URL,
        { query, variables },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "DevilMotion/2.0 (AnimeStreamingPlatform; +https://devilmotion.com)"
          },
          timeout: 12e3
        }
      );
      const data = response.data?.data;
      if (data) {
        this.queryCache.set(cacheKey, { data, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return data;
    } catch (error) {
      if (cached?.data) {
        console.warn("AniList API Error: serving stale cache:", error.message);
        return cached.data;
      }
      console.error("AniList API Error:", error.response?.data || error.message);
      throw new Error(`AniList query failed: ${error.message}`);
    }
  }
  /**
   * Fetch Trending Anime
   */
  static async getTrending(page = 1, perPage = 18) {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    this.cacheAnimeList(items, { isTrending: true }).catch(() => {
    });
    return items;
  }
  /**
   * Fetch Popular Anime
   */
  static async getPopular(page = 1, perPage = 18) {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    this.cacheAnimeList(items, { isPopular: true }).catch(() => {
    });
    return items;
  }
  /**
   * Fetch Top-Rated Masterpieces
   */
  static async getTopRated(page = 1, perPage = 18) {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: [SCORE_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    this.cacheAnimeList(items, { isTopRated: true }).catch(() => {
    });
    return items;
  }
  /**
   * Fetch Currently Airing & Recently Updated
   */
  static async getCurrentlyAiring(page = 1, perPage = 18) {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, status: RELEASING, sort: [UPDATED_AT_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    this.cacheAnimeList(items).catch(() => {
    });
    return items;
  }
  /**
   * Fetch Upcoming Releases
   */
  static async getUpcoming(page = 1, perPage = 18) {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    this.cacheAnimeList(items).catch(() => {
    });
    return items;
  }
  /**
   * Fetch Anime Movies with sorting, pagination, and genre support
   */
  static async getMovies(page = 1, perPage = 24, sort, genre) {
    let sortOption = "POPULARITY_DESC";
    if (sort === "rating") sortOption = "SCORE_DESC";
    else if (sort === "newest") sortOption = "START_DATE_DESC";
    else if (sort === "title") sortOption = "TITLE_ENGLISH_DESC";
    else if (sort === "popular") sortOption = "POPULARITY_DESC";
    const gql = `
      query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            hasNextPage
          }
          media(type: ANIME, format: MOVIE, sort: $sort, genre: $genre, isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, {
      page,
      perPage,
      sort: [sortOption],
      genre: genre && genre !== "ALL" ? genre : void 0
    });
    const items = data?.Page?.media || [];
    const total = data?.Page?.pageInfo?.total || items.length;
    const hasNextPage = Boolean(data?.Page?.pageInfo?.hasNextPage);
    this.cacheAnimeList(items).catch(() => {
    });
    return { items, total, hasNextPage };
  }
  /**
   * Fetch Anime By Genre with sorting and pagination
   */
  static async getByGenre(genre, page = 1, perPage = 24, sort) {
    let sortOption = "POPULARITY_DESC";
    if (sort === "rating") sortOption = "SCORE_DESC";
    else if (sort === "newest") sortOption = "START_DATE_DESC";
    else if (sort === "title") sortOption = "TITLE_ENGLISH_DESC";
    else if (sort === "popular") sortOption = "POPULARITY_DESC";
    const gql = `
      query ($page: Int, $perPage: Int, $genre: String, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            hasNextPage
          }
          media(type: ANIME, genre: $genre, sort: $sort, isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, {
      page,
      perPage,
      genre: genre && genre !== "ALL" ? genre : void 0,
      sort: [sortOption]
    });
    const items = data?.Page?.media || [];
    const total = data?.Page?.pageInfo?.total || items.length;
    const hasNextPage = Boolean(data?.Page?.pageInfo?.hasNextPage);
    this.cacheAnimeList(items).catch(() => {
    });
    return { items, total, hasNextPage };
  }
  /**
   * Fetch Dubbed Anime (Hindi / English spotlight collections)
   */
  static async getDubbedCollection(language, page = 1, perPage = 18) {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await this.query(gql, { page, perPage });
    const items = data?.Page?.media || [];
    const flags = language === "hindi" ? { isHindiDubbed: true } : { isEnglishDubbed: true };
    this.cacheAnimeList(items, flags).catch(() => {
    });
    return items;
  }
  /**
   * Search Anime with full filters
   */
  static async search(params) {
    const {
      query,
      genre,
      format,
      status,
      year,
      season,
      sort,
      page = 1,
      perPage = 20
    } = params;
    let sortOption = void 0;
    if (sort === "trending") sortOption = "TRENDING_DESC";
    else if (sort === "rating") sortOption = "SCORE_DESC";
    else if (sort === "newest") sortOption = "START_DATE_DESC";
    else if (sort === "title") sortOption = "TITLE_ENGLISH_DESC";
    else if (sort === "popularity") sortOption = "POPULARITY_DESC";
    else if (!query?.trim()) sortOption = "POPULARITY_DESC";
    const gql = `
      query ($page: Int, $perPage: Int, $search: String, $genre: String, $format: MediaFormat, $status: MediaStatus, $seasonYear: Int, $season: MediaSeason, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            hasNextPage
          }
          media(
            type: ANIME,
            search: $search,
            genre: $genre,
            format: $format,
            status: $status,
            seasonYear: $seasonYear,
            season: $season,
            sort: $sort,
            isAdult: false
          ) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const variables = {
      page,
      perPage
    };
    if (sortOption) variables.sort = [sortOption];
    if (query?.trim()) variables.search = query.trim();
    if (genre && genre !== "ALL") variables.genre = genre;
    if (format && format !== "ALL") variables.format = format;
    if (status && status !== "ALL") variables.status = status;
    if (year && !isNaN(year)) variables.seasonYear = year;
    if (season && season !== "ALL") variables.season = season;
    const data = await this.query(gql, variables);
    const items = data?.Page?.media || [];
    const total = data?.Page?.pageInfo?.total || items.length;
    const hasNextPage = data?.Page?.pageInfo?.hasNextPage || false;
    this.cacheAnimeList(items).catch(() => {
    });
    return { items, total, hasNextPage };
  }
  /**
   * Fetch Single Anime Full Details
   */
  static async getDetails(id) {
    const gql = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${MEDIA_FIELDS}
          relations {
            edges {
              relationType
              node {
                id
                idMal
                title {
                  english
                  romaji
                }
                format
                coverImage {
                  large
                }
              }
            }
          }
          recommendations(perPage: 8, sort: RATING_DESC) {
            nodes {
              mediaRecommendation {
                id
                idMal
                title {
                  english
                  romaji
                }
                format
                coverImage {
                  large
                }
                averageScore
              }
            }
          }
        }
      }
    `;
    const data = await this.query(gql, { id });
    const media = data?.Media;
    if (media) {
      try {
        await AnimeAggregationService.ingestAndNormalize(media, { enrichWithJikan: false });
        if (media.idMal) {
          AnimeAggregationService.enrichDbAnimeWithJikan(media.id).catch(() => {
          });
        }
      } catch (ingestErr) {
        console.warn("[AniList] Ingestion to DB notice:", ingestErr.message);
      }
    }
    return media;
  }
  /**
   * Fetch Single Anime Full Details by MyAnimeList ID
   */
  static async getDetailsByMalId(idMal) {
    const gql = `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          ${MEDIA_FIELDS}
          relations {
            edges {
              relationType
              node {
                id
                idMal
                title {
                  english
                  romaji
                }
                format
                coverImage {
                  large
                }
              }
            }
          }
          recommendations(perPage: 8, sort: RATING_DESC) {
            nodes {
              mediaRecommendation {
                id
                idMal
                title {
                  english
                  romaji
                }
                format
                coverImage {
                  large
                }
                averageScore
              }
            }
          }
        }
      }
    `;
    try {
      const data = await this.query(gql, { idMal });
      const media = data?.Media;
      if (media) {
        try {
          await AnimeAggregationService.ingestAndNormalize(media, { enrichWithJikan: false });
          if (media.idMal) {
            AnimeAggregationService.enrichDbAnimeWithJikan(media.id).catch(() => {
            });
          }
        } catch (ingestErr) {
          console.warn("[AniList] Ingestion to DB notice:", ingestErr.message);
        }
      }
      return media;
    } catch (err) {
      console.warn(`[AniList] getDetailsByMalId failed for MAL ID ${idMal}:`, err.message);
      return null;
    }
  }
  /**
   * Fetch Weekly Airing Schedule (Fetches up to 100 entries across the full week)
   */
  static async getWeeklySchedule(startTimestamp, endTimestamp) {
    const gql = `
      query ($start: Int, $end: Int, $page: Int) {
        Page(page: $page, perPage: 50) {
          pageInfo {
            hasNextPage
          }
          airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
            id
            airingAt
            episode
            timeUntilAiring
            media {
              id
              idMal
              title {
                english
                romaji
                native
              }
              coverImage {
                large
              }
              format
              genres
              description(asHtml: false)
            }
          }
        }
      }
    `;
    try {
      const data1 = await this.query(gql, { start: startTimestamp, end: endTimestamp, page: 1 });
      let schedules = data1?.Page?.airingSchedules || [];
      if (data1?.Page?.pageInfo?.hasNextPage) {
        try {
          const data2 = await this.query(gql, { start: startTimestamp, end: endTimestamp, page: 2 });
          if (data2?.Page?.airingSchedules && data2.Page.airingSchedules.length > 0) {
            schedules = schedules.concat(data2.Page.airingSchedules);
          }
        } catch {
        }
      }
      return schedules;
    } catch (err) {
      console.warn("[AniList] getWeeklySchedule failed:", err.message);
      return [];
    }
  }
  /**
   * Upsert Anime into local SQLite Database Cache
   */
  static async cacheAnimeList(items, extraFlags = {}) {
    for (const item of items) {
      if (!item.id) continue;
      try {
        await AnimeAggregationService.ingestAndNormalize(item, { flags: extraFlags, enrichWithJikan: false });
      } catch {
      }
    }
  }
};

// server/services/kitsuService.ts
import axios3 from "axios";
var KITSU_API_BASE = "https://kitsu.io/api/edge";
var KitsuService = class {
  static memoryCache = /* @__PURE__ */ new Map();
  static CACHE_TTL_MS = 1e3 * 60 * 60 * 24;
  // 24 hours
  /**
   * Search for anime on Kitsu to get its Kitsu ID
   */
  static async searchAnime(query) {
    const cleanQuery = query.trim().toLowerCase();
    const cacheKey = `kitsu:search:${cleanQuery}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    try {
      const response = await axios3.get(`${KITSU_API_BASE}/anime`, {
        params: {
          "filter[text]": query,
          "page[limit]": 1
        },
        timeout: 8e3,
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json"
        }
      });
      const firstItem = response.data?.data?.[0];
      const id = firstItem ? String(firstItem.id) : null;
      if (id) {
        this.memoryCache.set(cacheKey, { data: id, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return id;
    } catch (err) {
      console.warn(`[Kitsu] Search failed for "${query}":`, err.message);
      return null;
    }
  }
  /**
   * Fetch episode titles, air dates, and synopsis from Kitsu (paginated with max page limit of 20)
   */
  static async getEpisodes(kitsuId, limit = 100) {
    const cacheKey = `kitsu:episodes:${kitsuId}:${limit}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    try {
      const allEpisodes = [];
      const pageSize = 20;
      const pagesToFetch = Math.ceil(Math.min(limit, 100) / pageSize);
      for (let p = 0; p < pagesToFetch; p++) {
        const response = await axios3.get(`${KITSU_API_BASE}/anime/${kitsuId}/episodes`, {
          params: {
            "page[limit]": pageSize,
            "page[offset]": p * pageSize,
            sort: "number"
          },
          timeout: 8e3,
          headers: {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json"
          }
        });
        const items = response.data?.data || [];
        if (items.length === 0) break;
        for (const item of items) {
          const attrs = item.attributes || {};
          allEpisodes.push({
            number: attrs.number,
            title: attrs.canonicalTitle || attrs.titles?.en || attrs.titles?.en_us || attrs.titles?.en_jp || null,
            japaneseTitle: attrs.titles?.ja_jp || null,
            airDate: attrs.airdate || null,
            synopsis: attrs.synopsis || null
          });
        }
        if (items.length < pageSize) break;
      }
      if (allEpisodes.length > 0) {
        this.memoryCache.set(cacheKey, { data: allEpisodes, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return allEpisodes;
    } catch (err) {
      console.warn(`[Kitsu] Failed to fetch episodes for Kitsu ID ${kitsuId}:`, err.message);
      return [];
    }
  }
};

// server/services/malService.ts
import axios4 from "axios";
var MAL_API_BASE = "https://api.myanimelist.net/v2";
var MAL_CLIENT_ID = process.env.MAL_CLIENT_ID || "";
var MalService = class {
  static memoryCache = /* @__PURE__ */ new Map();
  static CACHE_TTL_MS = 1e3 * 60 * 60 * 12;
  // 12 hours
  /**
   * Check if official MAL API is configured with Client ID
   */
  static isConfigured() {
    return Boolean(MAL_CLIENT_ID && MAL_CLIENT_ID.trim().length > 0);
  }
  /**
   * Fetch anime details directly from MyAnimeList v2 API
   */
  static async getAnimeDetails(malId) {
    if (!this.isConfigured() || !malId) {
      return null;
    }
    const cacheKey = `mal:details:${malId}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    try {
      const response = await axios4.get(`${MAL_API_BASE}/anime/${malId}`, {
        headers: {
          "X-MAL-CLIENT-ID": MAL_CLIENT_ID
        },
        params: {
          fields: "id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,nsfw,genres,media_type,status,num_episodes,start_season,broadcast,source,average_episode_duration,rating,studios"
        },
        timeout: 5e3
      });
      if (response.data) {
        this.memoryCache.set(cacheKey, { data: response.data, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return response.data;
    } catch (error) {
      console.warn(`[MAL API] Failed to fetch MAL anime ID ${malId}:`, error.response?.data || error.message);
      return null;
    }
  }
  /**
   * Get official episode count from MyAnimeList
   */
  static async getOfficialEpisodeCount(malId) {
    const details = await this.getAnimeDetails(malId);
    if (details && typeof details.num_episodes === "number" && details.num_episodes > 0) {
      return details.num_episodes;
    }
    return null;
  }
  /**
   * Search MyAnimeList v2
   */
  static async searchAnime(query, limit = 10) {
    if (!this.isConfigured() || !query) {
      return [];
    }
    const cacheKey = `mal:search:${query}:${limit}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    try {
      const response = await axios4.get(`${MAL_API_BASE}/anime`, {
        headers: {
          "X-MAL-CLIENT-ID": MAL_CLIENT_ID
        },
        params: {
          q: query,
          limit,
          fields: "id,title,main_picture,synopsis,mean,media_type,num_episodes"
        },
        timeout: 5e3
      });
      const items = response.data?.data?.map((d) => d.node) || [];
      if (items.length > 0) {
        this.memoryCache.set(cacheKey, { data: items, expiry: Date.now() + this.CACHE_TTL_MS });
      }
      return items;
    } catch (error) {
      console.warn(`[MAL API] Search failed for "${query}":`, error.response?.data || error.message);
      return [];
    }
  }
};

// server/services/episodeMetadataService.ts
var EpisodeMetadataService = class {
  /**
   * Resolve episodes for an anime: checks local DB, enriches with MAL/Jikan/Kitsu if needed
   */
  static async getEpisodesForAnime(anime, options = {}) {
    const { forceSync = false, maxCount = 100 } = options;
    let dbEpisodes = [];
    try {
      dbEpisodes = await prisma.episode.findMany({
        where: { animeId: anime.id },
        orderBy: { episodeNumber: "asc" },
        include: { episodeStreams: true }
      });
    } catch (err) {
      console.warn("[EpisodeMetadataService] DB read notice:", err.message);
      dbEpisodes = [];
    }
    const hasRealTitlesInDb = dbEpisodes.some(
      (ep) => ep.episodeTitle && !ep.episodeTitle.toLowerCase().match(/^episode\s+\d+$/i) && (ep.metadataSource === "JIKAN" || ep.metadataSource === "KITSU" || ep.metadataSource === "MAL")
    );
    if (dbEpisodes.length > 0 && hasRealTitlesInDb && !forceSync) {
      return this.formatDbEpisodes(dbEpisodes, anime);
    }
    let officialMalCount = null;
    if (anime.malId && MalService.isConfigured()) {
      try {
        officialMalCount = await MalService.getOfficialEpisodeCount(anime.malId);
      } catch {
      }
    }
    const totalCount = officialMalCount || (typeof anime.totalEpisodes === "number" && anime.totalEpisodes > 0 ? anime.totalEpisodes : null) || (dbEpisodes.length > 0 ? dbEpisodes.length : null) || (anime.format === "MOVIE" ? 1 : 12);
    if (dbEpisodes.length >= totalCount && hasRealTitlesInDb && !forceSync) {
      return this.formatDbEpisodes(dbEpisodes, anime);
    }
    const enrichmentData = await this.fetchExternalEpisodes(anime, totalCount);
    if (enrichmentData.length > 0) {
      try {
        const upserted = await this.persistEpisodes(anime.id, enrichmentData, anime);
        if (upserted && upserted.length > 0) {
          return this.formatDbEpisodes(upserted, anime);
        }
      } catch (err) {
        console.warn("[EpisodeMetadataService] DB persist notice:", err.message);
      }
      return enrichmentData.map((e) => ({
        id: `${anime.id}-ep-${e.episodeNumber}`,
        number: e.episodeNumber,
        title: e.title || `Episode ${e.episodeNumber}`,
        japaneseTitle: e.japaneseTitle || null,
        hasRealTitle: Boolean(e.title && !e.title.toLowerCase().match(/^episode\s+\d+$/i)),
        isGenericTitle: !e.title || Boolean(e.title.toLowerCase().match(/^episode\s+\d+$/i)),
        thumbnail: anime.bannerImage || anime.coverImage || "/logo_cropped.png",
        duration: anime.duration ? `${anime.duration}m` : "24m",
        airDate: e.airDate ? new Date(e.airDate).toLocaleDateString() : "Broadcasting",
        filler: e.filler,
        recap: e.recap,
        metadataSource: e.source,
        subAvailable: true,
        dubAvailable: true
      }));
    }
    if (dbEpisodes.length > 0) {
      return this.formatDbEpisodes(dbEpisodes, anime);
    }
    return this.generateFallbackEpisodes(anime, totalCount, maxCount);
  }
  /**
   * Fetch episode titles and air dates from Jikan (primary) with Kitsu fallback
   */
  static async fetchExternalEpisodes(anime, targetCount) {
    const results = [];
    if (anime.malId) {
      try {
        const jikanEpisodes = await JikanService.getAnimeEpisodes(anime.malId, 1);
        if (Array.isArray(jikanEpisodes) && jikanEpisodes.length > 0) {
          for (const ep of jikanEpisodes) {
            results.push({
              episodeNumber: ep.mal_id,
              title: ep.title && !ep.title.toLowerCase().match(/^episode\s+\d+$/i) ? ep.title : null,
              japaneseTitle: ep.title_japanese || null,
              airDate: ep.aired ? new Date(ep.aired) : null,
              filler: Boolean(ep.filler),
              recap: Boolean(ep.recap),
              source: "JIKAN"
            });
          }
          if (results.some((r) => r.title !== null)) {
            return results;
          }
        }
      } catch (err) {
        console.warn(`[EpisodeService] Jikan episodes fetch failed for MAL ID ${anime.malId}:`, err.message);
      }
    }
    try {
      const searchTitle = anime.titleEnglish || anime.titleRomaji;
      const kitsuId = await KitsuService.searchAnime(searchTitle);
      if (kitsuId) {
        const kitsuEpisodes = await KitsuService.getEpisodes(kitsuId, Math.min(targetCount, 100));
        if (Array.isArray(kitsuEpisodes) && kitsuEpisodes.length > 0) {
          for (const ep of kitsuEpisodes) {
            results.push({
              episodeNumber: ep.number,
              title: ep.title && !ep.title.toLowerCase().match(/^episode\s+\d+$/i) ? ep.title : null,
              japaneseTitle: ep.japaneseTitle || null,
              airDate: ep.airDate ? new Date(ep.airDate) : null,
              filler: false,
              recap: false,
              source: "KITSU"
            });
          }
          return results;
        }
      }
    } catch (kitsuErr) {
      console.warn(`[EpisodeService] Kitsu fallback failed for ${anime.titleEnglish}:`, kitsuErr.message);
    }
    return results;
  }
  /**
   * Persist enriched episodes to SQLite
   */
  static async persistEpisodes(animeId, episodes, anime) {
    const defaultThumbnail = anime.bannerImage || anime.coverImage || null;
    for (const ep of episodes) {
      let finalTitle = ep.title;
      if (!finalTitle && anime.format === "MOVIE") {
        finalTitle = `${anime.titleEnglish || "Movie"} (Feature Film)`;
      }
      await prisma.episode.upsert({
        where: {
          animeId_episodeNumber: {
            animeId,
            episodeNumber: ep.episodeNumber
          }
        },
        update: {
          episodeTitle: finalTitle,
          japaneseTitle: ep.japaneseTitle,
          airedAt: ep.airDate,
          filler: ep.filler,
          recap: ep.recap,
          metadataSource: ep.source,
          metadataStatus: finalTitle ? "AVAILABLE" : "PENDING",
          thumbnail: defaultThumbnail,
          thumbnailUrl: defaultThumbnail
        },
        create: {
          animeId,
          episodeNumber: ep.episodeNumber,
          episodeTitle: finalTitle,
          japaneseTitle: ep.japaneseTitle,
          airedAt: ep.airDate,
          filler: ep.filler,
          recap: ep.recap,
          metadataSource: ep.source,
          metadataStatus: finalTitle ? "AVAILABLE" : "PENDING",
          thumbnail: defaultThumbnail,
          thumbnailUrl: defaultThumbnail
        }
      });
    }
    return prisma.episode.findMany({
      where: { animeId },
      orderBy: { episodeNumber: "asc" }
    });
  }
  /**
   * Format DB records into clean API output
   */
  static formatDbEpisodes(dbEpisodes, anime) {
    const fallbackThumb = anime.bannerImage || anime.coverImage || "/logo_cropped.png";
    return dbEpisodes.map((ep) => {
      const isGeneric = !ep.episodeTitle || Boolean(ep.episodeTitle.toLowerCase().match(/^episode\s+\d+$/i));
      const hasRealTitle = !isGeneric;
      const displayTitle = ep.episodeTitle || `Episode ${ep.episodeNumber}`;
      let airDateFormatted = "TBA";
      if (ep.airedAt) {
        airDateFormatted = new Date(ep.airedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
      } else if (ep.releaseDate && ep.releaseDate !== "HD Available") {
        airDateFormatted = ep.releaseDate;
      }
      return {
        id: ep.id,
        number: ep.episodeNumber,
        title: displayTitle,
        japaneseTitle: ep.japaneseTitle || null,
        hasRealTitle,
        isGenericTitle: isGeneric,
        thumbnail: ep.thumbnail || ep.thumbnailUrl || fallbackThumb,
        duration: `${anime.duration || 24}m`,
        airDate: airDateFormatted,
        filler: Boolean(ep.filler),
        recap: Boolean(ep.recap),
        metadataSource: ep.metadataSource || "ANILIST",
        subAvailable: true,
        dubAvailable: true
      };
    });
  }
  /**
   * Generate honest, clearly tagged fallback episodes
   */
  static generateFallbackEpisodes(anime, count, maxCount) {
    const fallbackThumb = anime.bannerImage || anime.coverImage || "/logo_cropped.png";
    const totalToGenerate = Math.min(count, maxCount);
    const episodes = [];
    const isMovie = anime.format === "MOVIE";
    for (let ep = 1; ep <= totalToGenerate; ep++) {
      const title = isMovie ? `${anime.titleEnglish || "Movie"} (Feature Film)` : `Episode ${ep}`;
      episodes.push({
        id: `ep-${anime.id}-${ep}`,
        number: ep,
        title,
        japaneseTitle: null,
        hasRealTitle: isMovie,
        isGenericTitle: !isMovie,
        thumbnail: fallbackThumb,
        duration: isMovie ? `${anime.duration || 110}m` : `${anime.duration || 24}m`,
        airDate: "TBA",
        filler: false,
        recap: false,
        metadataSource: "PLACEHOLDER",
        subAvailable: true,
        dubAvailable: true
      });
    }
    return episodes;
  }
};

// server/middleware/cache.ts
var memoryCache = /* @__PURE__ */ new Map();
var cacheInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1e3);
if (cacheInterval.unref) cacheInterval.unref();
function cacheResponse(ttlSeconds = 300) {
  return (req, res, next) => {
    if (req.method !== "GET" || req.headers.authorization) {
      return next();
    }
    const cacheKey = `${req.originalUrl || req.url}`;
    const now = Date.now();
    const cached = memoryCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`);
      res.setHeader("Content-Type", cached.contentType || "application/json");
      return res.send(cached.body);
    }
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(cacheKey, {
          body: JSON.stringify(body),
          contentType: "application/json",
          expiresAt: Date.now() + ttlSeconds * 1e3
        });
        res.setHeader("X-Cache", "MISS");
        res.setHeader("Cache-Control", `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`);
      }
      return originalJson(body);
    };
    next();
  };
}
function invalidateCache(prefix) {
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

// server/routes/animeRoutes.ts
var animeRouter = Router2();
function formatAnimeItem(item) {
  let genres = [];
  try {
    genres = typeof item.genres === "string" ? JSON.parse(item.genres) : item.genres || [];
  } catch {
    genres = [];
  }
  let studios = [];
  if (Array.isArray(item.studios)) {
    studios = item.studios;
  } else if (item.studios?.nodes && Array.isArray(item.studios.nodes)) {
    studios = item.studios.nodes.map((n) => n.name).filter(Boolean);
  } else if (typeof item.studios === "string") {
    try {
      studios = JSON.parse(item.studios);
    } catch {
      studios = [];
    }
  }
  let altTitles = [];
  try {
    altTitles = typeof item.alternativeTitles === "string" ? JSON.parse(item.alternativeTitles) : item.alternativeTitles || [];
  } catch {
    altTitles = [];
  }
  const rawScore = typeof item.averageScore === "number" ? item.averageScore : 85;
  const normalizedScore = rawScore > 10 ? rawScore / 10 : rawScore;
  const roundedRating = Math.round(normalizedScore * 10) / 10;
  const percentScore = Math.round(normalizedScore * 10);
  const rawCover = item.coverImage;
  let coverUrl = "";
  let xlCoverUrl = "";
  if (typeof rawCover === "string" && rawCover.trim()) {
    coverUrl = rawCover.trim();
    xlCoverUrl = typeof item.coverImageExtraLarge === "string" && item.coverImageExtraLarge.trim() ? item.coverImageExtraLarge.trim() : coverUrl;
  } else if (rawCover && typeof rawCover === "object") {
    coverUrl = rawCover.extraLarge || rawCover.large || rawCover.medium || "";
    xlCoverUrl = rawCover.extraLarge || rawCover.large || coverUrl;
  }
  if (!coverUrl && typeof item.coverImageExtraLarge === "string") {
    coverUrl = item.coverImageExtraLarge.trim();
    xlCoverUrl = coverUrl;
  }
  let banner = "";
  if (typeof item.bannerImage === "string" && item.bannerImage.trim()) {
    banner = item.bannerImage.trim();
  } else if (item.bannerImage && typeof item.bannerImage === "object" && item.bannerImage.large) {
    banner = item.bannerImage.large;
  } else {
    banner = xlCoverUrl || coverUrl;
  }
  const resolvedAnilistId = item.anilistId || (typeof item.id === "number" ? item.id : null) || (item.sourceRecordId ? parseInt(item.sourceRecordId, 10) : null);
  const resolvedMalId = item.malId || item.idMal || null;
  return {
    id: resolvedAnilistId ? String(resolvedAnilistId) : String(item.id),
    dbId: typeof item.id === "string" ? item.id : void 0,
    anilistId: resolvedAnilistId,
    malId: resolvedMalId,
    title: {
      english: item.titleEnglish || item.title?.english || item.title?.romaji || "Unknown Title",
      romaji: item.titleRomaji || item.title?.romaji || "",
      native: item.titleNative || item.title?.native || "",
      alternative: altTitles
    },
    coverImage: {
      large: coverUrl,
      extraLarge: xlCoverUrl,
      medium: coverUrl
    },
    bannerImage: banner,
    format: item.format || "TV",
    status: item.status || "FINISHED",
    description: item.description || "",
    year: item.releaseYear || item.seasonYear || 2024,
    season: item.season,
    episodes: typeof item.totalEpisodes === "number" && item.totalEpisodes > 0 ? item.totalEpisodes : typeof item.episodes === "number" && item.episodes > 0 ? item.episodes : Array.isArray(item.episodes) && item.episodes.length > 0 ? item.episodes.length : 12,
    duration: item.duration || 24,
    countryOfOrigin: item.countryOfOrigin || "JP",
    rating: roundedRating,
    scorePercent: percentScore,
    anilistScore: roundedRating,
    malScore: item.malScore || null,
    popularity: item.popularity || 5e4,
    genres,
    studios,
    ageRating: "PG-13",
    subAvailable: true,
    dubAvailable: true,
    isTrending: Boolean(item.isTrending),
    isPopular: Boolean(item.isPopular),
    isTopRated: Boolean(item.isTopRated),
    isUpcoming: item.status === "NOT_YET_RELEASED"
  };
}
animeRouter.get("/trending", cacheResponse(600), async (req, res) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);
  try {
    const items = await AniListService.getTrending(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err) {
    console.warn("[Trending Route] Live AniList fetch notice:", err.message);
  }
  try {
    const dbItems = await prisma.anime.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { popularity: "desc" }
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr) {
    console.error("[Trending Route] DB fallback error:", dbErr.message);
    return res.json({ items: [] });
  }
});
animeRouter.get("/popular", cacheResponse(600), async (req, res) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);
  try {
    const items = await AniListService.getPopular(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err) {
    console.warn("[Popular Route] Live AniList fetch notice:", err.message);
  }
  try {
    const dbItems = await prisma.anime.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { popularity: "desc" }
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr) {
    console.error("[Popular Route] DB fallback error:", dbErr.message);
    return res.json({ items: [] });
  }
});
animeRouter.get("/top-rated", cacheResponse(600), async (req, res) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);
  try {
    const items = await AniListService.getTopRated(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err) {
    console.warn("[Top-Rated Route] Live AniList fetch notice:", err.message);
  }
  try {
    const dbItems = await prisma.anime.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { averageScore: "desc" }
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr) {
    console.error("[Top-Rated Route] DB fallback error:", dbErr.message);
    return res.json({ items: [] });
  }
});
animeRouter.get("/airing", cacheResponse(300), async (req, res) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);
  try {
    const items = await AniListService.getCurrentlyAiring(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err) {
    console.warn("[Airing Route] Live AniList fetch notice:", err.message);
  }
  try {
    const dbItems = await prisma.anime.findMany({
      where: { status: "RELEASING" },
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { updatedAt: "desc" }
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr) {
    console.error("[Airing Route] DB fallback error:", dbErr.message);
    return res.json({ items: [] });
  }
});
animeRouter.get("/upcoming", cacheResponse(900), async (req, res) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 18);
  try {
    const items = await AniListService.getUpcoming(page, perPage);
    if (items && items.length > 0) {
      return res.json({ items: items.map(formatAnimeItem) });
    }
  } catch (err) {
    console.warn("[Upcoming Route] Live AniList fetch failed, using DB cache:", err.message);
  }
  try {
    const dbItems = await prisma.anime.findMany({
      where: { status: "NOT_YET_RELEASED" },
      take: perPage,
      skip: (page - 1) * perPage
    });
    return res.json({ items: dbItems.map(formatAnimeItem) });
  } catch (dbErr) {
    console.error("[Upcoming Route] DB fallback failed:", dbErr.message);
    return res.json({ items: [] });
  }
});
animeRouter.get("/movies", cacheResponse(900), async (req, res) => {
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 24);
  const sort = req.query.sort ? sanitizeString(req.query.sort, 30) : void 0;
  const genre = req.query.genre ? sanitizeString(req.query.genre, 50) : void 0;
  try {
    const result = await AniListService.getMovies(page, perPage, sort, genre);
    if (result && result.items && result.items.length > 0) {
      return res.json({
        items: result.items.map(formatAnimeItem),
        total: result.total,
        hasNextPage: result.hasNextPage
      });
    }
  } catch (err) {
    console.warn("[Movies Route] Live AniList fetch failed, using DB cache:", err.message);
  }
  try {
    const whereClause = { format: "MOVIE" };
    if (genre && genre !== "ALL") {
      whereClause.genres = { contains: genre };
    }
    let orderBy = { averageScore: "desc" };
    if (sort === "popular") orderBy = { popularity: "desc" };
    else if (sort === "newest") orderBy = { releaseYear: "desc" };
    const [dbItems, totalCount] = await Promise.all([
      prisma.anime.findMany({
        where: whereClause,
        take: perPage,
        skip: (page - 1) * perPage,
        orderBy
      }),
      prisma.anime.count({ where: whereClause })
    ]);
    return res.json({
      items: dbItems.map(formatAnimeItem),
      total: totalCount,
      hasNextPage: page * perPage < totalCount
    });
  } catch (dbErr) {
    console.error("[Movies Route] DB fallback failed:", dbErr.message);
    return res.json({ items: [], total: 0, hasNextPage: false });
  }
});
animeRouter.get("/dubbed/hindi", cacheResponse(900), async (req, res) => {
  try {
    const items = await AniListService.getDubbedCollection("hindi", 1, 18);
    return res.json({ items: items.map(formatAnimeItem) });
  } catch (err) {
    console.warn("[Dubbed Hindi Route] Live AniList fetch notice:", err.message);
    try {
      const dbItems = await prisma.anime.findMany({
        take: 18,
        orderBy: { popularity: "desc" }
      });
      return res.json({ items: dbItems.map(formatAnimeItem) });
    } catch {
      return res.json({ items: [] });
    }
  }
});
animeRouter.get("/dubbed/english", cacheResponse(900), async (req, res) => {
  try {
    const items = await AniListService.getDubbedCollection("english", 1, 18);
    return res.json({ items: items.map(formatAnimeItem) });
  } catch (err) {
    console.warn("[Dubbed English Route] Live AniList fetch notice:", err.message);
    try {
      const dbItems = await prisma.anime.findMany({
        take: 18,
        skip: 2,
        orderBy: { popularity: "desc" }
      });
      return res.json({ items: dbItems.map(formatAnimeItem) });
    } catch {
      return res.json({ items: [] });
    }
  }
});
animeRouter.get("/genre/:genre", cacheResponse(600), async (req, res) => {
  const genre = sanitizeString(req.params.genre, 50);
  const page = sanitizeNumber(req.query.page, 1, 100, 1);
  const perPage = sanitizeNumber(req.query.perPage, 1, 50, 24);
  const sort = req.query.sort ? sanitizeString(req.query.sort, 30) : void 0;
  try {
    const result = await AniListService.getByGenre(genre, page, perPage, sort);
    if (result && result.items && result.items.length > 0) {
      return res.json({
        items: result.items.map(formatAnimeItem),
        total: result.total,
        hasNextPage: result.hasNextPage
      });
    }
  } catch (err) {
    console.warn(`[Genre Route] Live fetch notice for ${genre}:`, err.message);
  }
  try {
    const whereClause = { genres: { contains: genre } };
    let orderBy = { popularity: "desc" };
    if (sort === "rating") orderBy = { averageScore: "desc" };
    else if (sort === "newest") orderBy = { releaseYear: "desc" };
    const [dbItems, totalCount] = await Promise.all([
      prisma.anime.findMany({
        where: whereClause,
        take: perPage,
        skip: (page - 1) * perPage,
        orderBy
      }),
      prisma.anime.count({ where: whereClause })
    ]);
    return res.json({
      items: dbItems.map(formatAnimeItem),
      total: totalCount,
      hasNextPage: page * perPage < totalCount
    });
  } catch (dbErr) {
    return res.json({ items: [], total: 0, hasNextPage: false });
  }
});
animeRouter.get("/search", searchRateLimiter, cacheResponse(120), async (req, res) => {
  try {
    const q = sanitizeString(req.query.q, 100);
    const genre = req.query.genre ? sanitizeString(req.query.genre, 50) : void 0;
    const format = req.query.format ? sanitizeString(req.query.format, 20) : void 0;
    const status = req.query.status ? sanitizeString(req.query.status, 30) : void 0;
    const year = req.query.year ? sanitizeNumber(req.query.year, 1960, 2030, void 0) : void 0;
    const season = req.query.season ? sanitizeString(req.query.season, 20) : void 0;
    const sort = req.query.sort ? sanitizeString(req.query.sort, 30) : void 0;
    const page = sanitizeNumber(req.query.page, 1, 100, 1);
    const perPage = sanitizeNumber(req.query.perPage, 1, 50, 24);
    const result = await AniListService.search({
      query: q,
      genre,
      format,
      status,
      year,
      season,
      sort,
      page,
      perPage
    });
    return res.json({
      items: result.items.map(formatAnimeItem),
      total: result.total,
      hasNextPage: result.hasNextPage
    });
  } catch (error) {
    console.warn("[Search Route] Search query notice:", error.message);
    try {
      const q = sanitizeString(req.query.q, 100);
      const dbItems = await prisma.anime.findMany({
        where: q ? {
          OR: [
            { titleEnglish: { contains: q } },
            { titleRomaji: { contains: q } }
          ]
        } : void 0,
        take: 24
      });
      return res.json({ items: dbItems.map(formatAnimeItem), total: dbItems.length, hasNextPage: false });
    } catch {
      return res.json({ items: [], total: 0, hasNextPage: false });
    }
  }
});
animeRouter.get("/schedule", cacheResponse(1800), async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1e3);
    const startOfWeek = now - 86400 * 1;
    const endOfWeek = now + 86400 * 7;
    try {
      const schedules = await AniListService.getWeeklySchedule(startOfWeek, endOfWeek);
      if (schedules && schedules.length > 0) {
        const seenKeys = /* @__PURE__ */ new Set();
        const formatted = [];
        for (const item of schedules) {
          const key = `${item.media?.id || item.id}-${item.episode}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            formatted.push({
              id: item.id,
              airingAt: item.airingAt,
              episode: item.episode,
              timeUntilAiring: item.timeUntilAiring,
              anime: formatAnimeItem(item.media)
            });
          }
        }
        return res.json({ schedules: formatted });
      }
    } catch (e) {
      console.warn("[Schedule Route] AniList live fetch notice:", e.message);
    }
    const dbSchedules = await prisma.airingSchedule.findMany({
      take: 60,
      orderBy: { airingAt: "asc" },
      include: { anime: true }
    });
    const seenDbKeys = /* @__PURE__ */ new Set();
    const formattedDb = [];
    for (const s of dbSchedules) {
      const key = `${s.animeId}-${s.episodeNumber}`;
      if (!seenDbKeys.has(key)) {
        seenDbKeys.add(key);
        formattedDb.push({
          id: s.id,
          airingAt: Math.floor(s.airingAt.getTime() / 1e3),
          episode: s.episodeNumber,
          timeUntilAiring: s.timeUntilAiring,
          anime: formatAnimeItem(s.anime)
        });
      }
    }
    return res.json({ schedules: formattedDb });
  } catch (error) {
    console.error("Schedule fetch error:", error.message);
    return res.json({ schedules: [] });
  }
});
animeRouter.get("/:id", cacheResponse(900), async (req, res) => {
  try {
    const rawId = req.params.id;
    const sourceParam = (req.query.source || "").toLowerCase();
    const isExplicitMal = sourceParam === "mal" || rawId.toLowerCase().startsWith("mal-");
    const isExplicitAniList = sourceParam === "anilist" || rawId.toLowerCase().startsWith("anilist-");
    const cleanId = rawId.replace(/^(mal|anilist)-/i, "").trim();
    const numericId = parseInt(cleanId, 10);
    const isNumeric = !isNaN(numericId) && String(numericId) === cleanId;
    let animeData = null;
    let dbRecord = null;
    try {
      if (isNumeric) {
        if (isExplicitMal) {
          dbRecord = await prisma.anime.findFirst({
            where: { malId: numericId },
            include: {
              episodes: { orderBy: { episodeNumber: "asc" }, include: { episodeStreams: true } },
              characters: true,
              airingSchedules: true
            }
          });
        } else if (isExplicitAniList) {
          dbRecord = await prisma.anime.findUnique({
            where: { anilistId: numericId },
            include: {
              episodes: { orderBy: { episodeNumber: "asc" }, include: { episodeStreams: true } },
              characters: true,
              airingSchedules: true
            }
          });
        } else {
          dbRecord = await prisma.anime.findUnique({
            where: { anilistId: numericId },
            include: {
              episodes: { orderBy: { episodeNumber: "asc" }, include: { episodeStreams: true } },
              characters: true,
              airingSchedules: true
            }
          });
          if (!dbRecord) {
            dbRecord = await prisma.anime.findFirst({
              where: { malId: numericId },
              include: {
                episodes: { orderBy: { episodeNumber: "asc" }, include: { episodeStreams: true } },
                characters: true,
                airingSchedules: true
              }
            });
          }
        }
      } else {
        dbRecord = await prisma.anime.findUnique({
          where: { id: cleanId },
          include: {
            episodes: { orderBy: { episodeNumber: "asc" }, include: { episodeStreams: true } },
            characters: true,
            airingSchedules: true
          }
        });
        if (!dbRecord) {
          const cleanTitle = cleanId.replace(/-/g, " ").trim();
          dbRecord = await prisma.anime.findFirst({
            where: {
              OR: [
                { titleEnglish: { contains: cleanTitle } },
                { titleRomaji: { contains: cleanTitle } }
              ]
            },
            include: {
              episodes: { orderBy: { episodeNumber: "asc" }, include: { episodeStreams: true } },
              characters: true,
              airingSchedules: true
            }
          });
        }
      }
    } catch (dbErr) {
      console.warn("[Anime Details] DB cache read notice:", dbErr.message);
      dbRecord = null;
    }
    if (!dbRecord) {
      if (isNumeric) {
        if (isExplicitMal) {
          try {
            animeData = await AniListService.getDetailsByMalId(numericId);
          } catch (e) {
            console.warn("[Anime Details] AniList getDetailsByMalId warning:", e.message);
          }
        } else if (isExplicitAniList) {
          try {
            animeData = await AniListService.getDetails(numericId);
          } catch (e) {
            console.warn("[Anime Details] AniList getDetails warning:", e.message);
          }
        } else {
          try {
            animeData = await AniListService.getDetails(numericId);
          } catch (err) {
            console.warn("[Anime Details] AniList ID lookup warning:", err.message);
          }
          if (!animeData) {
            try {
              animeData = await AniListService.getDetailsByMalId(numericId);
            } catch (err) {
              console.warn("[Anime Details] MAL ID fallback lookup warning:", err.message);
            }
          }
        }
      } else {
        const cleanTitle = cleanId.replace(/-/g, " ").trim();
        try {
          let searchRes = await AniListService.search({ query: cleanTitle, perPage: 1 });
          if (!searchRes.items || searchRes.items.length === 0) {
            const firstTwoWords = cleanTitle.split(" ").slice(0, 2).join(" ");
            if (firstTwoWords && firstTwoWords !== cleanTitle) {
              searchRes = await AniListService.search({ query: firstTwoWords, perPage: 1 });
            }
          }
          if (searchRes.items && searchRes.items.length > 0) {
            animeData = await AniListService.getDetails(searchRes.items[0].id);
          }
        } catch (err) {
          console.warn("[Anime Details] Title search fallback warning:", err.message);
        }
      }
    }
    if (!animeData && !dbRecord) {
      return res.status(404).json({ error: "Anime not found", code: "NOT_FOUND" });
    }
    if (animeData && (!dbRecord || dbRecord.characters?.length === 0)) {
      try {
        dbRecord = await prisma.anime.findUnique({
          where: { anilistId: animeData.id },
          include: {
            episodes: {
              orderBy: { episodeNumber: "asc" },
              include: { episodeStreams: true }
            },
            characters: true,
            airingSchedules: true
          }
        });
      } catch (dbErr) {
        console.warn("[Anime Details] DB record refresh notice:", dbErr.message);
      }
    }
    const base = animeData || dbRecord;
    const formatted = formatAnimeItem(base);
    const animeLookup = {
      id: dbRecord ? dbRecord.id : base.dbId || String(base.id || base.anilistId),
      anilistId: base.anilistId || base.id,
      malId: base.malId || null,
      titleEnglish: formatted.title.english,
      titleRomaji: formatted.title.romaji,
      format: formatted.format,
      totalEpisodes: typeof base.totalEpisodes === "number" ? base.totalEpisodes : typeof base.episodes === "number" ? base.episodes : 12,
      duration: base.duration || 24,
      coverImage: formatted.coverImage?.large,
      bannerImage: formatted.bannerImage
    };
    let episodesList = [];
    if (dbRecord && Array.isArray(dbRecord.episodes) && dbRecord.episodes.length > 0) {
      episodesList = dbRecord.episodes.map((ep) => {
        const isGeneric = !ep.episodeTitle || Boolean(ep.episodeTitle.toLowerCase().match(/^episode\s+\d+$/i));
        return {
          id: ep.id,
          number: ep.episodeNumber,
          title: ep.episodeTitle || `Episode ${ep.episodeNumber}`,
          japaneseTitle: ep.japaneseTitle || null,
          hasRealTitle: !isGeneric,
          isGenericTitle: isGeneric,
          thumbnail: ep.thumbnail || ep.thumbnailUrl || formatted.bannerImage || formatted.coverImage.large,
          duration: `${base.duration || 24}m`,
          airDate: ep.airedAt ? new Date(ep.airedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ep.releaseDate || "TBA",
          filler: Boolean(ep.filler),
          recap: Boolean(ep.recap),
          metadataSource: ep.metadataSource || "ANILIST",
          subAvailable: true,
          dubAvailable: true
        };
      });
      const hasRealTitles = episodesList.some((e) => e.hasRealTitle);
      if (!hasRealTitles && animeLookup.malId) {
        EpisodeMetadataService.getEpisodesForAnime(dbRecord, { forceSync: true, maxCount: 100 }).catch((e) => {
          console.warn(`[Background Episode Sync] failed for ${dbRecord.id}:`, e.message);
        });
      }
    } else {
      const totalCount = animeLookup.totalEpisodes || 12;
      const count = Math.min(totalCount > 0 ? totalCount : 12, 100);
      const isMovie = formatted.format === "MOVIE";
      for (let ep = 1; ep <= count; ep++) {
        episodesList.push({
          id: `ep-${animeLookup.id}-${ep}`,
          number: ep,
          title: isMovie ? `${formatted.title.english} (Feature Film)` : `Episode ${ep}`,
          japaneseTitle: null,
          hasRealTitle: isMovie,
          isGenericTitle: !isMovie,
          thumbnail: formatted.bannerImage || formatted.coverImage.large,
          duration: isMovie ? `${base.duration || 110}m` : `${base.duration || 24}m`,
          airDate: "TBA",
          filler: false,
          recap: false,
          metadataSource: "PLACEHOLDER",
          subAvailable: true,
          dubAvailable: true
        });
      }
      if (dbRecord) {
        EpisodeMetadataService.getEpisodesForAnime(dbRecord, { forceSync: true, maxCount: 100 }).catch((e) => {
          console.warn(`[Background Episode Sync] failed for ${dbRecord.id}:`, e.message);
        });
      }
    }
    const charactersList = (dbRecord?.characters || []).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      image: c.imageUrl,
      voiceActor: {
        name: c.voiceActorName,
        language: c.voiceActorLanguage,
        image: c.voiceActorImage
      }
    }));
    const recs = animeData?.recommendations?.nodes?.map((n) => n.mediaRecommendation)?.filter(Boolean)?.map(formatAnimeItem) || [];
    const nextAiring = animeData?.nextAiringEpisode || dbRecord?.airingSchedules?.[0] || null;
    return res.json({
      anime: {
        ...formatted,
        episodesList,
        characters: charactersList,
        recommendations: recs,
        nextAiring
      }
    });
  } catch (error) {
    console.error("Details fetch error:", error);
    return res.status(500).json({ error: error.message, code: "SERVER_ERROR" });
  }
});
animeRouter.get("/:id/characters", cacheResponse(900), async (req, res) => {
  try {
    const { id } = req.params;
    const anilistId = parseInt(id, 10);
    const anime = await prisma.anime.findFirst({
      where: isNaN(anilistId) ? { id } : { anilistId },
      include: { characters: true }
    });
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }
    if (anime.characters.length === 0 && anime.malId) {
      await AnimeAggregationService.enrichDbAnimeWithJikan(anime.id);
      const updated = await prisma.anime.findUnique({
        where: { id: anime.id },
        include: { characters: true }
      });
      return res.json({ characters: updated?.characters || [] });
    }
    return res.json({ characters: anime.characters });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
animeRouter.get("/:id/episodes", cacheResponse(600), async (req, res) => {
  try {
    const { id } = req.params;
    const anilistId = parseInt(id, 10);
    const forceSync = req.query.refresh === "true";
    let anime = null;
    try {
      anime = await prisma.anime.findFirst({
        where: isNaN(anilistId) ? { id } : { anilistId },
        include: {
          episodes: {
            orderBy: { episodeNumber: "asc" },
            include: { episodeStreams: true }
          }
        }
      });
    } catch (dbErr) {
      console.warn("[Anime Episodes] DB lookup notice:", dbErr.message);
      anime = null;
    }
    if (!anime && !isNaN(anilistId)) {
      try {
        const liveData = await AniListService.getDetails(anilistId);
        if (liveData) {
          try {
            anime = await prisma.anime.findUnique({
              where: { anilistId },
              include: {
                episodes: {
                  orderBy: { episodeNumber: "asc" },
                  include: { episodeStreams: true }
                }
              }
            });
          } catch {
          }
          if (!anime) {
            anime = {
              id: String(liveData.id),
              anilistId: liveData.id,
              malId: liveData.idMal || null,
              titleEnglish: liveData.title?.english || liveData.title?.romaji || "Anime",
              titleRomaji: liveData.title?.romaji || "",
              format: liveData.format || "TV",
              totalEpisodes: liveData.episodes || 12,
              duration: liveData.duration || 24,
              coverImage: liveData.coverImage?.large || "",
              bannerImage: liveData.bannerImage || "",
              episodes: []
            };
          }
        }
      } catch (liveErr) {
        console.warn("[Anime Episodes] Live AniList fetch notice:", liveErr.message);
      }
    }
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }
    const episodes = await EpisodeMetadataService.getEpisodesForAnime(anime, {
      forceSync,
      maxCount: 200
    });
    return res.json({ episodes });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// server/routes/streamRoutes.ts
import { Router as Router3 } from "express";

// server/services/vidwaveService.ts
var VIDWAVE_EMBED_HOST = "https://embed.vidwave.sbs";
var VIDWAVE_ALT_HOST = "https://embed.vidwave.site";
var HINDI_CACHE_TTL = 1e3 * 60 * 60 * 6;

// server/services/streamingEngine.ts
var providerFailureCount = /* @__PURE__ */ new Map();
function reportProviderFailure(serverId) {
  const current = providerFailureCount.get(serverId) || { failures: 0, lastFailed: 0 };
  providerFailureCount.set(serverId, {
    failures: current.failures + 1,
    lastFailed: Date.now()
  });
}
function getProviderPenalty(serverId) {
  const stat = providerFailureCount.get(serverId);
  if (!stat) return 0;
  if (Date.now() - stat.lastFailed > 15 * 60 * 1e3) {
    providerFailureCount.delete(serverId);
    return 0;
  }
  return stat.failures * 5;
}
var AniEmbedAdapter = class {
  id = "aniembed";
  name = "AniEmbed";
  async getSupportedLanguages(anilistId, animeRecord) {
    const audios = ["sub"];
    if (animeRecord?.format !== "MUSIC") {
      audios.push("dub");
    }
    return audios;
  }
  async checkAvailability(params) {
    if (params.audio === "hindi") return false;
    return params.episode >= 1 && (params.anilistId > 0 || Boolean(params.malId && params.malId > 0));
  }
  async getSources(params) {
    const { anilistId, malId, episode, audio, time = 0 } = params;
    if (audio === "hindi") return [];
    const lang = audio === "dub" ? "dub" : "sub";
    const timeParam = time > 0 ? `&t=${Math.floor(time)}` : "";
    const idSegment = anilistId > 0 ? `${anilistId}` : malId ? `mal/${malId}` : "";
    if (!idSegment) return [];
    const embedUrl = `https://aniembed.se/e/${idSegment}/${episode}?lang=${lang}&autoplay=0${timeParam}`;
    return [
      {
        id: "aniembed-ultra",
        name: "AniEmbed Ultra HD",
        whiteLabelName: "Stream 1 (Ultra)",
        providerId: "aniembed",
        embedUrl,
        audio,
        isDefault: true,
        priority: 10 - getProviderPenalty("aniembed-ultra"),
        quality: "1080p",
        iframeOptions: {
          allow: "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          referrerPolicy: "strict-origin-when-cross-origin"
        },
        eventSpec: {
          originMatches: ["aniembed.se"],
          readyEvent: "ready",
          playEvent: "play",
          pauseEvent: "pause",
          errorEvent: "error",
          timeEvent: "progress",
          completeEvent: "ended"
        }
      }
    ];
  }
};
var AnimeEmbedAdapter = class {
  id = "animeembed";
  name = "AnimeEmbed";
  async getSupportedLanguages(anilistId, animeRecord) {
    const audios = ["sub"];
    if (animeRecord?.format !== "MUSIC") {
      audios.push("dub");
    }
    return audios;
  }
  async checkAvailability(params) {
    if (params.audio === "hindi") return false;
    return params.episode >= 1 && params.anilistId > 0;
  }
  async getSources(params) {
    const { anilistId, episode, audio, autoplay = true, autoNext = true, time = 0 } = params;
    if (audio === "hindi") return [];
    const track = audio === "dub" ? "dub" : "sub";
    const query = new URLSearchParams({ track });
    if (autoplay) query.set("autoPlay", "1");
    if (autoNext) query.set("autoNext", "1");
    query.set("autoSkip", "1");
    if (time > 0) query.set("time", Math.floor(time).toString());
    const embedUrl = `https://animeembed.com/embed/ani/${anilistId}/${episode}?${query.toString()}`;
    return [
      {
        id: "animeembed-direct",
        name: "AnimeEmbed Rapid Stream",
        whiteLabelName: "Stream 2 (Rapid)",
        providerId: "animeembed",
        embedUrl,
        audio,
        priority: 8 - getProviderPenalty("animeembed-direct"),
        quality: "auto",
        iframeOptions: {
          allow: "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          referrerPolicy: "strict-origin-when-cross-origin"
        },
        eventSpec: {
          originMatches: ["animeembed.com"],
          readyEvent: "ready",
          playEvent: "play",
          pauseEvent: "pause",
          errorEvent: "error",
          timeEvent: "progress",
          completeEvent: "ended"
        }
      }
    ];
  }
};
var VidWaveAltAdapter = class {
  id = "vidwave-alt";
  name = "VidWave Mirror Stream";
  async getSupportedLanguages(anilistId, animeRecord) {
    const audios = ["sub"];
    if (animeRecord?.format !== "MUSIC") {
      audios.push("dub");
    }
    return audios;
  }
  async checkAvailability(params) {
    if (params.audio === "hindi") return false;
    return params.episode >= 1 && params.anilistId > 0;
  }
  async getSources(params) {
    const { anilistId, malId, episode, audio, time = 0, autoplay = true, autoNext = true } = params;
    if (audio === "hindi") return [];
    const kaiAudio = audio === "dub" ? "dub" : "sub";
    const query = new URLSearchParams();
    if (autoplay) query.set("autoplay", "1");
    if (autoNext) query.set("autonext", "1");
    query.set("skipSec", "85");
    if (time > 0) query.set("t", Math.floor(time).toString());
    const qs = query.toString();
    const sources = [];
    sources.push({
      id: "alt-embed",
      name: "VidWave Alternative Stream (Mirror)",
      whiteLabelName: "Stream 3 (Mirror)",
      providerId: "vidwave-kai",
      embedUrl: `${VIDWAVE_ALT_HOST}/kai/anilist/${anilistId}/${episode}/${kaiAudio}${qs ? `?${qs}` : ""}`,
      audio,
      priority: 6 - getProviderPenalty("alt-embed"),
      quality: "auto",
      iframeOptions: {
        allow: "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        referrerPolicy: "strict-origin-when-cross-origin"
      },
      eventSpec: {
        originMatches: ["vidwave.sbs", "vidwave.site"],
        readyEvent: "ready",
        playEvent: "play",
        pauseEvent: "pause",
        errorEvent: "error",
        timeEvent: "time",
        completeEvent: "complete"
      }
    });
    if (malId && malId > 0) {
      sources.push({
        id: "kai-mal",
        name: "VidWave Direct (MAL)",
        whiteLabelName: "Stream 4 (Direct Mirror)",
        providerId: "vidwave-kai",
        embedUrl: `${VIDWAVE_EMBED_HOST}/kai/mal/${malId}/${episode}/${kaiAudio}${qs ? `?${qs}` : ""}`,
        audio,
        priority: 5 - getProviderPenalty("kai-mal"),
        quality: "auto",
        iframeOptions: {
          allow: "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          referrerPolicy: "strict-origin-when-cross-origin"
        },
        eventSpec: {
          originMatches: ["vidwave.sbs", "vidwave.site"],
          readyEvent: "ready",
          playEvent: "play",
          pauseEvent: "pause",
          errorEvent: "error",
          timeEvent: "time",
          completeEvent: "complete"
        }
      });
    }
    return sources;
  }
};
var VidWaveHindiAdapter = class {
  id = "vidwave-hindi";
  name = "VidWave Hindi Anime";
  async getSupportedLanguages(anilistId, animeRecord) {
    let isHindi = animeRecord?.isHindiDubbed;
    if (isHindi === void 0) {
      try {
        const dbAnime = await prisma.anime.findUnique({
          where: { anilistId },
          select: { isHindiDubbed: true }
        });
        isHindi = Boolean(dbAnime?.isHindiDubbed);
      } catch {
        isHindi = false;
      }
    }
    return isHindi ? ["hindi"] : [];
  }
  async checkAvailability(params) {
    if (params.audio !== "hindi") return false;
    try {
      const dbAnime = await prisma.anime.findUnique({
        where: { anilistId: params.anilistId },
        select: { isHindiDubbed: true }
      });
      return Boolean(dbAnime?.isHindiDubbed);
    } catch {
      return false;
    }
  }
  async getSources(params) {
    const { anilistId, episode, audio, autoplay = true, time = 0 } = params;
    if (audio !== "hindi") return [];
    const query = new URLSearchParams({
      server: "main",
      autoplay: autoplay ? "1" : "0",
      autoSkipIntro: "1",
      skipSec: "85"
    });
    if (time > 0) query.set("time", Math.floor(time).toString());
    return [
      {
        id: "hindi-main",
        name: "VidWave Hindi (Main Server)",
        whiteLabelName: "Stream 1 (Hindi Direct)",
        providerId: "vidwave-hindi",
        embedUrl: `${VIDWAVE_EMBED_HOST}/anime/hindi/${anilistId}/${episode}?${query.toString()}`,
        audio: "hindi",
        isDefault: true,
        priority: 10 - getProviderPenalty("hindi-main"),
        quality: "auto",
        iframeOptions: {
          allow: "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          referrerPolicy: "strict-origin-when-cross-origin"
        },
        eventSpec: {
          originMatches: ["vidwave.sbs", "vidwave.site"],
          readyEvent: "ready",
          playEvent: "play",
          pauseEvent: "pause",
          errorEvent: "error",
          timeEvent: "time",
          completeEvent: "complete"
        }
      },
      {
        id: "hindi-backup",
        name: "VidWave Hindi (Fast Mirror)",
        whiteLabelName: "Stream 2 (Hindi Mirror)",
        providerId: "vidwave-hindi",
        embedUrl: `${VIDWAVE_EMBED_HOST}/anime/hindi/${anilistId}/${episode}?server=main&autoplay=1&autoSkipIntro=1&skipSec=85`,
        audio: "hindi",
        priority: 8 - getProviderPenalty("hindi-backup"),
        quality: "auto",
        iframeOptions: {
          allow: "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          referrerPolicy: "strict-origin-when-cross-origin"
        },
        eventSpec: {
          originMatches: ["vidwave.sbs", "vidwave.site"],
          readyEvent: "ready",
          playEvent: "play",
          pauseEvent: "pause",
          errorEvent: "error",
          timeEvent: "time",
          completeEvent: "complete"
        }
      }
    ];
  }
};
var MegaPlayAdapter = class {
  id = "megaplay";
  name = "MegaPlay Stream";
  async getSupportedLanguages() {
    return ["sub", "dub"];
  }
  async checkAvailability(params) {
    return params.episode >= 1 && params.anilistId > 0;
  }
  async getSources(params) {
    const { anilistId, episode, audio } = params;
    if (audio === "hindi") return [];
    return [
      {
        id: "megaplay-prime",
        name: "MegaPlay Prime",
        whiteLabelName: "Stream 5 (Backup)",
        providerId: "megaplay",
        embedUrl: `https://megaplay.buzz/stream?id=${anilistId}&ep=${episode}&lang=${audio}`,
        audio,
        priority: 2 - getProviderPenalty("megaplay-prime"),
        quality: "auto",
        iframeOptions: {
          allow: "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          referrerPolicy: "strict-origin-when-cross-origin"
        },
        eventSpec: {
          originMatches: ["megaplay.buzz"],
          readyEvent: "ready",
          playEvent: "play",
          pauseEvent: "pause",
          errorEvent: "error",
          timeEvent: "time",
          completeEvent: "ended"
        }
      }
    ];
  }
};
var StreamingEngine = class {
  static adapters = [
    new AniEmbedAdapter(),
    new AnimeEmbedAdapter(),
    new VidWaveAltAdapter(),
    new VidWaveHindiAdapter(),
    new MegaPlayAdapter()
  ];
  // In-memory cache for audio availability & server lookups
  static cache = /* @__PURE__ */ new Map();
  static CACHE_TTL_MS = 5 * 60 * 1e3;
  // 5 minutes
  /**
   * Verify audio language availability for a specific episode
   */
  static async getLanguageAvailability(params) {
    const { animeId, episode } = params;
    const anilistNum = parseInt(animeId, 10);
    const resolvedAnilistId = !isNaN(anilistNum) && anilistNum > 0 ? anilistNum : 16498;
    const cacheKey = `lang_avail_${resolvedAnilistId}_${episode}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    let animeRecord = null;
    try {
      animeRecord = await prisma.anime.findUnique({
        where: { anilistId: resolvedAnilistId },
        select: { isHindiDubbed: true, isEnglishDubbed: true, format: true }
      });
    } catch {
    }
    const confirmedAudios = /* @__PURE__ */ new Set(["sub"]);
    if (animeRecord?.format !== "MUSIC") {
      confirmedAudios.add("dub");
    }
    if (animeRecord?.isHindiDubbed === true) {
      confirmedAudios.add("hindi");
    }
    const availableAudios = Array.from(confirmedAudios);
    const result = {
      animeId,
      anilistId: resolvedAnilistId,
      episode,
      availableAudios,
      languageStatus: {
        sub: "available",
        dub: confirmedAudios.has("dub") ? "available" : "unavailable",
        hindi: confirmedAudios.has("hindi") ? "available" : "unavailable"
      }
    };
    this.cache.set(cacheKey, { data: result, expiry: Date.now() + this.CACHE_TTL_MS });
    return result;
  }
  /**
   * Resolve all working stream sources for anime, episode, and audio
   */
  static async resolveStream(params) {
    const { animeId, episodeNumber, audio, server, time, autoplay, autoNext } = params;
    const anilistNum = parseInt(animeId, 10);
    let resolvedAnilistId = !isNaN(anilistNum) && anilistNum > 0 ? anilistNum : 16498;
    let resolvedMalId = null;
    let animeRecord = null;
    try {
      animeRecord = await prisma.anime.findUnique({
        where: { anilistId: resolvedAnilistId },
        select: { id: true, anilistId: true, malId: true, isHindiDubbed: true, format: true, titleEnglish: true, titleRomaji: true }
      });
      if (animeRecord) {
        resolvedMalId = animeRecord.malId;
      }
    } catch {
    }
    if (!resolvedMalId) {
      try {
        const details = await AniListService.getDetails(resolvedAnilistId);
        if (details?.idMal) {
          resolvedMalId = details.idMal;
        }
      } catch {
      }
    }
    const langInfo = await this.getLanguageAvailability({
      animeId,
      episode: episodeNumber
    });
    if (audio === "hindi" && !langInfo.availableAudios.includes("hindi")) {
      return {
        available: false,
        embedUrl: "",
        provider: "DevilMotion Hindi Stream",
        audio: "hindi",
        availableAudios: langInfo.availableAudios,
        currentServer: "",
        servers: [],
        message: "Hindi Dub is currently unavailable for this episode.",
        iframeOptions: {
          allow: "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          referrerPolicy: "strict-origin-when-cross-origin"
        },
        metadata: {
          anilistId: resolvedAnilistId,
          malId: resolvedMalId,
          episodeNumber,
          title: animeRecord?.titleEnglish || animeRecord?.titleRomaji || "Anime"
        }
      };
    }
    const activeAudio = audio;
    const allSourcePromises = this.adapters.map(
      (adapter) => adapter.getSources({
        anilistId: resolvedAnilistId,
        malId: resolvedMalId,
        episode: episodeNumber,
        audio: activeAudio,
        time,
        autoplay,
        autoNext
      }).catch(() => [])
    );
    const sourceArrays = await Promise.all(allSourcePromises);
    const flattenedSources = sourceArrays.flat();
    flattenedSources.sort((a, b) => b.priority - a.priority);
    if (flattenedSources.length === 0) {
      return {
        available: false,
        embedUrl: "",
        provider: "DevilMotion Stream",
        audio: activeAudio,
        availableAudios: langInfo.availableAudios,
        currentServer: "",
        servers: [],
        message: activeAudio === "hindi" ? "Hindi Dub is currently unavailable for this episode." : "No working stream is currently available for this episode.",
        iframeOptions: {
          allow: "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          referrerPolicy: "strict-origin-when-cross-origin"
        },
        metadata: {
          anilistId: resolvedAnilistId,
          malId: resolvedMalId,
          episodeNumber,
          title: animeRecord?.titleEnglish || animeRecord?.titleRomaji || "Anime"
        }
      };
    }
    let selected = flattenedSources.find((s) => s.id === server);
    if (!selected) {
      selected = flattenedSources[0];
    }
    return {
      available: true,
      embedUrl: selected.embedUrl,
      provider: selected.whiteLabelName,
      audio: activeAudio,
      availableAudios: langInfo.availableAudios,
      currentServer: selected.id,
      servers: flattenedSources,
      iframeOptions: selected.iframeOptions,
      metadata: {
        anilistId: resolvedAnilistId,
        malId: resolvedMalId,
        episodeNumber,
        title: animeRecord?.titleEnglish || animeRecord?.titleRomaji || "Anime"
      }
    };
  }
};

// server/routes/streamRoutes.ts
var streamRouter = Router3();
var VALID_AUDIOS = ["sub", "dub", "hindi"];
streamRouter.get("/:animeId/availability", cacheResponse(300), async (req, res) => {
  try {
    const rawId = sanitizeString(req.params.animeId, 100);
    const episode = sanitizeNumber(req.query.ep, 1, 5e3, 1);
    const result = await StreamingEngine.getLanguageAvailability({
      animeId: rawId,
      episode
    });
    return res.json({
      animeId: rawId,
      anilistId: result.anilistId,
      episode,
      availableAudios: result.availableAudios,
      languageStatus: result.languageStatus,
      hasHindi: result.availableAudios.includes("hindi"),
      hasDub: result.availableAudios.includes("dub"),
      hasSub: result.availableAudios.includes("sub")
    });
  } catch (error) {
    console.error("[Stream API] Availability check error:", error.message);
    return res.status(500).json({ error: "Failed to verify audio availability" });
  }
});
streamRouter.get("/:animeId/:episodeNumber", async (req, res) => {
  try {
    const animeId = sanitizeString(req.params.animeId, 100);
    const epNum = sanitizeNumber(req.params.episodeNumber, 1, 5e3, 1);
    if (!animeId) {
      return res.status(400).json({ error: "Valid anime identifier is required" });
    }
    const requestedAudio = req.query.audio || req.query.lang || "sub";
    const audioParam = VALID_AUDIOS.includes(requestedAudio) ? requestedAudio : "sub";
    const rawServer = req.query.server ? sanitizeString(req.query.server, 50) : void 0;
    const server = rawServer && /^[a-zA-Z0-9\-_]+$/.test(rawServer) ? rawServer : void 0;
    const rawTime = req.query.time ? parseFloat(String(req.query.time)) : void 0;
    const time = rawTime && !isNaN(rawTime) && rawTime >= 0 && rawTime < 1e5 ? rawTime : void 0;
    const autoplay = req.query.autoplay !== "false";
    const autoNext = req.query.autonext !== "false";
    const streamResult = await StreamingEngine.resolveStream({
      animeId,
      episodeNumber: epNum,
      audio: audioParam,
      server,
      time,
      autoplay,
      autoNext
    });
    return res.json({
      stream: streamResult,
      servers: streamResult.servers,
      iframeOptions: streamResult.iframeOptions
    });
  } catch (error) {
    console.error("[Stream API] Stream resolution error:", error.message);
    return res.status(500).json({ error: "Playback source is temporarily unavailable" });
  }
});
streamRouter.post("/report-failure", (req, res) => {
  const { serverId } = req.body || {};
  if (serverId && typeof serverId === "string") {
    reportProviderFailure(sanitizeString(serverId, 50));
  }
  return res.json({ status: "recorded" });
});

// server/routes/userRoutes.ts
import { Router as Router4 } from "express";
var userRouter = Router4();
userRouter.use(authenticateUser);
userRouter.get("/watchlist", async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await prisma.watchlist.findMany({
      where: { userId },
      include: { anime: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ watchlist: items.map((w) => w.anime) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
userRouter.post("/watchlist", async (req, res) => {
  try {
    const userId = req.user.id;
    const { animeId } = req.body;
    if (!animeId) {
      return res.status(400).json({ error: "animeId is required" });
    }
    const anilistNum = parseInt(animeId, 10);
    const anime = await prisma.anime.findFirst({
      where: isNaN(anilistNum) ? { id: animeId } : { OR: [{ id: animeId }, { anilistId: anilistNum }] }
    });
    if (!anime) {
      return res.status(404).json({ error: "Anime not found in registry" });
    }
    const item = await prisma.watchlist.upsert({
      where: {
        userId_animeId: {
          userId,
          animeId: anime.id
        }
      },
      update: {},
      create: {
        userId,
        animeId: anime.id
      },
      include: { anime: true }
    });
    return res.status(201).json({ item });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
userRouter.delete("/watchlist/:animeId", async (req, res) => {
  try {
    const userId = req.user.id;
    const { animeId } = req.params;
    const anilistNum = parseInt(animeId, 10);
    const anime = await prisma.anime.findFirst({
      where: isNaN(anilistNum) ? { id: animeId } : { OR: [{ id: animeId }, { anilistId: anilistNum }] }
    });
    if (anime) {
      await prisma.watchlist.deleteMany({
        where: {
          userId,
          animeId: anime.id
        }
      });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
userRouter.get("/history", async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await prisma.watchHistory.findMany({
      where: { userId },
      include: { anime: true, episode: true },
      orderBy: { updatedAt: "desc" },
      take: 30
    });
    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
userRouter.post("/history", async (req, res) => {
  try {
    const userId = req.user.id;
    const { animeId, episodeNumber, progressSeconds, durationSeconds, completed } = req.body;
    const anilistNum = parseInt(animeId, 10);
    const anime = await prisma.anime.findFirst({
      where: isNaN(anilistNum) ? { id: animeId } : { OR: [{ id: animeId }, { anilistId: anilistNum }] },
      include: { episodes: true }
    });
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }
    const episode = anime.episodes.find((e) => e.episodeNumber === episodeNumber);
    const historyRecord = await prisma.watchHistory.upsert({
      where: {
        userId_animeId_episodeId: {
          userId,
          animeId: anime.id,
          episodeId: episode ? episode.id : "ep-default"
        }
      },
      update: {
        episodeNumber,
        progressSeconds: progressSeconds || 0,
        durationSeconds: durationSeconds || 0,
        completed: Boolean(completed),
        updatedAt: /* @__PURE__ */ new Date()
      },
      create: {
        userId,
        animeId: anime.id,
        episodeId: episode ? episode.id : "ep-default",
        episodeNumber,
        progressSeconds: progressSeconds || 0,
        durationSeconds: durationSeconds || 0,
        completed: Boolean(completed)
      }
    });
    return res.json({ history: historyRecord });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// server/routes/adminRoutes.ts
import { Router as Router5 } from "express";

// server/services/anikotoService.ts
import axios5 from "axios";
var ANIKOTO_API_BASE_URL = process.env.ANIKOTO_API_BASE_URL || "https://anikotoapi.site";
var AnikotoService = class {
  /**
   * Fetch Recently updated anime from Anikoto
   */
  static async getRecentAnime(page = 1, perPage = 20) {
    try {
      const response = await axios5.get(`${ANIKOTO_API_BASE_URL}/recent-anime`, {
        params: { page, per_page: perPage },
        timeout: 6e3
      });
      return response.data?.data || response.data?.items || response.data || [];
    } catch (error) {
      console.warn("Anikoto recent anime discovery unavailable or timed out:", error.message);
      return [];
    }
  }
  /**
   * Fetch series details & episode list from Anikoto
   */
  static async getSeriesDetails(seriesId) {
    try {
      const response = await axios5.get(`${ANIKOTO_API_BASE_URL}/series/${seriesId}`, {
        timeout: 6e3
      });
      return response.data?.data || response.data || null;
    } catch (error) {
      console.warn(`Anikoto series lookup for ID ${seriesId} failed:`, error.message);
      return null;
    }
  }
  /**
   * Match recent Anikoto anime and synchronize episode mappings
   */
  static async syncEpisodes() {
    let processed = 0;
    let mapped = 0;
    try {
      const recentList = await this.getRecentAnime(1, 15);
      if (!Array.isArray(recentList) || recentList.length === 0) {
        return { processed: 0, mapped: 0 };
      }
      let provider = await prisma.streamingProvider.findFirst({
        where: { providerName: "Anikoto" }
      });
      if (!provider) {
        provider = await prisma.streamingProvider.create({
          data: {
            providerName: "Anikoto",
            providerBaseUrl: ANIKOTO_API_BASE_URL,
            enabled: true
          }
        });
      }
      for (const item of recentList) {
        processed++;
        const title = item.title;
        if (!title) continue;
        const anime = await prisma.anime.findFirst({
          where: {
            OR: [
              { titleEnglish: { contains: title } },
              { titleRomaji: { contains: title } }
            ]
          }
        });
        if (!anime) continue;
        await prisma.providerAnimeMapping.upsert({
          where: {
            animeId_providerId: {
              animeId: anime.id,
              providerId: provider.id
            }
          },
          update: {
            providerAnimeId: String(item.id),
            mappingStatus: "VERIFIED",
            lastCheckedAt: /* @__PURE__ */ new Date()
          },
          create: {
            animeId: anime.id,
            providerId: provider.id,
            providerAnimeId: String(item.id),
            mappingStatus: "VERIFIED"
          }
        });
        const seriesDetails = await this.getSeriesDetails(item.id);
        if (seriesDetails && Array.isArray(seriesDetails.episodes)) {
          for (const ep of seriesDetails.episodes) {
            if (!ep.episode_number) continue;
            const episode = await prisma.episode.upsert({
              where: {
                animeId_episodeNumber: {
                  animeId: anime.id,
                  episodeNumber: ep.episode_number
                }
              },
              update: {
                episodeTitle: ep.title || void 0
              },
              create: {
                animeId: anime.id,
                episodeNumber: ep.episode_number,
                episodeTitle: ep.title || `Episode ${ep.episode_number}`,
                thumbnail: anime.bannerImage || anime.coverImage,
                metadataStatus: "AVAILABLE"
              }
            });
            if (ep.episode_embed_id || ep.sub_embed_url) {
              await prisma.episodeStream.upsert({
                where: {
                  episodeId_providerId_language: {
                    episodeId: episode.id,
                    providerId: provider.id,
                    language: "sub"
                  }
                },
                update: {
                  providerEpisodeId: ep.episode_embed_id || null,
                  embedUrl: ep.sub_embed_url || `https://megaplay.buzz/stream/s-2/${ep.episode_embed_id}/sub`,
                  availabilityStatus: "AVAILABLE",
                  lastCheckedAt: /* @__PURE__ */ new Date()
                },
                create: {
                  episodeId: episode.id,
                  providerId: provider.id,
                  providerEpisodeId: ep.episode_embed_id || null,
                  language: "sub",
                  embedUrl: ep.sub_embed_url || `https://megaplay.buzz/stream/s-2/${ep.episode_embed_id}/sub`,
                  availabilityStatus: "AVAILABLE"
                }
              });
              mapped++;
            }
          }
        }
      }
    } catch (err) {
      console.error("Anikoto sync error:", err.message);
    }
    return { processed, mapped };
  }
};

// server/services/syncEngine.ts
var SyncEngine = class {
  static recentIntervalTimer = null;
  static metadataIntervalTimer = null;
  static jikanIntervalTimer = null;
  /**
   * Run initial sync on server startup
   */
  static async start() {
    console.log("[SyncEngine] Initializing background synchronization workers...");
    this.runAniListSync("INITIAL_STARTUP").then(() => {
      this.runJikanEnrichmentSync("INITIAL_STARTUP").catch(
        (e) => console.warn("[SyncEngine] Initial Jikan enrichment warning:", e.message)
      );
    }).catch(
      (err) => console.warn("[SyncEngine] Initial AniList sync warning:", err.message)
    );
    this.runAnikotoSync("INITIAL_STARTUP").catch(
      (err) => console.warn("[SyncEngine] Initial Anikoto sync warning:", err.message)
    );
    this.runScheduleSync("INITIAL_STARTUP").catch(
      (err) => console.warn("[SyncEngine] Initial Schedule sync warning:", err.message)
    );
    const metadataMinutes = parseInt(process.env.SYNC_INTERVAL_METADATA || "360", 10);
    this.metadataIntervalTimer = setInterval(() => {
      this.runAniListSync("SCHEDULED_INTERVAL");
      this.runScheduleSync("SCHEDULED_INTERVAL");
    }, metadataMinutes * 60 * 1e3);
    const recentMinutes = parseInt(process.env.SYNC_INTERVAL_RECENT || "15", 10);
    this.recentIntervalTimer = setInterval(() => {
      this.runAnikotoSync("SCHEDULED_INTERVAL");
    }, recentMinutes * 60 * 1e3);
    this.jikanIntervalTimer = setInterval(() => {
      this.runJikanEnrichmentSync("SCHEDULED_INTERVAL");
    }, 60 * 60 * 1e3);
    console.log(
      `[SyncEngine] Workers active: AniList every ${metadataMinutes}m, Anikoto every ${recentMinutes}m, Jikan every 60m`
    );
  }
  /**
   * Stop workers cleanly
   */
  static stop() {
    if (this.metadataIntervalTimer) clearInterval(this.metadataIntervalTimer);
    if (this.recentIntervalTimer) clearInterval(this.recentIntervalTimer);
    if (this.jikanIntervalTimer) clearInterval(this.jikanIntervalTimer);
  }
  /**
   * Synchronize AniList metadata
   */
  static async runAniListSync(triggerType) {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: "ANILIST_METADATA",
        status: "RUNNING",
        startedAt: /* @__PURE__ */ new Date()
      }
    });
    try {
      console.log(`[SyncEngine] Running AniList metadata sync (${triggerType})...`);
      const trending = await AniListService.getTrending(1, 15);
      await new Promise((r) => setTimeout(r, 400));
      const popular = await AniListService.getPopular(1, 15);
      await new Promise((r) => setTimeout(r, 400));
      const topRated = await AniListService.getTopRated(1, 15);
      await new Promise((r) => setTimeout(r, 400));
      const airing = await AniListService.getCurrentlyAiring(1, 15);
      const totalItems = trending.length + popular.length + topRated.length + airing.length;
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          itemsProcessed: totalItems,
          itemsAdded: totalItems,
          completedAt: /* @__PURE__ */ new Date()
        }
      });
      console.log(`[SyncEngine] AniList metadata sync completed: ${totalItems} media processed.`);
      return { status: "SUCCESS", itemsProcessed: totalItems };
    } catch (error) {
      console.error("[SyncEngine] AniList sync failed:", error.message);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          errorMessage: error.message,
          completedAt: /* @__PURE__ */ new Date()
        }
      });
      throw error;
    }
  }
  /**
   * Synchronize Jikan enrichment (characters, voice actors, filler flags)
   */
  static async runJikanEnrichmentSync(triggerType) {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: "JIKAN_ENRICHMENT",
        status: "RUNNING",
        startedAt: /* @__PURE__ */ new Date()
      }
    });
    try {
      console.log(`[SyncEngine] Running Jikan enrichment sync (${triggerType})...`);
      const candidateAnime = await prisma.anime.findMany({
        where: {
          malId: { not: null },
          characters: { none: {} }
        },
        take: 10,
        orderBy: { popularity: "desc" }
      });
      let enrichedCount = 0;
      for (const anime of candidateAnime) {
        try {
          await AnimeAggregationService.enrichDbAnimeWithJikan(anime.id);
          enrichedCount++;
        } catch (err) {
          console.warn(`[SyncEngine] Jikan enrichment failed for ${anime.titleEnglish}: ${err.message}`);
        }
      }
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          itemsProcessed: candidateAnime.length,
          itemsUpdated: enrichedCount,
          completedAt: /* @__PURE__ */ new Date()
        }
      });
      console.log(`[SyncEngine] Jikan enrichment sync completed: ${enrichedCount} anime enriched.`);
      return { status: "SUCCESS", candidateCount: candidateAnime.length, enrichedCount };
    } catch (error) {
      console.error("[SyncEngine] Jikan enrichment failed:", error.message);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          errorMessage: error.message,
          completedAt: /* @__PURE__ */ new Date()
        }
      });
      throw error;
    }
  }
  /**
   * Synchronize Airing Schedules
   */
  static async runScheduleSync(triggerType) {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: "SCHEDULE_SYNC",
        status: "RUNNING",
        startedAt: /* @__PURE__ */ new Date()
      }
    });
    try {
      console.log(`[SyncEngine] Running Schedule sync (${triggerType})...`);
      const now = Math.floor(Date.now() / 1e3);
      const startOfWeek = now - 86400 * 2;
      const endOfWeek = now + 86400 * 5;
      const schedules = await AniListService.getWeeklySchedule(startOfWeek, endOfWeek);
      let savedCount = 0;
      for (const item of schedules) {
        if (!item.media?.id) continue;
        const anime = await prisma.anime.findUnique({
          where: { anilistId: item.media.id }
        });
        if (anime) {
          await prisma.airingSchedule.upsert({
            where: {
              animeId_episodeNumber: {
                animeId: anime.id,
                episodeNumber: item.episode
              }
            },
            update: {
              airingAt: new Date(item.airingAt * 1e3),
              timeUntilAiring: item.timeUntilAiring,
              lastCheckedAt: /* @__PURE__ */ new Date()
            },
            create: {
              animeId: anime.id,
              episodeNumber: item.episode,
              airingAt: new Date(item.airingAt * 1e3),
              timeUntilAiring: item.timeUntilAiring,
              source: "ANILIST"
            }
          });
          savedCount++;
        }
      }
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          itemsProcessed: schedules.length,
          itemsAdded: savedCount,
          completedAt: /* @__PURE__ */ new Date()
        }
      });
      console.log(`[SyncEngine] Schedule sync completed: ${savedCount} schedules saved.`);
      return { status: "SUCCESS", schedulesCount: schedules.length, savedCount };
    } catch (error) {
      console.error("[SyncEngine] Schedule sync failed:", error.message);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          errorMessage: error.message,
          completedAt: /* @__PURE__ */ new Date()
        }
      });
      throw error;
    }
  }
  /**
   * Synchronize Anikoto episode mappings
   */
  static async runAnikotoSync(triggerType) {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: "ANIKOTO_EPISODES",
        status: "RUNNING",
        startedAt: /* @__PURE__ */ new Date()
      }
    });
    try {
      console.log(`[SyncEngine] Running Anikoto episode sync (${triggerType})...`);
      const { processed, mapped } = await AnikotoService.syncEpisodes();
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          itemsProcessed: processed,
          itemsAdded: mapped,
          completedAt: /* @__PURE__ */ new Date()
        }
      });
      console.log(`[SyncEngine] Anikoto sync completed: ${processed} processed, ${mapped} mapped.`);
      return { status: "SUCCESS", processed, mapped };
    } catch (error) {
      console.error("[SyncEngine] Anikoto sync failed:", error.message);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          errorMessage: error.message,
          completedAt: /* @__PURE__ */ new Date()
        }
      });
      throw error;
    }
  }
};

// server/routes/adminRoutes.ts
var adminRouter = Router5();
adminRouter.use(authenticateUser);
adminRouter.use(requireAdmin);
adminRouter.get("/stats", async (req, res) => {
  try {
    const [
      totalAnime,
      totalEpisodes,
      totalStreams,
      totalUsers,
      recentSyncLogs,
      providers
    ] = await Promise.all([
      prisma.anime.count(),
      prisma.episode.count(),
      prisma.episodeStream.count(),
      prisma.user.count(),
      prisma.syncLog.findMany({
        take: 10,
        orderBy: { startedAt: "desc" }
      }),
      prisma.streamingProvider.findMany({
        include: {
          _count: {
            select: { episodeStreams: true, animeMappings: true }
          }
        }
      })
    ]);
    return res.json({
      stats: {
        totalAnime,
        totalEpisodes,
        totalStreams,
        totalUsers
      },
      providers,
      recentSyncLogs
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
adminRouter.post("/sync/anilist", async (req, res) => {
  try {
    const result = await SyncEngine.runAniListSync("ADMIN_MANUAL_TRIGGER");
    invalidateCache();
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
adminRouter.post("/sync/anikoto", async (req, res) => {
  try {
    const result = await SyncEngine.runAnikotoSync("ADMIN_MANUAL_TRIGGER");
    invalidateCache();
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
adminRouter.post("/sync/jikan", async (req, res) => {
  try {
    const result = await SyncEngine.runJikanEnrichmentSync("ADMIN_MANUAL_TRIGGER");
    invalidateCache();
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
adminRouter.post("/sync/schedule", async (req, res) => {
  try {
    const result = await SyncEngine.runScheduleSync("ADMIN_MANUAL_TRIGGER");
    invalidateCache();
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
adminRouter.get("/sync-logs", async (req, res) => {
  try {
    const logs = await prisma.syncLog.findMany({
      take: 50,
      orderBy: { startedAt: "desc" }
    });
    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
adminRouter.get("/mappings", async (req, res) => {
  try {
    const anime = await prisma.anime.findMany({
      take: 30,
      orderBy: { updatedAt: "desc" },
      include: {
        episodes: {
          take: 5,
          include: {
            episodeStreams: true
          }
        },
        providerMappings: {
          include: { provider: true }
        }
      }
    });
    const statusReport = anime.map((a) => {
      const totalEp = a.episodes.length;
      const mappedStreams = a.episodes.flatMap((e) => e.episodeStreams).length;
      let mappingStatus = "METADATA_ONLY";
      if (mappedStreams > 0) mappingStatus = "AVAILABLE";
      else if (a.providerMappings.length > 0) mappingStatus = "WAITING_FOR_EPISODES";
      return {
        id: a.id,
        anilistId: a.anilistId,
        title: a.titleEnglish,
        format: a.format,
        totalEpisodes: a.totalEpisodes,
        cachedEpisodes: totalEp,
        mappedStreams,
        status: mappingStatus,
        lastUpdated: a.updatedAt
      };
    });
    return res.json({ mappings: statusReport });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
adminRouter.patch("/providers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const updated = await prisma.streamingProvider.update({
      where: { id },
      data: { enabled: Boolean(enabled) }
    });
    return res.json({ provider: updated });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// server/app.ts
dotenv.config();
var app = express();
app.use((req, res, next) => {
  const xMatched = req.headers["x-matched-path"] || req.headers["x-invoke-path"];
  const original = req.originalUrl;
  if (xMatched && xMatched.startsWith("/api")) {
    const qIdx = req.url.indexOf("?");
    const qs = qIdx !== -1 ? req.url.slice(qIdx) : "";
    req.url = xMatched + qs;
  } else if (original && original.startsWith("/api") && !req.url.startsWith("/api")) {
    req.url = original;
  } else if (req.query && (req.query.path || req.query.match)) {
    const match = req.query.path || req.query.match;
    const segments = Array.isArray(match) ? match.join("/") : match;
    if (segments && !req.url.includes(segments)) {
      const qIdx = req.url.indexOf("?");
      const qs = qIdx !== -1 ? req.url.slice(qIdx) : "";
      req.url = `/api/${segments}` + qs;
    }
  }
  next();
});
app.use(securityHeaders);
var allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : void 0,
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : void 0
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(globalRateLimiter);
var mountApiRoutes = (prefix) => {
  const rootPaths = prefix ? [prefix, `${prefix}/`] : ["/"];
  app.get(rootPaths, (req, res) => {
    res.json({
      status: "online",
      service: "DevilMotion API",
      version: "1.0.0",
      healthy: true,
      environment: process.env.VERCEL ? "vercel-serverless" : "node-server"
    });
  });
  app.get(`${prefix}/health`, (req, res) => {
    res.json({
      status: "online",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      service: "DevilMotion Streaming Platform API",
      version: "1.0.0",
      healthy: true,
      environment: process.env.VERCEL ? "vercel-serverless" : "node-server"
    });
  });
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/anime`, animeRouter);
  app.use(`${prefix}/stream`, streamRouter);
  app.use(`${prefix}/user`, userRouter);
  app.use(`${prefix}/admin`, adminRouter);
};
mountApiRoutes("/api");
mountApiRoutes("");
app.use(safeErrorHandler);
var seedInitialized = false;
async function ensureSeed() {
  if (seedInitialized) return;
  try {
    await prisma.streamingProvider.upsert({
      where: { providerName: "VidWave" },
      update: {},
      create: {
        providerName: "VidWave",
        providerBaseUrl: process.env.VIDWAVE_EMBED_HOST || "https://embed.vidwave.sbs",
        enabled: true
      }
    });
    await prisma.streamingProvider.upsert({
      where: { providerName: "MegaPlay" },
      update: {},
      create: {
        providerName: "MegaPlay",
        providerBaseUrl: process.env.MEGAPLAY_BASE_URL || "https://megaplay.buzz",
        enabled: true
      }
    });
    await prisma.streamingProvider.upsert({
      where: { providerName: "Anikoto" },
      update: {},
      create: {
        providerName: "Anikoto",
        providerBaseUrl: process.env.ANIKOTO_API_BASE_URL || "https://anikotoapi.site",
        enabled: true
      }
    });
    const adminExists = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminExists) {
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "DevilMotionAdmin2026!";
      const hash = await bcrypt2.hash(defaultPassword, 12);
      await prisma.user.create({
        data: {
          name: "DevilMotion Administrator",
          email: "admin@devilmotion.com",
          passwordHash: hash,
          role: "ADMIN"
        }
      });
      console.log("[Security] Initial administrator account provisioned: admin@devilmotion.com");
    }
    seedInitialized = true;
  } catch (err) {
    console.warn("[Seed] Seed notice:", err.message);
  }
}

// server/apiEntry.ts
if (!process.env.VERCEL) {
  ensureSeed().catch(() => {
  });
}
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
