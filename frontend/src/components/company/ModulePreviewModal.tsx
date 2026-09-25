import React, { useState } from 'react';
import { ContentItem, ContentBlock } from '@/types';
import { ContentBlockRenderer } from '@/components/blocks/ContentBlockRenderer';
import { QuestionDiscussion } from './QuestionDiscussion';
import { X, CheckCircle, Bookmark, Lock, Sparkles, ShieldCheck, Star, Eye, MessageSquare, ArrowRight } from 'lucide-react';

interface ModulePreviewModalProps {
  item: ContentItem | null;
  companyName: string;
  isUnlocked: boolean;
  isSolved: boolean;
  isBookmarked: boolean;
  onClose: () => void;
  onToggleSolve: (itemId: string) => void;
  onToggleBookmark: (itemId: string) => void;
  onUnlockClick: () => void;
}

export const ModulePreviewModal: React.FC<ModulePreviewModalProps> = ({
  item,
  companyName,
  isUnlocked,
  isSolved,
  isBookmarked,
  onClose,
  onToggleSolve,
  onToggleBookmark,
  onUnlockClick
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'discussion'>('content');

  if (!item) return null;

  const isFree = item.is_free_preview || isUnlocked;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 frosted-glass flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#EDEDEB] animate-in zoom-in-95 duration-200 relative"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#FAFAF9] border-b border-[#EDEDEB] flex items-center justify-between shrink-0">
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase border ${
              item.is_free_preview
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-amber-100 text-amber-900 border-amber-200'
            }`}>
              {item.is_free_preview ? '👁️ Free Preview Available' : '🔒 Premium Verified Item'}
            </span>

            <span className="text-xs font-mono font-bold text-[#1F3A5F] bg-[#1F3A5F]/10 px-3 py-1 rounded-xl">
              Role: {item.role_tag || 'SDE-1'}
            </span>

            <span className={`text-xs font-mono font-bold capitalize px-2.5 py-0.5 rounded-lg ${
              item.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
              item.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {item.difficulty} Difficulty
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Solved Toggle */}
            <button
              onClick={() => onToggleSolve(item.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isSolved
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isSolved ? 'Solved' : 'Mark Solved'}</span>
            </button>

            {/* Bookmark Toggle */}
            <button
              onClick={() => onToggleBookmark(item.id)}
              className={`p-2 rounded-xl border transition-all ${
                isBookmarked
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Question Title & Reader Tabs */}
        <div className="px-6 py-5 bg-white border-b border-[#EDEDEB] shrink-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] leading-snug mb-3">
            {item.question_text || 'Interview Question & System Specification'}
          </h2>

          <div className="flex items-center gap-6 text-xs font-mono font-bold text-gray-500">
            <button
              onClick={() => setActiveTab('content')}
              className={`pb-2 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'content' ? 'border-[#E8A33D] text-[#1F3A5F]' : 'border-transparent hover:text-gray-900'
              }`}
            >
              <Eye className="w-4 h-4 text-[#E8A33D]" />
              <span>Verified Solution & Architecture Diagram</span>
            </button>

            <button
              onClick={() => setActiveTab('discussion')}
              className={`pb-2 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'discussion' ? 'border-[#E8A33D] text-[#1F3A5F]' : 'border-transparent hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#1F3A5F]" />
              <span>Candidate Discussion</span>
            </button>
          </div>
        </div>

        {/* Content Body Reader Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {activeTab === 'content' && (
            <div className="space-y-6">
              {item.blocks && item.blocks.length > 0 ? (
                item.blocks.map((block) => (
                  <ContentBlockRenderer
                    key={block.id}
                    block={block}
                    isLocked={!isFree}
                    companyName={companyName}
                    onUnlockClick={onUnlockClick}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-xs font-mono">
                  No preview blocks initialized for this item yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'discussion' && (
            <QuestionDiscussion itemId={item.id} />
          )}

        </div>

        {/* Sticky Paywall Footer for Locked Items */}
        {!isFree && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1F3A5F] via-slate-900 to-[#1F3A5F] text-white shrink-0 border-t border-white/10 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-amber-400 text-base">Unlock Complete {companyName} Intelligence Hub</span>
                <span className="bg-amber-400 text-[#1F3A5F] text-[11px] font-mono px-2.5 py-0.5 rounded-md font-black uppercase">₹249 One-Time</span>
              </div>
              <p className="text-xs text-gray-300">
                Contains the verified questions, solutions and system design guides for this round.
              </p>
            </div>

            <button
              onClick={onUnlockClick}
              className="w-full sm:w-auto px-7 py-3 bg-[#E8A33D] hover:bg-[#D4902C] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 shrink-0"
            >
              <span>Unlock Intelligence Hub Now — ₹249</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
