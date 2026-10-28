import React from 'react';
import { cn } from '@/lib/cn';

/**
 * DeviceFrame — the browser or phone frame a product mock-up sits in, with
 * the device shadow (UI_REDESIGN_PLAN_V3 §9 E4, §10). The frame's chrome is
 * hidden from assistive tech; the content inside is not.
 */
export const DeviceFrame: React.FC<{
  kind?: 'browser' | 'phone';
  /** Shown in the browser frame's address pill. */
  url?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ kind = 'browser', url = 'tieedu.in', className, children }) => {
  if (kind === 'phone') {
    return (
      <div className={cn('relative rounded-device border-[6px] border-heading bg-card p-1.5 shadow-device', className)}>
        <span className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-heading" aria-hidden />
        <div className="overflow-hidden rounded-[34px] bg-app">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn('overflow-hidden rounded-card border border-line bg-card shadow-device', className)}>
      <div className="flex items-center gap-3 border-b border-line bg-app-warm px-4 py-2.5" aria-hidden>
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong/40" />
        </span>
        <span className="flex-1 truncate rounded-full border border-line bg-card px-3 py-0.5 text-center font-mono text-caption text-muted">{url}</span>
      </div>
      <div>{children}</div>
    </div>
  );
};

export default DeviceFrame;
