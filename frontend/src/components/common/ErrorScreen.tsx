import React, { useMemo } from 'react';
import Link from 'next/link';
import { RotateCcw, LifeBuoy } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { reportHref } from '@/lib/clientErrors';

/**
 * "Something went wrong on our side" (PRACTICE_POLISH_PLAN.md §3.1): used by 500,
 * _error and the app-wide ErrorBoundary. A quiet, unlit brain, one plain sentence,
 * Try again + Report this, and a short ref the student can quote to support.
 */
export interface ErrorScreenProps {
  errorRef?: string;
  title?: string;
  message?: string;
  /** Default: reload the page. */
  onRetry?: () => void;
  /** Full page height (500/_error) or inside a panel (boundaries). */
  compact?: boolean;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  errorRef,
  title = 'Something went wrong on our side',
  message = 'This is our fault, not yours. Try again. If it keeps happening, tell us and quote the code below.',
  onRetry,
  compact = false,
}) => {
  const when = useMemo(() => new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }), []);
  return (
    <main className={`flex flex-col items-center justify-center gap-4 px-4 text-center ${compact ? 'py-12' : 'min-h-[70vh] py-16'}`}>
      <BrandMark mode="still" size={compact ? 80 : 112} />
      <h1 className={`font-display font-bold text-heading ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>{title}</h1>
      <p className="max-w-md text-body-md text-body">{message}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onRetry || (() => window.location.reload())} className="btn btn-primary focus-ring inline-flex min-h-[48px] items-center gap-2 px-5">
          <RotateCcw className="h-4 w-4" aria-hidden /> Try again
        </button>
        {errorRef ? (
          <Link href={reportHref(errorRef)} className="btn btn-secondary focus-ring inline-flex min-h-[48px] items-center gap-2 px-5">
            <LifeBuoy className="h-4 w-4" aria-hidden /> Report this
          </Link>
        ) : (
          <Link href="/" className="btn btn-secondary focus-ring inline-flex min-h-[48px] items-center px-5">Back to home</Link>
        )}
      </div>
      {errorRef && <p className="text-sm text-muted">Ref <span className="font-semibold text-body">{errorRef}</span> · {when}</p>}
    </main>
  );
};
