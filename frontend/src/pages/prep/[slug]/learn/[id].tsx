import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Check, Lightbulb, AlertTriangle, X, ExternalLink, Wrench } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PrepNav } from '@/components/prep/PrepNav';
import { BuyPackSheet } from '@/components/prep/BuyPackSheet';
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
  const [answers, setAnswers] = useState<Record<number, number>>({});
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
  const correct = practice.filter((q, i) => answers[i] === q.correct).length;

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
      <Head><title>{v?.title || 'Lesson'} | TieEdu</title></Head>
      <PrepNav slug={slug} name={prep?.company.name || 'My prep'} active="train" />
      <div className="sticky top-[calc(var(--header-total)+3.25rem)] z-10 border-b border-line bg-app-warm/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 sm:px-6">
          <Link href={exit} className="btn btn-ghost min-h-[44px] px-3 text-base"><X className="h-5 w-5" aria-hidden /> Exit to my plan</Link>
          {v && <span className="ml-auto text-base font-semibold text-muted">Lesson {v.index} of {v.total}</span>}
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {error && <p className="text-base text-danger">{error}</p>}
        {!v && !error && <p className="text-base text-muted" aria-busy="true">Opening the lesson…</p>}

        {v && (
          <>
            <p className="eyebrow">{L?.module ? `Module ${L.module} · ${L.section}` : L?.section || v.title.split(':')[0]}</p>
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-heading sm:text-4xl">{L?.title || v.title.split(':').slice(1).join(':').trim()}</h1>

            {v.error === 'pack_required' ? (
              <LockedLesson slug={slug} name={prep?.company.name || 'company'} />
            ) : L ? (
              <article className="mt-6 space-y-8 text-lg leading-relaxed text-body">
                {L.what && <p>{L.what}</p>}
                {L.doc && (
                  <a href={L.doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-card px-4 text-base font-semibold text-link">
                    <ExternalLink className="h-4 w-4" aria-hidden /> Official docs: {L.doc.label}
                  </a>
                )}

                <section>
                  <h2 className="font-display text-2xl font-bold text-heading">Rules and formulas</h2>
                  <ul className="mt-3 space-y-2 rounded-card border border-line bg-card p-5">
                    {L.rules.map((r) => <li key={r} className="flex gap-2"><Check className="mt-1.5 h-5 w-5 shrink-0 text-success" aria-hidden /><span><Inline text={r} /></span></li>)}
                  </ul>
                </section>

                <section>
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

                <section className="flex gap-3 rounded-card border border-danger/30 bg-danger-soft p-5">
                  <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-danger" aria-hidden />
                  <p><span className="font-bold text-heading">Common trap: </span><Inline text={L.trap} /></p>
                </section>

                {L.task && (
                  <section className="flex gap-3 rounded-card border border-line bg-card p-5">
                    <Wrench className="mt-1 h-6 w-6 shrink-0 text-amber-deep" aria-hidden />
                    <p><span className="font-bold text-heading">Try it in Xcode: </span>{L.task}</p>
                  </section>
                )}

                {practice.length > 0 && (
                  <section>
                    <h2 className="font-display text-2xl font-bold text-heading">Try it: {practice.length} questions</h2>
                    <p className="mt-1 text-base text-muted">Answer all {practice.length} to finish this lesson. {answered > 0 && `${correct} of ${answered} right so far.`}</p>
                    <ol className="mt-4 space-y-5">
                      {practice.map((q, i) => {
                        const picked = answers[i];
                        const shown = picked !== undefined;
                        return (
                          <li key={i} className="rounded-card border border-line bg-card p-5">
                            <p className="font-semibold text-heading">Q{i + 1}.</p>
                            <pre className={`mt-1 whitespace-pre-wrap break-words text-heading ${q.code ? 'overflow-x-auto rounded-xl bg-surface-hover p-4 font-mono text-[0.95rem] leading-relaxed' : 'font-sans text-lg'}`}>{q.question}</pre>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {q.options.map((o, k) => {
                                const tone = !shown ? 'border-line hover:border-signal' : k === q.correct ? 'border-success bg-success-soft' : k === picked ? 'border-danger bg-danger-soft' : 'border-line opacity-70';
                                return (
                                  <button key={k} type="button" disabled={shown} onClick={() => setAnswers((a) => ({ ...a, [i]: k }))} className={`min-h-[48px] rounded-xl border-2 px-4 py-2 text-left text-base text-heading ${tone}`}>
                                    <span className="mr-2 font-bold">{String.fromCharCode(65 + k)}.</span>{o}
                                  </button>
                                );
                              })}
                            </div>
                            {shown && (
                              <div className="mt-3 flex gap-2 rounded-xl bg-surface-hover p-4 text-base">
                                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-deep" aria-hidden />
                                <p><span className="font-bold text-heading">{picked === q.correct ? 'Correct. ' : `Answer: ${String.fromCharCode(65 + q.correct)}. `}</span><span className="whitespace-pre-line">{q.explanation}</span></p>
                              </div>
                            )}
                          </li>
                        );
                      })}
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
                    ? <Link href={`/skill-test/${sectionTest.test_slug}/assessment`} className="btn btn-ghost min-h-[48px] px-5">Take the {sectionTest.name} test</Link>
                    : null)}
                  {v.next
                    ? <button type="button" onClick={() => push(`/prep/${slug}/learn/${v.next!.id}`)} className="btn btn-primary min-h-[48px] px-5 sm:ml-auto">Next lesson <ArrowRight className="h-5 w-5" aria-hidden /></button>
                    : <Link href={exit} className="btn btn-primary min-h-[48px] px-5 sm:ml-auto">Back to my plan</Link>}
                </div>
              </div>
            )}
          </>
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
