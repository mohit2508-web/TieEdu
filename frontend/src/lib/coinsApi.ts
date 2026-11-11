import { apiFetch, API_BASE_URL } from './api';

/** TiE Coins (backend routes/coins.routes.ts, TIE_COINS_STORE_PLAN.md). */
export interface CoinGain { rule: string; coins: number; note: string }
export interface CoinRuleView { id: string; label: string; coins: number; by_difficulty: { easy: number; medium: number; hard: number } | null; milestones: Record<string, number> | null; cap_day: number | null }
export interface CoinGoal { item_id: string; name: string; coins: number; art: string; image: string | null }
export interface CoinTask { id: string; label: string; coins: number; done: boolean; href: string }
export interface CoinsMe {
  coins: number;
  streak: { current: number; best: number; practised_today: boolean; protected_by_freeze: boolean; week: Array<{ day: string; state: 'done' | 'frozen' | 'missed' | 'today' }> };
  next_milestone: { days: number; coins: number } | null;
  today: CoinTask[];
  recent: Array<{ coins: number; rule: string; note: string; at: string }>;
  goal: CoinGoal | null;
}
export type CoinSummary = { signed_in: false } | { signed_in: true; coins: number; streak: number; practised_today: boolean; goal?: CoinGoal | null };

async function get<T>(path: string): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}/coins${path}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}
export const fetchCoinRules = () => get<{ rules: CoinRuleView[] }>('/rules');
export const fetchCoinsMe = () => get<CoinsMe>('/me');
export const fetchCoinSummary = () => get<CoinSummary>('/summary');
export async function setCoinGoal(itemId: string | null): Promise<{ goal: CoinGoal | null; coins: number }> {
  const res = await apiFetch(`${API_BASE_URL}/coins/goal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: itemId }) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

/** Tell the header chip (and anything else listening) that the balance changed. */
export const COINS_EVENT = 'tie:coins';
export function announceCoins(gains: CoinGain[] | undefined) {
  if (typeof window === 'undefined' || !gains?.length) return;
  window.dispatchEvent(new CustomEvent(COINS_EVENT, { detail: gains }));
}
export const sumCoins = (gains: CoinGain[] | undefined) => (gains || []).reduce((s, g) => s + g.coins, 0);

/** The streak page (backend lib/streakBadges.ts). */
export type StreakDayState = 'solved' | 'practised' | 'frozen' | 'repaired' | 'missed' | 'today' | 'future';
export interface StreakPage {
  month: string; today: string; current: number; best: number;
  days: Array<{ day: string; state: StreakDayState; daily: boolean }>;
  month_badge: { key: string; name: string; done: number; total: number; earned: boolean };
  year_badges: Array<{ key: string; name: string; days: number; progress: number; earned: boolean }>;
  milestones: Array<{ days: number; key: string; name: string; earned: boolean }>;
  earned: Array<{ key: string; name: string; earned_at: string }>;
  daily_today_done: boolean; repairable_days: string[]; repairs_left: number;
  opportunities: Array<{ key: string; days: number; title: string; blurb: string; kind: string; item: string | null; state: 'locked' | 'unlocked' | 'claimable' | 'claimed'; progress: number; unlocked_at: string | null; note: string | null }>;
  nudges_on: boolean;
}
export async function setStreakNudges(on: boolean): Promise<{ nudges_on: boolean }> {
  const res = await apiFetch(`${API_BASE_URL}/coins/nudges`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on }) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}
export const fetchStreakPage = (month?: string) => get<StreakPage>(`/streak${month ? `?month=${month}` : ''}`);
