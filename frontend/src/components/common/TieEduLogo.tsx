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
 * The wordmark.
 *
 * Two fixes over the previous version:
 *
 *  - `showTagline` was accepted and then ignored. Every call site passed
 *    `showTagline={true}` or `{false}` believing it controlled a second line,
 *    so the prop only made the call sites look intentional.
 *  - The SVG had no `viewBox`, which means it could not scale: any consumer that
 *    asked for a percentage width got a 2590px image. The `viewBox` is now on
 *    the file, and the component sizes off the intrinsic ratio.
 *
 * The SVG's full-canvas `#FEFEFD` backdrop path was also removed. It rendered
 * as a visible off-white box over the header's translucent blur, and as a pale
 * slab on `/interview-course`, which is a dark page.
 */
export const TieEduLogo: React.FC<TieEduLogoProps> = ({ className = '', size = 'md' }) => {
  const width = size === 'sm' ? 100 : size === 'lg' ? 220 : 145;

  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src="/logo.svg"
        alt="TieEdu — Learn, Evolve, Develop"
        width={width}
        height={Math.round(width / ASPECT)}
        style={{ width: `${width}px`, height: `${Math.round(width / ASPECT)}px` }}
        className="select-none object-contain"
      />
    </div>
  );
};
