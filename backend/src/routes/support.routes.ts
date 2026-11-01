import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { loadDb, saveDb } from '../data/db';
import { rateLimit } from '../middleware/auth';
import { sendDriveEmail } from '../lib/driveEmail';

/**
 * Contact & support (PROFESSIONAL_PLATFORM_PLAN §8).
 *   POST /api/support/contact            { name, email, topic, message } (public)
 *   GET  /api/admin/support               newest first (admin)
 *   PUT  /api/admin/support/:id           { status } (admin)
 *
 * Every request is stored first, so nothing is lost when mail is not
 * configured; the team copy and the student's acknowledgement are then sent
 * through the same generic one-button template the drive mails use.
 */
export const supportRouter = Router();
export const supportAdminRouter = Router();

export const SUPPORT_TOPICS = ['payment', 'account', 'course', 'certificate', 'drive', 'college', 'other'] as const;
type Topic = (typeof SUPPORT_TOPICS)[number];
const STATUSES = ['open', 'resolved'] as const;

const validEmail = (e: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+\n/g, '\n').trim().slice(0, max);

supportRouter.post('/contact', rateLimit(3), (req: Request, res: Response) => {
  const name = clean(req.body?.name, 80);
  const email = clean(req.body?.email, 160).toLowerCase();
  const topic: Topic = (SUPPORT_TOPICS as readonly string[]).includes(req.body?.topic) ? req.body.topic : 'other';
  const message = clean(req.body?.message, 4000);

  if (!name) return res.status(400).json({ error: 'Please tell us your name.' });
  if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email so we can reply.' });
  if (message.length < 10) return res.status(400).json({ error: 'Please describe the problem in a sentence or two.' });

  const db = loadDb() as any;
  const row = {
    id: randomUUID(),
    ref: `TE-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    name,
    email,
    topic,
    message,
    user_id: req.userId || null,
    status: 'open' as const,
    created_at: new Date().toISOString(),
  };
  db.support_requests = Array.isArray(db.support_requests) ? db.support_requests : [];
  db.support_requests.push(row);
  saveDb(db);

  const team = String(db.settings?.support_email || 'support@tieedu.in');
  void sendDriveEmail({
    to: team,
    subject: `[${row.ref}] ${topic}: ${name}`,
    body: `${message}\n\nFrom: ${name} <${email}>${row.user_id ? `\nUser id: ${row.user_id}` : ''}`,
    driveName: 'TieEdu Support',
    note: 'TieEdu Support · New contact form message.',
  });
  void sendDriveEmail({
    to: email,
    subject: `We got your message (${row.ref})`,
    body: `Thanks for writing to TieEdu, ${name.split(/\s+/)[0]}. Your reference is ${row.ref}. Someone from the team will reply to this email within 1 working day.\n\nYour message:\n${message}`,
    driveName: 'TieEdu Support',
    url: '/contact',
    ctaLabel: 'Open help & FAQs',
    note: 'TieEdu Support · A copy of the message you sent us.',
  });

  res.status(201).json({ ref: row.ref });
});

supportAdminRouter.get('/', (_req: Request, res: Response) => {
  const db = loadDb() as any;
  const rows = [...(db.support_requests || [])].sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)));
  res.json({ requests: rows.slice(0, 500) });
});

supportAdminRouter.put('/:id', (req: Request, res: Response) => {
  const db = loadDb() as any;
  const row = (db.support_requests || []).find((r: any) => r.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!(STATUSES as readonly string[]).includes(req.body?.status)) return res.status(400).json({ error: 'Bad status' });
  row.status = req.body.status;
  row.updated_at = new Date().toISOString();
  saveDb(db);
  res.json(row);
});
