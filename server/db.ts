import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// In Vercel serverless environment, if SQLite is used, ensure /tmp has a writable copy
if (process.env.VERCEL) {
  const currentDbUrl = process.env.DATABASE_URL || '';
  if (!currentDbUrl || currentDbUrl.includes('dev.db')) {
    const tmpDbPath = '/tmp/dev.db';
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
    process.env.DATABASE_URL = `file:${tmpDbPath}?connection_limit=1&timeout=20000`;
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Configure SQLite for concurrent read/write (WAL mode + 20s busy timeout in local dev)
if (!process.env.VERCEL) {
  prisma
    .$queryRawUnsafe('PRAGMA journal_mode = WAL;')
    .then(() => prisma.$queryRawUnsafe('PRAGMA busy_timeout = 20000;'))
    .then(() => prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;'))
    .catch(err => console.warn('[Prisma SQLite Pragmas]', err?.message));
}
