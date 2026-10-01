import React from 'react';
import { Sparkles, MessageSquarePlus, Award, ShieldCheck } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';

interface FeedbackAdModalProps {
  isOpen: boolean;
  companyName?: string;
  onClose: () => void;
  onOpenFeedbackForm: () => void;
}

/**
 * Phase 2 (MOBILE_APP_UI_PLAN.md §6): this used to be a centred dialog with the
 * close button in the top-right corner, the worst thumb-reach target on a phone.
 * It is now a bottom sheet — dismissible by dragging the grabber, backdrop tap,
 * swipe-down, Escape, or a close button inside thumb reach.
 */
export const FeedbackAdModal: React.FC<FeedbackAdModalProps> = ({
  isOpen,
  companyName = 'Company',
  onClose,
  onOpenFeedbackForm,
}) => (
  <Sheet
    open={isOpen}
    onClose={onClose}
    title="Share your experience"
    data-testid="feedback-ad"
    footer={
      <button
        type="button"
        onClick={() => {
          onClose();
          onOpenFeedbackForm();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0284C7] py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#0369A1] active:bg-[#0369A1]"
      >
        <MessageSquarePlus className="h-4 w-4" /> Share Feedback &amp; Claim +50 XP
      </button>
    }
  >
    <div className="space-y-4 px-5 pb-5 pt-1 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-xs">
        <Award className="h-7 w-7" />
      </div>

      <span className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-bold text-[#0284C7]">
        <Sparkles className="h-3.5 w-3.5" /> Community Intelligence Drive
      </span>

      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-gray-600">
        Interviewed at <strong className="font-bold text-gray-900">{companyName}</strong>? Share your
        verified round breakdown and question feedback. Once verified you earn{' '}
        <strong className="font-bold text-amber-700">+50 XP &amp; +1 Streak</strong>.
      </p>

      <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-3.5 text-left text-xs text-gray-700">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> 100% Anonymous or Verified Name option
        </div>
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <Sparkles className="h-4 w-4 text-amber-600" /> Unlock special placement contributor badges
        </div>
      </div>

      {/*
        The secondary action is a text link, not a second button. Plan §6: one
        action per sheet — dismissing is the second action, and the grabber and
        backdrop already offer it.
      */}
      <button
        type="button"
        onClick={onClose}
        className="w-full py-2 text-xs font-bold text-gray-500 transition-colors active:text-gray-800"
      >
        Remind Me Later
      </button>
    </div>
  </Sheet>
);
