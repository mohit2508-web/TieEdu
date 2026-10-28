import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { API_BASE_URL, apiFetch } from '@/lib/api';

/**
 * "From your college" (F1): one quiet line under Today's greeting. The
 * server only sends a number when at least ten students are in it, and
 * sends nothing when the student has no college (backend lib/collegePulse).
 */
export const CollegePulseLine: React.FC<{ ready: boolean }> = ({ ready }) => {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    apiFetch(`${API_BASE_URL}/me/college-pulse`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setText(d?.pulse?.text || null))
      .catch(() => { /* no line */ });
  }, [ready]);
  if (!text) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted">
      <Users className="h-4 w-4 text-signal" aria-hidden /> {text}
      <Link href="/college-leaderboard" className="ml-1 font-semibold text-signal hover:underline">This week’s board</Link>
    </p>
  );
};

export default CollegePulseLine;
