import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { authRouter } from './routes/authRoutes';
import { animeRouter } from './routes/animeRoutes';
import { streamRouter } from './routes/streamRoutes';
import { userRouter } from './routes/userRoutes';
import { adminRouter } from './routes/adminRoutes';
import {
  securityHeaders,
  globalRateLimiter,
  safeErrorHandler,
} from './middleware/security';

dotenv.config();

export const app = express();

// 1. Security Headers (CSP, Anti-Clickjacking, No-Sniff, Referrer Policy)
app.use(securityHeaders);

// 2. Strict CORS Configuration (Supports local dev, custom domain, and Vercel domains)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by DevilMotion CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Request Size Limiting (Protection against payload DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Global Sliding Window Rate Limiter
app.use(globalRateLimiter);

// 5. Mount Routes (mounted at both '/api' and '' so Vercel rewrites work seamlessly)
const mountApiRoutes = (prefix: string) => {
  // Hardened Health Check
  app.get(`${prefix}/health`, (req, res) => {
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      service: 'DevilMotion Streaming Platform API',
      version: '1.0.0',
      healthy: true,
      environment: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
    });
  });

  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/anime`, animeRouter);
  app.use(`${prefix}/stream`, streamRouter);
  app.use(`${prefix}/user`, userRouter);
  app.use(`${prefix}/admin`, adminRouter);
};

// Mount at /api for standard routing
mountApiRoutes('/api');

// Mount at root for cases where Vercel function rewrite strips /api
mountApiRoutes('');

// 6. Global Safe Error Handler (Never leak stack traces or internals)
app.use(safeErrorHandler);

// Default seed provisioning
let seedInitialized = false;
export async function ensureSeed() {
  if (seedInitialized) return;
  try {
    // 1. Seed Streaming Providers
    await prisma.streamingProvider.upsert({
      where: { providerName: 'VidWave' },
      update: {},
      create: {
        providerName: 'VidWave',
        providerBaseUrl: process.env.VIDWAVE_EMBED_HOST || 'https://embed.vidwave.sbs',
        enabled: true,
      },
    });

    await prisma.streamingProvider.upsert({
      where: { providerName: 'MegaPlay' },
      update: {},
      create: {
        providerName: 'MegaPlay',
        providerBaseUrl: process.env.MEGAPLAY_BASE_URL || 'https://megaplay.buzz',
        enabled: true,
      },
    });

    await prisma.streamingProvider.upsert({
      where: { providerName: 'Anikoto' },
      update: {},
      create: {
        providerName: 'Anikoto',
        providerBaseUrl: process.env.ANIKOTO_API_BASE_URL || 'https://anikotoapi.site',
        enabled: true,
      },
    });

    // 2. Provision Default Administrator Account securely
    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminExists) {
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'DevilMotionAdmin2026!';
      const hash = await bcrypt.hash(defaultPassword, 12);
      await prisma.user.create({
        data: {
          name: 'DevilMotion Administrator',
          email: 'admin@devilmotion.com',
          passwordHash: hash,
          role: 'ADMIN',
        },
      });
      console.log('[Security] Initial administrator account provisioned: admin@devilmotion.com');
    }
    seedInitialized = true;
  } catch (err: any) {
    console.warn('[Seed] Seed notice:', err.message);
  }
}
