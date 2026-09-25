import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';
import { optionalAuth } from '../middleware/auth';
import { deriveCompanyStats, publishedReports } from '../lib/stats';
import { ownedModuleIdsFor, unlockedCompanyIds } from '../payments/orders';

export const companiesRouter = Router();

const LIST_KEEP_KEYS = [
  'id', 'slug', 'name', 'logo_url', 'tagline', 'description', 'careers_link',
  'status', 'last_updated_days_ago', 'comparison_metrics', 'verification_level',
];

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

// Weirdly-compact safe string of premium module ids — NO content, only ids the
// cart needs to build its "suggested company" line item.
function premiumModuleIds(company: any): string[] {
  return (company.modules || [])
    .filter((m: any) => m?.is_premium)
    .map((m: any) => m.id);
}

// Public list: presentation metadata ONLY — no modules/items/blocks/payloads/
// section_data, plus per-user is_unlocked/owned counts (Bearer token optional).
// The full paywalled catalog must never leave through /api/companies.
companiesRouter.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.userId || '';
  const isAdmin = req.user?.role === 'admin';
  const ownedModuleIds = userId ? ownedModuleIdsFor(db, userId) : [];
  const ownedCompanyIds = userId ? unlockedCompanyIds(db, userId) : [];

  const list = (db.companies || [])
    .filter((c: any) => c.status !== 'draft')
    .map((c: any) => {
      const withStats = attachLiveStats(db, JSON.parse(JSON.stringify(c)));
      const sanitized: any = {};
      for (const key of LIST_KEEP_KEYS) {
        if (withStats[key] !== undefined) sanitized[key] = withStats[key];
      }
      sanitized.trust_stats = withStats.trust_stats || {};
      sanitized.unlock_count = withStats.unlock_count || 0;
      sanitized.accuracy_score = withStats.accuracy_score ?? null;
      sanitized.accuracy_report_count = withStats.accuracy_report_count || 0;
      sanitized.premium_module_ids = premiumModuleIds(withStats);
      sanitized.premium_module_count = sanitized.premium_module_ids.length;
      sanitized.module_count = (withStats.modules || []).length;
      const allPremium = sanitized.premium_module_ids;
      sanitized.is_unlocked = !!(
        isAdmin
        || withStats.is_unlocked === true
        || ownedCompanyIds.includes(c.id)
        || (allPremium.length > 0 && allPremium.every((mid: string) => ownedModuleIds.includes(mid)))
      );
      sanitized.owned_module_count = userId ? allPremium.filter((mid: string) => ownedModuleIds.includes(mid)).length : 0;
      return sanitized;
    });
  res.json(list);
});

// GET /api/companies/:slug — real per-user unlock & ownership state (Bearer token optional)
companiesRouter.get('/:slug', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const company = (db.companies || []).find((c: any) => c.slug === req.params.slug);
  if (!company) {
    return res.status(404).json({ error: 'Company vault not found' });
  }

  const userId = req.userId || '';
  const isAdmin = req.user?.role === 'admin';
  const ownedModuleIds = isAdmin ? (company.modules || []).filter((m: any) => m.is_premium).map((m: any) => m.id)
    : userId ? ownedModuleIdsFor(db, userId) : [];

  const premiumIds = (company.modules || []).filter((m: any) => m.is_premium).map((m: any) => m.id);
  const companyUnlocked = company.is_unlocked === true
    || (!!userId && (db.unlocks || []).some(
        (u: any) => u.user_id === userId && u.company_id === company.id && (u.status === 'active' || !u.status)
      ));
  const ownsEveryModule = premiumIds.length > 0 && premiumIds.every((mid: string) => ownedModuleIds.includes(mid));
  const isUnlocked = isAdmin || companyUnlocked || ownsEveryModule || premiumIds.length === 0;

  // Deep clone to avoid mutating in-memory db
  const sanitizedCompany = attachLiveStats(db, JSON.parse(JSON.stringify(company)));

  // Lock only PREMIUM module content the user has NOT individually owned.
  // Free modules remain fully readable — they are the honest showcase that sells the pack.
  if (sanitizedCompany.modules) {
    sanitizedCompany.modules.forEach((mod: any) => {
      const owned = isUnlocked || ownedModuleIds.includes(mod.id);
      if (mod.is_premium !== true || owned) return;

      // Redact the round pack guide (section_data) — previously leaked in full.
      mod.section_data = null;

      if (mod.items) {
        mod.items.forEach((item: any) => {
          if (!item.is_free_preview && item.blocks) {
            item.blocks.forEach((block: any) => {
              if (!block.payload) return;
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
            });
          }
        });
      }
    });
  }

  res.json({
    ...sanitizedCompany,
    is_unlocked: !!isUnlocked,
    owned_module_ids: ownedModuleIds,
    unlocked_company_ids: userId ? unlockedCompanyIds(db, userId) : [],
    module_access: isUnlocked ? 'full' : 'preview',
  });
});