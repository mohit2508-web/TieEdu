/**
 * App-open splash (PRACTICE_POLISH_PLAN.md §2, owner 2026-11-11).
 *
 * When TiEEdu is opened as an installed app (Android/iOS home screen, desktop
 * PWA window), the animated logo plays first: the brain wakes, the letters
 * rise, a light passes over, then it lifts away into the page. A normal browser
 * tab never gets it, so websites, search crawlers and page speed are untouched.
 *
 * It is plain HTML + an <img> of an animated SVG, painted before React loads,
 * so it is on screen from the very first frame. One launch shows it once:
 * reloads and in-app navigation within the same launch do not replay it.
 *
 * Installed apps pick this up on their own: HTML is network-first in sw.js,
 * so the next launch after a deploy already carries the splash.
 */

export const SPLASH_VERSION = 1;
const src = (v: string) => `'/brand/tieedu-splash-'+(${v}?'dark':'light')+'.svg?v=${SPLASH_VERSION}'`;

/** Head, after THEME_BOOT (it reads data-theme). ES5, tiny, never throws. */
export const SPLASH_BOOT = `(function(){try{var m=function(q){return !!(window.matchMedia&&matchMedia(q).matches)};var app=m('(display-mode: standalone)')||m('(display-mode: window-controls-overlay)')||m('(display-mode: fullscreen)')||m('(display-mode: minimal-ui)')||navigator.standalone===true||/[?&]source=pwa/.test(location.search);if(!app)return;try{if(sessionStorage.getItem('tie_splash'))return;sessionStorage.setItem('tie_splash','1')}catch(e){}var d=document.documentElement;var dark=d.getAttribute('data-theme')==='dark';d.classList.add('tie-splash');window.__tieSplash={t0:Date.now(),min:m('(prefers-reduced-motion: reduce)')?900:2600,dark:dark};var l=document.createElement('link');l.rel='preload';l.as='image';l.href=${src('dark')};document.head.appendChild(l)}catch(e){}})();`;

/** Body, right after the splash element: sets the image and the hide function, with a hard stop. */
export const SPLASH_MOUNT = `(function(){var w=window.__tieSplash;if(!w)return;var d=document.documentElement;var i=document.getElementById('tie-splash-img');if(i)i.src=${src('w.dark')};var gone=false;window.__tieSplashHide=function(){if(gone)return;gone=true;setTimeout(function(){d.classList.add('tie-splash-out');setTimeout(function(){d.classList.remove('tie-splash','tie-splash-out');var e=document.getElementById('tie-splash');if(e&&e.parentNode)e.parentNode.removeChild(e)},600)},Math.max(0,w.min-(Date.now()-w.t0)))};setTimeout(window.__tieSplashHide,9000)})();`;

/** Hidden unless the boot script switched it on. The ground matches the manifest background, so the OS splash hands over without a flash. */
export const SPLASH_CSS =
  '#tie-splash{display:none}' +
  '.tie-splash #tie-splash{display:grid;place-items:center;position:fixed;inset:0;z-index:2147483000;background:#FFF8EE;transition:opacity .5s ease}' +
  '[data-theme="dark"].tie-splash #tie-splash{background:#121010}' +
  '.tie-splash body{overflow:hidden}' +
  '#tie-splash img{width:min(78vw,520px);height:auto;transition:transform .55s cubic-bezier(.5,0,.75,0),opacity .55s ease}' +
  '.tie-splash-out #tie-splash{opacity:0;pointer-events:none}' +
  '.tie-splash-out #tie-splash img{transform:translateY(-14px) scale(.97)}';

/** Called once the app has mounted; the splash still plays its intro to the end before lifting away. */
export function hideSplash(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __tieSplashHide?: () => void };
  w.__tieSplashHide?.();
}
