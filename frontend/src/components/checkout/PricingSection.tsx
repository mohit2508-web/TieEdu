import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PricingCatalog, RoundType } from '@/types';
import { fetchPricingCatalogApi } from '@/lib/api';
import {
  Check, Sparkles, ShieldCheck, LayoutGrid, ListTree, AlertTriangle, ArrowRight, FileText, BadgeCheck
} from 'lucide-react';

/**
 * Pricing is rendered from GET /api/pricing/catalog — the same packPrice() the
 * checkout charges with. This component deliberately contains NO price literals:
 * a hardcoded rupee value here is exactly how a portal ends up advertising a price
 * it will not honour. If the catalog cannot be loaded we say so instead of guessing.
 */

const ROUND_META: Record<RoundType, { label: string; cls: string; dot: string }> = {
  OA: { label: 'Online Assessment', cls: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-400' },
  Technical: { label: 'Technical Round', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  SystemDesign: { label: 'System Design', cls: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  HR: { label: 'HR Round', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Managerial: { label: 'Managerial', cls: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
};

const roundMeta = (r: RoundType | null) => (r ? ROUND_META[r] : null);

/*
 * Company logos in the pricing table.
 *
 * `size` is a Tailwind class, but `next/image` needs a number. The two call sites
 * use 44px and 32px, so the class is translated rather than the markup being
 * wrapped in a `fill` container — which would have meant adding a positioned
 * parent and a second element per logo for no benefit at these sizes.
 *
 * The number is not cosmetic: without an explicit width/height `next/image`
 * reserves no space and the row jumps as each logo arrives, which is the layout
 * shift this migration is supposed to reduce rather than add.
 */
const COMPANY_MARK_PX: Record<string, number> = { 'w-8 h-8': 32, 'w-11 h-11': 44 };
const pxFor = (size: string) => COMPANY_MARK_PX[size] ?? 44;

const CompanyMark: React.FC<{ name: string; logo_url?: string; size?: string }> = ({ name, logo_url, size = 'w-11 h-11' }) => {
  const px = pxFor(size);
  return logo_url ? (
    <Image
      src={logo_url}
      alt=""
      width={px}
      height={px}
      // A 44px logo is never rendered wider than 44px, so telling the optimizer
      // otherwise makes it serve a bigger file for no visible gain.
      sizes={`${px}px`}
      loading="lazy"
      className={`${size} rounded-xl object-contain bg-white border border-[#EDEDEB] shrink-0`}
    />
  ) : (
    <span className={`${size} rounded-xl bg-[#1F3A5F] text-white font-black text-sm flex items-center justify-center shrink-0`}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
};

export const PricingSection: React.FC = () => {
  const router = useRouter();
  const [catalog, setCatalog] = useState<PricingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<'company' | 'module'>('company');
  /*
   * The module-wise view flattens every company's rounds into one grid — on a
   * catalog with a few dozen vaults that is dozens of ₹ cards dumped on a
   * phone in one scroll. The first screen shows a slice; the rest is one tap
   * away, and the collapsed state is the default the landing page opens in.
   */
  const [showAllModules, setShowAllModules] = useState(false);
  const MODULE_PREVIEW = 6;

  useEffect(() => {
    let alive = true;
    fetchPricingCatalogApi().then((data) => {
      if (!alive) return;
      setCatalog(data);
      setFailed(!data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // Memoised because `catalog?.companies || []` allocates a fresh array on every
  // render while `catalog` is undefined, which made `companies` a new identity
  // each time and defeated the memo below entirely.
  const companies = useMemo(() => catalog?.companies ?? [], [catalog]);
  const moduleCount = useMemo(
    () => companies.reduce((sum, c) => sum + c.modules.length, 0),
    [companies]
  );
  const allModules = useMemo(
    () => companies.flatMap((c) => c.modules.map((m) => ({ company: c, module: m }))),
    [companies]
  );
  const visibleModules = showAllModules ? allModules : allModules.slice(0, MODULE_PREVIEW);

  const openVault = (slug: string, moduleId?: string) => {
    router.push(`/company/${slug}${moduleId ? `?m=${encodeURIComponent(moduleId)}` : ''}`);
  };

  return (
    <section id="pricing" className="py-16 border-t border-[#EDEDEB] bg-white">
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">

        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-[#1F3A5F] border border-indigo-100 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
            Server-Verified Pricing
          </span>
          <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3">
            Every Company. Every Round. The Real Price.
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            No subscriptions and no invented MRP. Every figure below is computed by the same
            pricing engine that charges your payment — pick a company or a single round.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-sm text-[var(--text-muted)]">Loading live pricing…</div>
        ) : failed || !catalog ? (
          <div className="max-w-xl mx-auto text-center rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto mb-3" />
            <h3 className="font-bold text-[#1A1A1A] mb-1.5">Pricing is temporarily unavailable</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              We will not show a price we cannot honour at checkout. Open any company vault to
              see its live pricing, or try again in a moment.
            </p>
            <Link
              href="/#companies"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-[#1F3A5F] hover:bg-[#2A4D7E] text-white text-xs font-semibold rounded-lg transition-all"
            >
              Browse company vaults <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* ===== THE LADDER — the actual pricing rule, straight from the server ===== */}
            <div className="rounded-2xl border border-[#EDEDEB] bg-[#FAFAF9] p-5 sm:p-6 mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="font-serif-heading font-bold text-base text-[#1A1A1A]">
                  The pricing rule
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Charged by the server at checkout
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {catalog.ladder.map((rung) => {
                  const listTotal = rung.module_count * catalog.single_module_price;
                  const save = Math.max(0, listTotal - rung.price);
                  const isTop = rung.module_count === catalog.complete_pack_count;
                  return (
                    <div
                      key={rung.module_count}
                      className={`rounded-xl p-4 border text-center ${
                        isTop ? 'bg-[#1F3A5F] border-[#1F3A5F] text-white' : 'bg-white border-[#EDEDEB]'
                      }`}
                    >
                      <div className={`text-[12px] font-bold uppercase tracking-wider mb-1.5 ${isTop ? 'text-amber-300' : 'text-[var(--text-muted)]'}`}>
                        {rung.module_count === 1
                          ? '1 round'
                          : rung.module_count === catalog.complete_pack_count
                            ? 'All rounds'
                            : `${rung.module_count} rounds`}
                      </div>
                      <div className={`font-serif-heading text-2xl font-black ${isTop ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        ₹{rung.price}
                      </div>
                      <div className={`text-[12px] mt-1 ${isTop ? 'text-sky-200/80' : 'text-[var(--text-muted)]'}`}>
                        {isTop ? 'Complete Pack' : save > 0 ? `saves ₹${save}` : 'one-time'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[12px] text-[var(--text-muted)] mt-4 leading-relaxed">
                A company pack unlocks <strong>every round of that company</strong> — rounds are how
                the pack is priced, not a promise of partial access. Coupons apply on top.
                Payments are verified manually by our team after your UPI transfer.
              </p>
            </div>

            {/* ===== COMPANY-WISE / MODULE-WISE ===== */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <button
                onClick={() => setView('company')}
                className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  view === 'company' ? 'bg-[#1F3A5F] text-white' : 'bg-[#F4F4F2] text-[var(--text-muted)] hover:bg-gray-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Company-wise ({companies.length})
              </button>
              <button
                onClick={() => setView('module')}
                className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  view === 'module' ? 'bg-[#1F3A5F] text-white' : 'bg-[#F4F4F2] text-[var(--text-muted)] hover:bg-gray-200'
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
                Module-wise ({moduleCount})
              </button>
            </div>

            {companies.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-muted)] py-12">
                No premium modules are published yet.
              </p>
            ) : view === 'company' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {companies.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-white border border-[#EDEDEB] hover:border-[#1F3A5F]/40 hover:shadow-md p-5 flex flex-col transition-all"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <CompanyMark name={c.name} logo_url={c.logo_url} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif-heading font-bold text-base text-[#1A1A1A] leading-tight truncate">
                          {c.name}
                        </h3>
                        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                          {c.premium_count} premium round{c.premium_count === 1 ? '' : 's'}
                          {c.industry ? ` · ${c.industry}` : ''}
                        </p>
                      </div>
                      {c.is_unlocked && (
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <BadgeCheck className="w-3 h-3" /> Owned
                        </span>
                      )}
                    </div>

                    {c.is_unlocked ? (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-serif-heading text-2xl font-black text-emerald-700">Unlocked</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-serif-heading text-3xl font-black text-[#1A1A1A]">₹{c.pack_price}</span>
                        {c.savings > 0 && (
                          <>
                            <span className="text-xs text-[var(--text-muted)] line-through">₹{c.list_total}</span>
                            <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                              {c.savings_percent}% OFF
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    <p className="text-[12px] text-[var(--text-muted)] mb-4">
                      {c.is_unlocked
                        ? 'All rounds of this vault are in your account.'
                        : c.savings > 0
                          ? `All ${c.premium_count} rounds · ₹${c.savings} less than buying them separately`
                          : c.premium_count === 1
                            ? 'Single round pack · one-time'
                            : `All ${c.premium_count} rounds · one-time`}
                    </p>

                    <ul className="space-y-1.5 mb-5 text-[12px] text-[#4A4A4A]">
                      {c.modules.slice(0, 4).map((m) => (
                        <li key={m.id} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#1E8E5A] shrink-0 mt-0.5" />
                          <span className="truncate">{m.title}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => openVault(c.slug)}
                      className={`mt-auto w-full min-h-[44px] py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                        c.is_unlocked
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-[#1F3A5F] hover:bg-[#2A4D7E] text-white'
                      }`}
                    >
                      {c.is_unlocked ? 'Open vault' : `View ${c.name} pricing`}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleModules.map(({ company: c, module: m }) => {
                  const rm = roundMeta(m.round_type);
                  return (
                      <div
                        key={`${c.id}-${m.id}`}
                        className="rounded-2xl bg-white border border-[#EDEDEB] hover:border-[#1F3A5F]/40 hover:shadow-md p-5 flex flex-col transition-all"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <CompanyMark name={c.name} logo_url={c.logo_url} size="w-8 h-8" />
                          <span className="text-[12px] font-bold text-[#1F3A5F] truncate">{c.name}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          {rm && (
                            <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-2 py-0.5 rounded-full border ${rm.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${rm.dot}`} />
                              {rm.label}
                            </span>
                          )}
                          {m.has_pdf && (
                            <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#E8F4FB] text-[#0271B5] border border-[#BFE0F5]">
                              <FileText className="w-3 h-3" /> PDF
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2">
                          {m.title}
                        </h3>
                        <p className="text-[12px] text-[var(--text-muted)] mb-4">
                          {m.item_count} question{m.item_count === 1 ? '' : 's'} · buy on its own
                        </p>

                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="font-serif-heading text-2xl font-black text-[#1A1A1A]">₹{m.price}</span>
                          <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                            One-Time
                          </span>
                        </div>

                        <button
                          onClick={() => openVault(c.slug, m.id)}
                          className="mt-auto w-full min-h-[44px] py-2.5 rounded-lg text-xs font-semibold bg-[#1F3A5F] hover:bg-[#2A4D7E] text-white transition-all shadow-sm"
                        >
                          Open in {c.name}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            {view === 'module' && !showAllModules && allModules.length > MODULE_PREVIEW && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllModules(true)}
                  className="btn btn-ghost min-h-[44px] px-6 py-3 text-sm focus-ring"
                >
                  Show all {allModules.length} pricing cards
                </button>
              </div>
            )}

            <p className="mt-8 text-center text-xs text-[var(--text-muted)] max-w-2xl mx-auto">
              Only companies that actually have premium modules are listed — we never advertise a
              pack price for a vault that has nothing to sell. Struck-through prices are the real
              cost of buying the identical rounds separately.
            </p>
          </>
        )}
      </div>
    </section>
  );
};
