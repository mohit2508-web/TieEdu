import React from 'react';
import { X, Sparkles, MessageSquarePlus, Award, ArrowRight, ShieldCheck } from 'lucide-react';

interface FeedbackAdModalProps {
  isOpen: boolean;
  companyName?: string;
  onClose: () => void;
  onOpenFeedbackForm: () => void;
}

export const FeedbackAdModal: React.FC<FeedbackAdModalProps> = ({
  isOpen,
  companyName = 'Company',
  onClose,
  onOpenFeedbackForm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-sky-100 relative overflow-hidden my-8">
        
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-[#0284C7] to-emerald-500" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4 text-center">
          {/* Badge icon */}
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
            <Award className="w-7 h-7" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-[#0284C7] text-xs font-bold rounded-full mb-2 border border-sky-100">
              <Sparkles className="w-3.5 h-3.5" /> Community Intelligence Drive
            </span>
            <h3 className="text-xl font-extrabold text-[#1E293B] tracking-tight">
              Did you interview at {companyName}?
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1.5 leading-relaxed max-w-xs mx-auto">
              Share your verified round breakdown &amp; question feedback! Your contribution earns <strong className="text-amber-700 font-bold">+50 XP &amp; +1 Streak</strong> once verified.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-left space-y-2 text-xs text-gray-700">
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> 100% Anonymous or Verified Name option
            </div>
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Sparkles className="w-4 h-4 text-amber-600" /> Unlock special placement contributor badges
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => {
                onClose();
                onOpenFeedbackForm();
              }}
              className="w-full py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MessageSquarePlus className="w-4 h-4" /> Share Feedback &amp; Claim +50 XP
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-colors"
            >
              Remind Me Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
