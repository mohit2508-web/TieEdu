import React, { useEffect, useState } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui';
import { usePlacement } from '@/context/PlacementContext';
import { getYearOnYear, type YearOnYearData } from '@/lib/placementApi';

/**
 * Year-on-year placement results (E3), from the history the placement cell
 * records below it. Changes appear only between years with recorded numbers;
 * companies with no number are shown as "—", never counted as zero
 * (backend lib/yearOnYear). `refresh` is any value that changes when the
 * history is edited.
 */
export const YearOnYearCard: React.FC<{ refresh?: unknown }> = ({ refresh }) => {
  const { activeCollegeId } = usePlacement();
  const [data, setData] = useState<YearOnYearData | null>(null);

  useEffect(() => {
    getYearOnYear(activeCollegeId).then(setData).catch(() => setData(null));
  }, [activeCollegeId, refresh]);

  if (!data || data.years.length === 0) return null;
  const years = data.years.map((y) => y.year).sort((a, b) => a - b).slice(-4);
  const delta = (n: number | null, pct: number | null) => {
    if (n === null) return <span className="text-muted">—</span>;
    const Icon = n > 0 ? TrendingUp : n < 0 ? TrendingDown : Minus;
    const tone = n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted';
    return <span className={`inline-flex items-center gap-1 ${tone}`}><Icon className="h-3.5 w-3.5" aria-hidden />{n > 0 ? '+' : ''}{n}{pct !== null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}</span>;
  };

  return (
    <Card pad="lg">
      <h2 className="font-display text-lg font-bold text-heading">Year on year</h2>
      <p className="mt-1 text-sm text-muted">Students selected, from the results recorded below. Companies without a number are not counted.</p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {data.years.slice(0, 3).map((y) => (
          <li key={y.year} className="rounded-xl border border-line p-3">
            <p className="text-sm font-semibold text-muted">{y.year}</p>
            <p className="font-display text-2xl font-bold text-heading">{y.selected}</p>
            <p className="text-sm">{delta(y.change, y.change_pct)} <span className="text-muted">vs previous year</span></p>
            <p className="mt-1 text-xs text-muted">{y.companies} compan{y.companies === 1 ? 'y' : 'ies'}{y.unrecorded ? `, ${y.unrecorded} without a number` : ''}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <caption className="sr-only">Students selected by company and year</caption>
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">Company</th>
              {years.map((y) => <th key={y} scope="col" className="py-2 pr-3 text-right font-semibold">{y}</th>)}
              <th scope="col" className="py-2 text-right font-semibold">Latest change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.companies.map((c) => (
              <tr key={c.slug}>
                <th scope="row" className="py-2 pr-3 text-left font-semibold text-heading">{c.company}</th>
                {years.map((y) => {
                  const v = c.by_year[String(y)];
                  return <td key={y} className="py-2 pr-3 text-right tabular-nums text-body">{v === undefined ? '' : v === null ? '—' : v}</td>;
                })}
                <td className="py-2 text-right tabular-nums">{delta(c.latest_change, null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default YearOnYearCard;
