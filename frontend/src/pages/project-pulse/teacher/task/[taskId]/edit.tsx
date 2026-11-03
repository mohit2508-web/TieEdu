import React from 'react';
import { useRouter } from 'next/router';
import { PulseShell } from '@/components/pulse/PulseUi';
import { PulseGate, PulseLoadState, usePulseLoad } from '@/components/pulse/PulseGate';
import { TaskEditor, fromTask } from '@/components/pulse/TaskEditor';
import { pulseApi } from '@/lib/pulse/api';

/** Project Pulse — edit a task. Changing requirements re-runs the review on next sync. */
const Body: React.FC<{ id: string }> = ({ id }) => {
  const router = useRouter();
  const { data, error, reload } = usePulseLoad(() => pulseApi.task(id), [id]);
  if (!data) return <PulseLoadState title="Edit task" error={error} onRetry={reload} />;
  return (
    <PulseShell title={`Edit: ${data.title}`} role={null} crumbs={[{ href: `/project-pulse/teacher/class/${data.class_id}`, label: 'Class' }, { href: `/project-pulse/teacher/task/${id}`, label: 'Dashboard' }]}>
      <TaskEditor key={id} initial={fromTask(data)} onSave={async (t) => { await pulseApi.updateTask(id, t); }}
        onDelete={async () => { await pulseApi.deleteTask(id); router.replace(`/project-pulse/teacher/class/${data.class_id}`); }} />
    </PulseShell>
  );
};

export default function PulseEditTask() {
  const router = useRouter();
  const id = typeof router.query.taskId === 'string' ? router.query.taskId : '';
  return <PulseGate title="Edit task">{id ? <Body id={id} /> : null}</PulseGate>;
}
