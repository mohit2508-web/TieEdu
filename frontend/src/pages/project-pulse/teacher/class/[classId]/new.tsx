import React from 'react';
import { useRouter } from 'next/router';
import { PulseShell } from '@/components/pulse/PulseUi';
import { PulseGate } from '@/components/pulse/PulseGate';
import { TaskEditor, emptyTask } from '@/components/pulse/TaskEditor';
import { pulseApi } from '@/lib/pulse/api';

/** Project Pulse — a new task for a class. */
export default function PulseNewTask() {
  const router = useRouter();
  const classId = typeof router.query.classId === 'string' ? router.query.classId : '';
  return (
    <PulseGate title="New task">
      <PulseShell title="New task" role={null} crumbs={[{ href: `/project-pulse/teacher/class/${classId}`, label: 'Class' }]}>
        {classId ? <TaskEditor initial={emptyTask()} onSave={async (t) => { const x = await pulseApi.createTask(classId, t); router.replace(`/project-pulse/teacher/task/${x.id}/edit`); }} /> : null}
      </PulseShell>
    </PulseGate>
  );
}
