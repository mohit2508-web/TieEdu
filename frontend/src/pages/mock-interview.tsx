import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ClipboardCheck, MessageSquareText, Mic, MicOff, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Chip, Skeleton } from '@/components/ui';
import { fetchCompanies } from '@/lib/api';
import {
  answerQuestion, deleteInterview, fetchInterviews, startInterview,
  type InterviewFeedback, type InterviewList, type InterviewSessionView,
} from '@/lib/mockInterviewApi';

/*
 * Mock interview (B3). Five HR or technical questions, answered in writing or
 * by dictation, with feedback on each. Claude grades when an admin has turned
 * it on; otherwise each answer is checked against the points a strong answer
 * covers (backend lib/mockInterview). Either way the student gets feedback.
 */

const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const words = (t: string) => (t.trim().match(/\S+/g) || []).length;
const KIND_LABEL = { hr: 'HR interview', technical: 'Technical interview' } as const;

export default function MockInterviewPage() {
  const { user, loading } = useAuth();
  const [list, setList] = useState<InterviewList | null>(null);
  const [companies, setCompanies] = useState<Array<{ name: string; slug: string }>>([]);
  const [kind, setKind] = useState<'hr' | 'technical'>('hr');
  const [slug, setSlug] = useState('');
  const [active, setActive] = useState<InterviewSessionView | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchInterviews().then(setList).catch(() => setErr('Your interviews could not be loaded. Check your connection and try again.'));
    fetchCompanies()
      .then((cs) => setCompanies((cs || []).map((c: any) => ({ name: c.name, slug: c.slug })).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => { /* the select shows its placeholder */ });
  }, [user]);

  const upsert = (s: InterviewSessionView) =>
    setList((l) => (l ? { ...l, sessions: [s, ...l.sessions.filter((x) => x.id !== s.id)] } : l));

  const start = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { session } = await startInterview({ kind, company_slug: slug || undefined });
      setActive(session);
      setReviewing(null);
      setText('');
      upsert(session);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const current = active?.questions.find((q) => !q.answer) || null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !current) return;
    setBusy(true);
    setErr(null);
    try {
      const { session, ai_used_today } = await answerQuestion(active.id, { question_id: current.id, text });
      setActive(session);
      setReviewing(current.id);
      setText('');
      upsert(session);
      setList((l) => (l ? { ...l, ai_used_today } : l));
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await deleteInterview(id).catch(() => { /* stays listed; the next load corrects it */ });
    setList((l) => (l ? { ...l, sessions: l.sessions.filter((s) => s.id !== id) } : l));
    if (active?.id === id) setActive(null);
  };

  const ai = list?.ai;
  const aiLeft = ai ? Math.max(0, ai.daily_limit - (list?.ai_used_today || 0)) : 0;
  const reviewed = active?.questions.find((q) => q.id === reviewing) || null;
  const step = active ? active.questions.filter((q) => q.answer).length + (reviewed ? 0 : 1) : 0;

  return (
    <>
      <Head>
        <title>Mock interview · TieEdu</title>
        <meta name="description" content="Practise HR and technical interview questions and get feedback on every answer." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">Mock interview</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Say it here before you say it there</h1>
        <p className="mt-2 text-base text-body">
          Five questions, answered the way you would out loud. Each answer gets feedback: what landed, what was missing, and how to say it better.
        </p>

        {!loading && !user && (
          <Card pad="lg" className="mt-6 text-center">
            <p className="font-display text-xl font-bold text-heading">Sign in to start an interview</p>
            <p className="mt-1 text-sm text-muted">Your answers and feedback are private to you.</p>
            <Button href="/login?next=%2Fmock-interview" className="mt-4">Sign in</Button>
          </Card>
        )}

        {user && !active && (
          <Card pad="lg" className="mt-6">
            <fieldset>
              <legend className="text-sm font-semibold text-heading">Which interview?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['hr', 'technical'] as const).map((k) => (
                  <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Chip>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-heading">For a company <span className="font-normal text-muted">(optional)</span></span>
              <select value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading">
                <option value="">Any company</option>
                {companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
              {kind === 'technical' && slug && <span className="mt-1 block text-sm text-muted">Questions lean towards the topics in this company’s interview rounds.</span>}
            </label>
            <p className="mt-4 flex items-start gap-2 text-sm text-muted">
              <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
              {!list ? 'Checking feedback options…'
                : ai?.enabled
                  ? aiLeft > 0
                    ? `AI feedback is on: ${aiLeft} AI-graded answer${aiLeft === 1 ? '' : 's'} left today. Your answer text is sent to our AI provider to be graded; your name is not.`
                    : 'You have used today’s AI feedback. Answers today are checked against the key points instead; AI feedback is back tomorrow.'
                  : 'Each answer is checked against the points a strong answer covers, with tips on what to add.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start the interview'}</Button>
              {err && <span className="text-sm text-danger">{err}</span>}
            </div>
          </Card>
        )}

        {user && active && (
          <section className="mt-6" aria-live="polite">
            <p className="text-sm font-semibold text-muted">
              {KIND_LABEL[active.kind]}{active.company ? ` · ${active.company.name}` : ''}
              {!active.done || reviewed ? ` · Question ${Math.min(step, active.questions.length)} of ${active.questions.length}` : ''}
            </p>

            {reviewed?.answer ? (
              <>
                <Card pad="lg" className="mt-2">
                  <p className="text-sm font-semibold text-muted">{reviewed.topic}</p>
                  <h2 className="mt-1 font-display text-xl font-bold text-heading">{reviewed.question}</h2>
                  <FeedbackBlock f={reviewed.answer.feedback} />
                </Card>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => setReviewing(null)} icon={ArrowRight} iconEnd>{current ? 'Next question' : 'See how you did'}</Button>
                </div>
              </>
            ) : current ? (
              <Card pad="lg" className="mt-2">
                <form onSubmit={submit}>
                  <p className="text-sm font-semibold text-muted">{current.topic}</p>
                  <h2 className="mt-1 font-display text-xl font-bold text-heading">{current.question}</h2>
                  <label className="mt-4 block">
                    <span className="sr-only">Your answer</span>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={8}
                      maxLength={2500}
                      placeholder="Answer as you would say it in the room…"
                      className="w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                    />
                  </label>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                    <span>{words(text)} words · about a minute out loud is 100–180</span>
                    <Dictate onText={(t) => setText((cur) => (cur ? `${cur.trimEnd()} ${t}` : t))} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={busy || words(text) < 8}>{busy ? 'Checking your answer…' : 'Get feedback'}</Button>
                    <Button kind="text" onClick={() => setActive(null)}>Finish later</Button>
                    {err && <span className="text-sm text-danger">{err}</span>}
                  </div>
                </form>
              </Card>
            ) : (
              <Summary s={active} onNew={() => setActive(null)} />
            )}
          </section>
        )}

        {user && (
          <section className="mt-8" aria-labelledby="past-h">
            <h2 id="past-h" className="font-display text-lg font-bold text-heading">Your interviews</h2>
            {!list && !err && <Skeleton className="mt-3 h-20 w-full rounded-[14px]" />}
            {list && list.sessions.length === 0 && <p className="mt-2 text-sm text-muted">None yet. They stay private to you.</p>}
            <ul className="mt-3 space-y-3">
              {list?.sessions.filter((s) => s.id !== active?.id).map((s) => {
                const answered = s.questions.filter((q) => q.answer).length;
                return (
                  <li key={s.id}>
                    <Card>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-heading">{KIND_LABEL[s.kind]}{s.company ? ` · ${s.company.name}` : ''}</p>
                          <p className="text-sm text-muted">
                            {shortDate.format(new Date(s.created_at))} · {s.done ? `Average ${s.average} / 5` : `${answered} of ${s.questions.length} answered`}
                          </p>
                          <button type="button" onClick={() => { setActive(s); setReviewing(null); setText(''); }} className="mt-2 inline-flex min-h-[32px] items-center gap-1 text-sm font-semibold text-signal hover:underline">
                            {s.done ? 'See the feedback' : 'Carry on'} <ArrowRight className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                        <button type="button" onClick={() => remove(s.id)} aria-label={`Delete the ${KIND_LABEL[s.kind]} from ${shortDate.format(new Date(s.created_at))}`} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-danger">
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

function Score({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-signal-soft px-2.5 py-0.5 text-sm font-bold text-signal-ink">
      {n} / 5
    </span>
  );
}

function FeedbackBlock({ f }: { f: InterviewFeedback }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Score n={f.score} />
        <span className="text-sm text-muted">{f.source === 'ai' ? 'Feedback by AI' : 'Checked against the key points'}</span>
      </div>
      {f.note && <p className="rounded-xl bg-surface-hover px-3.5 py-2.5 text-sm text-body">{f.note}</p>}
      {f.strengths.length > 0 && (
        <div>
          <p className="text-sm font-bold text-heading">What worked</p>
          <ul className="mt-1 space-y-1">
            {f.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-body"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{s}</li>
            ))}
          </ul>
        </div>
      )}
      {f.improve.length > 0 && (
        <div>
          <p className="text-sm font-bold text-heading">To make it stronger</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-body">
            {f.improve.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      )}
      {f.better_answer && (
        <div>
          <p className="text-sm font-bold text-heading">A stronger way to say it</p>
          <p className="mt-1 whitespace-pre-line rounded-xl border border-line bg-surface-hover px-3.5 py-3 text-sm text-body">{f.better_answer}</p>
        </div>
      )}
    </div>
  );
}

function Summary({ s, onNew }: { s: InterviewSessionView; onNew: () => void }) {
  return (
    <>
      <Card variant="ink" pad="lg" className="mt-2">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-white"><MessageSquareText className="h-6 w-6 text-money" aria-hidden /> Interview done: {s.average} / 5 on average</p>
        <p className="mt-1 text-white/80">
          {s.weakest ? `Work on this one first: “${s.weakest.question}”` : 'Read the feedback on each answer below.'}
        </p>
      </Card>
      <ol className="mt-4 space-y-3">
        {s.questions.map((q, i) => (
          <li key={q.id}>
            <details className="group rounded-[14px] border border-line bg-card p-4">
              <summary className="focus-ring flex cursor-pointer list-none items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-soft font-bold text-signal-ink">{i + 1}</span>
                <span className="min-w-0 flex-1 font-bold text-heading">{q.question}</span>
                {q.answer && <Score n={q.answer.feedback.score} />}
              </summary>
              {q.answer && (
                <div className="mt-3 pl-11">
                  <p className="text-sm font-bold text-heading">Your answer</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-body">{q.answer.text}</p>
                  <FeedbackBlock f={q.answer.feedback} />
                </div>
              )}
            </details>
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <p className="font-display text-lg font-bold text-heading">What next</p>
        <ul className="mt-2 space-y-2">
          {s.next.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="inline-flex min-h-[36px] items-center gap-1 text-sm font-semibold text-signal hover:underline">
                {n.title} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <Button kind="secondary" onClick={onNew} className="mt-4">Start another interview</Button>
      </div>
    </>
  );
}

/** Dictation through the browser's own speech recognition, where it exists (Chrome, Edge, Android). */
function Dictate({ onText }: { onText: (t: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const rec = useRef<any>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (on) {
      rec.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'en-IN';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) onText(e.results[i][0].transcript.trim());
    };
    r.onend = () => setOn(false);
    r.onerror = () => setOn(false);
    rec.current = r;
    r.start();
    setOn(true);
  };

  return (
    <button type="button" onClick={toggle} aria-pressed={on} className="focus-ring inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line px-3 font-semibold text-heading hover:bg-surface-hover">
      {on ? <MicOff className="h-4 w-4 text-danger" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
      {on ? 'Stop speaking' : 'Speak your answer'}
    </button>
  );
}
