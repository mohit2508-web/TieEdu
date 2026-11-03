import React, { useEffect, useRef, useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Project Pulse charts — plain SVG, no chart library (PROJECT_PULSE_PLAN.md §3.2).
 *
 * Colours come from the theme's CSS variables, so dark mode picks its own steps.
 * Status colours (done / in progress / not started) are used only for status and
 * always ship with a label; single-series charts use series-1. Every chart card
 * can flip to a table, so nothing is readable only by colour or by hovering.
 */

export const ChartCard: React.FC<{
  title: string;
  note?: string;
  table?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, note, table, className, action, children }) => {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn('min-w-0 rounded-card border border-line bg-card p-5', className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-h3 text-heading">{title}</h2>
          {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {table ? (
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              className="inline-flex h-8 items-center gap-1 rounded-well border border-line px-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-heading"
              aria-pressed={asTable}
            >
              {asTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
              {asTable ? 'Chart' : 'Table'}
            </button>
          ) : null}
        </div>
      </header>
      {asTable ? <div className="overflow-x-auto">{table}</div> : children}
    </section>
  );
};

export const MiniTable: React.FC<{ head: string[]; rows: (string | number)[][] }> = ({ head, rows }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-line text-left text-xs text-muted">
        {head.map((h, i) => <th key={h} className={cn('py-2 font-semibold', i > 0 && 'text-right')}>{h}</th>)}
      </tr>
    </thead>
    <tbody>
      {rows.map((r) => (
        <tr key={String(r[0])} className="border-b border-line/60 last:border-0">
          {r.map((c, i) => <td key={i} className={cn('py-1.5 text-body', i > 0 && 'text-right tabular-nums')}>{c}</td>)}
        </tr>
      ))}
    </tbody>
  </table>
);

const Tip: React.FC<{ x: string; y: number; children: React.ReactNode }> = ({ x, y, children }) => (
  <div
    role="status"
    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-well border border-line bg-card px-2.5 py-1.5 text-xs text-body shadow-pop"
    style={{ left: x, top: y - 8 }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Donut
// ---------------------------------------------------------------------------
export interface Segment { key: string; label: string; value: number; color: string }

export const Donut: React.FC<{ segments: Segment[]; centerLabel: string; onPick?: (key: string) => void; picked?: string | null }> = ({
  segments, centerLabel, onPick, picked,
}) => {
  const [hover, setHover] = useState<string | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 70, W = 22, C = 2 * Math.PI * R;
  // A 2px surface gap between arcs.
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 3 : 0;
  let offset = 0;
  const active = hover ?? picked ?? null;
  const shown = segments.find((s) => s.key === active);
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}>
        <g transform="rotate(-90 90 90)">
          <circle cx="90" cy="90" r={R} fill="none" stroke="rgb(var(--rgb-bg-surface-hover))" strokeWidth={W} />
          {segments.map((s) => {
            const len = (s.value / total) * C;
            const dash = Math.max(0, len - gap);
            const el = s.value > 0 ? (
              <circle
                key={s.key}
                cx="90" cy="90" r={R} fill="none"
                stroke={s.color}
                strokeWidth={active === s.key ? W + 6 : W}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                className={cn('transition-[stroke-width,opacity] duration-150', onPick && 'cursor-pointer', active && active !== s.key && 'opacity-40')}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPick?.(s.key)}
              />
            ) : null;
            offset += len;
            return el;
          })}
        </g>
        <text x="90" y="86" textAnchor="middle" className="fill-heading font-display" style={{ fontSize: 30, fontWeight: 700 }}>
          {shown ? shown.value : total}
        </text>
        <text x="90" y="106" textAnchor="middle" className="fill-muted" style={{ fontSize: 11 }}>
          {shown ? `${shown.label} · ${Math.round((shown.value / total) * 100)}%` : centerLabel}
        </text>
      </svg>
      <ul className="w-full space-y-1.5">
        {segments.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPick?.(s.key)}
              className={cn(
                'flex w-full items-center gap-2 rounded-well px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover',
                picked === s.key && 'bg-surface-hover ring-1 ring-line-strong',
              )}
              aria-pressed={picked === s.key}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="flex-1 text-body">{s.label}</span>
              <span className="font-semibold tabular-nums text-heading">{s.value}</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted">{Math.round((s.value / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** The container's pixel width, so SVG text is never stretched. */
const useWidth = (fallback: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
};

// ---------------------------------------------------------------------------
// Columns (commits per day, score histogram)
// ---------------------------------------------------------------------------
export interface Column { key: string; label: string; value: number | null; mark?: 'today' | 'deadline' }

export const Columns: React.FC<{
  data: Column[];
  unit: string;
  height?: number;
  /** Show every nth x label. */
  labelEvery?: number;
  color?: string;
}> = ({ data, unit, height = 190, labelEvery = 1, color = 'rgb(var(--rgb-series-1))' }) => {
  const [hover, setHover] = useState<number | null>(null);
  const [box, W] = useWidth(600);
  const H = height, padL = 28, padB = 24, padT = 14;
  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  const nice = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const step = (W - padL) / data.length;
  const bw = Math.max(4, Math.min(28, step - 4));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / nice);
  const ticks = [0, nice / 2, nice];
  const hovered = hover != null ? data[hover] : null;
  const toPct = (px: number) => `${(px / W) * 100}%`;
  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block" role="img"
        aria-label={`${data.filter((d) => d.value != null).map((d) => `${d.label} ${d.value}`).join(', ')}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="rgb(var(--rgb-border-subtle))" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" className="fill-muted" style={{ fontSize: 10 }}>{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = padL + step * i + step / 2;
          const v = d.value ?? 0;
          const top = y(v);
          const h = H - padB - top;
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {d.mark ? (
                <line x1={cx} x2={cx} y1={padT - 6} y2={H - padB} strokeDasharray="3 3"
                  stroke={d.mark === 'deadline' ? 'rgb(var(--rgb-danger))' : 'rgb(var(--rgb-text-muted))'} strokeWidth={1.5} />
              ) : null}
              {d.value == null ? (
                <rect x={cx - bw / 2} y={H - padB - 3} width={bw} height={3} rx={1.5} fill="rgb(var(--rgb-border-subtle))" />
              ) : v > 0 ? (
                <path
                  d={`M${cx - bw / 2},${H - padB} V${top + Math.min(4, h)} q0,-${Math.min(4, h)} ${Math.min(4, bw / 2)},-${Math.min(4, h)} H${cx + bw / 2 - Math.min(4, bw / 2)} q${Math.min(4, bw / 2)},0 ${Math.min(4, bw / 2)},${Math.min(4, h)} V${H - padB} Z`}
                  fill={color}
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              ) : null}
              {/* Hit target: the whole column, bigger than the mark. */}
              <rect x={padL + step * i} y={0} width={step} height={H} fill="transparent" />
              {i % labelEvery === 0 || d.mark ? (
                <text x={cx} y={H - 8} textAnchor="middle" className={d.mark ? 'fill-heading' : 'fill-muted'} style={{ fontSize: 10, fontWeight: d.mark ? 700 : 400 }}>
                  {d.mark === 'deadline' ? 'Deadline' : d.mark === 'today' ? 'Today' : d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {hovered && hover != null ? (
        <Tip x={toPct(padL + step * hover + step / 2)} y={y(hovered.value ?? 0)}>
          <span className="font-semibold text-heading">{hovered.label}</span>
          {' · '}
          {hovered.value == null ? 'upcoming' : `${hovered.value} ${unit}`}
        </Tip>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Horizontal bars (requirement completion)
// ---------------------------------------------------------------------------
export const HBars: React.FC<{ items: { key: string; label: string; sub?: string; value: number; partial?: number }[] }> = ({ items }) => (
  <ul className="space-y-3.5">
    {items.map((it) => (
      <li key={it.key} className="group">
        <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
          <span className="text-body"><span className="mr-1.5 font-mono text-xs text-muted">{it.key}</span>{it.label}</span>
          <span className="font-semibold tabular-nums text-heading">{it.value}%</span>
        </div>
        <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-hover" title={`${it.value}% met${it.partial ? `, ${it.partial}% partly` : ''}`}>
          <div className="h-full rounded-l-full bg-series-1" style={{ width: `${it.value}%` }} />
          {it.partial ? <div className="h-full bg-series-1/35" style={{ width: `${it.partial}%` }} /> : null}
        </div>
        {it.sub ? <p className="mt-1 text-xs text-muted">{it.sub}</p> : null}
      </li>
    ))}
  </ul>
);
