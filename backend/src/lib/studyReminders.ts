/**
 * Study-time reminders (F4): one push at the hour a student usually studies.
 *
 * The rules (set by the platform owner):
 *  - At most one study reminder a day, at the student's usual hour, learned
 *    from the last LOOKBACK_DAYS of activity. With fewer than MIN_ACTIVE_DAYS
 *    active days there is no "usual hour", so nothing is sent.
 *  - Skipped if they already practised that day.
 *  - Never between 22:00 and 08:00 India time.
 *  - The student can turn them off; they stop by themselves after
 *    MAX_IGNORED reminders in a row were not followed by practice that day.
 *
 * OFF unless STUDY_REMINDER_PUSH=1, like the weekly recap: a development server
 * shares real students' push subscriptions, so this is switched on
 * deliberately where it should run, never by default.
 */
import { addDays, istDate } from './streak';

export const LOOKBACK_DAYS = 14;
export const MIN_ACTIVE_DAYS = 3;
export const MAX_IGNORED = 7;
export const QUIET_FROM = 22;
export const QUIET_UNTIL = 8;

export interface ReminderState { off: boolean; paused: boolean; last_sent_day: string | null; ignored_in_row: number }

const istHour = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).getUTCHours();

/** Activity timestamps for a student: finished tests and XP events (lessons, quizzes, daily challenge…). */
function activity(db: any, userId: string): Date[] {
  const out: Date[] = [];
  for (const a of db.attempts || []) if (a.userId === userId && (a.status === 'submitted' || a.status === 'timed_out') && (a.submittedAt || a.updated_at)) out.push(new Date(a.submittedAt || a.updated_at));
  for (const e of db.xp_ledger || []) if (e.user_id === userId && e.created_at && e.xp > 0) out.push(new Date(e.created_at));
  return out.filter((d) => !Number.isNaN(d.getTime()));
}

/** The hour (India time) they most often study, or null without enough history. */
export function usualHour(db: any, userId: string, now = new Date()): number | null {
  const today = istDate(now);
  const since = addDays(today, -LOOKBACK_DAYS);
  const recent = activity(db, userId).filter((d) => { const day = istDate(d); return day >= since && day < today; });
  const days = new Set(recent.map((d) => istDate(d)));
  if (days.size < MIN_ACTIVE_DAYS) return null;
  // Count each hour once per day, so one long session does not outvote a habit.
  const perHour = new Map<number, Set<string>>();
  for (const d of recent) {
    const h = istHour(d);
    if (h < QUIET_UNTIL || h >= QUIET_FROM) continue;
    perHour.set(h, (perHour.get(h) || new Set()).add(istDate(d)));
  }
  let best: number | null = null;
  let bestN = 0;
  for (const [h, set] of perHour) if (set.size > bestN || (set.size === bestN && best !== null && h < best)) { best = h; bestN = set.size; }
  return best;
}

export const practisedOn = (db: any, userId: string, day: string) =>
  (db.user_streaks || []).some((s: any) => s.user_id === userId && (s.last_day === day || (s.days || []).includes(day)))
  || activity(db, userId).some((d) => istDate(d) === day);

const stateOf = (u: any): ReminderState => ({ off: false, paused: false, last_sent_day: null, ignored_in_row: 0, ...(u.study_reminders || {}) });

export interface PlannedReminder { user_id: string; day: string; hour: number; ignored_in_row: number; title: string; body: string; url: string }

/** Who gets a reminder in this tick. Pure: nothing is sent or saved. */
export function planReminders(db: any, now = new Date()): PlannedReminder[] {
  const hour = istHour(now);
  if (hour < QUIET_UNTIL || hour >= QUIET_FROM) return [];
  const today = istDate(now);
  const out: PlannedReminder[] = [];
  for (const u of db.users || []) {
    if (u.disabled || u.role === 'admin') continue;
    const st = stateOf(u);
    if (st.off || st.paused || st.last_sent_day === today) continue;
    if (usualHour(db, u.id, now) !== hour) continue;
    if (practisedOn(db, u.id, today)) continue;
    // Was the previous reminder followed by practice that day?
    const ignored = st.last_sent_day ? (practisedOn(db, u.id, st.last_sent_day) ? 0 : st.ignored_in_row + 1) : 0;
    if (ignored >= MAX_IGNORED) continue;
    out.push({ user_id: u.id, day: today, hour, ignored_in_row: ignored, title: 'Your usual study time', body: 'Ten minutes now keeps your streak going. Today’s daily challenge is ready.', url: '/daily' });
  }
  return out;
}

/** Record a planned reminder as sent (before sending, so a crash never double-sends). */
export function markReminded(db: any, r: PlannedReminder) {
  const u = (db.users || []).find((x: any) => x.id === r.user_id);
  if (!u) return;
  u.study_reminders = { ...stateOf(u), last_sent_day: r.day, ignored_in_row: r.ignored_in_row };
}

/**
 * Auto-stop check run once a day per student: after MAX_IGNORED ignored
 * reminders in a row, reminders pause until the student turns them back on.
 */
export function applyAutoPause(db: any, now = new Date()): number {
  const today = istDate(now);
  let n = 0;
  for (const u of db.users || []) {
    const st = stateOf(u);
    if (st.paused || st.off || !st.last_sent_day || st.last_sent_day === today) continue;
    if (!practisedOn(db, u.id, st.last_sent_day) && st.ignored_in_row + 1 >= MAX_IGNORED) {
      u.study_reminders = { ...st, paused: true, ignored_in_row: st.ignored_in_row + 1 };
      n++;
    }
  }
  return n;
}

export function reminderSettings(db: any, userId: string, now = new Date()) {
  const u = (db.users || []).find((x: any) => x.id === userId);
  const st = stateOf(u || {});
  return { on: !st.off && !st.paused, paused: st.paused, usual_hour: u ? usualHour(db, userId, now) : null };
}

/** The student's switch. Turning back on also clears an auto-pause. */
export function setReminders(db: any, userId: string, on: boolean) {
  const u = (db.users || []).find((x: any) => x.id === userId);
  if (!u) throw new Error('Account not found.');
  u.study_reminders = { ...stateOf(u), off: !on, paused: false, ignored_in_row: on ? 0 : stateOf(u).ignored_in_row };
  return reminderSettings(db, userId);
}
