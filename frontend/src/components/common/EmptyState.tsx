import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Empty states — Phase 6, MOBILE_APP_UI_PLAN.md §9.
 *
 * The rule is icon, one line, one action. An empty container with a sentence in
 * it is the failure mode this replaces: it reads as "something failed to render"
 * rather than as a deliberate state, and it gives the student nothing to do. The
 * point of an empty state is not to explain that there is nothing — the student
 * can see that — it is to say what would fill it and to offer the first step.
 *
 * `one line` is enforced by construction rather than by review: the copy is a
 * `string`, not `ReactNode`, so there is no way to pass a paragraph and no way
 * for the length to drift as the copy is edited.
 */

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  /** One sentence. Deliberately not `ReactNode`. */
  title: string;
  /**
   * Optional second line, for the reason something is empty when the reason is
   * not the user's doing. Also a plain string, for the same reason.
   */
  note?: string;
  /** The one action. Without it the state is a dead end. */
  action?: { label: string; onClick: () => void; icon?: React.ComponentType<{ className?: string }> };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  note,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-10 text-center',
      className
    )}
  >
    <span
      aria-hidden
      className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-surface-hover)] text-[var(--text-muted)]"
    >
      <Icon className="h-5 w-5" />
    </span>
    <p className="text-sm font-bold text-[var(--ink)]">{title}</p>
    {note ? <p className="mt-1.5 text-sm text-[var(--text-muted)]">{note}</p> : null}
    {action ? (
      <button
        type="button"
        onClick={action.onClick}
        className="pressable focus-ring mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-bold text-white"
      >
        {action.icon ? <action.icon className="h-4 w-4" /> : null}
        {action.label}
      </button>
    ) : null}
  </div>
);

export default EmptyState;
