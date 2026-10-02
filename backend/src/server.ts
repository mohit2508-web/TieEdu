import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { companiesRouter } from './routes/companies.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { pricingRouter } from './routes/pricing.routes';
import { webhooksRouter } from './routes/webhooks.routes';
import { reportsRouter } from './routes/reports.routes';
import { adminRouter } from './routes/admin.routes';
import { gamificationRouter } from './routes/gamification.routes';
import { studyPlanRouter } from './routes/studyPlan.routes';
import { pdfLibraryRouter } from './routes/pdfLibrary.routes';
import { postersRouter } from './routes/posters.routes';
import { campusRouter } from './routes/campus.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { interviewCourseRouter } from './routes/interviewCourse.routes';
import { coursesRouter } from './routes/courses.routes';
import { courseAdminRouter } from './routes/courseAdmin.routes';
import { progressRouter } from './routes/progress.routes';
import { commentsRouter } from './routes/comments.routes';
import { sandboxRouter } from './routes/sandbox.routes';
import { unlockRouter } from './routes/unlock.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { authRouter } from './routes/auth.routes';
import { requireAdmin, requireAuth, optionalAuth, assertAuthConfigured } from './middleware/auth';
import { loadDb, saveDb, setMirrorHook } from './data/db';
import { devicesRouter, adminDevicesRouter } from './routes/devices.routes';
import { storage } from './store';

import { runMigrations } from './db/migrate';
import { backfillDevicesFromJson } from './store/devices';

dotenv.config();
assertAuthConfigured();
assertAdminSeedConfigured();

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

// Malformed JSON bodies ko crash hone se rokta hai (400 dekar, kaam jari rakhta hai).
// The general error handler lives at the BOTTOM of this file, after every route —
// see the note there for why it cannot be mounted here.

// Unhandled promise rejections / exceptions must never kill the ledger silently.
process.on('unhandledRejection', (reason) => console.error('❌ [UNHANDLED REJECTION]', reason));
process.on('uncaughtException', (err) => console.error('❌ [UNCAUGHT EXCEPTION]', err));

//////////////////////////////
// Phase A: Protect admin surfaces
//////////////////////////////
pdfLibraryRouter.use('/admin', requireAdmin); // upload/delete protected; GET /file stays locked-guarded

// API Route Bindings
app.use('/api/companies', companiesRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/pdf', pdfLibraryRouter);
app.use('/api/posters', postersRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', requireAdmin, adminRouter);
// Mounted after the catch-all above so its own requirePermission guards apply.
// It also inherits requireAdmin from that mount, which is intentional and
// harmless: the coarse gate runs twice rather than depending on mount order.
app.use('/api/admin/devices', adminDevicesRouter);
// Public beacon + self-service endpoints. Not behind requireAdmin: the install
// beacon must work before anyone has an account.
app.use('/api/devices', devicesRouter);
app.use('/api/gamification', gamificationRouter);
// optionalAuth so guests can preview a plan; enrolment/progress routes add requireAuth themselves.
app.use('/api/study-plan', optionalAuth, studyPlanRouter);
app.use('/api/campus', campusRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/interview-course', interviewCourseRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/course-admin', courseAdminRouter);
app.use('/api/progress', progressRouter);
app.use('/api/comments', commentsRouter);
// requireAuth: the handler compiles and executes nothing (it returns a fixed
// honest-preview string), but it is still an unauthenticated POST that reflects
// request bodies, so it requires a session like any other student action.
app.use('/api/sandbox', requireAuth, sandboxRouter);
app.use('/api/unlocks', unlockRouter);
app.use('/api/notifications', notificationsRouter);

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

// ---------------------------------------------------------------------------
// Terminal error handler — MUST stay below every route.
//
// Express dispatches a thrown error *forward* to the next error-handling layer
// and skips all ordinary middleware on the way. An error handler mounted above
// the routers therefore can never see a crash inside a route: it was mounted
// before them, so it was already behind the throw point. Those errors escaped to
// Express's built-in handler, which replies with an HTML page — and since the API
// client parses JSON, it silently discarded the real cause and showed a generic
// "Could not …" string instead. Mounted here, it also catches the
// `express.json()` parse failure, because that also skips forward past the
// routers.
// ---------------------------------------------------------------------------
app.use((err: any, req: any, res: any, next: any) => {
  // Once bytes are on the wire the only honest thing left is to abort; writing
  // now would corrupt the response the client is already reading.
  if (res.headersSent) return next(err);

  // Keyed on body-parser's own `type` tag, NOT on `instanceof SyntaxError`: any
  // JSON.parse failure is a SyntaxError, including a corrupt `db.json` read
  // inside a route, and reporting that as a 400 "Invalid JSON body" would blame
  // the caller for our own broken state. `entity.too.large` is the 1 MB cap.
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }

  // Honour an explicit status when a handler set one, but never let a thrown
  // value talk us into a 2xx.
  const raw = Number(err?.status || err?.statusCode);
  const status = Number.isInteger(raw) && raw >= 400 && raw <= 599 ? raw : 500;

  // The full stack is always logged — this line is the only place the real cause
  // is ever recorded.
  console.error(
    `❌ [ERROR] #${req.requestId || '-'} ${req.method} ${req.originalUrl} -> ${status}`,
    err?.stack || err?.message || err
  );

  // `expose: true` is the http-errors convention for "this message is safe to
  // show the caller", independent of the status code. Operational
  // misconfiguration sets it, because the fix is written in the message and the
  // message names no secret. Everything else stays opaque and is correlated to
  // the log line above by `request_id` — a 5xx with no `expose` is an internal
  // fault whose text has no business crossing the wire.
  const safe = err?.expose === true;
  res.status(status).json({
    error: safe ? err.message : status === 500 ? 'Internal server error' : err?.message || 'Request failed',
    ...(req.requestId ? { request_id: req.requestId } : {}),
  });
});

/**
 * Seeds the bootstrap admin on first boot.
 *
 * Same fail-closed rule as `resolveJwtSecret()` in `middleware/auth.ts`: a
 * password literal in source is not a password. This function used to carry one,
 * and only *warn* about it under `NODE_ENV=production` — but the warning fires
 * after the account already exists, and on any deployment where NODE_ENV was
 * unset the warning never fired at all. A credential predictable from a public
 * repo is not a degraded mode, it is no access control, so the fallback is gone
 * rather than escalated.
 *
 * The literal is deliberately not even named in a comment here: a known-password
 * string sitting in source is greppable, quotable, and one careless copy-paste
 * away from being reused. `scripts/security-unblock.test.ts` asserts against the
 * behaviour instead, so no copy of it needs to live in this repository.
 *
 * In development the password is generated per boot and printed once. That costs
 * a re-login on restart, which is the correct trade: a throwaway local admin is
 * worth less than an admin password nobody can read off GitHub.
 */
function resolveBootstrapAdminPassword(): string {
  const configured = (process.env.ADMIN_PASSWORD || '').trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') return '';
  return crypto.randomBytes(12).toString('base64url');
}

export function assertAdminSeedConfigured(): void {
  if (resolveBootstrapAdminPassword()) return;
  throw new Error(
    'ADMIN_PASSWORD is not set. The bootstrap admin account cannot be created with a ' +
      'predictable password. Generate one with: node -e "console.log(require(\'crypto\')' +
      '.randomBytes(12).toString(\'base64url\'))" and put it in the environment. ' +
      'Refusing to start.'
  );
}

function ensureSeedData() {
  const db = loadDb();
  let changed = false;

  const email = (process.env.ADMIN_EMAIL || 'admin@tieedu.in').toLowerCase().trim();
  let bootstrapAdmin = (db.users || []).find((u: any) => u.role === 'admin' && u.email === email);
  if (!bootstrapAdmin) {
    const password = resolveBootstrapAdminPassword();
    const fromEnv = Boolean((process.env.ADMIN_PASSWORD || '').trim());
    db.users = db.users || [];
    bootstrapAdmin = {
      id: `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name: 'TieEdu Admin',
      email,
      password_hash: bcrypt.hashSync(password, 12),
      role: 'admin',
      xp: 0,
      streak: 0,
      created_at: new Date().toISOString(),
    };
    db.users.push(bootstrapAdmin);
    // Printed only when generated, and only in development — `assertAdminSeedConfigured`
    // has already guaranteed this branch is unreachable under NODE_ENV=production.
    console.log(
      fromEnv
        ? `👑 [Auth] Admin account seeded from ADMIN_PASSWORD: ${email}`
        : `👑 [Auth] Admin account seeded with a generated dev password for ${email}: ${password}`
    );
    changed = true;
  }

  // The bootstrap admin keeps full access across this milestone by holding an
  // explicit grant, not by holding the role bit.
  //
  // `resolveAuthority` deliberately gives an admin with no staff row *no*
  // permissions, so without this line an existing deployment would lock its own
  // admin out on upgrade. It runs on every boot rather than only when the user is
  // first created, which is what makes that safe: the user-already-exists case is
  // the common one on a live database, and it is exactly the case that would
  // otherwise have nothing to run.
  db.staff = db.staff || [];
  if (!db.staff.some((s: any) => s.user_id === bootstrapAdmin.id)) {
    db.staff.push({
      id: `staff-${crypto.randomBytes(6).toString('hex')}`,
      user_id: bootstrapAdmin.id,
      role: 'super_admin',
      permissions: [],
      status: 'active',
      created_by: null,
      created_at: new Date().toISOString(),
    });
    console.log(`👑 [RBAC] super_admin grant seeded for bootstrap admin: ${email}`);
    changed = true;
  }

  if (changed) saveDb(db);
}

/**
 * The listening server, exported so an in-process harness can close it.
 *
 * The smoke suite imports this module to get an API to talk to, then finishes and
 * calls `process.exit`. That left the listener alive for the lifetime of the node
 * process holding SMOKE_PORT, so the *next* run could not bind: it raced the stale
 * server for the port, its own `listen` threw EADDRINUSE, and every request went
 * to the previous run's server - which was attached to the previous run's scratch
 * store. The symptom was intermittent `fetch failed` and missing rows that had
 * been written, which is a maddening thing to chase and has nothing to do with
 * whatever the run was actually testing. Exporting the handle lets the harness
 * shut it down before it exits.
 */
export const httpServer = app.listen(PORT, async () => {
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

  // M2: installs are read from PostgreSQL first. Anything recorded while the
  // cluster was unreachable — or before this feature existed — exists only in the
  // JSON ledger, so without this copy the install count would read as having
  // silently dropped to zero the moment the relational path went live.
  if (pgReached) {
    try {
      await backfillDevicesFromJson();
    } catch (e: any) {
      console.warn('💡 [Storage] Device backfill skipped: ' + (e?.message || e));
    }
  }

  console.log(`📦 [Storage] ${storage.status().storage_label}`);
});
