import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchTrack, claimTrackCertificate } from '@/lib/tracksApi';
import {
  downloadCertificatePdf,
  certificateDownloadPath,
} from '@/lib/coursesApi';
import type { LearningTrack, TrackCourseState } from '@/types';

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return s;
  }
}

function CourseRow({
  course,
  index,
}: {
  course: TrackCourseState;
  index: number;
}) {
  const done = course.is_complete;
  const available = course.published;
  const pct = course.percent ?? 0;
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-white p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3 sm:w-16">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-sky)]/10 text-xs font-extrabold text-[var(--brand-sky)]">
          {index + 1}
        </span>
        {done ? (
          <CheckCircle2 size={18} className="text-emerald-500" aria-hidden />
        ) : available ? (
          <Circle size={18} className="text-[var(--text-body)] opacity-40" aria-hidden />
        ) : (
          <Lock size={16} className="text-[var(--text-body)] opacity-40" aria-hidden />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={available && course.slug ? `/courses/${course.slug}` : '#'}
          className={`text-sm font-bold ${
            available && course.slug
              ? 'text-[var(--ink)] hover:text-[var(--brand-sky)]'
              : 'text-[var(--text-body)] opacity-60 pointer-events-none'
          }`}
        >
          {course.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-[var(--text-body)]">{course.subtitle}</p>
        {!available && (
          <p className="mt-1 text-[11px] font-semibold text-amber-600">
            Coming soon — track certificate unlocks once this course is live.
          </p>
        )}
        {available && pct > 0 && !done && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--brand-sky)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-[var(--text-body)]">{pct}%</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        {!course.slug ? null : course.is_free ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            Free
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            ₹{course.price_inr ?? 0}
          </span>
        )}
        {available && course.slug && (
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--ink)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            {done ? 'Review' : pct > 0 ? 'Continue' : 'Start'}{' '}
            <ArrowRight size={12} aria-hidden />
          </Link>
        )}
      </div>
    </li>
  );
}

export default function TrackDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : null;

  const [track, setTrack] = useState<LearningTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTrack(slug);
        if (!cancelled) setTrack(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Track not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, user?.id]);

  const claim = async () => {
    if (!slug) return;
    try {
      setClaiming(true);
      setClaimError(null);
      const cert = await claimTrackCertificate(slug);
      setTrack((prev) => (prev ? { ...prev, certificate: cert } : prev));
    } catch (e: any) {
      setClaimError(e?.message || 'Could not issue certificate');
    } finally {
      setClaiming(false);
    }
  };

  const download = async () => {
    if (!track?.certificate) return;
    try {
      setDownloading(true);
      const { blobUrl, filename } = await downloadCertificatePdf(
        certificateDownloadPath(track.certificate.serial)
      );
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || `TieEdu-Track-Certificate-${track.certificate.serial}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e: any) {
      setClaimError(e?.message || 'Could not download certificate');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]" />
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Track not found'}
        </div>
        <Link
          href="/tracks"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--brand-sky)]"
        >
          <ArrowLeft size={14} aria-hidden /> All tracks
        </Link>
      </div>
    );
  }

  const courses = track.courses || [];
  const total = track.progress?.courses_total ?? track.course_count;
  const completed = track.progress?.courses_complete ?? 0;
  const pct = track.progress?.percent ?? 0;
  const claimable = Boolean(track.progress?.is_complete);
  const cert = track.certificate;

  return (
    <>
      <Head>
        <title>{track.title} · Career Track · TieEdu</title>
        <meta name="description" content={track.tagline} />
      </Head>

      <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/tracks"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--brand-sky)]"
        >
          <ArrowLeft size={14} aria-hidden /> All tracks
        </Link>

        <header className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-white to-[var(--bg-surface)] px-5 py-6 shadow-[var(--shadow-elevated)] sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)]">
                {track.title}
              </h1>
              <p className="mt-1.5 text-sm text-[var(--text-body)]">{track.tagline}</p>
              <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-[var(--text-body)]">
                {track.description}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {cert ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <Award size={14} aria-hidden /> Certified · {formatDate(cert.issued_at)}
                </span>
              ) : claimable ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-sky)]/10 px-3 py-1.5 text-xs font-bold text-[var(--brand-sky)]">
                  <Sparkles size={14} aria-hidden /> Ready to claim
                </span>
              ) : null}
              <div className="text-right">
                <p className="text-2xl font-extrabold text-[var(--ink)]">{pct}%</p>
                <p className="text-xs text-[var(--text-body)]">
                  {completed}/{total} courses
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--brand-sky)] transition-all"
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
        </header>

        <section className="mt-8">
          <h2 className="text-lg font-extrabold tracking-tight text-[var(--ink)]">
            Course path
          </h2>
          <ul className="mt-4 space-y-3">
            {courses.map((c, i) => (
              <CourseRow key={c.id} course={c} index={i} />
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-[var(--ink)]">
            <Award size={18} className="text-[var(--brand-sky)]" aria-hidden />
            Career Track certificate
          </h2>
          <p className="mt-2 text-sm text-[var(--text-body)]">
            Finish every course in this track and pass its certificate gate to unlock a single
            verifiable Career Track certificate — one serial covering the whole path.
          </p>

          {cert ? (
            <div className="mt-4">
              {claimError && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {claimError}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-emerald-800">{cert.track_title}</p>
                  <p className="mt-0.5 text-xs text-emerald-700">
                    {cert.serial} · Issued {formatDate(cert.issued_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={cert.verification_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <ExternalLink size={13} aria-hidden /> Verify
                  </a>
                  <button
                    type="button"
                    onClick={download}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Download size={13} aria-hidden />
                    {downloading ? 'Downloading…' : 'Download PDF'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              {claimError && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {claimError}
                </p>
              )}
              <button
                type="button"
                onClick={claim}
                disabled={!claimable || claiming || !user}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-sky-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Award size={15} aria-hidden />
                {claiming
                  ? 'Issuing…'
                  : !user
                  ? 'Sign in to claim'
                  : claimable
                  ? 'Claim Career Track certificate'
                  : `Complete ${total - completed} more course${total - completed === 1 ? '' : 's'} to unlock`}
              </button>
              {!user && (
                <p className="mt-2 text-xs text-[var(--text-body)]">
                  Sign in to track progress and claim your certificate.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
