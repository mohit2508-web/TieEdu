/**
 * Year-on-year placement results for a college (E3), from the results its
 * placement cell records under Campus intel (lib/campusIntel history rows).
 *
 * Honest arithmetic only:
 *  - A year's total counts the selections actually recorded. Companies with
 *    no number recorded are listed, not counted as zero.
 *  - A change is shown only between two years that both have recorded
 *    numbers, and a company's change only when it has numbers in both years.
 *  - Percent change is omitted when the earlier figure is zero.
 */
import { historyOf } from './campusIntel';

export interface YearTotal { year: number; companies: number; selected: number; unrecorded: number; change: number | null; change_pct: number | null }
export interface CompanyRow { company: string; slug: string; by_year: Record<number, number | null>; latest_change: number | null }
export interface YearOnYear { years: YearTotal[]; companies: CompanyRow[] }

export function yearOnYear(db: any, collegeId: string): YearOnYear {
  const names = new Map<string, string>((db.companies || []).map((c: any) => [c.slug, c.name]));
  const rows = historyOf(db).filter((h) => h.college_id === collegeId);
  const yearList = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);

  const years: YearTotal[] = yearList.map((year) => {
    const inYear = rows.filter((r) => r.year === year);
    const recorded = inYear.filter((r) => typeof r.selected === 'number');
    return { year, companies: inYear.length, selected: recorded.reduce((n, r) => n + (r.selected as number), 0), unrecorded: inYear.length - recorded.length, change: null, change_pct: null };
  });
  for (let i = 1; i < years.length; i++) {
    const prev = years[i - 1];
    const cur = years[i];
    // Only compare years that each have at least one recorded number.
    if (prev.companies - prev.unrecorded === 0 || cur.companies - cur.unrecorded === 0) continue;
    cur.change = cur.selected - prev.selected;
    cur.change_pct = prev.selected > 0 ? Math.round((cur.change / prev.selected) * 100) : null;
  }

  const slugs = Array.from(new Set(rows.map((r) => r.company_slug)));
  const companies: CompanyRow[] = slugs.map((slug) => {
    const by_year: Record<number, number | null> = {};
    for (const y of yearList) {
      const r = rows.find((x) => x.company_slug === slug && x.year === y);
      if (r) by_year[y] = typeof r.selected === 'number' ? r.selected : null;
    }
    const recordedYears = yearList.filter((y) => typeof by_year[y] === 'number');
    const [a, b] = recordedYears.slice(-2);
    const latest_change = recordedYears.length >= 2 && b === yearList[yearList.length - 1] ? (by_year[b] as number) - (by_year[a] as number) : null;
    return { company: names.get(slug) || slug, slug, by_year, latest_change };
  });
  // Biggest recruiters (by latest recorded number) first.
  const latest = (c: CompanyRow) => { for (let i = yearList.length - 1; i >= 0; i--) { const v = c.by_year[yearList[i]]; if (typeof v === 'number') return v; } return -1; };
  companies.sort((x, y) => latest(y) - latest(x) || x.company.localeCompare(y.company));

  return { years: years.reverse(), companies };
}
