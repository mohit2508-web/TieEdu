import { Router, Request, Response } from 'express';
import { loadDb, saveDb, ReportItem } from '../data/db';
import { requireAdmin, requireAuth, optionalAuth } from '../middleware/auth';
import { awardAndCommit } from '../lib/xp';
import { createAutoDrop } from '../lib/autoDrops';
import { autoDropTemplate } from '../lib/drops';
import { grantExperienceReward } from '../lib/companyPageStudent';

export const reportsRouter = Router();

/** XP awarded once, when a community report is approved and published. */
const REPORT_XP = 50;

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
  // The public never sees account ids: not the contributor's, not the admin
  // who verified a selection. The verification method and date stay — that is
  // the part a reader needs to trust the story.
  res.json(
    isAdmin
      ? reports
      : reports.map(({ user_id: _u, verification, ...rest }: any) => ({
          ...rest,
          verification: verification ? { method: verification.method, verified_at: verification.verified_at } : null,
        }))
  );
});

// GET /api/reports/mine — signed-in user ke apne submitted reports (honest)
reportsRouter.get('/mine', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const mine = (db.reports || []).filter((r: ReportItem) => r.user_id === req.user!.id);
  mine.sort((a: ReportItem, b: ReportItem) => (a.created_at > b.created_at ? -1 : 1));
  res.json({ status: 'success', reports: mine });
});

// POST /api/reports — Submit a candidate interview report. Optional auth (guests allowed).
reportsRouter.post('/', optionalAuth, (req: Request, res: Response) => {
  const { company_id, company_name, user_role, accuracy_rating, outcome, round_summary, difficulty, user_name } = req.body;
  const db = loadDb();

  if (!company_id) {
    return res.status(400).json({ error: 'company_id is required' });
  }
  const text = (round_summary || '').toString().trim();
  if (text.length < 5) {
    return res.status(400).json({ error: 'Please describe the interview breakdown in at least 5 characters' });
  }

  const user = req.user;
  const newReport: ReportItem = {
    id: `rep-${Date.now()}`,
    company_id,
    company_name: company_name || 'Company',
    user_id: user?.id || null,
    user_name: user_name || user?.name || 'TieEdu Student',
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
  const { status, verification } = req.body as { status?: string; verification?: string | null };
  const db = loadDb();

  const report = db.reports.find((r: ReportItem) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  if (status !== undefined && !['published', 'rejected', 'pending_review'].includes(String(status))) {
    return res.status(400).json({ error: 'status must be published, rejected or pending_review' });
  }

  /*
   * Selection verification (UI_REDESIGN_PLAN_V2 §6.6: "verified by email or
   * offer letter and marked as such"). An admin attests HOW they checked it;
   * no document is stored here — an offer letter is personal data, and the
   * claim only needs the method, the date and who made it.
   */
  if (verification !== undefined) {
    if (verification !== null && !['offer_letter', 'college_email'].includes(verification)) {
      return res.status(400).json({ error: 'verification must be offer_letter, college_email or null' });
    }
    if (verification && report.outcome !== 'selected') {
      return res.status(400).json({ error: 'Only a selection can be verified as one.' });
    }
    report.verification = verification
      ? { method: verification as 'offer_letter' | 'college_email', verified_at: new Date().toISOString(), verified_by: req.userId || 'admin' }
      : null;
  }

  const wasPublished = report.status === 'published';
  if (status) report.status = status as ReportItem['status'];
  if (status === 'published' && report.user_id) {
    // +50 XP for the real contributor, awarded through the append-only ledger.
    // The key is derived from the report id, so an admin who re-saves the same
    // report — or flips it unpublished and back — cannot farm the reward.
    const owner = (db.users || []).find((u: any) => u.id === report.user_id);
    if (owner) {
      const result = awardAndCommit(db, {
        userId: owner.id,
        key: `report-published:${report.id}`,
        reason: 'review',
        xp: REPORT_XP,
        courseId: null,
        note: `Interview report #${report.id} published`,
      });
      owner.xp = result.total_xp;
    }
    // A company page can opt in to unlocking its pack for the author. Off
    // unless the company's live page says so; one unlock per student, ever.
    grantExperienceReward(db, report, req.userId || 'admin');
  }

  saveDb(db);

  /*
   * The selection story becomes a feed card, deduped on the report id — the
   * same one-key rule as the XP award above, so unpublish → publish cannot
   * re-card it. The company slug is resolved from the vault the report points
   * at; with no vault to link to the drop still validates via a minimal
   * article, because a card with nowhere to go is worse than no card.
   */
  // Only a selection becomes a "selection story" card. This used to fire for
  // every published report, so approving a rejection announced it as a
  // selection in the feed.
  if (status === 'published' && !wasPublished && report.outcome === 'selected') {
    const company = (db.companies || []).find((c: any) => c.id === report.company_id);
    const copy = autoDropTemplate('selected', {
      title: report.company_name || company?.name || company?.title || 'a company',
      detail: (report.rounds || [])
        .map((r: { round_name: string }) => r.round_name)
        .filter(Boolean)
        .slice(0, 2)
        .join(' vs '),
    });
    createAutoDrop({
      event: 'report.published',
      entityId: report.id,
      type: 'selected',
      headline: copy.headline,
      bullets: copy.bullets,
      ctaRoute: company?.slug ? `/company/${company.slug}` : undefined,
      targetSlug: company?.slug,
      bodyMd: company ? undefined : `An interview experience shared by ${report.user_name} on TieEdu.`,
      actorId: req.userId,
    });
  }

  res.json({ status: 'success', message: status ? `Report status updated to ${status}` : 'Report updated', report });
});