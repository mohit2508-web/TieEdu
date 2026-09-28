import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PlayCircle, ListChecks, Check, X, Info, Lock, FileText } from 'lucide-react';
import { ContentBlockRenderer } from '@/components/blocks/ContentBlockRenderer';
import { reportLessonProgress, submitLessonQuiz } from '@/lib/coursesApi';
import type {
  CourseLessonView,
  CourseQuizQuestion,
  CourseQuizOutcome,
  CourseLessonBlock,
  LessonProgressResponse,
  LessonCompletionState,
} from '@/types';

const BEAT_MS = 5000;

/** A lesson the server actually opened: it carries blocks, a video, or a quiz. */
const isOpenLesson = (
  l: CourseLessonView
): l is CourseLessonView & {
  blocks?: CourseLessonBlock[];
  video?: { embed_url?: string; url: string; title: string } | null;
  quiz?: {
    id: string;
    question_count: number;
    passing_percent: number;
    questions?: CourseQuizQuestion[];
  } | null;
} => 'blocks' in l || 'video' in l || 'quiz' in l;

export const LessonPlayer: React.FC<{
  lesson: CourseLessonView;
  courseSlug: string;
  /** True when the server will accept a progress/quiz write for this lesson. */
  canSubmit: boolean;
  onProgress: (p: LessonProgressResponse) => void;
  /** Re-fetch the lesson after a state change (e.g. a graded quiz). */
  onLessonUpdated: () => void;
  onSignInRequired: () => void;
  /** Neighbours in course order, for prev/next navigation. */
  previousLesson?: { id: string; title: string } | null;
  nextLesson?: { id: string; title: string } | null;
  /** True once this lesson is finished and the next one is open. */
  complete?: boolean;
  onNavigate: (lessonId: string) => void;
}> = ({
  lesson,
  courseSlug,
  canSubmit,
  onProgress,
  onLessonUpdated,
  onSignInRequired,
  previousLesson,
  nextLesson,
  complete,
  onNavigate,
}) => {
  const beatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBeatAt = useRef<number>(0);
  const furthestWatched = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [rejectedNote, setRejectedNote] = useState<string | null>(null);
  const [beatError, setBeatError] = useState<string | null>(null);

  const state = lesson.state as LessonCompletionState;

  /**
   * A lesson with neither a video nor a quiz is gated on the learner actually
   * spending time reading it. Nothing on screen should have to be clicked for
   * that to progress, so the same heartbeat runs automatically while the lesson
   * is on screen. Everything else is driven by the play button.
   */
  const readGated = (state?.requirements || []).some((r) => r.key === 'read' && !r.met);

  // ---- watch-time heartbeats -------------------------------------------------
  // We deliberately do NOT try to read the video's currentTime. YouTube and
  // Vimeo only expose that cross-origin to a parent that owns the frame, so a
  // real duration cannot be trusted from JS. The server bounds whatever we send
  // against the author's own estimate and against real elapsed time, and tells us
  // how much it threw away — which we surface rather than hide.
  const beat = useCallback(
    async (deltaSeconds: number) => {
      if (!canSubmit) return;
      setBeatError(null);
      try {
        const res = await reportLessonProgress(lesson.id, {
          delta_seconds: Math.max(0, Math.round(deltaSeconds)),
          duration_seconds: furthestWatched.current,
        });
        onProgress(res);
        if (res.rejected_seconds > 0) {
          setRejectedNote(
            `We credited ${Math.round(res.credited_seconds)}s and ignored ${Math.round(
              res.rejected_seconds
            )}s of the extra time — progress is capped at real time.`
          );
        } else {
          setRejectedNote(null);
        }
      } catch (e) {
        const msg = (e as Error).message;
        if (/sign in/i.test(msg)) onSignInRequired();
        else setBeatError(msg);
      }
    },
    [lesson.id, canSubmit, onProgress, onSignInRequired]
  );

  useEffect(() => {
    const running = (playing || readGated) && canSubmit;
    if (!running) {
      if (beatTimer.current) {
        clearInterval(beatTimer.current);
        beatTimer.current = null;
      }
      return;
    }
    lastBeatAt.current = Date.now();
    beatTimer.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastBeatAt.current) / 1000;
      lastBeatAt.current = now;
      furthestWatched.current = furthestWatched.current + Math.min(delta, 20);
      void beat(Math.min(delta, 20));
    }, BEAT_MS);
    return () => {
      if (beatTimer.current) clearInterval(beatTimer.current);
      beatTimer.current = null;
    };
  }, [playing, readGated, canSubmit, beat]);

  // A tab switch or navigation must not bank the time spent away from the page.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && (playing || readGated)) {
        const delta = (Date.now() - lastBeatAt.current) / 1000;
        if (delta > 1) void beat(Math.min(delta, 20));
        setPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [playing, readGated, beat]);

  if (!state) return null;

  if (!isOpenLesson(lesson)) {
    return <LockNotice courseSlug={courseSlug} lesson={lesson} />;
  }

  const quiz = lesson.quiz;
  const video = lesson.video;

  return (
    <article>
      <header className="mb-6">
        <h2 className="text-2xl font-extrabold leading-snug tracking-tight text-[var(--ink)]">
          {lesson.title}
        </h2>
        {lesson.summary && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">{lesson.summary}</p>
        )}
      </header>

      {state.is_complete && (
        <Banner tone="success" icon={<Check size={15} strokeWidth={3} />}>
          Lesson complete. Nice work.
        </Banner>
      )}

      {video?.embed_url && (
        <section className="mb-6">
          <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-black">
            <iframe
              src={video.embed_url}
              title={video.title || lesson.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--text-muted)]">
              Keep the video playing to record progress. You need to watch{' '}
              <strong className="text-[var(--text-body)]">90%</strong> of it.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!canSubmit) return onSignInRequired();
                setPlaying((p) => !p);
              }}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                canSubmit
                  ? 'bg-[var(--brand-sky)] text-white hover:bg-[var(--brand-sky-strong)]'
                  : 'border border-[var(--border-subtle)] text-[var(--text-muted)]',
              ].join(' ')}
            >
              <PlayCircle size={14} />
              {playing ? 'Recording…' : 'Mark as watching'}
            </button>
          </div>
          {rejectedNote && (
            <p className="mt-2 rounded-lg bg-[var(--bg-sky-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--brand-sky-strong)]">
              {rejectedNote}
            </p>
          )}
          {beatError && (
            <p className="mt-2 text-[11px] text-[var(--color-error)]">{beatError}</p>
          )}
        </section>
      )}

      {(lesson.blocks || []).length > 0 && (
        <section className="mb-8 space-y-5">
          {(lesson.blocks || []).map((block) => (
            <ContentBlockRenderer key={block.id} block={block} />
          ))}
        </section>
      )}

      {readGated && (
        <p className="mb-6 flex items-center gap-2 rounded-lg bg-[var(--bg-sky-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--brand-sky-strong)]">
          <FileText size={13} className="shrink-0" />
          {state.read_percent >= 90
            ? 'Nearly there — keep reading to finish this lesson.'
            : 'This lesson counts the time you spend on it. Keep this tab open and reading; switching away stops the clock.'}
        </p>
      )}

      {quiz?.questions && quiz.questions.length > 0 && (
        <QuizForm
          lessonId={lesson.id}
          quizId={quiz.id}
          questions={quiz.questions}
          passingPercent={quiz.passing_percent}
          alreadyPassed={state.quiz_ok}
          onGraded={onLessonUpdated}
          onSignInRequired={onSignInRequired}
        />
      )}

      {(previousLesson || nextLesson) && (
        <nav
          aria-label="Lesson navigation"
          className="mt-8 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:items-stretch sm:justify-between"
        >
          {previousLesson ? (
            <button
              type="button"
              onClick={() => onNavigate(previousLesson.id)}
              className="focus-ring min-h-[2.75rem] rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-left text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-surface-hover)] sm:max-w-[48%]"
            >
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Previous
              </span>
              <span className="mt-0.5 block truncate">{previousLesson.title}</span>
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}

          {nextLesson ? (
            <button
              type="button"
              onClick={() => onNavigate(nextLesson.id)}
              disabled={!complete}
              title={complete ? undefined : 'Finish this lesson to unlock the next one.'}
              className="focus-ring min-h-[2.75rem] rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-left text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[48%] sm:text-right"
            >
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Next
              </span>
              <span className="mt-0.5 flex items-center justify-end gap-1.5 truncate">
                {!complete && <Lock size={12} className="shrink-0" />}
                <span className="truncate">{nextLesson.title}</span>
              </span>
            </button>
          ) : (
            <span className="text-sm text-[var(--text-muted)] sm:text-right">
              {complete ? 'That was the last lesson.' : 'Finish this one to continue.'}
            </span>
          )}
        </nav>
      )}
    </article>
  );
};

// --- quiz -------------------------------------------------------------------

const QuizForm: React.FC<{
  lessonId: string;
  quizId: string;
  questions: CourseQuizQuestion[];
  passingPercent: number;
  alreadyPassed: boolean;
  /** Called after an attempt has been graded, so the parent can refresh state. */
  onGraded: () => void;
  onSignInRequired: () => void;
}> = ({ lessonId, questions, passingPercent, alreadyPassed, onGraded, onSignInRequired }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [outcome, setOutcome] = useState<CourseQuizOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await submitLessonQuiz(lessonId, answers);
      setOutcome(res.result);
      onGraded();
    } catch (e) {
      const msg = (e as Error).message;
      if (/sign in/i.test(msg)) onSignInRequired();
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const answeredAll = questions.every((q) => answers[q.id] !== undefined);

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
      <div className="mb-4 flex items-center gap-2">
        <ListChecks size={17} className="text-[var(--brand-sky)]" />
        <h3 className="text-base font-bold text-[var(--ink)]">
          {questions.length} questions
        </h3>
        <span className="text-[11px] text-[var(--text-muted)]">
          {passingPercent}% to pass
        </span>
      </div>

      {outcome ? (
        <div>
          <div
            className={[
              'rounded-xl px-4 py-3 text-sm font-bold',
              outcome.passed
                ? 'bg-[var(--bg-sky-soft)] text-[var(--color-success)]'
                : 'bg-[var(--color-error)]/5 text-[var(--color-error)]',
            ].join(' ')}
          >
            You scored {outcome.score_percent}%.{' '}
            {outcome.passed
              ? 'Passed — this lesson is done.'
              : `You need ${passingPercent}%. Have another go.`}
            {outcome.is_best_attempt && !outcome.passed && ` Best so far: ${outcome.best_percent}%.`}
          </div>

          <ol className="mt-4 space-y-4">
            {outcome.results.map((r, i) => (
              <li key={r.id} className="rounded-lg border border-[var(--border-subtle)] p-3">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {i + 1}. {r.prompt}
                </p>
                <p
                  className={[
                    'mt-1.5 flex items-center gap-1.5 text-xs font-bold',
                    r.correct ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]',
                  ].join(' ')}
                >
                  {r.correct ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                  {r.correct
                    ? 'Correct'
                    : `Correct answer: ${questions[i]?.options?.[r.correct_index] ?? '—'}`}
                </p>
                {r.explanation && (
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-body)]">
                    {r.explanation}
                  </p>
                )}
              </li>
            ))}
          </ol>

          {!outcome.passed && (
            <button
              type="button"
              onClick={() => { setOutcome(null); setAnswers({}); }}
              className="mt-4 rounded-lg border border-[var(--border-strong)] px-4 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--bg-surface-hover)]"
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        <div>
          {questions.map((q, qi) => (
            <fieldset key={q.id} className="mb-5 last:mb-0">
              <legend className="mb-2 text-sm font-semibold text-[var(--ink)]">
                {qi + 1}. {q.prompt}
              </legend>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi;
                  return (
                    <label
                      key={oi}
                      className={[
                        'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                        selected
                          ? 'border-[var(--brand-sky)] bg-[var(--brand-sky-soft)]'
                          : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={selected}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                        className="mt-0.5 accent-[var(--brand-sky)]"
                      />
                      <span className="text-[var(--text-body)]">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {error && <p className="mb-3 text-xs text-[var(--color-error)]">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={!answeredAll || busy}
            className="rounded-lg bg-[var(--brand-sky)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-sky-strong)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Marking…' : alreadyPassed ? 'Submit again' : 'Submit answers'}
          </button>
          {!answeredAll && (
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">Answer every question to submit.</p>
          )}
        </div>
      )}
    </section>
  );
};

// --- shared bits ------------------------------------------------------------

const Banner: React.FC<{ tone: 'success'; icon: React.ReactNode; children: React.ReactNode }> = ({
  tone,
  icon,
  children,
}) => (
  <div
    className={[
      'mb-5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold',
      tone === 'success' ? 'bg-[var(--bg-sky-soft)] text-[var(--color-success)]' : '',
    ].join(' ')}
  >
    {icon}
    {children}
  </div>
);

const LockNotice: React.FC<{ courseSlug: string; lesson: CourseLessonView }> = ({ lesson }) => (
  <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] p-8 text-center">
    <Lock size={22} className="mx-auto text-[var(--text-light)]" />
    <h3 className="mt-3 text-base font-bold text-[var(--ink)]">{lesson.title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
      This lesson unlocks when you finish the one before it. That order is the point — it is what
      the progress on your certificate is based on.
    </p>
  </div>
);
