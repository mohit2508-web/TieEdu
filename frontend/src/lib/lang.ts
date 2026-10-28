/**
 * Site-wide English / Hinglish choice (A4).
 *
 * One choice for the whole site, stored on the device like the theme. The
 * company page used to keep its own (`cp-lang`); that value is read once as
 * the starting point so nobody who chose Hinglish there loses it.
 *
 * Hinglish here means everyday Roman-script Hindi-English, the way students
 * text each other — not formal Hindi, not Devanagari. Words students already
 * say in English (test, course, company, streak) stay English.
 *
 * Coverage is deliberate, not total: the navigation, the footer and Today
 * switch; course and company content switches only where its author wrote a
 * Hinglish version. Anything without one shows in English.
 */
import { useEffect, useState } from 'react';

export type Lang = 'en' | 'hi';
export const LANG_KEY = 'tieedu_lang';
const LEGACY_KEY = 'cp-lang';
const EVENT = 'tieedu:lang';

export function readLang(): Lang {
  try {
    const v = window.localStorage.getItem(LANG_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    return v === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

export function setLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  document.documentElement.setAttribute('data-lang', lang);
  window.dispatchEvent(new CustomEvent<Lang>(EVENT, { detail: lang }));
}

/**
 * The current choice, updating everywhere when it changes. Starts as 'en' on
 * the server and the first client render, then reads storage, so server and
 * client markup always match.
 */
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setState] = useState<Lang>('en');
  useEffect(() => {
    setState(readLang());
    const on = (e: Event) => setState((e as CustomEvent<Lang>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [lang, setLang];
}

/** Pick the Hinglish string when it exists and Hinglish is on. */
export const pick = (lang: Lang, en: string, hi?: string | null) => (lang === 'hi' && hi ? hi : en);
