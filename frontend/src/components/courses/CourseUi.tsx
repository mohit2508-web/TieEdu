import React from 'react';
import Link from 'next/link';
import { Check, Lock, PlayCircle, FileText, ListChecks, Clock, Award } from 'lucide-react';
import type { CourseAccess, CourseLessonView, CourseProgress, CourseStats, LessonCompletionState } from '@/types';

// Shared learner-facing bits for the course engine. Kept in one place so the
// catalogue, the course page, the lesson player and /my-courses all render
// "locked" and "complete" the same way.

/**
 * Whether the learner may open this lesson right now.
 *
 * The server is the only authority on the gate and tells us directly via
 * `locked` on every lesson, stubbed or not. This must NOT be re-derived from
 * `state.ready`: `ready` answers "has the learner met this lesson's completion
 * requirements", which is false for every lesson they have not started yet.
 * Deriving the gate from it marks the whole rest of the course locked and
 * deadlocks the syllabus after lesson 1.
 *
 * The `ready` check below is only a fallback for a payload that predates the
 * flag, and it deliberately does not consider a completed lesson locked.
 */
export const isLocked = (lesson: CourseLessonView, progress: CourseProgress | null): boolean => {
  if (progress?.completed_lesson_ids?.includes(lesson.id)) return false;
  if (typeof lesson.locked === 'boolean') return lesson.locked;
  return false;
};

export const ProgressBar: React.FC<{ percent: number; label?: string }> = ({ percent, label }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          <span>{label}</span>
          <span className="tabular-nums">{clamped}%</span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface-hover)]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[var(--brand-sky)] transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

/**
 * One row in the syllabus.
 *
 * A locked lesson still shows its title and duration so the learner can see
 * what is ahead, but it is not a link — the syllabus is public, the content
 * behind it is not.
 */
export const LessonRow: React.FC<{
  lesson: CourseLessonView;
  courseSlug: string;
  locked: boolean;
  isNext?: boolean;
}> = ({ lesson, courseSlug, locked, isNext }) => {
  const state = lesson.state as LessonCompletionState;
  const done = state?.is_complete;
  const kind = (lesson as { kind?: string }).kind;

  const body = (
    <>
      <span
        className={[
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
          done
            ? 'border-transparent bg-[var(--color-success)] text-white'
            : locked
              ? 'border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] text-[var(--text-light)]'
              : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--brand-sky)]',
        ].join(' ')}
      >
        {done ? (
          <Check size={15} strokeWidth={3} />
        ) : locked ? (
          <Lock size={14} />
        ) : kind === 'quiz' ? (
          <ListChecks size={15} />
        ) : kind === 'reading' ? (
          <FileText size={15} />
        ) : (
          <PlayCircle size={15} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={[
              'truncate text-sm font-semibold',
              locked ? 'text-[var(--text-muted)]' : 'text-[var(--ink)]',
            ].join(' ')}
          >
            {lesson.title}
          </span>
          {isNext && !locked && !done && (
            <span className="shrink-0 rounded-full bg-[var(--brand-sky-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--brand-sky-strong)]">
              Next
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          {lesson.duration_minutes > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} /> {lesson.duration_minutes} min
            </span>
          )}
          {locked && !done && (
            <span>{lesson.lock_reason || 'Complete the previous lesson to unlock'}</span>
          )}
          {!locked && state && !done && state.quiz_best_percent != null && (
            <span>Best quiz score {state.quiz_best_percent}%</span>
          )}
        </span>
      </span>
    </>
  );

  if (locked) {
    return <div className="flex gap-3 rounded-xl px-3 py-3 opacity-70">{body}</div>;
  }

  return (
    <Link
      href={{ pathname: '/courses/[slug]', query: { slug: courseSlug, lesson: lesson.id } }}
      className="group flex gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--bg-surface-hover)]"
    >
      {body}
    </Link>
  );
};

export const CourseCardTile: React.FC<{ course: {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  level: string;
  is_free: boolean;
  price_inr?: number;
  tags: string[];
  stats: CourseStats;
  progress: CourseProgress | null;
  lock_reason: string | null;
  /**
   * The server's access verdict. Optional so a payload from before this field
   * existed still renders — absence is treated as "not known to be locked".
   */
  access?: CourseAccess;
} }> = ({ course }) => {
  const { progress } = course;
  const paid = !course.is_free && (course.price_inr || 0) > 0;
  // A course the learner has not bought is worth naming on the card, otherwise
  // the tile looks identical to a free one and the price only appears after a
  // click.
  const needsPurchase = paid && course.access?.granted === false;
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-raised)]"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-[var(--brand-sky-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky-strong)]">
          {course.category}
        </span>
        {course.is_free ? (
          <span className="rounded-full bg-[var(--bg-sky-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky)]">
            Free
          </span>
        ) : (
          <span className="rounded-full bg-[var(--bg-surface-hover)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {course.level}
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold leading-snug text-[var(--ink)] group-hover:text-[var(--brand-sky-strong)]">
        {course.title}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--text-body)]">
        {course.subtitle}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <FileText size={11} /> {course.stats.lesson_count} lessons
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={11} /> {course.stats.total_minutes} min
        </span>
        {course.stats.quiz_count > 0 && <span>{course.stats.quiz_count} quizzes</span>}
      </div>

      {progress?.enrolled ? (
        <div className="mt-4">
          {progress.is_complete ? (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-sky-soft)] px-3 py-2 text-xs font-bold text-[var(--brand-sky-strong)]">
              <Award size={14} /> Completed
            </div>
          ) : (
            <ProgressBar
              percent={progress.percent}
              label={`${progress.completed} of ${progress.total} done`}
            />
          )}
        </div>
      ) : (
        <div className="mt-4">
          {needsPurchase ? (
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-surface-hover)] px-3 py-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
                <Lock size={13} /> ₹{Math.round(course.price_inr || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">Buy to enrol</span>
            </div>
          ) : paid && course.access?.granted ? (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-sky-soft)] px-3 py-2 text-xs font-bold text-[var(--brand-sky-strong)]">
              <Check size={13} /> Yours — start any time
            </div>
          ) : (
            course.lock_reason && (
              <p className="text-[11px] italic text-[var(--text-muted)]">{course.lock_reason}</p>
            )
          )}
        </div>
      )}
    </Link>
  );
};
