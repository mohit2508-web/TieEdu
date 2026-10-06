'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  Check,
  EyeOff,
  Share2,
} from 'lucide-react';
import { DROP_TYPE_META, type DropFeedItem } from '@/lib/dropsApi';
import { apiAssetUrl } from '@/lib/api';
import { formatDay } from '@/lib/date';
import { cn } from '@/lib/cn';
import { Pressable, haptic } from '@/components/common/Pressable';

/** `—` for a creative-less drop, so the type's colour carries the card instead. */
const chipStyle = (type: DropFeedItem['type']): React.CSSProperties =>
  ({ '--drop-chip': DROP_TYPE_META[type]?.chip }) as React.CSSProperties;

/**
 * How a deadline reads on the card: the date first (absolute beats relative for
 * "when does this close"), then the distance — and never a bare "0 days".
 */
const deadlineLine = (iso: string): string => {
  const at = Date.parse(iso);
  const day = formatDay(iso);
  if (!Number.isFinite(at)) return day || '';
  const days = Math.ceil((at - Date.now()) / 86400000);
  const left =
    days < 0 ? 'Closed' : days === 0 ? 'Closes today' : days === 1 ? 'Closes tomorrow' : `${days} days left`;
  return day ? `${day} · ${left}` : left;
};

/** Horizontal pans under this distance are a scroll, not a swipe. */
const SWIPE_THRESHOLD = 80;
/** Double-tap window — a slow second tap is two taps, not a double. */
const DOUBLE_TAP_MS = 280;

export interface DropCardProps {
  item: DropFeedItem;
  saved: boolean;
  onCta: (item: DropFeedItem) => void;
  onReadMore: (item: DropFeedItem) => void;
  onSave: (item: DropFeedItem) => void;
  onShare: (item: DropFeedItem) => void;
  onNotInterested: (item: DropFeedItem) => void;
  /** 1-based position, shown as "3 / 12" so a swipe has a sense of length. */
  position?: number;
  total?: number;
  /** Feed index — drives eager vs lazy image loading on the first paint. */
  index?: number;
}

/**
 * One screen of the feed.
 *
 * The copy sits *over* the creative (reels layout, not a document card) with a
 * bottom scrim baked into `.drop-media::after` — a headline under a bright
 * photo needs the gradient, and putting the scrim in CSS rather than per-image
 * means every creative gets it without the CMS having to remember.
 *
 * Mobile gestures (double-tap save, side-swipe save / mute) live on the media
 * box only. `touch-action: pan-y` on `.drop-media` is what keeps vertical
 * pans scrolling the snap container instead of being eaten here.
 */
export const DropCard: React.FC<DropCardProps> = ({
  item,
  saved,
  onCta,
  onReadMore,
  onSave,
  onShare,
  onNotInterested,
  position,
  total,
  index = 0,
}) => {
  const meta = DROP_TYPE_META[item.type] || { label: item.type, chip: 'var(--brand-sky)' };

  const [burst, setBurst] = useState(false);
  const burstTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    },
    []
  );

  const fireSaveBurst = useCallback(() => {
    setBurst(true);
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(false), 420);
  }, []);

  // ---- gestures: double-tap save, swipe-right save, swipe-left mute ---------
  const pointerRef = useRef<{
    x: number;
    y: number;
    id: number;
    decided: 'none' | 'vertical' | 'horizontal';
  } | null>(null);
  const lastTapRef = useRef(0);
  const swipedRef = useRef(false);

  const onMediaPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerRef.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      decided: 'none',
    };
    swipedRef.current = false;
  }, []);

  const onMediaPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const p = pointerRef.current;
      if (!p || p.id !== event.pointerId) return;
      const dx = event.clientX - p.x;
      const dy = event.clientY - p.y;
      if (p.decided === 'none') {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        p.decided = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }
      if (p.decided === 'horizontal' && Math.abs(dx) > SWIPE_THRESHOLD && !swipedRef.current) {
        swipedRef.current = true;
        if (dx > 0) {
          onSave(item);
          fireSaveBurst();
        } else {
          onNotInterested(item);
        }
      }
    },
    [item, onSave, onNotInterested, fireSaveBurst]
  );

  const onMediaPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const p = pointerRef.current;
      pointerRef.current = null;
      if (!p || p.id !== event.pointerId) return;
      // A horizontal swipe already fired — do not also treat the release as a tap.
      if (swipedRef.current) return;
      if (p.decided === 'vertical') return;

      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        lastTapRef.current = 0;
        if (!saved) {
          onSave(item);
          fireSaveBurst();
          haptic('medium');
        } else {
          onSave(item); // toggle off — same handler the rail uses
        }
        return;
      }
      lastTapRef.current = now;
    },
    [item, saved, onSave, fireSaveBurst]
  );

  const onMediaPointerCancel = useCallback(() => {
    pointerRef.current = null;
  }, []);

  const eager = index <= 1;

  return (
    <article className="drop-card" style={chipStyle(item.type)} aria-label={item.headline}>
      <div
        className={cn('drop-media', !item.image_url && 'drop-media--empty')}
        onPointerDown={onMediaPointerDown}
        onPointerMove={onMediaPointerMove}
        onPointerUp={onMediaPointerUp}
        onPointerCancel={onMediaPointerCancel}
      >
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- a CMS creative with no declared dimensions, filling the 9:16 frame
          <img
            src={apiAssetUrl(item.image_url)}
            alt={item.image_alt || item.headline}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            decoding="async"
          />
        )}

        {/* Top row: type chip, position counter, sponsor note. */}
        <div className="absolute inset-x-0 top-0 z-[2] flex items-start justify-between gap-2 p-3">
          <span className="drop-type-chip">{meta.label}</span>
          <div className="flex flex-col items-end gap-1.5">
            {typeof position === 'number' && typeof total === 'number' && total > 0 && (
              <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                {position} / {total}
              </span>
            )}
            {item.sponsored && (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#10151C]">
                {item.sponsor_name || 'Sponsored'}
              </span>
            )}
          </div>
        </div>

        {/* Action rail: save / share / not interested. */}
        <div className="absolute right-1.5 top-1/2 z-[2] flex -translate-y-1/2 flex-col gap-1">
          <Pressable
            as="button"
            hapticWeight="medium"
            className="drop-rail-btn"
            data-on={saved || undefined}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved' : 'Save this drop'}
            onPress={() => {
              onSave(item);
              if (!saved) fireSaveBurst();
            }}
          >
            {saved ? <BookmarkCheck size={24} strokeWidth={2.2} aria-hidden /> : <Bookmark size={24} strokeWidth={2.2} aria-hidden />}
            <span>{saved ? 'Saved' : 'Save'}</span>
          </Pressable>
          <Pressable
            as="button"
            hapticWeight="light"
            className="drop-rail-btn"
            aria-label="Share this drop"
            onPress={() => onShare(item)}
          >
            <Share2 size={23} strokeWidth={2.2} aria-hidden />
            <span>Share</span>
          </Pressable>
          <Pressable
            as="button"
            hapticWeight="warning"
            className="drop-rail-btn"
            aria-label="Not interested"
            onPress={() => onNotInterested(item)}
          >
            <EyeOff size={23} strokeWidth={2.2} aria-hidden />
            <span>Not me</span>
          </Pressable>
        </div>

        {/* Gesture burst: a short-lived bookmark ping in the frame centre. */}
        {burst && (
          <div className="drop-save-burst z-[3]" aria-hidden="true">
            <BookmarkCheck size={72} strokeWidth={2.2} />
          </div>
        )}

        {/*
          Copy block. `pr-16` keeps it clear of the rail.
          `z-[2]` is required: `.drop-media::after` (the scrim) is generated as
          the last child and paints above every non-z-indexed overlay — without
          this the headline sits UNDER the gradient and washes out.
        */}
        <div className="absolute inset-x-0 bottom-0 z-[2] p-4 pr-[68px]">
          <h2 className="drop-headline text-[19px] font-extrabold leading-snug text-white">
            {item.headline}
          </h2>
          {item.bullets.length > 0 && (
            <ul className="drop-bullets mt-2 space-y-1">
              {item.bullets.slice(0, 3).map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-1.5 text-[13px] font-semibold leading-snug text-white"
                  style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.75), 0 1px 8px rgba(0, 0, 0, 0.4)' }}
                >
                  <Check size={14} strokeWidth={3} className="mt-1 flex-none text-white/85" aria-hidden />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {item.deadline_at && (
            <p
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur-sm"
              style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.55)' }}
            >
              <CalendarClock size={14} strokeWidth={2.4} aria-hidden />
              {deadlineLine(item.deadline_at)}
            </p>
          )}
        </div>
      </div>

      {/* Footer: the CTA is the whole point of the card, so it owns the row. */}
      <footer className="flex flex-none items-center gap-2 border-t border-[var(--border-subtle)] bg-white px-3 py-2.5">
        <Pressable as="button" hapticWeight="medium" className="btn btn-primary h-11 flex-1" onPress={() => onCta(item)}>
          {item.cta_label}
          <ArrowUpRight size={17} strokeWidth={2.6} aria-hidden />
        </Pressable>
        {item.has_body && (
          <Pressable as="button" hapticWeight="light" className="btn btn-ghost h-11" onPress={() => onReadMore(item)}>
            Read more
          </Pressable>
        )}
      </footer>
    </article>
  );
};

export default DropCard;
