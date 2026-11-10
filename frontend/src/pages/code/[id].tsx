import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Lightbulb, Lock, BookOpen, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BuyPackSheet } from '@/components/prep/BuyPackSheet';
import { CodeWorkspace } from '@/components/code/CodeWorkspace';
import { fetchCodeProblem, LANG_LABEL, type CodeLang, type CodeProblemView } from '@/lib/codeApi';

/**
 * Code practice: one problem. Left: the problem and the help ladder (hints one
 * at a time → approach → full solution). Right: the editor with Run and Submit.
 * On phones the two halves are tabs.
 */
export default function CodeProblemPage() {
  const { query } = useRouter();
  const id = String(query.id || '');
  const { user } = useAuth();
  const [v, setV] = useState<CodeProblemView | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'problem' | 'code'>('problem');
  const [hints, setHints] = useState(0);
  const [showApproach, setShowApproach] = useState(false);
  const [solLang, setSolLang] = useState<CodeLang | null>(null);
  const [pack, setPack] = useState(false);

  useEffect(() => {
    if (!id) return;
    setV(null); setError(''); setHints(0); setShowApproach(false); setSolLang(null); setTab('problem');
    fetchCodeProblem(id).then(setV).catch((e) => setError(e.message));
  }, [id, user]);

  if (error) return <main className="mx-auto max-w-xl px-4 py-16 text-center text-body">{error} · <Link href="/code" className="text-link">All problems</Link></main>;
  if (!v) return <main className="mx-auto max-w-xl px-4 py-16 text-center text-muted">Loading…</main>;
  const p = v.problem;
  const sols = (Object.keys(LANG_LABEL) as CodeLang[]).filter((l) => p.solutions?.[l]);

  const problem = (
    <article className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Level {p.level} · {p.topic}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-heading">{p.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          <span className={`rounded-full px-2.5 py-1 ${p.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' : p.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{p.difficulty}</span>
          {p.kind === 'pyq' && <span className="rounded-full bg-signal-soft px-2.5 py-1 text-link" title={p.source}>Reported TCS question</span>}
          {v.best?.solved && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Solved</span>}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-base leading-relaxed text-heading">{p.statement}</p>
      <section><h2 className="text-sm font-bold text-heading">Input format</h2><p className="mt-1 whitespace-pre-wrap text-sm text-body">{p.input_format}</p></section>
      <section><h2 className="text-sm font-bold text-heading">Output format</h2><p className="mt-1 whitespace-pre-wrap text-sm text-body">{p.output_format}</p></section>
      {p.constraints.length > 0 && (
        <section><h2 className="text-sm font-bold text-heading">Constraints</h2><ul className="mt-1 list-disc pl-5 text-sm text-body">{p.constraints.map((c) => <li key={c}>{c}</li>)}</ul></section>
      )}
      {p.samples.map((s, i) => (
        <section key={i}>
          <h2 className="text-sm font-bold text-heading">Sample {i + 1}</h2>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <pre className="overflow-x-auto rounded-lg bg-surface p-3 text-sm text-heading"><span className="block text-xs text-muted">Input</span>{s.input}</pre>
            <pre className="overflow-x-auto rounded-lg bg-surface p-3 text-sm text-heading"><span className="block text-xs text-muted">Output</span>{s.output}</pre>
          </div>
          {s.explain && <p className="mt-1 text-sm text-muted">{s.explain}</p>}
        </section>
      ))}

      {/* Help ladder: hints one at a time, then the approach, then the full solution. */}
      {!v.in_mock && (
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-heading"><Lightbulb className="h-4 w-4" aria-hidden /> Stuck? Take one step at a time</h2>
          <ol className="mt-2 space-y-2">
            {p.hints.slice(0, hints).map((h, i) => <li key={i} className="rounded-lg bg-surface p-3 text-sm text-heading"><strong>Hint {i + 1}:</strong> {h}</li>)}
          </ol>
          {hints < p.hints.length && (
            <button type="button" onClick={() => setHints(hints + 1)} className="btn btn-ghost focus-ring mt-2 min-h-[44px]">Show hint {hints + 1} of {p.hints.length}</button>
          )}
          {hints >= p.hints.length && (v.locked ? (
            <div className="mt-3 rounded-lg border border-line p-3 text-sm text-body">
              <p className="flex items-center gap-2 font-semibold text-heading"><Lock className="h-4 w-4" aria-hidden /> Approach and solutions are in the TCS NQT pack</p>
              <button type="button" onClick={() => setPack(true)} className="btn btn-primary focus-ring mt-2 min-h-[44px]">See the pack</button>
            </div>
          ) : !showApproach ? (
            <button type="button" onClick={() => setShowApproach(true)} className="btn btn-ghost focus-ring mt-2 min-h-[44px]"><BookOpen className="h-4 w-4" aria-hidden /> Show the approach</button>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg bg-surface p-3 text-sm text-heading"><strong>Approach:</strong> {p.approach}<p className="mt-1 text-muted">Complexity: {p.complexity}</p></div>
              {!solLang ? (
                <div className="flex flex-wrap gap-2">
                  {sols.map((l) => <button key={l} type="button" onClick={() => setSolLang(l)} className="btn btn-ghost focus-ring min-h-[40px] px-3 text-sm">Solution in {LANG_LABEL[l]}</button>)}
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap gap-2">
                    {sols.map((l) => <button key={l} type="button" onClick={() => setSolLang(l)} aria-pressed={solLang === l} className={`rounded-full px-3 py-1 text-xs font-semibold ${solLang === l ? 'bg-signal text-on-primary' : 'border border-line text-muted'}`}>{LANG_LABEL[l]}</button>)}
                  </div>
                  <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">{p.solutions?.[solLang]}</pre>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <nav className="flex justify-between gap-2" aria-label="Problems">
        {v.prev ? <Link href={`/code/${v.prev}`} className="btn btn-ghost focus-ring min-h-[44px]"><ArrowLeft className="h-4 w-4" aria-hidden /> Previous</Link> : <span />}
        {v.next && <Link href={`/code/${v.next}`} className="btn btn-ghost focus-ring min-h-[44px]">Next problem <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
      </nav>
    </article>
  );

  const workspace = user ? (
    <CodeWorkspace view={v} onLocked={() => setPack(true)} onSubmitted={() => fetchCodeProblem(id).then(setV).catch(() => {})} />
  ) : (
    <div className="rounded-xl border border-line bg-card p-6 text-center">
      <p className="font-semibold text-heading">Sign in to run and submit your code</p>
      <Link href={`/login?next=/code/${id}`} className="btn btn-primary focus-ring mt-4 inline-flex min-h-[48px] px-6">Sign in</Link>
    </div>
  );

  return (
    <>
      <Head><title>{`${p.title} · TCS NQT coding · TieEdu`}</title></Head>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:py-6">
        <Link href="/code" className="inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold text-link"><ArrowLeft className="h-4 w-4" aria-hidden /> All coding problems</Link>
        <div className="mt-2 flex gap-2 lg:hidden" role="tablist">
          {(['problem', 'code'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`min-h-[44px] flex-1 rounded-full text-sm font-semibold ${tab === t ? 'bg-signal text-on-primary' : 'border border-line text-muted'}`}>
              {t === 'problem' ? 'Problem' : 'Code'}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className={`${tab === 'problem' ? '' : 'hidden'} lg:block lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-2`}>{problem}</div>
          <div className={`${tab === 'code' ? '' : 'hidden'} lg:block`}>{workspace}</div>
        </div>
      </main>
      <BuyPackSheet open={pack} onClose={() => setPack(false)} slug={v.company} what="This problem's approach and solution" />
    </>
  );
}
