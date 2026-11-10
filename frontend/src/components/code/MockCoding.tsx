import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Code2, CheckCircle2 } from 'lucide-react';
import { CodingTask, pickProblems, type CodingConfig, type CodingMark } from '@/components/skill-test/Sectional';
import { CodeWorkspace } from '@/components/code/CodeWorkspace';
import { fetchCodeProblem, type CodeProblemView, type SuiteResult } from '@/lib/codeApi';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const store = {
  get: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/**
 * The mock's coding section with real grading: each problem has the editor,
 * Run samples and Submit (hidden tests), and the server scores the attempt
 * from its submissions. If the runner is offline the section falls back to
 * the self-check version (CodingTask), so a test is never blocked.
 */
export function MockCoding({ config, attemptId, submitting, onSubmit }: { config: CodingConfig; attemptId: string; submitting: boolean; onSubmit: (marks: CodingMark[]) => void }) {
  const problems = useMemo(() => pickProblems(config, attemptId), [config, attemptId]);
  const [views, setViews] = useState<CodeProblemView[] | null>(null);
  const [fallback, setFallback] = useState(false);
  const [tab, setTab] = useState(0);
  const [results, setResults] = useState<Record<string, SuiteResult>>({});
  const startKey = `tieedu_coding_${attemptId}_start`;
  const [startedAt] = useState(() => {
    const saved = Number(typeof window === 'undefined' ? 0 : store.get(startKey));
    if (saved) return saved;
    const t = Date.now(); store.set(startKey, String(t)); return t;
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    Promise.all(problems.map((p) => fetchCodeProblem(p.id, attemptId)))
      .then((vs) => { if (vs.every((v) => v.runner && v.in_mock)) setViews(vs); else setFallback(true); })
      .catch(() => setFallback(true));
  }, [problems, attemptId]);

  const left = Math.max(0, config.minutes * 60 - Math.floor((now - startedAt) / 1000));
  useEffect(() => {
    if (!views) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [views]);
  // Time up: the attempt is submitted; the server grades from the submissions made.
  useEffect(() => { if (views && left === 0 && !submitting) onSubmit([]); }, [views, left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (fallback) return <CodingTask config={config} attemptId={attemptId} submitting={submitting} onSubmit={onSubmit} />;
  if (!views) return <p className="mx-auto max-w-3xl px-4 py-10 text-center text-gray-600">Loading the coding problems…</p>;

  const v = views[tab];
  const p = v.problem;
  const done = Object.values(results).filter((r) => r.verdict === 'accepted').length;
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"><Code2 className="h-4 w-4" aria-hidden /> {config.title}</p>
        <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold tabular-nums ${left < 300 ? 'text-danger' : 'text-gray-800'}`}>
          <Clock className="h-4 w-4" aria-hidden /> {fmt(left)}
        </span>
        <span className="text-sm text-gray-600">{done}/{views.length} accepted</span>
        <button type="button" disabled={submitting} onClick={() => { if (window.confirm('Finish the test? Your best submission for each problem is scored.')) onSubmit([]); }}
          className="btn btn-primary focus-ring ml-auto min-h-[44px] px-5">{submitting ? 'Submitting…' : 'Finish test'}</button>
      </div>
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
        Run against the samples as often as you like. Submit runs the hidden tests; your best submission per problem counts. Partial marks count too.
      </p>
      <div className="mt-3 flex gap-2" role="tablist">
        {views.map((x, i) => (
          <button key={x.problem.id} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${i === tab ? 'bg-signal text-on-primary' : 'border border-gray-200 text-gray-600'}`}>
            {results[x.problem.id]?.verdict === 'accepted' && <CheckCircle2 className="h-4 w-4" aria-hidden />} Problem {i + 1}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white p-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900">{p.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-base text-gray-900">{p.statement}</p>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">Input format</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{p.input_format}</p>
          <h3 className="mt-3 text-sm font-semibold text-gray-900">Output format</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{p.output_format}</p>
          {p.constraints.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">{p.constraints.map((c) => <li key={c}>{c}</li>)}</ul>}
          {p.samples.map((s, i) => (
            <div key={i} className="mt-4 grid gap-2 sm:grid-cols-2">
              <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-sm"><span className="block text-xs text-gray-500">Sample {i + 1} input</span>{s.input}</pre>
              <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-sm"><span className="block text-xs text-gray-500">Sample {i + 1} output</span>{s.output}</pre>
            </div>
          ))}
        </article>
        <CodeWorkspace key={p.id} view={v} attemptId={attemptId} height="360px"
          onSubmitted={(r) => setResults((m) => {
            const prev = m[p.id];
            return !prev || r.passed > prev.passed ? { ...m, [p.id]: r } : m;
          })} />
      </div>
    </div>
  );
}
