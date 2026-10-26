import React from 'react';
import { cn } from '@/lib/cn';

/**
 * ProgressRing — readiness, completion, score. §4.7: the number sits on the
 * data (inside the ring) rather than in a legend, uses tabular figures, and the
 * element is a `progressbar` with a label so it has a text alternative.
 */

export type RingTone = 'signal' | 'train' | 'test' | 'track' | 'success';

const STROKE: Record<RingTone, string> = {
  signal: 'stroke-signal',
  train: 'stroke-train',
  test: 'stroke-test',
  track: 'stroke-track',
  success: 'stroke-success',
};

export interface ProgressRingProps {
  /** 0–100; clamped. */
  value: number;
  /** What is being measured, for screen readers ("Zscaler readiness"). */
  label: string;
  size?: number;
  thickness?: number;
  tone?: RingTone;
  /** Text under the number inside the ring ("ready"). */
  caption?: string;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ value, label, size = 96, thickness = 8, tone = 'signal', caption, className }) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - v / 100)}
          className={cn('route-fill', STROKE[tone])}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold tabular-nums text-heading" style={{ fontSize: Math.max(14, size * 0.24) }}>
          {v}
          <span className="text-muted" style={{ fontSize: Math.max(12, size * 0.12) }}>%</span>
        </span>
        {caption ? <span className="text-xs text-muted">{caption}</span> : null}
      </span>
    </div>
  );
};

export default ProgressRing;
