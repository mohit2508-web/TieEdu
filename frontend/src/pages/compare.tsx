import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartModal } from '@/components/checkout/CartModal';
import { SearchModal } from '@/components/modals/SearchModal';
import { LeaderboardModal } from '@/components/modals/LeaderboardModal';
import { fetchCompanies } from '@/lib/api';
import { Company, PricingPlan } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import {
  ArrowLeft, ShieldCheck, Clock, Users, Lock, CheckCircle2, Scale,
  Sparkles, Layers, FileText, Cpu, Award, Zap, HelpCircle, ArrowUpRight, RefreshCw
} from 'lucide-react';

export default function ComparePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [comp1Slug, setComp1Slug] = useState('');
  const [comp2Slug, setComp2Slug] = useState('');
  const [comp3Slug, setComp3Slug] = useState('');

  const [cartItems, setCartItems] = useState<(Company | PricingPlan)[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCompanies().then((list) => {
      if (!active) return;
      const published = (list || []).filter((c) => c.status !== 'draft');
      setCompanies(published);
      setComp1Slug((s) => s || published[0]?.slug || '');
      setComp2Slug((s) => s || published[1]?.slug || published[0]?.slug || '');
      setComp3Slug((s) => s || published[2]?.slug || published[0]?.slug || '');
    }).catch(() => { /* no data — honest empty state */ }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const bySlug = (slug: string) => companies.find((c) => c.slug === slug);
  const comp1 = bySlug(comp1Slug);
  const comp2 = bySlug(comp2Slug);
  const comp3 = bySlug(comp3Slug);
  const comparedList = [comp1, comp2, comp3].filter(Boolean) as Company[];

  const handleUnlock = (c: Company) => {
    if (!cartItems.some(i => 'slug' in i && i.slug === c.slug)) {
      setCartItems([...cartItems, c]);
    }
    setIsCartOpen(true);
  };

  const applyPreset = (slugs: string[]) => {
    setComp1Slug(slugs[0] || '');
    setComp2Slug(slugs[1] || '');
    setComp3Slug(slugs[2] || '');
  };

  const verifiedReportCount = companies.reduce((s, c) => s + (c.accuracy_report_count || 0), 0);

  return (
    <>
      <Head>
        <title>Side-by-Side Company Comparison Matrix | TieEdu</title>
        <meta name="description" content="Compare difficulty ratings, hiring rounds, CTC packages, round-by-round breakdowns, top interview questions, and system design topics across top tech firms." />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
        <Header
          cartCount={cartItems.length}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        />

        {/* FULL PAGE WIDTH MAIN CONTAINER */}
        <main className="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 py-8">

          {/* Back Navigation */}
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-[#8A8A8A] hover:text-[#1A1A1A] mb-6 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Company Directory
          </Link>

          {/* Page Title & Hero Header */}
          <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-[#1F3A5F] border border-indigo-100 mb-3 shadow-sm">
                <Scale className="w-3.5 h-3.5 text-[#E8A33D]" />
                Full-Width Comparative Intelligence Matrix
              </div>
              <h1 className="font-serif-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-2 leading-tight">
                Side-by-Side Company Comparison Matrix
              </h1>
              <p className="text-xs sm:text-sm text-[#8A8A8A] max-w-3xl leading-relaxed">
                Compare CTC ranges, hiring process duration, round breakdowns, top high-frequency questions, and system design focus across the vaults in your directory.
              </p>
            </div>

            {/* Live Counter */}
            <div className="bg-white p-3.5 px-5 rounded-xl border border-[#EDEDEB] shadow-sm shrink-0 flex items-center gap-4 text-xs">
              <div>
                <span className="text-[10px] text-[#8A8A8A] font-mono uppercase block">Published Vaults</span>
                <span className="font-bold text-[#1A1A1A] text-sm">{loading ? '…' : companies.length}</span>
              </div>
              <div className="h-8 w-px bg-[#EDEDEB]"></div>
              <div>
                <span className="text-[10px] text-[#8A8A8A] font-mono uppercase block">Verified Reports</span>
                <span className="font-bold text-[#1E8E5A] text-sm">{loading ? '…' : verifiedReportCount}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading live vault data…
            </div>
          ) : companies.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center text-sm text-gray-400">
              No published company vaults yet — check back once an admin publishes vaults.
            </div>
          ) : (
            <>
              {/* Benchmark Preset Quick Chips Bar */}
              {companies.length >= 3 && (
                <div className="mb-6 bg-white p-5 rounded-2xl border border-[#EDEDEB] shadow-sm w-full">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8A8A] font-bold block mb-3">
                    Quick presets
                  </span>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <button
                      onClick={() => applyPreset([companies[0].slug, companies[1].slug, companies[2].slug])}
                      className="px-4 py-2 bg-[#FAFAF9] hover:bg-indigo-50 text-[#1F3A5F] border border-[#EDEDEB] hover:border-indigo-200 rounded-xl font-semibold transition-all flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4 text-[#E8A33D]" /> Top 3 published vaults
                    </button>
                  </div>
                </div>
              )}

              {/* Dropdown Company Selectors Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 bg-white p-5 rounded-2xl border border-[#EDEDEB] shadow-sm w-full">
                {[comp1Slug, comp2Slug, comp3Slug].map((slug, i) => (
                  <div key={i}>
                    <label className="block text-[11px] font-mono uppercase text-[#8A8A8A] font-bold mb-1.5">Company Column {i + 1}</label>
                    <select
                      value={slug}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (i === 0) setComp1Slug(v);
                        else if (i === 1) setComp2Slug(v);
                        else setComp3Slug(v);
                      }}
                      className="w-full px-4 py-2.5 border rounded-xl text-xs sm:text-sm font-bold text-[#1A1A1A] bg-[#FAFAF9] focus:outline-none focus:border-[#1F3A5F]"
                    >
                      {companies.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* MAIN FULL-WIDTH COMPARISON MATRIX TABLE */}
              <div className="bg-white border border-[#EDEDEB] rounded-2xl overflow-hidden shadow-sm w-full">

                {/* Table Header Row */}
                <div className="grid grid-cols-4 border-b border-[#EDEDEB] bg-[#FAFAF9] p-5 font-mono text-[11px] uppercase font-bold text-[#8A8A8A]">
                  <div>Comparison Metrics</div>
                  {comparedList.map((c, i) => <div key={i}>{c.name}</div>)}
                </div>

                {/* Row 1: Company Card Header */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] items-center text-xs sm:text-sm">
                  <div className="font-bold text-[#1A1A1A]">Target Company</div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <BrandTile name={c.name} src={c.logo_url} className="w-10 h-10 rounded-xl p-1" />
                      <div>
                        <span className="font-bold text-sm sm:text-base text-[#1A1A1A] block leading-snug">{c.name}</span>
                        <span className="text-xs text-[#8A8A8A]">{c.industry}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Row 2: Compensation Package (CTC) */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] text-xs sm:text-sm items-center">
                  <div className="font-semibold text-[#8A8A8A] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#1E8E5A]" /> CTC Package Range
                  </div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="font-bold text-base text-[#1E8E5A]">
                      {c.ctc_min && c.ctc_max ? `₹${c.ctc_min} – ${c.ctc_max} LPA` : '—'}
                    </div>
                  ))}
                </div>

                {/* Row 3: Process Duration */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] text-xs sm:text-sm items-center">
                  <div className="font-semibold text-[#8A8A8A] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#1F3A5F]" /> Avg Process Duration
                  </div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="font-semibold text-[#1A1A1A]">
                      {c.avg_process_days ? `${c.avg_process_days} Days` : '—'}
                    </div>
                  ))}
                </div>

                {/* Row 4: Total Rounds */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] text-xs sm:text-sm items-center">
                  <div className="font-semibold text-[#8A8A8A] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1F3A5F]" /> Total Hiring Rounds
                  </div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="font-semibold text-[#1A1A1A]">
                      {c.avg_rounds ? `${c.avg_rounds} Rounds` : '—'}
                    </div>
                  ))}
                </div>

                {/* Row 5: Accuracy (derived from published reports) */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] text-xs sm:text-sm items-center">
                  <div className="font-semibold text-[#8A8A8A] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1F3A5F]" /> Verified Match Accuracy
                  </div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="space-y-1">
                      {c.accuracy_report_count ? (
                        <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold text-xs border border-emerald-200">
                          {c.accuracy_score}% · {c.accuracy_report_count} student report{c.accuracy_report_count === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 bg-[#FAFAF9] text-gray-500 rounded font-semibold text-xs border border-gray-200">
                          No verified reports yet
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Row 6: Round 1 (Online Assessment) */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] text-xs sm:text-sm">
                  <div className="font-semibold text-[#8A8A8A] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#1F3A5F]" /> Round 1: OA Format
                  </div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="text-[#4A4A4A] leading-relaxed text-xs">
                      {c.comparison_metrics?.round_1_oa || '—'}
                    </div>
                  ))}
                </div>

                {/* Row 7: Round 2 (Technical Core & Coding) */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] text-xs sm:text-sm">
                  <div className="font-semibold text-[#8A8A8A] flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#1F3A5F]" /> Round 2: Tech Core
                  </div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="text-[#4A4A4A] leading-relaxed text-xs">
                      {c.comparison_metrics?.round_2_tech || '—'}
                    </div>
                  ))}
                </div>

                {/* Row 8: Round 3 (System Design Focus) */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] text-xs sm:text-sm">
                  <div className="font-semibold text-[#8A8A8A] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#E8A33D]" /> Round 3: System Design
                  </div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="text-[#4A4A4A] leading-relaxed text-xs font-medium">
                      {c.comparison_metrics?.round_3_system_design || '—'}
                    </div>
                  ))}
                </div>

                {/* Row 9: Round 4 (HR & Values) */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] text-xs sm:text-sm">
                  <div className="font-semibold text-[#8A8A8A] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#1F3A5F]" /> Round 4: HR & Values
                  </div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="text-[#4A4A4A] leading-relaxed text-xs">
                      {c.comparison_metrics?.round_4_hr || '—'}
                    </div>
                  ))}
                </div>

                {/* Row 10: Top High-Frequency Questions Previews */}
                <div className="grid grid-cols-4 p-5 border-b border-[#EDEDEB] text-xs sm:text-sm">
                  <div className="font-semibold text-[#8A8A8A] flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#E8A33D]" /> Top Questions Asked
                  </div>
                  {comparedList.map((c, i) => (
                    <div key={i} className="space-y-2">
                      {c.comparison_metrics?.top_questions && c.comparison_metrics.top_questions.length > 0 ? (
                        c.comparison_metrics.top_questions.map((q, qIdx) => (
                          <div key={qIdx} className="p-2.5 bg-[#FAFAF9] rounded-lg border border-[#EDEDEB] text-xs text-[#1A1A1A] leading-snug">
                            • {q}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#8A8A8A]">—</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Row 11: Vault Unlock CTA Action */}
                <div className="grid grid-cols-4 p-5 items-center text-xs sm:text-sm bg-[#FAFAF9]">
                  <div className="font-bold text-[#1A1A1A]">Vault Action</div>
                  {comparedList.map((c, i) => (
                    <div key={i}>
                      {c.is_unlocked ? (
                        <Link
                          href={`/company/${c.slug}`}
                          className="px-5 py-2.5 bg-[#1F3A5F] hover:bg-[#2A4D7E] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <span>Open Vault</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleUnlock(c)}
                          className="px-5 py-2.5 bg-[#E8A33D] hover:bg-[#D4902C] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock Vault</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </>
          )}

        </main>

        <Footer />

        <CartModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onRemoveItem={(idx) => setCartItems(cartItems.filter((_, i) => i !== idx))}
          onCheckoutSuccess={() => {}}
        />

        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} companies={companies} />
        <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />

      </div>
    </>
  );
}