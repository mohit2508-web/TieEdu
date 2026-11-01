import { useEffect, useRef } from 'react';
import type { NextRouter } from 'next/router';
import { API_BASE_URL } from '@/lib/api';
import { hasConsent, onConsentChange } from '@/lib/consent';

/**
 * Cookie identity + page-view observation (EMAIL_MARKETING_PLAN.md Phase 3).
 *
 * Two jobs, both silent, both best-effort — tracking must never be able to
 * break the page a cold lead just opened:
 *
 * 1. `?em=` exchange — the click redirect mints a short-lived identity token
 *    on the landing URL. On boot we POST it to `/api/email/identify`, which
 *    answers with the httpOnly `tieedu_lead` cookie, then strip the token
 *    from the address bar so it does not get bookmarked, screenshotted or
 *    re-sent as a live identity link.
 *
 * 2. Route-change beacon — every real navigation sends
 *    `navigator.sendBeacon('/api/email/track', { path, title })`. The SERVER
 *    decides whether anything is recorded: no cookie → nothing (there is no
 *    fingerprinting fallback, by design), auth/admin/asset paths → nothing,
 *    everything else → one `page_view` row with its category.
 *
 * The client cannot read the httpOnly cookie, so it never gates on "am I
 * identified?" — it always asks, and the server's 204 tells the truth. A
 * visitor without the cookie sends a beacon that writes nothing, which costs
 * one empty round trip and no data at all.
 *
 * Admin, auth and shallow query-sync navigations are skipped client-side
 * purely as politeness; the server enforces the same rules regardless.
 */
const NEVER_SEND_PREFIXES = ['/admin', '/login', '/signup', '/sign-up', '/api', '/_next'];

const shouldSend = (routePath: string): boolean => {
  const lower = routePath.toLowerCase();
  return !NEVER_SEND_PREFIXES.some((p) => lower === p || lower.startsWith(`${p}/`));
};

const sendTrack = (routePath: string) => {
  try {
    const payload = JSON.stringify({ path: routePath });
    // Blob with an explicit application/json type: sendBeacon's string form
    // sends text/plain, which express.json() would refuse to parse.
    const blob = new Blob([payload], { type: 'application/json' });
    const url = `${API_BASE_URL}/email/track`;
    if (!navigator.sendBeacon || !navigator.sendBeacon(url, blob)) {
      // Beacon queue full (rare, mobile) — fall back to fetch so the page
      // view is not silently dropped; keepalive survives the navigation.
      void fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // Tracking is expendable; the page is not.
  }
};

/** Where an `em` token waits (this tab only) until Analytics is allowed. */
const PENDING_KEY = 'tieedu_pending_em';

/**
 * Consent gate (PROFESSIONAL_PLATFORM_PLAN §2.2). Nothing here runs without
 * Analytics consent: the `em` token is stripped from the URL at once (so it is
 * never shared or bookmarked) and parked in sessionStorage; the exchange and
 * the page-view beacons start only when the visitor allows Analytics — now, or
 * later in the same tab from the banner.
 */
export function useLeadTracking(router: NextRouter) {
  const bootedRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    // React 18 strict mode runs effects twice in dev; boot handling (the `em`
    // strip especially) must happen exactly once.
    if (bootedRef.current) return;
    bootedRef.current = true;

    const url = new URL(window.location.href);
    const em = url.searchParams.get('em');
    if (em) {
      url.searchParams.delete('em');
      // replaceState, not a router push: no re-render, no scroll jump.
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ token: em, landing: url.pathname + url.search }));
      } catch {
        // Storage blocked: the token is simply dropped.
      }
    }

    const start = async () => {
      if (startedRef.current || !hasConsent('analytics')) return;
      startedRef.current = true;
      let pending: { token: string; landing: string } | null = null;
      try {
        pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
        sessionStorage.removeItem(PENDING_KEY);
      } catch {
        pending = null;
      }
      if (pending?.token) {
        try {
          await fetch(`${API_BASE_URL}/email/identify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(pending),
            keepalive: true,
          });
        } catch {
          // Best-effort: tracking must never break the page.
        }
      }
      if (shouldSend(window.location.pathname)) sendTrack(window.location.pathname + window.location.search);
    };

    void start();
    const offConsent = onConsentChange((s) => {
      if (s.analytics) void start();
      else startedRef.current = false;
    });

    const onRouteChange = (u: string, opts?: { shallow?: boolean }) => {
      if (opts?.shallow) return; // in-page query sync, not a new view
      if (!hasConsent('analytics') || !shouldSend(u)) return;
      sendTrack(u);
    };
    router.events.on('routeChangeComplete', onRouteChange);
    return () => {
      offConsent();
      router.events.off('routeChangeComplete', onRouteChange);
    };
  }, [router]);
}
