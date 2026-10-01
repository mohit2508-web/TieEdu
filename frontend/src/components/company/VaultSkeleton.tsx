import React from 'react';
import { Skeleton, SkeletonText } from '@/components/common/Skeleton';

/**
 * Vault loading placeholder — Phase 6, MOBILE_APP_UI_PLAN.md §9.
 *
 * Mirrors the real page: company title, a stat row, the featured free card, the
 * pack banner's slot, and the round grid. The counts are the point of it — a
 * student deciding whether a vault is worth buying is reading numbers, so a
 * skeleton that showed a title and nothing else would not be showing them the
 * shape of the thing they are about to spend money on.
 *
 * The grid uses the same breakpoints as the page it stands in for, so the
 * skeleton does not reflow when the real cards land. That reflow is the cost of
 * a skeleton that does not match: it is worse than the spinner it replaced,
 * because now the page jumps twice.
 */
export const VaultSkeleton: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    aria-label="Loading this vault"
    className="min-h-screen bg-[var(--bg-app)] text-[var(--text-body)]"
  >
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 space-y-4">
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <SkeletonText lines={2} className="max-w-xl" />
        <div className="flex flex-wrap gap-3 pt-1">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* The featured free card gets the full width, as it does on the page. */}
      <div className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-white p-5">
        <Skeleton className="mb-4 h-5 w-1/3" />
        <SkeletonText lines={3} />
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-28" />
        </div>
      </div>

      <Skeleton className="mb-6 h-24 w-full rounded-2xl" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-white p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="mb-3 h-4 w-full" />
            <Skeleton className="mb-5 h-3 w-4/5" />
            <div className="mt-auto flex flex-wrap gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </main>
  </div>
);

export default VaultSkeleton;
