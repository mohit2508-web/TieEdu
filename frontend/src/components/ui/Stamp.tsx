import React from 'react';
import { BadgeCheck, Clock3, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Stamp — where a fact came from. Part of the visual signature (§3): every
 * number on the platform either carries a stamp or says it is being verified.
 *
 *   verified   checked by the team         "Verified · Oct 2026"
 *   source     reported by people          "From 41 students"
 *   pending    not confirmed yet           "Being verified"
 *
 * Deliberately inked-looking (double rule, slight tilt) so it reads as a mark
 * someone put there rather than another pill. `flat` drops the tilt for dense
 * tables. The tilt is skipped under reduced motion only because it is static;
 * the landing animation (`animate`) respects `prefers-reduced-motion` in CSS.
 */

export type StampKind = 'verified' | 'source' | 'pending';

const KIND: Record<StampKind, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  verified: { cls: 'text-success border-success/60', icon: BadgeCheck },
  source: { cls: 'text-info border-info/50', icon: Users },
  pending: { cls: 'text-warning border-warning/60', icon: Clock3 },
};

export interface StampProps {
  kind: StampKind;
  children: React.ReactNode;
  flat?: boolean;
  /** Play the one-off "stamp lands" motion (milestones only). */
  animate?: boolean;
  className?: string;
}

export const Stamp: React.FC<StampProps> = ({ kind, children, flat, animate, className }) => {
  const { cls, icon: Icon } = KIND[kind];
  return (
    <span
      className={cn(
        'route-stamp inline-flex items-center gap-1 rounded-md border-2 border-double bg-card/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
        !flat && '-rotate-2',
        animate && 'route-stamp-land',
        cls,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </span>
  );
};

export default Stamp;
