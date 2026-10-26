import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Check, Flame, MessageSquareQuote, Share2, Sparkle, X, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Chip, Skeleton } from '@/components/ui';
import {
  answerDailyChallenge,
  fetchDailyChallenge,
  type AnswerResult,
  type ChallengeView,
  type HrItem,
  type McqItem,
} from '@/lib/dailyChallengeApi';
import { cn } from '@/lib/cn';

const AuthRequiredModal = dynamic(() => import('@/components/modals/AuthRequiredModal').then((m) => m.AuthRequiredModal), { ssr: false });

/*
 * The daily 10-minute challenge. One aptitude question, one coding question and
 * one HR answer — the same three for every student today (backend
 * lib/dailyChallenge). Finishing all three counts as a study day for the streak.
 */

const KIND_LABEL = { aptitude: 'Aptitude', coding: 'Coding', hr: 'HR answer' } as const;
const RATINGS: Array<{ value: 1 | 2 | 3; label: string }> = [
  { value: 1, label: 'Struggled' },
  { value: 2, label: 'Okay' },
  { value: 3, label: 'Confident' },
];

const longDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export default function DailyChallengePage() {
  const { user } = useAuth();
  const [view, setView] = useState<ChallengeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<AnswerResult | null>(null);
  const [needSignIn, setNeedSignIn] = useState(false);

  // Reload when the student signs in, so their answers so far come back.
  useEffect(() => {
    let alive = true;
    fetchDailyChallenge()
      .then((v) => alive && setView(v))
      .catch(() => alive && setError('Today’s challenge could not be loaded. Check your connection and try again.'));
    return () => { alive = false; };
  }, [user]);

  const replaceItem = (result: AnswerResult) => {
    setView((v) => (v ? { ...v, items: v.items.map((i) => (i.kind === result.item.kind ? result.item : i)), completed: v.completed || result.finished, completed_today: v.completed_today + (result.finished ? 1 : 0) } : v));
    if (result.finished) setDone(result);
  };

  const answered = view?.items.filter((i) => i.answered).length ?? 0;
  const total = view?.items.length ?? 3;
  const correct = view?.items.filter((i): i is McqItem => i.kind !== 'hr').filter((i) => i.reveal?.correct).length ?? 0;
  const mcqs = view?.items.filter((i) => i.kind !== 'hr').length ?? 2;

  return (
    <>
      <Head>
        <title>Daily challenge · TieEdu</title>
        <meta name="description" content="Ten minutes a day: one aptitude question, one coding question and one HR answer, the same three for every student. Keep your streak going." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">{view ? longDate.format(new Date(`${view.day}T00:00:00Z`)) : 'Daily challenge'}</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Today’s 10-minute challenge</h1>
        <p className="mt-2 max-w-[560px] text-base text-body">
          One aptitude question, one coding question and one HR answer. Everyone gets the same three today, and finishing them keeps your streak going.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip tone="signal" icon={Zap}>
            {answered} of {total} done
          </Chip>
          {view && view.completed_today > 0 && (
            <Chip>
              {view.completed_today} student{view.completed_today === 1 ? '' : 's'} finished today
            </Chip>
          )}
        </div>

        {/* Three steps, filled as they are answered. */}
        <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Progress">
          {(view?.items ?? [{ kind: 'aptitude' }, { kind: 'coding' }, { kind: 'hr' }]).map((i: any) => (
            <li key={i.kind} className="min-w-0">
              <span className={cn('block h-1.5 rounded-full', i.answered ? 'bg-signal' : 'bg-line')} />
              <span className="mt-1.5 block truncate text-xs font-semibold text-muted">{KIND_LABEL[i.kind as keyof typeof KIND_LABEL]}</span>
            </li>
          ))}
        </ol>

        {error && <p className="mt-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

        {(view?.completed || done) && (
          <CompletionCard correct={correct} mcqs={mcqs} xp={done?.xp_awarded ?? null} streak={done?.streak?.current ?? null} />
        )}

        <div className="mt-6 space-y-4">
          {!view && !error && [0, 1, 2].map((n) => <Skeleton key={n} className="h-56 w-full rounded-[14px]" />)}
          {view?.items.map((item, n) =>
            item.kind === 'hr' ? (
              <HrCard key={item.kind} n={n + 1} item={item} signedIn={!!user} onNeedSignIn={() => setNeedSignIn(true)} onAnswered={replaceItem} />
            ) : (
              <McqCard key={item.kind} n={n + 1} item={item} signedIn={!!user} onNeedSignIn={() => setNeedSignIn(true)} onAnswered={replaceItem} />
            )
          )}
        </div>
      </main>
      <AuthRequiredModal isOpen={needSignIn} targetTitle="today’s challenge" onClose={() => setNeedSignIn(false)} onSuccess={() => setNeedSignIn(false)} />
    </>
  );
}

function CardHead({ n, label, meta }: { n: number; label: string; meta?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-heading">{n}</span>
      <span className="shrink-0">{label}</span>
      {meta && <span className="min-w-0 truncate font-semibold normal-case tracking-normal text-light">· {meta}</span>}
    </div>
  );
}

function McqCard({ n, item, signedIn, onNeedSignIn, onAnswered }: {
  n: number; item: McqItem; signedIn: boolean; onNeedSignIn: () => void; onAnswered: (r: AnswerResult) => void;
}) {
  const [picked, setPicked] = useState<number | null>(item.choice);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reveal = item.reveal;

  const submit = async () => {
    if (picked === null) return;
    if (!signedIn) return onNeedSignIn();
    setBusy(true);
    setErr(null);
    try {
      onAnswered(await answerDailyChallenge({ kind: item.kind, choice: picked }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card pad="lg">
      <CardHead n={n} label={item.kind === 'aptitude' ? 'Aptitude' : 'Coding'} meta={item.skill} />
      <h2 className="mt-3 text-lg font-bold leading-snug text-heading">{item.question}</h2>
      <div role="radiogroup" aria-label="Options" className="mt-4 space-y-2">
        {item.options.map((text, i) => {
          const isPicked = picked === i;
          const isRight = reveal && i === reveal.correct_index;
          const isWrongPick = reveal && isPicked && !reveal.correct;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={!!reveal || busy}
              onClick={() => setPicked(i)}
              className={cn(
                'focus-ring flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-base transition-colors',
                !reveal && (isPicked ? 'border-signal bg-signal-soft text-heading' : 'border-line bg-card text-body hover:border-line-strong'),
                isRight && 'border-success bg-success-soft text-heading',
                isWrongPick && 'border-danger bg-danger-soft text-heading',
                reveal && !isRight && !isWrongPick && 'border-line bg-card text-muted'
              )}
            >
              <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                isRight ? 'border-success bg-success text-white' : isWrongPick ? 'border-danger bg-danger text-white' : isPicked ? 'border-signal text-signal' : 'border-line text-muted')}>
                {isRight ? <Check className="h-3.5 w-3.5" aria-hidden /> : isWrongPick ? <X className="h-3.5 w-3.5" aria-hidden /> : String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 break-words">{text}</span>
            </button>
          );
        })}
      </div>
      {!reveal && (
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={submit} disabled={picked === null || busy}>{busy ? 'Checking…' : 'Check answer'}</Button>
          {err && <span className="text-sm text-danger">{err}</span>}
        </div>
      )}
      {reveal && (
        <div className={cn('mt-4 rounded-xl px-4 py-3', reveal.correct ? 'bg-success-soft' : 'bg-surface-hover')} role="status">
          <p className={cn('text-sm font-bold', reveal.correct ? 'text-success' : 'text-heading')}>
            {reveal.correct ? 'Correct.' : `Not this time — the answer is ${String.fromCharCode(65 + reveal.correct_index)}.`}
          </p>
          {reveal.explanation && <p className="mt-1 text-sm leading-relaxed text-body">{reveal.explanation}</p>}
        </div>
      )}
    </Card>
  );
}

function HrCard({ n, item, signedIn, onNeedSignIn, onAnswered }: {
  n: number; item: HrItem; signedIn: boolean; onNeedSignIn: () => void; onAnswered: (r: AnswerResult) => void;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reveal = item.reveal;

  const rate = async (rating: 1 | 2 | 3) => {
    if (!signedIn) return onNeedSignIn();
    setBusy(true);
    setErr(null);
    try {
      onAnswered(await answerDailyChallenge({ kind: 'hr', rating }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card pad="lg">
      <CardHead n={n} label="HR answer" meta={item.title} />
      <h2 className="mt-3 text-lg font-bold leading-snug text-heading">“{item.question}”</h2>
      {!reveal && (
        <>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-heading">Answer it out loud, or write it here</span>
            <span className="block text-xs text-muted">Only you see this. It is not saved.</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Situation, task, action, result…"
              className="mt-2 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            />
          </label>
          <p className="mt-3 text-sm font-semibold text-heading">How did your answer go?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <Button key={r.value} kind="secondary" onClick={() => rate(r.value)} disabled={busy}>{r.label}</Button>
            ))}
          </div>
          {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        </>
      )}
      {reveal && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-surface-hover px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden /> A strong answer
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-body">{reveal.sample_answer}</p>
          </div>
          {reveal.star_breakdown && (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(['situation', 'task', 'action', 'result'] as const).map((k) => (
                <div key={k} className="rounded-xl border border-line px-3.5 py-2.5">
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-signal">{k}</dt>
                  <dd className="mt-0.5 text-sm text-body">{reveal.star_breakdown![k]}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="text-sm text-body"><span className="font-bold text-heading">Tip: </span>{reveal.expert_tip}</p>
          <p className="text-sm text-body"><span className="font-bold text-danger">Avoid: </span>{reveal.red_flag_trap}</p>
        </div>
      )}
    </Card>
  );
}

function CompletionCard({ correct, mcqs, xp, streak }: { correct: number; mcqs: number; xp: number | null; streak: number | null }) {
  const [shared, setShared] = useState(false);
  const text = `I finished today’s TieEdu daily challenge: ${correct} of ${mcqs} right.`;
  const share = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/daily` : '/daily';
    try {
      if (navigator.share) await navigator.share({ title: 'TieEdu daily challenge', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setShared(true); }
    } catch { /* the share sheet was dismissed */ }
  };
  return (
    <Card variant="ink" pad="lg" className="mt-6" role="status">
      <p className="flex items-center gap-2 font-display text-2xl font-bold text-white">
        <Sparkle className="h-6 w-6 text-money" aria-hidden /> Done for today
      </p>
      <p className="mt-1 text-white/80">
        {correct} of {mcqs} right{xp ? ` · +${xp} XP` : ''}. A new set unlocks tomorrow at midnight.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {streak !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white">
            <Flame className="h-4 w-4 text-money" aria-hidden /> {streak} day{streak === 1 ? '' : 's'} in a row
          </span>
        )}
        <Button kind="secondary" icon={Share2} onClick={share}>{shared ? 'Copied' : 'Share'}</Button>
      </div>
    </Card>
  );
}
