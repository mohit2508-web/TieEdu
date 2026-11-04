import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, FolderGit2, GitBranch, KeyRound, Upload } from 'lucide-react';
import type { PrepView } from '@/lib/prepApi';

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const today = () => new Date().toISOString().slice(0, 10);

type Lab = NonNullable<PrepView['lab']>['items'][number];

/** Pulse status → what the student sees. */
const LAB_STATUS: Record<string, { label: string; tone: string }> = {
  noRepo: { label: 'Link your GitHub repo', tone: 'bg-surface-hover text-muted' },
  notStarted: { label: 'Not pushed yet', tone: 'bg-surface-hover text-muted' },
  unverified: { label: 'Repo not verified', tone: 'bg-danger-soft text-danger' },
  submitted: { label: 'Pushed · waiting for review', tone: 'bg-signal-soft text-amber-deep' },
  progress: { label: 'Reviewed · some tasks left', tone: 'bg-signal-soft text-amber-deep' },
  done: { label: 'Done ✓', tone: 'bg-success-soft text-success' },
};
const statusOf = (l: Lab) => (l.pulse ? LAB_STATUS[l.pulse.status] || LAB_STATUS.notStarted : null);

const Badge: React.FC<{ l: Lab }> = ({ l }) => (
  <span className={`grid h-11 min-w-[48px] shrink-0 place-items-center rounded-xl px-2 text-sm font-bold ${l.kind === 'lab' ? 'bg-signal-soft text-amber-deep' : 'bg-brand-ink text-white'}`}>{l.code}</span>
);

/** The full brief of one lab: every handbook task, word for word. */
const Brief: React.FC<{ l: Lab; base: string }> = ({ l, base }) => {
  const st = statusOf(l);
  return (
    <div className="space-y-5 text-base leading-relaxed text-body">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-1 font-semibold text-heading"><CalendarDays className="h-4 w-4" aria-hidden /> Due {fmt(l.due)}</span>
        {l.pulse && <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-1 font-mono font-semibold text-heading"><FolderGit2 className="h-4 w-4" aria-hidden /> {l.pulse.folder}/</span>}
        {st && <span className={`rounded-full px-3 py-1 font-semibold ${st.tone}`}>{st.label}{l.pulse?.reviewed ? ` · ${l.pulse.score}%` : ''}</span>}
        {l.pulse && <span className="text-muted">{l.pulse.commits} commit{l.pulse.commits === 1 ? '' : 's'}</span>}
      </div>
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wide text-muted">Objective</h4>
        <p className="mt-1">{l.objective}</p>
      </div>
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wide text-muted">Tasks ({l.tasks.length})</h4>
        <ol className="mt-2 space-y-2">
          {l.tasks.map((t, i) => (
            <li key={t} className="flex gap-3 rounded-xl bg-surface-hover/60 p-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-sm font-bold text-heading">{i + 1}</span>
              <span className="min-w-0">{t}</span>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wide text-muted">What to submit</h4>
        <p className="mt-1">{l.submit}</p>
      </div>
      {l.extension && (
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-muted">Extension (optional)</h4>
          <p className="mt-1">{l.extension}</p>
        </div>
      )}
      {l.pulse?.feedback && <p className="rounded-xl border border-success/40 bg-success-soft p-4"><span className="font-bold text-heading">Teacher feedback: </span>{l.pulse.feedback}</p>}
      {l.pulse && (
        <Link href={`${base}/student?task=${l.pulse.task_id}`} className="btn btn-primary min-h-[48px] w-full px-5 sm:w-auto">
          Open checklist, commits &amp; review <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      )}
    </div>
  );
};

/**
 * Lab (student side): the handbook's labs by milestone. Wide screens get a list
 * on the left and the open brief on the right; phones open the brief under the
 * lab. Inside a Project Pulse class every lab shows its status and opens the
 * student's own progress page.
 */
export const LabBriefs: React.FC<{ lab: NonNullable<PrepView['lab']>; sections: PrepView['sections']; base: string }> = ({ lab, sections, base }) => {
  const next = lab.items.find((l) => l.pulse?.status !== 'done' && l.due >= today()) || lab.items[0];
  const [open, setOpen] = useState<string | null>(next?.id ?? null);
  const [ms, setMs] = useState<string>('all');
  const done = lab.items.filter((l) => l.pulse?.status === 'done').length;
  const groups = sections.map((s) => ({ s, items: lab.items.filter((l) => l.milestone === s.key) })).filter((g) => g.items.length);
  const shown = groups.filter((g) => ms === 'all' || g.s.key === ms);
  const current = lab.items.find((l) => l.id === open) || null;

  return (
    <section className="space-y-6">
      {lab.pulse_class ? (
        <div className="rounded-card border border-success/40 bg-success-soft p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wide text-success">Project Pulse · {lab.pulse_class.name}</p>
              <p className="mt-1 text-lg font-semibold text-heading">{done} of {lab.items.length} labs done</p>
            </div>
            <Link href={`${base}/student`} className="btn btn-primary min-h-[48px] shrink-0 px-5">My lab tasks <ArrowRight className="h-5 w-5" aria-hidden /></Link>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-card" role="progressbar" aria-valuemin={0} aria-valuemax={lab.items.length} aria-valuenow={done} aria-label="Labs done">
            <div className="h-full rounded-full bg-success" style={{ width: `${lab.items.length ? (done / lab.items.length) * 100 : 0}%` }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-card border border-signal/40 bg-signal-soft p-5 sm:flex-row sm:items-center sm:p-6">
          <p className="min-w-0 flex-1 text-base text-heading">
            Your teacher tracks these labs in <span className="font-bold">Project Pulse</span>. Once you are in the class, every lab here shows whether you pushed it and your review. Until then, read the briefs and practise.
          </p>
          <Link href={`${base}/join`} className="btn btn-primary min-h-[48px] shrink-0 px-5"><KeyRound className="h-5 w-5" aria-hidden /> Join with class code</Link>
        </div>
      )}

      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: KeyRound, t: 'Join once', d: 'Use the invite email or the class code from your teacher.' },
          { icon: GitBranch, t: 'Link one repo', d: 'One GitHub repo for all labs. Paste its link on any lab page and add PULSE.txt.' },
          { icon: Upload, t: 'Push each lab', d: 'Put each lab in its own folder (shown on the lab) and push. Push often.' },
        ].map((s, i) => (
          <li key={s.t} className="flex gap-3 rounded-card border border-line bg-card p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-hover text-heading"><s.icon className="h-5 w-5" aria-hidden /></span>
            <span className="min-w-0"><span className="block font-semibold text-heading">{i + 1}. {s.t}</span><span className="block text-sm text-muted">{s.d}</span></span>
          </li>
        ))}
      </ol>

      <div role="group" aria-label="Milestone" className="flex gap-2 overflow-x-auto pb-1">
        {[{ key: 'all', name: 'All labs' }, ...groups.map((g) => g.s)].map((s) => (
          <button key={s.key} type="button" onClick={() => setMs(s.key)} aria-pressed={ms === s.key}
            className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-semibold ${ms === s.key ? 'bg-brand-ink text-white' : 'border border-line bg-card text-heading hover:bg-surface-hover'}`}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="space-y-5">
          {shown.map(({ s, items }) => (
            <div key={s.key}>
              <h2 className="mb-2 font-display text-lg font-bold text-heading">{s.name} <span className="text-sm font-semibold text-muted">· {items.length}</span></h2>
              <ul className="space-y-2">
                {items.map((l) => {
                  const st = statusOf(l);
                  const isOpen = open === l.id;
                  return (
                    <li key={l.id} className={`rounded-card border bg-card ${isOpen ? 'border-brand-ink shadow-edge-neutral' : 'border-line'}`}>
                      <button type="button" onClick={() => setOpen(isOpen ? null : l.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-3 text-left sm:p-4">
                        <Badge l={l} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold leading-snug text-heading">{l.title}</span>
                          <span className="mt-1 block text-sm text-muted">Due {fmt(l.due)} · {l.tasks.length} tasks</span>
                          {st && <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.tone}`}>{st.label}{l.pulse?.reviewed ? ` · ${l.pulse.score}%` : ''}</span>}
                        </span>
                      </button>
                      {isOpen && <div className="border-t border-line p-4 lg:hidden"><Brief l={l} base={base} /></div>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-pin,0px)+4.5rem)] max-h-[calc(100vh-7rem)] overflow-y-auto rounded-card border border-line bg-card p-6 shadow-edge-neutral">
            {current ? (
              <>
                <div className="mb-5 flex items-start gap-3">
                  <Badge l={current} />
                  <h3 className="font-display text-2xl font-bold leading-tight text-heading">{current.title}</h3>
                </div>
                <Brief l={current} base={base} />
              </>
            ) : <p className="text-base text-muted">Pick a lab on the left to read its brief.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
};
