import { apiFetch, API_BASE_URL } from './api';

/** Admin → TiE Coins and practice access (backend routes/adminCoins.routes.ts). */
export interface AdminCoinRule { id: string; label: string; coins: number; on: boolean; by_difficulty?: { easy: number; medium: number; hard: number }; milestones?: Record<string, number>; cap_day?: number }
export interface CoinStats {
  days: number;
  totals: { issued: number; spent: number; refunded: number; outstanding: number; liability_inr: number; holders: number };
  by_rule: Record<string, number>;
  top_earners: Array<{ user_id: string; name: string; coins: number }>;
  flagged: Array<{ user_id: string; name: string; day: string; coins: number }>;
  orders: Record<string, number>;
}
export interface CoinStudent { id: string; name: string; email: string; coins: number; streak: number }
export interface CoinLedgerRow { id: string; key: string; coins: number; rule: string; note: string; at: string }
export interface PracticeAccessRow { id: string; title: string; difficulty: string; topic: string; companies: string[]; free_core: boolean; override: 'default' | 'free' | 'pack' | 'hidden' }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}/admin/coins${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}
const send = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const fetchCoinRulesAdmin = () => call<{ rules: AdminCoinRule[] }>('/rules');
export const saveCoinRule = (id: string, patch: Partial<AdminCoinRule> & { reset?: boolean }) => call<{ rule: AdminCoinRule }>(`/rules/${id}`, send('PUT', patch));
export const fetchCoinStats = (days = 30) => call<CoinStats>(`/stats?days=${days}`);
export const searchCoinStudents = (q: string) => call<{ students: CoinStudent[] }>(`/students?q=${encodeURIComponent(q)}`);
export const fetchCoinStudent = (id: string) => call<{ student: CoinStudent & { goal: string | null }; ledger: CoinLedgerRow[] }>(`/students/${encodeURIComponent(id)}`);
export const adjustCoins = (user_id: string, coins: number, note: string) => call<{ coins: number }>('/adjust', send('POST', { user_id, coins, note }));
export const fetchPracticeAccess = () => call<{ problems: PracticeAccessRow[] }>('/practice');
export const setPracticeAccess = (id: string, access: PracticeAccessRow['override']) => call<{ id: string; override: PracticeAccessRow['override'] }>(`/practice/${encodeURIComponent(id)}`, send('PUT', { access }));
export const fetchDailySchedule = () => call<{ today: string; schedule: Array<{ date: string; id: string | null; title: string; overridden: boolean }> }>('/daily');
export const setDailyProblem = (date: string, problem_id: string | null) => call<{ date: string; id: string | null; title: string; overridden: boolean }>('/daily', send('PUT', { date, problem_id }));

export interface AdminOpportunity { key: string; days: number; title: string; blurb: string; kind: string; on: boolean; unlocked: number; claimed: number }
export const fetchOpportunitiesAdmin = () => call<{ opportunities: AdminOpportunity[] }>('/opportunities');
export const saveOpportunity = (key: string, patch: { on?: boolean; days?: number }) => call<{ opportunity: AdminOpportunity }>(`/opportunities/${encodeURIComponent(key)}`, send('PUT', patch));
export interface TopRow { rank: number; user_id: string; name: string; earned: number; prize: number; paid: boolean }
export const fetchMonthlyTop = (month: string) => call<{ month: string; top: TopRow[] }>(`/monthly-top?month=${month}`);
export const payMonthlyTop = (month: string) => call<{ month: string; top: TopRow[] }>('/monthly-top', send('POST', { month }));
