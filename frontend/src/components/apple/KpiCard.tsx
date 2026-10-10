import React from 'react';

export type KpiTone = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';

const TONE: Record<KpiTone, { dot: string; text: string }> = {
  blue: { dot: 'var(--apple-blue)', text: 'var(--apple-blue)' },
  green: { dot: 'var(--apple-green)', text: 'var(--apple-green)' },
  orange: { dot: 'var(--apple-orange)', text: 'var(--apple-orange)' },
  red: { dot: 'var(--apple-red)', text: 'var(--apple-red)' },
  purple: { dot: 'var(--apple-purple)', text: 'var(--apple-purple)' },
  teal: { dot: 'var(--apple-teal)', text: 'var(--apple-teal)' },
};

export default function KpiCard(props: {
  label: string;
  value: string;
  hint?: string;
  tone?: KpiTone;
  sparkline?: number[];
}) {
  const t = TONE[props.tone ?? 'blue'];
  return (
    <div className="apple-card px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-medium text-[var(--apple-label-2)]">{props.label}</div>
        <span className="h-2 w-2 rounded-full" style={{ background: t.dot }} />
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div className="text-[30px] font-semibold leading-none tracking-tight" style={{ color: 'var(--apple-label)' }}>
          {props.value}
        </div>
        {props.sparkline && props.sparkline.length > 1 ? (
          <Sparkline points={props.sparkline} color={t.dot} width={64} height={24} />
        ) : null}
      </div>
      {props.hint ? (
        <div className="mt-1.5 text-xs" style={{ color: t.text }}>
          {props.hint}
        </div>
      ) : null}
    </div>
  );
}

export function Sparkline(props: { points: number[]; color?: string; width?: number; height?: number }) {
  const w = props.width ?? 64;
  const h = props.height ?? 24;
  const max = Math.max(...props.points, 1);
  const min = Math.min(...props.points);
  const range = Math.max(1, max - min);
  const step = w / (props.points.length - 1 || 1);
  const d = props.points.map((p, i) => {
    const x = i * step;
    const y = h - 3 - ((p - min) / range) * (h - 6);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = props.color ?? 'var(--apple-blue)';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}