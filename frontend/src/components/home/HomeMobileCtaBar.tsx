import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, X } from 'lucide-react';

/**
 * The sticky "Start learning free" bar on the homepage (phones only).
 *
 * The hero CTA scrolls away with the first screenful, and everything below it
 * is rails — a visitor who has scrolled 600px is interested but has no action
 * in reach. This bar restores exactly one: the free-courses catalogue. It
 * appears below the fold, never on first paint; it dismisses for the session;
 * and it sits above the tab bar via `--tabbar-total` rather than under it.
 *
 * Desktop never sees it: the hero CTAs stay visible enough at those widths,
 * and a floating bar would fight the mouse-driven rails for attention.
 */

const DISMISS_KEY = 'tieedu_home_cta_dismissed';
const SHOW_AFTER_PX = 600;

export const HomeMobileCtaBar: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let session = false;
    try {
      session = window.sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      // Storage blocked: default to showing (per-scroll), never crash.
    }
    setDismissed(session);

    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (dismissed || !visible) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Dismissal for this mount only — acceptable fallback.
    }
  };

  return (
    <div className="fixed inset-x-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 pt-2.5 lg:hidden bottom-[var(--tabbar-total)]">
      <div className="mx-auto flex w-full max-w-[var(--reader-max)] items-center gap-3 pb-2.5">
        <Link
          href="/courses?src=mobilebar"
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-signal px-4 text-base font-extrabold text-white transition-colors hover:bg-signal focus-ring"
        >
          <GraduationCap className="h-4 w-4" aria-hidden /> Start learning free
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] focus-ring"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
};

export default HomeMobileCtaBar;
