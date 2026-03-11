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

// Temporary: filesystem debug
app.get('/api/debug-fs', (_req, res) => {
  import('fs').then(fs => {
    const cwd = process.cwd();
    const serverDir = __dirname;
    const distPath2 = join(__dirname, '..', 'dist');
    const rootContents = fs.readdirSync(join(__dirname, '..')).filter(f => !f.startsWith('.') && f !== 'node_modules');
    res.json({ cwd, serverDir, distPath: distPath2, distExists: existsSync(distPath2), rootContents });
  });
});

// Serve frontend static build (production)
const distPath = join(__dirname, '..', 'dist');
console.log(`[Server] distPath: ${distPath} — exists: ${existsSync(distPath)}`);
if (existsSync(distPath)) {
  console.log('[Server] Serving frontend from dist/');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
} else {
  console.log('[Server] dist/ not found — frontend not served');
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
