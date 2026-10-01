import React from 'react';
import { Bookmark, CheckCircle2, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The reader's sticky bottom action bar — Phase 3, MOBILE_APP_UI_PLAN.md §3.2.
 *
 * Everything here used to live in the header, which on a phone is the one place
 * your thumb is not. Bookmarking, moving between sections and unlocking all
 * required reaching to the top of the screen, one-handed, with the other hand
 * holding whatever the student was reading from.
 *
 * The bar is fixed and the article gets matching bottom padding, so the last
 * paragraph is never trapped underneath it.
 */

export interface ReaderActionBarProps {
  /** Index into the section list, or -1 when there is nowhere to go. */
  sectionIndex: number;
  sectionCount: number;
  onPrev: () => void;
  onNext: () => void;
  /** Short name of the current section, e.g. "Technical & Coding Qs". */
  sectionLabel: string;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  /** How many questions are marked solved, or null when the bar hides it. */
  solvedCount?: number | null;
  onMarkSolved?: () => void;
  /** Shown in place of prev/next when the module is locked. */
  locked?: boolean;
  unlockPriceSuffix?: string;
  onUnlockClick?: () => void;
}

export const ReaderActionBar: React.FC<ReaderActionBarProps> = ({
  sectionIndex,
  sectionCount,
  onPrev,
  onNext,
  sectionLabel,
  bookmarked,
  onToggleBookmark,
  solvedCount = null,
  onMarkSolved,
  locked = false,
  unlockPriceSuffix = '',
  onUnlockClick,
}) => {
  const hasPrev = sectionIndex > 0;
  const hasNext = sectionIndex >= 0 && sectionIndex < sectionCount - 1;

  return (
    <div
      className={cn(
        // `md:hidden`: desktop keeps the sidebar navigator and the header actions.
        'fixed inset-x-0 bottom-0 z-30 md:hidden',
        'border-t border-gray-200 bg-white/95 backdrop-blur',
        'pb-[var(--safe-bottom)]',
        'shadow-[0_-2px_12px_rgba(15,23,42,0.06)]'
      )}
    >
      {locked ? (
        <div className="px-4 py-2.5">
          <button
            type="button"
            onClick={onUnlockClick}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#E8A33D] px-4 text-sm font-bold text-[#241A06] transition-colors active:bg-[#D4902C]"
          >
            <ShoppingCart className="h-4 w-4" /> Unlock full vault{unlockPriceSuffix}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Previous section"
            className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition-colors active:bg-black/5 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-[13px] font-bold text-[#10151C]">
              {sectionLabel.replace(/^\d+\.\s*/, '')}
            </p>
            {solvedCount !== null && (
              <p className="truncate text-[11px] text-[color:var(--text-muted)]">
                {solvedCount} solved
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this section'}
            className={cn(
              'flex h-12 w-12 flex-none items-center justify-center rounded-xl border transition-colors active:bg-black/5',
              bookmarked
                ? 'border-[#0284C7]/30 bg-[#0284C7]/10 text-[#0284C7]'
                : 'border-gray-200 text-gray-500'
            )}
          >
            <Bookmark className={cn('h-5 w-5', bookmarked && 'fill-current')} />
          </button>

          {onMarkSolved && (
            <button
              type="button"
              onClick={onMarkSolved}
              aria-label="Mark the current question solved"
              className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition-colors active:bg-black/5"
            >
              <CheckCircle2 className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next section"
            className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-[#0284C7] text-white transition-colors active:bg-[#0369A1] disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ReaderActionBar;
