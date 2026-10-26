/*
 * Company Page Studio types. The authoritative definitions — which fields each
 * section has, their limits and kinds — live on the server
 * (`backend/src/lib/companyPage.ts`) and reach the admin studio through the
 * schema endpoint. These types describe the payload shapes only.
 */

export type CpSectionType =
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

export interface CpSection {
  id: string;
  type: CpSectionType;
  visible: boolean;
  data: Record<string, any>;
}

export interface CpContent {
  schema_version: 1;
  settings: Record<string, any>;
  sections: CpSection[];
}

export type CpFieldKind =
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
  | 'skill_refs'
  | 'image'
  | 'item_refs';

export interface CpFieldDef {
  key: string;
  label: string;
  kind: CpFieldKind;
  help?: string;
  placeholder?: string;
  max?: number;
  min?: number;
  multiline?: boolean;
  required?: boolean;
  options?: { value: string; label: string }[];
  item?: CpFieldDef[];
  itemTitleKey?: string;
}

export interface CpSectionDef {
  type: CpSectionType;
  label: string;
  description: string;
  navLabel: string;
  fields: CpFieldDef[];
}

export interface CpSchema {
  common_fields: CpFieldDef[];
  sections: CpSectionDef[];
  settings_fields: CpFieldDef[];
  accent_palette: { value: string; label: string; hex: string }[];
  templates: { value: string; label: string; description: string }[];
  skills: { slug: string; name: string; category: string }[];
  limits: { max_sections: number; history_cap: number };
}

export interface CpIssue {
  level: 'error' | 'warning';
  section_id: string | null;
  message: string;
}

export interface CpAdminDoc {
  company_id: string;
  enabled: boolean;
  persisted: boolean;
  draft: CpContent;
  published: CpContent | null;
  published_at: string | null;
  published_by: string | null;
  updated_at: string;
  updated_by: string | null;
  history: { index: number; at: string; by: string; sections: number }[];
  scheduled: { at: string; by: string } | null;
  issues: CpIssue[];
}

export interface CpRadarItem {
  id: string;
  kind: string;
  text: string;
  date: string;
  confirmed: number;
  pending: boolean;
}

export interface CpPublic {
  enabled: boolean;
  page?: CpContent;
  published_at?: string | null;
  pack_price_cap?: number | null;
  radar?: CpRadarItem[];
}

export interface CpStationTrack {
  station_id: string;
  score: number | null;
  attempts: number;
  weak_topics: { name: string; percentage: number }[];
}

/** The signed-in student's state on one company page. */
export interface CpMe {
  profile: {
    test_date: string;
    target_role: number | null;
    daily_streak: number;
    practiced_today: boolean;
    onboarding_done: string[];
    today: string;
  };
  track: {
    stations: CpStationTrack[];
    overall: number | null;
    weakest_station_id: string | null;
    attempted: boolean;
  };
  watching: boolean;
  radar_confirmed: string[];
  radar_mine: string[];
  radar?: CpRadarItem[];
}

export interface CpAdminRadarReport {
  id: string;
  kind: string;
  text: string;
  user_name: string;
  status: 'pending' | 'approved' | 'rejected';
  confirmed: number;
  created_at: string;
  moderated_by: string | null;
}

export interface CpStats {
  days: number;
  totals: Record<string, number>;
  series: { day: string; views: number }[];
  watchers: number;
  prep_profiles: number;
}
