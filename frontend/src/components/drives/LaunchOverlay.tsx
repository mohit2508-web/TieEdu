import React from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

/**
 * Blocking full-screen handoff state shown while a drive test is being launched.
 *
 * The launch is a same-tab redirect to the external provider, so this overlay
 * exists to cover the gap between the tap and the browser actually navigating —
 * without it the screen sits frozen on a stale frame and the student taps again,
 * firing a second launch request. It is deliberately non-dismissable: the
 * navigation owns the exit.
 */
export const LaunchOverlay: React.FC<{ visible: boolean; provider?: string }> = ({ visible, provider }) => {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-8 text-center"
      style={{ background: 'var(--apple-bg)' }}
      role="status"
      aria-live="polite"
    >
      <Loader2 size={34} className="animate-spin" style={{ color: 'var(--apple-blue)' }} />
      <p className="mt-5 text-[16px] font-semibold" style={{ color: 'var(--apple-label)' }}>
        Opening your assessment…
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--apple-label-2)' }}>
        <ExternalLink size={13} />
        {provider ? `Handing off to ${provider}` : 'Handing off to the test provider'}
      </p>
      <p className="mt-4 max-w-[280px] text-[12px] leading-relaxed" style={{ color: 'var(--apple-label-3)' }}>
        Don&apos;t close this tab — you&apos;ll come back here when you&apos;re done.
      </p>
    </div>
  );
};

export default LaunchOverlay;
