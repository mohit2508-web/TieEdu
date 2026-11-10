import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { ArrowRight, ChevronRight, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { BrandTile } from '@/components/common/BrandTile';
import { serverApiBase } from '@/lib/companyPagesApi';

/**
 * "A vs B" comparison page (SEO_GROWTH_PLAN §5.2). Data and wording come from
 * both companies' fact-checked records (backend lib/companyCompare); this page
 * lays them out in the site's design and adds the search markup.
 */
interface Side { slug: string; name: string; short: string; logo_url: string }
interface Comparison {
  pair: string;
  a: Side;
  b: Side;
  title: string;
  h1: string;
  description: string;
  intro: string;
  verdict: string[];
  table: { head: string[]; rows: string[][] };
  updated: string | null;
  faq: Array<{ q: string; a: string }>;
}

const SITE = 'https://tieedu.in';

export default function ComparePairPage({ cmp }: { cmp: Comparison }) {
  const url = `${SITE}/compare/${cmp.pair}`;
  const updated = cmp.updated && Number.isFinite(Date.parse(cmp.updated))
    ? new Date(cmp.updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: cmp.title,
        description: cmp.description,
        url,
        ...(cmp.updated ? { dateModified: cmp.updated } : {}),
        author: { '@type': 'Organization', name: 'TiEEdu', url: SITE },
        publisher: { '@type': 'Organization', name: 'TiEEdu', logo: { '@type': 'ImageObject', url: `${SITE}/email/logo.png` } },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE}/compare` },
          { '@type': 'ListItem', position: 3, name: cmp.h1, item: url },
        ],
      },
      ...(cmp.faq.length
        ? [{ '@type': 'FAQPage', mainEntity: cmp.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }]
        : []),
    ],
  };

  return (
    <>
      <Head>
        <title>{`${cmp.title} | TiEEdu`}</title>
        <meta name="description" content={cmp.description.slice(0, 160)} />
        <link key="canonical" rel="canonical" href={url} />
        <meta property="og:title" content={cmp.title} key="og:title" />
        <meta property="og:description" content={cmp.description.slice(0, 200)} key="og:description" />
        <meta property="og:url" content={url} key="og:url" />
        <meta property="og:type" content="article" key="og:type" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </Head>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted">
          <Link href="/" className="hover:text-link">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <Link href="/compare" className="hover:text-link">Compare</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className="font-semibold text-heading">{cmp.h1}</span>
        </nav>

        <header className="mt-6">
          <div className="flex items-center gap-3">
            <BrandTile name={cmp.a.name} src={cmp.a.logo_url} className="h-12 w-12 rounded-2xl p-1" />
            <span className="font-display text-lg font-extrabold text-muted">vs</span>
            <BrandTile name={cmp.b.name} src={cmp.b.logo_url} className="h-12 w-12 rounded-2xl p-1" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-heading sm:text-4xl">{cmp.h1}</h1>
          <p className="mt-3 text-lg leading-relaxed text-body">{cmp.intro}</p>
          {updated && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <ShieldCheck className="h-4 w-4 text-[var(--color-success)]" aria-hidden /> Fact-checked {updated}
            </p>
          )}
        </header>

        <section aria-labelledby="verdict-h" className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-edge-neutral">
          <h2 id="verdict-h" className="font-display text-xl font-extrabold text-heading">The short answer</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base leading-7 text-body marker:text-[var(--brand-accent)]">
            {cmp.verdict.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        </section>

        <section aria-labelledby="table-h" className="mt-10">
          <h2 id="table-h" className="font-display text-2xl font-extrabold tracking-tight text-heading">Side by side</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-app">
                <tr>
                  {cmp.table.head.map((h, i) => <th key={i} className={`px-4 py-3 font-bold text-heading ${i === 0 ? 'w-40' : ''}`}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {cmp.table.rows.map((r) => (
                  <tr key={r[0]} className="border-t border-line align-top">
                    <th scope="row" className="px-4 py-3 font-semibold text-heading">{r[0]}</th>
                    <td className="px-4 py-3 text-body">{r[1]}</td>
                    <td className="px-4 py-3 text-body">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[cmp.a, cmp.b].map((s) => (
            <Link key={s.slug} href={`/company/${s.slug}`} className="group flex items-center justify-between rounded-3xl border border-line bg-card p-5 hover:border-[var(--brand-sky)]">
              <span className="flex items-center gap-3">
                <BrandTile name={s.name} src={s.logo_url} className="h-10 w-10 rounded-xl p-1" />
                <span>
                  <span className="block font-bold text-heading">Prepare for {s.short}</span>
                  <span className="block text-sm text-muted">Rounds, questions and a day-by-day plan</span>
                </span>
              </span>
              <ArrowRight className="h-5 w-5 text-link transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </section>

        {cmp.faq.length > 0 && (
          <section aria-labelledby="faq-h" className="mt-10">
            <h2 id="faq-h" className="font-display text-2xl font-extrabold tracking-tight text-heading">Frequently asked questions</h2>
            <div className="mt-4 space-y-3">
              {cmp.faq.map((f) => (
                <details key={f.q} className="rounded-2xl border border-line bg-card px-5 py-4" open>
                  <summary className="cursor-pointer list-none font-bold text-heading marker:content-none [&::-webkit-details-marker]:hidden">{f.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-body">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <p className="mt-10 text-sm text-muted">
          Numbers come from each company&apos;s recent drives and official notices; always confirm with the drive notice before you apply.
          Want more companies side by side? <Link href="/compare" className="font-semibold text-link underline">Open the comparison table</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  const pair = String(params?.pair || '');
  if (!/^[a-z0-9-]{3,170}$/.test(pair) || !pair.includes('-vs-')) return { notFound: true };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(`${serverApiBase()}/companies/compare/pair/${encodeURIComponent(pair)}`, { signal: ctrl.signal });
    if (r.status === 404) return { notFound: true };
    if (!r.ok) throw new Error(`compare API ${r.status}`); // temporary: let crawlers retry
    const data = await r.json();
    if (data?.redirect) return { redirect: { destination: `/compare/${data.redirect}`, permanent: true } };
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    return { props: { cmp: data as Comparison } };
  } finally {
    clearTimeout(timer);
  }
};
