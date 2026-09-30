import React from 'react';
import Link from 'next/link';
import { Check, Lock, PlayCircle, FileText, Clock, Award, Star, Users, Layers, X } from 'lucide-react';
import type { CourseAccess, CourseCard, CourseLessonView, CourseProgress, CourseStats, LessonCompletionState } from '@/types';
import { apiAssetUrl } from '@/lib/api';
import {
  courseCta,
  courseCover,
  formatDuration,
  formatEnrolled,
  formatLessonCount,
  formatLevel,
  formatModuleCount,
  formatRating,
  formatReviewCount,
  type CourseCtaTone,
} from '@/lib/courseFormat';

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
        ) : kind === 'reading' ? (
          /* The medium, not whether the lesson is assessable. A reading lesson
             that ends in a challenge is still reading; `has_quiz` is what says it
             is assessable, and the syllabus header carries that count. Iconing it
             as a quiz told the learner they were about to be tested when they were
             about to be taught. */
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

/**
 * One icon+value pair in a course card's stats row.
 *
 * A separator is drawn between pips via `notFirst`, so the row reads as a
 * single line of facts rather than as five unrelated chips.
 *
 * `value` is nullable and null renders nothing at all. That is deliberate: a
 * course with no ratings must not show an empty star, and a course nobody has
 * enrolled in must not show "0 learners". The component takes the server's
 * numbers and does not have an opinion about them.
 */
export const StatPip: React.FC<{
  icon: React.ReactNode;
  value: string | null | undefined;
  title?: string;
  notFirst?: boolean;
}> = ({ icon, value, title, notFirst }) => {
  if (!value) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-[var(--text-muted)]"
      title={title}
    >
      {notFirst && (
        <span aria-hidden="true" className="mr-1.5 h-3 w-px bg-[var(--border-subtle)]" />
      )}
      <span aria-hidden="true" className="inline-flex text-[var(--text-light)]">
        {icon}
      </span>
      {value}
    </span>
  );
};

/**
 * A removable chip for one active filter.
 *
 * `children` is the human label resolved from the server's facets, and `onRemove`
 * is what makes it a filter control rather than a static tag. It is a real
 * `<button>`: a pill that only looks clickable is a dead control for anyone
 * navigating by keyboard, and the remove action has to be reachable.
 */
export const Pill: React.FC<{
  children: React.ReactNode;
  onRemove: () => void;
  /** Announced instead of a bare "×", which means nothing out of context. */
  removeLabel?: string;
}> = ({ children, onRemove, removeLabel = 'Remove filter' }) => (
  <button
    type="button"
    onClick={onRemove}
    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--border-subtle)]"
  >
    {children}
    <X size={12} aria-hidden="true" />
    <span className="sr-only">{removeLabel}</span>
  </button>
);

/**
 * The one place a CTA tone becomes CSS.
 *
 * The catalogue card and the course hero show the same course in different
 * states, and the two had drifted: the hero hand-rolled its button markup while
 * the card used `courseCta`. Two renderings of one decision is how a learner ends
 * up with a gold "Get this course" on the listing and a plain "Start learning" on
 * the detail page for the same purchase state.
 */
export const ctaToneClasses = (tone: CourseCtaTone): string =>
  [
    'inline-flex items-center justify-center rounded-[var(--radius-sm)] border px-5 py-2.5 text-sm font-bold transition-colors',
    tone === 'primary'
      ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)] text-white hover:bg-[var(--brand-sky-strong)]'
      : tone === 'gold'
        ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-hover)]'
        : tone === 'muted'
          ? 'border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] text-[var(--text-muted)]'
          : 'border-[var(--brand-sky)] bg-transparent text-[var(--brand-sky)] hover:bg-[var(--brand-sky)] hover:text-white',
  ].join(' ');

/** A live CTA button. Presentational only — the click handler is the caller's. */
export const CtaButton: React.FC<{
  tone: CourseCtaTone;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ tone, children, onClick, disabled, className }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${ctaToneClasses(tone)}${className ? ` ${className}` : ''}`}
  >
    {children}
  </button>
);

const BADGE_STYLES: Record<string, string> = {
  new: 'bg-[var(--brand-mint)] text-white',
  trending: 'bg-[var(--brand-accent)] text-white',
  popular: 'bg-[var(--brand-sky)] text-white',
  in_progress: 'bg-[var(--bg-sky-soft)] text-[var(--brand-sky-strong)]',
  gold: 'bg-[var(--brand-accent)] text-white',
};

const BADGE_LABELS: Record<string, string> = {
  new: 'New',
  trending: 'Trending',
  popular: 'Popular',
  in_progress: 'In progress',
  gold: 'Premium',
};

/**
 * A small status pill on a course card.
 *
 * Badges are derived on the server from real dates and real enrolment counts
 * (see backend/src/lib/catalog.ts) — there is no flag an author can set to pin
 * "Popular" onto a course nobody has opened. An unrecognised key renders as its
 * own key rather than throwing, so a server that adds a badge type before the
 * client catches up degrades to a plain word instead of a blank space.
 */
export const CourseBadge: React.FC<{ kind: string; label?: string }> = ({ kind, label }) => {
  const text = label || BADGE_LABELS[kind] || kind;
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
        BADGE_STYLES[kind] || 'bg-[var(--bg-surface-hover)] text-[var(--text-muted)]',
      ].join(' ')}
    >
      {text}
    </span>
  );
};

/**
 * The course cover.
 *
 * Every seeded course has an empty `thumbnail_url`, and rendering `<img>` for it
 * would give a broken image icon; rendering an empty grey box would read as an
 * unfinished card. So an absent thumbnail falls back to a gradient derived from
 * the slug — deterministic, so the server and the browser paint the same tile,
 * which matters because these cards are server-rendered for SEO.
 */
export const CourseCover: React.FC<{
  slug: string;
  title: string;
  thumbnailUrl?: string;
  className?: string;
  }> = ({ slug, title, thumbnailUrl, className }) => {
    const [loaded, setLoaded] = React.useState(false);
    const cover = courseCover(slug, title);
    // Uploaded covers are stored as server-relative paths ("/api/..."), and the
    // frontend is a different origin, so they must be resolved before use or the
    // browser requests them against Next.js and gets a 404.
    const src = apiAssetUrl(thumbnailUrl || '');

    if (src) {
    return (
      // A plain div wrapper rather than next/image: these are author-supplied
      // external URLs with no known dimensions, and next/image would need the
      // remote host allow-listed in next.config before any of them rendered.
      <div
        className={[
          'relative shrink-0 overflow-hidden bg-[var(--bg-surface-hover)]',
          className || 'h-[76px] w-[168px] rounded-xl',
        ].join(' ')}
      >
        {!loaded && (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundImage: `linear-gradient(135deg, ${cover.from}, ${cover.to})` }}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
          className="relative h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={[
        'relative shrink-0 overflow-hidden rounded-xl',
        className || 'h-[76px] w-[168px]',
      ].join(' ')}
      style={{ backgroundImage: `linear-gradient(135deg, ${cover.from}, ${cover.to})` }}
    >
      <span className="absolute inset-0 flex items-center justify-center text-3xl font-extrabold text-white/85">
        {cover.initial}
      </span>
    </div>
  );
};

/**
 * A course row in the catalogue.
 *
 * The whole row is one `<Link>`, so the CTA is a styled `<span>` and not a
 * nested `<button>` — two interactive elements inside each other is invalid and
 * makes the card unusable by keyboard.
 *
 * Every figure shown comes from the server's `signals`, and the ones that do
 * not exist are omitted rather than replaced: no rating means no star, no
 * enrolments means no learner count. See lib/courseFormat.ts for why there is no
 * fallback value available.
 */
export const CourseRowCard: React.FC<{ course: CourseCard }> = ({ course }) => {
  const cta = courseCta({
    progress: course.progress,
    access: course.access,
    price_inr: course.price_inr,
  });

  const rating = formatRating(course.signals);
  const reviews = formatReviewCount(course.signals);
  const enrolled = formatEnrolled(course.signals?.enrollment_count);
  const duration = formatDuration(course.stats.total_minutes);

  // "In progress" is a state of this learner's, not a property of the course,
  // so it is derived here from the progress the server already returned rather
  // than being asked for as a badge.
  const inProgress = !!course.progress?.enrolled && !course.progress.is_complete;
  const badges = [
    ...(course.badges || []),
    ...(inProgress ? (['in_progress'] as const) : []),
  ];

  return (
    <article className="group relative rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-xs)] transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-raised)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        <CourseCover
          slug={course.slug}
          title={course.title}
          thumbnailUrl={course.thumbnail_url}
          className="h-20 w-20 rounded-[var(--radius-md)] sm:h-[76px] sm:w-[168px]"
        />

        <div className="min-w-0 flex-1">
          {/* The link is stretched over the whole card so the entire surface is
              clickable, while the heading stays the accessible name. */}
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0">
            <h3 className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight text-[var(--ink)] group-hover:text-[var(--brand-sky-strong)]">
              {course.title}
            </h3>
          </Link>

          <p className="mt-1.5 text-xs font-semibold text-[var(--text-muted)]">
            {formatLevel(course.level)} · {course.category}
          </p>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-body)]">
            {course.subtitle}
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatPip
              notFirst
              icon={<Star size={13} className="text-[var(--brand-accent)]" fill="currentColor" />}
              value={rating ? `${rating}${reviews ? ` (${reviews})` : ''}` : null}
              title={rating ? `Rated ${rating} out of 5 by ${reviews}` : undefined}
            />
            <StatPip
              notFirst={!!rating}
              icon={<Users size={13} />}
              value={enrolled}
            />
            <StatPip notFirst={!!(rating || enrolled)} icon={<Layers size={13} />} value={formatModuleCount(course.stats)} />
            <StatPip notFirst={!!(rating || enrolled)} icon={<FileText size={13} />} value={formatLessonCount(course.stats)} />
            <StatPip notFirst={!!(rating || enrolled)} icon={<Clock size={13} />} value={duration} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {course.is_free && <CourseBadge kind="new" label="Free" />}
            {badges.map((b) => (
              <CourseBadge key={b} kind={b} />
            ))}
            {course.certificate_eligible && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]">
                <Award size={12} /> Certificate
              </span>
            )}
          </div>

          {course.lock_reason && (
            <p className="mt-3 text-xs italic text-[var(--text-muted)]">{course.lock_reason}</p>
          )}

          {inProgress && (
            <div className="mt-4 max-w-xs">
              <ProgressBar
                percent={course.progress!.percent}
                label={`${course.progress!.completed} of ${course.progress!.total} lessons done`}
              />
            </div>
          )}
        </div>

        <div className="flex items-center sm:pl-2">
          {/* A span, not a button: the stretched link above already owns the
              click, and nesting a real control inside it is invalid HTML. The
              tone comes from the shared mapping so it cannot drift from the
              hero's button for the same course state. */}
          <span aria-hidden="true" className={`${ctaToneClasses(cta.tone)} min-w-[150px]`}>
            {cta.label}
          </span>
        </div>
      </div>
    </article>
  );
};

/**
 * Placeholder rows shown while a page of the catalogue is in flight.
 *
 * Shaped like `CourseRowCard` so the list does not reflow when the real rows
 * arrive, and marked `aria-hidden` because a screen reader should hear "loading"
 * once, not twelve decorative grey boxes.
 */
export const CourseRowSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6"
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
      <div className="h-20 w-20 shrink-0 animate-pulse rounded-[var(--radius-md)] bg-[var(--bg-surface-hover)] sm:h-[76px] sm:w-[168px]" />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
        <div className="h-3 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
      </div>
      <div className="h-11 w-[150px] shrink-0 animate-pulse rounded-[var(--radius-sm)] bg-[var(--bg-surface-hover)]" />
    </div>
  </div>
);

