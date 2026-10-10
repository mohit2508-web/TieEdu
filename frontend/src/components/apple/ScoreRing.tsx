import React from 'react';

/** iOS-style circular progress ring. value is 0..1. */
export default function ScoreRing(props: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}) {
  const size = props.size ?? 92;
  const stroke = props.stroke ?? 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, props.value));
  const color = props.color ?? 'var(--apple-blue)';
  const track = props.trackColor ?? 'var(--apple-surface-2)';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - clamped * c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 600ms var(--ease-out)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {props.label
          ? <span className="text-center text-[15px] font-semibold tabular-nums" style={{ color: 'var(--apple-label)' }}>{props.label}</span>
          : <span className="text-center text-[22px] font-semibold tabular-nums" style={{ color: 'var(--apple-label)' }}>{Math.round(clamped * 100)}%</span>}
        {props.sublabel ? (
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--apple-label-3)' }}>{props.sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}