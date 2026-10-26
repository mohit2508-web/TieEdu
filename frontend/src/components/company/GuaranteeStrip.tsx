import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { fetchGuarantee, type GuaranteeSettings } from '@/lib/guaranteeApi';

/** The accuracy-guarantee promise on a company page — only while an admin has it switched on. */
export const GuaranteeStrip: React.FC = () => {
  const [g, setG] = useState<GuaranteeSettings | null>(null);
  useEffect(() => { fetchGuarantee().then(setG).catch(() => setG(null)); }, []);
  if (!g?.enabled) return null;
  return (
    <Link href="/guarantee" className="focus-ring flex items-center gap-3 rounded-[14px] border border-line bg-card px-4 py-3 text-sm hover:border-line-strong">
      <ShieldCheck className="h-5 w-5 shrink-0 text-success" aria-hidden />
      <span className="min-w-0 text-body">
        <span className="font-bold text-heading">Accuracy guarantee.</span> If a round’s pattern was different from what we show, get ₹{g.amount} back.
      </span>
    </Link>
  );
};

export default GuaranteeStrip;
