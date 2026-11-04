import React, { useEffect, useState } from 'react';
import { LayoutTemplate, Copy, FilePlus2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PulseShell } from '@/components/pulse/PulseUi';
import { PulseGate } from '@/components/pulse/PulseGate';
import { TaskEditor, emptyTask } from '@/components/pulse/TaskEditor';
import { pulseApi, type TaskInput } from '@/lib/pulse/api';
import { usePulseNav } from '@/lib/pulse/scope';

/**
 * Project Pulse — a new task: start from a ready-made C template, copy one of
 * your tasks (this class, another class, last year), or start blank.
 */
type Tpl = { id: string; title: string; level: string; summary: string; input: TaskInput };

const Body: React.FC<{ classId: string }> = ({ classId }) => {
  const nav = usePulseNav();
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [mine, setMine] = useState<{ id: string; title: string; class_name: string }[]>([]);
  const [start, setStart] = useState<{ key: string; input: TaskInput } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    pulseApi.templates().then((r) => setTemplates(r.templates)).catch(() => {});
    pulseApi.teacherTasks().then((r) => setMine(r.tasks)).catch(() => {});
  }, []);

  const copyTask = async (id: string) => {
    setMsg(null);
    try { const t = await pulseApi.duplicate(id, classId); nav.replace(`/project-pulse/teacher/task/${t.id}/edit`); }
    catch (e: any) { setMsg(e?.message || 'Could not copy.'); }
  };

  return (
    <PulseShell title="New task" role={null} crumbs={[{ href: nav.href(`/project-pulse/teacher/class/${classId}`), label: 'Class' }]}>
      {!start ? (
        <div className="space-y-4">
          <section className="rounded-card border border-line bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-h3 text-heading"><LayoutTemplate className="h-4 w-4" /> Start from a ready-made C task</h2>
            <p className="mt-0.5 text-xs text-muted">Everything is filled in. Change the deadline, then publish.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <button key={t.id} type="button" onClick={() => setStart({ key: t.id, input: t.input })}
                  className="rounded-cell border border-line p-4 text-left transition-shadow hover:shadow-pop">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted">{t.level}</span>
                  <span className="mt-0.5 block font-semibold text-heading">{t.title}</span>
                  <span className="mt-1 line-clamp-3 block text-xs text-body">{t.summary}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-line bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-h3 text-heading"><Copy className="h-4 w-4" /> Copy one of your tasks</h2>
            <p className="mt-0.5 text-xs text-muted">From this class, another class or last year. The copy is a draft with a new folder and the same number of days.</p>
            {mine.length ? (
              <ul className="mt-3 divide-y divide-line">
                {mine.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1"><span className="font-semibold text-heading">{t.title}</span> <span className="text-muted">· {t.class_name}</span></span>
                    <button type="button" onClick={() => copyTask(t.id)} className="inline-flex h-8 items-center gap-1 rounded-well border border-line px-2.5 text-xs font-semibold text-heading hover:bg-surface-hover"><Copy className="h-3.5 w-3.5" /> Copy here</button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-muted">No tasks yet.</p>}
            {msg ? <p className="mt-2 text-sm text-error">{msg}</p> : null}
          </section>

          <button type="button" onClick={() => setStart({ key: 'blank', input: emptyTask() })}
            className={cn('flex w-full items-center gap-3 rounded-card border border-dashed border-line-strong/60 bg-app-warm p-5 text-left')}>
            <FilePlus2 className="h-5 w-5 text-secondary" />
            <span><span className="font-display text-h3 text-heading">Start blank</span><span className="block text-xs text-muted">Write the title, description, deadline and requirements yourself.</span></span>
          </button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => setStart(null)} className="mb-3 text-sm font-semibold text-link">← Choose another way to start</button>
          <TaskEditor key={start.key} initial={start.input}
            onSave={async (t) => { const x = await pulseApi.createTask(classId, t); nav.replace(`/project-pulse/teacher/task/${x.id}/edit`); }} />
        </>
      )}
    </PulseShell>
  );
};

export default function PulseNewTask() {
  const nav = usePulseNav();
  const classId = typeof nav.query.classId === 'string' ? nav.query.classId : '';
  return <PulseGate title="New task">{classId ? <Body classId={classId} /> : null}</PulseGate>;
}
