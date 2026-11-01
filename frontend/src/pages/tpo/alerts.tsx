import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, BellRing, CheckCircle2, Info, RotateCw } from 'lucide-react';
import { RequirePlacement } from '@/components/placement/RequirePlacement';
import { TpoShell } from '@/components/tpo/TpoShell';
import { usePlacement } from '@/context/PlacementContext';
import { EmptyState, Skeleton } from '@/components/ui';
import { placementAlerts, type TpoAlert } from '@/lib/placementApi';

/**
 * Alerts — what needs the placement cell this week (PROFESSIONAL_PLATFORM_PLAN §10).
 * Worked out from Batch readiness and the college's drives; read-only. Every
 * "nudge" link goes to the Nudges page, where an officer's nudge waits for the
 * TPO Head's approval (college-nudges rules E1).
 */
const LEVEL: Record<TpoAlert['level'], { label: string; icon: React.ElementType; ring: string; chip: string }> = {
  urgent: { label: 'Urgent', icon: AlertTriangle, ring: 'border-danger/40', chip: 'bg-danger/10 text-danger' },
  watch: { label: 'Keep an eye', icon: BellRing, ring: 'border-[var(--brand-accent)]/50', chip: 'bg-[var(--brand-accent)]/15 text-amber-deep' },
  info: { label: 'For your info', icon: Info, ring: 'border-line', chip: 'bg-signal-soft text-link' },
};

const AlertsBody: React.FC = () => {
  const { activeCollegeId } = usePlacement();
  const [data, setData] = useState<Awaited<ReturnType<typeof placementAlerts>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    setData(null);
    placementAlerts(activeCollegeId)
      .then(setData)
      .catch((e) => setError(e?.message || 'Alerts could not be loaded.'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the officer switches college
  useEffect(load, [activeCollegeId]);

  if (error) return <EmptyState icon={RotateCw} title="Alerts could not be loaded." note={error} action={{ label: 'Try again', onClick: load }} />;
  if (!data) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }
  if (data.alerts.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-card p-10 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-[var(--color-success)]" aria-hidden />
        <p className="mt-3 font-display text-xl font-extrabold text-heading">Nothing needs you right now</p>
        <p className="mt-1 text-sm text-muted">No quiet students, no low scores and no drive deadlines in the next few days.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {data.alerts.map((a) => {
        const L = LEVEL[a.level];
        return (
          <li key={a.id} className={`rounded-3xl border bg-card p-5 shadow-edge-neutral sm:p-6 ${L.ring}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${L.chip}`}>
                  <L.icon className="h-3.5 w-3.5" aria-hidden /> {L.label}
                </span>
                <h2 className="mt-2 font-display text-lg font-extrabold text-heading">{a.title}</h2>
                <p className="mt-1 text-sm text-body">{a.detail}</p>
                {a.examples.length > 0 && (
                  <p className="mt-3 text-xs text-muted">
                    <span className="font-bold text-heading">Includes: </span>
                    {a.examples.join(', ')}
                    {a.count > a.examples.length && ` and ${a.count - a.examples.length} more`}
                  </p>
                )}
              </div>
              <Link href={a.href} className="btn btn-primary min-h-[44px] shrink-0 px-5 text-sm">
                {a.cta} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default function TpoAlertsPage() {
  return (
    <RequirePlacement>
      <Head>
        <title>Alerts — Campus TPO Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <TpoShell title="Alerts">
        <div className="mx-auto max-w-[900px] space-y-4 px-4 py-6">
          <p className="text-sm text-muted">
            What needs your attention this week. Nudges drafted from here follow the usual rule: an officer&apos;s nudge
            waits for the TPO Head&apos;s approval; the TPO Head&apos;s own go straight out.
          </p>
          <AlertsBody />
        </div>
      </TpoShell>
    </RequirePlacement>
  );
}
