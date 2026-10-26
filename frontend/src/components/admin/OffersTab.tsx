import React, { useEffect, useState } from 'react';
import { BadgeCheck, Check, RotateCw, X } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { fetchOfferQueue, moderateOffer, type AdminOffer } from '@/lib/offersApi';
import { cn } from '@/lib/cn';

/**
 * Offer wall moderation (C1). Approve or reject student stories; mark one
 * "verified" only after confirming the offer with the student (the author's
 * account email is shown here, and only here, for that). TieEdu does not
 * collect offer letters.
 */
export const OffersTab: React.FC = () => {
  const [items, setItems] = useState<AdminOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setError(null);
    fetchOfferQueue().then((r) => setItems(r.items)).catch((e) => setError(e?.message || 'The queue could not be loaded.'));
  };
  useEffect(load, []);
  const act = (id: string, patch: Parameters<typeof moderateOffer>[1]) => moderateOffer(id, patch).then(load).catch((e) => setError(e?.message || 'That change failed.'));

  if (error) return <EmptyState icon={RotateCw} title="Offer wall queue" note={error} action={{ label: 'Try again', onClick: load }} />;
  if (!items) return <Skeleton className="h-64 w-full" />;
  if (items.length === 0) return <EmptyState icon={BadgeCheck} title="No stories yet" note="Student offer stories appear here for review before they go on the wall." />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Pending first. Verify only after you have confirmed the offer with the student by email.</p>
      {items.map((o) => (
        <Card key={o.id} className={cn(o.status === 'pending' && 'ring-2 ring-signal/40')}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-heading">{o.company} · {o.role}{o.ctc_lpa !== null && ` · ₹${o.ctc_lpa} LPA`}</p>
              <p className="text-sm text-muted">{o.author} · {o.author_email || 'no email'} · shown as {o.name_mode.replace('_', ' ')} · {o.status}{o.verified && ' · verified'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {o.status !== 'approved' && <Button size="sm" icon={Check} onClick={() => act(o.id, { status: 'approved' })}>Approve</Button>}
              {o.status !== 'rejected' && <Button size="sm" kind="secondary" icon={X} onClick={() => act(o.id, { status: 'rejected' })}>Reject</Button>}
              {o.status === 'approved' && (
                <Button size="sm" kind="secondary" icon={BadgeCheck} onClick={() => act(o.id, { verified: !o.verified })}>{o.verified ? 'Remove verified' : 'Mark verified'}</Button>
              )}
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm text-body">{o.story}</p>
        </Card>
      ))}
    </div>
  );
};

export default OffersTab;
