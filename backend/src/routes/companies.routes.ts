import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import { optionalAuth } from '../middleware/auth';
import { deriveCompanyStats, publishedReports } from '../lib/stats';

export const companiesRouter = Router();

function attachLiveStats(db: any, company: any) {
  const live = deriveCompanyStats(db, company);
  company.unlock_count = live.unlock_count;
  company.trust_stats = { ...(company.trust_stats || {}), ...live.trust_stats };

  // accuracy_score = % of PUBLISHED reports that matched real questions — null until verified reports exist.
  const reports = publishedReports(db, company.id);
  const matched = reports.filter((r: any) => (r.rounds || []).some((rd: any) => rd.matched_questions)).length;
  company.accuracy_score = reports.length > 0 ? Math.round((matched / reports.length) * 100) : null;
  company.accuracy_report_count = reports.length;
  return company;
}

// GET /api/companies
companiesRouter.get('/', (req: Request, res: Response) => {
  const db = loadDb();
  const list = (db.companies || []).map((c: any) => attachLiveStats(db, JSON.parse(JSON.stringify(c))));
  res.json(list);
});

// GET /api/companies/:slug — real per-user unlock state (Bearer token optional)
companiesRouter.get('/:slug', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const company = (db.companies || []).find((c: any) => c.slug === req.params.slug);
  if (!company) {
    return res.status(404).json({ error: 'Company vault not found' });
  }

  const userId = req.userId;
  const isAdmin = req.user?.role === 'admin';
  const isUnlocked = isAdmin
    || !!company.is_unlocked
    || (!!userId && (db.unlocks || []).some(
        (u: any) => u.user_id === userId && u.company_id === company.id && (u.status === 'active' || !u.status)
      ));

  // Deep clone to avoid mutating in-memory db
  const sanitizedCompany = attachLiveStats(db, JSON.parse(JSON.stringify(company)));

  // Lock only PREMIUM module content (until the company is unlocked).
  // Free modules remain fully readable — they are the honest showcase that sells the pack.
  if (sanitizedCompany.modules) {
    sanitizedCompany.modules.forEach((mod: any) => {
      if (mod.is_premium !== true || isUnlocked) return;
      if (mod.items) {
        mod.items.forEach((item: any) => {
          if (!item.is_free_preview && item.blocks) {
            item.blocks.forEach((block: any) => {
              if (block.payload) {
                // Keep title & metadata, sanitize actual payload text/code
                if (block.payload.text) {
                  const firstLine = block.payload.text.split('\n')[0] || '';
                  block.payload.text = `${firstLine}\n\n🔒 **[LOCKED CONTENT]** - Unlock full vault access to read complete verified guide & solution.`;
                }
                if (block.payload.code) {
                  block.payload.code = `// 🔒 [LOCKED CONTENT - ${block.payload.language || 'Code'}]\n// Unlock full vault to view complete production-grade solution with Time & Space complexities.`;
                }
                if (block.payload.source) {
                  block.payload.source = `graph TD\n  Lock[🔒 Locked Architecture Diagram] --> Unlock[Unlock Vault to Render SVG Mermaid Diagram]`;
                }
              }
            });
          }
        });
      }
    });
  }

  res.json({ ...sanitizedCompany, is_unlocked: !!isUnlocked, module_access: isUnlocked ? 'full' : 'preview' });
});