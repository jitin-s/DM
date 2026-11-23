import { app, ensureSeed } from '../server/app';

// In non-serverless or local dev, ensure seed runs
if (!process.env.VERCEL) {
  ensureSeed().catch(() => {});
}

export default function handler(req: any, res: any) {
  return app(req, res);
}
