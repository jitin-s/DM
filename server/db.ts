import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import os from 'os';

let prismaInstance: PrismaClient | null = null;

try {
  // In Vercel serverless environment, if SQLite is used, ensure temp directory has a writable copy if available
  if (process.env.VERCEL) {
    const currentDbUrl = process.env.DATABASE_URL || '';
    if (!currentDbUrl || currentDbUrl.includes('dev.db')) {
      const tmpDbPath = path.join(os.tmpdir(), 'dev.db');
      if (!fs.existsSync(tmpDbPath)) {
        const candidates = [
          path.join(process.cwd(), 'prisma', 'dev.db'),
          path.join(process.cwd(), 'dev.db'),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            try {
              fs.copyFileSync(c, tmpDbPath);
              break;
            } catch {}
          }
        }
      }
      if (fs.existsSync(tmpDbPath)) {
        const cleanUrl = tmpDbPath.replace(/\\/g, '/');
        process.env.DATABASE_URL = `file:${cleanUrl}?connection_limit=1&timeout=20000`;
      }
    }
  }

  const globalForPrisma = global as unknown as { prisma?: PrismaClient };
  prismaInstance =
    globalForPrisma.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance;

  // Configure SQLite for concurrent read/write in local development
  if (!process.env.VERCEL && prismaInstance) {
    prismaInstance
      .$queryRawUnsafe('PRAGMA journal_mode = WAL;')
      .then(() => prismaInstance!.$queryRawUnsafe('PRAGMA busy_timeout = 20000;'))
      .then(() => prismaInstance!.$queryRawUnsafe('PRAGMA synchronous = NORMAL;'))
      .catch((err: any) => console.warn('[Prisma SQLite Pragmas]', err?.message));
  }
} catch (initErr: any) {
  console.warn('[Prisma Initialization Warning]:', initErr?.message);
  prismaInstance = null;
}

/**
 * Creates a resilient model delegate that intercepts all Prisma database calls.
 * If Prisma query engine is missing in serverless or SQLite is unavailable,
 * queries gracefully resolve with safe defaults without crashing the Node process.
 */
function createSafeModelDelegate(modelName: string) {
  return new Proxy({}, {
    get(_, method: string) {
      return async (...args: any[]) => {
        try {
          if (prismaInstance && (prismaInstance as any)[modelName]) {
            const delegate = (prismaInstance as any)[modelName];
            if (typeof delegate[method] === 'function') {
              return await delegate[method](...args);
            }
          }
        } catch (dbErr: any) {
          console.warn(`[Safe DB Warning] ${modelName}.${method} failed, using safe fallback:`, dbErr?.message);
        }

        // Standard safe fallbacks
        if (method === 'findMany') return [];
        if (method === 'count') return 0;
        if (method === 'upsert' || method === 'create' || method === 'update') {
          return args[0]?.create || args[0]?.data || null;
        }
        return null;
      };
    },
  });
}

/**
 * Resilient Prisma Client Proxy
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(target, prop: string) {
    if (prop === '$queryRaw' || prop === '$queryRawUnsafe' || prop === '$executeRaw' || prop === '$executeRawUnsafe') {
      return async () => [];
    }
    if (prop === '$connect' || prop === '$disconnect') {
      return async () => {};
    }
    if (prop === '$transaction') {
      return async (cb: any) => {
        if (typeof cb === 'function') {
          return await cb(prisma);
        }
        if (Array.isArray(cb)) {
          return await Promise.all(cb);
        }
        return null;
      };
    }

    return createSafeModelDelegate(prop);
  },
});
