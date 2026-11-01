import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { LEGAL, LEGAL_LINKS } from '@/lib/legal';
import { cn } from '@/lib/cn';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/**
 * The one layout for Privacy, Terms, Refunds and Cookies: a short summary up
 * top (what most people actually want), a sticky contents list on wide
 * screens, and numbered sections that are easy to link to.
 */
export const LegalPage: React.FC<{
  path: string;
  title: string;
  description: string;
  summary: React.ReactNode;
  sections: LegalSection[];
}> = ({ path, title, description, summary, sections }) => (
  <>
    <Head>
      <title>{`${title} · ${LEGAL.brand}`}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`${LEGAL.siteUrl}${path}`} />
    </Head>
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="max-w-3xl">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-heading sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated {LEGAL.updated}</p>
        <div className="mt-6 rounded-3xl border border-line bg-card p-5 text-base leading-7 text-body shadow-edge-neutral sm:p-6">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-link">In short</p>
          {summary}
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-[var(--rail-top)]">
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted">On this page</p>
            <ol className="mt-3 space-y-1.5 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-lg px-2 py-1 text-body transition-colors hover:bg-card hover:text-link">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-6 border-t border-line pt-4 text-sm">
              {LEGAL_LINKS.filter((l) => l.href !== path).map((l) => (
                <Link key={l.href} href={l.href} className="block py-1 font-semibold text-link hover:underline">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <article className="max-w-3xl space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-[var(--rail-top)]">
              <h2 id={`${s.id}-h`} className="font-display text-2xl font-extrabold tracking-tight text-heading">
                <span className="mr-2 text-[var(--brand-accent)]">{i + 1}.</span>
                {s.title}
              </h2>
              <div className="legal-body mt-3 space-y-3 text-base leading-7 text-body">{s.body}</div>
            </section>
          ))}
          <p className="border-t border-line pt-6 text-sm text-muted">
            Questions about this page? Write to{' '}
            <a className="font-semibold text-link underline" href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>{' '}
            or use the <Link className="font-semibold text-link underline" href="/contact">contact form</Link>.
          </p>
        </article>
      </div>
    </main>
    <Footer />
  </>
);

/** A bulleted list styled for policy text. */
export const LegalList: React.FC<{ items: React.ReactNode[]; className?: string }> = ({ items, className }) => (
  <ul className={cn('list-disc space-y-1.5 pl-5 marker:text-[var(--brand-accent)]', className)}>
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </ul>
);

/** A simple two-or-more-column table for policy text. */
export const LegalTable: React.FC<{ head: string[]; rows: React.ReactNode[][] }> = ({ head, rows }) => (
  <div className="overflow-x-auto rounded-2xl border border-line">
    <table className="w-full min-w-[520px] text-left text-sm">
      <thead className="bg-card">
        <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-bold text-heading">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-line align-top">
            {r.map((c, j) => <td key={j} className="px-4 py-3 text-body">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
