import type { CoinRuleView } from './coinsApi';

/**
 * "How long until I get it?" (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B5). Turns the
 * admin's live coin rules into a daily plan for a given practice time, so every
 * estimate on the store follows the real rules, not fixed numbers.
 */
export interface DayPlan { minutes: number; perDay: number; steps: Array<{ label: string; coins: number }> }

const rule = (rules: CoinRuleView[], id: string) => rules.find((r) => r.id === id);

export function planFor(minutes: number, rules: CoinRuleView[]): DayPlan {
  const steps: DayPlan['steps'] = [];
  const add = (label: string, coins: number) => { if (coins > 0) steps.push({ label, coins: Math.round(coins * 10) / 10 }); };
  add('Practise anything (check-in)', rule(rules, 'checkin')?.coins || 0);
  add("Today's MCQ challenge", rule(rules, 'daily_mcq')?.coins || 0);
  const solve = rule(rules, 'solve');
  const d = solve?.by_difficulty || { easy: 0, medium: 0, hard: 0 };
  const cap = solve?.cap_day || 40;
  if (minutes >= 30) add("Today's daily problem", rule(rules, 'daily_problem')?.coins || 0);
  // Fresh practice solves that fit the time, under the daily cap.
  const solves = minutes >= 60 ? d.medium * 2 + d.hard : minutes >= 30 ? d.medium + d.easy : d.easy;
  add(minutes >= 60 ? 'Practice: 2 medium + 1 hard' : minutes >= 30 ? 'Practice: 1 medium + 1 easy' : 'Practice: 1 easy', Math.min(solves, cap));
  // Streak milestones and the monthly bonus, spread over the days that earn them.
  const ms = Object.entries(rule(rules, 'streak')?.milestones || {}).map(([k, v]) => [Number(k), v] as [number, number]).filter(([k]) => k <= 30);
  const streakPerDay = ms.reduce((n, [, v]) => n + v, 0) / 30;
  add('Streak milestones (spread per day)', streakPerDay);
  if (minutes >= 30) add('Monthly daily-problem bonus (per day)', (minutes >= 60 ? rule(rules, 'month_perfect')?.coins || 0 : rule(rules, 'month_25')?.coins || 0) / 30);
  return { minutes, perDay: Math.round(steps.reduce((n, s) => n + s.coins, 0)), steps };
}

/** Days to save `need` coins at `perDay`. */
export const daysTo = (need: number, perDay: number) => (need <= 0 ? 0 : perDay > 0 ? Math.ceil(need / perDay) : Infinity);

export const daysLabel = (n: number) => (n === 0 ? 'Ready now' : n === Infinity ? 'Start earning' : n === 1 ? '1 day' : n < 60 ? `${n} days` : `${Math.round(n / 7)} weeks`);
