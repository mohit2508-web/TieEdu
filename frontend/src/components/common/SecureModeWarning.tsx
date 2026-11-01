import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';

/** The strike warning for secure-mode tests. Returning resumes fullscreen. */
export const SecureModeWarning: React.FC<{ message: string | null; onResume: () => void }> = ({ message, onResume }) => (
  <Sheet open={!!message} onClose={onResume} title="Stay in the test" zIndex={70}>
    <div className="px-5 pb-6 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-danger" aria-hidden />
      <p className="mt-3 text-sm text-body">{message}</p>
      <button type="button" onClick={onResume} className="btn btn-primary focus-ring mt-5 w-full min-h-[48px]">
        Back to my test
      </button>
    </div>
  </Sheet>
);

/** Small badge shown on test links and test headers. */
export const SecureBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
    <ShieldAlert className="h-3 w-3" aria-hidden /> Timed · secure mode
  </span>
);
