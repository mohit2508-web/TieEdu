/**
 * Light / dark / system theme (UI_REDESIGN_PLAN_V2 §4.2: "Dark mode … ships as
 * a token swap, not a second design").
 *
 * The whole palette is RGB channels on :root, swapped by
 * `:root[data-theme='dark']` in globals.css, so switching theme is one
 * attribute on <html>. `THEME_BOOT` runs inline in _document before first
 * paint; `setTheme` is the runtime switch; both read the same storage key.
 */

export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_KEY = 'tieedu_theme';

/** Follow the device until the visitor picks; every page has passed the dark contrast scan. */
export const DEFAULT_THEME: ThemeChoice = 'system';

/**
 * Inline, dependency-free, ES5: it runs before React and before the bundle.
 * Keep it tiny — it is on the critical path of every page.
 */
export const THEME_BOOT = `(function(){try{var c=localStorage.getItem('${THEME_KEY}')||'${DEFAULT_THEME}';var d=c==='dark'||(c==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`;

export function readTheme(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Apply a choice to <html> without storing it. */
export function applyTheme(choice: ThemeChoice): void {
  const dark = choice === 'dark' || (choice === 'system' && prefersDark());
  const el = document.documentElement;
  if (dark) el.setAttribute('data-theme', 'dark');
  else el.removeAttribute('data-theme');
  // The browser UI colour follows the page.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B1520' : '#0E2A44');
}

export function setTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  applyTheme(choice);
}

/** Follow OS changes while the choice is 'system'. Returns an unsubscribe. */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (readTheme() === 'system') applyTheme('system');
  };
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}
