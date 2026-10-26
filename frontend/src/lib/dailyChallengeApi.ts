import { API_BASE_URL, apiFetch } from './api';
import type { TodayView } from './todayApi';

/** The daily 10-minute challenge (backend lib/dailyChallenge). */

export type ChallengeKind = 'aptitude' | 'coding' | 'hr';

export interface McqItem {
  kind: 'aptitude' | 'coding';
  id: string;
  skill: string | null;
  difficulty: string | null;
  question: string;
  options: string[];
  answered: boolean;
  choice: number | null;
  reveal: { correct: boolean; correct_index: number; explanation: string } | null;
}

export interface HrItem {
  kind: 'hr';
  id: string;
  title: string;
  question: string;
  answered: boolean;
  rating: 1 | 2 | 3 | null;
  reveal: {
    sample_answer: string;
    expert_tip: string;
    red_flag_trap: string;
    star_breakdown: { situation: string; task: string; action: string; result: string } | null;
  } | null;
}

export type ChallengeItem = McqItem | HrItem;

export interface ChallengeView {
  day: string;
  items: ChallengeItem[];
  completed: boolean;
  completed_today: number;
}

export interface AnswerResult {
  item: ChallengeItem;
  finished: boolean;
  xp_awarded: number;
  streak: TodayView['this_week']['streak'] | null;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchDailyChallenge = () => call<ChallengeView>('/daily-challenge');

export const answerDailyChallenge = (input: { kind: 'aptitude' | 'coding'; choice: number } | { kind: 'hr'; rating: 1 | 2 | 3 }) =>
  call<AnswerResult>('/daily-challenge/answer', { method: 'POST', body: JSON.stringify(input) });
