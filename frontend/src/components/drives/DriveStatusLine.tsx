import React from 'react';

type Tone = 'open' | 'registered' | 'upcoming' | 'closed' | 'live' | 'neutral';

const TONES: Record<Tone, { fg: string; bg: string }> = {
  open:       { fg: 'var(--apple-green)',  bg: 'var(--apple-green-soft)' },
  live:       { fg: 'var(--apple-blue)',   bg: 'var(--apple-blue-soft)' },
  registered: { fg: 'var(--apple-blue)',   bg: 'var(--apple-blue-soft)' },
  upcoming:   { fg: 'var(--apple-orange)', bg: 'var(--apple-orange-soft)' },
  closed:     { fg: 'var(--apple-label-3)', bg: 'var(--apple-fill)' },
  neutral:    { fg: 'var(--apple-label-2)', bg: 'var(--apple-fill)' },
};

function toneFor(statusLine: string, registered: boolean, registrationOpen: boolean): Tone {
  const s = statusLine.toLowerCase();
  if (registered) return 'registered';
  if (s.includes('live') || s.includes('in progress')) return 'live';
  if (registrationOpen || s.includes('open')) return 'open';
  if (s.includes('soon') || s.includes('upcoming') || s.includes('scheduled')) return 'upcoming';
  if (s.includes('closed') || s.includes('ended') || s.includes('archived')) return 'closed';
  return 'neutral';
}

/**
 * Renders the server-computed status line as a pill. The server is the single
 * source of truth for drive state (window, registration, results) — this
 * component only maps that string onto a colour, so the badge can never disagree
 * with the list/detail it sits in.
 */
export const DriveStatusLine: React.FC<{
  statusLine: string;
  registered?: boolean;
  registrationOpen?: boolean;
  className?: string;
}> = ({ statusLine, registered = false, registrationOpen = false, className }) => {
  const tone = TONES[toneFor(statusLine, registered, registrationOpen)];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${className ?? ''}`}
      style={{ background: tone.bg, color: tone.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.fg }} />
      {statusLine}
    </span>
  );
};

export default DriveStatusLine;
