import React from 'react';
import Link from 'next/link';
import { Company } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import { ShieldCheck, Clock, ArrowRight, Star, Building2 } from 'lucide-react';

interface CompanyCardProps {
  company: Company;
  onUnlock?: (company: Company) => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => {
  return (
    <Link
      href={`/company/${company.slug}`}
      className="vault-card group relative overflow-hidden p-6 flex flex-col justify-between bg-white"
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0284C7] via-[#E8A33D]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            <Clock className="w-3 h-3 text-emerald-600" />
            Updated {company.last_updated_days_ago || 1}d ago
          </span>
          {company.difficulty_rating > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C77B12] bg-[#FBF1E1] border border-[#F1DFC2] px-2.5 py-1 rounded-full" title={`Difficulty ${company.difficulty_rating}/5`}>
              <Star className="w-3.5 h-3.5 fill-[#E8A33D] text-[#E8A33D]" />
              {company.difficulty_rating}/5
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7D8794] bg-[#F7F6F3] border border-[#ECEAE4] px-2.5 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 text-[#C9C7C1]" />
              Not rated
            </span>
          )}
        </div>

        <div className="flex items-start gap-4 mb-4">
          <BrandTile
            name={company.name}
            src={company.logo_url}
            className="w-14 h-14 rounded-2xl p-1 shadow-soft group-hover:scale-[1.04] transition-transform"
          />
          <div>
            <h3 className="font-serif-heading text-lg font-extrabold text-[#10151C] group-hover:text-[#0271B5] transition-colors leading-snug">
              {company.name}
            </h3>
            <p className="text-[13px] text-[#7D8794] font-medium mt-0.5">{company.industry}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {company.tags.map((tag, idx) => (
            <span key={idx} className="chip !text-[11px] !py-1 bg-[var(--bg-surface-hover)] border-[#ECEAE4]">
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#E9E7E1] my-4 text-center bg-[#F7F6F3] rounded-xl">
          <div>
            <span className="text-[10px] text-[#7D8794] block uppercase font-bold tracking-wider">Duration</span>
            <span className="text-[13px] font-extrabold text-[#10151C] stat-num">
              {company.avg_process_days != null ? `${company.avg_process_days} days` : '—'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#7D8794] block uppercase font-bold tracking-wider">Modules</span>
            <span className="text-[13px] font-extrabold text-[#0271B5] stat-num">{company.module_count ?? company.modules?.length ?? 0}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#7D8794] block uppercase font-bold tracking-wider">CTC</span>
            <span className="text-[13px] font-extrabold text-emerald-700 stat-num">
              {company.ctc_min != null && company.ctc_max != null ? `₹${company.ctc_min}–${company.ctc_max}L` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between text-[13px] font-bold text-[#0271B5] group-hover:text-[#E8A33D] transition-colors">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#E8A33D]" />
          Explore Intelligence Hub
        </span>
        <div className="w-7 h-7 rounded-full bg-[var(--bg-surface-hover)] group-hover:bg-[#0284C7] group-hover:text-white flex items-center justify-center transition-all">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
};