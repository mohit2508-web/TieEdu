import { Router, Request, Response } from 'express';
import { loadDb, safeSaveDb } from '../data/db';
import { optionalAuth } from '../middleware/auth';

/**
 * Client error log (PRACTICE_POLISH_PLAN.md §3.2).
 *   POST /api/client-errors          the app's ErrorBoundary / error pages report a crash (anyone; rate-limited)
 *   GET  /api/admin/client-errors    admins: newest first, grouped by message
 *   DELETE /api/admin/client-errors  admins: clear the log
 * Only short strings are kept (no request bodies, no user input), capped at MAX rows.
 */
export const clientErrorsRouter = Router();
export const clientErrorsAdminRouter = Router();

const MAX = 500;
const PER_MIN = 10;
const hits = new Map<string, number[]>();

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');

/** Per-IP sliding minute; exported for tests. */
export function allowReport(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= PER_MIN) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

clientErrorsRouter.post('/', optionalAuth, (req: Request, res: Response) => {
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  if (!allowReport(ip)) { res.status(429).end(); return; }
  const b = (req.body || {}) as Record<string, unknown>;
  const ref = str(b.ref, 16).replace(/[^A-Z0-9-]/gi, '');
  const message = str(b.message, 300);
  if (!ref || !message) { res.status(400).json({ error: 'ref and message are required' }); return; }
  const db: any = loadDb();
  db.client_errors = Array.isArray(db.client_errors) ? db.client_errors : [];
  db.client_errors.push({
    ref,
    at: new Date().toISOString(),
    area: str(b.area, 40) || 'app',
    route: str(b.route, 200),
    message,
    stack: str(b.stack, 600),
    user_id: (req as any).userId || null,
    ua: str(req.headers['user-agent'], 160),
  });
  if (db.client_errors.length > MAX) db.client_errors = db.client_errors.slice(-MAX);
  safeSaveDb(db);
  res.status(204).end();
});

clientErrorsAdminRouter.get('/', (_req: Request, res: Response) => {
  const db: any = loadDb();
  const rows: any[] = (db.client_errors || []).slice().reverse();
  const users = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  const groups = new Map<string, { message: string; area: string; count: number; last_at: string; routes: Set<string> }>();
  for (const r of rows) {
    const k = `${r.area}|${r.message}`;
    const g = groups.get(k) || { message: r.message, area: r.area, count: 0, last_at: r.at, routes: new Set<string>() };
    g.count++;
    if (r.route) g.routes.add(r.route);
    groups.set(k, g);
  }
  res.json({
    total: rows.length,
    groups: [...groups.values()].map((g) => ({ ...g, routes: [...g.routes].slice(0, 5) })).sort((a, b) => b.count - a.count).slice(0, 50),
    recent: rows.slice(0, 100).map((r) => ({ ...r, user: r.user_id ? (users.get(r.user_id)?.email || r.user_id) : null })),
  });
});

clientErrorsAdminRouter.delete('/', (_req: Request, res: Response) => {
  const db: any = loadDb();
  db.client_errors = [];
  safeSaveDb(db);
  res.json({ ok: true });
});
