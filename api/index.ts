let appPromise: Promise<any> | null = null;
let initError: any = null;

async function getApp() {
  if (initError) throw initError;
  if (!appPromise) {
    appPromise = import('../server/app')
      .then((m) => {
        if (!process.env.VERCEL && typeof m.ensureSeed === 'function') {
          m.ensureSeed().catch(() => {});
        }
        return m.app;
      })
      .catch((err) => {
        initError = err;
        throw err;
      });
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Boot Error]:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'BOOTSTRAP_FAILURE',
      message: err?.message || String(err),
      stack: err?.stack,
      name: err?.name,
    });
  }
}
