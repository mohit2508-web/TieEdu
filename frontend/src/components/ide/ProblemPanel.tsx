import React, { useEffect, useState } from 'react';
import { Copy, Check, Lightbulb, Lock, BookOpen, History, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { Tabs } from '@/components/ui/Tabs';
import { fetchSubmissions, LANG_LABEL, VERDICT_LABEL, type CodeLang, type CodeProblemView, type Submission } from '@/lib/codeApi';

type Tab = 'description' | 'hints' | 'solution' | 'submissions';

const DIFF_TONE = { easy: 'success', medium: 'warning', hard: 'danger' } as const;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" aria-label={label} onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }).catch(() => {}); }}
      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted hover:bg-surface-hover hover:text-heading focus-ring">
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{done ? 'Copied' : 'Copy'}
    </button>
  );
}

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/**
 * The left side of the IDE: Description · Hints · Solution · Submissions.
 * Hints open one at a time; the solution asks once before it shows if the
 * problem is not solved yet; locked solutions open the company pack.
 */
export function ProblemPanel({ view, signedIn, onUnlock, onLoadCode }: {
  view: CodeProblemView; signedIn: boolean; onUnlock: () => void; onLoadCode: (lang: CodeLang, code: string) => void;
}) {
  const p = view.problem;
  const [tab, setTab] = useState<Tab>('description');
  const [hints, setHints] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [solLang, setSolLang] = useState<CodeLang>('cpp');
  const [subs, setSubs] = useState<Submission[] | null>(null);

  useEffect(() => { setTab('description'); setHints(0); setReveal(false); setSubs(null); }, [p.id]);
  useEffect(() => {
    if (tab === 'submissions' && signedIn && subs === null) fetchSubmissions(p.id).then((r) => setSubs(r.submissions)).catch(() => setSubs([]));
  }, [tab, signedIn, subs, p.id]);
  const sols = (Object.keys(LANG_LABEL) as CodeLang[]).filter((l) => p.solutions?.[l]);
  useEffect(() => { if (sols.length && !sols.includes(solLang)) setSolLang(sols[0]); }, [sols, solLang]);

  const tabs = [
    { key: 'description' as Tab, label: 'Description', icon: FileText },
    ...(view.in_mock ? [] : [
      { key: 'hints' as Tab, label: 'Hints', icon: Lightbulb, badge: p.hints.length || null },
      { key: 'solution' as Tab, label: 'Solution', icon: view.access.open ? BookOpen : Lock },
      { key: 'submissions' as Tab, label: 'Submissions', icon: History },
    ]),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <Tabs items={tabs} value={tab} onChange={setTab} label="Problem" className="px-2" />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {tab === 'description' && (
          <article className="space-y-5">
            <header>
              <h1 className="font-display text-2xl font-bold leading-tight text-heading">{p.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip tone={DIFF_TONE[p.difficulty as keyof typeof DIFF_TONE] || 'neutral'}>{p.difficulty[0].toUpperCase() + p.difficulty.slice(1)}</Chip>
                {p.topic_name && <Chip>{p.topic_name}</Chip>}
                {p.companies.map((c) => <Chip key={c.slug} tone="signal">{c.kind === 'reported' ? `Reported in ${c.name}` : c.name}</Chip>)}
                {view.status === 'solved' && <Chip tone="success" icon={CheckCircle2}>Solved</Chip>}
              </div>
            </header>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-body">{p.statement}</p>
            <section>
              <h2 className="text-base font-semibold text-heading">Input</h2>
              <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed text-body">{p.input_format}</p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-heading">Output</h2>
              <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed text-body">{p.output_format}</p>
            </section>
            {p.constraints.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-heading">Constraints</h2>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-body">{p.constraints.map((c) => <li key={c}><code className="font-mono text-body-md">{c}</code></li>)}</ul>
              </section>
            )}
            {p.samples.map((s, i) => (
              <section key={i} className="rounded-xl border border-line">
                <h2 className="border-b border-line px-4 py-2 text-base font-semibold text-heading">Example {i + 1}</h2>
                <div className="grid gap-px bg-line sm:grid-cols-2">
                  {[['Input', s.input], ['Output', s.output]].map(([k, v]) => (
                    <div key={k} className="bg-card p-3">
                      <div className="flex items-center justify-between"><span className="text-sm font-medium text-muted">{k}</span><CopyButton text={v} label={`Copy example ${i + 1} ${k.toLowerCase()}`} /></div>
                      <pre className="mt-1 overflow-x-auto font-mono text-body-md leading-relaxed text-heading">{v}</pre>
                    </div>
                  ))}
                </div>
                {s.explain && <p className="border-t border-line px-4 py-2 text-body-md text-body"><span className="font-semibold text-heading">Why: </span>{s.explain}</p>}
              </section>
            ))}
          </article>
        )}

        {tab === 'hints' && (
          <div className="space-y-3">
            <p className="text-base text-body">Try for 10 minutes before each hint. Each one is a nudge, not the answer.</p>
            {p.hints.slice(0, hints).map((h, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-sm font-semibold text-muted">Hint {i + 1}</p>
                <p className="mt-1 text-base text-heading">{h}</p>
              </div>
            ))}
            {hints < p.hints.length
              ? <button type="button" onClick={() => setHints(hints + 1)} className="btn btn-ghost focus-ring min-h-[44px]"><Lightbulb className="h-4 w-4" aria-hidden /> Show hint {hints + 1} of {p.hints.length}</button>
              : <p className="text-base text-body">Still stuck? The <button type="button" className="font-semibold text-link underline" onClick={() => setTab('solution')}>approach and solution</button> walk through it.</p>}
          </div>
        )}

        {tab === 'solution' && (!view.access.open ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-heading">The approach and solutions are in the {view.access.company?.name || 'company'} pack</p>
            <p className="mt-1 text-base text-body">You can still read the problem and use the hints.</p>
            <button type="button" onClick={onUnlock} className="btn btn-primary focus-ring mt-4 min-h-[48px] px-6">Unlock the pack</button>
          </div>
        ) : !reveal && view.status !== 'solved' ? (
          <div className="rounded-xl border border-line bg-surface p-6">
            <p className="text-lg font-semibold text-heading">You have not solved this one yet</p>
            <p className="mt-1 text-base text-body">Reading the solution now teaches less than one more try. Use a hint first?</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setTab('hints')} className="btn btn-ghost focus-ring min-h-[44px]">Show me a hint</button>
              <button type="button" onClick={() => setReveal(true)} className="btn btn-primary focus-ring min-h-[44px]">Show the solution</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <section>
              <h2 className="text-base font-semibold text-heading">Approach</h2>
              <p className="mt-1 text-base leading-relaxed text-body">{p.approach}</p>
              <p className="mt-2 text-body-md text-muted">Complexity: <span className="font-mono">{p.complexity}</span></p>
            </section>
            <section className="overflow-hidden rounded-xl border border-line">
              <div className="flex items-center justify-between border-b border-line bg-surface px-2">
                <Tabs size="sm" label="Solution language" className="border-0" items={sols.map((l) => ({ key: l, label: LANG_LABEL[l] }))} value={solLang} onChange={setSolLang} />
                <div className="flex items-center gap-1">
                  <CopyButton text={p.solutions?.[solLang] || ''} label="Copy solution" />
                  <button type="button" onClick={() => onLoadCode(solLang, p.solutions?.[solLang] || '')} className="h-8 rounded-md px-2 text-sm text-muted hover:bg-surface-hover hover:text-heading focus-ring">Open in editor</button>
                </div>
              </div>
              <pre className="max-h-[60vh] overflow-auto bg-card p-4 font-mono text-sm leading-relaxed text-heading">{p.solutions?.[solLang]}</pre>
            </section>
          </div>
        ))}

        {tab === 'submissions' && (!signedIn ? (
          <p className="text-base text-body">Sign in to see your submissions.</p>
        ) : subs === null ? (
          <p className="text-base text-muted">Loading…</p>
        ) : !subs.length ? (
          <p className="text-base text-body">No submissions yet. Press Submit to run the hidden tests.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                {s.verdict === 'accepted' ? <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> : <XCircle className="h-5 w-5 text-danger" aria-hidden />}
                <span className="min-w-0 flex-1">
                  <span className={`block text-base font-semibold ${s.verdict === 'accepted' ? 'text-success' : 'text-heading'}`}>{VERDICT_LABEL[s.verdict] || s.verdict}</span>
                  <span className="block text-sm text-muted">{s.passed}/{s.total} tests · {LANG_LABEL[s.language]} · {ago(s.at)}{s.in_test ? ' · in a test' : ''}</span>
                </span>
                <button type="button" onClick={() => onLoadCode(s.language, s.code)} className="btn btn-ghost focus-ring min-h-[40px] px-3 text-sm">Load code</button>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
