import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { migrate, addConstraints } from './db/index.js';
import auditsRouter from './routes/audits.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3010;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/audits', auditsRouter);
app.get('/api/health', (req, res) => res.json({ ok: true, port: PORT }));

// Serve frontend static build (production)
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

// Boot
async function boot() {
  try {
    await migrate();
    await addConstraints();
    console.log('[DB] Ready');
  } catch (err) {
    console.error('[DB] Migration error:', err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Valerie Audit API running on port ${PORT}`);
    console.log(`[Server] http://0.0.0.0:${PORT}`);
  });
}

boot();
