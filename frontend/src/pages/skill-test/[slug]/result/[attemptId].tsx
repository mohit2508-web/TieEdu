import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Award, CheckCircle2, XCircle, MinusCircle, TrendingUp,
  BookOpen, ChevronRight, RotateCcw, Share2, Trophy,
} from 'lucide-react';
import { getResultApi, SkillTestAttempt, SkillTestCertificate, SkillTestRecommendation, TopicPerformance } from '@/lib/skillTestApi';

function getLevel(score: number) {
  if (score >= 90) return { level: 'Expert', color: 'text-purple-600', bg: 'bg-purple-50', ring: 'border-purple-300' };
  if (score >= 75) return { level: 'Advanced', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'border-blue-300' };
  if (score >= 60) return { level: 'Intermediate', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'border-emerald-300' };
  if (score >= 40) return { level: 'Developing', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'border-amber-300' };
  return { level: 'Beginner', color: 'text-gray-600', bg: 'bg-gray-50', ring: 'border-gray-300' };
}

const LEVEL_DISPLAY: Record<string, ReturnType<typeof getLevel>> = {
  expert: getLevel(95),
  advanced: getLevel(80),
  intermediate: getLevel(65),
  developing: getLevel(50),
  beginner: getLevel(20),
};

export default function ResultPage() {
  const router = useRouter();
  const { slug, attemptId } = router.query;
  const [attempt, setAttempt] = useState<SkillTestAttempt | null>(null);
  const [certificate, setCertificate] = useState<SkillTestCertificate | null>(null);
  const [recommendation, setRecommendation] = useState<SkillTestRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!router.isReady || typeof attemptId !== 'string') return;
    getResultApi(attemptId)
      .then((res) => { setAttempt(res.attempt); setCertificate(res.certificate); setRecommendation(res.recommendation); })
      .catch((e) => setError(e?.message || 'Could not load result'))
      .finally(() => { setLoading(false); setTimeout(() => setAnimated(true), 100); });
  }, [router.isReady, attemptId]);

  const score = attempt?.score ?? (Number(router.query.score) || 0);
  const correct = attempt?.correctAnswers ?? (Number(router.query.correct) || 0);
  const incorrect = attempt?.incorrectAnswers ?? (attempt?.totalQuestions ?? 30) - correct;
  const total = attempt?.totalQuestions ?? 30;
  const passed = attempt?.passFail === 'pass' || score >= 60;

  const topicPerf: TopicPerformance[] = attempt?.topicPerformance ?? [];
  const strengths = topicPerf.filter((t) => t.percentage >= 75);
  const weaknesses = topicPerf.filter((t) => t.percentage < 70);

  const levelInfo = attempt?.skillLevel && LEVEL_DISPLAY[attempt.skillLevel]
    ? LEVEL_DISPLAY[attempt.skillLevel]
    : getLevel(score);
  const { level, color, bg, ring } = levelInfo;

  const circumference = 2 * Math.PI * 70;
  const offset = animated ? circumference - (score / 100) * circumference : circumference;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F7BFF] border-t-transparent" />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600">{error || 'Result not found'}</p>
          <Link href="/skill-test" className="mt-3 inline-block text-[#0F7BFF] font-medium">Back to Skill Test</Link>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Score Header */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-500">Assessment Complete</p>
          <div className="mt-4 relative inline-flex items-center justify-center">
            <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
              <circle cx="80" cy="80" r="70" fill="none" stroke="#E5E7EB" strokeWidth="10" />
              <circle
                cx="80" cy="80" r="70" fill="none"
                stroke={passed ? '#0F7BFF' : '#F59E0B'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900">{score}</span>
              <span className="text-sm text-gray-500">/ 100</span>
            </div>
          </div>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${bg} ${color} border ${ring}`}>
              {passed && <Trophy className="h-4 w-4" />}
              {level}
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {correct} correct · {total - correct} incorrect · Score: <strong>{score}/100</strong>
          </p>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {passed ? 'Passed' : 'Not Passed'}
            </span>
          </div>
        </div>

        {/* Topic Performance */}
        <div className="mt-6 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#0F7BFF]" /> Your Performance
          </h2>
          <div className="mt-4 space-y-4">
            {topicPerf.map((t) => (
              <div key={t.topicId}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-700 font-medium">{t.topicName}</span>
                  <span className={`font-semibold ${
                    t.percentage >= 75 ? 'text-emerald-600' : t.percentage >= 60 ? 'text-blue-600' : 'text-red-500'
                  }`}>{t.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      t.percentage >= 75 ? 'bg-emerald-500' : t.percentage >= 60 ? 'bg-blue-500' : 'bg-red-400'
                    }`}
                    style={{ width: animated ? `${t.percentage}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Your Strengths
            </h2>
            <div className="mt-3 space-y-2">
              {strengths.map((s) => (
                <div key={s.topicId} className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-800">{s.topicName}</span>
                    <span className="text-sm font-bold text-emerald-600">{s.percentage}%</span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-600">Strong understanding demonstrated.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-amber-500" /> Focus Areas
            </h2>
            <div className="mt-3 space-y-2">
              {weaknesses.map((w) => (
                <div key={w.topicId} className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-800">{w.topicName}</span>
                    <span className="text-sm font-bold text-amber-600">{w.percentage}%</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-600">
                    Recommended: {w.topicName} fundamentals & practice
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Learning */}
        <div className="mt-6 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#0F7BFF]" /> Recommended Learning
          </h2>
          <div className="mt-3 space-y-2">
            {(recommendation?.recommendedCourses?.length
              ? recommendation.recommendedCourses.map((c, i) => ({
                  key: String(i),
                  title: c.courseTitle || 'Course',
                  reason: c.reason,
                }))
              : weaknesses.map((w) => ({
                  key: w.topicId,
                  title: w.topicName,
                  reason: `Your performance was ${w.percentage}% — below recommended level`,
                }))
            ).map((item) => (
              <Link
                key={item.key}
                href="/courses"
                className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-3 hover:border-blue-300 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.reason}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#0F7BFF] flex-none" />
              </Link>
            ))}
            {weaknesses.length === 0 && !recommendation?.recommendedCourses?.length && (
              <p className="text-sm text-gray-500">Great job — no focus areas identified. Keep it up!</p>
            )}
          </div>
        </div>

        {/* Certificate CTA */}
        {passed && certificate && (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#0F7BFF] to-[#0C5AD9] p-6 text-center text-white shadow-sm">
            <Trophy className="mx-auto h-8 w-8" />
            <p className="mt-2 text-lg font-bold">Congratulations!</p>
            <p className="text-sm text-blue-100">You earned a verified certificate.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href={`/skill-test/certificates/${certificate.certificateId}`}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#0F7BFF] hover:bg-blue-50 transition-colors"
              >
                View Certificate
              </Link>
              <Link
                href="/skill-test/my-certificates"
                className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                My Certificates
              </Link>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 pb-4">
          <Link
            href={`/skill-test/${slug}/assessment`}
            className="flex items-center justify-center gap-2 rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Retake Assessment
          </Link>
          <Link
            href="/skill-test"
            className="flex items-center justify-center gap-2 rounded-full bg-[#0F7BFF] py-3 text-sm font-semibold text-white hover:bg-[#0C5AD9] transition-colors"
          >
            Explore More Skills
          </Link>
        </div>
      </div>
    </div>
  );
}
