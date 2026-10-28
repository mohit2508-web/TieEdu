import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Marquee — a row that scrolls sideways forever and pauses on hover
 * (UI_REDESIGN_PLAN_V3 §8). The items render twice so the loop is seamless;
 * the copy is `aria-hidden`, so screen readers hear each item once. Under
 * reduced motion the row stops and scrolls by hand instead.
 */
export const Marquee: React.FC<{ className?: string; children: React.ReactNode; label?: string }> = ({ className, children, label }) => (
  <div className={cn('tk-marquee mask-fade-x overflow-hidden', className)} role={label ? 'region' : undefined} aria-label={label}>
    <div className="tk-marquee-track flex w-max gap-4">
      <div className="flex gap-4">{children}</div>
      <div className="flex gap-4" aria-hidden>
        {children}
      </div>
    </div>
  </div>
);

export default Marquee;
