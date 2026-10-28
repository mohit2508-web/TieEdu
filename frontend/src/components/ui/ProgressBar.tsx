import React from 'react';
import { cn } from '@/lib/cn';

/**
 * ProgressBar — amber fill on a sunk track, the remainder hatched, with an
 * optional goal tick (UI_REDESIGN_PLAN_V3 §10). `value` and `goal` are 0–100.
 */
export const ProgressBar: React.FC<{ value: number; goal?: number; label: string; className?: string }> = ({ value, goal, label, className }) => {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cn('hatch relative h-2.5 overflow-hidden rounded-full bg-surface-hover', className)}
    >
      <span className="absolute inset-y-0 left-0 rounded-full bg-signal transition-[width] duration-flip ease-paper" style={{ width: `${v}%` }} />
      {goal !== undefined ? (
        <span className="absolute inset-y-0 w-0.5 bg-heading" style={{ left: `${Math.max(0, Math.min(100, goal))}%` }} aria-hidden />
      ) : null}
    </div>
  );
};

export default ProgressBar;
