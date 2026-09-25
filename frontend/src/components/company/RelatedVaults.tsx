import React from 'react';
import Link from 'next/link';
import { Company } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import { ArrowRight, Sparkles } from 'lucide-react';

interface RelatedVaultsProps {
  currentCompanySlug: string;
  companies: Company[];
}

export const RelatedVaults: React.FC<RelatedVaultsProps> = ({ currentCompanySlug, companies }) => {
  const related = companies.filter(c => c.slug !== currentCompanySlug).slice(0, 3);

  return (
    <div className="w-full bg-[#FAFAF9] border border-[#EDEDEB] rounded-2xl p-6 sm:p-8 space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-bold text-[#1F3A5F] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#E8A33D]" />
            More Company Vaults
          </h3>
          <p className="text-[13px] text-[--text-muted] mt-0.5">
            Browse other company vaults to expand your prep coverage.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {related.map((company) => (
          <Link
            key={company.id}
            href={`/company/${company.slug}`}
            className="p-4 bg-white border border-[#EDEDEB] hover:border-[#E8A33D] rounded-2xl transition-all hover:shadow-md flex flex-col justify-between group"
          >
            <div className="flex items-center gap-3 mb-3">
              <BrandTile
                name={company.name}
                src={company.logo_url}
                className="w-10 h-10 rounded-xl p-1"
              />
              <div>
                <h4 className="font-bold text-[14px] text-[#1A1A1A] group-hover:text-[#E8A33D] transition-colors">{company.name} Vault</h4>
                <p className="text-[13px] text-[--text-muted]">
                  {company.ctc_min != null && company.ctc_max != null
                    ? `₹${company.ctc_min} - ₹${company.ctc_max} LPA`
                    : 'CTC not disclosed'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#EDEDEB] text-[13px] font-semibold text-[#1F3A5F]">
              <span>{company.unlock_count ? `${company.unlock_count} Unlocks` : 'No unlocks yet'}</span>
              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-[#E8A33D]">
                <span>Inspect Vault</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
};