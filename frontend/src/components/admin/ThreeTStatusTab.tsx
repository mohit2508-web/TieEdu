import React, { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Company } from '@/types';
import { fetchSkillsApi } from '@/lib/skillTestApi';

/**
 * "3T status" (TRAIN_TEST_TRACK_PLAN §9): one row per company, one column per
 * setup item. A company is "3T live" only when every cell is green. Each check
 * reads data the site already uses, so a green cell means the page shows it.
 */
type Row = { c: Company; checks: Record<string, boolean> };

const COLS: Array<[string, string]> = [
  ['profile', 'Profile'],
  ['logo', 'Logo'],
  ['ctc', 'CTC'],
  ['rounds', 'Rounds'],
  ['testTypes', 'Test types'],
  ['topics', 'Train topics'],
  ['eligibility', 'Eligibility'],
  ['mock', 'Mock test'],
  ['content', 'Train content'],
  ['checked', 'Fact-checked'],
];

export const ThreeTStatusTab: React.FC<{ companies: Company[] }> = ({ companies }) => {
  const [mockSlugs, setMockSlugs] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetchSkillsApi()
      .then((skills) => setMockSlugs(new Set(skills.map((s: any) => s.company_slug).filter(Boolean))))
      .catch(() => setMockSlugs(new Set()));
  }, []);

  const rows: Row[] = useMemo(() => companies.map((c) => {
    const p: any = (c as any).profile;
    const rounds = c.rounds_pipeline || [];
    return {
      c,
      checks: {
        profile: !!(c.tagline && c.about),
        logo: !!c.logo_url,
        ctc: c.ctc_min != null && c.ctc_max != null,
        rounds: rounds.length > 0,
        testTypes: rounds.length > 0 && rounds.every((r) => !!r.test_type),
        topics: rounds.length > 0 && rounds.every((r) => (r.train_topics || []).length > 0),
        eligibility: !!p?.eligibility?.degrees,
        mock: mockSlugs.has(c.slug),
        content: (c.modules || []).length > 0,
        checked: !!c.fact_checked_at,
      },
    };
  }).sort((a, b) => Object.values(b.checks).filter(Boolean).length - Object.values(a.checks).filter(Boolean).length), [companies, mockSlugs]);

  const live = rows.filter((r) => Object.values(r.checks).every(Boolean)).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">3T status</h2>
        <p className="text-sm text-gray-500">
          {live} of {rows.length} companies are fully live for Train · Test · Track. Fix red cells in Company Hub, Content Builder or by importing a mock test.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Company</th>
              {COLS.map(([k, label]) => <th key={k} className="px-2 py-2 text-center font-semibold">{label}</th>)}
              <th className="px-3 py-2 text-right font-semibold">Done</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, checks }) => {
              const done = Object.values(checks).filter(Boolean).length;
              return (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-semibold text-gray-900">{c.name}</td>
                  {COLS.map(([k]) => (
                    <td key={k} className="px-2 py-2 text-center">
                      {checks[k]
                        ? <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="done" />
                        : <X className="mx-auto h-4 w-4 text-red-500" aria-label="missing" />}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">{done}/{COLS.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
