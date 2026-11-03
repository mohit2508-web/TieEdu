import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import { TaskDashboard } from '@/components/pulse/TaskDashboard';
import { StudentDetail } from '@/components/pulse/StudentDetail';
import { StudentProgress } from '@/components/pulse/StudentProgress';
import { demoBundle, demoStudents, reqPoints, DEMO_TASK } from '@/lib/pulse/demo';

/**
 * Project Pulse demo — every screen on sample data, open to anyone, so a teacher
 * or college can see the product before being appointed.
 *   ?view=teacher            class dashboard
 *   ?view=teacher&s=<id>     one student
 *   ?view=student            the student's own page
 */
export default function PulseDemo() {
  const router = useRouter();
  const q = router.query;
  const view = q.view === 'student' ? 'student' : 'teacher';
  const sid = typeof q.s === 'string' ? q.s : null;
  const base = useMemo(demoBundle, []);
  const href = (id: string, tab?: string) => `/project-pulse/demo?view=teacher&s=${id}${tab ? `&tab=${tab}` : ''}`;

  if (!router.isReady) return null;

  if (view === 'student') {
    const me = demoStudents().find((s) => s.status === 'progress' && reqPoints(s) >= 3 && reqPoints(s) < 4 && s.flags.length === 0) ?? demoStudents()[0];
    return (
      <StudentProgress
        preview
        data={{ ...base, students: [me] }}
        tasks={[
          { id: DEMO_TASK.id, title: DEMO_TASK.title, due: DEMO_TASK.deadlineAt, state: 'in progress', current: true, href: '/project-pulse/demo?view=student' },
          { id: 't2', title: 'Task 2 — Matrix operations', due: '2026-10-20T23:59:00+05:30', state: 'Done · 92/100', current: false, href: '/project-pulse/demo?view=student' },
        ]}
      />
    );
  }

  if (sid) {
    const all = base.students;
    const i = Math.max(0, all.findIndex((s) => s.id === sid));
    return (
      <StudentDetail
        preview
        data={{ ...base, students: all[i] ? [all[i]] : [], prev: all[(i - 1 + all.length) % all.length].id, next: all[(i + 1) % all.length].id }}
        classHref="/project-pulse/demo?view=teacher"
        studentHref={href}
        initialTab={typeof q.tab === 'string' ? q.tab : undefined}
      />
    );
  }

  return <TaskDashboard preview data={base} studentHref={href} classHref="/project-pulse/demo?view=teacher" />;
}
