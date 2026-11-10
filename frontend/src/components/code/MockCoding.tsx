import React, { useEffect, useMemo, useState } from 'react';
import { CodingTask, pickProblems, type CodingConfig, type CodingMark } from '@/components/skill-test/Sectional';
import { Ide } from '@/components/ide/Ide';
import { fetchCodeProblem, type CodeProblemView } from '@/lib/codeApi';

const store = {
  get: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/**
 * The coding section of a company test (PRACTICE_MODE_PLAN.md §6.3): the IDE
 * in test mode — problem tabs, timer, Run on examples, Submit on hidden tests;
 * the server scores the attempt from its submissions. If the runner is offline
 * the section falls back to the self-check version (CodingTask) and tells the
 * page via onFallback, so secure mode can pause for an outside compiler.
 */
export function MockCoding({ config, attemptId, submitting, onSubmit, onFallback }: {
  config: CodingConfig; attemptId: string; submitting: boolean; onSubmit: (marks: CodingMark[]) => void; onFallback?: (fallback: boolean) => void;
}) {
  const problems = useMemo(() => pickProblems(config, attemptId), [config, attemptId]);
  const [views, setViews] = useState<CodeProblemView[] | null>(null);
  const [fallback, setFallback] = useState(false);
  const [current, setCurrent] = useState(0);
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const startKey = `tieedu_coding_${attemptId}_start`;
  const [startedAt] = useState(() => {
    const saved = Number(typeof window === 'undefined' ? 0 : store.get(startKey));
    if (saved) return saved;
    const t = Date.now(); store.set(startKey, String(t)); return t;
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    Promise.all(problems.map((p) => fetchCodeProblem(p.id, { attempt: attemptId })))
      .then((vs) => { if (vs.every((v) => v.runner && v.in_mock)) setViews(vs); else setFallback(true); })
      .catch(() => setFallback(true));
  }, [problems, attemptId]);
  useEffect(() => { onFallback?.(fallback); }, [fallback]); // eslint-disable-line react-hooks/exhaustive-deps

  const left = Math.max(0, config.minutes * 60 - Math.floor((now - startedAt) / 1000));
  useEffect(() => {
    if (!views) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [views]);
  // Time up: the attempt is submitted; the server grades from the submissions made.
  useEffect(() => { if (views && left === 0 && !submitting) onSubmit([]); }, [views, left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (fallback) return <CodingTask config={config} attemptId={attemptId} submitting={submitting} onSubmit={onSubmit} />;
  if (!views) return <p className="mx-auto max-w-3xl px-4 py-10 text-center text-base text-muted">Loading the coding problems…</p>;

  const v = views[current];
  return (
    <Ide
      key={v.problem.id}
      view={v}
      query={{}}
      onReload={() => {}}
      onSubmitted={(r) => { if (r.verdict === 'accepted') setSolved((m) => ({ ...m, [v.problem.id]: true })); }}
      test={{
        attemptId,
        problems: views.map((x) => ({ id: x.problem.id, title: x.problem.title, done: !!solved[x.problem.id] })),
        onSwitch: (id) => setCurrent(Math.max(0, views.findIndex((x) => x.problem.id === id))),
        secondsLeft: left,
        submitting,
        onFinish: () => { if (window.confirm('Finish the test? Your best submission for each problem is scored.')) onSubmit([]); },
      }}
    />
  );
}
