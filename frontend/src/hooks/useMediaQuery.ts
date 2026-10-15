import { useEffect, useState } from 'react';

/**
 * SSR-safe media query. Returns `false` on the server and on the first client
 * render, then tracks the query. Callers must treat the first paint as the
 * desktop/default layout and upgrade after hydration — never gate a write or a
 * fetch on the initial `false`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
