import React from 'react';
import { cn } from '@/lib/cn';

/**
 * StatTile — one number, what it is, and where it came from.
 *
 * The `source` slot is the point: a figure without a Stamp next to it is the
 * "trust me" number the redesign set out to remove. Leave it empty only for
 * numbers the platform itself counts (your own streak, your own score).
 */

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  /** Small text after the value ("LPA", "/ 5"). */
  unit?: string;
  note?: string;
  /** Usually a <Stamp>. */
  source?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, unit, note, source, icon: Icon, className }) => (
  <div className={cn('rounded-[14px] border border-line bg-card p-4', className)}>
    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </p>
    <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-heading">
      {value}
      {unit ? <span className="ml-1 text-sm font-semibold text-muted">{unit}</span> : null}
    </p>
    {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
    {source ? <div className="mt-2">{source}</div> : null}
  </div>
);

export default StatTile;
