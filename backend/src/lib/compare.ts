/**
 * Company comparison — derived from real records only.
 *
 * RULE for this file: this module NEVER invents a value.
 *
 *   - Anything countable is COUNTED from the ledger (modules, items, unlocks,
 *     published reports). It cannot be wrong because it is not written by hand.
 *   - Anything editorial (CTC, process days, difficulty, round notes) is passed
 *     through AS-IS and shipped together with its `provenance` entry. When an
 *     admin has not recorded a source, `provenance[key]` is null and the UI must
 *     render it as "not verified" instead of as a fact.
 *   - Paywalled question text is never exported. `top_questions` is built only
 *     from `is_free_preview` items, so a comparison request cannot be used to
 *     scrape premium vault content.
 */

import { deriveCompanyStats, publishedReports, countActiveUnlocks, weeklyUnlocks } from './stats';
import { ownedModuleIdsFor, unlockedCompanyIds } from '../payments/orders';

export interface MetricProvenance {
  /** Where the figure came from — a URL, a drive document, a filed offer letter. */
  source: string;
  /** ISO date (YYYY-MM-DD) the admin last checked this figure. */
  verified_at: string;
  note?: string;
}

export type ProvenanceMap = Record<string, MetricProvenance | null>;

/** Editorial metrics that REQUIRE a recorded source before they may be shown as fact. */
export const EDITORIAL_METRICS = [
  'ctc',
  'process_days',
  'rounds',
  'difficulty',
  'round_1_oa',
  'round_2_tech',
  'round_3_system_design',
  'round_4_hr',
] as const;

/** Company profile fields an admin is expected to fill in. Used for completeness scoring. */
export const PROFILE_FIELDS = [
  'tagline', 'about', 'hq', 'founded_year', 'employee_band', 'careers_link',
] as const;

/**
 * Canonical round keys. A module may be classified by `round_type` (set by an
 * admin) OR fall back to its `module_type`. Both paths must land on the SAME key,
 * otherwise a vault with an explicit "Technical" round and a vault with a
 * technical_question module render as two identical-looking rows.
 */
const ROUND_LABELS: Record<string, string> = {
  OA: 'Online Assessment',
  Technical: 'Technical',
  SystemDesign: 'System Design',
  HR: 'HR & Behavioral',
  Managerial: 'Managerial',
  DSA: 'DSA & Coding',
  PreparationPack: 'Full Preparation Pack',
  CheatSheets: 'Cheat Sheets',
  SalaryInsights: 'Salary Insights',
  CompletePack: 'Complete Pack',
};

/** module_type -> canonical round key. Used when an admin never set round_type. */
const ROUND_KEY_BY_MODULE_TYPE: Record<string, string> = {
  preparation_guide: 'PreparationPack',
  complete_pack: 'CompletePack',
  technical_question: 'Technical',
  system_design: 'SystemDesign',
  hr_question: 'HR',
  dsa_question: 'DSA',
  cheat_sheet: 'CheatSheets',
  salary_insight: 'SalaryInsights',
};

const roundLabel = (key: string): string => ROUND_LABELS[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2');

const roundKeyFor = (mod: any): string => {
  const rt = typeof mod?.round_type === 'string' ? mod.round_type.trim() : '';
  // Prefer the admin's own round_type when it is a key we know.
  if (rt && ROUND_LABELS[rt]) return rt;
  const mt = typeof mod?.module_type === 'string' ? mod.module_type.trim() : '';
  return ROUND_KEY_BY_MODULE_TYPE[mt] || 'Other';
};

const isFilled = (v: any): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
};

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function validProvenance(company: any): ProvenanceMap {
  const raw = company?.metric_sources;
  const out: ProvenanceMap = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') {
      out[key] = null;
      continue;
    }
    const v = value as any;
    // A provenance record without a real source string is treated as absent.
    out[key] = typeof v.source === 'string' && v.source.trim()
      ? {
          source: v.source.trim(),
          verified_at: typeof v.verified_at === 'string' ? v.verified_at : '',
          ...(typeof v.note === 'string' && v.note.trim() ? { note: v.note.trim() } : {}),
        }
      : null;
  }
  return out;
}

export interface RoundCoverage {
  key: string;
  label: string;
  module_count: number;
  question_count: number;
}

export interface DerivedFacts {
  module_count: number;
  premium_module_count: number;
  free_module_count: number;
  question_count: number;
  high_freq_question_count: number;
  free_preview_question_count: number;
  solved_ready_count: number;
  pdf_count: number;
  /** Modules whose 7-section pack an admin has actually authored. */
  authored_section_count: number;
  round_coverage: RoundCoverage[];
  published_report_count: number;
  accuracy_score: number | null;
  accuracy_report_count: number;
  active_unlock_count: number;
  weekly_unlock_count: number;
  avg_rating: number;
  rating_count: number;
  last_report_at: string | null;
  last_unlock_at: string | null;
}

export interface CompareCompany {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  status: string;
  published: boolean;

  // --- admin-authored profile (null / '' means "not written yet") ---
  industry: string | null;
  tagline: string | null;
  about: string | null;
  hq: string | null;
  founded_year: number | null;
  employee_band: string | null;
  careers_link: string | null;
  fact_checked_at: string | null;
  profile_filled: string[];
  profile_missing: string[];
  profile_completeness: number;

  // --- admin-authored metrics + provenance ---
  ctc_min: number | null;
  ctc_max: number | null;
  avg_process_days: number | null;
  avg_rounds: number | null;
  difficulty_rating: number | null;
  round_notes: Record<string, string | null>;
  provenance: ProvenanceMap;
  verified_metric_count: number;
  total_metric_count: number;
  verification_rate: number;

  // --- counted facts ---
  derived: DerivedFacts;

  // --- paywall-safe previews ---
  top_questions: string[];

  // --- per-user commerce state ---
  premium_module_ids: string[];
  premium_module_count: number;
  is_unlocked: boolean;
  owned_module_ids: string[];
  owned_module_count: number;
}

export interface ComparisonMatrix {
  generated_at: string;
  requested_slugs: string[];
  missing_slugs: string[];
  companies: CompareCompany[];
  /**
   * Union of rounds across every compared company, in display order. Carries the
   * display label so the frontend never has to re-implement the mapping and drift.
   * Only rounds that a compared company ACTUALLY has a module for are included.
   */
  rounds: Array<{ key: string; label: string; module_count: number; question_count: number }>;
  editorial_metrics: readonly string[];
  /** Human-readable statement of how to read this matrix. Always sent, never assumed. */
  methodology: string[];
}

const RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function deriveFacts(db: any, company: any): DerivedFacts {
  const modules: any[] = Array.isArray(company.modules) ? company.modules : [];
  const items: any[] = modules.flatMap((m) => (Array.isArray(m.items) ? m.items : []));

  const coverage = new Map<string, RoundCoverage>();
  for (const mod of modules) {
    const key = roundKeyFor(mod);
    const count = Array.isArray(mod.items) ? mod.items.length : 0;
    const entry = coverage.get(key) || { key, label: roundLabel(key), module_count: 0, question_count: 0 };
    entry.module_count += 1;
    entry.question_count += count;
    coverage.set(key, entry);
  }

  const reports = publishedReports(db, company.id);
  const matched = reports.filter((r: any) => (r.rounds || []).some((rd: any) => rd.matched_questions));
  const latestReport = [...reports].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  const stats = deriveCompanyStats(db, company);
  const unlocks: any[] = (db.unlocks || []).filter(
    (u: any) => u.company_id === company.id && (u.status === 'active' || !u.status)
  );
  const lastUnlock = [...unlocks].sort(
    (a: any, b: any) => new Date(b.unlocked_at || 0).getTime() - new Date(a.unlocked_at || 0).getTime()
  )[0];

  const premium = modules.filter((m) => m?.is_premium === true);

  return {
    module_count: modules.length,
    premium_module_count: premium.length,
    free_module_count: modules.length - premium.length,
    question_count: items.length,
    high_freq_question_count: items.filter((i: any) => i?.frequency_tag === 'high').length,
    free_preview_question_count: items.filter((i: any) => i?.is_free_preview === true).length,
    solved_ready_count: items.filter((i: any) => i?.blocks && i.blocks.length > 0).length,
    pdf_count: modules.filter((m: any) => (m?.pdf && m.pdf.stored_name) || (Array.isArray(m?.pdfs) && m.pdfs.length > 0)).length,
    authored_section_count: modules.filter((m: any) => m?.section_data && Object.keys(m.section_data).length > 0).length,
    round_coverage: [...coverage.values()].sort((a, b) => a.label.localeCompare(b.label)),
    published_report_count: reports.length,
    accuracy_score: reports.length > 0 ? Math.round((matched.length / reports.length) * 100) : null,
    accuracy_report_count: reports.length,
    active_unlock_count: countActiveUnlocks(db, company.id),
    weekly_unlock_count: weeklyUnlocks(db, company.id),
    avg_rating: Number(stats.trust_stats?.rating) || 0,
    rating_count: reports.length,
    last_report_at: latestReport?.created_at || null,
    last_unlock_at: lastUnlock?.unlocked_at || null,
  };
}

/**
 * Paywall-safe question previews.
 * ONLY items explicitly flagged `is_free_preview` are exported. Premium item
 * text is never included, so this endpoint cannot be used to read locked content.
 */
function freePreviewQuestions(company: any, limit = 3): string[] {
  const modules: any[] = Array.isArray(company.modules) ? company.modules : [];
  const items: any[] = modules.flatMap((m) => (Array.isArray(m.items) ? m.items : []));
  return items
    .filter((i: any) => i?.is_free_preview === true && typeof i.question_text === 'string' && i.question_text.trim())
    .map((i: any) => ({
      text: (i.question_text as string).trim(),
      rank: RANK[i?.frequency_tag] ?? 3,
      upvotes: Number(i?.upvotes_count) || 0,
    }))
    .sort((a, b) => a.rank - b.rank || b.upvotes - a.upvotes)
    .slice(0, limit)
    .map((x) => x.text);
}

export function buildComparisonMatrix(
  db: any,
  slugs: string[],
  ctx: { userId?: string; isAdmin?: boolean } = {}
): ComparisonMatrix {
  // De-dupe while preserving the caller's order: the compare page sends
  // whatever the URL carried, and a repeated slug would otherwise render as a
  // duplicated column with its own separate "1 of 2" ownership math.
  const wanted: string[] = [];
  for (const s of slugs || []) {
    if (s && !wanted.includes(s)) wanted.push(s);
  }
  const all: any[] = Array.isArray(db.companies) ? db.companies : [];
  const found = wanted
    .map((s) => all.find((c: any) => c.slug === s))
    .filter(Boolean) as any[];
  const missing = wanted.filter((s) => !all.some((c: any) => c.slug === s));

  const userId = ctx.userId || '';
  const ownedModuleIds = userId ? ownedModuleIdsFor(db, userId) : [];
  const userUnlockedCompanyIds = userId ? unlockedCompanyIds(db, userId) : [];

  const companies: CompareCompany[] = found.map((company) => {
    const provenance = validProvenance(company);
    const derived = deriveFacts(db, company);

    const filled = PROFILE_FIELDS.filter((f) => isFilled((company as any)[f]));
    const missingProfile = PROFILE_FIELDS.filter((f) => !isFilled((company as any)[f]));

    const verifiedKeys = EDITORIAL_METRICS.filter((k) => !!provenance[k]);
    const notesSource = (company.comparison_metrics && typeof company.comparison_metrics === 'object')
      ? company.comparison_metrics
      : {};
    const roundNotes: Record<string, string | null> = {
      round_1_oa: typeof notesSource.round_1_oa === 'string' ? notesSource.round_1_oa : null,
      round_2_tech: typeof notesSource.round_2_tech === 'string' ? notesSource.round_2_tech : null,
      round_3_system_design: typeof notesSource.round_3_system_design === 'string' ? notesSource.round_3_system_design : null,
      round_4_hr: typeof notesSource.round_4_hr === 'string' ? notesSource.round_4_hr : null,
    };

    const premiumIds: string[] = (Array.isArray(company.modules) ? company.modules : [])
      .filter((m: any) => m?.is_premium === true)
      .map((m: any) => m.id);
    const ownsEvery = premiumIds.length > 0 && premiumIds.every((id) => ownedModuleIds.includes(id));
    const isUnlocked = !!(
      ctx.isAdmin ||
      company.is_unlocked === true ||
      userUnlockedCompanyIds.includes(company.id) ||
      ownsEvery ||
      premiumIds.length === 0
    );

    return {
      id: company.id,
      slug: company.slug,
      name: company.name,
      logo_url: company.logo_url || '',
      status: company.status || 'draft',
      published: company.status !== 'draft',

      industry: isFilled(company.industry) ? company.industry : null,
      tagline: isFilled(company.tagline) ? company.tagline : null,
      about: isFilled(company.about) ? company.about : null,
      hq: isFilled(company.hq) ? company.hq : null,
      founded_year: num(company.founded_year),
      employee_band: isFilled(company.employee_band) ? company.employee_band : null,
      careers_link: isFilled(company.careers_link) ? company.careers_link : null,
      fact_checked_at: isFilled(company.fact_checked_at) ? company.fact_checked_at : null,
      profile_filled: [...filled],
      profile_missing: [...missingProfile],
      profile_completeness: Math.round((filled.length / PROFILE_FIELDS.length) * 100),

      ctc_min: num(company.ctc_min),
      ctc_max: num(company.ctc_max),
      avg_process_days: num(company.avg_process_days),
      avg_rounds: num(company.avg_rounds),
      difficulty_rating: num(company.difficulty_rating),
      round_notes: roundNotes,
      provenance,
      verified_metric_count: verifiedKeys.length,
      total_metric_count: EDITORIAL_METRICS.length,
      verification_rate: Math.round((verifiedKeys.length / EDITORIAL_METRICS.length) * 100),

      derived,
      top_questions: freePreviewQuestions(company),

      premium_module_ids: premiumIds,
      premium_module_count: premiumIds.length,
      is_unlocked: isUnlocked,
      owned_module_ids: ctx.isAdmin ? premiumIds : ownedModuleIds.filter((id) => premiumIds.includes(id)),
      owned_module_count: ctx.isAdmin ? premiumIds.length : ownedModuleIds.filter((id) => premiumIds.includes(id)).length,
    };
  });

  // Union of rounds actually present across the compared companies. Tally how many
  // of them carry each round so the UI can label a column "covered" vs "absent".
  const tally = new Map<string, { key: string; label: string; module_count: number; question_count: number }>();
  for (const c of companies) {
    for (const r of c.derived.round_coverage) {
      const e = tally.get(r.key) || { key: r.key, label: r.label, module_count: 0, question_count: 0 };
      e.module_count += r.module_count;
      e.question_count += r.question_count;
      tally.set(r.key, e);
    }
  }
  const rounds = [...tally.values()].sort(
    (a, b) => b.question_count - a.question_count || a.label.localeCompare(b.label)
  );

  return {
    generated_at: new Date().toISOString(),
    requested_slugs: wanted,
    missing_slugs: missing,
    companies,
    rounds,
    editorial_metrics: EDITORIAL_METRICS,
    methodology: [
      'Vault size, question counts, round coverage, unlock counts, candidate-report count and match accuracy are counted live from the database on every request.',
      'Match accuracy is a percentage of published candidate reports whose rounds matched questions in this vault. It stays blank until candidates submit and an admin publishes a report.',
      'CTC range, process duration, round count and difficulty are editorial. Each one is shown only with the source an admin recorded; an unrecorded metric is labelled unverified rather than presented as fact.',
      'Question previews come exclusively from questions marked free preview. Locked vault content is never included in a comparison response.',
    ],
  };
}
