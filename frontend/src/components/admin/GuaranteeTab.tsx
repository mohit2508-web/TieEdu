import React, { useEffect, useState } from 'react';
import { BadgeIndianRupee, Check, RotateCw, ShieldCheck, X } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { fetchClaimQueue, reviewClaim, type AdminClaim, type GuaranteeSettings } from '@/lib/guaranteeApi';
import { cn } from '@/lib/cn';

/**
 * Accuracy-guarantee claims (D4). Approve when the report holds (usually
 * confirmed by other students' reports), then make the refund through the
 * payment provider and mark it refunded here. Nothing pays out automatically.
 */
export const GuaranteeTab: React.FC = () => {
  const [data, setData] = useState<{ settings: GuaranteeSettings; items: AdminClaim[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = () => {
    setError(null);
    fetchClaimQueue().then(setData).catch((e) => setError(e?.message || 'The claims could not be loaded.'));
  };
  useEffect(load, []);
  const act = (c: AdminClaim, status: AdminClaim['status']) =>
    reviewClaim(c.id, { status, admin_note: notes[c.id] ?? c.admin_note }).then(load).catch((e) => setError(e?.message || 'That change failed.'));

  if (error) return <EmptyState icon={RotateCw} title="Guarantee claims" note={error} action={{ label: 'Try again', onClick: load }} />;
  if (!data) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Card className={cn(!data.settings.enabled && 'border-warning')}>
        <p className="flex items-center gap-2 text-sm font-bold text-heading">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
          The guarantee is {data.settings.enabled ? `on — ₹${data.settings.amount} within ${data.settings.window_days} days` : 'off'}. Switch it in Settings.
        </p>
      </Card>
      {data.items.length === 0 && <EmptyState icon={BadgeIndianRupee} title="No claims" note="Claims from students appear here for review." />}
      {data.items.map((c) => (
        <Card key={c.id} className={cn(c.status === 'pending' && 'ring-2 ring-signal/40')}>
          <p className="font-bold text-heading">{c.company} · {c.round} · ₹{c.amount}</p>
          <p className="text-sm text-muted">{c.student} · {c.student_email || 'no email'} · interview {c.interview_date} · {c.status}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-body">{c.what_differed}</p>
          <label className="mt-3 block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Note to the student</span>
            <input
              defaultValue={c.admin_note}
              onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
              maxLength={500}
              autoComplete="off"
              className="mt-1 min-h-[40px] w-full rounded-xl border border-line bg-card px-3 text-sm text-heading"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {(c.status === 'pending' || c.status === 'rejected') && <Button size="sm" icon={Check} onClick={() => act(c, 'approved')}>Approve</Button>}
            {(c.status === 'pending' || c.status === 'approved') && <Button size="sm" kind="secondary" icon={X} onClick={() => act(c, 'rejected')}>Reject</Button>}
            {c.status === 'approved' && <Button size="sm" kind="secondary" icon={BadgeIndianRupee} onClick={() => act(c, 'refunded')}>Mark refunded</Button>}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default GuaranteeTab;
