/**
 * Drops — feed rules in one place.
 *
 * The route file decides *who* is asking; this file decides *what* they get.
 * Keeping the rules here means the admin list, the public feed, the scheduler
 * and the test suite all answer "is this drop live?" the same way — the failure
 * mode of scattering that check across handlers is a drop that shows in the
 * preview and not in the feed, or vice versa, with no single place to look.
 *
 * Everything here is pure over the document store: no loadDb, no saveDb, no
 * request objects. Callers pass the rows in.
 */

import {
  ALL_DROP_TYPES,
  Drop,
  DropAudience,
  DropType,
} from '../data/db';

// ============================================================================
// TYPE METADATA — chip colour token, default CTA label, human label
// ============================================================================

export interface DropTypeMeta {
  /** CSS custom property defined in globals.css (`.drop-chip--<type>`). */
  chip: string;
  /** Default button copy when the drop has no cta_label of its own. */
  cta: string;
  /** Drawer/filter human label. */
  label: string;
  /** Filter chip order, lower first. */
  order: number;
}

export const DROP_TYPE_META: Record<DropType, DropTypeMeta> = {
  company:     { chip: 'var(--drop-company)',     cta: 'View Opportunity',      label: 'Companies',    order: 1 },
  job:         { chip: 'var(--drop-job)',         cta: 'Apply Now',             label: 'Jobs',         order: 2 },
  deadline:    { chip: 'var(--drop-deadline)',    cta: 'Apply Before Deadline', label: 'Deadlines',    order: 3 },
  vault:       { chip: 'var(--drop-vault)',       cta: 'Open Vault',            label: 'Vaults',       order: 4 },
  skilltest:   { chip: 'var(--drop-skilltest)',   cta: 'Test Your Skills',      label: 'Skill Test',   order: 5 },
  course:      { chip: 'var(--drop-course)',      cta: 'Explore Course',        label: 'Courses',      order: 6 },
  contest:     { chip: 'var(--drop-contest)',     cta: 'Join Challenge',        label: 'Contests',     order: 7 },
  selected:    { chip: 'var(--drop-selected)',    cta: 'Read Story',            label: 'Selected',     order: 8 },
  scholarship: { chip: 'var(--drop-scholarship)', cta: 'View Scholarship',      label: 'Scholarships', order: 9 },
  college:     { chip: 'var(--drop-college)',     cta: 'View Details',          label: 'College',      order: 10 },
  tip:         { chip: 'var(--drop-tip)',         cta: 'Read Tip',              label: 'Tips',         order: 11 },
  tieedu:      { chip: 'var(--drop-tieedu)',      cta: 'Explore Now',           label: 'TieEdu',       order: 12 },
};

export const isDropType = (value: unknown): value is DropType =>
  typeof value === 'string' && (ALL_DROP_TYPES as string[]).includes(value);

export const dropLabel = (type: DropType): string => DROP_TYPE_META[type]?.label || type;

export const dropCtaLabel = (drop: Pick<Drop, 'type' | 'cta_label'>): string => {
  const custom = (drop.cta_label || '').trim();
  if (custom) return custom.slice(0, 32);
  return DROP_TYPE_META[drop.type]?.cta || 'Read More';
};

// ============================================================================
// LIVENESS — publish window, expiry, status
// ============================================================================

const time = (value: string | undefined | null): number => {
  if (!value) return NaN;
  const t = Date.parse(value);
  return Number.isNaN(t) ? NaN : t;
};

/**
 * Is this drop visible in a student feed right now?
 *
 * A window is only enforced when the bound actually parses, so a typo in the
 * admin form can never silently retire every scheduled drop — same rule the
 * poster scheduler follows (`posters.routes.ts isLive`).
 *
 * `draft` and `archived` are never live. `scheduled` becomes live the moment
 * publish_at passes; the status string itself is not flipped by this function
 * (the scheduler does that) but the feed reads through it so a scheduled drop
 * that is already due does not disappear for lack of a background tick.
 */
export const isDropLive = (drop: Drop, now = Date.now()): boolean => {
  if (!drop || typeof drop !== 'object') return false;
  if (drop.status === 'draft' || drop.status === 'archived') return false;
  // `scheduled` means "waiting for publish_at". Without a parseable bound it
  // never becomes due — a half-filled admin form must not publish itself.
  if (drop.status === 'scheduled') {
    const due = time(drop.publish_at);
    if (Number.isNaN(due) || now < due) return false;
  }
  const publishAt = time(drop.publish_at);
  if (!Number.isNaN(publishAt) && now < publishAt) return false;
  const expiresAt = time(drop.expires_at);
  if (!Number.isNaN(expiresAt) && now > expiresAt) return false;
  // A deadline that has passed drops out of the normal feed automatically —
  // an expired drive in front of a student is worse than no drive at all.
  const deadlineAt = time(drop.deadline_at);
  if (!Number.isNaN(deadlineAt) && now > deadlineAt && (drop.type === 'deadline' || drop.type === 'job')) {
    return false;
  }
  return true;
};

/** The list-status pill the admin console shows. */
export const dropListStatus = (
  drop: Drop,
  now = Date.now()
): 'live' | 'scheduled' | 'draft' | 'expired' | 'archived' => {
  if (drop.status === 'archived') return 'archived';
  if (drop.status === 'draft') return 'draft';
  if (drop.status === 'scheduled') {
    // Mirrors isDropLive: waiting, or waiting forever on a bad date — either
    // way it is not live, and the list must not promise otherwise.
    const due = time(drop.publish_at);
    if (Number.isNaN(due) || now < due) return 'scheduled';
  }
  const publishAt = time(drop.publish_at);
  if (!Number.isNaN(publishAt) && now < publishAt) return 'scheduled';
  const expiresAt = time(drop.expires_at);
  if (!Number.isNaN(expiresAt) && now > expiresAt) return 'expired';
  const deadlineAt = time(drop.deadline_at);
  if (!Number.isNaN(deadlineAt) && now > deadlineAt) return 'expired';
  return 'live';
};

// ============================================================================
// AUDIENCE — who a drop is for
// ============================================================================

export interface AudienceSubject {
  id?: string;
  college?: string;
  grad_year?: number | string;
  branch?: string;
  skills?: string[];
}

const norm = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

const normList = (values: unknown): string[] =>
  Array.isArray(values) ? values.map(norm).filter(Boolean) : [];

/**
 * Does an audience admit this viewer? An empty audience admits everyone.
 *
 * A subject with no profile (signed-out, or a student who never filled in
 * college/branch) can only see audience-free drops and drops written for them
 * by id — a college-scoped drop must not leak to viewers who have not told us
 * their college, and guessing would be worse than withholding.
 */
export const audienceMatches = (audience: DropAudience | undefined, subject: AudienceSubject | null): boolean => {
  const a = audience || {};
  const hasTarget =
    normList(a.colleges).length > 0 ||
    (Array.isArray(a.batches) && a.batches.length > 0) ||
    normList(a.branches).length > 0 ||
    normList(a.skills).length > 0 ||
    !!a.user_id;

  if (!hasTarget) return true; // unscoped: everyone

  if (a.user_id) return !!subject?.id && subject.id === a.user_id;

  // Every present dimension must pass (AND), so a CSE-2027-GLA drop needs all
  // three to line up rather than any one of them.
  const colleges = normList(a.colleges);
  if (colleges.length > 0) {
    const mine = norm(subject?.college);
    if (!mine || !colleges.includes(mine)) return false;
  }

  const batches = (Array.isArray(a.batches) ? a.batches : []).map(Number).filter((n) => Number.isFinite(n));
  if (batches.length > 0) {
    const year = Number(subject?.grad_year);
    if (!Number.isFinite(year) || !batches.includes(year)) return false;
  }

  const branches = normList(a.branches);
  if (branches.length > 0) {
    const mine = norm(subject?.branch);
    if (!mine || !branches.includes(mine)) return false;
  }

  const skills = normList(a.skills);
  if (skills.length > 0) {
    const mine = new Set(normList(subject?.skills));
    if (mine.size === 0 || !skills.some((s) => mine.has(s))) return false;
  }

  return true;
};

// ============================================================================
// FEED — filter + sort + paginate
// ============================================================================

export interface FeedOptions {
  now?: number;
  type?: DropType | null;
  subject?: AudienceSubject | null;
  /** drop ids this viewer has already seen — unseen sort first. */
  seen?: Set<string>;
  /** drop/type/company ids this viewer muted. */
  mutedDrops?: Set<string>;
  mutedTypes?: Set<string>;
  mutedCompanies?: Set<string>;
  cursor?: string | null;
  limit?: number;
}

export interface FeedPage {
  items: Drop[];
  next_cursor: string | null;
  /** Live drops matching filters, before pagination — the 30/30 counter. */
  total: number;
}

/** Feed ceiling. The plan's 30-card window; keeps one response bounded. */
export const FEED_MAX_LIMIT = 30;
/** Hard cap on simultaneously live drops (editorial rule, server-enforced). */
export const MAX_ACTIVE_DROPS = 30;
/** Hard cap on drops publishing on one calendar day (UTC). */
export const MAX_PUBLISH_PER_DAY = 10;

/** The UTC calendar day a drop is counted against for the 10/day rule. */
export const publishDay = (d: Drop): string => String(d.publish_at || d.created_at || '').slice(0, 10);

/**
 * Editorial caps, checked against the state the write would produce.
 *
 * Both are 409 rather than 400: the payload itself is valid, it is the
 * schedule that no longer fits, and the admin UI treats 409 as "make room".
 *
 * Exported because there are two writers — the admin routes (which surface the
 * message as the 409 body) and `lib/autoDrops.ts` (which degrades the write to
 * a draft instead). One implementation, so a cap change cannot be honoured by
 * one path and ignored by the other.
 */
export const checkDropCaps = (list: Drop[], next: Drop, selfId?: string): string | null => {
  const others = list.filter((d) => d.id !== selfId);
  if (isDropLive(next) && others.filter((d) => isDropLive(d)).length >= MAX_ACTIVE_DROPS) {
    return `Ek time par sirf ${MAX_ACTIVE_DROPS} drops live ho sakte hain — pehle koi archive ya expire karo`;
  }
  if (next.status === 'published' || next.status === 'scheduled') {
    const day = publishDay(next);
    const used = others.filter(
      (d) => (d.status === 'published' || d.status === 'scheduled') && publishDay(d) === day
    ).length;
    if (used >= MAX_PUBLISH_PER_DAY) {
      return `${day} ke liye ${MAX_PUBLISH_PER_DAY} drops ka quota bhar chuka hai`;
    }
  }
  return null;
};

/**
 * Ordering: pinned → priority → live deadlines (soonest first) → newest.
 *
 * Deliberately a segmented comparator rather than one packed numeric key: a
 * publish timestamp is unbounded — it grows ~1.3e12 a year — so any fixed
 * segment weight for the tiers above it is eventually swamped by time, and a
 * deadline drop silently sinks below a fresh non-deadline one some years from
 * now. Explicit tiers cannot drift: each one is checked before the next.
 */
const compareDrops = (a: Drop, b: Drop): number => {
  const pinned = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
  if (pinned !== 0) return pinned;

  const priority = (b.priority || 0) - (a.priority || 0);
  if (priority !== 0) return priority;

  const aDeadline = time(a.deadline_at);
  const bDeadline = time(b.deadline_at);
  const aHas = Number.isNaN(aDeadline) ? 0 : 1;
  const bHas = Number.isNaN(bDeadline) ? 0 : 1;
  if (aHas !== bHas) return bHas - aHas;
  if (aHas === 1 && aDeadline !== bDeadline) return aDeadline - bDeadline;

  const pa = time(a.publish_at) || 0;
  const pb = time(b.publish_at) || 0;
  return pb - pa;
};

/**
 * The public feed.
 *
 * Order: pinned → priority → live deadlines (soonest first) → newest.
 * Viewer-seen drops are demoted but never filtered: a student scrolling back
 * expects the same list, not a shorter one, and the counter in the UI reads
 * `total` against the unfiltered window.
 */
export const buildDropFeed = (drops: Drop[], opts: FeedOptions = {}): FeedPage => {
  const now = opts.now ?? Date.now();
  const limit = Math.min(Math.max(Number(opts.limit) || FEED_MAX_LIMIT, 1), FEED_MAX_LIMIT);
  const seen = opts.seen || new Set<string>();
  const mutedDrops = opts.mutedDrops || new Set<string>();
  const mutedTypes = opts.mutedTypes || new Set<string>();
  const mutedCompanies = opts.mutedCompanies || new Set<string>();

  const filtered = (Array.isArray(drops) ? drops : []).filter((d) => {
    if (!isDropLive(d, now)) return false;
    if (opts.type && d.type !== opts.type) return false;
    if (!audienceMatches(d.audience, opts.subject || null)) return false;
    if (mutedDrops.has(d.id)) return false;
    if (mutedTypes.has(d.type)) return false;
    if (d.target_slug && mutedCompanies.has(d.target_slug)) return false;
    return true;
  });

  const sorted = filtered.slice().sort((a, b) => {
    // Seen/unseen is a coarse two-bucket split applied *before* the fine
    // ordering, so a new drop always surfaces ahead of one already read even
    // if the read one is pinned later.
    const seenDelta = (seen.has(a.id) ? 1 : 0) - (seen.has(b.id) ? 1 : 0);
    if (seenDelta !== 0) return seenDelta;
    return compareDrops(a, b);
  });

  const start = Math.max(Number(opts.cursor) || 0, 0);
  const items = sorted.slice(start, start + limit);
  const next = start + limit < sorted.length ? String(start + limit) : null;

  return { items, next_cursor: next, total: sorted.length };
};

// ============================================================================
// VALIDATION — the editorial rules, enforced once at the API boundary
// ============================================================================

export interface DropInput {
  type?: unknown;
  headline?: unknown;
  bullets?: unknown;
  image_stored_name?: unknown;
  image_file_name?: unknown;
  image_alt?: unknown;
  cta_label?: unknown;
  cta_route?: unknown;
  cta_url?: unknown;
  target_slug?: unknown;
  body_md?: unknown;
  deadline_at?: unknown;
  sponsored?: unknown;
  sponsor_name?: unknown;
  pinned?: unknown;
  priority?: unknown;
  status?: unknown;
  publish_at?: unknown;
  expires_at?: unknown;
  audience?: unknown;
  tags?: unknown;
  author_id?: unknown;
  source?: unknown;
}

export type DropValidation =
  | { ok: true; value: Partial<Drop> }
  | { ok: false; error: string };

/** ISO in, ISO out. An unparseable date is dropped rather than trusted. */
export const normaliseDate = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const t = Date.parse(String(value));
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
};

/**
 * Force an in-app link to be a plain site path.
 *
 * Same reasoning as `notify.ts safePath`: a stored value like `//evil.example`
 * is read as protocol-relative by the browser, so "starts with /" is not
 * enough. Control characters are rejected by scanning code points (a regex
 * character class with raw escapes is how you accidentally ship a broken
 * pattern — the check is simple enough to spell out with charCodeAt).
 */
const safeRoute = (value: string): string | null => {
  const v = value.trim();
  if (!v) return '';
  if (!v.startsWith('/')) return null;
  if (v.startsWith('//') || v.startsWith('/\\')) return null;
  for (let i = 0; i < v.length; i += 1) {
    if (v.charCodeAt(i) < 32) return null;
  }
  return v;
};

const safeUrl = (value: string): string | null => {
  const v = value.trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch {
    return null;
  }
};

/**
 * Validate and coerce one drop payload.
 *
 * Returns the coerced fields rather than mutating the input: every caller
 * (create, update, auto-drop) builds a patch object from this, so a rejected
 * field can never half-apply.
 */
export const validateDropInput = (input: DropInput, opts: { requireImage?: boolean } = {}): DropValidation => {
  const type = String(input.type || '');
  if (!isDropType(type)) return { ok: false, error: 'type valid nahi hai' };

  const headline = String(input.headline || '').trim();
  if (headline.length < 10) return { ok: false, error: 'Headline kam se kam 10 characters ka hona chahiye' };
  if (headline.length > 100) return { ok: false, error: 'Headline 100 characters se bada hai' };

  const rawBullets = Array.isArray(input.bullets) ? input.bullets : [];
  const bullets = rawBullets.map((b) => String(b || '').trim()).filter(Boolean);
  if (bullets.length < 1) return { ok: false, error: 'Kam se kam 1 bullet chahiye' };
  if (bullets.length > 3) return { ok: false, error: 'Maximum 3 bullets allowed hain' };
  for (const b of bullets) {
    if (b.length > 120) return { ok: false, error: 'Har bullet 120 characters se bada hai' };
  }

  const imageStored = String(input.image_stored_name || '');
  if (opts.requireImage && !imageStored) return { ok: false, error: 'Pehle ek drop image upload karo' };

  const ctaRouteRaw = String(input.cta_route || '').trim();
  let cta_route: string | undefined;
  if (ctaRouteRaw) {
    const safe = safeRoute(ctaRouteRaw);
    if (safe === null) return { ok: false, error: 'CTA route valid internal path nahi hai' };
    cta_route = safe || undefined;
  }

  const ctaUrlRaw = String(input.cta_url || '').trim();
  let cta_url: string | undefined;
  if (ctaUrlRaw) {
    const safe = safeUrl(ctaUrlRaw);
    if (safe === null) return { ok: false, error: 'CTA url valid http(s) link nahi hai' };
    cta_url = safe || undefined;
  }

  if (!cta_route && !cta_url && !String(input.target_slug || '').trim()) {
    // A drop with no destination still renders, but Read More needs body_md.
    if (!String(input.body_md || '').trim()) {
      return { ok: false, error: 'CTA destination ya Read More content dono me se ek chahiye' };
    }
  }

  const statusRaw = String(input.status || 'draft');
  const status = (['draft', 'scheduled', 'published', 'archived'] as const).includes(statusRaw as any)
    ? (statusRaw as Drop['status'])
    : 'draft';

  const priorityRaw = Number(input.priority);
  const priority: 0 | 1 | 2 = priorityRaw === 2 ? 2 : priorityRaw === 1 ? 1 : 0;

  const publish_at = normaliseDate(input.publish_at);
  const expires_at = normaliseDate(input.expires_at);
  const deadline_at = normaliseDate(input.deadline_at);
  if (publish_at && expires_at && Date.parse(expires_at) <= Date.parse(publish_at)) {
    return { ok: false, error: 'Expiry time publish time ke baad hona chahiye' };
  }

  const audience = normaliseAudience(input.audience);

  const tags = (Array.isArray(input.tags) ? input.tags : [])
    .map((t) => String(t || '').trim().toLowerCase().slice(0, 32))
    .filter(Boolean)
    .slice(0, 10);

  const body = String(input.body_md || '').trim();
  if (body.length > 20000) return { ok: false, error: 'Article 20,000 characters se bada hai' };

  const value: Partial<Drop> = {
    type,
    headline,
    bullets,
    image_alt: String(input.image_alt || '').trim().slice(0, 160) || undefined,
    cta_label: String(input.cta_label || '').trim().slice(0, 32) || undefined,
    cta_route,
    cta_url,
    target_slug: String(input.target_slug || '').trim().toLowerCase().slice(0, 80) || undefined,
    body_md: body || undefined,
    deadline_at,
    sponsored: input.sponsored === true,
    sponsor_name: String(input.sponsor_name || '').trim().slice(0, 60) || undefined,
    pinned: input.pinned === true,
    priority,
    status,
    publish_at,
    expires_at,
    audience,
    tags,
  };

  if (imageStored) {
    value.image_stored_name = imageStored;
    value.image_file_name = String(input.image_file_name || 'drop').slice(0, 200);
  }

  return { ok: true, value };
};

/**
 * Coerce an audience object, dropping anything that is not the documented
 * shape. An invalid field narrows the audience rather than widening it: a
 * malformed `colleges` entry simply matches nobody, it never falls back to
 * "everyone".
 */
export const normaliseAudience = (raw: unknown): DropAudience => {
  const out: DropAudience = {};
  if (!raw || typeof raw !== 'object') return out;
  const a = raw as Record<string, unknown>;

  const colleges = normList(a.colleges).slice(0, 20);
  if (colleges.length) out.colleges = colleges;

  const batches = (Array.isArray(a.batches) ? a.batches : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 2000 && n < 2100)
    .slice(0, 10);
  if (batches.length) out.batches = batches;

  const branches = normList(a.branches).slice(0, 20);
  if (branches.length) out.branches = branches;

  const skills = normList(a.skills).slice(0, 20);
  if (skills.length) out.skills = skills;

  if (typeof a.user_id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(a.user_id)) out.user_id = a.user_id;

  return out;
};

/** Is this audience empty (= everyone)? Used by the admin list badge. */
export const isUnscopedAudience = (audience: DropAudience | undefined): boolean =>
  Object.keys(audience || {}).length === 0;

// ============================================================================
// DEDUPE + AUTO-DROPS
// ============================================================================

/**
 * Has this platform event already produced a drop?
 *
 * The key is event + entity id, so a course published, unpublished and
 * re-published creates one draft, not three — and an admin who deleted the
 * draft gets a fresh one on the next event rather than a silent no-op.
 */
export const hasAutoDrop = (drops: Drop[], event: string, entityId: string): boolean =>
  (drops || []).some(
    (d) =>
      d &&
      d.source &&
      d.source.kind === 'auto' &&
      d.source.event === event &&
      d.source.entity_id === entityId
  );

/** Deterministic bullet copy for auto-drops — templates, not an LLM. */
export const autoDropTemplate = (
  type: DropType,
  ctx: { title: string; detail?: string; count?: number; slug?: string }
): { headline: string; bullets: string[] } => {
  const title = ctx.title.trim().slice(0, 60);
  const detail = (ctx.detail || '').trim().slice(0, 110);

  switch (type) {
    case 'course':
      return {
        headline: `${title} is now live`,
        bullets: [
          detail || 'Placement-focused curriculum, beginner to advanced',
          `${ctx.count ?? 'Fresh'} lessons with practice material`,
          'Certificate on completion',
        ].slice(0, 3),
      };
    case 'vault':
      return {
        headline: `${title} vault just got updated`,
        bullets: [
          detail || 'New interview questions added',
          'Latest assessment pattern',
          'Round-wise preparation material',
        ].slice(0, 3),
      };
    case 'skilltest':
      return {
        headline: `How strong is your ${title}?`,
        bullets: [
          detail || 'Free assessment with instant analysis',
          'Verified certificate available',
          'Know your level before the interview',
        ].slice(0, 3),
      };
    case 'selected':
      return {
        headline: `Another TieEdu student cracked ${title}`,
        bullets: [
          detail || 'Selection confirmed',
          'Preparation journey available',
          'Read the full story',
        ].slice(0, 3),
      };
    default:
      return {
        headline: title,
        bullets: [detail || 'New update on TieEdu', 'Tap for details'].slice(0, 2),
      };
  }
};
