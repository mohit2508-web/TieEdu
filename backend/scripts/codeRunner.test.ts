/**
 * Code runner (lib/codeRunner.ts) against a fake Piston that runs Python
 * locally — enough to check verdicts, the output comparison, hidden-test
 * redaction, the "server down" path and the mock's coding marks.
 */
import http from 'http';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

const PY = process.platform === 'win32' ? 'python' : 'python3';
let calls = 0;
const fake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    calls++;
    const r = JSON.parse(body);
    const src: string = r.files[0].content;
    res.setHeader('Content-Type', 'application/json');
    if (r.language === 'c++') return res.end(JSON.stringify({ compile: { code: 1, stderr: 'main.cpp:1: error: expected ;' }, run: null }));
    if (src.includes('LOOP_FOREVER')) return res.end(JSON.stringify({ run: { code: null, signal: 'SIGKILL', stdout: '', stderr: '' } }));
    const f = path.join(os.tmpdir(), `fakepiston-${process.pid}-${calls}.py`);
    fs.writeFileSync(f, src);
    const p = spawnSync(PY, ['-I', f], { input: r.stdin, encoding: 'utf8', timeout: 10000 });
    fs.rmSync(f, { force: true });
    res.end(JSON.stringify({ language: 'python', run: { code: p.status, signal: null, stdout: p.stdout, stderr: p.stderr } }));
  });
});

async function main() {
  await new Promise<void>((r) => fake.listen(0, r));
  const port = (fake.address() as any).port;
  process.env.PISTON_API_URL = `http://127.0.0.1:${port}/api/v2`;
  delete process.env.JUDGE0_API_URL;
  const { runCode, runSuite, normalizeOutput, allowRun } = await import('../src/lib/codeRunner');
  const { TCS_NQT_CODING } = await import('../src/data/companyTests/tcsNqtCoding');
  const { pickCodingIds, codingResultFor } = await import('../src/routes/code.routes');

  check('65 problems exported, each with tests and samples first', TCS_NQT_CODING.length === 65 && TCS_NQT_CODING.every((p) => (p.tests || []).length >= 5 && p.tests![0].sample && !p.tests![p.tests!.length - 1].sample));
  check('every problem has a C++, Java and Python solution', TCS_NQT_CODING.every((p) => p.solutions.cpp && p.solutions.java && p.solutions.python));
  check('output check ignores CRLF and trailing spaces only', normalizeOutput('1 2 \r\n3\n\n') === '1 2\n3' && normalizeOutput('1  2') !== normalizeOutput('1 2'));

  const choc = TCS_NQT_CODING.find((p) => p.id === 'tcs-a06')!;
  const ok = await runSuite('python', choc.solutions.python!, choc.tests!);
  check('reference solution: accepted on every test', ok.verdict === 'accepted' && ok.passed === ok.total, JSON.stringify(ok).slice(0, 300));
  check('samples show input/expected/actual; hidden tests do not', ok.tests[0].input !== undefined && ok.tests[0].expected !== undefined && ok.tests[ok.tests.length - 1].input === undefined && ok.tests[ok.tests.length - 1].expected === undefined);

  const wrong = await runSuite('python', 'import sys\nd=sys.stdin.read().split()\nprint(" ".join(d[1:]))\n', choc.tests!);
  check('a wrong program: wrong answer, partial count', wrong.verdict === 'wrong_answer' && wrong.passed > 0 && wrong.passed < wrong.total, `${wrong.passed}/${wrong.total}`);

  const crash = await runSuite('python', 'raise ValueError("x")\n', choc.tests!);
  check('a crashing program: runtime error with stderr on the sample', crash.verdict === 'runtime_error' && /ValueError/.test(crash.tests[0].stderr || ''));

  const ce = await runSuite('cpp', 'int main( {', choc.tests!);
  check('compile error stops after one run and returns the message', ce.verdict === 'compile_error' && /expected/.test(ce.compile_error || '') && ce.tests.length === 0);

  const tle = await runCode('python', '# LOOP_FOREVER', '');
  check('a killed program is a time-limit verdict', tle.status === 'time_limit');

  process.env.PISTON_API_URL = 'http://127.0.0.1:1/api/v2';
  const down = await runSuite('python', 'print(1)', choc.tests!);
  check('runner down: system error, not a wrong answer', down.verdict === 'system_error' && down.passed === 0);

  const big = await runCode('python', 'x' .repeat(70 * 1024), '');
  check('code over 64 KB is refused before running', big.status === 'compile_error' && /64 KB/.test(big.stderr));

  let allowed = 0;
  for (let i = 0; i < 25; i++) if (allowRun('u-rate')) allowed++;
  check('rate limit: 20 runs a minute per student', allowed === 20);

  // Server draw must equal the test page's draw (Sectional.tsx pickProblems).
  const clientPick = (ids: string[], count: number, attemptId: string) => {
    let seed = [...attemptId].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);
    const pool = [...ids]; const out: string[] = [];
    while (out.length < count && pool.length) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; out.push(pool.splice(seed % pool.length, 1)[0]); }
    return out;
  };
  const ids = TCS_NQT_CODING.map((p) => p.id);
  const same = ['att-1', 'att-xyz-123', 'a'.repeat(40)].every((a) => JSON.stringify(pickCodingIds(ids, 2, a)) === JSON.stringify(clientPick(ids, 2, a)));
  check('server and page draw the same mock problems', same);

  const att = { id: 'att-1', assessmentId: 'asm-1' };
  const [p1, p2] = pickCodingIds(ids, 2, att.id);
  const db: any = {
    assessments: [{ id: 'asm-1', coding: { count: 2, problems: ids.map((id) => ({ id })) } }],
    code_submissions: [
      { attempt_id: 'att-1', problem_id: p1, passed: 3, total: 10, language: 'python' },
      { attempt_id: 'att-1', problem_id: p1, passed: 10, total: 10, language: 'python' },
    ],
  };
  const marks = codingResultFor(db, att)!;
  check('mock marks come from graded submissions', marks.length === 2 && marks[0].id === p1 && marks[0].status === 'solved' && marks[1].id === p2 && marks[1].status === 'not');
  check('no submissions in the attempt: no graded marks (self-check is kept)', codingResultFor({ ...db, code_submissions: [] }, att) === null);

  fake.close();
  console.log(`\ncode runner: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
