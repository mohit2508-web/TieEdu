import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
// Carlito is the self-hosted, metric-compatible stand-in for Calibre (OFL, so
// it can ship with the product). Self-hosting keeps the reading experience
// intact offline and avoids depending on a font CDN.
import '@fontsource/carlito/400.css';
import '@fontsource/carlito/700.css';
import { TieEduLoader } from '@/components/common/TieEduLoader';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ShellProvider } from '@/context/ShellContext';
import { AppShell } from '@/components/layout/AppShell';
import { RouteTransition } from '@/components/layout/RouteTransition';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Every full page navigation must land at the TOP — not at the middle/bottom
  // of the previous scroll. Shallow route changes (?m/?q in-page syncs) are
  // intentionally left alone so the reader/catalog position is preserved.
  useEffect(() => {
    const scrollToTop = (url: string, opts?: { shallow?: boolean }) => {
      if (opts?.shallow) return;
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
    };
    router.events.on('routeChangeComplete', scrollToTop);
    return () => router.events.off('routeChangeComplete', scrollToTop);
  }, [router]);

  /*
    Register the service worker (Phase 0 — MOBILE_APP_UI_PLAN.md §0.5).
    Production only, and after `load`, so it never competes with the first
    paint. The worker itself decides what is cacheable; see the never-cache
    list in `public/sw.js` for the entitlement/money routes.

    `TieEduLoader` is not used as the readiness signal here: on a cold visit
    `load` can fire while the auth call is still in flight, and holding the
    registration until then would delay the very install prompt we want early.
  */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // A failed registration must never break the app; it only means no
        // offline shell, which is a degraded experience, not a broken one.
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return (
    <AuthProvider>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        {/*
          The single viewport tag (Phase 0 — MOBILE_APP_UI_PLAN.md §0.1 / §0.5).

          It lives here, in `next/head`, and NOT in `_document.tsx`'s `<Head>`, and
          that is the whole fix for a duplicate that had been shipping:

          - `next/document`'s `<Head>` does not dedupe. Next's Pages Router seeds
            every page head with `defaultHead()` (`next/dist/shared/lib/head.js`),
            which pushes `<meta name="viewport" content="width=device-width">`.
            Adding ours there produced two tags, and the outcome depended on
            browser precedence between them, which is not specified — so
            `viewport-fit=cover` may simply have been ignored, quietly disabling
            every `env(safe-area-inset-*)` value AppShell relies on. Next 14 also
            warns against viewport tags in `_document` for exactly this reason.
          - `next/head` *does* dedupe. Its `unique()` keys `<meta>` on the `name`
            prop, and `reduceComponents` evaluates the user head before
            `defaultHead()`, so ours is kept and the default is dropped. Result is
            exactly one tag, deterministically, in every browser.

          `viewport-fit=cover` is what makes an installed app paint edge-to-edge
          instead of letterboxed, and it is the switch that makes
          `env(safe-area-inset-*)` return non-zero values.
        */}
        <meta
          name="viewport"
          key="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </Head>
      {/*
        Order matters. `CartProvider` and `ShellProvider` sit inside `AuthProvider`
        so the shell can read the user for role-gated destinations, and outside
        `AppShell` so a page can reach the same cart the header badge reads.
        This is the only place the chrome is mounted — pages render content.
      */}
      <CartProvider>
        <ShellProvider>
          <TieEduLoader />
          <AppShell>
            {/*
              Phase 1 — MOBILE_APP_UI_PLAN.md §1.4. Inside `AppShell` rather than
              around it: the header, tab bar and overlays are the persistent frame,
              and animating them on every route change would slide the navigation
              off screen and back once per page — the exact "web page" tell §1.4
              exists to remove. Only the page between them moves.
            */}
            <RouteTransition>
              <Component {...pageProps} />
            </RouteTransition>
          </AppShell>
        </ShellProvider>
      </CartProvider>
    </AuthProvider>
  );
}