// ============================================================================
// Streak badges and the streak calendar (TIE_COINS_STORE_PLAN.md §6.5, phase 3).
// LeetCode-style: milestone badges for a streak, a monthly badge for solving
// every daily problem (a Streak Repair counts, like a Time Travel Ticket), and
// yearly badges for 50 / 100 / 300 active days. Badges reuse lib/perks
// (user_badges, once per key) so profiles show them with the rest.
// ============================================================================
import { grantBadge, hasBadge } from './perks';
import { addDays, istDate, streakView } from './streak';

export const STREAK_BADGES = [
  { days: 7, key: 'streak-7', name: 'Consistent Coder' },
  { days: 30, key: 'streak-30', name: 'Streak Star' },
  { days: 60, key: 'streak-60', name: 'Two-Month Grinder' },
  { days: 100, key: 'streak-100', name: 'Century' },
  { days: 200, key: 'streak-200', name: 'Double Century' },
  { days: 365, key: 'streak-365', name: 'Year of Code' },
] as const;
export const YEAR_BADGES = [50, 100, 300] as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthBadgeKey = (month: string) => `month-${month}`;
export const yearBadgeKey = (n: number, year: string) => `year-${n}-${year}`;
export function badgeName(key: string): string {
  const s = STREAK_BADGES.find((b) => b.key === key);
  if (s) return s.name;
  let m = /^month-(\d{4})-(\d{2})$/.exec(key);
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${m[1]} Daily Coder`;
  m = /^year-(\d+)-(\d{4})$/.exec(key);
  if (m) return `${m[1]} days in ${m[2]}`;
  return key;
}

const streakOf = (db: any, userId: string) => (db.user_streaks || []).find((s: any) => s.user_id === userId) || null;
function dailyDays(db: any, userId: string): Set<string> {
  const pre = `daily:${userId}:`;
  return new Set((db.coin_ledger || []).filter((e: any) => e.user_id === userId && typeof e.key === 'string' && e.key.startsWith(pre)).map((e: any) => e.key.slice(pre.length)));
}
const daysIn = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

/** Award every badge the student now qualifies for. Idempotent; returns the newly earned keys. */
export function checkStreakBadges(db: any, userId: string, now = new Date()): string[] {
  const out: string[] = [];
  const r = streakOf(db, userId);
  if (!r) return out;
  const give = (key: string) => { if (grantBadge(db, userId, key).granted) out.push(key); };
  for (const b of STREAK_BADGES) if (Math.max(r.current || 0, r.best || 0) >= b.days) give(b.key);
  // Yearly: active days (practised, frozen or repaired) in this IST year.
  const year = istDate(now).slice(0, 4);
  const active = new Set([...(r.days || []), ...(r.frozen_days || []), ...(r.repaired_days || [])].filter((d: string) => d.startsWith(year)));
  for (const n of YEAR_BADGES) if (active.size >= n) give(yearBadgeKey(n, year));
  // Monthly: every day of the month has the daily problem solved, or was repaired.
  const month = istDate(now).slice(0, 7);
  const solved = dailyDays(db, userId);
  const repaired = new Set<string>(r.repaired_days || []);
  let all = true;
  for (let d = `${month}-01`; d.startsWith(month); d = addDays(d, 1)) if (!solved.has(d) && !repaired.has(d)) { all = false; break; }
  if (all) give(monthBadgeKey(month));
  return out;
}

export type DayState = 'solved' | 'practised' | 'frozen' | 'repaired' | 'missed' | 'today' | 'future';

/** The streak page: one month's calendar, milestones, badges earned and in progress. */
export function streakPage(db: any, userId: string, monthParam: string | undefined, now = new Date()) {
  const today = istDate(now);
  const month = /^\d{4}-\d{2}$/.test(String(monthParam || '')) ? String(monthParam) : today.slice(0, 7);
  const r = streakOf(db, userId);
  const done = new Set<string>(r?.days || []);
  const frozen = new Set<string>(r?.frozen_days || []);
  const repaired = new Set<string>(r?.repaired_days || []);
  const solved = dailyDays(db, userId);
  const days: Array<{ day: string; state: DayState; daily: boolean }> = [];
  for (let d = `${month}-01`; d.startsWith(month); d = addDays(d, 1)) {
    const state: DayState = d > today ? 'future' : solved.has(d) ? 'solved' : done.has(d) ? 'practised' : repaired.has(d) ? 'repaired' : frozen.has(d) ? 'frozen' : d === today ? 'today' : 'missed';
    days.push({ day: d, state, daily: solved.has(d) });
  }
  const dailyThisMonth = days.filter((d) => d.daily || repaired.has(d.day)).length;
  const year = month.slice(0, 4);
  const activeYear = new Set([...done, ...frozen, ...repaired].filter((d) => d.startsWith(year))).size;
  const earned = (db.user_badges || []).filter((b: any) => b.user_id === userId && (/^streak-|^month-|^year-/.test(b.badge_key)))
    .map((b: any) => ({ key: b.badge_key, name: badgeName(b.badge_key), earned_at: b.earned_at }));
  return {
    month, today,
    current: streakView(db, userId, now).current,
    best: r?.best || 0,
    days,
    month_badge: { key: monthBadgeKey(month), name: badgeName(monthBadgeKey(month)), done: dailyThisMonth, total: daysIn(month), earned: hasBadge(db, userId, monthBadgeKey(month)) },
    year_badges: YEAR_BADGES.map((n) => ({ key: yearBadgeKey(n, year), name: badgeName(yearBadgeKey(n, year)), days: n, progress: Math.min(n, activeYear), earned: hasBadge(db, userId, yearBadgeKey(n, year)) })),
    milestones: STREAK_BADGES.map((b) => ({ ...b, earned: hasBadge(db, userId, b.key) })),
    earned,
    daily_today_done: solved.has(today),
  };
}
