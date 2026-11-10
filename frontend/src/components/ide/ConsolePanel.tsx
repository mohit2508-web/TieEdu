import React from 'react';
import { Plus, X, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { VERDICT_LABEL, type CaseRun, type SuiteResult } from '@/lib/codeApi';

export interface ConsoleCase { input: string; expected: string; sample: boolean }
export type ConsoleResult = { kind: 'run'; data: CaseRun } | { kind: 'submit'; data: SuiteResult } | null;
export type ConsoleTab = 'cases' | 'result';
export const MAX_CASES = 8;

const area = 'w-full resize-y rounded-lg border border-line bg-surface p-3 font-mono text-[14px] leading-relaxed text-heading focus:border-signal focus:outline-none';

function Out({ title, text, tone }: { title: string; text: string; tone?: 'bad' | 'good' }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">{title}</p>
      <pre className={`mt-1 max-h-48 overflow-auto rounded-lg p-3 font-mono text-[14px] leading-relaxed ${tone === 'bad' ? 'bg-danger-soft text-danger' : tone === 'good' ? 'bg-success-soft text-heading' : 'bg-surface text-heading'}`}>{text || ' '}</pre>
    </div>
  );
}

/**
 * The IDE console: Testcases (edit the examples, add your own, up to 8) and
 * Result (per-case output for Run; samples + hidden-test strip for Submit).
 */
export function ConsolePanel({ tab, onTab, cases, onCases, active, onActive, result, busy, onJumpLine }: {
  tab: ConsoleTab; onTab: (t: ConsoleTab) => void; cases: ConsoleCase[]; onCases: (c: ConsoleCase[]) => void;
  active: number; onActive: (i: number) => void; result: ConsoleResult; busy: '' | 'run' | 'submit'; onJumpLine?: (line: number) => void;
}) {
  const c = cases[Math.min(active, cases.length - 1)];
  const set = (i: number, k: 'input' | 'expected', v: string) => onCases(cases.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const add = () => { if (cases.length < MAX_CASES) { onCases([...cases, { input: c?.input || '', expected: '', sample: false }]); onActive(cases.length); } };
  const remove = (i: number) => { const n = cases.filter((_, j) => j !== i); onCases(n); onActive(Math.max(0, Math.min(active, n.length - 1))); };

  const runCases = result?.kind === 'run' ? result.data : null;
  const suite = result?.kind === 'submit' ? result.data : null;
  const verdict = runCases?.verdict || suite?.verdict;
  const good = verdict === 'accepted';

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <Tabs label="Console" size="sm" className="px-2" value={tab} onChange={onTab}
        items={[{ key: 'cases', label: 'Testcases' }, { key: 'result', label: busy ? 'Running…' : 'Result' }]} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'cases' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {cases.map((x, i) => (
                <span key={i} className={`inline-flex h-9 items-center rounded-lg text-sm font-semibold ${i === active ? 'bg-surface-hover text-heading' : 'text-muted hover:text-heading'}`}>
                  <button type="button" onClick={() => onActive(i)} className="h-full px-3 focus-ring" aria-pressed={i === active}>Case {i + 1}</button>
                  {!x.sample && <button type="button" aria-label={`Remove case ${i + 1}`} onClick={() => remove(i)} className="mr-1 rounded p-0.5 hover:bg-card focus-ring"><X className="h-3.5 w-3.5" aria-hidden /></button>}
                </span>
              ))}
              {cases.length < MAX_CASES && <button type="button" onClick={add} aria-label="Add a test case" className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted hover:bg-surface-hover hover:text-heading focus-ring"><Plus className="h-4 w-4" aria-hidden /> Add</button>}
            </div>
            {c && (
              <>
                <label className="block"><span className="text-sm font-medium text-muted">Input</span>
                  <textarea rows={4} spellCheck={false} className={area} value={c.input} onChange={(e) => set(active, 'input', e.target.value)} />
                </label>
                <label className="block"><span className="text-sm font-medium text-muted">Expected output <span className="font-normal">(optional for your own cases)</span></span>
                  <textarea rows={2} spellCheck={false} className={area} value={c.expected} onChange={(e) => set(active, 'expected', e.target.value)} />
                </label>
              </>
            )}
          </div>
        )}

        {tab === 'result' && (busy ? (
          <p className="flex items-center gap-2 text-base text-muted"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {busy === 'submit' ? 'Running all tests…' : 'Running your cases…'}</p>
        ) : !result ? (
          <p className="text-base text-muted">Run your code to see the output here.</p>
        ) : (
          <div className="space-y-4" aria-live="polite">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className={`text-xl font-bold ${good ? 'text-success' : verdict === 'ran' ? 'text-heading' : 'text-danger'}`}>{VERDICT_LABEL[verdict || ''] || verdict}</p>
              {suite && suite.verdict !== 'compile_error' && <p className="text-base text-body">{suite.passed} / {suite.total} tests passed</p>}
              {runCases && runCases.cases.length > 0 && <p className="text-base text-body">Runtime {Math.max(...runCases.cases.map((x) => x.ms))} ms</p>}
            </div>

            {(runCases?.compile_error || suite?.compile_error) && (
              <pre className="max-h-72 overflow-auto rounded-lg bg-danger-soft p-3 font-mono text-[13px] leading-relaxed text-danger">
                {(runCases?.compile_error || suite?.compile_error || '').split('\n').map((line, i) => {
                  const m = line.match(/(?:main\.\w+|Main\.java):(\d+)/);
                  return <span key={i} className="block">{m && onJumpLine ? <button type="button" className="underline" onClick={() => onJumpLine(+m[1])}>{line}</button> : line}</span>;
                })}
              </pre>
            )}

            {runCases && runCases.cases.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {runCases.cases.map((x, i) => (
                    <button key={i} type="button" onClick={() => onActive(i)} aria-pressed={i === active}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold focus-ring ${i === active ? 'bg-surface-hover text-heading' : 'text-muted'}`}>
                      {x.passed === true ? <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> : x.passed === false || x.status !== 'ok' ? <XCircle className="h-4 w-4 text-danger" aria-hidden /> : null}
                      Case {i + 1}
                    </button>
                  ))}
                </div>
                {(() => {
                  const x = runCases.cases[Math.min(active, runCases.cases.length - 1)];
                  return (
                    <div className="space-y-3">
                      <Out title="Input" text={cases[Math.min(active, cases.length - 1)]?.input || ''} />
                      <Out title="Your output" text={x.stdout} tone={x.passed === false ? 'bad' : x.passed ? 'good' : undefined} />
                      {x.expected !== null && <Out title="Expected" text={x.expected} />}
                      {x.stderr && <Out title={x.status === 'time_limit' ? 'Time limit exceeded' : 'Error'} text={x.stderr} tone="bad" />}
                    </div>
                  );
                })()}
              </>
            )}

            {suite && suite.tests.length > 0 && (
              <>
                {suite.tests.filter((t) => t.sample && !t.passed).slice(0, 1).map((t) => (
                  <div key={t.index} className="space-y-3">
                    <p className="text-base font-semibold text-heading">First failing example: case {t.index}</p>
                    <Out title="Input" text={t.input || ''} />
                    <Out title="Your output" text={t.actual || ''} tone="bad" />
                    <Out title="Expected" text={t.expected || ''} />
                    {t.stderr && <Out title="Error" text={t.stderr} tone="bad" />}
                  </div>
                ))}
                <div>
                  <p className="text-base font-semibold text-heading">All tests</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suite.tests.map((t) => (
                      <span key={t.index} title={`Test ${t.index}${t.sample ? ' (example)' : ''}: ${t.passed ? 'passed' : VERDICT_LABEL[t.status] || 'wrong answer'}`}
                        className={`inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-md text-xs font-semibold ${t.passed ? 'bg-success-soft text-success' : t.status === 'time_limit' ? 'bg-warning-soft text-warning' : 'bg-danger-soft text-danger'}`}>
                        {t.index}
                      </span>
                    ))}
                  </div>
                  {!good && <p className="mt-3 text-[15px] text-body">Hidden tests check edge cases: one element, all equal, zeros, negatives and the largest input. Re-read the constraints.</p>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
