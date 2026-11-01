import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import type { MessageLogRow } from '../lib/messaging';

/**
 * GET /api/admin/messages/log?status=&channel=&limit= — what lib/messaging
 * decided for each message, newest first, with the reason anything was
 * skipped, plus 7-day totals. Read-only (PROFESSIONAL_PLATFORM_PLAN §4.1).
 */
export const messagingAdminRouter = Router();

messagingAdminRouter.get('/log', (req: Request, res: Response) => {
  const db = loadDb() as any;
  const all: MessageLogRow[] = Array.isArray(db.message_log) ? db.message_log : [];
  const status = String(req.query.status || '');
  const channel = String(req.query.channel || '');
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
  const emailOf = new Map<string, string>((db.users || []).map((u: any) => [u.id, u.email]));

  const rows = all
    .filter((r) => (!status || r.status === status) && (!channel || r.channel === channel))
    .slice(-limit)
    .reverse()
    .map((r) => ({ ...r, email: emailOf.get(r.user_id) || null }));

  const weekAgo = Date.now() - 7 * 86_400_000;
  const week = all.filter((r) => Date.parse(r.at) >= weekAgo);
  const totals: Record<string, { sent: number; skipped: number }> = {};
  const reasons: Record<string, number> = {};
  for (const r of week) {
    totals[r.channel] = totals[r.channel] || { sent: 0, skipped: 0 };
    totals[r.channel][r.status] += 1;
    if (r.status === 'skipped' && r.reason) reasons[r.reason] = (reasons[r.reason] || 0) + 1;
  }
  res.json({ rows, week: { totals, reasons } });
});
