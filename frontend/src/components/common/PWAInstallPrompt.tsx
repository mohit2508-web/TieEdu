import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { claimInterruption, interruptionTaken, isReturningVisitor } from '@/lib/engagement';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  // Off on a first visit, and when another popup already interrupted this session.
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isInstallable && !isInstalled && isReturningVisitor() && !interruptionTaken('pwa-install')) {
      setAllowed(claimInterruption('pwa-install'));
    }
  }, [isInstallable, isInstalled]);

  useEffect(() => {
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < thirtyDays) {
        setDismissed(true);
      } else {
        localStorage.removeItem('pwa-install-dismissed');
      }
    }
  }, []);

  /*
   * The drops feed and its share landing are full-screen surfaces: the card's
   * copy block, deadline and CTA all live in the bottom band this prompt
   * occupies — so the prompt would cover the exact content it is asking the
   * reader to leave. It also breaks the snap feed's "one screen, no chrome"
   * contract.
   *
   * The course detail route is off for the same class of reason: its fixed
   * bottom bars (the enrolment CTA, the lesson player's Next) live in this
   * band too, and this prompt sits at `z-50` above them at `z-30` — covering
   * the single most valuable control on the page. Off both; every other route
   * can carry it.
   */
  if (
    router.pathname === '/drops' ||
    router.pathname === '/drops/[id]' ||
    router.pathname === '/courses/[slug]'
  )
    return null;

  if (isInstalled || !isInstallable || dismissed || !allowed) {
    return null;
  }

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  return (
    <div className="fixed inset-x-4 bottom-[calc(var(--tabbar-total)_+_16px)] z-50 mx-auto max-w-sm rounded-2xl border border-line bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 md:inset-x-auto md:right-4 md:bottom-4 md:left-auto">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-signal-soft">
          <Download size={20} className="text-signal" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-heading">Get the TieEdu App</h2>
          <p className="mt-0.5 text-xs text-text-light">
            Install TieEdu for faster access, offline support & a native app experience.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-signal px-3 text-xs font-bold text-white transition-colors hover:bg-signal"
            >
              <Download size={16} strokeWidth={2.4} />
              Get App
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex min-h-[40px] items-center justify-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-text-light transition-colors hover:bg-paper"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-light transition-colors hover:bg-paper"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};
