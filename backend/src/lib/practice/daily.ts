import { BANK, FREE_CORE, type BankProblem } from './bank';

/**
 * Daily problem (PRACTICE_POLISH_PLAN.md §7, owner decision L6): one free problem a day, the same for
 * everyone, picked from the free core by the IST date. An admin override (db.daily_overrides[date]) wins.
 */
export function dailyProblem(date: string, db?: any): BankProblem | null {
  const forced = db?.daily_overrides?.[date];
  if (forced) {
    const p = BANK.find((x) => x.id === forced);
    if (p) return p;
  }
  // Free core, minus anything an admin hid or moved behind the pack; plus problems an admin made free.
  const over: Record<string, string> = db?.practice_access || {};
  const pool = BANK.filter((p) => (FREE_CORE.has(p.id) || over[p.id] === 'free') && over[p.id] !== 'hidden' && over[p.id] !== 'pack');
  if (!pool.length) return null;
  let h = 0;
  for (const ch of `daily:${date}`) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  return pool[h % pool.length];
}
