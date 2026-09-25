import React from 'react';
import Head from 'next/head';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CampusDashboardView } from '@/components/campus/CampusDashboardView';

export default function CampusPage() {
  return (
    <>
      <Head>
        <title>Institutional B2B Campus Placement Portal | TieEdu</title>
        <meta name="description" content="Cohort dashboards for college placement cells tracking batch readiness, company target stats, and verified interview reports." />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
        <Header cartCount={0} onOpenCart={() => {}} onOpenSearch={() => {}} onOpenLeaderboard={() => {}} />

        <main className="flex-1">
          <CampusDashboardView />
        </main>

        <Footer />
      </div>
    </>
  );
}
