import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Marquee — a row that scrolls sideways forever and pauses on hover
 * (UI_REDESIGN_PLAN_V3 §8). The items render twice so the loop is seamless;
 * the copy is `aria-hidden` and inert, so each item is heard and tabbed to once. Under
 * reduced motion the row stops and scrolls by hand instead.
 */
export const Marquee: React.FC<{ className?: string; children: React.ReactNode; label?: string }> = ({ className, children, label }) => (
  <div className={cn('tk-marquee mask-fade-x overflow-hidden', className)} role={label ? 'region' : undefined} aria-label={label}>
    <div className="tk-marquee-track flex w-max gap-4">
      <div className="flex gap-4">{children}</div>
      {/* `inert` as well as aria-hidden: the copy may hold links, and a hidden
          link that still takes focus is worse than none. React 18 drops a
          boolean `inert` prop, so the attribute is set on the node. */}
      <div className="flex gap-4" aria-hidden ref={(el) => el?.setAttribute('inert', '')}>
        {children}
      </div>
    </div>
  </div>
);

export default Marquee;
