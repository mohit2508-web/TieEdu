import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Server, Heart } from 'lucide-react';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { useAuth } from '@/context/AuthContext';
import { ALL_NAV_ITEMS, type NavItem } from '@/lib/navConfig';

/**
 * Footer order, and the only two destinations it leaves out.
 *
 * `campus` is a B2B control plane for TPOs and is deliberately not advertised
 * to students — an admin reaches it from the header and the drawer. `admin` is
 * kept: the route is a login gate, so linking it is safe and it is how a
 * platform admin signs in.
 */
const FOOTER_EXCLUDED = new Set(['campus']);
const FOOTER_ITEMS: NavItem[] = ALL_NAV_ITEMS.filter((item) => !FOOTER_EXCLUDED.has(item.id));

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
              <h3 className="text-[14px] font-bold text-[#10151C]">Candidate Verified</h3>
              <p className="text-[13px] text-[--text-muted] mt-1 leading-relaxed">Real interview questions verified by candidates placed at top tech firms.</p>
            </div>
          </div>

          <div className="vault-card !shadow-none p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FBF1E1] text-[#C77B12] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#10151C]">View-Only PDF Security</h3>
              <p className="text-[13px] text-[--text-muted] mt-1 leading-relaxed">Watermarked licensed PDFs, server-side unlock checks — no raw download paths.</p>
            </div>
          </div>

          <div className="vault-card !shadow-none p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#E8F4FB] text-[#0284C7] flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#10151C]">Honest, Server-Driven</h3>
              <p className="text-[13px] text-[--text-muted] mt-1 leading-relaxed">Pricing, coupons and unlocks are verified by the backend — no bypasses.</p>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col lg:flex-row items-center justify-between gap-5 text-[13px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <TieEduLogo size="sm" />
            <p>© 2026 TieEdu Technologies. All rights reserved.</p>
          </div>
          {/*
            Derived from `navConfig` instead of a hand-written list. That list had
            already drifted from the header: it was missing Pricing and My
            account, and it pointed "Admin" at `/admin/login` while the header
            pointed at `/admin`. One list cannot drift.
          */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[13px] font-bold text-[#3E4754]">
            {FOOTER_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="transition-colors hover:text-[var(--brand-sky)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-sky)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span>Built for placement season with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>in India</span>
          </div>
        </div>

        {/*
          Privacy note for the email identity cookie (EMAIL_MARKETING_PLAN.md
          Phase 3, item 4): only visitors who arrived from an email are ever
          observed, auth pages never are, and one click of the unsubscribe
          link in any email stops both the mail and the tracking.
        */}
        <p className="pt-4 text-[11px] text-gray-400 leading-relaxed">
          Visitors who arrive through an email link are remembered with a first-party cookie so we can
          see which pages that mail led them to — never the other way round, never on login or admin
          pages, and never for anonymous visitors. Every email carries a one-click unsubscribe that
          stops both mailings and tracking.
        </p>

      </div>
    </footer>
  );
};