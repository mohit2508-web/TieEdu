import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, X, ExternalLink, Wrench, NotebookPen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PrepNav } from '@/components/prep/PrepNav';
import { BuyPackSheet } from '@/components/prep/BuyPackSheet';
import { PracticeQuestion } from '@/components/prep/PracticeQuestion';
import { fetchLesson, fetchPrep, markLesson, type LessonView, type PrepView } from '@/lib/prepApi';

/**
 * Train: one lesson (INFOSYS_SE_3T_UX_PLAN §3). What it is → rules → worked
 * examples → traps → practice questions. Finishing the practice marks the
 * lesson done; Exit always returns to the plan's Train tab.
 */
export default function LessonPage() {
  const { query, push } = useRouter();
  const slug = String(query.slug || '');
  const id = String(query.id || '');
  const { user } = useAuth();
  const [v, setV] = useState<LessonView | null>(null);
  const [prep, setPrep] = useState<PrepView | null>(null);
  // Practice results by question number: true = right.
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const exit = `/prep/${slug}?tab=train`;

  useEffect(() => {
    if (!user || !slug || !id) return;
    setV(null); setAnswers({}); setError('');
    fetchLesson(slug, id).then((x) => { setV(x); setDone(!!x.done); }).catch((e) => setError(e.message));
    fetchPrep(slug).then(setPrep).catch(() => {});
  }, [user, slug, id]);

  const L = v?.lesson;
  const practice = L?.practice || [];
  const answered = Object.keys(answers).length;
  const correct = Object.values(answers).filter(Boolean).length;

  // Every practice question answered → the lesson counts as done.
  useEffect(() => {
    if (!v || done || !practice.length || answered < practice.length) return;
    markLesson(slug, v.id).then(() => setDone(true)).catch(() => {});
  }, [answered, practice.length, v, done, slug]);

  const finish = async () => { if (v) { await markLesson(slug, v.id).catch(() => {}); setDone(true); } };
  const section = (prep?.lessons.find((l) => l.id === id)?.section) || '';
  const sectionTest = prep?.sections.find((s) => s.key === section);

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-heading">Sign in to read this lesson</h1>
        <Link href={`/login?next=/prep/${slug}/learn/${id}`} className="btn btn-primary mt-6 inline-flex min-h-[48px] px-6">Sign in</Link>
      </main>
    );
  }

  return (
    <>
      <Head><title>{v?.title || 'Lesson'} | TiEEdu</title></Head>
      <PrepNav slug={slug} name={prep?.company.name || 'My prep'} active="train" lab={!!prep?.lab} wide />
      <div className="sticky top-[calc(var(--header-pin)+3.25rem)] z-10 transition-[top] duration-200 motion-reduce:transition-none border-b border-line bg-app-warm/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link href={exit} className="btn btn-ghost min-h-[44px] px-3 text-base"><X className="h-5 w-5" aria-hidden /> Exit to my plan</Link>
          {v && <span className="ml-auto text-base font-semibold text-muted">Lesson {v.index} of {v.total}</span>}
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        {error && <p className="text-base text-danger">{error}</p>}
        {!v && !error && <p className="text-base text-muted" aria-busy="true">Opening the lesson…</p>}

        {v && (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <p className="eyebrow">{L?.module ? `Module ${L.module} · ${L.section}` : L?.section || v.title.split(':')[0]}</p>
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-heading sm:text-4xl">{L?.title || v.title.split(':').slice(1).join(':').trim()}</h1>

            {v.error === 'pack_required' ? (
              <LockedLesson slug={slug} name={prep?.company.name || 'company'} />
            ) : L ? (
              <article className="mt-6 max-w-[860px] space-y-8 text-lg leading-relaxed text-body">
                {L.what && <p>{L.what}</p>}
                {L.doc && (
                  <a href={L.doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-card px-4 text-base font-semibold text-link">
                    <ExternalLink className="h-4 w-4" aria-hidden /> Official docs: {L.doc.label}
                  </a>
                )}

                <section id="rules" className="scroll-mt-32">
                  <h2 className="font-display text-2xl font-bold text-heading">Rules and formulas</h2>
                  <ul className="mt-3 space-y-2 rounded-card border border-line bg-card p-5">
                    {L.rules.map((r) => <li key={r} className="flex gap-2"><Check className="mt-1.5 h-5 w-5 shrink-0 text-success" aria-hidden /><span><Inline text={r} /></span></li>)}
                  </ul>
                </section>

                <section id="examples" className="scroll-mt-32">
                  <h2 className="font-display text-2xl font-bold text-heading">Worked examples</h2>
                  <ol className="mt-3 space-y-3">
                    {L.examples.map((e, i) => (
                      <li key={i} className="rounded-card border border-line bg-card p-5">
                        <span className="mr-2 font-bold text-amber-deep">Example {i + 1}.</span>
                        {e.includes('\n')
                          ? <pre className="mt-2 overflow-x-auto rounded-xl bg-surface-hover p-4 font-mono text-[0.95rem] leading-relaxed text-heading">{e}</pre>
                          : <Inline text={e} />}
                      </li>
                    ))}
                  </ol>
                </section>

                <section id="trap" className="flex scroll-mt-32 gap-3 rounded-card border border-danger/30 bg-danger-soft p-5">
                  <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-danger" aria-hidden />
                  <p><span className="font-bold text-heading">Common trap: </span><Inline text={L.trap} /></p>
                </section>

                {L.task && (
                  <section className="flex gap-3 rounded-card border border-line bg-card p-5">
                    <Wrench className="mt-1 h-6 w-6 shrink-0 text-amber-deep" aria-hidden />
                    <p><span className="font-bold text-heading">Try it in Xcode: </span>{L.task}</p>
                  </section>
                )}

                {L.cheat && (
                  <section id="cheat" className="scroll-mt-32 rounded-card border border-signal/40 bg-signal-soft/40 p-5 sm:p-6">
                    <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-heading"><NotebookPen className="h-6 w-6 text-amber-deep" aria-hidden /> {L.cheat.title}</h2>
                    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {L.cheat.tables.map((tb, i) => (
                        <div key={i} className="overflow-x-auto rounded-xl border border-line bg-card">
                          {tb.title && <p className="border-b border-line px-4 py-2 text-base font-bold text-heading">{tb.title}</p>}
                          <table className="w-full text-left text-base">
                            <thead className="bg-surface-hover text-sm text-muted"><tr>{tb.head.map((h, k) => <th key={k} className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
                            <tbody>{tb.rows.map((row, k) => <tr key={k} className="border-t border-line">{row.map((c, j) => <td key={j} className={`px-4 py-2 align-top ${j === 0 ? 'font-mono font-semibold text-heading' : 'text-body'}`}>{c}</td>)}</tr>)}</tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                    <ul className="mt-4 space-y-2">
                      {L.cheat.facts.map((x) => {
                        const cut = x.indexOf(': ');
                        return <li key={x} className="flex gap-2"><Check className="mt-1.5 h-5 w-5 shrink-0 text-success" aria-hidden /><span>{cut > 0 && cut < 40 ? <><span className="font-bold text-heading">{x.slice(0, cut)}: </span>{x.slice(cut + 2)}</> : x}</span></li>;
                      })}
                    </ul>
                    <h3 className="mt-5 font-display text-xl font-bold text-heading">Question patterns and how to solve them</h3>
                    <ul className="mt-2 space-y-2">
                      {L.cheat.patterns.map((x) => {
                        const cut = x.indexOf(': ');
                        return <li key={x} className="rounded-xl bg-card p-3">{cut > 0 ? <><span className="font-bold text-heading">{x.slice(0, cut)}: </span>{x.slice(cut + 2)}</> : x}</li>;
                      })}
                    </ul>
                  </section>
                )}

                {practice.length > 0 && (
                  <section id="practice" className="scroll-mt-32">
                    <h2 className="font-display text-2xl font-bold text-heading">Try it: {practice.length} questions</h2>
                    <p className="mt-1 text-base text-muted">Answer all {practice.length} to finish this lesson. Stuck? Open the hint. {answered > 0 && `${correct} of ${answered} right so far.`}</p>
                    <ol className="mt-4 space-y-5">
                      {practice.map((q, i) => (
                        <PracticeQuestion key={`${id}-${i}`} q={q} n={i + 1} seed={`${id}:${i}`} onAnswered={(right) => setAnswers((a) => ({ ...a, [i]: right }))} />
                      ))}
                    </ol>
                  </section>
                )}
              </article>
            ) : (
              <p className="mt-6 whitespace-pre-line text-lg text-body">{v.markdown}</p>
            )}

            {v.error !== 'pack_required' && (
              <div className="mt-10 rounded-card border border-line bg-card p-5 shadow-edge-neutral">
                {done
                  ? <p className="flex items-center gap-2 font-display text-xl font-bold text-success"><Check className="h-6 w-6" aria-hidden /> Lesson done</p>
                  : <button type="button" onClick={finish} className="btn btn-ghost min-h-[48px] px-5">Mark as done</button>}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  {v.prev && <Link href={`/prep/${slug}/learn/${v.prev.id}`} className="btn btn-ghost min-h-[48px] px-5"><ArrowLeft className="h-5 w-5" aria-hidden /> Previous</Link>}
                  {sectionTest?.test_slug && (prep?.owned
                    ? <Link href={`/practice/test/${sectionTest.test_slug}`} className="btn btn-ghost min-h-[48px] px-5">Take the {sectionTest.name} test</Link>
                    : null)}
                  {v.next
                    ? <button type="button" onClick={() => push(`/prep/${slug}/learn/${v.next!.id}`)} className="btn btn-primary min-h-[48px] px-5 sm:ml-auto">Next lesson <ArrowRight className="h-5 w-5" aria-hidden /></button>
                    : <Link href={exit} className="btn btn-primary min-h-[48px] px-5 sm:ml-auto">Back to my plan</Link>}
                </div>
              </div>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-pin,0px)+7.5rem)] space-y-4">
              {L && v.error !== 'pack_required' && (
                <nav aria-label="In this lesson" className="rounded-card border border-line bg-card p-5 shadow-edge-neutral">
                  <p className="text-sm font-bold uppercase tracking-wide text-muted">In this lesson</p>
                  <ul className="mt-3 space-y-1 text-base">
                    {[['rules', 'Rules and formulas'], ['examples', `Worked examples (${L.examples.length})`], ['trap', 'Common trap'], ...(L.cheat ? [['cheat', 'Module cheat sheet']] : []), ...(practice.length ? [['practice', `Practice (${practice.length})`]] : [])].map(([k, label]) => (
                      <li key={k}><a href={`#${k}`} className="block rounded-lg px-2 py-1.5 font-semibold text-heading hover:bg-surface-hover">{label}</a></li>
                    ))}
                  </ul>
                </nav>
              )}
              {practice.length > 0 && (
                <div className="rounded-card border border-line bg-card p-5 shadow-edge-neutral">
                  <p className="text-sm font-bold uppercase tracking-wide text-muted">Practice</p>
                  <p className="mt-1 font-display text-3xl font-bold text-heading">{answered}/{practice.length}</p>
                  <p className="text-base text-muted">answered · {correct} right</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-hover" aria-hidden><div className="h-full rounded-full bg-success" style={{ width: `${(answered / practice.length) * 100}%` }} /></div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {v.next
                  ? <button type="button" onClick={() => push(`/prep/${slug}/learn/${v.next!.id}`)} className="btn btn-primary min-h-[48px] px-5">Next lesson <ArrowRight className="h-5 w-5" aria-hidden /></button>
                  : <Link href={exit} className="btn btn-primary min-h-[48px] px-5">Back to my plan</Link>}
                {v.prev && <Link href={`/prep/${slug}/learn/${v.prev.id}`} className="btn btn-ghost min-h-[48px] px-5"><ArrowLeft className="h-5 w-5" aria-hidden /> Previous</Link>}
              </div>
            </div>
          </aside>
          </div>
        )}
      </main>
    </>
  );
}

/** `code` spans in lesson text (rules, traps) shown in monospace. */
const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>{text.split(/(`[^`]+`)/).map((part, i) => (part.startsWith('`') && part.endsWith('`') && part.length > 2
    ? <code key={i} className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[0.92em] text-heading">{part.slice(1, -1)}</code>
    : <React.Fragment key={i}>{part}</React.Fragment>))}</>
);

const LockedLesson: React.FC<{ slug: string; name: string }> = ({ slug, name }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-6 rounded-card border border-signal/40 bg-signal-soft p-6 text-center">
      <p className="text-lg text-heading">This lesson is in the prep pack. The first lesson of every section is free.</p>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary mt-4 min-h-[48px] px-6">See what&apos;s in the pack</button>
      <BuyPackSheet open={open} onClose={() => setOpen(false)} slug={slug} name={name} what="This lesson" />
    </div>
  );
};
