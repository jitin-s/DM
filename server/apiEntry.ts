import { app, ensureSeed } from './app';

if (!process.env.VERCEL) {
  ensureSeed().catch(() => {});
}

export default function handler(req: any, res: any) {
  return app(req, res);
}
