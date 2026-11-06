import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  loadDb,
  saveDb,
  Drop,
  DropEventKind,
  DropType,
} from '../data/db';
import {
  requireAdmin,
  requireAuth,
  optionalAuth,
  requirePermission,
  rateLimit,
} from '../middleware/auth';
import { appendAudit } from '../store/audit';
import {
  DROP_TYPE_META,
  FEED_MAX_LIMIT,
  MAX_ACTIVE_DROPS,
  MAX_PUBLISH_PER_DAY,
  AudienceSubject,
  buildDropFeed,
  checkDropCaps,
  dropCtaLabel,
  dropListStatus,
  isDropLive,
  isDropType,
  validateDropInput,
  DropInput,
  DROP_FILE_RE,
} from '../lib/drops';
import { startDropScheduler } from '../lib/dropScheduler';
import {
  dropSnapshot,
  flushDropEvents,
  invalidateDrops,
  pendingLikeDelta,
  pendingLikeFor,
  pendingSeenFor,
  queueDropEvent,
  queueDropLike,
  startDropFlusher,
  type DropSnapshot,
} from '../lib/dropStore';

export const dropsRouter = Router();

/*
 * The scheduler lives here rather than in server.ts for the same reason the
 * reminder loop is armed in notifications.routes.ts: a mounted router is the
 * reliable place — importing the router is what arms it, so tests and scripts
 * that mount this router get the same behaviour as production without
 * remembering a second wiring step.
 */
startDropScheduler();
startDropFlusher();

/*
 * TieEdu Drops — the vertical career feed.
 *
 * Split mirrors posters.routes.ts: public reads (the feed has to work for a
 * logged-out visitor on the landing page) and a `/admin` subtree behind
 * requireAdmin, further narrowed to the `drops.read`/`drops.write` grants so a
 * content editor can run the feed without getting the rest of the admin
 * console.
 *
 * The editorial rules (window liveness, 30-live cap, 10-per-day cap, headline
 * limits) live in lib/drops.ts and are enforced here at the write boundary —
 * the feed never re-checks them per row beyond `isDropLive`, so a rule change
 * has one file to touch.
 */

// ============================================================================
// UPLOADS — same shape as posters: allow-listed extensions, opaque stored name
// ============================================================================

const UPLOAD_DIR = path.join(__dirname, '../../uploads/drops');
export const ensureDropUploadDir = () => fs.mkdirSync(UPLOAD_DIR, { recursive: true });
ensureDropUploadDir();

/*
 * One upload route for all three media kinds. Images arrive already resized to
 * 1080x1920 by the console (DropMediaFitter), so the image ceiling is a guard,
 * not a working size; GIFs and clips are passed through untouched.
 */
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const VIDEO_EXT = new Set(['.mp4', '.webm']);
const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
const ALLOWED_EXT = new Set([...IMAGE_EXT, ...VIDEO_EXT, ...AUDIO_EXT]);
const STORED_NAME_RE = DROP_FILE_RE;
const MAX_BYTES = { image: 10 * 1024 * 1024, video: 40 * 1024 * 1024, audio: 5 * 1024 * 1024 };
const kindOfExt = (ext: string): 'image' | 'video' | 'audio' =>
  VIDEO_EXT.has(ext) ? 'video' : AUDIO_EXT.has(ext) ? 'audio' : 'image';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg';
    const suffix = Math.random().toString(36).slice(2, 10);
    cb(null, `drop-${Date.now()}-${suffix}${safeExt}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeOk = /^(image|video|audio)\//.test(file.mimetype) || file.mimetype === 'application/octet-stream';
  if (mimeOk && ALLOWED_EXT.has(ext)) cb(null, true);
  else cb(new Error('ONLY_IMAGE_ALLOWED'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES.video },
}).single('file');

function unlinkStored(storedName: string | null | undefined) {
  if (!storedName || !STORED_NAME_RE.test(storedName)) return;
  fs.rm(path.join(UPLOAD_DIR, storedName), { force: true }, () => {});
}

// ============================================================================
// SHAPES + SMALL HELPERS
// ============================================================================

const allDrops = (db: any): Drop[] => (Array.isArray(db.drops) ? db.drops : []);

const newId = () => `drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyStats = () => ({ views: 0, unique_viewers: 0, cta_clicks: 0, shares: 0, saves: 0, dwell_ms_total: 0 });

const fileUrl = (name: string | undefined | null) => (name ? `/api/drops/file/${encodeURIComponent(name)}` : null);

/** Version stamp on the generated creative so an edit is not hidden by the 1h cache. */
const artVersion = (d: Drop) => String(Date.parse(d.updated_at || d.created_at || '') || 0).slice(-8);

/** Public feed shape — no body_md (that ships on the detail route only). */
function toPublicFeed(d: Drop) {
  return {
    id: d.id,
    type: d.type,
    headline: d.headline,
    bullets: d.bullets || [],
    // No upload: a generated creative in the type's colour (routes/covers.routes.ts).
    image_url: d.image_stored_name ? fileUrl(d.image_stored_name) : `/api/covers/drop/${encodeURIComponent(d.id)}.svg?v=${artVersion(d)}`,
    image_alt: d.image_alt || d.headline,
    video_url: d.video_url || null,
    video_file_url: fileUrl(d.video_stored_name),
    audio_url: d.sound === 'custom' ? fileUrl(d.audio_stored_name) : null,
    is_generated_art: !d.image_stored_name,
    motion: d.motion || 'kenburns',
    effect: d.effect || 'none',
    text_anim: d.text_anim || 'rise',
    sound: d.sound || 'none',
    cta_label: dropCtaLabel(d),
    cta_route: d.cta_route || null,
    cta_url: d.cta_url || null,
    target_slug: d.target_slug || null,
    deadline_at: d.deadline_at || null,
    sponsored: d.sponsored === true,
    sponsor_name: d.sponsor_name || null,
    has_body: !!d.body_md || (d.facts || []).length > 0,
    quiz: d.quiz || null,
    likes: d.stats?.likes || 0,
    views: d.stats?.views || 0,
  };
}

/** Detail shape — the Read More sheet needs the article. */
function toPublicDetail(d: Drop) {
  return {
    ...toPublicFeed(d),
    body_md: d.body_md || '',
    facts: d.facts || [],
    source_name: d.source_name || null,
    source_url: d.source_url || null,
    tags: d.tags || [],
    created_at: d.created_at,
    publish_at: d.publish_at || null,
    expires_at: d.expires_at || null,
  };
}

function toAdminShape(d: Drop) {
  return {
    ...d,
    is_live: isDropLive(d),
    list_status: dropListStatus(d),
    image_url: d.image_stored_name ? fileUrl(d.image_stored_name) : null,
    art_url: `/api/covers/drop/${encodeURIComponent(d.id)}.svg?v=${artVersion(d)}`,
    video_file_url: fileUrl(d.video_stored_name),
    audio_url: fileUrl(d.audio_stored_name),
  };
}

/**
 * Audience subject for the caller.
 *
 * `User` carries id/college today; grad_year/branch/skills are read through
 * the same loose record so a profile that gains those fields starts matching
 * without a route change. Absent fields never match a scoped audience — a
 * batch-targeted drop stays hidden rather than leaking to everyone.
 */
function subjectOf(req: Request): AudienceSubject | null {
  const u = req.user;
  if (!u) return null;
  const loose = u as unknown as Record<string, unknown>;
  return {
    id: u.id,
    college: u.college || undefined,
    grad_year: loose.grad_year as number | string | undefined,
    branch: loose.branch as string | undefined,
    skills: Array.isArray(loose.skills) ? (loose.skills as string[]) : [],
  };
}

/**
 * Viewer's read-state + mutes, so the feed can float unseen drops first.
 * Read from the in-memory snapshot, plus this viewer's still-queued views.
 */
function viewerSets(snap: DropSnapshot, userId: string | undefined) {
  const seen = new Set<string>();
  const mutedDrops = new Set<string>();
  const mutedTypes = new Set<string>();
  const mutedCompanies = new Set<string>();
  if (!userId) return { seen, mutedDrops, mutedTypes, mutedCompanies };
  snap.seenBy.get(userId)?.forEach((id) => seen.add(id));
  pendingSeenFor(userId).forEach((id) => seen.add(id));
  for (const m of snap.mutes) {
    if (!m || m.user_id !== userId) continue;
    if (m.kind === 'drop') mutedDrops.add(m.value);
    else if (m.kind === 'type') mutedTypes.add(m.value);
    else if (m.kind === 'company') mutedCompanies.add(m.value);
  }
  return { seen, mutedDrops, mutedTypes, mutedCompanies };
}

/** Like state + live counter for one viewer, queued likes included. */
function likeView(snap: DropSnapshot, d: Drop, userId: string | undefined) {
  const likedNow = (uid: string) => !!snap.likedBy.get(uid)?.has(d.id);
  const pending = pendingLikeFor(userId, d.id);
  return {
    liked: !!userId && (pending !== undefined ? pending : likedNow(userId)),
    likes: Math.max(0, (d.stats?.likes || 0) + pendingLikeDelta(d.id, likedNow)),
  };
}

/** Public card + this viewer's like state. */
const feedCard = (snap: DropSnapshot, d: Drop, userId: string | undefined) => ({ ...toPublicFeed(d), ...likeView(snap, d, userId) });

/** The UTC calendar day a drop is counted against for the 10/day rule. */
// `publishDay` + `checkCaps` moved to lib/drops.ts as `publishDay`/`checkDropCaps`
// so lib/autoDrops.ts enforces the exact same editorial budget.

/**
 * Merge a partial admin patch over the stored row, then validate the result.
 *
 * Validation always sees a complete record, so a patch that only fixes the
 * headline still trips the bullet/CTA rules if the stored row is already bad —
 * the editor cannot save a half-valid drop by touching one field.
 */
function mergeInput(current: Drop, body: Record<string, unknown>): DropInput {
  const pick = <K extends keyof DropInput>(key: K): DropInput[K] =>
    body[key] !== undefined ? (body[key] as DropInput[K]) : (current[key as unknown as keyof Drop] as DropInput[K]);
  return {
    type: pick('type'),
    headline: pick('headline'),
    bullets: pick('bullets'),
    image_stored_name: pick('image_stored_name'),
    image_file_name: pick('image_file_name'),
    image_alt: pick('image_alt'),
    cta_label: pick('cta_label'),
    cta_route: pick('cta_route'),
    cta_url: pick('cta_url'),
    video_url: pick('video_url'),
    target_slug: pick('target_slug'),
    body_md: pick('body_md'),
    deadline_at: pick('deadline_at'),
    sponsored: pick('sponsored'),
    sponsor_name: pick('sponsor_name'),
    pinned: pick('pinned'),
    priority: pick('priority'),
    status: pick('status'),
    publish_at: pick('publish_at'),
    expires_at: pick('expires_at'),
    audience: pick('audience'),
    tags: pick('tags'),
    video_stored_name: pick('video_stored_name'),
    audio_stored_name: pick('audio_stored_name'),
    art: pick('art'),
    art_text: pick('art_text'),
    art_sub: pick('art_sub'),
    motion: pick('motion'),
    effect: pick('effect'),
    text_anim: pick('text_anim'),
    sound: pick('sound'),
    facts: pick('facts'),
    source_name: pick('source_name'),
    source_url: pick('source_url'),
    quiz: pick('quiz'),
  };
}

/** Every uploaded file the payload names must exist on disk. */
function missingUpload(body: Record<string, unknown>): string | null {
  for (const key of ['image_stored_name', 'video_stored_name', 'audio_stored_name']) {
    const name = String(body[key] || '');
    if (!name) continue;
    if (!STORED_NAME_RE.test(name) || !fs.existsSync(path.join(UPLOAD_DIR, name))) {
      return 'Uploaded file server par nahi mili — dobara upload karo';
    }
  }
  return null;
}

/** Delete a stored file unless another drop (a duplicate) still points at it. */
function releaseFile(list: Drop[], ownerId: string, name: string | undefined) {
  if (!name) return;
  const stillUsed = list.some(
    (d) => d.id !== ownerId && (d.image_stored_name === name || d.video_stored_name === name || d.audio_stored_name === name)
  );
  if (!stillUsed) unlinkStored(name);
}

function pushEvent(db: any, dropId: string, userId: string | null, event: DropEventKind, meta?: { dwell_ms?: number }) {
  if (!Array.isArray(db.drop_events)) db.drop_events = [];
  db.drop_events.push({
    id: `devt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    drop_id: dropId,
    user_id: userId,
    event,
    created_at: new Date().toISOString(),
    ...(meta && meta.dwell_ms ? { dwell_ms: meta.dwell_ms } : {}),
  });
  // Raw event rows feed the analytics tab; without a bound a launch post that
  // goes mildly viral turns the one file every request reads into a slow one.
  const EVENT_CAP = 50000;
  if (db.drop_events.length > EVENT_CAP) db.drop_events = db.drop_events.slice(-EVENT_CAP);
}

// ============================================================================
// PUBLIC — feed, detail, events, bookmarks, mutes
// ============================================================================

/** GET /api/drops/file/:storedName — serve the drop creative. */
dropsRouter.get('/file/:storedName', (req: Request, res: Response) => {
  const { storedName } = req.params;
  if (!STORED_NAME_RE.test(storedName)) return res.status(404).json({ error: 'Invalid file' });

  const filePath = path.join(UPLOAD_DIR, storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });

  const ext = path.extname(storedName).toLowerCase();
  const mime: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
  };
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
  // Names embed a timestamp + random suffix, so bytes never change for a name.
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
});

/**
 * GET /api/drops — the feed.
 *
 * optionalAuth, not requireAuth: the landing page shows drops to logged-out
 * visitors, and a session only upgrades the ordering (unseen first, mutes
 * applied). Never cached — the response is per-viewer.
 */
dropsRouter.get('/', optionalAuth, (req: Request, res: Response) => {
  const snap = dropSnapshot();
  const q = req.query || {};

  let type: DropType | null = null;
  if (q.type !== undefined && q.type !== '') {
    if (!isDropType(q.type)) return res.status(400).json({ error: 'Invalid type filter' });
    type = q.type as DropType;
  }

  const limitRaw = Number(q.limit);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), FEED_MAX_LIMIT) : FEED_MAX_LIMIT;

  const { seen, mutedDrops, mutedTypes, mutedCompanies } = viewerSets(snap, req.userId);
  const page = buildDropFeed(snap.drops, {
    type,
    subject: subjectOf(req),
    seen,
    mutedDrops,
    mutedTypes,
    mutedCompanies,
    cursor: typeof q.cursor === 'string' ? q.cursor : null,
    limit,
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    items: page.items.map((d) => feedCard(snap, d, req.userId)),
    next_cursor: page.next_cursor,
    total: page.total,
    seen_count: page.items.filter((d) => seen.has(d.id)).length,
  });
});

/** GET /api/drops/saved — the viewer's bookmarks (joined with live drops). */
dropsRouter.get('/saved', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const marks: any[] = (db.drop_bookmarks || []).filter((b: any) => b && b.user_id === req.userId);
  const byId = new Map(allDrops(db).map((d) => [d.id, d]));
  const items = marks
    .map((b: any): Drop | undefined => byId.get(b.drop_id))
    .filter((d): d is Drop => !!d)
    .map((d) => ({ ...toPublicFeed(d), is_live: isDropLive(d), saved_at: marks.find((m: any) => m.drop_id === d.id)?.created_at }));
  res.json({ items });
});

/** GET /api/drops/mutes — this viewer's "not interested" rules. */
dropsRouter.get('/mutes', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  res.json({ items: (db.drop_mutes || []).filter((m: any) => m && m.user_id === req.userId) });
});

/** DELETE /api/drops/mutes/:id — undo one mute. Ownership checked on user_id. */
dropsRouter.delete('/mutes/:id', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const before = (db.drop_mutes || []).length;
  db.drop_mutes = (db.drop_mutes || []).filter((m: any) => !(m.id === req.params.id && m.user_id === req.userId));
  if (db.drop_mutes.length === before) return res.status(404).json({ error: 'Mute not found' });
  saveDb(db);
  invalidateDrops();
  return res.json({ status: 'success' });
});

const PUBLIC_EVENTS = ['view', 'cta_click', 'share', 'read_more', 'quiz_answer', 'outbound'] as const;
type PublicEvent = (typeof PUBLIC_EVENTS)[number];

/**
 * POST /api/drops/:id/event — one analytics beacon (kept for old clients).
 * Queued, not written: see lib/dropStore.ts. `dwell_ms` is clamped there.
 */
dropsRouter.post('/:id/event', optionalAuth, rateLimit(120), (req: Request, res: Response) => {
  if (!dropSnapshot().byId.has(req.params.id)) return res.status(404).json({ error: 'Drop not found' });
  const event = String(req.body?.event || '');
  if (!(PUBLIC_EVENTS as readonly string[]).includes(event)) return res.status(400).json({ error: 'Invalid event' });
  queueDropEvent(req.params.id, req.userId || null, event as PublicEvent, Number(req.body?.dwell_ms) || 0);
  return res.json({ status: 'success' });
});

/**
 * POST /api/drops/events — the batched beacon the feed actually uses: up to
 * 50 events per request, sent every ~10 cards and when the tab hides. Unknown
 * drops and kinds are skipped rather than failing the batch.
 */
dropsRouter.post('/events', optionalAuth, rateLimit(60), (req: Request, res: Response) => {
  const list = Array.isArray(req.body?.events) ? req.body.events.slice(0, 50) : [];
  const snap = dropSnapshot();
  let accepted = 0;
  for (const e of list) {
    const id = String(e?.id || '');
    const event = String(e?.event || '');
    if (!snap.byId.has(id) || !(PUBLIC_EVENTS as readonly string[]).includes(event)) continue;
    queueDropEvent(id, req.userId || null, event as PublicEvent, Number(e?.dwell_ms) || 0);
    accepted += 1;
  }
  return res.json({ status: 'success', accepted });
});

/** POST/DELETE /api/drops/:id/like — the heart. Queued like views. */
const setLike = (on: boolean) => (req: Request, res: Response) => {
  const snap = dropSnapshot();
  const drop = snap.byId.get(req.params.id);
  if (!drop) return res.status(404).json({ error: 'Drop not found' });
  queueDropLike(drop.id, req.userId!, on);
  return res.json({ status: 'success', ...likeView(snap, drop, req.userId) });
};
dropsRouter.post('/:id/like', requireAuth, rateLimit(120), setLike(true));
dropsRouter.delete('/:id/like', requireAuth, rateLimit(120), setLike(false));

/**
 * GET /api/drops/count?since=ISO — how many live drops this viewer has not
 * had the chance to see since `since`. Powers the "Drops • 5 new" badge;
 * served from memory, so polling it is cheap.
 */
dropsRouter.get('/count', optionalAuth, (req: Request, res: Response) => {
  const snap = dropSnapshot();
  const since = Date.parse(String(req.query.since || ''));
  const page = buildDropFeed(snap.drops, { subject: subjectOf(req), limit: FEED_MAX_LIMIT, ...viewerSets(snap, req.userId) });
  const live = buildDropFeed(snap.drops, { subject: subjectOf(req), limit: 1 }).total;
  const fresh = Number.isNaN(since)
    ? 0
    : snap.drops.filter((d) => isDropLive(d) && Date.parse(d.publish_at || d.created_at) > since).length;
  res.setHeader('Cache-Control', 'private, max-age=60');
  return res.json({ new: Math.min(fresh, page.total), total: live });
});

/** POST /api/drops/:id/bookmark — save for later (idempotent). */
dropsRouter.post('/:id/bookmark', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const drop = allDrops(db).find((d) => d.id === req.params.id);
  if (!drop) return res.status(404).json({ error: 'Drop not found' });

  const exists = (db.drop_bookmarks || []).some((b: any) => b.user_id === req.userId && b.drop_id === drop.id);
  if (!exists) {
    if (!Array.isArray(db.drop_bookmarks)) db.drop_bookmarks = [];
    db.drop_bookmarks.push({ user_id: req.userId!, drop_id: drop.id, created_at: new Date().toISOString() });
    drop.stats.saves += 1;
    pushEvent(db, drop.id, req.userId!, 'bookmark');
    saveDb(db);
    invalidateDrops();
  }
  return res.json({ status: 'success', saved: true });
});

/** DELETE /api/drops/:id/bookmark — remove the save. */
dropsRouter.delete('/:id/bookmark', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const drop = allDrops(db).find((d) => d.id === req.params.id);
  if (!drop) return res.status(404).json({ error: 'Drop not found' });

  const before = (db.drop_bookmarks || []).length;
  db.drop_bookmarks = (db.drop_bookmarks || []).filter(
    (b: any) => !(b.user_id === req.userId && b.drop_id === drop.id)
  );
  if (db.drop_bookmarks.length < before) {
    drop.stats.saves = Math.max(0, drop.stats.saves - 1);
    saveDb(db);
    invalidateDrops();
  }
  return res.json({ status: 'success', saved: false });
});

/**
 * POST /api/drops/:id/mute — "not interested".
 *
 * Defaults to muting this one drop; the body may widen it to the whole type
 * or company (`{ kind: 'type', value: 'job' }`) — the FE's NotInterested
 * sheet sends whichever the student picked. Company mutes need a target, so
 * a content-only drop without one rejects the wider scope honestly.
 */
dropsRouter.post('/:id/mute', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const drop = allDrops(db).find((d) => d.id === req.params.id);
  if (!drop) return res.status(404).json({ error: 'Drop not found' });

  const kindRaw = String(req.body?.kind || 'drop');
  if (!['drop', 'type', 'company'].includes(kindRaw)) return res.status(400).json({ error: 'Invalid mute kind' });
  const kind = kindRaw as 'drop' | 'type' | 'company';

  let value = String(req.body?.value || '').trim();
  if (kind === 'drop') value = drop.id;
  else if (kind === 'type') value = drop.type;
  else if (!value) value = drop.target_slug || '';
  if (!value) return res.status(400).json({ error: 'Is drop ka company target nahi hai — sirf drop mute ho sakta hai' });

  const exists = (db.drop_mutes || []).some(
    (m: any) => m.user_id === req.userId && m.kind === kind && m.value === value
  );
  if (!exists) {
    if (!Array.isArray(db.drop_mutes)) db.drop_mutes = [];
    db.drop_mutes.push({
      id: `dmute-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: req.userId!,
      kind,
      value,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    invalidateDrops();
  }
  return res.json({ status: 'success', kind, value });
});

// ============================================================================
// ADMIN — control plane, behind requireAdmin + drops.write/read
// ============================================================================

dropsRouter.use('/admin', requireAdmin);

/** GET /api/drops/admin — every drop for the console, live or not. */
dropsRouter.get('/admin', requirePermission('drops.read'), (req: Request, res: Response) => {
  flushDropEvents();
  const db = loadDb();
  const list = allDrops(db)
    .slice()
    .sort((a, b) => {
      const pa = a.pinned ? 1 : 0;
      const pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    })
    .map(toAdminShape);
  res.json({ items: list, caps: { max_live: MAX_ACTIVE_DROPS, max_per_day: MAX_PUBLISH_PER_DAY } });
});

/** GET /api/drops/admin/analytics — aggregate numbers for the console. */
dropsRouter.get('/admin/analytics', requirePermission('drops.read'), (_req: Request, res: Response) => {
  flushDropEvents();
  const db = loadDb();
  const list = allDrops(db);
  const now = Date.now();

  const totals = list.reduce(
    (acc, d) => {
      const s = d.stats || emptyStats();
      acc.views += s.views || 0;
      acc.unique_viewers += s.unique_viewers || 0;
      acc.cta_clicks += s.cta_clicks || 0;
      acc.shares += s.shares || 0;
      acc.saves += s.saves || 0;
      acc.dwell_ms_total += s.dwell_ms_total || 0;
      return acc;
    },
    { views: 0, unique_viewers: 0, cta_clicks: 0, shares: 0, saves: 0, dwell_ms_total: 0 }
  );

  const byType = (Object.keys(DROP_TYPE_META) as DropType[]).map((type) => {
    const rows = list.filter((d) => d.type === type);
    return {
      type,
      label: DROP_TYPE_META[type].label,
      drops: rows.length,
      views: rows.reduce((n, d) => n + (d.stats?.views || 0), 0),
      cta_clicks: rows.reduce((n, d) => n + (d.stats?.cta_clicks || 0), 0),
    };
  });

  const top = list
    .slice()
    .sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0))
    .slice(0, 10)
    .map((d) => ({
      id: d.id,
      type: d.type,
      headline: d.headline,
      views: d.stats?.views || 0,
      cta_clicks: d.stats?.cta_clicks || 0,
      shares: d.stats?.shares || 0,
      saves: d.stats?.saves || 0,
      ctr: (d.stats?.views || 0) > 0 ? Math.round(((d.stats?.cta_clicks || 0) / (d.stats?.views || 0)) * 1000) / 10 : 0,
    }));

  res.json({
    totals,
    live: list.filter((d) => isDropLive(d, now)).length,
    total: list.length,
    by_type: byType,
    top_drops: top,
  });
});

/** POST /api/drops/admin/upload — store the creative, return the handle. */
dropsRouter.post('/admin/upload', requirePermission('drops.write'), (req: Request, res: Response) => {
  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File 40MB se badi hai' });
    }
    if (err) {
      const msg = String(err.message || err);
      if (msg.includes('ONLY_IMAGE_ALLOWED')) {
        return res.status(400).json({ error: 'Sirf image (JPG/PNG/WEBP/AVIF/GIF), video (MP4/WEBM) ya audio (MP3/WAV/OGG/M4A) allowed hai' });
      }
      return res.status(400).json({ error: 'Upload failed: ' + msg });
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file field named "file"' });

    const kind = kindOfExt(path.extname(file.filename).toLowerCase());
    if (file.size > MAX_BYTES[kind]) {
      unlinkStored(file.filename);
      const mb = Math.round(MAX_BYTES[kind] / 1024 / 1024);
      const label = kind === 'image' ? 'Image' : kind === 'video' ? 'Video' : 'Audio';
      return res.status(413).json({ error: `${label} ${mb}MB se bada hai` });
    }

    return res.status(201).json({
      status: 'success',
      kind,
      stored_name: file.filename,
      file_name: file.originalname || 'drop',
      size_bytes: file.size,
    });
  });
});

/** POST /api/drops/admin — create a drop. */
dropsRouter.post('/admin', requirePermission('drops.write'), async (req: Request, res: Response) => {
  const db = loadDb();
  const body = req.body || {};

  const missing = missingUpload(body);
  if (missing) return res.status(400).json({ error: missing });

  // No image is fine: the feed draws the generated (animated) creative instead.
  const result = validateDropInput(body);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const now = new Date().toISOString();
  const drop: Drop = {
    id: newId(),
    ...(result.value as Omit<Drop, 'id' | 'stats' | 'created_at' | 'updated_at' | 'source' | 'author_id'>),
    stats: emptyStats(),
    author_id: req.userId,
    source: { kind: 'manual' },
    created_at: now,
    updated_at: now,
  };

  const list = allDrops(db);
  const capError = checkDropCaps(list, drop);
  if (capError) return res.status(409).json({ error: capError });

  db.drops = [...list, drop];
  await appendAudit(db, {
    actor: req.userId,
    action: 'drops.create',
    target: drop.id,
    detail: `${drop.type}: ${drop.headline.slice(0, 60)}`,
  });
  saveDb(db);
  invalidateDrops();
  return res.status(201).json({ status: 'success', drop: toAdminShape(drop) });
});

/** PUT /api/drops/admin/:id — partial update; image can be swapped or kept. */
dropsRouter.put('/admin/:id', requirePermission('drops.write'), async (req: Request, res: Response) => {
  const db = loadDb();
  const list = allDrops(db);
  const idx = list.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Drop not found' });

  const body = req.body || {};
  const current = list[idx];

  const missing = missingUpload(body);
  if (missing) return res.status(400).json({ error: missing });

  const result = validateDropInput(mergeInput(current, body));
  if (!result.ok) return res.status(400).json({ error: result.error });

  const patch = { ...result.value, updated_at: new Date().toISOString() } as Partial<Drop>;
  const next: Drop = { ...current, ...patch };

  for (const key of ['image_stored_name', 'video_stored_name', 'audio_stored_name'] as const) {
    if (current[key] && next[key] !== current[key]) releaseFile(list, current.id, current[key]);
  }

  const capError = checkDropCaps(list, next, current.id);
  if (capError) return res.status(409).json({ error: capError });

  list[idx] = next;
  db.drops = list;
  await appendAudit(db, {
    actor: req.userId,
    action: 'drops.update',
    target: next.id,
    detail: `status=${next.status} pinned=${next.pinned}`,
  });
  saveDb(db);
  invalidateDrops();
  return res.json({ status: 'success', drop: toAdminShape(list[idx]) });
});

/** DELETE /api/drops/admin/:id — remove the drop, its engagements, its image. */
dropsRouter.delete('/admin/:id', requirePermission('drops.write'), async (req: Request, res: Response) => {
  const db = loadDb();
  const list = allDrops(db);
  const idx = list.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Drop not found' });

  const [removed] = list.splice(idx, 1);
  releaseFile(list, removed.id, removed.image_stored_name);
  releaseFile(list, removed.id, removed.video_stored_name);
  releaseFile(list, removed.id, removed.audio_stored_name);

  db.drops = list;
  db.drop_views = (db.drop_views || []).filter((v: any) => v.drop_id !== removed.id);
  db.drop_bookmarks = (db.drop_bookmarks || []).filter((b: any) => b.drop_id !== removed.id);
  db.drop_events = (db.drop_events || []).filter((e: any) => e.drop_id !== removed.id);
  db.drop_likes = (db.drop_likes || []).filter((l: any) => l.drop_id !== removed.id);

  await appendAudit(db, {
    actor: req.userId,
    action: 'drops.delete',
    target: removed.id,
    detail: `${removed.type}: ${removed.headline.slice(0, 60)}`,
  });
  saveDb(db);
  invalidateDrops();
  return res.json({ status: 'success', message: 'Drop deleted', remaining: list.length });
});

/**
 * GET /api/drops/:id — one drop, for the Read More sheet and the SSR share
 * page. Declared AFTER the /admin subtree so "admin" is never parsed as a
 * drop id. Live drops are public; a draft/archived row is admin-only, and a
 * guest gets 404 rather than 403 so unpublished headlines are not enumerable.
 */
dropsRouter.get('/:id', optionalAuth, (req: Request, res: Response) => {
  const snap = dropSnapshot();
  const drop = snap.byId.get(req.params.id);
  if (!drop) return res.status(404).json({ error: 'Drop not found' });

  const isAdmin = req.user?.role === 'admin';
  if (!isDropLive(drop) && !isAdmin) return res.status(404).json({ error: 'Drop not found' });

  // "More like this": same company first, then same category, then shared tags.
  const subject = subjectOf(req);
  const tags = new Set(drop.tags || []);
  const related = buildDropFeed(snap.drops, { subject, limit: FEED_MAX_LIMIT }).items
    .filter((d) => d.id !== drop.id)
    .map((d) => ({
      d,
      score:
        (drop.target_slug && d.target_slug === drop.target_slug ? 4 : 0) +
        (d.type === drop.type ? 2 : 0) +
        (d.tags || []).filter((t) => tags.has(t) && t !== 'feed-v3').length,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((r) => feedCard(snap, r.d, req.userId));

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ drop: { ...toPublicDetail(drop), ...likeView(snap, drop, req.userId) }, related });
});
