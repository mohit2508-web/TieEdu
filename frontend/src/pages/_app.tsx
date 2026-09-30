import type { AppProps } from 'next/app';
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

  return (
    <AuthProvider>
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
            <Component {...pageProps} />
          </AppShell>
        </ShellProvider>
      </CartProvider>
    </AuthProvider>
  );
}