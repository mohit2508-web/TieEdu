import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@/lib/cn';
import { Pressable, haptic } from '@/components/common/Pressable';
import { useSchool } from '@/context/SchoolContext';

import { Home, BookOpen, Bell, BarChart3, User } from 'lucide-react';

const TABS = [
  { href: '/school', label: 'Home', exact: true, icon: Home },
  { href: '/school/courses', label: 'Courses', exact: false, icon: BookOpen },
  { href: '/school/notices', label: 'Notices', exact: false, icon: Bell },
  { href: '/school/progress', label: 'Progress', exact: false, icon: BarChart3 },
  { href: '/school/profile', label: 'Profile', exact: false, icon: User },
];

export const SchoolTabBar: React.FC = () => {
  const router = useRouter();
  const { school } = useSchool();

  return (
    <nav
      className="school-tabbar"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'var(--safe-bottom)',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'center',
          height: 'var(--tabbar-h)',
          paddingLeft: 'max(8px, var(--safe-left))',
          paddingRight: 'max(8px, var(--safe-right))',
        }}
      >
        {TABS.map((tab) => {
          const active = tab.exact
            ? router.asPath === tab.href
            : router.asPath.startsWith(tab.href) && tab.href !== '/school'
              ? true
              : tab.href === '/school' && router.asPath === '/school';
          if (tab.href !== '/school' && router.asPath === tab.href && tab.exact === false) {
            // avoid double
          }
          const isActive =
            tab.exact && router.pathname === '/school'
              ? router.asPath === '/school'
              : router.asPath.startsWith(tab.href);
          // simpler
          let active2 = tab.exact ? router.asPath === tab.href : router.asPath.startsWith(tab.href);
          if (tab.exact && tab.href === '/school') {
            active2 = router.asPath === '/school' || router.asPath === '/school/';
          }
          return (
            <Link key={tab.href} href={tab.href} passHref legacyBehavior>
              <Pressable
                as="a"
                expandHitArea
                onPress={() => haptic('light')}
                className={cn('school-tab', active2 && 'school-tab-active')}
                aria-current={active2 ? 'page' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  height: '100%',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {(() => {
                  const Icon = tab.icon;
                  return <Icon size={16} strokeWidth={active2 ? 2.5 : 2} aria-hidden />;
                })()}
                <span>{tab.label}</span>
              </Pressable>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};