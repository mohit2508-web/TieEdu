import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Pencil, ClipboardCheck } from 'lucide-react';
import { PulseGate, PulseLoadState, usePulseLoad } from '@/components/pulse/PulseGate';
import { TaskDashboard } from '@/components/pulse/TaskDashboard';
import { pulseApi } from '@/lib/pulse/api';

/** Project Pulse — live class dashboard for one task. */
const Body: React.FC<{ id: string }> = ({ id }) => {
  const { data, error, reload } = usePulseLoad(() => pulseApi.dashboard(id), [id]);
  if (!data) return <PulseLoadState title="Dashboard" error={error} onRetry={reload} />;
  const exportCsv = async () => {
    const blob = await pulseApi.exportCsv(id);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pulse-${id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <TaskDashboard
      data={data}
      classHref={`/project-pulse/teacher/class/${data.task.class_id}`}
      studentHref={(sid, tab) => `/project-pulse/teacher/task/${id}/${sid}${tab ? `?tab=${tab}` : ''}`}
      onSync={async () => { await pulseApi.syncTask(id); await reload(); }}
      onExport={exportCsv}
      onVerdict={async (sid, reqId, verdict) => { await pulseApi.review(id, sid, { verdicts: { [reqId]: verdict } }); await reload(); }}
      extraActions={<><Link href={`/project-pulse/teacher/task/${id}/review`} className="inline-flex h-9 items-center gap-1.5 rounded-cell bg-hero px-3 text-sm font-semibold text-hero-on"><ClipboardCheck className="h-4 w-4" /> Review</Link><Link href={`/project-pulse/teacher/task/${id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-cell border border-line bg-card px-3 text-sm font-semibold text-heading hover:bg-surface-hover"><Pencil className="h-4 w-4" /> Edit task</Link></>}
    />
  );
};

export default function PulseTaskDashboard() {
  const router = useRouter();
  const id = typeof router.query.taskId === 'string' ? router.query.taskId : '';
  return <PulseGate title="Dashboard">{id ? <Body id={id} /> : null}</PulseGate>;
}
