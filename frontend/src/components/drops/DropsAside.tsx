import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Target, ArrowRight } from 'lucide-react';
import { DROP_TYPE_META, type DropFeedItem } from '@/lib/dropsApi';

/**
 * Desktop right rail for the feed (redesign plan §5): what is due soon, the
 * student's own drive countdown, and the mix of what is in the feed right now.
 * Built only from data the page already loaded, so it costs no extra request.
 */
const fmtDue = (iso: string) => {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`;
};

export const DropsAside: React.FC<{ items: DropFeedItem[]; onOpen: (index: number) => void }> = ({ items, onOpen }) => {
  const [drive, setDrive] = useState<{ company: string; slug: string; date: string } | null>(null);
  useEffect(() => {
    try { setDrive(JSON.parse(window.localStorage.getItem('tieedu_next_drive') || 'null')); } catch { /* none */ }
  }, []);

  const due = useMemo(() => items
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.deadline_at && new Date(d.deadline_at).getTime() > Date.now())
    .sort((a, b) => new Date(a.d.deadline_at!).getTime() - new Date(b.d.deadline_at!).getTime())
    .slice(0, 4), [items]);

  const mix = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of items) m.set(d.type, (m.get(d.type) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const driveDays = drive ? Math.round((new Date(drive.date).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86400000) : null;

  return (
    <aside className="drops-aside" aria-label="Feed highlights">
      {drive && driveDays !== null && driveDays >= 0 && (
        <Link href={`/company/${drive.slug}`} className="focus-ring block rounded-card border border-signal/40 bg-card p-4 shadow-edge-neutral">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-deep"><Target className="h-3.5 w-3.5" aria-hidden /> Your drive</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-heading">{driveDays === 0 ? 'Today' : `${driveDays} days`}</p>
          <p className="text-sm text-muted">left for {drive.company}</p>
        </Link>
      )}

      <section className="rounded-card border border-line bg-card p-4 shadow-edge-neutral">
        <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-heading"><CalendarClock className="h-4 w-4 text-danger" aria-hidden /> Deadlines soon</h2>
        {due.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing due in your feed right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {due.map(({ d, i }) => (
              <li key={d.id}>
                <button type="button" onClick={() => onOpen(i)} className="focus-ring flex w-full items-start gap-2 rounded-lg p-2 text-left hover:bg-surface-hover">
                  <span className="mt-0.5 shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">{fmtDue(d.deadline_at!)}</span>
                  <span className="line-clamp-2 text-sm font-semibold text-heading">{d.headline}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mix.length > 0 && (
        <section className="rounded-card border border-line bg-card p-4 shadow-edge-neutral">
          <h2 className="font-display text-base font-bold text-heading">In your feed</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {mix.map(([type, n]) => (
              <li key={type} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-sm text-body">
                <span className="h-2 w-2 rounded-full" style={{ background: DROP_TYPE_META[type as keyof typeof DROP_TYPE_META]?.chip }} aria-hidden />
                {DROP_TYPE_META[type as keyof typeof DROP_TYPE_META]?.label || type} <span className="tabular-nums text-muted">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/companies" className="focus-ring inline-flex items-center gap-1 px-1 text-sm font-semibold text-link">
        Prepare company by company <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </aside>
  );
};
