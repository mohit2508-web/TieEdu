/**
 * The sticky bottom bar on a course page - Phase 4, MOBILE_APP_UI_PLAN.md §4.1
 *
 * "Course detail → sticky bottom bar with price and the primary action."
 *
 * The enrolment CTA lived in the hero and in a `sticky` side card, and the side
 * card is `hidden min-[1440px]:block`. So on a 390px phone and on every laptop
 * below 1440px, the single most valuable control on the page - the one that costs
 * money - was only reachable by scrolling back to the top. `pb-24` on the page was
 * reserving space for a bar that did not exist.
 *
 * The bar is presentational on purpose. `enrollAction()` in `pages/courses/
 * [slug].tsx` already owns "what should a learner be offered, and is it locked"
 * - a second copy of that decision is how the hero and the card drifted apart
 * before. The page passes the control in; this component only handles the
 * plumbing, so the two can never disagree about the offer.
 *
 * Fixed rather than sticky, matching the reader action bar and the tab bar: the
 * point is that it is always one thumb-reach from the bottom edge, and `sticky`
 * would stop following as soon as the hero scrolled past.
 *
 * `RouteTransition` puts a `transform` on the page wrapper for the duration of a
 * route change, which would make this `position: fixed` a child of that
 * transform. Framer Motion clears it at rest (see the note in
 * `components/layout/RouteTransition.tsx`), and a bar is not expected to be open
 * mid-transition, so the trap does not apply here.
 */
import React from 'react';
import { cn } from '@/lib/cn';

export const CourseMobileActionBar: React.FC<{
  /**
   * A short line above the control: the price, or how far through they are.
   * Kept to one line and truncated, because the control matters and the
   * supporting text does not.
   */
  note?: string | null;
  /** The primary control. Passed in so the page keeps sole ownership of it. */
  children: React.ReactNode;
  className?: string;
}> = ({ note, children, className }) => (
  <div
    className={cn(
      'fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)]',
      // The tab bar and the sheets both sit at 40. This is deliberately below
      // them: on a root-depth route the tab bar owns the bottom edge, and a
      // purchase bar must never be stacked on top of it.
      'bg-[var(--bg-surface)] px-4 pt-3 pb-[calc(0.75rem+var(--safe-bottom))]',
      // The course route is `detail` depth, so `.page-body` contributes no
      // bottom padding and this bar needs no `--tabbar-total` offset.
      className
    )}
  >
    <div className="mx-auto w-full max-w-[var(--reader-max)]">
      {note ? (
        <p className="truncate text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
          {note}
        </p>
      ) : null}
      {/* The control gets the full width whether or not there is a note above it.
          A half-width "Enroll" button is the thing this bar exists to fix. */}
      <div className={note ? 'mt-1.5' : undefined}>{children}</div>
    </div>
  </div>
);
