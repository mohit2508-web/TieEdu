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
      className="vault-card group relative overflow-hidden p-4 sm:p-6 flex flex-col justify-between bg-white active:scale-[0.99] transition-transform"
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-signal via-money/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            <Clock className="w-3 h-3 text-emerald-600" />
            Updated {company.last_updated_days_ago || 1}d ago
          </span>
          {company.difficulty_rating > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-deep bg-warning-soft border border-money/40 px-2.5 py-1 rounded-full" title={`Difficulty ${company.difficulty_rating}/5`}>
              <Star className="w-3.5 h-3.5 fill-money text-amber-deep" />
              {company.difficulty_rating}/5
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-muted)] bg-paper border border-line px-2.5 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 text-text-light" />
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
            <h3 className="font-serif-heading text-lg font-extrabold text-heading group-hover:text-signal transition-colors leading-snug">
              {company.name}
            </h3>
            <p className="text-sm text-[var(--text-muted)] font-medium mt-0.5">{company.industry || 'General'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {(company.tags || []).map((tag, idx) => (
            <span key={idx} className="chip !text-xs !py-1 bg-[var(--bg-surface-hover)] border-line">
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-line my-4 text-center bg-paper rounded-xl">
          <div>
            <span className="text-xs text-[var(--text-muted)] block uppercase font-bold tracking-wider">Duration</span>
            <span className="text-sm font-extrabold text-heading stat-num">
              {company.avg_process_days != null ? `${company.avg_process_days} days` : '—'}
            </span>
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)] block uppercase font-bold tracking-wider">Modules</span>
            <span className="text-sm font-extrabold text-signal stat-num">{company.module_count ?? company.modules?.length ?? 0}</span>
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)] block uppercase font-bold tracking-wider">CTC</span>
            <span className="text-sm font-extrabold text-emerald-700 stat-num">
              {company.ctc_min != null && company.ctc_max != null ? `₹${company.ctc_min}–${company.ctc_max}L` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between text-sm font-bold text-signal group-hover:text-amber-deep transition-colors">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-amber-deep" />
          See the rounds
        </span>
        <div className="w-7 h-7 rounded-full bg-[var(--bg-surface-hover)] group-hover:bg-signal group-hover:text-white flex items-center justify-center transition-all">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
};