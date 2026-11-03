import React, { useState } from 'react';
import { Plus, Trash2, Save, FileCode2, FolderGit2 } from 'lucide-react';
import { pulseApi, type TaskInput } from '@/lib/pulse/api';
import type { PulseTask } from '@/lib/pulse/demo';

/**
 * Project Pulse — create or edit a task (PROJECT_PULSE_PLAN.md §12). A task is a
 * folder in each student's one class repo. Requirements are marked by the
 * teacher (no AI, no hints). Test cases are optional: "Auto-run tests" off means
 * nothing on GitHub beyond the student's repo.
 */

const input = 'w-full rounded-cell border border-line-strong/60 bg-card px-3 text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]';
const label = 'block text-xs font-semibold text-muted';
const ghost = 'inline-flex h-8 items-center gap-1 rounded-well border border-line px-2.5 text-xs font-semibold text-heading hover:bg-surface-hover';

const toLocal = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export const emptyTask = (): TaskInput => ({
  title: '', summary: '', published: false, auto_tests: false,
  assigned_at: new Date().toISOString(), deadline_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  requirements: [{ title: '', detail: '' }],
  tests: [],
  starter: [],
  weights: { tests: 30, reqs: 60, activity: 10 },
});

export const fromTask = (t: PulseTask): TaskInput => ({
  title: t.title, summary: t.summary, published: !!t.published, assigned_at: t.assignedAt, deadline_at: t.deadlineAt,
  folder: t.folder, auto_tests: !!t.auto_tests,
  requirements: t.requirements.map((r) => ({ title: r.title, detail: r.detail })),
  tests: (t.all_tests ?? t.tests).map((x) => ({ name: x.name, input: x.input, expected: x.expected, req_id: x.reqId })),
  starter: t.starter, weights: t.weights ?? { tests: 30, reqs: 60, activity: 10 },
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
    try { await onSave(publish === undefined ? t : { ...t, published: publish }); setMsg(publish ? 'Published. Students can see it now.' : 'Saved.'); }
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
        <div className="mt-3 flex flex-col gap-2 rounded-cell bg-app-warm p-3 sm:flex-row sm:items-center">
          <FolderGit2 className="h-5 w-5 shrink-0 text-secondary" />
          <p className="flex-1 text-sm text-body">Students put this task in the folder <span className="font-mono font-semibold">{(t.folder || 'task-N')}/</span> of their class repo. Pulse fills it in; change it only if you need to.</p>
          <input className={`${input} h-9 w-40 font-mono text-xs`} value={t.folder ?? ''} onChange={(e) => set('folder', e.target.value.trim() || undefined)} placeholder="auto (task-N)" aria-label="Folder name" />
        </div>
        <p className="mt-2 text-xs text-muted">Commits before the assigned time are not counted as work on this task.</p>
      </section>

      <section className="rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-h3 text-heading">Requirements</h2>
        <p className="mt-0.5 text-xs text-muted">You mark each one Done / Partly / Missing for every student, with one click, in Review mode. Write what counts as done, so marking is quick.</p>
        <ol className="mt-3 space-y-3">
          {t.requirements.map((r, i) => (
            <li key={i} className="grid gap-2 rounded-cell bg-app-warm p-3 md:grid-cols-[3rem_minmax(0,1fr)_auto]">
              <span className="pt-2 font-mono text-xs font-bold text-muted">R{i + 1}</span>
              <div className="space-y-2">
                <input className={`${input} h-9`} value={r.title} onChange={(e) => upd('requirements', i, { title: e.target.value })} placeholder="Save & load from file" aria-label={`R${i + 1} title`} />
                <textarea className={`${input} py-1.5`} rows={2} value={r.detail} onChange={(e) => upd('requirements', i, { detail: e.target.value })} placeholder="What exactly counts as done" aria-label={`R${i + 1} detail`} />
              </div>
              <button type="button" onClick={() => del('requirements', i)} aria-label={`Remove R${i + 1}`} className="self-start rounded-well p-2 text-muted hover:text-error"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ol>
        <button type="button" className={`${ghost} mt-3`} onClick={() => set('requirements', [...t.requirements, { title: '', detail: '' }])}><Plus className="h-3.5 w-3.5" /> Requirement</button>
      </section>

      <section className="rounded-card border border-line bg-card p-5">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={t.auto_tests} onChange={(e) => set('auto_tests', e.target.checked)} />
          <span>
            <span className="font-display text-h3 text-heading">Auto-run tests (optional)</span>
            <span className="block text-xs text-muted">Off: you check the code yourself in Review mode, and nothing else is needed on GitHub. On: each push compiles the folder with gcc and runs your test cases; students add one autograder file to their repo once.</span>
          </span>
        </label>
        {t.auto_tests ? (
          <>
            <p className="mt-3 text-xs text-muted">
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
                    <label>
                      <span className={label}>Input typed into the program (stdin) — leave empty if it asks for nothing</span>
                      <textarea className={`${input} mt-1 py-1.5 font-mono text-xs`} rows={4} value={x.input} onChange={(e) => upd('tests', i, { input: e.target.value })} placeholder={'e.g.\n3\n999\n0'} />
                    </label>
                    <label>
                      <span className={label}>Expected output — required; the test passes when this appears</span>
                      <textarea className={`${input} mt-1 py-1.5 font-mono text-xs`} rows={4} value={x.expected} onChange={(e) => upd('tests', i, { expected: e.target.value })} placeholder={'e.g.\nNot found'} aria-invalid={!x.expected.trim()} />
                      {!x.expected.trim() ? <span className="mt-1 block text-xs font-semibold text-error">Empty: this test will not be saved until you fill it.</span> : null}
                    </label>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" className={`${ghost} mt-3`} onClick={() => set('tests', [...t.tests, { name: '', input: '', expected: '', req_id: null }])}><Plus className="h-3.5 w-3.5" /> Test case</button>
            <p className="mt-3 flex items-start gap-2 rounded-well bg-info-soft p-3 text-xs text-info">
              <FileCode2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Students are shown, once, how to add <a className="font-semibold underline" href={pulseApi.workflowUrl}>pulse-autograde.yml</a> to their repo. You do not need to make any repo.</span>
            </p>
          </>
        ) : null}
      </section>

      <details className="rounded-card border border-line bg-card p-5">
        <summary className="cursor-pointer font-display text-h3 text-heading">More: starter code and score weights</summary>
        <p className="mt-2 text-xs text-muted">Starter code is shown to you as the “before” in each student’s Changes view and is left out of copy detection.</p>
        {t.starter.map((f, i) => (
          <div key={i} className="mt-3 rounded-cell bg-app-warm p-3">
            <div className="flex gap-2">
              <input className={`${input} h-9 font-mono text-xs`} value={f.path} onChange={(e) => upd('starter', i, { path: e.target.value })} aria-label="File path" />
              <button type="button" onClick={() => del('starter', i)} aria-label="Remove file" className="rounded-well p-2 text-muted hover:text-error"><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea className={`${input} mt-2 py-1.5 font-mono text-xs`} rows={6} value={f.code} onChange={(e) => upd('starter', i, { code: e.target.value })} aria-label={`${f.path} contents`} />
          </div>
        ))}
        <button type="button" className={`${ghost} mt-3`} onClick={() => set('starter', [...t.starter, { path: 'main.c', code: '' }])}><Plus className="h-3.5 w-3.5" /> Starter file</button>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(['reqs', 'tests', 'activity'] as const).map((k) => (
            <label key={k}><span className={label}>{k === 'reqs' ? 'Your marks' : k === 'tests' ? 'Tests (if on)' : 'Activity (days worked)'}</span>
              <input type="number" min={0} max={100} className={`${input} mt-1 h-9`} value={t.weights[k]} onChange={(e) => set('weights', { ...t.weights, [k]: Number(e.target.value) })} /></label>
          ))}
        </div>
      </details>

      <div className="sticky bottom-[calc(var(--tabbar-h)+0.5rem)] z-10 flex flex-wrap items-center gap-2 rounded-card border border-line bg-card p-3 shadow-pop md:bottom-4">
        <button type="button" disabled={busy} onClick={() => save()} className="inline-flex h-10 items-center gap-1.5 rounded-cell border border-line px-4 text-sm font-semibold text-heading hover:bg-surface-hover"><Save className="h-4 w-4" /> Save{t.published ? '' : ' draft'}</button>
        {!t.published ? <button type="button" disabled={busy} onClick={() => save(true)} className="inline-flex h-10 items-center rounded-cell bg-signal px-4 text-sm font-semibold text-on-primary shadow-edge-primary">Publish to students</button>
          : <button type="button" disabled={busy} onClick={() => save(false)} className="h-10 rounded-cell px-3 text-sm font-semibold text-muted hover:text-heading">Unpublish</button>}
        {msg ? <span className="text-sm text-muted" role="status">{msg}</span> : null}
        {onDelete ? <button type="button" disabled={busy} onClick={() => { if (window.confirm('Delete this task and every student’s marks for it? Their code stays in their repos.')) onDelete(); }} className="ml-auto text-sm font-semibold text-error hover:underline">Delete task</button> : null}
      </div>
    </div>
  );
};
