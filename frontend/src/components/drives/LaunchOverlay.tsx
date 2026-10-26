import React, { useEffect, useRef } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

/**
 * Blocking full-screen handoff state shown while a drive test is being launched.
 *
 * The launch is a same-tab redirect to the external provider, so this overlay
 * exists to cover the gap between the tap and the browser actually navigating —
 * without it the screen sits frozen on a stale frame and the student taps again,
 * firing a second launch request. It is deliberately non-dismissable: the
 * navigation owns the exit, so there is no Escape.
 *
 * It is still a modal: focus moves into it and Tab is held there, or a keyboard
 * user could reach the launch button behind it and fire that second request
 * anyway; the page behind does not scroll.
 */
export const LaunchOverlay: React.FC<{ visible: boolean; provider?: string }> = ({ visible, provider }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const holdTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') e.preventDefault();
    };
    document.addEventListener('keydown', holdTab);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', holdTab);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-8 text-center outline-none"
      style={{ background: 'var(--apple-bg)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-overlay-title"
    >
      <Loader2 size={34} className="animate-spin" style={{ color: 'var(--apple-blue)' }} aria-hidden />
      <div role="status" aria-live="polite">
        <p id="launch-overlay-title" className="mt-5 text-base font-semibold" style={{ color: 'var(--apple-label)' }}>
          Opening your assessment…
        </p>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm" style={{ color: 'var(--apple-label-2)' }}>
          <ExternalLink size={13} aria-hidden />
          {provider ? `Handing off to ${provider}` : 'Handing off to the test provider'}
        </p>
      </div>
      <p className="mt-4 max-w-[280px] text-xs leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>
        Don&apos;t close this tab — you&apos;ll come back here when you&apos;re done.
      </p>
    </div>
  );
};

export default LaunchOverlay;
