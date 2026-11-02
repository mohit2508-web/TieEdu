import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { ArrowRight, CalendarCheck, ChevronRight, Lock, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { BrandTile } from '@/components/common/BrandTile';
import { MarkdownContent } from '@/components/blocks/MarkdownContent';
import { serverApiBase } from '@/lib/companyPagesApi';

/**
 * Company guide page — one focused page per search intent (SEO_GROWTH_PLAN
 * §5.1): exam pattern, syllabus, interview questions, HR interview, hiring
 * process, salary & eligibility, prep plan. Content comes from the
 * fact-checked company record (backend lib/companyGuide); this page only lays
 * it out in the site's own design and adds the search markup.
 */
interface GuideSection { heading: string; paragraphs?: string[]; bullets?: string[]; table?: { head: string[]; rows: string[][] } }
interface Guide {
  company: { name: string; slug: string; logo_url: string; tagline: string; careers_link: string | null };
  topic: string;
  label: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  updated: string | null;
  source: string | null;
  sections: GuideSection[];
  questions: Array<{ q: string; answer: string | null; difficulty?: string }>;
  locked_count: number;
  faq: Array<{ q: string; a: string }>;
  topics: Array<{ topic: string; label: string }>;
  cta: { label: string; href: string };
  compare?: Array<{ pair: string; name: string }>;
}

const SITE = 'https://tieedu.in';

const fmtDate = (d: string | null) => {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
};

export default function CompanyGuidePage({ guide }: { guide: Guide }) {
  const { company: c } = guide;
  const url = `${SITE}/company/${c.slug}/${guide.topic}`;
  const updated = fmtDate(guide.updated);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: guide.title,
        description: guide.description,
        url,
        ...(guide.updated ? { dateModified: guide.updated } : {}),
        author: { '@type': 'Organization', name: 'TieEdu', url: SITE },
        publisher: { '@type': 'Organization', name: 'TieEdu', logo: { '@type': 'ImageObject', url: `${SITE}/email/logo.png` } },
        about: { '@type': 'Organization', name: c.name.split(/[ (]/)[0] },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Companies', item: `${SITE}/companies` },
          { '@type': 'ListItem', position: 3, name: c.name, item: `${SITE}/company/${c.slug}` },
          { '@type': 'ListItem', position: 4, name: guide.label, item: url },
        ],
      },
      ...(guide.faq.length
        ? [{
            '@type': 'FAQPage',
            mainEntity: guide.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }]
        : []),
    ],
  };

  return (
    <>
      <Head>
        <title>{`${guide.title} | TieEdu`}</title>
        <meta name="description" content={guide.description.slice(0, 160)} />
        <link key="canonical" rel="canonical" href={url} />
        <meta property="og:title" content={guide.title} key="og:title" />
        <meta property="og:description" content={guide.description.slice(0, 200)} key="og:description" />
        <meta property="og:url" content={url} key="og:url" />
        <meta property="og:type" content="article" key="og:type" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </Head>

      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted">
          <Link href="/" className="hover:text-link">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <Link href="/companies" className="hover:text-link">Companies</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <Link href={`/company/${c.slug}`} className="hover:text-link">{c.name}</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className="font-semibold text-heading">{guide.label}</span>
        </nav>

        {/* Header */}
        <header className="mt-6 flex items-start gap-4">
          <BrandTile name={c.name} src={c.logo_url} className="h-14 w-14 shrink-0 rounded-2xl p-1.5" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-widest text-link">{c.name} · {guide.label}</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight tracking-tight text-heading sm:text-4xl">{guide.h1}</h1>
          </div>
        </header>
        <p className="mt-4 text-lg leading-relaxed text-body">{guide.intro}</p>
        {(updated || guide.source) && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <ShieldCheck className="h-4 w-4 text-[var(--color-success)]" aria-hidden />
            {updated && <span>Fact-checked {updated}</span>}
            {guide.source && <span>· {guide.source}</span>}
          </p>
        )}

        {/* Topic nav — every guide for this company, one tap away */}
        <nav aria-label={`${c.name} guides`} className="mt-6 flex flex-wrap gap-2">
          <Link href={`/company/${c.slug}`} className="inline-flex min-h-[40px] items-center rounded-full border border-line bg-card px-4 text-sm font-semibold text-body hover:border-[var(--brand-sky)]">
            Overview
          </Link>
          {guide.topics.map((t) => (
            <Link
              key={t.topic}
              href={`/company/${c.slug}/${t.topic}`}
              aria-current={t.topic === guide.topic ? 'page' : undefined}
              className={
                t.topic === guide.topic
                  ? 'inline-flex min-h-[40px] items-center rounded-full bg-[var(--brand-ink)] px-4 text-sm font-semibold text-white'
                  : 'inline-flex min-h-[40px] items-center rounded-full border border-line bg-card px-4 text-sm font-semibold text-body hover:border-[var(--brand-sky)]'
              }
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {/* Sections */}
        <article className="mt-10 space-y-10">
          {guide.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-heading">{s.heading}</h2>
              {s.paragraphs?.map((p, i) => <p key={i} className="mt-3 text-base leading-7 text-body">{p}</p>)}
              {s.bullets && s.bullets.length > 0 && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base leading-7 text-body marker:text-[var(--brand-accent)]">
                  {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}
              {s.table && (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-app">
                      <tr>{s.table.head.map((h) => <th key={h} className="px-4 py-3 font-bold text-heading">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((r, i) => (
                        <tr key={i} className="border-t border-line align-top">
                          {r.map((cell, j) => <td key={j} className={`px-4 py-3 ${j === 0 ? 'font-semibold text-heading' : 'text-body'}`}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          {/* Questions */}
          {guide.questions.length > 0 && (
            <section aria-labelledby="questions-h">
              <h2 id="questions-h" className="font-display text-2xl font-extrabold tracking-tight text-heading">
                {guide.questions.length} questions to prepare
              </h2>
              <ol className="mt-4 space-y-3">
                {guide.questions.map((q, i) => (
                  <li key={i} className="rounded-2xl border border-line bg-card p-5">
                    <p className="font-bold text-heading">
                      <span className="mr-2 text-[var(--brand-accent)]">{i + 1}.</span>
                      {q.q}
                    </p>
                    {q.answer ? (
                      <div className="mt-3 text-sm">
                        <MarkdownContent compact>{q.answer}</MarkdownContent>
                      </div>
                    ) : (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
                        <Lock className="h-3.5 w-3.5" aria-hidden /> Model answer in the {c.name} interview pack
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {guide.locked_count > 0 && (
                <Link href={`/company/${c.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-link hover:underline">
                  Unlock all {guide.questions.length} model answers <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </section>
          )}

          {/* CTA */}
          <section className="rounded-3xl border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-accent)] text-[var(--accent-ink)]">
                <CalendarCheck className="h-5 w-5" aria-hidden />
              </span>
              <p className="font-display text-xl font-extrabold text-heading">Prepare for {c.name} with a plan</p>
            </div>
            <p className="mt-3 text-base text-body">Day-by-day lessons, sectional tests and a readiness score that tells you what to fix before the test.</p>
            <Link href={guide.cta.href} className="btn btn-primary mt-5 min-h-[48px] px-6 text-sm">
              {guide.cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>

          {/* FAQ */}
          {guide.faq.length > 0 && (
            <section aria-labelledby="faq-h">
              <h2 id="faq-h" className="font-display text-2xl font-extrabold tracking-tight text-heading">Frequently asked questions</h2>
              <div className="mt-4 space-y-3">
                {guide.faq.map((f) => (
                  <details key={f.q} className="group rounded-2xl border border-line bg-card px-5 py-4" open>
                    <summary className="cursor-pointer list-none font-bold text-heading marker:content-none [&::-webkit-details-marker]:hidden">{f.q}</summary>
                    <p className="mt-2 text-sm leading-relaxed text-body">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* More guides */}
          <section aria-labelledby="more-h">
            <h2 id="more-h" className="font-display text-xl font-extrabold text-heading">More on {c.name}</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {guide.topics.filter((t) => t.topic !== guide.topic).map((t) => (
                <li key={t.topic}>
                  <Link href={`/company/${c.slug}/${t.topic}`} className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-sm font-semibold text-heading hover:border-[var(--brand-sky)]">
                    {c.name}: {t.label.toLowerCase()} <ArrowRight className="h-4 w-4 text-link" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            {guide.compare && guide.compare.length > 0 && (
              <>
                <h3 className="mt-6 font-bold text-heading">Compare {c.name} with</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {guide.compare.map((x) => (
                    <li key={x.pair}>
                      <Link href={`/compare/${x.pair}`} className="inline-flex min-h-[40px] items-center rounded-full border border-line bg-card px-4 text-sm font-semibold text-heading hover:border-[var(--brand-sky)]">
                        vs {x.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {c.careers_link && (
              <p className="mt-4 text-sm text-muted">
                Official careers page: <a href={c.careers_link} rel="nofollow noopener noreferrer" target="_blank" className="font-semibold text-link underline">{c.careers_link.replace(/^https?:\/\//, '')}</a>
              </p>
            )}
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  const slug = String(params?.slug || '');
  const topic = String(params?.topic || '');
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || !/^[a-z-]{1,40}$/.test(topic)) return { notFound: true };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(`${serverApiBase()}/companies/${encodeURIComponent(slug)}/guide/${encodeURIComponent(topic)}`, { signal: ctrl.signal });
    if (r.status === 404) return { notFound: true };
    // Any other failure is temporary: a 5xx makes search engines retry, where a
    // 404 would tell them the page is gone.
    if (!r.ok) throw new Error(`guide API ${r.status}`);
    const guide = (await r.json()) as Guide;
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    return { props: { guide } };
  } finally {
    clearTimeout(timer);
  }
};
