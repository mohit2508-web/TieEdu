import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, MessageSquare, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { InterviewReport } from '@/types';
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
  rating: number | null;
  isFallback?: boolean;
}

const OUTCOME_META: Record<string, { label: string; chip: string }> = {
  selected: { label: 'SELECTED', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  in_process: { label: 'IN PROCESS', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  pending: { label: 'PENDING', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  rejected: { label: 'REJECTED', chip: 'bg-rose-50 text-rose-800 border-rose-200' },
};

const mapReport = (r: InterviewReport): ExperienceCard => {
  const meta = (r.outcome && OUTCOME_META[r.outcome]) || OUTCOME_META.pending;
  return {
    id: r.id,
    candidate_name: r.user_name,
    role: r.user_role,
    outcomeLabel: r.salary_lpa ? `${meta.label} (₹${r.salary_lpa} LPA)` : meta.label,
    date: r.created_at,
    summary: r.rounds?.[0]?.summary || 'Round-by-round verified drive experience.',
    rounds_passed: (r.rounds || []).map(round => round.round_name),
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
      <div className="p-5 bg-white border border-[#EDEDEB] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-[15px] text-[#1F3A5F] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Verified {companyName} Interview Experiences ({count})
          </h3>
          <p className="text-[13px] text-[--text-muted] mt-0.5">
            Real candidate round-by-round reports published on TieEdu.
          </p>
        </div>

        <button
          onClick={onShare}
          className="px-4 py-2 bg-[#E8A33D] hover:bg-[#D4902C] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm shrink-0 inline-flex items-center gap-1.5"
        >
          <MessageSquare className="w-4 h-4" />
          Share Your Drive Experience
        </button>
      </div>

      {/* Experience Cards */}
      {mode === 'loading' ? (
        <p className="text-[13px] text-[--text-muted]">Loading verified drive logs…</p>
      ) : mode === 'empty' ? (
        <div className="p-8 bg-white border border-[#EDEDEB] rounded-2xl text-center">
          <p className="text-[13px] text-[--text-muted]">
            No verified candidate reports published for {companyName} yet. Be the first —
            share your drive experience below.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {experiences.map((exp) => (
          <div key={exp.id} className="p-5 bg-white border border-[#EDEDEB] rounded-2xl space-y-3 hover:border-[#EDEDEB] hover:shadow-sm transition-all">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-[15px] text-[#1A1A1A]">{exp.candidate_name}</h4>
                <p className="text-[13px] text-[--text-muted]">{exp.role} • {exp.date}</p>
              </div>

              <span className={`px-2.5 py-1 border text-[12px] font-bold rounded-lg whitespace-nowrap bg-emerald-50 text-emerald-800 border-emerald-200`}>
                {exp.outcomeLabel}
              </span>
            </div>

            <p className="text-[14px] text-[#4A4A4A] leading-relaxed">
              &quot;{exp.summary}&quot;
            </p>

            <div className="flex items-center gap-1 text-amber-500">
              {exp.rating ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`w-4 h-4 ${i <= exp.rating! ? 'fill-amber-400 text-amber-500' : 'text-[#E5E5E3]'}`} />
                  ))}
                  <span className="ml-1.5 text-[12px] text-[--text-muted]">content accuracy match</span>
                </>
              ) : (
                <span className="ml-1.5 text-[12px] text-[--text-muted]">No accuracy rating yet</span>
              )}
            </div>

            <div className="pt-2 border-t border-[#EDEDEB]">
              <span className="text-[12px] font-semibold text-[--text-muted] block mb-1.5 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#E8A33D]" /> Rounds Cleared
              </span>
              <div className="flex flex-wrap gap-1.5">
                {exp.rounds_passed.map((r, idx) => (
                  <span key={idx} className="px-2 py-1 rounded-md bg-[#FAFAF9] border border-[#EDEDEB] text-[12px] text-[#1F3A5F] inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {r}
                  </span>
                ))}
              </div>
            </div>

            <p className="flex items-start gap-1.5 text-[12px] text-[--text-muted]">
                <Sparkles className="w-3.5 h-3.5 text-[#E8A33D] mt-0.5 shrink-0" />
                Candidate-verified drive log — reviewed by TieEdu content editors.
              </p>
          </div>
        ))}
      </div>
      )}

    </div>
  );
};