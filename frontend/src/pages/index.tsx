import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/layout/Footer';
import { PricingSection } from '@/components/checkout/PricingSection';
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
import { fetchCompanies, fetchHeroPostersApi, fetchPublicStatsApi, type PublicStats } from '@/lib/api';
import { useCartScope } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { TodayScreen } from '@/components/today/TodayScreen';
import { Company, HeroPoster } from '@/types';

const HeroPosterCarousel = dynamic(() => import('@/components/common/HeroPosterCarousel'), {
  ssr: false,
});

const JoinChannelsPopup = dynamic(
  () => import('@/components/home/JoinChannelsPopup').then((m) => m.JoinChannelsPopup),
  { ssr: false }
);

const INDUSTRIES = ['All', 'Big Tech', 'IT Services', 'Cybersecurity', 'Fintech', 'SaaS', 'Consulting'];

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [posters, setPosters] = useState<HeroPoster[]>([]);
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

  // Admin hero creatives, shown under the hero when there are any. A failure here is not an error state — the hero falls back
  // to the static vault mock (desktop) / goes text-first (phones).
  useEffect(() => {
    let active = true;
    fetchHeroPostersApi()
      .then(data => { if (active && data.length > 0) setPosters(data); })
      .catch(() => { /* fallback visuals handle it */ });
    return () => { active = false; };
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
          <title>Today · TieEdu</title>
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
        <title>TieEdu — Placement preparation for engineering students</title>
        <meta name="description" content="Company-by-company placement prep for engineering students: round patterns, practice questions, free skill tests and courses, and a plan for your test date." />
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
          <PromoBar />

          <LandingHero companies={companies} stats={stats} searchQuery={searchQuery} onSearch={setSearchQuery} />

          {dataError && (
            <div className="w-full border-b border-signal/30 bg-signal-soft px-4 py-2.5 text-center">
              <p className="text-sm font-bold text-danger">{dataError}</p>
            </div>
          )}

          {posters.length > 0 && (
            <section className="mx-auto w-full max-w-[1200px] px-4 pt-12 sm:px-6" aria-label="Featured">
              <HeroPosterCarousel posters={posters} />
            </section>
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

          {/* E13: pricing on graph paper with the two soft blobs behind it. */}
          <div className="relative overflow-hidden border-y border-line bg-app-warm">
            <div className="grid-paper mask-fade-b pointer-events-none absolute inset-0" aria-hidden />
            <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-signal/30 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-secondary/25 blur-3xl" aria-hidden />
            <div className="relative">
              <PricingSection />
            </div>
          </div>

          <HomeFaq />
          <ClosingBand />

          {/* Phones only: sticky free-courses action once the hero scrolls away */}
          <HomeMobileCtaBar />
        </main>

        <Footer />
      </div>

      {/* Occasional "join our channels" promo — 7-day localStorage cooldown */}
      <JoinChannelsPopup />
    </>
  );
}
