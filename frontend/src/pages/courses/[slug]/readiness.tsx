import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Clock, Gauge, LayoutGrid, Lock, RotateCcw,
  ShieldAlert, ShieldCheck, Sparkles, Target, BookOpen, AlertTriangle, LogIn,
} from 'lucide-react';
import { useSecureMode } from '@/hooks/useSecureMode';
import { SecureModeWarning, SecureBadge } from '@/components/common/SecureModeWarning';
import { Sheet } from '@/components/common/Sheet';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useShell } from '@/context/ShellContext';
import { withPageTitle } from '@/components/common/withPageTitle';
import { cn } from '@/lib/cn';
import {
  fetchReadiness, startReadiness, submitReadiness, chooseReadinessPath,
  type ReadinessState, type ReadinessQuestion, type ReadinessReport,
} from '@/lib/coursesApi';

type Phase = 'loading' | 'intro' | 'test' | 'submitting' | 'result' | 'error';

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');
const clock = (sec: number) => `${pad(sec / 60)}:${pad(sec % 60)}`;
const shortTitle = (t: string | null | undefined) => String(t || '').replace(/^Module (\d+) — /, 'M$1 · ');

/**
 * The pre-course readiness test.
 *
 * Intro → secure fullscreen paper → module-by-module report → path choice.
 * The server draws, times and grades; this page never sees an answer key. Two
 * secure-mode strikes void the module credits server-side, and the third
 * auto-submits here, so the rules on the intro screen are the rules enforced.
 */
function ReadinessPage() {
  const router = useRouter();
  const slug = String(router.query.slug || '');
  const { user } = useAuth();
  const { add } = useCart();
  const { openOverlay } = useShell();

  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ReadinessState | null>(null);
  const [course, setCourse] = useState<{ id: string; slug: string; title: string; price_inr: number } | null>(null);
  const [owned, setOwned] = useState(false);

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ReadinessQuestion[]>([]);
  const [deadline, setDeadline] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showPalette, setShowPalette] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [pathBusy, setPathBusy] = useState<string | null>(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  // Answers live only in the browser until submit; keep them per attempt so a
  // reload or a resumed attempt does not wipe them.
  useEffect(() => {
    if (!attemptId) return;
    try { window.localStorage.setItem(`rdy:${attemptId}`, JSON.stringify(answers)); } catch { /* storage full or blocked */ }
  }, [attemptId, answers]);
  const submittedRef = useRef(false);
  const strikesRef = useRef(0);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetchReadiness(slug);
      setState(res.readiness);
      setCourse(res.course);
      setOwned(res.owned);
      if (res.readiness.latest && !res.readiness.in_progress_attempt_id) {
        setReport(res.readiness.latest);
        setPhase('result');
      } else setPhase('intro');
    } catch (e: any) {
      setError(e?.message || 'Could not load the readiness test.');
      setPhase('error');
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const doSubmit = useCallback(async () => {
    if (!attemptId || submittedRef.current) return;
    submittedRef.current = true;
    setPhase('submitting');
    try {
      const res = await submitReadiness(slug, attemptId, answersRef.current, strikesRef.current);
      setReport(res.report);
      try { window.localStorage.removeItem(`rdy:${attemptId}`); } catch { /* ignore */ }
      const fresh = await fetchReadiness(slug).catch(() => null);
      if (fresh) setState(fresh.readiness);
      setPhase('result');
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      submittedRef.current = false;
      setError(e?.message || 'Submission failed — check your connection and try again.');
      setPhase('test');
    }
  }, [attemptId, slug]);

  const secure = useSecureMode({ active: phase === 'test', limit: 3, onLimit: () => { void doSubmit(); } });
  strikesRef.current = secure.strikes;

  // Timer: server deadline drives it; at zero the paper submits itself.
  useEffect(() => {
    if (phase !== 'test') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);
  const secondsLeft = Math.max(0, Math.round((deadline - now) / 1000));
  useEffect(() => {
    if (phase === 'test' && deadline && secondsLeft === 0) void doSubmit();
  }, [phase, deadline, secondsLeft, doSubmit]);

  const begin = async () => {
    if (!user) return router.push(`/login?next=/courses/${slug}/readiness`);
    secure.enterFullscreen();
    setError(null);
    try {
      const res = await startReadiness(slug);
      setAttemptId(res.attempt_id);
      setQuestions(res.questions);
      setDeadline(new Date(res.deadline_at).getTime());
      setNow(Date.now());
      setCurrent(0);
      let saved: Record<string, number> = {};
      try { saved = JSON.parse(window.localStorage.getItem(`rdy:${res.attempt_id}`) || '{}'); } catch { saved = {}; }
      setAnswers(res.resumed ? saved : {});
      submittedRef.current = false;
      setPhase('test');
    } catch (e: any) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setError(e?.message || 'Could not start the test.');
    }
  };

  const choosePath = async (path: 'full' | 'personalised') => {
    if (!course) return;
    setPathBusy(path);
    setError(null);
    try {
      const res = await chooseReadinessPath(slug, path);
      add({ kind: 'course', id: course.id, slug: course.slug, name: course.title, price: res.price_inr, list_price: course.price_inr });
      openOverlay('cart');
      setState((s) => (s ? { ...s, path_choice: res.path_choice } : s));
    } catch (e: any) {
      setError(e?.message || 'Could not save your choice.');
    } finally {
      setPathBusy(null);
    }
  };

  const answeredCount = useMemo(() => questions.filter((q) => answers[q.id] !== undefined).length, [questions, answers]);

  // ------------------------------------------------------------------ render

  if (phase === 'loading') {
    return <Shell><div className="h-64 animate-pulse rounded-[var(--radius-md)] bg-[var(--bg-surface)]" /></Shell>;
  }

  if (phase === 'error') {
    return (
      <Shell>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-danger" aria-hidden />
          <p className="mt-3 text-sm text-[var(--text-body)]">{error}</p>
          <Link href={`/courses/${slug}`} className="btn btn-secondary focus-ring mt-5 inline-flex min-h-[44px] items-center gap-2">
            <ArrowLeft size={16} aria-hidden /> Back to the course
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase === 'test' || phase === 'submitting') {
    const q = questions[current];
    const lowTime = secondsLeft <= 300;
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-page)]" role="main">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--ink)]">Readiness test · {course?.title.split(' — ')[0]}</p>
            <div className="mt-0.5 flex items-center gap-2"><SecureBadge />
              <span className="text-xs text-[var(--text-muted)] tabular-nums">{answeredCount}/{questions.length} answered</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-extrabold tabular-nums',
              lowTime ? 'bg-danger-soft text-danger' : 'bg-[var(--bg-surface-hover)] text-[var(--ink)]')} aria-live="polite">
              <Clock size={15} aria-hidden /> {clock(secondsLeft)}
            </span>
            <button type="button" onClick={() => setShowPalette(true)} className="btn btn-secondary focus-ring min-h-[40px] px-3" aria-label="Question palette">
              <LayoutGrid size={16} aria-hidden />
            </button>
          </div>
        </header>

        <div className="h-1 bg-[var(--bg-surface-hover)]">
          <div className="h-1 bg-[var(--brand-sky)] transition-all" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {q && (
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[var(--brand-sky-soft)] px-2.5 py-1 font-semibold text-link">{shortTitle(q.module_title)}</span>
                <span className="text-[var(--text-muted)]">Question {current + 1} of {questions.length}</span>
              </div>
              <h1 className="mt-4 text-lg font-semibold leading-relaxed text-[var(--ink)] sm:text-xl">{q.prompt}</h1>
              <div className="mt-6 space-y-3" role="radiogroup" aria-label="Answer options">
                {q.options.map((opt, i) => {
                  const selected = answers[q.id] === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                      className={cn('focus-ring flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition-colors min-h-[56px]',
                        selected ? 'border-[var(--brand-sky)] bg-[var(--brand-sky-soft)] text-[var(--ink)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]')}
                    >
                      <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                        selected ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)] text-white' : 'border-[var(--border-subtle)]')}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            </div>
          )}
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 sm:px-6">
          <button type="button" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="btn btn-secondary focus-ring min-h-[44px] gap-1.5 disabled:opacity-40">
            <ArrowLeft size={16} aria-hidden /> Previous
          </button>
          {current < questions.length - 1 ? (
            <button type="button" onClick={() => setCurrent((c) => c + 1)} className="btn btn-primary focus-ring min-h-[44px] gap-1.5">
              Next <ArrowRight size={16} aria-hidden />
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmSubmit(true)} disabled={phase === 'submitting'} className="btn btn-primary focus-ring min-h-[44px] gap-1.5">
              {phase === 'submitting' ? 'Submitting…' : 'Submit test'}
            </button>
          )}
        </footer>

        <Sheet open={showPalette} onClose={() => setShowPalette(false)} title="All questions" zIndex={70}>
          <div className="px-5 pb-6">
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {questions.map((qq, i) => (
                <button
                  key={qq.id}
                  type="button"
                  onClick={() => { setCurrent(i); setShowPalette(false); }}
                  className={cn('focus-ring h-10 rounded-lg text-sm font-bold tabular-nums',
                    i === current ? 'ring-2 ring-[var(--brand-sky)]' : '',
                    answers[qq.id] !== undefined ? 'bg-[var(--brand-sky)] text-white' : 'bg-[var(--bg-surface-hover)] text-[var(--ink)]')}
                  aria-label={`Question ${i + 1}${answers[qq.id] !== undefined ? ', answered' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setShowPalette(false); setConfirmSubmit(true); }} className="btn btn-primary focus-ring mt-5 w-full min-h-[48px]">
              Submit test
            </button>
          </div>
        </Sheet>

        <Sheet open={confirmSubmit} onClose={() => setConfirmSubmit(false)} title="Submit your test?" zIndex={70}>
          <div className="px-5 pb-6 text-sm text-[var(--text-body)]">
            <p>You have answered <strong className="text-[var(--ink)]">{answeredCount}</strong> of {questions.length} questions.
              {answeredCount < questions.length && ' Unanswered questions count as wrong.'}</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirmSubmit(false)} className="btn btn-secondary focus-ring min-h-[48px] flex-1">Keep going</button>
              <button type="button" onClick={() => { setConfirmSubmit(false); void doSubmit(); }} className="btn btn-primary focus-ring min-h-[48px] flex-1">Submit</button>
            </div>
          </div>
        </Sheet>

        <SecureModeWarning message={secure.warning} onResume={() => { secure.dismissWarning(); secure.enterFullscreen(); }} />
      </div>
    );
  }

  if (phase === 'result' && report && state) {
    return (
      <Shell>
        <ResultView
          report={report}
          state={state}
          owned={owned}
          slug={slug}
          pathBusy={pathBusy}
          error={error}
          onChoose={choosePath}
          onRetake={() => { setReport(null); setPhase('intro'); }}
        />
      </Shell>
    );
  }

  // intro
  return (
    <Shell>
      {state && (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--brand-sky-soft)] px-6 py-6 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-wider text-link">Before you start the course</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[var(--ink)] sm:text-3xl">How ready are you for {course?.title.split(' — ')[0]}?</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-body)]">
              {state.question_count} questions across {state.modules_tested} modules. Answer every question of a module correctly and that
              module is <strong>tested out</strong> — marked complete, so you skip it. Test out enough and you can choose a cheaper
              personalised path.
            </p>
          </div>
          <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-8">
            <Rule icon={<Clock size={18} aria-hidden />} title={`${state.duration_minutes} minutes, one sitting`}>
              The timer is set by the server and keeps running if you leave. At zero the test submits itself.
            </Rule>
            <Rule icon={<ShieldCheck size={18} aria-hidden />} title="Fullscreen secure mode">
              Copy, paste and right-click are off. Leaving fullscreen or switching tabs is recorded:
              <strong> 2 warnings void all module credits</strong>, and a 3rd submits the test.
            </Rule>
            <Rule icon={<Target size={18} aria-hidden />} title={`${state.per_module} questions per module`}>
              {state.per_module}/{state.per_module} → tested out · {state.per_module - 1}/{state.per_module} → quick review · less → study it.
              Module 12, the defence, is never skipped.
            </Rule>
            <Rule icon={<Sparkles size={18} aria-hidden />} title="Your price, your choice">
              {state.offer_tiers.map((t) => `${t.min_tested_out}+ modules → ${t.label}`).join(' · ')} — or keep the full course at ₹{course?.price_inr}.
            </Rule>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] px-6 py-5 sm:px-8">
            {!user ? (
              <Link href={`/login?next=/courses/${slug}/readiness`} className="btn btn-primary focus-ring inline-flex min-h-[48px] items-center gap-2">
                <LogIn size={16} aria-hidden /> Sign in to start
              </Link>
            ) : (
              <button type="button" onClick={begin} disabled={!state.can_start} className="btn btn-primary focus-ring min-h-[48px] gap-2 disabled:opacity-50">
                {state.in_progress_attempt_id ? 'Resume my test' : 'Start the test in fullscreen'} <ArrowRight size={16} aria-hidden />
              </button>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              Attempt {Math.min(state.attempts_used + 1, state.max_attempts)} of {state.max_attempts}
              {state.next_start_at ? ` · next attempt from ${new Date(state.next_start_at).toLocaleString('en-IN')}` : ''}
              {user && !state.can_start && state.block_reason ? ` · ${state.block_reason}` : ''}
            </p>
          </div>
          {error && <p className="px-6 pb-5 text-sm text-danger sm:px-8">{error}</p>}
        </div>
      )}
      <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
        Tested-out modules are credited, not certified: the final exam and the capstone defence are required for every certificate.
      </p>
    </Shell>
  );
}

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const slug = String(router.query.slug || '');
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href={`/courses/${slug}`} className="focus-ring mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-link">
        <ArrowLeft size={16} aria-hidden /> Back to the course
      </Link>
      {children}
    </div>
  );
};

const Rule: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface-hover)] text-link">{icon}</span>
    <div>
      <p className="text-sm font-bold text-[var(--ink)]">{title}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-body)]">{children}</p>
    </div>
  </div>
);

const STATUS: Record<string, { label: string; cls: string; bar: string; Icon: typeof CheckCircle2 }> = {
  tested_out: { label: 'Tested out', cls: 'bg-success-soft text-success', bar: 'bg-success', Icon: CheckCircle2 },
  review: { label: 'Quick review', cls: 'bg-warning-soft text-warning', bar: 'bg-[var(--brand-sky)]', Icon: CircleDot },
  learn: { label: 'Study this', cls: 'bg-[var(--bg-surface-hover)] text-[var(--ink)]', bar: 'bg-[var(--text-muted)]', Icon: BookOpen },
  not_tested: { label: 'Always included', cls: 'bg-[var(--bg-surface-hover)] text-[var(--text-muted)]', bar: 'bg-transparent', Icon: Lock },
};

const ResultView: React.FC<{
  report: ReadinessReport;
  state: ReadinessState;
  owned: boolean;
  slug: string;
  pathBusy: string | null;
  error: string | null;
  onChoose: (p: 'full' | 'personalised') => void;
  onRetake: () => void;
}> = ({ report, state, owned, slug, pathBusy, error, onChoose, onRetake }) => {
  const verdict = report.credits_voided
    ? { title: 'Result recorded — credits voided', text: 'This attempt had integrity warnings (leaving fullscreen or the tab), or was submitted late, so no modules were credited. Your module scores below still show where you stand.', Icon: ShieldAlert, tone: 'bg-danger-soft text-danger' }
    : report.verdict === 'foundations'
      ? { title: 'Build foundations first', text: 'Your score suggests starting with the fundamentals. Take the free foundations course first, or begin AI.FIRST from Module 1 — it is written to start from zero.', Icon: BookOpen, tone: 'bg-warning-soft text-warning' }
      : report.verdict === 'ahead'
        ? { title: 'You are ahead — skip what you know', text: `You tested out of ${report.tested_out_count} modules (about ${report.hours_saved} hours). Choose the personalised path to pay only for the rest, or keep the full course.`, Icon: Sparkles, tone: 'bg-success-soft text-success' }
        : { title: 'Ready for the course', text: report.tested_out_count > 0 ? `You tested out of ${report.tested_out_count} module${report.tested_out_count === 1 ? '' : 's'}. Focus your time on the modules marked "Study this".` : 'You have the basics to start. Focus your time on the modules marked "Study this".', Icon: Gauge, tone: 'bg-[var(--brand-sky-soft)] text-link' };

  const focus = report.modules.filter((m) => m.status === 'learn').map((m) => shortTitle(m.title));
  const review = report.modules.filter((m) => m.status === 'review').map((m) => shortTitle(m.title));

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing percent={report.score_percent} />
          <div className="min-w-0 flex-1">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', verdict.tone)}>
              <verdict.Icon size={14} aria-hidden /> {verdict.title}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-body)]">{verdict.text}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Stat label="Tested out" value={`${report.tested_out_count} modules`} />
              <Stat label="Time saved" value={`~${report.hours_saved} h`} />
              {report.strikes > 0 && <Stat label="Integrity warnings" value={String(report.strikes)} />}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8">
        <h2 className="text-lg font-bold text-[var(--ink)]">Module by module</h2>
        <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
          {report.modules.map((m) => {
            const s = STATUS[m.status];
            const pct = m.total ? (m.correct / m.total) * 100 : 0;
            return (
              <li key={m.module_id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--ink)]">{m.title.replace(/^Module (\d+) — /, '$1 · ')}</span>
                {m.total > 0 && (
                  <span className="flex w-32 items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-surface-hover)]">
                      <span className={cn('block h-2 rounded-full', s.bar)} style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 text-right text-xs font-bold tabular-nums text-[var(--text-muted)]">{m.correct}/{m.total}</span>
                  </span>
                )}
                <span className={cn('inline-flex w-36 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', s.cls)}>
                  <s.Icon size={12} aria-hidden /> {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8">
        <h2 className="text-lg font-bold text-[var(--ink)]">Your recommendation</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--text-body)]">
          {report.tested_out_count > 0 && !report.credits_voided && (
            <li>✓ Skip the tested-out modules — their lessons are marked complete as soon as you enrol (you can still revisit them on the full path).</li>
          )}
          {review.length > 0 && <li>◐ Skim and take the quizzes for: {review.join(', ')}. You were one question away.</li>}
          {focus.length > 0 && <li>● Study fully: {focus.join(', ')}.</li>}
          <li>● Module 12 (your capstone defence), the final exam and the capstone are required for the certificate on every path.</li>
          {report.verdict === 'foundations' && report.foundation_course_slug && (
            <li>
              ● Start with the free{' '}
              <Link href={`/courses/${report.foundation_course_slug}`} className="font-semibold text-link underline">foundations course</Link>, then retake this test.
            </li>
          )}
        </ul>
      </section>

      {!owned && (
        <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[var(--ink)]">Choose your path</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <PathCard
              title="Full course"
              price={report.list_price_inr}
              selected={state.path_choice !== 'personalised'}
              points={['All 12 modules open', 'Tested-out modules already marked complete — revisit any time', 'Final exam + capstone → certificate']}
              cta="Buy full course"
              busy={pathBusy === 'full'}
              onClick={() => onChoose('full')}
            />
            <PathCard
              title="Personalised path"
              price={report.offer_price_inr}
              strike={report.list_price_inr}
              selected={state.path_choice === 'personalised'}
              disabledText={report.offer_price_inr === null ? `Unlocks at ${Math.min(...state.offer_tiers.map((t) => t.min_tested_out))}+ tested-out modules` : null}
              points={['Pay only for the modules you need', 'Tested-out modules stay closed and marked complete', 'Same final exam, capstone and certificate']}
              cta="Buy personalised path"
              busy={pathBusy === 'personalised'}
              onClick={() => onChoose('personalised')}
            />
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/courses/${slug}`} className="btn btn-secondary focus-ring inline-flex min-h-[44px] items-center gap-2">
          <ArrowLeft size={16} aria-hidden /> Back to the course
        </Link>
        {state.can_start && (
          <button type="button" onClick={onRetake} className="btn btn-secondary focus-ring min-h-[44px] gap-2">
            <RotateCcw size={16} aria-hidden /> Retake ({state.max_attempts - state.attempts_used} left)
          </button>
        )}
        {!state.can_start && state.next_start_at && (
          <span className="text-xs text-[var(--text-muted)]">Retake available from {new Date(state.next_start_at).toLocaleString('en-IN')}</span>
        )}
      </div>
    </div>
  );
};

const ScoreRing: React.FC<{ percent: number }> = ({ percent }) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`Score ${percent} percent`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--bg-surface-hover)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--brand-sky)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(percent / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="66" textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--ink)">{percent}%</text>
    </svg>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-[var(--text-muted)]">{label}</p>
    <p className="font-extrabold tabular-nums text-[var(--ink)]">{value}</p>
  </div>
);

const PathCard: React.FC<{
  title: string;
  price: number | null;
  strike?: number;
  selected: boolean;
  disabledText?: string | null;
  points: string[];
  cta: string;
  busy: boolean;
  onClick: () => void;
}> = ({ title, price, strike, selected, disabledText, points, cta, busy, onClick }) => (
  <div className={cn('flex flex-col rounded-xl border p-5',
    disabledText ? 'border-[var(--border-subtle)] opacity-60' : selected ? 'border-[var(--brand-sky)] bg-[var(--brand-sky-soft)]' : 'border-[var(--border-subtle)]')}>
    <p className="text-sm font-bold text-[var(--ink)]">{title}</p>
    <p className="mt-1 text-2xl font-extrabold text-[var(--ink)]">
      {price !== null ? `₹${price}` : '—'}
      {strike && price !== null && price < strike && <span className="ml-2 text-base font-semibold text-[var(--text-muted)] line-through">₹{strike}</span>}
    </p>
    <ul className="mt-3 flex-1 space-y-1.5 text-sm text-[var(--text-body)]">
      {points.map((p) => (
        <li key={p} className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" aria-hidden /> {p}</li>
      ))}
    </ul>
    {disabledText ? (
      <p className="mt-4 text-xs font-semibold text-[var(--text-muted)]">{disabledText}</p>
    ) : (
      <button type="button" onClick={onClick} disabled={busy} className="btn btn-primary focus-ring mt-4 min-h-[44px] disabled:opacity-60">
        {busy ? 'Opening checkout…' : cta}
      </button>
    )}
  </div>
);

export default withPageTitle(ReadinessPage, () => 'Readiness test');
