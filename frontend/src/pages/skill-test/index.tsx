import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BrainCircuit, Award, BarChart3, Target, FileCheck, CheckCircle,
  ChevronRight, Clock, Users, Sparkles, ArrowRight, Search, X, SearchX,
} from 'lucide-react';
import { fetchSkillsApi, SkillTestSkill } from '@/lib/skillTestApi';

const FALLBACK_CATEGORIES = [
  {
    name: 'Programming',
    skills: [
      { name: 'Java', slug: 'java', q: 30, min: 30 },
      { name: 'Python', slug: 'python', q: 30, min: 30 },
      { name: 'C++', slug: 'cpp', q: 30, min: 30 },
      { name: 'JavaScript', slug: 'javascript', q: 30, min: 30 },
    ],
  },
  {
    name: 'Core Computer Science',
    skills: [
      { name: 'DSA', slug: 'dsa', q: 30, min: 30 },
      { name: 'DBMS', slug: 'dbms', q: 30, min: 30 },
      { name: 'SQL', slug: 'sql', q: 30, min: 30 },
      { name: 'Operating Systems', slug: 'os', q: 30, min: 30 },
    ],
  },
];

const HOW_IT_WORKS = [
  { icon: Target, title: 'Choose Skill', desc: 'Select from programming or core CS skills' },
  { icon: FileCheck, title: 'Take Assessment', desc: 'Answer 30 questions in 30 minutes' },
  { icon: BarChart3, title: 'Get Insights', desc: 'See strengths, weaknesses & level' },
  { icon: Award, title: 'Earn Certificate', desc: 'Get verified certificate on passing' },
  { icon: CheckCircle, title: 'Showcase', desc: 'Share on LinkedIn & Skill Passport' },
];

type CardSkill = {
  name: string;
  slug: string;
  q: number;
  min: number;
  category: string;
  tags: string[];
};

export default function SkillTestLanding() {
  const [skills, setSkills] = useState<SkillTestSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('All');

  useEffect(() => {
    fetchSkillsApi()
      .then((data) => setSkills(data.filter((s) => s.status === 'active')))
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, []);

  const allSkills = React.useMemo<CardSkill[]>(() => {
    if (skills.length === 0) {
      return FALLBACK_CATEGORIES.flatMap((cat) =>
        cat.skills.map((s) => ({ ...s, category: cat.name, tags: [] as string[] }))
      );
    }
    return skills.map((s) => ({
      name: s.name.replace(' Programming', ''),
      slug: s.slug,
      q: s.totalQuestions,
      min: s.avgCompletionTime,
      category: s.category || 'Others',
      tags: s.tags || [],
    }));
  }, [skills]);

  const catNames = React.useMemo(() => {
    const seen: string[] = [];
    for (const s of allSkills) if (!seen.includes(s.category)) seen.push(s.category);
    return seen;
  }, [allSkills]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return allSkills.filter((s) => {
      if (activeCat !== 'All' && s.category !== activeCat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.slug.includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allSkills, query, activeCat]);

  const groups = React.useMemo(() => {
    const map = new Map<string, CardSkill[]>();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return Array.from(map.entries()).map(([name, list]) => ({ name, skills: list }));
  }, [filtered]);

  const clearFilters = () => {
    setQuery('');
    setActiveCat('All');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F7BFF] via-[#0C5AD9] to-[#0842A9] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-blue-100 mb-6 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Free Skill Assessments
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
              Know Your Skills.
              <br className="sm:hidden" /> <span className="text-blue-200">Prove Them.</span>
            </h1>
            <p className="mt-4 text-base text-blue-100 sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Take free skill assessments, discover your strengths, identify your gaps and earn verified certificates.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/skill-test/java"
                className="rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0F7BFF] shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all"
              >
                Test Your Skills — Free
              </Link>
              <a
                href="#skills"
                className="rounded-full border-2 border-white/60 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Explore Skills
              </a>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-blue-200">
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> 10,000+ Students</span>
              <span className="flex items-center gap-1.5"><Award className="h-4 w-4" /> Verified Certificates</span>
            </div>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section id="skills" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">Choose Your Skill</h2>
          <p className="mt-2 text-gray-600">Start with your area of expertise</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            {/* Search + category filters */}
            <div className="mb-8 space-y-4">
              <div className="relative mx-auto max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search skills — e.g. Python, AWS, Excel"
                  aria-label="Search skills"
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0F7BFF] focus:outline-none focus:ring-2 focus:ring-[#0F7BFF]/20"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {['All', ...catNames].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCat(cat)}
                    className={`min-h-[44px] flex-none whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      activeCat === cat
                        ? 'border-[#0F7BFF] bg-[#0F7BFF] text-white'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:text-[#0F7BFF]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <p className="text-center text-xs text-gray-500" aria-live="polite">
                Showing {filtered.length} of {allSkills.length} skills
                {activeCat !== 'All' && ` in ${activeCat}`}
                {query.trim() && ` for "${query.trim()}"`}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                <SearchX className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-3 text-sm font-medium text-gray-700">No skills match your search</p>
                <p className="mt-1 text-xs text-gray-500">Try a different keyword or clear the filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-full bg-[#0F7BFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0C5AD9] transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              groups.map((cat) => (
                <div key={cat.name} className="mb-10">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-[#0F7BFF]" />
                    {cat.name}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {cat.skills.map((skill) => (
                      <Link
                        key={skill.slug}
                        href={`/skill-test/${skill.slug}`}
                        className="group block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0F7BFF] group-hover:bg-[#0F7BFF] group-hover:text-white transition-colors">
                            <BrainCircuit className="h-5 w-5" />
                          </div>
                          <Award className="h-5 w-5 text-blue-500" />
                        </div>
                        <h4 className="mt-3 text-base font-semibold text-gray-900">{skill.name}</h4>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><FileCheck className="h-3.5 w-3.5" />{skill.q} Q</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{skill.min} min</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-medium text-[#0F7BFF]">Certificate Available</span>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#0F7BFF] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </section>

      {/* How it works */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">How It Works</h2>
            <p className="mt-2 text-gray-600">From assessment to certified skill in 5 steps</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="rounded-2xl bg-white p-5 text-center shadow-sm">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-[#0F7BFF]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-[10px] font-bold text-[#0F7BFF]">STEP {i + 1}</p>
                  <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-[#0F7BFF] to-[#0C5AD9] px-6 py-10 sm:px-10 text-center text-white">
          <h2 className="text-2xl font-bold sm:text-3xl">Don&apos;t Just Say You Know It. Prove It.</h2>
          <p className="mt-2 text-blue-100 max-w-xl mx-auto text-sm sm:text-base">
            Test your technical skills for free, understand where you stand, and earn verified certificates.
          </p>
          <Link
            href="/skill-test/java"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0F7BFF] hover:bg-blue-50 transition-colors"
          >
            Start Free Assessment <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
