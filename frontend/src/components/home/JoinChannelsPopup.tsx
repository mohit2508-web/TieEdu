import React, { useEffect, useState } from 'react';
import { Users, Megaphone } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';
import { SOCIAL_LINKS } from '@/lib/socialLinks';

const DISMISS_KEY = 'tieedu_join_channels_dismissed';
/** Re-show the popup at most once a week — "kabhi kabhi", never every visit. */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
/** Let the landing page settle before interrupting. */
const SHOW_DELAY_MS = 6000;

function canShowPopup(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return true;
    const ts = parseInt(dismissedAt, 10);
    if (!Number.isFinite(ts) || Date.now() - ts >= COOLDOWN_MS) {
      window.localStorage.removeItem(DISMISS_KEY);
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

function dismissPopup(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* storage blocked — dismiss for this visit only */
  }
}

/**
 * Occasional "Join our channels" promo on the landing page.
 *
 * Shown once, then silenced for 7 days (localStorage timestamp). Opens after a
 * short delay so the hero is readable first; dismissible like every other sheet
 * (grabber, backdrop, Escape, close). Social handles come from the shared
 * `SOCIAL_LINKS` list the footer also uses.
 */
export const JoinChannelsPopup: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!canShowPopup()) return;
    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    setOpen(false);
    dismissPopup();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Join our channels"
      data-testid="join-channels-popup"
      footer={
        <button
          type="button"
          onClick={close}
          className="w-full py-2 text-xs font-bold text-gray-500 transition-colors active:text-gray-800"
        >
          Maybe later
        </button>
      }
    >
      <div className="space-y-4 px-5 pb-5 pt-1 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-[#0284C7] shadow-xs">
          <Users className="h-7 w-7" />
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-bold text-[#0284C7]">
          <Megaphone className="h-3.5 w-3.5" /> Stay in the loop
        </span>

        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-gray-600">
          Drive alerts, free-test drops and placement tips — straight from TieEdu on the platforms
          you already use.
        </p>

        <div className="space-y-2">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.id}
              href={social.href}
              target="_blank"
              rel="noreferrer noopener"
              className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left text-sm font-bold text-gray-900 transition-colors hover:border-[#0284C7]/30 hover:bg-sky-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-white text-[#3E4754]">
                {social.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{social.label}</span>
              <span className="text-xs font-semibold text-[#0284C7]">Follow →</span>
            </a>
          ))}
        </div>
      </div>
    </Sheet>
  );
};
