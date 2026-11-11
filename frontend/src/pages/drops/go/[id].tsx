import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowUpRight, ChevronLeft, ExternalLink, GraduationCap, ShieldAlert, ShieldCheck } from 'lucide-react';
import { fetchDropDetailApi, DROP_TYPE_META, type DropDetail } from '@/lib/dropsApi';
import { flushDropBeacons, trackDrop } from '@/lib/dropBeacon';
import { hostOf } from '@/components/drops/DropStory';

/**
 * The leave-site page: /drops/go/:id[?to=source]
 *
 * A drop never sends a student straight to another website. This page says
 * where they are going (the real domain, not the link text), who added it,
 * and the one safety rule, and offers "prepare first" next to "continue".
 *
 * It only ever opens a URL stored on the drop (`cta_url`, or `source_url`
 * with ?to=source) — never a URL from the query string — so it cannot be
 * used as an open redirect. Not indexed.
 */
export default function DropGoPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const wantSource = router.query.to === 'source';
  const [drop, setDrop] = useState<DropDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchDropDetailApi(id).then(setDrop, () => setFailed(true));
  }, [id]);

  const target = drop ? (wantSource ? drop.source_url : drop.cta_url) || drop.source_url || drop.cta_url : null;
  const host = hostOf(target);
  const prepHref = drop?.cta_route || (drop?.target_slug ? `/company/${drop.target_slug}` : '/skill-test');
  const meta = drop ? DROP_TYPE_META[drop.type] : null;

  const go = () => {
    if (!drop || !target) return;
    trackDrop(drop.id, 'outbound');
    flushDropBeacons();
    window.location.assign(target);
  };

  return (
    <>
      <Head>
        <title>Leaving TiEEdu</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="mx-auto flex min-h-[70vh] w-full max-w-[560px] flex-col justify-center px-5 py-10">
        <button type="button" onClick={() => router.back()} className="mb-6 inline-flex min-h-[44px] items-center gap-1 self-start text-sm font-bold text-link">
          <ChevronLeft size={17} strokeWidth={2.6} aria-hidden /> Back
        </button>

        {!drop ? (
          <p className="text-center text-sm font-semibold text-[var(--text-body)]" role="status">
            {failed ? 'This link is no longer available.' : 'Opening the link…'}
          </p>
        ) : !target ? (
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold text-[var(--text-body)]">This drop has no outside link.</p>
            <Link href={`/drops/${drop.id}`} className="btn btn-primary h-11">Read the story</Link>
          </div>
        ) : (
          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-sky-soft)] text-link">
              <ExternalLink size={26} strokeWidth={2.2} aria-hidden />
            </div>
            <h1 className="mt-4 text-center font-display text-xl font-extrabold text-[var(--text-heading)]">You are leaving TiEEdu</h1>
            <p className="mt-1 text-center text-sm text-[var(--text-muted)]">for an outside website</p>

            <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-app)] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Going to</p>
              <p className="mt-0.5 break-all text-lg font-extrabold text-[var(--text-heading)]">{host}</p>
              {drop.source_name && wantSource && <p className="text-sm font-semibold text-[var(--text-body)]">{drop.source_name}</p>}
              <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
                <ShieldCheck size={15} className="mt-px flex-none text-emerald-600" aria-hidden />
                Link added by the TiEEdu team for “{drop.headline}”{meta ? ` (${meta.label})` : ''}.
              </p>
            </div>

            <div className="mt-4 flex gap-2.5 rounded-2xl bg-[var(--warning-soft,#fff7e6)] p-4 text-sm text-[var(--text-heading)]">
              <ShieldAlert size={18} className="mt-0.5 flex-none text-[var(--amber-deep,#b45309)]" aria-hidden />
              <p>
                <strong>Never pay</strong> for a test, an interview, training or an offer letter. Genuine companies charge
                nothing. Check the address bar shows <strong>{host}</strong>.
              </p>
            </div>

            <div className="mt-6 grid gap-2">
              <button type="button" className="btn btn-primary h-12 w-full" onClick={go}>
                Continue to {host}
                <ArrowUpRight size={18} strokeWidth={2.6} aria-hidden />
              </button>
              <Link href={prepHref} className="btn btn-ghost h-12 w-full">
                <GraduationCap size={18} strokeWidth={2.4} aria-hidden /> Prepare on TiEEdu first
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
