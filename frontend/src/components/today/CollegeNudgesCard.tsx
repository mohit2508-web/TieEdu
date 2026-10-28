import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Megaphone } from 'lucide-react';
import { Card } from '@/components/ui';
import { API_BASE_URL, apiFetch } from '@/lib/api';

/**
 * Nudges from the student's college placement cell (backend lib/collegeNudges).
 * On Today it shows recent nudges, and only when there are some. With
 * `settingsOnly` (the account page) it is just the switch, always available.
 * Either way a student can turn college nudges off; the college is told only
 * how many students have, never who.
 */
interface Inbox { off: boolean; items: Array<{ id: string; text: string; href: string; at: string; seen: boolean }>; unread: number }

const call = async (path: string, init?: RequestInit) => {
  const res = await apiFetch(`${API_BASE_URL}/me/college-nudges${path}`, init);
  if (!res.ok) throw new Error('Request failed');
  return res.status === 204 ? null : res.json();
};
const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

export const CollegeNudgesCard: React.FC<{ ready: boolean; settingsOnly?: boolean }> = ({ ready, settingsOnly = false }) => {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    call('')
      .then((d: Inbox) => {
        setInbox(d);
        if (!settingsOnly && d.unread > 0) call('/seen', { method: 'POST' }).catch(() => { /* stays unread; harmless */ });
      })
      .catch(() => { /* nothing to show */ });
  }, [ready, settingsOnly]);

  if (!inbox) return null;
  if (!settingsOnly && inbox.items.length === 0) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      setInbox(await call('', { method: 'PUT', body: JSON.stringify({ off: !inbox.off }) }));
    } catch {
      /* the switch keeps its state */
    } finally {
      setBusy(false);
    }
  };
  const sw = (
    <label className="flex items-start gap-2 text-sm text-body">
      <input type="checkbox" checked={inbox.off} disabled={busy} onChange={toggle} className="mt-0.5 h-4 w-4 accent-signal" />
      <span>
        Turn off nudges from my college
        <span className="block text-xs text-muted">Your placement cell sees only how many students turned them off, never who.</span>
      </span>
    </label>
  );

  if (settingsOnly) {
    return (
      <div className="rounded-xl border border-line p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-heading"><Megaphone className="h-4 w-4 text-signal" aria-hidden /> College placement cell</p>
        {sw}
      </div>
    );
  }

  return (
    <Card className="mt-6">
      <p className="eyebrow text-muted">From your college</p>
      <ul className="mt-2 space-y-2">
        {inbox.items.slice(0, 3).map((n) => (
          <li key={`${n.id}-${n.at}`} className={`rounded-xl p-3 text-sm ${n.seen ? 'bg-surface-hover text-body' : 'bg-signal-soft text-heading'}`}>
            <Megaphone className="mr-1.5 inline h-4 w-4 text-signal" aria-hidden />
            {n.text}
            <span className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
              {dayMonth.format(new Date(n.at))}
              <Link href={n.href} className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-signal hover:underline">Go <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3">{sw}</div>
    </Card>
  );
};

export default CollegeNudgesCard;
