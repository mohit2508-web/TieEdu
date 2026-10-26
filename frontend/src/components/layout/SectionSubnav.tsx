'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { NAV_ITEMS, isNavActive, isRootDepth, resolveSection } from '@/lib/navConfig';
import { cn } from '@/lib/cn';

/**
 * The sub-tabs of the current section (UI_REDESIGN_PLAN_V2 §5) — "Courses ·
 * Tracks · Free course · Study plan" under Learn.
 *
 * This is what lets eight destinations collapse into five sections without
 * hiding any of them: the section gets you close, the strip gets you there.
 * One component for both widths, so the desktop bar and the phone tab bar lead
 * to the same second level.
 *
 * Shown only on a section's root pages. A pushed screen (a lesson, a company
 * page) has the back chevron instead, and a second row of tabs above a reader
 * is chrome the student scrolls past every time. Personal pages are hidden from
 * signed-out visitors, for whom they are only a sign-in prompt.
 */

const PERSONAL = new Set(['myCourses', 'myCertificates', 'calendar']);

export const SectionSubnav: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const section = resolveSection(router.pathname);
  if (!section || !isRootDepth(router.pathname)) return null;

  const items = section.itemIds
    .map((id) => NAV_ITEMS[id])
    .filter((item) => item && (user || !PERSONAL.has(item.id)));
  if (items.length < 2) return null;

  return (
    <nav aria-label={`${section.label} pages`} className="border-b border-line bg-card">
      <div className="mx-auto flex w-full max-w-[1700px] gap-1 overflow-x-auto px-3 sm:px-8 lg:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isNavActive(router.pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'focus-ring relative inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-semibold transition-colors',
                active ? 'text-heading' : 'text-muted hover:text-heading'
              )}
            >
              {item.label}
              {item.badge === 'free' && <span className="nav-link-badge">Free</span>}
              {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-signal" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default SectionSubnav;
