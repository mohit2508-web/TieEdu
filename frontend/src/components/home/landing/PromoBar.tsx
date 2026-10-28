import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { fetchActiveCouponsApi } from '@/lib/api';
import type { PublicOffer } from '@/components/home/OffersStrip';

/**
 * E1 · Promo bar (UI_REDESIGN_PLAN_V3 §9, decision D4): an amber, hatched bar
 * for a real, dated offer only. It shows the live coupon that expires soonest,
 * with a countdown to its real `expires_at`, and renders nothing when no
 * coupon has a date — an "ends in" with no end would be a lie. Dismissing it
 * hides that coupon for the session.
 */

const DISMISS_KEY = 'tieedu_promo_dismissed';

function left(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${d}d ${hh}:${mm}:${ss}`;
}

function offerText(o: PublicOffer) {
  if (o.discount_percent > 0) return `${o.discount_percent}% off`;
  if (o.discount_flat > 0) return `₹${Math.round(o.discount_flat)} off`;
  return 'An offer';
}

export const PromoBar: React.FC = () => {
  const [offer, setOffer] = useState<PublicOffer | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    fetchActiveCouponsApi()
      .then((list: PublicOffer[]) => {
        if (!active || !Array.isArray(list)) return;
        let dismissed: string | null = null;
        try {
          dismissed = sessionStorage.getItem(DISMISS_KEY);
        } catch {
          /* storage blocked: show it */
        }
        const dated = list
          .filter((o) => o.expires_at && Date.parse(o.expires_at) > Date.now() && o.code !== dismissed)
          .sort((a, b) => Date.parse(a.expires_at!) - Date.parse(b.expires_at!));
        setOffer(dated[0] ?? null);
      })
      .catch(() => {
        /* no feed, no bar */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!offer) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [offer]);

  if (!offer || !offer.expires_at) return null;
  const remaining = Date.parse(offer.expires_at) - now;
  if (remaining <= 0) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, offer.code);
    } catch {
      /* ignore */
    }
    setOffer(null);
  };

  return (
    <div className="hatch relative bg-signal text-on-primary" role="region" aria-label="Offer">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-12 py-2.5 text-center font-display text-sm font-semibold">
        <span className="font-mono">{offer.code}</span>
        <span aria-hidden>·</span>
        <span>{offerText(offer)}</span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-2">
          Ends in
          <span className="rounded-full bg-heading px-2.5 py-0.5 font-mono text-caption tabular-nums text-card" aria-live="off">
            {left(remaining)}
          </span>
        </span>
        <Link
          href={`/courses?coupon=${encodeURIComponent(offer.code)}&src=promo`}
          className="focus-ring inline-flex items-center gap-1 rounded underline-offset-4 hover:underline"
        >
          Use it <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide this offer"
        className="focus-ring absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full hover:bg-heading/10"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
};

export default PromoBar;
