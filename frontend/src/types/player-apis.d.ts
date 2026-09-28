/**
 * Minimal ambient types for the two third-party player APIs the course player
 * talks to. Only the surface actually used is declared — these are not our
 * packages and we do not want to pull in their full type definitions (nor a
 * runtime dependency) for four methods.
 */

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data?: number;
}

interface YTPlayerOptions {
  events?: {
    onReady?: (e: YTPlayerEvent) => void;
    onStateChange?: (e: YTPlayerEvent) => void;
    onError?: (e: YTPlayerEvent) => void;
  };
}

interface YTPlayerConstructor {
  new (element: HTMLElement | string, options?: YTPlayerOptions): YTPlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

/**
 * The API is injected onto `window` by YouTube's own loader script, so it has to
 * be declared there rather than as a module global — the app reads it lazily
 * and must be able to ask `window.YT?.Player` without a null-guard on a
 * `declare const` that TypeScript would assume always exists.
 */
interface Window {
  YT?: YTPlayerConstructor & { Player: YTPlayerConstructor };
}
