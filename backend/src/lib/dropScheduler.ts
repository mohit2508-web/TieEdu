/**
 * The drops background sweep.
 *
 * Two jobs, both of which the read path deliberately does *not* do for itself:
 *
 * 1. Flip a due `scheduled` row to `published`. The feed already treats a due
 *    scheduled drop as live (`isDropLive` reads through the window), so this is
 *    about the *stored* state staying honest — the admin list pill, the
 *    `list_status` the console renders, and any future query that filters on
 *    status instead of recomputing liveness. `drops.ts` promises exactly this
 *    ("the scheduler does that"); this is the scheduler.
 * 2. Archive rows that have been dead longer than the retention window, so
 *    `db.drops` and the admin list stay bounded while stats stay readable.
 *    Only once-live statuses are archived: a `draft` is unfinished editorial
 *    work, not an expired drop, and silently archiving someone's work-in-
 *    progress would be data loss with a log line as its only headsup.
 *
 * Modelled on `lib/reminders.ts`: sweep logic as a plain function a test can
 * call directly, an interval that never holds the process open, and a re-entry
 * guard so a slow pass cannot overlap itself.
 */
import { Drop, loadDb, saveDb } from '../data/db';

/** Keep an expired row this long — the stats on it are still worth something. */
export const DROP_ARCHIVE_AFTER_MS = 30 * 86_400_000;

const parse = (value: string | undefined | null): number => {
  const t = Date.parse(String(value || ''));
  return Number.isNaN(t) ? NaN : t;
};

/**
 * When did this drop stop being live? NaN when it never had a bound that can
 * expire (or the dates are unparseable — a typo must not schedule an archive).
 *
 * The earliest passed bound wins: that is the moment liveness actually ended,
 * because `isDropLive` hides a drop as soon as *any* bound passes. Only the
 * bounds `isDropLive` itself honours are considered — a deadline on a `tip`
 * type is decorative and must not archive anything.
 */
export const deadSince = (drop: Drop, now = Date.now()): number => {
  const bounds: number[] = [];
  const expires = parse(drop.expires_at);
  if (!Number.isNaN(expires)) bounds.push(expires);
  if (drop.type === 'deadline' || drop.type === 'job') {
    const deadline = parse(drop.deadline_at);
    if (!Number.isNaN(deadline)) bounds.push(deadline);
  }
  if (bounds.length === 0) return NaN;
  const first = Math.min(...bounds);
  return first <= now ? first : NaN;
};

export interface DropSweep {
  flipped: number;
  archived: number;
}

/**
 * One pass. Pure over the rows it reads from the store; persists only when it
 * changed something, so an idle tick is a read and nothing else.
 */
export const sweepDrops = (now = Date.now()): DropSweep => {
  const db = loadDb();
  const list: Drop[] = Array.isArray(db.drops) ? db.drops : [];
  let flipped = 0;
  let archived = 0;

  for (const drop of list) {
    if (drop.status === 'scheduled') {
      const due = parse(drop.publish_at);
      if (!Number.isNaN(due) && now >= due) {
        drop.status = 'published';
        drop.updated_at = new Date(now).toISOString();
        flipped++;
      }
    }

    if (drop.status !== 'published' && drop.status !== 'scheduled') continue;
    const died = deadSince(drop, now);
    if (!Number.isNaN(died) && now - died > DROP_ARCHIVE_AFTER_MS) {
      drop.status = 'archived';
      drop.updated_at = new Date(now).toISOString();
      archived++;
    }
  }

  if (flipped || archived) saveDb(db);
  return { flipped, archived };
};

/** How often the sweep runs. Publish timing is second-level in the feed; this is bookkeeping. */
const TICK_MS = 15 * 60 * 1000;

let started = false;

/**
 * Arm the loop. Idempotent, and every timer is unref'd: a background
 * bookkeeping job must never be the reason a test or a graceful shutdown hangs.
 */
export const startDropScheduler = (): void => {
  if (started) return;
  started = true;

  let running = false;
  const tick = () => {
    // A slow pass must not overlap itself on the same document.
    if (running) return;
    running = true;
    try {
      const result = sweepDrops();
      if (result.flipped || result.archived) {
        console.log(`[Drops] sweep: flipped=${result.flipped} archived=${result.archived}`);
      }
    } catch (e: any) {
      console.warn('[Drops] sweep pass failed:', e?.message);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, TICK_MS);
  (timer as any).unref?.();
  // Warm-up well past any suite's runtime, so a mounted router in a test can
  // never flip a fixture mid-assertion; production still sweeps within 15min.
  const warmup = setTimeout(tick, 90_000);
  (warmup as any).unref?.();

  console.log('[Drops] schedule sweep armed (every 15m: due flips + 30-day archive).');
};

/** Test seam: lets a suite arm/disarm without waiting on the interval. */
export const __resetDropSchedulerForTests = (): void => {
  started = false;
};
