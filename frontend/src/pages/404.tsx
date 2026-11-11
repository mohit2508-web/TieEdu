import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Search, Code2, Building2, Home } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { useShell } from '@/context/ShellContext';
import { suggestPath } from '@/lib/didYouMean';

/** Page not found (PRACTICE_POLISH_PLAN.md §3.1): the brain is looking for it, with a way forward. */
export default function NotFoundPage() {
  const { openOverlay } = useShell();
  const [path, setPath] = useState('');
  useEffect(() => setPath(window.location.pathname), []);
  const suggestion = path ? suggestPath(path) : null;
  const problem = /^\/practice\/problem\/([^/]+)/.exec(path)?.[1];
  const company = /^\/(?:practice\/companies|company)\/([^/]+)/.exec(path)?.[1];

  return (
    <>
      <Head>
        <title>Page not found · TiEEdu</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <BrandMark mode="lost" size={120} />
        <p className="font-display text-5xl font-bold tabular-nums text-signal-ink">404</p>
        <h1 className="font-display text-2xl font-bold text-heading sm:text-3xl">This page took a wrong turn</h1>
        <p className="max-w-md text-body-md text-body">
          {problem && !suggestion
            ? <>There is no problem called <span className="font-semibold">{problem}</span>. It may have been renamed.</>
            : company && !suggestion
              ? <>We do not have a company page called <span className="font-semibold">{company}</span> yet.</>
              : 'The link may be old or mistyped. Search for what you wanted, or start from one of these.'}
        </p>
        {suggestion && (
          <p className="text-body-md text-body">Did you mean <Link href={suggestion} className="font-semibold text-link underline">{suggestion}</Link>?</p>
        )}
        <button type="button" onClick={() => openOverlay('search')} className="focus-ring mt-2 flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left text-body-md text-muted hover:border-line-strong">
          <Search className="h-5 w-5" aria-hidden /> Search companies, problems and courses
        </button>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href={problem ? '/practice/dsa' : '/practice'} className="btn btn-primary focus-ring inline-flex min-h-[48px] items-center gap-2 px-5"><Code2 className="h-4 w-4" aria-hidden /> {problem ? 'All problems' : 'Practice'}</Link>
          <Link href="/practice/companies" className="btn btn-secondary focus-ring inline-flex min-h-[48px] items-center gap-2 px-5"><Building2 className="h-4 w-4" aria-hidden /> Companies</Link>
          <Link href="/" className="btn btn-secondary focus-ring inline-flex min-h-[48px] items-center gap-2 px-5"><Home className="h-4 w-4" aria-hidden /> Home</Link>
        </div>
      </main>
    </>
  );
}
