import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, BrainCircuit, Award, Clock, FileText, ChevronRight } from 'lucide-react';
import { fetchSkillDetailApi, SkillTestSkill, SkillTestTopic, SkillTestAssessment } from '@/lib/skillTestApi';

export default function SkillDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const [skill, setSkill] = useState<SkillTestSkill | null>(null);
  const [topics, setTopics] = useState<SkillTestTopic[]>([]);
  const [assessment, setAssessment] = useState<SkillTestAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!router.isReady || typeof slug !== 'string') return;
    setLoading(true);
    fetchSkillDetailApi(slug)
      .then((d) => { setSkill(d.skill); setTopics(d.topics); setAssessment(d.assessment); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [router.isReady, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F7BFF] border-t-transparent" />
      </div>
    );
  }

  if (notFound || !skill) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900">Skill Not Found</h1>
          <Link href="/skill-test" className="mt-4 inline-block text-[#0F7BFF] font-medium">
            Back to Skill Test
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/skill-test" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Skill Test
        </Link>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-br from-[#0F7BFF] to-[#0C5AD9] px-6 py-8 sm:px-8">
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
                <p className="mt-2 text-blue-100 text-sm sm:text-base">{skill.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-blue-100">
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
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0F7BFF] flex-none" />
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
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F7BFF] px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0C5AD9] transition-colors"
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
