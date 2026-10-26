/**
 * The study streak — one per student, across everything they do on TieEdu.
 *
 * UI_REDESIGN_PLAN_V2 §6.4: "Streaks with a weekly freeze (missing one day
 * doesn't wipe you out)". The habit we want is "most days", not "every day or
 * you lose it all"; a streak that resets on the first missed day mostly teaches
 * students to stop caring about it.
 *
 * Rules:
 *  - A day counts when the student finishes a lesson, submits a skill test or
 *    logs company daily practice (the three callers of `touchStreak`). The
 *    server owns the date, on the India day boundary (`istDate`).
 *  - Missing exactly one day is covered by a freeze, at most one per ISO week
 *    (the week of the missed day). The freeze is spent when the student comes
 *    back, not in advance, so an unused freeze is never lost by being early.
 *  - Missing two days in a row, or a second day in a week, resets to 1.
 *
 * `users[].streak` mirrors the live count because the header already reads it.
 */
/** Calendar date in India. Same boundary as `companyPageStudent.istDate`; kept
 *  local so this module has no imports and any caller can depend on it. */
export function istDate(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export interface StreakRecord {
  user_id: string;
  current: number;
  best: number;
  /** IST date of the last counted day. */
  last_day: string | null;
  /** ISO weeks ("2026-W43") whose freeze has been spent. */
  freezes_used: string[];
  /** Days a freeze covered, for the calendar. */
  frozen_days: string[];
  /** Recent active days, newest last; capped. */
  days: string[];
}

const KEEP_DAYS = 60;

export function streaksOf(db: any): StreakRecord[] {
  if (!Array.isArray(db.user_streaks)) db.user_streaks = [];
  return db.user_streaks;
}

function findStreak(db: any, userId: string): StreakRecord | null {
  return streaksOf(db).find((s) => s.user_id === userId) || null;
}

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const dayDiff = (from: string, to: string) => Math.round((dayMs(to) - dayMs(from)) / 86_400_000);
export const addDays = (d: string, n: number) => new Date(dayMs(d) + n * 86_400_000).toISOString().slice(0, 10);

/** ISO-8601 week key for a calendar date, e.g. "2026-W43" (weeks start Monday). */
export function isoWeek(day: string): string {
  const d = new Date(dayMs(day));
  const dow = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dow); // the Thursday of this week decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const freezeFree = (r: StreakRecord, missedDay: string) => !r.freezes_used.includes(isoWeek(missedDay));

/** Count today for this student. Idempotent within a day. */
export function touchStreak(db: any, userId: string, now = new Date()): StreakRecord {
  const today = istDate(now);
  let r = findStreak(db, userId);
  if (!r) {
    r = { user_id: userId, current: 0, best: 0, last_day: null, freezes_used: [], frozen_days: [], days: [] };
    streaksOf(db).push(r);
  }
  if (r.last_day === today) return r;

  const gap = r.last_day ? dayDiff(r.last_day, today) : Infinity;
  if (gap === 1) {
    r.current += 1;
  } else if (gap === 2 && freezeFree(r, addDays(today, -1))) {
    const missed = addDays(today, -1);
    r.freezes_used = [...r.freezes_used, isoWeek(missed)].slice(-12);
    r.frozen_days = [...r.frozen_days, missed].slice(-12);
    r.current += 1;
  } else {
    r.current = 1;
  }
  r.best = Math.max(r.best, r.current);
  r.last_day = today;
  r.days = [...r.days.filter((d) => d !== today), today].slice(-KEEP_DAYS);

  const user = (db.users || []).find((u: any) => u.id === userId);
  if (user) user.streak = r.current;
  return r;
}

export interface StreakView {
  current: number;
  best: number;
  practised_today: boolean;
  /** Yesterday was missed but a freeze can still cover it — practise today to keep the streak. */
  protected_by_freeze: boolean;
  freeze_available_this_week: boolean;
  /** Last 7 IST days, oldest first. */
  week: Array<{ day: string; state: 'done' | 'frozen' | 'missed' | 'today' }>;
}

/** What the student sees. A streak that is already broken reads as 0, not as a stale number. */
export function streakView(db: any, userId: string, now = new Date()): StreakView {
  const today = istDate(now);
  const r = findStreak(db, userId);
  const done = new Set(r?.days || []);
  const frozen = new Set(r?.frozen_days || []);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const state: StreakView['week'][number]['state'] = done.has(day)
      ? 'done'
      : frozen.has(day)
        ? 'frozen'
        : day === today
          ? 'today'
          : 'missed';
    return { day, state };
  });
  if (!r || !r.last_day) {
    return { current: 0, best: 0, practised_today: false, protected_by_freeze: false, freeze_available_this_week: true, week };
  }
  const gap = dayDiff(r.last_day, today);
  const protectedByFreeze = gap === 2 && freezeFree(r, addDays(today, -1));
  const live = gap <= 1 || protectedByFreeze ? r.current : 0;
  return {
    current: live,
    best: r.best,
    practised_today: gap === 0,
    protected_by_freeze: protectedByFreeze,
    freeze_available_this_week: freezeFree(r, today),
    week,
  };
}
