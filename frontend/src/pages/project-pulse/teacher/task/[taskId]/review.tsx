import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PulseGate, PulseLoadState, usePulseLoad } from '@/components/pulse/PulseGate';
import { PulseShell } from '@/components/pulse/PulseUi';
import { ReviewMode } from '@/components/pulse/ReviewMode';
import { pulseApi } from '@/lib/pulse/api';

/**
 * Project Pulse — Review mode page. The queue is the students who have work in
 * the task folder (not reviewed first); ?s=<student> opens one.
 */
const Body: React.FC<{ taskId: string; sid: string | null }> = ({ taskId, sid }) => {
  const router = useRouter();
  const dash = usePulseLoad(() => pulseApi.dashboard(taskId), [taskId]);
  const [comments, setComments] = useState<string[]>([]);
  useEffect(() => { pulseApi.comments().then((r) => setComments(r.comments)).catch(() => {}); }, []);

  const queue = (dash.data?.students || []).filter((s) => s.commits.length)
    .sort((a, b) => Number(!!a.reviewed) - Number(!!b.reviewed) || a.name.localeCompare(b.name));
  const current = sid || queue[0]?.id || null;
  const one = usePulseLoad(current ? () => pulseApi.student(taskId, current) : null, [taskId, current]);
  const goTo = (id: string) => router.replace(`/project-pulse/teacher/task/${taskId}/review?s=${id}`, undefined, { shallow: true });

  if (!dash.data) return <PulseLoadState title="Review" error={dash.error} onRetry={dash.reload} />;
  if (!queue.length) {
    return (
      <PulseShell title="Review" role={null} crumbs={[{ href: `/project-pulse/teacher/task/${taskId}`, label: dash.data.task.title }]}>
        <p className="rounded-card border border-line bg-card p-6 text-sm text-muted">Nobody has pushed code to <span className="font-mono">{dash.data.task.folder}/</span> yet. Students appear here as soon as they do.</p>
      </PulseShell>
    );
  }
  if (!one.data) return <PulseLoadState title="Review" error={one.error} onRetry={one.reload} />;
  return (
    <ReviewMode
      data={one.data}
      queue={queue}
      dashboardHref={`/project-pulse/teacher/task/${taskId}`}
      goTo={goTo}
      comments={comments}
      onSaveComments={async (list) => { const r = await pulseApi.saveComments(list); setComments(r.comments); }}
      onSave={async (body) => {
        const r = await pulseApi.review(taskId, one.data!.students[0].id, body);
        dash.setData({ ...dash.data!, students: dash.data!.students.map((x) => (x.id === r.student.id ? r.student : x)) });
        await one.reload();
      }}
    />
  );
};

export default function PulseReviewPage() {
  const router = useRouter();
  const taskId = typeof router.query.taskId === 'string' ? router.query.taskId : '';
  const sid = typeof router.query.s === 'string' ? router.query.s : null;
  return <PulseGate title="Review">{taskId ? <Body taskId={taskId} sid={sid} /> : null}</PulseGate>;
}
