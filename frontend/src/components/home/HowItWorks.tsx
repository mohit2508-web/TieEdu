import React from 'react';
import Link from 'next/link';
import { Search, Unlock, GraduationCap, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/home/Reveal';

const STEPS = [
  {
    icon: Search,
    title: 'Pick a company',
    body: 'Open any vault from the directory. The free sections come first — no signup needed to read them.',
    tint: 'text-[#0284C7] bg-[#E8F4FB]',
  },
  {
    icon: Unlock,
    title: 'Unlock the vault',
    body: 'One-time, server-verified price. The Complete Pack always costs less than buying its rounds apart.',
    tint: 'text-[#B45309] bg-[#FBF1E1]',
  },
  {
    icon: GraduationCap,
    title: 'Prep every round',
    body: 'Round-by-round questions, executable DSA code, flowcharts, STAR answers and official PDF guides.',
    tint: 'text-[#15803D] bg-[#E9F6EE]',
  },
];

/*
 * The landing page used to jump from features straight into the directory —
 * a list of companies with no explanation of what happens after you pick one.
 * Three cards, in order, ending in the comparison CTA: this is the story the
 * page was missing.
 */
export const HowItWorks: React.FC = () => (
  <section className="py-14 bg-[var(--bg-app)]">
    <Reveal className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">
      <div className="max-w-2xl mb-8">
        <span className="eyebrow">How it works</span>
        <h2 className="font-serif-heading text-3xl sm:text-4xl font-extrabold text-[#10151C] leading-tight mt-2">
          From company list to offer letter
        </h2>
        <p className="text-[15px] text-[var(--text-muted)] mt-2 leading-relaxed">
          Three steps, no subscription — every price is computed by the same server that charges you.
        </p>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="vault-card p-5 relative">
            <span className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-[#F0EFEC] text-[12px] font-extrabold text-[#5A6470]">
              {i + 1}
            </span>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${s.tint}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <h3 className="text-[15px] font-bold text-[#10151C] mt-3">{s.title}</h3>
            <p className="text-[14px] text-[var(--text-muted)] mt-1 leading-relaxed pr-6">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-7">
        <Link href="/compare" className="btn btn-ghost px-5 py-3 min-h-[44px] text-sm focus-ring">
          Compare companies side by side <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </Reveal>
  </section>
);

export default HowItWorks;
