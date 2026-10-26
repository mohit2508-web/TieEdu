import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend lib/prepPlan `calendarFor`. */
export type PlanTaskKind = 'train' | 'test' | 'revise' | 'drive' | 'daily';
export interface PlanTask { kind: PlanTaskKind; title: string; href: string }
export interface PlanDay { date: string; days_left: number; tasks: PlanTask[] }
export interface CalendarEntry { company: string; slug: string; date: string; days_left: number; overall: number | null }
export interface CalendarView {
  today: string;
  entries: CalendarEntry[];
  plan: { company: string; slug: string; date: string; days: PlanDay[] } | null;
}

export async function fetchCalendar(): Promise<CalendarView> {
  const res = await apiFetch(`${API_BASE_URL}/me/calendar`);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as CalendarView;
}
