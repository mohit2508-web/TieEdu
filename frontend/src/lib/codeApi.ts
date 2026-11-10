import { apiFetch, API_BASE_URL } from './api';

/** Code practice and the mock's coding section (backend routes/code.routes.ts). */
export type CodeLang = 'c' | 'cpp' | 'java' | 'python';
export const LANG_LABEL: Record<CodeLang, string> = { c: 'C', cpp: 'C++', java: 'Java', python: 'Python' };

export interface CodeBest { verdict: string; passed: number; total: number; at: string; solved: boolean }
export interface CodeProblemRow { id: string; title: string; level: number; difficulty: string; topic: string; kind: string; free: boolean; best: CodeBest | null }
export interface CodeProblem {
  id: string; title: string; level: number; difficulty: string; topic: string; kind: string; source: string;
  statement: string; input_format: string; output_format: string; constraints: string[];
  samples: Array<{ input: string; output: string; explain?: string }>; hints: string[]; tests_total: number;
  approach?: string; complexity?: string; solutions?: Partial<Record<CodeLang, string>>;
}
export interface CodeProblemView {
  problem: CodeProblem; locked: boolean; in_mock: boolean; runner: boolean; languages: CodeLang[];
  starter: Record<CodeLang, string>; best: CodeBest | null; company: string; prev: string | null; next: string | null;
}
export interface TestOutcome { index: number; sample: boolean; passed: boolean; status: string; ms: number; input?: string; expected?: string; actual?: string; stderr?: string }
export interface SuiteResult {
  verdict: 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'time_limit' | 'system_error';
  passed: number; total: number; tests: TestOutcome[]; compile_error?: string; best?: CodeBest | null; mode?: string;
}
export interface CustomRun { mode: 'custom'; status: string; stdout: string; stderr: string; ms: number }

/** Errors carry the server's code (runner_off, runner_down, pack_required) so the page can react. */
export class CodeApiError extends Error { constructor(message: string, public code?: string, public status?: number) { super(message); } }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}/code${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new CodeApiError(body?.error || `Request failed (${res.status})`, body?.code, res.status);
  return body as T;
}
const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const fetchCodeProblems = () => call<{ runner: boolean; problems: CodeProblemRow[] }>('/problems');
export const fetchCodeProblem = (id: string, attemptId?: string) =>
  call<CodeProblemView>(`/problem/${encodeURIComponent(id)}${attemptId ? `?attempt=${encodeURIComponent(attemptId)}` : ''}`);
export const runSamples = (problemId: string, language: CodeLang, code: string, attemptId?: string) =>
  call<SuiteResult>('/run', post({ problem_id: problemId, language, code, attempt_id: attemptId }));
export const runCustom = (problemId: string, language: CodeLang, code: string, input: string, attemptId?: string) =>
  call<CustomRun>('/run', post({ problem_id: problemId, language, code, input, attempt_id: attemptId }));
export const submitCode = (problemId: string, language: CodeLang, code: string, attemptId?: string) =>
  call<SuiteResult & { submission_id: string }>('/submit', post({ problem_id: problemId, language, code, attempt_id: attemptId }));

export const VERDICT_LABEL: Record<string, string> = {
  accepted: 'Accepted', wrong_answer: 'Wrong answer', compile_error: 'Compilation error', runtime_error: 'Runtime error',
  time_limit: 'Time limit exceeded', system_error: 'Runner unavailable',
};
