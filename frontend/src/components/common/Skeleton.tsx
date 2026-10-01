import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Loading placeholder primitives — Phase 6, MOBILE_APP_UI_PLAN.md §9.
 *
 * These replace "Loading..." text and spinners on the two pages a student sees
 * most, and the difference is not decoration. A spinner tells the student the
 * app is thinking and nothing about what is coming, so the wait has to be
 * *waited out*: they cannot pre-read the page, cannot judge whether it is worth
 * it, and cannot tell a two-second fetch from a hung request. A skeleton is the
 * final layout with the content missing, so the page has already arrived
 * visually and the only thing left is filling it in.
 *
 * `aria-hidden` throughout, with the loading state announced once by the parent
 * via a `role="status"`. A skeleton is a picture of content, not content: a
 * screen reader that read "image, image, image" forty times would be worse than
 * the text it replaced.
 *
 * The pulse is neutralised by the `prefers-reduced-motion` block in
 * `globals.css`, which is why these are `animate-pulse` and not a bespoke
 * animation.
 */

export interface SkeletonProps {
  className?: string;
}

/** One placeholder block. The base unit everything else composes. */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div
    aria-hidden="true"
    className={cn('animate-pulse rounded bg-[var(--bg-surface-hover)]', className)}
  />
);

/**
 * A line of text, with the width jitter that makes a stack of placeholders read
 * as prose rather than as a progress bar.
 */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div aria-hidden="true" className={cn('space-y-2', className)}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        /* Full, then ragged, then full-ish: the last line of a paragraph is
           short, and a stack of identical full-width bars is the tell that gives
           a skeleton away as a skeleton. */
        className={cn(
          'h-3',
          i === lines - 1 ? 'w-2/3' : i % 3 === 2 ? 'w-11/12' : 'w-full'
        )}
      />
    ))}
  </div>
);

/**
 * A titled block: heading, body, optional media. The shape shared by the vault
 * and course skeletons, which are both a media band over a text block.
 */
export const SkeletonCard: React.FC<{
  media?: string;
  lines?: number;
  className?: string;
}> = ({ media, lines = 3, className }) => (
  <div aria-hidden="true" className={cn('rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]', className)}>
    {media ? <Skeleton className={cn('rounded-b-none', media)} /> : null}
    <div className="space-y-3 p-5">
      <Skeleton className="h-5 w-1/2" />
      <SkeletonText lines={lines} />
    </div>
  </div>
);
