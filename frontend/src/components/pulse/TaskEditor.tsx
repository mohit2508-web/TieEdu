import React, { useState } from 'react';
import { Plus, Trash2, Save, FileCode2 } from 'lucide-react';
import { pulseApi, type TaskInput } from '@/lib/pulse/api';
import type { PulseTask } from '@/lib/pulse/demo';

/**
 * Project Pulse — create or edit a task: requirements (with hints for the
 * offline reviewer), test cases for the autograder, starter files, weights.
 */

const input = 'w-full rounded-cell border border-line-strong/60 bg-card px-3 text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]';
const label = 'block text-xs font-semibold text-muted';
const ghost = 'inline-flex h-8 items-center gap-1 rounded-well border border-line px-2.5 text-xs font-semibold text-heading hover:bg-surface-hover';

const toLocal = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export const emptyTask = (): TaskInput => ({
  title: '', summary: '', published: false,
  assigned_at: new Date().toISOString(), deadline_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  requirements: [{ title: '', detail: '', hints: [] }],
  tests: [],
  starter: [{ path: 'main.c', code: '#include <stdio.h>\n\nint main(void) {\n    // TODO\n    return 0;\n}\n' }],
  weights: { tests: 50, reqs: 40, activity: 10 },
});

export const fromTask = (t: PulseTask): TaskInput => ({
  title: t.title, summary: t.summary, published: !!t.published, assigned_at: t.assignedAt, deadline_at: t.deadlineAt,
  requirements: t.requirements.map((r) => ({ title: r.title, detail: r.detail, hints: r.hints ?? [] })),
  tests: t.tests.map((x) => ({ name: x.name, input: x.input, expected: x.expected, req_id: x.reqId })),
  starter: t.starter, weights: t.weights ?? { tests: 50, reqs: 40, activity: 10 },
});

export const TaskEditor: React.FC<{ initial: TaskInput; onSave: (t: TaskInput) => Promise<void>; onDelete?: () => Promise<void> }> = ({ initial, onSave, onDelete }) => {
  const [t, setT] = useState<TaskInput>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setT((p) => ({ ...p, [k]: v }));
  const upd = <K extends 'requirements' | 'tests' | 'starter'>(k: K, i: number, patch: Partial<TaskInput[K][number]>) =>
    setT((p) => ({ ...p, [k]: (p[k] as any[]).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const del = (k: 'requirements' | 'tests' | 'starter', i: number) => setT((p) => ({ ...p, [k]: (p[k] as any[]).filter((_, j) => j !== i) }));

  const save = async (publish?: boolean) => {
    setBusy(true); setMsg(null);
    try { await onSave(publish === undefined ? t : { ...t, published: publish }); setMsg('Saved.'); }
    catch (e: any) { setMsg(e?.message || 'Could not save.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-h3 text-heading">The task</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="md:col-span-2"><span className={label}>Title</span>
            <input className={`${input} mt-1 h-10`} value={t.title} onChange={(e) => set('title', e.target.value)} placeholder="Task 3 — Student Record Manager" /></label>
          <label className="md:col-span-2"><span className={label}>What students must build (they see this)</span>
            <textarea className={`${input} mt-1 py-2`} rows={3} value={t.summary} onChange={(e) => set('summary', e.target.value)} /></label>
          <label><span className={label}>Assigned</span>
            <input type="datetime-local" className={`${input} mt-1 h-10`} value={toLocal(t.assigned_at)} onChange={(e) => set('assigned_at', new Date(e.target.value).toISOString())} /></label>
          <label><span className={label}>Deadline</span>
            <input type="datetime-local" className={`${input} mt-1 h-10`} value={toLocal(t.deadline_at)} onChange={(e) => set('deadline_at', new Date(e.target.value).toISOString())} /></label>
        </div>
        <p className="mt-2 text-xs text-muted">Commits before the assigned time are not counted as work on this task.</p>
      </section>

      <section className="rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-h3 text-heading">Requirements</h2>
        <p className="mt-0.5 text-xs text-muted">Each is marked done / partly / missing. Hints are words or /regex/ the code must contain; they decide the verdict when AI review is off.</p>
        <ol className="mt-3 space-y-3">
          {t.requirements.map((r, i) => (
            <li key={i} className="grid gap-2 rounded-cell bg-app-warm p-3 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <span className="pt-2 font-mono text-xs font-bold text-muted">R{i + 1}</span>
              <div className="space-y-2">
                <input className={`${input} h-9`} value={r.title} onChange={(e) => upd('requirements', i, { title: e.target.value })} placeholder="Save & load from file" aria-label={`R${i + 1} title`} />
                <textarea className={`${input} py-1.5`} rows={2} value={r.detail} onChange={(e) => upd('requirements', i, { detail: e.target.value })} placeholder="What exactly counts as done" aria-label={`R${i + 1} detail`} />
              </div>
              <label><span className={label}>Hints (comma separated)</span>
                <input className={`${input} mt-1 h-9 font-mono text-xs`} value={r.hints.join(', ')} onChange={(e) => upd('requirements', i, { hints: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="fopen, fwrite, fread" /></label>
              <button type="button" onClick={() => del('requirements', i)} aria-label={`Remove R${i + 1}`} className="self-start rounded-well p-2 text-muted hover:text-error"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ol>
        <button type="button" className={`${ghost} mt-3`} onClick={() => set('requirements', [...t.requirements, { title: '', detail: '', hints: [] }])}><Plus className="h-3.5 w-3.5" /> Requirement</button>
      </section>

      <section className="rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-h3 text-heading">Test cases</h2>
        <p className="mt-0.5 text-xs text-muted">
          Input goes to the program’s stdin. The test passes when every line of the expected output appears in the output, in order.
          To test a restart, split the input into runs with a line <span className="font-mono">---run---</span>; the last run’s output is checked.
        </p>
        <ol className="mt-3 space-y-3">
          {t.tests.map((x, i) => (
            <li key={i} className="rounded-cell bg-app-warm p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted">T{i + 1}</span>
                <input className={`${input} h-9 flex-1`} value={x.name} onChange={(e) => upd('tests', i, { name: e.target.value })} placeholder="Search for a missing roll" aria-label={`T${i + 1} name`} />
                <select className={`${input} h-9 w-auto`} value={x.req_id ?? ''} onChange={(e) => upd('tests', i, { req_id: e.target.value || null })} aria-label={`T${i + 1} requirement`}>
                  <option value="">No requirement</option>
                  {t.requirements.map((r, j) => <option key={j} value={`R${j + 1}`}>R{j + 1} {r.title}</option>)}
                </select>
                <button type="button" onClick={() => del('tests', i)} aria-label={`Remove T${i + 1}`} className="rounded-well p-2 text-muted hover:text-error"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <textarea className={`${input} py-1.5 font-mono text-xs`} rows={4} value={x.input} onChange={(e) => upd('tests', i, { input: e.target.value })} placeholder={'3\n999\n0'} aria-label={`T${i + 1} input`} />
                <textarea className={`${input} py-1.5 font-mono text-xs`} rows={4} value={x.expected} onChange={(e) => upd('tests', i, { expected: e.target.value })} placeholder="Not found" aria-label={`T${i + 1} expected output`} />
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className={`${ghost} mt-3`} onClick={() => set('tests', [...t.tests, { name: '', input: '', expected: '', req_id: null }])}><Plus className="h-3.5 w-3.5" /> Test case</button>
        <p className="mt-3 flex items-start gap-2 rounded-well bg-info-soft p-3 text-xs text-info">
          <FileCode2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Tests run in each student’s repo on every push. Put <a className="font-semibold underline" href={pulseApi.workflowUrl}>pulse-autograde.yml</a> at <span className="font-mono">.github/workflows/</span> in your starter repo (students who start from scratch are shown how). If a student edits it, their results are marked untrusted.</span>
        </p>
      </section>

      <section className="rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-h3 text-heading">Starter files</h2>
        <p className="mt-0.5 text-xs text-muted">Code you give everyone. It is left out of copy detection and of “what changed”.</p>
        {t.starter.map((f, i) => (
          <div key={i} className="mt-3 rounded-cell bg-app-warm p-3">
            <div className="flex gap-2">
              <input className={`${input} h-9 font-mono text-xs`} value={f.path} onChange={(e) => upd('starter', i, { path: e.target.value })} aria-label="File path" />
              <button type="button" onClick={() => del('starter', i)} aria-label="Remove file" className="rounded-well p-2 text-muted hover:text-error"><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea className={`${input} mt-2 py-1.5 font-mono text-xs`} rows={6} value={f.code} onChange={(e) => upd('starter', i, { code: e.target.value })} aria-label={`${f.path} contents`} />
          </div>
        ))}
        <button type="button" className={`${ghost} mt-3`} onClick={() => set('starter', [...t.starter, { path: 'file.c', code: '' }])}><Plus className="h-3.5 w-3.5" /> File</button>
      </section>

      <section className="rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-h3 text-heading">Score weights</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {(['tests', 'reqs', 'activity'] as const).map((k) => (
            <label key={k}><span className={label}>{k === 'reqs' ? 'Requirements' : k === 'tests' ? 'Tests' : 'Activity (days worked)'}</span>
              <input type="number" min={0} max={100} className={`${input} mt-1 h-9`} value={t.weights[k]} onChange={(e) => set('weights', { ...t.weights, [k]: Number(e.target.value) })} /></label>
          ))}
        </div>
      </section>

      <div className="sticky bottom-[calc(var(--tabbar-h)+0.5rem)] z-10 flex flex-wrap items-center gap-2 rounded-card border border-line bg-card p-3 shadow-pop md:bottom-4">
        <button type="button" disabled={busy} onClick={() => save()} className="inline-flex h-10 items-center gap-1.5 rounded-cell border border-line px-4 text-sm font-semibold text-heading hover:bg-surface-hover"><Save className="h-4 w-4" /> Save{t.published ? '' : ' draft'}</button>
        {!t.published ? <button type="button" disabled={busy} onClick={() => save(true)} className="inline-flex h-10 items-center rounded-cell bg-signal px-4 text-sm font-semibold text-on-primary shadow-edge-primary">Publish to students</button>
          : <button type="button" disabled={busy} onClick={() => save(false)} className="h-10 rounded-cell px-3 text-sm font-semibold text-muted hover:text-heading">Unpublish</button>}
        {msg ? <span className="text-sm text-muted" role="status">{msg}</span> : null}
        {onDelete ? <button type="button" disabled={busy} onClick={() => { if (window.confirm('Delete this task and every student’s results for it?')) onDelete(); }} className="ml-auto text-sm font-semibold text-error hover:underline">Delete task</button> : null}
      </div>
    </div>
  );
};
