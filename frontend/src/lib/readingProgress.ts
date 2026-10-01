// ============================================================================
// READING PROGRESS — Phase 3, MOBILE_APP_UI_PLAN.md §3.2
//
// A 2px line under the reader's header that reports how much of the section you
// have read. On a long guide the only other signal is the scrollbar, and iOS
// Safari hides that until you move.
//
// The arithmetic is separated from the component for the same reason
// `headerScroll.ts` is: the failure mode is a progress bar that reads 100% while
// you are halfway down, and that is much easier to assert against a pure
// function than against a scroll listener.
// ============================================================================

/**
 * Fraction of the scrollable range that has been passed, clamped to 0..1.
 *
 * The range is `scrollHeight - clientHeight`, not `scrollHeight`. Using the
 * latter is the classic off-by-a-viewport bug: the bar hits 100% while the last
 * screenful is still below the fold, so it stops meaning anything exactly when
 * you most want to know whether you are nearly done.
 *
 * Returns 0 for a document with nothing to scroll. Dividing by that produces
 * `NaN`, which React renders as the literal text "NaN" in a `width` — a bar that
 * is a blank stripe.
 */
export const readingProgress = (scrollTop: number, scrollHeight: number, clientHeight: number): number => {
  const range = scrollHeight - clientHeight;
  if (range <= 0) return 0;
  const passed = scrollTop / range;
  if (passed < 0) return 0;
  if (passed > 1) return 1;
  return passed;
};

/**
 * Render width as a CSS percentage string, quantised to whole percent.
 *
 * Quantising matters for more than tidiness: a bar re-rendering on every
 * sub-pixel scroll delta is a layout-thrash generator on a long article, and
 * the eye cannot see the difference between 43.7% and 44%.
 */
export const progressWidth = (fraction: number): string => `${Math.round(fraction * 100)}%`;

/**
 * Where to scroll after the reader changes section.
 *
 * The reader used to call `scrollTo(0)` on every section change, which is right
 * when you move *forward* and wrong when you come *back*: returning to a long
 * section drops you at its first line, several screens above where you stopped
 * reading (§3.3). So a section is only ever sent to the top the first time it is
 * opened; after that it resumes where it was left.
 *
 * Kept pure and keyed by section id so the "have I seen this before" question has
 * one obvious answer, and so it can be asserted directly.
 */
export const nextSectionScrollTop = (
  remembered: Readonly<Record<string, number>>,
  sectionId: string
): number => {
  const previous = remembered[sectionId];
  if (typeof previous === 'number' && previous > 0) return previous;
  return 0;
};

/**
 * Record the offset for a section, ignoring deltas too small to be intentional.
 *
 * A 12px difference between two visits means the student nudged the page while
 * reading a table or a code block, not that they want to resume 12px down.
 */
export const MIN_MEMORISED_OFFSET = 40;

export const shouldRememberOffset = (offset: number): boolean => offset >= MIN_MEMORISED_OFFSET;
