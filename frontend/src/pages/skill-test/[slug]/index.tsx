import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { serverApiBase } from '@/lib/companyPagesApi';
import Link from 'next/link';
import { ArrowLeft, BrainCircuit, Award, Clock, FileText, ChevronRight } from 'lucide-react';
import { fetchSkillDetailApi, SkillTestSkill, SkillTestTopic, SkillTestAssessment } from '@/lib/skillTestApi';

import { nameFromSlug, withPageTitle } from '@/components/common/withPageTitle';
type SkillInitial = { skill: SkillTestSkill; topics: SkillTestTopic[]; assessment: SkillTestAssessment | null } | null;

const SITE = 'https://tieedu.in';

function SkillDetail({ initial = null }: { initial?: SkillInitial }) {
  const router = useRouter();
  const { slug } = router.query;
  // Server-rendered (SEO_GROWTH_PLAN §2.1): Google gets the name, description
  // and topics in the HTML; the browser only refetches if it has nothing.
  const [skill, setSkill] = useState<SkillTestSkill | null>(initial?.skill ?? null);
  const [topics, setTopics] = useState<SkillTestTopic[]>(initial?.topics ?? []);
  const [assessment, setAssessment] = useState<SkillTestAssessment | null>(initial?.assessment ?? null);
  const [loading, setLoading] = useState(!initial);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!router.isReady || typeof slug !== 'string') return;
    if (initial && initial.skill.slug === slug) return;
    setLoading(true);
    fetchSkillDetailApi(slug)
      .then((d) => {
        // Company tests live inside the company plan (INFOSYS_SE_3T_UX_PLAN §4).
        const company = (d.skill as { company_slug?: string })?.company_slug;
        if (company) { router.replace(`/prep/${company}?tab=test`); return; }
        setSkill(d.skill); setTopics(d.topics); setAssessment(d.assessment);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [router.isReady, slug, initial]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal border-t-transparent" />
      </div>
    );
  }

  if (notFound || !skill) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900">Skill Not Found</h1>
          <Link href="/skill-test" className="mt-4 inline-block text-link font-medium">
            Back to Skill Test
          </Link>
        </div>
      </div>
    );
  }

  const minutes = assessment?.durationMinutes ?? skill.avgCompletionTime;
  const pageTitle = `${skill.name} Skill Test — Free Online Test with Certificate`;
  const pageDesc = (
    skill.shortDescription ||
    skill.description ||
    `Free ${skill.name} skill test: ${skill.totalQuestions} questions, ${minutes} minutes, with a verifiable certificate.`
  ).replace(/\s+/g, ' ').slice(0, 158);
  const url = `${SITE}/skill-test/${skill.slug}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{`${pageTitle} | TieEdu`}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={url} key="canonical" />
        <meta property="og:title" content={pageTitle} key="og:title" />
        <meta property="og:description" content={pageDesc} key="og:description" />
        <meta property="og:url" content={url} key="og:url" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Quiz',
                  name: `${skill.name} skill test`,
                  description: pageDesc,
                  url,
                  educationalLevel: 'Beginner to Expert',
                  about: topics.slice(0, 12).map((t) => ({ '@type': 'Thing', name: t.name })),
                  timeRequired: `PT${minutes}M`,
                  isAccessibleForFree: true,
                  provider: { '@type': 'Organization', name: 'TieEdu', url: SITE },
                },
                {
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
                    { '@type': 'ListItem', position: 2, name: 'Skill tests', item: `${SITE}/skill-test` },
                    { '@type': 'ListItem', position: 3, name: skill.name, item: url },
                  ],
                },
              ],
            }),
          }}
        />
      </Head>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/skill-test" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Skill Test
        </Link>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-brand-ink px-6 py-8 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white flex-none">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                    {skill.category}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                    <Award className="h-3 w-3" /> Certificate Available
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{skill.name}</h1>
                <p className="mt-2 text-white/80 text-sm sm:text-base">{skill.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/75">
                  <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" />{skill.totalQuestions} Questions</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{assessment?.durationMinutes ?? skill.avgCompletionTime} Minutes</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <h2 className="text-lg font-semibold text-gray-900">Topics Covered</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {topics.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-gray-700 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-signal flex-none" />
                  {t.name}
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-sm text-gray-600">
                <strong className="text-gray-900">Passing Score:</strong> {assessment?.passingScore ?? 60}% &nbsp;·&nbsp;
                <strong className="text-gray-900">Levels:</strong> Beginner → Expert
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/skill-test/${slug}/overview`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-signal px-8 py-3 text-sm font-semibold text-on-primary shadow-sm hover:bg-signal transition-colors"
              >
                Start Assessment <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/skill-test"
                className="inline-flex items-center justify-center rounded-full border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Choose Another Skill
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withPageTitle(SkillDetail, (q) => `${nameFromSlug(q.slug)} skill test`,
  (q) => `Take the free ${nameFromSlug(q.slug)} skill test on TieEdu: see where you stand topic by topic and earn a verifiable certificate.`
);

/**
 * Server render: the skill's real content is in the HTML for search engines.
 * Company tests live inside their company plan, so they redirect here on the
 * server too, instead of flashing this page first.
 */
export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  const slug = String(params?.slug || '');
  if (!/^[a-z0-9-]{1,80}$/i.test(slug)) return { notFound: true };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`${serverApiBase()}/skill-test/skills/${encodeURIComponent(slug)}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (r.status === 404) return { notFound: true };
    if (!r.ok) return { props: { initial: null } };
    const d = await r.json();
    const company = d?.skill?.company_slug;
    if (company) return { redirect: { destination: `/prep/${company}?tab=test`, permanent: false } };
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return { props: { initial: { skill: d.skill, topics: d.topics || [], assessment: d.assessment ?? null } } };
  } catch {
    // API slow or down: render the page and let the browser fetch as before.
    return { props: { initial: null } };
  }
};
