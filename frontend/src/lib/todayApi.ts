import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend/src/lib/today.ts `TodayView`. */
export interface TodayView {
  first_name: string;
  grad_year: number | null;
  stage: 'foundation' | 'internship' | 'placement' | null;
  route: Array<{ key: 'year' | 'skills' | 'companies' | 'offer'; label: string; note: string | null; state: 'done' | 'current' | 'next' }>;
  next_step: {
    kind: 'set_year' | 'weak_round' | 'continue_course' | 'first_test' | 'weak_topic' | 'pick_company';
    title: string;
    body: string;
    href: string | null;
    cta: string;
  };
  this_week: {
    streak: {
      current: number;
      best: number;
      practised_today: boolean;
      protected_by_freeze: boolean;
      freeze_available_this_week: boolean;
      week: Array<{ day: string; state: 'done' | 'frozen' | 'missed' | 'today' }>;
    };
    test_dates: Array<{ company: string; slug: string; date: string; days_left: number }>;
    lessons: number;
    tests: number;
    xp: number;
  };
  continue: { kind: 'course' | 'test'; title: string; detail: string; href: string; percent: number | null } | null;
  recap: {
    from: string;
    to: string;
    lessons: number;
    tests: number;
    certificates: number;
    xp: number;
    best_improvement: { skill: string; from: number; to: number } | null;
  } | null;
  targets: Array<{ company: string; slug: string; overall: number | null; cleared: number; rounds: number }>;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchToday = () => call<TodayView>('/me/today');

export const saveGradYear = (gradYear: number) =>
  call<TodayView>('/me/year', { method: 'PUT', body: JSON.stringify({ grad_year: gradYear }) });
