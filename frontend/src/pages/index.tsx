import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/layout/Footer';
import { PricingSection } from '@/components/checkout/PricingSection';
import { DropsStrip } from '@/components/drops/DropsStrip';
import { HeroVaultMock } from '@/components/home/HeroVaultMock';
import { FinalCta } from '@/components/home/FinalCta';
import { QuickActions } from '@/components/home/QuickActions';
import { CourseRail } from '@/components/home/CourseRail';
import { SkillRail } from '@/components/home/SkillRail';
import { VaultRail } from '@/components/home/VaultRail';
import { MockDriveRail } from '@/components/home/MockDriveRail';
import { FreeCourseBanner } from '@/components/home/FreeCourseBanner';
import { fetchCompanies, fetchHeroPostersApi } from '@/lib/api';
import { useCartScope } from '@/context/CartContext';
import { Company, HeroPoster } from '@/types';
import { Search, ArrowRight, ShieldCheck, FileDown, Layers, BadgeCheck } from 'lucide-react';

const HeroPosterCarousel = dynamic(() => import('@/components/common/HeroPosterCarousel'), {
  ssr: false,
});

const INDUSTRIES = ['All', 'Big Tech', 'IT Services', 'Cybersecurity', 'Fintech', 'SaaS', 'Consulting'];

/*
 * The thin closing band. The old four-tile feature section with paragraph
 * bodies is gone — nobody reads prose on a feed — so its facts compressed into
 * four chips that survive a single glance.
 */
const TRUST_FACTS = [
  { icon: ShieldCheck, text: 'Round-by-round verified', cls: 'text-[#0284C7]' },
  { icon: FileDown, text: 'PDFs you can download', cls: 'text-[#15803D]' },
  { icon: Layers, text: 'Packs always cheaper', cls: 'text-[#B45309]' },
  { icon: BadgeCheck, text: 'New vaults monthly', cls: 'text-[#0E2A44]' },
];

export default function Home() {
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

  return (
    <>
      <Head>
        <title>TieEdu — Verified Company Recruitment Intelligence & Placement Portal</title>
        <meta name="description" content="Verified round-by-round recruitment intelligence, DSA banks, system design flowcharts, and STAR model answers for 2026 hiring drives." />
      </Head>

      <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
        <main className="flex-grow w-full overflow-x-clip">
          {/* ===== HERO — compact: headline, one line, two CTAs, search ===== */}
          <section className="hero-mesh">
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 pb-9 sm:pt-12 sm:pb-14 lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center relative z-10">
              <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
                <h1 className="display-1">
                  Crack your dream drive with <span className="gradient-sky">verified vaults</span>
                </h1>

                <p className="text-base sm:text-lg text-[#3E4754] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Company vaults, courses &amp; free tests — everything one app.
                </p>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3">
                  <Link href="#companies" className="btn btn-primary w-full sm:w-auto min-h-[48px] justify-center px-6 py-3.5 text-[15px] focus-ring">
                    Explore vaults <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/interview-course" className="btn btn-ghost w-full sm:w-auto min-h-[48px] justify-center px-6 py-3.5 text-[15px] focus-ring">
                    Free course
                  </Link>
                </div>

                <div className="hidden md:block max-w-xl relative pt-2 mx-auto lg:mx-0 w-full">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search company — Google, TCS, Zscaler…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 sm:pr-24 py-3.5 bg-white/90 border border-[#E9E7E1] shadow-soft rounded-2xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/[0.05] text-[11px] font-bold text-[var(--text-muted)]">⌘K</span>
                </div>
              </div>

              {/* ===== HERO CREATIVE SLOT =====
                  Admin posters own this slot on every size. Without one, the
                  static vault mock stands in — but only from `md` up: on a
                  phone the next screenful is Quick Actions, and a decorative
                  card above them would just push the real product down. */}
              <div className="lg:col-span-5 flex items-center justify-center pt-2 lg:pt-0">
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
            <div className="w-full border-b border-[#F2C9BC] bg-[#FDEDE9] px-4 py-2.5 text-center">
              <p className="text-[13px] font-bold text-[#A63D28]">{dataError}</p>
            </div>
          )}

          {/* ===== QUICK ACTIONS — the product in one glance ===== */}
          <QuickActions />

          {/* ===== RAILS: courses → tests → free course → vaults → drops ===== */}
          <CourseRail />
          <MockDriveRail />
          <SkillRail />
          <FreeCourseBanner />
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

          {/* ===== THIN TRUST BAND ===== */}
          <section className="border-t border-[#E9E7E1] bg-white py-3.5">
            <ul className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
              {TRUST_FACTS.map((f, i) => (
                <li key={i} className="inline-flex items-center gap-2 text-[13px] font-bold text-[#3E4754]">
                  <f.icon className={`w-4 h-4 shrink-0 ${f.cls}`} aria-hidden />
                  {f.text}
                </li>
              ))}
            </ul>
          </section>

          {/* ===== CLOSING CTA ===== */}
          <FinalCta />
        </main>

        <Footer />
      </div>
    </>
  );
}
