import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import { totalXpForUser } from '../lib/xp';
import { daysUntil, resolvePlan } from '../lib/studyPlanTemplates';
import type { ContentBlockRecord } from '../data/db';

export const gamificationRouter = Router();

/** First markdown block of a phase, used only to fill the deprecated roadmap field. */
function firstMarkdown(blocks: ContentBlockRecord[]): string {
  const md = (blocks || []).find((b) => b.block_type === 'markdown');
  return String(md?.payload?.text || '').trim();
}

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

// POST /api/gamification/study-plan — Deprecated alias for POST /api/study-plan/generate.
//
// Kept for one release so existing clients do not break. Content now comes from
// admin-authored templates via resolvePlan(); the hardcoded roadmap survives only
// as the final fallback inside that resolver. The legacy `roadmap` field is derived
// from the resolved phases so older frontends keep rendering.
gamificationRouter.post('/study-plan', (req: Request, res: Response) => {
  const db = loadDb();
  const targetCompany = req.body.targetCompany || 'Target Company';
  const targetRole = req.body.targetRole || 'SDE';
  // Same precedence as the canonical route: a real interview date wins over any
  // client-supplied day count, so the two endpoints cannot disagree about how
  // long the window is.
  const fromCalendar = daysUntil(req.body.interviewDate || null);
  const days = fromCalendar != null
    ? Math.max(1, Math.min(365, fromCalendar))
    : Math.max(1, Math.min(365, Number(req.body.daysRemaining) || 14));

  const resolved = resolvePlan(db, { companyName: targetCompany, role: targetRole, totalDays: days });

  const roadmap = resolved.phases.map((p) => ({
    day: p.day_to ? `Day ${p.day_from}–${p.day_to}` : `Day ${p.day_from}+`,
    focus: p.title,
    detail: p.summary || firstMarkdown(p.blocks),
  }));

  res.json({
    targetCompany,
    targetRole,
    daysRemaining: days,
    source: resolved.source,
    templateId: resolved.template?.id || null,
    phases: resolved.phases,
    roadmap
  });
});