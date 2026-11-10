import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { serverApiBase } from '@/lib/companyPagesApi';
import {
  fetchDropStoryApi,
  fetchSavedDropsApi,
  likeDropApi,
  saveDropApi,
  unsaveDropApi,
  type DropDetail,
  type DropFeedItem,
} from '@/lib/dropsApi';
import { trackDrop } from '@/lib/dropBeacon';
import { useAuth } from '@/context/AuthContext';
import { DropStory } from '@/components/drops/DropStory';

const AuthRequiredModal = dynamic(
  () => import('@/components/modals/AuthRequiredModal').then((m) => m.AuthRequiredModal),
  { ssr: false }
);

const SITE_URL = 'https://tieedu.in';

/**
 * The shareable story page behind `/drops/:id`.
 *
 * Server-rendered so a pasted link carries real Open Graph tags; the body is
 * the same <DropStory> the feed opens as an overlay. The detail endpoint is
 * public (a shared drop must render signed-out), and a backend that was merely
 * down at SSR time becomes a client retry rather than a false 404: only an API
 * that answered 404 produces `notFound`.
 */

/** First paragraph-shaped text, clipped — the description meta is one line. */
const descriptionOf = (drop: DropDetail): string => {
  const source = drop.bullets[0] || drop.body_md.replace(/[#*>`_|-]/g, ' ').replace(/\s+/g, ' ').trim() || drop.headline;
  return source.length > 180 ? `${source.slice(0, 177).trimEnd()}…` : source;
};

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = String(params?.id || '');
  if (!id) return { notFound: true };

  let initialDrop: DropDetail | null = null;
  let upstreamStatus: number | null = null;

  try {
    // Absolute on the server: a relative /api URL cannot be fetched there.
    const res = await fetch(`${serverApiBase()}/drops/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(8000) });
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
  const { user } = useAuth();
  const [drop, setDrop] = useState<DropDetail | null>(initialDrop);
  const [related, setRelated] = useState<DropFeedItem[]>([]);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [authFor, setAuthFor] = useState<'save' | 'like' | null>(null);
  const [notice, setNotice] = useState('');
  const openedAt = useRef(Date.now());

  // Fresh story (like state, related drops) on the client — also the retry
  // when SSR could not reach the API.
  useEffect(() => {
    let live = true;
    fetchDropStoryApi(initialId).then(
      (r) => {
        if (!live) return;
        setDrop(r.drop);
        setRelated(r.related);
      },
      () => {
        if (live && !initialDrop) setFailed(true);
      }
    );
    return () => {
      live = false;
    };
  }, [initialId, initialDrop]);

  useEffect(() => {
    if (!user) return;
    fetchSavedDropsApi().then((r) => setSaved(r.items.some((i) => i.id === initialId)), () => {});
  }, [user, initialId]);

  // One read + one view per page open, with the dwell the reader actually spent.
  const dropId = drop?.id;
  useEffect(() => {
    if (!dropId) return;
    const opened = openedAt.current;
    trackDrop(dropId, 'read_more');
    return () => trackDrop(dropId, 'view', Date.now() - opened);
  }, [dropId]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const description = drop ? descriptionOf(drop) : 'A drop from TiEEdu Drops.';
  // Chat apps cannot preview SVG, so only an uploaded creative becomes og:image.
  const ogImage =
    drop?.image_url && !drop.is_generated_art
      ? drop.image_url.startsWith('http')
        ? drop.image_url
        : `${SITE_URL}${drop.image_url}`
      : null;
  const canonical = `${SITE_URL}/drops/${drop?.id || initialId}`;

  if (!drop) {
    return (
      <main className="mx-auto flex min-h-[50vh] w-full max-w-[720px] flex-col items-center justify-center gap-3 px-5 text-center" data-test="drop-detail-loading">
        <Head>
          <title>Drop · TiEEdu</title>
        </Head>
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
            Back to Drops
          </Link>
        </div>
      </main>
    );
  }

  const toggleSave = async () => {
    if (!user) return setAuthFor('save');
    const was = saved;
    setSaved(!was);
    try {
      if (was) await unsaveDropApi(drop.id);
      else await saveDropApi(drop.id);
    } catch {
      setSaved(was);
    }
  };

  const toggleLike = async () => {
    if (!user) return setAuthFor('like');
    const on = !drop.liked;
    setDrop({ ...drop, liked: on, likes: Math.max(0, (drop.likes || 0) + (on ? 1 : -1)) });
    try {
      const r = await likeDropApi(drop.id, on);
      setDrop((d) => (d ? { ...d, liked: r.liked, likes: r.likes } : d));
    } catch {
      setDrop((d) => (d ? { ...d, liked: !on, likes: Math.max(0, (d.likes || 0) + (on ? -1 : 1)) } : d));
    }
  };

  const share = () => {
    trackDrop(drop.id, 'share');
    if (typeof navigator.share === 'function') navigator.share({ title: drop.headline, url: canonical }).catch(() => {});
    else navigator.clipboard.writeText(canonical).then(() => setNotice('Link copied'), () => {});
  };

  const cta = () => {
    trackDrop(drop.id, 'cta_click');
    if (drop.cta_url) router.push(`/drops/go/${drop.id}`);
    else router.push(drop.cta_route || (drop.target_slug ? `/company/${drop.target_slug}` : '/drops'));
  };

  return (
    <>
      <Head>
        <title>{`${drop.headline} · TiEEdu`}</title>
        <meta name="description" content={description} />
        <link key="canonical" rel="canonical" href={canonical} />
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
              '@type': 'NewsArticle',
              headline: drop.headline,
              description,
              datePublished: drop.publish_at || drop.created_at,
              publisher: { '@type': 'Organization', name: 'TiEEdu', url: SITE_URL },
              url: canonical,
            }),
          }}
        />
      </Head>

      <main data-test="drop-detail">
        <DropStory
          drop={drop}
          related={related}
          saved={saved}
          onSave={toggleSave}
          onLike={toggleLike}
          onShare={share}
          onCta={cta}
          onSource={() => router.push(`/drops/go/${drop.id}?to=source`)}
          onOpenRelated={(r) => router.push(`/drops/${r.id}`)}
        />
        {notice && (
          <p role="status" className="fixed bottom-24 left-1/2 z-[3] -translate-x-1/2 rounded-full bg-[var(--brand-ink)] px-4 py-2 text-xs font-bold text-white">
            {notice}
          </p>
        )}
      </main>

      <AuthRequiredModal
        isOpen={!!authFor}
        onClose={() => setAuthFor(null)}
        onSuccess={() => setAuthFor(null)}
        targetTitle={authFor === 'like' ? 'Like this drop' : 'Save this drop'}
      />
    </>
  );
}
