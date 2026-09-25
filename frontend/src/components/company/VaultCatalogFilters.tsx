import React from 'react';
import { Search, Filter, Sparkles, Check } from 'lucide-react';

interface VaultCatalogFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedIndustry: string;
  onSelectIndustry: (ind: string) => void;
}

const INDUSTRIES = [
  'All',
  'Product MAANG',
  'Cybersecurity & Cloud',
  'Fintech & Payments',
  'IT Services & Consulting',
  'High CTC Tier-1'
];

export const VaultCatalogFilters: React.FC<VaultCatalogFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedIndustry,
  onSelectIndustry
}) => {
  return (
    <div className="w-full space-y-4">
      
      {/* Search Input Bar */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search 10+ company recruitment vaults (e.g. Google, Zscaler, TCS, Rate Limiter)..."
          className="w-full pl-12 pr-4 py-3 text-sm sm:text-base bg-white border border-[#EDEDEB] rounded-2xl shadow-xs focus:ring-2 focus:ring-[#E8A33D] focus:outline-none transition-all"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {INDUSTRIES.map((ind) => {
          const isActive = selectedIndustry === ind;
          return (
            <button
              key={ind}
              onClick={() => onSelectIndustry(ind)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl font-mono transition-all border ${
                isActive
                  ? 'bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-2xs'
                  : 'bg-white text-gray-700 border-[#EDEDEB] hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {ind}
            </button>
          );
        })}
      </div>

    </div>
  );
};
