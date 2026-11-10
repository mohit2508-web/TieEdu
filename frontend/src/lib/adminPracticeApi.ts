import { apiFetch, API_BASE_URL } from './api';

/** Admin → Coding practice (backend routes/adminPractice.routes.ts). */
const base = `${API_BASE_URL}/admin/practice`;
async function get<T>(path: string): Promise<T> {
  const res = await apiFetch(`${base}${path}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export interface PracticeOverview {
  days: number;
  totals: { students: number; submissions: number; accepted: number; solvers: number; tests: number; all_time_submissions: number };
  series: Array<{ day: string; submissions: number; accepted: number; students: number; tests: number }>;
  runner: { configured: boolean; up: boolean | null; ms: number | null; languages: string[]; avg_grade_ms: number | null };
}
export interface StudentRow { id: string; name: string; email: string; college: string; grad_year: number | ''; target: string; solved: number; attempted: number; submissions: number; tests: number; best_mock: number | null; readiness: number | null; last_active: string }
export interface StudentDetail {
  student: { id: string; name: string; email: string; college: string; grad_year: number | null; target: string; created_at: string };
  submissions: Array<{ id: string; problem_id: string; title: string; verdict: string; passed: number; total: number; language: string; at: string; in_test: boolean }>;
  tests: Array<{ id: string; name: string; slug: string; kind: string; score: number; at: string; coding: Array<{ id: string; status: string }> | null }>;
  prep: Array<{ company: string; lessons_done: number; test_date: string | null; readiness: number | null; active_days: number }>;
  topics: Array<{ key: string; name: string; total: number; solved: number }>;
}
export interface ProblemStat { id: string; title: string; topic: string; difficulty: string; companies: string; students: number; solvers: number; submissions: number; acceptance: number | null; avg_tries: number | null; common_wrong: string; flag: string }
export interface FunnelRow { slug: string; name: string; targeted: number; practised_coding: number; took_mock: number; bought_pack: number; two_plus_mocks: number; ready_70: number }
export interface CoverageRow {
  slug: string; name: string; coding_total: number; coding_by_topic: Array<{ topic: string; count: number }>;
  mock: { name: string; sections: Array<{ name: string; needed: number; have: number; ok: boolean }>; coding: number } | null;
  modules: Array<{ title: string; items: number }>;
}

export const fetchPracticeOverview = (days = 30) => get<PracticeOverview>(`/overview?days=${days}`);
export const fetchPracticeStudents = (q = '', company = '', page = 1) =>
  get<{ total: number; page: number; rows: StudentRow[] }>(`/students?q=${encodeURIComponent(q)}&company=${encodeURIComponent(company)}&page=${page}`);
export const fetchPracticeStudent = (id: string) => get<StudentDetail>(`/students/${encodeURIComponent(id)}`);
export const fetchSubmissionCode = (id: string) => get<{ id: string; title: string; language: string; verdict: string; passed: number; total: number; at: string; code: string }>(`/submission/${encodeURIComponent(id)}`);
export const fetchProblemStats = () => get<{ rows: ProblemStat[] }>('/problems');
export const fetchFunnel = () => get<{ rows: FunnelRow[] }>('/companies');
export const fetchCoverage = () => get<{ rows: CoverageRow[] }>('/coverage');

/** Downloads a table as CSV (the request needs the admin's auth, so it goes through apiFetch). */
export async function downloadCsv(path: '/students' | '/problems' | '/companies', name: string) {
  const res = await apiFetch(`${base}${path}?format=csv`);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
