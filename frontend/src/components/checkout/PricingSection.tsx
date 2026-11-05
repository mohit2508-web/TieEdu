import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CatalogCompany, PricingCatalog } from '@/types';
import { RadioCard } from '@/components/ui/RadioCard';
import { fetchPricingCatalogApi } from '@/lib/api';
import { Check, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { PackSalePrice } from '@/components/festival/SalePrice';
import { SINGLE_MODULE_PRICE as regularSingle } from '@/lib/packPricing';

/**
 * Pricing is rendered from GET /api/pricing/catalog — the same packPrice() the
 * checkout charges with. This component deliberately contains NO price literals:
 * a hardcoded rupee value here is exactly how a portal ends up advertising a price
 * it will not honour. If the catalog cannot be loaded we say so instead of guessing.
 */

/*
 * Warm Paper E13: one card for one company. Two radio cards (one round / the
 * whole pack), the price from the catalog, and an amber button into that
 * vault's checkout, which is where UPI payment actually happens. No coupon
 * badge and no testimonial: we only show a discount the server computed and
 * have no consented parent quote to print. The graph paper and blobs behind it
 * belong to the home page's wrapper, not to this card.
 */
const PackCard: React.FC<{ companies: CatalogCompany[]; onPay: (slug: string, moduleId?: string) => void }> = ({ companies, onPay }) => {
  const forSale = useMemo(() => companies.filter((c) => !c.is_unlocked && c.modules.length > 0), [companies]);
  const [companyId, setCompanyId] = useState('');
  const [plan, setPlan] = useState<'pack' | 'single'>('pack');
  const company = forSale.find((c) => c.id === companyId) ?? forSale[0];
  if (!company) return null;

  const cheapest = company.modules.reduce((a, b) => (b.price < a.price ? b : a));
  const hasPack = company.modules.length > 1;
  const choice = hasPack ? plan : 'single';
  const price = choice === 'pack' ? company.pack_price : cheapest.price;

  return (
    <div data-pack-card="">
      <div className="mx-auto max-w-md rounded-card border border-line bg-card p-5 shadow-[var(--shadow-pop)] sm:p-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Company</span>
          <select
            value={company.id}
            onChange={(e) => { setCompanyId(e.target.value); setPlan('pack'); }}
            className="focus-ring w-full min-h-[44px] rounded-cell border border-line bg-card px-3 font-display text-label text-heading"
          >
            {forSale.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <ul className="my-5 space-y-2 text-sm text-body">
          {company.modules.slice(0, 4).map((m) => (
            <li key={m.id} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              <span className="truncate">{m.title}</span>
            </li>
          ))}
          {company.modules.length > 4 && (
            <li className="pl-6 text-xs text-muted">+ {company.modules.length - 4} more round{company.modules.length - 4 === 1 ? '' : 's'}</li>
          )}
        </ul>

        <div role="radiogroup" aria-label="Choose a plan" className="space-y-2.5">
          {hasPack && (
            <RadioCard
              checked={choice === 'pack'}
              onSelect={() => setPlan('pack')}
              title={`All ${company.modules.length} rounds`}
              description={
                company.savings > 0 ? (
                  <>
                    <span className="text-xs font-bold uppercase text-amber-deep">Save {company.savings_percent}%</span>
                    <span className="ml-2 line-through">₹{company.list_total}</span>
                  </>
                ) : 'One-time'
              }
              aside={<PackSalePrice regular={company.pre_sale_price ?? company.pack_price} now={company.pack_price} className="font-display text-2xl font-bold" />}
            />
          )}
          <RadioCard
            checked={choice === 'single'}
            onSelect={() => setPlan('single')}
            title="One round"
            description={cheapest.title}
            aside={<PackSalePrice regular={regularSingle} now={cheapest.price} className="font-display text-2xl font-bold" />}
          />
        </div>

        <button
          type="button"
          onClick={() => onPay(company.slug, choice === 'single' ? cheapest.id : undefined)}
          className="btn btn-primary focus-ring mt-5 w-full min-h-[52px] text-base"
        >
          Pay ₹{price} with UPI <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <p className="mt-2 text-center text-xs text-muted">One-time payment · no subscription</p>

        <div className="mt-4 flex flex-col items-center gap-1.5 text-sm">
          <Link href="/today" className="text-link underline underline-offset-2">Ask a parent: share your parent link</Link>
          <Link href="/signup" className="text-muted underline underline-offset-2">Or start free first</Link>
        </div>
      </div>
    </div>
  );
};

export const PricingSection: React.FC = () => {
  const router = useRouter();
  const [catalog, setCatalog] = useState<PricingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

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

  const companies = useMemo(() => catalog?.companies ?? [], [catalog]);

  const openVault = (slug: string, moduleId?: string) => {
    router.push(`/company/${slug}${moduleId ? `?m=${encodeURIComponent(moduleId)}` : ''}`);
  };

  return (
    <section id="pricing" className="py-16">
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">

        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-brand-ink border border-indigo-100 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-deep" />
            Server-Verified Pricing
          </span>
          <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold text-heading mb-3">
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
            <h3 className="font-bold text-heading mb-1.5">Pricing is temporarily unavailable</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              We will not show a price we cannot honour at checkout. Open any company vault to
              see its live pricing, or try again in a moment.
            </p>
            <Link
              href="/companies"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-brand-ink hover:bg-brand-ink text-white text-xs font-semibold rounded-lg transition-all"
            >
              Browse company vaults <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : companies.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-muted)] py-12">
            No premium modules are published yet.
          </p>
        ) : (
          <PackCard companies={companies} onPay={openVault} />
        )}
      </div>
    </section>
  );
};
