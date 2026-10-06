import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/layout/Footer';
import { CompanyCard } from '@/components/company/CompanyCard';
import { PricingSection } from '@/components/checkout/PricingSection';
import { DropsStrip } from '@/components/drops/DropsStrip';
import { HeroVaultMock } from '@/components/home/HeroVaultMock';
import { HowItWorks } from '@/components/home/HowItWorks';
import { FinalCta } from '@/components/home/FinalCta';
import { Reveal } from '@/components/home/Reveal';
import { fetchCompanies, fetchHeroPostersApi } from '@/lib/api';
import { useCartScope } from '@/context/CartContext';
import { Company, HeroPoster } from '@/types';
import {
  Search, Sparkles, ShieldCheck, CheckCircle2, ArrowRight, FileText, FileDown, Star, Layers, BadgeCheck
} from 'lucide-react';

const HeroPosterCarousel = dynamic(
  () => import('@/components/common/HeroPosterCarousel'),
  { ssr: false }
);

// Fallback only. The hero is driven by admin-uploaded posters; this orbit shows
// when there is no live creative, so the slot is never empty.
const CompanyOrbitHero3D = dynamic(
  () => import('@/components/common/CompanyOrbitHero3D'),
  { ssr: false }
);

const INDUSTRIES = ['All', 'Big Tech', 'IT Services', 'Cybersecurity', 'Fintech', 'SaaS', 'Consulting'];

const FT_ITEMS = [
  { icon: ShieldCheck, title: 'Verified Drive Intelligence', body: 'Round-by-round questions, PYQs and answers curated from real drive experiences.', tint: 'text-[#0284C7] bg-[#E8F4FB]' },
  { icon: FileText, title: 'Official PDF Guides', body: 'Every premium module carries an admin-uploaded PDF — open in the reader or download the original.', tint: 'text-[#C77B12] bg-[#FBF1E1]' },
  { icon: FileDown, title: 'Unlock-and-Download Notes', body: 'Once a vault is unlocked, PDF study guides are yours — read them in the app or download and revise offline anytime.', tint: 'text-[#15803D] bg-[#E9F6EE]' },
  { icon: Layers, title: 'Complete Pack Ladder', body: 'Buy a single round or the whole pack — the more rounds you add, the more you save. Every price is computed by the server.', tint: 'text-[#0E2A44] bg-[#E8EEF4]' },
];

/*
 * Glanceable product facts, rendered as one static row. This used to be an
 * infinite marquee — a banner-site tell that cost battery for copy nobody
 * could stop and read. Shortened to fit a wrapped row on a 390px screen.
 */
const TRUST_FACTS = [
  { icon: ShieldCheck, text: 'Verified round-by-round intelligence', cls: 'text-[#0284C7]' },
  { icon: FileText, text: 'Official PDF guides in every module', cls: 'text-[#15803D]' },
  { icon: Layers, text: 'Complete Pack always costs less', cls: 'text-[#B45309]' },
  { icon: Sparkles, text: 'Free 7-section pack in every vault', cls: 'text-[#0E2A44]' },
  { icon: BadgeCheck, text: 'New company vaults every month', cls: 'text-[#C77B12]' },
];

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [posters, setPosters] = useState<HeroPoster[]>([]);
  const [showOrbit, setShowOrbit] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setShowOrbit(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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

  // Hero creatives. A failure here is not an error state for the visitor — the
  // hero simply falls back to the orbit, same as an admin with nothing live.
  useEffect(() => {
    let active = true;
    fetchHeroPostersApi()
      .then(data => { if (active && data.length > 0) setPosters(data); })
      .catch(() => { /* keep the orbit fallback */ });
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

  const filteredCompanies = companies.filter(c => {
    const matchesIndustry = selectedIndustry === 'All' || (c.industry || '').includes(selectedIndustry);
    const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesIndustry && matchesSearch;
  });

  return (
    <>
      <Head>
        <title>TieEdu — Verified Company Recruitment Intelligence & Placement Portal</title>
        <meta name="description" content="Verified round-by-round recruitment intelligence, DSA banks, system design flowcharts, and STAR model answers for 2026 hiring drives." />
      </Head>

      <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
        <main className="flex-grow w-full overflow-x-clip">
          {/* ===== HERO — Vault OS ===== */}
          <section className="hero-mesh">
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 pt-10 pb-10 sm:pt-16 sm:pb-20 lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center relative z-10">

              <div className="lg:col-span-7 space-y-7 text-center lg:text-left">

                <div className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-white/70 border border-[#E9E7E1] shadow-soft backdrop-blur max-w-full overflow-hidden">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F4FB] text-[#0271B5] text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                    <Sparkles className="w-3 h-3" /> 2026
                  </span>
                  <span className="text-[13px] font-bold text-[#3E4754] truncate">
                    <span className="hidden sm:inline">Verified Campus &amp; Off-Campus Hiring Intelligence</span>
                    <span className="sm:hidden">Verified Hiring Intelligence</span>
                  </span>
                </div>

                <h1 className="display-1">
                  Crack your dream drive with <span className="gradient-sky">verified candidate vaults</span>
                </h1>

                <p className="text-base sm:text-lg text-[#3E4754] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Round-by-round technical questions, executable DSA code, system-design flowcharts,
                  STAR answers — plus official <strong className="text-[#10151C]">PDF study guides</strong> in every premium module.
                </p>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-1">
                  <Link href="/compare" className="btn btn-primary w-full sm:w-auto min-h-[48px] justify-center px-6 py-3.5 text-[15px] focus-ring">
                    Compare Companies <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/study-plan" className="btn btn-ghost w-full sm:w-auto min-h-[48px] justify-center px-6 py-3.5 text-[15px] focus-ring">
                    <span className="text-[#B45309]">★</span> Generate Auto Study Plan
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

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
                  <span className="chip"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Server-verified pricing</span>
                  <span className="chip"><ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" /> 7-day refund guarantee</span>
                  <span className="chip"><Star className="w-3.5 h-3.5 text-[#B45309] fill-[#E8A33D]" /> PDF notes you can view &amp; download</span>
                </div>

              </div>

              {/* ===== HERO CREATIVE SLOT =====
                  Admin-uploaded posters own this slot. The 3D orbit is the
                  desktop fallback for when no creative is live; phones get a
                  static vault illustration so the column is never a dead gap. */}
              <div className="lg:col-span-5 flex items-center justify-center pt-2 lg:pt-0">
                {posters.length > 0 ? (
                  <HeroPosterCarousel posters={posters} />
                ) : showOrbit ? (
                  <CompanyOrbitHero3D companies={(companies || []).map(c => ({ name: c?.name || 'Company' }))} />
                ) : (
                  <HeroVaultMock />
                )}
              </div>

            </div>
          </section>

          {/* ===== TRUST FACTS — static, one wrapped row, no marquee ===== */}
          <section className="border-y border-[#E9E7E1] bg-white/70 backdrop-blur py-3.5">
            <ul className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
              {TRUST_FACTS.map((f, i) => (
                <li key={i} className="inline-flex items-center gap-2 text-[13px] font-bold text-[#3E4754]">
                  <f.icon className={`w-4 h-4 shrink-0 ${f.cls}`} aria-hidden />
                  {f.text}
                </li>
              ))}
            </ul>
          </section>

          {/* ===== HOW IT WORKS ===== */}
          <HowItWorks />

          {dataError && (
            <div className="w-full border-b border-[#F2C9BC] bg-[#FDEDE9] px-4 py-2.5 text-center">
              <p className="text-[13px] font-bold text-[#A63D28]">{dataError}</p>
            </div>
          )}

          {/* ===== FEATURE STRIP ===== */}
          <section className="bg-white border-b border-[#E9E7E1] py-12">
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">
              <div className="max-w-2xl mb-7">
                <span className="eyebrow">Why TieEdu</span>
                <h2 className="font-serif-heading text-3xl sm:text-4xl font-extrabold text-[#10151C] leading-tight mt-2">
                  Four things a PDF folder cannot do
                </h2>
              </div>
              <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {FT_ITEMS.map((f, i) => (
                  <div key={i} className="vault-card p-5 flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${f.tint}`}>
                      <f.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#10151C]">{f.title}</h3>
                      <p className="text-[14px] text-[var(--text-muted)] mt-1 leading-relaxed">{f.body}</p>
                    </div>
                  </div>
                ))}
              </Reveal>
            </div>
          </section>

          {/* ===== DROPS STRIP (renders nothing when the feed is empty) ===== */}
          <DropsStrip />

          {/* ===== DIRECTORY ===== */}
          <section id="companies" className="py-14 w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 scroll-mt-24">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 mb-9">
              <div className="space-y-2">
                <span className="eyebrow">The Vault Directory</span>
                <h2 className="font-serif-heading text-3xl sm:text-4xl font-extrabold text-[#10151C] leading-tight">
                  Company Recruitment Vaults
                </h2>
                <p className="text-[15px] text-[var(--text-muted)]">
                  Select a company to open its complete recruitment intelligence portal.
                </p>
                {!dataError && companies.length > 0 && (
                  <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#15803D] bg-[#E9F6EE] border border-[#CDE9D4] px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {companies.length} verified vaults indexed
                  </p>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap whitespace-nowrap pb-1 sm:pb-0 -mx-1 px-1 snap-x snap-mandatory">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setSelectedIndustry(ind)}
                    aria-pressed={selectedIndustry === ind}
                    className="dir-chip focus-ring snap-start"
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[#E9E7E1] bg-white p-6 flex flex-col gap-4 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-20 rounded-full bg-[#F0EFEC]" />
                      <div className="h-5 w-12 rounded-lg bg-[#F0EFEC]" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#F0EFEC]" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 rounded-md bg-[#F0EFEC]" />
                        <div className="h-3 w-20 rounded-md bg-[#F0EFEC]" />
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-6 w-16 rounded-full bg-[#F0EFEC]" />
                      <div className="h-6 w-20 rounded-full bg-[#F0EFEC]" />
                    </div>
                    <div className="h-14 rounded-xl bg-[#F3F2EE]" />
                  </div>
                ))
              ) : filteredCompanies.length > 0 ? (
                filteredCompanies.map((c) => (
                  <CompanyCard key={c.id} company={c} />
                ))
              ) : (
                <div className="py-16 text-center space-y-2 col-span-full">
                  <p className="text-3xl">🔍</p>
                  <p className="text-[15px] text-[var(--text-muted)]">No company matched your search — try another keyword.</p>
                </div>
              )}
            </div>
          </section>

          <PricingSection />

          {/* ===== CLOSING CTA ===== */}
          <FinalCta />
        </main>

        <Footer />
      </div>
    </>
  );
}
