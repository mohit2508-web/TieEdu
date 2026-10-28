import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend lib/mockInterview `sessionView`. */
export interface InterviewFeedback {
  source: 'ai' | 'rubric';
  score: number;
  covered: string[];
  missed: string[];
  strengths: string[];
  improve: string[];
  better_answer: string | null;
  note: string | null;
}
export interface InterviewQuestionView {
  id: string;
  topic: string;
  question: string;
  answer: { text: string; feedback: InterviewFeedback; at: string } | null;
}
export interface InterviewSessionView {
  id: string;
  kind: 'hr' | 'technical';
  company: { name: string; slug: string } | null;
  created_at: string;
  questions: InterviewQuestionView[];
  done: boolean;
  average: number | null;
  weakest: { topic: string; question: string } | null;
  next: Array<{ title: string; href: string }>;
}
export interface AiStatus { enabled: boolean; daily_limit: number }
export interface InterviewList { ai: AiStatus; ai_used_today: number; sessions: InterviewSessionView[] }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchInterviews = () => call<InterviewList>('/mock-interview/sessions');
export const startInterview = (input: { kind: 'hr' | 'technical'; company_slug?: string }) =>
  call<{ session: InterviewSessionView }>('/mock-interview/sessions', { method: 'POST', body: JSON.stringify(input) });
export const answerQuestion = (id: string, input: { question_id: string; text: string }) =>
  call<{ session: InterviewSessionView; ai_used_today: number }>(`/mock-interview/sessions/${encodeURIComponent(id)}/answers`, { method: 'POST', body: JSON.stringify(input) });
export const deleteInterview = (id: string) => call<void>(`/mock-interview/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
