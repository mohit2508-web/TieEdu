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
      <TieEduLoader />
      <Component {...pageProps} />
    </AuthProvider>
  );
}