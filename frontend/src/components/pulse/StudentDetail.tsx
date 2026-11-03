import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink, BadgeCheck, CheckCircle2, XCircle, FileSearch, GitCommitHorizontal, ShieldAlert, Code2, GitCompare,
  LayoutDashboard, Send, StickyNote, RotateCcw, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui';
import { PulseShell, StatusPill, VerdictTag, FlagChip, CodeViewer, Ring, VERDICT_META } from '@/components/pulse/PulseUi';
import { ChartCard, Columns, MiniTable } from '@/components/pulse/charts';
import {
  commitsPerDay, relTime, fmtDateTime, reqPoints, testsPassed, type Evidence, type PulseBundle, type Verdict,
} from '@/lib/pulse/demo';

/**
 * Project Pulse — one student, every detail (PROJECT_PULSE_PLAN.md §3.3).
 * Overview (checklist + tests), the code itself, what changed since the task
 * was assigned, the commit timeline, and integrity signals. The teacher panel
 * (marks override, private note, feedback) stays beside every tab.
 */

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'changes', label: 'Changes', icon: GitCompare },
  { id: 'timeline', label: 'Timeline', icon: GitCommitHorizontal },
  { id: 'integrity', label: 'Integrity', icon: ShieldAlert },
] as const;
type TabId = (typeof TABS)[number]['id'];

export interface DetailActions {
  feedback: (body: string) => Promise<void>;
  note: (body: string) => Promise<void>;
  override: (score: number | null, reason: string) => Promise<void>;
  verdict: (reqId: string, verdict: Verdict | null) => Promise<void>;
  sync: () => Promise<void>;
  verify: (on: boolean) => Promise<void>;
}

export interface StudentDetailProps {
  data: PulseBundle & { prev?: string; next?: string };
  preview?: boolean;
  classHref: string;
  studentHref: (id: string, tab?: string) => string;
  initialTab?: string;
  actions?: DetailActions;
  /** Link to the fast Review mode for this task, starting at this student. */
  reviewHref?: string;
}

export const StudentDetail: React.FC<StudentDetailProps> = ({ data, preview, classHref, studentHref, initialTab, actions, reviewHref }) => {
  const { cls, task, now } = data;
  const s = data.students[0] ?? null;
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(null);
    try { await fn(); } catch (e: any) { setError(e?.message || 'That did not work.'); } finally { setBusy(null); }
  };
  const [tab, setTab] = useState<TabId>('overview');
  const [hl, setHl] = useState<Evidence | null>(null);
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [override, setOverride] = useState<string>('');

  useEffect(() => {
    if (initialTab && TABS.some((x) => x.id === initialTab)) setTab(initialTab as TabId);
  }, [initialTab]);
  useEffect(() => { setSent(s?.feedback ?? null); setHl(null); setOverride(''); }, [s]);

  const days = useMemo(() => (s ? commitsPerDay([s], task, now) : []), [s, task, now]);

  if (!s) {
    return (
      <PulseShell title="Student not found" role="teacher" preview={preview} crumbs={[{ href: classHref, label: cls.name }]}>
        <Link href={classHref} className="text-link hover:underline">Back to the class</Link>
      </PulseShell>
    );
  }

  const prev = { id: data.prev ?? s.id, name: 'previous student' };
  const next = { id: data.next ?? s.id, name: 'next student' };
  const passed = testsPassed(s);
  const showEvidence = (e: Evidence | null) => { if (!e) return; setHl(e); setTab('code'); };
  const todayKey = days.find((d) => d.today)?.key;

  return (
    <PulseShell
      title={s.name}
      role="teacher"
      preview={preview}
      crumbs={[{ href: classHref, label: `${cls.name} · ${task.title}` }]}
      actions={
        <div className="flex items-center gap-1">
          {reviewHref ? <Link href={reviewHref} className="inline-flex h-9 items-center gap-1 rounded-cell bg-signal px-3 text-xs font-semibold text-on-primary shadow-edge-primary">Review mode</Link> : null}
          {actions && s.repo ? (
            <button type="button" disabled={!!busy} onClick={() => act('sync', actions.sync)} className="inline-flex h-9 items-center gap-1 rounded-cell border border-line bg-card px-2.5 text-xs font-semibold text-heading hover:bg-surface-hover disabled:opacity-60">
              <RotateCcw className={cn('h-4 w-4', busy === 'sync' && 'animate-spin')} /> {busy === 'sync' ? 'Syncing…' : 'Re-sync'}
            </button>
          ) : null}
          <Link href={studentHref(prev.id)} className="inline-flex h-9 items-center gap-1 rounded-cell border border-line bg-card px-2.5 text-xs font-semibold text-muted hover:text-heading" aria-label={`Previous: ${prev.name}`}>
            <ArrowLeft className="h-4 w-4" /> Prev
          </Link>
          <Link href={studentHref(next.id)} className="inline-flex h-9 items-center gap-1 rounded-cell border border-line bg-card px-2.5 text-xs font-semibold text-muted hover:text-heading" aria-label={`Next: ${next.name}`}>
            Next <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      }
    >
      {error ? <p role="alert" className="mb-4 rounded-cell bg-danger-soft px-4 py-2.5 text-sm text-error">{error}</p> : null}
      {s.sync?.error ? <p className="mb-4 rounded-cell bg-warning-soft px-4 py-2.5 text-sm text-signal-ink">Last sync failed: {s.sync.error}</p> : null}
      {actions && s.repo ? (
        <div className={cn('mb-4 flex flex-col gap-2 rounded-cell px-4 py-3 text-sm sm:flex-row sm:items-center', s.verified ? 'bg-success-soft text-success' : 'bg-rose-soft text-rose')}>
          <p className="flex-1">
            {s.verified
              ? <>Repo ownership verified{s.verified_owner ? <> · GitHub account <span className="font-mono font-semibold">{s.verified_owner}</span></> : null}.</>
              : <>Not verified. The student must add <span className="font-mono">PULSE.txt</span> with their code to this repo. Until then the score is 0. If you have checked in person that the repo is theirs, verify it yourself.</>}
          </p>
          <button type="button" disabled={!!busy} onClick={() => act('verify', () => actions.verify(!s.verified))}
            className="h-9 shrink-0 rounded-cell border border-current px-3 text-xs font-semibold">{s.verified ? 'Remove verification' : 'Verify myself'}</button>
        </div>
      ) : null}
      {/* Identity strip */}
      <div className="mb-5 flex flex-col gap-4 rounded-card border border-line bg-card p-4 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-3">
          <Avatar name={s.name} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={s.status} />
              {s.flags.map((f, i) => <FlagChip key={i} flag={f} compact />)}
            </div>
            <p className="mt-1 font-mono text-xs text-muted">{s.roll} · {s.email}</p>
            {s.repo ? (
              <a href={`https://github.com/${s.repo}`} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 font-mono text-sm text-link hover:underline">
                github.com/{s.repo} <ExternalLink className="h-3.5 w-3.5" />
                {s.verified ? <span className="ml-1 inline-flex items-center gap-0.5 font-sans text-xs text-success"><BadgeCheck className="h-3.5 w-3.5" />verified owner</span>
                  : <span className="ml-1 font-sans text-xs font-semibold text-rose">not verified: work does not count</span>}
              </a>
            ) : <p className="mt-1 text-sm text-error">No repo linked yet</p>}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Ring value={reqPoints(s)} max={5} size={96} label="Requirements" />
          <Ring value={passed} max={task.tests.length} size={96} label="Tests" />
          <div className="text-center">
            <p className="font-display text-display tabular-nums text-heading">{s.status === 'noRepo' ? '—' : s.score}</p>
            <p className="text-xs text-muted">score /100</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Student detail" className="mb-4 flex gap-1 overflow-x-auto rounded-cell border border-line bg-card p-1">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
                className={cn('inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-well px-3 py-2 text-sm font-semibold transition-colors',
                  tab === t.id ? 'bg-hero text-hero-on' : 'text-muted hover:text-heading')}>
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' ? (
            <div className="space-y-4">
              <section className="rounded-card border border-line bg-card">
                <h2 className="border-b border-line px-5 py-3 font-display text-h3 text-heading">Requirement checklist</h2>
                <ol>
                  {task.requirements.map((r) => {
                    const res = s.reqs[r.id];
                    return (
                      <li key={r.id} className="flex flex-col gap-2 border-b border-line px-5 py-4 last:border-0 sm:flex-row sm:items-start">
                        <span className="w-8 shrink-0 font-mono text-xs font-bold text-muted">{r.id}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-heading">{r.title}</p>
                            <VerdictTag verdict={res.verdict} />
                            {actions ? (
                              <span className="ml-auto inline-flex gap-1" role="group" aria-label={`Mark ${r.id}`}>
                                {(['met', 'partial', 'missing'] as Verdict[]).map((v) => (
                                  <button key={v} type="button" disabled={!!busy} aria-pressed={res.verdict === v}
                                    onClick={() => act(`v-${r.id}`, () => actions.verdict(r.id, res.verdict === v ? null : v))}
                                    className={cn('inline-flex h-7 items-center gap-1 rounded-well border px-2 text-xs font-semibold',
                                      res.verdict === v ? cn(VERDICT_META[v].soft, VERDICT_META[v].ink, 'border-transparent') : 'border-line text-muted hover:text-heading')}>
                                    {VERDICT_META[v].symbol} {VERDICT_META[v].label}
                                  </button>
                                ))}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-muted">{r.detail}</p>
                          <p className="mt-2 text-sm text-body">{res.reason}</p>
                        </div>
                        {res.evidence ? (
                          <button type="button" onClick={() => showEvidence(res.evidence)}
                            className="inline-flex shrink-0 items-center gap-1 self-start rounded-well border border-line px-2.5 py-1.5 font-mono text-xs text-link hover:bg-surface-hover">
                            <FileSearch className="h-3.5 w-3.5" /> {res.evidence.file}:{res.evidence.from}–{res.evidence.to}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
                <p className="border-t border-line bg-app-warm px-5 py-2.5 text-xs text-muted">
                  Marked by the teacher{actions ? ' (click a button; click it again to clear)' : ''}. Folder <span className="font-mono">{task.folder ?? 'task'}/</span>, latest commit <span className="font-mono">{s.commits[0]?.sha ?? '—'}</span>.
                </p>
              </section>

              {task.auto_tests !== false && task.tests.length ? (<section className="rounded-card border border-line bg-card">
                <h2 className="flex items-center justify-between border-b border-line px-5 py-3 font-display text-h3 text-heading">
                  Test cases <span className="text-sm font-semibold tabular-nums text-muted">{passed}/{task.tests.length} passed</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-app-warm text-left text-xs text-muted">
                      <tr><th className="px-4 py-2">Test</th><th className="px-4 py-2">Input</th><th className="px-4 py-2">Expected</th><th className="px-4 py-2">Got</th><th className="px-4 py-2 text-right">Result</th></tr>
                    </thead>
                    <tbody>
                      {task.tests.map((t) => {
                        const res = s.tests[t.id];
                        return (
                          <tr key={t.id} className="border-t border-line align-top">
                            <td className="px-4 py-2.5"><span className="font-mono text-xs text-muted">{t.id}</span> <span className="text-heading">{t.name}</span></td>
                            <td className="px-4 py-2.5 font-mono text-xs text-body">{t.input}</td>
                            <td className="whitespace-pre-line px-4 py-2.5 font-mono text-xs text-body">{t.expected}</td>
                            <td className={cn('px-4 py-2.5 font-mono text-xs', res.pass ? 'text-success' : 'text-error')}>{res.got}</td>
                            <td className="px-4 py-2.5 text-right">
                              {res.pass ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 className="h-4 w-4" />Pass</span>
                                : <span className="inline-flex items-center gap-1 text-xs font-semibold text-error"><XCircle className="h-4 w-4" />Fail</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-line bg-app-warm px-5 py-2.5 text-xs text-muted">Run by the autograder workflow on GitHub Actions · gcc 13 · 5 s limit per test.</p>
              </section>) : null}
            </div>
          ) : null}

          {tab === 'code' ? (
            <div className="space-y-3">
              {s.folder_hint ? <p className="rounded-cell bg-warning-soft px-4 py-2.5 text-sm text-signal-ink">{s.folder_hint}</p> : null}
              {Object.values(s.reqs).some((x) => x.evidence) ? <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">Jump to evidence:</span>
                {task.requirements.map((r) => {
                  const e = s.reqs[r.id].evidence;
                  return (
                    <button key={r.id} type="button" disabled={!e} onClick={() => setHl(e)}
                      className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold',
                        !e ? 'cursor-not-allowed border-line text-muted/60 line-through' : hl === e ? 'border-hero bg-hero text-hero-on' : 'border-line text-body hover:bg-surface-hover')}>
                      {r.id} {r.title}
                    </button>
                  );
                })}
              </div> : null}
              <CodeViewer files={s.files} starter={task.starter} highlight={hl} mode="code" />
              <p className="text-xs text-muted">Read-only copy of the latest commit. Every time a teacher opens a student’s code, it is written to the audit log.</p>
            </div>
          ) : null}

          {tab === 'changes' ? (
            <div className="space-y-3">
              <p className="text-sm text-body">Everything added or changed since the task was assigned on {fmtDateTime(task.assignedAt)}, compared with the starter repo.</p>
              <CodeViewer files={s.files} starter={task.starter} mode="diff" />
            </div>
          ) : null}

          {tab === 'timeline' ? (
            <div className="space-y-4">
              <ChartCard title="Commits per day" note="Work spread over days is a good sign; one big night is not."
                table={<MiniTable head={['Day', 'Commits']} rows={days.filter((d) => d.value != null).map((d) => [d.label, d.value ?? 0])} />}>
                <Columns data={days.map((d, i) => ({ key: d.key, label: d.label, value: d.value, mark: d.key === todayKey ? 'today' as const : i === days.length - 1 ? 'deadline' as const : undefined }))} unit="commits" labelEvery={3} height={160} />
              </ChartCard>
              <section className="rounded-card border border-line bg-card">
                <h2 className="border-b border-line px-5 py-3 font-display text-h3 text-heading">All commits ({s.commits.length})</h2>
                {s.commits.length ? (
                  <ol className="relative px-5 py-3">
                    {s.commits.map((c) => (
                      <li key={c.sha} className="relative flex gap-3 pb-3 pl-5 before:absolute before:left-[5px] before:top-3 before:h-full before:w-px before:bg-line last:before:hidden">
                        <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-card bg-series-1 ring-1 ring-line" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-heading">{c.message}</p>
                          <p className="text-xs text-muted"><span className="font-mono">{c.sha}</span> · {fmtDateTime(c.at)}</p>
                        </div>
                        <p className="shrink-0 font-mono text-xs tabular-nums"><span className="text-success">+{c.add}</span> <span className="text-error">−{c.del}</span></p>
                      </li>
                    ))}
                  </ol>
                ) : <p className="px-5 py-6 text-sm text-muted">No commits since the task was assigned.</p>}
              </section>
            </div>
          ) : null}

          {tab === 'integrity' ? (
            <div className="space-y-3">
              {s.flags.length ? s.flags.map((f, i) => (
                <div key={i} className="flex items-start gap-3 rounded-card border border-rose/30 bg-rose-soft p-4">
                  <FlagChip flag={f} compact />
                  <div className="flex-1 text-sm text-body">
                    <p className="font-semibold text-heading">{f.text}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {f.kind === 'similar' ? 'Token-level match after removing comments and spacing and renaming identifiers. The starter code is excluded.'
                        : f.kind === 'bulk' ? 'Most of the final code arrived in one push. Could be pasted, could be someone who commits rarely. Ask them to walk you through it.'
                        : f.kind === 'backdated' ? 'The commit’s own date and the time GitHub received the push disagree.'
                        : f.kind === 'inactive' ? 'No new commits recently while the task is still incomplete.'
                        : f.kind === 'late' ? 'Work pushed after the deadline. The dashboard still counts it; decide in the override panel.'
                        : f.kind === 'workflow' ? 'The autograder file is missing or was changed, so its pass/fail results cannot be trusted. Ask the student to restore pulse-autograde.yml.'
                        : 'The autograder could not compile the code, so every other test is skipped.'}
                    </p>
                    {f.withId ? <Link href={studentHref(f.withId, 'code')} className="mt-1 inline-block text-xs font-semibold text-link hover:underline">Open the other student’s code →</Link> : null}
                  </div>
                </div>
              )) : (
                <div className="flex items-center gap-3 rounded-card border border-line bg-success-soft p-4 text-sm text-success">
                  <CheckCircle2 className="h-5 w-5" /> No integrity signals for this student.
                </div>
              )}
              <p className="text-xs text-muted">Signals help the teacher decide what to look at. They are never applied as automatic penalties.</p>
            </div>
          ) : null}
        </div>

        {/* Teacher panel */}
        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
          <section className="rounded-card border border-line bg-card p-4">
            <h2 className="font-display text-h3 text-heading">At a glance</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ['Commits', s.commits.length],
                ['Last activity', relTime(s.lastActivity, now)],
                ['Last synced', s.sync ? relTime(s.sync.at, now) : '—'],
                ['Folder', `${task.folder ?? 'task'}/`],
                ['First commit', s.commits.length ? fmtDateTime(s.commits[s.commits.length - 1].at) : '—'],
                ['Builds', s.commits.length ? (s.compiles ? 'Yes' : 'No: gcc error') : '—'],
                ['Files', s.files.length],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold text-heading">{v}</dd></div>
              ))}
            </dl>
          </section>

          <section className="rounded-card border border-line bg-card p-4">
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-heading"><RotateCcw className="h-4 w-4" /> Override marks</h2>
            <label className="mt-3 block text-xs text-muted" htmlFor="ovr">Final score (blank = keep {s.score})</label>
            <input id="ovr" inputMode="numeric" value={override} onChange={(e) => setOverride(e.target.value.replace(/\D/g, '').slice(0, 3))}
              className="mt-1 h-9 w-full rounded-cell border border-line-strong/60 bg-card px-3 text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]" placeholder={String(s.score)} />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, kept in the log)"
              className="mt-2 h-9 w-full rounded-cell border border-line-strong/60 bg-card px-3 text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]" />
            {actions ? (
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={!override || !reason.trim() || !!busy} onClick={() => act('ovr', async () => { await actions.override(Number(override), reason.trim()); setOverride(''); setReason(''); })}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-cell bg-signal text-sm font-semibold text-on-primary shadow-edge-primary disabled:opacity-50">Save score</button>
                {s.override ? <button type="button" disabled={!!busy} onClick={() => act('ovr', () => actions.override(null, ''))} className="h-9 rounded-cell border border-line px-3 text-sm font-semibold text-heading hover:bg-surface-hover">Clear</button> : null}
              </div>
            ) : null}
            {s.override ? <p className="mt-2 text-xs text-muted">Overridden to <span className="font-semibold text-heading">{s.override.score}</span>: {s.override.reason}</p> : null}
          </section>

          <section className="rounded-card border border-line bg-card p-4">
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-heading"><StickyNote className="h-4 w-4" /> Private note</h2>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Only teachers of this class see this."
              className="mt-2 w-full rounded-cell border border-line-strong/60 bg-card p-2.5 text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]" />
            {actions ? (
              <button type="button" disabled={!note.trim() || !!busy} onClick={() => act('note', async () => { await actions.note(note.trim()); setNote(''); })}
                className="mt-1 h-8 rounded-cell border border-line px-3 text-xs font-semibold text-heading hover:bg-surface-hover disabled:opacity-50">Save note</button>
            ) : null}
            {(s.notes || []).slice().reverse().map((n, i) => <p key={i} className="mt-2 rounded-well bg-app-warm p-2 text-xs text-body">{n.body}<span className="block text-muted">{fmtDateTime(n.at)}</span></p>)}
          </section>

          <section className="rounded-card border border-line bg-card p-4">
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-heading"><Send className="h-4 w-4" /> Feedback to student</h2>
            {sent ? <p className="mt-2 rounded-well bg-secondary-soft p-2.5 text-sm text-secondary">{sent}</p> : null}
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="They see this on their Pulse page."
              className="mt-2 w-full rounded-cell border border-line-strong/60 bg-card p-2.5 text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]" />
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={!feedback.trim()} onClick={() => act('fb', async () => { if (actions) await actions.feedback(feedback.trim()); setSent(feedback.trim()); setFeedback(''); })}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-cell bg-signal text-sm font-semibold text-on-primary shadow-edge-primary disabled:opacity-50">Send</button>
              <button type="button" disabled={!!busy} onClick={() => act('fb', async () => { const msg = `Please fix and resubmit.${feedback.trim() ? ` ${feedback.trim()}` : ''}`; if (actions) await actions.feedback(msg); setSent(msg); setFeedback(''); })}
                className="inline-flex h-9 items-center justify-center rounded-cell border border-line px-3 text-sm font-semibold text-heading hover:bg-surface-hover">Ask to resubmit</button>
            </div>
          </section>
        </aside>
      </div>
    </PulseShell>
  );
};
