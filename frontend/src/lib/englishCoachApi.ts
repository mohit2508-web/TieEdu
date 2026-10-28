import { API_BASE_URL, apiFetch } from './api';
import type { AiStatus } from './mockInterviewApi';

/** Mirrors backend lib/englishCoach. */
export interface CoachPrompt { id: string; level: 'warmup' | 'everyday' | 'interview'; level_label: string; text: string; seconds: number; hint: string; hint_hi: string }
export interface Line { en: string; hi: string }
export interface CoachTip { id: string; title: string; en: string; hi: string; said: string | null; try: string | null }
export interface CoachFeedback {
  source: 'ai' | 'pattern';
  words: number;
  wpm: number | null;
  fillers: Array<{ word: string; count: number }>;
  filler_total: number;
  slips: number;
  positives: Line[];
  tips: CoachTip[];
  better_version: string | null;
  note: string | null;
}
export interface CoachAttempt {
  id: string;
  prompt: { id: string; text: string; level: string } | null;
  mode: 'voice' | 'typed';
  text: string;
  seconds: number | null;
  feedback: CoachFeedback;
  created_at: string;
}
export interface CoachProgress { attempts: number; days: number; fillers_per_100_words: { before: number; now: number } | null }
export interface CoachList { ai: AiStatus; ai_used_today: number; progress: CoachProgress; attempts: CoachAttempt[] }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchCoachPrompts = () => call<{ prompts: CoachPrompt[]; ai: AiStatus }>('/english-coach');
export const fetchCoachAttempts = () => call<CoachList>('/english-coach/attempts');
export const submitCoachAttempt = (input: { prompt_id: string; text: string; mode: 'voice' | 'typed'; seconds?: number }) =>
  call<{ attempt: CoachAttempt; progress: CoachProgress; ai_used_today: number }>('/english-coach/attempts', { method: 'POST', body: JSON.stringify(input) });
export const deleteCoachAttempt = (id: string) => call<void>(`/english-coach/attempts/${encodeURIComponent(id)}`, { method: 'DELETE' });
