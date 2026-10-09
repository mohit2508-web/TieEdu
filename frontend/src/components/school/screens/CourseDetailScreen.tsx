import React from 'react';
import { useRouter } from 'next/router';
import { useSchool } from '@/context/SchoolContext';
import { schoolCompleteLesson } from '@/lib/schoolApi';
import { Pressable } from '@/components/common/Pressable';
import { haptic } from '@/components/common/Pressable';
import Link from 'next/link';

const CourseDetailScreen: React.FC = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const { programs, progress, refresh } = useSchool();
  const program = programs.find((p) => p.program_id === id);
  const done = progress[id] || [];

  const toggle = async (ref: string) => {
    if (!program) return;
    const isDone = done.includes(ref);
    if (isDone) return;
    try {
      haptic('medium');
      await schoolCompleteLesson({ programId: program.program_id, lessonRef: ref });
      await refresh();
    } catch (e) {
      // ignore for now
    }
  };

  if (!program) {
    return (
      <div style={{ paddingTop: 12 }}>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>{program.title}</h1>
        <Link href="/school/courses" passHref legacyBehavior>
          <Pressable as="a" expandHitArea className="btn-ghost" style={{ padding: '6px 10px', borderRadius: 10, fontSize: 13 }}>
            Back
          </Pressable>
        </Link>
      </div>
      <p style={{ color: 'var(--text-muted)' }}>{program.description}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {program.curriculum.map((l) => {
          const isDone = done.includes(l.ref);
          return (
            <div key={l.ref} className={`school-lesson-row ${isDone ? 'school-lesson-done' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 700 }}>{l.title}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.ref}</span>
              </div>
              {!isDone && (
                <Pressable as="button" onPress={() => toggle(l.ref)} className="btn-primary" style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13 }}>
                  Mark done
                </Pressable>
              )}
              {isDone && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Done</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseDetailScreen;