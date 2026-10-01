import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, SkipForward, PlayCircle, PauseCircle, AlertTriangle } from 'lucide-react';
import { VideoProvider } from '@/types';

/*
 * A course video that tells the truth about what the learner has watched.
 *
 * The player used to be a bare iframe plus a "Mark as watching" button, because
 * a cross-origin iframe exposes nothing to its parent — which meant the learner
 * had to vouch for their own watching, and nothing on screen said how far in
 * they were. Both providers do expose a real API once the embed opts in (the
 * YouTube embed already ships `enablejsapi=1`, and the Vimeo embed gets `api=1`
 * from the server-built URL), so this component reads actual playback state:
 *
 *   - YouTube: the IFrame Player API, bound to the existing nocookie iframe.
 *   - Vimeo:   the postMessage API, which also reports timeupdate.
 *
 * Neither of these can be spoofed by a learner in any way that matters: the
 * watch credit is calculated and clamped by the server, so seeking to the end
 * moves the resume point and nothing else. That is also why the seek controls
 * are safe to expose.
 *
 * If neither API can attach (blocked script, a provider change, a locked-down
 * embed), the component says so and falls back to a manual toggle rather than
 * silently pretending to track something.
 */

const POLL_MS = 1000;
const SKIP_SECONDS = 30;
/** Below this, "resume" is noise — a 3-second offset is not worth a seek. */
const RESUME_FLOOR_SECONDS = 5;
/** A resume point in the last 1% is the end screen, not a place to restart. */
const RESUME_CEILING_RATIO = 0.99;

const VIMEO_ORIGIN = 'https://player.vimeo.com';

export const formatClock = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }
  return `${m}:${String(r).padStart(2, '0')}`;
};

/**
 * Load the YouTube IFrame API once per page, no matter how many lessons mount.
 * Resolves even when the network blocks the script, with `false` rather than a
 * rejection, so one failed load cannot become an unhandled rejection.
 */
let ytPromise: Promise<boolean> | null = null;
const loadYouTubeApi = (): Promise<boolean> => {
  if (ytPromise) return ytPromise;
  ytPromise = new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.YT?.Player) return resolve(true);

    const done = (ok: boolean) => {
      window.removeEventListener('youtubeIframeAPIReady', onReady);
      resolve(ok);
    };
    const onReady = () => done(!!window.YT?.Player);
    window.addEventListener('youtubeIframeAPIReady', onReady);

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    // A network error or a blocker must not leave the promise pending forever —
    // that would hang the "attaching" state and hide the fallback toggle.
    script.onerror = () => done(false);
    document.head.appendChild(script);

    // Belt and braces: some blockers neither fire onerror nor the ready event.
    window.setTimeout(() => done(!!window.YT?.Player), 8000);
  });
  return ytPromise;
};

export interface TrackedVideoPlayerProps {
  provider: VideoProvider;
  /** The server-built embed URL. It already carries the provider's opt-in flag. */
  embedUrl: string;
  title: string;
  /** Server-computed progress, so the UI never invents a number. */
  watchedSeconds: number;
  durationSeconds: number;
  positionSeconds: number;
  watchPercent: number;
  requiredPercent: number;
  isComplete: boolean;
  /** False when the learner is not signed in — progress cannot be written. */
  canSubmit: boolean;
  onSignInRequired: () => void;
  /** Fires true when the video is actually playing, false when it is not. */
  onPlayingChange: (playing: boolean) => void;
  /** Fires on every tick with the real playhead and player duration. */
  onTimeUpdate: (position: number, duration: number) => void;
}

type ApiState = 'attaching' | 'live' | 'manual';

export const TrackedVideoPlayer: React.FC<TrackedVideoPlayerProps> = ({
  provider,
  embedUrl,
  title,
  watchedSeconds,
  durationSeconds,
  positionSeconds,
  watchPercent,
  requiredPercent,
  isComplete,
  canSubmit,
  onSignInRequired,
  onPlayingChange,
  onTimeUpdate,
}) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seekedRef = useRef(false);
  const [apiState, setApiState] = useState<ApiState>('attaching');
  const [isPlaying, setIsPlaying] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [showResume, setShowResume] = useState(false);

  // The parent's callbacks are re-created on every render. Holding them in refs
  // keeps the player wiring effect free of those identities, so it does not tear
  // down and re-attach the provider API on every tick.
  const playingCb = useRef(onPlayingChange);
  const timeCb = useRef(onTimeUpdate);
  useEffect(() => {
    playingCb.current = onPlayingChange;
    timeCb.current = onTimeUpdate;
  });

  const setPlaying = useCallback((next: boolean) => {
    setIsPlaying((prev) => {
      if (prev !== next) playingCb.current(next);
      return next;
    });
  }, []);

  const publish = useCallback((position: number, duration: number) => {
    setLocalPosition(position);
    setLocalDuration(duration);
    timeCb.current(position, duration);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p) return;
      publish(p.getCurrentTime(), p.getDuration());
    }, POLL_MS);
  }, [publish, stopPolling]);

  /**
   * A resume target is only worth offering when the learner actually got
   * somewhere: past the noise floor, and short of the end.
   */
  const resumeTarget = useMemo(() => {
    const total = durationSeconds || localDuration;
    if (!total) return 0;
    if (positionSeconds < RESUME_FLOOR_SECONDS) return 0;
    if (positionSeconds >= total * RESUME_CEILING_RATIO) return 0;
    return positionSeconds;
  }, [durationSeconds, localDuration, positionSeconds]);

  const seekTo = useCallback((seconds: number) => {
    const target = Math.max(0, seconds);
    if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(target, true);
    } else if (frameRef.current?.contentWindow) {
      // Vimeo's postMessage seek. '*' is what the Vimeo player documents; the
      // payload is a position, not data.
      frameRef.current.contentWindow.postMessage(
        JSON.stringify({ method: 'setCurrentTime', value: target }),
        '*'
      );
    }
    publish(target, localDuration);
  }, [localDuration, publish]);

  const skipForward = useCallback(() => {
    const from = ytPlayerRef.current?.getCurrentTime() ?? localPosition;
    seekTo(from + SKIP_SECONDS);
  }, [localPosition, seekTo]);

  // ---- provider wiring -------------------------------------------------------

  useEffect(() => {
    let disposed = false;
    const frame = frameRef.current;
    if (!frame) return;

    if (provider === 'vimeo') {
      const onMessage = (e: MessageEvent) => {
        if (disposed) return;
        if (e.origin !== VIMEO_ORIGIN) return;
        let payload: any;
        if (typeof e.data === 'string') {
          try { payload = JSON.parse(e.data); } catch { return; }
        } else {
          payload = e.data;
        }
        if (!payload || typeof payload.method !== 'string') return;

        if (payload.method === 'play') {
          if (!disposed) { setApiState('live'); setPlaying(true); }
        } else if (payload.method === 'pause' || payload.method === 'ended') {
          setPlaying(false);
        } else if (payload.method === 'timeupdate' && payload.data) {
          const seconds = Number(payload.data.seconds) || 0;
          const duration = Number(payload.data.duration) || 0;
          publish(seconds, duration);
        }
      };
      window.addEventListener('message', onMessage);

      // Vimeo buffers events from the moment these are registered, so the
      // subscription can safely go out before the player finishes loading.
      const subscribe = () => {
        try {
          frame.contentWindow?.postMessage(
            JSON.stringify({ method: 'addEventListener', value: 'play,pause,ended,timeupdate,seeking' }),
            VIMEO_ORIGIN
          );
        } catch { /* the frame may not be ready yet; the load handler retries */ }
      };
      frame.addEventListener('load', subscribe);
      if (frame.contentWindow) subscribe();

      // If nothing has been heard from the player a moment after it loads,
      // stop claiming we are tracking and offer the honest fallback.
      const giveUp = window.setTimeout(() => {
        if (!disposed) setApiState((s) => (s === 'live' ? s : 'manual'));
      }, 6000);

      return () => {
        disposed = true;
        window.clearTimeout(giveUp);
        window.removeEventListener('message', onMessage);
        frame.removeEventListener('load', subscribe);
      };
    }

    // YouTube: bind the API to the iframe we already rendered, so the
    // youtube-nocookie privacy host is preserved.
    let player: YTPlayer | null = null;
    loadYouTubeApi().then((ok) => {
      // Captured as a local: `window.YT` is an optional property, and narrowing
      // it would not survive into this callback.
      const api = window.YT;
      if (disposed || !ok || !api?.Player) {
        if (!disposed) setApiState('manual');
        return;
      }
      try {
        player = new api.Player(frame, {
          events: {
            onReady: (e) => {
              if (disposed) return;
              ytPlayerRef.current = e.target;
              setApiState('live');
              const total = e.target.getDuration() || 0;
              publish(e.target.getCurrentTime(), total);
            },
            onStateChange: (e) => {
              if (disposed) return;
              if (e.data === api.PlayerState.PLAYING) {
                setPlaying(true);
                // YouTube has no timeupdate event, so the playhead is polled
                // while playing and frozen otherwise.
                startPolling();
              } else if (
                e.data === api.PlayerState.PAUSED ||
                e.data === api.PlayerState.ENDED ||
                e.data === api.PlayerState.BUFFERING
              ) {
                if (e.data !== api.PlayerState.BUFFERING) stopPolling();
                setPlaying(false);
              }
            },
          },
        });
      } catch {
        if (!disposed) setApiState('manual');
      }
    });

    return () => {
      disposed = true;
      stopPolling();
      try { player?.destroy(); } catch { /* the frame is going away anyway */ }
      ytPlayerRef.current = null;
    };
  }, [provider, publish, setPlaying, startPolling, stopPolling]);

  // Never report "playing" when the lesson unmounts or the learner navigates —
  // the parent starts a heartbeat off that flag.
  useEffect(() => () => { playingCb.current(false); }, []);

  // ---- resume ---------------------------------------------------------------

  useEffect(() => {
    if (seekedRef.current) return;
    if (apiState !== 'live') return;
    if (!resumeTarget) {
      seekedRef.current = true;
      return;
    }
    // Wait one frame so the player has a real duration to seek within.
    const timer = window.setTimeout(() => {
      seekTo(resumeTarget);
      seekedRef.current = true;
      setShowResume(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [apiState, resumeTarget, seekTo]);

  useEffect(() => {
    if (apiState !== 'live') return;
    const hide = window.setTimeout(() => setShowResume(false), 6000);
    return () => window.clearTimeout(hide);
  }, [apiState, showResume]);

  // ---- render ---------------------------------------------------------------

  // Fallback: the provider API is not reachable, so the learner declares it
  // themselves. The server still clamps the credit to real elapsed time.
  const toggleManual = () => {
    if (!canSubmit) return onSignInRequired();
    setIsPlaying((prev) => {
      playingCb.current(!prev);
      return !prev;
    });
  };

  const watchNeeded = Math.max(0, requiredPercent - watchPercent);
  const showBar = apiState === 'live' || apiState === 'manual';
  const barPercent = Math.min(100, Math.max(0, watchPercent));
  const position = localPosition || 0;
  const total = localDuration || durationSeconds || 0;

  return (
    <div>
      {/* Phase 4, §4.1 "full-bleed video".
          On a phone the player breaks out of the page gutter and runs edge to
          edge: rounded corners on a 16:9 box at 390px wide leave ~40px of black
          band, and a 1px border on three sides reads as a card in a feed, which
          is the "web page" tell this pass is removing. `md:` restores the framed
          card, which is correct on a desktop where it sits in a column.

          The negative margin cancels the `px-4` on `<main>`, and the wrapper
          supplies the matching horizontal padding, so the video is flush while
          the progress bar and controls below stay aligned to the text. */}
      <div className="relative -mx-4 aspect-video w-[calc(100%+2rem)] overflow-hidden bg-black md:mx-0 md:w-full md:rounded-[var(--radius-md)] md:border md:border-[var(--border-subtle)]">
        {/* Provider iframe — the URL comes from the server and already carries
            the opt-in flag each provider's API needs. */}
        {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
        <iframe
          ref={frameRef}
          src={embedUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {showResume && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center px-3 pointer-events-none">
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/75 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
              <RotateCcw className="h-3 w-3" />
              Resumed at {formatClock(resumeTarget)}
            </span>
          </div>
        )}
      </div>
      {/* Keep the UI bar inside the gutter on mobile. */}
      <div className="px-4 md:px-0">

      {/* ---- watch progress ---- */}
      <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-[12px] font-bold text-[var(--ink)]">
            {isComplete ? (
              <span className="text-[var(--color-success)]">Watch requirement met</span>
            ) : (
              <>
                <span className="stat-num text-[var(--brand-sky)]">{Math.round(watchPercent)}%</span>
                <span className="text-[var(--text-muted)]"> watched</span>
              </>
            )}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">
            {watchedSeconds > 0 ? `${formatClock(watchedSeconds)} of ${formatClock(durationSeconds)}` : 'Not started'}
          </p>
        </div>

        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-hover)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(barPercent)}
          aria-label="Video watch progress"
        >
          <div
            className="h-full rounded-full bg-[var(--brand-sky)] transition-[width] duration-500"
            style={{ width: `${barPercent}%` }}
          />
        </div>

        {/* A tick at the 90% gate, so "how much more" is answerable at a glance. */}
        <div className="relative mt-1 h-2.5">
          <span
            className="absolute -top-0.5 h-3 w-px bg-[var(--text-light)]"
            style={{ left: `${requiredPercent}%` }}
            aria-hidden="true"
          />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-[var(--text-muted)]">
            {apiState === 'live' && (isPlaying ? 'Recording your watch time…' : 'Play the video to record progress.')}
            {apiState === 'attaching' && 'Connecting to the video player…'}
            {apiState === 'manual' && 'The player API is unavailable here — use the button to record your watch time.'}
          </p>

          <div className="flex items-center gap-1.5">
            {apiState === 'live' && (
              <>
                <span className="font-mono text-[11px] text-[var(--text-light)] tabular-nums">
                  {formatClock(position)}{total > 0 ? ` / ${formatClock(total)}` : ''}
                </span>
                <button
                  type="button"
                  onClick={skipForward}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--ink)] hover:bg-[var(--bg-surface-hover)]"
                >
                  <SkipForward className="h-3.5 w-3.5" /> Skip {SKIP_SECONDS}s
                </button>
              </>
            )}

            {apiState === 'manual' && (
              <button
                type="button"
                onClick={toggleManual}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors"
                style={{
                  background: isPlaying ? 'var(--brand-sky-soft)' : 'var(--brand-sky)',
                  color: isPlaying ? 'var(--brand-sky-strong)' : '#fff',
                }}
              >
                {isPlaying ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                {isPlaying ? 'Recording…' : 'Mark as watching'}
              </button>
            )}
          </div>
        </div>

        {!canSubmit && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--brand-sky-strong)]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Sign in to save your watch progress.
          </p>
        )}

        {apiState === 'manual' && !isComplete && watchNeeded > 0 && (
          <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
            About {Math.ceil((watchNeeded / 100) * (durationSeconds || 0) / 60) || '<1'} min more to clear the{' '}
            {requiredPercent}% requirement.
          </p>
        )}
      </div>
      </div>
    </div>
  );
};

export default TrackedVideoPlayer;
