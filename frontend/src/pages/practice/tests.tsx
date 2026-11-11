import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PracticeLayout } from '@/components/practice/PracticeLayout';
import { Chip } from '@/components/ui/Chip';
import { fetchPracticeTests, type CompanyMeta, type CompanyTest } from '@/lib/codeApi';
import { PracticeSkeleton } from '@/components/practice/PracticeSkeleton';

/** Company tests (PRACTICE_MODE_PLAN.md §7): full mocks and sectional tests, by company — separate from skill tests. */
export default function CompanyTestsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Array<CompanyMeta & { tests: CompanyTest[] }> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetchPracticeTests().then((r) => setList(r.companies)).catch((e) => setError(e.message)); }, [user?.id]);

  return (
    <PracticeLayout title="Company tests" intro="Full mocks in each company's real pattern, and short sectional tests to fix one weak area at a time. Skill tests (for certificates) are separate.">
      {error && <p className="text-base text-danger">{error}</p>}
      {!list && !error && <PracticeSkeleton kind="cards" label="Loading company tests" />}
      {list && !list.length && <p className="text-base text-body">No company tests yet.</p>}
      <div className="space-y-10">
        {(list || []).map((c) => (
          <section key={c.slug}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-semibold text-heading">{c.name}</h2>
              {c.owned && <Chip tone="success">Pack active</Chip>}
              {c.free_program && <Chip tone="success">Free program</Chip>}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {c.tests.map((t) => (
                <div key={t.slug} className="flex flex-col rounded-xl border border-line bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-semibold text-heading">{t.name}</p>
                    <Chip tone={t.kind === 'full' ? 'signal' : 'neutral'}>{t.kind === 'full' ? 'Full mock' : 'Sectional'}</Chip>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-body-md text-muted">
                    <span>{t.questions} questions{t.coding ? ' + coding' : ''}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden />{t.minutes} min</span>
                  </p>
                  <p className="mt-2 text-body-md text-body">{t.attempts ? `Best ${t.best}% after ${t.attempts} attempt${t.attempts > 1 ? 's' : ''}` : 'Not attempted yet'}</p>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/practice/test/${t.slug}`} className="btn btn-primary focus-ring min-h-[44px] flex-1">{t.attempts ? 'Retake' : 'Start'} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                    {t.last && <Link href={`/practice/test/${t.slug}/result/${t.last.id}`} className="btn btn-ghost focus-ring min-h-[44px] px-4">Last result</Link>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PracticeLayout>
  );
}
