import React from 'react';

/** Donut chart with optional center label. falls back gracefully to a track. */
export function Donut(props: {
  segments: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const size = props.size ?? 120;
  const stroke = props.stroke ?? 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = Math.max(1, props.segments.reduce((a, s) => a + s.value, 0));
  let acc = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--apple-surface-2)" strokeWidth={stroke} />
        {props.segments.map((s) => {
          const frac = s.value / total;
          const dash = frac * c;
          const rotate = acc * c;
          acc += frac;
          if (s.value <= 0) return null;
          return (
            <circle
              key={s.color}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-rotate * c} 
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      {(props.centerLabel || props.centerSub) ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[20px] font-semibold tabular-nums" style={{ color: 'var(--apple-label)' }}>{props.centerLabel}</span>
          {props.centerSub ? <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--apple-label-3)' }}>{props.centerSub}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Stacked single-panel bar showing proportional segments (e.g. status mix). */
export function StackBar(props: { segments: { value: number; color: string }[]; height?: number }) {
  const total = Math.max(1, props.segments.reduce((a, s) => a + s.value, 0));
  return (
    <div className="flex w-full overflow-hidden rounded-full" style={{ height: props.height ?? 10, background: 'var(--apple-surface-2)' }}>
      {props.segments.map((s) =>
        s.value <= 0 ? null : (
          <span key={s.color} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        )
      )}
    </div>
  );
}

/** Bar chart for daily registration counts. */
export function Bars(props: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const h = props.height ?? 96;
  const max = Math.max(1, ...props.data.map((d) => d.value));
  const color = props.color ?? 'var(--apple-blue)';
  return (
    <div className="flex h-full w-full items-end gap-[4px]" style={{ height: h }}>
      {props.data.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: 'var(--apple-label-3)' }}>No registrations yet</div>
      ) : null}
      {props.data.map((d) => (
        <div key={d.label} className="group relative flex min-w-[8px] flex-1 flex-col items-center gap-1">
          <span className="pointer-events-none absolute -top-5 text-[10px] font-medium tabular-nums opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--apple-label-2)' }}>
            {d.value}
          </span>
          <span
            className="w-full rounded-t-[4px]"
            style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color, opacity: 0.85 }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[9px] text-[var(--apple-label-3)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}