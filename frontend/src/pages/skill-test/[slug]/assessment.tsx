import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Clock, Flag, X, CheckCircle2,
  AlertTriangle, LayoutGrid, RotateCcw, LogIn,
} from 'lucide-react';
import { isSignedIn } from '@/lib/auth';
import {
  startAssessmentApi, saveAttemptApi, submitAttemptApi,
  SkillTestAttempt, SafeQuestion,
} from '@/lib/skillTestApi';

type AnswerState = Record<string, string[]>; // questionId -> selected option indexes (as strings)
type MarkedState = Record<string, boolean>;

export default function AssessmentPage() {
  const router = useRouter();
  const { slug } = router.query;

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

  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeredRef = useRef<AnswerState>({});

  useEffect(() => { answeredRef.current = answers; }, [answers]);

  const skillName = String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const handleStart = async () => {
    if (!isSignedIn()) { setNeedsAuth(true); return; }
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
  });

  const doSubmit = useCallback(async (answersState: AnswerState, time: number) => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const res = await submitAttemptApi(attempt.id, buildPayload(answersState, marked, time));
      const a = res.attempt;
      router.push(`/skill-test/${slug}/result/${a.id}?score=${a.score ?? 0}&correct=${a.correctAnswers ?? 0}`);
    } catch (e: any) {
      setError(e?.message || 'Submit failed. Please retry.');
      setSubmitting(false);
      setShowSubmit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, submitting, marked, questions, slug]);

  // auto submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && started && attempt && attempt.status === 'in_progress') {
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0F7BFF]">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Sign in required</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to take the {skillName} assessment and earn your certificate.</p>
          <Link
            href={`/login?next=${encodeURIComponent(`/skill-test/${slug}/assessment`)}`}
            className="mt-6 block w-full rounded-full bg-[#0F7BFF] py-3.5 text-sm font-semibold text-white hover:bg-[#0C5AD9] transition-colors"
          >
            Sign In / Sign Up
          </Link>
          <Link href={`/skill-test/${slug}`} className="mt-3 block text-sm text-gray-500 hover:text-gray-700">
            Back to skill
          </Link>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0F7BFF]">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{skillName} Assessment</h1>
          <p className="mt-1 text-sm text-gray-500">30 Questions · 30 Minutes · Passing 60%</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            onClick={handleStart}
            disabled={loading}
            className="mt-6 w-full rounded-full bg-[#0F7BFF] py-3.5 text-sm font-semibold text-white hover:bg-[#0C5AD9] transition-colors disabled:opacity-60"
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
          <Link href={`/skill-test/${slug}`} className="mt-3 inline-block text-[#0F7BFF] font-medium">Back</Link>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const selected = answers[q.id] || [];
  const isMarked = !!marked[q.id];
  const isMultiple = q.type === 'multiple_choice';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">{skillName}</span>
          </div>
          <div className="flex items-center gap-3 flex-none">
            <span className="text-sm text-gray-600">
              Q <span className="font-semibold text-gray-900">{current + 1}</span>/{questions.length}
            </span>
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-[#0F7BFF] transition-all duration-300" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-3xl w-full px-4 pt-3">
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Question area */}
      <div className="flex-1 mx-auto w-full max-w-3xl px-4 py-4 pb-24">
        <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-medium text-gray-900 leading-relaxed">{q.question}</p>
            <button
              onClick={() => toggleMark(q.id)}
              className={`flex-none rounded-lg p-2 transition-colors ${isMarked ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              aria-label="Mark for review"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {q.options.map((opt) => {
              const isSelected = selected.includes(String(opt.index));
              return (
                <button
                  key={opt.index}
                  onClick={() => handleSelect(q.id, opt.index, isMultiple)}
                  className={`w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all min-h-[48px] ${
                    isSelected ? 'border-[#0F7BFF] bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                    isSelected ? 'border-[#0F7BFF] bg-[#0F7BFF]' : 'border-gray-300'
                  }`}>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <span className="text-gray-800">{opt.text}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => clearAnswer(q.id)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Answer
            </button>
            <span className="text-xs text-gray-400">
              {isMultiple ? 'Select all that apply' : 'Select one option'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" /> Prev
          </button>

          <button
            onClick={() => setShowPalette(true)}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 min-h-[44px] mx-auto"
          >
            <LayoutGrid className="h-4 w-4" /> Palette
          </button>

          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent((c) => c + 1)}
              className="flex items-center gap-1 rounded-full bg-[#0F7BFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0C5AD9] min-h-[44px]"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowSubmit(true)}
              className="flex items-center gap-1 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 min-h-[44px]"
            >
              Submit
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
                      } ${isActive ? 'ring-2 ring-[#0F7BFF] ring-offset-1' : ''}`}
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
                className="rounded-full bg-[#0F7BFF] py-3 text-sm font-semibold text-white hover:bg-[#0C5AD9] transition-colors disabled:opacity-60"
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
