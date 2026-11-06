/**
 * Lite mode for Drops — the same feed with the expensive parts off.
 *
 * On by default for devices that would stutter or pay for it: Data Saver, a
 * 2G/3G connection, ≤ 2 GB of device memory, or "reduce motion". In lite mode
 * the card shows a still poster (`?static=1`), no particle effects, no picture
 * motion and no sounds. The viewer can switch it either way; that choice wins
 * over the guess and is remembered on the device.
 */

const KEY = 'tieedu_drops_lite';

type NetInfo = { saveData?: boolean; effectiveType?: string };

/** What this device looks like, before any manual choice. */
export const autoLite = (): boolean => {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { connection?: NetInfo; deviceMemory?: number };
  if (nav.connection?.saveData) return true;
  if (/(^|-)2g$|^3g$/.test(nav.connection?.effectiveType || '')) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return true;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  } catch {
    /* old browser */
  }
  return false;
};

export const litePreference = (): boolean => {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === 'on') return true;
    if (v === 'off') return false;
  } catch {
    /* private mode */
  }
  return autoLite();
};

export const setLitePreference = (on: boolean): void => {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode */
  }
};

/** The poster URL for lite mode: generated art as a still frame; uploads unchanged. */
export const liteImageUrl = (url: string | null, isGenerated?: boolean): string | null => {
  if (!url || !isGenerated) return url;
  return url.includes('?') ? `${url}&static=1` : `${url}?static=1`;
};

/** When this device last opened Drops — the nav's "new" badge counts from it. */
export const DROPS_LAST_VISIT_KEY = 'tieedu_drops_last_visit';
