import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/layout/Footer';
import { HomeFaq } from '@/components/home/HomeFaq';
import { HomeMobileCtaBar } from '@/components/home/HomeMobileCtaBar';
import { VaultRail } from '@/components/home/VaultRail';
import { PromoBar } from '@/components/home/landing/PromoBar';
import { LandingHero } from '@/components/home/landing/LandingHero';
import { ToolFan } from '@/components/home/landing/ToolFan';
import { RoutePath } from '@/components/home/landing/RoutePath';
import { CompanyCount } from '@/components/home/landing/CompanyCount';
import { AudienceGrid } from '@/components/home/landing/AudienceGrid';
import { PractiseDemo } from '@/components/home/landing/PractiseDemo';
import { ResearchBento } from '@/components/home/landing/ResearchBento';
import { RoundBars } from '@/components/home/landing/RoundBars';
import { OfferStories } from '@/components/home/landing/OfferStories';
import { ClosingBand } from '@/components/home/landing/ClosingBand';
import { fetchCompanies, fetchPublicStatsApi, type PublicStats } from '@/lib/api';
import { useCartScope } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { TodayScreen } from '@/components/today/TodayScreen';
import { Company } from '@/types';
import { useFestival } from '@/lib/festival';
import { DiwaliHero } from '@/components/festival/DiwaliHero';
import { CoinsStrip } from '@/components/coins/CoinsStrip';
import { SwagBand, SwagPromo } from '@/components/store3d/SwagPromo';

const JoinChannelsPopup = dynamic(
  () => import('@/components/home/JoinChannelsPopup').then((m) => m.JoinChannelsPopup),
  { ssr: false }
);

const INDUSTRIES = ['All', 'Big Tech', 'IT Services', 'Cybersecurity', 'Fintech', 'SaaS', 'Consulting'];

export default function Home() {
  const festival = useFestival();
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let active = true;
    fetchCompanies()
      .then(data => {
        if (active && data && data.length > 0) setCompanies(data);
      })
      .catch(() => {
        if (active) setDataError('Live vault data could not be loaded — please check the backend status.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // The honest numbers (proof line, company count, stories). No numbers on failure.
  useEffect(() => {
    let active = true;
    fetchPublicStatsApi().then((data) => {
      if (active) setStats(data);
    });
    return () => {
      active = false;
    };
  }, []);

  /*
   * A purchase made in the cart drawer unlocks vaults on the server, so the
   * list has to be refetched rather than patched locally — `is_unlocked` is not
   * a field the client is entitled to guess. The drawer's cross-sell callbacks
   * are registered through `useCartScope` and run on a global drawer the
   * homepage no longer owns.
   */
  useCartScope(
    useMemo(
      () => ({
        onCheckoutSuccess: () => {
          fetchCompanies()
            .then((data) => { if (Array.isArray(data)) setCompanies(data); })
            .catch(() => { /* keep showing the pre-purchase list */ });
        },
      }),
      []
    )
  );

  // Signed in: the Today screen (UI_REDESIGN_PLAN_V2 §6.1). Guests keep the
  // public home, which is what the server renders for crawlers.
  if (user) {
    return (
      <>
        <Head>
          <title>Today · TiEEdu</title>
        </Head>
        <div className="flex min-h-screen flex-col bg-paper">
          <TodayScreen ready={!authLoading} />
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>TiEEdu — Placement preparation for engineering students</title>
        <meta name="description" content="Company-by-company placement prep for engineering students: round patterns, practice questions, free skill tests and courses, and a plan for your test date." />
        <link key="canonical" rel="canonical" href="https://tieedu.in/" />
        <meta property="og:site_name" content="TiEEdu" key="og:site_name" />
        <meta property="og:title" content="TiEEdu — Placement preparation for engineering students" />
        <meta property="og:url" content="https://tieedu.in/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://tieedu.in/email/logo.png" />
        {/* Brand identity for search: tells Google that "TiEEdu" is this site,
            its logo and its official profiles (helps the brand-name search). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://tieedu.in/#organization',
                  name: 'TiEEdu',
                  alternateName: ['TiEEdu Technologies', 'TieEdu', 'Tie Edu'],
                  url: 'https://tieedu.in/',
                  logo: 'https://tieedu.in/email/logo.png',
                  email: 'contact@tieedu.in',
                  sameAs: ['https://www.linkedin.com/company/tieedu/', 'https://x.com/TiEEdu', 'https://www.facebook.com/TiEEdu'],
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://tieedu.in/#website',
                  name: 'TiEEdu',
                  alternateName: ['TieEdu', 'Tie Edu'],
                  url: 'https://tieedu.in/',
                  publisher: { '@id': 'https://tieedu.in/#organization' },
                },
              ],
            }),
          }}
        />
      </Head>

      {/*
        Warm Paper home (UI_REDESIGN_PLAN_V3 §9, §11): E1 promo bar, E3/E4 hero
        and mock-up, E5 tools, E6 route, E7 company count, the directory the
        hero finder filters, E8 audiences, E9 practice demo, E10 research,
        E11 rounds, E12 offer stories, E13 pricing, E14 FAQ, E15 closing band.
        Every number is real or labelled as a sample; sections without real
        data render nothing.
      */}
      <div className="flex min-h-screen flex-col bg-app">
        <main className="w-full flex-grow overflow-x-clip">
          <DiwaliHero />
          {!festival.active && <PromoBar />}

          <LandingHero companies={companies} stats={stats} searchQuery={searchQuery} onSearch={setSearchQuery} />

          {/* TiE Coins call to action (TIE_COINS_STORE_PLAN.md §6.1). */}
          <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
            <CoinsStrip signedIn={false} />
            <SwagBand signedIn={false} />
          </div>
          <SwagPromo />

          {dataError && (
            <div className="w-full border-b border-signal/30 bg-signal-soft px-4 py-2.5 text-center">
              <p className="text-sm font-bold text-danger">{dataError}</p>
            </div>
          )}

          <ToolFan />
          <RoutePath />
          <CompanyCount companies={companies} stats={stats} />

          <VaultRail
            companies={companies}
            loading={loading}
            total={companies.length}
            industries={INDUSTRIES}
            selectedIndustry={selectedIndustry}
            onSelectIndustry={setSelectedIndustry}
            searchQuery={searchQuery}
          />

          <AudienceGrid />
          <PractiseDemo />
          <ResearchBento />
          <RoundBars companies={companies} />
          <OfferStories total={stats?.offer_stories} />

          <HomeFaq />
          <ClosingBand />

          {/* Phones only: sticky free-courses action once the hero scrolls away */}
          <HomeMobileCtaBar />
        </main>

        <Footer />
      </div>

      {/* Occasional "join our channels" promo — 7-day localStorage cooldown */}
      {!festival.active && <JoinChannelsPopup />}
    </>
  );
}
