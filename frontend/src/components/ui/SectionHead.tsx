import React from 'react';
import { cn } from '@/lib/cn';

/**
 * SectionHead — eyebrow, title, one line of context, optional action on the
 * right. Sentence case. The title is the display face; the line under it is
 * body text in `muted`, never a second heading.
 */

export interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Usually a text Button ("See all"). */
  action?: React.ReactNode;
  /** h2 by default; pass 1 on a page whose first section this is. */
  level?: 1 | 2 | 3;
  align?: 'start' | 'center';
  /** For a head sitting on an ink band. */
  onInk?: boolean;
  className?: string;
  id?: string;
}

export const SectionHead: React.FC<SectionHeadProps> = ({ eyebrow, title, description, action, level = 2, align = 'start', onInk, className, id }) => {
  const H = (`h${level}` as unknown) as 'h2';
  const size = level === 1 ? 'text-3xl sm:text-4xl lg:text-5xl' : level === 2 ? 'text-2xl sm:text-3xl' : 'text-xl';
  const centered = align === 'center';
  return (
    <div className={cn('flex gap-4', centered ? 'flex-col items-center text-center' : 'flex-col sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className={cn('min-w-0', centered && 'max-w-2xl')}>
        {eyebrow ? <p className={cn('eyebrow mb-2', onInk ? 'text-money' : 'text-signal-ink')}>{eyebrow}</p> : null}
        <H id={id} className={cn('font-display font-bold tracking-tight', size, onInk ? 'text-white' : 'text-heading')}>
          {title}
        </H>
        {description ? <p className={cn('mt-2 text-base leading-relaxed', onInk ? 'text-white/80' : 'text-muted')}>{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

export default SectionHead;
