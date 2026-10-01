import React, { useState } from 'react';
import { submitInterviewReportForCompanyApi } from '@/lib/api';
import { Send, Award, CheckCircle2, Building2 } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';

interface SubmitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyId?: string;
  onSubmitted?: () => void;
}

const FORM_ID = 'submit-report-form';

/**
 * Phase 2: bottom sheet with the submit action pinned in a sticky footer, so the
 * primary button never scrolls out of reach on a short phone. Escape and the
 * body scroll lock both come from `Sheet` — this modal is prop-driven and is not
 * in the `ShellContext` overlay stack, so it previously had neither and the page
 * scrolled behind it.
 */
export const SubmitReportModal: React.FC<SubmitReportModalProps> = ({
  isOpen,
  onClose,
  companyName,
  companyId,
  onSubmitted,
}) => {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('SDE-1 Security');
  const [roundSummary, setRoundSummary] = useState('');
  const [accuracyRating, setAccuracyRating] = useState(5);
  const [outcome, setOutcome] = useState<'selected' | 'rejected' | 'in_process'>('selected');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const reportData = {
        company_name: companyName,
        user_name: userName || 'Candidate',
        user_role: userRole,
        accuracy_rating: accuracyRating,
        outcome,
        round_summary: roundSummary || 'Core questions asked',
      };

      if (companyId) {
        await submitInterviewReportForCompanyApi(companyId, reportData);
      } else {
        const { submitInterviewReportApi } = await import('@/lib/api');
        await submitInterviewReportApi(reportData);
      }

      setIsSubmitting(false);
      setSubmitted(true);
      onSubmitted?.();
      setTimeout(() => {
        setSubmitted(false);
        setUserName('');
        setRoundSummary('');
        setAccuracyRating(5);
        setErrorMsg(null);
        onClose();
      }, 1800);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Submission failed. Please try again.');
    }
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title="Submit verified report"
      zIndex={50}
      data-testid="submit-report"
      footer={
        // Lives outside the <form> so it can stay pinned while the fields scroll.
        // `form=` is the HTML5 way to submit a form from a foreign element.
        !submitted && (
          <button
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#1F3A5F] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2A4D7E] disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> Submit &amp; Claim +50 XP
          </button>
        )
      }
    >
      <div className="px-5 pb-5">
        <p className="text-[13px] text-[color:var(--text-muted)]">
          Earn +50 XP once reviewed by admin content editors
        </p>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 mt-4 bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold rounded-lg"
          >
            {errorMsg}
          </div>
        )}

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-base text-[#1A1A1A]">Report Submitted for Moderation!</h4>
            <p className="text-[13px] text-[color:var(--text-muted)]">
              +50 XP will be added to your account upon admin approval.
            </p>
          </div>
        ) : (
          <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-3 mt-4 text-[14px]">
            {/*
              Static text, not a disabled input. The company is fixed by the page
              you opened this from, so an input implies it is editable and invites
              the question "why can't I change it?" (plan §11).
            */}
            <div className="flex items-center gap-2 rounded-lg border border-[#EDEDEB] bg-[#FAFAF9] px-3 py-2.5">
              <Building2 className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
              <span className="truncate text-[14px] font-semibold text-[color:var(--text-muted)]">
                {companyName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="report-name" className="block text-[13px] font-semibold text-[#1A1A1A] mb-1">
                  Your Name
                </label>
                <input
                  id="report-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  enterKeyHint="next"
                  placeholder="e.g. Vikram Sethi"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-base md:text-[14px] text-[#1A1A1A]"
                />
              </div>

              <div>
                <label htmlFor="report-outcome" className="block text-[13px] font-semibold text-[#1A1A1A] mb-1">
                  Interview Outcome
                </label>
                <select
                  id="report-outcome"
                  name="outcome"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as any)}
                  className="w-full px-3 py-2.5 border rounded-lg text-base md:text-[14px] text-[#1A1A1A] bg-white"
                >
                  <option value="selected">Selected</option>
                  <option value="in_process">In Process</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="report-summary" className="block text-[13px] font-semibold text-[#1A1A1A] mb-1">
                Round-by-Round Breakdown
              </label>
              <textarea
                id="report-summary"
                name="roundSummary"
                rows={3}
                required
                enterKeyHint="done"
                placeholder="Detail the questions asked, difficulty, and whether TieEdu vault content matched your interview..."
                value={roundSummary}
                onChange={(e) => setRoundSummary(e.target.value)}
                className="w-full p-3 border rounded-lg text-base md:text-[14px] text-[#1A1A1A]"
              ></textarea>
            </div>

            <div>
              <span className="block text-[13px] font-semibold text-[#1A1A1A] mb-1">
                Content Accuracy Match (1-5 Stars)
              </span>
              <div className="flex gap-2 items-center" role="radiogroup" aria-label="Content accuracy match">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={accuracyRating === star}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    key={star}
                    onClick={() => setAccuracyRating(star)}
                    className={`min-w-[44px] min-h-[44px] rounded-lg border font-bold text-[13px] ${
                      accuracyRating === star
                        ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]'
                        : 'bg-[#FAFAF9] text-[#4A4A4A]'
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        <div className="mt-4 flex items-start gap-1.5 text-[12px] text-[color:var(--text-muted)]">
          <Award className="w-3.5 h-3.5 text-[#B45309] mt-0.5 shrink-0" />
          Reports appear on the company page only after verification by our content editors.
        </div>
      </div>
    </Sheet>
  );
};
