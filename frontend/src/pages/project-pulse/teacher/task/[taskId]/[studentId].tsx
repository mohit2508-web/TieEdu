import React from 'react';
import { useRouter } from 'next/router';
import { PulseGate, PulseLoadState, usePulseLoad } from '@/components/pulse/PulseGate';
import { StudentDetail } from '@/components/pulse/StudentDetail';
import { pulseApi } from '@/lib/pulse/api';

/** Project Pulse — one student's work on one task, for the teacher. */
const Body: React.FC<{ taskId: string; sid: string; tab?: string }> = ({ taskId, sid, tab }) => {
  const { data, error, reload } = usePulseLoad(() => pulseApi.student(taskId, sid), [taskId, sid]);
  if (!data) return <PulseLoadState title="Student" error={error} onRetry={reload} />;
  const after = (fn: () => Promise<unknown>) => async () => { await fn(); await reload(); };
  return (
    <StudentDetail
      data={data}
      initialTab={tab}
      reviewHref={`/project-pulse/teacher/task/${taskId}/review?s=${sid}`}
      classHref={`/project-pulse/teacher/task/${taskId}`}
      studentHref={(id, t) => `/project-pulse/teacher/task/${taskId}/${id}${t ? `?tab=${t}` : ''}`}
      actions={{
        feedback: (body) => after(() => pulseApi.feedback(taskId, sid, body))(),
        note: (body) => after(() => pulseApi.note(taskId, sid, body))(),
        override: (score, reason) => after(() => pulseApi.override(taskId, sid, { score, reason }))(),
        verdict: (reqId, verdict) => after(() => pulseApi.review(taskId, sid, { verdicts: { [reqId]: verdict } }))(),
        sync: after(() => pulseApi.syncStudent(taskId, sid)),
        verify: (on) => after(() => pulseApi.verify(taskId, sid, on))(),
      }}
    />
  );
};

export default function PulseStudentPage() {
  const router = useRouter();
  const q = router.query;
  const taskId = typeof q.taskId === 'string' ? q.taskId : '';
  const sid = typeof q.studentId === 'string' ? q.studentId : '';
  return <PulseGate title="Student">{taskId && sid ? <Body taskId={taskId} sid={sid} tab={typeof q.tab === 'string' ? q.tab : undefined} /> : null}</PulseGate>;
}
