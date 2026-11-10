import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSecureMode } from '@/hooks/useSecureMode';
import { splitQuestion } from '@/lib/questionText';
import { FillInput, OrderList } from '@/components/skill-test/QuestionInputs';
import { useAuth } from '@/context/AuthContext';
import { SecureModeWarning, SecureBadge } from '@/components/common/SecureModeWarning';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { BuyPackSheet } from '@/components/prep/BuyPackSheet';
import {
  ArrowLeft, ArrowRight, Clock, Flag, X, CheckCircle2,
  AlertTriangle, LayoutGrid, RotateCcw, LogIn,
} from 'lucide-react';
import { isSignedIn } from '@/lib/auth';
import {
  startAssessmentApi, saveAttemptApi, submitAttemptApi, fetchSkillDetailApi,
  SkillTestAttempt, SafeQuestion,
} from '@/lib/skillTestApi';
import { useSections, SectionBar, SectionSubmitSheet, WritingTask, CodingTask, type TestSection, type WritingConfig, type CodingConfig, type CodingMark } from '@/components/skill-test/Sectional';

import { nameFromSlug, withPageTitle } from '@/components/common/withPageTitle';
type AnswerState = Record<string, string[]>; // questionId -> selected option indexes (as strings)
type MarkedState = Record<string, boolean>;

function AssessmentPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { user } = useAuth();

  const [attempt, setAttempt] = useState<SkillTestAttempt | null>(null);
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [marked, setMarked] = useState<MarkedState>({});
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [showPalette, setShowPalette] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  // Sectional mode (company mocks): per-section timers, no going back, optional writing task.
  const [sectionsCfg, setSectionsCfg] = useState<TestSection[] | null>(null);
  const [writingCfg, setWritingCfg] = useState<WritingConfig | null>(null);
  // Coding section after the MCQ sections (TCS Part B); the student's own marks go in with the submit.
  const [codingCfg, setCodingCfg] = useState<CodingConfig | null>(null);
  const codingMarksRef = useRef<CodingMark[] | null>(null);
  const [showSectionSubmit, setShowSectionSubmit] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [packOpen, setPackOpen] = useState(false);
  // Company tests open the pack sheet straight away when locked (INFOSYS_SE_3T_UX_PLAN §2a).
  useEffect(() => { if (error && companySlug && /pack/i.test(error)) setPackOpen(true); }, [error, companySlug]);
  useEffect(() => {
    if (!slug) return;
    fetchSkillDetailApi(String(slug))
      .then(({ skill, assessment }) => {
        const a = assessment as any;
        if (skill?.name) setTestTitle(skill.name);
        if ((skill as any)?.company_slug) setCompanySlug((skill as any).company_slug);
        if (Array.isArray(a?.sections) && a.sections.length) setSectionsCfg(a.sections);
        if (a?.writing?.tasks?.length) setWritingCfg(a.writing);
        if (a?.coding?.problems?.length) setCodingCfg(a.coding);
      })
      .catch(() => { /* plain single-timer mode */ });
  }, [slug]);

  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeredRef = useRef<AnswerState>({});

  useEffect(() => { answeredRef.current = answers; }, [answers]);
  const timeLeftRef = useRef(timeLeft);
  const secureStrikesRef = useRef(0);
  timeLeftRef.current = timeLeft;

  const skillName = String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const handleStart = async () => {
    if (!isSignedIn()) { setNeedsAuth(true); return; }
    secure.enterFullscreen();
    setLoading(true);
    setError(null);
    try {
      const res = await startAssessmentApi(String(slug));
      const a = res.attempt;
      setAttempt(a);
      setQuestions(a.questions);
      setTimeLeft(typeof a.timeRemainingSec === 'number' ? a.timeRemainingSec : a.timeLimitMinutes * 60);
      // restore prior answers if resuming
      const prior: AnswerState = {};
      const priorMarked: MarkedState = {};
      for (const ans of a.answers || []) {
        if (ans.selectedOptions?.length) prior[ans.questionId] = ans.selectedOptions;
        if (ans.markedForReview) priorMarked[ans.questionId] = true;
      }
      setAnswers(prior);
      setMarked(priorMarked);
      setStarted(true);
    } catch (e: any) {
      setError(e?.message || 'Could not start assessment');
    } finally {
      setLoading(false);
    }
  };

  // countdown timer
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started]);

  // autosave every 20s while in progress
  useEffect(() => {
    if (!started || !attempt) return;
    saveTimer.current = setInterval(() => {
      const payload = buildPayload(answeredRef.current, marked, timeLeft);
      saveAttemptApi(attempt.id, payload).catch(() => { /* transient */ });
    }, 20000);
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, attempt?.id]);

  const buildPayload = (ansState: AnswerState, markState: MarkedState, time: number) => ({
    answers: questions.map((q) => ({
      questionId: q.id,
      selectedOptions: ansState[q.id] || [],
      markedForReview: !!markState[q.id],
      timeSpentSec: 0,
    })),
    timeRemainingSec: time,
    ...(codingMarksRef.current ? { coding_self: codingMarksRef.current } : {}),
  });

  const doSubmit = useCallback(async (answersState: AnswerState, time: number) => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const res = await submitAttemptApi(attempt.id, buildPayload(answersState, marked, time));
      const a = res.attempt;
      router.push(`/skill-test/${slug}/result/${a.id}?score=${a.score ?? 0}&correct=${a.correctAnswers ?? 0}&flags=${secureStrikesRef.current}`);
    } catch (e: any) {
      setError(e?.message || 'Submit failed. Please retry.');
      setSubmitting(false);
      setShowSubmit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, submitting, marked, questions, slug]);

  // Secure mode pauses in the coding section so students can run code in their own compiler.
  const [inCoding, setInCoding] = useState(false);
  const secure = useSecureMode({
    active: started && !submitting && !inCoding,
    onLimit: () => doSubmit(answeredRef.current, timeLeftRef.current),
  });

  secureStrikesRef.current = secure.strikes;

  const sec = useSections({ attemptId: attempt?.id ?? null, questions, sections: sectionsCfg, active: started && !submitting });
  // A new section opens on its first question.
  useEffect(() => { if (sec.enabled) setCurrent(sec.range[0]); }, [sec.enabled, sec.idx]); // eslint-disable-line react-hooks/exhaustive-deps
  // All sections closed with no writing or coding task: submit.
  useEffect(() => {
    if (sec.enabled && sec.done && !writingCfg && !codingCfg && started && !submitting) doSubmit(answeredRef.current, timeLeftRef.current);
  }, [sec.enabled, sec.done]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setInCoding(!!(sec.enabled && sec.done && codingCfg)); }, [sec.enabled, sec.done, codingCfg]);

  // auto submit when timer hits 0
  useEffect(() => {
    // The coding section runs on its own clock and ends in the self-check.
    if (timeLeft === 0 && started && !inCoding && attempt && attempt.status === 'in_progress') {
      doSubmit(answeredRef.current, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, started]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.length > 0).length;

  const handleSelect = (qId: string, optIdx: number, isMultiple: boolean) => {
    setAnswers((prev) => {
      const cur = prev[qId] || [];
      const optStr = String(optIdx);
      if (isMultiple) {
        const exists = cur.includes(optStr);
        return { ...prev, [qId]: exists ? cur.filter((i) => i !== optStr) : [...cur, optStr] };
      }
      return { ...prev, [qId]: [optStr] };
    });
  };

  const toggleMark = (qId: string) => setMarked((prev) => ({ ...prev, [qId]: !prev[qId] }));

  /** Typed and ordering answers replace the whole answer; an empty one clears it. */
  const setAnswer = (qId: string, value: string[]) => setAnswers((prev) => {
    const next = { ...prev };
    if (value.length && value.some((v) => v.trim())) next[qId] = value; else delete next[qId];
    return next;
  });

  const clearAnswer = (qId: string) => setAnswers((prev) => {
    const next = { ...prev };
    delete next[qId];
    return next;
  });

  // ── Pre-start screen ──────────────────────────────────────────────────────
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-link">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Sign in required</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to take the {skillName} assessment and earn your certificate.</p>
          <Link
            href={`/login?next=${encodeURIComponent(`/skill-test/${slug}/assessment`)}`}
            className="mt-6 block w-full rounded-full bg-signal py-3.5 text-sm font-semibold text-on-primary hover:bg-signal transition-colors"
          >
            Sign In / Sign Up
          </Link>
          <Link href={companySlug ? `/prep/${companySlug}` : `/skill-test/${slug}`} className="mt-3 block text-sm text-gray-500 hover:text-gray-700">
            {companySlug ? 'Back to my plan' : 'Back to skill'}
          </Link>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-link">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{testTitle || `${skillName} Assessment`}</h1>
          {sectionsCfg ? (
            <>
              <p className="mt-1 text-sm text-gray-500">
                {sectionsCfg.reduce((n, s) => n + s.count, 0)} questions{codingCfg ? ` + ${codingCfg.count} coding problems` : ''} · {sectionsCfg.reduce((n, s) => n + s.minutes, 0) + (codingCfg?.minutes || 0)} minutes
              </p>
              {/* The real paper's pattern, section by section. */}
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <th className="py-2 font-semibold">Section</th>
                    <th className="py-2 text-right font-semibold">Qs</th>
                    <th className="py-2 text-right font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionsCfg.map((s, i) => (
                    <tr key={s.topicId} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{String.fromCharCode(65 + i)}. {s.name}</td>
                      <td className="py-2 text-right tabular-nums">{s.count}</td>
                      <td className="py-2 text-right tabular-nums">{s.minutes} min</td>
                    </tr>
                  ))}
                  {codingCfg && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{String.fromCharCode(65 + sectionsCfg.length)}. {codingCfg.title}</td>
                      <td className="py-2 text-right tabular-nums">{codingCfg.count}</td>
                      <td className="py-2 text-right tabular-nums">{codingCfg.minutes} min</td>
                    </tr>
                  )}
                  {writingCfg && (
                    <tr>
                      <td className="py-2 text-gray-500" colSpan={3}>Then: {writingCfg.title} (optional, {writingCfg.words[0]}–{writingCfg.words[1]} words)</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <ul className="mt-4 space-y-1 text-left text-xs text-gray-500">
                <li>Each section has its own timer. When it ends, the next section opens.</li>
                <li>A submitted section cannot be reopened.</li>
                <li>Secure mode: stay in fullscreen. Leaving the test 3 times submits it.</li>
                {codingCfg && <li>The coding problems come last. Secure mode pauses there, so you can run your code in your own compiler; then mark how each problem went.</li>}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-500">30 Questions · 30 Minutes · Passing 60%</p>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {error && companySlug && /pack/i.test(error) && (
            <>
              <button type="button" onClick={() => setPackOpen(true)} className="btn btn-primary focus-ring mt-3 inline-flex min-h-[44px] px-5">
                See what&apos;s in the pack
              </button>
              <BuyPackSheet open={packOpen} onClose={() => setPackOpen(false)} slug={companySlug} what="This test" />
            </>
          )}
          <button
            onClick={handleStart}
            disabled={loading}
            className="mt-6 w-full rounded-full bg-signal py-3.5 text-sm font-semibold text-on-primary hover:bg-signal transition-colors disabled:opacity-60"
          >
            {loading ? 'Preparing…' : 'Start Now'}
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600">No questions available for this assessment.</p>
          <Link href={companySlug ? `/prep/${companySlug}` : `/skill-test/${slug}`} className="mt-3 inline-block text-link font-medium">Back</Link>
        </div>
      </div>
    );
  }

  if (sec.enabled && sec.done && codingCfg && attempt) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CodingTask
          config={codingCfg}
          attemptId={attempt.id}
          submitting={submitting}
          onSubmit={(marks) => { codingMarksRef.current = marks; doSubmit(answers, timeLeft); }}
        />
      </div>
    );
  }

  if (sec.enabled && sec.done && writingCfg && attempt) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SecureModeWarning message={secure.warning} onResume={() => { secure.dismissWarning(); secure.enterFullscreen(); }} />
        <WritingTask config={writingCfg} attemptId={attempt.id} submitting={submitting} onSubmit={() => doSubmit(answers, timeLeft)} />
      </div>
    );
  }

  const q = questions[current];
  const selected = answers[q.id] || [];
  const isMarked = !!marked[q.id];
  const isMultiple = q.type === 'multiple_choice';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SecureModeWarning message={secure.warning} onResume={() => { secure.dismissWarning(); secure.enterFullscreen(); }} />
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl lg:max-w-7xl px-4 py-2.5 lg:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm lg:text-lg font-semibold text-gray-900 truncate">{testTitle || skillName}</span>
            <SecureBadge />
          </div>
          <div className="flex items-center gap-3 flex-none">
            <span className="text-sm lg:text-base text-gray-600">
              Q <span className="font-semibold text-gray-900">{current + 1}</span>/{questions.length}
            </span>
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 lg:px-4 lg:py-1.5 text-xs lg:text-base font-semibold tabular-nums ${
              timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        {sec.enabled && sectionsCfg && <SectionBar sections={sectionsCfg} idx={sec.idx} secLeft={sec.secLeft} />}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-signal transition-all duration-300" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-3xl w-full px-4 pt-3">
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Question area */}
      <div className="flex-1 mx-auto w-full max-w-3xl lg:max-w-7xl px-4 py-4 pb-24 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:py-6">
        <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6 lg:p-8 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            {(() => {
              // Company mocks carry passages, tables and pseudocode: keep line breaks,
              // and show the code part (after the prompt) as a code block.
              // Swift output questions put the code first and the prompt last (lib/questionText).
              const parts = splitQuestion(q.question, q.code);
              return (
                <div className="min-w-0 flex-1">
                  {parts.before && <p className="text-base lg:text-xl font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">{parts.before}</p>}
                  {parts.code && <pre className={`${parts.before ? 'mt-3 ' : ''}overflow-x-auto rounded-xl bg-gray-900 p-4 lg:p-5 font-mono text-sm lg:text-base leading-relaxed text-gray-100`}>{parts.code}</pre>}
                  {parts.after && <p className="mt-3 text-base lg:text-xl font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">{parts.after}</p>}
                </div>
              );
            })()}
            <button
              onClick={() => toggleMark(q.id)}
              className={`flex-none rounded-lg p-2 transition-colors ${isMarked ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              aria-label="Mark for review"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>

          {q.type === 'fill_blank' ? (
            <div className="mt-4"><FillInput large value={selected[0] || ''} onChange={(v) => setAnswer(q.id, [v])} /></div>
          ) : q.type === 'ordering' ? (() => {
            // Rows are the shuffled items; the answer is their real indices in the student's order.
            const shown = q.options.map((o) => o.text);
            const order = selected.length === q.options.length ? selected.map((v) => q.options.findIndex((o) => String(o.index) === v)) : q.options.map((_, i) => i);
            return (
              <div className="mt-4">
                <OrderList items={shown} order={order} mono={!!q.code} large onChange={(o) => setAnswer(q.id, o.map((p) => String(q.options[p].index)))} />
                {!selected.length && (
                  <button type="button" onClick={() => setAnswer(q.id, order.map((p) => String(q.options[p].index)))} className="mt-3 min-h-[44px] rounded-xl border-2 border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-gray-300">
                    Keep this order as my answer
                  </button>
                )}
              </div>
            );
          })() : (
          <div className="mt-4 space-y-2">
            {q.options.map((opt) => {
              const isSelected = selected.includes(String(opt.index));
              return (
                <button
                  key={opt.index}
                  onClick={() => handleSelect(q.id, opt.index, isMultiple)}
                  className={`w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3 lg:px-5 lg:py-4 text-left text-sm lg:text-lg transition-all min-h-[48px] lg:min-h-[60px] ${
                    isSelected ? 'border-signal bg-signal-soft' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                    isSelected ? 'border-signal bg-signal' : 'border-gray-300'
                  }`}>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <span className="text-gray-800">{opt.text}</span>
                </button>
              );
            })}
          </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => clearAnswer(q.id)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Answer
            </button>
            <span className="text-xs text-gray-400">
              {q.type === 'fill_blank' ? 'Type the answer' : q.type === 'ordering' ? 'Put the rows in order' : isMultiple ? 'Select all that apply' : 'Select one option'}
            </span>
          </div>
        </div>

        {/* Desktop side panel: who is taking the test, time, and the palette always open. */}
        <aside className="hidden lg:block lg:sticky lg:top-24 space-y-4">
          <div className="flex items-center gap-4 rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
            {/* Avatars come from any host (Google, uploads), so a plain img; it is tiny. */}
            {user?.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={user.avatar} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
              : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-signal-soft text-2xl font-bold text-heading" aria-hidden>{(user?.name || '?').trim().charAt(0).toUpperCase()}</span>}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Candidate</p>
              <p className="truncate text-lg font-bold text-gray-900">{user?.name || 'Student'}</p>
              <p className="truncate text-sm text-gray-600">{user?.email || ''}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-base font-semibold text-gray-900">Question palette</p>
              <p className="text-sm text-gray-500">{questions.filter((qq) => answers[qq.id]?.length).length}/{questions.length} answered</p>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((qq, qi) => {
                if (sec.enabled && (qi < sec.range[0] || qi > sec.range[1])) return null;
                const isA = answers[qq.id]?.length > 0;
                const isM = marked[qq.id];
                return (
                  <button
                    key={qq.id}
                    onClick={() => setCurrent(qi)}
                    aria-label={`Question ${qi + 1}${isA ? ', answered' : ''}${isM ? ', marked' : ''}`}
                    className={`flex h-12 items-center justify-center rounded-lg text-base font-semibold border-2 transition-all ${
                      isM ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : isA ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                    } ${qi === current ? 'ring-2 ring-signal ring-offset-1' : ''}`}
                  >
                    {qi + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-400" /> Answered</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-400" /> Marked</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-300" /> Not answered</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="mx-auto max-w-3xl lg:max-w-7xl px-4 py-3 flex items-center gap-2 lg:[&_button]:text-base lg:[&_button]:min-h-[52px] lg:[&_button]:px-6">
          <button
            onClick={() => setCurrent((c) => Math.max(sec.range[0], c - 1))}
            disabled={current <= sec.range[0]}
            className="flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" /> Prev
          </button>

          <button
            onClick={() => setShowPalette(true)}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 min-h-[44px] mx-auto lg:invisible"
          >
            <LayoutGrid className="h-4 w-4" /> Palette
          </button>

          {current < (sec.enabled ? sec.range[1] : questions.length - 1) ? (
            <button
              onClick={() => setCurrent((c) => c + 1)}
              className="flex items-center gap-1 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-signal min-h-[44px]"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => (sec.enabled ? setShowSectionSubmit(true) : setShowSubmit(true))}
              className="flex items-center gap-1 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 min-h-[44px]"
            >
              {sec.enabled ? 'Submit section' : 'Submit'}
            </button>
          )}
        </div>
      </div>

      {/* Palette Bottom Sheet */}
      {showPalette && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPalette(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white max-h-[70vh] overflow-y-auto safe-area-bottom">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Question Palette</p>
              <button onClick={() => setShowPalette(false)} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Close palette">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="px-4 py-4">
              <div className="flex flex-wrap gap-2">
                {questions.map((qq, qi) => {
                  if (sec.enabled && (qi < sec.range[0] || qi > sec.range[1])) return null;
                  const isA = answers[qq.id]?.length > 0;
                  const isM = marked[qq.id];
                  const isActive = qi === current;
                  return (
                    <button
                      key={qq.id}
                      onClick={() => { setCurrent(qi); setShowPalette(false); }}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold border-2 transition-all ${
                        isM ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : isA ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                      } ${isActive ? 'ring-2 ring-signal ring-offset-1' : ''}`}
                    >
                      {qi + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-400" /> Answered</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-400" /> Marked</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-300" /> Not answered</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation */}
      {sec.enabled && sec.section && (
        <SectionSubmitSheet
          open={showSectionSubmit}
          name={sec.section.name}
          unanswered={questions.slice(sec.range[0], sec.range[1] + 1).filter((qq) => !(answers[qq.id]?.length)).length}
          last={sec.idx === (sectionsCfg?.length || 1) - 1}
          onCancel={() => setShowSectionSubmit(false)}
          onConfirm={() => { setShowSectionSubmit(false); sec.advance(); }}
        />
      )}

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setShowSubmit(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Submit Assessment?</h3>
                <p className="text-sm text-gray-500">
                  {answeredCount} of {questions.length} answered
                  {questions.length - answeredCount > 0 && (
                    <span className="text-amber-600"> · {questions.length - answeredCount} unanswered</span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => doSubmit(answers, timeLeft)}
                disabled={submitting}
                className="rounded-full bg-signal py-3 text-sm font-semibold text-on-primary hover:bg-signal transition-colors disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit Assessment'}
              </button>
              <button
                onClick={() => setShowSubmit(false)}
                disabled={submitting}
                className="rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Continue Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withPageTitle(AssessmentPage, (q) => `${nameFromSlug(q.slug)} test`);
