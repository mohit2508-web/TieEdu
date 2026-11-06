import { useEffect, useState } from 'react';
import { fetchDropNewCountApi } from './dropsApi';
import { DROPS_LAST_VISIT_KEY } from './dropsLite';

/**
 * "Drops • 5 new" for the nav.
 *
 * Counts live drops published since this device last opened /drops (a first
 * visit counts the last 3 days). One small request on load and every 10 minutes —
 * the server answers from memory — and the badge clears the moment the
 * Drops page dispatches `tieedu:drops-visited`.
 */
const EVERY_MS = 10 * 60 * 1000;
const FIRST_VISIT_WINDOW_MS = 3 * 86_400_000;

/** Header and tab bar both mount this hook — they share one request. */
let shared: { key: string; at: number; p: Promise<{ new: number }> } | null = null;
const countSince = (since: string) => {
  if (!shared || shared.key !== since || Date.now() - shared.at > 30_000) {
    shared = { key: since, at: Date.now(), p: fetchDropNewCountApi(since) };
  }
  return shared.p;
};

export const useDropsNewCount = (enabled = true): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const load = () => {
      let since = '';
      try {
        since = window.localStorage.getItem(DROPS_LAST_VISIT_KEY) || '';
      } catch {
        /* private mode */
      }
      // Rounded to the hour so both mounts ask the same question (one request).
      if (!since) since = new Date(Math.floor((Date.now() - FIRST_VISIT_WINDOW_MS) / 3_600_000) * 3_600_000).toISOString();
      countSince(since).then((r) => live && setCount(r.new || 0), () => {});
    };
    const clear = () => setCount(0);
    load();
    const timer = window.setInterval(load, EVERY_MS);
    window.addEventListener('tieedu:drops-visited', clear);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener('tieedu:drops-visited', clear);
    };
  }, [enabled]);

  return count;
};
