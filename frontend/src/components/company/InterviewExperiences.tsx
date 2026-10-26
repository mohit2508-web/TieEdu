import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, MessageSquare, ShieldCheck, Star } from 'lucide-react';
import { InterviewReport } from '@/types';
import { Stamp } from '@/components/ui';
import { fetchPublishedReportsApi } from '@/lib/api';

interface InterviewExperiencesProps {
  companyName: string;
  companyId: string;
  onShare?: () => void;
}

interface ExperienceCard {
  id: string;
  candidate_name: string;
  role: string;
  outcomeLabel: string;
  date: string;
  summary: string;
  rounds_passed: string[];
  /** Chip colours follow the outcome (a rejection must not look like a win). */
  chip: string;
  /** Admin-attested proof of a selection, if any. */
  verified: { method: 'offer_letter' | 'college_email'; at: string } | null;
  rating: number | null;
  isFallback?: boolean;
}

const OUTCOME_META: Record<string, { label: string; chip: string }> = {
  selected: { label: 'Selected', chip: 'bg-success-soft text-success border-success/30' },
  in_process: { label: 'In process', chip: 'bg-warning-soft text-warning border-warning/30' },
  pending: { label: 'Result pending', chip: 'bg-warning-soft text-warning border-warning/30' },
  rejected: { label: 'Not selected', chip: 'bg-danger-soft text-danger border-danger/30' },
};

const PROOF_LABEL = { offer_letter: 'offer letter', college_email: 'college email' } as const;

const mapReport = (r: InterviewReport): ExperienceCard => {
  const meta = (r.outcome && OUTCOME_META[r.outcome]) || OUTCOME_META.pending;
  return {
    id: r.id,
    candidate_name: r.user_name,
    role: r.user_role,
    outcomeLabel: r.salary_lpa ? `${meta.label} (₹${r.salary_lpa} LPA)` : meta.label,
    date: r.created_at,
    // Not "verified": nothing has verified a report without a stamp.
    summary: r.rounds?.[0]?.summary || 'Round-by-round interview experience.',
    rounds_passed: (r.rounds || []).map(round => round.round_name),
    chip: meta.chip,
    verified:
      r.outcome === 'selected' && r.verification
        ? { method: r.verification.method, at: r.verification.verified_at }
        : null,
    rating: r.accuracy_rating && r.accuracy_rating > 0 ? r.accuracy_rating : null,
  };
};

type LoadMode = 'loading' | 'live' | 'empty';

export const InterviewExperiences: React.FC<InterviewExperiencesProps> = ({
  companyName,
  companyId,
  onShare,
}) => {
  const [experiences, setExperiences] = useState<ExperienceCard[]>([]);
  const [mode, setMode] = useState<LoadMode>('loading');

  useEffect(() => {
    let alive = true;
    setMode('loading');
    fetchPublishedReportsApi(companyId).then(reports => {
      if (!alive) return;
      if (Array.isArray(reports) && reports.length > 0) {
        setExperiences(reports.map(mapReport));
        setMode('live');
      } else {
        setExperiences([]);
        setMode('empty');
      }
    });
    return () => { alive = false; };
  }, [companyId]);

  const count = mode === 'live' ? experiences.length : 0;

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="p-5 bg-white border border-line rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-brand-ink flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Verified {companyName} Interview Experiences ({count})
          </h3>
          <p className="text-sm text-[--text-muted] mt-0.5">
            Real candidate round-by-round reports published on TieEdu.
          </p>
        </div>

        <button
          onClick={onShare}
          className="px-4 py-2 bg-money hover:bg-money text-money-ink text-sm font-bold rounded-xl transition-all shadow-sm shrink-0 inline-flex items-center gap-1.5"
        >
          <MessageSquare className="w-4 h-4" />
          Share Your Drive Experience
        </button>
      </div>

      {/* Experience Cards */}
      {mode === 'loading' ? (
        <p className="text-sm text-[--text-muted]">Loading interview experiences…</p>
      ) : mode === 'empty' ? (
        <div className="p-8 bg-white border border-line rounded-2xl text-center">
          <p className="text-sm text-[--text-muted]">
            No verified candidate reports published for {companyName} yet. Be the first —
            share your drive experience below.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {experiences.map((exp) => (
          <div key={exp.id} className="p-5 bg-white border border-line rounded-2xl space-y-3 hover:border-line hover:shadow-sm transition-all">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-base text-heading">{exp.candidate_name}</h4>
                <p className="text-sm text-[--text-muted]">{exp.role} • {exp.date}</p>
              </div>

              <span className={`px-2.5 py-1 border text-xs font-bold rounded-lg whitespace-nowrap ${exp.chip}`}>
                {exp.outcomeLabel}
              </span>
            </div>

            {exp.verified && (
              <Stamp kind="verified" flat>
                Verified selection · {PROOF_LABEL[exp.verified.method]}
              </Stamp>
            )}

            <p className="text-sm text-body leading-relaxed">
              &quot;{exp.summary}&quot;
            </p>

            <div className="flex items-center gap-1 text-amber-500">
              {exp.rating ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`w-4 h-4 ${i <= exp.rating! ? 'fill-amber-400 text-amber-500' : 'text-white/80'}`} />
                  ))}
                  <span className="ml-1.5 text-xs text-[--text-muted]">content accuracy match</span>
                </>
              ) : (
                <span className="ml-1.5 text-xs text-[--text-muted]">No accuracy rating yet</span>
              )}
            </div>

            <div className="pt-2 border-t border-line">
              <span className="text-xs font-semibold text-[--text-muted] block mb-1.5 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-deep" /> Rounds Cleared
              </span>
              <div className="flex flex-wrap gap-1.5">
                {exp.rounds_passed.map((r, idx) => (
                  <span key={idx} className="px-2 py-1 rounded-md bg-app-warm border border-line text-xs text-brand-ink inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {r}
                  </span>
                ))}
              </div>
            </div>

            <p className="flex items-start gap-1.5 text-xs text-[--text-muted]">
                <MessageSquare className="w-3.5 h-3.5 text-amber-deep mt-0.5 shrink-0" />
                Candidate-verified drive log — reviewed by TieEdu content editors.
              </p>
          </div>
        ))}
      </div>
      )}

    </div>
  );
};