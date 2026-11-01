import React from 'react';
import { ArrowRight, Check, FileText, Layers, ListChecks, RefreshCw, type LucideIcon } from 'lucide-react';

/**
 * The day-by-day plan drawn as a circuit (home "Exam prep" section): finished
 * steps sit on a lit trace, a pulse runs into today's step (the ticket), the
 * rest wait on a quiet trace, and the line ends at the readiness ring with the
 * test day under it. Sample data for an Infosys SE plan; the section labels it.
 */
type Kind = 'lesson' | 'quiz' | 'cards';
const ICON: Record<Kind, LucideIcon> = { lesson: FileText, quiz: ListChecks, cards: Layers };
const LABEL: Record<Kind, string> = { lesson: 'Lesson', quiz: 'Quiz', cards: 'Flashcards' };

const DONE: Array<{ title: string; kind: Kind; score?: string }> = [
  { title: 'Percentages', kind: 'lesson' },
  { title: 'Percentages', kind: 'quiz', score: '9/10' },
  { title: 'Syllogisms', kind: 'cards' },
];
const NEXT = { title: 'Pseudocode: tracing loops', kind: 'lesson' as Kind, minutes: 12 };
const TODO: Array<{ title: string; kind: Kind }> = [
  { title: 'Seating arrangement', kind: 'lesson' },
  { title: 'Seating arrangement', kind: 'quiz' },
  { title: 'Para jumbles', kind: 'lesson' },
];
const READY = 62;
const GOAL = 90;

const testDay = () => {
  const d = new Date(Date.now() + 6 * 86400000);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const Chip: React.FC<{ kind: Kind; score?: string }> = ({ kind, score }) => {
  const Icon = ICON[kind];
  return (
    <span className="flex flex-wrap justify-center gap-1">
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-hover px-2 text-xs font-semibold text-heading">
        <Icon className="h-3 w-3" aria-hidden /> {LABEL[kind]}
      </span>
      {score && <span className="inline-flex h-6 items-center rounded-full bg-success-soft px-2 text-xs font-semibold tabular-nums text-success">{score}</span>}
    </span>
  );
};

const Node: React.FC<{ kind: Kind; done: boolean; className?: string; style?: React.CSSProperties }> = ({ kind, done, className = '', style }) => {
  const Icon = done && kind !== 'quiz' ? Check : ICON[kind];
  return (
    <span
      style={style}
      className={`grid h-12 w-12 place-items-center rounded-full border-[1.5px] ${done ? 'border-success/40 bg-success-soft text-success' : 'border-line-strong bg-card text-muted'} ${className}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
};

const Ticket: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div style={style} className={`flex flex-col gap-3 rounded-[20px] bg-brand-ink p-4 text-white shadow-[var(--shadow-pop)] ${className}`}>
    <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Today · up next</p>
    <p className="font-display text-base font-semibold leading-tight">{NEXT.title}</p>
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white/10 px-2.5 text-xs font-semibold"><FileText className="h-3.5 w-3.5" aria-hidden /> {LABEL[NEXT.kind]}</span>
      <span className="inline-flex h-6 items-center rounded-full bg-white/10 px-2.5 text-xs font-semibold tabular-nums">{NEXT.minutes} min</span>
    </span>
    <span className="grid grid-cols-[auto_1fr] gap-2">
      <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-[1.5px] border-white/30 px-3 text-sm font-medium"><RefreshCw className="h-4 w-4" aria-hidden /> Choose another</span>
      <span className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-signal px-3 text-sm font-semibold text-on-primary">Start <ArrowRight className="h-4 w-4" aria-hidden /></span>
    </span>
  </div>
);

const Ring: React.FC<{ size: number }> = ({ size }) => {
  const r = 62;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="80" cy="80" r={r} strokeWidth="9" className="circuit-ring-bg" />
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - READY / 100)} transform="rotate(-90 80 80)" className="circuit-ring-fill" />
      </svg>
      <span className="relative flex flex-col items-center text-white">
        <span className="font-display text-3xl font-bold leading-none tabular-nums">{READY}%</span>
        <span className="mt-1 text-xs text-white/70">Ready</span>
      </span>
    </span>
  );
};

/* Desktop geometry (viewBox 1120 × 300). */
const X = { d1: 52, d2: 172, d3: 292, ticket: 562, t1: 764, t2: 840, t3: 916, ring: 1044 };
const pct = (x: number) => `${(x / 1120) * 100}%`;

export const StudyCircuit: React.FC = () => (
  <div className="relative">
    <p className="sr-only">
      Sample plan: {DONE.length} steps done, today: {NEXT.title}, then {TODO.length} more. Ready {READY}% now, goal {GOAL}%, test day {testDay()}.
    </p>

    {/* Desktop: horizontal circuit */}
    <div className="relative hidden aspect-[1120/300] lg:block" aria-hidden>
      <svg viewBox="0 0 1120 300" fill="none" className="absolute inset-0 h-full w-full overflow-visible">
        <path d={`M${X.d1 + 24} 150 H104 L112 142 V112 L120 104 H${X.d2 - 24}`} className="circuit-trace-on" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${X.d2 + 24} 104 H224 L232 112 V142 L240 150 H${X.d3 - 24}`} className="circuit-trace-on" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${X.d3 + 24} 150 H416`} className="circuit-trace-on" strokeWidth="4" strokeLinecap="round" />
        <path d={`M${X.d3 + 24} 150 H416`} pathLength={1} className="circuit-pulse" strokeWidth="3" strokeLinecap="round" />
        <path d={`M708 150 H${X.t1 - 24}`} className="circuit-trace" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${X.t1 + 24} 150 H794 L802 158 V188 L810 196 H${X.t2 - 24}`} className="circuit-trace" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${X.t2 + 24} 196 H870 L878 188 V158 L886 150 H${X.t3 - 24}`} className="circuit-trace" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${X.t3 + 24} 150 H976`} className="circuit-trace" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {DONE.map((s, i) => {
        const x = [X.d1, X.d2, X.d3][i];
        const up = i === 1;
        return (
          <React.Fragment key={i}>
            <Node kind={s.kind} done className="absolute -translate-x-1/2 -translate-y-1/2 circuit-lift" style={{ left: pct(x), top: up ? '34.7%' : '50%', animationDelay: `${i * 60}ms` }} />
            <span className="absolute flex w-36 -translate-x-1/2 flex-col items-center gap-1 text-center" style={{ left: pct(x), top: up ? 'calc(34.7% - 34px)' : 'calc(50% + 34px)', transform: `translate(-50%, ${up ? '-100%' : '0'})` }}>
              <span className="font-display text-sm font-medium leading-tight text-success">{s.title}</span>
              <Chip kind={s.kind} score={s.score} />
            </span>
          </React.Fragment>
        );
      })}

      <Ticket className="absolute w-[26%] -translate-x-1/2 -translate-y-1/2 circuit-lift" style={{ left: pct(X.ticket), top: '50%', animationDelay: '180ms' }} />

      {TODO.map((s, i) => {
        const x = [X.t1, X.t2, X.t3][i];
        const down = i === 1;
        return (
          <React.Fragment key={i}>
            <Node kind={s.kind} done={false} className="absolute -translate-x-1/2 -translate-y-1/2 circuit-lift" style={{ left: pct(x), top: down ? '65.3%' : '50%', animationDelay: `${240 + i * 60}ms` }} />
            <span className="absolute w-28 text-center font-display text-xs font-medium leading-tight text-muted" style={{ left: pct(x), top: down ? 'calc(65.3% + 32px)' : 'calc(50% - 34px)', transform: `translate(-50%, ${down ? '0' : '-100%'})` }}>{s.title}</span>
          </React.Fragment>
        );
      })}

      <span className="absolute -translate-x-1/2 -translate-y-1/2 circuit-lift" style={{ left: pct(X.ring), top: '50%', animationDelay: '420ms' }}>
        <Ring size={136} />
      </span>
      <span className="absolute flex -translate-x-1/2 flex-col items-center whitespace-nowrap text-center" style={{ left: pct(X.ring), top: 'calc(50% + 78px)' }}>
        <span className="font-display text-base font-semibold text-heading">Test day, {testDay()}</span>
        <span className="text-sm tabular-nums text-muted">Goal {GOAL}%</span>
      </span>
    </div>

    {/* Phone and tablet: the same path, top to bottom */}
    <ol className="relative mx-auto max-w-md space-y-4 lg:hidden" aria-hidden>
      <span className="absolute left-6 top-6 bottom-24 w-0.5 bg-line" />
      {DONE.map((s, i) => (
        <li key={i} className="relative flex items-center gap-3">
          <Node kind={s.kind} done />
          <span className="flex flex-col items-start gap-1">
            <span className="font-display text-sm font-medium text-success">{s.title}</span>
            <Chip kind={s.kind} score={s.score} />
          </span>
        </li>
      ))}
      <li className="relative"><Ticket /></li>
      {TODO.map((s, i) => (
        <li key={i} className="relative flex items-center gap-3">
          <Node kind={s.kind} done={false} />
          <span className="font-display text-sm font-medium text-muted">{s.title}</span>
        </li>
      ))}
      <li className="relative flex flex-col items-center gap-2 pt-2">
        <Ring size={128} />
        <span className="font-display text-base font-semibold text-heading">Test day, {testDay()}</span>
        <span className="text-sm text-muted">Goal {GOAL}%</span>
      </li>
    </ol>
  </div>
);

export default StudyCircuit;
