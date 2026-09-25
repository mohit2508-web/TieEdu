export type BlockType = 'markdown' | 'code' | 'image' | 'diagram' | 'animation' | 'callout' | 'audio' | 'table' | 'video';

export type RoundType = 'OA' | 'Technical' | 'SystemDesign' | 'HR' | 'Managerial';

export interface ContentBlock {
  id: string;
  block_type: BlockType;
  block_order: number;
  payload: {
    text?: string;
    code?: string;
    language?: string;
    filename?: string;
    url?: string;
    alt?: string;
    caption?: string;
    source?: string;
    style?: 'tip' | 'warning' | 'info';
    title?: string;
    duration_seconds?: number;
    steps?: { title: string; desc: string; code_snippet?: string }[];
    // Table block
    headers?: string[];
    rows?: string[][];
    // Video block
    video_url?: string;
    video_type?: 'youtube' | 'mp4';
  };
}

export interface ContentItem {
  id: string;
  module_id: string;
  question_text?: string;
  is_free_preview: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  role_tag: string;
  frequency_tag: 'high' | 'medium' | 'low';
  round_type?: RoundType;
  status: 'draft' | 'in_review' | 'published';
  blocks: ContentBlock[];
  comments_count?: number;
  upvotes_count?: number;
}

export interface ModulePYQ {
  year: number;
  question: string;
  answer: string;
  frequency?: 'High' | 'Medium' | 'Low';
}

export interface ModuleSubjectTopic {
  title: string;
  content: string;
  pyqs?: ModulePYQ[];
}

export interface ModuleCoreSubject {
  subject: string; // e.g. DBMS, OS, Computer Networks, DSA, Aptitude
  topics: ModuleSubjectTopic[];
}

export interface ModuleInterviewQ {
  category: 'Technical' | 'Coding' | 'System Design' | 'Pseudocode';
  title: string;
  question: string;
  solution: string;
  code?: string;
  language?: string;
}

export interface ModuleCheatsheet {
  title: string;
  summary: string;
  content: string;
}

export interface ModuleNeverSkipTopic {
  topic: string;
  priority: 'High' | 'Must Do' | 'Frequent';
  notes: string;
}

export interface ModuleLMRPoint {
  title: string;
  points: string[];
}

export interface ModuleHRQuestion {
  question: string;
  answer: string;
  tips: string[];
}

export interface ModuleSectionData {
  overview?: {
    companyInfo: string;
    eligibility: string;
    salaryBreakdown: string;
    reviews?: Array<{ name: string; role: string; rating: number; text: string }>;
  };
  core_subjects?: ModuleCoreSubject[];
  interview_questions?: ModuleInterviewQ[];
  cheatsheets?: ModuleCheatsheet[];
  never_skip_topics?: ModuleNeverSkipTopic[];
  last_minute_revision?: ModuleLMRPoint[];
  hr_round?: ModuleHRQuestion[];
}

export interface ModulePdf {
  id: string;
  file_name: string;
  stored_name: string;
  size_bytes: number;
  title: string;
  uploaded_at: string;
}

export interface ContentModule {
  id: string;
  company_id: string;
  module_type: 'preparation_guide' | 'hr_question' | 'technical_question' | 'dsa_question' | 'system_design' | 'cheat_sheet' | 'salary_insight' | 'complete_pack';
  title: string;
  description?: string;
  round_type?: RoundType;
  sort_order: number;
  is_premium: boolean;
  price?: number;
  section_data?: ModuleSectionData;
  pdf?: ModulePdf | null;
  items: ContentItem[];
}

export interface InterviewReport {
  id: string;
  company_id: string;
  user_name: string;
  user_avatar?: string;
  user_role: string;
  rounds: {
    round_name: string;
    difficulty: 'easy' | 'medium' | 'hard';
    summary: string;
    matched_questions: boolean;
  }[];
  accuracy_rating: number | null;
  outcome: 'selected' | 'rejected' | 'pending' | null;
  status: 'pending_review' | 'published' | 'rejected';
  salary_lpa?: number;
  created_at: string;
}

export interface CompanyComparisonMetrics {
  round_1_oa: string;
  round_2_tech: string;
  round_3_system_design: string;
  round_4_hr: string;
  top_questions: string[];
  system_design_focus: string;
  selected_percent: number;
  rejected_percent: number;
}

export interface TrustStats {
  rating: number;
  rating_count: number;
  weekly_unlocks: number;
  verified_by_role: string | null;
  recency_label: string;
  accuracy_rate: number;
}

export interface RoundStep {
  step_number: number;
  title: string;
  subtitle: string;
  round_type: RoundType;
  difficulty: 'easy' | 'medium' | 'hard';
  module_count: number;
}

export interface QuestionComment {
  id: string;
  item_id: string;
  user_name: string;
  user_avatar?: string;
  text: string;
  created_at: string;
  is_pinned?: boolean;
  upvotes: number;
}

export interface UserProgress {
  solved_item_ids: string[];
  bookmarked_item_ids: string[];
}

export interface Company {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  industry: string;
  tags: string[];
  difficulty_rating: number;
  avg_process_days: number | null;
  avg_rounds: number | null;
  ctc_min: number | null;
  ctc_max: number | null;
  unlock_count: number;
  accuracy_score: number | null;
  accuracy_report_count?: number;
  last_updated_days_ago: number;
  status: 'draft' | 'published' | 'archived';
  seo_title: string;
  seo_description: string;
  trust_stats?: TrustStats;
  rounds_pipeline?: RoundStep[];
  modules?: ContentModule[];
  interview_reports?: InterviewReport[];
  comparison_metrics?: CompanyComparisonMetrics;
  is_unlocked?: boolean;
}

export interface SuccessStory {
  id: string;
  user_name: string;
  company_name: string;
  company_logo: string;
  role: string;
  ctc: string;
  photo_url: string;
  linkedin_url: string;
  quote: string;
}

export interface UserXP {
  xp_total: number;
  current_streak: number;
  longest_streak: number;
  level: 'Rookie' | 'Grinder' | 'Placement Ready' | 'Alumni Core';
  unlocked_company_ids: string[];
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  billing_cycle: 'one_time' | 'monthly' | 'quarterly';
  scope: 'single_company' | 'all_access' | 'elite_pass';
  popular?: boolean;
  features: string[];
}

/**
 * A module-scoped cart line (one premium round pack).
 * `module_ids` present => "Complete Pack" line (all rounds, ladder price).
 */
export interface CompanyModuleItem {
  kind: 'company';
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  module_id?: string;
  module_title?: string;
  round_type?: RoundType;
  module_ids?: string[];
  module_count: number;
  price: number;
}

export type CartItem = Company | PricingPlan | CompanyModuleItem;
