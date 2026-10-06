'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Inbox } from 'lucide-react';
import { DropCard } from './DropCard';
import type { DropFeedItem } from '@/lib/dropsApi';

/** Below this visibility a card does not count as "the one being read". */
const ACTIVE_RATIO = 0.6;

export interface DropsFeedProps {
  items: DropFeedItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  savedIds: Set<string>;
  error?: string;
  onRetry: () => void;
  /** The reader scrolled past a card: flush its view beacon with the dwell. */
  onLeave: (item: DropFeedItem, dwellMs: number) => void;
  /** The card the reader is on — the page uses it for position and prefetch. */
  onActiveChange: (item: DropFeedItem | null) => void;
  /** The last card is on screen — page fetches the next cursor. */
  onReachEnd: () => void;
  onCta: (item: DropFeedItem) => void;
  onReadMore: (item: DropFeedItem) => void;
  onSave: (item: DropFeedItem) => void;
  onShare: (item: DropFeedItem) => void;
  onNotInterested: (item: DropFeedItem) => void;
}

const SkeletonCard: React.FC = () => (
  <div className="drop-slide" aria-hidden="true">
    <div className="drop-skeleton">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="h-6 w-24 rounded-full bg-white/10" />
        <div className="space-y-2 pb-4">
          <div className="h-5 w-4/5 rounded bg-white/15" />
          <div className="h-4 w-3/5 rounded bg-white/10" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * The swipe feed.
 *
 * IntersectionObserver runs against the scroller (not the window), so a card is
 * "active" exactly while it owns the screen — which is also the unit the view
 * beacon bills: `onLeave` carries the dwell, and the observer flushes the card
 * you were on whenever you move off it or unmount the feed. One observer for
 * all cards, re-observed when the item list changes (filter switch, cursor
 * append).
 *
 * The active card is also marked on the DOM (`data-active`) so CSS can dim the
 * cards sliding past without a React re-render — the scroll path stays free of
 * component work.
 *
 * The page's callbacks are held in refs on purpose: `onLeave` is a network
 * write, and if the effect re-ran because a parent re-rendered with a fresh
 * inline closure, the cleanup would flush — and bill — on every render.
 */
export const DropsFeed: React.FC<DropsFeedProps> = ({
  items,
  loading,
  loadingMore,
  hasMore,
  savedIds,
  error,
  onRetry,
  onLeave,
  onActiveChange,
  onReachEnd,
  onCta,
  onReadMore,
  onSave,
  onShare,
  onNotInterested,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  /** id → the dwell entry, while the reader is sitting on that card. */
  const dwellRef = useRef<Map<string, { item: DropFeedItem; since: number }>>(new Map());
  const activeIdRef = useRef<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const onLeaveRef = useRef(onLeave);
  const onActiveRef = useRef(onActiveChange);
  const onReachEndRef = useRef(onReachEnd);
  onLeaveRef.current = onLeave;
  onActiveRef.current = onActiveChange;
  onReachEndRef.current = onReachEnd;
  lastIdRef.current = items.length > 0 ? items[items.length - 1].id : null;

  const flushActive = useCallback((id: string | null) => {
    if (!id) return;
    const entry = dwellRef.current.get(id);
    if (!entry) return;
    onLeaveRef.current(entry.item, Math.max(0, Date.now() - entry.since));
    dwellRef.current.delete(id);
  }, []);

  /** Flip `data-active` on the slides — imperative, never a re-render. */
  const markActiveDom = useCallback((id: string | null) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    for (const card of Array.from(viewport.querySelectorAll<HTMLElement>('[data-drop-id]'))) {
      if (id && card.dataset.dropId === id) card.setAttribute('data-active', 'true');
      else card.removeAttribute('data-active');
    }
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const ratios = new Map<string, number>();
    let settleTimer: number | null = null;

    const settle = () => {
      settleTimer = null;
      let bestId: string | null = null;
      let bestRatio = 0;
      ratios.forEach((ratio, id) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      });
      const nextId = bestRatio >= ACTIVE_RATIO ? bestId : null;

      if (nextId !== activeIdRef.current) {
        flushActive(activeIdRef.current);
        activeIdRef.current = nextId;
        markActiveDom(nextId);
        if (nextId) {
          const item = items.find((i) => i.id === nextId) || null;
          if (item && !dwellRef.current.has(nextId)) {
            dwellRef.current.set(nextId, { item, since: Date.now() });
          }
          onActiveRef.current(item);
        } else {
          onActiveRef.current(null);
        }
      }

      if (bestId && bestId === lastIdRef.current && bestRatio > 0) onReachEndRef.current();
    };

    // Coalesce the burst an intersection produces (a swipe can flip three
    // thresholds at once) into one settle.
    const schedule = () => {
      if (settleTimer === null) settleTimer = window.setTimeout(settle, 60);
    };

    const observer = new IntersectionObserver(schedule, {
      root: viewport,
      threshold: [0, 0.25, 0.5, ACTIVE_RATIO, 0.9, 1],
    });

    ratios.clear();
    for (const card of Array.from(viewport.querySelectorAll<HTMLElement>('[data-drop-id]'))) {
      const id = card.dataset.dropId;
      if (!id) continue;
      ratios.set(id, 0);
      observer.observe(card);
    }
    schedule();

    return () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      observer.disconnect();
      // Leaving the route (or swapping the filter) must not drop the dwell of
      // the card the reader was on — that is the only place it is recorded.
      flushActive(activeIdRef.current);
      activeIdRef.current = null;
      markActiveDom(null);
      ratios.clear();
    };
  }, [items, flushActive, markActiveDom]);

  if (loading && items.length === 0) {
    return (
      <div className="drops-viewport" ref={viewportRef} aria-busy="true" aria-label="Loading drops">
        <SkeletonCard />
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="drops-viewport" ref={viewportRef}>
        <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
          <Inbox size={34} strokeWidth={1.8} className="text-[var(--text-light)]" aria-hidden />
          <p className="text-sm font-semibold text-[var(--text-body)]" role="status">
            {error ? 'Could not load the feed.' : 'No drops here yet.'}
          </p>
          {error && (
            <button type="button" className="btn btn-soft h-10" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const shown = `${items.length} drop${items.length === 1 ? '' : 's'} shown`;

  return (
    <div className="drops-viewport" ref={viewportRef}>
      {items.map((item, index) => (
        <div key={item.id} className="drop-slide" data-drop-id={item.id}>
          <DropCard
            item={item}
            index={index}
            position={index + 1}
            total={items.length}
            saved={savedIds.has(item.id)}
            onCta={onCta}
            onReadMore={onReadMore}
            onSave={onSave}
            onShare={onShare}
            onNotInterested={onNotInterested}
          />
        </div>
      ))}

      {loadingMore && (
        <div className="drop-slide flex items-center justify-center" aria-busy="true">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--border-subtle)] border-t-[var(--brand-sky)]" />
        </div>
      )}

      {!hasMore && items.length > 0 && !loadingMore && (
        <div className="drop-slide flex flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="text-sm font-bold text-[var(--text-heading)]">That is every drop for now</p>
          <p className="text-xs text-[var(--text-muted)]">{shown} — switch the filter to see more.</p>
        </div>
      )}
    </div>
  );
};

export default DropsFeed;
