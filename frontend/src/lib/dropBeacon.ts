/**
 * Batched Drops analytics.
 *
 * A reels-style feed produces an event per swipe. Sending each one as its own
 * request was the single biggest source of server load, so events are queued
 * here and sent together: every 10 events, every 20 seconds, and when the tab
 * hides or the page unloads (`keepalive`, so the last batch still lands).
 * The server queues them again and writes once a minute (lib/dropStore.ts).
 *
 * Fire-and-forget: a lost beacon must never surface UI.
 */
import { postDropEventsApi, type DropEventKind } from './dropsApi';

type Beacon = { id: string; event: DropEventKind; dwell_ms?: number };

const BATCH = 10;
const EVERY_MS = 20_000;

let queue: Beacon[] = [];
let timer: number | null = null;
let armed = false;

const send = (): void => {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const batch = queue.slice(0, 50);
  queue = queue.slice(50);
  postDropEventsApi(batch).catch(() => {});
  if (queue.length) send();
};

const arm = (): void => {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send();
  });
  window.addEventListener('pagehide', send);
};

export const trackDrop = (id: string, event: DropEventKind, dwellMs?: number): void => {
  if (typeof window === 'undefined') return;
  arm();
  queue.push({ id, event, ...(dwellMs !== undefined ? { dwell_ms: Math.min(Math.max(0, Math.round(dwellMs)), 600_000) } : {}) });
  if (queue.length >= BATCH) send();
  else if (timer === null) timer = window.setTimeout(send, EVERY_MS);
};

/** Send now — call before leaving the page for another route or site. */
export const flushDropBeacons = (): void => {
  if (typeof window !== 'undefined') send();
};
