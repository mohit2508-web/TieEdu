import React from 'react';
import { useSchool } from '@/context/SchoolContext';
import Link from 'next/link';
import { Pressable } from '@/components/common/Pressable';

const CoursesScreen: React.FC = () => {
  const { programs } = useSchool();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>Courses</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {programs.map((p) => (
          <Link key={p.program_id} href={`/school/courses/${p.program_id}`} passHref legacyBehavior>
            <Pressable as="a" expandHitArea className="school-lesson-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 700 }}>{p.title}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.track}</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.description}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Classes {p.class_min}–{p.class_max}</span>
            </Pressable>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CoursesScreen;