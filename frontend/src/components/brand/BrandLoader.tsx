import React, { useEffect, useState } from 'react';
import { BrandMark, type BrandMarkMode } from './BrandMark';

/**
 * The branded loader (PRACTICE_POLISH_PLAN.md §2).
 *
 * - `fullscreen`: the animated logo (the same one the installed app opens with), for opening the IDE or starting a test.
 * - `panel`: the thinking brain inside a panel (editor loading, console running tests).
 * - `inline`: a 20 px brain for buttons and short lines.
 *
 * Rules: it says what is loading (never just "Loading"); it shows only after
 * `delay` ms so quick loads never flash it; it is a polite live region.
 */
export interface BrandLoaderProps {
  caption: string;
  variant?: 'fullscreen' | 'panel' | 'inline';
  /** ignite (calm, default) or pulse (busy work: running code). */
  mode?: BrandMarkMode;
  /** ms before it appears. Default 400 (0 for inline). */
  delay?: number;
  className?: string;
}

function useAfter(ms: number): boolean {
  const [on, setOn] = useState(ms <= 0);
  useEffect(() => {
    if (ms <= 0) return;
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return on;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({ caption, variant = 'panel', mode = 'ignite', delay, className = '' }) => {
  const show = useAfter(delay ?? (variant === 'inline' ? 0 : 400));
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.getAttribute('data-theme') === 'dark'), []);

  if (!show) return <span className="sr-only" role="status">{caption}</span>;

  if (variant === 'inline') {
    return (
      <span role="status" aria-live="polite" className={`tie-loader inline-flex items-center gap-2 ${className}`}>
        <BrandMark mode={mode === 'ignite' ? 'pulse' : mode} size={20} />
        <span>{caption}</span>
      </span>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div role="status" aria-live="polite" className={`tie-loader fixed inset-0 z-[90] grid place-items-center bg-paper px-4 ${className}`}>
        <div className="grid justify-items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- animated SVG from public/brand (scripts/brand/build-brand.py) */}
          <img src={`/brand/tieedu-splash-${dark ? 'dark' : 'light'}.svg?v=1`} alt="" width={2150} height={1260} className="h-auto w-[min(78vw,480px)]" />
          <p className="tie-loader-caption text-body-md font-medium">{caption}</p>
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={`tie-loader flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
      <BrandMark mode={mode} size={88} />
      <p className="tie-loader-caption text-body-md font-medium">{caption}</p>
    </div>
  );
};
