import React from 'react';
import type { ReactNode } from 'react';
import {
  Award, Building2, CalendarClock, FileCheck2, FileText, Flame, Gauge,
  HelpCircle, Layers, MapPin, MessageSquarePlus, ShieldCheck, Sparkles,
  Target, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CompareCompany, ComparisonMatrix } from '@/types';
import { formatDay, getProvenance } from '@/lib/provenance';

/**
 * ONE definition of every comparison row, consumed by both the desktop matrix
 * and the mobile cards.
 *
 * The important part is `Cell.state`:
 *   'derived'   — counted from the ledger on every request. Cannot be wrong.
 *   'verified'  — an editorial figure WITH a source an admin recorded.
 *   'unverified'— an editorial figure with NO recorded source. It is still shown
 *                 (it is a real human claim, not a fabrication) but it is muted
 *                 and badged so a reader can never mistake it for a checked fact.
 *   'absent'    — nothing recorded. Rendered as an explicit gap, never as a
 *                 plausible-looking placeholder.
 *
 * Nothing in this file invents a value. Every cell either reads a counted
 * `derived` field or echoes an admin-authored field together with its provenance.
 */

export const DASH = '—';

export type CellState = 'derived' | 'verified' | 'unverified' | 'absent';

export interface Cell {
  value: ReactNode;
  note?: string;
  state: CellState;
  /** Rendered as a small chip under the value. */
  badge?: string;
}

export interface RowGroup {
  id: string;
  title: string;
  blurb: string;
  icon: LucideIcon;
}

export interface RowDef {
  id: string;
  label: string;
  hint?: string;
  cell: (c: CompareCompany) => Cell;
}

export function formatDayPublic(iso: string | null | undefined): string | null {
  return formatDay(iso);
}

const absent = (note?: string): Cell => ({ value: <span className="text-[--text-muted]">{DASH}</span>, note, state: 'absent' });

/**
 * Build the cell for an editorial (human-asserted) metric.
 * `has` = the admin entered a value. The source is read from metric_sources.
 */
function editorial(
  c: CompareCompany,
  key: string,
  has: boolean,
  render: (v: string) => ReactNode,
): Cell {
  const prov = getProvenance(c.provenance, key);
  if (!has) {
    return {
      value: <span className="text-[--text-muted]">Not recorded</span>,
      state: 'absent',
      note: 'An admin has not entered this figure yet.',
    };
  }
  if (!prov) {
    return {
      value: <span className="text-[#8A7B63]">{render('')}</span>,
      state: 'unverified',
      badge: 'Unverified',
      note: 'No source recorded for this figure. Treat it as an unconfirmed claim.',
    };
  }
  const day = formatDay(prov.verified_at);
  return {
    value: <span className="text-[#1A1A1A]">{render('')}</span>,
    state: 'verified',
    badge: 'Sourced',
    note: `${prov.source}${day ? ` · checked ${day}` : ''}`,
  };
}

// ---------------------------------------------------------------------------
// Static rows
// ---------------------------------------------------------------------------

const identityRow: RowDef = {
  id: 'identity',
  label: 'Company',
  cell: (c) => ({
    value: (
      <div className="min-w-0">
        <div className="font-bold text-[#1A1A1A] leading-snug break-words">{c.name}</div>
        {c.tagline
          ? <div className="text-[12px] text-[#4A4A4A] mt-1 leading-snug">{c.tagline}</div>
          : null}
        <div className="text-[11px] text-[--text-muted] mt-1">
          {c.industry || 'Industry not recorded'}
        </div>
      </div>
    ),
    note: c.tagline ? undefined : 'No tagline written by an admin yet.',
    state: c.tagline ? 'verified' : 'absent',
  }),
};

const profileRows: RowDef[] = [
  {
    id: 'hq',
    label: 'Headquarters',
    hint: 'Where the company operates from.',
    cell: (c) => c.hq
      ? { value: <span className="text-[#1A1A1A]">{c.hq}</span>, state: 'verified' }
      : absent(),
  },
  {
    id: 'founded',
    label: 'Founded',
    cell: (c) => c.founded_year
      ? { value: <span className="text-[#1A1A1A] font-mono">{c.founded_year}</span>, state: 'verified' }
      : absent(),
  },
  {
    id: 'headcount',
    label: 'Company size',
    cell: (c) => c.employee_band
      ? { value: <span className="text-[#1A1A1A]">{c.employee_band}</span>, state: 'verified' }
      : absent(),
  },
  {
    id: 'careers',
    label: 'Official careers page',
    cell: (c) => {
      if (!c.careers_link) return absent();
      const href = c.careers_link.startsWith('http') ? c.careers_link : `https://${c.careers_link}`;
      return {
        value: (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[#1F3A5F] font-semibold underline underline-offset-2 hover:text-[#2A4D7E] break-all"
          >
            {c.careers_link.replace(/^https?:\/\//, '')}
          </a>
        ),
        state: 'verified' as CellState,
      };
    },
  },
  {
    id: 'fact_checked',
    label: 'Profile last fact-checked',
    cell: (c) => {
      const day = formatDay(c.fact_checked_at);
      return {
        value: (
          <span className={day ? 'text-[#1A1A1A] font-mono' : 'text-[--text-muted]'}>
            {day || 'Not fact-checked'}
          </span>
        ),
        state: (day ? 'verified' : 'absent') as CellState,
        note: day ? undefined : 'No admin has recorded a fact-check date for this profile.',
      };
    },
  },
  {
    id: 'profile_completeness',
    label: 'Profile completeness',
    hint: 'How many profile fields an admin has filled in (of 6).',
    cell: (c) => ({
      value: (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-[#E8E8E4] overflow-hidden">
            <div
              className={`h-full rounded-full ${c.profile_completeness >= 70 ? 'bg-emerald-600' : c.profile_completeness >= 35 ? 'bg-amber-500' : 'bg-[#B45309]'}`}
              style={{ width: `${Math.max(3, c.profile_completeness)}%` }}
            />
          </div>
          <span className="font-mono text-[12px] font-bold text-[#1A1A1A]">{c.profile_completeness}%</span>
        </div>
      ),
      state: 'derived' as CellState,
      note: c.profile_missing.length > 0 ? `Missing: ${c.profile_missing.join(', ')}` : 'All profile fields filled.',
    }),
  },
];

const vaultRows: RowDef[] = [
  {
    id: 'modules',
    label: 'Modules in vault',
    hint: 'Counted from the database on every page load.',
    cell: (c) => ({
      value: <span className="font-bold text-[#1A1A1A]">{c.derived.module_count}</span>,
      state: 'derived',
      note: `${c.derived.free_module_count} free · ${c.derived.premium_module_count} premium`,
    }),
  },
  {
    id: 'questions',
    label: 'Questions',
    cell: (c) => ({
      value: <span className="font-bold text-[#1A1A1A]">{c.derived.question_count}</span>,
      state: 'derived',
    }),
  },
  {
    id: 'high_freq',
    label: 'High-frequency questions',
    hint: 'Questions an admin tagged as asked often.',
    cell: (c) => ({
      value: <span className="font-bold text-[#1A1A1A]">{c.derived.high_freq_question_count}</span>,
      state: 'derived',
      note: c.derived.question_count > 0
        ? `${Math.round((c.derived.high_freq_question_count / c.derived.question_count) * 100)}% of the vault`
        : undefined,
    }),
  },
  {
    id: 'free_previews',
    label: 'Free preview questions',
    hint: 'Readable without paying.',
    cell: (c) => ({
      value: <span className="font-bold text-[#1E8E5A]">{c.derived.free_preview_question_count}</span>,
      state: 'derived',
    }),
  },
  {
    id: 'pdfs',
    label: 'PDFs',
    cell: (c) => ({
      value: <span className="font-bold text-[#1A1A1A]">{c.derived.pdf_count}</span>,
      state: 'derived',
    }),
  },
  {
    id: 'authored_packs',
    label: 'Written 7-section packs',
    hint: 'Modules where an admin authored the full pack — no auto-generated filler.',
    cell: (c) => {
      const total = c.derived.module_count;
      const done = c.derived.authored_section_count;
      const all = total > 0 && done === total;
      return {
        value: (
          <span className={`font-bold ${all ? 'text-[#1E8E5A]' : 'text-[#B45309]'}`}>
            {done} / {total}
          </span>
        ),
        state: 'derived' as CellState,
        note: all ? 'Every module has admin-written content.' : 'Some modules have no written pack yet.',
      };
    },
  },
];

const editorialRows: RowDef[] = [
  {
    id: 'ctc',
    label: 'CTC range',
    hint: 'Editorial figure. Only trustworthy with a recorded source.',
    cell: (c) => editorial(c, 'ctc', c.ctc_min != null && c.ctc_max != null, () => (
      <span className="font-bold text-[#1E8E5A]">₹{c.ctc_min} – {c.ctc_max} LPA</span>
    )),
  },
  {
    id: 'process_days',
    label: 'Avg process duration',
    cell: (c) => editorial(c, 'process_days', c.avg_process_days != null, () => (
      <span className="font-bold text-[#1A1A1A]">{c.avg_process_days} days</span>
    )),
  },
  {
    id: 'rounds',
    label: 'Avg rounds',
    cell: (c) => editorial(c, 'rounds', c.avg_rounds != null, () => (
      <span className="font-bold text-[#1A1A1A]">{c.avg_rounds} rounds</span>
    )),
  },
  {
    id: 'difficulty',
    label: 'Difficulty',
    cell: (c) => editorial(c, 'difficulty', c.difficulty_rating != null && c.difficulty_rating > 0, () => (
      <span className="font-bold text-[#1A1A1A]">
        {c.difficulty_rating}/5
        <span className="ml-1.5 text-[--brand-accent] tracking-tight">
          {'★'.repeat(Math.max(0, Math.min(5, Math.round(c.difficulty_rating || 0))))}
        </span>
      </span>
    )),
  },
  {
    id: 'note_oa',
    label: 'Round 1 · Online assessment',
    cell: (c) => editorial(c, 'round_1_oa', !!c.round_notes?.round_1_oa, () => (
      <span className="text-[#4A4A4A] leading-relaxed">{c.round_notes?.round_1_oa}</span>
    )),
  },
  {
    id: 'note_tech',
    label: 'Round 2 · Technical core',
    cell: (c) => editorial(c, 'round_2_tech', !!c.round_notes?.round_2_tech, () => (
      <span className="text-[#4A4A4A] leading-relaxed">{c.round_notes?.round_2_tech}</span>
    )),
  },
  {
    id: 'note_sd',
    label: 'Round 3 · System design',
    cell: (c) => editorial(c, 'round_3_system_design', !!c.round_notes?.round_3_system_design, () => (
      <span className="text-[#4A4A4A] leading-relaxed">{c.round_notes?.round_3_system_design}</span>
    )),
  },
  {
    id: 'note_hr',
    label: 'Round 4 · HR & values',
    cell: (c) => editorial(c, 'round_4_hr', !!c.round_notes?.round_4_hr, () => (
      <span className="text-[#4A4A4A] leading-relaxed">{c.round_notes?.round_4_hr}</span>
    )),
  },
];

const communityRows: RowDef[] = [
  {
    id: 'reports',
    label: 'Published candidate reports',
    hint: 'Submitted by candidates, reviewed and published by an admin.',
    cell: (c) => ({
      value: <span className="font-bold text-[#1A1A1A]">{c.derived.published_report_count}</span>,
      state: 'derived',
      note: c.derived.published_report_count === 0
        ? 'No report has cleared admin review for this company yet.'
        : undefined,
    }),
  },
  {
    id: 'accuracy',
    label: 'Verified match accuracy',
    hint: 'Share of published reports whose rounds matched questions actually in this vault.',
    cell: (c) => {
      if (c.derived.accuracy_score == null) {
        return {
          value: <span className="text-[--text-muted] font-semibold">No verified reports yet</span>,
          state: 'absent' as CellState,
          note: 'This number is only computed from published reports. It is never estimated.',
        };
      }
      return {
        value: (
          <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[12px] border border-emerald-200">
            {c.derived.accuracy_score}%
          </span>
        ),
        state: 'derived' as CellState,
        note: `From ${c.derived.accuracy_report_count} published report${c.derived.accuracy_report_count === 1 ? '' : 's'}`,
      };
    },
  },
  {
    id: 'rating',
    label: 'Candidate rating',
    cell: (c) => {
      if (!c.derived.avg_rating) {
        return {
          value: <span className="text-[--text-muted]">No ratings yet</span>,
          state: 'absent' as CellState,
          note: 'Average of the rating candidates gave in their published report.',
        };
      }
      return {
        value: <span className="font-bold text-amber-600">{c.derived.avg_rating.toFixed(1)} / 5</span>,
        state: 'derived' as CellState,
        note: `From ${c.derived.rating_count} published report${c.derived.rating_count === 1 ? '' : 's'}`,
      };
    },
  },
  {
    id: 'last_report',
    label: 'Latest published report',
    cell: (c) => {
      const day = formatDay(c.derived.last_report_at);
      return {
        value: <span className={day ? 'text-[#1A1A1A] font-mono' : 'text-[--text-muted]'}>{day || 'None yet'}</span>,
        state: (day ? 'derived' : 'absent') as CellState,
        note: day ? undefined : 'Freshness cannot be claimed until a report is published.',
      };
    },
  },
  {
    id: 'unlocks',
    label: 'Candidates unlocked',
    cell: (c) => ({
      value: <span className="font-bold text-[#1A1A1A]">{c.derived.active_unlock_count}</span>,
      state: 'derived',
      note: c.derived.weekly_unlock_count > 0 ? `${c.derived.weekly_unlock_count} in the last 7 days` : 'None in the last 7 days',
    }),
  },
];

export const ROW_GROUPS: RowGroup[] = [
  { id: 'profile', title: 'Company profile', blurb: 'Written and fact-checked by an admin.', icon: Building2 },
  { id: 'vault', title: 'Vault contents', blurb: 'Counted live from the database.', icon: Layers },
  { id: 'rounds', title: 'Hiring rounds covered', blurb: 'Only rounds this vault actually has a module for.', icon: Target },
  { id: 'process', title: 'Hiring process', blurb: 'Editorial figures. Each needs a recorded source to count as fact.', icon: CalendarClock },
  { id: 'community', title: 'Community verification', blurb: 'Counted from published candidate reports and the unlock ledger.', icon: Users },
];

/** Static rows per group. The 'rounds' group is built dynamically below. */
export const STATIC_ROWS: Record<string, RowDef[]> = {
  profile: profileRows,
  vault: vaultRows,
  process: editorialRows,
  community: communityRows,
};

/**
 * One row per round that ANY compared company covers.
 * A company that has no module for that round says so explicitly — it is never
 * given a plausible-looking description it does not deserve.
 */
export function buildRoundRows(matrix: ComparisonMatrix): RowDef[] {
  return matrix.rounds.map((r) => ({
    id: `round:${r.key}`,
    label: r.label,
    hint: `${r.question_count} question${r.question_count === 1 ? '' : 's'} across ${r.module_count} module${r.module_count === 1 ? '' : 's'} in the compared vaults.`,
    cell: (c: CompareCompany) => {
      const hit = c.derived.round_coverage.find((x) => x.key === r.key);
      if (!hit) {
        return {
          value: <span className="text-[--text-muted]">Not in this vault</span>,
          state: 'absent' as CellState,
        };
      }
      return {
        value: (
          <span className="inline-flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-[#1A1A1A]">
              Covered · {hit.question_count} question{hit.question_count === 1 ? '' : 's'}
            </span>
          </span>
        ),
        state: 'derived' as CellState,
      };
    },
  }));
}

/** Free-preview question titles, pulled straight from the ledger. */
export function previewQuestionsRow(c: CompareCompany): Cell {
  if (c.top_questions.length === 0) {
    return {
      value: <span className="text-[--text-muted]">No free preview questions</span>,
      state: 'absent' as CellState,
    };
  }
  return {
    value: (
      <ul className="space-y-1.5">
        {c.top_questions.map((q, i) => (
          <li key={i} className="text-[12px] text-[#1A1A1A] leading-snug flex gap-1.5">
            <span className="text-[--brand-accent] shrink-0">›</span>
            <span>{q}</span>
          </li>
        ))}
      </ul>
    ),
    state: 'derived' as CellState,
    note: 'From free preview questions only — locked content is never shown here.',
  };
}

export { Flame, ShieldCheck, Sparkles, HelpCircle, FileText, Gauge, Award, MessageSquarePlus, MapPin };
