import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, Lock } from 'lucide-react';
import { Sheet } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL, apiFetch } from '@/lib/api';
import { LEGAL } from '@/lib/legal';
import { OPEN_COOKIE_SETTINGS_EVENT } from '@/lib/legalEvents';
import { readConsent, saveConsent, useConsent, type ConsentCategory, type ConsentState } from '@/lib/consent';
import { cn } from '@/lib/cn';

/**
 * The cookie banner and the "Manage preferences" sheet (PROFESSIONAL_PLATFORM_PLAN §2.1).
 *
 * - Shown until the visitor chooses under the current policy version.
 * - "Accept all" and "Reject non-essential" carry equal weight: a hidden
 *   reject is a dark pattern, and consent given that way is not consent.
 * - Any "Cookie settings" link fires OPEN_COOKIE_SETTINGS_EVENT to reopen it.
 */
const CATEGORIES: { key: ConsentCategory | 'necessary'; title: string; text: string }[] = [
  { key: 'necessary', title: 'Strictly necessary', text: 'Keep you signed in, protect forms, remember your cart and this choice. Always on.' },
  { key: 'personalisation', title: 'Personalisation', text: 'Remember courses and companies you looked at, so we can show them first.' },
  { key: 'analytics', title: 'Analytics', text: 'Count page views and which email or campaign brought you, so we can improve.' },
  { key: 'advertising', title: 'Advertising', text: 'Let Google show ads on public pages. Off means any ads are not personalised.' },
];

const ALL = { personalisation: true, analytics: true, advertising: true };
const NONE = { personalisation: false, analytics: false, advertising: false };

export const CookieConsent: React.FC = () => {
  const consent = useConsent();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(NONE);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const show = () => {
      const c = readConsent();
      setDraft(c ? { personalisation: c.personalisation, analytics: c.analytics, advertising: c.advertising } : NONE);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, show);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, show);
  }, []);

  const decide = (choice: typeof NONE) => {
    const before = readConsent();
    const saved: ConsentState = saveConsent(choice);
    setOpen(false);
    // Withdrawing analytics also clears the server-set visit cookie.
    if (before?.analytics && !saved.analytics) {
      void fetch(`${API_BASE_URL}/email/forget`, { method: 'POST', credentials: 'include' }).catch(() => {});
    }
    // A dated record for signed-in users (proof of consent).
    if (user) {
      void apiFetch(`${API_BASE_URL}/me/consent`, { method: 'POST', body: JSON.stringify({ v: saved.v, ...choice }) }).catch(() => {});
    }
  };

  const showBar = mounted && !consent && !open;

  return (
    <>
      {showBar && (
        <section
          aria-label="Cookie choice"
          className="consent-bar fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-3xl border border-line bg-card p-4 shadow-float sm:p-5 md:flex-row md:items-center md:gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-accent)] text-[var(--accent-ink)] sm:flex">
                <Cookie size={20} />
              </span>
              <p className="text-sm leading-relaxed text-body">
                <strong className="text-heading">We use cookies</strong> to keep you signed in, remember what you like and
                measure what works. Optional cookies stay off unless you allow them.{' '}
                <Link href="/cookies" className="font-semibold text-link underline">Cookie Policy</Link>
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
              <button type="button" onClick={() => { setDraft(NONE); setOpen(true); }} className="order-last col-span-2 min-h-[44px] px-3 text-sm font-bold text-link underline-offset-2 hover:underline sm:order-none">
                Manage preferences
              </button>
              <button type="button" onClick={() => decide(NONE)} className="btn btn-primary min-h-[44px] px-5 text-sm">
                Reject non-essential
              </button>
              <button type="button" onClick={() => decide(ALL)} className="btn btn-primary min-h-[44px] px-5 text-sm">
                Accept all
              </button>
            </div>
          </div>
        </section>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Cookie preferences"
        side="bottom"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => decide(NONE)} className="btn btn-primary min-h-[44px] px-5 text-sm">Reject non-essential</button>
            <button type="button" onClick={() => decide(draft)} className="btn btn-ghost min-h-[44px] px-5 text-sm">Save my choices</button>
            <button type="button" onClick={() => decide(ALL)} className="btn btn-primary min-h-[44px] px-5 text-sm">Accept all</button>
          </div>
        }
      >
        <div className="p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-body">
          Choose which optional cookies {LEGAL.brand} may use. You can change this any time from &ldquo;Cookie settings&rdquo; in the
          footer. <Link href="/cookies" className="font-semibold text-link underline">Read the Cookie Policy</Link>.
        </p>
        <ul className="mt-4 space-y-2.5">
          {CATEGORIES.map((c) => {
            const locked = c.key === 'necessary';
            const on = locked ? true : draft[c.key as ConsentCategory];
            const id = `consent-${c.key}`;
            return (
              <li key={c.key} className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
                <div className="min-w-0 flex-1">
                  <label htmlFor={id} className="flex items-center gap-1.5 font-bold text-heading">
                    {c.title} {locked && <Lock size={13} className="text-muted" aria-hidden="true" />}
                  </label>
                  <p className="mt-0.5 text-sm text-body">{c.text}</p>
                </div>
                <button
                  id={id}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={locked}
                  onClick={() => !locked && setDraft((d) => ({ ...d, [c.key]: !d[c.key as ConsentCategory] }))}
                  className={cn(
                    'relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-ring',
                    on ? 'bg-[var(--brand-ink)]' : 'bg-line',
                    locked && 'opacity-60'
                  )}
                >
                  <span className="sr-only">{on ? 'On' : 'Off'}</span>
                  <span aria-hidden="true" className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', on ? 'translate-x-6' : 'translate-x-1')} />
                </button>
              </li>
            );
          })}
        </ul>
        </div>
      </Sheet>
    </>
  );
};
