import React from 'react';
import { cn } from '@/lib/cn';

/**
 * The landing page's section heading (UI_REDESIGN_PLAN_V3 §5): mono eyebrow,
 * a `section`-size title, one muted lead line. Centred by default, as every
 * Warm Paper section is; `start` for the few that sit beside something.
 */
export const LandingHead: React.FC<{
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: 'center' | 'start';
  className?: string;
}> = ({ id, eyebrow, title, lead, align = 'center', className }) => (
  <div className={cn(align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl', className)}>
    {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
    <h2 id={id} className="font-display text-section text-heading">
      {title}
    </h2>
    {lead ? <p className="mt-4 text-body-lg text-muted">{lead}</p> : null}
  </div>
);

/** One landing section: the page width, the vertical rhythm, an optional texture. */
export const LandingSection: React.FC<{
  labelledBy?: string;
  className?: string;
  inner?: string;
  children: React.ReactNode;
}> = ({ labelledBy, className, inner, children }) => (
  <section aria-labelledby={labelledBy} className={cn('py-16 sm:py-24', className)}>
    <div className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-6', inner)}>{children}</div>
  </section>
);

export default LandingHead;
