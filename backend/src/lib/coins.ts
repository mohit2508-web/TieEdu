// ============================================================================
// TiE COINS — the currency students earn by practising and spend in the store
// (TIE_COINS_STORE_PLAN.md). XP stays the rank; coins are what you spend.
//
// Same discipline as the XP ledger (lib/xp.ts):
//  1. APPEND ONLY. A grant or a spend is a row; nothing is edited. A refund is a
//     new positive row, a correction a new negative one.
//  2. IDEMPOTENT. Every row has a unique deterministic `key`, so a retry, a
//     double-click or a replayed request can never pay twice.
//  3. SERVER AUTHORITATIVE. Amounts come from the rule table (admin-editable,
//     defaults below). Nothing in a request body is ever an amount.
//  4. user.coins IS A CACHE of the ledger sum.
// ============================================================================
import crypto from 'crypto';
import { istDate, touchStreak, type StreakRecord } from './streak';

export type CoinRuleId =
  | 'checkin' | 'daily_problem' | 'daily_mcq' | 'solve' | 'streak' | 'month_perfect' | 'month_25'
  | 'level_done' | 'set_done' | 'mock_submit' | 'mock_70' | 'course_done' | 'profile' | 'referral' | 'question_report' | 'monthly_top';

export interface CoinRule {
  id: CoinRuleId;
  /** Shown on the "How to earn" table. */
  label: string;
  coins: number;
  on: boolean;
  /** Per-difficulty amounts (solve). */
  by_difficulty?: { easy: number; medium: number; hard: number };
  /** Streak milestones: days → coins. */
  milestones?: Record<string, number>;
  /** Most coins this rule can pay in one IST day. */
  cap_day?: number;
}

/** Defaults (plan §3). Admins override amounts / on / caps in db.coin_rules. */
export const DEFAULT_RULES: CoinRule[] = [
  { id: 'checkin', label: 'Practise on a day (any lesson, problem or test)', coins: 1, on: true },
  { id: 'daily_problem', label: "Solve today's daily problem", coins: 10, on: true },
  { id: 'daily_mcq', label: "Finish today's daily MCQ challenge", coins: 5, on: true },
  { id: 'solve', label: 'Solve a practice problem for the first time', coins: 0, on: true, by_difficulty: { easy: 2, medium: 5, hard: 10 }, cap_day: 40 },
  { id: 'streak', label: 'Reach a streak milestone', coins: 0, on: true, milestones: { 7: 20, 30: 75, 60: 150, 100: 300, 200: 600, 365: 1500 } },
  { id: 'month_perfect', label: 'Solve every daily problem in a month', coins: 100, on: true },
  { id: 'month_25', label: 'Solve 25 daily problems in a month', coins: 40, on: true },
  { id: 'level_done', label: 'Finish a level of a company set', coins: 25, on: true },
  { id: 'set_done', label: 'Finish a whole company set', coins: 200, on: true },
  { id: 'mock_submit', label: 'Submit a company mock test', coins: 10, on: true },
  { id: 'mock_70', label: 'Score 70% or more in a company mock', coins: 25, on: true },
  { id: 'course_done', label: 'Finish a course', coins: 50, on: true },
  { id: 'profile', label: 'Complete your profile', coins: 10, on: false },
  { id: 'referral', label: 'A friend you invited solves their first problem', coins: 50, on: false },
  { id: 'question_report', label: 'Report a real exam question (approved by us)', coins: 200, on: true },
  { id: 'monthly_top', label: 'Finish the month in the top 10', coins: 100, on: true },
];

export interface CoinEvent {
  id: string;
  user_id: string;
  key: string;
  coins: number;
  rule: CoinRuleId | 'spend' | 'refund' | 'admin';
  note: string;
  ref?: string | null;
  at: string;
}

export function ledgerOf(db: any): CoinEvent[] {
  if (!Array.isArray(db.coin_ledger)) db.coin_ledger = [];
  return db.coin_ledger;
}

/** The rule table in force: defaults merged with admin overrides (db.coin_rules[id]). */
export function rulesOf(db: any): CoinRule[] {
  const over = (db.coin_rules && typeof db.coin_rules === 'object') ? db.coin_rules : {};
  return DEFAULT_RULES.map((r) => {
    const o = over[r.id] || {};
    const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : d);
    return {
      ...r,
      coins: num(o.coins, r.coins),
      on: typeof o.on === 'boolean' ? o.on : r.on,
      ...(r.cap_day != null || o.cap_day != null ? { cap_day: num(o.cap_day, r.cap_day ?? 0) } : {}),
      ...(r.by_difficulty ? { by_difficulty: { easy: num(o.by_difficulty?.easy, r.by_difficulty.easy), medium: num(o.by_difficulty?.medium, r.by_difficulty.medium), hard: num(o.by_difficulty?.hard, r.by_difficulty.hard) } } : {}),
      ...(r.milestones ? { milestones: o.milestones && typeof o.milestones === 'object' ? Object.fromEntries(Object.entries(o.milestones).map(([k, v]) => [String(Math.round(Number(k))), num(v, 0)]).filter(([k]) => Number(k) > 0)) : r.milestones } : {}),
    };
  });
}
export const ruleOf = (db: any, id: CoinRuleId) => rulesOf(db).find((r) => r.id === id)!;

export function balanceOf(db: any, userId: string): number {
  return ledgerOf(db).filter((e) => e.user_id === userId).reduce((s, e) => s + (Number(e.coins) || 0), 0);
}
function syncUser(db: any, userId: string) {
  const u = (db.users || []).find((x: any) => x.id === userId);
  if (u) u.coins = balanceOf(db, userId);
}

const hasKey = (db: any, key: string) => ledgerOf(db).some((e) => e.key === key);

/** Pay `coins` once for `key`. Returns the row, or null when the key was paid before, the rule is off, or the amount is 0. */
export function grant(db: any, userId: string, rule: CoinRuleId | 'admin' | 'refund', key: string, coins: number, note: string, ref: string | null = null, now = new Date()): CoinEvent | null {
  if (!userId || !(coins > 0) || hasKey(db, key)) return null;
  if (rule !== 'admin' && rule !== 'refund' && !ruleOf(db, rule).on) return null;
  const cap = rule !== 'admin' && rule !== 'refund' ? ruleOf(db, rule).cap_day : undefined;
  if (cap) {
    const today = istDate(now);
    const got = ledgerOf(db).filter((e) => e.user_id === userId && e.rule === rule && istDate(new Date(e.at)) === today).reduce((s, e) => s + e.coins, 0);
    coins = Math.min(coins, Math.max(0, cap - got));
    if (coins <= 0) return null;
  }
  const ev: CoinEvent = { id: `coin-${crypto.randomBytes(6).toString('hex')}`, user_id: userId, key, coins, rule, note, ref, at: now.toISOString() };
  ledgerOf(db).push(ev);
  syncUser(db, userId);
  return ev;
}

export class CoinError extends Error { constructor(public status: number, message: string) { super(message); } }

/** Spend coins once for `key`. Throws when the balance is short; never goes below zero. */
export function spend(db: any, userId: string, key: string, coins: number, note: string, ref: string | null = null): CoinEvent {
  if (!(coins > 0)) throw new CoinError(400, 'Nothing to pay');
  const prior = ledgerOf(db).find((e) => e.key === key);
  if (prior) return prior;
  if (balanceOf(db, userId) < coins) throw new CoinError(402, 'Not enough TiE Coins yet');
  const ev: CoinEvent = { id: `coin-${crypto.randomBytes(6).toString('hex')}`, user_id: userId, key, coins: -coins, rule: 'spend', note, ref, at: new Date().toISOString() };
  ledgerOf(db).push(ev);
  syncUser(db, userId);
  return ev;
}

/** What a student was paid in one request, for the "+N coins" moments. */
export interface CoinGain { rule: string; coins: number; note: string }
const gainOf = (e: CoinEvent | null): CoinGain[] => (e ? [{ rule: e.rule, coins: e.coins, note: e.note }] : []);

// ---- hooks ----------------------------------------------------------------

/**
 * A study day: counts the streak (lib/streak), pays the daily check-in, and any
 * streak milestone reached. Use this wherever `touchStreak` used to be called.
 */
export function recordStudyDay(db: any, userId: string, now = new Date()): { streak: StreakRecord; gains: CoinGain[] } {
  const r = touchStreak(db, userId, now) as StreakRecord & { run_start?: string };
  const today = istDate(now);
  const gains = gainOf(grant(db, userId, 'checkin', `checkin:${userId}:${today}`, ruleOf(db, 'checkin').coins, `Practised on ${today}`, null, now));
  const ms = ruleOf(db, 'streak').milestones || {};
  const runStart = r.run_start || today;
  for (const [days, coins] of Object.entries(ms)) {
    if (r.current >= Number(days)) gains.push(...gainOf(grant(db, userId, 'streak', `streak:${userId}:${days}:${runStart}`, coins, `${days}-day streak`, null, now)));
  }
  return { streak: r, gains };
}

/** A first Accepted on a practice problem. `daily` = it is today's daily problem; `solutionSeen` = opened the solution before solving. */
export function recordSolve(db: any, userId: string, p: { id: string; title: string; difficulty: string }, opts: { daily: boolean; solutionSeen: boolean }, now = new Date()): CoinGain[] {
  const gains: CoinGain[] = [];
  const today = istDate(now);
  if (opts.daily) {
    gains.push(...gainOf(grant(db, userId, 'daily_problem', `daily:${userId}:${today}`, ruleOf(db, 'daily_problem').coins, `Daily problem: ${p.title}`, p.id, now)));
    // Month bonuses: count daily problems solved this IST month.
    const month = today.slice(0, 7);
    const n = ledgerOf(db).filter((e) => e.user_id === userId && e.rule === 'daily_problem' && e.key.slice(e.key.lastIndexOf(':') + 1).startsWith(month)).length;
    if (n >= 25) gains.push(...gainOf(grant(db, userId, 'month_25', `month25:${userId}:${month}`, ruleOf(db, 'month_25').coins, `25 daily problems in ${month}`, null, now)));
    const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    const repaired = (db.streak_repairs || []).some((x: any) => x.user_id === userId && String(x.day).startsWith(month));
    if (n >= daysInMonth && !repaired) gains.push(...gainOf(grant(db, userId, 'month_perfect', `monthall:${userId}:${month}`, ruleOf(db, 'month_perfect').coins, `Every daily problem in ${month}`, null, now)));
  }
  if (!opts.solutionSeen) {
    const by = ruleOf(db, 'solve').by_difficulty || { easy: 0, medium: 0, hard: 0 };
    const c = by[(p.difficulty as 'easy' | 'medium' | 'hard')] ?? by.easy;
    gains.push(...gainOf(grant(db, userId, 'solve', `solve:${userId}:${p.id}`, c, `Solved ${p.title}`, p.id, now)));
  }
  return gains;
}

/** Levels / whole sets finished, given the set of solved problem ids. */
export function recordSetProgress(db: any, userId: string, sets: Array<{ slug: string; name: string; levels: Array<{ name: string; ids: string[] }> }>, solved: Set<string>, problemId: string, now = new Date()): CoinGain[] {
  const gains: CoinGain[] = [];
  for (const s of sets) {
    const li = s.levels.findIndex((l) => l.ids.includes(problemId));
    if (li < 0) continue;
    const lv = s.levels[li];
    if (lv.ids.every((id) => solved.has(id))) gains.push(...gainOf(grant(db, userId, 'level_done', `level:${userId}:${s.slug}:${li + 1}`, ruleOf(db, 'level_done').coins, `${s.name}: ${lv.name} finished`, s.slug, now)));
    if (s.levels.every((l) => l.ids.every((id) => solved.has(id)))) gains.push(...gainOf(grant(db, userId, 'set_done', `set:${userId}:${s.slug}`, ruleOf(db, 'set_done').coins, `${s.name} set finished`, s.slug, now)));
  }
  return gains;
}

// ---- views -----------------------------------------------------------------

/** Today's coin tasks for the header chip and the rewards page. */
export function todayTasks(db: any, userId: string, dailyProblemId: string | null, now = new Date()) {
  const today = istDate(now);
  const has = (key: string) => hasKey(db, key);
  return [
    { id: 'checkin', label: 'Practise today', coins: ruleOf(db, 'checkin').coins, done: has(`checkin:${userId}:${today}`), href: '/practice' },
    { id: 'daily_problem', label: "Solve today's problem", coins: ruleOf(db, 'daily_problem').coins, done: has(`daily:${userId}:${today}`), href: dailyProblemId ? `/practice/problem/${dailyProblemId}` : '/practice' },
    { id: 'daily_mcq', label: 'Daily MCQ challenge', coins: ruleOf(db, 'daily_mcq').coins, done: has(`dailymcq:${userId}:${today}`), href: '/daily' },
  ].filter((t) => ruleOf(db, t.id as CoinRuleId).on);
}

export function recentCoins(db: any, userId: string, n = 20) {
  return ledgerOf(db).filter((e) => e.user_id === userId).slice(-n).reverse().map((e) => ({ coins: e.coins, rule: e.rule, note: e.note, at: e.at }));
}
