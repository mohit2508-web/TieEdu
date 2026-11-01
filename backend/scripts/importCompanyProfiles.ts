/**
 * Loads the 2026–27 mass-hiring program profiles (src/data/companyProfiles2026.ts)
 * into the companies collection. Upserts by slug, so re-running is safe; an
 * existing company keeps its id, modules and unlock counts.
 *
 *   npx ts-node --transpile-only scripts/importCompanyProfiles.ts [--dry]
 */
import { loadDb, safeSaveDb } from '../src/data/db';
import { PROFILES } from '../src/data/companyProfiles2026';

const FACT_CHECKED = '2026-10-27';
const dry = process.argv.includes('--dry');
const db: any = loadDb();
db.companies = Array.isArray(db.companies) ? db.companies : [];

const nextId = () => {
  const n = db.companies.reduce((m: number, c: any) => Math.max(m, Number(String(c.id).replace(/\D/g, '')) || 0), 0);
  return `comp-${n + 1}`;
};

let created = 0;
let updated = 0;
for (const p of PROFILES) {
  const rounds = p.rounds.map(([title, round_type, test_type, question_count, duration_minutes, elimination, train_topics], i) => ({
    step_number: i + 1,
    round_type,
    title,
    subtitle: '',
    difficulty: 'medium',
    module_count: 0,
    test_type,
    ...(question_count != null ? { question_count } : {}),
    ...(duration_minutes != null ? { duration_minutes } : {}),
    ...(elimination != null ? { elimination } : {}),
    ...(train_topics?.length ? { train_topics } : {}),
    pattern_checked_at: p.confidence === 'low' ? undefined : FACT_CHECKED,
  }));

  const fields = {
    slug: p.slug,
    name: p.name,
    company_group: p.company,
    logo_url: p.logo || '',
    industry: p.industry,
    tags: p.tags,
    tagline: p.tagline,
    about: p.about,
    hq: p.hq,
    founded_year: Number(p.founded) || null,
    employee_band: p.size,
    careers_link: p.careers,
    difficulty_rating: p.difficulty,
    avg_rounds: p.rounds.length,
    ctc_min: p.ctc ? p.ctc[0] : null,
    ctc_max: p.ctc ? p.ctc[1] : null,
    status: 'published',
    seo_title: p.seo[0],
    seo_description: p.seo[1],
    // Low-confidence profiles get no "checked" date, so the site says "Being verified".
    fact_checked_at: p.confidence === 'low' ? null : FACT_CHECKED,
    rounds_pipeline: rounds,
    // Checked figures carry their source, so the page stamps them "verified"
    // instead of "being verified". Low-confidence profiles get none.
    metric_sources: p.confidence === 'low' ? {} : {
      ctc: { source: 'Company profiles (prep sites, recent drives)', verified_at: FACT_CHECKED },
      rounds: { source: 'Company profiles (recent drives)', verified_at: FACT_CHECKED },
      difficulty: { source: 'Editorial estimate', verified_at: FACT_CHECKED },
    },
    profile: {
      program_type: p.program_type,
      contest: !!p.contest,
      roles: p.roles.map(([title, ctc]) => ({ title, ctc })),
      eligibility: p.elig,
      higher_package: p.higher,
      bond: p.bond,
      training: p.training,
      hiring_window: p.window,
      confidence: p.confidence,
      note: p.note,
      source: 'Company profiles, fact-checked 27 Oct 2026',
    },
  };

  const existing = db.companies.find((c: any) => c.slug === p.slug);
  if (existing) {
    Object.assign(existing, fields);
    updated++;
  } else {
    db.companies.push({ id: nextId(), unlock_count: 0, modules: [], ...fields });
    created++;
  }
}

console.log(`${created} created, ${updated} updated${dry ? ' (dry run, nothing saved)' : ''}`);
if (!dry) safeSaveDb(db);
