import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { appendAudit } from '../store/audit';
import { requireAuth, rateLimit } from '../middleware/auth';
import {
  makeId, str, sanitizeBlocks, normalizePhase, reindexPhases, reindexBlocks,
  resolvePlan, daysUntil, normaliseWindow, MAX_PHASES_PER_TEMPLATE,
} from '../lib/studyPlanTemplates';
import type { StudyPlanPhase, StudyPlanTemplate } from '../data/db';

export const studyPlanAdminRouter = Router();
export const studyPlanRouter = Router();

const templatesOf = (db: any): StudyPlanTemplate[] =>
  (Array.isArray(db.study_plan_templates) ? db.study_plan_templates : []) as StudyPlanTemplate[];

const phasesOf = (db: any): StudyPlanPhase[] =>
  (Array.isArray(db.study_plan_phases) ? db.study_plan_phases : []) as StudyPlanPhase[];

const ensureCollections = (db: any) => {
  if (!Array.isArray(db.study_plan_templates)) db.study_plan_templates = [];
  if (!Array.isArray(db.study_plan_phases)) db.study_plan_phases = [];
  if (!Array.isArray(db.study_plan_enrollments)) db.study_plan_enrollments = [];
  if (!Array.isArray(db.study_plan_progress)) db.study_plan_progress = [];
};

const phasesFor = (db: any, templateId: string) =>
  reindexPhases(phasesOf(db).filter((p) => p.template_id === templateId)).map(reindexBlocks);

const findPhase = (db: any, templateId: string, phaseId: string) =>
  phasesOf(db).find((p) => p.template_id === templateId && p.id === phaseId);

const latestEnrollment = (db: any, userId?: string) => {
  if (!userId) return null;
  return (Array.isArray(db.study_plan_enrollments) ? db.study_plan_enrollments : [])
    .filter((e: any) => e.user_id === userId)
    .sort((a: any, b: any) => (b.generated_at || '').localeCompare(a.generated_at || ''))[0] || null;
};

const actorOf = (req: Request) => req.userId || 'admin';

/**
 * Turn a title into a URL-safe slug.
 *
 * Diacritics are folded rather than dropped so "C++ / Novosibirsk" keeps its
 * letters, and any run of non-alphanumerics becomes a single dash. Returns ''
 * for input with nothing usable in it (e.g. "???"), which callers treat as
 * "fall back to the id" rather than storing an empty slug.
 */
export const slugify = (input: unknown): string =>
  String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/**
 * Resolve a slug to a value that is unique among templates.
 *
 * A collision gets `-2`, `-3` and so on. Returning the conflict rather than
 * throwing lets the caller decide: creation takes the free variant, and an
 * explicit admin edit is rejected so two plans cannot quietly end up sharing a
 * URL.
 */
export const uniqueSlug = (
  db: any,
  desired: string,
  excludeId?: string
): { slug: string; conflicted: boolean } => {
  const base = slugify(desired) || 'study-plan';
  const taken = new Set(
    templatesOf(db)
      .filter((t) => t.id !== excludeId && t.slug)
      .map((t) => String(t.slug))
  );
  if (!taken.has(base)) return { slug: base, conflicted: false };
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return { slug: candidate, conflicted: true };
  }
  return { slug: `${base}-${Date.now()}`, conflicted: true };
};

/** Give a template a slug if it has none, e.g. one created before slugs existed. */
const ensureSlug = (db: any, template: StudyPlanTemplate): string => {
  if (template.slug) return template.slug;
  const { slug } = uniqueSlug(db, template.title, template.id);
  template.slug = slug;
  return slug;
};

const touch = (t: StudyPlanTemplate, req: Request) => {
  t.updated_at = new Date().toISOString();
  t.updated_by = actorOf(req);
  t.version = (t.version || 0) + 1;
};

// ============================================================
// ADMIN — TEMPLATE CRUD
// ============================================================

studyPlanAdminRouter.get('/', (req: Request, res: Response) => {
  const db = loadDb();
  ensureCollections(db);
  const status = req.query.status ? String(req.query.status) : null;
  // Templates authored before slugs existed get one derived here, and the
  // collection is persisted so the backfill happens once rather than on every
  // list request. The admin list shows the slug, so returning null would leave
  // a permanently blank column.
  let backfilled = false;
  for (const t of templatesOf(db)) {
    if (!t.slug) {
      ensureSlug(db, t);
      backfilled = true;
    }
  }
  if (backfilled) {
    // Persisting is best-effort. A read must not fail because the data
    // directory is read-only or full; the derived slugs are still correct in
    // this response and will be committed by the next real write.
    try {
      saveDb(db);
    } catch {
      /* slug stays derived-but-unpersisted */
    }
  }
  const list = templatesOf(db)
    .filter((t) => (status ? t.status === status : true))
    .map((t) => ({ ...t, phase_count: phasesFor(db, t.id).length }))
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  res.json({ status: 'success', templates: list });
});

studyPlanAdminRouter.get('/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });
  ensureSlug(db, template);
  res.json({ status: 'success', template, phases: phasesFor(db, template.id) });
});

studyPlanAdminRouter.post('/', async (req: Request, res: Response) => {
  const db = loadDb();
  ensureCollections(db);
  const now = new Date().toISOString();
  const title = str(req.body.title, 200) || 'Untitled Study Plan';
  const template: StudyPlanTemplate = {
    id: makeId('spt'),
    title,
    // An author-supplied slug is honoured when it is free; otherwise the title
    // is slugified and de-duplicated so creation never fails on a clash.
    slug: uniqueSlug(db, req.body.slug || title).slug,
    company_id: req.body.company_id ? str(req.body.company_id, 80) : null,
    company_name: req.body.company_name ? str(req.body.company_name, 120) : null,
    role: req.body.role ? str(req.body.role, 80) : null,
    status: (['draft', 'published', 'archived'] as const).includes(req.body.status)
      ? req.body.status
      : 'draft',
    version: 1,
    created_at: now,
    updated_at: now,
    updated_by: actorOf(req),
  };
  db.study_plan_templates.push(template);

  if (Array.isArray(req.body.phases) && req.body.phases.length > 0) {
    const phases = req.body.phases
      .slice(0, MAX_PHASES_PER_TEMPLATE)
      .map((p: any, i: number) => normalizePhase(p || {}, template.id, i + 1));
    db.study_plan_phases.push(...phases);
  }

  await appendAudit(db, {
    action: 'study_plan.create',
    actor: actorOf(req),
    detail: `Created study plan template "${template.title}"`,
    meta: { template_id: template.id },
  });
  saveDb(db);
  res.status(201).json({ status: 'success', template, phases: phasesFor(db, template.id) });
});

studyPlanAdminRouter.put('/:id', async (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });
  ensureSlug(db, template);

  if (req.body.title !== undefined) template.title = str(req.body.title, 200) || template.title;
  if (req.body.slug !== undefined) {
    const desired = slugify(req.body.slug);
    if (!desired) {
      return res.status(400).json({ error: 'slug must contain at least one letter or number' });
    }
    const { slug, conflicted } = uniqueSlug(db, desired, template.id);
    // Unlike creation, an explicit edit is refused on a clash. Silently storing
    // a different slug than the admin typed would leave the list showing one URL
    // and the template living at another.
    if (conflicted && slug !== desired) {
      return res.status(409).json({
        error: `slug "${desired}" is already used by another study plan`,
        suggested_slug: slug,
      });
    }
    template.slug = slug;
  }
  if (req.body.company_id !== undefined) {
    template.company_id = req.body.company_id ? str(req.body.company_id, 80) : null;
  }
  if (req.body.company_name !== undefined) {
    template.company_name = req.body.company_name ? str(req.body.company_name, 120) : null;
  }
  if (req.body.role !== undefined) template.role = req.body.role ? str(req.body.role, 80) : null;
  if (req.body.status !== undefined) {
    const next = String(req.body.status);
    if (!['draft', 'published', 'archived'].includes(next)) {
      return res.status(400).json({ error: 'status must be draft, published or archived' });
    }
    if (next === 'published' && phasesFor(db, template.id).length === 0) {
      return res.status(400).json({ error: 'Add at least one phase before publishing' });
    }
    template.status = next as StudyPlanTemplate['status'];
  }

  touch(template, req);
  await appendAudit(db, {
    action: 'study_plan.update',
    actor: actorOf(req),
    detail: `Updated study plan "${template.title}"`,
    meta: { template_id: template.id, status: template.status },
  });
  saveDb(db);
  res.json({ status: 'success', template, phases: phasesFor(db, template.id) });
});

studyPlanAdminRouter.delete('/:id', async (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });

  const hard = String(req.query.hard || '') === '1' || req.body?.hard === true;
  if (hard) {
    db.study_plan_templates = templatesOf(db).filter((t) => t.id !== template.id);
    db.study_plan_phases = phasesOf(db).filter((p) => p.template_id !== template.id);
  } else {
    template.status = 'archived';
    touch(template, req);
  }

  await appendAudit(db, {
    action: hard ? 'study_plan.delete' : 'study_plan.archive',
    actor: actorOf(req),
    detail: `${hard ? 'Deleted' : 'Archived'} study plan "${template.title}"`,
    meta: { template_id: template.id },
  });
  saveDb(db);
  res.json({ status: 'success', message: hard ? 'Template deleted' : 'Template archived' });
});

// ============================================================
// ADMIN — PHASE CRUD
// ============================================================

studyPlanAdminRouter.post('/:id/phases', async (req: Request, res: Response) => {
  const db = loadDb();
  ensureCollections(db);
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });

  const existing = phasesFor(db, template.id);
  if (existing.length >= MAX_PHASES_PER_TEMPLATE) {
    return res.status(400).json({ error: `A plan cannot exceed ${MAX_PHASES_PER_TEMPLATE} phases` });
  }

  const order = req.body.phase_order !== undefined
    ? Number(req.body.phase_order)
    : existing.length + 1;
  const phase = normalizePhase(req.body || {}, template.id, order);
  db.study_plan_phases.push(phase);

  const reindexed = reindexPhases(phasesOf(db).filter((p) => p.template_id === template.id));
  db.study_plan_phases = [
    ...phasesOf(db).filter((p) => p.template_id !== template.id),
    ...reindexed,
  ];
  touch(template, req);
  await appendAudit(db, {
    actor: actorOf(req),
    action: 'study_plan.phase.create',
    detail: `Added phase "${phase.title}" to "${template.title}"`,
    meta: { template_id: template.id, phase_id: phase.id, day_from: phase.day_from, day_to: phase.day_to },
  });
  saveDb(db);
  res.status(201).json({ status: 'success', phase, phases: phasesFor(db, template.id) });
});

studyPlanAdminRouter.put('/:id/phases/:phaseId', async (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });
  const phase = findPhase(db, template.id, req.params.phaseId);
  if (!phase) return res.status(404).json({ error: 'Phase not found' });

  const merged = normalizePhase(
    {
      id: phase.id,
      title: req.body.title !== undefined ? req.body.title : phase.title,
      summary: req.body.summary !== undefined ? req.body.summary : phase.summary,
      day_from: req.body.day_from !== undefined ? req.body.day_from : phase.day_from,
      day_to: req.body.day_to !== undefined ? req.body.day_to : phase.day_to,
      blocks: req.body.blocks !== undefined ? req.body.blocks : phase.blocks,
    },
    template.id,
    req.body.phase_order !== undefined ? Number(req.body.phase_order) : phase.phase_order
  );
  Object.assign(phase, merged);

  if (req.body.phase_order !== undefined) {
    const ordered = reindexPhases(phasesOf(db).filter((p) => p.template_id === template.id));
    db.study_plan_phases = [
      ...phasesOf(db).filter((p) => p.template_id !== template.id),
      ...ordered,
    ];
  }

  touch(template, req);
  await appendAudit(db, {
    actor: actorOf(req),
    action: 'study_plan.phase.update',
    detail: `Updated phase "${phase.title}" in "${template.title}"`,
    meta: { template_id: template.id, phase_id: phase.id },
  });
  saveDb(db);
  res.json({ status: 'success', phase, phases: phasesFor(db, template.id) });
});

studyPlanAdminRouter.delete('/:id/phases/:phaseId', async (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });

  const remaining = reindexPhases(
    phasesOf(db).filter((p) => p.template_id === template.id && p.id !== req.params.phaseId)
  );
  db.study_plan_phases = [...phasesOf(db).filter((p) => p.template_id !== template.id), ...remaining];
  touch(template, req);
  await appendAudit(db, {
    actor: actorOf(req),
    action: 'study_plan.phase.delete',
    detail: `Removed a phase from "${template.title}"`,
    meta: { template_id: template.id, phase_id: req.params.phaseId },
  });
  saveDb(db);
  res.json({ status: 'success', message: 'Phase removed', phases: phasesFor(db, template.id) });
});

studyPlanAdminRouter.post('/:id/phases/reorder', async (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });

  const orderedIds: string[] = Array.isArray(req.body.phase_ids) ? req.body.phase_ids : [];
  const map = new Map(phasesOf(db).filter((p) => p.template_id === template.id).map((p) => [p.id, p]));
  const reordered = orderedIds
    .map((id, i) => {
      const p = map.get(id);
      if (!p) return null;
      p.phase_order = i + 1;
      return p;
    })
    .filter(Boolean) as StudyPlanPhase[];

  const missing = phasesFor(db, template.id).filter((p) => !orderedIds.includes(p.id));
  db.study_plan_phases = [
    ...phasesOf(db).filter((p) => p.template_id !== template.id),
    ...reordered,
    ...missing,
  ];
  touch(template, req);
  await appendAudit(db, {
    actor: actorOf(req),
    action: 'study_plan.phase.reorder',
    detail: `Reordered the phases of "${template.title}"`,
    meta: { template_id: template.id, count: reordered.length },
  });
  saveDb(db);
  res.json({ status: 'success', phases: phasesFor(db, template.id) });
});

// ============================================================
// ADMIN — BLOCK CRUD (mirrors /api/admin/items/:itemId/blocks)
// ============================================================

studyPlanAdminRouter.post('/:id/phases/:phaseId/blocks', async (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });
  const phase = findPhase(db, template.id, req.params.phaseId);
  if (!phase) return res.status(404).json({ error: 'Phase not found' });

  const added = sanitizeBlocks([req.body]);
  if (added.length === 0) {
    return res.status(400).json({ error: 'Unsupported or missing block_type' });
  }
  const block = { ...added[0], id: makeId('spb'), block_order: phase.blocks.length + 1 };
  phase.blocks = reindexBlocks(phase).blocks;
  phase.blocks.push(block);
  phase.blocks = reindexBlocks(phase).blocks;
  touch(template, req);
  await appendAudit(db, {
    actor: actorOf(req),
    action: 'study_plan.block.create',
    detail: `Added a ${block.block_type} block to "${phase.title}"`,
    meta: { template_id: template.id, phase_id: phase.id, block_id: block.id, block_type: block.block_type },
  });
  saveDb(db);
  res.status(201).json({ status: 'success', block, phases: phasesFor(db, template.id) });
});

studyPlanAdminRouter.put('/:id/phases/:phaseId/blocks/:blockId', async (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });
  const phase = findPhase(db, template.id, req.params.phaseId);
  if (!phase) return res.status(404).json({ error: 'Phase not found' });
  const block = phase.blocks.find((b) => b.id === req.params.blockId);
  if (!block) return res.status(404).json({ error: 'Block not found' });

  const replacement = sanitizeBlocks([
    { ...block, block_type: req.body.block_type ?? block.block_type, payload: req.body.payload ?? block.payload },
  ])[0];
  if (!replacement) return res.status(400).json({ error: 'Unsupported block_type' });

  Object.assign(block, replacement, { id: block.id, block_order: block.block_order });
  touch(template, req);
  await appendAudit(db, {
    actor: actorOf(req),
    action: 'study_plan.block.update',
    detail: `Updated a ${block.block_type} block in "${phase.title}"`,
    meta: { template_id: template.id, phase_id: phase.id, block_id: block.id, block_type: block.block_type },
  });
  saveDb(db);
  res.json({ status: 'success', block, phases: phasesFor(db, template.id) });
});

studyPlanAdminRouter.delete('/:id/phases/:phaseId/blocks/:blockId', async (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });
  const phase = findPhase(db, template.id, req.params.phaseId);
  if (!phase) return res.status(404).json({ error: 'Phase not found' });

  phase.blocks = reindexBlocks({
    ...phase,
    blocks: phase.blocks.filter((b) => b.id !== req.params.blockId),
  }).blocks;
  touch(template, req);
  await appendAudit(db, {
    actor: actorOf(req),
    action: 'study_plan.block.delete',
    detail: `Removed a block from "${phase.title}"`,
    meta: { template_id: template.id, phase_id: phase.id, block_id: req.params.blockId },
  });
  saveDb(db);
  res.json({ status: 'success', message: 'Block removed', phases: phasesFor(db, template.id) });
});

studyPlanAdminRouter.post('/:id/phases/:phaseId/blocks/reorder', async (req: Request, res: Response) => {
  const db = loadDb();
  const template = templatesOf(db).find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Study plan template not found' });
  const phase = findPhase(db, template.id, req.params.phaseId);
  if (!phase) return res.status(404).json({ error: 'Phase not found' });

  const orderedIds: string[] = Array.isArray(req.body.block_ids) ? req.body.block_ids : [];
  const map = new Map(phase.blocks.map((b) => [b.id, b]));
  const reordered = orderedIds
    .map((id, i) => {
      const b = map.get(id);
      if (!b) return null;
      b.block_order = i + 1;
      return b;
    })
    .filter(Boolean) as typeof phase.blocks;

  const missing = phase.blocks.filter((b) => !orderedIds.includes(b.id));
  phase.blocks = [...reordered, ...missing].map((b, i) => ({ ...b, block_order: i + 1 }));
  touch(template, req);
  await appendAudit(db, {
    actor: actorOf(req),
    action: 'study_plan.block.reorder',
    detail: `Reordered the blocks of "${phase.title}"`,
    meta: { template_id: template.id, phase_id: phase.id, count: phase.blocks.length },
  });
  saveDb(db);
  res.json({ status: 'success', phases: phasesFor(db, template.id) });
});

// ============================================================
// STUDENT
// ============================================================

/**
 * Re-applies the write-time sanitiser on the way out.
 *
 * Content is already sanitised when stored, but plan payloads can predate that
 * rule, and `db.json` is a file an operator can hand-edit. Sanitising on read as
 * well means a payload that slipped in is still never rendered as live HTML —
 * the renderer escapes raw HTML, so the worst case is visible markup, not XSS.
 * Cheap enough to do unconditionally.
 */
const sanitiseOnRead = (blocks: any) =>
  (Array.isArray(blocks) ? blocks : []).map((b: any, i: number) => {
    const clean = sanitizeBlocks([b])[0];
    return clean ? { ...clean, id: b?.id || clean.id, block_order: i + 1 } : null;
  }).filter(Boolean);

const shapeForStudent = (
  db: any,
  resolved: ReturnType<typeof resolvePlan>,
  enrollment: any | null
) => {
  const progress = enrollment
    ? (Array.isArray(db.study_plan_progress) ? db.study_plan_progress : []).filter(
        (p: any) => p.enrollment_id === enrollment.id
      )
    : [];
  const doneIds = new Set(progress.filter((p: any) => p.completed).map((p: any) => p.phase_id));
  const total = resolved.phases.length;
  const completed = resolved.phases.filter((p) => doneIds.has(p.id)).length;

  return {
    targetCompany: enrollment?.target_company || resolved.template?.company_name || 'Target Company',
    targetRole: enrollment?.target_role || resolved.template?.role || 'SDE',
    // The window the phases were actually fitted to. This was `enrollment?.total_days
    // ?? 14`, so every guest - and every signed-out visitor previewing a plan - was
    // told they had 14 days no matter how long the plan in front of them was.
    daysRemaining: resolved.totalDays,
    totalDays: resolved.totalDays,
    companyId: resolved.template?.company_id || null,
    interviewDate: enrollment?.interview_date || null,
    source: resolved.source,
    templateId: resolved.template?.id || null,
    templateTitle: resolved.template?.title || null,
    enrollmentId: enrollment?.id || null,
    progress: { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) },
    phases: resolved.phases.map((p) => ({
      id: p.id,
      order: p.phase_order,
      title: p.title,
      dayFrom: p.day_from,
      dayTo: p.day_to,
      dayLabel: p.day_to ? `Day ${p.day_from}–${p.day_to}` : `Day ${p.day_from}+`,
      summary: p.summary,
      blocks: sanitiseOnRead(p.blocks),
      completed: doneIds.has(p.id),
    })),
  };
};

/**
 * How many days the plan must cover.
 *
 * When the learner gave an interview date, the server owns this number outright:
 * it is derived from the calendar, so it cannot be inflated or understated by the
 * client. This used to be `Number(req.body.daysRemaining) || daysUntil(...)`, and
 * the client sent a hardcoded `daysRemaining: 14` on every request — so a learner
 * 45 days from an interview was always shown a 14-day plan, and the date they
 * carefully picked was decorative.
 *
 * A client hint is still honoured when there is no date to work from, which is the
 * only case where it is the best information available. It is clamped to the same
 * 1..365 range either way.
 */
function resolveTotalDays(interviewDate: string | null, clientHint: unknown): number {
  const fromCalendar = daysUntil(interviewDate);
  if (fromCalendar != null) return normaliseWindow(fromCalendar);
  return normaliseWindow(clientHint);
}

// Rate limited because the endpoint is reachable without a session: without a
// cap it can be used as a free compute oracle, rebuilding a plan on every call.
studyPlanRouter.post('/generate', rateLimit(20), (req: Request, res: Response) => {
  const db = loadDb();
  ensureCollections(db);

  const targetCompany = str(req.body.targetCompany, 120) || 'Target Company';
  const targetRole = str(req.body.targetRole, 80) || 'SDE';
  const interviewDate = str(req.body.interviewDate, 40) || null;
  const totalDays = resolveTotalDays(interviewDate, req.body.daysRemaining);

  const resolved = resolvePlan(db, { companyName: targetCompany, role: targetRole, totalDays });

  let enrollment: any = null;
  if (req.userId) {
    const existing = latestEnrollment(db, req.userId);
    if (existing) {
      existing.target_company = targetCompany;
      existing.target_role = targetRole;
      existing.interview_date = interviewDate;
      existing.total_days = totalDays;
      existing.template_id = resolved.template?.id || null;
      existing.source = resolved.source;
      existing.generated_at = new Date().toISOString();
      enrollment = existing;
    } else {
      enrollment = {
        id: makeId('spe'),
        user_id: req.userId,
        template_id: resolved.template?.id || null,
        target_company: targetCompany,
        target_role: targetRole,
        interview_date: interviewDate,
        total_days: totalDays,
        source: resolved.source,
        generated_at: new Date().toISOString(),
      };
      db.study_plan_enrollments.push(enrollment);
    }
    saveDb(db);
  }

  res.json({ status: 'success', ...shapeForStudent(db, resolved, enrollment) });
});

studyPlanRouter.get('/enrollment', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  ensureCollections(db);
  const enrollment = latestEnrollment(db, req.userId);

  if (!enrollment) return res.json({ status: 'success', enrollment: null, plan: null });

  const resolved = resolvePlan(db, {
    companyName: enrollment.target_company,
    role: enrollment.target_role,
    totalDays: enrollment.total_days,
  });
  res.json({ status: 'success', enrollment, plan: shapeForStudent(db, resolved, enrollment) });
});

studyPlanRouter.put('/enrollment', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  ensureCollections(db);
  const list = db.study_plan_enrollments as any[];
  let enrollment = latestEnrollment(db, req.userId);

  const targetCompany = str(req.body.targetCompany, 120);
  const targetRole = str(req.body.targetRole, 80);
  const interviewDate = req.body.interviewDate ? str(req.body.interviewDate, 40) : null;

  if (!enrollment) {
    if (!targetCompany) return res.status(400).json({ error: 'targetCompany is required' });
    enrollment = {
      id: makeId('spe'),
      user_id: req.userId,
      template_id: null,
      target_company: targetCompany,
      target_role: targetRole || 'SDE',
      interview_date: interviewDate,
      total_days: resolveTotalDays(interviewDate, req.body.daysRemaining),
      source: 'fallback',
      generated_at: new Date().toISOString(),
    };
    list.push(enrollment);
  } else {
    if (targetCompany) enrollment.target_company = targetCompany;
    if (targetRole) enrollment.target_role = targetRole;
    if (req.body.interviewDate !== undefined) enrollment.interview_date = interviewDate;
    // Re-derive from the calendar whenever a date is in play, so a stale
    // `total_days` from a previous visit cannot outlive the date it came from.
    if (interviewDate) {
      enrollment.total_days = resolveTotalDays(interviewDate, enrollment.total_days);
    }
    enrollment.generated_at = new Date().toISOString();
  }

  const resolved = resolvePlan(db, {
    companyName: enrollment.target_company,
    role: enrollment.target_role,
    totalDays: enrollment.total_days,
  });
  enrollment.template_id = resolved.template?.id || null;
  enrollment.source = resolved.source;

  saveDb(db);
  res.json({ status: 'success', enrollment, plan: shapeForStudent(db, resolved, enrollment) });
});

studyPlanRouter.put('/enrollment/phases/:phaseId', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  ensureCollections(db);
  const enrollment = latestEnrollment(db, req.userId);
  if (!enrollment) return res.status(404).json({ error: 'No active study plan' });

  const resolvedForProgress = resolvePlan(db, {
    companyName: enrollment.target_company,
    role: enrollment.target_role,
    totalDays: enrollment.total_days,
  });
  const existsInPlan =
    resolvedForProgress.phases.some((p: any) => p.id === req.params.phaseId) ||
    findPhase(db, enrollment.template_id || '', req.params.phaseId) ||
    (db.study_plan_progress as any[]).some(
      (p) => p.enrollment_id === enrollment.id && p.phase_id === req.params.phaseId
    );
  if (!existsInPlan) return res.status(404).json({ error: 'Phase is not part of your plan' });

  const list = db.study_plan_progress as any[];
  let row = list.find((p) => p.enrollment_id === enrollment.id && p.phase_id === req.params.phaseId);
  if (!row) {
    row = {
      id: makeId('spg'),
      enrollment_id: enrollment.id,
      phase_id: req.params.phaseId,
      completed: false,
      completed_at: null,
    };
    list.push(row);
  }
  row.completed = Boolean(req.body.completed);
  row.completed_at = row.completed ? new Date().toISOString() : null;

  saveDb(db);

  const resolved = resolvePlan(db, {
    companyName: enrollment.target_company,
    role: enrollment.target_role,
    totalDays: enrollment.total_days,
  });
  res.json({ status: 'success', plan: shapeForStudent(db, resolved, enrollment) });
});

studyPlanRouter.delete('/enrollment', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  ensureCollections(db);
  const enrollment = latestEnrollment(db, req.userId);
  if (!enrollment) return res.json({ status: 'success', enrollment: null, removed: 0 });

  const before = (db.study_plan_progress as any[]).length;
  db.study_plan_progress = (db.study_plan_progress as any[]).filter(
    (p) => p.enrollment_id !== enrollment.id
  );
  const removed = before - db.study_plan_progress.length;
  db.study_plan_enrollments = (db.study_plan_enrollments as any[]).filter(
    (e) => e.id !== enrollment.id
  );
  saveDb(db);
  res.json({ status: 'success', enrollment: null, removed });
});

studyPlanRouter.get('/templates', (req: Request, res: Response) => {
  const db = loadDb();
  const list = templatesOf(db)
    .filter((t) => t.status === 'published')
    .map((t) => ({
      id: t.id,
      title: t.title,
      company_name: t.company_name,
      role: t.role,
      phase_count: phasesFor(db, t.id).length,
    }));
  res.json({ status: 'success', templates: list });
});
