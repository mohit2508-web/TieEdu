import { Router, Request, Response } from 'express';
import { loadDb, saveDb, ReportItem } from '../data/db';
import { requireAdmin, requireAuth, optionalAuth } from '../middleware/auth';

export const reportsRouter = Router();

// GET /api/reports — Public face only exposes PUBLISHED reports (moderation queue is admin-only).
// Admin (Bearer admin) sees everything and can filter by status.
reportsRouter.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const { company_id, status } = req.query as { company_id?: string; status?: string };
  const isAdmin = req.user?.role === 'admin';
  const qstatus = isAdmin && status ? status : 'published';

  let reports = (db.reports || []).filter((r: ReportItem) =>
    isAdmin ? (status ? r.status === status : true) : r.status === 'published'
  );
  if (company_id) reports = reports.filter((r: ReportItem) => r.company_id === company_id);
  if (!isAdmin && status && status !== 'published') reports = [];
  res.json(reports);
});

// GET /api/reports/mine — signed-in user ke apne submitted reports (honest)
reportsRouter.get('/mine', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const mine = (db.reports || []).filter((r: ReportItem) => r.user_id === req.user!.id);
  mine.sort((a: ReportItem, b: ReportItem) => (a.created_at > b.created_at ? -1 : 1));
  res.json({ status: 'success', reports: mine });
});

// POST /api/reports — Submit a candidate interview report. Identity is the signed-in user.
reportsRouter.post('/', requireAuth, (req: Request, res: Response) => {
  const { company_id, company_name, user_role, accuracy_rating, outcome, round_summary, difficulty } = req.body;
  const db = loadDb();

  if (!company_id) {
    return res.status(400).json({ error: 'company_id is required' });
  }
  const text = (round_summary || '').toString().trim();
  if (text.length < 20) {
    return res.status(400).json({ error: 'Please describe the round in at least 20 characters' });
  }

  const user = req.user!;
  const newReport: ReportItem = {
    id: `rep-${Date.now()}`,
    company_id,
    company_name: company_name || user.name || 'Company',
    user_id: user.id,
    user_name: user.name || 'TieEdu Student',
    user_role: user_role || 'Applicant',
    rounds: [
      {
        round_name: 'Interview Experience',
        difficulty: difficulty || 'medium',
        summary: text,
        matched_questions: Boolean(req.body.matched_questions)
      }
    ],
    accuracy_rating: typeof accuracy_rating === 'number' ? Math.min(5, Math.max(0, accuracy_rating)) : null,
    outcome: outcome || null,
    status: 'pending_review',
    created_at: new Date().toISOString().split('T')[0]
  };

  db.reports.unshift(newReport);
  saveDb(db);

  res.status(201).json({
    status: 'success',
    message: 'Report submitted to the moderation queue — +50 XP is awarded when an admin approves it.',
    report: newReport
  });
});

// PATCH /api/reports/:id — Approve or reject candidate report (admin only)
reportsRouter.patch('/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'published' | 'rejected'
  const db = loadDb();

  const report = db.reports.find((r: ReportItem) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  report.status = status;
  if (status === 'published' && report.user_id) {
    // Award +50 XP +1 streak to the real contributor's account
    const owner = (db.users || []).find((u: any) => u.id === report.user_id);
    if (owner) {
      owner.xp = Math.max(0, Number(owner.xp) || 0) + 50;
      owner.streak = Math.max(0, Number(owner.streak) || 0) + 1;
    }
  }

  saveDb(db);

  res.json({ status: 'success', message: `Report status updated to ${status}`, report });
});