'use client';

import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ChevronLeft, Bell } from 'lucide-react';
import { DRIVE_TABS, resolveDriveTab, isDriveRootPath, driveBackHref } from '@/lib/mockDriveNav';
import { useAuth } from '@/context/AuthContext';

/**
 * Full-screen sign-in prompt for a signed-out visitor. Every `/api/drives/*` and
 * `/api/me/*` route is `requireAuth`, so rendering data for a guest would only
 * produce a flash of empty cards followed by a 401. Matching the site's own
 * pattern: bounce to `/login?next=<here>` on the button, but state it first so
 * the student knows why.
 */
const SignInGate: React.FC<{ next: string }> = ({ next }) => (
  <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--apple-bg)' }}>
    <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--apple-label)' }}>
      Sign in to continue
    </h1>
    <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>
      Mock Drives are tied to your student profile, so we need you signed in to show your drives, assessments and results.
    </p>
    <Link
      href={`/login?next=${encodeURIComponent(next)}`}
      className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-[12px] px-7 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
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

  // Wait for the session probe rather than bouncing a signed-in student to
  // /login on the first paint, before `user` has hydrated.
  if (!loading && !user) {
    return <SignInGate next={router.asPath} />;
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{ background: 'var(--apple-bg)' }}
    >
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
            className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight"
            style={{ color: 'var(--apple-label)' }}
          >
            {heading}
          </h1>

          {showBell ? (
            <Link
              href="/mock-drive/notifications"
              aria-label="Notifications"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors"
              style={{ color: 'var(--apple-label-2)' }}
            >
              <Bell size={19} strokeWidth={2} />
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
                    style={{ color: isActive ? 'var(--apple-blue)' : 'var(--apple-label-3)' }}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} />
                    <span className={`text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
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

export default DriveShell;
