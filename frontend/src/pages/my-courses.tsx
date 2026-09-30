import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { ProgressBar } from '@/components/courses/CourseUi';
import { Award, Download } from 'lucide-react';
import { fetchMyCourses, downloadCertificatePdf, certificateDownloadPath } from '@/lib/coursesApi';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/date';
import type { MyCoursesCourse, MyCertificate } from '@/types';

export default function MyCoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [inProgress, setInProgress] = useState<MyCoursesCourse[]>([]);
  const [completed, setCompleted] = useState<MyCoursesCourse[]>([]);
  const [certificates, setCertificates] = useState<MyCertificate[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gate on the id rather than the object: it is the identity that decides
  // *whose* courses to load, and it is a stable primitive, so the effect does
  // not re-run every time the auth context hands back a new object.
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      // Nothing to show without a session, and the API would only 401.
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchMyCourses()
      .then((data) => {
        if (cancelled) return;
        setInProgress(data.in_progress || []);
        setCompleted(data.completed || []);
        setCertificates(data.certificates || []);
        setTotalXp(data.total_xp || 0);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [authLoading, userId]);

  const download = async (cert: MyCertificate) => {
    try {
      const { blobUrl, filename } = await downloadCertificatePdf(certificateDownloadPath(cert.serial));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <Head>
        <title>My courses · TieEdu</title>
      </Head>

      <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-14">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ink)]">My courses</h1>
            <p className="mt-2 text-sm text-[var(--text-body)]">
              Everything you have started, and everything you have finished.
            </p>
          </div>
          {totalXp > 0 && (
            <div className="rounded-xl bg-[var(--brand-sky-soft)] px-4 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky-strong)]">
                Total XP
              </p>
              <p className="text-xl font-extrabold tabular-nums text-[var(--brand-sky-strong)]">
                {totalXp}
              </p>
            </div>
          )}
        </header>

        {!authLoading && !user && (
          <div className="mt-16 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center">
            <p className="text-sm text-[var(--text-body)]">Sign in to see your courses.</p>
            <button
              type="button"
              onClick={() => router.push('/login?next=/my-courses')}
              className="mt-4 rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)]"
            >
              Sign in
            </button>
          </div>
        )}

        {loading && user && <p className="mt-12 text-sm text-[var(--text-muted)]">Loading…</p>}

        {error && (
          <p className="mt-8 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        {user && !loading && (
          <>
            {inProgress.length === 0 && completed.length === 0 && (
              <p className="mt-16 text-center text-sm text-[var(--text-muted)]">
                You have not started a course yet.{' '}
                <Link href="/courses" className="font-semibold text-[var(--brand-sky)] underline underline-offset-2">
                  Browse the catalogue
                </Link>
                .
              </p>
            )}

            {inProgress.length > 0 && (
              <Section title="In progress">
                <div className="grid gap-4 sm:grid-cols-2">
                  {inProgress.map((course) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
                    >
                      <h3 className="text-base font-bold text-[var(--ink)]">{course.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--text-body)]">
                        {course.subtitle}
                      </p>
                      <div className="mt-4">
                        <ProgressBar
                          percent={course.progress.percent}
                          label={`${course.progress.completed} of ${course.progress.total}`}
                        />
                      </div>
                      {course.progress.next_lesson_id && (
                        <p className="mt-3 text-[11px] font-semibold text-[var(--brand-sky)]">
                          Continue where you left off →
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {completed.length > 0 && (
              <Section title="Completed">
                <div className="grid gap-4 sm:grid-cols-2">
                  {completed.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
                    >
                      <div className="flex items-start gap-2">
                        <Award size={16} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-[var(--ink)]">{course.title}</h3>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {course.has_certificate ? 'Certificate issued' : 'Certificate not yet claimed'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] hover:bg-[var(--bg-surface-hover)]"
                        >
                          Review
                        </Link>
                        {course.has_certificate && (
                          <button
                            type="button"
                            onClick={() => { const c = certificates.find((x) => x.course_id === course.id); if (c) download(c); }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--brand-sky-strong)]"
                          >
                            <Download size={13} /> PDF
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {certificates.length > 0 && (
              <Section title="Certificates">
                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-surface-hover)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                        <th className="px-4 py-2.5 font-bold">Serial</th>
                        <th className="px-4 py-2.5 font-bold">Course</th>
                        <th className="px-4 py-2.5 font-bold">Issued</th>
                        <th className="px-4 py-2.5 font-bold">Status</th>
                        <th className="px-4 py-2.5 font-bold" />
                      </tr>
                    </thead>
                    <tbody>
                      {certificates.map((c) => (
                        <tr key={c.serial} className="border-t border-[var(--border-subtle)]">
                          <td className="px-4 py-2.5 font-mono text-xs">{c.serial}</td>
                          <td className="px-4 py-2.5 text-[var(--text-body)]">{c.course_title}</td>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                            {formatDate(c.issued_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={[
                                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                c.status === 'active'
                                  ? 'bg-[var(--bg-sky-soft)] text-[var(--color-success)]'
                                  : 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
                              ].join(' ')}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/verify/${c.serial}`}
                                className="text-xs font-semibold text-[var(--brand-sky)] underline underline-offset-2"
                              >
                                Verify
                              </Link>
                              <button
                                type="button"
                                onClick={() => download(c)}
                                className="text-xs font-semibold text-[var(--brand-sky)] underline underline-offset-2"
                              >
                                PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-10">
    <h2 className="mb-4 text-lg font-bold text-[var(--ink)]">{title}</h2>
    {children}
  </section>
);
