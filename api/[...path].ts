import { app, ensureSeed } from '../server/app';

// Ensure database seed is initialized lazily on cold start
ensureSeed().catch(() => {});

export default app;
