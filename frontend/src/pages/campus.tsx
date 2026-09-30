import React from 'react';
import Head from 'next/head';
import { Footer } from '@/components/layout/Footer';
import { CampusDashboardView } from '@/components/campus/CampusDashboardView';
import { RequireAdmin } from '@/components/auth/RequireAdmin';

export default function CampusPage() {
  return (
    <RequireAdmin>
      <Head>
        <title>Institutional B2B Campus Placement Portal | TieEdu</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Cohort dashboards for college placement cells tracking batch readiness, company target stats, and verified interview reports." />
      </Head>

      {/* The header comes from `AppShell` now. It used to be rendered here with
          four no-op callbacks, so Search, Cart and Leaderboard were dead
          buttons on this page. */}
      <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
        <main className="flex-1">
          <CampusDashboardView />
        </main>

        <Footer />
      </div>
    </RequireAdmin>
  );
}
