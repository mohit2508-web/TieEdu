import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useConsent } from '@/lib/consent';

/**
 * One Google AdSense display slot (PROFESSIONAL_PLATFORM_PLAN §7).
 *
 * Off unless configured: needs NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…) and
 * NEXT_PUBLIC_ADSENSE_SLOT (a display ad unit id). Beyond that, a slot only
 * renders when all of these hold:
 *   - the visitor has made a cookie choice (the banner is not still asking);
 *     without Advertising consent the ad is requested non-personalised, and
 *     Consent Mode (lib/consent) already tells Google the same;
 *   - the visitor is not a paying student and not an admin;
 *   - the page is one of the few allowed public reading pages — callers place
 *     <AdSlot> only there, never in lessons, tests, checkout or account pages.
 * The box reserves its height up front so the page never jumps, is labelled
 * "Advertisement", and the script loads only when the box nears the screen.
 */
export const ADSENSE_CLIENT = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '').trim();
const ADSENSE_SLOT = (process.env.NEXT_PUBLIC_ADSENSE_SLOT || '').trim();

declare global {
  interface Window {
    adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadAdsense(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('adsense blocked'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export const AdSlot: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user, loading } = useAuth();
  const consent = useConsent();
  const box = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [blocked, setBlocked] = useState(false);

  const eligible =
    !!ADSENSE_CLIENT && !!ADSENSE_SLOT && !loading && !!consent && !(user && (user.has_paid || user.role === 'admin'));

  useEffect(() => {
    if (!eligible || !box.current || pushed.current) return;
    const el = box.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || pushed.current) return;
        pushed.current = true;
        io.disconnect();
        loadAdsense()
          .then(() => {
            const q = (window.adsbygoogle = window.adsbygoogle || ([] as unknown as NonNullable<Window['adsbygoogle']>));
            if (!consent?.advertising) q.requestNonPersonalizedAds = 1;
            q.push({});
          })
          .catch(() => setBlocked(true));
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eligible, consent]);

  if (!eligible || blocked) return null;

  return (
    <aside aria-label="Advertisement" className={`mx-auto w-full max-w-3xl ${className}`}>
      <p className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-muted">Advertisement</p>
      <div ref={box} className="min-h-[280px] overflow-hidden rounded-2xl border border-line bg-card">
        <ins
          className="adsbygoogle block"
          style={{ display: 'block', minHeight: 280 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
};
