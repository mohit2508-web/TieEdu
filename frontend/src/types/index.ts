export type BlockType =
  | 'markdown'
  | 'code'
  | 'image'
  | 'diagram'
  | 'animation'
  | 'callout'
  | 'audio'
  | 'table'
  | 'video'
  | 'checklist'
  | 'resources'
  | 'steps'
  | 'video_link';

/** Course difficulty. Mirrors LEVELS_ALLOWED in backend/src/routes/courseAdmin.routes.ts. */
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

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
    /** Author-stated complexity, e.g. "O(N log N) · O(1)". Shown verbatim. */
    complexity?: string;
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
    // Checklist block
    items?: string[];
    // Resources block
    links?: { label: string; url: string }[];
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

export type StudyPlanStatus = 'draft' | 'published' | 'archived';

export interface StudyPlanTemplateMeta {
  id: string;
  title: string;
  /** URL-safe identifier. Nullable on templates created before slugs existed. */
  slug: string | null;
  company_id?: string | null;
  company_name: string | null;
  role: string | null;
  status: StudyPlanStatus;
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  phase_count?: number;
}

export interface StudyPlanPhase {
  id: string;
  template_id: string;
  phase_order: number;
  title: string;
  day_from: number;
  day_to: number | null;
  summary: string;
  blocks: ContentBlock[];
}

export interface StudyPlanPhaseView {
  id: string;
  order: number;
  title: string;
  dayFrom: number;
  dayTo: number | null;
  dayLabel: string;
  summary: string;
  blocks: ContentBlock[];
  completed: boolean;
}

export interface StudyPlanView {
  targetCompany: string;
  targetRole: string;
  daysRemaining: number;
  interviewDate: string | null;
  source: 'template' | 'fallback';
  templateId: string | null;
  templateTitle: string | null;
  enrollmentId: string | null;
  progress: { completed: number; total: number; percent: number };
  phases: StudyPlanPhaseView[];
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

/**
 * Public shape of a landing-hero poster, exactly as GET /api/posters returns
 * it. `image_url` is already absolute against the API host, so the carousel can
 * drop it straight into an <img src>.
 */
export interface HeroPoster {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  cta_label: string;
  /** In-app path ("/company/google") or an absolute external URL. */
  href: string;
  alt_text: string;
  image_url: string;
  is_featured: boolean;
}

/** Admin shape: the full record plus server-computed liveness and the image url. */
export interface HeroPosterAdmin extends Omit<HeroPoster, 'image_url'> {
  image_stored_name: string;
  image_file_name: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  start_at: string | null;
  end_at: string | null;
  /** True when the poster is active AND inside its run window, per the server. */
  is_live: boolean;
  created_at: string;
  updated_at: string;
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
  pdfs?: ModulePdf[];     // multiple PDFs per module (new)
  pdf?: ModulePdf | null;  // legacy single-pdf (backward compat — prefer pdfs[])
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

/**
 * Admin-authored round-by-round notes. Every field is optional — an empty note
 * renders as "not recorded" instead of an invented description. Provenance for
 * each key lives in Company.metric_sources.
 */
export interface CompanyComparisonMetrics {
  round_1_oa?: string | null;
  round_2_tech?: string | null;
  round_3_system_design?: string | null;
  round_4_hr?: string | null;
  top_questions?: string[];
  system_design_focus?: string;
  selected_percent?: number;
  rejected_percent?: number;
}

export interface MetricProvenance {
  /** Where the figure came from — a URL, a drive document, a filed offer letter. */
  source: string;
  /** ISO date the admin last checked this figure. */
  verified_at: string;
  note?: string;
}

/** Keyed by metric id (ctc, process_days, rounds, difficulty, round_1_oa, ...). */
export type ProvenanceMap = Record<string, MetricProvenance | null>;

export interface TrustStats {
  rating: number;
  rating_count: number;
  weekly_unlocks: number;
  verified_by_role: string | null;
  /** ISO date of the newest PUBLISHED candidate report. null when none exist. */
  last_report_at: string | null;
  accuracy_rate: number;
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

  derived: DerivedFacts;
  top_questions: string[];

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
  rounds: Array<{ key: string; label: string; module_count: number; question_count: number }>;
  editorial_metrics: readonly string[];
  methodology: string[];
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
  /** Admin-authored one-line positioning. Empty until an admin writes it. */
  tagline?: string | null;
  /** Admin-authored long-form description of the company and its hiring. */
  about?: string | null;
  hq?: string | null;
  founded_year?: number | null;
  employee_band?: string | null;
  careers_link?: string | null;
  /** ISO date the admin last reviewed this company profile. */
  fact_checked_at?: string | null;
  /** Per-metric provenance for editorial figures (CTC, process days, ...). */
  metric_sources?: ProvenanceMap;
  trust_stats?: TrustStats;
  rounds_pipeline?: RoundStep[];
  modules?: ContentModule[];
  interview_reports?: InterviewReport[];
  comparison_metrics?: CompanyComparisonMetrics;
  is_unlocked?: boolean;
  owned_module_ids?: string[];
  premium_module_ids?: string[];
  premium_module_count?: number;
  owned_module_count?: number;
  module_count?: number;
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

/**
 * A paid course in the cart.
 *
 * Deliberately NOT part of the pack ladder: a course has its own catalogue
 * price, so it is summed separately on both sides (client mirror in
 * `summarizePackItems`, server authority in `summarizeCourseLines`).
 */
export interface CourseCartItem {
  kind: 'course';
  /** The course id — this is what the server matches the order line against. */
  id: string;
  slug: string;
  name: string;
  price: number;
  /** Shown in the cart so the buyer knows what they are paying for. */
  lesson_count?: number;
}

export type CartItem = Company | PricingPlan | CompanyModuleItem | CourseCartItem;

// ---------------------------------------------------------------------------
// PRICING CATALOG — mirrors backend/src/lib/pricing.ts
// Served by GET /api/pricing/catalog. The frontend must never invent a price;
// every figure below is computed by the same packPrice() the server charges with.
// ---------------------------------------------------------------------------

export interface PricingLadderRung {
  module_count: number;
  price: number;
}

export interface CatalogModule {
  id: string;
  title: string;
  round_type: RoundType | null;
  module_type: string | null;
  item_count: number;
  has_pdf: boolean;
  /** Price if this round is bought on its own. */
  price: number;
}

export interface CatalogCompany {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  industry: string | null;
  premium_count: number;
  modules: CatalogModule[];
  /** Real price for this company's pack at its real remaining size. */
  pack_price: number;
  list_total: number;
  savings: number;
  savings_percent: number;
  is_unlocked: boolean;
  owned_module_count: number;
}

export interface PricingCatalog {
  currency: 'INR';
  single_module_price: number;
  complete_pack_price: number;
  complete_pack_count: number;
  ladder: PricingLadderRung[];
  companies: CatalogCompany[];
}

// ============================================================================
// COURSES
// Mirrors backend/src/data/db.ts + the response shapes asserted by
// backend/src/scripts/smokeCourses.ts. If you change a field here, change it
// there and re-run that script.
// ============================================================================

export type VideoProvider = 'youtube' | 'vimeo';

export interface CourseVideo {
  provider: VideoProvider;
  /** The watch-page URL exactly as the admin pasted it. */
  url: string;
  video_id: string;
  title: string;
  channel: string;
  /** The author's estimate. The server bounds any client duration against it. */
  duration_minutes: number;
  added_at: string;
  /** Server-derived. The player must not build this itself. */
  embed_url?: string;
}

/**
 * Lesson bodies reuse the app-wide `ContentBlock` shape ({ block_type, payload })
 * and the existing `ContentBlockRenderer` — the course engine deliberately does
 * not invent a second block format.
 */
export type CourseLessonBlock = ContentBlock;

/** What the learner still has to do on a lesson, phrased for the UI. */
export interface LessonRequirement {
  key: 'video' | 'quiz' | 'read';
  label: string;
  met: boolean;
}

export interface LessonCompletionState {
  has_video: boolean;
  has_quiz: boolean;
  video_percent: number;
  video_ok: boolean;
  /**
   * The real numbers behind `video_percent`, so the player can say
   * "12:34 of 18:20 watched" rather than a percentage the learner cannot act on.
   * `video_duration_seconds` is the same bounded duration the gate divides by.
   */
  video_watched_seconds: number;
  video_duration_seconds: number;
  /** Playhead the server kept, so reopening the lesson resumes here. */
  video_position_seconds: number;
  quiz_best_percent: number | null;
  quiz_ok: boolean;
  read_percent: number;
  read_ok: boolean;
  ready: boolean;
  is_complete: boolean;
  requirements: LessonRequirement[];
  /** The server's watch gate as a percent, so the UI cannot drift from it. */
  watch_required_percent: number;
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  summary: string;
  sort_order: number;
  duration_minutes: number;
  xp_reward: number;
  video: CourseVideo | null;
  quiz: CourseQuizMeta | null;
  blocks?: CourseLessonBlock[];
  state?: LessonCompletionState;
  locked?: boolean;
  lock_reason?: string | null;
}

/**
 * A locked lesson: the syllabus is public, the teaching content is not.
 * `video` and `blocks` are absent, so the player must check `locked` before
 * trying to render them.
 */
export interface LockedLessonStub {
  id: string;
  module_id: string;
  title: string;
  summary: string;
  sort_order: number;
  duration_minutes: number;
  kind: 'video' | 'quiz' | 'reading';
  has_video: boolean;
  has_quiz: boolean;
  state: LessonCompletionState;
  locked: true;
  lock_reason: string | null;
}

export type CourseLessonView = CourseLesson | LockedLessonStub;

export interface CourseQuizMeta {
  id: string;
  question_count: number;
  passing_percent: number;
}

export interface CourseQuizOption {
  id: string;
  text: string;
}

export interface CourseQuizQuestion {
  id: string;
  prompt: string;
  /** Plain strings. The learner picks by position. */
  options: string[];
}

/** One graded question. `correct` and `explanation` only arrive post-submission. */
export interface CourseQuizResult {
  id: string;
  prompt: string;
  correct_index: number;
  correct: boolean;
  explanation?: string;
}

export interface CourseQuizOutcome {
  score_percent: number;
  passed: boolean;
  passing_percent: number;
  best_percent: number;
  is_best_attempt: boolean;
  correct_count: number;
  total_count: number;
  results: CourseQuizResult[];
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  summary: string;
  sort_order: number;
  lessons: CourseLessonView[];
}

export interface CourseStats {
  module_count: number;
  lesson_count: number;
  total_minutes: number;
  total_xp: number;
  quiz_count: number;
  video_count: number;
}

export interface CourseProgress {
  enrolled: boolean;
  completed: number;
  total: number;
  percent: number;
  is_complete: boolean;
  completed_at: string | null;
  completed_lesson_ids: string[];
  xp_earned: number;
  next_lesson_id: string | null;
}

/**
 * The server's verdict on whether this learner may take a course.
 *
 * The client must not derive this from `is_free` / `price_inr` — those are
 * catalogue fields, and the answer also depends on whether a paid order for
 * this course exists. `granted: false` with a price is the paywall state; the
 * UI should offer checkout rather than an enrol button that 402s.
 */
export interface CourseAccess {
  granted: boolean;
  reason: string | null;
  price_inr: number;
  is_free: boolean;
}

export interface CourseCard {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  level: string;
  is_free: boolean;
  price_inr: number;
  thumbnail_url?: string;
  tags: string[];
  certificate_eligible: boolean;
  stats: CourseStats;
  progress: CourseProgress | null;
  access?: CourseAccess;
  lock_reason: string | null;
}

export interface CourseDetail extends Omit<CourseCard, 'progress'> {
  description?: string;
  modules: CourseModule[];
  progress: CourseProgress | null;
  lock_reason: string | null;
  /**
   * The learner's own certificate for this course, if it has already been
   * issued. Without it the page can only ever say "claim", and a learner who has
   * already claimed has to click a no-op to reach the download.
   */
  certificate?: CertificateSummary | null;
}

export interface CourseCatalogResponse {
  status: 'success';
  courses: CourseCard[];
  categories: string[];
  total_xp: number;
}

/**
 * A row in /my-courses. The API returns these FLAT — the course fields sit
 * alongside progress and the certificate flags, there is no nested `course`.
 */
export type MyCoursesCourse = Omit<CourseCard, 'progress'> & {
  // The endpoint filters to enrolled rows only, so progress is never null here.
  progress: CourseProgress;
  enrolled_at: string;
  last_activity_at: string;
  has_certificate: boolean;
  feedback_given: boolean;
};

/**
 * The certificate rows inside /my-courses are the RAW stored records, not the
 * summary projection — so they carry `course_id` (which is how you match one to
 * a course) but no `download_path`/`verification_url`. Use
 * `certificateDownloadPath(serial)` to build the download URL.
 */
export interface MyCertificate {
  id: string;
  serial: string;
  user_id: string;
  course_id: string;
  course_title: string;
  recipient_name: string;
  recipient_email: string;
  issued_at: string;
  xp_at_issue: number;
  lessons_completed: number;
  lessons_required: number;
  signature: string;
  status: 'active' | 'revoked';
  revoked_reason: string;
  revoked_at: string | null;
}

export interface MyCoursesResponse {
  status: 'success';
  courses: MyCoursesCourse[];
  in_progress: MyCoursesCourse[];
  completed: MyCoursesCourse[];
  total_xp: number;
  level: number;
  certificates: MyCertificate[];
}

/** Response of POST /lessons/:id/progress. */
export interface LessonProgressResponse {
  status: 'success';
  lesson: LessonCompletionState;
  progress: CourseProgress;
  /**
   * Seconds the server actually credited, and the rest it threw away. The UI
   * must show `rejected_seconds` rather than pretending the claim was honoured.
   */
  credited_seconds: number;
  rejected_seconds: number;
  /**
   * The playhead the server kept, bounded by its trusted duration. Echoed so a
   * client whose seek did not land resumes from the truth rather than a guess.
   */
  position_seconds: number;
  xp: { reason: string; xp: number; awarded: boolean }[];
  xp_total: number;
  course_complete: boolean;
}

export interface CertificateSummary {
  serial: string;
  course_title: string;
  recipient_name: string;
  issued_at: string;
  lessons_completed: number;
  lessons_required: number;
  xp_at_issue: number;
  status: 'active' | 'revoked';
  revoked_reason: string;
  revoked_at: string | null;
  signature: string;
  verification_url: string;
  /** API-relative. The download needs a Bearer token, so fetch it, don't link it. */
  download_path: string;
}

export interface CertificateCheck {
  signature_valid: boolean;
  record_exists: boolean;
  status: 'active' | 'revoked' | 'unknown';
  revoked_reason: string;
  revoked_at: string | null;
}

/**
 * The public verification response.
 *
 * Note the naming: `status` describes how much we trust the ANSWER
 * ('genuine' | 'revoked' | 'invalid'), while the actual verdict is
 * `valid` / `found` / `check`. A serial we have never issued comes back
 * HTTP 404 with `{ status: 'genuine', found: false, ... }` — 'genuine' here
 * means "this is a real answer from us", not "this certificate is valid".
 */
export interface CertificateVerifyResponse {
  status: 'genuine' | 'revoked' | 'invalid';
  found: boolean;
  valid?: boolean;
  check: CertificateCheck;
  message?: string;
  explanation?: string;
  certificate?: {
    serial: string;
    recipient_name: string;
    course_title: string;
    issued_at: string;
    lessons_completed: number;
    lessons_required: number;
    xp_at_issue: number;
    college: string | null;
    verification_url: string;
  } | null;
}

export interface CourseFeedback {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  would_recommend: boolean;
  what_learned: string;
  created_at: string;
}

export interface CourseXpEntry {
  id: string;
  user_email: string;
  user_name: string;
  reason: string;
  xp: number;
  course_title: string | null;
  note: string;
  created_at: string;
  idempotency_key: string;
}

/** GET /course-admin/courses/:id — the full editor payload. */
export interface AdminCourseDetail {
  status: 'success';
  course: AdminCourseForEditor;
  enrollments: {
    user_id: string;
    name: string;
    email: string;
    enrolled_at: string;
    completed_at: string | null;
    completed_lessons: number;
    total_lessons: number;
  }[];
  feedback: CourseFeedback[];
}

/**
 * The course as the editor sees it. Lessons here DO carry `correct_index` and
 * `explanation` — the admin has to be able to set and review the answer key.
 */
export interface AdminCourseForEditor {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: CourseLevel;
  is_free: boolean;
  price_inr: number;
  thumbnail_url: string;
  tags: string[];
  outcomes: string[];
  /** Gate: this course can only be opened once that course is 100% complete. */
  prerequisite_course_id: string | null;
  certificate_eligible: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
  modules: AdminModule[];
  stats: CourseStats;
}

export interface AdminModule {
  id: string;
  course_id: string;
  title: string;
  summary: string;
  sort_order: number;
  lessons: AdminLesson[];
}

/** The quiz shape accepted by PUT /course-admin/lessons/:id/quiz. */
export interface AdminLessonQuiz {
  id?: string;
  passing_percent?: number;
  questions: AdminQuizQuestion[];
}

export interface AdminQuizQuestion {
  id?: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

export interface AdminLesson {
  id: string;
  module_id: string;
  title: string;
  summary: string;
  sort_order: number;
  duration_minutes: number;
  xp_reward: number;
  video?: CourseVideo | null;
  blocks: CourseLessonBlock[];
  quiz?: AdminLessonQuiz | null;
  /** Derived server-side for the editor; read-only. */
  read_required_seconds?: number;
}

// --- Admin: certificates, XP, feedback --------------------------------------
// Verified against backend/src/routes/courseAdmin.routes.ts.

/** Row in GET /course-admin/certificates. Note `cert_status`, not `status`. */
export interface AdminCertificate {
  serial: string;
  recipient_name: string;
  recipient_email: string;
  course_id: string;
  course_title: string;
  /** False when the course was deleted after the certificate was issued. */
  course_still_exists: boolean;
  issued_at: string;
  lessons_completed: number;
  lessons_required: number;
  xp_at_issue: number;
  signature: string;
  signature_prefix: string;
  cert_status: 'active' | 'revoked';
  revoked_reason: string;
  revoked_at: string | null;
  verification_url: string;
}

export interface AdminCertificatesResponse {
  status: 'success';
  certificates: AdminCertificate[];
  counts: { total: number; active: number; revoked: number };
}

export interface AdminXpEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  reason: string;
  xp: number;
  /** The idempotency key that makes a replay a no-op. */
  key: string;
  course_title: string | null;
  lesson_title: string | null;
  created_at: string;
  note: string;
}

export interface AdminXpUserTotal {
  user_id: string;
  name: string;
  email: string;
  ledger_xp: number;
  cached_xp: number;
  drift: number;
}

export interface AdminXpResponse {
  status: 'success';
  entries: AdminXpEntry[];
  total_entries: number;
  totals_by_reason: Record<string, { entries: number; xp: number }>;
  xp_rules: Record<string, number>;
  levels: unknown;
  watch_threshold_percent: number;
  /** Any row here is a bug — cached user.xp should always equal the ledger sum. */
  xp_drift: AdminXpUserTotal[];
  leaderboard: AdminXpUserTotal[];
}

export interface AdminCourseListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: CourseLevel;
  is_free: boolean;
  price_inr: number;
  thumbnail_url: string;
  tags: string[];
  outcomes: string[];
  prerequisite_course_id: string | null;
  certificate_eligible: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
  module_count: number;
  stats: CourseStats;
  enrolled: number;
  certificates: number;
}

export interface AdminCourseListResponse {
  status: 'success';
  courses: AdminCourseListItem[];
}

export interface VideoResolveResponse {
  status: 'success';
  provider: VideoProvider;
  video_id: string;
  title: string;
  channel: string;
}
