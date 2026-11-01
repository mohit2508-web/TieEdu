import { apiFetch, API_BASE_URL } from './api';

export type PrepItemKind = 'lesson' | 'sectional' | 'mock' | 'revision' | 'interview';
export interface PrepItem { kind: PrepItemKind; ref: string; title: string; done: boolean }
export interface PrepDay { day: number; date: string; phase: string; items: PrepItem[] }
export interface PrepSection {
  key: string; name: string; weight: number; score: number | null; trend: number[]; attempts: number;
  lessons_total: number; lessons_done: number; test_slug: string | null;
}
export interface PrepView {
  company: { name: string; slug: string };
  owned: boolean;
  test_date: string;
  days_left: number;
  readiness: { score: number; band: string; test: number; lessons: number; consistency: number };
  sections: PrepSection[];
  full_mock: { slug: string; attempts: number; last: number | null } | null;
  lessons: Array<{ id: string; title: string; section: string; done: boolean }>;
  fix: { section: string; name: string; score: number | null; lessons: Array<{ id: string; title: string }>; test_slug: string | null };
  today: PrepDay;
  plan: PrepDay[];
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}/prep${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchPrep = (slug: string) => call<PrepView>(`/${encodeURIComponent(slug)}`);
export const markLesson = (slug: string, itemId: string, done = true) =>
  call<{ ok: true }>(`/${encodeURIComponent(slug)}/lesson`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: itemId, done }) });
export const setPrepDate = (slug: string, date: string) =>
  call<{ ok: true }>(`/${encodeURIComponent(slug)}/date`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test_date: date }) });

/** Where each plan item opens. Lessons and interview answers open in the company page reader. */
export const prepHref = (slug: string, it: PrepItem, lessonModule = 'mod-prep-infosys-se-oa') => {
  if (it.kind === 'lesson') return `/company/${slug}?m=${lessonModule}`;
  if (it.kind === 'interview') return `/company/${slug}?m=${it.ref}`;
  return it.ref ? `/skill-test/${it.ref}/assessment` : `/company/${slug}`;
};
