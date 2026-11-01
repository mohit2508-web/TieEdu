import { useEffect, useState } from 'react';
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
  readiness: { score: number; band: string; test: number; lessons: number; consistency: number; week_change: number; previous: number | null };
  attempts: Array<{ id: string; slug: string; title: string; score: number; at: string }>;
  interview: string[];
  sections: PrepSection[];
  full_mock: { slug: string; attempts: number; last: number | null } | null;
  lessons: Array<{ id: string; title: string; section: string; done: boolean; free: boolean }>;
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

/** Where each plan item opens: lessons in the lesson reader, interview answers in the company page reader. */
export const prepHref = (slug: string, it: PrepItem) => {
  if (it.kind === 'lesson') return `/prep/${slug}/learn/${it.ref}`;
  if (it.kind === 'interview') return `/company/${slug}?m=${it.ref}`;
  return it.ref ? `/skill-test/${it.ref}/assessment` : `/company/${slug}`;
};

// ---- Target company (INFOSYS_SE_3T_UX_PLAN §1): one value every screen reads.
export interface PrepTarget { slug: string | null; name?: string; owned?: boolean; test_date?: string; days_left?: number; readiness?: number; asked: boolean }
export const TARGET_EVENT = 'tieedu-target-changed';
export const OPEN_TARGET_EVENT = 'tieedu-open-target';
let targetCache: Promise<PrepTarget> | null = null;
export const fetchTarget = (fresh = false) => {
  if (fresh || !targetCache) targetCache = call<PrepTarget>('/target').catch((e) => { targetCache = null; throw e; });
  return targetCache;
};
export const saveTarget = async (slug: string | null, testDate?: string) => {
  await call<{ ok: true }>('/target', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, test_date: testDate }) });
  await fetchTarget(true);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(TARGET_EVENT));
};
/** The signed-in student's target company; refreshes when it changes anywhere on the page. */
export function useTarget(enabled: boolean) {
  const [t, setT] = useState<PrepTarget | null>(null);
  useEffect(() => {
    if (!enabled) { setT(null); return; }
    const load = (fresh = false) => fetchTarget(fresh).then(setT).catch(() => setT(null));
    load();
    const on = () => load();
    window.addEventListener(TARGET_EVENT, on);
    return () => window.removeEventListener(TARGET_EVENT, on);
  }, [enabled]);
  return t;
}

// ---- Lesson reader
export interface LessonPractice { question: string; options: string[]; correct: number; explanation: string; code?: boolean }
export interface LessonBody { section: string; title: string; what: string; rules: string[]; examples: string[]; trap: string; practice: LessonPractice[] }
export interface LessonView {
  id: string; title: string; index: number; total: number; owned: boolean; free: boolean; done?: boolean;
  prev: { id: string; title: string } | null; next: { id: string; title: string } | null;
  lesson?: LessonBody | null; markdown?: string; error?: string;
}
/** Resolves with `error: 'pack_required'` (not a throw) for locked lessons, so the page can show the pack sheet. */
export const fetchLesson = async (slug: string, id: string): Promise<LessonView> => {
  const res = await apiFetch(`${API_BASE_URL}/prep/${encodeURIComponent(slug)}/lesson/${encodeURIComponent(id)}`);
  const body = await res.json().catch(() => null);
  if (!res.ok && res.status !== 402) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as LessonView;
};

/** Companies with a full Train · Test · Track plan. */
export const PREP_SLUGS = ['infosys-systems-engineer'];
