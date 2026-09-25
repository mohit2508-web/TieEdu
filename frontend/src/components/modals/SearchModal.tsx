import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchCompanies } from '@/lib/api';
import { Company } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import { Search, X, Building2, FileText, ArrowRight, Sparkles } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies?: Company[];
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, companies: provided }) => {
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>(provided || []);

  useEffect(() => {
    if (provided) {
      setCompanies(provided);
      return;
    }
    let active = true;
    fetchCompanies().then((list) => {
      if (active) setCompanies(list || []);
    }).catch(() => { /* no list — show empty state */ });
    return () => { active = false; };
  }, [provided, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase();
  const matchedCompanies = companies.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.tags || []).some(t => (t || '').toLowerCase().includes(q)) ||
    (c.industry || '').toLowerCase().includes(q)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full p-4 shadow-2xl border border-[#EDEDEB] relative">

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-[#EDEDEB]">
          <Search className="w-5 h-5 text-[#1F3A5F]" />
          <input
            type="text"
            autoFocus
            placeholder="Type a company (e.g. Zscaler, Razorpay) or topic (e.g. Zero Trust)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#8A8A8A] hover:text-[#1A1A1A] hover:bg-[#FAFAF9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="py-3 max-h-80 overflow-y-auto space-y-2">
          {query.trim() === '' ? (
            <div className="p-4 text-xs text-[#8A8A8A] text-center space-y-1">
              <Sparkles className="w-4 h-4 text-[#E8A33D] mx-auto mb-1" />
              <p>Search company vaults and verified interview questions.</p>
              <p className="text-[10px] text-[#A8A8A2]">Use ESC to close</p>
            </div>
          ) : matchedCompanies.length === 0 ? (
            <p className="p-4 text-xs text-[#8A8A8A] text-center">No company vaults match &quot;{query}&quot;</p>
          ) : (
            matchedCompanies.map((c) => (
              <Link
                key={c.id}
                href={`/company/${c.slug}`}
                onClick={onClose}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAFAF9] border border-transparent hover:border-[#EDEDEB] transition-all group text-xs"
              >
                <div className="flex items-center gap-3">
                  <BrandTile name={c.name} src={c.logo_url} className="w-8 h-8 rounded-lg p-0.5" />
                  <div>
                    <span className="font-bold text-[#1A1A1A] group-hover:text-[#1F3A5F] block">{c.name}</span>
                    <span className="text-[10px] text-[#8A8A8A]">{c.industry}{c.avg_rounds ? ` • ${c.avg_rounds} rounds` : ''}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {c.accuracy_score !== null && c.accuracy_score !== undefined ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold text-[10px]">
                      {c.accuracy_score}% Match
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-[#FAFAF9] text-gray-500 rounded font-semibold text-[10px] border border-gray-200">
                      New vault
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-[#8A8A8A] group-hover:text-[#1F3A5F] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))
          )}
        </div>

      </div>
    </div>
  );
};