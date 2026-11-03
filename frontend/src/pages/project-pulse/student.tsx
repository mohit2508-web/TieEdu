import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronRight, KeyRound } from 'lucide-react';
import { PulseShell, StatusPill } from '@/components/pulse/PulseUi';
import { PulseGate, PulseLoadState, usePulseLoad } from '@/components/pulse/PulseGate';
import { StudentProgress, type MyTaskItem } from '@/components/pulse/StudentProgress';
import { pulseApi, type PulseMe } from '@/lib/pulse/api';
import { fmtDateTime, STATUS_META } from '@/lib/pulse/demo';

/**
 * Project Pulse — the student's own page. Without ?task it lists their tasks;
 * with ?task=<id> it shows that task (repo, checklist, tests, feedback). The
 * server returns only this student's own submission.
 */

const TaskView: React.FC<{ me: PulseMe; taskId: string }> = ({ me, taskId }) => {
  const { data, error, reload, setData } = usePulseLoad(() => pulseApi.myTask(taskId), [taskId]);
  if (!data) return <PulseLoadState title="My task" error={error} onRetry={reload} />;
  const tasks: MyTaskItem[] = me.tasks.map((t) => ({
    id: t.task_id, title: t.title, due: t.deadline_at, current: t.task_id === taskId, href: `/project-pulse/student?task=${t.task_id}`,
    state: `${STATUS_META[t.status].label.toLowerCase()}${t.repo ? ` · ${t.score}/100` : ''}`,
  }));
  return (
    <StudentProgress
      data={data}
      tasks={tasks}
      workflowUrl={pulseApi.workflowUrl}
      onLink={async (url) => { const r = await pulseApi.linkRepo(taskId, url); setData({ ...data, students: [r.student] }); return r.error; }}
      onRecheck={async () => { const r = await pulseApi.recheck(taskId); setData({ ...data, students: [r.student] }); }}
    />
  );
};

const Body: React.FC = () => {
  const router = useRouter();
  const { data: me, error, reload } = usePulseLoad(() => pulseApi.me(), []);
  if (!me) return <PulseLoadState title="My tasks" error={error} onRetry={reload} />;
  const taskId = typeof router.query.task === 'string' ? router.query.task : me.tasks.length === 1 ? me.tasks[0].task_id : null;
  if (taskId) return <TaskView me={me} taskId={taskId} />;
  return (
    <PulseShell title="My tasks" role={null}>
      {me.pending_joins.length ? <p className="mb-4 rounded-cell bg-warning-soft px-4 py-2.5 text-sm text-signal-ink">Waiting for your teacher to approve you in {me.pending_joins.join(', ')}.</p> : null}
      {me.tasks.length ? (
        <ul className="space-y-2">
          {me.tasks.map((t) => (
            <li key={t.task_id}>
              <Link href={`/project-pulse/student?task=${t.task_id}`} className="flex items-center gap-3 rounded-card border border-line bg-card p-4 hover:shadow-pop">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-heading">{t.title}</span>
                  <span className="block text-xs text-muted">{t.class.name} · due {fmtDateTime(t.deadline_at)}</span>
                </span>
                <StatusPill status={t.status} />
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mx-auto max-w-md rounded-band border border-line bg-card p-8 text-center">
          <h2 className="font-display text-h2 text-heading">No tasks yet</h2>
          <p className="mt-1 text-sm text-muted">When your teacher invites you and publishes a task, it shows here. Got a class code?</p>
          <Link href="/project-pulse/join" className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-cell bg-signal px-4 text-sm font-semibold text-on-primary shadow-edge-primary"><KeyRound className="h-4 w-4" /> Join with a code</Link>
        </div>
      )}
      {me.is_teacher ? <p className="mt-6 text-sm"><Link href="/project-pulse/teacher" className="font-semibold text-link">Go to the teacher portal →</Link></p> : null}
    </PulseShell>
  );
};

export default function PulseStudentHome() {
  return <PulseGate title="My tasks"><Body /></PulseGate>;
}
