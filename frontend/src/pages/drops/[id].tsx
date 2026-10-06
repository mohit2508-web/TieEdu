import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';
import { ArrowUpRight, ChevronLeft, CalendarClock } from 'lucide-react';
import type { GetServerSideProps } from 'next';
import { API_BASE_URL, apiAssetUrl } from '@/lib/api';
import { DROP_TYPE_META, fetchDropDetailApi, postDropEventApi, type DropDetail } from '@/lib/dropsApi';
import { formatDay } from '@/lib/date';

const SITE_URL = 'https://tieedu.com';

/**
 * The shareable page behind `/drops/:id`.
 *
 * Server-rendered so a pasted link carries real Open Graph tags — a feed item
 * shared into a chat has to show its headline, not the site's default title.
 * The detail endpoint is public (a shared drop must render signed-out), and a
 * backend that was merely down at SSR time becomes a client retry rather than
 * a false 404: only an API that answered 404 produces `notFound`.
 */

/** First paragraph-shaped text, clipped — the description meta is one line. */
const descriptionOf = (drop: DropDetail): string => {
  const source = drop.bullets[0] || drop.body_md.replace(/[#*>`_-]/g, ' ').trim() || drop.headline;
  return source.length > 180 ? `${source.slice(0, 177).trimEnd()}…` : source;
};

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = String(params?.id || '');
  if (!id) return { notFound: true };

  let initialDrop: DropDetail | null = null;
  let upstreamStatus: number | null = null;

  try {
    const res = await fetch(`${API_BASE_URL}/drops/${encodeURIComponent(id)}`);
    upstreamStatus = res.status;
    if (res.ok) {
      const data = await res.json();
      initialDrop = data.drop || null;
    }
  } catch {
    // Backend unreachable — the client effect retries; never a 404 verdict.
  }

  if (upstreamStatus === 404) return { notFound: true };
  if (!initialDrop && upstreamStatus !== null && upstreamStatus < 400) return { notFound: true };

  return { props: { initialDrop, initialId: id } };
};

export default function DropPage({ initialDrop, initialId }: { initialDrop: DropDetail | null; initialId: string }) {
  const router = useRouter();
  const [drop, setDrop] = useState<DropDetail | null>(initialDrop);
  const [failed, setFailed] = useState(false);
  const openedAt = useRef(Date.now());

  // Retry when SSR could not reach the API (same pattern as company/[slug]).
  useEffect(() => {
    if (drop || failed) return;
    fetchDropDetailApi(initialId).then(setDrop, () => setFailed(true));
  }, [drop, failed, initialId]);

  // One view beacon per page open, with the dwell the reader actually spent —
  // the same unit the swipe feed bills, so the two add up cleanly.
  useEffect(() => {
    if (!drop) return;
    const id = drop.id;
    const opened = openedAt.current;
    return () => {
      postDropEventApi(id, 'view', Math.min(Date.now() - opened, 600000)).catch(() => {});
    };
  }, [drop]);

  const meta = drop ? DROP_TYPE_META[drop.type] || null : null;
  const description = drop ? descriptionOf(drop) : 'A drop from the TieEdu career feed.';
  const ogImage = drop?.image_url ? (drop.image_url.startsWith('http') ? drop.image_url : `${SITE_URL}${drop.image_url}`) : null;
  const canonical = `${SITE_URL}/drops/${drop?.id || initialId}`;

  if (!drop) {
    return (
      <main className="mx-auto flex min-h-[50vh] w-full max-w-[720px] flex-col items-center justify-center gap-3 px-5 text-center" data-test="drop-detail-loading">
        <p className="text-sm font-semibold text-[var(--text-body)]" role="status">
          {failed ? 'This drop could not be loaded.' : 'Loading drop…'}
        </p>
        <div className="flex gap-2">
          {failed && (
            <button type="button" className="btn btn-soft h-10" onClick={() => router.replace(router.asPath)}>
              Try again
            </button>
          )}
          <Link href="/drops" className="btn btn-ghost h-10">
            Back to the feed
          </Link>
        </div>
      </main>
    );
  }

  const chipStyle = { '--drop-chip': meta?.chip } as React.CSSProperties;

  return (
    <>
      <Head>
        <title>{`${drop.headline} · TieEdu`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={drop.headline} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={drop.headline} />
        <meta name="twitter:description" content={description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <script
          type="application/ld+json"
          /* eslint-disable-next-line react/no-danger */
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: drop.headline,
              description,
              datePublished: drop.publish_at || drop.created_at,
              publisher: { '@type': 'Organization', name: 'TieEdu', url: SITE_URL },
              url: canonical,
            }),
          }}
        />
      </Head>

      <main className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-6" style={chipStyle} data-test="drop-detail">
          <Link
            href="/drops"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-[var(--brand-sky)] hover:underline"
          >
            <ChevronLeft size={17} strokeWidth={2.6} aria-hidden />
            Back to the feed
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="drop-type-chip">{meta?.label || drop.type}</span>
            {drop.sponsored && (
              <span className="chip text-[11px]">{drop.sponsor_name || 'Sponsored'}</span>
            )}
            {drop.publish_at && (
              <span className="text-xs font-semibold text-[var(--text-muted)]">{formatDay(drop.publish_at)}</span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-[var(--text-heading)] sm:text-3xl">
            {drop.headline}
          </h1>

          {drop.bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {drop.bullets.map((b) => (
                <li key={b} className="text-sm font-semibold leading-relaxed text-[var(--text-body)]">
                  • {b}
                </li>
              ))}
            </ul>
          )}

          {drop.deadline_at && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-sky-soft)] px-3 py-1.5 text-xs font-bold text-[var(--brand-sky-strong)]">
              <CalendarClock size={14} strokeWidth={2.6} aria-hidden />
              {formatDay(drop.deadline_at)}
            </p>
          )}

          {drop.image_url && (
            /*
             * Fixed aspect box + object-cover: the CMS creative has no declared
             * dimensions, and a bare <img> that resizes on load is a layout
             * jump under the reader's thumb. The box reserves the space first;
             * the image fills it.
             */
            <div className="relative mt-5 aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered article creative from the CMS, width unknown until it loads */}
              <img
                src={apiAssetUrl(drop.image_url)}
                alt={drop.image_alt || drop.headline}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="prose-article mt-6 text-[15px] leading-relaxed text-[var(--text-body)]">
            <ReactMarkdown>{drop.body_md}</ReactMarkdown>
          </div>

          {drop.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {drop.tags.map((t) => (
                <span key={t} className="chip text-[11px]">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="btn btn-primary h-12 w-full px-6 sm:w-auto"
              onClick={() => {
                postDropEventApi(drop.id, 'cta_click').catch(() => {});
                if (drop.cta_url) window.open(drop.cta_url, '_blank', 'noopener,noreferrer');
                else if (drop.cta_route) router.push(drop.cta_route);
                else if (drop.target_slug) router.push(`/company/${drop.target_slug}`);
              }}
            >
              {drop.cta_label}
              <ArrowUpRight size={17} strokeWidth={2.6} aria-hidden />
            </button>
            <Link href="/drops" className="btn btn-ghost h-12 w-full px-5 sm:w-auto">
              Keep swiping
            </Link>
          </div>
      </main>
    </>
  );
}
