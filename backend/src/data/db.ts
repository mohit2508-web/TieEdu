import fs from 'fs';
import path from 'path';
import { getSeedCourses } from './seedCourses';
import { seedStudyPlanTemplates } from './seedStudyPlans';

export interface ReportItem {
  id: string;
  company_id: string;
  company_name?: string;
  user_id?: string | null;
  user_name: string;
  user_role: string;
  rounds: {
    round_name: string;
    difficulty: string;
    summary: string;
    matched_questions: boolean;
  }[];
  accuracy_rating: number | null;
  outcome: 'selected' | 'rejected' | 'pending' | null;
  status: 'pending_review' | 'published' | 'rejected';
  salary_lpa?: number;
  created_at: string;
}

export interface BlockContentPayload {
  company_name: string;
  round_title: string;
  question_text: string;
  block_type: 'markdown' | 'code' | 'diagram' | 'callout';
  payload_content: string;
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
 * A big rotating creative in the landing hero. Admin-authored end to end: the
 * image, the overlay copy, the link and the run window are all set from the
 * control plane, so the owner decides which poster is live without a deploy.
 */
export interface HeroPoster {
  id: string;
  /** Headline burned over the image. Empty means image-only creative. */
  title: string;
  /** Supporting line under the title. */
  subtitle: string;
  /** Pill above the title — "NEW", "LIVE DRIVE", "OFFER" and so on. */
  badge: string;
  /** Button copy. Empty hides the button and makes the whole poster the link. */
  cta_label: string;
  /**
   * Where the poster points. An in-app path ("/company/google") stays inside the
   * SPA; an absolute http(s) URL is allowed for partner/external campaigns and
   * gets a target=_blank at render time.
   */
  href: string;
  /** Accessible description — also the image's alt text on the student site. */
  alt_text: string;
  image_stored_name: string;
  image_file_name: string;
  is_active: boolean;
  /** Manual ordering, low number shows first. Ties break on created_at. */
  sort_order: number;
  /** ISO datetimes; null/empty means "no bound". */
  start_at: string | null;
  end_at: string | null;
  /** Rotating ad of the week. When set, the public list returns only this poster. */
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  xp?: number;
  streak?: number;
  college?: string;
  badge?: string;
  avatar?: string;
  license_id?: string;
  roll_no?: string;
  disabled?: boolean;
  created_at: string;
}

// ============================================================================
// COURSES ENGINE
// A real, admin-authored learning path: Course -> Module -> Lesson.
// Every lesson carries its own content blocks, an optional video and an
// optional server-graded quiz. Nothing here is seeded as "fake": a course only
// appears on the student catalog once an admin publishes it.
// ============================================================================

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type VideoProvider = 'youtube' | 'vimeo';

export interface LessonVideo {
  provider: VideoProvider;
  /** Normalised watch page URL, exactly as the admin pasted it. */
  url: string;
  /** Extracted provider id, used to build the embed src. */
  video_id: string;
  title: string;
  channel: string;
  /** Author estimate, shown as "~N min". Never used for the completion gate. */
  duration_minutes: number;
  added_at: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Never leaves the server until the learner has submitted an attempt. */
  correct_index: number;
  explanation: string;
}

export interface LessonQuiz {
  id: string;
  passing_percent: number;
  questions: QuizQuestion[];
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  summary: string;
  sort_order: number;
  /** Estimated reading/viewing time for the card grid. Author-supplied. */
  duration_minutes: number;
  /** Server-authoritative XP for finishing this lesson. The client cannot set it. */
  xp_reward: number;
  video?: LessonVideo | null;
  blocks: ContentBlockRecord[];
  quiz?: LessonQuiz | null;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  summary: string;
  sort_order: number;
  lessons: CourseLesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  /** Markdown. Rendered on the course overview page. */
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
  /** When false, completing the course still does not issue a certificate. */
  certificate_eligible: boolean;
    published: boolean;
    created_at: string;
    updated_at: string;
    /**
     * The person who teaches this course.
     *
     * Optional and nullable on purpose: the course pages render an instructor
     * block only when this resolves, so a course with no instructor assigned
     * shows nothing rather than a placeholder portrait or an invented name.
     */
    instructor_id?: string | null;
    /**
     * The long-form "About this course" prose that sits below the outcomes.
     *
     * Distinct from `description`: that is the one-line summary used on cards,
     * this is the multi-paragraph block that carries the page's search traffic.
     * Markdown, same as `description`. Optional — absent means no section.
     */
    about_course?: string;
    /** Bullets for a "What you need before you start" section. */
    prerequisites?: string[];
    /** Bullets for a "Who is this for" section. */
    audience?: string[];
    /**
     * Spoken language of the lesson recordings, as a display string ("English").
     *
     * Only truthful values belong here. Leave it empty rather than filling in a
     * language the lessons were not actually recorded in.
     */
    audio_language?: string;
    /** Subtitle language, if the lessons carry captions. */
    caption_language?: string;
    modules: CourseModule[];
  }

  /**
   * Someone who teaches one or more courses.
   *
   * Kept as its own record rather than a name typed onto each course, so a
   * learner's question ("who is this?") has one answer across the catalogue and
   * a course can be reassigned without rewriting a biography.
   *
   * Every field here is a real, checkable claim. `students_taught` and
   * `hours_lectured` in particular must come from the platform's own records —
   * they are the numbers a reader is most likely to check, and a placeholder
   * like "1000+ students" on an empty platform is a lie.
   */
  export interface Instructor {
    id: string;
    name: string;
    /** Job title, e.g. "Software Engineer & Instructor". */
    title: string;
    /** Long first-person or third-person biography. Markdown. */
    bio: string;
    /** Portrait. Optional; the block falls back to initials when absent. */
    photo_url?: string;
    /** Real enrolment count across their courses. Omit rather than estimate. */
    students_taught?: number;
    /** Real delivered lecture hours. Omit rather than estimate. */
    hours_lectured?: number;
    /** Mean learner rating, 1-5. Omit rather than estimate. */
    rating?: number;
    created_at: string;
  }


/** A course lesson reuses the same block vocabulary as the company reader. */
export interface ContentBlockRecord {
  id: string;
  block_type: ContentBlockType;
  block_order: number;
  payload: Record<string, any>;
}

export type ContentBlockType =
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

/**
 * The single source of truth for the block vocabulary, as a runtime list.
 *
 * Every write path that filters `block_type` must derive its allow-list from
 * here rather than retyping the union. The lists used to be maintained by hand
 * and drifted: the course admin API was missing `checklist` and `resources`, so
 * the lesson editor could offer a block the API silently dropped on save
 * (HTTP 200, block gone on reload), while the study-plan API rejected `steps`
 * and `video_link` that the renderer happily drew.
 *
 * The `satisfies` clause only proves every entry is a *valid* type — it happily
 * accepts a list that is missing members, which is exactly the drift we are
 * guarding against. The assertion below closes that hole: add a type to the
 * union without adding it here, and `Exhaustive` stops being `never` and the
 * build fails. Delete an entry that is still in the union and it fails too.
 */
export const ALL_BLOCK_TYPES = [
  'markdown',
  'code',
  'image',
  'diagram',
  'animation',
  'callout',
  'audio',
  'table',
  'video',
  'checklist',
  'resources',
  'steps',
  'video_link',
] as const satisfies readonly ContentBlockType[];

/** Compile-time proof that the runtime list and the union are the same set. */
type MissingBlockTypes = Exclude<ContentBlockType, (typeof ALL_BLOCK_TYPES)[number]>;

/**
 * If a type is added to the union but not to the list, `MissingBlockTypes` stops
 * being `never`, the annotation below becomes that string, and assigning `true`
 * fails to compile. Exported so it is never flagged as dead code.
 */
export const ALL_BLOCK_TYPES_EXHAUSTIVE: MissingBlockTypes extends never
  ? true
  : MissingBlockTypes = true;

export type StudyPlanStatus = 'draft' | 'published' | 'archived';

/** An admin-authored, reusable preparation plan. Phases hold the same block vocabulary. */
export interface StudyPlanTemplate {
  id: string;
  title: string;
  /**
   * URL-safe identifier for this template. Unique across templates and used in
   * admin deep links. Nullable because templates created before slugs existed
   * have none; the routes derive and persist one on first write.
   */
  slug: string | null;
  company_id: string | null;
  company_name: string | null;
  role: string | null;
  status: StudyPlanStatus;
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface StudyPlanPhase {
  id: string;
  template_id: string;
  phase_order: number;
  title: string;
  day_from: number;
  /** null means open-ended, e.g. "Day 12 onwards". */
  day_to: number | null;
  summary: string;
  blocks: ContentBlockRecord[];
}

/** A student's personal copy of a plan, resolved from a template at a point in time. */
export interface StudyPlanEnrollment {
  id: string;
  user_id: string | null;
  template_id: string | null;
  target_company: string;
  target_role: string;
  interview_date: string | null;
  total_days: number;
  source: 'template' | 'fallback';
  generated_at: string;
}

export interface StudyPlanPhaseProgress {
  id: string;
  enrollment_id: string;
  phase_id: string;
  completed: boolean;
  completed_at: string | null;
}

/** Per-user, per-course learning state. Persisted, never inferred client-side. */
export interface CourseProgress {
  user_id: string;
  course_id: string;
  enrolled_at: string;
  updated_at: string;
  completed_at: string | null;
  /** lesson_id -> cumulative distinct watched seconds (server-clamped) */
  video_watch_seconds: Record<string, number>;
  /** lesson_id -> highest reported player duration, so % is stable across loads */
  video_duration_seconds: Record<string, number>;
  /**
   * lesson_id -> last playhead position, so reopening a lesson resumes where the
   * learner stopped. Purely a convenience: the watch gate divides by duration
   * and credits only server-clamped elapsed time, so seeking the player to the
   * end grants nothing on its own.
   */
  video_position_seconds: Record<string, number>;
  /**
   * lesson_id -> ISO timestamp of the previous accepted heartbeat. Lets the
   * server refuse to credit watch time faster than real time, so the client
   * cannot farm a lesson by firing requests in a tight loop.
   */
  last_heartbeat_at: Record<string, string>;
  /** lesson_id -> true once the server accepted the completion */
  completed_lesson_ids: string[];
  /** quiz_id -> best percentage score achieved */
  quiz_best_percent: Record<string, number>;
  /** quiz_id -> true once passed */
  passed_quiz_ids: string[];
}

/**
 * XP is an append-only ledger, never a mutable counter. `xp` on the user
 * record is a cached sum of these rows; these rows are the source of truth.
 * A negative row is an explicit reversal, never a silent decrement.
 */
export interface XpEvent {
  id: string;
  user_id: string;
  course_id: string | null;
  lesson_id: string | null;
  /** Unique idempotency key — prevents double-awarding the same achievement. */
  key: string;
  reason: 'lesson_complete' | 'quiz_pass' | 'course_complete' | 'feedback_reward' | 'review' | 'reversal' | 'legacy_opening_balance';
  xp: number;
  created_at: string;
  note: string;
}

export interface Certificate {
  id: string;
  /** Human-facing + verification key, e.g. TIEEDU-2026-7QK4M2XB. */
  serial: string;
  user_id: string;
  course_id: string;
  course_title: string;
  /** Frozen at issue time so a later profile rename cannot rewrite history. */
  recipient_name: string;
  recipient_email: string;
  issued_at: string;
  xp_at_issue: number;
  lessons_completed: number;
  lessons_required: number;
  /** Ed25519 signature over the canonical payload — see lib/certificate.ts. */
  signature: string;
  /**
   * Fingerprint of the public key that produced `signature`.
   *
   * Recorded per certificate so the verifier knows which key to check against,
   * which is what makes a private-key rotation survivable: old certificates keep
   * verifying against the retired key instead of all failing at once.
   */
  signing_key_id: string;
  status: 'active' | 'revoked';
  revoked_reason: string;
  revoked_at: string | null;
}

export interface CourseFeedback {
  id: string;
  user_id: string;
  user_name: string;
  course_id: string;
  rating: number;
  what_learned: string;
  would_recommend: boolean;
  /** Feedback is only accepted after the course is genuinely complete. */
  xp_awarded: number;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
}

const DATA_DIR = path.join(__dirname, '../../data');
// DB_FILE lets an integration test point the store at a scratch file instead of
// the install's real db.json. Unset in normal operation.
const DB_FILE = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.join(DATA_DIR, 'db.json');

const initialDbData = {
  companies: [
    {
      id: 'comp-1',
      slug: 'zscaler',
      name: 'Zscaler',
      logo_url: '',
      industry: 'Cybersecurity & Cloud Security',
      tags: ['Network Security', 'Zero Trust', 'Cloud SaaS'],
      difficulty_rating: 4,
      avg_process_days: 14,
      avg_rounds: 4,
      ctc_min: 18,
      ctc_max: 32,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 2,
      status: 'published',
      seo_title: 'Zscaler Interview Questions & Vault | TieEdu',
      seo_description: 'Round-by-round interview intelligence, HR Qs, Technical DSA bank, and Zero Trust system design guides for Zscaler.',
      trust_stats: {
        rating: 0,
        rating_count: 0,
        weekly_unlocks: 0,
        verified_by_role: null,
        last_report_at: null,
        accuracy_rate: 0
      },
      rounds_pipeline: [
        { step_number: 1, title: 'Round 1: Online Assessment', subtitle: '90 Mins • 2 DSA + 10 MCQs', round_type: 'OA', difficulty: 'medium', module_count: 3 },
        { step_number: 2, title: 'Round 2: Technical R1', subtitle: 'Core OS, Networks & Kernel', round_type: 'Technical', difficulty: 'hard', module_count: 4 },
        { step_number: 3, title: 'Round 3: System Design R2', subtitle: 'Zero Trust Proxy & Rate Limiter', round_type: 'SystemDesign', difficulty: 'hard', module_count: 2 },
        { step_number: 4, title: 'Round 4: HR & Behavioral', subtitle: 'STAR Model & Cultural Fit', round_type: 'HR', difficulty: 'easy', module_count: 2 }
      ],
      modules: [
        {
          id: 'mod-1-1',
          company_id: 'comp-1',
          module_type: 'preparation_guide',
          round_type: 'OA',
          title: 'Zscaler Recruitment Overview & Preparation Strategy',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-1-1-1',
              module_id: 'mod-1-1',
              question_text: 'What is Zscaler hiring pattern & round breakdown?',
              is_free_preview: true,
              difficulty: 'easy',
              role_tag: 'SDE-1 Security',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 8,
              upvotes_count: 45,
              blocks: [
                {
                  id: 'b-1-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Zscaler Hiring Process\nZscaler recruits for Security Software Engineer, Cloud Network Engineer, and Frontend/Backend SDE roles. Process takes ~14 days.\n\n- **Stage 1:** Online Assessment (2 DSA Questions - 90 mins)\n- **Stage 2:** Technical Round 1 (Core OS, Computer Networks, Linux Kernel)\n- **Stage 3:** Technical Round 2 (System Design & Distributed Systems)\n- **Stage 4:** HR & Culture Fit Round`
                  }
                },
                {
                  id: 'b-1-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart LR\n  A[Online Assessment] --> B[Technical Round 1: OS & Networking]\n  B --> C[Technical Round 2: System Design]\n  C --> D[HR & Culture Fit]`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-1-2',
          company_id: 'comp-1',
          module_type: 'technical_question',
          title: 'Technical Round 1: Core Networking & Operating Systems',
          sort_order: 2,
          is_premium: true,
          items: [
            {
              id: 'item-1-2-1',
              module_id: 'mod-1-2',
              question_text: 'How does Zscaler Zero Trust Exchange differ from traditional VPN architecture?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'SDE-1 Security',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 14,
              upvotes_count: 89,
              blocks: [
                {
                  id: 'b-1-2-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Core Concept Breakdown\nTraditional VPNs grant network-level access. **Zscaler Zero Trust Exchange (ZTE)** reverses this model completely by enforcing identity-based proxy connections outbound to ZEN nodes.`
                  }
                },
                {
                  id: 'b-1-2-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart TD\n  Client[User Laptop] -->|TLS Proxy| ZEN[Zscaler Enforcement Node]\n  ZEN -->|Policy Validation| ZPA[App Connector]\n  ZPA -->|TLS Tunnel| App[Internal App]`
                  }
                }
              ]
            },
            {
              id: 'item-1-2-2',
              module_id: 'mod-1-2',
              question_text: 'Implement a Thread-Safe LRU Cache in C++ / Java with O(1) ops',
              is_free_preview: false,
              difficulty: 'hard',
              role_tag: 'Systems Engineer',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 6,
              upvotes_count: 34,
              blocks: [
                {
                  id: 'b-1-2-3',
                  block_type: 'code',
                  block_order: 1,
                  payload: {
                    language: 'cpp',
                    code: `class ThreadSafeLRUCache {\n    int capacity;\n    std::mutex mtx;\n    std::list<pair<int, int>> items;\n    unordered_map<int, decltype(items.begin())> cache;\npublic:\n    ThreadSafeLRUCache(int cap) : capacity(cap) {}\n    int get(int key) {\n        std::lock_guard<std::mutex> lock(mtx);\n        auto it = cache.find(key);\n        if (it == cache.end()) return -1;\n        items.splice(items.begin(), items, it->second);\n        return it->second->second;\n    }\n};`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-1-3',
          company_id: 'comp-1',
          module_type: 'hr_question',
          title: 'HR & Behavioral Round Questions',
          sort_order: 3,
          is_premium: false,
          items: [
            {
              id: 'item-1-3-1',
              module_id: 'mod-1-3',
              question_text: 'Why do you want to work in cloud security at Zscaler?',
              is_free_preview: true,
              difficulty: 'easy',
              role_tag: 'All Roles',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 3,
              upvotes_count: 22,
              blocks: [
                {
                  id: 'b-1-3-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Winning STAR Model Answer\n- **Situation:** Noticed traditional perimeters fail with remote work during internship.\n- **Task:** Wanted to specialize in cloud-native inline zero trust proxies.\n- **Action:** Studied Zscaler ZEN architecture, proxy forwarding, and TLS inspection at scale.\n- **Result:** Ready to solve zero-trust scale challenges directly at Zscaler.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-2',
      slug: 'palo-alto-networks',
      name: 'Palo Alto Networks',
      logo_url: '',
      industry: 'Enterprise Security & Firewall',
      tags: ['Prisma Cloud', 'PAN-OS', 'Threat Intelligence'],
      difficulty_rating: 4,
      avg_process_days: 18,
      avg_rounds: 5,
      ctc_min: 20,
      ctc_max: 36,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 4,
      status: 'published',
      seo_title: 'Palo Alto Networks Interview Intelligence | TieEdu',
      seo_description: 'Complete Palo Alto Networks interview vault including PAN-OS architecture questions, DSA problems, and compensation insights.',
      modules: [
        {
          id: 'mod-2-1',
          company_id: 'comp-2',
          module_type: 'preparation_guide',
          title: 'Palo Alto Networks Complete Preparation Guide',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-2-1-1',
              module_id: 'mod-2-1',
              question_text: 'How to prepare for Palo Alto Networks Technical & Systems Rounds?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'SDE-1 Security',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 12,
              upvotes_count: 55,
              blocks: [
                {
                  id: 'b-2-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Overview & Strategy\nPalo Alto Networks tests Linux Kernel Internals, Packet Inspection, socket programming, graph algorithms, and rate limiters.\nFocus areas:\n1. Socket Programming & Linux epoll\n2. Graph algorithms & Trie structures for IP matching\n3. Distributed Log Analytics system design`
                  }
                },
                {
                  id: 'b-2-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart TD\n  A[OA: 3 Graph/DP Questions] --> B[Tech 1: C++/Linux Socket Programming]\n  B --> C[Tech 2: Data Plane & Rate Limiting]\n  C --> D[System Design: Prisma Log Stream]\n  D --> E[Managerial & Behavioral]`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-2-2',
          company_id: 'comp-2',
          module_type: 'system_design',
          title: 'System Design: Distributed Threat Intelligence & Log Aggregator',
          sort_order: 2,
          is_premium: true,
          items: [
            {
              id: 'item-2-2-1',
              module_id: 'mod-2-2',
              question_text: 'Design a Real-Time Threat Intelligence Feed Collector handling 500,000 logs/sec',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'Backend / Systems SDE',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 9,
              upvotes_count: 76,
              blocks: [
                {
                  id: 'b-2-2-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### System Architecture Breakdown\n1. **Ingestion Layer:** Kafka cluster partitioned by IP Subnet Hash.\n2. **Processing Layer:** Flink streaming pipeline performing CIDR subnet lookup using compressed Trie.\n3. **Storage Layer:** ClickHouse for real-time analytics + S3 cold storage.`
                  }
                },
                {
                  id: 'b-2-2-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart LR\n  Firewall[PAN-OS Firewall] -->|Syslog| Ingest[Kafka Ingest Cluster]\n  Ingest --> Flink[Apache Flink Analytics]\n  Flink --> Trie[Prefix Trie IP Lookup]\n  Flink --> DB[(ClickHouse Analytics)]`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-3',
      slug: 'razorpay',
      name: 'Razorpay',
      logo_url: '',
      industry: 'Fintech & Payment Gateway',
      tags: ['Payment Infrastructure', 'Microservices', 'Distributed Systems'],
      difficulty_rating: 4,
      avg_process_days: 12,
      avg_rounds: 4,
      ctc_min: 16,
      ctc_max: 28,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'Razorpay Interview Vault & System Design | TieEdu',
      seo_description: 'Razorpay hiring process questions, idempotent payment system design, and SDE interview breakdowns.',
      modules: [
        {
          id: 'mod-3-1',
          company_id: 'comp-3',
          module_type: 'preparation_guide',
          title: 'Razorpay Hiring Guide & Machine Coding Blueprint',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-3-1-1',
              module_id: 'mod-3-1',
              question_text: 'What to expect in Razorpay Machine Coding Round?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'SDE-1 / SDE-2',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 18,
              upvotes_count: 112,
              blocks: [
                {
                  id: 'b-3-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Razorpay Machine Coding Guidelines\nYou will be asked to code a clean, working object-oriented application in 90 minutes (e.g. Splitwise, Rate Limiter, Payment Gateway Router).\n- Code must run with unit tests.\n- Use OOP design patterns (Strategy, Factory, Singleton).\n- Handle edge cases and concurrency.`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-3-2',
          company_id: 'comp-3',
          module_type: 'system_design',
          title: 'System Design: Idempotent Payment Settlement Gateway',
          sort_order: 2,
          is_premium: true,
          items: [
            {
              id: 'item-3-2-1',
              module_id: 'mod-3-2',
              question_text: 'Design an Idempotent Payment Webhook Processing Handler',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'Backend SDE-2',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 15,
              upvotes_count: 98,
              blocks: [
                {
                  id: 'b-3-2-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: "### Idempotency Key Pattern\nTo prevent double debits during network retries:\n- Client sends unique Idempotency-Key header.\n- Redis stores key with atomic SETNX lock.\n- If key exists, return cached response directly."
                  }
                },
                {
                  id: 'b-3-2-2',
                  block_type: 'code',
                  block_order: 2,
                  payload: {
                    language: 'typescript',
                    code: `async function processPayment(req, res) {\n  const idempotencyKey = req.headers['idempotency-key'];\n  const isNew = await redis.set(idempotencyKey, 'LOCKED', 'NX', 'EX', 60);\n  if (!isNew) {\n    const existingResult = await redis.get(\`result:\${idempotencyKey}\`);\n    return res.status(200).json(JSON.parse(existingResult));\n  }\n  // Perform actual charge...\n  const result = await bankApi.charge(req.body);\n  await redis.set(\`result:\${idempotencyKey}\`, JSON.stringify(result));\n  res.json(result);\n}`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-4',
      slug: 'tcs',
      name: 'TCS (Tata Consultancy Services)',
      logo_url: '',
      industry: 'IT Services & Consulting',
      tags: ['TCS NQT', 'Digital', 'Prime', 'Ninja'],
      difficulty_rating: 2,
      avg_process_days: 10,
      avg_rounds: 3,
      ctc_min: 3.36,
      ctc_max: 9.0,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'TCS NQT & Digital Interview Preparation Guide 2026 | TieEdu',
      seo_description: 'Crack TCS NQT Ninja, Digital & Prime cadres with repeated coding questions, aptitude patterns, and HR questions.',
      modules: [
        {
          id: 'mod-4-1',
          company_id: 'comp-4',
          module_type: 'preparation_guide',
          title: 'TCS NQT Test Pattern & Cadre Selection',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-4-1-1',
              module_id: 'mod-4-1',
              question_text: 'What is the difference between TCS Ninja, Digital, and Prime cadres?',
              is_free_preview: true,
              difficulty: 'easy',
              role_tag: 'Freshers 2025/2026',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 42,
              upvotes_count: 210,
              blocks: [
                {
                  id: 'b-4-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### TCS Cadres Breakdown\n- **Ninja Cadre:** 3.36 - 3.6 LPA (Foundation NQT cleared)\n- **Digital Cadre:** 7.0 - 7.5 LPA (Advanced NQT cleared)\n- **Prime Cadre:** 9.0 - 11.5 LPA (Top percentile in Advanced Coding + AI/ML Qs)`
                  }
                },
                {
                  id: 'b-4-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart TD\n  NQT[TCS NQT Test] -->|Foundation Score| Ninja[Ninja Offer: 3.6 LPA]\n  NQT -->|Advanced Coding Score| Digital[Digital Offer: 7.0 LPA]\n  NQT -->|Top 1% Score| Prime[Prime Offer: 9.0 LPA]`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-4-2',
          company_id: 'comp-4',
          module_type: 'dsa_question',
          title: 'TCS Digital/Prime Advanced Coding Questions',
          sort_order: 2,
          is_premium: false,
          items: [
            {
              id: 'item-4-2-1',
              module_id: 'mod-4-2',
              question_text: 'Find the Minimum Number of Swaps required to Sort an Array',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'Digital / Prime',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 19,
              upvotes_count: 88,
              blocks: [
                {
                  id: 'b-4-2-1',
                  block_type: 'code',
                  block_order: 1,
                  payload: {
                    language: 'java',
                    code: `import java.util.*;\npublic class MinSwaps {\n    public static int minSwaps(int[] arr) {\n        int n = arr.length;\n        ArrayList<Pair<Integer, Integer>> list = new ArrayList<>();\n        for (int i = 0; i < n; i++) list.add(new Pair<>(arr[i], i));\n        list.sort(Comparator.comparingInt(a -> a.getKey()));\n        boolean[] vis = new boolean[n];\n        int ans = 0;\n        for (int i = 0; i < n; i++) {\n            if (vis[i] || list.get(i).getValue() == i) continue;\n            int cycle_size = 0, j = i;\n            while (!vis[j]) {\n                vis[j] = true;\n                j = list.get(j).getValue();\n                cycle_size++;\n            }\n            if (cycle_size > 0) ans += (cycle_size - 1);\n        }\n        return ans;\n    }\n}`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-5',
      slug: 'infosys',
      name: 'Infosys',
      logo_url: '',
      industry: 'IT Services & Consulting',
      tags: ['InfyTQ', 'HackWithInfy', 'SP / DSE'],
      difficulty_rating: 3,
      avg_process_days: 12,
      avg_rounds: 3,
      ctc_min: 3.6,
      ctc_max: 9.5,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 2,
      status: 'published',
      seo_title: 'Infosys HackWithInfy & Specialist Programmer Guide | TieEdu',
      seo_description: 'Infosys SP (Specialist Programmer - 9.5 LPA) and DSE (Digital Specialist Engineer - 6.2 LPA) interview vaults.',
      modules: [
        {
          id: 'mod-5-1',
          company_id: 'comp-5',
          module_type: 'preparation_guide',
          title: 'Infosys HackWithInfy & SP Role Roadmap',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-5-1-1',
              module_id: 'mod-5-1',
              question_text: 'How to crack Infosys Specialist Programmer (9.5 LPA) round?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'Specialist Programmer',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 24,
              upvotes_count: 140,
              blocks: [
                {
                  id: 'b-5-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Specialist Programmer (SP) Prep Strategy\n1. Master Dynamic Programming (Knapsack, LCS, Matrix Chain Multiplication).\n2. Graph algorithms: Dijkstra, Disjoint Set Union (DSU).\n3. Expect 3 questions in 3 hours during HackWithInfy Round 2.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-6',
      slug: 'google',
      name: 'Google',
      logo_url: '',
      industry: 'Big Tech & Cloud',
      tags: ['FAANG', 'Google L3', 'Google L4', 'System Design'],
      difficulty_rating: 5,
      avg_process_days: 35,
      avg_rounds: 6,
      ctc_min: 32,
      ctc_max: 65,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'Google SDE L3/L4 Interview Questions & Vault | TieEdu',
      seo_description: 'Google coding rounds, Googliness & Leadership scenarios, and Large Scale Distributed System Design diagrams.',
      modules: [
        {
          id: 'mod-6-1',
          company_id: 'comp-6',
          module_type: 'preparation_guide',
          title: 'Google Hiring Process & Round Breakdown (L3/L4)',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-6-1-1',
              module_id: 'mod-6-1',
              question_text: 'What is Google 6-round hiring flow and HC (Hiring Committee) evaluation?',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'Software Engineer L3/L4',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 38,
              upvotes_count: 340,
              blocks: [
                {
                  id: 'b-6-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Google Recruitment Flow\n- **Phone Screen (45 mins):** 1 LeetCode Hard DSA problem.\n- **Onsite Round 1 & 2:** Algorithms & Data Structures (Graphs, DP, Trees).\n- **Onsite Round 3:** System Design & Scalability (L4+) or Advanced DSA (L3).\n- **Googliness & Leadership:** Behavioral scenarios evaluated against 4 Google core principles.`
                  }
                },
                {
                  id: 'b-6-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart LR\n  A[Phone Screen] --> B[Onsite 1: Algorithms]\n  B --> C[Onsite 2: Algorithms]\n  C --> D[Onsite 3: System Design]\n  D --> E[Googliness & Leadership]\n  E --> F[Hiring Committee HC Approval]`
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-6-2',
          company_id: 'comp-6',
          module_type: 'dsa_question',
          title: 'Google Recent DSA Problem Bank',
          sort_order: 2,
          is_premium: true,
          items: [
            {
              id: 'item-6-2-1',
              module_id: 'mod-6-2',
              question_text: 'Design a Distributed Rate Limiter for Google Search API (Sliding Window Log)',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'SDE L4',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 22,
              upvotes_count: 185,
              blocks: [
                {
                  id: 'b-6-2-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Sliding Window Log Algorithm\nStore timestamps in Redis Sorted Set (\`ZADD\`). Remove elements older than \`current_time - window_size\` (\`ZREMRANGEBYSCORE\`).`
                  }
                },
                {
                  id: 'b-6-2-2',
                  block_type: 'code',
                  block_order: 2,
                  payload: {
                    language: 'python',
                    code: "import time, redis\nr = redis.Redis()\ndef is_allowed(user_id, limit=100, window=60):\n    now = time.time()\n    key = f'rate:{user_id}'\n    pipe = r.pipeline()\n    pipe.zremrangebyscore(key, 0, now - window)\n    pipe.zcard(key)\n    pipe.zadd(key, {now: now})\n    pipe.expire(key, window)\n    res = pipe.execute()\n    return res[1] < limit"
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mod-6-3',
          company_id: 'comp-6',
          module_type: 'hr_question',
          title: 'Googliness & Leadership Round Scenarios',
          sort_order: 3,
          is_premium: false,
          items: [
            {
              id: 'item-6-3-1',
              module_id: 'mod-6-3',
              question_text: 'Tell me about a time you pushed back against a senior colleague product decision.',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'All Google Candidates',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 14,
              upvotes_count: 95,
              blocks: [
                {
                  id: 'b-6-3-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Googliness Evaluation Rubric\nGoogle looks for **intellectual humility, psychological safety, and data-driven debate**.\n- Framework: State disagreement respectfully, present data/benchmarks, test hypothesis with A/B experiment, align on user impact.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-7',
      slug: 'microsoft',
      name: 'Microsoft',
      logo_url: '',
      industry: 'Enterprise Tech & Cloud',
      tags: ['Azure', 'SDE-1', 'SDE-2', 'AA Round'],
      difficulty_rating: 4,
      avg_process_days: 20,
      avg_rounds: 5,
      ctc_min: 24,
      ctc_max: 48,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 3,
      status: 'published',
      seo_title: 'Microsoft SDE Interview Questions & As-Appropriate Round | TieEdu',
      seo_description: 'Microsoft hiring rounds, AA (As-Appropriate) Bar Raiser interview questions, and Azure Cloud system design.',
      modules: [
        {
          id: 'mod-7-1',
          company_id: 'comp-7',
          module_type: 'preparation_guide',
          title: 'Microsoft Hiring Process & AA (As-Appropriate) Round Strategy',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-7-1-1',
              module_id: 'mod-7-1',
              question_text: 'What is Microsoft AA (As-Appropriate / Bar Raiser) Round?',
              is_free_preview: true,
              difficulty: 'hard',
              role_tag: 'SDE-1 / SDE-2',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 16,
              upvotes_count: 130,
              blocks: [
                {
                  id: 'b-7-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Understanding Microsoft AA Round\nThe AA interviewer is a Senior Partner/Principal SDE outside your prospective team who holds veto power. They assess long-term growth, culture fit, and systemic problem solving.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-8',
      slug: 'amazon',
      name: 'Amazon',
      logo_url: '',
      industry: 'E-commerce & AWS Cloud',
      tags: ['16 Leadership Principles', 'Bar Raiser', 'AWS SDE'],
      difficulty_rating: 4,
      avg_process_days: 25,
      avg_rounds: 5,
      ctc_min: 28,
      ctc_max: 52,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'Amazon 16 Leadership Principles & SDE Vault | TieEdu',
      seo_description: 'Master Amazon 16 Leadership Principles with STAR stories, Bar Raiser interview questions, and AWS system design guides.',
      modules: [
        {
          id: 'mod-8-1',
          company_id: 'comp-8',
          module_type: 'preparation_guide',
          title: 'Amazon 16 Leadership Principles Masterclass',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-8-1-1',
              module_id: 'mod-8-1',
              question_text: 'How to map STAR stories to Amazon 16 Leadership Principles (Customer Obsession, Ownership, Bias for Action)?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'AWS / Retail SDE',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 45,
              upvotes_count: 290,
              blocks: [
                {
                  id: 'b-8-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Amazon 16 Leadership Principles Framework\nEvery single technical interviewer at Amazon reserves 15-20 minutes for Leadership Principle STAR questions.\n- Top LPs tested: Customer Obsession, Ownership, Dive Deep, Bias for Action, Have Backbone; Disagree & Commit.`
                  }
                },
                {
                  id: 'b-8-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart TD\n  Situation[1. Situation: Set context & metrics]\n  Task[2. Task: Your specific responsibility]\n  Action[3. Action: Deep-dive steps you took]\n  Result[4. Result: Quantifiable business outcome]`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-9',
      slug: 'adobe',
      name: 'Adobe',
      logo_url: '',
      industry: 'Creative Cloud & Document Cloud',
      tags: ['C++', 'Graphics Engine', 'SDE-1'],
      difficulty_rating: 4,
      avg_process_days: 15,
      avg_rounds: 4,
      ctc_min: 22,
      ctc_max: 42,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 3,
      status: 'published',
      seo_title: 'Adobe Interview Questions & C++ DSA Vault | TieEdu',
      seo_description: 'Adobe Member of Technical Staff (MTS) interview questions, C++ memory optimization, and tree/graph DSA bank.',
      modules: [
        {
          id: 'mod-9-1',
          company_id: 'comp-9',
          module_type: 'preparation_guide',
          title: 'Adobe MTS-1 Preparation & Technical Focus',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-9-1-1',
              module_id: 'mod-9-1',
              question_text: 'What topics are heavily asked in Adobe MTS technical interviews?',
              is_free_preview: true,
              difficulty: 'medium',
              role_tag: 'MTS-1',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 11,
              upvotes_count: 67,
              blocks: [
                {
                  id: 'b-9-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Adobe Core Technical Focus\n- C++ Smart Pointers & Memory Management\n- Segment Trees & Quad Trees (Spatial Indexing for Graphics)\n- Multi-threaded rendering pipelines.`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'comp-10',
      slug: 'capgemini',
      name: 'Capgemini',
      logo_url: '',
      industry: 'IT Consulting & Services',
      tags: ['Exceller Program', 'Senior Analyst', 'Consulting'],
      difficulty_rating: 2,
      avg_process_days: 7,
      avg_rounds: 3,
      ctc_min: 4.2,
      ctc_max: 7.5,
      unlock_count: 0,
      accuracy_score: null,
      last_updated_days_ago: 1,
      status: 'published',
      seo_title: 'Capgemini Exceller Interview Questions & Pseudo Code Guide | TieEdu',
      seo_description: 'Crack Capgemini Exceller drive with pseudo-code MCQs, coding questions, and technical interview questions.',
      modules: [
        {
          id: 'mod-10-1',
          company_id: 'comp-10',
          module_type: 'preparation_guide',
          title: 'Capgemini Exceller Drive Pattern & Round Breakdown',
          sort_order: 1,
          is_premium: false,
          items: [
            {
              id: 'item-10-1-1',
              module_id: 'mod-10-1',
              question_text: 'What is Capgemini Exceller recruitment pattern and test syllabus?',
              is_free_preview: true,
              difficulty: 'easy',
              role_tag: 'Analyst / Senior Analyst',
              frequency_tag: 'high',
              status: 'published',
              comments_count: 29,
              upvotes_count: 175,
              blocks: [
                {
                  id: 'b-10-1-1',
                  block_type: 'markdown',
                  block_order: 1,
                  payload: {
                    text: `### Capgemini Exceller Pattern\n1. **Technical Pseudocode & MCQ (30 mins)**\n2. **English Communication Test (Interactive Speaking)**\n3. **Coding Test (2 Questions - 45 mins)**\n4. **Technical + HR Interview**`
                  }
                },
                {
                  id: 'b-10-1-2',
                  block_type: 'diagram',
                  block_order: 2,
                  payload: {
                    source: `flowchart LR\n  A[Pseudocode & MCQs] --> B[English Communication]\n  B --> C[Coding Test]\n  C --> D[Tech + HR Interview]`
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  reports: [],
  leaderboard: [],
  orders: [],
  coupons: [
    { id: 'coup-1', code: 'TIEEDU20', discount_percent: 20, discount_flat: 0, is_active: true, max_uses: 0, uses: 0, label: '20% Placement Discount' },
    { id: 'coup-2', code: 'FIRST50', discount_percent: 0, discount_flat: 50, is_active: true, max_uses: 0, uses: 0, label: 'Flat ₹50 Early Bird' }
  ],
  unlocks: [],
  users: [],
  sessions: [],
  // Hero posters are admin-authored creatives. Seeded EMPTY on purpose: the
  // landing hero falls back to the company orbit when there is nothing live, and
  // auto-seeding fake "sale" creatives would put invented offers on the homepage.
  posters: [],
  progress: {},
  interview_progress: {},
  courses: getSeedCourses(),
  // Instructors are real people, so this starts EMPTY rather than seeded. A
  // placeholder "Tarun Luthra"-style profile on a course that has never been
  // taught would be a fabricated claim about a named human being, which is worse
  // than showing no instructor block at all. Populate from the admin API once
  // there is someone real to describe.
  instructors: [],
  course_progress: {},
  xp_ledger: [],
  certificates: [],
  course_feedback: [],
  study_plan_templates: [],
  study_plan_phases: [],
  study_plan_enrollments: [],
  study_plan_progress: [],
  audit: [],
  settings: {
    platform_name: 'TieEdu',
    support_email: 'support@tieedu.in',
    demo_mode: true
  }
};

export function loadDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // If db.json exists, load it and auto-upgrade modules missing section_data
  if (fs.existsSync(DB_FILE)) {
    try {
      let raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // strip BOM
      const data = JSON.parse(raw);
      let upgraded = false;
      if (!Array.isArray(data.orders)) { data.orders = []; upgraded = true; }
      if (!Array.isArray(data.unlocks)) { data.unlocks = []; upgraded = true; }
      if (!Array.isArray(data.users)) { data.users = []; upgraded = true; }
      if (!Array.isArray(data.sessions)) { data.sessions = []; upgraded = true; }
      if (!data.progress) { data.progress = {}; upgraded = true; }
      if (!data.interview_progress) { data.interview_progress = {}; upgraded = true; }
      if (!data.audit) { data.audit = []; upgraded = true; }
      if (!Array.isArray(data.courses)) { data.courses = []; upgraded = true; }
      if (!data.course_progress) { data.course_progress = {}; upgraded = true; }
      if (!Array.isArray(data.xp_ledger)) { data.xp_ledger = []; upgraded = true; }
      if (!Array.isArray(data.certificates)) { data.certificates = []; upgraded = true; }
      // Certificates predate per-record key ids. Backfilled to '' rather than
      // the active key: guessing would attribute an old signature to a key that
      // may never have signed it. An empty id just means "check every trusted
      // key", which is the honest reading of a record that does not say.
      if (Array.isArray(data.certificates) && data.certificates.some((c: any) => c && typeof c.signing_key_id !== 'string')) {
        for (const c of data.certificates as any[]) {
          if (c && typeof c.signing_key_id !== 'string') c.signing_key_id = '';
        }
        upgraded = true;
      }
      if (!Array.isArray(data.course_feedback)) { data.course_feedback = []; upgraded = true; }
      if (!Array.isArray(data.study_plan_templates)) { data.study_plan_templates = []; upgraded = true; }
      if (!Array.isArray(data.study_plan_phases)) { data.study_plan_phases = []; upgraded = true; }
      if (!Array.isArray(data.study_plan_enrollments)) { data.study_plan_enrollments = []; upgraded = true; }
      if (!Array.isArray(data.study_plan_progress)) { data.study_plan_progress = []; upgraded = true; }
      if (!Array.isArray(data.posters)) { data.posters = []; upgraded = true; }
      // Starter roadmap, installed once. The seeded_at stamp is what keeps this
      // from resurrecting a template an admin deliberately deleted: without it,
      // an emptied collection would be re-seeded on every restart, exactly the
      // bug the courses/coupons fallbacks above are documented to avoid.
      if (!data.study_plan_seeded_at && (!data.study_plan_templates || data.study_plan_templates.length === 0)) {
        const seed = seedStudyPlanTemplates();
        data.study_plan_templates = seed.templates;
        data.study_plan_phases = seed.phases;
        data.study_plan_seeded_at = new Date().toISOString();
        upgraded = true;
      }
      if (!data.settings) { data.settings = initialDbData.settings; upgraded = true; }
      if (!Array.isArray(data.coupons) || data.coupons.length === 0) {
        data.coupons = initialDbData.coupons;
        upgraded = true;
      }
      // The bundled courses are the launch catalogue for an install that
      // predates the course engine. Without this, loadDb() would happily return
      // an empty course list forever: initialDbData is only consulted when
      // db.json does not exist yet, and every existing install has one.
      //
      // Merge by slug rather than replacing the whole list. The old code only
      // installed the catalogue when `courses` was empty, so a store created
      // before a course existed (for example the C course) never received it.
      // Matching on slug — not id — also means a course seeded under an older
      // id is recognised, and an admin's edits to a seeded course are preserved:
      // this only ever ADDS a missing slug, it never overwrites existing rows.
      const seededCourseSlugs = new Set<string>(
        (Array.isArray(data.courses) ? data.courses : [])
          .map((c: any) => (c && typeof c.slug === 'string' ? c.slug : null))
          .filter((s: string | null): s is string => !!s)
      );
      for (const seedCourse of initialDbData.courses) {
        if (!seedCourse || typeof seedCourse.slug !== 'string') continue;
        if (seededCourseSlugs.has(seedCourse.slug)) continue;
        data.courses.push(seedCourse);
        seededCourseSlugs.add(seedCourse.slug);
        upgraded = true;
      }
      // NOTE: modules are deliberately NOT auto-filled with placeholder section_data.
      // A module with no admin-authored section_data stays empty and the reader
      // renders an honest "content not published yet" state. Generating generic
      // DBMS/OS/HR filler here made invented questions look like verified company
      // intelligence. Admin must write it — see PUT /api/admin/modules/:id/section.
      // XP ledger migration. Students who earned XP before the ledger existed
      // have a balance in users[].xp with no ledger rows behind it. Left alone,
      // the first new award would recompute their total from the ledger alone
      // and silently delete their history. Record it once as an opening balance
      // so the ledger is a faithful superset of the old counter.
      //
      // Only the portion the ledger does NOT already explain is recorded. Without
      // that subtraction this migration reads its own output: every award ends
      // with syncUserXp writing the ledger total into users[].xp, so on the very
      // next load the freshly-awarded XP looks like unexplained pre-ledger history
      // and a duplicate opening balance is minted - silently doubling a user's
      // first award of the session.
      const openingBalances: any[] = [];
      for (const u of data.users || []) {
        const legacyXp = Math.max(0, Number(u.xp) || 0);
        if (legacyXp <= 0) continue;
        const key = `legacy-opening-balance:${u.id}`;
        const alreadyMigrated = (data.xp_ledger || []).some((e: any) => e && e.key === key);
        if (alreadyMigrated) continue;
        const ledgerXp = (data.xp_ledger || [])
          .filter((e: any) => e && e.user_id === u.id)
          .reduce((s: number, e: any) => s + (Number(e.xp) || 0), 0);
        const unexplained = legacyXp - ledgerXp;
        if (unexplained <= 0) continue;
        openingBalances.push({
          id: `xp_legacy_${u.id}`,
          user_id: u.id,
          course_id: null,
          lesson_id: null,
          key,
          reason: 'legacy_opening_balance',
          xp: unexplained,
          created_at: new Date().toISOString(),
          note: `Opening balance migrated from the pre-ledger XP counter (${unexplained} XP not explained by existing ledger rows).`,
        });
      }
      if (openingBalances.length > 0) {
        data.xp_ledger = [...(data.xp_ledger || []), ...openingBalances];
        upgraded = true;
      }
      if (upgraded) {
        saveDb(data);
      }
      return data;
    } catch {
      // Fall through to rewrite
    }
  }
  writeFileAtomic(DB_FILE, JSON.stringify(initialDbData, null, 2));
  return initialDbData;
}

/**
 * Windows filesystems fail a write for reasons that have nothing to do with the
 * request: an antivirus scanner or indexer holding the file open surfaces as
 * EBUSY, EPERM, EACCES or a bare UNKNOWN. Writing straight onto db.json made
 * every one of those a 500 to the client, which looked like an application bug
 * but was really a transient lock.
 *
 * Writing to a sibling temp file and renaming it over the target fixes both
 * problems at once: the rename is atomic on the same volume, so an interrupted
 * write can never leave a half-written db.json behind, and a transient lock is
 * retried instead of thrown at the caller.
 */
const TRANSIENT_WRITE_ERRORS = new Set(['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN']);

function writeFileAtomic(file: string, contents: string, attempts = 5): void {
  // Same directory on purpose: a rename across volumes is not atomic.
  const tmp = `${file}.${process.pid}.tmp`;
  let lastErr: any;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      fs.writeFileSync(tmp, contents, 'utf-8');
      fs.renameSync(tmp, file);
      return;
    } catch (err: any) {
      lastErr = err;
      if (!TRANSIENT_WRITE_ERRORS.has(err?.code)) break;
      try {
        fs.unlinkSync(tmp);
      } catch {
        // best effort
      }
      // Synchronous backoff — saveDb is called from request handlers and has to
      // stay synchronous. Atomics.wait is the only clean way to sleep here.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25 * (attempt + 1));
    }
  }
  try {
    fs.unlinkSync(tmp);
  } catch {
    // best effort
  }
  throw lastErr;
}

export function saveDb(data: any) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileAtomic(DB_FILE, JSON.stringify(data, null, 2));
  // Async waterfall to the CockroachDB replica (if enabled). Never blocks the sync API.
  if (mirrorHook) {
    try {
      const r = mirrorHook(data);
      if (r && typeof (r as any).catch === 'function') (r as any).catch(() => {});
    } catch {
      // mirror must never break the file commit
    }
  }
}

let mirrorHook: ((data: any) => void | Promise<void>) | null = null;

/** server.ts wires the storage facade here once at boot. */
export function setMirrorHook(fn: ((data: any) => void | Promise<void>) | null) {
  mirrorHook = fn;
}

// Cautious write: refuses to destroy the store on obviously-broken payloads.
export function safeSaveDb(data: any) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.companies)) {
    throw new Error('Refusing to write a corrupt database state');
  }
  saveDb(data);
}

