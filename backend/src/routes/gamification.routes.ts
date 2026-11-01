import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import { totalXpForUser } from '../lib/xp';

export const gamificationRouter = Router();

// GET /api/leaderboard — Honest ranking of real registered accounts by XP.
//
// XP is read from the append-only ledger, not from user.xp, so the ranking
// cannot be inflated by editing a counter in the users table: every point
// traces back to a specific completed lesson, quiz, course or review.
// No seeded or placeholder names — empty until real students earn XP.
gamificationRouter.get('/leaderboard', (req: Request, res: Response) => {
  const db = loadDb();
  const users = (db.users || [])
    .filter((u: any) => u.role !== 'admin' && !u.disabled)
    .map((u: any) => ({
      id: u.id,
      name: u.name,
      xp: totalXpForUser(db, u.id),
      college: u.college || '',
      // Only a badge the account actually earned (stored by an admin or awarded
      // from real activity). Never derived from rank: a rank fallback handed
      // the #2 student the label "Top Reviewer" while they had published zero
      // reports, which is exactly the kind of invented credential this
      // leaderboard exists to avoid.
      badge: u.badge || null,
      report_contributions: (db.reports || []).filter((r: any) => r.user_id === u.id && r.status === 'published').length,
    }))
    .filter((u: any) => u.xp > 0 || u.report_contributions > 0)
    .sort((a: any, b: any) => b.xp - a.xp || b.report_contributions - a.report_contributions || String(a.name).localeCompare(String(b.name)))
    .map((u: any, idx: number) => ({
      rank: idx + 1,
      id: u.id,
      name: u.name,
      xp: u.xp,
      college: u.college,
      badge: u.badge,
      report_contributions: u.report_contributions,
      // Present so older clients still have something to render, but explicitly
      // null: a streak is not derivable from the XP ledger and is no longer
      // invented on the way out.
      streak: null,
    }));

  res.json({
    status: 'success',
    honest: true,
    entries: users,
    note: 'Ranked from live student accounts only. XP is derived from the verified activity ledger.',
  });
});
