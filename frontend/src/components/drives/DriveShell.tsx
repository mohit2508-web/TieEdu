'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ChevronLeft, Bell } from 'lucide-react';
import { DRIVE_TABS, resolveDriveTab, isDriveRootPath, driveBackHref } from '@/lib/mockDriveNav';
import { useAuth } from '@/context/AuthContext';
import { fetchUnreadCountApi } from '@/lib/drivesApi';

/**
 * Full-screen sign-in prompt for a signed-out visitor. Every `/api/drives/*` and
 * `/api/me/*` route is `requireAuth`, so rendering data for a guest would only
 * produce a flash of empty cards followed by a 401. Matching the site's own
 * pattern: bounce to `/login?next=<here>` on the button, but state it first so
 * the student knows why.
 */
const SignInGate: React.FC<{ next: string }> = ({ next }) => (
  <div className="mock-drive-scope flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--apple-bg)' }}>
    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--apple-label)' }}>
      Sign in to continue
    </h1>
    <p className="mt-2 max-w-[320px] text-sm leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>
      Mock Drives are tied to your student profile, so we need you signed in to show your drives, assessments and results.
    </p>
    <Link
      href={`/login?next=${encodeURIComponent(next)}`}
      className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-[12px] px-7 text-base font-semibold text-white transition-transform active:scale-[0.98]"
      style={{ background: 'var(--apple-blue)' }}
    >
      Sign in
    </Link>
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
        <div className="mock-drive-scope min-h-[100dvh]" style={{ background: 'var(--apple-bg)' }} aria-busy="true" />
      </>
    );
  }

  return (
    <div
      className="mock-drive-scope flex min-h-[100dvh] flex-col"
      style={{ background: 'var(--apple-bg)' }}
    >
      {head}
      {/* Top bar — identity, context, notifications. Nothing else. */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--apple-surface)',
          borderColor: 'var(--apple-separator)',
          paddingTop: 'var(--safe-top)',
        }}
      >
        <div className="mx-auto flex h-[52px] max-w-[720px] items-center gap-2 px-2">
          {!atRoot ? (
            <button
              type="button"
              onClick={() => router.push(driveBackHref(router.pathname))}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors"
              style={{ color: 'var(--apple-blue)' }}
            >
              <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
          ) : (
            <span className="w-2 shrink-0" />
          )}

          <h1
            className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight"
            style={{ color: 'var(--apple-label)' }}
          >
            {heading}
          </h1>

          {showBell ? (
            <Link
              href="/mock-drive/notifications"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors"
              style={{ color: 'var(--apple-label-2)' }}
            >
              <Bell size={19} strokeWidth={2} />
              {unread > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 h-[9px] w-[9px] rounded-full border-2"
                  style={{ background: 'var(--apple-red)', borderColor: 'var(--apple-surface)' }}
                />
              )}
            </Link>
          ) : (
            <span className="w-2 shrink-0" />
          )}
        </div>
      </header>

      {/* Content column. A plain div (not <main>): pages own the landmark. */}
      <div
        className="flex-1"
        style={{
          // Reserve the space the fixed bottom bar vacates on a root tab.
          paddingBottom: atRoot ? `calc(var(--apple-tabbar-h, 56px) + var(--safe-bottom, 0px))` : 'var(--safe-bottom, 0px)',
        }}
      >
        {children}
      </div>

      {/* Bottom tab bar — five tabs, hides on pushed detail screens. */}
      {atRoot && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t"
          style={{
            background: 'var(--apple-surface)',
            borderColor: 'var(--apple-separator)',
            paddingBottom: 'var(--safe-bottom, 0px)',
          }}
          aria-label="Mock drive sections"
        >
          <ul className="mx-auto flex max-w-[720px] items-stretch">
            {DRIVE_TABS.map((tab) => {
              const isActive = tab.id === active.id;
              const Icon = tab.icon;
              return (
                <li key={tab.id} className="flex-1">
                  <Link
                    href={tab.href}
                    aria-current={isActive ? 'page' : undefined}
                    className="flex min-h-[52px] flex-col items-center justify-center gap-[3px] px-1 py-1.5 transition-colors"
                    style={{ color: isActive ? 'var(--apple-blue)' : 'var(--apple-label-2)' }}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} />
                    <span className={`text-xs leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {tab.shortLabel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
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
