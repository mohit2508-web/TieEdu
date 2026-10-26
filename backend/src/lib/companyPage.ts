// ============================================================================
// Company Page — section catalogue, sanitiser, validator and templates.
//
// The redesigned company page is an ordered list of sections. Code ships the
// section *types*; an admin composes the *page* in the Company Page Studio.
//
// This file is the single source of truth for what a section may contain. The
// admin UI does not carry its own copy of these field lists: it fetches
// `SECTION_CATALOG` from the schema endpoint and renders its forms from that, so
// adding a field here is the whole change. The same definitions drive the
// sanitiser, so the server never stores a key the schema does not name.
//
// Stored in `db.company_pages`, separate from the company record, so the
// existing company object and every API that returns it stay byte-for-byte
// unchanged. A company with no published page (or `enabled: false`) keeps
// rendering the old vault page.
// ============================================================================

import crypto from 'crypto';

export type FieldKind =
  | 'text'
  | 'markdown'
  | 'int'
  | 'date'
  | 'url'
  | 'bool'
  | 'select'
  | 'list'
  | 'tags'
  | 'module_refs'
  | 'company_refs'
  /** Skill-test skill slugs; a round's Track score is computed from these. */
  | 'skill_refs'
  /** A file uploaded through the studio's media endpoint (stored name). */
  | 'image'
  /** Question ids from this company's modules. */
  | 'item_refs';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  help?: string;
  placeholder?: string;
  /** text/markdown: max characters. list/tags/refs: max entries. */
  max?: number;
  /** int only. */
  min?: number;
  multiline?: boolean;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** list only: the fields of one row. */
  item?: FieldDef[];
  /** list only: which row field the admin list uses as the row's title. */
  itemTitleKey?: string;
}

export interface SectionDef {
  type: SectionType;
  label: string;
  description: string;
  /** Default chip label in the section nav. Empty = never listed in the nav. */
  navLabel: string;
  fields: FieldDef[];
}

export type SectionType =
  | 'hero'
  | 'stat_strip'
  | 'section_nav'
  | 'eligibility_apply'
  | 'rounds_route'
  | 'countdown'
  | 'role_compare'
  | 'prep_pack'
  | 'community_offer'
  | 'drive_radar'
  | 'onboarding'
  | 'comeback'
  | 'experiences'
  | 'faq'
  | 'also_preparing'
  | 'rich_text';

export interface PageSection {
  id: string;
  type: SectionType;
  visible: boolean;
  data: Record<string, unknown>;
}

export interface PageContent {
  schema_version: 1;
  settings: Record<string, unknown>;
  sections: PageSection[];
}

export interface PageVersion {
  content: PageContent;
  at: string;
  by: string;
}

export interface CompanyPageDoc {
  company_id: string;
  enabled: boolean;
  draft: PageContent;
  published: PageContent | null;
  published_at: string | null;
  published_by: string | null;
  history: PageVersion[];
  /** Draft snapshot queued to go live at `at`. Promoted lazily on read. */
  scheduled?: { content: PageContent; at: string; by: string } | null;
  updated_at: string;
  updated_by: string | null;
}

export const HISTORY_CAP = 30;
export const MAX_SECTIONS = 30;
/** Serialized size cap for one content document. Keeps db.json from bloating. */
export const MAX_CONTENT_BYTES = 200 * 1024;

// ---------------------------------------------------------------------------
// Curated accent palette. Admins pick a swatch; they cannot type a hex. Every
// value here keeps AA contrast for white text on it and for itself as text on
// white, so no choice an admin makes can render the page unreadable.
// ---------------------------------------------------------------------------
export const ACCENT_PALETTE: { value: string; label: string; hex: string }[] = [
  { value: 'violet', label: 'Violet', hex: '#6D28D9' },
  { value: 'indigo', label: 'Indigo', hex: '#4338CA' },
  { value: 'sky', label: 'Sky', hex: '#0369A1' },
  { value: 'teal', label: 'Teal', hex: '#0F766E' },
  { value: 'green', label: 'Green', hex: '#15803D' },
  { value: 'rust', label: 'Rust', hex: '#C2410C' },
  { value: 'crimson', label: 'Crimson', hex: '#BE123C' },
  { value: 'slate', label: 'Slate', hex: '#334155' },
];

const STAMP_OPTIONS = [
  { value: 'being_verified', label: 'Being verified' },
  { value: 'verified', label: 'Verified (needs source)' },
  { value: 'candidate_reports', label: 'From candidate reports' },
  { value: 'confirm_notice', label: 'Confirm from notice' },
  { value: 'none', label: 'No stamp' },
];

const RADAR_KINDS = [
  { value: 'applications', label: 'Applications' },
  { value: 'invites', label: 'Test invites' },
  { value: 'results', label: 'Results' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'other', label: 'Other' },
];

const COMMON_FIELDS: FieldDef[] = [
  { key: 'eyebrow', label: 'Eyebrow (small label above the title)', kind: 'text', max: 48 },
  { key: 'title', label: 'Title', kind: 'text', max: 90 },
  { key: 'intro', label: 'Intro line', kind: 'text', max: 260, multiline: true },
  { key: 'nav_label', label: 'Label in the section nav', kind: 'text', max: 24, help: 'Leave blank to use the default. Hidden sections never show in the nav.' },
];

const LINK_HELP = 'An in-app path like /skill-test/aptitude, or a full https:// link.';

export const SECTION_CATALOG: SectionDef[] = [
  {
    type: 'hero',
    label: 'Hero',
    description: 'Top band: company, batch, the next step and the free readiness check.',
    navLabel: '',
    fields: [
      { key: 'subtitle', label: 'Sub-line under the heading', kind: 'text', max: 140, placeholder: '2026–27 freshers · ASE & Advanced ASE' },
      { key: 'show_chips', label: 'Show Train · Test · Track chips', kind: 'bool' },
      { key: 'next_step_label', label: 'Next-step label', kind: 'text', max: 40 },
      { key: 'next_step_text', label: 'Next-step sentence', kind: 'text', max: 200, multiline: true },
      { key: 'next_step_href', label: 'Next-step link', kind: 'url', help: LINK_HELP },
      { key: 'card_eyebrow', label: 'Readiness card — eyebrow', kind: 'text', max: 50 },
      { key: 'card_title', label: 'Readiness card — title', kind: 'text', max: 80 },
      { key: 'card_meta', label: 'Readiness card — details', kind: 'text', max: 120, placeholder: '20 questions · 25 min · score by round' },
      { key: 'card_cta_label', label: 'Readiness card — button', kind: 'text', max: 40 },
      { key: 'card_cta_href', label: 'Readiness card — button link', kind: 'url', help: LINK_HELP },
      { key: 'card_note', label: 'Readiness card — small note', kind: 'text', max: 140, help: 'Only real facts. Leave blank rather than invent a number.' },
    ],
  },
  {
    type: 'stat_strip',
    label: 'Stat strip',
    description: 'The numbers students compare — each with an honest verification stamp.',
    navLabel: '',
    fields: [
      {
        key: 'stats', label: 'Stats', kind: 'list', max: 6, itemTitleKey: 'label',
        item: [
          { key: 'label', label: 'Label', kind: 'text', max: 40, required: true },
          { key: 'value', label: 'Value', kind: 'text', max: 24, help: 'Leave blank if not confirmed — the page shows “—” with a Being verified stamp.' },
          { key: 'stamp', label: 'Stamp', kind: 'select', options: STAMP_OPTIONS },
          { key: 'stamp_text', label: 'Stamp text override', kind: 'text', max: 40 },
          { key: 'source_url', label: 'Source link', kind: 'url' },
          { key: 'verified_at', label: 'Verified on', kind: 'date' },
          { key: 'link_label', label: 'Link label', kind: 'text', max: 30 },
          { key: 'link_href', label: 'Link target', kind: 'url', help: LINK_HELP },
        ],
      },
    ],
  },
  {
    type: 'section_nav',
    label: 'Section nav',
    description: 'Sticky chips that jump to each visible section. Built automatically.',
    navLabel: '',
    fields: [],
  },
  {
    type: 'eligibility_apply',
    label: 'Eligibility + How to apply',
    description: 'Can I apply, and how — two cards side by side.',
    navLabel: 'Eligibility',
    fields: [
      { key: 'eligibility_title', label: 'Eligibility card title', kind: 'text', max: 40 },
      {
        key: 'rows', label: 'Eligibility rows', kind: 'list', max: 10, itemTitleKey: 'label',
        item: [
          { key: 'label', label: 'Label', kind: 'text', max: 40, required: true },
          { key: 'value', label: 'Value', kind: 'text', max: 120 },
          { key: 'check', label: 'Self-check question (yes = meets it; blank = left out of the check)', kind: 'text', max: 120, placeholder: 'Are you graduating in 2026 or 2027?' },
        ],
      },
      { key: 'last_confirmed', label: 'Last confirmed on', kind: 'date' },
      { key: 'self_check_label', label: 'Self-check button (blank hides the self-check)', kind: 'text', max: 40 },
      { key: 'source_label', label: 'Source link label', kind: 'text', max: 60 },
      { key: 'source_url', label: 'Source link', kind: 'url' },
      { key: 'apply_title', label: 'How-to-apply card title', kind: 'text', max: 40 },
      {
        key: 'steps', label: 'Steps', kind: 'list', max: 6, itemTitleKey: 'title',
        item: [
          { key: 'title', label: 'Step title', kind: 'text', max: 70, required: true },
          { key: 'body', label: 'Step detail', kind: 'text', max: 180, multiline: true },
          { key: 'link_label', label: 'Link label', kind: 'text', max: 30 },
          { key: 'link_href', label: 'Link target', kind: 'url', help: LINK_HELP },
        ],
      },
    ],
  },
  {
    type: 'rounds_route',
    label: 'Rounds — route line',
    description: 'The signature section: stations on a route, each with its Train → Test → Track loop.',
    navLabel: 'Rounds',
    fields: [
      { key: 'pass_mark', label: 'A round counts as cleared at this Track score (%)', kind: 'int', min: 1, max: 100, help: 'Cleared rounds light up the route line for the student.' },
      {
        key: 'stations', label: 'Rounds (stations)', kind: 'list', max: 8, itemTitleKey: 'title',
        item: [
          { key: 'title', label: 'Round name', kind: 'text', max: 44, required: true },
          { key: 'short_label', label: 'Short label (mobile, and the #round- link)', kind: 'text', max: 18 },
          { key: 'only_for_role', label: 'Only for role number (0 = every role)', kind: 'int', min: 0, max: 3, help: 'e.g. 2 shows this round only to students aiming for the second role in Role compare.' },
          { key: 'status_note', label: 'Pattern note', kind: 'text', max: 70, placeholder: 'Pattern being verified' },
          { key: 'last_drive_date', label: 'Pattern seen in drive on', kind: 'date' },
          {
            key: 'eliminatory', label: 'Eliminatory?', kind: 'select',
            options: [{ value: 'unknown', label: 'Not confirmed' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
          },
          {
            key: 'pattern', label: 'Pattern (sections)', kind: 'list', max: 6, itemTitleKey: 'name',
            item: [
              { key: 'name', label: 'Section', kind: 'text', max: 40, required: true },
              { key: 'questions', label: 'Questions', kind: 'int', min: 0, max: 500 },
              { key: 'minutes', label: 'Minutes', kind: 'int', min: 0, max: 600 },
            ],
          },
          { key: 'topics', label: 'Topics', kind: 'tags', max: 14 },
          { key: 'train_text', label: 'Train — line', kind: 'text', max: 140 },
          { key: 'module_ids', label: 'Train — linked modules', kind: 'module_refs', max: 12 },
          { key: 'test_text', label: 'Test — line', kind: 'text', max: 140 },
          { key: 'test_label', label: 'Test — button', kind: 'text', max: 40 },
          { key: 'test_href', label: 'Test — link', kind: 'url', help: LINK_HELP },
          { key: 'skill_slugs', label: 'Track — skill tests that score this round', kind: 'skill_refs', max: 6, help: 'A student’s best result in these skill tests becomes their score for this round, and their weakest topics are listed under Track.' },
          { key: 'track_text', label: 'Track — line (shown before the student has a score)', kind: 'text', max: 180, multiline: true },
          { key: 'tip', label: 'Tip from seniors', kind: 'text', max: 220, multiline: true },
        ],
      },
    ],
  },
  {
    type: 'countdown',
    label: 'Countdown plan',
    description: 'Student sets a test date; the days split into a focus plan.',
    navLabel: 'Prep plan',
    fields: [
      { key: 'date_label', label: 'Date input label', kind: 'text', max: 48 },
      { key: 'default_days', label: 'Sample plan length (days, shown before a date is set)', kind: 'int', min: 3, max: 60 },
      {
        key: 'plan_blocks', label: 'Plan focus areas', kind: 'list', max: 8, itemTitleKey: 'focus',
        help: 'Days are split across these in proportion to their weight.',
        item: [
          { key: 'focus', label: 'Focus', kind: 'text', max: 28, required: true },
          { key: 'weight', label: 'Weight (1–10)', kind: 'int', min: 1, max: 10 },
        ],
      },
      { key: 'mock_every_days', label: 'Full mock every N days (0 = never)', kind: 'int', min: 0, max: 14 },
      { key: 'final_day_label', label: 'Last day label', kind: 'text', max: 28 },
      { key: 'daily_title', label: 'Daily practice — title', kind: 'text', max: 40 },
      { key: 'daily_text', label: 'Daily practice — line', kind: 'text', max: 120 },
      { key: 'daily_cta_label', label: 'Daily practice — button', kind: 'text', max: 24 },
      { key: 'daily_cta_href', label: 'Daily practice — link', kind: 'url', help: LINK_HELP },
    ],
  },
  {
    type: 'role_compare',
    label: 'Role compare',
    description: 'Pick your target role (e.g. ASE vs Advanced ASE) with a comparison table.',
    navLabel: 'Roles',
    fields: [
      { key: 'picker_label', label: 'Picker prefix', kind: 'text', max: 20, placeholder: 'Aim for' },
      {
        key: 'roles', label: 'Roles', kind: 'list', max: 3, itemTitleKey: 'title',
        item: [
          { key: 'title', label: 'Role title', kind: 'text', max: 60, required: true },
          { key: 'short', label: 'Short name', kind: 'text', max: 20, required: true },
          { key: 'ctc', label: 'Package', kind: 'text', max: 24 },
          { key: 'stamp', label: 'Package stamp', kind: 'select', options: STAMP_OPTIONS },
        ],
      },
      {
        key: 'rows', label: 'Comparison rows', kind: 'list', max: 12, itemTitleKey: 'attribute',
        item: [
          { key: 'attribute', label: 'Attribute', kind: 'text', max: 40, required: true },
          { key: 'role_1', label: 'Role 1 value', kind: 'text', max: 120 },
          { key: 'role_2', label: 'Role 2 value', kind: 'text', max: 120 },
          { key: 'role_3', label: 'Role 3 value', kind: 'text', max: 120 },
        ],
      },
      { key: 'default_role', label: 'Selected by default (1–3)', kind: 'int', min: 1, max: 3 },
    ],
  },
  {
    type: 'prep_pack',
    label: 'Prep pack (Free vs paid)',
    description: 'Free card and the ticket card. The price always comes from real checkout pricing.',
    navLabel: 'Prep pack',
    fields: [
      { key: 'free_title', label: 'Free — title', kind: 'text', max: 30 },
      { key: 'free_price_label', label: 'Free — price label', kind: 'text', max: 12 },
      { key: 'free_features', label: 'Free — features', kind: 'tags', max: 8 },
      { key: 'free_cta_label', label: 'Free — button', kind: 'text', max: 30 },
      { key: 'free_cta_href', label: 'Free — button link', kind: 'url', help: LINK_HELP },
      { key: 'paid_title', label: 'Paid — title', kind: 'text', max: 40 },
      { key: 'paid_badge', label: 'Paid — badge', kind: 'text', max: 28 },
      { key: 'paid_price_note', label: 'Paid — price note', kind: 'text', max: 40, placeholder: 'one-time · lifetime access' },
      { key: 'paid_features', label: 'Paid — features', kind: 'tags', max: 8 },
      { key: 'paid_cta_label', label: 'Paid — button (price is added automatically)', kind: 'text', max: 30 },
      { key: 'preview_label', label: 'Preview button', kind: 'text', max: 30 },
      { key: 'preview_item_ids', label: 'Preview questions (shown in a preview window)', kind: 'item_refs', max: 5, help: 'Pick questions marked as free preview — locked ones show as locked.' },
      { key: 'preview_href', label: 'Preview link (used when no questions are picked; blank = open the free module)', kind: 'url', help: LINK_HELP },
      { key: 'refund_text', label: 'Refund line', kind: 'text', max: 240, multiline: true },
      { key: 'owned_text', label: 'Shown when the student owns the pack', kind: 'text', max: 120 },
    ],
  },
  {
    type: 'community_offer',
    label: 'Community offer',
    description: '“Took the test? Share your experience.” Opens the existing experience form.',
    navLabel: '',
    fields: [
      { key: 'body', label: 'Body', kind: 'text', max: 240, multiline: true },
      { key: 'cta_label', label: 'Button', kind: 'text', max: 30 },
    ],
  },
  {
    type: 'drive_radar',
    label: 'Drive Radar',
    description: 'Departures-board style drive updates. Pairs with Onboarding/Comeback when placed next to them.',
    navLabel: 'Drive Radar',
    fields: [
      {
        key: 'updates', label: 'Updates', kind: 'list', max: 12, itemTitleKey: 'text',
        item: [
          { key: 'kind', label: 'Type', kind: 'select', options: RADAR_KINDS },
          { key: 'text', label: 'Update', kind: 'text', max: 120, required: true },
          { key: 'date', label: 'Date', kind: 'date' },
          { key: 'confirmed', label: 'Confirmed by (students)', kind: 'int', min: 0, max: 100000 },
        ],
      },
      { key: 'empty_text', label: 'Empty state', kind: 'text', max: 140 },
      { key: 'allow_reports', label: 'Let signed-in students report updates', kind: 'bool' },
      { key: 'min_confirmations', label: 'Show a student report after this many other students confirm it (0 = only after you approve it)', kind: 'int', min: 0, max: 50 },
      { key: 'report_label', label: 'Report button', kind: 'text', max: 30 },
      { key: 'report_href', label: 'Report link (used only when student reports are off; blank hides it)', kind: 'url', help: LINK_HELP },
      { key: 'notify_label', label: 'Notify button (students subscribe to push alerts for this company; blank hides it)', kind: 'text', max: 36 },
    ],
  },
  {
    type: 'onboarding',
    label: 'Onboarding tracker',
    description: 'Checklist after selection. Ticks are saved on the student’s device.',
    navLabel: '',
    fields: [
      {
        key: 'steps', label: 'Steps', kind: 'list', max: 8, itemTitleKey: 'title',
        item: [
          { key: 'title', label: 'Step', kind: 'text', max: 60, required: true },
          { key: 'hint', label: 'Hint', kind: 'text', max: 120 },
        ],
      },
    ],
  },
  {
    type: 'comeback',
    label: 'Comeback plan',
    description: '“Didn’t clear this time?” card.',
    navLabel: '',
    fields: [
      { key: 'body', label: 'Body', kind: 'text', max: 240, multiline: true },
      { key: 'cta_label', label: 'Link label', kind: 'text', max: 36 },
      { key: 'cta_href', label: 'Link target', kind: 'url', help: LINK_HELP },
    ],
  },
  {
    type: 'experiences',
    label: 'Candidate experiences',
    description: 'Published interview reports for this company (existing feature).',
    navLabel: 'Experiences',
    fields: [],
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Questions students ask. Also published as FAQ structured data for Google.',
    navLabel: 'FAQ',
    fields: [
      {
        key: 'items', label: 'Questions', kind: 'list', max: 20, itemTitleKey: 'q',
        item: [
          { key: 'q', label: 'Question', kind: 'text', max: 160, required: true },
          { key: 'a', label: 'Answer (markdown: **bold**, _italic_, [link](url), lists)', kind: 'markdown', max: 1500, required: true },
        ],
      },
    ],
  },
  {
    type: 'also_preparing',
    label: 'Also preparing for',
    description: 'Chips to other company pages plus a Compare link.',
    navLabel: '',
    fields: [
      { key: 'company_slugs', label: 'Companies', kind: 'company_refs', max: 10 },
      { key: 'compare_label', label: 'Compare button', kind: 'text', max: 30 },
    ],
  },
  {
    type: 'rich_text',
    label: 'Text block',
    description: 'A free-form section for anything new — no code needed.',
    navLabel: '',
    fields: [
      {
        key: 'tone', label: 'Style', kind: 'select',
        options: [{ value: 'plain', label: 'Plain' }, { value: 'note', label: 'Note' }, { value: 'tip', label: 'Tip' }, { value: 'warning', label: 'Warning' }],
      },
      { key: 'body', label: 'Body (markdown)', kind: 'markdown', max: 4000 },
    ],
  },
];

export const SETTINGS_FIELDS: FieldDef[] = [
  { key: 'accent', label: 'Accent colour', kind: 'select', options: ACCENT_PALETTE.map(({ value, label }) => ({ value, label })) },
  { key: 'hero_style', label: 'Hero background', kind: 'select', options: [{ value: 'ink', label: 'Dark (ink)' }, { value: 'paper', label: 'Light (paper)' }] },
  { key: 'seo_title', label: 'SEO title', kind: 'text', max: 70, help: 'Shown in Google and the browser tab. ~60 characters is ideal.' },
  { key: 'seo_description', label: 'SEO description', kind: 'text', max: 170, multiline: true, help: '~155 characters is ideal.' },
  { key: 'sticky_enabled', label: 'Show sticky bottom bar', kind: 'bool' },
  { key: 'sticky_text', label: 'Sticky bar — line', kind: 'text', max: 80 },
  { key: 'sticky_label', label: 'Sticky bar — button (price added automatically)', kind: 'text', max: 30 },
  { key: 'pack_price_inr', label: 'Flat pack price in ₹ (blank = the standard pack ladder)', kind: 'int', min: 1, max: 9999, help: 'Caps the price of this company’s pack at checkout while the page is live. It never raises a price.' },
  { key: 'experience_reward', label: 'Unlock the pack for students whose interview experience you publish', kind: 'bool' },
  { key: 'streak_reminders', label: 'Evening push reminder when a student is about to lose their practice streak', kind: 'bool', help: 'Sent once, around 7 pm India time, only to students who practised yesterday but not yet today.' },
  { key: 'hinglish_enabled', label: 'Offer a Hinglish version (EN | Hinglish toggle on the page)', kind: 'bool' },
  { key: 'show_logo', label: 'Show the company logo in the hero', kind: 'bool', help: 'Off by default — check you may use the logo first.' },
  { key: 'og_image', label: 'Social share image (1200×630)', kind: 'image' },
  { key: 'disclaimer', label: 'Disclaimer above the footer', kind: 'text', max: 240, multiline: true },
];

const CATALOG_BY_TYPE = new Map<SectionType, SectionDef>(SECTION_CATALOG.map((d) => [d.type, d]));

export function sectionDef(type: string): SectionDef | undefined {
  return CATALOG_BY_TYPE.get(type as SectionType);
}

export function fieldsFor(type: SectionType): FieldDef[] {
  const def = CATALOG_BY_TYPE.get(type);
  return def ? [...COMMON_FIELDS, ...def.fields] : [];
}

/** What the schema endpoint serves to the admin studio. */
export function schemaPayload() {
  return {
    common_fields: COMMON_FIELDS,
    sections: SECTION_CATALOG,
    settings_fields: SETTINGS_FIELDS,
    accent_palette: ACCENT_PALETTE,
    limits: { max_sections: MAX_SECTIONS, history_cap: HISTORY_CAP },
  };
}

// ---------------------------------------------------------------------------
// Sanitiser
// ---------------------------------------------------------------------------

// Control characters except tab/newline. Admin copy is plain text; markdown is
// rendered by the client with raw HTML disabled, so nothing here is ever HTML.
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REF_RE = /^[A-Za-z0-9_-]{1,80}$/;
export const MEDIA_NAME_RE = /^cp-[0-9]{10,14}-[a-z0-9]{6,10}\.(jpg|jpeg|png|webp)$/;
const ROW_ID_RE = /^[a-z0-9-]{4,24}$/;

export const newId = (prefix: string) => `${prefix}-${crypto.randomBytes(5).toString('hex')}`;

function cleanText(v: unknown, max: number, multiline: boolean): string {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  let s = String(v).replace(CONTROL_RE, '');
  if (!multiline) s = s.replace(/[\r\n]+/g, ' ');
  return s.trim().slice(0, max);
}

/**
 * A link is an in-page anchor ("#faq"), an in-app path ("/compare"), or an
 * absolute http(s)/mailto URL. Protocol-relative ("//evil.test") and
 * `javascript:` are refused — the renderer puts these straight into an href.
 */
export function cleanUrl(v: unknown): string {
  if (typeof v !== 'string') return '';
  const s = v.trim().slice(0, 500);
  if (!s) return '';
  if (/^#[A-Za-z0-9_-]{1,60}$/.test(s)) return s;
  if (s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\')) return s;
  if (/^mailto:[^\s]+$/i.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch {
    // not a URL
  }
  return '';
}

function sanitizeField(f: FieldDef, v: unknown): unknown {
  switch (f.kind) {
    case 'text':
      return cleanText(v, f.max ?? 200, !!f.multiline);
    case 'markdown':
      return cleanText(v, f.max ?? 4000, true);
    case 'int': {
      if (v === '' || v === null || v === undefined) return null;
      const n = Math.round(Number(v));
      if (!Number.isFinite(n)) return null;
      return Math.min(f.max ?? Number.MAX_SAFE_INTEGER, Math.max(f.min ?? 0, n));
    }
    case 'date':
      return typeof v === 'string' && DATE_RE.test(v) ? v : '';
    case 'url':
      return cleanUrl(v);
    case 'bool':
      return v === true;
    case 'select': {
      const opts = f.options || [];
      return opts.some((o) => o.value === v) ? v : opts[0]?.value ?? '';
    }
    case 'tags':
      return (Array.isArray(v) ? v : [])
        .map((t) => cleanText(t, 120, false))
        .filter(Boolean)
        .slice(0, f.max ?? 12);
    case 'image':
      return typeof v === 'string' && MEDIA_NAME_RE.test(v) ? v : '';
    case 'module_refs':
    case 'company_refs':
    case 'skill_refs':
    case 'item_refs':
      return Array.from(
        new Set((Array.isArray(v) ? v : []).filter((r): r is string => typeof r === 'string' && REF_RE.test(r)))
      ).slice(0, f.max ?? 20);
    case 'list':
      return (Array.isArray(v) ? v : [])
        .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
        .slice(0, f.max ?? 20)
        .map((row: any) => sanitizeObject(f.item || [], row, true));
    default:
      return null;
  }
}

/** Kinds that carry words a student reads, and so may have a Hinglish variant. */
const LOCALIZABLE = new Set<FieldKind>(['text', 'markdown', 'tags']);

function sanitizeObject(fields: FieldDef[], raw: any, withRowId: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (withRowId) {
    out.id = typeof raw?.id === 'string' && ROW_ID_RE.test(raw.id) ? raw.id : newId('r');
  }
  for (const f of fields) out[f.key] = sanitizeField(f, raw?.[f.key]);

  // Hinglish variants live beside the English value as `hi: { key: value }`.
  // Only words are translatable — never links, numbers or references — and an
  // empty variant is dropped so the renderer falls back to English.
  const hiRaw = raw?.hi;
  if (hiRaw && typeof hiRaw === 'object' && !Array.isArray(hiRaw)) {
    const hi: Record<string, unknown> = {};
    for (const f of fields) {
      if (!LOCALIZABLE.has(f.kind)) continue;
      const v = sanitizeField(f, hiRaw[f.key]);
      if (!isEmpty(v)) hi[f.key] = v;
    }
    if (Object.keys(hi).length > 0) out.hi = hi;
  }
  return out;
}

export function sanitizeSettings(raw: any): Record<string, unknown> {
  return sanitizeObject(SETTINGS_FIELDS, raw && typeof raw === 'object' ? raw : {}, false);
}

/**
 * Normalises an untrusted content document. Unknown section types and unknown
 * keys are dropped; every value is coerced to its declared kind. Never throws —
 * a draft is allowed to be incomplete. Completeness is `validateForPublish`'s job.
 */
export function sanitizeContent(raw: any): PageContent {
  const src = raw && typeof raw === 'object' ? raw : {};
  const seen = new Set<string>();
  const sections: PageSection[] = [];
  for (const s of Array.isArray(src.sections) ? src.sections : []) {
    if (sections.length >= MAX_SECTIONS) break;
    if (!s || typeof s !== 'object' || !sectionDef(s.type)) continue;
    let id = typeof s.id === 'string' && /^s-[a-z0-9]{4,24}$/.test(s.id) ? s.id : newId('s');
    if (seen.has(id)) id = newId('s');
    seen.add(id);
    sections.push({
      id,
      type: s.type,
      visible: s.visible !== false,
      data: sanitizeObject(fieldsFor(s.type), s.data && typeof s.data === 'object' ? s.data : {}, false),
    });
  }
  return { schema_version: 1, settings: sanitizeSettings(src.settings), sections };
}

// ---------------------------------------------------------------------------
// Publish validation
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  level: 'error' | 'warning';
  section_id: string | null;
  message: string;
}

const STALE_DAYS = 60;

function isEmpty(v: unknown): boolean {
  return v === '' || v === null || v === undefined || (Array.isArray(v) && v.length === 0);
}

function requiredIssues(fields: FieldDef[], data: any, where: string, sectionId: string, out: ValidationIssue[]) {
  for (const f of fields) {
    const v = data?.[f.key];
    if (f.required && isEmpty(v)) {
      out.push({ level: 'error', section_id: sectionId, message: `${where}: “${f.label}” is required.` });
    }
    if (f.kind === 'list' && Array.isArray(v)) {
      v.forEach((row: any, i: number) => requiredIssues(f.item || [], row, `${where} → ${f.label} #${i + 1}`, sectionId, out));
    }
  }
}

function daysSince(date: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(`${date}T00:00:00Z`).getTime()) / 86_400_000);
}

export function validateForPublish(content: PageContent, now = new Date()): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const visible = content.sections.filter((s) => s.visible);
  if (visible.length === 0) {
    issues.push({ level: 'error', section_id: null, message: 'The page has no visible sections.' });
  }
  if (!visible.some((s) => s.type === 'hero')) {
    issues.push({ level: 'warning', section_id: null, message: 'There is no visible Hero — the page will start without a heading.' });
  }

  for (const s of visible) {
    const def = sectionDef(s.type)!;
    const d: any = s.data;
    requiredIssues(fieldsFor(s.type), d, def.label, s.id, issues);

    for (const f of def.fields) {
      if (f.kind === 'list' && Array.isArray(d[f.key]) && d[f.key].length === 0) {
        issues.push({ level: 'warning', section_id: s.id, message: `${def.label}: “${f.label}” is empty, so the section will show its empty state.` });
      }
    }

    if (s.type === 'stat_strip') {
      for (const st of (d.stats || []) as any[]) {
        if (st.stamp === 'verified' && !st.source_url) {
          issues.push({ level: 'warning', section_id: s.id, message: `Stat “${st.label}” is marked Verified but has no source link.` });
        }
        if (st.verified_at && daysSince(st.verified_at, now) > STALE_DAYS) {
          issues.push({ level: 'warning', section_id: s.id, message: `Stat “${st.label}” was last verified over ${STALE_DAYS} days ago.` });
        }
      }
    }
    if (s.type === 'eligibility_apply' && d.last_confirmed && daysSince(d.last_confirmed, now) > STALE_DAYS) {
      issues.push({ level: 'warning', section_id: s.id, message: `Eligibility was last confirmed over ${STALE_DAYS} days ago.` });
    }
    if (s.type === 'hero' && d.card_cta_label && !d.card_cta_href) {
      issues.push({ level: 'warning', section_id: s.id, message: 'Hero: the readiness button has no link, so it is hidden.' });
    }
    if (s.type === 'rounds_route') {
      const roleCount = ((content.sections.find((x) => x.type === 'role_compare' && x.visible)?.data.roles as any[]) || []).length;
      for (const st of (d.stations || []) as any[]) {
        if (st.only_for_role > 0 && st.only_for_role > roleCount) {
          issues.push({ level: 'warning', section_id: s.id, message: `Round “${st.title}” is set for role ${st.only_for_role}, but Role compare has ${roleCount} role(s) — nobody will see it.` });
        }
      }
      for (const st of (d.stations || []) as any[]) {
        if (!(st.skill_slugs || []).length) {
          issues.push({ level: 'warning', section_id: s.id, message: `Round “${st.title}” has no linked skill test, so students get no Track score for it.` });
        }
      }
    }
    if (content.settings.hinglish_enabled === true && d.title && !(d.hi && d.hi.title)) {
      issues.push({ level: 'warning', section_id: s.id, message: `${def.label}: Hinglish is on but the title has no Hinglish version (English will show).` });
    }
    if (s.type === 'role_compare' && (d.roles || []).length === 1) {
      issues.push({ level: 'warning', section_id: s.id, message: 'Role compare has only one role — the picker needs two.' });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Templates
//
// Copy uses `{company}`; the renderer substitutes the company name, so a page
// copied to another company reads correctly without a find-and-replace.
// Numbers are deliberately left blank: a template must never ship a figure
// nobody verified. Blank stats render “—” with a Being verified stamp.
// ---------------------------------------------------------------------------

export type TemplateKey = 'mass_recruiter' | 'product_company';

export const TEMPLATES: { value: TemplateKey; label: string; description: string }[] = [
  { value: 'mass_recruiter', label: 'Mass recruiter', description: 'Accenture/TCS/Infosys style: eligibility, 4-round route, countdown, roles, radar, onboarding.' },
  { value: 'product_company', label: 'Product company', description: 'Rounds, experiences, prep pack and FAQ — no countdown or onboarding.' },
];

function sec(type: SectionType, data: Record<string, unknown>): PageSection {
  return { id: newId('s'), type, visible: true, data };
}

/**
 * `skills` are skill-test slugs. They are only links — a slug that does not
 * exist on this install simply scores nothing, so a template never invents a
 * result.
 */
function station(title: string, short: string, topics: string[], skills: string[] = []) {
  return {
    title,
    short_label: short,
    status_note: 'Pattern being verified',
    eliminatory: 'unknown',
    pattern: [],
    topics,
    train_text: 'Notes and worked examples for every topic in this round.',
    module_ids: [],
    test_text: 'A timed sectional mock in the real pattern.',
    test_label: 'Start mock',
    test_href: skills[0] ? `/skill-test/${skills[0]}` : '',
    skill_slugs: skills,
    track_text: 'Take the mock to see your weakest topics here.',
    tip: '',
  };
}

const DEFAULT_SETTINGS = {
  accent: 'violet',
  hero_style: 'ink',
  seo_title: '{company} placement preparation 2026–27 | TieEdu',
  seo_description: 'Eligibility, round pattern, a free readiness check and a day-by-day plan for the {company} drive.',
  sticky_enabled: true,
  sticky_text: 'Get the full {company} prep pack',
  sticky_label: 'Get the pack',
  disclaimer: 'TieEdu is not affiliated with {company}. Company names are used for identification only.',
};

export function buildTemplate(key: TemplateKey): PageContent {
  const hero = sec('hero', {
    eyebrow: '',
    title: '{company} placement prep',
    intro: '',
    subtitle: '2026–27 freshers',
    show_chips: true,
    next_step_label: 'Your next step',
    next_step_text: 'Take the 25-minute readiness check. Your score shows which round to fix first.',
    next_step_href: '',
    card_eyebrow: 'Test · Free readiness check',
    card_title: 'How ready are you for {company}?',
    card_meta: '',
    card_cta_label: 'Start free check',
    card_cta_href: '/skill-test',
    card_note: '',
  });
  const stats = sec('stat_strip', {
    stats: [
      { label: 'Package', value: '', stamp: 'being_verified' },
      { label: 'Selection process', value: '', stamp: 'candidate_reports' },
      { label: 'Eligible batch', value: '', stamp: 'confirm_notice' },
      { label: 'Off-campus drive', value: '', stamp: 'none', link_label: 'Live on Drive Radar', link_href: '#drive-radar' },
    ],
  });
  const nav = sec('section_nav', { eyebrow: 'Your {company} loop' });
  const rounds = sec('rounds_route', {
    eyebrow: 'The route to the offer',
    title: 'Every round. Train, test and track each one.',
    pass_mark: 70,
    intro: 'Pick a round, then move through its loop: learn the topics, prove it under real conditions, and see what to fix next.',
    stations: key === 'mass_recruiter'
      ? [
          station('Cognitive & technical', 'Cognitive', ['Quant', 'Logical reasoning', 'Verbal', 'Pseudocode', 'Networking basics'], ['quantitative-aptitude', 'logical-reasoning', 'verbal-ability']),
          station('Coding', 'Coding', ['Arrays', 'Strings', 'Loops & patterns'], ['c', 'python', 'dsa']),
          station('Communication', 'Communication', ['Reading', 'Listening', 'Speaking'], ['verbal-ability', 'business-communication']),
          station('Interview', 'Interview', ['Projects', 'OOP', 'DBMS', 'HR questions']),
        ]
      : [
          station('Online assessment', 'OA', ['Arrays', 'Graphs', 'DP'], ['dsa']),
          station('Technical', 'Technical', ['DSA', 'OS', 'DBMS', 'CN'], ['dsa']),
          station('System design', 'Design', ['Scalability', 'Caching']),
          station('HR', 'HR', ['Behavioural', 'Projects']),
        ],
  });
  const pack = sec('prep_pack', {
    eyebrow: 'Prep pack',
    title: 'Start free. Go deeper when you’re ready.',
    free_title: 'Free',
    free_price_label: '₹0',
    free_features: ['Readiness check and basic Track score', 'Topic notes and sample questions for every round', 'Countdown plan and daily practice'],
    free_cta_label: 'Start free',
    free_cta_href: '',
    paid_title: '{company} Pack',
    paid_badge: 'Updated for 2026–27',
    paid_price_note: 'one-time · lifetime access',
    paid_features: ['Everything in Free', 'Full topic-wise question bank', 'Sectional mocks for every round', 'Detailed Track analytics by topic'],
    paid_cta_label: 'Get the pack',
    preview_label: 'Preview questions',
    preview_href: '',
    refund_text: '',
    owned_text: 'Your pack is active. Every round is unlocked.',
  });
  const community = sec('community_offer', {
    title: 'Took the {company} test? Help the next batch.',
    body: 'Share your round-by-round experience. Once it’s verified, it appears here for everyone preparing.',
    cta_label: 'Share my experience',
  });
  const faq = sec('faq', { title: 'Questions students ask', items: [] });
  const also = sec('also_preparing', {
    title: 'Also preparing for',
    intro: 'Compare drives side by side.',
    company_slugs: [],
    compare_label: 'Compare drives',
  });

  if (key === 'product_company') {
    return {
      schema_version: 1,
      settings: { ...DEFAULT_SETTINGS, accent: 'sky', seo_title: '{company} interview preparation | TieEdu' },
      sections: [
        hero, stats, nav, rounds, pack, community,
        sec('experiences', { eyebrow: 'From candidates', title: 'Interview experiences' }),
        faq, also,
      ],
    };
  }

  return {
    schema_version: 1,
    settings: { ...DEFAULT_SETTINGS },
    sections: [
      hero,
      stats,
      nav,
      sec('eligibility_apply', {
        eyebrow: 'Before you start',
        title: 'Can you apply, and how?',
        eligibility_title: 'Eligibility',
        rows: [
          { label: 'Degree', value: '', check: 'Is your degree one of the listed ones?' },
          { label: 'Passing year', value: '', check: 'Is your passing year one of the eligible years?' },
          { label: 'Academic marks', value: '', check: 'Do your 10th, 12th and graduation marks meet the minimum?' },
          { label: 'Active backlogs', value: '', check: 'Do you meet the backlog rule?' },
          { label: 'Education gap', value: '', check: 'Do you meet the education-gap rule?' },
        ],
        self_check_label: 'Check if I’m eligible',
        last_confirmed: '',
        source_label: 'Official careers page',
        source_url: '',
        apply_title: 'How to apply',
        steps: [
          { title: 'Register on the {company} careers portal', body: 'Through your college (on-campus) or the open off-campus listing.' },
          { title: 'Get your assessment invite by email', body: 'Check spam folders. Drive Radar shows when invites are going out.' },
          { title: 'Clear every round', body: 'Each round is broken down below with a mock to practise on.' },
          { title: 'Offer, verification, onboarding', body: 'Track every step after selection with the onboarding tracker.' },
        ],
      }),
      rounds,
      sec('countdown', {
        title: 'When is your test? We’ll split the days for you.',
        date_label: 'My {company} test date',
        default_days: 14,
        plan_blocks: [
          { focus: 'Quant', weight: 3 },
          { focus: 'Logical', weight: 2 },
          { focus: 'Verbal', weight: 2 },
          { focus: 'Coding', weight: 4 },
          { focus: 'Communication', weight: 1 },
        ],
        mock_every_days: 4,
        final_day_label: 'Light revision',
        daily_title: 'Daily practice',
        daily_text: 'Practise a little every day and mark it done to keep your streak.',
        daily_cta_label: 'Practise now',
        daily_cta_href: '/skill-test/quantitative-aptitude',
      }),
      sec('role_compare', {
        eyebrow: 'Pick your target',
        title: 'Which role are you aiming for?',
        picker_label: 'Aim for',
        roles: [],
        rows: [],
        default_role: 1,
      }),
      pack,
      community,
      sec('drive_radar', {
        eyebrow: 'Track the drive',
        title: 'Drive Radar',
        intro: 'Updates reported by students and confirmed by others.',
        updates: [],
        empty_text: 'No updates yet this season.',
        allow_reports: true,
        min_confirmations: 3,
        report_label: 'Report an update',
        report_href: '',
        notify_label: 'Notify me of new updates',
        notify_href: '',
      }),
      sec('onboarding', {
        eyebrow: 'Selected? Track to day one',
        title: 'Onboarding tracker',
        steps: [
          { title: 'Offer letter received', hint: '' },
          { title: 'Documents submitted', hint: '' },
          { title: 'Background verification', hint: '' },
          { title: 'Joining letter', hint: '' },
          { title: 'Day one', hint: '' },
        ],
      }),
      sec('comeback', {
        title: 'Didn’t clear this time?',
        body: 'Your Track results show which round to fix. Get a comeback plan and see which other drives are open now.',
        cta_label: 'Get my comeback plan',
        cta_href: '/mock-drive',
      }),
      faq,
      also,
    ],
  };
}

/** Run a template through the sanitiser so every field exists with its declared kind. */
export function templateContent(key: TemplateKey): PageContent {
  return sanitizeContent(buildTemplate(key));
}

export function isTemplateKey(v: unknown): v is TemplateKey {
  return TEMPLATES.some((t) => t.value === v);
}

// ---------------------------------------------------------------------------
// Store helpers (db.company_pages)
// ---------------------------------------------------------------------------

export function pagesOf(db: any): CompanyPageDoc[] {
  if (!Array.isArray(db.company_pages)) db.company_pages = [];
  return db.company_pages;
}

export function findPage(db: any, companyId: string): CompanyPageDoc | undefined {
  return pagesOf(db).find((p) => p.company_id === companyId);
}

export function newPageDoc(companyId: string, template: TemplateKey, by: string | null): CompanyPageDoc {
  return {
    company_id: companyId,
    enabled: false,
    draft: templateContent(template),
    published: null,
    published_at: null,
    published_by: null,
    history: [],
    scheduled: null,
    updated_at: new Date().toISOString(),
    updated_by: by,
  };
}

export function contentBytes(content: PageContent): number {
  return Buffer.byteLength(JSON.stringify(content), 'utf8');
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

/** The page students actually see: published AND switched on. */
export function livePage(db: any, companyId: string): PageContent | null {
  const doc = findPage(db, companyId);
  return doc && doc.enabled && doc.published ? doc.published : null;
}

/**
 * The flat pack price a live company page sets, or null for the standard
 * ladder. Checkout applies it as a cap, so it can lower a price but never
 * raise one.
 */
export function companyPackCap(db: any, companyId: string): number | null {
  const page = livePage(db, companyId);
  const v = Number(page?.settings?.pack_price_inr);
  return Number.isInteger(v) && v > 0 ? v : null;
}

/** Makes `content` the live version, keeping the previous one in history. */
export function publishContent(doc: CompanyPageDoc, content: PageContent, actor: string, at: string): void {
  if (doc.published) {
    doc.history.unshift({ content: doc.published, at: doc.published_at || at, by: doc.published_by || 'unknown' });
    doc.history = doc.history.slice(0, HISTORY_CAP);
  }
  doc.published = content;
  doc.published_at = at;
  doc.published_by = actor;
  doc.updated_at = at;
  doc.updated_by = actor;
}

/**
 * Promotes a due scheduled publish. Called on read (public and admin), so a
 * schedule needs no background job: the first visit after the time does it.
 * Returns true when the document changed and must be saved.
 */
export function applyDueSchedule(doc: CompanyPageDoc, now = new Date()): boolean {
  const sch = doc.scheduled;
  if (!sch || new Date(sch.at).getTime() > now.getTime()) return false;
  publishContent(doc, sch.content, sch.by, sch.at);
  doc.scheduled = null;
  return true;
}
