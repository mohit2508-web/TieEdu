import { Router, Request, Response } from 'express';
import { touchStreak } from '../lib/streak';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { loadDb, saveDb } from '../data/db';
import { rateLimit, requireAuth, requirePermission } from '../middleware/auth';
import { appendAudit } from '../store/audit';
import {
  CompanyPageDoc,
  MAX_CONTENT_BYTES,
  MEDIA_NAME_RE,
  PageContent,
  TEMPLATES,
  applyDueSchedule,
  companyPackCap,
  contentBytes,
  findPage,
  isTemplateKey,
  newPageDoc,
  pagesOf,
  publishContent,
  sanitizeContent,
  schemaPayload,
  templateContent,
  validateForPublish,
} from '../lib/companyPage';
import {
  RadarError,
  computeTrack,
  confirmRadarReport,
  createRadarReport,
  driveStatusSuggestion,
  findProfile,
  isWatching,
  moderateRadarReport,
  newAdminRadarUpdates,
  notifyWatchers,
  pageStats,
  profileView,
  publicRadar,
  radarOf,
  recordDaily,
  recordPageEvent,
  setWatching,
  startStreakReminderScheduler,
  updateProfile,
} from '../lib/companyPageStudent';
import { studentPage } from '../lib/companyPageDerive';

// Evening streak reminders for live pages that opt in. Idempotent; unref'd.
startStreakReminderScheduler();

/*
 * Company Page Studio API.
 *
 * Every write handler below is fully synchronous between `loadDb()` and
 * `saveDb()`. Audit rows are pushed into the document synchronously by
 * `appendAudit` before its first await, so the call is started, the document is
 * saved, and only then is the relational copy awaited. Push alerts likewise go
 * out after the save. Holding a loaded snapshot across an await would let a
 * concurrent request's write be silently overwritten by this one's stale copy.
 */

const MEDIA_DIR = path.join(__dirname, '../../uploads/company-pages');
fs.mkdirSync(MEDIA_DIR, { recursive: true });

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MEDIA_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase().replace('.jpeg', '.jpg');
      const safe = ['.jpg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `cp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safe}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype) && ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) cb(null, true);
    else cb(new Error('Use a JPG, PNG or WebP image.'));
  },
}).single('file');

/** Promotes a due schedule and reports whether the store needs saving. */
function promoteDue(db: any, companyId: string): boolean {
  const doc = findPage(db, companyId);
  return !!doc && applyDueSchedule(doc);
}

// ---------------------------------------------------------------------------
// Public — published content only. Drafts never leave the admin API.
// ---------------------------------------------------------------------------

export const companyPagesRouter = Router();

companyPagesRouter.get('/media/:name', (req: Request, res: Response) => {
  if (!MEDIA_NAME_RE.test(req.params.name)) return res.status(404).end();
  const file = path.join(MEDIA_DIR, req.params.name);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.sendFile(file);
});

/**
 * The live company + page for a slug, or null. Promotes a due schedule first.
 *
 * Three cases:
 *  - an admin published a page and it is on   -> that page
 *  - an admin published one and switched it off -> null (the old layout, by choice)
 *  - nothing published yet (no doc, or a draft) -> a page derived from the
 *    company's own data (`companyPageDerive`), so every company gets the new
 *    layout without waiting on the Studio. `doc` is null for these.
 */
function live(db: any, slug: string): { company: any; doc: CompanyPageDoc | null; page: PageContent; derived: boolean } | null {
  const company = (db.companies || []).find((c: any) => c.slug === slug);
  if (!company || company.status !== 'published') return null;
  if (promoteDue(db, company.id)) saveDb(db);
  const hit = studentPage(db, company);
  return hit ? { company, ...hit } : null;
}

companyPagesRouter.get('/:slug', (req: Request, res: Response) => {
  const db = loadDb();
  const hit = live(db, req.params.slug);
  if (!hit) return res.json({ enabled: false });

  res.setHeader('Cache-Control', 'public, max-age=30');
  res.json({
    enabled: true,
    page: hit.page,
    derived: hit.derived,
    published_at: hit.doc?.published_at ?? null,
    pack_price_cap: companyPackCap(db, hit.company.id),
    radar: publicRadar(db, hit.company.id, hit.page, null),
  });
});

function liveOr404(req: Request, res: Response) {
  const db = loadDb();
  const hit = live(db, req.params.slug);
  if (!hit) {
    res.status(404).json({ error: 'This page is not live.' });
    return null;
  }
  return { db, ...hit };
}

function meView(db: any, userId: string, companyId: string, page: PageContent) {
  const mine = radarOf(db).filter((r) => r.company_id === companyId);
  return {
    profile: profileView(findProfile(db, userId, companyId)),
    track: computeTrack(db, userId, page),
    watching: isWatching(db, userId, companyId),
    radar_confirmed: mine.filter((r) => r.confirmed_by.includes(userId)).map((r) => r.id),
    radar_mine: mine.filter((r) => r.user_id === userId && r.status !== 'rejected').map((r) => r.id),
  };
}

companyPagesRouter.get('/:slug/me', requireAuth, (req: Request, res: Response) => {
  const ctx = liveOr404(req, res);
  if (!ctx) return;
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(meView(ctx.db, req.userId!, ctx.company.id, ctx.page));
});

companyPagesRouter.put('/:slug/me', requireAuth, (req: Request, res: Response) => {
  const ctx = liveOr404(req, res);
  if (!ctx) return;
  updateProfile(ctx.db, req.userId!, ctx.company.id, req.body, ctx.page);
  saveDb(ctx.db);
  res.json(meView(ctx.db, req.userId!, ctx.company.id, ctx.page));
});

companyPagesRouter.post('/:slug/me/daily', requireAuth, (req: Request, res: Response) => {
  const ctx = liveOr404(req, res);
  if (!ctx) return;
  recordDaily(ctx.db, req.userId!, ctx.company.id);
  touchStreak(ctx.db, req.userId!);
  saveDb(ctx.db);
  res.json(meView(ctx.db, req.userId!, ctx.company.id, ctx.page));
});

companyPagesRouter.put('/:slug/watch', requireAuth, (req: Request, res: Response) => {
  const ctx = liveOr404(req, res);
  if (!ctx) return;
  setWatching(ctx.db, req.userId!, ctx.company.id, req.body?.on === true);
  saveDb(ctx.db);
  res.json(meView(ctx.db, req.userId!, ctx.company.id, ctx.page));
});

function radarErr(res: Response, e: any) {
  if (e instanceof RadarError) return res.status(e.status).json({ error: e.message });
  throw e;
}

companyPagesRouter.post('/:slug/radar', requireAuth, rateLimit(10), (req: Request, res: Response) => {
  const ctx = liveOr404(req, res);
  if (!ctx) return;
  try {
    createRadarReport(ctx.db, { id: req.userId!, name: req.user!.name }, ctx.company.id, ctx.page, req.body);
  } catch (e) {
    return radarErr(res, e);
  }
  saveDb(ctx.db);
  res.status(201).json({ ...meView(ctx.db, req.userId!, ctx.company.id, ctx.page), radar: publicRadar(ctx.db, ctx.company.id, ctx.page, null) });
});

companyPagesRouter.post('/:slug/radar/:id/confirm', requireAuth, rateLimit(30), async (req: Request, res: Response) => {
  const ctx = liveOr404(req, res);
  if (!ctx) return;
  let result;
  try {
    result = confirmRadarReport(ctx.db, req.params.id, req.userId!, ctx.page);
  } catch (e) {
    return radarErr(res, e);
  }
  const shouldNotify = result.becameApproved && !result.report.notified;
  if (shouldNotify) result.report.notified = true;
  saveDb(ctx.db);
  res.json({ ...meView(ctx.db, req.userId!, ctx.company.id, ctx.page), radar: publicRadar(ctx.db, ctx.company.id, ctx.page, null) });
  if (shouldNotify) await notifyWatchers(ctx.db, ctx.company, result.report.text);
});

companyPagesRouter.post('/:slug/events', rateLimit(120), (req: Request, res: Response) => {
  const db = loadDb();
  const company = (db.companies || []).find((c: any) => c.slug === req.params.slug);
  if (!company) return res.status(204).end();
  recordPageEvent(company.id, String(req.body?.event || ''));
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Admin — mounted behind requireAdmin; each route adds its permission.
// ---------------------------------------------------------------------------

export const companyPagesAdminRouter = Router();

function companyOr404(db: any, id: string, res: Response): any | null {
  const company = (db.companies || []).find((c: any) => c.id === id);
  if (!company) {
    res.status(404).json({ error: 'Company not found' });
    return null;
  }
  return company;
}

/** The doc as the studio sees it. Never stored until the admin saves. */
function docOrTemplate(db: any, companyId: string): { doc: CompanyPageDoc; persisted: boolean } {
  const existing = findPage(db, companyId);
  if (existing) return { doc: existing, persisted: true };
  return { doc: newPageDoc(companyId, 'mass_recruiter', null), persisted: false };
}

function view(doc: CompanyPageDoc, persisted: boolean) {
  return {
    company_id: doc.company_id,
    enabled: doc.enabled,
    persisted,
    draft: doc.draft,
    published: doc.published,
    published_at: doc.published_at,
    published_by: doc.published_by,
    scheduled: doc.scheduled ? { at: doc.scheduled.at, by: doc.scheduled.by } : null,
    updated_at: doc.updated_at,
    updated_by: doc.updated_by,
    history: doc.history.map((h, index) => ({ index, at: h.at, by: h.by, sections: h.content.sections.length })),
    issues: validateForPublish(doc.draft),
  };
}

function actorOf(req: Request): string {
  return req.userId || 'admin';
}

function upsert(db: any, doc: CompanyPageDoc) {
  const pages = pagesOf(db);
  const i = pages.findIndex((p) => p.company_id === doc.company_id);
  if (i === -1) pages.push(doc);
  else pages[i] = doc;
}

/**
 * A copied page keeps the structure and the `{company}` copy, but not the facts
 * that belonged to the source company: its numbers, its drive updates and its
 * module links would all be wrong — and look authoritative — on the new page.
 */
function withoutCompanyFacts(content: PageContent): PageContent {
  for (const s of content.sections) {
    const d: any = s.data;
    if (s.type === 'stat_strip') for (const st of d.stats || []) { st.value = ''; st.source_url = ''; st.verified_at = ''; }
    if (s.type === 'eligibility_apply') {
      for (const r of d.rows || []) r.value = '';
      d.last_confirmed = '';
      d.source_url = '';
    }
    if (s.type === 'rounds_route') for (const st of d.stations || []) { st.module_ids = []; st.last_drive_date = ''; }
    if (s.type === 'role_compare') for (const r of d.roles || []) r.ctc = '';
    if (s.type === 'drive_radar') d.updates = [];
    if (s.type === 'also_preparing') d.company_slugs = [];
  }
  content.settings.og_image = '';
  content.settings.pack_price_inr = null;
  return content;
}

companyPagesAdminRouter.get('/schema', requirePermission('companies.read'), (_req: Request, res: Response) => {
  const db = loadDb();
  res.json({
    ...schemaPayload(),
    templates: TEMPLATES,
    skills: (db.skills || [])
      .filter((s: any) => s && s.slug && s.status !== 'archived')
      .map((s: any) => ({ slug: s.slug, name: s.name, category: s.category })),
  });
});

companyPagesAdminRouter.get('/:companyId', requirePermission('companies.read'), (req: Request, res: Response) => {
  const db = loadDb();
  if (!companyOr404(db, req.params.companyId, res)) return;
  if (promoteDue(db, req.params.companyId)) saveDb(db);
  const { doc, persisted } = docOrTemplate(db, req.params.companyId);
  res.json(view(doc, persisted));
});

/**
 * Save the draft. `base_updated_at` is the `updated_at` the studio loaded; a
 * mismatch means another admin saved in between, and overwriting their work
 * silently is exactly what this check exists to stop.
 */
companyPagesAdminRouter.put('/:companyId/draft', requirePermission('companies.write'), (req: Request, res: Response) => {
  const db = loadDb();
  if (!companyOr404(db, req.params.companyId, res)) return;
  const { doc, persisted } = docOrTemplate(db, req.params.companyId);

  const base = req.body?.base_updated_at;
  if (persisted && base !== doc.updated_at) {
    return res.status(409).json({
      error: 'Someone else saved this page after you opened it. Reload to see their changes.',
      updated_at: doc.updated_at,
      updated_by: doc.updated_by,
    });
  }

  const content = sanitizeContent(req.body?.content);
  if (contentBytes(content) > MAX_CONTENT_BYTES) {
    return res.status(413).json({ error: 'This page is too large. Remove some sections or shorten long text.' });
  }

  doc.draft = content;
  doc.updated_at = new Date().toISOString();
  doc.updated_by = actorOf(req);
  upsert(db, doc);
  saveDb(db);
  res.json(view(doc, true));
});

companyPagesAdminRouter.post('/:companyId/publish', requirePermission('companies.write'), async (req: Request, res: Response) => {
  const db = loadDb();
  const company = companyOr404(db, req.params.companyId, res);
  if (!company) return;
  const existing = findPage(db, req.params.companyId);
  if (!existing) return res.status(400).json({ error: 'Save a draft before publishing.' });

  const issues = validateForPublish(existing.draft);
  if (issues.some((i) => i.level === 'error')) {
    return res.status(422).json({ error: 'Fix the errors before publishing.', issues });
  }

  const previous = existing.published;
  const fresh = newAdminRadarUpdates(previous, existing.draft);
  publishContent(existing, existing.draft, actorOf(req), new Date().toISOString());

  const audit = appendAudit(db, {
    action: 'company_page.publish',
    actor: actorOf(req),
    detail: `Published the ${company.name} page (${existing.draft.sections.length} sections)`,
    target: company.id,
  });
  saveDb(db);
  res.json(view(existing, true));
  await audit;
  // New admin-entered drive updates reach watchers only on a live page, and
  // only once — the first publish that contains them.
  if (existing.enabled && fresh.length > 0) await notifyWatchers(db, company, fresh[0]);
});

companyPagesAdminRouter.post('/:companyId/schedule', requirePermission('companies.write'), async (req: Request, res: Response) => {
  const db = loadDb();
  const company = companyOr404(db, req.params.companyId, res);
  if (!company) return;
  const existing = findPage(db, req.params.companyId);
  if (!existing) return res.status(400).json({ error: 'Save a draft before scheduling.' });

  const at = new Date(String(req.body?.at || ''));
  if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now() + 60_000) {
    return res.status(400).json({ error: 'Pick a time at least a minute from now.' });
  }
  const issues = validateForPublish(existing.draft);
  if (issues.some((i) => i.level === 'error')) {
    return res.status(422).json({ error: 'Fix the errors before scheduling.', issues });
  }
  // The draft is snapshotted now: later edits do not change what goes live.
  existing.scheduled = { content: JSON.parse(JSON.stringify(existing.draft)), at: at.toISOString(), by: actorOf(req) };
  existing.updated_at = new Date().toISOString();
  existing.updated_by = actorOf(req);
  const audit = appendAudit(db, {
    action: 'company_page.schedule',
    actor: actorOf(req),
    detail: `Scheduled the ${company.name} page for ${at.toISOString()}`,
    target: company.id,
  });
  saveDb(db);
  res.json(view(existing, true));
  await audit;
});

companyPagesAdminRouter.delete('/:companyId/schedule', requirePermission('companies.write'), (req: Request, res: Response) => {
  const db = loadDb();
  if (!companyOr404(db, req.params.companyId, res)) return;
  const existing = findPage(db, req.params.companyId);
  if (!existing) return res.status(404).json({ error: 'Nothing scheduled.' });
  existing.scheduled = null;
  existing.updated_at = new Date().toISOString();
  existing.updated_by = actorOf(req);
  saveDb(db);
  res.json(view(existing, true));
});

companyPagesAdminRouter.put('/:companyId/enabled', requirePermission('companies.write'), async (req: Request, res: Response) => {
  const db = loadDb();
  const company = companyOr404(db, req.params.companyId, res);
  if (!company) return;
  const existing = findPage(db, req.params.companyId);
  const enabled = req.body?.enabled === true;
  if (!existing || (enabled && !existing.published)) {
    return res.status(400).json({ error: 'Publish the page before turning it on.' });
  }
  existing.enabled = enabled;
  existing.updated_at = new Date().toISOString();
  existing.updated_by = actorOf(req);

  const audit = appendAudit(db, {
    action: enabled ? 'company_page.enable' : 'company_page.disable',
    actor: actorOf(req),
    detail: `${enabled ? 'Turned on' : 'Turned off'} the new ${company.name} page`,
    target: company.id,
  });
  saveDb(db);
  res.json(view(existing, true));
  await audit;
});

/** Copies a past published version into the draft. Publishing it is a separate step. */
companyPagesAdminRouter.post('/:companyId/restore/:index', requirePermission('companies.write'), (req: Request, res: Response) => {
  const db = loadDb();
  if (!companyOr404(db, req.params.companyId, res)) return;
  const existing = findPage(db, req.params.companyId);
  const version = existing?.history[Number(req.params.index)];
  if (!existing || !version) return res.status(404).json({ error: 'Version not found' });

  existing.draft = sanitizeContent(version.content);
  existing.updated_at = new Date().toISOString();
  existing.updated_by = actorOf(req);
  saveDb(db);
  res.json(view(existing, true));
});

/** Replaces the draft with a template or with another company's draft structure. */
companyPagesAdminRouter.post('/:companyId/reset', requirePermission('companies.write'), (req: Request, res: Response) => {
  const db = loadDb();
  if (!companyOr404(db, req.params.companyId, res)) return;
  const { doc } = docOrTemplate(db, req.params.companyId);

  const fromCompany = typeof req.body?.from_company_id === 'string' ? req.body.from_company_id : '';
  if (fromCompany) {
    const source = findPage(db, fromCompany);
    if (!source) return res.status(404).json({ error: 'That company has no page to copy.' });
    doc.draft = withoutCompanyFacts(sanitizeContent(source.published || source.draft));
  } else if (isTemplateKey(req.body?.template)) {
    doc.draft = templateContent(req.body.template);
  } else {
    return res.status(400).json({ error: 'Choose a template or a company to copy from.' });
  }
  doc.updated_at = new Date().toISOString();
  doc.updated_by = actorOf(req);
  upsert(db, doc);
  saveDb(db);
  res.json(view(doc, true));
});

companyPagesAdminRouter.post('/:companyId/media', requirePermission('companies.write'), (req: Request, res: Response) => {
  mediaUpload(req, res, (err: any) => {
    if (err) {
      const msg = err?.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 3 MB.' : err?.message || 'Upload failed';
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    res.status(201).json({ stored_name: req.file.filename });
  });
});

companyPagesAdminRouter.get('/:companyId/radar', requirePermission('companies.read'), (req: Request, res: Response) => {
  const db = loadDb();
  if (!companyOr404(db, req.params.companyId, res)) return;
  res.json(
    radarOf(db)
      .filter((r) => r.company_id === req.params.companyId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r) => ({ ...r, confirmed: r.confirmed_by.length, confirmed_by: undefined }))
  );
});

companyPagesAdminRouter.get('/:companyId/radar/suggestion', requirePermission('companies.read'), (req: Request, res: Response) => {
  const db = loadDb();
  if (!companyOr404(db, req.params.companyId, res)) return;
  res.json(driveStatusSuggestion(db, req.params.companyId));
});

companyPagesAdminRouter.patch('/:companyId/radar/:id', requirePermission('companies.write'), async (req: Request, res: Response) => {
  const db = loadDb();
  const company = companyOr404(db, req.params.companyId, res);
  if (!company) return;
  let result;
  try {
    result = moderateRadarReport(db, req.params.id, company.id, req.body?.status, actorOf(req));
  } catch (e) {
    return radarErr(res, e);
  }
  const shouldNotify = result.becameApproved && !result.report.notified && !!findPage(db, company.id)?.enabled;
  if (shouldNotify) result.report.notified = true;
  const audit = appendAudit(db, {
    action: `company_page.radar_${result.report.status}`,
    actor: actorOf(req),
    detail: `Drive Radar update ${result.report.id} → ${result.report.status}`,
    target: company.id,
  });
  saveDb(db);
  res.json({ ...result.report, confirmed: result.report.confirmed_by.length, confirmed_by: undefined });
  await audit;
  if (shouldNotify) await notifyWatchers(db, company, result.report.text, result.report.user_id);
});

companyPagesAdminRouter.get('/:companyId/stats', requirePermission('companies.read'), (req: Request, res: Response) => {
  const db = loadDb();
  if (!companyOr404(db, req.params.companyId, res)) return;
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  res.json({
    ...pageStats(db, req.params.companyId, days),
    watchers: (db.company_watchers || []).filter((w: any) => w.company_id === req.params.companyId).length,
    prep_profiles: (db.company_prep_profiles || []).filter((p: any) => p.company_id === req.params.companyId).length,
  });
});

// ---------------------------------------------------------------------------
// Presence — "who else has this page open". In memory: it is a courtesy
// warning, not a lock; the 409 on save is what actually prevents overwrites.
// ---------------------------------------------------------------------------

const PRESENCE_TTL_MS = 70_000;
const presence = new Map<string, Map<string, { name: string; at: number }>>();

companyPagesAdminRouter.post('/:companyId/presence', requirePermission('companies.read'), (req: Request, res: Response) => {
  const now = Date.now();
  const room = presence.get(req.params.companyId) || new Map();
  presence.set(req.params.companyId, room);
  if (req.body?.leaving === true) room.delete(req.userId!);
  else room.set(req.userId!, { name: req.user?.name || 'An admin', at: now });
  for (const [uid, p] of room) if (now - p.at > PRESENCE_TTL_MS) room.delete(uid);
  res.json({
    others: Array.from(room.entries())
      .filter(([uid]) => uid !== req.userId)
      .map(([, p]) => ({ name: p.name, seconds_ago: Math.round((now - p.at) / 1000) })),
  });
});

export const __resetPresence = () => presence.clear();
