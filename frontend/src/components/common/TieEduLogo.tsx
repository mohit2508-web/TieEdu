import React from 'react';

interface TieEduLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Intrinsic aspect ratio of `public/logo.svg`, from its `viewBox`.
 *
 * 2590 x 1664. The old code divided by a hardcoded 1.55, which is 0.4% off the
 * real ratio — enough to squash the mark slightly and to make the element's box
 * disagree with the image inside it, so `object-contain` letterboxed it.
 */
const ASPECT = 2590 / 1664;

/**
 * HEIGHTS, not widths.
 *
 * This wordmark is nearly square (1.56:1), so a width-keyed size produces a very
 * tall box. `sm` at 100px wide was 64px tall — the exact height of the header row
 * it sits in, so the mark touched both edges and read as overlapping the nav
 * next to it.
 *
 * Heights are what a header actually constrains, so they are what gets keyed.
 * `sm` = 40px is the size the logo used to *appear* at, because the old
 * `max-h-10` clamped a 100px-wide image down to 40px tall.
 */
const HEIGHTS = { sm: 40, md: 52, lg: 72 } as const;

/**
 * The wordmark.
 *
 * Three fixes over the previous version:
 *
 *  - `showTagline` was accepted and then ignored. Every call site passed
 *    `showTagline={true}` or `{false}` believing it controlled a second line,
 *    so the prop only made the call sites look intentional.
 *  - The SVG had no `viewBox`, which means it could not scale: any consumer that
 *    asked for a percentage width got a 2590px image. The `viewBox` is now on
 *    the file, and the component sizes off the intrinsic ratio.
 *  - Sizing is height-keyed and hard-capped, so the logo cannot outgrow a
 *    fixed-height row again.
 *
 * The SVG's full-canvas `#FEFEFD` backdrop path was also removed. It rendered
 * as a visible off-white box over the header's translucent blur, and as a pale
 * slab on `/interview-course`, which is a dark page.
 */
export const TieEduLogo: React.FC<TieEduLogoProps> = ({ className = '', size = 'md' }) => {
  const height = HEIGHTS[size];
  const width = Math.round(height * ASPECT);

  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src="/logo.svg"
        alt="TieEdu — Learn, Evolve, Develop"
        width={width}
        height={height}
        style={{ width: `${width}px`, height: `${height}px` }}
        // `max-h-full`/`max-w-full` are the backstop: whatever slot this lands
        // in, the mark stays inside it instead of overflowing.
        className="block h-auto max-h-full w-auto max-w-full select-none object-contain"
      />
    </div>
  );
};
