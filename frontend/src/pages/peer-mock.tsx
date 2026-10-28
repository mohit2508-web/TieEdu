import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, Award, Copy, MessageCircle, Repeat, Trash2, UserRound, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Chip, Skeleton } from '@/components/ui';
import {
  cancelPeerSession, deletePeerNote, fetchPeerHome, fetchPeerSession, joinPeerSession, startPeerSession, submitPeerRatings,
  type Dimension, type PeerRubric, type PeerSessionView, type Rating,
} from '@/lib/peerMockApi';

/*
 * Peer mock interviews (C4). One student interviews another with TieEdu's
 * questions and rubric, in person or on a call; both earn XP. Pairing is by a
 * short code only (backend lib/peerMock).
 */

const KIND_LABEL = { hr: 'HR interview', technical: 'Technical interview' } as const;
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const POLL_MS = 5000;

export default function PeerMockPage() {
  const { user, loading } = useAuth();
  const [rubric, setRubric] = useState<PeerRubric | null>(null);
  const [sessions, setSessions] = useState<PeerSessionView[] | null>(null);
  const [active, setActive] = useState<PeerSessionView | null>(null);
  const [kind, setKind] = useState<'hr' | 'technical'>('hr');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchPeerHome()
      .then((r) => {
        setRubric(r.rubric);
        setSessions(r.sessions);
        // Pick up an interview that is still going (e.g. after a refresh).
        const going = r.sessions.find((s) => s.status === 'open' || s.status === 'live');
        if (going) setActive(going);
      })
      .catch(() => setErr('Peer interviews could not be loaded. Check your connection and try again.'));
  }, [user]);

  // Poll only while waiting on the other person.
  const waiting = active && ((active.status === 'open' && active.role === 'interviewer') || (active.status === 'live' && active.role === 'candidate'));
  useEffect(() => {
    if (!waiting || !active) return;
    const t = setInterval(() => {
      fetchPeerSession(active.id).then((r) => update(r.session)).catch(() => { /* try again next tick */ });
    }, POLL_MS);
    return () => clearInterval(t);
  }, [waiting, active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (s: PeerSessionView) => {
    setActive(s);
    setSessions((list) => (list ? [s, ...list.filter((x) => x.id !== s.id)] : list));
  };

  const act = async (fn: () => Promise<{ session: PeerSessionView }>) => {
    setBusy(true);
    setErr(null);
    try {
      update((await fn()).session);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Peer mock interview · TieEdu</title>
        <meta name="description" content="Interview a friend with TieEdu's questions and rubric, then swap. Both of you earn points." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">Peer mock interview</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Interview a friend, then swap</h1>
        <p className="mt-2 text-base text-body">
          One of you asks, one of you answers, in person or on a call. TieEdu gives the interviewer the questions and what a good answer covers. Both of you earn points.
        </p>

        {!loading && !user && (
          <Card pad="lg" className="mt-6 text-center">
            <p className="font-display text-xl font-bold text-heading">Sign in to start</p>
            <p className="mt-1 text-sm text-muted">You pair up with a code you share yourself. Nobody else can find you.</p>
            <Button href="/login?next=%2Fpeer-mock" className="mt-4">Sign in</Button>
          </Card>
        )}

        {user && !rubric && !err && <Skeleton className="mt-6 h-48 w-full rounded-[14px]" />}
        {err && <p className="mt-4 text-sm text-danger" role="alert">{err}</p>}

        {user && rubric && !active && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card pad="lg">
                <p className="flex items-center gap-2 font-display text-lg font-bold text-heading"><UserRound className="h-5 w-5 text-signal" aria-hidden /> I will interview</p>
                <p className="mt-1 text-sm text-muted">You get a code to give your friend, then three questions and a rubric. +{rubric.xp.INTERVIEWER} points.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['hr', 'technical'] as const).map((k) => <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Chip>)}
                </div>
                <Button className="mt-4" onClick={() => act(() => startPeerSession(kind))} disabled={busy}>Get a code</Button>
              </Card>
              <Card pad="lg">
                <p className="flex items-center gap-2 font-display text-lg font-bold text-heading"><Users className="h-5 w-5 text-signal" aria-hidden /> I will be interviewed</p>
                <p className="mt-1 text-sm text-muted">Enter the code your friend gives you. +{rubric.xp.CANDIDATE} points.</p>
                <form onSubmit={(e) => { e.preventDefault(); act(() => joinPeerSession(code)); }}>
                  <label className="mt-3 block">
                    <span className="sr-only">Code</span>
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={9} autoComplete="off" autoCapitalize="characters" placeholder="ABC234" className="min-h-[44px] w-full rounded-xl border border-line bg-card px-3 font-display text-lg font-bold tracking-[0.2em] text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20" />
                  </label>
                  <Button type="submit" kind="secondary" className="mt-3" disabled={busy || code.replace(/\W/g, '').length < 6}>Join</Button>
                </form>
              </Card>
            </div>
            <p className="mt-4 text-sm text-muted">
              No partner yet? Find one in your <Link href="/study-groups" className="font-semibold text-signal hover:underline">study groups</Link>.
              Points count for two peer interviews a day, once a day with the same friend.
            </p>
            <History sessions={sessions || []} onOpen={setActive} />
          </>
        )}

        {user && rubric && active && (
          <section className="mt-6" aria-live="polite">
            <p className="text-sm font-semibold text-muted">
              {KIND_LABEL[active.kind]} · you are the {active.role}{active.partner ? ` · with ${active.partner}` : ''}
            </p>
            {active.status === 'open' && active.role === 'interviewer' && <Waiting s={active} busy={busy} onCancel={() => act(() => cancelPeerSession(active.id))} />}
            {active.status === 'live' && active.role === 'interviewer' && <Interviewer s={active} rubric={rubric} busy={busy} onSubmit={(r, n) => act(() => submitPeerRatings(active.id, r, n))} onCancel={() => act(() => cancelPeerSession(active.id))} />}
            {active.status === 'live' && active.role === 'candidate' && <CandidateWaiting s={active} />}
            {active.status === 'done' && <Result s={active} rubric={rubric} busy={busy} onDeleteNote={() => act(() => deletePeerNote(active.id))} onSwap={() => act(() => startPeerSession(active.kind))} />}
            {active.status === 'cancelled' && <Card pad="lg" className="mt-2"><p className="text-body">This interview was cancelled.</p></Card>}
            {active.status !== 'live' && <Button kind="text" className="mt-4" onClick={() => setActive(null)}>Back to peer interviews</Button>}
          </section>
        )}
      </main>
    </>
  );
}

function Waiting({ s, busy, onCancel }: { s: PeerSessionView; busy: boolean; onCancel: () => void }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const text = `Let's do a mock interview on TieEdu. Open ${origin}/peer-mock and enter my code: ${s.code}`;
  return (
    <Card variant="raised" pad="lg" className="mt-2 text-center">
      <p className="text-sm font-semibold text-muted">Give your friend this code</p>
      <p className="mt-2 select-all font-display text-5xl font-bold tracking-[0.25em] text-heading">{s.code}</p>
      <p className="mt-3 text-sm text-muted">Waiting for them to join… It works for two hours.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button href={`https://wa.me/?text=${encodeURIComponent(text)}`} kind="secondary" icon={MessageCircle}>Share on WhatsApp</Button>
        <Button kind="secondary" icon={Copy} onClick={() => { navigator.clipboard?.writeText(s.code || '').then(() => setCopied(true)).catch(() => {}); }}>{copied ? 'Copied' : 'Copy code'}</Button>
        <Button kind="text" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </Card>
  );
}

function CandidateWaiting({ s }: { s: PeerSessionView }) {
  return (
    <Card pad="lg" className="mt-2">
      <p className="font-display text-xl font-bold text-heading">{s.partner || 'Your friend'} is interviewing you</p>
      <p className="mt-2 text-body">They have three questions. Answer out loud as you would in the real room. Your feedback and the questions with their key points will appear here when they finish.</p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-body">
        <li>Take a breath before each answer. A short pause is fine.</li>
        <li>Give one real example for each answer.</li>
        <li>Keep each answer to about a minute.</li>
      </ul>
    </Card>
  );
}

function useSecondsUntil(iso: string | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);
  return left;
}

function Interviewer({ s, rubric, busy, onSubmit, onCancel }: {
  s: PeerSessionView;
  rubric: PeerRubric;
  busy: boolean;
  onSubmit: (r: Record<string, Partial<Rating>>, note: string) => void;
  onCancel: () => void;
}) {
  const [ratings, setRatings] = useState<Record<string, Partial<Rating>>>({});
  const [note, setNote] = useState('');
  const left = useSecondsUntil(s.submit_after);
  const complete = s.questions.every((q) => rubric.dimensions.every((d) => ratings[q.id]?.[d.id]));
  const set = (qid: string, d: Dimension, v: 1 | 2 | 3) => setRatings((r) => ({ ...r, [qid]: { ...r[qid], [d]: v } }));

  return (
    <>
      <Card pad="lg" className="mt-2">
        <p className="text-body">{s.partner} has joined. Ask each question in turn, listen to the full answer, then rate it. Only you can see the key points.</p>
      </Card>
      <ol className="mt-4 space-y-4">
        {s.questions.map((q, i) => (
          <li key={q.id}>
            <Card pad="lg">
              <p className="text-sm font-semibold text-muted">Question {i + 1} · {q.topic}</p>
              <p className="mt-1 font-display text-xl font-bold text-heading">“{q.question}”</p>
              <p className="mt-3 text-sm font-bold text-heading">Listen for</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-body">{q.key_points?.map((k) => <li key={k}>{k}</li>)}</ul>
              <div className="mt-4 space-y-3">
                {rubric.dimensions.map((d) => (
                  <div key={d.id} role="group" aria-label={`${d.label}, question ${i + 1}`}>
                    <p className="text-sm font-semibold text-heading">{d.label}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {rubric.levels.map((l) => (
                        <Chip key={l.value} selected={ratings[q.id]?.[d.id] === l.value} onClick={() => set(q.id, d.id, l.value)}>{l.label}</Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <Card pad="lg" className="mt-4">
        <label className="block">
          <span className="text-sm font-semibold text-heading">One kind, useful note <span className="font-normal text-muted">(optional, only they see it)</span></span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={400} placeholder="What went well, and the one thing to change next time…" className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20" />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => onSubmit(ratings, note)} disabled={busy || !complete || left > 0}>
            {left > 0 ? `Submit in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : busy ? 'Submitting…' : 'Submit feedback'}
          </Button>
          <Button kind="text" onClick={onCancel} disabled={busy}>Cancel the interview</Button>
        </div>
        {!complete && <p className="mt-2 text-sm text-muted">Rate every question on all three points to submit.</p>}
      </Card>
    </>
  );
}

function Result({ s, rubric, busy, onDeleteNote, onSwap }: { s: PeerSessionView; rubric: PeerRubric; busy: boolean; onDeleteNote: () => void; onSwap: () => void }) {
  const label = (v: number) => rubric.levels.find((l) => l.value === v)?.label || '';
  return (
    <>
      <Card variant="ink" pad="lg" className="mt-2">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-white"><Award className="h-6 w-6 text-money" aria-hidden /> {s.xp > 0 ? `+${s.xp} points` : 'Interview done'}</p>
        <p className="mt-1 text-white/80">{s.xp_note || (s.role === 'interviewer' ? 'Thanks for interviewing. Asking questions teaches you what interviewers listen for.' : 'Well done for practising out loud.')}</p>
        {s.averages && (
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {rubric.dimensions.map((d) => (
              <li key={d.id} className="rounded-xl bg-white/[0.08] px-3 py-2 text-sm text-white">
                <span className="block text-white/70">{d.label}</span>
                <span className="font-bold">{label(Math.round(s.averages![d.id]))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {s.note && (
        <Card pad="lg" className="mt-4">
          <p className="text-sm font-bold text-heading">{s.role === 'candidate' ? `A note from ${s.partner}` : 'Your note'}</p>
          <p className="mt-1 whitespace-pre-line text-body">{s.note}</p>
          {s.role === 'candidate' && (
            <Button kind="text" icon={Trash2} className="mt-2" onClick={onDeleteNote} disabled={busy}>Remove this note</Button>
          )}
        </Card>
      )}
      <ol className="mt-4 space-y-3">
        {s.questions.map((q, i) => (
          <li key={q.id}>
            <details className="rounded-[14px] border border-line bg-card p-4">
              <summary className="focus-ring cursor-pointer list-none font-bold text-heading">{i + 1}. {q.question}</summary>
              {q.rating && <p className="mt-2 text-sm text-body">{rubric.dimensions.map((d) => `${d.label}: ${label(q.rating![d.id])}`).join(' · ')}</p>}
              <p className="mt-2 text-sm font-bold text-heading">A strong answer covers</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-body">{q.key_points?.map((k) => <li key={k}>{k}</li>)}</ul>
              {q.tip && <p className="mt-2 text-sm text-muted">{q.tip}</p>}
            </details>
          </li>
        ))}
      </ol>
      {s.role === 'candidate' && (
        <Button className="mt-5" icon={Repeat} onClick={onSwap} disabled={busy}>Swap: you interview {s.partner || 'them'}</Button>
      )}
    </>
  );
}

function History({ sessions, onOpen }: { sessions: PeerSessionView[]; onOpen: (s: PeerSessionView) => void }) {
  const done = sessions.filter((s) => s.status === 'done');
  if (!done.length) return null;
  return (
    <section className="mt-10" aria-labelledby="hist-h">
      <h2 id="hist-h" className="font-display text-lg font-bold text-heading">Your peer interviews</h2>
      <ul className="mt-3 space-y-2">
        {done.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onOpen(s)} className="focus-ring group flex w-full items-center gap-3 rounded-[14px] border border-line bg-card p-4 text-left hover:border-line-strong">
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-heading group-hover:text-signal">{s.role === 'interviewer' ? `You interviewed ${s.partner}` : `${s.partner} interviewed you`}</span>
                <span className="block text-sm text-muted">{shortDate.format(new Date(s.done_at || s.created_at))} · {KIND_LABEL[s.kind]}{s.xp > 0 ? ` · +${s.xp} points` : ''}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
