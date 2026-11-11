import React, { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Activity, ShieldAlert, Inbox, CheckCircle2, CircleDashed, XCircle, Copy, Clock3, Layers, History, AlertTriangle, FileCode2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePulseNav } from '@/lib/pulse/scope';
import { STATUS_META, lineDiff, type PulseStatus, type Verdict, type Flag, type SourceFile, type Evidence } from '@/lib/pulse/demo';

/**
 * Project Pulse — the frame every Pulse page shares (PROJECT_PULSE_PLAN.md §3).
 * Sits inside the normal AppShell; adds a preview banner, the Pulse title bar
 * and, in Phase 0 only, a switch between the teacher and student views.
 */

export const PulseShell: React.FC<{
  title: string;
  role: 'teacher' | 'student' | null;
  crumbs?: { href: string; label: string }[];
  actions?: React.ReactNode;
  /** Sample-data mode: shows the preview banner and the teacher/student switch. */
  preview?: boolean;
  children: React.ReactNode;
}> = ({ title, role, crumbs, actions, preview, children }) => {
  const nav = usePulseNav();
  return (
  <>
    <Head>
      <title>{`${title} — Project Pulse · TiEEdu`}</title>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-4 sm:px-6 lg:px-8">
{preview ? (
      <div className="mb-4 flex items-start gap-2 rounded-cell border border-dashed border-line-strong/60 bg-app-warm px-3 py-2 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold text-heading">Design preview.</span> Sample class and sample code, so you can see every screen.
          The real portal is invite-only: teachers are appointed by TiEEdu, students are invited by their teacher.
        </p>
      </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Link href={nav.href('/project-pulse')} className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-link">
            <Activity className="h-4 w-4" aria-hidden /> Project Pulse
          </Link>
          {crumbs?.length ? (
            <nav aria-label="Breadcrumb" className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted">
              {crumbs.map((c) => (
                <React.Fragment key={c.href}>
                  <Link href={nav.href(c.href)} className="hover:text-link">{c.label}</Link>
                  <span aria-hidden>/</span>
                </React.Fragment>
              ))}
            </nav>
          ) : null}
          <h1 className="mt-1 break-words font-display text-2xl leading-tight text-heading sm:text-h1">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {role && preview ? (
            <div role="group" aria-label="Preview as" className="inline-flex rounded-cell border border-line bg-card p-1 text-xs font-semibold">
              {(['teacher', 'student'] as const).map((r) => (
                <Link
                  key={r}
                  href={`/project-pulse/demo?view=${r}`}
                  aria-current={role === r ? 'page' : undefined}
                  className={cn('rounded-well px-3 py-1.5 capitalize transition-colors', role === r ? 'bg-hero text-hero-on' : 'text-muted hover:text-heading')}
                >
                  {r} view
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  </>
  );
};

export const StatusPill: React.FC<{ status: PulseStatus; className?: string }> = ({ status, className }) => {
  const m = STATUS_META[status];
  const Icon = status === 'done' ? CheckCircle2 : status === 'progress' ? CircleDashed : status === 'notStarted' ? XCircle : status === 'unverified' ? ShieldAlert : status === 'submitted' ? Inbox : AlertTriangle;
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', m.soft, m.ink, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden /> {m.label}
    </span>
  );
};

export const VERDICT_META: Record<Verdict, { label: string; ink: string; soft: string; symbol: string; Icon: React.ComponentType<{ className?: string }> }> = {
  met: { label: 'Done', ink: 'text-success', soft: 'bg-success-soft', symbol: '✓', Icon: CheckCircle2 },
  partial: { label: 'Partly', ink: 'text-warning', soft: 'bg-warning-soft', symbol: '~', Icon: CircleDashed },
  missing: { label: 'Missing', ink: 'text-error', soft: 'bg-danger-soft', symbol: '✗', Icon: XCircle },
  unreviewed: { label: 'Not reviewed', ink: 'text-muted', soft: 'bg-surface-hover', symbol: '?', Icon: CircleDashed },
};

export const VerdictTag: React.FC<{ verdict: Verdict }> = ({ verdict }) => {
  const m = VERDICT_META[verdict];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', m.soft, m.ink)}>
      <m.Icon className="h-3.5 w-3.5" aria-hidden /> {m.label}
    </span>
  );
};

const FLAG_ICON: Record<Flag['kind'], React.ComponentType<{ className?: string }>> = {
  similar: Copy, bulk: Layers, backdated: History, inactive: Clock3, failing: AlertTriangle, late: Clock3, workflow: ShieldAlert, unverified: ShieldAlert, claimed: AlertTriangle,
};

export const FlagChip: React.FC<{ flag: Flag; compact?: boolean }> = ({ flag, compact }) => {
  const Icon = FLAG_ICON[flag.kind];
  const short = { similar: `${flag.score}% similar`, bulk: 'Bulk commit', backdated: 'Backdated', inactive: 'Inactive', failing: 'Build fails', late: 'Late', workflow: 'Grader edited', unverified: 'Not verified', claimed: 'Used another’s repo' }[flag.kind];
  return (
    <span title={flag.text} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-line bg-card px-2 py-0.5 text-xs font-semibold text-rose">
      <Icon className="h-3.5 w-3.5" aria-hidden /> {compact ? short : flag.text}
    </span>
  );
};

export const Kpi: React.FC<{ label: string; value: React.ReactNode; note?: string; icon: React.ComponentType<{ className?: string }>; tone?: 'plain' | 'ink' }> = ({
  label, value, note, icon: Icon, tone = 'plain',
}) => (
  <div className={cn('rounded-card border p-4', tone === 'ink' ? 'border-hero-edge bg-hero text-hero-on' : 'border-line bg-card')}>
    <p className={cn('flex items-center gap-1.5 text-xs font-semibold', tone === 'ink' ? 'text-hero-muted' : 'text-muted')}>
      <Icon className="h-4 w-4" aria-hidden /> {label}
    </p>
    <p className={cn('mt-1.5 font-display text-2xl font-bold tabular-nums', tone === 'ink' ? 'text-hero-on' : 'text-heading')}>{value}</p>
    {note ? <p className={cn('mt-0.5 text-xs', tone === 'ink' ? 'text-hero-muted' : 'text-muted')}>{note}</p> : null}
  </div>
);

export const Ring: React.FC<{ value: number; max: number; size?: number; label: string; sub?: string }> = ({ value, max, size = 120, label, sub }) => {
  const r = 46, c = 2 * Math.PI * r;
  const pct = max ? value / max : 0;
  const color = pct >= 1 ? 'rgb(var(--rgb-success))' : pct > 0 ? 'rgb(var(--rgb-signal))' : 'rgb(var(--rgb-danger))';
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${label}: ${value} of ${max}`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--rgb-bg-surface-hover))" strokeWidth="11" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="60" textAnchor="middle" className="fill-heading font-display" style={{ fontSize: 24, fontWeight: 700 }}>
        {Number.isInteger(value) ? value : value.toFixed(1)}<tspan className="fill-muted" style={{ fontSize: 13 }}>/{max}</tspan>
      </text>
      <text x="60" y="78" textAnchor="middle" className="fill-muted" style={{ fontSize: 10 }}>{sub ?? label}</text>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Code viewer — file list + read-only source, with evidence lines highlighted
// and a "changes since the task was assigned" diff mode.
// ---------------------------------------------------------------------------
export const CodeViewer: React.FC<{
  files: SourceFile[];
  starter: SourceFile[];
  highlight?: Evidence | null;
  mode: 'code' | 'diff';
}> = ({ files, starter, highlight, mode }) => {
  const [path, setPath] = useState(files[0]?.path ?? '');
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (highlight?.file) setPath(highlight.file); }, [highlight]);
  const file = files.find((f) => f.path === path) ?? files[0];
  const before = starter.find((f) => f.path === file?.path)?.code ?? '';
  const diff = useMemo(() => (file && mode === 'diff' ? lineDiff(before, file.code) : []), [file, before, mode]);
  useEffect(() => {
    const el = scroller.current?.querySelector('[data-hl="1"]');
    if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlight, path, mode]);

  if (!file) return <p className="rounded-card border border-line bg-card p-6 text-sm text-muted">No files in this repo yet.</p>;
  const lines = file.code.replace(/\n$/, '').split('\n');
  const stats = mode === 'diff' ? { add: diff.filter((d) => d.kind === 'add').length, del: diff.filter((d) => d.kind === 'del').length } : null;

  return (
    <div className="grid overflow-hidden rounded-card border border-line bg-card md:grid-cols-[200px_minmax(0,1fr)]">
      <ul className="flex gap-1 overflow-x-auto border-b border-line bg-app-warm p-2 md:block md:space-y-0.5 md:border-b-0 md:border-r">
        {files.map((f) => {
          const isNew = !starter.some((s) => s.path === f.path);
          return (
            <li key={f.path}>
              <button
                type="button"
                onClick={() => setPath(f.path)}
                className={cn('flex w-full items-center gap-1.5 whitespace-nowrap rounded-well px-2 py-1.5 text-left font-mono text-xs',
                  f.path === file.path ? 'bg-card font-semibold text-heading shadow-xs ring-1 ring-line' : 'text-muted hover:text-heading')}
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{f.path}</span>
                {isNew ? <span className="ml-auto text-xs font-bold text-success">NEW</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 text-xs text-muted">
          <span className="font-mono text-heading">{file.path}</span>
          <span className="tabular-nums">
            {stats ? <><span className="font-semibold text-success">+{stats.add}</span> <span className="font-semibold text-error">−{stats.del}</span> since assigned</> : `${lines.length} lines`}
          </span>
        </div>
        <div ref={scroller} className="max-h-[560px] overflow-auto py-2 font-mono text-xs leading-[1.6] [font-variant-ligatures:none]">
          {mode === 'code'
            ? lines.map((l, i) => {
                const n = i + 1;
                const hl = highlight && highlight.file === file.path && n >= highlight.from && n <= highlight.to;
                return (
                  <div key={n} data-hl={hl && n === highlight!.from ? '1' : undefined}
                    className={cn('flex', hl && 'bg-highlight/35 shadow-[inset_3px_0_0_rgb(var(--rgb-signal))]')}>
                    <span className="w-12 shrink-0 select-none pr-3 text-right text-muted/70">{n}</span>
                    <code className="whitespace-pre pr-4 text-body">{l || ' '}</code>
                  </div>
                );
              })
            : diff.map((d, i) => (
                <div key={i} className={cn('flex', d.kind === 'add' && 'bg-success-soft', d.kind === 'del' && 'bg-danger-soft')}>
                  <span className="w-12 shrink-0 select-none pr-3 text-right text-muted/70">{d.n ?? ''}</span>
                  <span className={cn('w-4 shrink-0 select-none', d.kind === 'add' ? 'text-success' : d.kind === 'del' ? 'text-error' : 'text-muted')}>
                    {d.kind === 'add' ? '+' : d.kind === 'del' ? '−' : ' '}
                  </span>
                  <code className={cn('whitespace-pre pr-4', d.kind === 'del' ? 'text-error line-through decoration-error/40' : 'text-body')}>{d.text || ' '}</code>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};
