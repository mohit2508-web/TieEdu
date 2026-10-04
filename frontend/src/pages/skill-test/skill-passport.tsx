import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award, ArrowLeft, BookOpen, TrendingUp, Trophy,
  CheckCircle2, ChevronRight, Target, LogIn, Loader2,
} from 'lucide-react';
import { isSignedIn } from '@/lib/auth';
import { fetchPassportApi, SkillTestCertificate } from '@/lib/skillTestApi';

interface PassportSkill {
  skillSlug: string;
  skillName: string;
  score: number;
  level: string;
  attemptId: string;
  date: string;
}

interface PassportData {
  skills: PassportSkill[];
  certificates: SkillTestCertificate[];
  avgScore: number;
  totalCertificates: number;
  totalAttempts: number;
}

const BADGES = [
  { name: 'First Certificate', icon: '🎓', rarity: 'common' },
  { name: 'Improver', icon: '📈', rarity: 'common' },
  { name: '5 Skills Verified', icon: '🏅', rarity: 'epic' },
  { name: '90+ Score', icon: '⭐', rarity: 'legendary' },
];

export default function SkillPassport() {
  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) { setSignedOut(true); setLoading(false); return; }
    fetchPassportApi()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (signedOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0F7BFF]">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Sign in required</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to view your skill passport.</p>
          <Link
            href="/login?next=/skill-test/skill-passport"
            className="mt-6 block w-full rounded-full bg-[#0F7BFF] py-3.5 text-sm font-semibold text-white hover:bg-[#0C5AD9] transition-colors"
          >
            Sign In / Sign Up
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F7BFF]" />
      </div>
    );
  }

  const skills = data?.skills ?? [];
  const certs = data?.certificates ?? [];
  const avgScore = data?.avgScore ?? 0;
  const verifiedCount = skills.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/skill-test"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Skill Test
        </Link>

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0F7BFF] to-[#0C5AD9] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
              {certs[0]?.studentName?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'ST'}
            </div>
            <div>
              <h1 className="text-lg font-bold">{certs[0]?.studentName || 'My Skill Passport'}</h1>
              <p className="text-sm text-blue-100">Skill Passport</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur">
              <p className="text-2xl font-bold">{verifiedCount}</p>
              <p className="text-[10px] text-blue-200">Verified Skills</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur">
              <p className="text-2xl font-bold">{avgScore}</p>
              <p className="text-[10px] text-blue-200">Avg Score</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur">
              <p className="text-2xl font-bold">{data?.totalAttempts ?? 0}</p>
              <p className="text-[10px] text-blue-200">Attempts</p>
            </div>
          </div>
        </div>

        {/* Verified Skills */}
        <div className="mt-6 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-[#0F7BFF]" /> Verified Skills
          </h2>
          {skills.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No attempts yet. Take your first assessment to appear here.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {skills.map((skill) => (
                <Link
                  key={skill.skillSlug}
                  href={`/skill-test/${skill.skillSlug}`}
                  className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-3.5 hover:border-blue-300 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{skill.skillName}</p>
                      <p className="text-xs text-gray-500">{skill.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{skill.score}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#0F7BFF]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="mt-6 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> Badges
          </h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BADGES.map((badge) => (
              <div
                key={badge.name}
                className={`rounded-xl p-3 text-center border ${
                  badge.rarity === 'legendary' ? 'bg-amber-50 border-amber-300' :
                  badge.rarity === 'epic' ? 'bg-purple-50 border-purple-300' :
                  badge.rarity === 'rare' ? 'bg-blue-50 border-blue-300' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-2xl">{badge.icon}</span>
                <p className="mt-1 text-xs font-semibold text-gray-800">{badge.name}</p>
                <p className={`text-[10px] capitalize ${
                  badge.rarity === 'legendary' ? 'text-amber-600' :
                  badge.rarity === 'epic' ? 'text-purple-600' :
                  badge.rarity === 'rare' ? 'text-blue-600' : 'text-gray-500'
                }`}>{badge.rarity}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Certificates Count */}
        <div className="mt-6 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0F7BFF]">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Certificates</p>
                <p className="text-xs text-gray-500">{data?.totalCertificates ?? 0} earned</p>
              </div>
            </div>
            <Link href="/skill-test/my-certificates" className="text-sm font-medium text-[#0F7BFF] hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
