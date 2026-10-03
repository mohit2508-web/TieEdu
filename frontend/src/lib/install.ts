/**
 * Install identity for the browser.
 *
 * The install registry has had a backend and no caller: nothing in the frontend
 * ever called `/api/devices/track`, so the install count the admin dashboard
 * shows was structurally always zero, and `device_id` on a push subscription had
 * nothing to point at. Both are fixed by giving the browser a stable id and
 * telling the server about it.
 *
 * The id is per browser profile, not per device, and deliberately so. Clearing
 * site data mints a new one, which reads as a new install — acceptable, because
 * the alternative (a fingerprint) is both worse privacy and less reliable.
 */

const ID_KEY = 'tieedu.install_id';
const TRACKED_KEY = 'tieedu.last_tracked_at';

/**
 * Six hours, matching the server's own throttle window. The server silently
 * ignores a beacon inside the window, so this is purely to avoid a pointless
 * request on every page view.
 */
const TRACK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Must satisfy the server's `ID_RE`: /^[A-Za-z0-9_-]{8,64}$/. */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function mintId(): string {
  const bytes = new Uint8Array(22);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `inst_${out}`;
}

export function getInstallId(): string {
  if (typeof window === 'undefined') return '';
  let id = '';
  try {
    id = window.localStorage.getItem(ID_KEY) || '';
  } catch {
    // Private browsing can make localStorage throw on write. An in-memory id is
    // still better than none: the beacon works, it just counts as a new install
    // on each load.
  }
  if (id) return id;
  id = mintId();
  try {
    window.localStorage.setItem(ID_KEY, id);
  } catch {
    /* see above */
  }
  return id;
}

type TrackPayload = {
  app_version?: string;
  install_surface?: string;
  utm_source?: string;
  pwa_prompt?: { shown?: boolean; accepted?: boolean; dismissed?: boolean };
};

/**
 * Report this install, at most once per throttle window.
 *
 * Resolves to the install id either way. A failed beacon is not worth failing
 * the caller over — the server treats the install as new on the next attempt,
 * which is why the throttle lives in localStorage rather than in a "already
 * tracked" flag the server owns.
 */
export async function trackInstall(payload: TrackPayload = {}): Promise<string> {
  const installId = getInstallId();
  if (typeof window === 'undefined' || !installId) return installId;

  try {
    const last = Number(window.localStorage.getItem(TRACKED_KEY) || '0');
    const insideWindow = Date.now() - last < TRACK_INTERVAL_MS;
    if (!insideWindow) {
      await fetch('/api/devices/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ install_id: installId, ...payload }),
        keepalive: true,
      }).catch(() => undefined);
      try {
        window.localStorage.setItem(TRACKED_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* tracking is best-effort and must never break the caller */
  }
  return installId;
}