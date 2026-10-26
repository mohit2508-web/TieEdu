import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
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
import { useAuth } from '@/context/AuthContext';
import { useCart, useCartScope, cartLineModuleIds, isCompanyCartLine } from '@/context/CartContext';
import { useShell } from '@/context/ShellContext';
import dynamic from 'next/dynamic';
import { fetchCompanyBySlug, fetchCompanies } from '@/lib/api';
import { packPrice, SINGLE_MODULE_PRICE } from '@/lib/packPricing';
import { markVaultSeen } from '@/lib/briefingStore';
import { CompanyModuleReader } from '@/components/company/CompanyModuleReader';
import { VaultSkeleton } from '@/components/company/VaultSkeleton';
import { Company, PricingPlan, ContentItem, ContentModule, RoundType, CompanyModuleItem, CartItem } from '@/types';
import type { CpContent, CpRadarItem } from '@/types/companyPage';
import { fetchCompanyPage, serverApiBase } from '@/lib/companyPagesApi';
import { CompanyPageV2 } from '@/components/companyPage/CompanyPageV2';
import { CampusIntelCard } from '@/components/company/CampusIntelCard';
import { GuaranteeStrip } from '@/components/company/GuaranteeStrip';
import type { RoundOffer } from '@/components/companyPage/shared';
import { ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft, Bookmark, List, ShoppingBag } from 'lucide-react';

/*
 * The cart, the search palette, the leaderboard and the header are all mounted
 * once by `AppShell` now, so they are no longer `dynamic()` imports here. They
 * were dynamic purely because each page rendered its own copy behind an
 * `isOpen` flag; a single global instance is in the main bundle either way, and
 * deferring it would only delay the first open.
 */
const SubmitReportModal = dynamic(() => import('@/components/modals/SubmitReportModal').then(m => m.SubmitReportModal), { ssr: false });
const AuthRequiredModal = dynamic(() => import('@/components/modals/AuthRequiredModal').then(m => m.AuthRequiredModal), { ssr: false });
const FeedbackAdModal = dynamic(() => import('@/components/modals/FeedbackAdModal').then(m => m.FeedbackAdModal), { ssr: false });

// Short, honest round names for the pack banner. Derived from the vault's real
// modules — never a hardcoded OA/Technical/SD/HR row for a company that lacks them.
const ROUND_SHORT_LABEL: Record<string, string> = {
  OA: 'Online Assessment',
  Technical: 'Technical',
  SystemDesign: 'System Design',
  HR: 'HR & Behavioral',
  Managerial: 'Managerial',
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = String(context.params?.slug || '');
  let initialCompany: Company | null = null;
  // The redesigned page is opt-in per company: only a page an admin has
  // published AND switched on comes back here. Anything else — including the
  // lookup failing — renders the existing vault page unchanged.
  const api = serverApiBase();
  const [companyResult, pageResult] = await Promise.allSettled([
    fetch(`${api}/companies/${slug}`).then((res) => (res.ok ? res.json() : null)),
    fetchCompanyPage(slug, api),
  ]);
  if (companyResult.status === 'fulfilled') initialCompany = companyResult.value;
  const live = pageResult.status === 'fulfilled' && pageResult.value.enabled ? pageResult.value : null;
  return {
    props: {
      initialCompany,
      initialSlug: slug,
      initialPage: live?.page || null,
      initialRadar: live?.radar || [],
      packPriceCap: live?.pack_price_cap ?? null,
    },
  };
};

export default function CompanyVaultPage({
  initialCompany,
  initialSlug,
  initialPage = null,
  initialRadar,
  packPriceCap = null,
}: {
  initialCompany: Company | null;
  initialSlug: string;
  initialPage?: CpContent | null;
  initialRadar?: CpRadarItem[];
  /** A live company page's flat pack price; checkout applies the same cap server-side. */
  packPriceCap?: number | null;
}) {
  const router = useRouter();
  const { slug } = router.query;
  const { user, loading: authLoading } = useAuth();
  const { addMany, items } = useCart();
  const { openOverlay, setDrillTitle } = useShell();

  const [company, setCompany] = useState<Company | null>(initialCompany);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [activeRoundTab, setActiveRoundTab] = useState<'all' | RoundType>('all');

  const [isUnlocked, setIsUnlocked] = useState(false);  const [selectedModule, setSelectedModule] = useState<ContentModule | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [activeReaderTab, setActiveReaderTab] = useState<'content' | 'discussion'>('content');
  const [discussionCount, setDiscussionCount] = useState(0);

  const [solvedItemIds, setSolvedItemIds] = useState<string[]>([]);
  const [bookmarkedItemIds, setBookmarkedItemIds] = useState<string[]>([]);

  const [isSubmitReportOpen, setIsSubmitReportOpen] = useState(false);
  const [reportTick, setReportTick] = useState(0);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [readerSection, setReaderSection] = useState<'overview' | 'pdfs'>('overview');

  const [isAuthRequiredOpen, setIsAuthRequiredOpen] = useState(false);
  const [pendingModule, setPendingModule] = useState<{ mod: ContentModule; section: 'overview' | 'pdfs' } | null>(null);
  const [isFeedbackAdOpen, setIsFeedbackAdOpen] = useState(false);
  const moduleClickCountRef = useRef(0);

  useEffect(() => {
    // Deliberately does not touch any loading flag: the company list is a
    // different request from the vault itself, and it usually resolves first.
    // An earlier version cleared `loading` here, which meant the skeleton could
    // be torn down by the *list* arriving while the vault was still in flight.
    fetchCompanies().then(data => { if (data?.length > 0) setAllCompanies(data); }).catch(() => {});
  }, []);

  // Scroll to top when user opens a module or a specific question item.
  // Keyed on the ids, not the objects: the selection is replaced with a fresh
  // object identity on every fetch, which would scroll the reader to the top
  // every time the page revalidated underneath them. Reading the ids into
  // locals (rather than the objects) keeps the effect honest about what it
  // actually depends on.
  const selectedModuleId = selectedModule?.id;
  const selectedItemId = selectedItem?.id;
  useEffect(() => {
    if (typeof window !== 'undefined' && (selectedModuleId || selectedItemId)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [selectedModuleId, selectedItemId]);

  // Refresh-safe: keep whatever the user was reading (??m / ??q in the URL)
  // so a reload lands on the same module or question instead of the catalog.
  // The query values are named dependencies rather than `router.query` itself:
  // the router object is a new identity on every navigation, and depending on it
  // re-ran this on unrelated route changes.
  const { m: urlModuleId, q: urlItemId } = router.query;
  useEffect(() => {
    if (!company) return;
    if (!user && (urlModuleId || urlItemId)) {
      setIsAuthRequiredOpen(true);
      return;
    }
    const items: ContentItem[] = (company.modules || []).flatMap((mod: ContentModule) => mod.items || []);
    if (urlItemId) {
      const item = items.find(i => i.id === urlItemId);
      if (item) { setSelectedItem(item); setActiveReaderTab('content'); return; }
    }
    if (urlModuleId) {
      const mod = (company.modules || []).find(x => x.id === urlModuleId);
      if (mod) setSelectedModule(mod);
    }
  }, [company, user, urlModuleId, urlItemId]);

  const loadedSlugRef = useRef(initialSlug);
  /**
   * Bumped after a purchase so the vault refetches. The effect below is
   * deliberately guarded by `loadedSlugRef` to avoid a redundant fetch on first
   * paint, which means a plain re-run would early-return; the explicit reload
   * signal is what lets a completed checkout pull the new unlock state.
   */
  const [reloadTick, setReloadTick] = useState(0);
  const refetchVault = useCallback(() => setReloadTick((n) => n + 1), []);

  useEffect(() => {
    if (!slug) return;
    const key = String(slug);
    // Anonymous + fresh SSR data already in hand — skip the redundant client fetch.
    // Signed-in users refetch so per-user unlock/ownership state (Bearer token)
    // wins over the unauthenticated SSR snapshot.
    if (!reloadTick && !user && loadedSlugRef.current === key && company) {
      return;
    }
    loadedSlugRef.current = key;
    let cancelled = false;
    fetchCompanyBySlug(key).then(data => {
      if (cancelled) return;
      setCompany(data);
      if (data.is_unlocked) setIsUnlocked(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [slug, company, user, reloadTick]);

  const vaultUnlocked = isUnlocked || !!company?.is_unlocked;
  useEffect(() => {
    if (user?.id && company?.id && vaultUnlocked) markVaultSeen(company.id, user.id);
  }, [company?.id, vaultUnlocked, user?.id]);

  /*
   * Everything below is hooks and hook-only derivations, and it has to sit
   * ABOVE the `if (!company)` bail-out. `company` is null on the first render
   * (it arrives from the fetch), so anything registered after that early return
   * would change the hook count between renders — React tears down and rebuilds
   * its state, and the rules-of-hooks lint is right to reject it.
   *
   * This is also why the line-item factories are `useCallback` and the module
   * lists are `useMemo`. `useCartScope` re-registers whenever its argument is a
   * new object, so an unstable `cartScope` would `setScope` -> rerender ->
   * rebuild the object -> `setScope` again, forever.
   */
  const modules = useMemo(() => company?.modules || [], [company]);
  const ownedModuleIds = useMemo(() => company?.owned_module_ids || [], [company]);
  const premiumModules = useMemo(() => modules.filter(m => m.is_premium === true), [modules]);

  // A module is "owned" if the whole vault is unlocked, or it is genuinely not
  // premium, or it was bought on its own. Owned == readable == not re-buyable.
  const isModuleOwned = useCallback(
    (mod: ContentModule) => isUnlocked || mod.is_premium !== true || ownedModuleIds.includes(mod.id),
    [isUnlocked, ownedModuleIds]
  );

  const remainingPremium = useMemo(
    () => premiumModules.filter(m => !ownedModuleIds.includes(m.id)),
    [premiumModules, ownedModuleIds]
  );

  const completePackItem = useCallback((): CompanyModuleItem => {
    if (!company) throw new Error('completePackItem called before the vault loaded');
    return {
      kind: 'company',
      id: company.id,
      slug: company.slug,
      name: company.name,
      logo_url: company.logo_url,
      module_ids: remainingPremium.map(m => m.id),
      module_count: remainingPremium.length || 1,
      price: packPrice(remainingPremium.length) || SINGLE_MODULE_PRICE,
    };
  }, [company, remainingPremium]);

  const moduleLineItem = useCallback((mod: ContentModule): CompanyModuleItem => {
    if (!company) throw new Error('moduleLineItem called before the vault loaded');
    return {
      kind: 'company',
      id: company.id,
      slug: company.slug,
      name: company.name,
      logo_url: company.logo_url,
      module_id: mod.id,
      module_title: mod.title,
      round_type: mod.round_type,
      module_count: 1,
      price: SINGLE_MODULE_PRICE,
    };
  }, [company]);

  /*
   * Add lines to the shared cart and optionally reveal the drawer.
   *
   * The dedupe and the "a pack already covers this round" cleanup live in
   * `CartContext.addMany`, because they are pricing rules: keeping them here
   * meant a pack added from `/compare` and a single round added here could both
   * survive and bill the same round twice.
   */
  const addToCart = useCallback((newItems: CartItem[], open = false) => {
    addMany(newItems);
    if (open) openOverlay('cart');
  }, [addMany, openOverlay]);

  const handleAddCompletePack = useCallback(() => {
    if (remainingPremium.length === 0) return;
    addToCart([completePackItem()], true);
  }, [remainingPremium.length, addToCart, completePackItem]);

  /**
   * Module ids the shared cart already covers, whether bought singly or in a pack.
   */
  const cartModuleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) for (const id of cartLineModuleIds(item)) ids.add(id);
    return ids;
  }, [items]);

  /**
   * How many lines belong to THIS vault.
   *
   * The hero used to read the page-local cart, which WAS the whole cart. Now that
   * the cart is shared, a raw count would let a student read
   * "Razorpay: 4 items in cart" when three of them belong to other companies —
   * with "combo savings apply" right beside it, describing a pack that is not
   * there.
   */
  const thisCompanyCartCount = useMemo(
    () => (company ? items.filter((i) => isCompanyCartLine(i) && i.id === company.id).length : 0),
    [items, company]
  );

  const cartScope = useMemo(
    () => ({
      companyName: company?.name || '',
      // A round already in the cart must not also be offered as "you are missing
      // this", or the drawer nags about something the student just added.
      missingModules: premiumModules.filter(m => !isModuleOwned(m) && !cartModuleIds.has(m.id)),
      onAddModules: (mods: ContentModule[]) =>
        addToCart(mods.filter(m => !isModuleOwned(m)).map(moduleLineItem), true),
      onAddCompletePack: handleAddCompletePack,
      suggestedCompanies: allCompanies.filter(c => c.slug !== company?.slug).slice(0, 3),
      onAddCompany: (c: Company) => {
        const ids = (c.premium_module_ids || []).slice();
        const count = ids.length || c.premium_module_count || 1;
        addToCart(
          [{
            kind: 'company' as const,
            id: c.id,
            slug: c.slug,
            name: c.name,
            logo_url: c.logo_url,
            module_ids: ids,
            module_count: count,
            price: packPrice(count),
          }],
          true
        );
      },
      // A purchase can be completed from any route, so unlocking is refetched
      // rather than patched — `is_unlocked` is the server's to grant.
      onCheckoutSuccess: () => {
        setIsUnlocked(true);
        refetchVault();
      },
    }),
    [
      company,
      premiumModules,
      isModuleOwned,
      cartModuleIds,
      addToCart,
      moduleLineItem,
      handleAddCompletePack,
      allCompanies,
      refetchVault,
    ]
  );

  useCartScope(cartScope);

  // The phone's back bar shows the company, not the generic "TieEdu" fallback
  // (no nav item owns /company/[slug]). Same hand-off as the course page.
  useEffect(() => {
    setDrillTitle(company?.name || null);
    return () => setDrillTitle(null);
  }, [company?.name, setDrillTitle]);

  /** Premium rounds still for sale on their own, for the redesigned page's route line. */
  const roundOffers = useMemo(() => {
    const out: Record<string, RoundOffer> = {};
    for (const m of premiumModules) {
      if (isModuleOwned(m)) continue;
      out[m.id] = { title: m.title, price: SINGLE_MODULE_PRICE, inCart: cartModuleIds.has(m.id) };
    }
    return out;
  }, [premiumModules, isModuleOwned, cartModuleIds]);

  if (!company) {
    /*
     * The skeleton is keyed on *not having the data*, not on a `loading` flag.
     *
     * That is a deliberate choice over a flag, and the reason is visible in the
     * code that used to be here. There was a `loading` state cleared by the
     * company-*list* request, and the vault skeleton briefly flashed then
     * vanished while the vault itself was still loading, leaving a blank page
     * for the rest of the fetch. Absence of data has no such race: the skeleton
     * is on screen exactly until there is something to replace it, and it also
     * covers the case where `getServerSideProps` returned nothing.
     */
    return (
      <div
        className="min-h-screen bg-[var(--bg-app)] text-[var(--text-body)] flex flex-col"
        style={{ fontFamily: "'Calibre', 'Calibri', 'Inter', -apple-system, sans-serif" }}
      >
        <VaultSkeleton />
        <Footer />
      </div>
    );
  }

  // A module is "free" only when it is genuinely not premium. Testing `price === 0`
  // here would let a zero-priced premium round hijack the free showcase slot and then
  // be filtered out of the sellable list, making it impossible to ever buy.
  const freeModules = modules.filter(m => m.is_premium !== true);
  const featuredFree = freeModules[0] || modules[0];
  const filteredPremium = activeRoundTab === 'all'
    ? premiumModules
    : premiumModules.filter(m => m.round_type === activeRoundTab);

  const allItems: ContentItem[] = modules.flatMap(m => m.items || []);
  const currentIdx = selectedItem ? allItems.findIndex(i => i.id === selectedItem.id) : -1;
  const prevItem = currentIdx > 0 ? allItems[currentIdx - 1] : null;
  const nextItem = currentIdx >= 0 && currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null;

  const remainingPrice = remainingPremium.length > 0 ? packPrice(remainingPremium.length) : 0;
  // Fully owned = whole vault bought, OR every premium round individually owned
  // (in which case the buy CTA must vanish instead of asking to re-buy ₹249).
  const vaultComplete = isUnlocked || remainingPremium.length === 0;

  // Redesigned page — only for a company whose admin published one and turned
  // it on. Guarded on the slug so a client-side hop between companies never
  // shows one company's page with another's data while the vault refetches.
  const cpPage = initialPage && company.slug === initialSlug ? initialPage : null;
  const cpTitle = cpPage ? String(cpPage.settings?.seo_title || '').replace(/\{company\}/g, company.name) : '';
  const cpDescription = cpPage ? String(cpPage.settings?.seo_description || '').replace(/\{company\}/g, company.name) : '';

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
    if (!user) {
      setPendingModule({ mod, section });
      setIsAuthRequiredOpen(true);
      return;
    }
    setReaderSection(section);
    setSelectedModule(mod);
    pushState(mod.id);

    moduleClickCountRef.current += 1;
    if (moduleClickCountRef.current % 3 === 0) {
      setIsFeedbackAdOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    if (pendingModule) {
      setReaderSection(pendingModule.section);
      setSelectedModule(pendingModule.mod);
      pushState(pendingModule.mod.id);
      setPendingModule(null);
    }
  };

  const handleToggleSolve = (id: string) =>
    setSolvedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleToggleBookmark = (id: string) =>
    setBookmarkedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleUnlockClick = () => {
    if (remainingPremium.length === 0) return;
    addToCart([completePackItem()], true);
  };

  const handleAddModuleToCart = (mod: ContentModule) => {
    if (isModuleOwned(mod)) return;
    addToCart([moduleLineItem(mod)], true);
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
        <title>{cpTitle || company.seo_title || `${company.name} Interview Questions 2026 | TieEdu`}</title>
        <meta name="description" content={cpDescription || company.seo_description || ''} />
      </Head>

      <div
        className="min-h-screen bg-[var(--bg-app)] text-[var(--text-body)] flex flex-col"
        style={{ fontFamily: "'Calibre', 'Calibri', 'Inter', -apple-system, sans-serif" }}
      >

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
            unlockPrice={remainingPrice || undefined}
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
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-4">
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
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                    selectedItem.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                    selectedItem.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {selectedItem.difficulty}
                  </span>
                  {selectedItem.role_tag && (
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-brand-ink/8 text-brand-ink">
                      {selectedItem.role_tag}
                    </span>
                  )}
                  {selectedItem.frequency_tag === 'high' && (
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
                      Asked Often
                    </span>
                  )}
                  {(selectedItem.is_free_preview || isItemUnlocked(selectedItem)) && (
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                      Free Preview
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-2xl font-bold text-heading leading-[1.25] mb-5">
                  {selectedItem.question_text}
                </h1>

                {/* Tab bar + Actions */}
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] mb-6">
                  <div className="flex items-center gap-0">
                    {(['content', 'discussion'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveReaderTab(tab)}
                        className={`px-1 pb-2.5 mr-6 text-sm font-semibold border-b-2 transition-all capitalize ${
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
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
                            unlockPrice={remainingPrice || undefined}
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
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[var(--border-subtle)] hover:border-gray-300 text-sm font-semibold text-[var(--text-heading)] rounded-xl transition-all max-w-[45%]"
                    >
                      <ChevronLeft className="w-4 h-4 text-[var(--brand-accent)] shrink-0" />
                      <span className="truncate">{prevItem.question_text}</span>
                    </button>
                  ) : <div />}

                  {nextItem ? (
                    <button
                      onClick={() => selectItem(nextItem)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold rounded-xl transition-all max-w-[45%]"
                    >
                      <span className="truncate">{nextItem.question_text}</span>
                      <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" />
                    </button>
                  ) : <div />}
                </div>

              </div>
            </main>
          </div>

        ) : cpPage ? (
          /* ========================================================
              REDESIGNED PAGE (Company Page Studio) — replaces only the
              catalog view; the reader, cart and modals are shared.
              ======================================================== */
          <CompanyPageV2
            content={cpPage}
            campusSlot={
              // empty:hidden — with nothing to show (signed out, guarantee off) the slot takes no space.
              <div className="space-y-4 pt-6 empty:hidden">
                {user && <CampusIntelCard slug={company.slug} company={company.name} />}
                <GuaranteeStrip />
              </div>
            }
            company={company}
            companies={allCompanies}
            packPrice={remainingPremium.length > 0 ? (packPriceCap ? Math.min(remainingPrice, packPriceCap) : remainingPrice) : null}
            packOwned={premiumModules.length > 0 && vaultComplete}
            onGetPack={() => {
              if (remainingPremium.length === 0) return;
              // The line carries the page's cap so the cart shows the price the
              // server will charge; the server reads the cap from its own copy.
              const item = completePackItem();
              addToCart([packPriceCap ? { ...item, price: Math.min(item.price, packPriceCap), pack_price_cap: packPriceCap } : item], true);
            }}
            // Not while auth is still restoring: the cached user appears before the
            // access token does, and a request in that gap 401s into a second
            // refresh that races the boot refresh for the single-use cookie.
            signedIn={!!user && !authLoading}
            onRequireAuth={() => setIsAuthRequiredOpen(true)}
            initialRadar={initialRadar}
            onOpenModule={(id) => {
              const mod = modules.find((m) => m.id === id);
              if (mod) openModule(mod);
            }}
            onPreview={featuredFree ? () => openModule(featuredFree) : undefined}
            onOpenItem={(itemId) => {
              const item = modules.flatMap((m) => m.items || []).find((it) => it.id === itemId);
              if (item) selectItem(item);
            }}
            onShareExperience={() => setIsSubmitReportOpen(true)}
            // Single-round buying, kept from the old layout: the same line item,
            // ownership rule and shared cart as "Add to cart" on a module card.
            roundOffers={roundOffers}
            onBuyModules={(ids) => {
              const mods = premiumModules.filter((m) => ids.includes(m.id) && !isModuleOwned(m));
              if (mods.length > 0) addToCart(mods.map(moduleLineItem), true);
            }}
            experiencesSlot={
              <InterviewExperiences
                key={`exp-${reportTick}`}
                companyName={company.name}
                companyId={company.id}
                onShare={() => setIsSubmitReportOpen(true)}
              />
            }
          />
        ) : (
          /* ========================================================
              CATALOG MODE — List of modules & questions (Full Width)
              ======================================================== */
          <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-8 pb-24 space-y-8">

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <Link href="/companies" className="hover:text-[var(--brand-primary)] flex items-center gap-1 transition-colors">
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
              unlockPrice={remainingPrice || undefined}
              remainingRounds={remainingPremium.length}
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
                unlockPrice={remainingPrice || undefined}
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
                            : 'bg-paper text-[var(--text-muted)] hover:bg-gray-200'
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
                  roundLabels={premiumModules
                    .filter(m => !ownedModuleIds.includes(m.id))
                    .map(m => ROUND_SHORT_LABEL[m.round_type || ''] || m.module_type.replace(/_/g, ' ') || 'Round')}
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
              <h2 className="text-base font-bold text-[var(--text-heading)] mb-1">Candidate Experiences</h2>
              <p className="text-xs text-[var(--text-muted)] mb-5">Interview experiences shared by candidates</p>
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
        {!cpPage && !isUnlocked && remainingPremium.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-brand-ink border-t border-white/10 text-white px-4 pt-3 safe-bottom shadow-2xl">
            <div className="max-w-[1100px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-white">
                  {ownedModuleIds.length > 0
                    ? `Finish ${company.name} prep — ${remainingPremium.length} round${remainingPremium.length === 1 ? '' : 's'} left`
                    : `Unlock full ${company.name} preparation pack`}
                  <span className="ml-2 bg-[var(--brand-accent)] text-money-ink text-xs font-bold px-2 py-0.5 rounded">₹{remainingPrice}</span>
                </p>
                <p className="text-xs text-white/80 mt-1 truncate">
                  {thisCompanyCartCount > 0
                    ? `${company.name}: ${thisCompanyCartCount} item${thisCompanyCartCount === 1 ? '' : 's'} in cart · combo savings apply`
                    : ownedModuleIds.length > 0
                      ? 'Buy the remaining rounds at the combo pack price — no re-purchasing what you already own.'
                      : (() => {
                          // The real count, not a slogan: questions in the rounds still to buy.
                          const n = remainingPremium.reduce((sum, m) => sum + (m.items || []).length, 0);
                          const r = remainingPremium.length;
                          return `${n} question${n === 1 ? '' : 's'} across ${r} round${r === 1 ? '' : 's'}`;
                        })()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {thisCompanyCartCount > 0 && (
                  <span className="inline-flex items-center min-w-[2rem] h-7 px-2 rounded-full bg-white/15 text-white text-xs font-bold border border-white/20" title="Items in cart for this vault">
                    <ShoppingBag className="w-3.5 h-3.5 mr-1" />{thisCompanyCartCount}
                  </span>
                )}
                <button
                  onClick={() => (thisCompanyCartCount > 0 ? openOverlay('cart') : handleUnlockClick())}
                  className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 sm:px-6 py-2.5 bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-money-ink text-sm sm:text-sm font-bold rounded-xl transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>{thisCompanyCartCount > 0 ? 'Checkout →' : 'Unlock Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}
        <SubmitReportModal
          isOpen={isSubmitReportOpen}
          companyName={company.name}
          companyId={company.id}
          onSubmitted={() => setReportTick(t => t + 1)}
          onClose={() => setIsSubmitReportOpen(false)}
        />
        <AuthRequiredModal
          isOpen={isAuthRequiredOpen}
          targetTitle={pendingModule?.mod.title}
          onClose={() => setIsAuthRequiredOpen(false)}
          onSuccess={handleAuthSuccess}
        />
        <FeedbackAdModal
          isOpen={isFeedbackAdOpen}
          companyName={company.name}
          onClose={() => setIsFeedbackAdOpen(false)}
          onOpenFeedbackForm={() => setIsSubmitReportOpen(true)}
        />

        <Footer />
      </div>
    </>
  );
}
