import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { RefreshCw, WifiOff, X } from 'lucide-react';
import { DropsFeed } from '@/components/drops/DropsFeed';
import { DropsFilterBar, type DropsFilter } from '@/components/drops/DropsFilterBar';
import { DropDetailSheet } from '@/components/drops/DropDetailSheet';
import { DropNotInterestedSheet } from '@/components/drops/DropNotInterestedSheet';
import { useAuth } from '@/context/AuthContext';
import { apiAssetUrl } from '@/lib/assetUrl';
import {
  fetchDropDetailApi,
  fetchDropFeedApi,
  fetchSavedDropsApi,
  muteDropApi,
  postDropEventApi,
  saveDropApi,
  unsaveDropApi,
  type DropDetail,
  type DropFeedItem,
  type DropMuteKind,
} from '@/lib/dropsApi';

const AuthRequiredModal = dynamic(
  () => import('@/components/modals/AuthRequiredModal').then((m) => m.AuthRequiredModal),
  { ssr: false }
);

/**
 * The snapshot a cold or offline load falls back to. The feed itself is never
 * cacheable server-side (it is ordered per viewer) and it is deliberately NOT
 * in the service worker's CACHEABLE_API list — this is the offline story:
 * the last page the student actually saw, replayed locally.
 */
const CACHE_KEY = 'tieedu_drops_cache_v1';
const PAGE_SIZE = 12;

const readCache = (): DropFeedItem[] | null => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) && parsed.items.length > 0 ? (parsed.items as DropFeedItem[]) : null;
  } catch {
    return null;
  }
};

const writeCache = (items: DropFeedItem[]): void => {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ items: items.slice(0, PAGE_SIZE), at: Date.now() }));
  } catch {
    /* private mode — the cache is a nicety, never a hard failure */
  }
};

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong');

export default function DropsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [filter, setFilter] = useState<DropsFilter>('');
  const [items, setItems] = useState<DropFeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [stale, setStale] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string>('');

  const [detail, setDetail] = useState<DropDetail | null>(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [mutedTarget, setMutedTarget] = useState<DropFeedItem | null>(null);
  const [muteBusy, setMuteBusy] = useState(false);
  const [muteError, setMuteError] = useState('');
  const [authFor, setAuthFor] = useState<'save' | 'mute' | null>(null);

  const cursorRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const itemsRef = useRef<DropFeedItem[]>([]);
  itemsRef.current = items;
  /** Creatives already kicked into the browser cache for this feed session. */
  const prefetchedRef = useRef<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  /** Ids already beaconed as a view this session — one view per activation set. */
  const resetAndLoad = useCallback(async () => {
    busyRef.current = true;
    setLoading(true);
    setError(undefined);
    setStale(false);
    setActiveIndex(0);
    prefetchedRef.current.clear();

    const savedPromise =
      user && filter !== 'saved'
        ? fetchSavedDropsApi().then((r) => new Set(r.items.map((i) => i.id)))
        : Promise.resolve<Set<string> | null>(null);

    try {
      if (filter === 'saved') {
        const r = await fetchSavedDropsApi();
        setItems(r.items);
        setTotal(r.items.length);
        cursorRef.current = null;
        setHasMore(false);
        setSavedIds(new Set(r.items.map((i) => i.id)));
      } else {
        const page = await fetchDropFeedApi({ type: filter || undefined, limit: PAGE_SIZE });
        setItems(page.items);
        setTotal(page.total);
        cursorRef.current = page.next_cursor;
        setHasMore(!!page.next_cursor);
        if (!filter) writeCache(page.items);
        const saved = await savedPromise;
        if (saved) setSavedIds(saved);
      }
    } catch (e) {
      // Offline or down: replay the last snapshot rather than a dead end.
      const cached = filter === '' ? readCache() : null;
      if (cached) {
        setItems(cached);
        setTotal(cached.length);
        setStale(true);
        setHasMore(false);
        cursorRef.current = null;
      } else {
        setError(errMsg(e));
      }
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [filter, user]);

  useEffect(() => {
    resetAndLoad();
  }, [resetAndLoad]);

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore || !cursorRef.current || filter === 'saved') return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchDropFeedApi({ type: filter || undefined, cursor: cursorRef.current, limit: PAGE_SIZE });
      cursorRef.current = page.next_cursor;
      setHasMore(!!page.next_cursor);
      setTotal(page.total);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
      });
    } catch (e) {
      setNotice(errMsg(e));
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [filter, hasMore]);

  const needsAuth = useCallback(
    (action: 'save' | 'mute'): boolean => {
      if (user) return true;
      setAuthFor(action);
      return false;
    },
    [user]
  );

  const handleLeave = useCallback((item: DropFeedItem, dwellMs: number) => {
    // Fire-and-forget: a beacon must never block or surface UI.
    postDropEventApi(item.id, 'view', Math.min(dwellMs, 600000)).catch(() => {});
  }, []);

  /**
   * Prefetch the next card's creative the moment one becomes active.
   *
   * The feed is a snap scroller: by the time the reader has finished with card
   * N, card N+1's image is already in the HTTP cache, so the swipe paints
   * instead of flashing an empty frame. Budget is deliberately +1 card —
   * prefetching the whole page would fight the phone's memory for no gain.
   */
  const handleActiveChange = useCallback((item: DropFeedItem | null) => {
    if (!item) return;
    const list = itemsRef.current;
    const i = list.findIndex((x) => x.id === item.id);
    if (i < 0) return;
    setActiveIndex(i);
    const next = list[i + 1];
    if (next?.image_url && !prefetchedRef.current.has(next.id)) {
      prefetchedRef.current.add(next.id);
      const img = new Image();
      img.src = apiAssetUrl(next.image_url);
    }
  }, []);

  const handleSave = useCallback(
    async (item: DropFeedItem) => {
      if (!needsAuth('save')) return;
      const wasSaved = savedIds.has(item.id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      try {
        if (wasSaved) await unsaveDropApi(item.id);
        else await saveDropApi(item.id);
        setNotice(wasSaved ? 'Removed from Saved' : 'Saved — find it under the Saved filter');
      } catch (e) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(item.id);
          else next.delete(item.id);
          return next;
        });
        setNotice(errMsg(e));
      }
    },
    [savedIds, needsAuth]
  );

  const handleShare = useCallback((item: DropFeedItem) => {
    const url = `${window.location.origin}/drops/${item.id}`;
    const done = () => {
      setNotice('Link copied');
      postDropEventApi(item.id, 'share').catch(() => {});
    };
    if (typeof navigator.share === 'function') {
      navigator.share({ title: item.headline, url }).then(
        () => postDropEventApi(item.id, 'share').catch(() => {}),
        () => {
          /* cancelled — not an error */
        }
      );
    } else {
      navigator.clipboard.writeText(url).then(done, () => setNotice('Could not copy the link'));
    }
  }, []);

  const handleCta = useCallback(
    (item: DropFeedItem) => {
      postDropEventApi(item.id, 'cta_click').catch(() => {});
      if (item.cta_url) {
        window.open(item.cta_url, '_blank', 'noopener,noreferrer');
        return;
      }
      const route = item.cta_route || (item.target_slug ? `/company/${item.target_slug}` : null);
      if (route) router.push(route);
    },
    [router]
  );

  const handleReadMore = useCallback(async (item: DropFeedItem) => {
    postDropEventApi(item.id, 'read_more').catch(() => {});
    try {
      const full = await fetchDropDetailApi(item.id);
      setDetail(full);
    } catch (e) {
      setNotice(errMsg(e));
    }
  }, []);

  const handleMute = useCallback(
    async (kind: DropMuteKind) => {
      const target = mutedTarget;
      if (!target) return;
      if (!needsAuth('mute')) {
        // Two stacked bottom sheets would fight — close this one first.
        setMutedTarget(null);
        return;
      }
      setMuteBusy(true);
      setMuteError('');
      try {
        await muteDropApi(target.id, kind, kind === 'company' ? target.target_slug || undefined : undefined);
        setItems((prev) =>
          prev.filter((d) => {
            if (kind === 'drop') return d.id !== target.id;
            if (kind === 'type') return d.type !== target.type;
            return d.target_slug === target.target_slug ? false : true;
          })
        );
        setMutedTarget(null);
        setNotice('Thanks — you will see fewer of these.');
      } catch (e) {
        setMuteError(errMsg(e));
      } finally {
        setMuteBusy(false);
      }
    },
    [mutedTarget, needsAuth]
  );

  const detailSaved = detail ? savedIds.has(detail.id) : false;

  /** Progress fill for the 2px bar under the filters — transform only. */
  const progressScale = items.length > 0 ? Math.min(1, (activeIndex + 1) / items.length) : 0;

  const toggleDetailSave = useCallback(async () => {
    if (!detail) return;
    setSavingDetail(true);
    try {
      await handleSave(detail);
    } finally {
      setSavingDetail(false);
    }
  }, [detail, handleSave]);

  return (
    <>
      <Head>
        <title>Drops — TieEdu</title>
        <meta
          name="description"
          content="Swipe the TieEdu career feed — jobs, vaults, contests, deadlines and tips."
        />
      </Head>

      <div className="drops-shell">
        <aside className="drops-rail">
          <p className="eyebrow">Drops</p>
          <h1 className="mt-1 text-lg font-extrabold leading-tight text-[var(--text-heading)]">
            The career feed
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
            Jobs, vaults, contests and deadlines — one swipe at a time.
          </p>
          <div className="mt-4">
            <DropsFilterBar variant="rail" value={filter} onChange={setFilter} />
          </div>
        </aside>

        <div className="drops-main">
          <div className="drops-page">
            <DropsFilterBar variant="bar" value={filter} onChange={setFilter} />

            {/* 2px position fill under the filters — no layout work on swipe. */}
            <div className="drops-progress" aria-hidden="true">
              <span style={{ transform: `scaleX(${progressScale})` }} />
            </div>

            {stale && (
              <div
                role="status"
                className="flex items-center gap-2 bg-[#FFF7E8] px-4 py-2 text-xs font-semibold text-[var(--amber-deep)]"
              >
                <WifiOff size={14} className="flex-none" aria-hidden />
                <span className="flex-1">Offline — showing the last feed you loaded.</span>
                <button type="button" className="btn btn-ghost h-8 px-3 text-xs" onClick={resetAndLoad}>
                  Refresh
                </button>
              </div>
            )}

            {!stale && notice && (
              <div
                role="status"
                className="flex items-center gap-2 bg-[var(--brand-sky-soft)] px-4 py-2 text-xs font-semibold text-[var(--brand-sky-strong)]"
              >
                <span className="flex-1">{notice}</span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setNotice('')}
                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5"
                >
                  <X size={13} aria-hidden />
                </button>
              </div>
            )}

            {/*
              Online refresh. The feed is per-viewer and never SW-cached, so
              "pull the current ordering again" is a real action — and on a snap
              scroller a pull-to-refresh gesture would fight the card snap, so
              the affordance is a button instead.
            */}
            {!stale && items.length > 0 && (
              <div className="flex justify-end px-3 pb-1">
                <button
                  type="button"
                  className="btn btn-ghost h-8 gap-1.5 px-2.5 text-xs"
                  onClick={resetAndLoad}
                  aria-label="Refresh the drops feed"
                >
                  <RefreshCw size={13} strokeWidth={2.4} aria-hidden />
                  Refresh
                </button>
              </div>
            )}

            <DropsFeed
              items={items}
              loading={loading}
              loadingMore={loadingMore}
              hasMore={hasMore}
              savedIds={savedIds}
              error={error}
              onRetry={resetAndLoad}
              onLeave={handleLeave}
              onActiveChange={handleActiveChange}
              onReachEnd={loadMore}
              onCta={handleCta}
              onReadMore={handleReadMore}
              onSave={handleSave}
              onShare={handleShare}
              onNotInterested={(item) => {
                setMuteError('');
                setMutedTarget(item);
              }}
            />
          </div>
        </div>
      </div>

      <DropDetailSheet
        drop={detail}
        saved={detailSaved}
        saving={savingDetail}
        onClose={() => setDetail(null)}
        onCta={() => detail && handleCta(detail)}
        onSave={toggleDetailSave}
      />

      <DropNotInterestedSheet
        drop={mutedTarget}
        busy={muteBusy}
        error={muteError}
        onClose={() => setMutedTarget(null)}
        onMute={handleMute}
      />

      <AuthRequiredModal
        isOpen={!!authFor}
        onClose={() => setAuthFor(null)}
        onSuccess={() => setAuthFor(null)}
        targetTitle={authFor === 'mute' ? 'Mute this drop' : 'Save this drop'}
      />
    </>
  );
}
