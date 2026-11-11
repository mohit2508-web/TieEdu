import React from 'react';
import Link from 'next/link';
import { WifiOff, CloudOff, ServerCrash, SearchX, Lock, LogIn, RotateCcw } from 'lucide-react';

/**
 * One inline error state (PRACTICE_POLISH_PLAN.md §3.3): an icon, a plain sentence
 * and one action, instead of scattered red text.
 */
export type ErrorKind = 'network' | 'offline' | 'runner' | 'notfound' | 'locked' | 'signin';

const COPY: Record<ErrorKind, { icon: React.ElementType; title: string; text: string }> = {
  network: { icon: CloudOff, title: 'Could not load this', text: 'Check your connection and try again.' },
  offline: { icon: WifiOff, title: 'You are offline', text: 'Your work is saved on this device. We will retry when you are back online.' },
  runner: { icon: ServerCrash, title: 'The code runner is offline', text: 'Your code is saved. Try again in a minute.' },
  notfound: { icon: SearchX, title: 'Not found', text: 'This does not exist or was moved.' },
  locked: { icon: Lock, title: 'This is in a pack', text: 'Unlock the pack to open it.' },
  signin: { icon: LogIn, title: 'Sign in to continue', text: 'Your progress is saved to your account.' },
};

export interface ErrorStateProps {
  kind?: ErrorKind;
  title?: string;
  /** The specific message (e.g. the API's error); falls back to the kind's sentence. */
  message?: string;
  onRetry?: () => void;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ kind = 'network', title, message, onRetry, action, className = '' }) => {
  const c = COPY[kind];
  const Icon = c.icon;
  const act = action || (onRetry ? { label: 'Try again', onClick: onRetry } : kind === 'signin' ? { label: 'Sign in', href: '/login' } : null);
  return (
    <div role="alert" className={`flex flex-col items-center gap-3 rounded-2xl border border-line bg-card px-5 py-8 text-center ${className}`}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-hover text-muted"><Icon className="h-6 w-6" aria-hidden /></span>
      <p className="text-lg font-semibold text-heading">{title || c.title}</p>
      <p className="max-w-md text-body-md text-body">{message || c.text}</p>
      {act && (act.href ? (
        <Link href={act.href} className="btn btn-secondary focus-ring mt-1 inline-flex min-h-[44px] items-center px-5">{act.label}</Link>
      ) : (
        <button type="button" onClick={act.onClick} className="btn btn-secondary focus-ring mt-1 inline-flex min-h-[44px] items-center gap-2 px-5">
          {act.label === 'Try again' && <RotateCcw className="h-4 w-4" aria-hidden />} {act.label}
        </button>
      ))}
    </div>
  );
};
