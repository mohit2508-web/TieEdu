/**
 * The scheduled nudge: "you still have lessons left".
 *
 * Two things make this harder than sending an event, and both are the reason
 * this file exists rather than a route handler.
 *
 * 1. Nothing decides eligibility here. The planner below is a pure function over
 *    the ledger so the rules can be read and tested without a database, a timer,
 *    or a push provider.
 * 2. "Send once" has to be true across processes, not just across ticks. Two
 *    replicas both waking on the hour will both conclude a student is overdue.
 *    The claim is therefore a single INSERT that the database refuses for the
 *    loser of the race (see claimReminderWindow), not a read followed by a write.
 */
import { getPool, isDbReachable } from '../db/client';
import { loadDb } from '../data/db';
import { orderedLessons } from './courses';
import { listSubscriptionsForUsers } from '../store/push';
import { notifyEvent } from './notify';

/** Remind at most this often about the same course. */
export const REMINDER_CADENCE_DAYS = 7;

/**
 * Do not remind anyone about a course they enrolled in this recently.
 *
 * Someone who signed up an hour ago and has not finished has not done anything
 * wrong. Nudging them would be the fastest way to make the first notification
 * they ever receive an unwelcome one.
 */
export const REMINDER_GRACE_DAYS = 3;

/** Bound one pass, so a large backlog cannot turn into one enormous burst. */
const MAX_PER_PASS = 500;

export type ReminderPlan = {
  userId: string;
  courseId: string;
  windowKey: string;
  courseTitle: string;
  courseSlug?: string;
  remaining: number;
  total: number;
};

/**
 * The cadence bucket, as a string.
 *
 * A fixed grid rather than "seven days since the last send": with a per-user
 * rolling window, a student active at the edge of one tick and the next can be
 * nudged twice inside a day. Fixed buckets make the worst case exactly the
 * cadence, which is the property a reminder needs.
 */
export const reminderWindowKey = (at: number): string =>
  String(Math.floor(at / (REMINDER_CADENCE_DAYS * 86400000)));

/**
 * Decide who is overdue. Pure: no clock, no database, no network.
 *
 * `subscribedUserIds` is the opt-in. There is no separate "wants reminders" flag
 * on purpose — the student's notification toggle already decides that, by
 * creating or destroying the subscription, so a second flag could only ever
 * disagree with the thing it was meant to mirror.
 */
export const buildReminderPlan = (
  db: any,
  subscribedUserIds: string[],
  now: number
): ReminderPlan[] => {
  const windowKey = reminderWindowKey(now);
  const subscribed = new Set(subscribedUserIds);
  const courses = db?.courses || {};
  const progress = (db?.course_progress || {}) as Record<string, Record<string, any>>;
  const plans: ReminderPlan[] = [];

  for (const userId of subscribed) {
    const forUser = progress[userId];
    if (!forUser) continue;

    for (const courseId of Object.keys(forUser)) {
      const state = forUser[courseId];
      if (!state || state.completed_at) continue;

      const course = courses[courseId];
      if (!course || !course.published) continue;

      const total = orderedLessons(course).length;
      if (total === 0) continue;

      const done = (state.completed_lesson_ids || []).filter((id: string) => String(id)).length;
      const remaining = Math.max(0, total - done);
      // Enrolled, published, and has nothing left to open: nothing to nudge about.
      if (remaining === 0) continue;

      const enrolledAt = Date.parse(state.enrolled_at || '');
      if (Number.isFinite(enrolledAt) && now - enrolledAt < REMINDER_GRACE_DAYS * 86400000) continue;

      plans.push({
        userId,
        courseId,
        windowKey,
        courseTitle: course.title || 'your course',
        courseSlug: course.slug,
        remaining,
        total,
      });
    }
  }

  // Stable order so a truncated pass is reproducible and a test can assert on it.
  plans.sort((a, b) =>
    a.userId === b.userId ? a.courseId.localeCompare(b.courseId) : a.userId.localeCompare(b.userId)
  );
  return plans.slice(0, MAX_PER_PASS);
};

/**
 * Claim a window for one student and course. Resolves true only for the process
 * that actually won the claim.
 */
export const claimReminderWindow = async (
  userId: string,
  courseId: string,
  windowKey: string
): Promise<boolean> => {
  const { rows } = await getPool().query(
    `INSERT INTO notification_reminders (user_id, course_id, window_key)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, course_id, window_key) DO NOTHING
     RETURNING sent_at`,
    [userId, courseId, windowKey]
  );
  return rows.length > 0;
};

/** Release a claim the send never needed, so a provider outage does not eat a week. */
export const releaseReminderWindow = async (
  userId: string,
  courseId: string,
  windowKey: string
): Promise<void> => {
  await getPool()
    .query(
      `DELETE FROM notification_reminders
       WHERE user_id = $1 AND course_id = $2 AND window_key = $3`,
      [userId, courseId, windowKey]
    )
    .catch(() => {});
};

/** Student-facing copy. Says what is left, because "continue learning" is a chore. */
export type ReminderRun = {
  planned: number;
  claimed: number;
  sent: number;
  failed: number;
  skipped?: number;
  note?: string;
};

/**
 * One pass. Claims before sending, deliberately.
 *
 * The ordering trades a possible missed reminder for a guaranteed absence of
 * duplicates: if the process dies between the claim and the send, the student
 * simply does not hear about it until the next window, whereas the other order
 * can duplicate. A weekly nudge that is occasionally missed is a much smaller
 * problem than one that arrives three times.
 */
export const runIncompleteCourseReminder = async (): Promise<ReminderRun> => {
  if (!(await isDbReachable(3000))) {
    return { planned: 0, claimed: 0, sent: 0, failed: 0, note: 'postgres unreachable, reminder deferred' };
  }

  const db = loadDb();
  const subscribed = Array.from(
    new Set((await listSubscriptionsForUsers(allStudentIds(db))).map((s: any) => s.user_id as string))
  );
  if (!subscribed.length) {
    return { planned: 0, claimed: 0, sent: 0, failed: 0, note: 'no opted-in students' };
  }

  const plans = buildReminderPlan(db, subscribed, Date.now());
  let claimed = 0;
  let sent = 0;
  let failed = 0;

  for (const plan of plans) {
    if (!(await claimReminderWindow(plan.userId, plan.courseId, plan.windowKey))) continue;
    claimed++;
    const result = await notifyEvent(
      {
        type: 'course.incomplete',
        courseTitle: plan.courseTitle,
        remaining: plan.remaining,
        total: plan.total,
        slug: plan.courseSlug,
      },
      { kind: 'users', userIds: [plan.userId] }
    );
    if (result.error || !result.sent) {
      failed++;
      await releaseReminderWindow(plan.userId, plan.courseId, plan.windowKey);
    } else {
      sent++;
    }
  }

  return { planned: plans.length, claimed, sent, failed, skipped: plans.length - claimed };
};

const allStudentIds = (db: any): string[] =>
  (db?.users || [])
    .filter((u: any) => u && u.role === 'user' && !u.disabled)
    .map((u: any) => u.id as string);

/** Enough to reach every window boundary within a few minutes of a tick. */
const TICK_MS = 6 * 60 * 60 * 1000;

let started = false;

/**
 * Start the reminder loop. Idempotent, and never holds the process open.
 *
 * `unref` matters more than it looks: without it this interval keeps the event
 * loop alive, so tests, scripts and graceful shutdowns hang waiting on a timer
 * whose only job is to run once a week.
 */
export const startReminderScheduler = (): void => {
  if (started) return;
  started = true;

  let running = false;
  const tick = async () => {
    // A slow pass must not overlap itself and double-claim inside one process.
    if (running) return;
    running = true;
    try {
      const result = await runIncompleteCourseReminder();
      if (result.planned || result.note) {
        console.log(
          `[Remind] planned=${result.planned} claimed=${result.claimed} sent=${result.sent} failed=${result.failed}` +
            (result.note ? ` (${result.note})` : '')
        );
      }
    } catch (e: any) {
      console.warn('[Remind] pass failed:', e?.message);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, TICK_MS);
  (timer as any).unref?.();
  // First run shortly after boot rather than instantly, so it cannot compete with
  // migrations and the first page loads for no reason.
  const warmup = setTimeout(tick, 60_000);
  (warmup as any).unref?.();

  console.log('[Remind] incomplete-course reminder scheduler armed (every 6h, weekly per course).');
};

/** Test seam: lets a suite exercise a pass without waiting on the interval. */
export const __resetReminderSchedulerForTests = (): void => {
  started = false;
};
