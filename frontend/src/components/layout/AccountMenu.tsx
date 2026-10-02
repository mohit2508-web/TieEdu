import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Award, ChevronDown, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * The account control: a trigger that carries the avatar, and the menu it opens.
 *
 * Extracted from `Header.tsx` because the admin console has to be able to render
 * it too. `AppShell` excludes `/login`, `/signup` and `/admin/*` from the whole
 * shell - no header, no tab bar, and no overlay host - so the admin topbar in
 * `AdminCmsView` is its own `<header>` and had nothing to show an admin who they
 * were signed in as. Duplicating a hundred lines of dropdown markup into a second
 * file would guarantee the two drift, so both call this instead.
 *
 * Self-contained on purpose: it owns its open state, its outside-click handling
 * and its own menu, so it needs neither the shell context nor a portal. That is
 * what makes it usable on the excluded routes, where `useShell` is unavailable.
 *
 * `onOpenChange` exists for the one thing the owner cannot work out alone. The
 * site header hides itself on scroll while compact, and it must not do that with
 * this menu open - the dropdown would be translated out of view while still
 * mounted. The admin topbar has no such rule and ignores it.
 */
export const AccountMenu: React.FC<{ onOpenChange?: (open: boolean) => void }> = ({ onOpenChange }) => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(menuOpen);
  }, [menuOpen, onOpenChange]);

  useEffect(() => {
    const onRouteChange = () => setMenuOpen(false);
    router.events.on('routeChangeComplete', onRouteChange);
    return () => router.events.off('routeChangeComplete', onRouteChange);
  }, [router.events]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [menuOpen]);

  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push('/');
  };

  if (loading) return null;

  if (!user) {
    /*
     * Both links, not just "Sign in". A phone reaches this cluster through the
     * hamburger, so a visitor who has not signed up yet had no way to start one
     * from the header - they had to already be on `/login` to discover `/signup`.
     *
     * `md:inline-flex` rather than `inline-flex`: below `md` these would push the
     * logo out of a 360px row, and the drawer carries both routes for that width.
     */
    return (
      <>
        {/* Always visible, not `md:`-only. They are the only way to reach
            `/signup` from a phone - the drawer offers "Sign in" alone - and the
            signed-out bell is gone, so the row has room: ~262px against ~336px
            of usable width at 360px.
            Padding and size step up at `sm`; the compact pair is what makes the
            320px case fit too (~242px against ~296px).
            `!hidden` is not needed here - nothing hides these - but `.btn` does
            set `display: inline-flex` unlayered, which is why the
            `hidden` + `.btn` pairing is worth the cascade test in anti-web. */}
        <Link
          href="/login"
          className="btn btn-primary px-2.5 text-[12px] focus-ring sm:px-4 sm:text-[13px]"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="btn btn-ghost px-2.5 text-[12px] focus-ring sm:px-3 sm:text-[13px]"
        >
          Sign up
        </Link>
      </>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Account menu for ${user.name}`}
        className="flex items-center gap-1.5 rounded-xl border border-[#E9E7E1] bg-white/70 py-1 pl-1 pr-1.5 transition-colors hover:border-[#D6D2C8] focus-ring sm:pr-2"
      >
        {user.avatar ? (
          /*
           * A plain `<img>`, and not an oversight.
           *
           * Avatars are base64 data URLs stored in-house by
           * `PUT /api/auth/profile` — they are already in the document, so there
           * is no request for `next/image` to save, and the optimizer refuses
           * data URIs outright. `alt=""` is correct too: the initial beside it
           * already names the account, so this is decorative.
           *
           * `width`/`height` are what this migration actually bought here. The
           * header is the first thing painted, and an unsized avatar in a `flex`
           * row reserves nothing until it decodes, which nudges the whole header
           * sideways on a slow phone.
           */
          // eslint-disable-next-line @next/next/no-img-element -- base64 data-URL avatar, see above
          <img src={user.avatar} alt="" width={28} height={28} decoding="async" className="h-7 w-7 rounded-lg object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0284C7] text-[13px] font-extrabold uppercase text-white">
            {user.name.charAt(0)}
          </span>
        )}
        <span className="hidden max-w-[140px] truncate text-[13px] font-bold text-[#10151C] lg:block">
          {user.name.split(' ')[0]}
        </span>
        <ChevronDown
          size={14}
          className={`hidden text-[var(--text-muted)] transition-transform sm:inline ${menuOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="animate-slide-up-chrome absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-white p-2 shadow-[var(--shadow-raised)]"
        >
          <div className="border-b border-[#E9E7E1] px-3 py-2.5">
            <p className="truncate text-[13px] font-bold text-[#10151C]">{user.name}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
                isAdmin ? 'bg-[#0E2A44] text-[#E8A33D]' : 'bg-[#E8F4FB] text-[#0271B5]'
              }`}
            >
              {isAdmin ? 'Platform Admin' : 'Student'}
            </span>
          </div>

          <div className="py-1.5">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#3E4754] hover:bg-[#F3F2EE]"
              >
                <ShieldCheck size={16} className="text-[#0E2A44]" aria-hidden />
                Admin console
              </Link>
            )}
            <Link
              href="/my-courses"
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#3E4754] hover:bg-[#F3F2EE]"
            >
              <Award size={16} className="text-[#0E2A44]" aria-hidden />
              My courses
            </Link>
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#3E4754] hover:bg-[#F3F2EE]"
            >
              <UserRound size={16} className="text-[#0284C7]" aria-hidden />
              My account
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#C1442D] hover:bg-[#FDEDE9]"
            >
              <LogOut size={16} aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
