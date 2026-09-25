import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Server, Heart } from 'lucide-react';
import { TieEduLogo } from '@/components/common/TieEduLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#E9E7E1] mt-16 pt-12 pb-8">
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-10 border-b border-[#E9E7E1]">
          <div className="vault-card !shadow-none p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#E9F6EE] text-[#15803D] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-[14px] font-bold text-[#10151C]">Candidate Verified</h5>
              <p className="text-[13px] text-[#7D8794] mt-1 leading-relaxed">Real interview questions verified by candidates placed at top tech firms.</p>
            </div>
          </div>

          <div className="vault-card !shadow-none p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FBF1E1] text-[#C77B12] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-[14px] font-bold text-[#10151C]">View-Only PDF Security</h5>
              <p className="text-[13px] text-[#7D8794] mt-1 leading-relaxed">Watermarked licensed PDFs, server-side unlock checks — no raw download paths.</p>
            </div>
          </div>

          <div className="vault-card !shadow-none p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#E8F4FB] text-[#0284C7] flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-[14px] font-bold text-[#10151C]">Honest, Server-Driven</h5>
              <p className="text-[13px] text-[#7D8794] mt-1 leading-relaxed">Pricing, coupons and unlocks are verified by the backend — no bypasses.</p>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col lg:flex-row items-center justify-between gap-5 text-[13px] text-[#7D8794]">
          <div className="flex items-center gap-3">
            <TieEduLogo size="sm" showTagline={false} />
            <p>© 2026 TieEdu Technologies. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[13px] font-bold text-[#3E4754]">
            <Link href="/" className="hover:text-[#0284C7] transition-colors">Vaults</Link>
            <Link href="/compare" className="hover:text-[#0284C7] transition-colors">Compare</Link>
            <Link href="/interview-course" className="hover:text-[#0284C7] transition-colors">Free Course</Link>
            <Link href="/study-plan" className="hover:text-[#0284C7] transition-colors">Study Plan</Link>
            <Link href="/campus" className="hover:text-[#0284C7] transition-colors">Campus TPO Portal</Link>
            <Link href="/admin/login" className="hover:text-[#0284C7] transition-colors">Admin</Link>
          </div>
          <div className="flex items-center gap-1">
            <span>Built for placement season with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>in India</span>
          </div>
        </div>

      </div>
    </footer>
  );
};