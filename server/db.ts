import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import os from 'os';

let prismaInstance: PrismaClient | null = null;

try {
  // In Vercel serverless environment, if SQLite is used, ensure temp directory has a writable copy
  if (process.env.VERCEL) {
    const currentDbUrl = process.env.DATABASE_URL || '';
    if (!currentDbUrl || currentDbUrl.includes('dev.db')) {
      const tmpDbPath = path.join(os.tmpdir(), 'dev.db');
      if (!fs.existsSync(tmpDbPath)) {
        const candidates = [
          path.join(process.cwd(), 'prisma', 'dev.db'),
          path.join(process.cwd(), 'dev.db'),
        ];
        let copied = false;
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            try {
              fs.copyFileSync(c, tmpDbPath);
              copied = true;
              break;
            } catch {}
          }
        }
        if (!copied) {
          try {
            fs.writeFileSync(tmpDbPath, '');
          } catch {}
        }
      }
      const cleanUrl = tmpDbPath.replace(/\\/g, '/');
      process.env.DATABASE_URL = `file:${cleanUrl}?connection_limit=1&timeout=20000`;
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
      .catch(err => console.warn('[Prisma SQLite Pragmas]', err?.message));
  }
} catch (initErr: any) {
  console.warn('[Prisma Initialization Warning]:', initErr.message);
}

// Resilient Proxy: if Prisma query engine binary fails in serverless,
// gracefully handle DB calls without crashing the entire serverless process
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    if (prismaInstance && prop in prismaInstance) {
      const val = (prismaInstance as any)[prop];
      if (typeof val === 'function') {
        return val.bind(prismaInstance);
      }
      return val;
    }
    // Safe fallback delegate if Prisma is unavailable or during cold boot
    return new Proxy({}, {
      get(dTarget, dProp) {
        return async () => {
          if (dProp === 'findMany') return [];
          if (dProp === 'count') return 0;
          return null;
        };
      },
    });
  },
});
