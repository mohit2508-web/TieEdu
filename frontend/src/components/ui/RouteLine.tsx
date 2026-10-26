import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * RouteLine — stations on a line, for anything with steps (§3, signature #1):
 * a company's rounds, a drive (registered → tested → interviewed → offered),
 * a study plan's weeks.
 *
 * It is an ordered list, so a screen reader hears "list, 4 items" and each
 * station's state in words ("done", "you are here"), not just a colour. The
 * filled part of the line animates on change; `prefers-reduced-motion` turns
 * that off in globals.css.
 */

export type StationState = 'done' | 'current' | 'next';

export interface Station {
  label: string;
  note?: string;
  state: StationState;
}

export interface RouteLineProps {
  stations: Station[];
  orientation?: 'horizontal' | 'vertical';
  onInk?: boolean;
  /**
   * Show step numbers in the dots, for a route that explains steps rather than
   * tracking someone's progress (marketing pages). Use with every station at
   * 'next' — a 'done' tick there would claim progress nobody has made.
   */
  numbered?: boolean;
  className?: string;
}

const SR: Record<StationState, string> = { done: 'done', current: 'you are here', next: 'not yet' };

export const RouteLine: React.FC<RouteLineProps> = ({ stations, orientation = 'horizontal', onInk, numbered, className }) => {
  const vertical = orientation === 'vertical';
  const doneUpTo = stations.reduce((last, s, i) => (s.state !== 'next' ? i : last), -1);
  const pct = stations.length > 1 ? (Math.max(0, doneUpTo) / (stations.length - 1)) * 100 : 0;
  const track = onInk ? 'bg-white/20' : 'bg-line';
  const muted = onInk ? 'text-white/70' : 'text-muted';
  const strong = onInk ? 'text-white' : 'text-heading';

  return (
    <div className={cn('relative', className)}>
      {/* The line itself, behind the dots. Centred on the 24px dots. */}
      <div
        aria-hidden
        className={cn('absolute rounded-full', track, vertical ? 'left-[11px] top-3 bottom-3 w-0.5' : 'left-3 right-3 top-[11px] h-0.5')}
      >
        <div
          className="route-fill absolute left-0 top-0 rounded-full bg-signal"
          style={vertical ? { width: '100%', height: `${pct}%` } : { height: '100%', width: `${pct}%` }}
        />
      </div>
      <ol className={cn('relative', vertical ? 'flex flex-col gap-6' : 'flex justify-between gap-2')}>
        {stations.map((s, i) => (
          <li
            key={`${s.label}-${i}`}
            aria-current={s.state === 'current' ? 'step' : undefined}
            className={cn('flex min-w-0', vertical ? 'flex-row items-start gap-3' : 'flex-1 flex-col items-center text-center first:items-start first:text-left last:items-end last:text-right')}
          >
            <span
              aria-hidden
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                s.state === 'done' && 'border-signal bg-signal text-white',
                s.state === 'current' && cn('border-signal ring-4 ring-signal/20', onInk ? 'bg-brand-ink' : 'bg-card'),
                s.state === 'next' && cn(onInk ? 'border-white/30 bg-brand-ink' : 'border-line-strong bg-card', numbered && 'border-signal')
              )}
            >
              {s.state === 'done' ? (
                <Check className="h-3.5 w-3.5" />
              ) : s.state === 'current' ? (
                <span className="h-2 w-2 rounded-full bg-signal" />
              ) : numbered ? (
                <span className={cn('tabular-nums', onInk ? 'text-white' : 'text-heading')}>{i + 1}</span>
              ) : null}
            </span>
            <span className={cn('min-w-0', vertical ? '' : 'mt-2')}>
              <span className={cn('block text-sm font-semibold', s.state === 'next' && !numbered ? muted : strong)}>{s.label}</span>
              {s.note ? <span className={cn('block text-xs', muted)}>{s.note}</span> : null}
              {!numbered && <span className="sr-only">, {SR[s.state]}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default RouteLine;
