// ============================================================================
// SKILL TEST TYPES
// Kept separate from db.ts because db.ts already owns a `Certificate` interface
// for course certificates (Ed25519-signed). The skill-test types below are a
// parallel namespace and must never be confused with the course cert records.
// ============================================================================

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category:
    | 'Programming'
    | 'Core CS'
    | 'Web Development'
    | 'DevOps & Cloud'
    | 'Databases'
    | 'Others'
    | 'Data Science & AI'
    | 'Cloud & DevOps'
    | 'Mobile & Game Dev'
    | 'Design & Creative'
    | 'Career & Aptitude'
    | 'Business & Marketing';
  description: string;
  shortDescription: string;
  icon?: string;
  thumbnail?: string;
  status: 'active' | 'inactive' | 'coming_soon';
  isPopular: boolean;
  certificateAvailable: boolean;
  displayOrder: number;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  totalQuestions: number;
  avgCompletionTime: number;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  skillId: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  skillId: string;
  topicId: string;
  subtopic?: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'output_prediction' | 'debugging_mcq' | 'scenario_based' | 'match_following' | 'ordering' | 'image_diagram' | 'assertion_reason';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  question: string;
  questionHtml?: string;
  imageUrl?: string;
  imageAlt?: string;
  options?: QuestionOption[];
  matchPairs?: MatchPair[];
  orderItems?: string[];
  correctOrder?: number[];
  assertion?: string;
  reason?: string;
  assertionReasonAnswer?: 'a' | 'b' | 'c' | 'd';
  correctAnswer?: unknown;
  explanation: string;
  explanationHtml?: string;
  tags: string[];
  status: 'draft' | 'review' | 'approved' | 'retired';
  version: number;
  reviewedBy?: string;
  reviewedAt?: string;
  retiredAt?: string;
  retiredReason?: string;
  usageCount: number;
  correctCount: number;
  difficultyScore: number;
  created_at: string;
  updated_at: string;
}

export interface TopicBlueprintItem {
  topicId: string;
  questionCount: number;
}

export interface DifficultyBlueprint {
  beginner: number;
  intermediate: number;
  advanced: number;
  expert: number;
}

export interface CertificateThresholds {
  pass: number;
  proficient: number;
  advanced: number;
  expert: number;
}

export interface Assessment {
  id: string;
  skillId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  topicBlueprint: TopicBlueprintItem[];
  difficultyBlueprint: DifficultyBlueprint;
  certificateThresholds: CertificateThresholds;
  isActive: boolean;
  isDefault: boolean;
  allowRetake: boolean;
  maxRetakes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showExplanationAfterSubmit: boolean;
  requireFullScreen: boolean;
  tabSwitchLimit: number;
  instructions: string[];
  created_at: string;
  updated_at: string;
}

export interface AttemptAnswer {
  questionId: string;
  selectedOptions?: string[];
  selectedAnswer?: unknown;
  matchAnswers?: MatchPair[];
  orderAnswers?: number[];
  assertionReasonSelected?: string;
  isCorrect: boolean;
  timeSpentSec: number;
  markedForReview: boolean;
}

export interface TopicPerformance {
  topicId: string;
  topicName: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface DifficultyPerfItem {
  correct: number;
  total: number;
  percentage: number;
}

export interface DifficultyPerformance {
  beginner: DifficultyPerfItem;
  intermediate: DifficultyPerfItem;
  advanced: DifficultyPerfItem;
  expert: DifficultyPerfItem;
}

export interface Attempt {
  id: string;
  userId: string;
  assessmentId: string;
  skillId: string;
  questionOrder: string[];
  answers: AttemptAnswer[];
  status: 'in_progress' | 'submitted' | 'timed_out' | 'aborted';
  startedAt: string;
  submittedAt?: string;
  timeLimitMinutes: number;
  timeRemainingSec?: number;
  totalTimeSpentSec: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
  markedReviewCount: number;
  score: number;
  percentage: number;
  passFail: 'pass' | 'fail';
  skillLevel: 'beginner' | 'developing' | 'intermediate' | 'advanced' | 'expert';
  topicPerformance: TopicPerformance[];
  difficultyPerformance: DifficultyPerformance;
  isEligibleForCertificate: boolean;
  certificateId?: string;
  tabSwitchCount: number;
  fullScreenExited: boolean;
  ipAddress?: string;
  userAgent?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Skill-test certificate. Distinct from db.ts `Certificate` (course cert).
 * Stored in `skillCertificates[]` — never mixed with course certificates.
 */
export interface SkillCertificate {
  id: string;
  userId: string;
  attemptId: string;
  assessmentId: string;
  skillId: string;
  certificateId: string;
  certificateNumber: number;
  studentName: string;
  studentEmail?: string;
  skillName: string;
  skillSlug: string;
  score: number;
  level: 'pass' | 'proficient' | 'advanced' | 'expert';
  skillLevelText: string;
  issueDate: string;
  expiryDate?: string;
  status: 'valid' | 'revoked';
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
  qrCodeUrl?: string;
  pdfUrl?: string;
  certificateImageUrl?: string;
  verificationUrl?: string;
  templateVersion: string;
  issuedFrom: string;
  created_at: string;
  updated_at: string;
}

export interface WeakTopic {
  topicId: string;
  topicName: string;
  percentage: number;
  priority: 'high' | 'medium' | 'low';
}

export interface RecommendedCourse {
  courseId?: string;
  courseTitle?: string;
  courseSlug?: string;
  reason: string;
  matchScore: number;
}

export interface Recommendation {
  id: string;
  userId: string;
  attemptId: string;
  skillId: string;
  weakTopics: WeakTopic[];
  recommendedCourses: RecommendedCourse[];
  aiSummary?: string;
  nextSteps: string[];
  isViewed: boolean;
  created_at: string;
  updated_at: string;
}
