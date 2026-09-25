import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';

export const gamificationRouter = Router();

const BADGES = ['Placement Legend', 'Vault Contributor', 'Top Reviewer'];

// GET /api/leaderboard — Honest ranking of real registered accounts by XP.
// No seeded/placeholder names. Empty until real students earn XP.
gamificationRouter.get('/leaderboard', (req: Request, res: Response) => {
  const db = loadDb();
  const users = (db.users || [])
    .filter((u: any) => u.role !== 'admin' && !u.disabled)
    .map((u: any) => ({
      id: u.id,
      name: u.name,
      xp: Math.max(0, Number(u.xp) || 0),
      streak: Math.max(0, Number(u.streak) || 0),
      college: u.college || '-',
      badge: u.badge || null,
      report_contributions: (db.reports || []).filter((r: any) => r.user_id === u.id).length,
    }))
    .sort((a: any, b: any) => b.xp - a.xp || b.streak - a.streak || a.name.localeCompare(b.name))
    .map((u: any, idx: number) => ({
      rank: idx + 1,
      name: u.name,
      xp: u.xp,
      streak: u.streak,
      college: u.college,
      badge: (u.badge as string) || BADGES[idx] || 'New Recruit',
      report_contributions: u.report_contributions,
    }));

  res.json({
    status: 'success',
    honest: true,
    entries: users,
    note: 'Ranked from live student accounts only.',
  });
});

// POST /api/study-plan — Generate Study Plan Roadmap
gamificationRouter.post('/study-plan', (req: Request, res: Response) => {
  const { targetCompany, targetRole, daysRemaining } = req.body;
  const days = daysRemaining || 14;

  const company = targetCompany || 'Target Company';
  const role = targetRole || 'SDE';

  const roadmap = [
    {
      day: `Day 1–3`,
      focus: 'HR & STAR Method Questions',
      detail: `Prepare 5 STAR stories on conflict resolution, collaboration and role-relevant decisions for ${company}.`
    },
    {
      day: `Day 4–7`,
      focus: 'Core Technical & High-Frequency Qs',
      detail: `Practice the core DSA, concurrency and language topics most commonly asked for ${role} roles.`
    },
    {
      day: `Day 8–11`,
      focus: 'System Design & High-Throughput Architecture',
      detail: `Walk through idempotent transaction handling, rate limiting and scalable service design.`
    },
    {
      day: `Day 12–${days}`,
      focus: 'Mock Drives & Verified Candidate Reports',
      detail: `Review verified candidate reports for ${company} and complete 45-minute timed mock tests.`
    }
  ];

  res.json({
    targetCompany: targetCompany || 'Target Company',
    targetRole: targetRole || 'SDE',
    daysRemaining: days,
    roadmap
  });
});