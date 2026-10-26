import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';

export interface LessonSegment {
  id: string;
  /** Short header for the step, e.g. "Watch", "Concept", "Quiz". */
  label: string;
  render: () => React.ReactNode;
}

/**
 * Mobile-only one-step-at-a-time lesson shell ("no long pages").
 *
 * The same lesson data the desktop continuous layout renders — one source of
 * truth — presented as digestible cards with Next/Prev and swipe. Controlled:
 * the parent owns the index so the fixed bottom bar can say "Next step" while
 * steps remain and "Next lesson" at the end. Transitions are opacity-only and
 * disabled under prefers-reduced-motion; every swipe has a button equivalent,
 * and focus lands on the new step's heading so screen-reader and keyboard users
 * are not left behind after a change.
 */
export const MobileSegmentReader: React.FC<{
  segments: LessonSegment[];
  index: number;
  onIndexChange: (next: number) => void;
  /** Author-estimate minutes for the whole lesson, shown as "About N min". */
  minutes?: number | null;
  /** Index of the summary segment, when the lesson has one. Null hides the jump. */
  summaryIndex: number | null;
}> = ({ segments, index, onIndexChange, minutes, summaryIndex }) => {
  const total = segments.length;
  const safeIndex = Math.min(Math.max(0, index), Math.max(0, total - 1));
  const segment = segments[safeIndex];

  const headingRef = useRef<HTMLParagraphElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  // Bumped on every step change to retrigger the fade animation and the focus
  // move; a key alone would remount the step body (scroll position, video).
  const [pulse, setPulse] = useState(0);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(0, next), total - 1);
      if (clamped === safeIndex) return;
      onIndexChange(clamped);
      setPulse((p) => p + 1);
    },
    [onIndexChange, safeIndex, total]
  );

  useEffect(() => {
    headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);

  const onTouchStart = (e: React.TouchEvent) => {
    // A code block, table, or rail scrolls sideways — a swipe started there
    // belongs to that scroller, not to lesson navigation.
    const target = e.target as HTMLElement | null;
    if (target?.closest('pre, table, [data-no-swipe]')) {
      touchStart.current = null;
      return;
    }
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Horizontal-dominant and far enough to be a deliberate swipe, not a tap
    // wobble or a vertical scroll drift.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? safeIndex + 1 : safeIndex - 1);
  };

  if (!segment) return null;

  const percent = total > 1 ? ((safeIndex + 1) / total) * 100 : 100;

  return (
    <section aria-label="Lesson steps" className="flex flex-col">
      {/* Step header: position, honest time estimate, revision shortcut. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Step {safeIndex + 1} of {total}
            {minutes ? <span className="ml-2 font-semibold normal-case tracking-normal">About {minutes} min</span> : null}
          </p>
          <div
            className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={safeIndex + 1}
            aria-label="Lesson step progress"
          >
            <div
              className="h-full rounded-full bg-[var(--brand-sky)] transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        {summaryIndex !== null && safeIndex < summaryIndex && (
          <button
            type="button"
            onClick={() => go(summaryIndex)}
            className="focus-ring inline-flex min-h-[44px] flex-none items-center gap-1.5 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-bold text-[var(--ink)] transition-colors active:bg-[var(--bg-surface-hover)]"
          >
            <ListChecks size={14} className="text-[var(--brand-sky)]" />
            Summary
          </button>
        )}
      </div>

      {/* Step body: its own scroll container, so a long step scrolls inside the
          card instead of becoming a full-page scroll again.

          No `overscroll-contain`: it would also cut the gesture off at the
          container's edge, so once a step was scrolled to its end the page
          below (module test, footer) could never be reached from inside the
          card - which on a phone, where this card fills the viewport, made the
          page look frozen. Default chaining lets the scroll continue into the
          page the moment the step is done, which is the behaviour a native
          reader has. */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="min-h-[45vh] max-h-[calc(100dvh-15rem)] overflow-y-auto pb-2"
      >
        <div key={`${segment.id}-${pulse}`} className="segment-fade space-y-5">
          <p
            ref={headingRef}
            tabIndex={-1}
            className="focus-ring text-sm font-extrabold tracking-tight text-[var(--ink)]"
          >
            {segment.label}
          </p>
          {segment.render()}
        </div>
      </div>

      {/* Step navigation: 44px+ targets, swipe has a button equivalent. */}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => go(safeIndex - 1)}
          disabled={safeIndex === 0}
          aria-label="Previous step"
          className="focus-ring flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink)] transition-colors active:bg-[var(--bg-surface-hover)] disabled:opacity-40"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => go(safeIndex + 1)}
          disabled={safeIndex >= total - 1}
          className="focus-ring flex h-12 min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-sky)] px-4 text-sm font-bold text-white transition-colors active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next step
          <ChevronRight size={18} />
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        Step {safeIndex + 1} of {total}: {segment.label}
      </p>
    </section>
  );
};
