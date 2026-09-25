import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StarAnswerBuilder } from '@/components/interview/StarAnswerBuilder';
import { MockInterviewModal } from '@/components/interview/MockInterviewModal';
import { CartModal } from '@/components/checkout/CartModal';
import {
  fetchInterviewModulesApi,
  getInterviewCourseProgressApi,
  saveInterviewCourseProgressApi,
  generateCourseCertificateApi
} from '@/lib/api';
import {
  Sparkles, CheckCircle2, Star, ShieldCheck, Trophy, Award, Search, ChevronDown, ChevronUp,
  Play, BookOpen, Layers, Target, HelpCircle, Lock, ArrowRight, Download, Check, ExternalLink, Zap, X
} from 'lucide-react';

export default function InterviewCoursePage() {
  const [modules, setModules] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(1);

  // User Progress & Certificate State
  const [userProgress, setUserProgress] = useState<{ completed_module_ids: number[]; total_xp: number }>({
    completed_module_ids: [],
    total_xp: 0
  });
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [certificateData, setCertificateData] = useState<any>(null);

  // Cart Modal State for Premium Unlocks
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const modRes = await fetchInterviewModulesApi();
      if (modRes.success && modRes.data) {
        setModules(modRes.data);
      }
      const progRes = await getInterviewCourseProgressApi();
      if (progRes.progress) {
        setUserProgress(progRes.progress);
      }
    }
    loadData();
  }, []);

  const handleToggleModule = async (moduleId: number) => {
    const res = await saveInterviewCourseProgressApi(moduleId);
    if (res.progress) {
      setUserProgress(res.progress);
    }
  };

  const handleGenerateCert = async () => {
    const certRes = await generateCourseCertificateApi(candidateName);
    if (certRes.data) {
      if (certRes.data.status === 'ACTIVE_VALIDATED') {
        setCertificateData(certRes.data);
        setIsCertModalOpen(true);
      } else {
        setCertificateData(certRes.data);
      }
    }
  };

  const categories = ['All', 'Modules 1 - 10', 'Modules 11 - 20', 'Modules 21 - 30', 'Modules 31 - 40', 'Modules 41 - 50'];

  const filteredModules = modules.filter((mod) => {
    const matchesCategory = activeCategory === 'All' || mod.category === activeCategory;
    const matchesSearch =
      mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const completionPercentage = Math.round((userProgress.completed_module_ids.length / (modules.length || 50)) * 100);

  return (
    <>
      <Head>
        <title>Free Online Interview Training Course | 50 Masterclass Modules | TiEedu</title>
        <meta
          name="description"
          content="Learn how to make a great first impression, master the STAR technique, answer probing HR questions, and secure top placement job offers with 50 practice modules."
        />
        <meta name="keywords" content="free online interview training course, STAR technique, interview questions and answers, placement preparation, mock interview simulator" />

        {/* Structured Data FAQPage & Course Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Course',
              name: '50-Module Free Online Interview Training Course',
              description: 'Comprehensive masterclass on job interview preparation, STAR behavioral response framework, body language, and salary negotiation.',
              provider: {
                '@type': 'Organization',
                name: 'TiEedu Placement Intelligence',
                sameAs: 'https://tieedu.com'
              }
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-orange selection:text-white">
        <Header
          cartCount={0}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSearch={() => {}}
          onOpenLeaderboard={() => {}}
        />

        {/* Full-Page Canvas Container */}
        <main className="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-12">
          
          {/* HERO SECTION */}
          <section className="relative bg-gradient-to-br from-slate-900 via-slate-900/90 to-brand-navy border border-slate-800 rounded-3xl p-8 sm:p-12 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-orange/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Hero Text Left */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 bg-brand-orange/15 border border-brand-orange/30 text-brand-orange px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
                  <Sparkles className="w-4 h-4" /> Official 50-Module Masterclass Course
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
                  FREE ONLINE INTERVIEW <br />
                  <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-orange-500 bg-clip-text text-transparent">
                    TRAINING COURSE
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl">
                  Learn how to make a great first impression, master the <strong>S.T.A.R. technique</strong>, navigate difficult scenario-based questions, and secure the job of your dreams.
                </p>

                {/* Trust pills */}
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300 pt-2">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> 100% Free — progress syncs to your account
                  </span>
                </div>

                {/* Hero CTAs */}
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <a
                    href="#curriculum"
                    className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-full shadow-lg shadow-brand-orange/25 transition-all flex items-center gap-2"
                  >
                    Start 50 Modules Now 👉
                  </a>

                  <button
                    onClick={() => setIsMockModalOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm sm:text-base px-6 py-3.5 rounded-full border border-slate-700 transition-all flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 text-emerald-400 fill-current" /> Open Mock Simulator
                  </button>
                </div>
              </div>

              {/* Hero Dashboard Card Right */}
              <div className="lg:col-span-5">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Your Learning Progress</span>
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        {userProgress.completed_module_ids.length} / {modules.length || 50} Modules Done
                      </h4>
                    </div>
                    <span className="text-xl font-extrabold text-brand-orange font-mono">
                      {completionPercentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden mb-6 border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-brand-orange to-amber-500 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>

                  {/* Stat Badges */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-xs text-slate-400 block">Total XP Earned</span>
                      <span className="text-lg font-bold text-amber-400 flex items-center gap-1 font-mono">
                        <Trophy className="w-4 h-4" /> {userProgress.total_xp} XP
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-xs text-slate-400 block">Modules Completed</span>
                      <span className="text-lg font-bold text-emerald-400 flex items-center gap-1 font-mono">
                        <Award className="w-4 h-4" /> {userProgress.completed_module_ids.length}/50
                      </span>
                    </div>
                  </div>

                  {/* Certificate Claim Button */}
                  <button
                    onClick={handleGenerateCert}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Award className="w-4 h-4 text-brand-orange" /> Claim Official Course Certificate
                  </button>

                  {certificateData && certificateData.status !== 'ACTIVE_VALIDATED' && (
                    <p className="mt-3 text-[11px] text-slate-400 leading-relaxed border border-slate-800 bg-slate-900/60 rounded-lg px-3 py-2">
                      The certificate is valid after completing all <strong className="text-slate-200">{certificateData.modules_required || 50} modules</strong>.
                      You have completed <strong className="text-amber-400">{certificateData.total_modules_completed || 0}/{certificateData.modules_required || 50}</strong> —
                      keep going and claim it again.
                    </p>
                  )}
                </div>
              </div>
            </div>

</section>

          {/* 3 CORE LEARNING PILLARS */}
          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                What You&apos;ll Learn In This Course
              </h2>
              <p className="text-sm text-slate-400">
                Master 3 core strategy pillars for interview preparation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pillar 1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 font-bold text-xl">
                  1
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                  PREPARE SMART
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Prepare systematically for your next job interview: understand how interviewers evaluate answers and walk in knowing the core question patterns.
                </p>
                <div className="pt-2 text-xs font-semibold text-blue-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Scoring criteria per module
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-400 font-bold text-xl">
                  2
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                  AVOID COMMON MISTAKES
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Navigate major dos, don&apos;ts, and red-flag traps. Master sample responses to 50 situational, behavioral, and motivational interview questions.
                </p>
                <div className="pt-2 text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> 50 Sample Model Answers
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400 font-bold text-xl">
                  3
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                  BEAT THE COMPETITION
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Practice with the S.T.A.R. answer builder and the interactive mock simulator, then apply the framework in your real interviews.
                </p>
                <div className="pt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> STAR Framework & Mock Simulator
                </div>
              </div>
            </div>
          </section>

          {/* INTERACTIVE STAR BUILDER SECTION */}
          <section className="pt-4">
            <StarAnswerBuilder />
          </section>

          {/* 50-MODULE CURRICULUM ACCORDION & SEARCH */}
          <section id="curriculum" className="space-y-6 pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-brand-orange" />
                  50 Masterclass Course Modules
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Click any module to read detailed sample answers, expert tips, scoring rubrics, and red-flag traps.
                </p>
              </div>

              {/* Search Field */}
              <div className="relative w-full md:w-auto md:min-w-[320px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions (e.g. STAR, Weaknesses, Salary)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-orange transition-all"
                />
              </div>
            </div>

            {/* Filter Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Accordion List */}
            <div className="space-y-3">
              {filteredModules.map((mod) => {
                const isExpanded = expandedModuleId === mod.id;
                const isDone = userProgress.completed_module_ids.includes(mod.id);

                return (
                  <div
                    key={mod.id}
                    className={`bg-slate-900 border rounded-2xl transition-all overflow-hidden ${
                      isExpanded ? 'border-slate-700 shadow-xl' : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Module Title Row */}
                    <div
                      onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                      className="p-5 flex items-center justify-between cursor-pointer select-none bg-slate-900/90 hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Done Checkbox Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleModule(mod.id);
                          }}
                          className={`w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-500'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                              {mod.category}
                            </span>
                            {mod.is_free ? (
                              <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full font-bold">
                                FREE PREVIEW
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-amber-400 border border-amber-900/30 px-2 py-0.5 rounded-full font-bold">
                                FULL MODULE
                              </span>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                            {mod.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                          {isExpanded ? 'Hide Details' : 'View Module'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-brand-orange" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Module Details */}
                    {isExpanded && mod.unlocked === false ? (
                      <div className="p-6 border-t border-slate-800/80 bg-slate-950/60 space-y-6 animate-fadeIn">
                        <div className="py-10 text-center space-y-4">
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                            <Lock className="w-8 h-8" />
                          </div>
                          <div>
                            <h4 className="text-lg font-extrabold text-white">Premium module — sign in to read the full answer</h4>
                            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                              The gold-standard sample answer, S.T.A.R. breakdown and expert tips for this module are reserved for signed-in members.
                            </p>
                          </div>
                          <Link href="/login?next=/interview-course">
                            <span className="inline-flex items-center gap-2 px-6 py-3 bg-brand-orange hover:opacity-90 text-[#1F3A5F] text-sm font-black rounded-xl transition-all">
                              <ArrowRight className="w-4 h-4" /> Sign in — it&apos;s free
                            </span>
                          </Link>
                        </div>
                      </div>
                    ) : isExpanded && (
                      <div className="p-6 border-t border-slate-800/80 bg-slate-950/60 space-y-6 animate-fadeIn">
                        {/* Primary Question Box */}
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                          <span className="text-xs font-bold text-brand-orange uppercase tracking-wider block mb-1">
                            Interview Question Prompt
                          </span>
                          <p className="text-base font-bold text-white">
                            &ldquo;{mod.question}&rdquo;
                          </p>
                          <p className="text-xs text-slate-400 mt-1 italic">
                            {mod.summary}
                          </p>
                        </div>

                        {/* STAR Breakdown Grid if available */}
                        {mod.star_breakdown && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                              S.T.A.R. Breakdown Example
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-blue-950/20 border border-blue-900/40 p-3 rounded-lg text-xs text-slate-300">
                                <strong className="text-blue-400 block mb-0.5">S — Situation:</strong>
                                {mod.star_breakdown.situation}
                              </div>
                              <div className="bg-cyan-950/20 border border-cyan-900/40 p-3 rounded-lg text-xs text-slate-300">
                                <strong className="text-cyan-400 block mb-0.5">T — Task:</strong>
                                {mod.star_breakdown.task}
                              </div>
                              <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg text-xs text-slate-300">
                                <strong className="text-amber-400 block mb-0.5">A — Action:</strong>
                                {mod.star_breakdown.action}
                              </div>
                              <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg text-xs text-slate-300">
                                <strong className="text-emerald-400 block mb-0.5">R — Result:</strong>
                                {mod.star_breakdown.result}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Gold Standard Sample Answer */}
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                            Gold Standard Sample Answer
                          </span>
                          <p className="text-sm text-slate-200 leading-relaxed font-sans bg-slate-950 p-4 rounded-lg border border-slate-800/80">
                            {mod.sample_answer}
                          </p>
                        </div>

                        {/* Tips & Red Flags Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-xl">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                              💡 Expert Advice Tip
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed">{mod.expert_tip}</p>
                          </div>

                          <div className="bg-rose-950/20 border border-rose-900/30 p-4 rounded-xl">
                            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-1">
                              ⚠️ Red-Flag Trap to Avoid
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed">{mod.red_flag_trap}</p>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                          <button
                            onClick={() => handleToggleModule(mod.id)}
                            className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 w-full sm:w-auto rounded-lg text-xs font-semibold transition-all ${
                              isDone
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            {isDone ? 'Marked as Completed (+50 XP)' : 'Mark as Complete (+50 XP)'}
                          </button>

                          <button
                            onClick={() => setIsMockModalOpen(true)}
                            className="inline-flex items-center justify-center gap-1 min-h-[44px] px-4 text-xs font-semibold text-brand-orange hover:text-white transition-colors"
                          >
                            Practice in Simulator <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        <Footer />
      </div>

      {/* MOCK INTERVIEW SIMULATOR MODAL */}
      <MockInterviewModal
        isOpen={isMockModalOpen}
        onClose={() => setIsMockModalOpen(false)}
        modules={modules}
        onXpEarned={(xp) => {
          setUserProgress((prev) => ({
            ...prev,
            total_xp: prev.total_xp + xp
          }));
        }}
      />

      {/* COURSE CERTIFICATE MODAL */}
      {isCertModalOpen && certificateData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsCertModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Document Border */}
            <div className="border-4 border-double border-brand-orange/40 rounded-2xl p-6 sm:p-8 bg-slate-950 text-center space-y-6 relative overflow-hidden">
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-brand-orange uppercase tracking-widest block">
                  OFFICIAL CERTIFICATE OF COMPLETION
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  TiEedu Placement Intelligence Authority
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-brand-orange to-amber-500 mx-auto rounded-full" />
              </div>

              <div className="space-y-2 py-2">
                <span className="text-xs text-slate-400 block">This is to certify that</span>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xl font-bold text-center text-amber-400 px-4 py-1.5 rounded-lg focus:outline-none focus:border-brand-orange"
                />
                <span className="text-xs text-slate-400 block pt-2">
                  has successfully mastered all 50 Modules of the
                </span>
                <p className="text-sm font-semibold text-slate-200">
                  {certificateData.course_name}
                </p>
              </div>

              {/* Certificate Footer Metadata */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 text-left text-xs">
                <div>
                  <span className="text-slate-500 block">Certificate ID:</span>
                  <span className="font-mono text-slate-300 font-bold">{certificateData.certificate_id}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Issue Date:</span>
                  <span className="text-slate-300 font-semibold">{certificateData.completion_date}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Print / Save PDF Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CART MODAL FOR PASS UNLOCKS */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={[]}
        onRemoveItem={() => {}}
        onCheckoutSuccess={() => {}}
      />
    </>
  );
}
