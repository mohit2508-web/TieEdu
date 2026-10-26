import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';

/**
 * /colleges demo requests (UI_REDESIGN_PLAN_V2 §7.1: "Book a 20-minute demo").
 *
 * Public and rate-limited. Stored for the team to follow up; nothing is sent
 * automatically, so a bot filling the form cannot make us email anyone.
 * Admins read them at GET /api/admin/college-requests.
 */

export const collegesRouter = Router();
export const collegesAdminRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

collegesRouter.post('/demo-request', rateLimit(5), (req: Request, res: Response) => {
  // Honeypot: a field people never see. Bots fill it; we pretend success.
  if (clean(req.body?.website, 200)) return res.status(201).json({ ok: true });

  const name = clean(req.body?.name, 80);
  const college = clean(req.body?.college, 160);
  const role = clean(req.body?.role, 80);
  const email = clean(req.body?.email, 160).toLowerCase();
  const phone = clean(req.body?.phone, 20).replace(/[^\d+ -]/g, '');
  const batchSize = Number.parseInt(String(req.body?.batch_size ?? ''), 10);
  const message = String(req.body?.message ?? '').trim().slice(0, 1000);

  const errors: string[] = [];
  if (name.length < 2) errors.push('Your name');
  if (college.length < 3) errors.push('Your college');
  if (!EMAIL_RE.test(email)) errors.push('A valid work email');
  if (errors.length) return res.status(400).json({ error: `Please add: ${errors.join(', ')}.` });

  const db = loadDb();
  if (!Array.isArray(db.college_demo_requests)) db.college_demo_requests = [];
  db.college_demo_requests.push({
    id: `cdr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    name,
    college,
    role,
    email,
    phone,
    batch_size: Number.isFinite(batchSize) && batchSize > 0 && batchSize < 100000 ? batchSize : null,
    message,
    status: 'new',
    created_at: new Date().toISOString(),
  });
  saveDb(db);
  res.status(201).json({ ok: true });
});

/** GET /api/admin/college-requests — newest first. Mounted behind requireAdmin. */
collegesAdminRouter.get('/', (_req: Request, res: Response) => {
  const db = loadDb();
  const rows = [...(db.college_demo_requests || [])].sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)));
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(rows);
});
