import { API_BASE_URL, apiFetch } from './api';

// ============================================================================
// SKILL TEST API CLIENT
// Types mirror backend/src/data/skillTestTypes.ts (server is the source of truth).
// ============================================================================

export interface SkillTestSkill {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  shortDescription: string;
  icon?: string;
  status: 'active' | 'inactive' | 'coming_soon';
  isPopular: boolean;
  certificateAvailable: boolean;
  displayOrder: number;
  tags: string[];
  totalQuestions: number;
  avgCompletionTime: number;
}

export interface SkillTestTopic {
  id: string;
  skillId: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

export interface SkillTestAssessment {
  id: string;
  skillId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  topicBlueprint: { topicId: string; questionCount: number }[];
  difficultyBlueprint: { beginner: number; intermediate: number; advanced: number; expert: number };
  certificateThresholds: { pass: number; proficient: number; advanced: number; expert: number };
  isActive: boolean;
  isDefault: boolean;
  allowRetake: boolean;
  maxRetakes: number;
  instructions: string[];
}

export interface SafeQuestionOption {
  index: number;
  text: string;
}

export interface SafeQuestion {
  id: string;
  type: string;
  question: string;
  questionHtml?: string;
  imageUrl?: string;
  options: SafeQuestionOption[];
  topicId: string;
  difficulty: string;
}

export interface SafeAnswer {
  questionId: string;
  selectedOptions: string[];
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

export interface SkillTestAttempt {
  id: string;
  assessmentId: string;
  skillId: string;
  status: 'in_progress' | 'submitted' | 'timed_out' | 'aborted';
  startedAt: string;
  timeLimitMinutes: number;
  timeRemainingSec?: number;
  totalQuestions: number;
  questions: SafeQuestion[];
  answers: SafeAnswer[];
  score?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  unanswered?: number;
  passFail?: 'pass' | 'fail';
  skillLevel?: string;
  topicPerformance?: TopicPerformance[];
  difficultyPerformance?: Record<string, DifficultyPerfItem>;
  isEligibleForCertificate?: boolean;
  certificateId?: string;
  submittedAt?: string;
}

export interface SkillTestCertificate {
  id: string;
  certificateId: string;
  userId: string;
  attemptId: string;
  skillId: string;
  studentName: string;
  skillName: string;
  skillSlug: string;
  score: number;
  level: string;
  skillLevelText: string;
  issueDate: string;
  status: 'valid' | 'revoked';
  verificationUrl?: string;
}

export interface SkillTestRecommendation {
  id: string;
  weakTopics: { topicId: string; topicName: string; percentage: number; priority: string }[];
  recommendedCourses: { courseTitle?: string; reason: string; matchScore: number }[];
  nextSteps: string[];
}

const base = `${API_BASE_URL}/skill-test`;

const json = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  return res.json();
};

// ─── Public ────────────────────────────────────────────────────────────────

export const fetchSkillsApi = async (): Promise<SkillTestSkill[]> =>
  json(await fetch(`${base}/skills`));

export const fetchSkillDetailApi = async (slug: string): Promise<{
  skill: SkillTestSkill;
  topics: SkillTestTopic[];
  assessment: SkillTestAssessment | null;
}> => json(await fetch(`${base}/skills/${encodeURIComponent(slug)}`));

export const verifyCertificateApi = async (certificateId: string) =>
  json<any>(await fetch(`${base}/certificates/${encodeURIComponent(certificateId)}/verify`));

// ─── Authenticated (goes through apiFetch for 401-refresh) ─────────────────

export const startAssessmentApi = async (slug: string): Promise<{ attempt: SkillTestAttempt }> =>
  json(await apiFetch(`${base}/assessments/${encodeURIComponent(slug)}/start`, { method: 'POST' }));

export const getAttemptApi = async (attemptId: string): Promise<{ attempt: SkillTestAttempt }> =>
  json(await apiFetch(`${base}/attempts/${encodeURIComponent(attemptId)}`));

export const saveAttemptApi = async (
  attemptId: string,
  payload: { answers: SafeAnswer[]; timeRemainingSec?: number }
): Promise<{ ok: boolean }> =>
  json(await apiFetch(`${base}/attempts/${encodeURIComponent(attemptId)}/save`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }));

export const submitAttemptApi = async (
  attemptId: string,
  payload: { answers: SafeAnswer[]; timeRemainingSec?: number }
): Promise<{ attempt: SkillTestAttempt; certificate: SkillTestCertificate | null; recommendation: SkillTestRecommendation | null }> =>
  json(await apiFetch(`${base}/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }));

export const getResultApi = async (attemptId: string): Promise<{
  attempt: SkillTestAttempt;
  certificate: SkillTestCertificate | null;
  recommendation: SkillTestRecommendation | null;
}> => json(await apiFetch(`${base}/attempts/${encodeURIComponent(attemptId)}/result`));

export const fetchMyAttemptsApi = async (): Promise<SkillTestAttempt[]> =>
  json(await apiFetch(`${base}/my-attempts`));

export const fetchMyCertificatesApi = async (): Promise<SkillTestCertificate[]> =>
  json(await apiFetch(`${base}/certificates/my`));

export const fetchPassportApi = async (): Promise<any> =>
  json(await apiFetch(`${base}/passport`));

// ============================================================================
// ADMIN — same router, requireAdmin middleware (403 for non-admins).
// ============================================================================

const adminBase = `${API_BASE_URL}/admin/skill-test`;

export interface AdminQuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface AdminQuestion {
  id: string;
  skillId: string;
  topicId: string;
  subtopic?: string;
  type: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  question: string;
  questionHtml?: string;
  imageUrl?: string;
  imageAlt?: string;
  options: AdminQuestionOption[];
  explanation: string;
  explanationHtml?: string;
  tags: string[];
  status: 'draft' | 'review' | 'approved' | 'retired';
  version: number;
  reviewedBy?: string;
  reviewedAt?: string;
  usageCount: number;
  correctCount: number;
  created_at: string;
  updated_at: string;
}

export interface AdminQuestionPage {
  items: AdminQuestion[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminSkillAnalytics {
  totalAttempts: number;
  completedAttempts: number;
  inProgress: number;
  avgScore: number;
  passRate: number;
  certificatesIssued: number;
  certificatesValid: number;
  certificatesRevoked: number;
  totalSkills: number;
  totalQuestions: number;
  approvedQuestions: number;
  skillAttempts: Record<string, number>;
}

const adminJson = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const res = await apiFetch(`${adminBase}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
};

// Skills
export const adminFetchSkillsApi = (): Promise<SkillTestSkill[]> => adminJson('/skills');
export const adminCreateSkillApi = (data: Partial<SkillTestSkill> & { name: string; slug: string; category: string }) =>
  adminJson<SkillTestSkill>('/skills', { method: 'POST', body: JSON.stringify(data) });
export const adminUpdateSkillApi = (id: string, data: Partial<SkillTestSkill>) =>
  adminJson<SkillTestSkill>(`/skills/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
export const adminDeleteSkillApi = (id: string) =>
  adminJson<{ ok: boolean }>(`/skills/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Topics
export const adminFetchTopicsApi = (skillId?: string): Promise<SkillTestTopic[]> =>
  adminJson(`/topics${skillId ? `?skillId=${encodeURIComponent(skillId)}` : ''}`);
export const adminCreateTopicApi = (data: { skillId: string; name: string; slug?: string; description?: string; displayOrder?: number }) =>
  adminJson<SkillTestTopic>('/topics', { method: 'POST', body: JSON.stringify(data) });
export const adminDeleteTopicApi = (id: string) =>
  adminJson<{ ok: boolean }>(`/topics/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Questions
export const adminFetchQuestionsApi = (params: {
  skillId?: string; topicId?: string; status?: string; difficulty?: string; page?: number; limit?: number;
} = {}): Promise<AdminQuestionPage> => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const suffix = qs.toString() ? `?${qs}` : '';
  return adminJson(`/questions${suffix}`);
};
export const adminCreateQuestionApi = (data: Partial<AdminQuestion> & { skillId: string; topicId: string; question: string }) =>
  adminJson<AdminQuestion>('/questions', { method: 'POST', body: JSON.stringify(data) });
export const adminUpdateQuestionApi = (id: string, data: Partial<AdminQuestion>) =>
  adminJson<AdminQuestion>(`/questions/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
export const adminReviewQuestionApi = (id: string, action: 'approve' | 'reject' | 'review', reviewedBy?: string) =>
  adminJson<AdminQuestion>(`/questions/${encodeURIComponent(id)}/review`, { method: 'PATCH', body: JSON.stringify({ action, reviewedBy }) });
export const adminRetireQuestionApi = (id: string, reason?: string) =>
  adminJson<AdminQuestion>(`/questions/${encodeURIComponent(id)}/retire`, { method: 'PATCH', body: JSON.stringify({ reason }) });
export const adminDeleteQuestionApi = (id: string) =>
  adminJson<{ ok: boolean }>(`/questions/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Assessments
export const adminFetchAssessmentsApi = (skillId?: string): Promise<SkillTestAssessment[]> =>
  adminJson(`/assessments${skillId ? `?skillId=${encodeURIComponent(skillId)}` : ''}`);
export const adminCreateAssessmentApi = (data: Partial<SkillTestAssessment> & { skillId: string; title: string }) =>
  adminJson<SkillTestAssessment>('/assessments', { method: 'POST', body: JSON.stringify(data) });
export const adminUpdateAssessmentApi = (id: string, data: Partial<SkillTestAssessment>) =>
  adminJson<SkillTestAssessment>(`/assessments/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
export const adminDeleteAssessmentApi = (id: string) =>
  adminJson<{ ok: boolean }>(`/assessments/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Certificates
export const adminFetchCertificatesApi = (params: { status?: string; skillId?: string } = {}): Promise<SkillTestCertificate[]> => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const suffix = qs.toString() ? `?${qs}` : '';
  return adminJson(`/certificates${suffix}`);
};
export const adminRevokeCertificateApi = (id: string, reason?: string) =>
  adminJson<SkillTestCertificate>(`/certificates/${encodeURIComponent(id)}/revoke`, { method: 'PATCH', body: JSON.stringify({ reason }) });
export const adminRestoreCertificateApi = (id: string) =>
  adminJson<SkillTestCertificate>(`/certificates/${encodeURIComponent(id)}/restore`, { method: 'PATCH', body: JSON.stringify({}) });

// Analytics
export const adminFetchSkillAnalyticsApi = (): Promise<AdminSkillAnalytics> => adminJson('/analytics');
