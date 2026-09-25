import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CompanyCard } from '@/components/company/CompanyCard';
import { PricingSection } from '@/components/checkout/PricingSection';
import { CartModal } from '@/components/checkout/CartModal';
import { SearchModal } from '@/components/modals/SearchModal';
import { LeaderboardModal } from '@/components/modals/LeaderboardModal';
import { fetchCompanies } from '@/lib/api';
import { Company } from '@/types';
import {
  Search, Sparkles, ShieldCheck, CheckCircle2, ArrowRight, FileText, FileDown, Star, Layers, Ticket
} from 'lucide-react';

const CompanyOrbitHero3D = dynamic(
  () => import('@/components/common/CompanyOrbitHero3D'),
  { ssr: false }
);

const INDUSTRIES = ['All', 'Big Tech', 'IT Services', 'Cybersecurity', 'Fintech', 'SaaS', 'Consulting'];

const FT_ITEMS = [
  { icon: ShieldCheck, title: 'Verified Drive Intelligence', body: 'Round-by-round questions, PYQs and answers curated from real drive experiences.', tint: 'text-[#0284C7] bg-[#E8F4FB]' },
  { icon: FileText, title: 'Official PDF Guides', body: 'Every premium module carries an admin-uploaded PDF — open in the reader or download the original.', tint: 'text-[#C77B12] bg-[#FBF1E1]' },
  { icon: FileDown, title: 'Unlock-and-Download Notes', body: 'Once a vault is unlocked, PDF study guides are yours — read them in the app or download and revise offline anytime.', tint: 'text-[#15803D] bg-[#E9F6EE]' },
  { icon: Layers, title: 'Complete Pack Ladder', body: '1→₹99 · 2→₹169 · 3→₹219 · 4→₹249. More modules, bigger saving — server-driven pricing.', tint: 'text-[#0E2A44] bg-[#E8EEF4]' },
];

const OFFERS = [
  { icon: ShieldCheck, text: 'Verified round-by-round intelligence — no fake question dumps', cls: 'text-[#0284C7]' },
  { icon: FileText, text: 'Official PDF guides in every premium module — view or download after unlock', cls: 'text-[#15803D]' },
  { icon: Layers, text: 'Complete Pack ₹249 covers all rounds — always cheaper than singles', cls: 'text-[#E8A33D]' },
  { icon: Sparkles, text: 'Free 7-section pack open in every vault — no signup needed to read', cls: 'text-[#0E2A44]' },
  { icon: ShieldCheck, text: '2026 drive prep — new company vaults added every month', cls: 'text-[#C77B12]' },
];

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cartItems, setCartItems] = useState<(Company | any)[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCompanies = companies.filter(c => {
    const matchesIndustry = selectedIndustry === 'All' || (c.industry || '').includes(selectedIndustry);
    const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesIndustry && matchesSearch;
  });

  const handleSelectPlan = (plan: any) => {
    if (!cartItems.some(item => 'scope' in item && item.id === plan.id)) {
      setCartItems([...cartItems, plan]);
    }
    setIsCartOpen(true);
  };

  return (
    <>
      <Head>
        <title>TieEdu — Verified Company Recruitment Intelligence & Placement Portal</title>
        <meta name="description" content="Verified round-by-round recruitment intelligence, DSA banks, system design flowcharts, and STAR model answers for 2026 hiring drives." />
      </Head>

      <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
        <Header
          cartCount={cartItems.length}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        />

        <main className="flex-1">

          {/* ===== HERO — Vault OS ===== */}
          <section className="hero-mesh">
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 pt-12 pb-16 sm:pt-16 sm:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">

              <div className="lg:col-span-7 space-y-7 text-center lg:text-left">

                <div className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-white/70 border border-[#E9E7E1] shadow-soft backdrop-blur">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F4FB] text-[#0271B5] text-[11px] font-extrabold uppercase tracking-wide">
                    <Sparkles className="w-3 h-3" /> 2026
                  </span>
                  <span className="text-[13px] font-bold text-[#3E4754]">Verified Campus &amp; Off-Campus Hiring Intelligence</span>
                </div>

                <h1 className="display-1">
                  Crack your dream drive with <span className="gradient-sky">verified candidate vaults</span>
                </h1>

                <p className="text-base sm:text-lg text-[#3E4754] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Round-by-round technical questions, executable DSA code, system-design flowcharts,
                  STAR answers — plus official <strong className="text-[#10151C]">PDF study guides</strong> in every premium module.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                  <Link href="/compare" className="btn btn-primary px-6 py-3 text-sm focus-ring">
                    Compare Companies <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/study-plan" className="btn btn-ghost px-6 py-3 text-sm focus-ring">
                    <span className="text-[#E8A33D]">★</span> Generate Auto Study Plan
                  </Link>
                </div>

                <div className="max-w-xl relative pt-2 mx-auto lg:mx-0 w-full">
                  <Search className="w-4 h-4 text-[#7D8794] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search company — Google, TCS, Zscaler, Razorpay…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-24 py-3.5 bg-white/90 border border-[#E9E7E1] shadow-soft rounded-2xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/[0.05] text-[11px] font-bold text-[#7D8794]">⌘K</span>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
                  <span className="chip"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Server-verified pricing</span>
                  <span className="chip"><ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" /> 7-day refund guarantee</span>
                  <span className="chip"><Star className="w-3.5 h-3.5 text-[#E8A33D] fill-[#E8A33D]" /> PDF notes you can view & download</span>
                </div>

              </div>

              <div className="hidden lg:flex lg:col-span-5 items-center justify-center">
                <CompanyOrbitHero3D companies={(companies || []).map(c => ({ name: c?.name || 'Company' }))} />
              </div>

            </div>
          </section>

          {/* ===== HONEST FACTS MARQUEE (in-house, real product facts — no coupons) ===== */}
          <section className="border-y border-[#E9E7E1] bg-white/60 backdrop-blur py-3.5 overflow-hidden relative">
            <div className="flex whitespace-nowrap animate-marquee will-change-transform">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex shrink-0 items-center">
                  {OFFERS.map((ad, i) => (
                    <span key={i} className="inline-flex items-center gap-2.5 px-8 text-[13px] font-bold tracking-wide text-[#3E4754]">
                      <ad.icon className={`w-4 h-4 ${ad.cls}`} />
                      <span>{ad.text}</span>
                      <span className="text-[#E9E7E1] ml-6">|</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* ===== FEATURE STRIP ===== */}
          {dataError && (
            <div className="w-full border-b border-[#F2C9BC] bg-[#FDEDE9] px-4 py-2.5 text-center">
              <p className="text-[13px] font-bold text-[#A63D28]">{dataError}</p>
            </div>
          )}

          <section className="bg-white border-b border-[#E9E7E1] py-10">
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {FT_ITEMS.map((f, i) => (
                <div key={i} className="vault-card p-5 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${f.tint}`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#10151C]">{f.title}</h4>
                    <p className="text-[13px] text-[#7D8794] mt-1 leading-relaxed">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== DIRECTORY ===== */}
          <section className="py-14 w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 mb-9">
              <div className="space-y-2">
                <span className="eyebrow">The Vault Directory</span>
                <h2 className="font-serif-heading text-3xl sm:text-4xl font-extrabold text-[#10151C] leading-tight">
                  Company Recruitment Vaults
                </h2>
                <p className="text-[15px] text-[#7D8794]">
                  Select a company to open its complete recruitment intelligence portal.
                </p>
                {!dataError && companies.length > 0 && (
                  <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#15803D] bg-[#E9F6EE] border border-[#CDE9D4] px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {companies.length} verified vaults indexed
                  </p>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap whitespace-nowrap pb-1 sm:pb-0 -mx-1 px-1">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setSelectedIndustry(ind)}
                    className={`chip shrink-0 focus-ring ${
                      selectedIndustry === ind
                        ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-soft'
                        : 'hover:border-[#0284C7]/50 hover:text-[#0271B5]'
                    }`}
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
                  <p className="text-[15px] text-[#7D8794]">No company matched your search — try another keyword.</p>
                </div>
              )}
            </div>
          </section>

          <PricingSection onSelectPlan={handleSelectPlan} />
        </main>

        <Footer />

        <CartModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onRemoveItem={(idx) => setCartItems(cartItems.filter((_, i) => i !== idx))}
          onCheckoutSuccess={() => setCompanies(companies.map(c => ({ ...c, is_unlocked: true })))}
        />

        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          companies={companies}
        />

        <LeaderboardModal
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      </div>
    </>
  );
}