'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ChevronLeft, Bell, ClipboardList } from 'lucide-react';
import { DRIVE_TABS, resolveDriveTab, isDriveRootPath, driveBackHref } from '@/lib/mockDriveNav';
import { useAuth } from '@/context/AuthContext';
import { fetchUnreadCountApi } from '@/lib/drivesApi';
import { cn } from '@/lib/cn';

/*
 * Mock Drives inside the site (UI_REDESIGN_PLAN_V2 Phase 5).
 *
 * This used to be a separate iOS-styled app: its own top bar, its own bottom
 * tab bar, Apple blue, and always light. It now lives in the site shell under
 * Practise — the site header and tab bar, the site fonts and dark mode — and its
 * five screens are an in-page strip. The screens still read the `--apple-*`
 * tokens; `.mock-drive-scope` (globals.css) maps those onto the brand tokens, so
 * no screen had to be rewritten to change its look.
 */

/**
 * Sign-in prompt for a signed-out visitor. Every `/api/drives/*` and `/api/me/*`
 * route is `requireAuth`, so rendering data for a guest would only produce a
 * flash of empty cards followed by a 401. Bounce to `/login?next=<here>` on the
 * button, but state it first so the student knows why.
 */
const SignInGate: React.FC<{ next: string }> = ({ next }) => (
  <div className="mock-drive-scope mx-auto flex w-full max-w-[880px] px-4 py-10 sm:py-16">
    <div className="vault-card w-full p-8 text-center sm:p-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-soft text-signal-ink" aria-hidden>
        <ClipboardList className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-heading">Sign in to see your drives</h1>
      <p className="mx-auto mt-2 max-w-[360px] text-sm leading-relaxed text-muted">
        Mock Drives are tied to your student profile: the drives you can apply to, your assessments and your results.
      </p>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary mt-6 min-h-[44px] px-7">
        Sign in
      </Link>
    </div>
  </div>
);

export const DriveShell: React.FC<{ children: React.ReactNode; title?: string; showBell?: boolean }> = ({
  children,
  title,
  showBell = true,
}) => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const active = resolveDriveTab(router.pathname);
  const atRoot = isDriveRootPath(router.pathname);
  const heading = title ?? active.label;
  // One <title> for every Mock Drive screen (the tab, history and screen readers all read it).
  const head = (
    <Head>
      <title>{heading === 'Mock Drives' ? 'Mock Drives · TieEdu' : `${heading} · Mock Drives · TieEdu`}</title>
      <meta name="description" content="Practise real placement drives on TieEdu: apply, take the assessment, sit the interview and see your result." />
    </Head>
  );

  // Badge refresh: on sign-in and on every tab change (reading notifications
  // on another screen should clear the dot when the student comes back).
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let alive = true;
    fetchUnreadCountApi().then((n) => { if (alive) setUnread(n); }).catch(() => { /* badge stays as-is */ });
    return () => { alive = false; };
  }, [user, router.pathname]);

  // Wait for the session probe rather than bouncing a signed-in student to
  // /login on the first paint, before `user` has hydrated.
  if (!loading && !user) {
    return (
      <>
        {head}
        <SignInGate next={router.asPath} />
      </>
    );
  }
  // Still probing with no cached student: hold the screens back, or each one
  // fires its signed-in API calls into a 401 before the gate replaces it.
  if (!user) {
    return (
      <>
        {head}
        <div className="mock-drive-scope min-h-[60vh]" aria-busy="true" />
      </>
    );
  }

  const bell = showBell ? (
    <Link
      href="/mock-drive/notifications"
      aria-label={unread > 0 ? `Drive notifications, ${unread} unread` : 'Drive notifications'}
      className="focus-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-body transition-colors hover:text-heading"
    >
      <Bell size={18} strokeWidth={2} aria-hidden />
      {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-card" aria-hidden />}
    </Link>
  ) : null;

  return (
    // The screens render no landmark of their own and the site shell adds none.
    <main id="main" className="mock-drive-scope">
      {head}
      <div className="mx-auto w-full max-w-[880px] px-4 pt-5 sm:pt-7">
        {atRoot ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                {heading !== 'Mock Drives' && <p className="eyebrow text-signal">Mock Drives</p>}
                <h1 className="truncate font-display text-2xl font-bold text-heading sm:text-3xl">{heading}</h1>
              </div>
              {bell}
            </div>
            {/* The five screens. One row at every width; scrolls on a narrow phone. */}
            <nav aria-label="Mock Drive pages" className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ul className="flex gap-2">
                {DRIVE_TABS.map((tab) => {
                  const on = tab.id === active.id;
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id} className="shrink-0">
                      <Link
                        href={tab.href}
                        aria-current={on ? 'page' : undefined}
                        className={cn(
                          'focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors',
                          on ? 'border-heading bg-heading text-card' : 'border-line bg-card text-body hover:border-line-strong hover:text-heading'
                        )}
                      >
                        <Icon size={15} strokeWidth={2.1} aria-hidden />
                        {tab.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {/* The site header carries the back chevron on a phone; this is the desktop way back. */}
            <Link
              href={driveBackHref(router.pathname)}
              aria-label="Back"
              className="focus-ring -ml-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-body hover:text-heading md:flex"
            >
              <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
            </Link>
            <h1 className="min-w-0 flex-1 truncate font-display text-xl font-bold text-heading sm:text-2xl">{heading}</h1>
            {bell}
          </div>
        )}
      </div>

      {children}
    </main>
  );
};

/**
 * Mounts a Mock Drive screen only once there is a student. Every screen loads
 * its data in its own effect, so mounting one for a signed-out visitor sent
 * signed-in API calls into a 401 before the shell's gate replaced it. Without
 * a user this renders the bare shell, which shows the gate (or the wait).
 */
export function withDriveAuth<P extends object>(Screen: React.ComponentType<P>) {
  const Gated = (props: P) => {
    const { user } = useAuth();
    return user ? <Screen {...props} /> : <DriveShell>{null}</DriveShell>;
  };
  Gated.displayName = `withDriveAuth(${Screen.displayName || Screen.name || 'Screen'})`;
  return Gated;
}

export default DriveShell;
