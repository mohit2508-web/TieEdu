import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Clock, FileText, Award, AlertTriangle, PlayCircle, CheckCircle2 } from 'lucide-react';
import { fetchSkillDetailApi, SkillTestSkill, SkillTestTopic, SkillTestAssessment } from '@/lib/skillTestApi';

export default function AssessmentOverview() {
  const router = useRouter();
  const { slug } = router.query;
  const [skill, setSkill] = useState<SkillTestSkill | null>(null);
  const [topics, setTopics] = useState<SkillTestTopic[]>([]);
  const [assessment, setAssessment] = useState<SkillTestAssessment | null>(null);

  const skillName = skill?.name || String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    if (!router.isReady || typeof slug !== 'string') return;
    fetchSkillDetailApi(slug)
      .then((d) => { setSkill(d.skill); setTopics(d.topics); setAssessment(d.assessment); })
      .catch(() => { /* keep fallback name */ });
  }, [router.isReady, slug]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={`/skill-test/${slug}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0F7BFF]">
              <PlayCircle className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{skillName} Skill Assessment</h1>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: FileText, label: 'Questions', value: String(assessment?.totalQuestions ?? skill?.totalQuestions ?? 30) },
              { icon: Clock, label: 'Duration', value: `${assessment?.durationMinutes ?? skill?.avgCompletionTime ?? 30} min` },
              { icon: Award, label: 'Pass Score', value: `${assessment?.passingScore ?? 60}%` },
              { icon: CheckCircle2, label: 'Certificate', value: skill?.certificateAvailable !== false ? 'Eligible' : 'None' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center">
                  <Icon className="mx-auto h-5 w-5 text-[#0F7BFF]" />
                  <p className="mt-1 text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-900">Topics Covered</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {(topics.length > 0 ? topics.map((t) => t.name) : ['Fundamentals', 'Core Concepts', 'Practical Understanding', 'Scenario-based']).map((t) => (
                <span key={t} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#0F7BFF]">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-none mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Important</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Do not refresh during assessment</li>
                  <li>Make sure you have a stable internet connection</li>
                  <li>Submit only when you are ready</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/skill-test/${slug}/assessment`}
              className="inline-flex items-center justify-center rounded-full bg-[#0F7BFF] px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0C5AD9] transition-colors"
            >
              Start Assessment
            </Link>
            <Link
              href={`/skill-test/${slug}`}
              className="inline-flex items-center justify-center rounded-full border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
