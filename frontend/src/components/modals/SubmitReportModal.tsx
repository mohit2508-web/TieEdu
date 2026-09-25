import React, { useState } from 'react';
import { submitInterviewReportForCompanyApi } from '@/lib/api';
import { X, Send, Award, CheckCircle2 } from 'lucide-react';

interface SubmitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyId?: string;
  onSubmitted?: () => void;
}

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EDEDEB] relative">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EDEDEB] mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-[#1F3A5F]">Submit Verified Interview Report</h3>
            <p className="text-[13px] text-[--text-muted]">Earn +50 XP once reviewed by admin content editors</p>
          </div>
          <button onClick={onClose} className="p-1 text-[--text-muted] hover:text-[#1A1A1A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-base text-[#1A1A1A]">Report Submitted for Moderation!</h4>
            <p className="text-[13px] text-[--text-muted]">+50 XP will be added to your account upon admin approval.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-[14px]">
            <div>
              <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1">Target Company</label>
              <input
                type="text"
                disabled
                value={companyName}
                className="w-full px-3 py-2 bg-[#FAFAF9] border rounded-lg text-[--text-muted] font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sethi"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1">Interview Outcome</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg text-[#1A1A1A] bg-white"
                >
                  <option value="selected">Selected</option>
                  <option value="in_process">In Process</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1">Round-by-Round Breakdown</label>
              <textarea
                rows={3}
                required
                placeholder="Detail the questions asked, difficulty, and whether TieEdu vault content matched your interview..."
                value={roundSummary}
                onChange={(e) => setRoundSummary(e.target.value)}
                className="w-full p-3 border rounded-lg text-[#1A1A1A]"
              ></textarea>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1">Content Accuracy Match (1-5 Stars)</label>
              <div className="flex gap-3 items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setAccuracyRating(star)}
                    className={`px-3 py-1 rounded border font-bold text-[13px] ${
                      accuracyRating === star ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]' : 'bg-[#FAFAF9] text-[#4A4A4A]'
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#1F3A5F] hover:bg-[#2A4D7E] text-white text-[14px] font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all mt-2"
            >
              <Send className="w-4 h-4" /> Submit &amp; Claim +50 XP
            </button>
          </form>
        )}

        <div className="mt-4 flex items-start gap-1.5 text-[12px] text-[--text-muted]">
          <Award className="w-3.5 h-3.5 text-[#B45309] mt-0.5 shrink-0" />
          Reports appear on the company page only after verification by our content editors.
        </div>
      </div>
    </div>
  );
};