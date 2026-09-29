import { ALL_BLOCK_TYPES } from '../data/db';
import type {
  StudyPlanPhase,
  StudyPlanTemplate,
  ContentBlockRecord,
  ContentBlockType,
} from '../data/db';

// Derived from the shared union so a plan phase can hold anything the renderer
// draws. This list used to be hand-maintained and omitted `steps` and
// `video_link`, which the renderer supports — the API rejected blocks the same
// editor could create.
export const ALLOWED_BLOCK_TYPES = new Set<ContentBlockType>(ALL_BLOCK_TYPES);

export const MAX_BLOCKS_PER_PHASE = 40;
export const MAX_PHASES_PER_TEMPLATE = 30;
export const MAX_TEXT_LENGTH = 20000;

let idSeq = 0;
export function makeId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq.toString(36)}`;
}

const clampInt = (v: any, min: number, max: number, fallback: number) => {
  const n = Number.parseInt(String(v), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

export function str(v: any, max = 500): string {
  if (v === null || v === undefined) return '';
  return String(v).slice(0, max);
}

/**
 * react-markdown does not render raw HTML unless rehype-raw is enabled, and it is not,
 * so markdown is already inert at render time. This is defence in depth for stored
 * content plus a hard cap so one admin paste cannot bloat the JSON store.
 */
export function sanitizeMarkdown(input: any): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .slice(0, MAX_TEXT_LENGTH)
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*\/?\s*(script|iframe|object|embed|style|link|meta)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function sanitizeUrl(url: any): string {
  const raw = str(url, 2000).trim();
  if (!raw) return '';
  if (/^\s*(javascript|data|vbscript):/i.test(raw)) return '';
  return raw;
}

/** Deepest array nesting a payload array may reach. A table's rows are the only
 *  real case; past this the extra structure is dropped instead of walked. */
const MAX_PAYLOAD_DEPTH = 4;

/**
 * One entry of a payload array.
 *
 * An entry that is ITSELF an array has to come back out as an array. Collapsing
 * it into an object keyed by index is what turned a table block's
 * `rows: [['a','b'],['c','d']]` into `[{0:'a',1:'b'},{0:'c',1:'d'}]` on its way
 * through the store — and the reader then crashed the whole study-plan page on
 * `row.map`, because a plain object has no `.map`. The symptom surfaced only on a
 * deep link like `#phase-2`, since that was the first phase carrying a table.
 *
 * So: arrays are walked in place, and only plain objects are rebuilt key by key.
 */
function sanitizeArrayEntry(entry: any, depth = 1): any {
  if (typeof entry === 'string') return sanitizeMarkdown(entry);
  if (typeof entry === 'number' || typeof entry === 'boolean') return entry;

  if (Array.isArray(entry)) {
    if (depth >= MAX_PAYLOAD_DEPTH) return [];
    return entry.slice(0, 200).map((inner) => sanitizeArrayEntry(inner, depth + 1));
  }

  if (entry && typeof entry === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(entry)) {
      if (typeof v === 'string') out[k] = k === 'url' ? sanitizeUrl(v) : sanitizeMarkdown(v);
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
      else if (Array.isArray(v)) out[k] = v.slice(0, 200).map((inner) => sanitizeArrayEntry(inner, depth + 1));
    }
    return out;
  }

  return entry;
}

export function sanitizeBlock(input: any, order: number): ContentBlockRecord | null {
  if (!input || typeof input !== 'object') return null;
  const blockType = str(input.block_type, 40);
  // A runtime string can never be in the union, so the set is consulted as a
  // Set<string>; `sanitizeBlock` narrows back to ContentBlockType on the way out.
  if (!ALLOWED_BLOCK_TYPES.has(blockType as ContentBlockType)) return null;

  const rawPayload = input.payload && typeof input.payload === 'object' ? input.payload : {};
  const payload: Record<string, any> = {};

  for (const [key, value] of Object.entries(rawPayload)) {
    if (typeof value === 'string') {
      payload[key] = key === 'url' || key === 'video_url'
        ? sanitizeUrl(value)
        : sanitizeMarkdown(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      payload[key] = value;
    } else if (Array.isArray(value)) {
      // Wrapped in an arrow on purpose: a bare `.map(sanitizeArrayEntry)` also
      // passes the element index as the 2nd arg, which would land in `depth` and
      // start emptying the entry at index MAX_PAYLOAD_DEPTH.
      payload[key] = value.slice(0, 200).map((entry) => sanitizeArrayEntry(entry));
    }
  }

  return {
    id: str(input.id, 80) || makeId('spb'),
    block_type: blockType as ContentBlockRecord['block_type'],
    block_order: order,
    payload,
  };
}

export function sanitizeBlocks(list: any): ContentBlockRecord[] {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_BLOCKS_PER_PHASE)
    .map((b, i) => sanitizeBlock(b, i + 1))
    .filter(Boolean) as ContentBlockRecord[];
}

export interface PhaseInput {
  id?: string;
  title?: string;
  summary?: string;
  day_from?: number;
  day_to?: number | null;
  blocks?: any;
}

export function normalizePhase(input: PhaseInput, templateId: string, order: number): StudyPlanPhase {
  const dayFrom = clampInt(input.day_from, 1, 3650, order);
  const rawTo: any = input.day_to;
  const dayTo = rawTo === null || rawTo === undefined || rawTo === ''
    ? null
    : clampInt(rawTo, 1, 3650, dayFrom);
  return {
    id: str((input as any).id, 80) || makeId('spp'),
    template_id: templateId,
    phase_order: order,
    title: str(input.title, 200) || `Phase ${order}`,
    day_from: dayFrom,
    day_to: dayTo !== null && dayTo < dayFrom ? dayFrom : dayTo,
    summary: sanitizeMarkdown(input.summary).slice(0, 600),
    blocks: sanitizeBlocks(input.blocks),
  };
}

export function reindexPhases(phases: StudyPlanPhase[]): StudyPlanPhase[] {
  return [...phases]
    .sort((a, b) => a.phase_order - b.phase_order)
    .map((p, i) => ({ ...p, phase_order: i + 1 }));
}

export function reindexBlocks(phase: StudyPlanPhase): StudyPlanPhase {
  return {
    ...phase,
    blocks: [...phase.blocks]
      .sort((a, b) => a.block_order - b.block_order)
      .map((b, i) => ({ ...b, block_order: i + 1 })),
  };
}

const normaliseName = (s: any) => str(s, 120).toLowerCase().replace(/[^a-z0-9]+/g, '');

/** The company record matching a free-text name, if the app knows that company. */
function findCompany(db: any, name: string | undefined) {
  const key = normaliseName(name);
  if (!key) return null;
  const companies: any[] = Array.isArray(db?.companies) ? db.companies : [];
  return (
    companies.find((c) => c && normaliseName(c.name) === key) ||
    companies.find((c) => c && normaliseName(c.slug) === key) ||
    null
  );
}

function resolveCompanyId(db: any, name: string | undefined): string {
  return findCompany(db, name)?.id || '';
}

export interface ResolvedPlan {
  template: StudyPlanTemplate | null;
  phases: StudyPlanPhase[];
  source: 'template' | 'fallback';
  /**
   * The window the phases were actually fitted to, after clamping. The caller
   * must report this rather than the number it asked for, otherwise a guest who
   * generated a 45-day plan is told "14 days remaining" - the exact bug the
   * duration work was meant to remove.
   */
  totalDays: number;
}

/**
 * Last-resort roadmap. Deliberately retained so the endpoint can never return an
 * empty plan for a company that has no published template yet.
 */
export function fallbackPhases(company: string, role: string, days: number): StudyPlanPhase[] {
  const mk = (order: number, dayFrom: number, dayTo: number | null, title: string, text: string): StudyPlanPhase => ({
    id: `fallback-${order}`,
    template_id: '',
    phase_order: order,
    title,
    day_from: dayFrom,
    day_to: dayTo,
    summary: '',
    blocks: [{ id: `fallback-b-${order}`, block_type: 'markdown', block_order: 1, payload: { text } }],
  });

  const phases = [
    mk(1, 1, 3, 'HR & STAR Method Questions',
      `Prepare 5 STAR stories on conflict resolution, collaboration and role-relevant decisions for **${company}**.`),
    mk(2, 4, 7, 'Core Technical & High-Frequency Qs',
      `Practice the core DSA, concurrency and language topics most commonly asked for **${role}** roles.`),
    mk(3, 8, 11, 'System Design & High-Throughput Architecture',
      'Walk through idempotent transaction handling, rate limiting and scalable service design.'),
    mk(4, 12, null, 'Mock Drives & Verified Candidate Reports',
      `Review verified candidate reports for **${company}** and complete 45-minute timed mock tests.`),
  ];
  return scalePhasesToWindow(phases, days, { company, role });
}

/** The window assumed when the learner gave neither a date nor a day count. */
export const DEFAULT_TOTAL_DAYS = 14;
/** Upper bound on a plan window. Past a year the phases are not advice. */
export const MAX_TOTAL_DAYS = 365;

/** Longest stretch of extra runway the template's own last phase may absorb. */
const MAX_TAIL_STRETCH_DAYS = 14;
/** Length of each generated consolidation phase. */
const CONSOLIDATION_LENGTH = 7;

/**
 * Fits a plan to the window the learner actually has.
 *
 * Templates are authored for a typical sprint (roughly two to four weeks). A
 * learner 45 days from an interview must not be shown those same phases stretched
 * over six weeks — that reads as "nothing to do until week 6", and filling the
 * gap is the whole point of the plan. So:
 *
 *  - **Short window** (at or before the last explicitly covered day): phases that
 *    start after the window are dropped and the rest clamped, so a 5-day sprint
 *    shows 5 days of work instead of a truncated month-long plan.
 *  - **Long window**: an open-ended trailing phase absorbs up to
 *    `MAX_TAIL_STRETCH_DAYS` of the surplus, and whatever remains becomes real
 *    consolidation phases — revision, timed mocks, final logistics — so the plan
 *    always ends exactly on the last day of the window.
 *
 * Returns fresh, contiguously numbered phases with contiguous day ranges. The
 * stored template is never mutated: scaling is a read-time projection, so one
 * template can serve a 7-day sprint to one learner and a 45-day runway to
 * another. Re-scaling an already-scaled plan is a no-op.
 */
export function scalePhasesToWindow(
  phases: StudyPlanPhase[],
  totalDays: number,
  ctx: { company: string; role: string } = { company: 'your target company', role: 'the role' }
): StudyPlanPhase[] {
  if (!Array.isArray(phases) || phases.length === 0) return [];
  const window = Math.max(1, Math.round(Number(totalDays) || 0));
  const ordered = [...phases].sort((a, b) => a.day_from - b.day_from || a.phase_order - b.phase_order);
  const last = ordered[ordered.length - 1];

  // The last day the template explicitly covers. An open-ended final phase
  // contributes its start day minus one, because its own length is not authored.
  const anchor = ordered.reduce((max, p) => Math.max(max, p.day_to ?? p.day_from - 1), 0);
  const remaining = window - anchor;

  if (remaining <= 0) {
    const kept = ordered.filter((p) => p.day_from <= window);
    if (kept.length === 0) return [{ ...ordered[0], phase_order: 1, day_to: window }];
    return kept.map((p, i) => ({
      ...p,
      phase_order: i + 1,
      day_to: p.day_to == null ? window : Math.min(p.day_to, window),
    }));
  }

  // A trailing open-ended phase is the natural place to absorb some runway. A
  // template whose last phase is closed keeps that phase exactly as authored.
  const tailIsOpen = last.day_to == null;
  const stretch = tailIsOpen ? Math.min(remaining, MAX_TAIL_STRETCH_DAYS) : 0;

  const scaled = [...ordered];
  let nextDay = anchor + 1;
  if (tailIsOpen) {
    scaled[scaled.length - 1] = { ...last, day_to: last.day_from + stretch - 1 };
    nextDay = last.day_from + stretch;
  }

  const extras = consolidationPhases(nextDay, remaining - stretch, ctx);
  return [...scaled, ...extras].map((p, i) => ({ ...p, phase_order: i + 1 }));
}

/** Generated phases filling `surplusDays` starting on `startDay`. */
function consolidationPhases(
  startDay: number,
  surplusDays: number,
  ctx: { company: string; role: string }
): StudyPlanPhase[] {
  const out: StudyPlanPhase[] = [];
  if (surplusDays <= 0) return out;
  const kinds: Array<'revision' | 'mocks' | 'final'> = ['revision', 'mocks', 'final'];
  let cursor = 0;
  let k = 0;
  while (cursor < surplusDays) {
    const kind = kinds[Math.min(k, kinds.length - 1)];
    const remaining = surplusDays - cursor;
    // The final phase soaks up whatever is left, so the plan always ends exactly
    // on the last day of the window.
    const length = kind === 'final' ? remaining : Math.min(CONSOLIDATION_LENGTH, remaining);
    const dayFrom = startDay + cursor;
    out.push(consolidationPhase(dayFrom, dayFrom + length - 1, kind, ctx));
    cursor += length;
    k++;
  }
  return out;
}

/** One generated consolidation phase. Ids are derived from the day range so a
 *  regenerated plan for the same window is stable. */
function consolidationPhase(
  dayFrom: number,
  dayTo: number,
  kind: 'revision' | 'mocks' | 'final',
  ctx: { company: string; role: string }
): StudyPlanPhase {
  const content: Record<typeof kind, { title: string; summary: string; text: string; items: string[] }> = {
    revision: {
      title: 'Revision & Weak-Area Deep Dive',
      summary: 'Close the gaps you already have. No new ground.',
      text: `You have runway left, so spend it closing gaps rather than covering more surface. Re-do every topic you rated below 4/5 in confidence, then re-attempt the past-year questions you got wrong for **${ctx.role}** roles at **${ctx.company}**.`,
      items: [
        'List every topic you could not explain out loud, and re-read only those',
        'Re-attempt the questions you marked wrong, starting from a blank page',
        'Re-read your own STAR stories until each one carries a concrete number',
      ],
    },
    mocks: {
      title: 'Timed Mock Interviews & Feedback',
      summary: 'Full-length practice under real time pressure.',
      text: `Run complete mock drives on a timer and write down what you were slow at. Two full-length mocks are worth more than ten further hours of reading for **${ctx.role}** interviews.`,
      items: [
        '45-minute mock: 1 DSA, 1 system design, 1 behavioural',
        'Write three sentences on what you would answer differently next time',
        'Practise walking through your resume out loud, line by line',
      ],
    },
    final: {
      title: 'Final Consolidation & Logistics',
      summary: 'Stop learning. Prepare to perform.',
      text: 'No new material from here. Confirm the interview logistics, re-read your strongest answers once, and protect your sleep.',
      items: [
        'Confirm the time, the venue or call link, and who you are meeting',
        'One pass over your strongest answers — nothing more',
        'Sleep properly the night before; it is worth more than a final revision',
      ],
    },
  };
  const c = content[kind];
  return {
    id: `consolidation-${kind}-${dayFrom}`,
    template_id: '',
    phase_order: 0,
    title: c.title,
    day_from: dayFrom,
    day_to: dayTo,
    summary: c.summary,
    blocks: [
      { id: `consolidation-${kind}-${dayFrom}-md`, block_type: 'markdown', block_order: 1, payload: { text: c.text } },
      {
        id: `consolidation-${kind}-${dayFrom}-list`,
        block_type: 'checklist',
        block_order: 2,
        payload: { title: 'This phase', items: c.items },
      },
    ],
  };
}

/**
 * Resolution priority, most specific first:
 *   1. published template matching company AND role
 *   2. published template matching company only
 *   3. published generic template
 *   4. hardcoded fallback
 */
export function resolvePlan(
  db: any,
  opts: { companyName?: string; role?: string; totalDays: number }
): ResolvedPlan {
  const templates: StudyPlanTemplate[] = Array.isArray(db.study_plan_templates)
    ? db.study_plan_templates
    : [];
  const allPhases: StudyPlanPhase[] = Array.isArray(db.study_plan_phases) ? db.study_plan_phases : [];

  const published = templates.filter((t) => t && t.status === 'published');
  const companyKey = normaliseName(opts.companyName);
  const roleKey = normaliseName(opts.role);

  // The client only ever sends a company *name*, but templates are authored
  // against a `company_id`. Resolve the name to a real id so an id-keyed
  // template can be matched, and fall back to name comparison when the company
  // is not in the database (an admin can type a target the app does not know).
  const requestedId = resolveCompanyId(db, opts.companyName);

  const isGeneric = (t: StudyPlanTemplate) =>
    !t.company_id && !t.company_name && !normaliseName(t.company_name);

  /**
   * A template belongs to a company only if it actually names the one asked for.
   *
   * This used to be `!!t.company_id || normaliseName(t.company_name) === companyKey`,
   * which made EVERY company-scoped template match EVERY request — so the first
   * admin to publish an Amazon-specific plan served it to every student who
   * asked for Google. A populated `company_id` is a claim about *which*
   * company, never a wildcard.
   */
  const matchCompany = (t: StudyPlanTemplate) => {
    if (isGeneric(t)) return false;
    // When both sides are known, ids are authoritative — names get reworded.
    if (requestedId && t.company_id) return t.company_id === requestedId;
    // The requested company is not in the database, so compare on name only. A
    // template with an id but no name cannot be shown to match, so it does not.
    return !!t.company_name && normaliseName(t.company_name) === companyKey;
  };

  const matchRole = (t: StudyPlanTemplate) => !t.role || normaliseName(t.role) === roleKey;

  // Within a tier, most recently updated wins, so an admin who just published
  // a competing template sees theirs rather than whatever was inserted first.
  const byRecency = (a: StudyPlanTemplate, b: StudyPlanTemplate) =>
    (b.updated_at || '').localeCompare(a.updated_at || '');

  const tiers: StudyPlanTemplate[][] = [
    published.filter((t) => matchCompany(t) && t.role && matchRole(t)).sort(byRecency),
    published.filter((t) => matchCompany(t) && !t.role).sort(byRecency),
    published.filter((t) => isGeneric(t) && !t.role).sort(byRecency),
  ];

  for (const tier of tiers) {
    if (tier.length === 0) continue;
    const template = tier[0];
    const phases = allPhases
      .filter((p) => p && p.template_id === template.id)
      .sort((a, b) => a.phase_order - b.phase_order);
    if (phases.length > 0) {
      // A template is authored for its own intended length; fit it to the window
      // this learner actually has. Read-time only — the stored phases are kept.
      return {
        template,
        phases: scalePhasesToWindow(phases, opts.totalDays, {
          company: opts.companyName || 'your target company',
          role: opts.role || 'the role',
        }),
        source: 'template',
        totalDays: normaliseWindow(opts.totalDays),
      };
    }
  }

  return {
    template: null,
    phases: fallbackPhases(opts.companyName || 'Target Company', opts.role || 'SDE', opts.totalDays),
    source: 'fallback',
    totalDays: normaliseWindow(opts.totalDays),
  };
}

/** Clamps a requested window into the range the UI and schema both assume. */
export const normaliseWindow = (days: unknown): number => {
  const n = Math.round(Number(days));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TOTAL_DAYS;
  return Math.min(Math.max(n, 1), MAX_TOTAL_DAYS);
};

/** `YYYY-MM-DD`, the only date format a date picker produces. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Whole calendar days from `from` to `dateStr`, or null when the date is unusable.
 *
 * A date-only string has to be read as a LOCAL calendar date, not as UTC.
 * `new Date('2026-11-13')` is UTC midnight, which in IST is 05:30 local — and
 * subtracting local midnights from that silently loses a whole day. In practice
 * a learner in India picking an interview 45 days out was handed a 44-day plan,
 * and a learner in every timezone east of UTC hit the same off-by-one for the
 * first few hours of their local day.
 *
 * `Math.round` rather than `Math.ceil`: both ends are local midnights, so the
 * difference is an exact multiple of 24 hours except across a DST change, where a
 * day is 23 or 25 hours long. Ceiling would report a 25-hour day as two days;
 * rounding reports both correctly.
 */
export function daysUntil(dateStr: string | null | undefined, from = new Date()): number | null {
  if (!dateStr) return null;

  const raw = String(dateStr).trim();
  const dateOnly = DATE_ONLY.exec(raw);

  let targetMidnight: number;
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    targetMidnight = new Date(Number(year), Number(month) - 1, Number(day)).setHours(0, 0, 0, 0);
  } else {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    targetMidnight = parsed.setHours(0, 0, 0, 0);
  }

  const fromMidnight = new Date(from).setHours(0, 0, 0, 0);
  return Math.round((targetMidnight - fromMidnight) / 86400000);
}
