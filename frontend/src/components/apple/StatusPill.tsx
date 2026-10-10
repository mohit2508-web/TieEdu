import React from 'react';

export type PillTone = 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';

const TONES: Record<PillTone, string> = {
  neutral: 'var(--apple-fill)',
  blue: 'var(--apple-blue-soft)',
  green: 'var(--apple-green-soft)',
  orange: 'var(--apple-orange-soft)',
  red: 'var(--apple-red-soft)',
  purple: 'var(--apple-purple-soft)',
  teal: 'var(--apple-teal-soft)',
};
const TEXT: Record<PillTone, string> = {
  neutral: 'var(--apple-label-2)',
  blue: 'var(--apple-blue)',
  green: 'var(--apple-green)',
  orange: 'var(--apple-orange)',
  red: 'var(--apple-red)',
  purple: 'var(--apple-purple)',
  teal: 'var(--apple-teal)',
};

export default function StatusPill(props: { label: string; tone?: PillTone; dot?: boolean; className?: string }) {
  const tone = props.tone ?? 'neutral';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${props.className ?? ''}`}
      style={{ background: TONES[tone], color: TEXT[tone] }}
    >
      {props.dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: TEXT[tone] }} /> : null}
      {props.label}
    </span>
  );
}

export const driveStatusTone = (s?: string): PillTone => {
  switch (s) {
    case 'completed': return 'green';
    case 'passed': return 'green';
    case 'in_progress': return 'blue';
    case 'launched': return 'blue';
    case 'registered': return 'blue';
    case 'open': return 'green';
    case 'invite': return 'purple';
    case 'roster': return 'orange';
    case 'draft': return 'neutral';
    case 'disqualified': return 'red';
    case 'failed': return 'red';
    case 'absent': return 'red';
    default: return 'neutral';
  }
};