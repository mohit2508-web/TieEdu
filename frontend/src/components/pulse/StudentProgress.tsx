import React, { useState } from 'react';
import Link from 'next/link';
import {
  GitBranch, BadgeCheck, RefreshCw, CheckCircle2, XCircle, CalendarClock, MessageSquareText, Link2, Lightbulb, Lock, ExternalLink, FileCode2, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PulseShell, StatusPill, VerdictTag, Ring } from '@/components/pulse/PulseUi';
import { ChartCard, Columns, MiniTable } from '@/components/pulse/charts';
import { commitsPerDay, relTime, fmtDateTime, reqPoints, testsPassed, type PulseBundle } from '@/lib/pulse/demo';

/**
 * Project Pulse — the student's own view (PROJECT_PULSE_PLAN.md §3.4).
 * Only this student's data: link the repo, see each requirement's state and
 * why, test results, the teacher's feedback and their own commit timeline.
 * No class figures, no other names, no rank.
 */

export interface MyTaskItem { id: string; title: string; due: string; state: string; current: boolean; href: string }

export interface StudentProgressProps {
  data: PulseBundle;
  tasks: MyTaskItem[];
  preview?: boolean;
  workflowUrl?: string;
  onLink?: (url: string) => Promise<string | null>;
  onRecheck?: () => Promise<void>;
}

export const StudentProgress: React.FC<StudentProgressProps> = ({ data, tasks, preview, workflowUrl, onLink, onRecheck }) => {
  // One repo for the whole class (v2): its state comes with the task, from the class.
  const repo = data.repo ?? { repo: data.students[0]?.repo ?? null, verified: true, verify_code: null, synced_at: null, error: null, workflow_ok: true, workflow_needed: false };
  const { cls, task, now } = data;
  const me = data.students[0];
  const [previewLinked, setPreviewLinked] = useState(true);
  const linked = preview ? previewLinked : !!repo.repo;
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'link' | 'check' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const days = commitsPerDay([me], task, now);
  const todayKey = days.find((d) => d.today)?.key;
  const daysLeft = Math.ceil((new Date(task.deadlineAt).getTime() - now.getTime()) / 86400000);
  const missing = task.requirements.filter((r) => me.reqs[r.id].verdict !== 'met');
  const passed = testsPassed(me);
  const nReq = task.requirements.length;
  const hasTests = task.auto_tests !== false && task.tests.length > 0;

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^(?:https?:\/\/)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i.test(url.trim())) {
      setUrlError('Paste the full repo link, like https://github.com/your-name/c-task-3'); return;
    }
    setUrlError(null);
    if (preview || !onLink) { setPreviewLinked(true); return; }
    setBusy('link');
    try {
      const err = await onLink(url.trim());
      setEditing(false);
      setNotice(err ? `Linked, but the first check failed: ${err}` : 'Linked. Your repo was checked just now.');
    } catch (x: any) { setUrlError(x?.message || 'Could not link that repo.'); } finally { setBusy(null); }
  };
  const recheck = async () => {
    if (preview || !onRecheck) return;
    setBusy('check'); setNotice(null);
    try { await onRecheck(); setNotice('Checked just now.'); } catch (x: any) { setNotice(x?.message || 'Could not re-check.'); } finally { setBusy(null); }
  };

  return (
    <PulseShell title="My project progress" role="student" preview={preview} crumbs={[{ href: '/project-pulse/student', label: `${cls.name} · ${cls.subject}` }]}>
      <div className="mb-4 flex items-center gap-2 text-xs text-muted">
        <Lock className="h-3.5 w-3.5" /> Only you and your teacher ({cls.teacher}) can see this page.
        {preview ? (
          <button type="button" onClick={() => setPreviewLinked((v) => !v)} className="ml-auto rounded-full border border-dashed border-line-strong/60 px-2 py-0.5 hover:text-heading">
            Preview: {linked ? 'show “not linked yet”' : 'show linked'}
          </button>
        ) : null}
      </div>
      {notice ? <p role="status" className="mb-4 rounded-cell bg-secondary-soft px-4 py-2.5 text-sm text-secondary">{notice}</p> : null}
      {repo.error ? <p className="mb-4 rounded-cell bg-warning-soft px-4 py-2.5 text-sm text-signal-ink">Last check failed: {repo.error}</p> : null}

      {!preview && me.status === 'unverified' ? (
        <section className="mb-4 rounded-card border border-rose/30 bg-rose-soft p-4 text-sm text-rose">
          <p className="font-display text-h3">Your work does not count yet</p>
          <p className="mt-1">Prove this repo is yours: add a file <span className="font-mono">PULSE.txt</span> containing <span className="font-mono font-bold">{repo.verify_code}</span> to the repo and push. Then press Re-check. If the repo belongs to someone else, it is unlinked as soon as its owner verifies it, and your teacher is told.</p>
        </section>
      ) : null}
      {/* Repo */}
      {linked && !editing ? (
        <section className="mb-5 rounded-card border border-line bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile bg-secondary-soft text-secondary"><GitBranch className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Your repo for {cls.name} · every task is a folder in it</p>
              <a href={`https://github.com/${repo.repo}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-mono text-sm text-link hover:underline">
                github.com/{repo.repo} <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className={cn('mt-0.5 flex items-center gap-1 text-xs', repo.verified || preview ? 'text-success' : 'text-muted')}>
                <BadgeCheck className="h-3.5 w-3.5" /> {repo.verified || preview ? 'Ownership verified' : 'Not verified yet'} · checked {preview ? relTime(me.lastActivity, now) : relTime(repo.synced_at, now)}
              </p>
            </div>
            <div className="flex gap-2">
              {!preview ? <button type="button" onClick={() => setEditing(true)} className="h-10 rounded-cell border border-line px-3 text-sm font-semibold text-muted hover:text-heading">Change</button> : null}
              <button type="button" disabled={busy === 'check'} onClick={recheck}
                className="inline-flex h-10 items-center gap-1.5 rounded-cell border border-line bg-card px-4 text-sm font-semibold text-heading shadow-edge-neutral hover:bg-surface-hover disabled:opacity-60">
                <RefreshCw className={cn('h-4 w-4', busy === 'check' && 'animate-spin')} /> {busy === 'check' ? 'Checking…' : 'Re-check my repo'}
              </button>
            </div>
          </div>
          {!preview && (!repo.verified || (repo.workflow_needed && repo.workflow_ok !== true)) ? (
            <ol className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-body">
              <li className="text-xs font-semibold uppercase tracking-widest text-muted">One-time setup for this class</li>
              {!repo.verified && repo.verify_code ? (
                <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <span>Prove the repo is yours: add a file <code className="rounded bg-app-warm px-1 font-mono">PULSE.txt</code> containing <code className="rounded bg-app-warm px-1 font-mono font-semibold">{repo.verify_code}</code> at the top of the repo, then push.</span></li>
              ) : null}
              {repo.workflow_needed && repo.workflow_ok !== true ? (
                <li className="flex gap-2"><FileCode2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <span>Turn on the autograder: save <a href={workflowUrl} className="font-semibold text-link underline">pulse-autograde.yml</a> as <code className="rounded bg-app-warm px-1 font-mono">.github/workflows/pulse-autograde.yml</code> in your repo, unchanged, and push. Your teacher’s tests then run on every push, for every task folder.</span></li>
              ) : null}
            </ol>
          ) : null}
        </section>
      ) : (
        <section className="mb-5 rounded-band border border-line bg-card p-6">
          <h2 className="font-display text-h2 text-heading">{repo.repo ? 'Change your class repo' : 'Link your repo once for this class'}</h2>
          <p className="mt-1 text-sm text-muted">Make one public GitHub repo (for example <span className="font-mono">c-lab-2026</span>) and paste its link. Every task of {cls.name} is a folder in it — {task.folder ? <span className="font-mono">{task.folder}/</span> : null} for this one — so you do this only once.</p>
          <form onSubmit={link} className="mt-5 max-w-xl">
            <label htmlFor="repo-url" className="flex items-center gap-1.5 font-semibold text-heading"><Link2 className="h-4 w-4" /> Your GitHub repo link</label>
            <p className="mt-1 text-xs text-muted">Public repo, or private with the TieEdu bot added as a collaborator (ask your teacher).</p>
            <input id="repo-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/your-name/c-lab-2026"
              aria-invalid={!!urlError} aria-describedby={urlError ? 'repo-url-err' : undefined}
              className="mt-3 h-10 w-full rounded-cell border border-line-strong/60 bg-card px-3 font-mono text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]" />
            {urlError ? <p id="repo-url-err" className="mt-1 text-xs text-error">{urlError}</p> : null}
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={busy === 'link'} className="inline-flex h-10 items-center rounded-cell bg-signal px-4 text-sm font-semibold text-on-primary shadow-edge-primary disabled:opacity-60">{busy === 'link' ? 'Linking…' : 'Link repo'}</button>
              {editing ? <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-cell border border-line px-4 text-sm font-semibold text-muted">Cancel</button> : null}
            </div>
          </form>
        </section>
      )}

      {linked && !editing ? (
        <section className="mb-4 flex flex-col gap-2 rounded-card border border-secondary/30 bg-secondary-soft p-4 text-sm text-secondary sm:flex-row sm:items-center">
          <span className="font-semibold">This task:</span>
          <span className="flex-1">put your code in the folder <code className="rounded bg-card px-1.5 py-0.5 font-mono font-bold">{task.folder ?? 'task'}/</code> of your repo and push. Push as often as you like before {fmtDateTime(task.deadlineAt)}.</span>
          {me.folder_hint ? <span className="rounded-well bg-warning-soft px-2.5 py-1 text-xs font-semibold text-signal-ink">{me.folder_hint}</span> : null}
        </section>
      ) : null}

      {linked && !editing ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            {/* Headline */}
            <section className="flex flex-col gap-5 rounded-band bg-hero p-6 text-hero-on sm:flex-row sm:items-center">
              <div className="rounded-full bg-card p-1"><Ring value={reqPoints(me)} max={nReq} size={112} label="Requirements" sub="requirements" /></div>
              <div className="flex-1">
                <StatusPill status={me.status} />
                <h2 className="mt-2 font-display text-h1 text-hero-on">{task.title.replace(/^Task \d+ — /, '')}</h2>
                <p className="mt-1 text-sm text-hero-muted">
                  {me.status === 'notStarted' ? `Nothing in ${task.folder ?? 'the task folder'}/ yet.`
                    : me.status === 'submitted' ? 'Submitted. Your teacher will review it.'
                    : missing.length ? `${missing.length} requirement${missing.length > 1 ? 's' : ''} not done yet${hasTests ? ` · ${passed}/${task.tests.length} tests passing` : ''}` : 'Every requirement is done.'}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-hero-edge px-3 py-1 text-xs font-semibold text-hero-on">
                  <CalendarClock className="h-3.5 w-3.5" /> {daysLeft} days left · due {fmtDateTime(task.deadlineAt)}
                </p>
              </div>
              <div className="text-center">
                <p className="font-display text-display tabular-nums text-hero-on">{me.score}</p>
                <p className="text-xs text-hero-muted">score so far /100</p>
              </div>
            </section>

            {/* Checklist */}
            <section className="rounded-card border border-line bg-card">
              <h2 className="border-b border-line px-5 py-3 font-display text-h3 text-heading">What’s done, and what’s left</h2>
              <ol>
                {task.requirements.map((r) => {
                  const res = me.reqs[r.id];
                  return (
                    <li key={r.id} className="border-b border-line px-5 py-4 last:border-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-muted">{r.id}</span>
                        <p className="font-semibold text-heading">{r.title}</p>
                        <VerdictTag verdict={res.verdict} />
                        {res.evidence ? <span className="ml-auto font-mono text-xs text-muted">{res.evidence.file}:{res.evidence.from}</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">{r.detail}</p>
                      <p className={cn('mt-2 rounded-well px-3 py-2 text-sm', res.verdict === 'met' ? 'bg-success-soft text-success' : res.verdict === 'unreviewed' ? 'bg-surface-hover text-muted' : 'bg-warning-soft text-signal-ink')}>
                        {res.verdict !== 'met' ? <Lightbulb className="mr-1 inline h-4 w-4 align-[-3px]" /> : null}
                        {res.reason}
                      </p>
                    </li>
                  );
                })}
              </ol>
              <p className="border-t border-line bg-app-warm px-5 py-2.5 text-xs text-muted">Your teacher marks each requirement after reading your code. Commits and files are checked automatically after every push.</p>
            </section>

            {/* Tests (only when the teacher turned them on) */}
            {hasTests ? (
            <section className="rounded-card border border-line bg-card">
              <h2 className="flex items-center justify-between border-b border-line px-5 py-3 font-display text-h3 text-heading">
                Test results <span className="text-sm font-semibold tabular-nums text-muted">{passed}/{task.tests.length}</span>
              </h2>
              <ul>
                {task.tests.map((t) => {
                  const res = me.tests[t.id];
                  return (
                    <li key={t.id} className="flex items-start gap-3 border-b border-line px-5 py-3 last:border-0">
                      {res.pass ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-heading"><span className="font-mono text-xs text-muted">{t.id}</span> {t.name}</p>
                        {!res.pass ? (
                          <p className="mt-1 font-mono text-xs text-muted">expected: <span className="text-body">{t.expected.split('\n')[0]}</span> · got: <span className="text-error">{res.got}</span></p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
            ) : null}

            {/* Activity */}
            <ChartCard title="My commits per day" note={`${me.commits.length} commits since the task was assigned`}
              table={<MiniTable head={['Day', 'Commits']} rows={days.filter((d) => d.value != null).map((d) => [d.label, d.value ?? 0])} />}>
              <Columns data={days.map((d, i) => ({ key: d.key, label: d.label, value: d.value, mark: d.key === todayKey ? 'today' as const : i === days.length - 1 ? 'deadline' as const : undefined }))} unit="commits" labelEvery={3} height={150} />
            </ChartCard>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
            <section className="rounded-card border border-line bg-card p-4">
              <h2 className="flex items-center gap-1.5 font-display text-h3 text-heading"><MessageSquareText className="h-4 w-4" /> Teacher’s feedback</h2>
              <p className="mt-2 rounded-well bg-secondary-soft p-3 text-sm text-secondary">
                {me.feedback ?? (preview ? 'Good start. Read marks with fgets + strtol so letters can’t break the loop, then do R4: records must still be there after a restart.' : 'No feedback yet. Your teacher’s notes will show here.')}
              </p>
              <p className="mt-1.5 text-xs text-muted">{cls.teacher}{me.feedback_list?.length ? ` · ${relTime(me.feedback_list[me.feedback_list.length - 1].at, now)}` : preview ? ' · 2 days ago' : ''}</p>
            </section>

            <section className="rounded-card border border-line bg-card p-4">
              <h2 className="font-display text-h3 text-heading">My tasks</h2>
              <ul className="mt-2 space-y-2">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={t.href} className={cn('block rounded-cell border p-3', t.current ? 'border-hero bg-secondary-soft/50' : 'border-line hover:bg-surface-hover')}>
                      <p className="text-sm font-semibold text-heading">{t.title}</p>
                      <p className="text-xs text-muted">Due {fmtDateTime(t.due)} · {t.state}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-card border border-line bg-card p-4">
              <h2 className="font-display text-h3 text-heading">Recent commits</h2>
              <ul className="mt-2 space-y-2">
                {me.commits.slice(0, 6).map((c) => (
                  <li key={c.sha} className="text-sm">
                    <p className="truncate text-heading">{c.message}</p>
                    <p className="text-xs text-muted"><span className="font-mono">{c.sha}</span> · {relTime(c.at, now)} · <span className="text-success">+{c.add}</span> <span className="text-error">−{c.del}</span></p>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      ) : null}
    </PulseShell>
  );
};
