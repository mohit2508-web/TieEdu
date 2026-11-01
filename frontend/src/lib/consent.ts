import { useSyncExternalStore } from 'react';
import { LEGAL } from './legal';

/**
 * Cookie consent (PROFESSIONAL_PLATFORM_PLAN §2).
 *
 * One first-party cookie, `tieedu_consent`, holds the visitor's choice for the
 * three optional categories. Strictly necessary cookies need no consent and
 * are not stored here. Anything optional must check `hasConsent()` before it
 * sets a cookie, writes storage or sends a beacon — and must stop when the
 * choice changes (listen with `onConsentChange`).
 *
 * The cookie is readable by script on purpose: the page needs it before any
 * request, and it holds nothing but four booleans and a timestamp.
 */
export type ConsentCategory = 'personalisation' | 'analytics' | 'advertising';

export interface ConsentState {
  /** Policy version the choice was made under; a bump asks again. */
  v: number;
  personalisation: boolean;
  analytics: boolean;
  advertising: boolean;
  /** When the choice was made (ISO). */
  ts: string;
}

export const CONSENT_COOKIE = 'tieedu_consent';
const MAX_AGE_DAYS = 365;
const CHANGE_EVENT = 'tieedu:consent-changed';

const encode = (s: ConsentState) =>
  [s.v, s.personalisation ? 1 : 0, s.analytics ? 1 : 0, s.advertising ? 1 : 0, s.ts].join('.');

function decode(raw: string | undefined): ConsentState | null {
  if (!raw) return null;
  const [v, p, a, ad, ...rest] = decodeURIComponent(raw).split('.');
  const ts = rest.join('.');
  const n = Number(v);
  if (!Number.isInteger(n) || ![p, a, ad].every((x) => x === '0' || x === '1')) return null;
  return { v: n, personalisation: p === '1', analytics: a === '1', advertising: ad === '1', ts };
}

let cached: ConsentState | null | undefined;

/** The stored choice, or null if the visitor has not chosen under the current policy. */
export function readConsent(): ConsentState | null {
  if (typeof document === 'undefined') return null;
  if (cached !== undefined) return cached;
  const raw = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1);
  const state = decode(raw);
  cached = state && state.v >= LEGAL.policyVersion ? state : null;
  return cached;
}

export function hasConsent(category: ConsentCategory): boolean {
  return !!readConsent()?.[category];
}

export function saveConsent(choice: Pick<ConsentState, ConsentCategory>): ConsentState {
  const state: ConsentState = { v: LEGAL.policyVersion, ...choice, ts: new Date().toISOString() };
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(encode(state))}; Max-Age=${MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
  cached = state;
  applyGoogleConsentMode(state);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }));
  return state;
}

export function onConsentChange(fn: (s: ConsentState) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<ConsentState>).detail);
  window.addEventListener(CHANGE_EVENT, h);
  return () => window.removeEventListener(CHANGE_EVENT, h);
}

/** React hook: the current choice (null until chosen), re-rendering on change. */
export function useConsent(): ConsentState | null {
  return useSyncExternalStore(
    (cb) => onConsentChange(() => cb()),
    readConsent,
    () => null
  );
}

/**
 * Google Consent Mode v2. The defaults (everything denied) are set inline in
 * _document before any Google script can load; this sends the update.
 */
export function applyGoogleConsentMode(s: ConsentState | null) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  if (!w.gtag) {
    // Google's tag reads the `arguments` object itself, not an array copy.
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
  }
  const gtag = w.gtag;
  const g = (on: boolean | undefined) => (on ? 'granted' : 'denied');
  gtag('consent', 'update', {
    ad_storage: g(s?.advertising),
    ad_user_data: g(s?.advertising),
    ad_personalization: g(s?.advertising),
    analytics_storage: g(s?.analytics),
    personalization_storage: g(s?.personalisation),
  });
}

/**
 * Inline head script for _document: Consent Mode defaults, then any stored
 * choice made under the current policy version. Plain ES5, no imports.
 */
export const CONSENT_BOOT = `(function(){try{
window.dataLayer=window.dataLayer||[];
window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',personalization_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});
var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);if(!m)return;
var p=decodeURIComponent(m[1]).split('.');if(Number(p[0])<${LEGAL.policyVersion})return;
var g=function(x){return x==='1'?'granted':'denied';};
gtag('consent','update',{personalization_storage:g(p[1]),analytics_storage:g(p[2]),ad_storage:g(p[3]),ad_user_data:g(p[3]),ad_personalization:g(p[3])});
}catch(e){}})();`;
