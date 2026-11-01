import React from 'react';
import { ShieldAlert } from 'lucide-react';

/** The strike warning for secure-mode tests. Returning resumes fullscreen. */
export const SecureModeWarning: React.FC<{ message: string | null; onResume: () => void }> = ({ message, onResume }) =>
  message ? (
    <div role="alertdialog" aria-modal="true" aria-labelledby="secure-warn-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-danger/40 bg-card p-6 text-center shadow-[var(--shadow-pop)]">
        <ShieldAlert className="mx-auto h-10 w-10 text-danger" aria-hidden />
        <h2 id="secure-warn-title" className="mt-3 font-display text-lg font-bold text-heading">Stay in the test</h2>
        <p className="mt-2 text-sm text-body">{message}</p>
        <button type="button" onClick={onResume} className="btn btn-primary focus-ring mt-5 w-full min-h-[48px]">
          Back to my test
        </button>
      </div>
    </div>
  ) : null;

/** Small badge shown on test links and test headers. */
export const SecureBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
    <ShieldAlert className="h-3 w-3" aria-hidden /> Timed · secure mode
  </span>
);
