import React from 'react';
import { ContentModule } from '@/types';
import { Sparkles, BookOpen, Download, Lock } from 'lucide-react';
import { downloadModuleAsMarkdown } from '@/lib/moduleDownload';

interface Props {
  module: ContentModule;
  companyName: string;
  onOpenModule: () => void;
  onUnlockClick: () => void;
}

const SECTION_CHIPS = [
  ['Cheatsheets', 'bg-sky-50 text-[#0369A1] border-sky-200'],
  ['DSA topic-wise', 'bg-indigo-50 text-indigo-700 border-indigo-200'],
  ['Core + PYQs', 'bg-violet-50 text-violet-700 border-violet-200'],
  ['Interview Q&A', 'bg-amber-50 text-amber-800 border-amber-200'],
  ['Do-not-skip', 'bg-rose-50 text-rose-700 border-rose-200'],
  ['Last-minute', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  ['HR answers', 'bg-teal-50 text-teal-700 border-teal-200'],
] as const;

export const FeaturedFreeModuleCard: React.FC<Props> = ({ module, companyName, onOpenModule, onUnlockClick }) => {
  const itemCount = module.items?.length || 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#0284C7]/30 bg-white shadow-md p-6 sm:p-8">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0284C7] via-[#38BDF8] to-[#E8A33D]" />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                FREE — Everything in one module
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#1F3A5F]/10 text-[#1F3A5F] border border-[#1F3A5F]/20">
                {itemCount} questions
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {companyName} Complete Preparation Pack
            </h2>
            <p className="text-sm sm:text-base text-gray-700 mt-2 max-w-2xl leading-relaxed">
              Cheatsheets · DSA topic-wise · Core subjects &amp; PYQs · Interview Q&amp;A · Do-not-skip topics · Last-minute revision · HR answers — sab ek saath, bilkul free.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {SECTION_CHIPS.map(([label, cls]) => (
                <span key={label} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch gap-3 shrink-0 lg:pl-6">
          <button
            onClick={onOpenModule}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all"
          >
            <BookOpen className="w-5 h-5" /> Open Free Module
          </button>
          <button
            onClick={() => downloadModuleAsMarkdown(module, companyName, false)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-800 text-sm font-bold rounded-xl transition-all"
          >
            <Download className="w-4 h-4" /> Download (.md)
          </button>
          <button
            onClick={onUnlockClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#E8A33D] hover:bg-[#D4902C] text-white text-sm font-bold rounded-xl shadow-md transition-all"
          >
            <Lock className="w-4 h-4" /> Unlock Premium — ₹249
          </button>
        </div>
      </div>
    </section>
  );
};