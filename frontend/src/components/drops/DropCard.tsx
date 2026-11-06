'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DropVideo } from './DropVideo';
import { DropEffects } from './DropEffects';
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  Check,
  Eye,
  EyeOff,
  Heart,
  Pause,
  Share2,
  X,
} from 'lucide-react';
import { DROP_TYPE_META, type DropFeedItem } from '@/lib/dropsApi';
import { apiAssetUrl } from '@/lib/api';
import { liteImageUrl } from '@/lib/dropsLite';
import { formatDay } from '@/lib/date';
import { cn } from '@/lib/cn';
import { Pressable, haptic } from '@/components/common/Pressable';

/** The type's colour, read by the chip, the rail's "on" state and the bursts. */
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

/** 1234 → "1.2k" — counts on a rail have to fit under a 48px button. */
export const compactCount = (n: number | undefined): string => {
  const v = Number(n) || 0;
  if (v < 1000) return String(v);
  if (v < 100_000) return `${(v / 1000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${Math.round(v / 100_000) / 10}L`;
};

/** Horizontal pans under this distance are a scroll, not a swipe. */
const SWIPE_THRESHOLD = 80;
/** Double-tap window — a slow second tap is two taps, not a double. */
const DOUBLE_TAP_MS = 280;
/** Hold this long without moving to pause the card's motion. */
const HOLD_MS = 420;

const QUIZ_KEY = 'tieedu_drop_quiz';
const readQuizPick = (id: string): number | null => {
  try {
    const v = JSON.parse(window.localStorage.getItem(QUIZ_KEY) || '{}')[id];
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
};
const writeQuizPick = (id: string, pick: number) => {
  try {
    const all = JSON.parse(window.localStorage.getItem(QUIZ_KEY) || '{}');
    all[id] = pick;
    window.localStorage.setItem(QUIZ_KEY, JSON.stringify(all));
  } catch {
    /* private mode: the answer lasts for the page */
  }
};

export interface DropCardProps {
  item: DropFeedItem;
  saved: boolean;
  onCta: (item: DropFeedItem) => void;
  onReadMore: (item: DropFeedItem) => void;
  onSave: (item: DropFeedItem) => void;
  onShare: (item: DropFeedItem) => void;
  onNotInterested: (item: DropFeedItem) => void;
  /** Heart. Omit to hide the like button (admin preview). */
  onLike?: (item: DropFeedItem) => void;
  /** A quiz option was picked (first pick only). */
  onQuizAnswer?: (item: DropFeedItem, correct: boolean) => void;
  /** Feed index — drives eager vs lazy image loading on the first paint. */
  index?: number;
  /** This card owns the screen: its motion, effects and clip run only then. */
  active?: boolean;
  /** The viewer turned sound on — an uploaded clip plays with its audio. */
  soundOn?: boolean;
  /** Lite mode: still poster, no effects, no motion. */
  lite?: boolean;
}

/** An uploaded clip: muted autoplay loop, playing only while its card is on screen. */
const DropClip: React.FC<{ src: string; poster?: string; active: boolean; soundOn: boolean; paused: boolean; label: string }> = ({
  src,
  poster,
  active,
  soundOn,
  paused,
  label,
}) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = !soundOn;
    if (active && !paused) void v.play().catch(() => {});
    else v.pause();
  }, [active, soundOn, paused]);
  return (
    <video
      ref={ref}
      className="drop-clip absolute inset-0 h-full w-full object-cover"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload={active ? 'auto' : 'metadata'}
      aria-label={label}
    />
  );
};

/** Tap-to-answer practice question. The pick is remembered on the device. */
const QuizPanel: React.FC<{ item: DropFeedItem; onAnswer?: (correct: boolean) => void }> = ({ item, onAnswer }) => {
  const quiz = item.quiz!;
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => setPick(readQuizPick(item.id)), [item.id]);
  const answered = pick !== null;

  const choose = (i: number) => {
    if (answered) return;
    setPick(i);
    writeQuizPick(item.id, i);
    haptic(i === quiz.answer ? 'success' : 'warning');
    onAnswer?.(i === quiz.answer);
  };

  return (
    <div className="drop-quiz mt-2">
      <p className={cn('drop-quiz__q', quiz.question.includes('\n') && 'drop-quiz__q--code')}>{quiz.question}</p>
      <div className="mt-2 grid gap-1.5" role="group" aria-label="Answer options">
        {quiz.options.map((opt, i) => {
          const state = !answered ? 'idle' : i === quiz.answer ? 'right' : i === pick ? 'wrong' : 'dim';
          return (
            <button
              key={i}
              type="button"
              className="drop-quiz__opt"
              data-state={state}
              aria-pressed={pick === i}
              disabled={answered}
              onClick={() => choose(i)}
            >
              <span className="drop-quiz__letter">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1 text-left">{opt}</span>
              {state === 'right' && <Check size={16} strokeWidth={3} aria-label="Correct answer" />}
              {state === 'wrong' && <X size={16} strokeWidth={3} aria-label="Your answer" />}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="drop-quiz__explain" role="status">
          <strong>{pick === quiz.answer ? 'Correct! ' : 'Not quite. '}</strong>
          {quiz.explain}
        </p>
      )}
    </div>
  );
};

/**
 * One screen of the feed.
 *
 * The copy sits *over* the creative (reels layout, not a document card) with a
 * bottom scrim baked into `.drop-media::after`. Gestures live on the media box:
 * double-tap likes, side-swipe saves / mutes, press-and-hold pauses the motion.
 * `touch-action: pan-y` on `.drop-media` keeps vertical pans for the scroller.
 */
export const DropCard: React.FC<DropCardProps> = ({
  item,
  saved,
  onCta,
  onReadMore,
  onSave,
  onShare,
  onNotInterested,
  onLike,
  onQuizAnswer,
  index = 0,
  active = false,
  soundOn = false,
  lite = false,
}) => {
  const meta = DROP_TYPE_META[item.type] || { label: item.type, chip: 'var(--brand-sky)' };

  const [burst, setBurst] = useState<'save' | 'like' | null>(null);
  const [paused, setPaused] = useState(false);
  const burstTimer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    },
    []
  );
  useEffect(() => {
    if (!active) setPaused(false);
  }, [active]);

  const fireBurst = useCallback((kind: 'save' | 'like') => {
    setBurst(kind);
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(null), 520);
  }, []);

  // ---- gestures --------------------------------------------------------------
  const pointerRef = useRef<{ x: number; y: number; id: number; decided: 'none' | 'vertical' | 'horizontal' } | null>(null);
  const lastTapRef = useRef(0);
  const swipedRef = useRef(false);
  const heldRef = useRef(false);

  const clearHold = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const onMediaPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // Taps on buttons inside the media (rail, quiz) are theirs, not a gesture.
    if ((event.target as HTMLElement).closest('button, a')) return;
    pointerRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId, decided: 'none' };
    swipedRef.current = false;
    heldRef.current = false;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      heldRef.current = true;
      setPaused(true);
      haptic('light');
    }, HOLD_MS);
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
        clearHold();
      }
      if (p.decided === 'horizontal' && Math.abs(dx) > SWIPE_THRESHOLD && !swipedRef.current) {
        swipedRef.current = true;
        if (dx > 0) {
          if (!saved) onSave(item);
          fireBurst('save');
        } else {
          onNotInterested(item);
        }
      }
    },
    [item, saved, onSave, onNotInterested, fireBurst]
  );

  const onMediaPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const p = pointerRef.current;
      pointerRef.current = null;
      clearHold();
      if (heldRef.current) {
        heldRef.current = false;
        setPaused(false);
        return;
      }
      if (!p || p.id !== event.pointerId) return;
      if (swipedRef.current || p.decided === 'vertical') return;

      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        lastTapRef.current = 0;
        // Double-tap is a like (never an unlike), like every reels app.
        if (onLike) {
          if (!item.liked) onLike(item);
          fireBurst('like');
          haptic('medium');
        }
        return;
      }
      lastTapRef.current = now;
    },
    [item, onLike, fireBurst]
  );

  const onMediaPointerCancel = useCallback(() => {
    pointerRef.current = null;
    clearHold();
    if (heldRef.current) {
      heldRef.current = false;
      setPaused(false);
    }
  }, []);

  const eager = index <= 1;
  const imageUrl = lite ? liteImageUrl(item.image_url, item.is_generated_art) : item.image_url;
  const motion = lite ? 'none' : item.motion || 'kenburns';
  const isQuiz = item.type === 'quiz' && !!item.quiz;

  return (
    <article
      className="drop-card"
      data-active={active}
      data-paused={paused || undefined}
      style={chipStyle(item.type)}
      aria-label={item.headline}
    >
      <div
        className={cn('drop-media', !imageUrl && 'drop-media--empty', `drop-motion--${motion}`, isQuiz && 'drop-media--quiz')}
        onPointerDown={onMediaPointerDown}
        onPointerMove={onMediaPointerMove}
        onPointerUp={onMediaPointerUp}
        onPointerCancel={onMediaPointerCancel}
      >
        {item.video_file_url && !lite ? (
          <DropClip
            src={apiAssetUrl(item.video_file_url)}
            poster={item.image_url && !item.is_generated_art ? apiAssetUrl(item.image_url) : undefined}
            active={active}
            soundOn={soundOn}
            paused={paused}
            label={item.headline}
          />
        ) : item.video_url ? (
          <DropVideo url={item.video_url} title={item.headline} />
        ) : imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a CMS creative with no declared dimensions, filling the 9:16 frame
          <img
            src={apiAssetUrl(imageUrl)}
            alt={item.image_alt || item.headline}
            loading={eager ? 'eager' : 'lazy'}
            /* lowercase: React 18 warns on the camelCase prop (React 19 knows it) */
            {...{ fetchpriority: eager ? 'high' : 'auto' }}
            decoding="async"
            draggable={false}
          />
        )}

        {/* Top row: type chip, views, sponsor note. */}
        <div className="absolute inset-x-0 top-0 z-[2] flex items-start justify-between gap-2 p-3">
          <div className="flex items-center gap-1.5">
            <span className="drop-type-chip">{meta.label}</span>
            {(item.views || 0) >= 10 && (
              <span className="drop-views" aria-label={`${item.views} views`}>
                <Eye size={13} strokeWidth={2.4} aria-hidden /> {compactCount(item.views)}
              </span>
            )}
          </div>
          {item.sponsored && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-heading">
              {item.sponsor_name || 'Sponsored'}
            </span>
          )}
        </div>

        {/* Action rail. */}
        <div className="absolute right-1.5 top-[42%] z-[3] flex -translate-y-1/2 flex-col gap-1">
          {onLike && (
            <Pressable
              as="button"
              hapticWeight="medium"
              className="drop-rail-btn drop-rail-btn--like"
              data-on={item.liked || undefined}
              aria-pressed={!!item.liked}
              aria-label={item.liked ? 'Unlike' : 'Like this drop'}
              onPress={() => {
                onLike(item);
                if (!item.liked) fireBurst('like');
              }}
            >
              <Heart size={24} strokeWidth={2.2} fill={item.liked ? 'currentColor' : 'none'} aria-hidden />
              <span>{item.likes ? compactCount(item.likes) : 'Like'}</span>
            </Pressable>
          )}
          <Pressable
            as="button"
            hapticWeight="medium"
            className="drop-rail-btn"
            data-on={saved || undefined}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved' : 'Save this drop'}
            onPress={() => {
              onSave(item);
              if (!saved) fireBurst('save');
            }}
          >
            {saved ? <BookmarkCheck size={24} strokeWidth={2.2} aria-hidden /> : <Bookmark size={24} strokeWidth={2.2} aria-hidden />}
            <span>{saved ? 'Saved' : 'Save'}</span>
          </Pressable>
          <Pressable as="button" hapticWeight="light" className="drop-rail-btn" aria-label="Share this drop" onPress={() => onShare(item)}>
            <Share2 size={23} strokeWidth={2.2} aria-hidden />
            <span>Share</span>
          </Pressable>
          <Pressable as="button" hapticWeight="warning" className="drop-rail-btn" aria-label="Not interested" onPress={() => onNotInterested(item)}>
            <EyeOff size={23} strokeWidth={2.2} aria-hidden />
            <span>Not me</span>
          </Pressable>
        </div>

        {/* Gesture bursts. */}
        {burst && (
          <div className="drop-save-burst z-[3]" data-kind={burst} aria-hidden="true">
            {burst === 'like' ? <Heart size={96} strokeWidth={0} fill="currentColor" /> : <BookmarkCheck size={72} strokeWidth={2.2} />}
          </div>
        )}
        {paused && (
          <div className="drop-paused z-[3]" aria-live="polite">
            <Pause size={30} fill="currentColor" strokeWidth={0} aria-hidden />
            <span className="sr-only">Paused</span>
          </div>
        )}

        {active && !lite && <DropEffects effect={item.effect} />}

        {/*
          Copy block. `pr-[68px]` keeps it clear of the rail.
          `z-[2]` is required: `.drop-media::after` (the scrim) paints above
          every non-z-indexed overlay.
        */}
        <div className={cn('absolute inset-x-0 bottom-0 z-[2] p-4 pr-[68px]', `drop-text--${lite ? 'none' : item.text_anim || 'rise'}`)}>
          <h2 className="drop-headline text-xl font-extrabold leading-snug text-white">{item.headline}</h2>
          {isQuiz ? (
            <QuizPanel item={item} onAnswer={(c) => onQuizAnswer?.(item, c)} />
          ) : (
            item.bullets.length > 0 && (
              <ul className="drop-bullets mt-2 space-y-1">
                {item.bullets.slice(0, 3).map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-1.5 text-sm font-semibold leading-snug text-white"
                    style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.75), 0 1px 8px rgba(0, 0, 0, 0.4)' }}
                  >
                    <Check size={14} strokeWidth={3} className="mt-1 flex-none text-white/85" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )
          )}
          {item.deadline_at && (
            <p
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm"
              style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.55)' }}
            >
              <CalendarClock size={14} strokeWidth={2.4} aria-hidden />
              {deadlineLine(item.deadline_at)}
            </p>
          )}
        </div>
      </div>

      {/*
        Footer. A drop with a story opens it first ("read, then go"); the CTA
        stays one tap away beside it.
      */}
      <footer className="flex flex-none items-center gap-2 border-t border-[var(--border-subtle)] bg-white px-3 py-2.5">
        {item.has_body ? (
          <>
            <Pressable as="button" hapticWeight="medium" className="btn btn-primary h-11 flex-1" onPress={() => onReadMore(item)}>
              <BookOpen size={17} strokeWidth={2.4} aria-hidden />
              Read story
            </Pressable>
            <Pressable as="button" hapticWeight="light" className="btn btn-ghost h-11 max-w-[46%] truncate" onPress={() => onCta(item)}>
              {item.cta_label}
              <ArrowUpRight size={16} strokeWidth={2.6} aria-hidden />
            </Pressable>
          </>
        ) : (
          <Pressable as="button" hapticWeight="medium" className="btn btn-primary h-11 flex-1" onPress={() => onCta(item)}>
            {item.cta_label}
            <ArrowUpRight size={17} strokeWidth={2.6} aria-hidden />
          </Pressable>
        )}
      </footer>
    </article>
  );
};

export default DropCard;
