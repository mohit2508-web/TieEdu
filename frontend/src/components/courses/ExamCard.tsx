import React from 'react';
import { useRouter } from 'next/router';
import { ClipboardCheck, Timer, Award, Send, RotateCcw } from 'lucide-react';
import type { ExamState } from '@/types';
import { startExam, submitExam, type ExamQuestionView } from '@/lib/coursesApi';

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

function timerLabel(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * The final-exam card and player.
 *
 * The whole flow reuses the quiz's discipline: prompts and options come from
 * the server, answers go back, and the server reports the score. This component
 * never sees `correct_index` before submitting, so a learner reading the DOM
 * learns nothing the timer does not already tell them.
 *
 * Renders nothing at all when the course has no exam.
 */
export const ExamCard: React.FC<{
  courseSlug: string;
  exam: ExamState | null;
  onComplete?: () => void;
}> = ({ courseSlug, exam, onComplete }) => {
  const router = useRouter();
  const [questions, setQuestions] = React.useState<ExamQuestionView[]>([]);
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [startedAt, setStartedAt] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    score_percent: number;
    passed: boolean;
    passing_percent: number;
    results: {
      id: string;
      prompt: string;
      correct_index: number;
      chosen_index: number;
      correct: boolean;
      explanation: string;
    }[];
  } | null>(null);
  const [now, setNow] = React.useState(Date.now());

  const examEnded = !!result;
  const expiresAt = React.useMemo(() => {
    if (!startedAt || !exam) return null;
    return new Date(startedAt).getTime() + Math.max(1, exam.duration_minutes) * 60_000;
  }, [startedAt, exam]);

  React.useEffect(() => {
    if (!attemptId || examEnded || !expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [attemptId, examEnded, expiresAt]);

  if (!exam) return null;

  const msLeft = expiresAt ? expiresAt - now : 0;
  const taking = !!attemptId && !examEnded;

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await startExam(courseSlug);
      setQuestions(res.questions);
      setAttemptId(res.attempt_id);
      setStartedAt(res.started_at);
      setAnswers({});
      setResult(null);
    } catch (e: any) {
      setError(e?.message || 'Could not start the exam');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!attemptId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitExam(courseSlug, attemptId, answers);
      setResult(res.result);
      onComplete?.();
    } catch (e: any) {
      setError(e?.message || 'Could not submit the exam');
    } finally {
      setBusy(false);
    }
  };

  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const lowTime = taking && msLeft <= 60_000;

  if (examEnded && result) {
    return (
      <section className="mb-8 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-[var(--brand-sky)]" />
          <h2 className="text-lg font-bold text-[var(--ink)]">Exam result</h2>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-extrabold tabular-nums text-[var(--ink)]">{result.score_percent}%</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
              result.passed
                ? 'bg-[var(--bg-sky-soft)] text-[var(--color-success)]'
                : 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
            }`}
          >
            {result.passed ? 'Passed' : 'Not passed'}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Pass mark {result.passing_percent}%
            {exam.distinction_percent > 0 ? ` · Distinction ${exam.distinction_percent}%` : ''}
          </span>
        </div>
        {!result.passed && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {exam.retake_cooldown_hours > 0
              ? `You can retake after a ${exam.retake_cooldown_hours}-hour cooldown.`
              : 'You can start a fresh attempt whenever you like.'}
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {result.results.map((r) => (
            <li
              key={r.id}
              className={`rounded-lg border p-3 text-sm ${
                r.correct
                  ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
                  : 'border-[var(--color-error)]/30 bg-[var(--color-error)]/5'
              }`}
            >
              <p className="font-semibold text-[var(--ink)]">{r.prompt}</p>
              {!r.correct && (
                <p className="mt-1 text-xs text-[var(--text-body)]">
                  Your answer: {r.chosen_index >= 0 ? `option ${r.chosen_index + 1}` : 'blank'}
                </p>
              )}
              {r.explanation && <p className="mt-1 text-xs text-[var(--text-muted)]">{r.explanation}</p>}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          {!result.passed && exam.can_start && (
            <button
              type="button"
              onClick={begin}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-60"
            >
              <RotateCcw size={14} /> Retake exam
            </button>
          )}
        </div>
      </section>
    );
  }

  if (taking) {
    return (
      <section className="mb-8 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-[var(--brand-sky)]" />
            <h2 className="text-lg font-bold text-[var(--ink)]">Final exam</h2>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-extrabold tabular-nums ${
              lowTime ? 'bg-[var(--color-error)]/10 text-[var(--color-error)]' : 'bg-[var(--bg-surface-hover)] text-[var(--ink)]'
            }`}
            aria-live="polite"
          >
            <Timer size={14} /> {timerLabel(msLeft)}
          </div>
        </div>

        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {answered} of {questions.length} answered · pass mark {exam.passing_percent}%
        </p>

        <ol className="mt-5 space-y-5">
          {questions.map((q, i) => (
            <li key={q.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] p-4">
              <p className="text-sm font-semibold text-[var(--ink)]">
                {i + 1}. {q.prompt}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm transition-colors ${
                      answers[q.id] === idx
                        ? 'border-[var(--brand-sky)] bg-[var(--brand-sky-soft)]'
                        : 'border-[var(--border-subtle)] bg-white hover:border-[var(--brand-sky)]/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === idx}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                      className="mt-0.5"
                    />
                    <span className="text-[var(--text-body)]">{opt}</span>
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>

        {error && (
          <p className="mt-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-3 py-2 text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={finish}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-60"
          >
            <Send size={14} /> {busy ? 'Submitting…' : 'Submit exam'}
          </button>
        </div>
      </section>
    );
  }

  // Idle: the card that sells the exam and starts it.
  return (
    <section className="mb-8 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={18} className="text-[var(--brand-sky)]" />
        <h2 className="text-lg font-bold text-[var(--ink)]">Final exam</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">
        {exam.question_count} questions in {exam.duration_minutes} minutes · pass mark {exam.passing_percent}%
        {exam.distinction_percent > 0 ? ` · ${exam.distinction_percent}%+ on the first attempt earns Distinction` : ''}.
        {exam.bank_size > exam.question_count ? ` Drawn fresh from a bank of ${exam.bank_size}.` : ''}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
        {exam.best_percent != null && <span>Best: {exam.best_percent}%</span>}
        {exam.attempts_count > 0 && <span>{exam.attempts_count} attempt(s)</span>}
        {exam.passed && (
          <span className="rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 font-bold text-[var(--color-success)]">
            Passed
          </span>
        )}
        {exam.cooldown_until && (
          <span>Retake available {new Date(exam.cooldown_until).toLocaleString()}</span>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-3 py-2 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {exam.can_start && (
          <button
            type="button"
            onClick={begin}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-60"
          >
            <ClipboardCheck size={14} /> {busy ? 'Starting…' : exam.attempts_count > 0 ? 'Start attempt' : 'Start exam'}
          </button>
        )}
        {!exam.can_start && !exam.passed && exam.cooldown_until && (
          <p className="text-xs text-[var(--text-muted)]">
            You have used an attempt. The cooldown ends {new Date(exam.cooldown_until).toLocaleString()}.
          </p>
        )}
        {!exam.can_start && exam.passed && (
          <p className="text-xs text-[var(--text-muted)]">
            You have already passed this exam — your certificate is ready to claim below.
          </p>
        )}
        {!exam.can_start && !exam.passed && !exam.cooldown_until && !exam.in_progress && (
          <p className="text-xs text-[var(--text-muted)]">The exam opens once every lesson is complete.</p>
        )}
      </div>
    </section>
  );
};

export default ExamCard;
