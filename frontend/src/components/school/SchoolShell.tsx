import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pressable } from '@/components/common/Pressable';
import { useSchool } from '@/context/SchoolContext';
import { cn } from '@/lib/cn';

interface SchoolShellProps {
  children: React.ReactNode;
}

export const SchoolShell: React.FC<SchoolShellProps> = ({ children }) => {
  const { school, user } = useSchool();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="school-shell"
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-app)',
        paddingTop: 'calc(-1 * var(--safe-top))',
        paddingBottom: 0,
      }}
    >
      <header
        className="school-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 'calc(var(--safe-top) + 8px)',
          paddingBottom: scrolled ? 6 : 10,
          paddingLeft: 'max(16px, var(--safe-left))',
          paddingRight: 'max(16px, var(--safe-right))',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <Link href="/school" passHref legacyBehavior>
          <Pressable
            as="a"
            expandHitArea
            className="school-logo"
            style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <span style={{ fontSize: scrolled ? 16 : 20, fontWeight: 700, color: 'var(--text-heading)', transition: 'font-size 160ms ease' }}>
              {school?.short_name || school?.name || 'TieEdu School'}
            </span>
            <span style={{ fontSize: scrolled ? 10 : 11, color: 'var(--text-muted)', transition: 'font-size 160ms ease' }}>{school?.motto || 'Curiosity first'}</span>
          </Pressable>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/school/profile" passHref legacyBehavior>
            <Pressable
              as="a"
              expandHitArea
              className={cn('school-avatar-btn')}
              style={{
                height: 36,
                width: 36,
                borderRadius: 999,
                background: 'var(--bg-sky-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: 'var(--brand-sky)',
              }}
            >
              {(user?.name || 'S').slice(0, 1).toUpperCase()}
            </Pressable>
          </Link>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: 'max(16px, var(--safe-left))',
          paddingRight: 'max(16px, var(--safe-right))',
          paddingBottom: 'calc(var(--tabbar-total) + 8px)',
        }}
      >
        {children}
      </main>
    </div>
  );
};