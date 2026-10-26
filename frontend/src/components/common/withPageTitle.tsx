import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

type Query = Record<string, string | string[] | undefined>;

/** "data-structures" → "Data Structures" — the name a slug stands for, before any data loads. */
export const nameFromSlug = (slug: unknown): string =>
  String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Gives a page a <title> on every render path. Pages with several early
 * returns (loading, error, not found) would otherwise need one in each; this
 * renders it once, from the URL, so it is right from the server render.
 */
export function withPageTitle<P extends object>(
  Page: React.ComponentType<P>,
  title: (query: Query) => string,
  description?: (query: Query) => string
) {
  const Titled = (props: P) => {
    const { query } = useRouter();
    return (
      <>
        <Head>
          <title>{`${title(query)} · TieEdu`}</title>
          {description && <meta name="description" content={description(query)} />}
        </Head>
        <Page {...props} />
      </>
    );
  };
  Titled.displayName = `withPageTitle(${Page.displayName || Page.name || 'Page'})`;
  return Titled;
}
