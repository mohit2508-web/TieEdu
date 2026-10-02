import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { completePaidOrder, pushAudit } from '../payments/orders';
import { studyPlanAdminRouter } from './studyPlan.routes';
import { validateSectionData } from '../lib/sectionData';
import { requirePermission } from '../middleware/auth';

export const adminRouter = Router();

// Study plan templates are mounted under /api/admin/study-plans, so they inherit
// the requireAdmin guard applied to adminRouter in server.ts.
adminRouter.use('/study-plans', studyPlanAdminRouter);

// ------- Helpers -------

function findCompany(db: any, companyId: string) {
  return db.companies.find((c: any) => c.id === companyId);
}

function findModuleAndCompany(db: any, moduleId: string) {
  for (const c of db.companies || []) {
    if (c.modules) {
      const m = c.modules.find((mod: any) => mod.id === moduleId);
      if (m) return { company: c, module: m };
    }
  }
  return null;
}

function findItem(db: any, moduleId: string, itemId: string) {
  const found = findModuleAndCompany(db, moduleId);
  if (!found) return null;
  return found.module.items?.find((i: any) => i.id === itemId) || null;
}

function findItemAnywhere(db: any, itemId: string) {
  for (const c of db.companies || []) {
    for (const m of c.modules || []) {
      if (m.items) {
        const i = m.items.find((it: any) => it.id === itemId);
        if (i) return { company: c, module: m, item: i };
      }
    }
  }
  return null;
}

const sanitizeModuleForApi = (mod: any) => JSON.parse(JSON.stringify(mod));

// ============================================================
// COMPANY PROFILE FIELD POLICY
// ============================================================
// Two separate groups, because they have very different trust levels:
//
//  EDITORIAL_FIELDS  — a human assertion (CTC, difficulty, round notes...). Allowed,
//                       but the admin should attach provenance. Kept separate so
//                       the API never silently merges a request body into a company.
//  DERIVED_FIELDS    — counts and scores the SERVER owns. A request body value is
//                       always discarded; these are recomputed from the ledger on
//                       read (see lib/stats.ts). This is what stops a client from
//                       POSTing unlock_count: 9999 or accuracy_score: 98.
const EDITORIAL_FIELDS = [
  'name', 'slug', 'logo_url', 'industry', 'tags',
  'tagline', 'about', 'hq', 'founded_year', 'employee_band', 'careers_link',
  'difficulty_rating', 'avg_process_days', 'avg_rounds', 'ctc_min', 'ctc_max',
  'seo_title', 'seo_description', 'status',
  'rounds_pipeline', 'comparison_metrics', 'metric_sources', 'fact_checked_at',
] as const;

const DERIVED_FIELDS = [
  'id', 'unlock_count', 'accuracy_score', 'accuracy_report_count',
  'trust_stats', 'modules', 'is_unlocked', 'owned_module_ids',
  'premium_module_ids', 'premium_module_count', 'owned_module_count', 'module_count',
] as const;

const strOrNull = (v: any): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;
const numOrNull = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Coerce to a real boolean, or `fallback` when the value is not a boolean.
 *
 * `req.body.is_premium ?? true` used to store whatever arrived, so the string
 * `"false"` was persisted and then read back as truthy — a free module silently
 * becoming premium. Only genuine booleans are accepted; a form that posts
 * `"true"`/`"false"` should post real booleans, and this rejects the ambiguity
 * rather than guessing.
 */
const boolOr = (v: any, fallback: boolean): boolean =>
  typeof v === 'boolean' ? v : fallback;

/**
 * Validate and normalise a `section_data` payload supplied to a module route.
 *
 * `PUT /modules/:id` and `POST /companies/:id/modules` accept `section_data` just
 * like the dedicated `/section` route does, and both used to store the raw body.
 * That let a client bypass validation entirely: the same field that the pack
 * editor saves through a checked path could be written as an array, a bare
 * string, or unbounded text by any other caller. Returns a 400-able result so
 * the route can reject a body that is not an object at all.
 */
function normalizeSectionDataInput(input: unknown): { ok: true; value: Record<string, unknown>; warnings: string[] } | { ok: false; error: string } {
  if (input === null || input === undefined) return { ok: true, value: null as any, warnings: [] };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'section_data must be an object' };
  }
  const { data, warnings } = validateSectionData(input);
  return { ok: true, value: data, warnings };
}

/** Validate a metric_sources payload: keep only real provenance records. */
function sanitizeProvenance(input: any): Record<string, any> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      out[key] = null;
      continue;
    }
    const v = value as any;
    const source = strOrNull(v.source);
    // An empty source means "not verified" — store an explicit null so the UI can
    // show the gap instead of silently inheriting a stale record.
    out[key] = source
      ? {
          source,
          verified_at: strOrNull(v.verified_at) || new Date().toISOString().slice(0, 10),
          ...(strOrNull(v.note) ? { note: strOrNull(v.note) } : {}),
        }
      : null;
  }
  return out;
}

/** Only { round_1_oa, round_2_tech, round_3_system_design, round_4_hr } notes survive. */
function sanitizeComparisonMetrics(input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out: Record<string, any> = {};
  for (const key of ['round_1_oa', 'round_2_tech', 'round_3_system_design', 'round_4_hr']) {
    const v = strOrNull(input[key]);
    if (v) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Round types the compare pipeline and module reader understand. */
const ROUND_TYPES = ['OA', 'Technical', 'System Design', 'HR'] as const;

/**
 * The pipeline renders verbatim on the public company page, so it is validated
 * as strictly as the comparison notes: a step with no round_type, an unknown
 * round_type, or a non-numeric module_count is dropped rather than shown.
 */
function sanitizeRoundsPipeline(input: any) {
  if (!Array.isArray(input)) return [];
  const out: any[] = [];
  for (const step of input) {
    if (!step || typeof step !== 'object' || Array.isArray(step)) continue;
    const roundType = strOrNull((step as any).round_type);
    if (!roundType || !(ROUND_TYPES as readonly string[]).includes(roundType)) continue;
    out.push({
      step_number: out.length + 1,
      round_type: roundType,
      title: strOrNull((step as any).title) || roundType,
      subtitle: strOrNull((step as any).subtitle) || '',
      difficulty: 'medium',
      module_count: numOrNull((step as any).module_count) ?? 0,
    });
  }
  return out;
}

// ============================================================
// COMPANIES
// ============================================================

// GET /api/admin/companies — List all companies for admin
adminRouter.get('/companies', requirePermission('companies.read'), (req: Request, res: Response) => {
  const db = loadDb();
  res.json(db.companies || []);
});

// GET /api/admin/companies/:id — Full company with modules for editing
adminRouter.get('/companies/:id', requirePermission('companies.read'), (req: Request, res: Response) => {
  const db = loadDb();
  const company = findCompany(db, req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json(company);
});

// POST /api/admin/companies — Create a new company vault
//
// Everything starts EMPTY on purpose. A brand-new vault has no modules, no
// reports and no verified figures, so it must not claim an industry, must not
// carry an SEO description promising "verified round-by-round intelligence", and
// must not ship a pre-filled trust_stats shape. Every field below is either the
// admin's own input or null, and the public UI renders the nulls honestly.
adminRouter.post('/companies', requirePermission('companies.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Company name is required' });

  let slug = req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (db.companies.some((c: any) => c.slug === slug)) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const newCompany = {
    id: `comp-${Date.now()}`,
    slug,
    name,
    logo_url: strOrNull(req.body.logo_url) || '',
    industry: strOrNull(req.body.industry),
    tags: Array.isArray(req.body.tags) ? req.body.tags.filter((t: any) => typeof t === 'string') : [],
    tagline: strOrNull(req.body.tagline),
    about: strOrNull(req.body.about),
    hq: strOrNull(req.body.hq),
    founded_year: numOrNull(req.body.founded_year),
    employee_band: strOrNull(req.body.employee_band),
    careers_link: strOrNull(req.body.careers_link),
    difficulty_rating: numOrNull(req.body.difficulty_rating),
    avg_process_days: numOrNull(req.body.avg_process_days),
    avg_rounds: numOrNull(req.body.avg_rounds),
    ctc_min: numOrNull(req.body.ctc_min),
    ctc_max: numOrNull(req.body.ctc_max),
    fact_checked_at: strOrNull(req.body.fact_checked_at),
    metric_sources: sanitizeProvenance(req.body.metric_sources),
    // Derived — recomputed on every read, never accepted from the client.
    unlock_count: 0,
    accuracy_score: null,
    accuracy_report_count: 0,
    last_updated_days_ago: 0,
    status: req.body.status === 'published' ? 'published' : 'draft',
    // Left empty on purpose. Generating "Verified round-by-round interview
    // intelligence for <name>" for a vault with zero content is a false claim in
    // a meta tag, which is exactly the sort of invented credibility we refuse.
    seo_title: strOrNull(req.body.seo_title),
    seo_description: strOrNull(req.body.seo_description),
    rounds_pipeline: sanitizeRoundsPipeline(req.body.rounds_pipeline),
    comparison_metrics: sanitizeComparisonMetrics(req.body.comparison_metrics),
    modules: []
  };

  db.companies.unshift(newCompany);
  // Audit BEFORE save: pushAudit only mutates the in-memory object graph, so a
  // saveDb() first would drop the entry and the vault would change with no trail.
  pushAudit(db, {
    action: 'company.create',
    actor: req.userId || 'admin',
    detail: `Created company vault "${name}" as ${newCompany.status}`,
    meta: { company_id: newCompany.id, slug: newCompany.slug },
  });
  saveDb(db);
  res.status(201).json({ status: 'success', company: newCompany });
});

// PUT /api/admin/companies/:id — Update company profile (whitelisted fields only)
//
// A blanket `...req.body` spread used to let a request overwrite derived fields
// (unlock_count, accuracy_score, trust_stats) or the id/slug chain. Now only
// EDITORIAL_FIELDS are accepted and each is validated by type.
adminRouter.put('/companies/:id', requirePermission('companies.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const compIndex = db.companies.findIndex((c: any) => c.id === req.params.id);
  if (compIndex === -1) return res.status(404).json({ error: 'Company not found' });

  const current = db.companies[compIndex];
  const body = req.body || {};
  const next: any = { ...current };

  for (const field of EDITORIAL_FIELDS) {
    if (!(field in body)) continue;
    switch (field) {
      case 'name': {
        const v = strOrNull(body.name);
        if (!v) return res.status(400).json({ error: 'Company name cannot be empty' });
        next.name = v;
        break;
      }
      case 'slug': {
        const v = strOrNull(body.slug);
        if (v) {
          const clash = db.companies.some((c: any) => c.slug === v && c.id !== current.id);
          if (clash) return res.status(409).json({ error: `Slug "${v}" is already used by another company` });
          next.slug = v;
        }
        break;
      }
      case 'tags':
        next.tags = Array.isArray(body.tags) ? body.tags.filter((t: any) => typeof t === 'string' && t.trim()) : [];
        break;
      case 'status':
        next.status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : current.status;
        break;
      case 'difficulty_rating':
      case 'avg_process_days':
      case 'avg_rounds':
      case 'ctc_min':
      case 'ctc_max':
      case 'founded_year':
        next[field] = numOrNull(body[field]);
        break;
      case 'metric_sources':
        next.metric_sources = sanitizeProvenance(body.metric_sources);
        break;
      case 'comparison_metrics':
        next.comparison_metrics = sanitizeComparisonMetrics(body.comparison_metrics);
        break;
      case 'rounds_pipeline':
        next.rounds_pipeline = sanitizeRoundsPipeline(body.rounds_pipeline);
        break;
      case 'fact_checked_at': {
        // The public page prints this as "fact-checked on <date>", so reject
        // anything that is not a real calendar date.
        const v = strOrNull(body.fact_checked_at);
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          return res.status(400).json({ error: 'fact_checked_at must be YYYY-MM-DD' });
        }
        next.fact_checked_at = v;
        break;
      }
      default:
        next[field] = strOrNull(body[field]);
    }
  }

  next.id = current.id;
  next.last_updated_days_ago = 0;
  db.companies[compIndex] = next;

  const changed = Object.keys(body).filter((k) => (EDITORIAL_FIELDS as readonly string[]).includes(k));
  // Audit before save — see the create handler above for why order matters.
  pushAudit(db, {
    action: 'company.update',
    actor: req.userId || 'admin',
    detail: `Updated ${changed.join(', ') || 'no fields'}`,
    meta: { company_id: next.id, fields: changed },
  });
  saveDb(db);

  res.json({ status: 'success', company: next });
});

// DELETE /api/admin/companies/:id — Delete company
adminRouter.delete('/companies/:id', requirePermission('companies.delete'), (req: Request, res: Response) => {
  const db = loadDb();
  db.companies = db.companies.filter((c: any) => c.id !== req.params.id);
  saveDb(db);
  res.json({ status: 'success', message: 'Company removed' });
});

// ============================================================
// MODULES
// ============================================================

// POST /api/admin/companies/:id/modules — Add module to company
//
// round_type and title are NOT defaulted. Defaulting round_type to 'OA' made a
// brand-new blank module claim a place in a hiring round, which then showed up in
// the comparison matrix as if the company actually ran an online assessment. The
// UI sends both explicitly; when absent we store null and the module is simply
// unclassified until an admin says what it is.
adminRouter.post('/companies/:id/modules', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const company = findCompany(db, req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  if (!company.modules) company.modules = [];

  // section_data goes through the same validator as the dedicated /section
  // route. Storing the raw body here meant a module created via this endpoint
  // could hold content the pack editor and the reader would both choke on.
  const sectionInput = normalizeSectionDataInput(req.body?.section_data);
  if (!sectionInput.ok) return res.status(400).json({ error: sectionInput.error });

  const newModule = {
    id: `mod-${Date.now()}`,
    company_id: company.id,
    module_type: strOrNull(req.body.module_type),
    round_type: strOrNull(req.body.round_type),
    title: strOrNull(req.body.title) || 'Untitled module',
    description: strOrNull(req.body.description),
    sort_order: numOrNull(req.body.sort_order) ?? (company.modules.length + 1),
    is_premium: boolOr(req.body.is_premium, true),
    price: numOrNull(req.body.price),
    // Never auto-generated. A module with no authored section renders an honest
    // "not published yet" state in the reader.
    section_data: sectionInput.value,
    items: []
  };

  company.modules.push(newModule);
  company.last_updated_days_ago = 0;
  saveDb(db);
  pushAudit(db, {
    action: 'module.create',
    detail: `Created module "${newModule.title}" (${newModule.id}) on company ${company.id}`,
    meta: { company_id: company.id, module_id: newModule.id },
  });
  res.status(201).json({ status: 'success', module: newModule, warnings: sectionInput.warnings });
});

// PUT /api/admin/modules/:id — Update module (title, type, round, price, premium, sort)
adminRouter.put('/modules/:id', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const found = findModuleAndCompany(db, req.params.id);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  // Same validation as the dedicated /section route. Without it, this endpoint
  // was a way to write arbitrary, unbounded, un-normalised section_data and
  // sidestep every rule the pack editor relies on.
  let sectionWarnings: string[] = [];
  let normalizedSection: Record<string, unknown> | null | undefined;
  if (req.body?.section_data !== undefined) {
    const sectionInput = normalizeSectionDataInput(req.body.section_data);
    if (!sectionInput.ok) return res.status(400).json({ error: sectionInput.error });
    sectionWarnings = sectionInput.warnings;
    normalizedSection = sectionInput.value;
  }

  const { module, company } = found;
  module.title = req.body.title !== undefined ? (strOrNull(req.body.title) ?? module.title) : module.title;
  module.module_type = req.body.module_type !== undefined ? strOrNull(req.body.module_type) : module.module_type;
  module.round_type = req.body.round_type !== undefined ? strOrNull(req.body.round_type) : module.round_type;
  module.description = req.body.description !== undefined ? strOrNull(req.body.description) : module.description;
  module.is_premium = req.body.is_premium !== undefined ? boolOr(req.body.is_premium, module.is_premium !== false) : module.is_premium;
  // numOrNull so a posted price of "abc" becomes null instead of the string
  // "abc", which would render as a broken amount on the checkout page.
  module.price = req.body.price !== undefined ? numOrNull(req.body.price) : module.price;
  module.sort_order = req.body.sort_order !== undefined
    ? (numOrNull(req.body.sort_order) ?? module.sort_order)
    : module.sort_order;
  if (normalizedSection !== undefined) {
    module.section_data = normalizedSection as any;
  }

  company.last_updated_days_ago = 0;
  saveDb(db);
  pushAudit(db, {
    action: 'module.update',
    detail: `Updated module "${module.title}" (${module.id})${normalizedSection !== undefined ? ' including section_data' : ''}`,
    meta: { company_id: company.id, module_id: module.id, section_data_updated: normalizedSection !== undefined },
  });
  res.json({ status: 'success', module: sanitizeModuleForApi(module), warnings: sectionWarnings });
});

// DELETE /api/admin/modules/:id — Delete module
adminRouter.delete('/modules/:id', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const found = findModuleAndCompany(db, req.params.id);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  found.company.modules = found.company.modules.filter((m: any) => m.id !== req.params.id);
  found.company.last_updated_days_ago = 0;
  saveDb(db);
  res.json({ status: 'success', message: 'Module removed' });
});

// POST /api/admin/companies/:id/modules/reorder — Reorder modules by id list
adminRouter.post('/companies/:id/modules/reorder', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const company = findCompany(db, req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const orderedIds: string[] = req.body.module_ids || [];
  const moduleMap = new Map<string, any>((company.modules || []).map((m: any) => [m.id, m]));
  company.modules = orderedIds
    .map((id, idx) => {
      const m = moduleMap.get(id);
      if (!m) return null;
      m.sort_order = idx + 1;
      return m;
    })
    .filter(Boolean);

  saveDb(db);
  res.json({ status: 'success', modules: company.modules });
});

// PUT /api/admin/modules/:id/section — Save full 7-section pack (section_data)
adminRouter.put('/modules/:id/section', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const found = findModuleAndCompany(db, req.params.id);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  // The body is validated and clamped before it is stored. Previously the raw body
  // was assigned straight onto the module, so a mistyped or oversized payload was
  // persisted and only surfaced when a student opened the pack.
  if (
    req.body !== undefined &&
    (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body))
  ) {
    return res.status(400).json({ error: 'section_data must be an object' });
  }
  const { data, warnings } = validateSectionData(req.body ?? {});

  const { module, company } = found;
  module.section_data = data as any;
  company.last_updated_days_ago = 0;
  saveDb(db);
  // Consistent with the study-plan routes: a pack is the whole point of a module,
  // so overwriting it should leave a trace of who did it and what was rejected.
  pushAudit(db, {
    action: 'module.section_save',
    detail: `Saved pack for module "${module.title}" (${module.id}) on company ${company.id}`,
    meta: { company_id: company.id, module_id: module.id, warnings },
  });
  res.json({ status: 'success', section_data: module.section_data, warnings });
});

// ============================================================
// ITEMS (Q&A) + BLOCKS
// ============================================================

// POST /api/admin/modules/:id/items — Add question item to module
adminRouter.post('/modules/:id/items', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const found = findModuleAndCompany(db, req.params.id);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  const { module, company } = found;
  const newItem = {
    id: `item-${Date.now()}`,
    module_id: module.id,
    question_text: req.body.question_text || 'New Interview Question',
    is_free_preview: req.body.is_free_preview ?? false,
    difficulty: req.body.difficulty || 'medium',
    role_tag: req.body.role_tag || 'SDE-1',
    frequency_tag: req.body.frequency_tag || 'high',
    round_type: req.body.round_type ?? module.round_type,
    status: req.body.status || 'published',
    comments_count: 0,
    upvotes_count: 0,
    blocks: req.body.blocks || []
  };

  if (!module.items) module.items = [];
  module.items.unshift(newItem);
  company.last_updated_days_ago = 0;
  saveDb(db);
  res.status(201).json({ status: 'success', item: newItem });
});

// PUT /api/admin/modules/:id/items/:itemId — Update item
adminRouter.put('/modules/:id/items/:itemId', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const item = findItem(db, req.params.id, req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  item.question_text = req.body.question_text ?? item.question_text;
  item.is_free_preview = req.body.is_free_preview ?? item.is_free_preview;
  item.difficulty = req.body.difficulty ?? item.difficulty;
  item.role_tag = req.body.role_tag ?? item.role_tag;
  item.frequency_tag = req.body.frequency_tag ?? item.frequency_tag;
  item.status = req.body.status ?? item.status;
  if (req.body.blocks !== undefined) item.blocks = req.body.blocks;

  const found = findModuleAndCompany(db, req.params.id);
  if (found) found.company.last_updated_days_ago = 0;
  saveDb(db);
  res.json({ status: 'success', item });
});

// DELETE /api/admin/modules/:id/items/:itemId — Delete item
adminRouter.delete('/modules/:id/items/:itemId', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const found = findModuleAndCompany(db, req.params.id);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  found.module.items = (found.module.items || []).filter((i: any) => i.id !== req.params.itemId);
  found.company.last_updated_days_ago = 0;
  saveDb(db);
  res.json({ status: 'success', message: 'Item removed' });
});

// POST /api/admin/items/:itemId/blocks — Add block to item
adminRouter.post('/items/:itemId/blocks', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const found = findItemAnywhere(db, req.params.itemId);
  if (!found) return res.status(404).json({ error: 'Item not found' });

  const { item, company } = found;
  if (!item.blocks) item.blocks = [];

  const nextOrder = item.blocks.length
    ? Math.max(...item.blocks.map((b: any) => b.block_order || 0)) + 1
    : 1;

  const newBlock = {
    id: `b-${Date.now()}`,
    block_type: req.body.block_type || 'markdown',
    block_order: req.body.block_order ?? nextOrder,
    payload: req.body.payload || {}
  };

  item.blocks.push(newBlock);
  item.blocks.sort((a: any, b: any) => a.block_order - b.block_order);
  company.last_updated_days_ago = 0;
  saveDb(db);
  res.status(201).json({ status: 'success', block: newBlock });
});

// PUT /api/admin/items/:itemId/blocks/:blockId — Update block
adminRouter.put('/items/:itemId/blocks/:blockId', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const found = findItemAnywhere(db, req.params.itemId);
  if (!found) return res.status(404).json({ error: 'Item not found' });

  const { item, company } = found;
  const block = item.blocks?.find((b: any) => b.id === req.params.blockId);
  if (!block) return res.status(404).json({ error: 'Block not found' });

  block.block_type = req.body.block_type ?? block.block_type;
  block.block_order = req.body.block_order ?? block.block_order;
  block.payload = req.body.payload !== undefined ? req.body.payload : block.payload;

  company.last_updated_days_ago = 0;
  saveDb(db);
  res.json({ status: 'success', block });
});

// DELETE /api/admin/items/:itemId/blocks/:blockId — Delete block
adminRouter.delete('/items/:itemId/blocks/:blockId', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const found = findItemAnywhere(db, req.params.itemId);
  if (!found) return res.status(404).json({ error: 'Item not found' });

  const { item, company } = found;
  item.blocks = (item.blocks || []).filter((b: any) => b.id !== req.params.blockId);
  company.last_updated_days_ago = 0;
  saveDb(db);
  res.json({ status: 'success', message: 'Block removed' });
});

// POST /api/admin/items/:itemId/blocks/reorder — Reorder blocks by id list
adminRouter.post('/items/:itemId/blocks/reorder', requirePermission('modules.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const found = findItemAnywhere(db, req.params.itemId);
  if (!found) return res.status(404).json({ error: 'Item not found' });

  const { item, company } = found;
  const orderedIds: string[] = req.body.block_ids || [];
  const blockMap = new Map<string, any>((item.blocks || []).map((b: any) => [b.id, b]));
  item.blocks = orderedIds
    .map((id, idx) => {
      const b = blockMap.get(id);
      if (!b) return null;
      b.block_order = idx + 1;
      return b;
    })
    .filter(Boolean);

  company.last_updated_days_ago = 0;
  saveDb(db);
  res.json({ status: 'success', blocks: item.blocks });
});

// ============================================================
// COUPONS
// ============================================================

// GET /api/admin/coupons — List all coupons
adminRouter.get('/coupons', requirePermission('coupons.read'), (req: Request, res: Response) => {
  const db = loadDb();
  res.json(db.coupons || []);
});

// POST /api/admin/coupons — Create coupon
adminRouter.post('/coupons', requirePermission('coupons.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const code = (req.body.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Coupon code is required' });
  if ((db.coupons || []).some((c: any) => c.code === code)) {
    return res.status(409).json({ error: 'Coupon code already exists' });
  }

  const newCoupon = {
    id: `coup-${Date.now()}`,
    code,
    discount_percent: req.body.discount_percent || 0,
    discount_flat: req.body.discount_flat || 0,
    is_active: req.body.is_active ?? true,
    max_uses: req.body.max_uses || 0,
    uses: 0,
    label: req.body.label || `${code} Discount`
  };

  if (!db.coupons) db.coupons = [];
  db.coupons.push(newCoupon);
  saveDb(db);
  res.status(201).json({ status: 'success', coupon: newCoupon });
});

// PUT /api/admin/coupons/:id — Update coupon
adminRouter.put('/coupons/:id', requirePermission('coupons.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const coupon = (db.coupons || []).find((c: any) => c.id === req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

  coupon.code = req.body.code || coupon.code;
  coupon.discount_percent = req.body.discount_percent ?? coupon.discount_percent;
  coupon.discount_flat = req.body.discount_flat ?? coupon.discount_flat;
  coupon.is_active = req.body.is_active ?? coupon.is_active;
  coupon.max_uses = req.body.max_uses ?? coupon.max_uses;
  coupon.label = req.body.label ?? coupon.label;

  saveDb(db);
  res.json({ status: 'success', coupon });
});

// DELETE /api/admin/coupons/:id — Delete coupon
adminRouter.delete('/coupons/:id', requirePermission('coupons.write'), (req: Request, res: Response) => {
  const db = loadDb();
  db.coupons = (db.coupons || []).filter((c: any) => c.id !== req.params.id);
  saveDb(db);
  res.json({ status: 'success', message: 'Coupon removed' });
});

// ============================================================
// ADMIN READ OPS — Orders, Users, Settings (Phase Ad)
// ============================================================

// GET /api/admin/orders — All orders with buyer email/name (joined live)
adminRouter.get('/orders', requirePermission('orders.read'), (req: Request, res: Response) => {
  const db = loadDb();
  const q = (req.query.q as string || '').trim().toLowerCase();
  const status = (req.query.status as string || '').trim();

  const userById = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));

  let orders = (db.orders || []).map((o: any) => {
    const u = userById.get(o.user_id);
    return {
      id: o.id,
      user_id: o.user_id,
      user_name: u?.name || 'Guest / Deactivated',
      user_email: u?.email || '—',
      amount_paisa: o.amount_paisa || 0,
      amount_inr: Math.round((o.amount_paisa || 0) / 100 * 100) / 100,
      base_amount_paisa: o.base_amount_paisa || 0,
      discount_paisa: o.discount_paisa || 0,
      status: o.status || 'created',
      coupon_code: o.coupon_code || null,
      items: (o.items || []).map((i: any) => ({ kind: i.kind || 'company', name: i.name || 'Unnamed', module_title: i.module_title || null })),
      item_names: (o.items || []).map((i: any) => i.name).filter(Boolean),
      created_at: o.created_at,
      paid_at: o.paid_at || null
    };
  });

  if (status) orders = orders.filter((o: any) => o.status === status);
  if (q) {
    orders = orders.filter((o: any) =>
      o.id.toLowerCase().includes(q) ||
      o.user_name.toLowerCase().includes(q) ||
      o.user_email.toLowerCase().includes(q) ||
      o.item_names.join(' ').toLowerCase().includes(q)
    );
  }

  orders.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));

  const paid = orders.filter((o: any) => o.status === 'paid');
  const revenue = Math.round(paid.reduce((s: number, o: any) => s + (o.amount_inr || 0), 0) * 100) / 100;
  const today = new Date().toISOString().split('T')[0];
  const todayRevenue = Math.round(paid.filter((o: any) => o.paid_at?.split('T')[0] === today).reduce((s: number, o: any) => s + (o.amount_inr || 0), 0) * 100) / 100;

  res.json({
    status: 'success',
    orders,
    meta: {
      total: orders.length,
      paid: paid.length,
      created: orders.filter((o: any) => o.status === 'created').length,
      revenue_inr: revenue,
      today_revenue_inr: todayRevenue
    }
  });
});

// GET /api/admin/payments/pending — UPI orders awaiting manual verification (real money → real unlock)
adminRouter.get('/payments/pending', requirePermission('orders.verify'), (req: Request, res: Response) => {
  const db = loadDb();
  const userById = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  const pending = (db.orders || [])
    .filter((o: any) => o.status === 'awaiting_verification')
    .sort((a: any, b: any) => (b.payment_confirmed_at || b.created_at || '').localeCompare(a.payment_confirmed_at || a.created_at || ''))
    .map((o: any) => {
      const u = userById.get(o.user_id);
      return {
        id: o.id,
        user_id: o.user_id,
        user_name: u?.name || 'Unknown',
        user_email: u?.email || '—',
        amount_paisa: o.amount_paisa || 0,
        amount_inr: Math.round((o.amount_paisa || 0) / 100 * 100) / 100,
        coupon_code: o.coupon_code || null,
        item_names: (o.items || []).map((i: any) => i.name).filter(Boolean),
        confirmed_at: o.payment_confirmed_at || o.created_at,
        created_at: o.created_at,
      };
    });
  res.json({ status: 'success', pending });
});

// POST /api/admin/payments/:id/verify — Admin confirms the UPI transfer → real unlock
adminRouter.post('/payments/:id/verify', requirePermission('orders.verify'), (req: Request, res: Response) => {
  const db = loadDb();
  const order = (db.orders || []).find((o: any) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'paid') {
    return res.json({ status: 'success', message: 'Order already paid', order });
  }
  if (order.status !== 'awaiting_verification') {
    return res.status(400).json({ error: 'Order is not awaiting verification' });
  }

  order.verified_by = req.user!.id;
  order.verified_at = new Date().toISOString();
  completePaidOrder(db, order, order.user_id);
  pushAudit(db, {
    actor: req.user!.id,
    action: 'payment.verified.manual',
    detail: `Admin verified UPI payment for ${order.id} (₹${(order.amount_paisa || 0) / 100})`,
    order_id: order.id,
    gateway: 'upi',
  });
  saveDb(db);
  res.json({ status: 'success', message: 'Payment verified — vault unlocked for the student', order });
});

// POST /api/admin/payments/:id/reject — Admin couldn't verify the transfer → honest rejection
adminRouter.post('/payments/:id/reject', requirePermission('orders.verify'), (req: Request, res: Response) => {
  const db = loadDb();
  const order = (db.orders || []).find((o: any) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'paid') {
    return res.status(400).json({ error: 'Order is already paid' });
  }
  if (order.status !== 'awaiting_verification') {
    return res.status(400).json({ error: 'Order is not awaiting verification' });
  }

  order.status = 'rejected';
  order.rejected_at = new Date().toISOString();
  order.reject_reason = (req.body.reason || '').toString().trim() || null;
  pushAudit(db, {
    actor: req.user!.id,
    action: 'payment.rejected.manual',
    detail: `Admin could not verify UPI payment for ${order.id}${order.reject_reason ? ` — ${order.reject_reason}` : ''}`,
    order_id: order.id,
    gateway: 'upi',
  });
  saveDb(db);
  res.json({ status: 'success', message: 'Payment rejected — student will be notified', order });
});

// GET /api/admin/users — All users with live usage counts
adminRouter.get('/users', requirePermission('users.read'), (req: Request, res: Response) => {
  const db = loadDb();
  const q = (req.query.q as string || '').trim().toLowerCase();

  const paidOrdersByUser = new Map<string, any[]>();
  (db.orders || []).forEach((o: any) => {
    if (o.status !== 'paid') return;
    if (!paidOrdersByUser.has(o.user_id)) paidOrdersByUser.set(o.user_id, []);
    paidOrdersByUser.get(o.user_id)!.push(o);
  });

  const unlocksByUser = new Map<string, number>();
  (db.unlocks || []).forEach((u: any) => {
    if (u.status !== 'active' && u.status) return;
    unlocksByUser.set(u.user_id, (unlocksByUser.get(u.user_id) || 0) + 1);
  });

  const reportsByUser = new Map<string, number>();
  (db.reports || []).forEach((r: any) => {
    if (!r.user_id) return;
    reportsByUser.set(r.user_id, (reportsByUser.get(r.user_id) || 0) + 1);
  });

  let users = (db.users || []).map((u: any) => {
    const paid = paidOrdersByUser.get(u.id) || [];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      disabled: !!u.disabled,
      xp: u.xp || 0,
      streak: u.streak || 0,
      college: u.college || null,
      badge: u.badge || null,
      created_at: u.created_at,
      orders_count: paid.length,
      revenue_inr: Math.round(paid.reduce((s: number, o: any) => s + ((o.amount_paisa || 0) / 100), 0) * 100) / 100,
      unlocks_count: unlocksByUser.get(u.id) || 0,
      reports_count: reportsByUser.get(u.id) || 0
    };
  });

  if (q) users = users.filter((u: any) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  users.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));

  res.json({ status: 'success', users, meta: { total: users.length, active: users.filter((u: any) => !u.disabled).length, disabled: users.filter((u: any) => u.disabled).length } });
});

// PUT /api/admin/users/:id/status — Enable/disable a user account
adminRouter.put('/users/:id/status', requirePermission('users.status'), (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: any) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const disabled = !!req.body.disabled;
  if (user.role === 'admin' && disabled) {
    return res.status(400).json({ error: 'Admin accounts cannot be disabled from here' });
  }

  user.disabled = disabled;
  saveDb(db);
  res.json({ status: 'success', message: disabled ? 'Account disabled' : 'Account enabled', user: { id: user.id, email: user.email, disabled: user.disabled } });
});

// GET /api/admin/settings — Platform settings (read)
adminRouter.get('/settings', requirePermission('settings.read'), (req: Request, res: Response) => {
  const db = loadDb();
  const defaults = {
    platform_name: 'TieEdu',
    support_email: 'support@tieedu.in',
    upi_id: '',
    upi_qr: '',
    merchant_name: 'TieEdu',
    upi_instructions: 'Scan with any UPI app (Paytm, GPay, PhonePe) and transfer the exact amount.',
  };
  res.json({ status: 'success', settings: { ...defaults, ...(db.settings || {}) } });
});

// PUT /api/admin/settings — Update platform settings (persist to db.settings)
adminRouter.put('/settings', requirePermission('settings.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const next = { ...(db.settings || {}) };
  if (typeof req.body.platform_name === 'string' && req.body.platform_name.trim()) next.platform_name = req.body.platform_name.trim().slice(0, 60);
  if (typeof req.body.support_email === 'string' && req.body.support_email.trim()) next.support_email = req.body.support_email.trim().slice(0, 120);
  if (typeof req.body.upi_id === 'string') next.upi_id = req.body.upi_id.trim().slice(0, 120);
  if (typeof req.body.upi_qr === 'string') next.upi_qr = req.body.upi_qr.trim();
  if (typeof req.body.merchant_name === 'string' && req.body.merchant_name.trim()) next.merchant_name = req.body.merchant_name.trim().slice(0, 60);
  if (typeof req.body.upi_instructions === 'string') next.upi_instructions = req.body.upi_instructions.trim().slice(0, 500);
  db.settings = next;
  saveDb(db);
  res.json({ status: 'success', message: 'Settings saved', settings: next });
});

// GET /api/admin/audit — Recent platform audit events (order lifecycle transparency)
adminRouter.get('/audit', requirePermission('audit.read'), (req: Request, res: Response) => {
  const db = loadDb();
  const q = (req.query.q as string || '').trim().toLowerCase();
  let entries = (db.audit || []).slice();
  if (q) entries = entries.filter((a: any) => (a.order_id || '').toLowerCase().includes(q) || (a.action || '').toLowerCase().includes(q) || (a.detail || '').toLowerCase().includes(q));
  entries.sort((a: any, b: any) => (b.at || '').localeCompare(a.at || ''));
  res.json({ status: 'success', entries: entries.slice(0, 60), total: entries.length });
});

// ============================================================
// LEGACY — POST /api/admin/blocks (kept for BlockEditorModal)
// ============================================================

adminRouter.post('/blocks', requirePermission('modules.write'), (req: Request, res: Response) => {
  const { company_name, round_title, question_text, block_type, payload_content } = req.body;
  const db = loadDb();

  const company = db.companies.find((c: any) => c.name.toLowerCase() === (company_name || '').toLowerCase()) || db.companies[0];

  if (!company.modules) company.modules = [];

  let module = company.modules.find((m: any) => m.title === round_title);
  if (!module) {
    module = {
      id: `mod-${Date.now()}`,
      company_id: company.id,
      module_type: 'technical_question',
      round_type: 'Technical',
      title: round_title || 'Technical Round: Added via CMS',
      sort_order: company.modules.length + 1,
      is_premium: true,
      items: []
    };
    company.modules.push(module);
  }

  if (!module.items) module.items = [];

  const newItem = {
    id: `item-${Date.now()}`,
    module_id: module.id,
    question_text: question_text || 'New CMS Intelligence Question',
    is_free_preview: true,
    difficulty: 'medium',
    role_tag: 'SDE Core',
    frequency_tag: 'high',
    status: 'published',
    comments_count: 0,
    upvotes_count: 1,
    blocks: [
      {
        id: `b-${Date.now()}`,
        block_type: block_type || 'markdown',
        block_order: 1,
        payload: block_type === 'diagram' ? { source: payload_content } : block_type === 'code' ? { code: payload_content, language: 'javascript' } : { text: payload_content }
      }
    ]
  };

  module.items.unshift(newItem);
  company.last_updated_days_ago = 0;

  saveDb(db);

  res.status(201).json({
    status: 'success',
    message: `Content block successfully added to ${company.name} vault!`,
    item: newItem
  });
});