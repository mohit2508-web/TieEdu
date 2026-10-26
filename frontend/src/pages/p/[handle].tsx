import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { BadgeCheck, Copy, Download, Flame, Linkedin, Trophy } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, Chip, ProgressRing, SectionHead, Stamp, Ticket } from '@/components/ui';
import { serverApiBase } from '@/lib/companyPagesApi';
import { fetchPublicPassport, PassportView } from '@/lib/passportApi';
import { downloadShareCard, linkedInShareUrl } from '@/lib/shareCard';

/**
 * /p/<handle> — a student's Placement Passport (UI_REDESIGN_PLAN_V2 §6.2).
 *
 * Public only because the student turned it on (lib/passport). Every claim on
 * the page links to the place it can be checked: certificates to their
 * verification pages, readiness to the company's rounds. `noindex`: the
 * student chooses who gets the link; search engines do not list students by
 * name.
 */

export const getServerSideProps: GetServerSideProps<{ passport: PassportView }> = async ({ params }) => {
  const passport = await fetchPublicPassport(String(params?.handle || ''), serverApiBase());
  if (!passport) return { notFound: true };
  return { props: { passport } };
};

const issued = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PassportPage({ passport: p }: { passport: PassportView }) {
  const [copied, setCopied] = useState(false);
  const [making, setMaking] = useState(false);
  // The absolute address is only known in the browser; render the path first so
  // the server and the first client render agree.
  const [url, setUrl] = useState(`/p/${p.handle}`);
  useEffect(() => setUrl(`${window.location.origin}/p/${p.handle}`), [p.handle]);
  const firstName = p.name.split(/\s+/)[0];
  const topSkill = p.skills[0];
  const topCompany = p.companies[0];
  const totalCerts = p.certificates.length + p.skills.filter((s) => s.certificate).length;

  const share = async (format: 'landscape' | 'portrait') => {
    setMaking(true);
    try {
      await downloadShareCard(
        {
          eyebrow: 'Placement Passport',
          headline: p.name,
          stat: topCompany
            ? { value: `${topCompany.readiness}%`, label: `${topCompany.name} readiness` }
            : topSkill
              ? { value: `${topSkill.score}%`, label: `${topSkill.name} skill test` }
              : undefined,
          lines: [
            p.year ? `${p.year} · ${totalCerts} verified certificate${totalCerts === 1 ? '' : 's'}` : `${totalCerts} verified certificate${totalCerts === 1 ? '' : 's'}`,
            p.skills.length ? `Skills: ${p.skills.slice(0, 3).map((s) => s.name).join(', ')}` : '',
          ].filter(Boolean),
          url,
        },
        format,
        `tieedu-passport-${p.handle}-${format}`
      );
    } finally {
      setMaking(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`${p.name} · Placement Passport | TieEdu`}</title>
        <meta name="robots" content="noindex" />
        <meta name="description" content={`${p.name}'s verified skills, certificates and company readiness on TieEdu.`} />
        <meta property="og:title" content={`${p.name} · Placement Passport`} />
        <meta property="og:description" content={`${totalCerts} verified certificates${topCompany ? ` · ${topCompany.readiness}% ready for ${topCompany.name}` : ''}`} />
      </Head>

      <div className="flex min-h-screen flex-col bg-paper">
        <main className="flex-1">
          <section className="bg-brand-ink text-white">
            <div className="mx-auto max-w-[1000px] px-4 py-12 sm:px-6 sm:py-16">
              <p className="eyebrow text-money">Placement Passport</p>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">{p.name}</h1>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
                {p.year && <span>{p.year}</span>}
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4" aria-hidden /> {totalCerts} verified certificate{totalCerts === 1 ? '' : 's'}
                </span>
                {p.courses_completed > 0 && <span>{p.courses_completed} course{p.courses_completed === 1 ? '' : 's'} completed</span>}
                {p.best_streak > 1 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Flame className="h-4 w-4" aria-hidden /> Best streak {p.best_streak} days
                  </span>
                )}
                {p.xp > 0 && <span className="tabular-nums">{p.xp} XP</span>}
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  icon={Linkedin}
                  href={linkedInShareUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share on LinkedIn
                </Button>
                <Button
                  size="sm"
                  kind="secondary"
                  icon={Copy}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      /* clipboard blocked; the address bar still has it */
                    }
                  }}
                >
                  {copied ? 'Link copied' : 'Copy link'}
                </Button>
                <Button size="sm" kind="secondary" icon={Download} disabled={making} onClick={() => share('landscape')}>
                  Image for LinkedIn
                </Button>
                <Button size="sm" kind="secondary" icon={Download} disabled={making} onClick={() => share('portrait')}>
                  Image for Instagram
                </Button>
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-[1000px] space-y-12 px-4 py-12 sm:px-6">
            {p.companies.length > 0 && (
              <section aria-labelledby="ready-title">
                <SectionHead id="ready-title" title="Company readiness" description={`Scored from ${firstName}'s skill tests on each company's rounds.`} />
                <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {p.companies.map((c) => (
                    <li key={c.slug}>
                      <Card className="flex items-center gap-4">
                        <ProgressRing value={c.readiness} size={72} thickness={7} label={`${c.name} readiness`} />
                        <div className="min-w-0">
                          <Link href={`/company/${c.slug}`} className="font-display text-lg font-bold text-heading hover:text-signal">
                            {c.name}
                          </Link>
                          <p className="text-sm text-muted">
                            {c.cleared} of {c.rounds} rounds cleared
                          </p>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {p.skills.length > 0 && (
              <section aria-labelledby="skills-title">
                <SectionHead id="skills-title" title="Skills" description="Best score in each skill test." />
                <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {p.skills.map((s) => (
                    <li key={s.slug}>
                      <Card pad="sm" className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-heading">{s.name}</p>
                          {s.level && <p className="text-sm text-muted">{s.level}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {s.certificate && (
                            <Link href={s.certificate.verify_url} aria-label={`Verify ${s.name} certificate`}>
                              <Stamp kind="verified" flat>Certified</Stamp>
                            </Link>
                          )}
                          <span className="font-display text-2xl font-bold tabular-nums text-heading">{s.score}%</span>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {p.certificates.length > 0 && (
              <section aria-labelledby="certs-title">
                <SectionHead id="certs-title" title="Course certificates" description="Each one opens its own verification page." />
                <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {p.certificates.map((c) => (
                    <li key={c.serial}>
                      <Ticket
                        tone="ink"
                        stub={
                          <>
                            <p className="text-xs font-semibold uppercase tracking-wider">Serial</p>
                            <p className="mt-1 break-all text-xs tabular-nums">{c.serial}</p>
                          </>
                        }
                      >
                        <p className="font-semibold text-heading">{c.title}</p>
                        <p className="mt-1 text-sm text-muted">Issued {issued.format(new Date(c.issued_at))}</p>
                        <Link href={c.verify_url} className="mt-3 inline-flex text-sm font-semibold text-signal hover:underline">
                          Verify this certificate
                        </Link>
                      </Ticket>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {p.companies.length + p.skills.length + p.certificates.length === 0 && (
              <Card className="text-center">
                <Trophy className="mx-auto h-8 w-8 text-muted" aria-hidden />
                <p className="mt-3 font-semibold text-heading">{firstName} has just started.</p>
                <p className="mt-1 text-sm text-muted">Results appear here as tests are passed and certificates are earned.</p>
              </Card>
            )}

            <p className="text-center text-sm text-muted">
              <Chip>TieEdu</Chip> <span className="ml-2">Placement prep for engineering students.</span>{' '}
              <Link href="/" className="font-semibold text-signal hover:underline">
                Make your own passport
              </Link>
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
