import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

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
   * contract. Off both; every other route can carry it.
   */
  if (router.pathname === '/drops' || router.pathname === '/drops/[id]') return null;

  if (isInstalled || !isInstallable || dismissed) {
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
    <div className="fixed inset-x-4 bottom-[calc(var(--tabbar-total)_+_16px)] z-50 mx-auto max-w-sm rounded-2xl border border-[#EDEDEB] bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 md:inset-x-auto md:right-4 md:bottom-4 md:left-auto">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#E0F2FE]">
          <Download size={20} className="text-[#0284C7]" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#10151C]">Get the TieEdu App</h3>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            Install TieEdu for faster access, offline support & a native app experience.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#0284C7] px-3 text-xs font-bold text-white transition-colors hover:bg-[#0369A1]"
            >
              <Download size={16} strokeWidth={2.4} />
              Get App
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex min-h-[40px] items-center justify-center rounded-xl border border-[#EDEDEB] bg-white px-3 text-xs font-semibold text-[#6B7280] transition-colors hover:bg-[#F5F5F4]"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F5F5F4]"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};
