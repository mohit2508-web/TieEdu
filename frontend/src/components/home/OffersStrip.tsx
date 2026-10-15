import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgePercent, Check, Copy, Timer } from 'lucide-react';
import { Reveal } from '@/components/home/Reveal';
import { fetchActiveCouponsApi } from '@/lib/api';

/**
 * The live offers strip — real coupons, never a fake discount.
 *
 * Fed by the public `GET /api/checkout/coupons` feed, which lists only codes
 * that actually redeem right now (active, unexpired, unexhausted, never a
 * single-use reward code). Renders nothing when the feed is empty or down: an
 * offers strip with no offers would be a lie, and a broken strip must not
 * break the homepage (the same contract DropsStrip keeps).
 *
 * Every offer is a working CTA. Tapping the card copies the code AND stages it
 * as the cart's pending coupon, then deep-links to the target — the specific
 * course when the offer names exactly one, the branch-filtered catalogue when
 * it names a branch, otherwise the catalogue. The cart drawer picks the
 * pending code up on open and applies it through the same server validation
 * as a hand-typed code. Urgency appears only when the coupon carries a real
 * `expires_at`; remaining-uses appears only when `max_uses > 0`.
 */

export const PENDING_COUPON_KEY = 'tieedu_pending_coupon_v1';

export interface PublicOffer {
  id: string;
  code: string;
  label: string;
  discount_percent: number;
  discount_flat: number;
  max_uses: number;
  uses: number;
  remaining: number | null;
  expires_at: string | null;
  applies_to_course_ids: string[];
  applies_to_branch: string | null;
  courses: { id: string; slug: string; title: string; price_inr: number; is_free: boolean }[];
}

function discountText(o: PublicOffer): string {
  const parts: string[] = [];
  if (o.discount_percent > 0) parts.push(`${o.discount_percent}% off`);
  if (o.discount_flat > 0) parts.push(`₹${Math.round(o.discount_flat)} off`);
  return parts.length > 0 ? parts.join(' + ') : 'Special offer';
}

function targetHref(o: PublicOffer): string {
  const code = `coupon=${encodeURIComponent(o.code)}`;
  if (o.courses.length === 1) return `/courses/${o.courses[0].slug}?${code}&src=offers`;
  if (o.applies_to_branch) return `/courses?branch=${encodeURIComponent(o.applies_to_branch)}&${code}&src=offers`;
  return `/courses?${code}&src=offers`;
}

function targetLabel(o: PublicOffer): string {
  if (o.courses.length === 1) return o.courses[0].title;
  if (o.applies_to_branch) return 'Branch courses';
  return 'All courses';
}

/** "Ends in 2d 5h" — computed from the real expiry, refreshed each minute. */
function useCountdown(expiresAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  if (d > 0) return `Ends in ${d}d ${h}h`;
  const m = Math.max(1, Math.floor((ms % 3_600_000) / 60_000));
  return `Ends in ${h}h ${m}m`;
}

const OfferCard: React.FC<{ offer: PublicOffer }> = ({ offer }) => {
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(offer.expires_at);

  const stage = async () => {
    try {
      window.localStorage.setItem(PENDING_COUPON_KEY, offer.code);
    } catch {
      // Staging is a convenience; the code chip below still copies.
    }
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied (older WebView): the code stays visible to type.
    }
  };

  return (
    <div className="flex w-[300px] flex-none snap-start flex-col gap-3 rounded-2xl border border-[#E9E7E1] bg-white p-4 sm:w-[320px]">
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBF1E1] text-[#B45309]">
          <BadgePercent className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-extrabold text-[#10151C]">{offer.label}</p>
          <p className="text-[13px] font-bold text-[#15803D]">{discountText(offer)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-[var(--text-muted)]">
        {offer.remaining !== null && <span>{offer.remaining} left</span>}
        {countdown && (
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" aria-hidden /> {countdown}
          </span>
        )}
        <span className="truncate">On: {targetLabel(offer)}</span>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={stage}
          title="Copy code"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#0284C7]/50 bg-[#E8F4FB] px-3 font-mono text-[14px] font-extrabold tracking-wider text-[#0E2A44] transition-colors hover:bg-[#D8EDFA] focus-ring"
        >
          {copied ? <Check className="h-4 w-4 text-[#15803D]" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? 'Copied!' : offer.code}
        </button>
        <Link
          href={targetHref(offer)}
          onClick={stage}
          aria-label={`Use ${offer.code} on ${targetLabel(offer)}`}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#0284C7] px-3 text-white transition-colors hover:bg-[#0369A1] focus-ring"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
};

export const OffersStrip: React.FC = () => {
  const [offers, setOffers] = useState<PublicOffer[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchActiveCouponsApi()
      .then((data) => {
        if (active) setOffers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setOffers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (offers !== null && offers.length === 0) return null;

  return (
    <section aria-label="Live offers" className="border-b border-[#E9E7E1] bg-[#FAFAF9]">
      <Reveal className="mx-auto w-full max-w-[1700px] px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="eyebrow">Live offers</span>
            <h2 className="font-serif-heading text-2xl font-extrabold leading-tight text-[#10151C] sm:text-3xl">
              Save on paid courses
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[var(--text-muted)]">
              Real codes, working right now — tap to copy, applied at checkout.
            </p>
          </div>
          <Link
            href="/courses?src=offers"
            className="inline-flex shrink-0 items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-[14px] font-bold text-[#0271B5] hover:text-[#025a95] transition-colors focus-ring"
          >
            All courses <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="rail-track">
          {offers === null
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="h-[212px] w-[300px] flex-none snap-start animate-pulse rounded-2xl bg-[#F0EFEC] sm:w-[320px]"
                />
              ))
            : offers.map((o) => <OfferCard key={o.id} offer={o} />)}
        </div>
      </Reveal>
    </section>
  );
};

export default OffersStrip;
