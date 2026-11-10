import { apiFetch, API_BASE_URL } from './api';

/** Code runner and practice API (backend routes/code.routes.ts, routes/practice.routes.ts). */
export type CodeLang = 'c' | 'cpp' | 'java' | 'python';
export const LANG_LABEL: Record<CodeLang, string> = { c: 'C', cpp: 'C++', java: 'Java', python: 'Python' };
export type ProblemStatus = 'solved' | 'attempted' | 'todo';

export interface CodeBest { verdict: string; passed: number; total: number; at: string; solved: boolean }
export interface CodeProblemRow { id: string; title: string; level: number; difficulty: string; topic: string; kind: string; free: boolean; best: CodeBest | null }
export interface CompanyTagView { slug: string; name: string; kind: 'reported' | 'practice' }
export interface CodeProblem {
  id: string; title: string; level: number; difficulty: string; topic: string; topic_key: string; topic_name: string; kind: string; source: string;
  companies: CompanyTagView[];
  statement: string; input_format: string; output_format: string; constraints: string[];
  samples: Array<{ input: string; output: string; explain?: string }>; hints: string[]; tests_total: number;
  approach?: string; complexity?: string; solutions?: Partial<Record<CodeLang, string>>;
}
export interface AccessView { open: boolean; reason: 'free' | 'pack' | 'member' | 'locked' | 'test'; company: { slug: string; name: string } | null }
export interface ContextItem { id: string; title: string; difficulty: string; status: ProblemStatus; open: boolean }
export interface CodeProblemView {
  problem: CodeProblem; access: AccessView; locked: boolean; in_mock: boolean; runner: boolean; languages: CodeLang[];
  starter: Record<CodeLang, string>; best: CodeBest | null; status: ProblemStatus; company: string;
  context: { kind: 'company' | 'topic'; key: string; name: string; items: ContextItem[] } | null;
  prev: string | null; next: string | null;
}
export interface TestOutcome { index: number; sample: boolean; passed: boolean; status: string; ms: number; input?: string; expected?: string; actual?: string; stderr?: string }
export interface SuiteResult {
  verdict: 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'time_limit' | 'system_error';
  passed: number; total: number; tests: TestOutcome[]; compile_error?: string; best?: CodeBest | null; mode?: string;
}
export interface CustomRun { mode: 'custom'; status: string; stdout: string; stderr: string; ms: number }
export interface CaseRun {
  mode: 'cases'; verdict: 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'time_limit' | 'ran'; compile_error?: string;
  cases: Array<{ status: string; ms: number; stdout: string; stderr: string; expected: string | null; passed: boolean | null }>;
}
export interface Submission { id: string; verdict: string; passed: number; total: number; language: CodeLang; at: string; in_test: boolean; code: string }

/** Errors carry the server's code (runner_off, runner_down, pack_required) so the page can react. */
export class CodeApiError extends Error { constructor(message: string, public code?: string, public status?: number) { super(message); } }

async function call<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}/${base}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new CodeApiError(body?.error || `Request failed (${res.status})`, body?.code, res.status);
  return body as T;
}
const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const qs = (q: Record<string, string | undefined>) => {
  const s = Object.entries(q).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
  return s ? `?${s}` : '';
};

export const fetchCodeProblems = () => call<{ runner: boolean; problems: CodeProblemRow[] }>('code', '/problems');
export const fetchCodeProblem = (id: string, opts: { attempt?: string; company?: string; topic?: string } | string = {}) => {
  const o = typeof opts === 'string' ? { attempt: opts } : opts;
  return call<CodeProblemView>('code', `/problem/${encodeURIComponent(id)}${qs(o)}`);
};
export const fetchSubmissions = (id: string) => call<{ submissions: Submission[] }>('code', `/submissions/${encodeURIComponent(id)}`);
export const runSamples = (problemId: string, language: CodeLang, code: string, attemptId?: string) =>
  call<SuiteResult>('code', '/run', post({ problem_id: problemId, language, code, attempt_id: attemptId }));
export const runCustom = (problemId: string, language: CodeLang, code: string, input: string, attemptId?: string) =>
  call<CustomRun>('code', '/run', post({ problem_id: problemId, language, code, input, attempt_id: attemptId }));
export const runCases = (problemId: string, language: CodeLang, code: string, cases: Array<{ input: string; expected: string | null }>, attemptId?: string) =>
  call<CaseRun>('code', '/run', post({ problem_id: problemId, language, code, cases, attempt_id: attemptId }));
export const submitCode = (problemId: string, language: CodeLang, code: string, attemptId?: string) =>
  call<SuiteResult & { submission_id: string }>('code', '/submit', post({ problem_id: problemId, language, code, attempt_id: attemptId }));

// ---- Practice hub
export interface PracticeRow { id: string; title: string; difficulty: string; topic_key: string; kind: string; companies: CompanyTagView[]; status: ProblemStatus; open: boolean; lock_company: { slug: string; name: string } | null }
export interface Counts { total: number; solved: number; attempted: number }
export interface CompanyMeta { slug: string; name: string; logo_url: string; tagline: string; owned: boolean; price: number; free_program: boolean }
export interface CompanyTest { slug: string; name: string; kind: 'full' | 'sectional'; questions: number; minutes: number; coding: boolean; attempts: number; best: number | null; last: { id: string; score: number } | null }
export interface PracticeHome {
  runner: boolean; totals: Counts & { active_days: number };
  continue: { id: string; title: string; status: ProblemStatus } | null; next: { id: string; title: string; topic: string } | null;
  activity: string[]; topics: Array<Counts & { key: string; name: string }>; companies: Array<CompanyMeta & Counts & { tests: number }>;
}
export interface DsaSheet { topics: Array<Counts & { key: string; name: string; blurb: string; problems: PracticeRow[] }>; companies: Array<{ slug: string; name: string }> }
export interface CompanyPractice {
  company: CompanyMeta; progress: Counts & { locked: number };
  levels: Array<Counts & { name: string; blurb: string; problems: PracticeRow[] }>; tests: CompanyTest[]; prep: boolean;
}
export const fetchPracticeHome = () => call<PracticeHome>('practice', '/home');
export const fetchDsaSheet = () => call<DsaSheet>('practice', '/dsa');
export const fetchPracticeCompanies = () => call<{ companies: Array<CompanyMeta & Counts & { locked: number; tests: number }> }>('practice', '/companies');
export const fetchCompanyPractice = (slug: string) => call<CompanyPractice>('practice', `/companies/${encodeURIComponent(slug)}`);

export const VERDICT_LABEL: Record<string, string> = {
  accepted: 'Accepted', wrong_answer: 'Wrong answer', compile_error: 'Compilation error', runtime_error: 'Runtime error',
  time_limit: 'Time limit exceeded', system_error: 'Runner unavailable', ran: 'Ran', ok: 'Ran',
};
export const fetchPracticeTests = () => call<{ companies: Array<CompanyMeta & { tests: CompanyTest[] }> }>('practice', '/tests');
