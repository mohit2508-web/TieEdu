import React from 'react';
import { Skeleton } from '@/components/common/Skeleton';

/**
 * Practice page skeletons (PRACTICE_POLISH_PLAN.md §2): the page's own shape with
 * the content missing, instead of the word "Loading". Announced once via role=status.
 */
export const PracticeSkeleton: React.FC<{ kind: 'home' | 'list' | 'cards' | 'report'; label: string }> = ({ kind, label }) => (
  <div role="status" aria-live="polite">
    <span className="sr-only">{label}</span>
    {kind === 'home' && (
      <div className="space-y-8" aria-hidden="true">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-44 rounded-2xl md:col-span-2" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    )}
    {kind === 'list' && (
      <div className="space-y-6" aria-hidden="true">
        {Array.from({ length: 3 }, (_, g) => (
          <div key={g} className="space-y-2">
            <Skeleton className="h-6 w-48" />
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ))}
      </div>
    )}
    {kind === 'cards' && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
      </div>
    )}
    {kind === 'report' && (
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )}
  </div>
);
