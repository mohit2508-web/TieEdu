import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, GitBranch, CheckCircle2, ListChecks, FlaskConical, Flag as FlagIcon, RefreshCw, Download, Search,
  ArrowUpDown, ChevronRight, CalendarClock, AlertTriangle, Copy,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui';
import { PulseShell, StatusPill, FlagChip, Kpi, VERDICT_META } from '@/components/pulse/PulseUi';
import { ChartCard, Donut, Columns, HBars, MiniTable } from '@/components/pulse/charts';
import {
  STATUS_META, commitsPerDay, relTime, fmtDateTime, reqPoints, testsPassed,
  type PulseStatus, type PulseStudent, type PulseBundle, type PulseTask,
} from '@/lib/pulse/demo';

/**
 * Project Pulse — the teacher's class dashboard (PROJECT_PULSE_PLAN.md §3.2).
 * One screen for the whole class: where everyone is, what is hard, who needs a
 * nudge, and a way into any one student's code. Fed by the API, or by the
 * sample bundle on /project-pulse/demo.
 */

export interface TaskDashboardProps {
  data: PulseBundle;
  preview?: boolean;
  studentHref: (id: string, tab?: string) => string;
  classHref?: string;
  onSync?: () => Promise<void>;
  onExport?: () => void;
  extraActions?: React.ReactNode;
}

type SortKey = 'name' | 'status' | 'reqs' | 'tests' | 'score' | 'commits' | 'last';
const STATUS_ORDER: PulseStatus[] = ['done', 'progress', 'unverified', 'notStarted', 'noRepo'];

const csvFor = (task: PulseTask, list: PulseStudent[]) => {
  const head = ['Roll', 'Name', 'Repo', 'Status', ...task.requirements.map((r) => r.id), 'Tests passed', 'Score', 'Commits', 'Last activity', 'Flags'];
  const rows = list.map((s) => [
    s.roll, s.name, s.repo ?? '', STATUS_META[s.status].label, ...task.requirements.map((r) => s.reqs[r.id].verdict),
    `${testsPassed(s)}/${task.tests.length}`, s.score, s.commits.length, s.lastActivity ?? '', s.flags.map((f) => f.text).join('; '),
  ]);
  return [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
};

export const TaskDashboard: React.FC<TaskDashboardProps> = ({ data, preview, studentHref, classHref, onSync, onExport, extraActions }) => {
  const { cls, task, students, now } = data;
  const n = Math.max(1, students.length);
  const [statusFilter, setStatusFilter] = useState<PulseStatus | 'all' | 'flagged'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'score', dir: -1 });
  const [syncing, setSyncing] = useState(false);

  const counts = useMemo(() => {
    const c = { done: 0, progress: 0, unverified: 0, notStarted: 0, noRepo: 0 } as Record<PulseStatus, number>;
    students.forEach((s) => { c[s.status]++; });
    return c;
  }, [students]);

  const withRepo = students.filter((s) => s.repo);
  const working = students.filter((s) => s.commits.length);
  const avgReqs = working.length ? working.reduce((n, s) => n + reqPoints(s), 0) / working.length : 0;
  const allTestsPass = students.filter((s) => testsPassed(s) === task.tests.length).length;
  const flagged = students.filter((s) => s.flags.length);
  const daysLeft = Math.ceil((new Date(task.deadlineAt).getTime() - now.getTime()) / 86400000);

  const perDay = commitsPerDay(students, task, now);
  const todayKey = perDay.find((d) => d.today)?.key;
  const columns = perDay.map((d, i) => ({ key: d.key, label: d.label, value: d.value, mark: d.key === todayKey ? 'today' as const : i === perDay.length - 1 ? 'deadline' as const : undefined }));

  const reqBars = task.requirements.map((r) => {
    const met = students.filter((s) => s.reqs[r.id].verdict === 'met').length;
    const part = students.filter((s) => s.reqs[r.id].verdict === 'partial').length;
    return { key: r.id, label: r.title, value: Math.round((met / n) * 100), partial: Math.round((part / n) * 100), met, part };
  });
  const hardest = [...reqBars].sort((a, b) => a.value - b.value)[0];

  const bands = Array.from({ length: 10 }, (_, b) => ({
    key: `b${b}`, label: `${b * 10}–${b === 9 ? 100 : b * 10 + 9}`, value: students.filter((s) => s.repo && s.commits.length && Math.min(9, Math.floor(s.score / 10)) === b).length,
  }));

  const attention = [
    ...students.filter((s) => s.flags.some((f) => f.kind === 'claimed')).map((s) => ({ s, why: 'Linked another student’s repo' })),
    ...students.filter((s) => s.status === 'unverified').map((s) => ({ s, why: 'Repo not verified yet: work does not count' })),
    ...students.filter((s) => s.status === 'noRepo').map((s) => ({ s, why: 'No repo linked' })),
    ...students.filter((s) => s.status === 'notStarted').map((s) => ({ s, why: 'Repo linked, no commits since the task was assigned' })),
    ...students.filter((s) => s.flags.some((f) => f.kind === 'failing')).map((s) => ({ s, why: 'Build fails, so every test fails' })),
    ...students.filter((s) => s.flags.some((f) => f.kind === 'inactive')).map((s) => ({ s, why: s.flags.find((f) => f.kind === 'inactive')!.text })),
  ];

  const similarPairs = useMemo(() => {
    const seen = new Set<string>();
    const out: { a: PulseStudent; b: PulseStudent; score: number }[] = [];
    for (const s of students) for (const f of s.flags) {
      if (f.kind !== 'similar' || !f.withId) continue;
      const k = [s.id, f.withId].sort().join('-');
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ a: s, b: students.find((x) => x.id === f.withId)!, score: f.score ?? 0 });
    }
    return out;
  }, [students]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = students.filter((s) =>
      (statusFilter === 'all' || (statusFilter === 'flagged' ? s.flags.length > 0 : s.status === statusFilter)) &&
      (!needle || s.name.toLowerCase().includes(needle) || s.roll.toLowerCase().includes(needle) || (s.github ?? '').includes(needle)));
    const val = (s: PulseStudent): number | string => ({
      name: s.name, status: STATUS_ORDER.indexOf(s.status), reqs: reqPoints(s), tests: testsPassed(s), score: s.score,
      commits: s.commits.length, last: s.lastActivity ?? '',
    })[sort.key];
    return [...list].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [students, q, statusFilter, sort]);

  const exportCsv = () => {
    const blob = new Blob([csvFor(task, rows)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pulse-${cls.id}-${task.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Th: React.FC<{ k: SortKey; children: React.ReactNode; right?: boolean }> = ({ k, children, right }) => (
    <th className={cn('px-3 py-2.5 font-semibold', right && 'text-right')} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort((p) => ({ key: k, dir: p.key === k ? (p.dir === 1 ? -1 : 1) : k === 'name' ? 1 : -1 }))}
        className={cn('inline-flex items-center gap-1 hover:text-heading', sort.key === k && 'text-heading')}>
        {children} <ArrowUpDown className="h-3 w-3" aria-hidden />
      </button>
    </th>
  );

  return (
    <PulseShell
      title={task.title}
      role="teacher"
      preview={preview}
      crumbs={[{ href: classHref ?? '/project-pulse/teacher', label: `${cls.name} · ${cls.subject}` }]}
      actions={
        <>
          {extraActions}
          <span className="text-xs text-muted">Synced {relTime(data.lastSync ?? null, now)}</span>
          <button type="button" disabled={syncing} onClick={async () => { if (!onSync) return; setSyncing(true); try { await onSync(); } finally { setSyncing(false); } }} className="inline-flex h-9 items-center gap-1.5 rounded-cell border border-line bg-card px-3 text-sm font-semibold text-heading shadow-edge-neutral hover:bg-surface-hover">
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} /> {syncing ? 'Syncing…' : 'Sync now'}
          </button>
          <button type="button" onClick={onExport ?? exportCsv} className="inline-flex h-9 items-center gap-1.5 rounded-cell bg-signal px-3 text-sm font-semibold text-on-primary shadow-edge-primary">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </>
      }
    >
      {/* Task strip */}
      <div className="mb-5 flex flex-col gap-3 rounded-card border border-line bg-card p-4 lg:flex-row lg:items-center">
        <div className="flex-1">
          <p className="text-sm text-body">{task.summary}</p>
          <p className="mt-1 text-xs text-muted">Language: C · {task.requirements.length} requirements · {task.tests.length} test cases · Teacher: {cls.teacher}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-cell bg-signal-soft px-4 py-2.5 text-signal-ink">
          <CalendarClock className="h-5 w-5" />
          <div>
            <p className="font-display text-h3 tabular-nums">{daysLeft} days left</p>
            <p className="text-xs">Due {fmtDateTime(task.deadlineAt)}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi tone="ink" icon={CheckCircle2} label="Completed" value={<>{counts.done}<span className="text-base text-hero-muted">/{students.length}</span></>} note={`${Math.round((counts.done / n) * 100)}% of the class`} />
        <Kpi icon={Users} label="Students" value={students.length} note={`${counts.notStarted + counts.noRepo} not started yet`} />
        <Kpi icon={GitBranch} label="Repos linked" value={withRepo.length} note={`${students.length - withRepo.length} missing`} />
        <Kpi icon={ListChecks} label="Avg requirements" value={<>{avgReqs.toFixed(1)}<span className="text-base text-muted">/5</span></>} note="of students who started" />
        <Kpi icon={FlaskConical} label="All tests pass" value={allTestsPass} note={`${task.tests.length} tests per student`} />
        <Kpi icon={FlagIcon} label="Integrity flags" value={flagged.length} note={`${similarPairs.length} copy pairs`} />
      </div>

      {/* Charts row 1 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ChartCard
          title="Where the class is"
          note="Click a slice to filter the table below"
          table={<MiniTable head={['Status', 'Students', '%']} rows={STATUS_ORDER.map((k) => [STATUS_META[k].label, counts[k], `${Math.round((counts[k] / n) * 100)}%`])} />}
        >
          <Donut
            centerLabel="students"
            segments={STATUS_ORDER.filter((k) => k !== 'unverified' || counts[k] > 0).map((k) => ({ key: k, label: STATUS_META[k].label, value: counts[k], color: STATUS_META[k].color }))}
            picked={STATUS_ORDER.includes(statusFilter as PulseStatus) ? statusFilter : null}
            onPick={(k) => setStatusFilter((p) => (p === k ? 'all' : (k as PulseStatus)))}
          />
        </ChartCard>
        <ChartCard
          title="Commits per day, whole class"
          note={`From the day it was assigned to the deadline. ${working.reduce((n, s) => n + s.commits.length, 0)} commits so far.`}
          table={<MiniTable head={['Day', 'Commits']} rows={perDay.filter((d) => d.value != null).map((d) => [d.label, d.value ?? 0])} />}
        >
          <Columns data={columns} unit="commits" labelEvery={3} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Requirement completion"
          note="% of the class that fully met each one (light = partly)"
          table={<MiniTable head={['Requirement', 'Met', 'Partly', 'Met %']} rows={reqBars.map((r) => [`${r.key} ${r.label}`, r.met, r.part, `${r.value}%`])} />}
        >
          <HBars items={reqBars} />
          <p className="mt-4 rounded-well bg-info-soft px-3 py-2 text-xs text-info">
            <span className="font-semibold">Hardest: {hardest.key} {hardest.label}.</span> Only {hardest.value}% have it fully. Worth re-teaching in class.
          </p>
        </ChartCard>
        <ChartCard
          title="Score distribution"
          note="Students who started · 50% tests, 40% requirements, 10% activity"
          table={<MiniTable head={['Score', 'Students']} rows={bands.map((b) => [b.label, b.value ?? 0])} />}
        >
          <Columns data={bands} unit="students" height={210} />
        </ChartCard>
        <ChartCard title="Needs attention" note={`${attention.length} students to nudge`}>
          <ul className="-mx-2 max-h-[260px] space-y-0.5 overflow-y-auto">
            {attention.map(({ s, why }, i) => (
              <li key={`${s.id}-${i}`}>
                <Link href={studentHref(s.id)} className="flex items-center gap-2.5 rounded-well px-2 py-1.5 hover:bg-surface-hover">
                  <Avatar name={s.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-heading">{s.name}</span>
                    <span className="block truncate text-xs text-muted">{why}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      {/* Matrix */}
      <ChartCard className="mt-4" title="Every student × every requirement" note="✓ done · ~ partly · ✗ missing · tests passed on the right. Click a name to open their code.">
        <div className="overflow-x-auto">
          <div className="grid min-w-[420px] gap-x-10 gap-y-0.5 md:grid-cols-2 xl:w-fit">
            {students.map((s) => (
              <Link key={s.id} href={studentHref(s.id)} className="flex items-center gap-2 rounded-well px-1.5 py-1 hover:bg-surface-hover">
                <span className="w-36 truncate text-sm text-body">{s.name}</span>
                <span className="flex gap-[2px]">
                  {task.requirements.map((r) => {
                    const v = s.reqs[r.id].verdict;
                    const m = VERDICT_META[v];
                    return (
                      <span key={r.id} title={`${r.id} ${r.title}: ${m.label}`}
                        className={cn('flex h-6 w-9 items-center justify-center rounded-[5px] text-xs font-bold', s.status === 'noRepo' ? 'bg-surface-hover text-muted' : cn(m.soft, m.ink))}>
                        {s.status === 'noRepo' ? '·' : m.symbol}
                      </span>
                    );
                  })}
                </span>
                <span className="ml-3 text-xs tabular-nums text-muted">{testsPassed(s)}/{task.tests.length} tests</span>
              </Link>
            ))}
          </div>
          <div className="mt-2 hidden gap-[2px] pl-[9.5rem] text-[10px] font-mono text-muted md:flex">
            {task.requirements.map((r) => <span key={r.id} className="w-9 text-center">{r.id}</span>)}
          </div>
        </div>
      </ChartCard>

      {/* Integrity */}
      {similarPairs.length ? (
        <section className="mt-4 rounded-card border border-rose/30 bg-rose-soft p-5">
          <h2 className="flex items-center gap-2 font-display text-h3 text-rose"><Copy className="h-4 w-4" /> Possible copying</h2>
          <p className="mt-0.5 text-xs text-rose">Comments, spacing and variable names are ignored, and starter code is subtracted. A signal to look into, not proof.</p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {similarPairs.map((p) => (
              <li key={`${p.a.id}-${p.b.id}`} className="flex items-center gap-3 rounded-cell bg-card p-3">
                <span className="font-display text-h2 tabular-nums text-rose">{p.score}%</span>
                <span className="min-w-0 flex-1 text-sm">
                  <Link href={studentHref(p.a.id, 'integrity')} className="font-semibold text-link hover:underline">{p.a.name}</Link>
                  <span className="text-muted"> and </span>
                  <Link href={studentHref(p.b.id, 'integrity')} className="font-semibold text-link hover:underline">{p.b.name}</Link>
                  <span className="block text-xs text-muted">Open both to compare their code side by side</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Table */}
      <section className="mt-4 rounded-card border border-line bg-card">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <h2 className="font-display text-h3 text-heading">All students <span className="text-muted">({rows.length})</span></h2>
          <div className="flex flex-1 flex-wrap items-center gap-2 md:justify-end">
            <label className="relative">
              <span className="sr-only">Search students</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, roll or GitHub"
                className="h-9 w-56 rounded-cell border border-line-strong/60 bg-card pl-8 pr-3 text-sm text-body placeholder:text-muted focus:outline focus:outline-2 focus:outline-[var(--focus)]" />
            </label>
            <div className="flex flex-wrap gap-1">
              {(['all', ...STATUS_ORDER.filter((k) => k !== 'unverified' || counts[k] > 0), 'flagged'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setStatusFilter(k)} aria-pressed={statusFilter === k}
                  className={cn('h-9 rounded-full border px-3 text-xs font-semibold transition-colors',
                    statusFilter === k ? 'border-hero bg-hero text-hero-on' : 'border-line text-muted hover:text-heading')}>
                  {k === 'all' ? 'All' : k === 'flagged' ? `Flagged (${flagged.length})` : `${STATUS_META[k].label} (${counts[k]})`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-app-warm text-left text-xs text-muted">
              <tr>
                <Th k="name">Student</Th>
                <Th k="status">Status</Th>
                <Th k="reqs">Requirements</Th>
                <Th k="tests" right>Tests</Th>
                <Th k="score" right>Score</Th>
                <Th k="commits" right>Commits</Th>
                <Th k="last">Last activity</Th>
                <th className="px-3 py-2.5 font-semibold">Flags</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const pts = reqPoints(s);
                return (
                  <tr key={s.id} className="group border-t border-line hover:bg-surface-hover/60">
                    <td className="px-3 py-2.5">
                      <Link href={studentHref(s.id)} className="flex items-center gap-2.5">
                        <Avatar name={s.name} size="sm" />
                        <span>
                          <span className="block font-semibold text-heading group-hover:text-link">{s.name}</span>
                          <span className="block font-mono text-xs text-muted">{s.roll}{s.github ? ` · @${s.github}` : ''}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5"><StatusPill status={s.status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-2 w-28 gap-[2px]">
                          {task.requirements.map((r) => {
                            const v = s.reqs[r.id].verdict;
                            return <span key={r.id} title={`${r.id}: ${VERDICT_META[v].label}`} className={cn('h-full flex-1 rounded-sm', v === 'met' ? 'bg-success' : v === 'partial' ? 'bg-signal' : 'bg-line')} />;
                          })}
                        </div>
                        <span className="text-xs tabular-nums text-muted">{pts}/5</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className={cn('font-semibold', testsPassed(s) === task.tests.length ? 'text-success' : 'text-heading')}>{testsPassed(s)}</span>
                      <span className="text-muted">/{task.tests.length}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-display text-label tabular-nums text-heading">{s.status === 'noRepo' ? '—' : s.score}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-body">{s.commits.length}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{relTime(s.lastActivity, now)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">{s.flags.slice(0, 2).map((f, i) => <FlagChip key={i} flag={f} compact />)}</div>
                    </td>
                    <td className="pr-3"><Link href={studentHref(s.id)} aria-label={`Open ${s.name}`}><ChevronRight className="h-4 w-4 text-muted" /></Link></td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-muted"><AlertTriangle className="mx-auto mb-2 h-5 w-5" />No students match.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </PulseShell>
  );
};
