import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PracticeLayout, Progress } from '@/components/practice/PracticeLayout';
import { Chip } from '@/components/ui/Chip';
import { fetchPracticeCompanies, type CompanyMeta, type Counts } from '@/lib/codeApi';

/** Company sets (PRACTICE_MODE_PLAN.md §3.3): each company's coding set and tests, with progress and pack state. */
export default function CompanySetsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Array<CompanyMeta & Counts & { locked: number; tests: number }> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetchPracticeCompanies().then((r) => setList(r.companies)).catch((e) => setError(e.message)); }, [user?.id]);

  return (
    <PracticeLayout title="Company sets" intro="The coding questions each company asks, in the order to practise them, plus its tests in the real pattern. Problems many companies ask appear in every set that has them.">
      {error && <p className="text-base text-danger">{error}</p>}
      {!list && !error && <p className="text-base text-muted">Loading…</p>}
      {list && (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => (
            <Link key={c.slug} href={`/practice/companies/${c.slug}`} className="flex flex-col rounded-2xl border border-line bg-card p-5 hover:border-signal focus-ring">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold text-heading">{c.name}</p>
                  {c.tagline && <p className="mt-1 text-[15px] text-body">{c.tagline}</p>}
                </div>
                {c.owned ? <Chip tone="success">Pack active</Chip> : c.locked > 0 ? <Chip icon={Lock}>{c.locked} locked</Chip> : <Chip tone="success">Free</Chip>}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div><p className="text-2xl font-bold tabular-nums text-heading">{c.total}</p><p className="text-sm text-muted">coding problems</p></div>
                <div><p className="text-2xl font-bold tabular-nums text-heading">{c.solved}</p><p className="text-sm text-muted">solved</p></div>
                <div><p className="text-2xl font-bold tabular-nums text-heading">{c.tests}</p><p className="text-sm text-muted">tests</p></div>
              </div>
              <div className="mt-4"><Progress done={c.solved} total={c.total} label={`${c.name} progress`} /></div>
              <p className="mt-4 inline-flex items-center gap-1 text-[15px] font-semibold text-link">Open the set <ArrowRight className="h-4 w-4" aria-hidden /></p>
            </Link>
          ))}
          <div className="rounded-2xl border border-dashed border-line p-5 text-[15px] text-body">
            More companies are being added: Infosys, Accenture, Cognizant and Wipro sets come next.
          </div>
        </div>
      )}
    </PracticeLayout>
  );
}
