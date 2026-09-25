import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import { buildAnalyticsSnapshot } from '../lib/stats';

export const analyticsRouter = Router();

// GET /api/analytics — Honest platform telemetry computed from the real ledgers.
// Nothing here is fabricated: every number is counted from orders/unlocks/reports/users.
analyticsRouter.get('/', (req: Request, res: Response) => {
  const db = loadDb();
  res.json({
    service: 'TieEdu Express Backend API',
    status: 'ok',
    honest: true,
    meta: {
      note: 'All metrics are computed live from the local-json-repository ledger. No caching, no placeholders.',
      timestamp: new Date().toISOString(),
    },
    ...buildAnalyticsSnapshot(db),
  });
});

// GET /api/analytics/revenue — daily revenue time series (real paid orders)
analyticsRouter.get('/revenue', (req: Request, res: Response) => {
  const db = loadDb();
  const paid = (db.orders || []).filter((o: any) => o.status === 'paid');
  const byDay: Record<string, { revenue: number; orders: number }> = {};
  for (const o of paid) {
    const day = (o.created_at || '').split('T')[0] || 'unknown';
    if (!byDay[day]) byDay[day] = { revenue: 0, orders: 0 };
    byDay[day].revenue += (Number(o.amount_paisa) || 0) / 100;
    byDay[day].orders += 1;
  }
  const series = Object.keys(byDay)
    .sort()
    .map((day) => ({ date: day, revenue_inr: Math.round(byDay[day].revenue * 100) / 100, orders: byDay[day].orders }));
  res.json({ status: 'success', series });
});