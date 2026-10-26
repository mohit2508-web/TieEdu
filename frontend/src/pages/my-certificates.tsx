import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Award, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { downloadCertificatePdf, certificateDownloadPath, fetchMyCertificates } from '@/lib/coursesApi';
import type { CertificateSummary } from '@/types';

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

export default function MyCertificatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [certs, setCerts] = useState<CertificateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await fetchMyCertificates();
        setCerts(data.certificates || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load certificates');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const download = async (c: CertificateSummary) => {
    try {
      setDownloading(c.serial);
      const { blobUrl, filename } = await downloadCertificatePdf(certificateDownloadPath(c.serial));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || `TieEdu-Certificate-${c.serial}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e: any) {
      setError(e?.message || 'Could not download certificate');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <Head>
        <title>My Certificates · TieEdu</title>
        <meta name="description" content="Your earned certificates, verifiable and downloadable." />
      </Head>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-white to-[var(--bg-surface)] px-5 py-5 shadow-[var(--shadow-elevated)] sm:px-6">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
              My Certificates
            </h1>
            <p className="mt-1 text-sm text-[var(--text-body)]">
              Earned certificates — verified, tamper-evident and downloadable as PDF.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-bold text-[var(--ink)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            Browse courses
          </Link>
        </header>

        {!authLoading && !user && (
          <div className="mt-16 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center">
            <p className="text-sm text-[var(--text-body)]">Sign in to see your certificates.</p>
            <button
              type="button"
              onClick={() => router.push('/login?next=/my-certificates')}
              className="mt-4 rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)]"
            >
              Sign in
            </button>
          </div>
        )}

        {loading && user && (
          <p className="mt-12 text-sm text-[var(--text-muted)]">Loading your certificates…</p>
        )}

        {error && (
          <p className="mt-8 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        {user && !loading && certs.length === 0 && (
          <p className="mt-16 text-center text-sm text-[var(--text-muted)]">
            No certificates yet. Complete a certificate-eligible course to claim yours.
          </p>
        )}

        {certs.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((c) => (
              <div
                key={c.serial}
                className="group flex flex-col rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-sky-soft)] text-[var(--brand-sky-strong)]">
                      <Award size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">{c.serial}</p>
                      <h3 className="mt-0.5 text-base font-bold leading-snug text-[var(--ink)]">
                        {c.course_title}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
                      c.status === 'active'
                        ? 'bg-[var(--bg-sky-soft)] text-[var(--color-success)]'
                        : 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
                    ].join(' ')}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-1.5 text-xs text-[var(--text-body)]">
                  <p>
                    Issued <span className="font-semibold">{formatDate(c.issued_at)}</span>
                  </p>
                  {c.tier && (
                    <p>
                      Tier <span className="font-semibold capitalize">{c.tier.replace(/_/g, ' ')}</span>
                    </p>
                  )}
                  {c.distinction && (
                    <p className="font-semibold text-[var(--brand-sky)]">
                      With Distinction — first attempt
                    </p>
                  )}
                  {c.score_percent != null && (
                    <p>
                      Exam score <span className="font-semibold">{c.score_percent}%</span>
                    </p>
                  )}
                  {c.skills && c.skills.length > 0 && (
                    <p className="line-clamp-2 text-[var(--text-muted)]">
                      Skills: {c.skills.slice(0, 4).join(', ')}
                      {c.skills.length > 4 ? '…' : ''}
                    </p>
                  )}
                  {c.project_title && (
                    <p className="truncate">
                      Project <span className="font-semibold">{c.project_title}</span>
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  <a
                    href={c.verification_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <ExternalLink size={13} /> Verify
                  </a>
                  <button
                    type="button"
                    onClick={() => download(c)}
                    disabled={downloading === c.serial}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-60"
                  >
                    <Download size={13} /> {downloading === c.serial ? 'Downloading…' : 'Download PDF'}
                  </button>
                  {c.project_url && (
                    <a
                      href={c.project_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <ExternalLink size={13} /> Project
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
