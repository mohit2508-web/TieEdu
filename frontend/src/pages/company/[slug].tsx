import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CompanyOverviewHeader } from '@/components/company/CompanyOverviewHeader';
import { TrustBadgeBar } from '@/components/company/TrustBadgeBar';
import { ContentBlockRenderer } from '@/components/blocks/ContentBlockRenderer';
import { QuestionDiscussion } from '@/components/company/QuestionDiscussion';
import { InterviewExperiences } from '@/components/company/InterviewExperiences';
import { RelatedVaults } from '@/components/company/RelatedVaults';
import { FeaturedFreeModuleCard } from '@/components/company/FeaturedFreeModuleCard';
import { PremiumModuleCard } from '@/components/company/PremiumModuleCard';
import { CompletePackBanner } from '@/components/company/CompletePackBanner';
import { IntelligenceTreeSidebar, MobileSidebarDrawer } from '@/components/company/IntelligenceTreeSidebar';
import dynamic from 'next/dynamic';
import { fetchCompanyBySlug, fetchCompanies, API_BASE_URL } from '@/lib/api';
import { packPrice } from '@/lib/packPricing';
import { CompanyModuleReader } from '@/components/company/CompanyModuleReader';
import { Company, PricingPlan, ContentItem, ContentModule, RoundType, CompanyModuleItem, CartItem } from '@/types';
import {
  ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft,
  Sparkles, Bookmark, List, ShoppingBag
} from 'lucide-react';

const CartModal = dynamic(() => import('@/components/checkout/CartModal').then(m => m.CartModal), { ssr: false });
const SearchModal = dynamic(() => import('@/components/modals/SearchModal').then(m => m.SearchModal), { ssr: false });
const LeaderboardModal = dynamic(() => import('@/components/modals/LeaderboardModal').then(m => m.LeaderboardModal), { ssr: false });
const SubmitReportModal = dynamic(() => import('@/components/modals/SubmitReportModal').then(m => m.SubmitReportModal), { ssr: false });

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = String(context.params?.slug || '');
  let initialCompany: Company | null = null;
  try {
    const res = await fetch(`${API_BASE_URL}/companies/${slug}`);
    if (res.ok) initialCompany = await res.json();
  } catch {
    // Backend offline at SSR time — the client effect below retries.
  }
  return { props: { initialCompany, initialSlug: slug } };
};

export default function CompanyVaultPage({ initialCompany, initialSlug }: { initialCompany: Company | null; initialSlug: string }) {
  const router = useRouter();
  const { slug } = router.query;

  const [company, setCompany] = useState<Company | null>(initialCompany);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [activeRoundTab, setActiveRoundTab] = useState<'all' | RoundType>('all');

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ContentModule | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [activeReaderTab, setActiveReaderTab] = useState<'content' | 'discussion'>('content');
  const [discussionCount, setDiscussionCount] = useState(0);

  const [solvedItemIds, setSolvedItemIds] = useState<string[]>([]);
  const [bookmarkedItemIds, setBookmarkedItemIds] = useState<string[]>([]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isSubmitReportOpen, setIsSubmitReportOpen] = useState(false);
  const [loading, setLoading] = useState(!initialCompany);
  const [reportTick, setReportTick] = useState(0);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [readerSection, setReaderSection] = useState<'overview' | 'pdfs'>('overview');

  useEffect(() => {
    fetchCompanies().then(data => { if (data?.length > 0) setAllCompanies(data); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Refresh-safe: keep whatever the user was reading (??m / ??q in the URL)
  // so a reload lands on the same module or question instead of the catalog.
  useEffect(() => {
    if (!company) return;
    const items: ContentItem[] = (company.modules || []).flatMap((mod: ContentModule) => mod.items || []);
    const q = router.query.q;
    const m = router.query.m;
    if (q) {
      const item = items.find(i => i.id === q);
      if (item) { setSelectedItem(item); setActiveReaderTab('content'); return; }
    }
    if (m) {
      const mod = (company.modules || []).find(x => x.id === m);
      if (mod) setSelectedModule(mod);
    }
  }, [company]);

  const loadedSlugRef = useRef(initialSlug);
  useEffect(() => {
    if (!slug) return;
    const key = String(slug);
    // Already have data for this vault (from SSR or an earlier fetch) — skip.
    if (loadedSlugRef.current === key && company) {
      setLoading(false);
      return;
    }
    loadedSlugRef.current = key;
    let cancelled = false;
    fetchCompanyBySlug(key).then(data => {
      if (cancelled) return;
      setCompany(data);
      if (data.is_unlocked) setIsUnlocked(true);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, company]);

  if (!company) {
    return (
      <div
        className="min-h-screen bg-[var(--bg-app)] text-[var(--text-body)] flex flex-col"
        style={{ fontFamily: "'Calibre', 'Calibri', 'Inter', -apple-system, sans-serif" }}
      >
        <Header cartCount={0} onOpenCart={() => {}} onOpenSearch={() => {}} onOpenLeaderboard={() => {}} />
        <main className="flex-1 flex items-center justify-center py-24">
          <p className="text-sm text-[var(--text-muted)] animate-pulse">Loading vault...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const modules = company.modules || [];

  const featuredFree = modules.find(m => !m.is_premium || m.price === 0) || modules[0];
  const premiumModules = modules.filter(m => m.id !== featuredFree?.id && (m.is_premium || (m.price && m.price > 0)));
  const filteredPremium = activeRoundTab === 'all'
    ? premiumModules
    : premiumModules.filter(m => m.round_type === activeRoundTab);

  const allItems: ContentItem[] = modules.flatMap(m => m.items || []);
  const currentIdx = selectedItem ? allItems.findIndex(i => i.id === selectedItem.id) : -1;
  const prevItem = currentIdx > 0 ? allItems[currentIdx - 1] : null;
  const nextItem = currentIdx >= 0 && currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null;

  // Per-module ownership: a user can own the whole vault (isUnlocked) or just
  // the specific modules they bought. Owned == readable == not re-buyable.
  const ownedModuleIds = company.owned_module_ids || [];
  const isModuleOwned = (mod: ContentModule) => isUnlocked || mod.is_premium !== true || ownedModuleIds.includes(mod.id);
  const remainingPremium = premiumModules.filter(m => !ownedModuleIds.includes(m.id));
  const remainingPrice = remainingPremium.length > 0 ? packPrice(remainingPremium.length) : 0;
  // Fully owned = whole vault bought, OR every premium round individually owned
  // (in which case the buy CTA must vanish instead of asking to re-buy ₹249).
  const vaultComplete = isUnlocked || remainingPremium.length === 0;

  const moduleOfItem = (item: ContentItem) =>
    modules.find(mod => (mod.items || []).some(i => i.id === item.id));
  const isItemUnlocked = (item: ContentItem) =>
    isUnlocked || item.is_free_preview || ownedModuleIds.includes(moduleOfItem(item)?.id || '');

  // URL-syncs the open module (??m) / question (??q) so refresh keeps the page.
  const pushState = (m?: string | null, q?: string | null) => {
    const next: Record<string, string> = { slug: Array.isArray(slug) ? slug[0] : String(slug) };
    if (m) next.m = m;
    if (q) next.q = q;
    router.replace({ query: next }, undefined, { shallow: true });
  };

  const openModule = (mod: ContentModule, section: 'overview' | 'pdfs' = 'overview') => {
    setReaderSection(section);
    setSelectedModule(mod);
    pushState(mod.id);
  };

  const handleToggleSolve = (id: string) =>
    setSolvedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleToggleBookmark = (id: string) =>
    setBookmarkedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleUnlockClick = () => {
    if (remainingPremium.length === 0) return;
    addToCart([completePackItem()], true);
  };

  const completePackItem = (): CompanyModuleItem => ({
    kind: 'company',
    id: company.id,
    slug: company.slug,
    name: company.name,
    logo_url: company.logo_url,
    module_ids: remainingPremium.map(m => m.id),
    module_count: remainingPremium.length || 1,
    price: remainingPrice || 99,
  });

  const moduleLineItem = (mod: ContentModule): CompanyModuleItem => ({
    kind: 'company',
    id: company.id,
    slug: company.slug,
    name: company.name,
    logo_url: company.logo_url,
    module_id: mod.id,
    module_title: mod.title,
    round_type: mod.round_type,
    module_count: 1,
    price: 99,
  });

  const cartKey = (item: CartItem): string =>
    'module_id' in item ? `m:${item.module_id}` :
    'module_ids' in item ? `p:${item.module_ids?.join('+')}` :
    'slug' in item ? `c:${item.slug}` :
    `z:${(item as PricingPlan).id}`;

  const addToCart = (newItems: CartItem[], open = false) => {
    setCartItems(prev => {
      const merged = [...prev];
      newItems.forEach(item => {
        const key = cartKey(item);
        if (merged.some(p => cartKey(p) === key)) return;
        merged.push(item);
      });
      // A Complete Pack already includes its member round modules — drop those
      // redundant single lines so the cart count matches the combo pricing.
      const packs = merged.filter((it): it is CompanyModuleItem => {
        const ids = (it as CompanyModuleItem).module_ids;
        return Array.isArray(ids) && ids.length > 0;
      });
      return merged.filter((existing) => {
        if (!('module_id' in existing)) return true;
        const single = existing as CompanyModuleItem;
        const coveringPack = packs.find(p =>
          p.id === single.id &&
          Array.isArray(p.module_ids) &&
          (p.module_ids as string[]).includes(single.module_id as string));
        return !coveringPack;
      });
    });
    if (open) setIsCartOpen(true);
  };

  const handleAddModuleToCart = (mod: ContentModule) => {
    if (isModuleOwned(mod)) return;
    addToCart([moduleLineItem(mod)], true);
  };
  const handleAddCompletePack = () => {
    if (remainingPremium.length === 0) return;
    addToCart([completePackItem()], true);
  };

  const selectItem = (item: ContentItem) => {
    setSelectedItem(item);
    setActiveReaderTab('content');
    setMobileTreeOpen(false);
    pushState(null, item.id);
    // scroll to top of article on mobile
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <title>{company.seo_title || `${company.name} Interview Questions 2026 | TieEdu`}</title>
        <meta name="description" content={company.seo_description || ''} />
      </Head>

      <div
        className="min-h-screen bg-[var(--bg-app)] text-[var(--text-body)] flex flex-col"
        style={{ fontFamily: "'Calibre', 'Calibri', 'Inter', -apple-system, sans-serif" }}
      >
        <Header
          cartCount={cartItems.length}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        />

        {selectedModule ? (
          <CompanyModuleReader
            module={selectedModule}
            companyName={company.name}
            companySlug={company.slug}
            isUnlocked={isUnlocked}
            isModuleUnlocked={isModuleOwned(selectedModule)}
            allModules={modules}
            onSwitchModule={mod => { setSelectedModule(mod); pushState(mod.id); }}
            onBack={() => { setSelectedModule(null); pushState(); }}
            onUnlockClick={handleUnlockClick}
            initialSection={readerSection}
          />
        ) : selectedItem ? (
          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 'calc(100vh - 56px)' }}>

            {/* LEFT: Desktop Sticky Sidebar */}
            <IntelligenceTreeSidebar
              modules={modules}
              selectedItem={selectedItem}
              solvedItemIds={solvedItemIds}
              isUnlocked={isUnlocked}
              onSelectItem={selectItem}
              onBackToModules={() => { setSelectedItem(null); pushState(); }}
              companyName={company.name}
            />

            {/* Mobile Sidebar Drawer */}
            <MobileSidebarDrawer
              isOpen={mobileTreeOpen}
              onClose={() => setMobileTreeOpen(false)}
              modules={modules}
              selectedItem={selectedItem}
              solvedItemIds={solvedItemIds}
              isUnlocked={isUnlocked}
              onSelectItem={selectItem}
              onBackToModules={() => { setSelectedItem(null); pushState(); }}
              companyName={company.name}
            />

            {/* CENTER: Article canvas — scrollable */}
            <main className="flex-1 overflow-y-auto bg-white">
              <div
                className="mx-auto px-4 sm:px-8 py-8 pb-20 animate-fade-in"
                style={{ maxWidth: 'var(--max-article)' }}
              >
                {/* Mobile: floating "Topics" button */}
                <button
                  onClick={() => setMobileTreeOpen(true)}
                  className="reader-sidebar-mobile-btn mb-5 inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-[var(--border-subtle)] rounded-lg text-sm font-semibold text-[var(--text-heading)] shadow-sm hover:border-gray-300 transition-colors"
                >
                  <List className="w-4 h-4 text-[var(--brand-accent)]" />
                  Topics
                </button>

                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] mb-4">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="hover:text-[var(--brand-primary)] transition-colors"
                  >
                    {company.name}
                  </button>
                  <span>/</span>
                  <span className="text-[var(--text-body)] truncate max-w-[240px]">
                    {selectedItem.question_text}
                  </span>
                </div>

                {/* Badge row */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                    selectedItem.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                    selectedItem.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {selectedItem.difficulty}
                  </span>
                  {selectedItem.role_tag && (
                    <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide bg-[#1F3A5F]/8 text-[#1F3A5F]">
                      {selectedItem.role_tag}
                    </span>
                  )}
                  {selectedItem.frequency_tag === 'high' && (
                    <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
                      Asked Often
                    </span>
                  )}
                  {(selectedItem.is_free_preview || isItemUnlocked(selectedItem)) && (
                    <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                      Free Preview
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-[22px] sm:text-[27px] font-bold text-[#111] leading-[1.25] mb-5">
                  {selectedItem.question_text}
                </h1>

                {/* Tab bar + Actions */}
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] mb-6">
                  <div className="flex items-center gap-0">
                    {(['content', 'discussion'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveReaderTab(tab)}
                        className={`px-1 pb-2.5 mr-6 text-[13.5px] font-semibold border-b-2 transition-all capitalize ${
                          activeReaderTab === tab
                            ? 'border-[var(--brand-accent)] text-[var(--brand-primary)]'
                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-body)]'
                        }`}
                      >
                        {tab === 'discussion' ? `Discussion (${discussionCount})` : 'Solution'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pb-2">
                    <button
                      onClick={() => handleToggleSolve(selectedItem.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                        solvedItemIds.includes(selectedItem.id)
                          ? 'bg-emerald-700 text-white border-emerald-600'
                          : 'bg-white text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-gray-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {solvedItemIds.includes(selectedItem.id) ? 'Done' : 'Mark done'}
                    </button>

                    <button
                      onClick={() => handleToggleBookmark(selectedItem.id)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        bookmarkedItemIds.includes(selectedItem.id)
                          ? 'bg-amber-100 text-amber-600 border-amber-200'
                          : 'bg-white text-gray-400 border-[var(--border-subtle)] hover:border-gray-300'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${bookmarkedItemIds.includes(selectedItem.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Article body */}
                <div className="space-y-1">
                  {activeReaderTab === 'content' ? (
                    selectedItem.blocks && selectedItem.blocks.length > 0 ? (
                      selectedItem.blocks
                        .sort((a, b) => a.block_order - b.block_order)
                        .map(block => (
                          <ContentBlockRenderer
                            key={block.id}
                            block={block}
                            isLocked={!isItemUnlocked(selectedItem)}
                            companyName={company.name}
                            onUnlockClick={handleUnlockClick}
                          />
                        ))
                    ) : (
                      <div className="py-16 text-center text-[var(--text-muted)] text-sm">
                        Content coming soon.
                      </div>
                    )
                  ) : (
                    <QuestionDiscussion itemId={selectedItem.id} onCountChange={setDiscussionCount} />
                  )}
                </div>

                {/* Prev / Next */}
                <div className="flex items-center justify-between pt-10 mt-8 border-t border-[var(--border-subtle)]">
                  {prevItem ? (
                    <button
                      onClick={() => selectItem(prevItem)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[var(--border-subtle)] hover:border-gray-300 text-[13px] font-semibold text-[var(--text-heading)] rounded-xl transition-all max-w-[45%]"
                    >
                      <ChevronLeft className="w-4 h-4 text-[var(--brand-accent)] shrink-0" />
                      <span className="truncate">{prevItem.question_text}</span>
                    </button>
                  ) : <div />}

                  {nextItem ? (
                    <button
                      onClick={() => selectItem(nextItem)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-[13px] font-semibold rounded-xl transition-all max-w-[45%]"
                    >
                      <span className="truncate">{nextItem.question_text}</span>
                      <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" />
                    </button>
                  ) : <div />}
                </div>

              </div>
            </main>
          </div>

        ) : (
          /* ========================================================
              CATALOG MODE — List of modules & questions (Full Width)
              ======================================================== */
          <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-8 pb-24 space-y-8">

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
              <Link href="/" className="hover:text-[var(--brand-primary)] flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Companies
              </Link>
              <span>/</span>
              <span className="text-[var(--text-heading)] font-semibold">{company.name}</span>
            </div>

            {/* Hero */}
            <CompanyOverviewHeader
              company={company}
              activeRoundTab={activeRoundTab}
              onSelectRoundTab={setActiveRoundTab}
              onUnlockClick={handleUnlockClick}
              isUnlocked={vaultComplete}
              unlockPrice={remainingPrice || 249}
            />

            <TrustBadgeBar trustStats={company.trust_stats} companyName={company.name} />

            {/* FEATURED: FREE 7-Section Pack — the single big free module */}
            {featuredFree && (
              <FeaturedFreeModuleCard
                module={featuredFree}
                companyName={company.name}
                onOpenModule={() => openModule(featuredFree)}
                onOpenPdf={() => openModule(featuredFree, 'pdfs')}
                onUnlockClick={handleUnlockClick}
                isUnlocked={vaultComplete}
                unlockPrice={remainingPrice || 249}
              />
            )}

            {/* PREMIUM MODULES — grid below, filtered by active round */}
            {premiumModules.length > 0 && (
<section id="premium-modules" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-heading)]">Premium Modules</h2>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">
                    Finished the free pack? Unlock the round you are preparing for.
                  </p>
                </div>
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    {(['all', 'OA', 'Technical', 'SystemDesign', 'HR'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setActiveRoundTab(r)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          activeRoundTab === r
                            ? 'bg-[var(--brand-primary)] text-white'
                            : 'bg-[#F4F4F2] text-[var(--text-muted)] hover:bg-gray-200'
                        }`}
                      >
                        {r === 'all' ? 'All Rounds' : r}
                      </button>
                    ))}
                  </div>
                </div>

                {remainingPremium.length > 0 && (
                <CompletePackBanner
                  companyName={company.name}
                  premiumCount={premiumModules.length}
                  ownedCount={premiumModules.filter(m => ownedModuleIds.includes(m.id)).length}
                  remainingPrice={remainingPrice}
                  onAddCompletePack={handleAddCompletePack}
                  isUnlocked={isUnlocked}
                  onBrowseModules={() => document.getElementById('premium-modules')?.scrollIntoView({ behavior: 'smooth' })}
                />
              )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPremium.map(mod => (
                    <PremiumModuleCard
                      key={mod.id}
                      module={mod}
                      companyName={company.name}
                      isUnlocked={isUnlocked}
                      isOwned={isModuleOwned(mod)}
                      solvedCount={(mod.items || []).filter(i => solvedItemIds.includes(i.id)).length}
                      bookmarkedCount={(mod.items || []).filter(i => bookmarkedItemIds.includes(i.id)).length}
                      onAddToCart={handleAddModuleToCart}
                      onPreview={() => openModule(mod)}
                      onOpenPdf={mod.pdf ? () => openModule(mod, 'pdfs') : undefined}
                    />
                  ))}
                </div>

                {filteredPremium.length === 0 && (
                  <p className="text-sm text-center text-[var(--text-muted)] py-8 bg-white border border-[var(--border-subtle)] rounded-2xl">
                    No premium modules for this round yet.
                  </p>
                )}
              </section>
            )}

            {/* Interview Experiences */}
            <section className="bg-white border border-[var(--border-subtle)] rounded-2xl p-6">
              <h2 className="text-[15px] font-bold text-[var(--text-heading)] mb-1">Candidate Experiences</h2>
              <p className="text-[12px] text-[var(--text-muted)] mb-5">Verified drive logs & candid Q&A</p>
              <InterviewExperiences
                key={`exp-${reportTick}`}
                companyName={company.name}
                companyId={company.id}
                onShare={() => setIsSubmitReportOpen(true)}
              />
            </section>

            <RelatedVaults currentCompanySlug={company.slug} companies={allCompanies} />
          </main>
        )}

        {/* ================================================
            STICKY UNLOCK BAR (only when locked)
            ================================================ */}
        {!isUnlocked && remainingPremium.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--brand-primary)] border-t border-white/10 text-white px-4 pt-3 safe-bottom shadow-2xl">
            <div className="max-w-[1100px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug">
                  {ownedModuleIds.length > 0
                    ? `Finish ${company.name} prep — ${remainingPremium.length} round${remainingPremium.length === 1 ? '' : 's'} left`
                    : `Unlock full ${company.name} preparation pack`}
                  <span className="ml-2 bg-[var(--brand-accent)] text-[#241A06] text-[11px] font-bold px-2 py-0.5 rounded">₹{remainingPrice}</span>
                </p>
                <p className="text-[11px] text-white/90 mt-1 truncate">
                  {cartItems.length > 0
                    ? `${company.name}: ${cartItems.length} item${cartItems.length === 1 ? '' : 's'} in cart · combo savings apply`
                    : ownedModuleIds.length > 0
                      ? 'Buy the remaining rounds at the combo pack price — no re-purchasing what you already own.'
                      : '45+ verified questions · code solutions · system design guides'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {cartItems.length > 0 && (
                  <span className="hidden xs:inline-flex items-center min-w-[2rem] h-7 px-2 rounded-full bg-white/15 text-white text-[11px] font-bold border border-white/20" title="Items in cart">
                    <ShoppingBag className="w-3.5 h-3.5 mr-1" />{cartItems.length}
                  </span>
                )}
                <button
                  onClick={() => (cartItems.length > 0 ? setIsCartOpen(true) : handleUnlockClick())}
                  className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 sm:px-6 py-2.5 bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[#241A06] text-[13px] sm:text-sm font-bold rounded-xl transition-colors"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{cartItems.length > 0 ? 'Checkout →' : 'Unlock Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}
        <CartModal
          isOpen={isCartOpen}
          items={cartItems}
          companyName={company.name}
          missingModules={premiumModules.filter(m => !isModuleOwned(m) && !cartItems.some(i => {
            if ('module_id' in i && i.module_id === m.id) return true;
            const ids = (i as CompanyModuleItem).module_ids;
            return Array.isArray(ids) && ids.includes(m.id);
          }))}
          onClose={() => setIsCartOpen(false)}
          onRemoveItem={idx => setCartItems(cartItems.filter((_, i) => i !== idx))}
          onAddModules={mods => addToCart(mods.filter(m => !isModuleOwned(m)).map(moduleLineItem), true)}
          onAddCompletePack={handleAddCompletePack}
          suggestedCompanies={allCompanies.filter(c => c.slug !== company.slug).slice(0, 3)}
          onAddCompany={c => {
            const ids = (c.premium_module_ids || []).slice();
            const count = ids.length || c.premium_module_count || 1;
            addToCart([{ kind: 'company', id: c.id, slug: c.slug, name: c.name, logo_url: c.logo_url, module_ids: ids, module_count: count, price: packPrice(count) }], true);
          }}
          onCheckoutSuccess={() => { setIsUnlocked(true); setIsCartOpen(false); }}
        />
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
        <SubmitReportModal
          isOpen={isSubmitReportOpen}
          companyName={company.name}
          companyId={company.id}
          onSubmitted={() => setReportTick(t => t + 1)}
          onClose={() => setIsSubmitReportOpen(false)}
        />

        <Footer />
      </div>
    </>
  );
}
