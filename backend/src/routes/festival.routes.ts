import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { appendAudit } from '../store/audit';
import { claimMembership, festivalMode, festivalPublic, FestivalError } from '../lib/festival';
import {
  adminInternships, applyToInternship, InternshipError, publicInternships, upsertInternship,
} from '../lib/internships';

/**
 * Diwali Utsav 2026 (DIWALI_SALE_PLAN.md).
 * Public:  GET  /api/festival                   — is a sale live, its end time, my membership
 *          GET  /api/festival/internships       — open internships
 * Student: POST /api/festival/membership        — claim the free membership
 *          POST /api/festival/internships/:id/apply
 * Admin:   GET/PUT /api/admin/festival          — mode auto | on | off
 *          GET/POST/PUT /api/admin/festival/internships[/:id]
 */
export const festivalRouter = Router();
export const festivalAdminRouter = Router();

const fail = (res: Response, e: any) => {
  if (e instanceof FestivalError || e instanceof InternshipError) return res.status(e.status).json({ error: e.message });
  throw e;
};

festivalRouter.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  res.setHeader('Cache-Control', req.userId ? 'private, no-store' : 'public, max-age=60');
  res.json(festivalPublic(db, req.userId || null));
});

festivalRouter.post('/membership', requireAuth, async (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const before = (db.users || []).find((u: any) => u.id === req.userId)?.membership?.granted_at;
    const membership = claimMembership(db, req.userId!);
    if (membership.granted_at !== before) {
      await appendAudit(db, { actor: req.userId!, action: 'membership.claimed', detail: `${membership.source} until ${membership.expires_at}` });
    }
    saveDb(db);
    res.json({ membership });
  } catch (e) {
    fail(res, e);
  }
});

festivalRouter.get('/internships', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(publicInternships(db, req.userId || null));
});

festivalRouter.post('/internships/:id/apply', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const application = applyToInternship(db, req.userId!, req.params.id, req.body?.note);
    saveDb(db);
    res.json({ application });
  } catch (e) {
    fail(res, e);
  }
});

festivalAdminRouter.get('/', (_req: Request, res: Response) => {
  const db = loadDb();
  const members = (db.users || []).filter((u: any) => u.membership?.tier === 'member').length;
  const saleOrders = (db.orders || []).filter((o: any) => o.sale && o.status === 'paid');
  res.json({
    mode: festivalMode(db),
    status: festivalPublic(db, null),
    members,
    sale_orders: saleOrders.length,
    sale_revenue_inr: saleOrders.reduce((s: number, o: any) => s + (Number(o.amount_paisa) || 0) / 100, 0),
  });
});

festivalAdminRouter.put('/', async (req: Request, res: Response) => {
  const mode = req.body?.mode;
  if (!['auto', 'on', 'off'].includes(mode)) return res.status(400).json({ error: 'mode must be auto, on or off' });
  const db = loadDb();
  db.settings = { ...(db.settings || {}), festival_mode: mode };
  await appendAudit(db, { actor: req.userId || 'admin', action: 'festival.mode', detail: mode });
  saveDb(db);
  res.json({ mode });
});

festivalAdminRouter.get('/internships', (_req: Request, res: Response) => {
  res.json(adminInternships(loadDb()));
});

festivalAdminRouter.post('/internships', (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const row = upsertInternship(db, req.body);
    saveDb(db);
    res.json(row);
  } catch (e) {
    fail(res, e);
  }
});

festivalAdminRouter.put('/internships/:id', (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const row = upsertInternship(db, req.body, req.params.id);
    saveDb(db);
    res.json(row);
  } catch (e) {
    fail(res, e);
  }
});
