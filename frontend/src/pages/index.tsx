import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/layout/Footer';
import { PricingSection } from '@/components/checkout/PricingSection';
import { DropsStrip } from '@/components/drops/DropsStrip';
import { HeroVaultMock } from '@/components/home/HeroVaultMock';
import { FinalCta } from '@/components/home/FinalCta';
import { CompanyFinder } from '@/components/home/CompanyFinder';
import { YearRoutes } from '@/components/home/YearRoutes';
import { RouteBand } from '@/components/home/RouteBand';
import { HomeFaq } from '@/components/home/HomeFaq';
import { BranchGoalBand } from '@/components/home/BranchGoalBand';
import { OffersStrip } from '@/components/home/OffersStrip';
import { FirstWinStrip } from '@/components/home/FirstWinStrip';
import { HomeMobileCtaBar } from '@/components/home/HomeMobileCtaBar';
import { CourseRail } from '@/components/home/CourseRail';
import { SkillRail } from '@/components/home/SkillRail';
import { VaultRail } from '@/components/home/VaultRail';
import { MockDriveRail } from '@/components/home/MockDriveRail';
import { FreeCourseBanner } from '@/components/home/FreeCourseBanner';
import { fetchCompanies, fetchHeroPostersApi } from '@/lib/api';
import { useCartScope } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { TodayScreen } from '@/components/today/TodayScreen';
import { Company, HeroPoster } from '@/types';
import { ArrowRight } from 'lucide-react';

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

  // Hero creatives. A failure here is not an error state — the hero falls back
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

      <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
        <main className="flex-grow w-full overflow-x-clip">
          {/* ===== HERO — one question, one sentence of proof (UI_REDESIGN_PLAN_V2 §7) =====
              The finder is the page's primary action on every screen size; it
              also drives the vault rail filter below through `searchQuery`. */}
          <section className="border-b border-line bg-paper">
            <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-12 lg:items-center">
              <div className="min-w-0 lg:col-span-7">
                <p className="eyebrow text-signal-ink">Placement prep for engineering students</p>
                <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-heading sm:text-5xl lg:text-6xl">
                  Know every round before you walk into it.
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-body">
                  Each company&apos;s rounds in order, the questions asked, and what it pays — with every figure marked as
                  checked or still being verified.
                </p>

                <CompanyFinder companies={companies} value={searchQuery} onChange={setSearchQuery} className="mt-8 max-w-xl" />

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/companies" className="pressable focus-ring inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-line-strong bg-card px-5 text-base font-semibold text-heading transition-colors hover:bg-surface-hover">
                    Browse companies <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link href="/skill-test" className="focus-ring inline-flex min-h-[48px] items-center justify-center px-2 text-base font-semibold text-signal hover:underline">
                    Or take a free skill test
                  </Link>
                </div>

                {!loading && companies.length > 0 && (
                  <p className="mt-6 text-sm text-muted">
                    <span className="font-semibold tabular-nums text-heading">{companies.length}</span> companies so far, and every skill test is free.
                  </p>
                )}
              </div>

              {/* Admin posters own this slot; without one the static vault mock
                  stands in from `md` up. On a phone the next screenful is the
                  routes, so a decorative card would only push them down. */}
              <div className="flex items-center justify-center lg:col-span-5">
                {posters.length > 0 ? (
                  <HeroPosterCarousel posters={posters} />
                ) : (
                  <div className="hidden md:flex">
                    <HeroVaultMock />
                  </div>
                )}
              </div>
            </div>
          </section>

          {dataError && (
            <div className="w-full border-b border-signal/30 bg-signal-soft px-4 py-2.5 text-center">
              <p className="text-sm font-bold text-danger">{dataError}</p>
            </div>
          )}

          {/* ===== THREE ROUTES BY YEAR — where are you on the route? ===== */}
          <YearRoutes />

          {/* ===== BRANCH / GOAL BAND — narrows the catalogue in one tap ===== */}
          <BranchGoalBand />

          {/* Renders nothing when there are no live offers */}
          <OffersStrip />

          {/* ===== RAILS: courses → first win → tests → free course → vaults → drops ===== */}
          <CourseRail />
          {/* Renders nothing until Bucket E micro-courses exist */}
          <FirstWinStrip />
          <MockDriveRail />
          <SkillRail />
          <FreeCourseBanner />

          {/* ===== THE PAGE'S ONE INK BAND — how a company page works ===== */}
          <RouteBand />

          <VaultRail
            companies={companies}
            loading={loading}
            total={companies.length}
            industries={INDUSTRIES}
            selectedIndustry={selectedIndustry}
            onSelectIndustry={setSelectedIndustry}
            searchQuery={searchQuery}
          />

          {/* Renders nothing when the feed is empty */}
          <DropsStrip />

          <PricingSection />

          <HomeFaq />

          {/* ===== CLOSING CTA ===== */}
          <FinalCta />

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
