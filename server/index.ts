import { app, ensureSeed } from './app';
import { SyncEngine } from './services/syncEngine';

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`🚀 DevilMotion API Server active on http://127.0.0.1:${PORT}`);
  await ensureSeed();
  // Start background sync engine in persistent server mode
  SyncEngine.start().catch(err => console.error('[SyncEngine] Startup error:', err));
});
