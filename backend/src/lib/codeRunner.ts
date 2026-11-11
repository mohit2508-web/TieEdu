/**
 * Code runner: runs a student's program on the Piston server (ported from
 * ContestOS's externalCodeExecutor, minus its local-spawn fallback, which ran
 * untrusted code on the API host with the server's environment).
 *
 * Env:
 *   PISTON_API_URL   e.g. http://<host>:2000/api/v2   (required; without it running is "not configured")
 *   PISTON_API_KEY   optional, sent as Authorization for a protected Piston
 *   JUDGE0_API_URL   optional fallback when Piston is unreachable (JUDGE0_API_KEY optional)
 *
 * Output check (as in ContestOS): CRLF → LF, trailing spaces on every line and
 * blank lines at the end are ignored; everything else must match exactly.
 */
import axios from 'axios';

export type RunLang = 'c' | 'cpp' | 'java' | 'python';
export const RUN_LANGS: RunLang[] = ['c', 'cpp', 'java', 'python'];
export type RunStatus = 'ok' | 'compile_error' | 'runtime_error' | 'time_limit' | 'system_error';

const PISTON: Record<RunLang, { language: string; file: string }> = {
  c: { language: 'c', file: 'main.c' },
  cpp: { language: 'c++', file: 'main.cpp' },
  java: { language: 'java', file: 'Main.java' },
  python: { language: 'python', file: 'main.py' },
};
const JUDGE0_ID: Record<RunLang, number> = { c: 50, cpp: 54, java: 62, python: 71 };

export const MAX_CODE_BYTES = 64 * 1024;
const RUN_TIMEOUT_MS = 3000;
const COMPILE_TIMEOUT_MS = 10000;
const MEMORY_BYTES = 256 * 1024 * 1024;
const OUTPUT_CAP = 64 * 1024;

export interface RunResult { status: RunStatus; stdout: string; stderr: string; ms: number }

const pistonUrl = () => (process.env.PISTON_API_URL || '').replace(/\/+$/, '');
const judge0Url = () => (process.env.JUDGE0_API_URL || '').replace(/\/+$/, '');
export const runnerConfigured = () => !!(pistonUrl() || judge0Url());

const cap = (s: unknown) => String(s ?? '').slice(0, OUTPUT_CAP);

export function normalizeOutput(s: string): string {
  return String(s ?? '').replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
}

async function viaPiston(lang: RunLang, code: string, stdin: string): Promise<RunResult> {
  const t0 = Date.now();
  const p = PISTON[lang];
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.PISTON_API_KEY) headers.Authorization = process.env.PISTON_API_KEY;
  const { data } = await axios.post(`${pistonUrl()}/execute`, {
    language: p.language, version: '*', files: [{ name: p.file, content: code }], stdin,
    compile_timeout: COMPILE_TIMEOUT_MS, run_timeout: RUN_TIMEOUT_MS, compile_memory_limit: -1, run_memory_limit: MEMORY_BYTES,
  }, { headers, timeout: COMPILE_TIMEOUT_MS + RUN_TIMEOUT_MS + 5000 });
  const ms = Date.now() - t0;
  const { compile, run } = data || {};
  if (compile && compile.code !== 0 && compile.code != null) return { status: 'compile_error', stdout: '', stderr: cap(compile.stderr || compile.output), ms };
  if (!run) return { status: 'system_error', stdout: '', stderr: 'No run result from Piston', ms };
  // Piston's own status: OL/EL = output limit (its sandbox then reports SIGKILL too, so check this first), TO = timeout.
  if (run.status === 'OL' || run.status === 'EL' || /length exceeded/i.test(String(run.message || ''))) {
    return { status: 'runtime_error', stdout: cap(run.stdout), stderr: 'Output limit exceeded: the program printed more than the runner allows.', ms };
  }
  if (run.status === 'TO' || run.signal === 'SIGKILL' || /timed? ?out/i.test(String(run.message || ''))) return { status: 'time_limit', stdout: cap(run.stdout), stderr: cap(run.stderr), ms };
  if (run.code !== 0) return { status: 'runtime_error', stdout: cap(run.stdout), stderr: cap(run.stderr || `Exit code ${run.code}`), ms };
  return { status: 'ok', stdout: cap(run.stdout), stderr: cap(run.stderr), ms };
}

async function viaJudge0(lang: RunLang, code: string, stdin: string): Promise<RunResult> {
  const t0 = Date.now();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.JUDGE0_API_KEY) headers['X-Auth-Token'] = process.env.JUDGE0_API_KEY;
  const { data } = await axios.post(`${judge0Url()}/submissions`, {
    source_code: code, language_id: JUDGE0_ID[lang], stdin, cpu_time_limit: RUN_TIMEOUT_MS / 1000, memory_limit: MEMORY_BYTES / 1024,
  }, { headers, params: { base64_encoded: false, wait: true }, timeout: 30000 });
  const ms = Date.now() - t0;
  const id = data?.status?.id;
  if (id === 6) return { status: 'compile_error', stdout: '', stderr: cap(data.compile_output), ms };
  if (id === 5) return { status: 'time_limit', stdout: cap(data.stdout), stderr: cap(data.stderr), ms };
  if (id >= 7 && id <= 12) return { status: 'runtime_error', stdout: cap(data.stdout), stderr: cap(data.stderr || data.status?.description), ms };
  if (id === 3 || id === 4) return { status: 'ok', stdout: cap(data.stdout), stderr: cap(data.stderr), ms };
  return { status: 'system_error', stdout: '', stderr: cap(data?.status?.description || 'Judge0 error'), ms };
}

/** One run. Never throws: a server problem comes back as status "system_error". */
export async function runCode(lang: RunLang, code: string, stdin: string): Promise<RunResult> {
  if (!RUN_LANGS.includes(lang)) return { status: 'system_error', stdout: '', stderr: 'Unsupported language', ms: 0 };
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) return { status: 'compile_error', stdout: '', stderr: 'Code is larger than 64 KB', ms: 0 };
  if (pistonUrl()) {
    try { return await viaPiston(lang, code, stdin); } catch (e: any) {
      if (!judge0Url()) return { status: 'system_error', stdout: '', stderr: `Runner unreachable: ${e?.code || e?.message || 'error'}`, ms: 0 };
    }
  }
  if (judge0Url()) {
    try { return await viaJudge0(lang, code, stdin); } catch (e: any) {
      return { status: 'system_error', stdout: '', stderr: `Runner unreachable: ${e?.code || e?.message || 'error'}`, ms: 0 };
    }
  }
  return { status: 'system_error', stdout: '', stderr: 'Code runner is not configured', ms: 0 };
}

export interface TestOutcome { index: number; sample: boolean; passed: boolean; status: RunStatus; ms: number; input?: string; expected?: string; actual?: string; stderr?: string }
export interface SuiteResult {
  verdict: 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'time_limit' | 'system_error';
  passed: number; total: number; tests: TestOutcome[]; compile_error?: string;
}

/**
 * Runs every test (samples first). Stops early on a compile error or a system
 * error. Hidden tests come back without their input and expected output.
 */
export async function runSuite(lang: RunLang, code: string, tests: Array<{ input: string; output: string; sample: boolean }>, concurrency = 3): Promise<SuiteResult> {
  const first = await runCode(lang, code, tests[0]?.input ?? '');
  if (first.status === 'compile_error') return { verdict: 'compile_error', passed: 0, total: tests.length, tests: [], compile_error: first.stderr };
  if (first.status === 'system_error') return { verdict: 'system_error', passed: 0, total: tests.length, tests: [], compile_error: first.stderr };
  const results: RunResult[] = new Array(tests.length);
  results[0] = first;
  let next = 1;
  const worker = async () => {
    while (next < tests.length) { const i = next++; results[i] = await runCode(lang, code, tests[i].input); }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(0, tests.length - 1)) }, worker));
  const out: TestOutcome[] = tests.map((t, i) => {
    const r = results[i];
    const passed = r.status === 'ok' && normalizeOutput(r.stdout) === normalizeOutput(t.output);
    return {
      index: i + 1, sample: t.sample, passed, status: r.status, ms: r.ms,
      ...(t.sample ? { input: t.input, expected: normalizeOutput(t.output), actual: normalizeOutput(r.stdout).slice(0, 4000), stderr: r.stderr.slice(0, 2000) } : {}),
    };
  });
  const passed = out.filter((t) => t.passed).length;
  const failed = out.find((t) => !t.passed);
  const verdict: SuiteResult['verdict'] = !failed ? 'accepted'
    : out.some((t) => t.status === 'system_error') ? 'system_error'
    : failed.status === 'time_limit' ? 'time_limit' : failed.status === 'runtime_error' ? 'runtime_error' : 'wrong_answer';
  return { verdict, passed, total: tests.length, tests: out };
}

// ---- per-user rate limit (in memory): runs and submits share one budget
const hits = new Map<string, number[]>();
export function allowRun(userId: string, perMinute = 20): boolean {
  const now = Date.now();
  const list = (hits.get(userId) || []).filter((t) => now - t < 60000);
  if (list.length >= perMinute) { hits.set(userId, list); return false; }
  list.push(now); hits.set(userId, list);
  return true;
}
