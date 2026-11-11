import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchPracticeHome, type PracticeHome } from '@/lib/codeApi';

/**
 * The practice summary the rails show (counts, companies, next problem, activity).
 * One request shared by every practice page, kept for 30 s, so moving between
 * pages does not refetch it each time.
 */
let cache: { key: string; at: number; data: PracticeHome } | null = null;
let inflight: { key: string; p: Promise<PracticeHome> } | null = null;

export function usePracticeSummary(enabled = true): PracticeHome | null {
  const { user } = useAuth();
  const key = user?.id || 'guest';
  const fresh = cache && cache.key === key && Date.now() - cache.at < 30_000 ? cache.data : null;
  const [data, setData] = useState<PracticeHome | null>(fresh);
  useEffect(() => {
    if (!enabled) return;
    if (fresh) { setData(fresh); return; }
    let live = true;
    if (!inflight || inflight.key !== key) {
      const p = fetchPracticeHome();
      inflight = { key, p };
      p.then((d) => { cache = { key, at: Date.now(), data: d }; }).catch(() => undefined).finally(() => { if (inflight?.p === p) inflight = null; });
    }
    inflight.p.then((d) => { if (live) setData(d); }).catch(() => undefined);
    return () => { live = false; };
  }, [key, fresh, enabled]);
  return data;
}

/** Consecutive practice days ending today (or yesterday, so the streak survives until tonight). */
export function streakOf(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (!set.has(iso(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(iso(d))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}
