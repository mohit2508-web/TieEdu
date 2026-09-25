import React, { useEffect, useState } from 'react';
import {
  Building2, BookOpen, Lightbulb, FileSpreadsheet, Flame, Zap, UserCheck,
  Download, ChevronRight, CheckCircle2, Copy, Sparkles, Filter, Lock, ArrowLeft,
  ShoppingCart, Rocket, FileText, Eye
} from 'lucide-react';
import { ContentModule, ModuleSectionData, ModulePdf } from '@/types';
import { API_BASE_URL, downloadPdfApi } from '@/lib/api';
import { PdfViewerModal, preloadPdfjs } from '@/components/viewer/PdfViewerModal';

interface CompanyModuleReaderProps {
  module: ContentModule;
  companyName: string;
  companySlug: string;
  isUnlocked: boolean;
  isModuleUnlocked?: boolean;
  allModules?: ContentModule[];
  onSwitchModule?: (mod: ContentModule) => void;
  onBack: () => void;
  onUnlockClick: () => void;
  unlockPrice?: number;
  initialSection?: 'overview' | 'pdfs';
}

export const CompanyModuleReader: React.FC<CompanyModuleReaderProps> = ({
  module,
  companyName,
  companySlug,
  isUnlocked,
  isModuleUnlocked = isUnlocked,
  allModules,
  onSwitchModule,
  onBack,
  onUnlockClick,
  unlockPrice = 249,
  initialSection = 'overview',
}) => {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'pdfs' | 'core_subjects' | 'interview_questions' | 'cheatsheets' | 'never_skip' | 'last_minute' | 'hr_round'
  >(initialSection);

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [viewerPdf, setViewerPdf] = useState<ModulePdf | null>(null);
  const [dlNote, setDlNote] = useState<string | null>(null);

  const locked = module.is_premium === true && !isModuleUnlocked;
  const sectionData: ModuleSectionData = module.section_data || {};

  // Warm up pdfjs (library + worker) in the background so opening the PDF
  // viewer is instant instead of compiling/downloading it on the click.
  useEffect(() => {
    const t = window.setTimeout(() => { preloadPdfjs().catch(() => {}); }, 400);
    return () => window.clearTimeout(t);
  }, []);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const MissingContent: React.FC<{ label: string }> = ({ label }) =>
    locked ? (
      <div className="py-10 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-gray-900">{label} is part of the premium pack</p>
          <p className="text-base text-gray-500 mt-1">Unlock the vault to read the complete verified guide.</p>
        </div>
        <button
          onClick={onUnlockClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8A33D] hover:bg-[#D4902C] text-white text-sm font-bold rounded-xl transition-colors"
        >
          <ShoppingCart className="w-4 h-4" /> Unlock Full Vault — ₹{unlockPrice}
        </button>
      </div>
    ) : (
      <p className="text-base text-gray-400">{label} content loading...</p>
    );

  const navItems = [
    { id: 'overview', label: '1. Company Overview', icon: Building2 },
    { id: 'pdfs', label: '2. PDF Library', icon: FileText },
    { id: 'core_subjects', label: '3. Core Subjects & PYQs', icon: BookOpen },
    { id: 'interview_questions', label: '4. Technical & Coding Qs', icon: Lightbulb },
    { id: 'cheatsheets', label: '5. Quick Cheatsheets', icon: FileSpreadsheet },
    { id: 'never_skip', label: '6. Never Skip Topics', icon: Flame },
    { id: 'last_minute', label: '7. 24-Hr Revision Pack', icon: Zap },
    { id: 'hr_round', label: '8. HR & Behavioral Round', icon: UserCheck },
  ] as const;

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans"
      style={{ fontFamily: "'Calibre', 'Calibri', 'Inter', -apple-system, sans-serif" }}
    >
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
            title="Back to Modules"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium truncate">
              <span>{companyName}</span>
              <span>/</span>
              <span className="text-[#0284C7] font-semibold truncate">{module.title}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate tracking-tight">
              {module.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {module.is_premium && !isModuleUnlocked && (
            <button
              onClick={onUnlockClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8A33D] hover:bg-[#D4902C] text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Unlock Full Vault — ₹{unlockPrice}
            </button>
          )}

          {module.is_premium && isModuleUnlocked && (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              In your vault
            </span>
          )}

          <button
            onClick={() => setActiveSection('pdfs')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-sm font-bold shadow-xs transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>PDF Guide</span>
          </button>
        </div>
      </header>

      {/* Reader Layout: Left Navigation + Main Content (100% Full Width) */}
      <div className="flex-1 flex flex-col md:flex-row w-full px-4 sm:px-8 py-6 gap-6">

        {/* Left Sidebar (GFG Style) */}
        <aside className="w-full md:w-72 shrink-0 bg-white border border-gray-200 rounded-2xl p-4 h-fit md:sticky md:top-24 shadow-xs">
          <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-3">
            Module Navigator
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                    isActive
                      ? 'bg-[#0284C7]/10 text-[#0284C7] border-l-4 border-[#0284C7] shadow-xs'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#0284C7]' : 'text-gray-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Pack Rounds — jump between premium packs without going back */}
          {allModules && allModules.length > 1 && onSwitchModule && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Pack Rounds — sab kuch yahin
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {allModules.map(m => {
                  const active = m.id === module.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => onSwitchModule(m)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        active
                          ? 'bg-[#0284C7] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-[#0284C7]/10 hover:text-[#0284C7]'
                      }`}
                    >
                      {m.round_type || (m.is_premium ? 'Premium' : 'Free')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Right Main Content Pane (GFG Enlarged Reading Container) */}
        <main className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-xs min-w-0">

          {/* SECTION 1: OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-gray-200 pb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                  <Building2 className="w-7 h-7 text-[#0284C7]" />
                  Company Overview & Recruitment Blueprint
                </h2>
                <p className="text-base text-gray-600 mt-2">
                  Everything you need to know about {companyName} hiring criteria and salary packages.
                </p>
              </div>

              {sectionData.overview ? (
                <div className="space-y-6 text-base sm:text-lg leading-relaxed text-gray-800">
                  <div className="p-5 sm:p-6 bg-sky-50/70 border border-sky-200 rounded-2xl">
                    <h3 className="font-bold text-sky-950 text-lg sm:text-xl mb-2">Company Profile & Target Roles</h3>
                    <p className="text-sky-900 leading-relaxed">{sectionData.overview.companyInfo}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                      <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">Eligibility Criteria</h4>
                      <p className="text-base text-gray-700 leading-relaxed">{sectionData.overview.eligibility}</p>
                    </div>
                    <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                      <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">Salary & CTC Package</h4>
                      <p className="text-base text-gray-700 leading-relaxed">{sectionData.overview.salaryBreakdown}</p>
                    </div>
                  </div>

                  {sectionData.overview.reviews && sectionData.overview.reviews.length > 0 && (
                    <div className="pt-4">
                      <h3 className="font-bold text-gray-900 text-xl mb-4">Student Placement Reviews</h3>
                      <div className="space-y-4">
                        {sectionData.overview.reviews.map((rev, idx) => (
                          <div key={idx} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl text-base space-y-2">
                            <div className="flex items-center justify-between font-bold text-gray-900">
                              <span>{rev.name} ({rev.role})</span>
                              <span className="text-amber-500 font-mono text-lg">★ {rev.rating}/5</span>
                            </div>
                            <p className="text-gray-700 italic leading-relaxed">&quot;{rev.text}&quot;</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <MissingContent label="Overview" />
              )}
            </div>
          )}

          {/* SECTION 2: CORE SUBJECTS & PYQs */}
          {activeSection === 'core_subjects' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                    <BookOpen className="w-7 h-7 text-[#0284C7]" />
                    Core Subjects & Past Year Questions (PYQs)
                  </h2>
                  <p className="text-base text-gray-600 mt-2">
                    DBMS, OS, Networks, DSA, and Aptitude questions asked in 2023, 2024, and 2025 placement drives.
                  </p>
                </div>

                {/* Year Filter Pills */}
                <div className="flex items-center gap-2 shrink-0 bg-gray-100 p-1.5 rounded-xl">
                  <Filter className="w-4 h-4 text-gray-500 ml-1" />
                  {(['all', 2025, 2024, 2023] as const).map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedYear === yr
                          ? 'bg-white text-[#0284C7] shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {yr === 'all' ? 'All Years' : yr}
                    </button>
                  ))}
                </div>
              </div>

              {sectionData.core_subjects && sectionData.core_subjects.length > 0 ? (
                <div className="space-y-8">
                  {sectionData.core_subjects.map((sub, sIdx) => (
                    <div key={sIdx} className="space-y-5">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 border-l-4 border-[#0284C7] pl-4 py-1">
                        {sub.subject}
                      </h3>

                      <div className="space-y-6">
                        {sub.topics.map((topic, tIdx) => (
                          <div key={tIdx} className="p-6 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-4">
                            <h4 className="font-bold text-gray-900 text-lg sm:text-xl">{topic.title}</h4>
                            <div className="text-base sm:text-lg text-gray-800 leading-relaxed whitespace-pre-line">
                              {topic.content}
                            </div>

                            {/* PYQs inside Topic */}
                            {topic.pyqs && topic.pyqs.length > 0 && (
                              <div className="pt-4 border-t border-gray-200 space-y-3">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                  Past Year Questions (Exam Tested):
                                </div>
                                {topic.pyqs
                                  .filter((q) => selectedYear === 'all' || q.year === selectedYear)
                                  .map((pyq, pIdx) => (
                                    <div key={pIdx} className="p-4 bg-white border border-gray-200 rounded-xl text-base space-y-2 shadow-2xs">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-xs">
                                          Year {pyq.year}
                                        </span>
                                        {pyq.frequency && (
                                          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-xs">
                                            {pyq.frequency} Frequency
                                          </span>
                                        )}
                                        <span className="font-bold text-gray-900 text-base sm:text-lg">{pyq.question}</span>
                                      </div>
                                      <div className="text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 text-base leading-relaxed">
                                        <strong className="text-gray-900">Answer:</strong> {pyq.answer}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MissingContent label="Core subjects" />
              )}
            </div>
          )}

          {/* SECTION 3: TECHNICAL & CODING QUESTIONS */}
          {activeSection === 'interview_questions' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-gray-200 pb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                  <Lightbulb className="w-7 h-7 text-[#0284C7]" />
                  Technical & Coding Interview Questions
                </h2>
                <p className="text-base text-gray-600 mt-2">
                  High-frequency technical questions, coding problems, and pseudo-code solutions.
                </p>
              </div>

              {sectionData.interview_questions && sectionData.interview_questions.length > 0 ? (
                <div className="space-y-6">
                  {sectionData.interview_questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-6 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-3 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                          q.category === 'Coding' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {q.category}
                        </span>
                        <h3 className="font-bold text-gray-900 text-lg sm:text-xl">{q.title}</h3>
                      </div>

                      <p className="text-base sm:text-lg text-gray-900 font-bold">Q: {q.question}</p>

                      <div className="p-4 bg-white border border-gray-200 rounded-xl text-base sm:text-lg text-gray-800 leading-relaxed">
                        <strong className="text-sky-900 font-bold">Solution: </strong> {q.solution}
                      </div>

                      {q.code && (
                        <div className="relative bg-[#0F172A] text-gray-100 rounded-xl p-5 font-mono text-sm sm:text-base leading-relaxed overflow-x-auto">
                          <button
                            onClick={() => handleCopyCode(q.code!, qIdx)}
                            className="absolute top-3.5 right-3.5 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedCodeIndex === qIdx ? 'Copied!' : 'Copy Code'}
                          </button>
                          <pre>{q.code}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <MissingContent label="Interview questions" />
              )}
            </div>
          )}

          {/* SECTION 4: CHEATSHEETS */}
          {activeSection === 'cheatsheets' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-gray-200 pb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                  <FileSpreadsheet className="w-7 h-7 text-[#0284C7]" />
                  Quick Cheatsheets & Reference Cards
                </h2>
                <p className="text-base text-gray-600 mt-2">
                  Instant formula cards, time complexities, and key reference sheets.
                </p>
              </div>

              {sectionData.cheatsheets && sectionData.cheatsheets.length > 0 ? (
                <div className="grid grid-cols-1 gap-5">
                  {sectionData.cheatsheets.map((sheet, idx) => (
                    <div key={idx} className="p-6 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                      <h3 className="font-bold text-amber-950 text-xl">{sheet.title}</h3>
                      <p className="text-base text-amber-900">{sheet.summary}</p>
                      <div className="p-4 bg-white border border-amber-200 rounded-xl text-base font-mono text-gray-800 leading-relaxed">
                        {sheet.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MissingContent label="Cheatsheets" />
              )}
            </div>
          )}

          {/* SECTION 5: NEVER SKIP TOPICS */}
          {activeSection === 'never_skip' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-gray-200 pb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                  <Flame className="w-7 h-7 text-amber-600" />
                  Must-Do & &quot;Never Skip&quot; Topics
                </h2>
                <p className="text-base text-gray-600 mt-2">
                  Highest priority concepts that carry 80%+ weightage in {companyName} tests.
                </p>
              </div>

              {sectionData.never_skip_topics && sectionData.never_skip_topics.length > 0 ? (
                <div className="space-y-4">
                  {sectionData.never_skip_topics.map((item, idx) => (
                    <div key={idx} className="p-5 bg-red-50/70 border border-red-200 rounded-2xl flex items-start gap-4">
                      <Flame className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-gray-900 text-lg sm:text-xl">{item.topic}</span>
                          <span className="px-3 py-0.5 bg-red-600 text-white rounded-md text-xs font-extrabold uppercase">
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-base text-gray-700 leading-relaxed">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MissingContent label="Never-skip topics" />
              )}
            </div>
          )}

          {/* SECTION 6: LAST MINUTE REVISION */}
          {activeSection === 'last_minute' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-gray-200 pb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                  <Zap className="w-7 h-7 text-amber-500" />
                  Last-Minute 24-Hour Express Revision Notes
                </h2>
                <p className="text-base text-gray-600 mt-2">
                  Summary bullet points for fast memory recall 24 hours before your interview.
                </p>
              </div>

              {sectionData.last_minute_revision && sectionData.last_minute_revision.length > 0 ? (
                <div className="space-y-5">
                  {sectionData.last_minute_revision.map((lmr, idx) => (
                    <div key={idx} className="p-6 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                      <h3 className="font-bold text-gray-900 text-lg sm:text-xl">{lmr.title}</h3>
                      <ul className="space-y-3">
                        {lmr.points.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-3 text-base sm:text-lg text-gray-800 leading-relaxed">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <MissingContent label="Revision notes" />
              )}
            </div>
          )}

          {/* SECTION 7: HR ROUND */}
          {activeSection === 'hr_round' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-gray-200 pb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                  <UserCheck className="w-7 h-7 text-[#0284C7]" />
                  HR & Behavioral Interview Blueprint
                </h2>
                <p className="text-base text-gray-600 mt-2">
                  Winning STAR model responses to common HR questions.
                </p>
              </div>

              {sectionData.hr_round && sectionData.hr_round.length > 0 ? (
                <div className="space-y-6">
                  {sectionData.hr_round.map((hr, idx) => (
                    <div key={idx} className="p-6 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-4">
                      <h3 className="font-bold text-sky-950 text-lg sm:text-xl">Q: {hr.question}</h3>
                      <div className="p-4 bg-white border border-sky-100 rounded-xl text-base sm:text-lg text-gray-800 leading-relaxed">
                        <strong className="text-sky-950 font-bold">Sample STAR Answer: </strong>
                        {hr.answer}
                      </div>
                      {hr.tips && hr.tips.length > 0 && (
                        <div className="text-base text-gray-700 space-y-2 pt-2">
                          <span className="font-bold text-gray-900">Pro Tips:</span>
                          <ul className="list-disc list-inside space-y-1.5 pl-2">
                            {hr.tips.map((tip, tIdx) => (
                              <li key={tIdx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <MissingContent label="HR round guide" />
              )}
            </div>
          )}

          {/* SECTION: PDF LIBRARY */}
          {activeSection === 'pdfs' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-gray-200 pb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                  <FileText className="w-7 h-7 text-[#0284C7]" />
                  PDF Library — Official Study Guides
                </h2>
                <p className="text-base text-gray-600 mt-2">
                  Admin-uploaded guides for this module. Open them in the in-app reader, or download the original file for offline revision.
                </p>
              </div>

              {module.is_premium && !isModuleUnlocked ? (
                <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-lg">
                    {module.pdf ? module.pdf.title : 'PDF studies are part of the premium pack'}
                  </h3>
                  <p className="text-base text-gray-600 max-w-md mx-auto leading-relaxed">
                    {companyName}&apos;s full vault includes this PDF guide: <strong>{module.pdf ? module.pdf.title + ' — view & download' : 'round-wise guides, cheat sheets, and last-minute revision'}</strong>. Unlock once, and the entire company vault is yours.
                  </p>
                  <button onClick={onUnlockClick} className="inline-flex items-center gap-2 px-6 py-3 bg-[#E8A33D] hover:bg-[#D4902C] text-white text-sm font-bold rounded-xl shadow-md transition-all">
                    <ShoppingCart className="w-4 h-4" /> Unlock Full Vault — ₹{unlockPrice}
                  </button>
                </div>
              ) : module.pdf ? (
                <div className="p-6 bg-sky-50/60 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg truncate">{module.pdf.title}</h3>
                      <p className="text-base text-gray-600 truncate">{module.pdf.file_name} • {(module.pdf.size_bytes > 1024 * 1024) ? `${(module.pdf.size_bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(module.pdf.size_bytes / 1024))} KB`}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => setViewerPdf(module.pdf!)}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-bold rounded-xl shadow-md transition-all"
                    >
                      <Eye className="w-4 h-4" /> Open Viewer
                    </button>
                    <button
                      onClick={() => downloadPdfApi(module.pdf!.stored_name, module.pdf!.file_name)
                        .catch(() => setDlNote('Could not download the PDF right now. Please try again.'))}
                      className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-[#0284C7]/30 hover:border-[#0284C7] text-[#0284C7] text-sm font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                  </div>
                  {dlNote && (
                    <p className="w-full text-sm text-red-600 font-semibold">{dlNote}</p>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl text-center space-y-2">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-base text-gray-500">No PDF uploaded for this module yet — the team is preparing it.</p>
                </div>
              )}
            </div>
          )}

          {/* NEXT-STEP STRIP — after-buy aware */}
          {isUnlocked ? (
            <div className="mt-10 rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-6 sm:p-8 text-center space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-md mb-1">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                  {companyName} vault unlocked — revision mode on
                </h3>
                <p className="text-base text-gray-700 max-w-2xl mx-auto mt-2">
                  Every premium module, PDF guide and quick cheat sheet in this company is now yours to read, download and revise anytime.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all"
                >
                  <BookOpen className="w-4 h-4" /> Browse All Modules
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border-2 border-dashed border-[#0284C7]/40 bg-gradient-to-r from-sky-50 via-white to-amber-50 p-6 sm:p-8 text-center space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0284C7] text-white shadow-md mb-1">
                <Rocket className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                  Finished the free pack? Unlock the rest of {companyName}
                </h3>
                <p className="text-base text-gray-700 max-w-2xl mx-auto mt-2">
                  The full vault adds round-wise DSA topic banks, must-know concepts, high-frequency interview questions, PDF guides and a last-minute revision pack — one unlock, all of it.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={onUnlockClick}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#E8A33D] hover:bg-[#D4902C] text-white text-sm font-bold rounded-xl shadow-md transition-all"
                >
                  <ShoppingCart className="w-4 h-4" /> Unlock Full Vault — ₹{unlockPrice}
                </button>
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:border-[#0284C7] text-[#0284C7] text-sm font-bold rounded-xl transition-all"
                >
                  <BookOpen className="w-4 h-4" /> Browse All Modules
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* PDF Viewer (view-only, watermarked) */}
      <PdfViewerModal
        pdf={viewerPdf}
        moduleTitle={module.title}
        companyName={companyName}
        isOpen={!!viewerPdf}
        onClose={() => setViewerPdf(null)}
      />
    </div>
  );
};
