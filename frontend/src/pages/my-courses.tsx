import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { ProgressBar } from '@/components/courses/CourseUi';
import { tierStyle } from '@/components/courses/CertificatePreview';
import { Award, Download, Gift } from 'lucide-react';
import { fetchMyCourses, downloadCertificatePdf, certificateDownloadPath } from '@/lib/coursesApi';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatRelative } from '@/lib/date';
import { formatLevel } from '@/lib/courseFormat';
import type { MyCoursesCourse, MyCertificate } from '@/types';

/** Small colour-coded chip used for level, tier and distinction labels. */
const Chip: React.FC<{ label: string; color?: string; soft?: string }> = ({ label, color, soft }) => (
  <span
    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
    style={color ? { color, background: soft } : undefined}
  >
    {label}
  </span>
);

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
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-sky-strong)]">
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
              className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)]"
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {inProgress.map((course) => {
                    const tier = tierStyle(course.certificate_tier);
                    const left = Math.max(0, (course.progress.total || 0) - (course.progress.completed || 0));
                    // Only promise the extra gates when the row's booleans say
                    // the course actually has them — no guessing from the UI.
                    const gates: string[] = [];
                    if (course.exam_required) gates.push('final exam');
                    if (course.project_required) gates.push('capstone project');
                    return (
                      <Link
                        key={course.id}
                        href={`/courses/${course.slug}`}
                        className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Chip label={formatLevel(course.level)} />
                          {course.certificate_eligible && (
                            <Chip label={`${tier.label} cert`} color={tier.accent} soft={tier.soft} />
                          )}
                        </div>
                        <h3 className="mt-2 text-base font-bold text-[var(--ink)]">{course.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--text-body)]">
                          {course.subtitle}
                        </p>
                        <div className="mt-4">
                          <ProgressBar
                            percent={course.progress.percent}
                            label={`${course.progress.completed} of ${course.progress.total}`}
                          />
                        </div>
                        {course.last_activity_at && (
                          <p className="mt-3 text-xs text-[var(--text-muted)]">
                            Last active {formatRelative(course.last_activity_at)}
                          </p>
                        )}
                        {left > 0 && course.certificate_eligible && (
                          <p className="mt-1.5 text-xs font-semibold text-[var(--brand-sky)]">
                            {left} lesson{left === 1 ? '' : 's'} from your {tier.label} certificate
                            {gates.length > 0 ? ` + ${gates.join(' + ')}` : ''} →
                          </p>
                        )}
                        {course.perks && course.perks.length > 0 && (
                          <p className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                            <Gift size={12} className="shrink-0" />
                            {course.perks.map((p) => p.label).join(' · ')}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </Section>
            )}

            {completed.length > 0 && (
              <Section title="Completed">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {completed.map((course) => {
                    const tier = tierStyle(course.certificate_tier);
                    const cert = certificates.find((x) => x.course_id === course.id);
                    return (
                      <div
                        key={course.id}
                        className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Chip label={formatLevel(course.level)} />
                          {course.certificate_eligible && (
                            <Chip label={`${tier.label} cert`} color={tier.accent} soft={tier.soft} />
                          )}
                          {cert?.distinction && (
                            <Chip label="With distinction" color="#1B7A4B" soft="#E4F6EC" />
                          )}
                        </div>
                        <div className="mt-2 flex items-start gap-2">
                          <Award size={16} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-[var(--ink)]">{course.title}</h3>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {course.has_certificate ? 'Certificate issued' : 'Certificate not yet claimed'}
                            </p>
                          </div>
                        </div>
                        {/* Both controls clear the 44px thumb floor — at
                            `py-1.5 text-xs` they were ~28px, the smallest
                            targets on the page and the ones a finisher
                            reaches for (audit P21). */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/courses/${course.slug}`}
                            className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--border-strong)] px-4 text-sm font-bold text-[var(--ink)] hover:bg-[var(--bg-surface-hover)]"
                          >
                            Review
                          </Link>
                          {course.has_certificate && (
                            <button
                              type="button"
                              onClick={() => { if (cert) download(cert); }}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-4 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)]"
                            >
                              <Download size={14} /> PDF
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {certificates.length > 0 && (
              <Section
                title="Certificates"
                action={
                  <Link
                    href="/my-certificates"
                    className="inline-flex min-h-[44px] items-center text-xs font-semibold text-[var(--brand-sky)] underline underline-offset-2"
                  >
                    View gallery →
                  </Link>
                }
              >
                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-surface-hover)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
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
                          <td className="px-4 py-2.5 text-xs">{c.serial}</td>
                          <td className="px-4 py-2.5 text-[var(--text-body)]">
                            <span className="flex flex-wrap items-center gap-1.5">
                              {c.course_title}
                              {c.tier && (() => {
                                const tier = tierStyle(c.tier);
                                return <Chip label={tier.label} color={tier.accent} soft={tier.soft} />;
                              })()}
                              {c.distinction && <Chip label="With distinction" color="#1B7A4B" soft="#E4F6EC" />}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                            {formatDate(c.issued_at)}
                          </td>
                          <td className="px-4 py-2.5">
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

const Section: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <section className="mt-10">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-[var(--ink)]">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);
