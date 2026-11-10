/**
 * Live check against the real Piston (PISTON_API_URL): every TCS NQT coding
 * problem's reference solutions (C++, Java, Python, and C when present) must
 * be accepted on all of the problem's tests. Run after setting up the runner:
 *   PISTON_API_URL=http://<host>:2000/api/v2 npx ts-node --transpile-only scripts/verifyCodingSolutions.live.ts [problem-id …]
 */
import { TCS_NQT_CODING } from '../src/data/companyTests/tcsNqtCoding';
import { runSuite, runnerConfigured, type RunLang } from '../src/lib/codeRunner';

async function main() {
  if (!runnerConfigured()) { console.error('Set PISTON_API_URL first.'); process.exit(2); }
  const only = process.argv.slice(2);
  let ok = 0;
  const bad: string[] = [];
  for (const p of TCS_NQT_CODING) {
    if (only.length && !only.includes(p.id)) continue;
    for (const lang of ['cpp', 'java', 'python', 'c'] as RunLang[]) {
      const code = p.solutions[lang];
      if (!code) continue;
      const r = await runSuite(lang, code, p.tests || [], 2);
      if (r.verdict === 'accepted') { ok++; console.log(`  ok   ${p.id} ${lang} ${r.passed}/${r.total}`); }
      else {
        const why = r.compile_error ? r.compile_error.split('\n').slice(0, 3).join(' | ') : `${r.passed}/${r.total}`;
        bad.push(`${p.id} ${lang}: ${r.verdict} ${why}`);
        console.log(`  FAIL ${p.id} ${lang} ${r.verdict} ${why}`);
        if (r.verdict === 'system_error') { console.error('Runner unreachable — stopping.'); process.exit(2); }
      }
    }
  }
  console.log(`\n${ok} solutions accepted, ${bad.length} failed`);
  if (bad.length) process.exit(1);
}

main();
