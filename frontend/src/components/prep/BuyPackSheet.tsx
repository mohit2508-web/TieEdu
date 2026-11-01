import React from 'react';
import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import { Sheet } from '@/components/ui';

/**
 * "Unlock the prep pack" (INFOSYS_SE_3T_UX_PLAN §2a): shown whenever a locked
 * lesson, test or answer is opened. One price, one list of what is inside.
 */
export const PACK_PRICE = 169;
export const PACK_CONTENTS = [
  '25 topic lessons with worked examples and practice questions',
  '5 section tests (Math, Reasoning, Verbal, Pseudocode, Puzzle), unlimited retakes',
  'Unlimited full mocks: 54 questions, real Infosys pattern',
  'Day-by-day plan to your test date, readiness score and weak-area fix list',
  '20 technical and 12 HR interview questions with model answers',
];

export const BuyPackSheet: React.FC<{ open: boolean; onClose: () => void; slug: string; name: string; what?: string }> = ({ open, onClose, slug, name, what }) => (
  <Sheet open={open} onClose={onClose} title={`Unlock the ${name} prep pack`} side="bottom">
    <div className="space-y-4 p-5 sm:p-6">
      <p className="flex items-center gap-2 text-base text-body"><Lock className="h-5 w-5 text-amber-deep" aria-hidden /> {what ? `${what} is in the prep pack.` : 'This is in the prep pack.'}</p>
      <ul className="space-y-2">
        {PACK_CONTENTS.map((c) => (
          <li key={c} className="flex items-start gap-2 text-base text-heading"><Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />{c}</li>
        ))}
      </ul>
      <Link href={`/company/${slug}?buy=1`} className="btn btn-primary min-h-[52px] w-full text-lg">Buy pack · ₹{PACK_PRICE}</Link>
      <button type="button" onClick={onClose} className="btn btn-ghost min-h-[44px] w-full">Not now</button>
    </div>
  </Sheet>
);
