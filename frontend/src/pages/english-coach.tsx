import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { ArrowRight, CheckCircle2, Languages, Mic, RotateCcw, Square, Trash2, TrendingDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Chip, Skeleton } from '@/components/ui';
import {
  deleteCoachAttempt, fetchCoachAttempts, fetchCoachPrompts, submitCoachAttempt,
  type CoachAttempt, type CoachList, type CoachPrompt, type Line,
} from '@/lib/englishCoachApi';

/*
 * English confidence coach (B5). Speak to a short prompt and get gentle
 * feedback on how it sounded: pace, filler words, common slips, hesitant
 * phrasing. No scores. Every tip is explained in English and, if the student
 * wants, in Hinglish (backend lib/englishCoach).
 */

const LEVELS = [
  { id: 'warmup', label: 'Warm-up' },
  { id: 'everyday', label: 'Everyday' },
  { id: 'interview', label: 'Interview' },
] as const;
const HINGLISH_KEY = 'tieedu.coach.hinglish';
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const words = (t: string) => (t.trim().match(/\S+/g) || []).length;

export default function EnglishCoachPage() {
  const { user, loading } = useAuth();
  const [prompts, setPrompts] = useState<CoachPrompt[] | null>(null);
  const [list, setList] = useState<CoachList | null>(null);
  const [level, setLevel] = useState<(typeof LEVELS)[number]['id']>('warmup');
  const [prompt, setPrompt] = useState<CoachPrompt | null>(null);
  const [result, setResult] = useState<CoachAttempt | null>(null);
  const [hinglish, setHinglish] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try { const v = localStorage.getItem(HINGLISH_KEY); if (v !== null) setHinglish(v === '1'); } catch { /* storage blocked: keep the default */ }
    fetchCoachPrompts().then((r) => setPrompts(r.prompts)).catch(() => setErr('The practice prompts could not be loaded. Check your connection and try again.'));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCoachAttempts().then(setList).catch(() => { /* the history shows its skeleton; practice still works */ });
  }, [user]);

  const toggleHinglish = () => {
    setHinglish((h) => {
      try { localStorage.setItem(HINGLISH_KEY, h ? '0' : '1'); } catch { /* fine without it */ }
      return !h;
    });
  };

  const onDone = (a: CoachAttempt, progress: CoachList['progress'], ai_used_today: number) => {
    setResult(a);
    setList((l) => (l ? { ...l, progress, ai_used_today, attempts: [a, ...l.attempts] } : l));
    requestAnimationFrame(() => document.getElementById('coach-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const remove = async (id: string) => {
    await deleteCoachAttempt(id).catch(() => { /* stays listed; the next load corrects it */ });
    setList((l) => (l ? { ...l, attempts: l.attempts.filter((a) => a.id !== id) } : l));
    if (result?.id === id) setResult(null);
  };

  const levelPrompts = (prompts || []).filter((p) => p.level === level);
  const nextPrompt = () => {
    if (!prompt) return;
    const i = levelPrompts.findIndex((p) => p.id === prompt.id);
    setPrompt(levelPrompts[(i + 1) % levelPrompts.length] || null);
    setResult(null);
  };
  const ai = list?.ai;
  const aiLeft = ai ? Math.max(0, ai.daily_limit - list!.ai_used_today) : 0;

  return (
    <>
      <Head>
        <title>English coach · TieEdu</title>
        <meta name="description" content="Practise speaking English for interviews and get gentle feedback, explained in English and Hinglish." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">English coach</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Speak English with confidence</h1>
        <p className="mt-2 text-base text-body">
          Pick a prompt, speak for half a minute, and get gentle tips on how it sounded. No marks and no judging: just you, a little better each time.
        </p>
        <button type="button" onClick={toggleHinglish} aria-pressed={hinglish} className="focus-ring mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-line bg-card px-3.5 text-sm font-semibold text-heading hover:bg-surface-hover">
          <Languages className="h-4 w-4 text-signal" aria-hidden />
          {hinglish ? 'Hinglish explanations: on' : 'Hinglish explanations: off'}
        </button>

        {!loading && !user && (
          <Card pad="lg" className="mt-6 text-center">
            <p className="font-display text-xl font-bold text-heading">Sign in to practise</p>
            <p className="mt-1 text-sm text-muted">Your recordings are never stored; only the words, privately, so you can see yourself improve.</p>
            <Button href="/login?next=%2Fenglish-coach" className="mt-4">Sign in</Button>
          </Card>
        )}

        {user && list && list.progress.attempts > 0 && <ProgressStrip p={list.progress} />}

        {user && !prompt && (
          <section className="mt-6" aria-labelledby="prompts-h">
            <h2 id="prompts-h" className="font-display text-lg font-bold text-heading">Choose something to talk about</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {LEVELS.map((l) => <Chip key={l.id} selected={level === l.id} onClick={() => setLevel(l.id)}>{l.label}</Chip>)}
            </div>
            {!prompts && !err && <Skeleton className="mt-3 h-40 w-full rounded-[14px]" />}
            {err && <p className="mt-3 text-sm text-danger">{err}</p>}
            <ul className="mt-3 space-y-2">
              {levelPrompts.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setPrompt(p); setResult(null); }} className="focus-ring group flex w-full items-center gap-3 rounded-[14px] border border-line bg-card p-4 text-left hover:border-line-strong">
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-heading group-hover:text-signal">{p.text}</span>
                      <span className="mt-0.5 block text-sm text-muted">About {p.seconds} seconds</span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {user && prompt && !result && (
          <Practice
            key={prompt.id}
            prompt={prompt}
            hinglish={hinglish}
            aiNote={!list ? null : ai?.enabled ? (aiLeft > 0 ? `AI coaching is on (${aiLeft} left today). Your words are sent to our AI provider to be checked; your name and voice are not.` : 'You have used today’s AI coaching; tips today come from our checklist.') : null}
            onBack={() => setPrompt(null)}
            onDone={onDone}
          />
        )}

        {user && prompt && result && (
          <section id="coach-result" className="mt-6 scroll-mt-24" aria-live="polite">
            <Feedback a={result} hinglish={hinglish} />
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => setResult(null)} icon={RotateCcw}>Try it again</Button>
              <Button kind="secondary" onClick={nextPrompt} icon={ArrowRight} iconEnd>Next prompt</Button>
              <Button kind="text" onClick={() => { setPrompt(null); setResult(null); }}>Choose another</Button>
            </div>
          </section>
        )}

        {user && (
          <section className="mt-10" aria-labelledby="past-h">
            <h2 id="past-h" className="font-display text-lg font-bold text-heading">Your practice</h2>
            {!list && <Skeleton className="mt-3 h-20 w-full rounded-[14px]" />}
            {list && list.attempts.length === 0 && <p className="mt-2 text-sm text-muted">Nothing yet. Your practice stays private to you.</p>}
            <ul className="mt-3 space-y-3">
              {list?.attempts.filter((a) => a.id !== result?.id).slice(0, 10).map((a) => (
                <li key={a.id}>
                  <Card>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-heading">{a.prompt?.text || 'Practice'}</p>
                        <p className="text-sm text-muted">
                          {shortDate.format(new Date(a.created_at))} · {a.feedback.words} words{a.feedback.wpm ? ` · ${a.feedback.wpm} words a minute` : ''} · {a.feedback.filler_total === 0 ? 'no filler words' : `${a.feedback.filler_total} filler word${a.feedback.filler_total === 1 ? '' : 's'}`}
                        </p>
                        <button type="button" onClick={() => { const p = prompts?.find((x) => x.id === a.prompt?.id) || null; setPrompt(p); setResult(a); }} className="mt-2 inline-flex min-h-[32px] items-center gap-1 text-sm font-semibold text-signal hover:underline">
                          See the tips <ArrowRight className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <button type="button" onClick={() => remove(a.id)} aria-label={`Delete the practice from ${shortDate.format(new Date(a.created_at))}`} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-danger">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

function Explain({ line, hinglish }: { line: Line; hinglish: boolean }) {
  return (
    <>
      <span className="block">{line.en}</span>
      {hinglish && line.hi && <span className="mt-0.5 block text-muted">{line.hi}</span>}
    </>
  );
}

function ProgressStrip({ p }: { p: CoachList['progress'] }) {
  const f = p.fillers_per_100_words;
  return (
    <p className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-card px-3.5 py-3 text-sm text-body">
      <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
      <span>
        {p.attempts} practice{p.attempts === 1 ? '' : 's'} on {p.days} day{p.days === 1 ? '' : 's'}.
        {f && f.now < f.before && ` Your filler words fell from ${f.before} to ${f.now} per 100 words.`}
        {f && f.now >= f.before && ' Keep going: change shows after a week or two of short daily practice.'}
      </span>
    </p>
  );
}

/** Speak (or type) one answer. Timing comes from the time the microphone was on. */
function Practice({ prompt, hinglish, aiNote, onBack, onDone }: {
  prompt: CoachPrompt;
  hinglish: boolean;
  aiNote: string | null;
  onBack: () => void;
  onDone: (a: CoachAttempt, p: CoachList['progress'], used: number) => void;
}) {
  const [canListen, setCanListen] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'voice' | 'typed'>('voice');
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<any>(null);
  const startedAt = useRef<number | null>(null);
  const spentMs = useRef(0);

  useEffect(() => {
    const ok = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setCanListen(ok);
    if (!ok) setMode('typed');
    return () => rec.current?.abort?.();
  }, []);

  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setElapsed(Math.round((spentMs.current + Date.now() - (startedAt.current || Date.now())) / 1000)), 250);
    return () => clearInterval(t);
  }, [listening]);

  const stopClock = () => {
    if (startedAt.current) spentMs.current += Date.now() - startedAt.current;
    startedAt.current = null;
    setElapsed(Math.round(spentMs.current / 1000));
  };

  const listen = () => {
    if (listening) { rec.current?.stop(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'en-IN';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) setText((cur) => `${cur ? `${cur.trimEnd()} ` : ''}${t.trim()}`);
        else live += t;
      }
      setInterim(live);
    };
    r.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        setErr('The microphone is blocked. Allow it in your browser settings, or type your answer instead.');
        setMode('typed');
      }
    };
    r.onend = () => { stopClock(); setListening(false); setInterim(''); };
    rec.current = r;
    startedAt.current = Date.now();
    setErr(null);
    r.start();
    setListening(true);
  };

  const reset = () => { setText(''); setInterim(''); spentMs.current = 0; setElapsed(0); };

  const submit = async () => {
    if (listening) rec.current?.stop();
    setBusy(true);
    setErr(null);
    try {
      const seconds = mode === 'voice' ? Math.round(spentMs.current / 1000) : undefined;
      const { attempt, progress, ai_used_today } = await submitCoachAttempt({ prompt_id: prompt.id, text, mode, seconds });
      onDone(attempt, progress, ai_used_today);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card pad="lg" className="mt-6">
      <p className="text-sm font-semibold text-muted">{prompt.level_label} · about {prompt.seconds} seconds</p>
      <h2 className="mt-1 font-display text-xl font-bold text-heading">{prompt.text}</h2>
      <p className="mt-2 text-sm text-body"><Explain line={{ en: prompt.hint, hi: prompt.hint_hi }} hinglish={hinglish} /></p>

      {mode === 'voice' && canListen ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={listen}
            aria-pressed={listening}
            className={`focus-ring inline-flex min-h-[52px] items-center gap-2 rounded-xl px-6 text-base font-bold text-white ${listening ? 'bg-danger' : 'bg-signal hover:bg-signal-hover'}`}
          >
            {listening ? <Square className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
            {listening ? `Stop · ${elapsed}s` : text ? 'Keep speaking' : 'Start speaking'}
          </button>
          <p className="mt-2 text-sm text-muted">
            {listening ? 'Listening… take your time. Pauses are fine.' : 'Only the words are kept, never your voice. You can correct anything it heard wrong below.'}
          </p>
          {(text || interim) && (
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-heading">What it heard</span>
              <textarea value={listening ? `${text} ${interim}`.trim() : text} onChange={(e) => setText(e.target.value)} readOnly={listening} rows={5} maxLength={2500} className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20" />
            </label>
          )}
        </div>
      ) : (
        <label className="mt-5 block">
          <span className="text-sm font-semibold text-heading">Type what you would say</span>
          {canListen === false && <span className="block text-sm text-muted">This browser cannot listen. Chrome and Edge can, if you want to speak.</span>}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={2500} placeholder="Write it the way you would say it out loud…" className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20" />
        </label>
      )}

      {aiNote && <p className="mt-3 text-sm text-muted">{aiNote}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={busy || listening || words(text) < 5}>{busy ? 'Listening back…' : 'Get my tips'}</Button>
        {text && !listening && <Button kind="secondary" onClick={reset} icon={RotateCcw}>Start over</Button>}
        {canListen && !listening && (
          <Button kind="text" onClick={() => { reset(); setMode(mode === 'voice' ? 'typed' : 'voice'); }}>{mode === 'voice' ? 'Type instead' : 'Speak instead'}</Button>
        )}
        <Button kind="text" onClick={onBack}>Choose another prompt</Button>
      </div>
      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
    </Card>
  );
}

function Feedback({ a, hinglish }: { a: CoachAttempt; hinglish: boolean }) {
  const f = a.feedback;
  return (
    <>
      <Card pad="lg">
        <p className="text-sm font-semibold text-muted">{a.prompt?.text}</p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          <li className="rounded-full bg-surface-hover px-3 py-1 text-heading">{f.words} words</li>
          {f.wpm !== null && <li className="rounded-full bg-surface-hover px-3 py-1 text-heading">{f.wpm} words a minute</li>}
          <li className="rounded-full bg-surface-hover px-3 py-1 text-heading">{f.filler_total === 0 ? 'No filler words' : `${f.filler_total} filler word${f.filler_total === 1 ? '' : 's'}`}</li>
        </ul>
        {f.note && <p className="mt-3 rounded-xl bg-surface-hover px-3.5 py-2.5 text-sm text-body">{f.note}</p>}

        <p className="mt-5 font-display text-lg font-bold text-heading">What went well</p>
        <ul className="mt-2 space-y-2">
          {f.positives.map((p) => (
            <li key={p.en} className="flex gap-2 text-sm text-body"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /><span><Explain line={p} hinglish={hinglish} /></span></li>
          ))}
        </ul>

        {f.tips.length > 0 && (
          <>
            <p className="mt-6 font-display text-lg font-bold text-heading">Try this next time</p>
            <ol className="mt-2 space-y-3">
              {f.tips.map((t, i) => (
                <li key={t.id} className="rounded-xl border border-line p-3.5">
                  <p className="font-bold text-heading">{i + 1}. {t.title}</p>
                  {t.said && (
                    <p className="mt-1.5 text-sm">
                      <span className="text-muted">You said </span><span className="font-semibold text-heading">“{t.said}”</span>
                      {t.try && <><span className="text-muted"> · try </span><span className="font-semibold text-success">“{t.try}”</span></>}
                    </p>
                  )}
                  <p className="mt-1.5 text-sm text-body"><Explain line={t} hinglish={hinglish} /></p>
                </li>
              ))}
            </ol>
          </>
        )}

        {f.better_version && (
          <>
            <p className="mt-6 font-display text-lg font-bold text-heading">Your answer, polished</p>
            <p className="mt-2 whitespace-pre-line rounded-xl border border-line bg-surface-hover px-3.5 py-3 text-sm text-body">{f.better_version}</p>
            <p className="mt-1 text-sm text-muted">Read it out loud once, then try the prompt again in your own words.</p>
          </>
        )}
        <p className="mt-5 text-xs text-muted">{f.source === 'ai' ? 'Tips by AI coach.' : 'Tips from our checklist of common slips.'}</p>
      </Card>
    </>
  );
}
