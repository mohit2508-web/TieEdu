import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { companiesRouter } from './routes/companies.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { webhooksRouter } from './routes/webhooks.routes';
import { reportsRouter } from './routes/reports.routes';
import { adminRouter } from './routes/admin.routes';
import { gamificationRouter } from './routes/gamification.routes';
import { pdfLibraryRouter } from './routes/pdfLibrary.routes';
import { campusRouter } from './routes/campus.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { interviewCourseRouter } from './routes/interviewCourse.routes';
import { progressRouter } from './routes/progress.routes';
import { commentsRouter } from './routes/comments.routes';
import { sandboxRouter } from './routes/sandbox.routes';
import { unlockRouter } from './routes/unlock.routes';
import { authRouter } from './routes/auth.routes';
import { requireAdmin } from './middleware/auth';
import { loadDb, saveDb, setMirrorHook } from './data/db';
import { storage } from './store';

import { runMigrations } from './db/migrate';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security + parsing
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length']
}));
app.use(express.json({
  limit: '1mb',
  verify: (req: any, res, buf) => { req.rawBody = buf.toString('utf8'); } // byte-exact body for webhook HMAC
}));
app.use(cookieParser());

// Request logging — every request gets a short id, x-request-id echo, latency + status.
app.use((req: any, res: any, next: any) => {
  const id = (req.header && req.header('x-request-id')) || crypto.randomBytes(6).toString('hex');
  (req as any).requestId = id;
  res.setHeader('x-request-id', id);
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const line = `[HTTP] #${id} ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms.toFixed(0)}ms`;
    if (res.statusCode >= 500) console.error('❌ ' + line);
    else if (ms > 1500) console.warn('🐢 ' + line + ' (slow)');
    else console.log(line);
  });
  next();
});

// Malformed JSON bodies ko crash hone se rokta hai (400 dekar, kaam jari rakhta hai)
app.use((err: any, req: any, res: any, next: any) => {
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (res.statusCode >= 500 || err) {
    console.error(`❌ [ERROR] #${req.requestId || '-'}`, err?.message || err);
  }
  next(err);
});

// Unhandled promise rejections / exceptions must never kill the ledger silently.
process.on('unhandledRejection', (reason) => console.error('❌ [UNHANDLED REJECTION]', reason));
process.on('uncaughtException', (err) => console.error('❌ [UNCAUGHT EXCEPTION]', err));

//////////////////////////////
// Phase A: Protect admin surfaces
//////////////////////////////
pdfLibraryRouter.use('/admin', requireAdmin); // upload/delete protected; GET /file stays locked-guarded

// API Route Bindings
app.use('/api/companies', companiesRouter);
app.use('/api/pdf', pdfLibraryRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', requireAdmin, adminRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/campus', campusRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/interview-course', interviewCourseRouter);
app.use('/api/progress', progressRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/sandbox', sandboxRouter);
app.use('/api/unlocks', unlockRouter);

// Health Check — honest
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TieEdu Express Backend API',
    port: PORT,
    storage: storage.status(),
    auth: 'enabled',
    timestamp: new Date(),
  });
});

function ensureSeedData() {
  const db = loadDb();
  let changed = false;

  // Seed admin from env (or dev default) — ephemeral convenience only
  const email = (process.env.ADMIN_EMAIL || 'admin@tieedu.in').toLowerCase().trim();
  if (!(db.users || []).some((u: any) => u.role === 'admin' && u.email === email)) {
    const password = process.env.ADMIN_PASSWORD || 'TieEduAdmin@2026';
    if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV === 'production') {
      console.warn('⚠️  [Auth] ADMIN_PASSWORD env missing — default admin password in use. Set it in production!');
    }
    db.users = db.users || [];
    db.users.push({
      id: `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name: 'TieEdu Admin',
      email,
      password_hash: bcrypt.hashSync(password, 12),
      role: 'admin',
      xp: 0,
      streak: 0,
      created_at: new Date().toISOString(),
    });
    console.log(`👑 [Auth] Admin account seeded: ${email} (${password.length > 12 ? 'custom password' : 'default password'})`);
    changed = true;
  }
  if (changed) saveDb(db);
}

app.listen(PORT, async () => {
  ensureSeedData();
  console.log(`⚡ [TieEdu Backend API] Server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.warn('🔐 [Auth] JWT_SECRET env missing in production — auth is FAIL-CLOSED. Set JWT_SECRET (32+ chars) now.');
  }

  // Phase O: CockroachDB replica — gated on ENABLE_PG_REPLICA=1 (+ DATABASE_URL).
  const pgReplicaEnabled = process.env.ENABLE_PG_REPLICA === '1';
  if (pgReplicaEnabled) console.log('🔁 [Storage] ENABLE_PG_REPLICA=1 — CockroachDB mirror active.');
  else console.log('🔁 [Storage] CockroachDB mirror OFF (set ENABLE_PG_REPLICA=1 to mirror to CockroachDB).');

  const pgReached = await runMigrations();
  await storage.init({ enabled: pgReplicaEnabled, seedDoc: loadDb() });
  setMirrorHook((data: any) => storage.mirror(data));
  console.log(`📦 [Storage] ${storage.status().storage_label}`);
});
