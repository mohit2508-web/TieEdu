/**
 * Drops read cache + write buffer — what keeps a reels-style feed off the disk.
 *
 * The document store is one large JSON file (~14 MB). Before this module every
 * feed request parsed all of it, every card creative parsed it again, and every
 * swipe (one view beacon) re-wrote the whole file. A busy evening of swiping
 * was thousands of full-file writes.
 *
 * Reads: `dropSnapshot()` keeps the drop rows plus per-viewer indexes in
 * memory for TTL_MS, and any write in this process calls `invalidateDrops()`.
 *
 * Writes: views, clicks, shares, quiz answers and likes are queued here and
 * applied in ONE load/save every FLUSH_MS (or sooner when the queue is big).
 * The cost is that counters lag by up to a minute and a hard crash can lose
 * the last minute of analytics — acceptable for engagement numbers, which is
 * why bookmarks, mutes and every admin write still go straight to disk.
 *
 * Read-state is merged from the queue (`pendingSeenFor`, `pendingLikeFor`) so
 * a viewer's own swipes and likes show up instantly even before a flush.
 */
import { loadDb, saveDb, Drop, DropEventKind } from '../data/db';

const TTL_MS = 30_000;
const FLUSH_MS = 60_000;
const QUEUE_SOFT_MAX = 500;
const EVENT_CAP = 50_000;
/** A view shorter than this counts as a swipe-past ("skip") in analytics. */
export const SKIP_DWELL_MS = 1500;

export interface DropSnapshot {
  at: number;
  drops: Drop[];
  byId: Map<string, Drop>;
  seenBy: Map<string, Set<string>>;
  likedBy: Map<string, Set<string>>;
  mutes: Array<{ id: string; user_id: string; kind: string; value: string }>;
}

let snap: DropSnapshot | null = null;

export const invalidateDrops = (): void => {
  snap = null;
};

const index = (rows: any[], key: 'drop_id'): Map<string, Set<string>> => {
  const out = new Map<string, Set<string>>();
  for (const r of rows || []) {
    if (!r || !r.user_id) continue;
    let set = out.get(r.user_id);
    if (!set) out.set(r.user_id, (set = new Set()));
    set.add(r[key]);
  }
  return out;
};

export const dropSnapshot = (now = Date.now()): DropSnapshot => {
  if (snap && now - snap.at < TTL_MS) return snap;
  const db = loadDb();
  const drops: Drop[] = Array.isArray(db.drops) ? db.drops : [];
  snap = {
    at: now,
    drops,
    byId: new Map(drops.map((d) => [d.id, d])),
    seenBy: index(db.drop_views, 'drop_id'),
    likedBy: index(db.drop_likes, 'drop_id'),
    mutes: Array.isArray(db.drop_mutes) ? db.drop_mutes : [],
  };
  return snap;
};

// ─── write buffer ────────────────────────────────────────────────────────

export type QueuedEventKind = DropEventKind | 'quiz_answer' | 'outbound';

interface QueuedEvent {
  drop_id: string;
  user_id: string | null;
  event: QueuedEventKind;
  dwell_ms: number;
  at: string;
}

let queue: QueuedEvent[] = [];
/** `${user}|${drop}` → liked? — last write wins, so a double toggle nets out. */
const likeOps = new Map<string, boolean>();

export const queueDropEvent = (dropId: string, userId: string | null, event: QueuedEventKind, dwellMs = 0): void => {
  queue.push({
    drop_id: dropId,
    user_id: userId,
    event,
    dwell_ms: Math.min(Math.max(Number(dwellMs) || 0, 0), 600_000),
    at: new Date().toISOString(),
  });
  if (queue.length >= QUEUE_SOFT_MAX) flushDropEvents();
};

export const queueDropLike = (dropId: string, userId: string, on: boolean): void => {
  likeOps.set(`${userId}|${dropId}`, on);
  if (likeOps.size >= QUEUE_SOFT_MAX) flushDropEvents();
};

/** Drops this viewer has viewed but that are still in the queue. */
export const pendingSeenFor = (userId: string | undefined): Set<string> => {
  const out = new Set<string>();
  if (!userId) return out;
  for (const e of queue) if (e.user_id === userId && e.event === 'view') out.add(e.drop_id);
  return out;
};

/** Pending like state for one viewer + drop: true/false, or undefined when untouched. */
export const pendingLikeFor = (userId: string | undefined, dropId: string): boolean | undefined =>
  userId ? likeOps.get(`${userId}|${dropId}`) : undefined;

/** Net change the queued likes will make to one drop's counter. */
export const pendingLikeDelta = (dropId: string, likedNow: (userId: string) => boolean): number => {
  let delta = 0;
  likeOps.forEach((on, key) => {
    const [userId, id] = key.split('|');
    if (id !== dropId) return;
    const was = likedNow(userId);
    if (on && !was) delta += 1;
    if (!on && was) delta -= 1;
  });
  return delta;
};

const emptyStats = () => ({ views: 0, unique_viewers: 0, cta_clicks: 0, shares: 0, saves: 0, dwell_ms_total: 0 });

/**
 * Apply everything queued in one load + save. Synchronous on purpose: nothing
 * else in this process can interleave between the read and the write.
 * Returns how many queued items were applied.
 */
export const flushDropEvents = (): number => {
  if (queue.length === 0 && likeOps.size === 0) return 0;
  const events = queue;
  const likes = new Map(likeOps);
  queue = [];
  likeOps.clear();

  const db = loadDb();
  const byId = new Map<string, Drop>((Array.isArray(db.drops) ? db.drops : []).map((d: Drop) => [d.id, d]));
  if (!Array.isArray(db.drop_events)) db.drop_events = [];
  if (!Array.isArray(db.drop_views)) db.drop_views = [];
  if (!Array.isArray(db.drop_likes)) db.drop_likes = [];
  const viewIndex = new Map<string, any>();
  for (const v of db.drop_views) if (v) viewIndex.set(`${v.user_id}|${v.drop_id}`, v);

  for (const e of events) {
    const drop = byId.get(e.drop_id);
    if (!drop) continue;
    const s: any = drop.stats || (drop.stats = emptyStats());
    db.drop_events.push({
      id: `devt-${Date.parse(e.at)}-${Math.random().toString(36).slice(2, 8)}`,
      drop_id: e.drop_id,
      user_id: e.user_id,
      event: e.event,
      created_at: e.at,
      ...(e.dwell_ms ? { dwell_ms: e.dwell_ms } : {}),
    });
    if (e.event === 'view') {
      s.views = (s.views || 0) + 1;
      s.dwell_ms_total = (s.dwell_ms_total || 0) + e.dwell_ms;
      if (e.dwell_ms > 0 && e.dwell_ms < SKIP_DWELL_MS) s.skips = (s.skips || 0) + 1;
      if (e.user_id) {
        const key = `${e.user_id}|${e.drop_id}`;
        const existing = viewIndex.get(key);
        if (existing) {
          existing.seen_at = e.at;
          existing.dwell_ms = (existing.dwell_ms || 0) + e.dwell_ms;
        } else {
          const row = { user_id: e.user_id, drop_id: e.drop_id, seen_at: e.at, dwell_ms: e.dwell_ms };
          db.drop_views.push(row);
          viewIndex.set(key, row);
          s.unique_viewers = (s.unique_viewers || 0) + 1;
        }
      }
    } else if (e.event === 'cta_click') s.cta_clicks = (s.cta_clicks || 0) + 1;
    else if (e.event === 'share') s.shares = (s.shares || 0) + 1;
    else if (e.event === 'read_more') s.reads = (s.reads || 0) + 1;
    else if (e.event === 'outbound') s.outbound = (s.outbound || 0) + 1;
    else if (e.event === 'quiz_answer') s.quiz_answers = (s.quiz_answers || 0) + 1;
  }
  if (db.drop_events.length > EVENT_CAP) db.drop_events = db.drop_events.slice(-EVENT_CAP);

  if (likes.size) {
    const likeIndex = new Set<string>(db.drop_likes.map((l: any) => `${l.user_id}|${l.drop_id}`));
    const removals = new Set<string>();
    likes.forEach((on, key) => {
      const [userId, dropId] = key.split('|');
      const drop = byId.get(dropId);
      if (!drop) return;
      const s: any = drop.stats || (drop.stats = emptyStats());
      if (on && !likeIndex.has(key)) {
        db.drop_likes.push({ user_id: userId, drop_id: dropId, created_at: new Date().toISOString() });
        likeIndex.add(key);
        s.likes = (s.likes || 0) + 1;
      } else if (!on && likeIndex.has(key)) {
        removals.add(key);
        likeIndex.delete(key);
        s.likes = Math.max(0, (s.likes || 0) - 1);
      }
    });
    if (removals.size) db.drop_likes = db.drop_likes.filter((l: any) => !removals.has(`${l.user_id}|${l.drop_id}`));
  }

  saveDb(db);
  invalidateDrops();
  return events.length + likes.size;
};

let armed = false;

/** Start the periodic flush (idempotent, unref'd) and flush on shutdown. */
export const startDropFlusher = (): void => {
  if (armed) return;
  armed = true;
  const timer = setInterval(() => {
    try {
      flushDropEvents();
    } catch (e: any) {
      console.warn('[Drops] event flush failed:', e?.message);
    }
  }, FLUSH_MS);
  timer.unref?.();
  const onExit = () => {
    try {
      flushDropEvents();
    } catch {
      /* shutting down */
    }
  };
  process.once('beforeExit', onExit);
  process.once('SIGTERM', () => {
    onExit();
    process.exit(0);
  });
  process.once('SIGINT', () => {
    onExit();
    process.exit(0);
  });
};
