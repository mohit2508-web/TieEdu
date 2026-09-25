import React from 'react';
import { ContentModule, RoundType } from '@/types';
import { ShoppingCart, Eye, Lock, FileText, BadgeCheck, Download } from 'lucide-react';
import { downloadModuleAsMarkdown } from '@/lib/moduleDownload';

interface Props {
  module: ContentModule;
  companyName: string;
  isUnlocked: boolean;
  onAddToCart: (module: ContentModule) => void;
  onPreview: () => void;
}

const ROUND_META: Record<RoundType, { label: string; cls: string; dot: string }> = {
  OA: { label: 'Online Assessment', cls: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-400' },
  Technical: { label: 'Technical Round', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  SystemDesign: { label: 'System Design', cls: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  HR: { label: 'HR Round', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Managerial: { label: 'Managerial', cls: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
};

const MODULE_TYPE_LABEL: Record<string, string> = {
  preparation_guide: 'Preparation Guide',
  hr_question: 'HR Questions',
  technical_question: 'Technical Questions',
  dsa_question: 'DSA Topic-wise',
  system_design: 'System Design',
  cheat_sheet: 'Cheatsheets',
  salary_insight: 'Salary Insights',
  complete_pack: 'Complete Pack',
};

export const PremiumModuleCard: React.FC<Props> = ({ module, companyName, isUnlocked, onAddToCart, onPreview }) => {
  const rm = module.round_type ? ROUND_META[module.round_type] : null;
  const typeLabel = MODULE_TYPE_LABEL[module.module_type] || module.module_type.replace(/_/g, ' ');
  const price = 99;
  const itemCount = module.items?.length || 0;

  return (
    <div className="relative flex flex-col bg-white border border-[var(--border-subtle)] hover:border-[#0284C7]/40 hover:shadow-md rounded-2xl p-5 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {rm && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${rm.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${rm.dot}`} />
              {rm.label}
            </span>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#1F3A5F]/8 text-[#1F3A5F] border border-[#1F3A5F]/15">
            {typeLabel}
          </span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
          Premium
        </span>
      </div>

      <h3 className="text-lg font-extrabold text-gray-900 tracking-tight leading-snug mb-1">{module.title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">
        {module.description || `${companyName} round-specific prep — questions, solutions, and quick revision.`}
      </p>

      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4">
        <FileText className="w-3.5 h-3.5" />
        {itemCount} questions
      </div>

      {isUnlocked ? (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <BadgeCheck className="w-3.5 h-3.5" /> Included in your vault
          </span>
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">One-time purchase · lifetime access</span>
        </div>
      ) : (
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-extrabold text-[var(--brand-primary)]">₹{price}</span>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">One-Time</span>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {isUnlocked ? (
          <button
            onClick={onPreview}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <FileText className="w-4 h-4" /> Open Module
          </button>
        ) : (
          <button
            onClick={() => onAddToCart(module)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E8A33D] hover:bg-[#D4902C] text-white text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" /> Add to Cart — ₹{price}
          </button>
        )}
        <div className="flex gap-2">
          {isUnlocked ? (
            <button
              onClick={() => downloadModuleAsMarkdown(module, companyName, false)}
              title="Download (.md)"
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-800 text-xs font-bold rounded-xl transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download Notes (.md)
            </button>
          ) : (
            <button
              onClick={onPreview}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-800 text-xs font-bold rounded-xl transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview Module
            </button>
          )}
          {!isUnlocked && (
            <span className="inline-flex items-center gap-1 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-400 text-[11px] font-semibold rounded-xl">
              <Lock className="w-3 h-3" /> Unlocks with pack
            </span>
          )}
        </div>
      </div>
    </div>
  );
};