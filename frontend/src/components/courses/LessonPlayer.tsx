import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ListChecks, Check, X, Lock, FileText } from 'lucide-react';
import { ContentBlockRenderer } from '@/components/blocks/ContentBlockRenderer';
import { TrackedVideoPlayer } from '@/components/courses/TrackedVideoPlayer';
import { MobileSegmentReader, type LessonSegment } from '@/components/courses/MobileSegmentReader';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { readLessonSegment, writeLessonSegment } from '@/lib/lessonSegments';
import { reportLessonProgress, submitLessonQuiz } from '@/lib/coursesApi';
import type {
  CourseLessonView,
  CourseQuizQuestion,
  CourseQuizOutcome,
  CourseLessonBlock,
  LessonProgressResponse,
  LessonCompletionState,
  VideoProvider,
} from '@/types';

const BEAT_MS = 5000;

/**
 * A lesson the server actually opened: it carries blocks, a video, or a quiz.
 * `provider` and `video_id` matter as much as `embed_url` — the tracked player
 * needs to know which player's API to talk to.
 */
const isOpenLesson = (
  l: CourseLessonView
): l is CourseLessonView & {
  blocks?: CourseLessonBlock[];
  video?: {
    provider?: VideoProvider;
    video_id?: string;
    embed_url?: string;
    url: string;
    title: string;
    duration_minutes?: number;
  } | null;
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
  onProgress: (p: LessonProgressResponse, lessonId?: number | string) => void;
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
  const [playing, setPlaying] = useState(false);
  const [rejectedNote, setRejectedNote] = useState<string | null>(null);
  const [beatError, setBeatError] = useState<string | null>(null);

  /**
   * The playhead and player duration, held in refs because the heartbeat reads
   * them on a timer rather than on render. `reportedDuration` is the real
   * duration the player reports (not a value we invented); the server still
   * bounds it, and `positionSeconds` is only ever a resume hint.
   */
  const reportedDuration = useRef<number>(0);
  const positionSeconds = useRef<number>(0);

  const state = lesson.state as LessonCompletionState;

  /**
   * A lesson with neither a video nor a quiz is gated on the learner actually
   * spending time reading it. Nothing on screen should have to be clicked for
   * that to progress, so the same heartbeat runs automatically while the lesson
   * is on screen. Video lessons are driven by real playback instead.
   */
  const readGated = (state?.requirements || []).some((r) => r.key === 'read' && !r.met);

  // ---- mobile segment reader (Part G, "no long pages") ----------------------
  // On phones a lesson is a sequence of one-step-at-a-time cards — video,
  // each block, quiz — with swipe/Next and a resume point. Desktop keeps the
  // continuous layout; both render the same data, so there is one source of
  // truth. `useMediaQuery` starts false (SSR-safe) and flips after hydration,
  // which means the first paint is always the desktop tree.
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [segIndex, setSegIndex] = useState(0);

  // Cheap counts for mode decisions, computed without narrowing the whole
  // lesson: locked lessons and signed-out previews simply have zero segments.
  const openForSegments = isOpenLesson(lesson);
  const videoSegmentable =
    openForSegments && !!lesson.video?.embed_url && !!lesson.video.provider;
  const quizSegmentable =
    openForSegments && !!(lesson.quiz?.questions && lesson.quiz.questions.length > 0);
  const blockList: CourseLessonBlock[] = openForSegments ? lesson.blocks || [] : [];
  const segmentCount = (videoSegmentable ? 1 : 0) + blockList.length + (quizSegmentable ? 1 : 0);
  const inSegmentMode = isMobile && segmentCount > 1;

  // Reopening a lesson resumes at the last step the learner was on (per-device
  // convenience only — completion stays server-owned). Runs on lesson change;
  // clamping against the live segment count happens at render.
  useEffect(() => {
    const saved = readLessonSegment(lesson.id);
    setSegIndex(saved !== null ? saved : 0);
  }, [lesson.id]);

  // ---- watch-time heartbeats -------------------------------------------------
  // The player reports its own real duration and playhead, so unlike the old
  // blind "Mark as watching" button this reflects actual playback. The credit
  // itself is still the server's to grant: it clamps the delta against real
  // elapsed time and the duration against the author's estimate, and tells us
  // how much it threw away — which we surface rather than hide.
  const beat = useCallback(
    async (deltaSeconds: number) => {
      if (!canSubmit) return;
      setBeatError(null);
      try {
        const res = await reportLessonProgress(lesson.id, {
          delta_seconds: Math.max(0, Math.round(deltaSeconds)),
          duration_seconds: Math.round(reportedDuration.current),
          position_seconds: Math.round(positionSeconds.current),
        });
        /*
         * The lesson id travels with the response. `LessonCompletionState` has no
         * field identifying which lesson it describes, and the page needs that to
         * apply the state to the right row: a heartbeat is a round-trip, so by the
         * time it lands the student may already be reading a different lesson.
         */
        onProgress(res, lesson.id);
        // The server may refuse the position outright (rate limit, missing
        // duration). Trust its answer, not ours, or the next resume lands
        // somewhere the learner never actually reached.
        if (typeof res.position_seconds === 'number') {
          positionSeconds.current = res.position_seconds;
        }
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
      void beat(Math.min(delta, 20));
    }, BEAT_MS);
    return () => {
      if (beatTimer.current) clearInterval(beatTimer.current);
      beatTimer.current = null;
    };
  }, [playing, readGated, canSubmit, beat]);

  // A tab switch must not silently drop the seconds already earned. Flush the
  // pending beat so the watch time (and the resume point) is banked before the
  // page goes away. Note this does *not* stop the heartbeat: a video playing in a
  // background tab is genuinely being watched, and the server still caps credit
  // at real elapsed time.
  useEffect(() => {
    const flush = () => {
      if (!canSubmit) return;
      if (!(playing || readGated)) return;
      const delta = (Date.now() - lastBeatAt.current) / 1000;
      if (delta <= 1) return;
      lastBeatAt.current = Date.now();
      void beat(Math.min(delta, 20));
    };
    const onVisibility = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    // Also on unmount: navigating between lessons inside the SPA tears this
    // component down without ever hiding the document.
    return () => {
      flush();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [playing, readGated, canSubmit, beat]);

  if (!state) return null;

  if (!isOpenLesson(lesson)) {
    return <LockNotice courseSlug={courseSlug} lesson={lesson} />;
  }

  const quiz = lesson.quiz;
  const video = lesson.video;

  const videoSection =
    video?.embed_url && video.provider ? (
      <section className="mb-6">
        <TrackedVideoPlayer
          provider={video.provider}
          embedUrl={video.embed_url}
          title={video.title || lesson.title}
          watchedSeconds={state.video_watched_seconds || 0}
          durationSeconds={state.video_duration_seconds || 0}
          positionSeconds={state.video_position_seconds || 0}
          watchPercent={state.video_percent || 0}
          requiredPercent={state.watch_required_percent || 90}
          isComplete={state.video_ok}
          canSubmit={canSubmit}
          onSignInRequired={onSignInRequired}
          onPlayingChange={setPlaying}
          onTimeUpdate={(position, duration) => {
            if (duration > 0) reportedDuration.current = duration;
            positionSeconds.current = position;
          }}
        />
        {rejectedNote && (
          <p className="mt-2 rounded-lg bg-[var(--bg-sky-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--brand-sky-strong)]">
            {rejectedNote}
          </p>
        )}
        {beatError && <p className="mt-2 text-[11px] text-[var(--color-error)]">{beatError}</p>}
      </section>
    ) : null;

  const quizSection = quiz?.questions && quiz.questions.length > 0 ? (
    <QuizForm
      lessonId={lesson.id}
      quizId={quiz.id}
      questions={quiz.questions}
      passingPercent={quiz.passing_percent}
      alreadyPassed={state.quiz_ok}
      onGraded={onLessonUpdated}
      onSignInRequired={onSignInRequired}
      // One question at a time on phones — a full quiz list is exactly the
      // "long page" this player exists to avoid. Desktop keeps all-at-once.
      oneAtATime={isMobile}
    />
  ) : null;

  // One lesson, two presentations of the same data. Segments order: video,
  // every content block, quiz. The summary jump targets the authored summary
  // block when the lesson has one; no summary, no false affordance.
  const segments: LessonSegment[] = [];
  if (videoSection) {
    segments.push({ id: 'video', label: 'Watch', render: () => videoSection });
  }
  blockList.forEach((block) => {
    segments.push({
      id: `b:${block.id}`,
      label: blockSegmentLabel(block),
      render: () => <ContentBlockRenderer key={block.id} block={block} />,
    });
  });
  if (quizSection) {
    segments.push({ id: 'quiz', label: 'Quiz', render: () => quizSection });
  }
  const summaryBlockPos = blockList.findIndex((b) => b.block_type === 'summary');
  const summarySegIndex =
    summaryBlockPos === -1 ? null : (videoSection ? 1 : 0) + summaryBlockPos;
  const safeSeg = Math.min(Math.max(0, segIndex), Math.max(0, segmentCount - 1));
  const atLastSegment = safeSeg >= segmentCount - 1;
  const goSegment = (next: number) => {
    const clamped = Math.min(Math.max(0, next), Math.max(0, segmentCount - 1));
    setSegIndex(clamped);
    writeLessonSegment(lesson.id, clamped);
  };

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

      {inSegmentMode ? (
        <div className="mb-8">
          <MobileSegmentReader
            segments={segments}
            index={safeSeg}
            onIndexChange={goSegment}
            minutes={lesson.duration_minutes || null}
            summaryIndex={summarySegIndex}
          />
        </div>
      ) : (
        <>
          {videoSection}

          {blockList.length > 0 && (
            <section className="mb-8 space-y-5">
              {blockList.map((block) => (
                <ContentBlockRenderer key={block.id} block={block} />
              ))}
            </section>
          )}

          {quizSection}
        </>
      )}

      {readGated && (
        <p className="mb-6 flex items-center gap-2 rounded-lg bg-[var(--bg-sky-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--brand-sky-strong)]">
          <FileText size={13} className="shrink-0" />
          {state.read_percent >= 90
            ? 'Nearly there — keep reading to finish this lesson.'
            : 'This lesson counts the time you spend on it. Keep this tab open and reading; switching away stops the clock.'}
        </p>
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

      {/* The mobile bottom bar - Phase 4, §4.1, segment-aware in 3c.
          Owned by the player, not the page: the page's enrolment bar returns null
          once the learner is enrolled precisely so these two cannot both claim
          the bottom of the screen.

          On a phone the video is 16:9 and edge to edge, so the inline nav above
          sits well below the fold by the time anyone has watched anything - the
          one control a learner wants after a lesson was the one they had to
          scroll for. This is the same "primary action stays in reach" fix as the
          enrolment bar, aimed at a different action.

          While a multi-step lesson is open on a phone, the primary action is
          "Next step" until the last step, then it becomes the next-lesson
          control — the bar always offers the one thing to do next, never two.
          Mid-steps the control does not wait for completion: a step is free to
          open, only the *lesson* gate unlocks the next lesson.

          It is hidden from `md` up, where the inline nav is already beside the
          video rather than under it.

          While the lesson is incomplete the control is disabled and the note
          says how much is left, so the bar is honest about the gate instead of
          offering a button that does nothing. The percentage is only shown when
          there is one to show: a signed-out viewer has no progress to report. */}
      {(nextLesson || inSegmentMode) && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] md:hidden">
          <div className="mx-auto flex w-full max-w-[var(--reader-max)] items-center gap-3">
            {previousLesson || (inSegmentMode && safeSeg > 0) ? (
              <button
                type="button"
                onClick={() => {
                  if (inSegmentMode && safeSeg > 0) goSegment(safeSeg - 1);
                  else if (previousLesson) onNavigate(previousLesson.id);
                }}
                aria-label={inSegmentMode && safeSeg > 0 ? 'Previous step' : 'Previous lesson'}
                className="focus-ring flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink)] transition-colors active:bg-[var(--bg-surface-hover)]"
              >
                <ChevronLeft size={20} />
              </button>
            ) : null}

            <div className="min-w-0 flex-1">
              {inSegmentMode && !atLastSegment ? (
                <button
                  type="button"
                  onClick={() => goSegment(safeSeg + 1)}
                  className="focus-ring mt-0.5 flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl bg-[var(--brand-sky)] px-4 text-sm font-bold text-white transition-colors active:opacity-90"
                >
                  <span className="min-w-0 truncate">
                    Next step · {safeSeg + 2} of {segmentCount}
                  </span>
                  <ChevronRight size={18} className="flex-none" />
                </button>
              ) : (
                <>
                  {complete && nextLesson && (
                    <p className="truncate text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                      Up next
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (nextLesson) onNavigate(nextLesson.id); }}
                    disabled={!complete || !nextLesson}
                    className={`focus-ring mt-0.5 flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      complete && nextLesson
                        ? 'bg-[var(--brand-sky)] text-white active:opacity-90'
                        : 'border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink)]'
                    }`}
                  >
                    <span className="min-w-0 truncate">
                      {!nextLesson
                        ? 'That was the last lesson'
                        : complete
                          ? nextLesson.title
                          : 'Finish this lesson to continue'}
                    </span>
                    {complete && nextLesson ? (
                      <ChevronRight size={18} className="flex-none" />
                    ) : (
                      <Lock size={16} className="flex-none" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reserve the bar's height so the last thing in the lesson - a transcript,
          a quiz, a mark-complete notice - is not sitting underneath it. */}
      {(nextLesson || inSegmentMode) && <div aria-hidden="true" className="h-28 md:hidden" />}
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
  /** Phones show one question at a time; desktop keeps the full list. */
  oneAtATime?: boolean;
}> = ({ lessonId, questions, passingPercent, alreadyPassed, onGraded, onSignInRequired, oneAtATime = false }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [outcome, setOutcome] = useState<CourseQuizOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Focus mode: which question is on screen. Reset with the answers so a retry
  // starts at question one again.
  const [focusedQ, setFocusedQ] = useState(0);

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
              onClick={() => { setOutcome(null); setAnswers({}); setFocusedQ(0); }}
              className="mt-4 rounded-lg border border-[var(--border-strong)] px-4 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--bg-surface-hover)]"
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        <div>
          {oneAtATime ? (
            <>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Question {focusedQ + 1} of {questions.length}
              </p>
              {(() => {
                const q = questions[focusedQ];
                if (!q) return null;
                return (
                  <fieldset key={q.id} className="last:mb-0">
                    <legend className="mb-2 text-sm font-semibold text-[var(--ink)]">
                      {focusedQ + 1}. {q.prompt}
                    </legend>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => {
                        const selected = answers[q.id] === oi;
                        return (
                          <label
                            key={oi}
                            className={[
                              'flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
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
                );
              })()}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFocusedQ((i) => Math.max(0, i - 1))}
                  disabled={focusedQ === 0}
                  className="focus-ring min-h-[44px] rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm font-bold text-[var(--ink)] disabled:opacity-40"
                >
                  Back
                </button>
                {focusedQ < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setFocusedQ((i) => Math.min(questions.length - 1, i + 1))}
                    disabled={answers[questions[focusedQ]?.id] === undefined}
                    className="focus-ring min-h-[44px] flex-1 rounded-lg bg-[var(--brand-sky)] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next question
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!answeredAll || busy}
                    className="focus-ring min-h-[44px] flex-1 rounded-lg bg-[var(--brand-sky)] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? 'Marking…' : alreadyPassed ? 'Submit again' : 'Submit answers'}
                  </button>
                )}
              </div>
              {focusedQ === questions.length - 1 && !answeredAll && (
                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  Answer every question to submit — use Back to fill any you skipped.
                </p>
              )}
            </>
          ) : (
            questions.map((q, qi) => (
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
            ))
          )}

          {error && <p className="mb-3 text-xs text-[var(--color-error)]">{error}</p>}

          {!oneAtATime && (
            <>
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
            </>
          )}
        </div>
      )}
    </section>
  );
};

// --- shared bits ------------------------------------------------------------

/** Friendly step label for a content block in the mobile segment reader. */
const BLOCK_SEGMENT_LABELS: Partial<Record<CourseLessonBlock['block_type'], string>> = {
  objective: 'Objective',
  callout: 'Key idea',
  markdown: 'Read',
  diagram: 'Diagram',
  image: 'Picture',
  code: 'Code',
  table: 'Table',
  worked_example: 'Worked example',
  try_it: 'Try it',
  numerical: 'Try it',
  sim: 'Simulator',
  mistakes: 'Common mistakes',
  exam_angle: 'Exam angle',
  summary: 'Summary',
  checklist: 'Checklist',
  resources: 'Resources',
  steps: 'Steps',
  audio: 'Listen',
  video: 'Watch',
  video_link: 'Watch',
  animation: 'Animation',
};

const blockSegmentLabel = (block: CourseLessonBlock): string => {
  const titled = block.payload?.title?.trim();
  if (titled) return titled;
  return BLOCK_SEGMENT_LABELS[block.block_type] || 'Content';
};

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
