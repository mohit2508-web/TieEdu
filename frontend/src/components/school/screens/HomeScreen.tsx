import React from 'react';
import { useSchool } from '@/context/SchoolContext';
import { Pressable } from '@/components/common/Pressable';
import { cn } from '@/lib/cn';
import Link from 'next/link';

const HomeScreen: React.FC = () => {
  const { school, user, programs, notices, progress, completedCount, member, loading } = useSchool();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12 }}>
      <section className="school-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-heading)', letterSpacing: -0.02 }}>
            Hi {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <span style={{ color: 'var(--text-muted)' }}>
            {school?.name} • {member?.section && `Section ${member.section}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="school-pill">XP {user?.xp || 0}</span>
          <span className="school-pill">Streak {user?.streak || 0}</span>
          <span className="school-pill">Done {completedCount}</span>
        </div>
      </section>

      {notices.filter((n) => n.pinned).length > 0 && (
        <section className="school-card">
          <h2 className="school-section-title">Pinned notices</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notices
              .filter((n) => n.pinned)
              .slice(0, 2)
              .map((n) => (
                <div key={n.notice_id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 700 }}>{n.title}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{n.body}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="school-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="school-section-title">Your programmes</h2>
          <Link href="/school/courses" passHref legacyBehavior>
            <Pressable as="a" expandHitArea className="btn-ghost" style={{ padding: '6px 10px', borderRadius: 10, fontSize: 13 }}>
              See all
            </Pressable>
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {programs.slice(0, 3).map((p) => (
            <Link key={p.program_id} href={`/school/courses/${p.program_id}`} passHref legacyBehavior>
              <Pressable
                as="a"
                expandHitArea
                className="school-lesson-row"
                style={{ flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 700 }}>{p.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.category}</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.description}</span>
              </Pressable>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomeScreen;