import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { RotateCw } from 'lucide-react';
import { RequirePlacement } from '@/components/placement/RequirePlacement';
import { TpoShell } from '@/components/tpo/TpoShell';
import { usePlacement } from '@/context/PlacementContext';
import { EmptyState, Skeleton } from '@/components/ui';
import { ReadinessView, SEGMENTS } from '@/components/tpo/ReadinessView';
import { CampusPageCard } from '@/components/tpo/CampusPageCard';
import { BatchReadiness, placementReadiness } from '@/lib/placementApi';

/**
 * Batch readiness — the TPO's one screen (UI_REDESIGN_PLAN_V2 §7.2): "See your
 * batch's placement readiness in one screen, not twenty spreadsheets."
 *
 * Students × the companies this batch is preparing for, each cell the same
 * readiness a student sees on their own Today screen. Segments say who needs
 * attention. Read-only; the CSV export is generated in the browser from what
 * is on screen, so it can never contain more than the officer can already see.
 */

const AnalyticsBody: React.FC = () => {
  const { activeCollegeId } = usePlacement();
  const [data, setData] = useState<BatchReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    setData(null);
    placementReadiness(activeCollegeId)
      .then(setData)
      .catch((e) => setError(e?.message || 'Readiness could not be loaded.'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the officer switches college
  useEffect(load, [activeCollegeId]);

  if (error) {
    return <EmptyState icon={RotateCw} title="Readiness could not be loaded." note={error} action={{ label: 'Try again', onClick: load }} />;
  }
  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid gap-3 sm:grid-cols-4">{SEGMENTS.map((s) => <Skeleton key={s.key} className="h-24 w-full" />)}</div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }
  return <ReadinessView data={data} />;
};

export default function TpoAnalyticsPage() {
  return (
    <RequirePlacement>
      <Head>
        <title>Batch readiness — Campus TPO Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <TpoShell title="Batch readiness">
        <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-6">
          <AnalyticsBody />
          <CampusPageCard />
        </div>
      </TpoShell>
    </RequirePlacement>
  );
}
