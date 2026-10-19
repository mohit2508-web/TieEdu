import React from 'react';
import { ClipboardCheck, Award, Send, RotateCcw, Lock, PlayCircle } from 'lucide-react';
import type { ModuleTestSummary, ModuleTestState } from '@/types';
import {
  startModuleTest,
  submitModuleTest,
  type ModuleTestQuestionView,
} from '@/lib/coursesApi';

/**
 * The end-of-module test card and player.
 *
 * Same discipline as the final exam — prompts and options come from the server,
 * answers go back, the server grades — but untimed, per-module, and gated on
 * the module's own lessons rather than the whole course. It never gates a
 * certificate; the certificate is the final exam's job. This card is the
 * checkpoint that catches a learner before they reach the exam with holes in
 * their understanding.
 *
 * Renders nothing when the module has no test.
 */
export const ModuleTestCard: React.FC<{
  courseSlug: string;
  moduleId: string;
  moduleTitle: string;
  test: ModuleTestSummary | null | undefined;
  onComplete?: () => void;
}> = ({ courseSlug, moduleId, moduleTitle, test, onComplete }) => {
  const [questions, setQuestions] = React.useState<ModuleTestQuestionView[]>([]);
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
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
  const [state, setState] = React.useState<ModuleTestState | null>(test?.state ?? null);

  React.useEffect(() => {
    setState(test?.state ?? null);
  }, [test?.state]);

  if (!test) return null;

  const taking = !!attemptId && !result;
  const effective = state ?? test.state;

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await startModuleTest(courseSlug, moduleId);
      setQuestions(res.questions);
      setAttemptId(res.attempt_id);
      setAnswers({});
      setResult(null);
      if (res.state) setState(res.state);
    } catch (e: any) {
      setError(e?.message || 'Could not start the module test');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!attemptId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitModuleTest(courseSlug, moduleId, attemptId, answers);
      setResult(res.result);
      setState(res.state);
      onComplete?.();
    } catch (e: any) {
      setError(e?.message || 'Could not submit the module test');
    } finally {
      setBusy(false);
    }
  };

  const answered = questions.filter((q) => answers[q.id] !== undefined).length;

  if (result) {
    return (
      <section className="mb-6 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center gap-2">
          <Award size={16} className="text-[var(--brand-sky)]" />
          <h3 className="text-base font-bold text-[var(--ink)]">
            Module test — {moduleTitle}
          </h3>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-extrabold tabular-nums text-[var(--ink)]">
            {result.score_percent}%
          </span>
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
          </span>
        </div>
        {!result.passed && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {test.retake_cooldown_hours > 0
              ? `You can retake after a ${test.retake_cooldown_hours}-hour cooldown.`
              : 'You can retake whenever you like — once you pass, the result stands.'}
          </p>
        )}
        <ul className="mt-4 space-y-2.5">
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
                  Your answer:{' '}
                  {r.chosen_index >= 0 ? `option ${r.chosen_index + 1}` : 'blank'}
                </p>
              )}
              {r.explanation && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">{r.explanation}</p>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setAttemptId(null);
              setQuestions([]);
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3.5 py-2 text-sm font-bold text-[var(--ink)] hover:bg-[var(--bg-surface-hover)]"
          >
            Back to module
          </button>
        </div>
      </section>
    );
  }

  if (taking) {
    return (
      <section className="mb-6 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={16} className="text-[var(--brand-sky)]" />
          <h3 className="text-base font-bold text-[var(--ink)]">
            Module test — {moduleTitle}
          </h3>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {answered} of {questions.length} answered · pass mark {test.passing_percent}%
        </p>
        <ol className="mt-4 space-y-4">
          {questions.map((q, i) => (
            <li
              key={q.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] p-4"
            >
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
                      name={`${moduleId}-${q.id}`}
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-60"
          >
            <Send size={14} /> {busy ? 'Submitting…' : 'Submit test'}
          </button>
        </div>
      </section>
    );
  }

  // Idle: the card that explains the checkpoint and starts it.
  const passed = effective?.passed === true;
  const lessonsDone = effective?.lessons_complete !== false;
  const canStart = effective?.can_start === true;

  return (
    <section className="mb-6 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center gap-2">
        {canStart || passed ? (
          <PlayCircle size={16} className="text-[var(--brand-sky)]" />
        ) : (
          <Lock size={16} className="text-[var(--text-muted)]" />
        )}
        <h3 className="text-base font-bold text-[var(--ink)]">
          Module test — {moduleTitle}
        </h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">
        {test.question_count} questions · pass mark {test.passing_percent}%
        {test.bank_size > test.question_count
          ? ` · drawn from a bank of ${test.bank_size}`
          : ''}
        . A checkpoint on this module before you move on.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
        {effective?.best_percent != null && <span>Best: {effective.best_percent}%</span>}
        {effective?.attempts_count != null && effective.attempts_count > 0 && (
          <span>{effective.attempts_count} attempt(s)</span>
        )}
        {passed && (
          <span className="rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 font-bold text-[var(--color-success)]">
            Passed
          </span>
        )}
        {effective?.cooldown_until && (
          <span>Retake available {new Date(effective.cooldown_until).toLocaleString()}</span>
        )}
      </div>
      {error && (
        <p className="mt-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-3 py-2 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {canStart && (
          <button
            type="button"
            onClick={begin}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-60"
          >
            <ClipboardCheck size={14} />{' '}
            {busy ? 'Starting…' : effective && effective.attempts_count > 0 ? 'Retake test' : 'Start test'}
          </button>
        )}
        {!canStart && !lessonsDone && (
          <p className="text-xs text-[var(--text-muted)]">
            Finish every lesson in this module to unlock its test.
          </p>
        )}
        {!canStart && passed && (
          <p className="text-xs text-[var(--text-muted)]">
            You have already passed this module test — well done.
          </p>
        )}
        {!canStart && !passed && lessonsDone && effective?.cooldown_until && (
          <p className="text-xs text-[var(--text-muted)]">
            The cooldown ends {new Date(effective.cooldown_until).toLocaleString()}.
          </p>
        )}
        {!canStart && !passed && !lessonsDone && effective?.in_progress && (
          <p className="text-xs text-[var(--text-muted)]">
            Finish the remaining lessons to submit your attempt.
          </p>
        )}
      </div>
    </section>
  );
};

export default ModuleTestCard;
