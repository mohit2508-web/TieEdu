import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, Award, Route, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchTracks } from '@/lib/tracksApi';
import type { LearningTrack } from '@/types';

function TrackCard({ track }: { track: LearningTrack }) {
  const pct = track.progress_percent ?? 0;
  const completed = track.completed_courses ?? 0;
  const total = track.total_courses ?? track.course_ids.length;
  const hasCert = Boolean(track.certificate);
  return (
    <Link
      href={`/tracks/${track.slug}`}
      className="group flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-sky)]/10 text-[var(--brand-sky)]">
          <Route size={20} aria-hidden />
        </div>
        {hasCert && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            <Award size={12} aria-hidden /> Certified
          </span>
        )}
      </div>
      <h2 className="mt-4 text-lg font-extrabold tracking-tight text-[var(--ink)] group-hover:text-[var(--brand-sky)]">
        {track.title}
      </h2>
      <p className="mt-1.5 text-sm text-[var(--text-body)]">{track.tagline}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-body)]">
        <span>{total} courses</span>
        {pct > 0 && (
          <span className="font-semibold text-[var(--brand-sky)]">
            {completed}/{total} done · {pct}%
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--brand-sky)] transition-all"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-sky)] group-hover:gap-2 transition-all">
        View track <ArrowRight size={14} aria-hidden />
      </span>
    </Link>
  );
}

export default function TracksPage() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<LearningTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTracks();
        if (!cancelled) setTracks(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load tracks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <>
      <Head>
        <title>Career Tracks · TieEdu</title>
        <meta
          name="description"
          content="Sequenced course tracks that end in a verified Career Track certificate."
        />
      </Head>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-white to-[var(--bg-surface)] px-5 py-5 shadow-[var(--shadow-elevated)] sm:px-6">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
              Career Tracks
            </h1>
            <p className="mt-1 text-sm text-[var(--text-body)]">
              Follow a sequenced path. Finish every course, earn the Career Track certificate.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/my-certificates"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-bold text-[var(--ink)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <Award size={14} aria-hidden /> My certificates
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-bold text-[var(--ink)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              Browse courses
            </Link>
          </div>
        </header>

        {loading && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="mt-16 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-[var(--brand-sky)]" aria-hidden />
            <p className="mt-3 text-sm text-[var(--text-body)]">
              No tracks are published yet. Check back soon.
            </p>
          </div>
        )}

        {!loading && !error && tracks.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
