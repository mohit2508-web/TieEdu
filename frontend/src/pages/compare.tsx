import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/layout/Footer';
import { SubmitReportModal } from '@/components/modals/SubmitReportModal';
import { fetchCompanies, fetchComparisonMatrix } from '@/lib/api';
import { useCart, useCartScope, isCompanyCartLine } from '@/context/CartContext';
import { useShell } from '@/context/ShellContext';
import { packPrice } from '@/lib/packPricing';
import type { Company, CompanyModuleItem, CompareCompany, ComparisonMatrix } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import { CompareMatrixTable, CompareColumnHeader } from '@/components/compare/CompareMatrixTable';
import { CompareCompanyCards } from '@/components/compare/CompareCompanyCards';
import { MatrixLegend } from '@/components/compare/CompanyActions';
import { ROW_GROUPS, buildRoundRows } from '@/components/compare/comparisonRows';
import {
  ArrowLeft, ChevronDown, Scale, Info, RefreshCw, ShieldCheck, X,
} from 'lucide-react';


const MAX_COLUMNS = 4;

/**
 * Side-by-side company comparison.
 *
 * Every metric on this page is served by GET /companies/compare, which derives it
 * from the live ledger (backend/src/lib/compare.ts). This page renders and
 * navigates — it never computes a company fact, and never invents a round,
 * a question or a verification claim.
 */
export default function ComparePage() {
  const { add, items, clear } = useCart();
  const { openOverlay } = useShell();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [matrix, setMatrix] = useState<ComparisonMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [matrixError, setMatrixError] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>('');
  const [picking, setPicking] = useState(false);

  /*
   * The order is placed and owned by the server from here, so the local lines
   * are dropped — otherwise the badge keeps counting purchases that are already
   * paid for. Registered on the shared drawer rather than owned by this page,
   * which is why the cart can now be emptied from any route.
   */
  useCartScope(useMemo(() => ({ onCheckoutSuccess: clear }), [clear]));

  const [reportCompany, setReportCompany] = useState<{ id: string; name: string } | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  // ---- Load the picker list, then seed a sensible default selection ----
  useEffect(() => {
    let active = true;
    fetchCompanies()
      .then((list) => {
        if (!active) return;
        const published = (list || []).filter((c) => c.status !== 'draft');
        setCompanies(published);
        setSlugs((prev) => (prev.length > 0 ? prev : published.slice(0, 3).map((c) => c.slug)));
      })
      .catch(() => { /* honest empty state below */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // ---- Fetch the derived matrix whenever the selection changes ----
  useEffect(() => {
    if (slugs.length === 0) return;
    let cancelled = false;
    setMatrixError(false);
    fetchComparisonMatrix(slugs)
      .then((m) => {
        if (cancelled) return;
        if (!m) { setMatrixError(true); return; }
        setMatrix(m);
        setActiveSlug((prev) => (m.companies.some((c) => c.slug === prev) ? prev : m.companies[0]?.slug || ''));
      })
      .catch(() => { if (!cancelled) setMatrixError(true); });
    return () => { cancelled = true; };
  }, [slugs]);

  const toggleSlug = useCallback((slug: string) => {
    setSlugs((prev) => {
      if (prev.includes(slug)) return prev.length > 1 ? prev.filter((s) => s !== slug) : prev;
      if (prev.length >= MAX_COLUMNS) return prev;
      return [...prev, slug];
    });
  }, []);

  /**
   * Unlock CTA — builds a proper module-scoped line with the EXACT rounds the
   * user does not own. Passing a bare Company here (the previous behaviour) made
   * CartModal bill the flat Rs 249 complete-pack price even for a 1-round vault.
   */
  const handleUnlock = useCallback(
    (c: CompareCompany, moduleIds: string[]) => {
      if (moduleIds.length === 0) return;
      const line: CompanyModuleItem = {
        kind: 'company',
        id: c.id,
        slug: c.slug,
        name: c.name,
        logo_url: c.logo_url,
        module_ids: moduleIds,
        module_count: moduleIds.length,
        price: packPrice(moduleIds.length),
      };
      add(line);
      openOverlay('cart');
    },
    [add, openOverlay]
  );

  /**
   * Which companies are already in the cart.
   *
   * This used to read a page-local array, so a company added on `/company/x`
   * showed no cart marker here even though the student had it. Reading the
   * shared cart means the marker and the badge can no longer disagree.
   *
   * The `kind` filter matters now that the cart is shared: `CourseCartItem`
   * also carries a `slug`, so keying on slug alone let a free course from
   * `/interview-course` light up a company's "in cart" pill on this page.
   */
  const cartKeys = useMemo(
    () => new Set(items.filter(isCompanyCartLine).map((i) => i.slug)),
    [items]
  );

  const roundRows = useMemo(() => (matrix ? buildRoundRows(matrix) : []), [matrix]);

  const totals = useMemo(() => {
    if (!matrix) return null;
    const cs = matrix.companies;
    return {
      vaults: cs.length,
      questions: cs.reduce((s, c) => s + c.derived.question_count, 0),
      reports: cs.reduce((s, c) => s + c.derived.published_report_count, 0),
      freeVaults: cs.filter((c) => c.premium_module_count === 0).length,
    };
  }, [matrix]);

  return (
    <>
      <Head>
        <title>Side-by-Side Company Comparison Matrix | TieEdu</title>
        <meta
          name="description"
          content="Compare vault size, hiring rounds, CTC, process duration and candidate-verified match accuracy across company interview vaults. Every count is derived live from real records."
        />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#FAFAF9]">

        <main className="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-[--text-muted] hover:text-[#1A1A1A] mb-5 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Company Directory
          </Link>

          {/* Hero */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-[#1F3A5F] border border-indigo-100 mb-3 shadow-sm">
                <Scale className="w-3.5 h-3.5 text-[#B45309]" />
                Comparison Matrix
              </div>
              <h1 className="font-serif-heading text-2xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-2 leading-tight">
                Compare Company Interview Vaults
              </h1>
              <p className="text-xs sm:text-sm text-[--text-muted] max-w-3xl leading-relaxed">
                Every count below is read from the database at the moment you load this page. Editorial figures such
                as CTC and difficulty only count as fact once an admin has recorded where they came from — anything
                without a source is labelled, not hidden and not dressed up.
              </p>
            </div>

            {totals && (
              <div className="bg-white rounded-xl border border-[#EDEDEB] shadow-sm shrink-0 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2 text-xs">
                <Stat2 label="Vaults" value={String(totals.vaults)} />
                <Stat2 label="Questions" value={String(totals.questions)} />
                <Stat2 label="Reports" value={String(totals.reports)} />
                <Stat2 label="Fully free" value={String(totals.freeVaults)} />
              </div>
            )}
          </div>

          {/* Methodology disclosure */}
          {matrix && (
            <div className="mb-5">
              <button
                onClick={() => setShowMethodology((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#1F3A5F] hover:text-[#2A4D7E]"
              >
                <Info className="w-3.5 h-3.5" />
                How to read this matrix
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMethodology ? 'rotate-180' : ''}`} />
              </button>
              {showMethodology && (
                <ul className="mt-2 space-y-1.5 bg-white border border-[#EDEDEB] rounded-xl p-3.5 text-[11.5px] text-[#4A4A4A] leading-relaxed">
                  {matrix.methodology.map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-600 shrink-0">✓</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Company picker */}
          <div className="bg-white border border-[#EDEDEB] rounded-2xl shadow-sm p-3.5 sm:p-4 mb-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="text-[13px] font-extrabold text-[#1A1A1A]">Companies to compare</h2>
                <p className="text-[11px] text-[--text-muted] mt-0.5">
                  Pick up to {MAX_COLUMNS}. A round is only listed for a company whose vault actually has it.
                </p>
              </div>
              <button
                onClick={() => setPicking((v) => !v)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1F3A5F]/20 text-[12px] font-bold text-[#1F3A5F] hover:bg-[#1F3A5F]/5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {picking ? 'Done' : 'Change'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {slugs.map((s) => {
                const c = companies.find((x) => x.slug === s);
                const cmp = matrix?.companies.find((x) => x.slug === s);
                return (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-[#1F3A5F] text-white text-[12px] font-semibold"
                  >
                    <BrandTile name={c?.name || s} src={c?.logo_url} className="w-4 h-4 rounded-full p-0" />
                    <span className="max-w-[120px] truncate">{c?.name || s}</span>
                    {cmp && cmp.premium_module_count === 0 && (
                      <span className="text-[9.5px] font-bold uppercase bg-emerald-400/25 text-emerald-100 px-1 rounded">
                        Free
                      </span>
                    )}
                    {slugs.length > 1 && (
                      <button
                        onClick={() => toggleSlug(s)}
                        aria-label={`Remove ${c?.name || s}`}
                        className="hover:text-amber-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>

            {picking && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 pt-3 border-t border-[#EDEDEB] max-h-64 overflow-y-auto">
                {companies.map((c) => {
                  const on = slugs.includes(c.slug);
                  const full = slugs.length >= MAX_COLUMNS && !on;
                  return (
                    <button
                      key={c.id}
                      disabled={full}
                      onClick={() => toggleSlug(c.slug)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors disabled:opacity-40 ${
                        on
                          ? 'border-[#1F3A5F] bg-[#1F3A5F]/5'
                          : 'border-[#EDEDEB] hover:border-[#1F3A5F]/40'
                      }`}
                    >
                      <BrandTile name={c.name} src={c.logo_url} className="w-6 h-6 rounded-lg p-0.5 shrink-0" />
                      <span className="text-[12px] font-semibold text-[#1A1A1A] truncate min-w-0">{c.name}</span>
                    </button>
                  );
                })}
                {companies.length === 0 && (
                  <p className="col-span-full text-[12px] text-[--text-muted] py-3 text-center">
                    No published company vaults available to compare.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-[--text-muted] text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading live vault data…
            </div>
          ) : matrixError ? (
            <div className="bg-white border border-[#EDEDEB] rounded-2xl p-10 text-center">
              <p className="text-sm font-bold text-[#1A1A1A] mb-1">Could not load the comparison</p>
              <p className="text-xs text-[--text-muted] mb-4">
                The comparison service did not respond. No fallback numbers are shown — that is the point.
              </p>
              <button
                onClick={() => setSlugs((s) => [...s])}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F3A5F] text-white text-xs font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : !matrix || matrix.companies.length === 0 ? (
            <div className="bg-white border border-[#EDEDEB] rounded-2xl p-10 text-center text-sm text-[--text-muted]">
              No published company vaults to compare yet.
            </div>
          ) : (
            <>
              <div className="mb-3">
                <MatrixLegend />
              </div>

              {/* Desktop matrix */}
              <div className="hidden lg:block space-y-3">
                <CompareColumnHeader matrix={matrix} />
                <CompareMatrixTable
                  matrix={matrix}
                  groups={ROW_GROUPS}
                  onUnlock={handleUnlock}
                  onSubmitReport={(c) => setReportCompany({ id: c.id, name: c.name })}
                  cartKeys={cartKeys}
                />
              </div>

              {/* Mobile cards — same rows, stacked, no horizontal scroll */}
              <div className="lg:hidden">
                <CompareCompanyCards
                  matrix={matrix}
                  groups={ROW_GROUPS}
                  activeSlug={activeSlug}
                  onActiveSlugChange={setActiveSlug}
                  onUnlock={handleUnlock}
                  onSubmitReport={(c) => setReportCompany({ id: c.id, name: c.name })}
                  cartKeys={cartKeys}
                />
                {roundRows.length > 0 && (
                  <p className="text-[11px] text-[--text-muted] text-center mt-4 px-4 leading-relaxed">
                    {roundRows.length} hiring round{roundRows.length === 1 ? '' : 's'} compared. Rounds a company
                    does not cover are marked &ldquo;Not in this vault&rdquo;.
                  </p>
                )}
              </div>
            </>
          )}
        </main>

        <Footer />

        <SubmitReportModal
          isOpen={!!reportCompany}
          companyName={reportCompany?.name || ''}
          companyId={reportCompany?.id || ''}
          onClose={() => setReportCompany(null)}
          onSubmitted={() => setReportCompany(null)}
        />
      </div>
    </>
  );
}

const Stat2: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-[10px] text-[--text-muted] font-mono uppercase block">{label}</span>
    <span className="font-bold text-[#1A1A1A] text-sm">{value}</span>
  </div>
);
