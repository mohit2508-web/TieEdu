import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import { publishedReports } from '../lib/stats';

export const campusRouter = Router();

// GET /api/campus/cohort — B2B Institutional TPO Cohort Analytics.
// No fabricated numbers: everything below is derived live from the real db.
campusRouter.get('/cohort', (req: Request, res: Response) => {
  const db = loadDb();

  const students = (db.users || []).filter((u: any) => u.role === 'user' && !u.disabled);
  const reports = (db.reports || []) as any[];
  const unlocks = (db.unlocks || []) as any[];
  const published = publishedReports(db);

  const unlockedUserIds = new Set((unlocks || []).filter((u: any) => u.status === 'active' || !u.status).map((u: any) => u.user_id));

  const userReportCount = new Map<string, number>();
  reports.forEach((r: any) => {
    if (!r.user_id) return;
    userReportCount.set(r.user_id, (userReportCount.get(r.user_id) || 0) + 1);
  });

  const activePrepStudents = students.filter((u: any) =>
    unlockedUserIds.has(u.id) || (userReportCount.get(u.id) || 0) > 0
  );

  const totalStudents = students.length;
  const prepRatePercent = totalStudents > 0 ? Math.round((activePrepStudents.length / totalStudents) * 100) : 0;

  const avgXp = totalStudents > 0
    ? Math.round(students.reduce((sum: number, u: any) => sum + Math.max(0, Number(u.xp) || 0), 0) / totalStudents)
    : 0;

  // Top targeted companies: rank by published report volume; readiness = % of
// that company's published reports where candidates confirmed questions matched.
  const perCompany = new Map<string, { name: string; total: number; matched: number }>();
  published.forEach((r: any) => {
    const company = (db.companies || []).find((c: any) => c.id === r.company_id);
    if (!company) return;
    const cur = perCompany.get(r.company_id) || { name: company.name, total: 0, matched: 0 };
    cur.total += 1;
    if ((r.rounds || []).some((rd: any) => rd.matched_questions)) cur.matched += 1;
    perCompany.set(r.company_id, cur);
  });
  const topTargetedCompanies = [...perCompany.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      candidates_targeting: c.total,
      avg_score: c.total > 0 ? Math.round((c.matched / c.total) * 100) : null
    }));

  res.json({
    institution_name: 'TieEdu Placement Cell',
    batch_year: new Date().getFullYear(),
    total_students: totalStudents,
    active_prep_students: activePrepStudents.length,
    prep_rate_percent: prepRatePercent,
    avg_xp: avgXp,
    top_targeted_companies: topTargetedCompanies,
    verified_reports_submitted: published.length,
    status: 'live'
  });
});