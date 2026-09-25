import React, { useState, useEffect } from 'react';
import { Users, Building, ShieldCheck, Award, Sparkles, ArrowRight, BarChart3 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export const CampusDashboardView: React.FC = () => {
  const [cohort, setCohort] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/campus/cohort`)
      .then(res => res.json())
      .then(data => setCohort(data))
      .catch(() => setCohort(null));
  }, []);

  if (!cohort) {
    return (
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <div className="bg-white border border-[#EDEDEB] p-10 rounded-3xl text-center">
          <p className="text-sm text-[--text-muted]">
            Campus cohort analytics are loading.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
      
      {/* Banner */}
      <div className="bg-[#1F3A5F] text-white p-6 sm:p-8 rounded-3xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-amber-300 border border-white/20 mb-3">
            <Building className="w-3.5 h-3.5 text-[#E8A33D]" />
            B2B Campus Placement Cell Control Plane
          </div>
          <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold mb-2">
            {cohort.institution_name} — Cohort Dashboard ({cohort.batch_year})
          </h1>
          <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
            Institutional cohort analytics for Training & Placement Officers (TPOs). Monitor candidate prep velocity, company target density, and verified accuracy scores in real time.
          </p>
        </div>

        <div className="bg-white/10 p-4 rounded-2xl border border-white/20 text-center shrink-0">
          <span className="text-[10px] text-indigo-200 uppercase font-mono block">Institutional Status</span>
          <span className="font-bold text-emerald-400 text-sm flex items-center justify-center gap-1 mt-1">
            <ShieldCheck className="w-4 h-4" /> {cohort.status === 'active_license' ? 'Active License' : 'Live Data'}
          </span>
        </div>
      </div>

      {/* Stats Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-[#EDEDEB] shadow-sm space-y-1">
          <span className="text-xs text-[--text-muted] font-semibold block">Total Batch Students</span>
          <div className="flex items-baseline justify-between">
            <span className="font-serif-heading text-3xl font-bold text-[#1A1A1A]">{cohort.total_students}</span>
            <Users className="w-5 h-5 text-[#1F3A5F]" />
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block">Class of {cohort.batch_year} Batch</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EDEDEB] shadow-sm space-y-1">
          <span className="text-xs text-[--text-muted] font-semibold block">Active Prep Rate</span>
          <div className="flex items-baseline justify-between">
            <span className="font-serif-heading text-3xl font-bold text-[#1E8E5A]">{cohort.prep_rate_percent}%</span>
            <Sparkles className="w-5 h-5 text-[#E8A33D]" />
          </div>
          <span className="text-[10px] text-[--text-muted] block">{cohort.active_prep_students} Candidates Active</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EDEDEB] shadow-sm space-y-1">
          <span className="text-xs text-[--text-muted] font-semibold block">Average Student XP</span>
          <div className="flex items-baseline justify-between">
            <span className="font-serif-heading text-3xl font-bold text-[#1F3A5F]">{cohort.avg_xp ?? 0}</span>
            <Award className="w-5 h-5 text-[#1F3A5F]" />
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block">Live from registered TieEdu accounts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EDEDEB] shadow-sm space-y-1">
          <span className="text-xs text-[--text-muted] font-semibold block">Verified Drive Reports</span>
          <div className="flex items-baseline justify-between">
            <span className="font-serif-heading text-3xl font-bold text-[#E8A33D]">{cohort.verified_reports_submitted ?? 0} Published</span>
            <BarChart3 className="w-5 h-5 text-[#E8A33D]" />
          </div>
          <span className="text-[10px] text-[--text-muted] block">+50 XP credited per approved report</span>
        </div>
      </div>

      {/* Companies with published candidate reports */}
      <div className="bg-white border border-[#EDEDEB] p-6 rounded-2xl shadow-sm">
        <h3 className="font-serif-heading text-lg font-bold text-[#1A1A1A] mb-4">
          Companies Ranked by Published Candidate Reports
        </h3>

        <div className="space-y-4">
          {(cohort.top_targeted_companies || []).length === 0 && (
            <p className="text-xs text-[--text-muted]">
              No published candidate reports yet — rankings appear once verified reports are approved.
            </p>
          )}
          {(cohort.top_targeted_companies || []).map((c: any, idx: number) => (
            <div key={idx} className="p-4 bg-[#FAFAF9] rounded-xl border border-[#EDEDEB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-[#1A1A1A] mb-1">{c.name}</h4>
                <p className="text-xs text-[--text-muted]">{c.candidates_targeting} Published Candidate Reports</p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  {c.avg_score != null ? (
                    <>
                      <span className="text-xs font-bold text-[#1E8A5A] block">{c.avg_score}% Matched</span>
                      <span className="text-[10px] text-[--text-muted]">Questions Matched</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-[--text-muted]">Match rate pending reports</span>
                  )}
                </div>
                <div className="w-32 bg-[#EDEDEB] h-2.5 rounded-full overflow-hidden">
                  {c.avg_score != null && (
                    <div className="bg-[#1F3A5F] h-full rounded-full" style={{ width: `${c.avg_score}%` }}></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
