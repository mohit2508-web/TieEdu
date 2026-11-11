import React from 'react';

/** A progress ring (solved / total) with the percentage in the middle. */
export function ProgressRing({ done, total, size = 72, label }: { done: number; total: number; size?: number; label: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <div role="img" aria-label={`${label}: ${done} of ${total} solved`} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-surface-hover" />
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round" className="stroke-success transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums text-heading">{pct}%</span>
    </div>
  );
}

/** Easy / medium / hard as one stacked bar, with the counts underneath. */
export function MixBar({ mix }: { mix: { easy: number; medium: number; hard: number } }) {
  const total = mix.easy + mix.medium + mix.hard || 1;
  const parts = [
    { k: 'easy', n: mix.easy, cls: 'bg-success', label: 'Easy' },
    { k: 'medium', n: mix.medium, cls: 'bg-warning', label: 'Medium' },
    { k: 'hard', n: mix.hard, cls: 'bg-danger', label: 'Hard' },
  ];
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-hover" role="img" aria-label={parts.map((p) => `${p.n} ${p.label.toLowerCase()}`).join(', ')}>
        {parts.map((p) => p.n > 0 && <span key={p.k} className={p.cls} style={{ width: `${(p.n / total) * 100}%` }} />)}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-sm text-muted">
        {parts.map((p) => (
          <span key={p.k} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${p.cls}`} aria-hidden />{p.n} {p.label.toLowerCase()}</span>
        ))}
      </p>
    </div>
  );
}

/** Levels as stations on a line: solved / total under each, a lock when the level is in the pack; click to jump. */
export function RouteLine({ levels, onJump }: { levels: Array<{ name: string; solved: number; total: number; locked: number }>; onJump: (i: number) => void }) {
  return (
    <ol className="flex snap-x gap-0 overflow-x-auto pb-2 [scrollbar-width:thin]" aria-label="Levels">
      {levels.map((l, i) => {
        const done = l.total > 0 && l.solved === l.total;
        const started = l.solved > 0;
        const short = l.name.replace(/^Level\s*\d+\s*[·:-]\s*/i, '');
        return (
          <li key={l.name} className="relative min-w-[120px] flex-1 snap-start">
            {i > 0 && <span aria-hidden className={`absolute left-0 right-1/2 top-[15px] h-[3px] ${started || done ? 'bg-success' : 'bg-line'}`} />}
            {i < levels.length - 1 && <span aria-hidden className={`absolute left-1/2 right-0 top-[15px] h-[3px] ${done ? 'bg-success' : 'bg-line'}`} />}
            <button type="button" onClick={() => onJump(i)} className="relative mx-auto flex flex-col items-center gap-1.5 rounded-xl px-2 pb-1 text-center focus-ring">
              <span className={`grid h-8 w-8 place-items-center rounded-full border-[3px] text-sm font-bold tabular-nums ${done ? 'border-success bg-success text-white' : started ? 'border-success bg-card text-heading' : 'border-line bg-card text-muted'}`}>{i + 1}</span>
              <span className="text-sm font-semibold leading-tight text-heading">{short}</span>
              <span className="text-xs tabular-nums text-muted">{l.solved}/{l.total}{l.locked > 0 ? ` · ${l.locked} in pack` : ''}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
