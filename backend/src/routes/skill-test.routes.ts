import { isMember, MEMBER_EXTRA_MOCK_ATTEMPTS } from '../lib/festival';
import { codingResultFor } from './code.routes';
import { Router, Request, Response } from 'express';
import { ownedModuleIdsFor, unlockedCompanyIds } from '../payments/orders';
import crypto from 'crypto';
import { loadDb, saveDb } from '../data/db';
import type { Skill, Topic, Question, Assessment, Attempt, AttemptAnswer, SkillCertificate, Recommendation } from '../data/skillTestTypes';
import { requireAuth } from '../middleware/auth';
import { orderRight, shownOrder, typedRight } from '../lib/answerKinds';
import { buildSkillCertPdf } from '../lib/skillCertPdf';
import { events as msgEvents, sendToUser } from '../lib/messaging';
import { grant, recordStudyDay, ruleOf } from '../lib/coins';

export const skillTestRouter = Router();

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── GET /skills ────────────────────────────────────────────────────────────────
skillTestRouter.get('/skills', (req: Request, res: Response) => {
  const db = loadDb();
  const skills = (db.skills || [])
    .filter((s: Skill) => s.status === 'active')
    .sort((a: Skill, b: Skill) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json(skills);
});

// ─── GET /skills/category/:category ─────────────────────────────────────────────
skillTestRouter.get('/skills/category/:category', (req: Request, res: Response) => {
  const db = loadDb();
  const { category } = req.params;
  const skills = (db.skills || [])
    .filter((s: Skill) => s.status === 'active' && s.category === category)
    .sort((a: Skill, b: Skill) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json(skills);
});

// ─── GET /skills/:slug ──────────────────────────────────────────────────────────
skillTestRouter.get('/skills/:slug', (req: Request, res: Response) => {
  const db = loadDb();
  const { slug } = req.params;
  const skill = (db.skills || []).find((s: Skill) => s.slug === slug && s.status !== 'inactive');
  if (!skill) return res.status(404).json({ error: 'Skill not found' });

  const topics = (db.topics || []).filter((t: Topic) => t.skillId === skill.id && t.isActive);
  const assessment = (db.assessments || []).find(
    (a: Assessment) => a.skillId === skill.id && a.isActive && a.isDefault
  ) || (db.assessments || []).find((a: Assessment) => a.skillId === skill.id && a.isActive);

  res.json({ skill, topics, assessment });
});

// ─── GET /topics/:skillSlug ─────────────────────────────────────────────────────
skillTestRouter.get('/topics/:skillSlug', (req: Request, res: Response) => {
  const db = loadDb();
  const skill = (db.skills || []).find((s: Skill) => s.slug === req.params.skillSlug);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  const topics = (db.topics || []).filter((t: Topic) => t.skillId === skill.id && t.isActive);
  res.json(topics);
});

// ─── POST /assessments/:slug/start ──────────────────────────────────────────────
skillTestRouter.post('/assessments/:slug/start', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.userId!;
  const skill = (db.skills || []).find((s: Skill) => s.slug === req.params.slug && s.status === 'active');
  if (!skill) return res.status(404).json({ error: 'Skill not found' });

  const assessment = (db.assessments || []).find(
    (a: Assessment) => a.skillId === skill.id && a.isActive && a.isDefault
  ) || (db.assessments || []).find((a: Assessment) => a.skillId === skill.id && a.isActive);
  if (!assessment) return res.status(404).json({ error: 'No active assessment for this skill' });

  // Check for existing in-progress attempt
  const existing = (db.attempts || []).find(
    (a: Attempt) => a.userId === userId && a.assessmentId === assessment.id && a.status === 'in_progress'
  );
  if (existing) {
    return res.json({ attempt: sanitizeAttempt(existing, db.questions || []) });
  }

  // Check retake limit
  const priorAttempts = (db.attempts || []).filter(
    (a: Attempt) => a.userId === userId && a.assessmentId === assessment.id && a.status === 'submitted'
  );
  if (!assessment.allowRetake || priorAttempts.length >= assessment.maxRetakes) {
    return res.status(403).json({ error: 'Retake limit reached for this assessment' });
  }

  // Company mocks (3T plan §3): the first attempt(s) are free; more need that
  // company's pack. Admins and pack owners are never limited.
  const companySlug = (skill as any).company_slug;
  if (companySlug) {
    const company = (db.companies || []).find((c: any) => c.slug === companySlug);
    const user = (db.users || []).find((u: any) => u.id === userId);
    const premiumIds = (company?.modules || []).filter((m: any) => m.is_premium).map((m: any) => m.id);
    const owned = ownedModuleIdsFor(db, userId);
    const unlocked = !company
      || company.is_free === true
      || user?.role === 'admin'
      || unlockedCompanyIds(db, userId).includes(company.id)
      || (premiumIds.length > 0 && premiumIds.every((id: string) => owned.includes(id)));
    // TiEEdu members (Diwali 2026 offer) get extra free attempts.
    const freeAttempts = Number((assessment as any).freeAttempts ?? 1)
      + (isMember(db, userId) ? MEMBER_EXTRA_MOCK_ATTEMPTS : 0);
    if (!unlocked && priorAttempts.length >= freeAttempts) {
      return res.status(402).json({
        error: freeAttempts > 0
          ? `Your free ${skill.name} attempt is used. Get the ${company.name} pack for unlimited mocks with fresh questions.`
          : `${skill.name} is part of the ${company.name} pack. Get the pack to take it as often as you like.`,
        code: 'pack_required',
        company_slug: companySlug,
      });
    }
  }

  // Blueprint-based question selection
  const approvedQuestions = (db.questions || []).filter(
    (q: Question) => q.skillId === skill.id && q.status === 'approved'
  );
  if (approvedQuestions.length === 0) {
    return res.status(409).json({ error: 'No approved questions available for this skill yet' });
  }

  const selected = selectByBlueprint(approvedQuestions, assessment, db.topics || []);

  const attempt: Attempt = {
    id: newId('att'),
    userId,
    assessmentId: assessment.id,
    skillId: skill.id,
    questionOrder: selected.map((q) => q.id),
    answers: [],
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    timeLimitMinutes: assessment.durationMinutes,
    timeRemainingSec: assessment.durationMinutes * 60,
    totalTimeSpentSec: 0,
    totalQuestions: selected.length,
    correctAnswers: 0,
    incorrectAnswers: 0,
    unanswered: 0,
    markedReviewCount: 0,
    score: 0,
    percentage: 0,
    passFail: 'fail',
    skillLevel: 'beginner',
    topicPerformance: [],
    difficultyPerformance: { beginner: { correct: 0, total: 0, percentage: 0 }, intermediate: { correct: 0, total: 0, percentage: 0 }, advanced: { correct: 0, total: 0, percentage: 0 }, expert: { correct: 0, total: 0, percentage: 0 } },
    isEligibleForCertificate: false,
    tabSwitchCount: 0,
    fullScreenExited: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.attempts = db.attempts || [];
  db.attempts.push(attempt);
  saveDb(db);

  res.json({ attempt: sanitizeAttempt(attempt, db.questions || []) });
});

// ─── GET /attempts/:attemptId ───────────────────────────────────────────────────
skillTestRouter.get('/attempts/:attemptId', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const attempt = (db.attempts || []).find((a: Attempt) => a.id === req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.userId !== req.userId) return res.status(403).json({ error: 'Not your attempt' });

  res.json({ attempt: sanitizeAttempt(attempt, db.questions || []) });
});

// ─── POST /attempts/:attemptId/save ─────────────────────────────────────────────
skillTestRouter.post('/attempts/:attemptId/save', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const attempt = (db.attempts || []).find((a: Attempt) => a.id === req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.userId !== req.userId) return res.status(403).json({ error: 'Not your attempt' });
  if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'Attempt already submitted' });

  const { answers, markedForReview, timeRemainingSec } = req.body;
  if (Array.isArray(answers)) {
    attempt.answers = answers.map((a: any) => ({
      questionId: String(a.questionId),
      selectedOptions: Array.isArray(a.selectedOptions) ? a.selectedOptions.slice(0, 30).map((x: any) => String(x).slice(0, 300)) : [],
      isCorrect: false,
      timeSpentSec: Number(a.timeSpentSec) || 0,
      markedForReview: Boolean(a.markedForReview),
    }));
  }
  if (typeof timeRemainingSec === 'number') attempt.timeRemainingSec = timeRemainingSec;
  attempt.markedReviewCount = attempt.answers.filter((a: AttemptAnswer) => a.markedForReview).length;
  attempt.updated_at = new Date().toISOString();
  saveDb(db);
  res.json({ ok: true });
});

// ─── POST /attempts/:attemptId/submit ───────────────────────────────────────────
skillTestRouter.post('/attempts/:attemptId/submit', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const attempt = (db.attempts || []).find((a: Attempt) => a.id === req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.userId !== req.userId) return res.status(403).json({ error: 'Not your attempt' });
  if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'Attempt already submitted' });

  const questions: Question[] = (db.questions || []).filter((q: Question) =>
    attempt.questionOrder.includes(q.id)
  );
  const assessment = (db.assessments || []).find((a: Assessment) => a.id === attempt.assessmentId);
  const topics: Topic[] = db.topics || [];

  // Ingest final answers from the request body (the save endpoint may have
  // run earlier, but the last answer entered before submit exists only here).
  const bodyAnswers = req.body?.answers;
  if (Array.isArray(bodyAnswers)) {
    attempt.answers = bodyAnswers.map((a: any) => ({
      questionId: String(a.questionId),
      selectedOptions: Array.isArray(a.selectedOptions) ? a.selectedOptions.slice(0, 30).map((x: any) => String(x).slice(0, 300)) : [],
      isCorrect: false,
      timeSpentSec: Number(a.timeSpentSec) || 0,
      markedForReview: Boolean(a.markedForReview),
    }));
  }
  if (typeof req.body?.timeRemainingSec === 'number') attempt.timeRemainingSec = req.body.timeRemainingSec;
  // Coding section: graded submissions made during this attempt win (code.routes); without them (runner
  // down) the student's own mark per problem is kept. Not part of the MCQ score; feeds the prep plan.
  const graded = codingResultFor(db, attempt);
  if (graded) (attempt as any).coding_result = graded;
  const codingIds = new Set(((assessment as any)?.coding?.problems || []).map((p: any) => p.id));
  if (!graded && Array.isArray(req.body?.coding_self) && codingIds.size) {
    (attempt as any).coding_self = req.body.coding_self
      .filter((m: any) => codingIds.has(String(m?.id)) && ['solved', 'partial', 'not'].includes(m?.status))
      .slice(0, 5)
      .map((m: any) => ({ id: String(m.id), status: m.status, language: String(m.language || '').slice(0, 12) }));
  }

  // ── Score server-side ──
  const answersByQid: Record<string, any> = {};
  for (const a of attempt.answers) answersByQid[a.questionId] = a;

  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  for (const q of questions) {
    const ans = answersByQid[q.id];
    const isCorrect = evaluateAnswer(q, ans);
    if (!ans || !ans.selectedOptions?.length) {
      unanswered++;
    } else if (isCorrect) {
      correct++;
    } else {
      incorrect++;
    }
    // Store correctness
    if (ans) ans.isCorrect = isCorrect;
  }

  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passFail = assessment && score >= assessment.passingScore ? 'pass' : 'fail';

  // Skill level
  const skillLevel = scoreLevel(score);

  // Topic performance
  const topicPerf: Attempt['topicPerformance'] = [];
  const topicMap: Record<string, { correct: number; total: number }> = {};
  for (const q of questions) {
    if (!topicMap[q.topicId]) topicMap[q.topicId] = { correct: 0, total: 0 };
    topicMap[q.topicId].total++;
    const ans = answersByQid[q.id];
    if (ans && ans.isCorrect) topicMap[q.topicId].correct++;
  }
  for (const [tid, perf] of Object.entries(topicMap)) {
    const topic = topics.find((t) => t.id === tid);
    topicPerf.push({
      topicId: tid,
      topicName: topic?.name || 'Unknown',
      correct: perf.correct,
      total: perf.total,
      percentage: perf.total > 0 ? Math.round((perf.correct / perf.total) * 100) : 0,
    });
  }

  // Difficulty performance
  const diffMap: Record<string, { correct: number; total: number }> = { beginner: { correct: 0, total: 0 }, intermediate: { correct: 0, total: 0 }, advanced: { correct: 0, total: 0 }, expert: { correct: 0, total: 0 } };
  for (const q of questions) {
    const d = diffMap[q.difficulty];
    if (d) {
      d.total++;
      const ans = answersByQid[q.id];
      if (ans && ans.isCorrect) d.correct++;
    }
  }
  const pct = (v: { correct: number; total: number }) => v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
  const diffPerf = {
    beginner: { ...diffMap.beginner, percentage: pct(diffMap.beginner) },
    intermediate: { ...diffMap.intermediate, percentage: pct(diffMap.intermediate) },
    advanced: { ...diffMap.advanced, percentage: pct(diffMap.advanced) },
    expert: { ...diffMap.expert, percentage: pct(diffMap.expert) },
  };

  // Update attempt
  attempt.status = 'submitted';
  attempt.submittedAt = new Date().toISOString();
  attempt.correctAnswers = correct;
  attempt.incorrectAnswers = incorrect;
  attempt.unanswered = unanswered;
  attempt.score = score;
  attempt.percentage = score;
  attempt.passFail = passFail;
  attempt.skillLevel = skillLevel;
  attempt.topicPerformance = topicPerf;
  attempt.difficultyPerformance = diffPerf;
  attempt.updated_at = new Date().toISOString();
  // A submitted test is a study day (lib/streak) and, for a company mock, earns TiE Coins.
  recordStudyDay(db, req.userId!);
  {
    const sk = (db.skills || []).find((s: Skill) => s.id === attempt.skillId) as (Skill & { company_slug?: string }) | undefined;
    if (sk?.company_slug) {
      grant(db, req.userId!, 'mock_submit', `mock:${req.userId}:${sk.id}`, ruleOf(db, 'mock_submit').coins, `Submitted ${sk.name}`, sk.id);
      if (score >= 70) grant(db, req.userId!, 'mock_70', `mock70:${req.userId}:${sk.id}`, ruleOf(db, 'mock_70').coins, `70%+ in ${sk.name}`, sk.id);
    }
  }

  // Certificate eligibility
  const certThresholds = assessment?.certificateThresholds || { pass: 60, proficient: 75, advanced: 85, expert: 90 };
  let certEligible = false;
  let certLevel: SkillCertificate['level'] | null = null;
  if (score >= certThresholds.expert) { certEligible = true; certLevel = 'expert'; }
  else if (score >= certThresholds.advanced) { certEligible = true; certLevel = 'advanced'; }
  else if (score >= certThresholds.proficient) { certEligible = true; certLevel = 'proficient'; }
  else if (score >= certThresholds.pass) { certEligible = true; certLevel = 'pass'; }

  attempt.isEligibleForCertificate = certEligible;

  // Generate certificate
  let certificate: SkillCertificate | null = null;
  if (certEligible && certLevel) {
    const skill = (db.skills || []).find((s: Skill) => s.id === attempt.skillId);
    const user = (db.users || []).find((u: any) => u.id === attempt.userId);
    const certId = generateCertificateId(skill?.slug || 'CERT');
    const certNum = (db.skillCertificates || []).length + 100001;

    certificate = {
      id: newId('cert'),
      userId: attempt.userId,
      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,
      skillId: attempt.skillId,
      certificateId: certId,
      certificateNumber: certNum,
      studentName: user?.name || 'Student',
      studentEmail: user?.email || '',
      skillName: skill?.name || 'Skill',
      skillSlug: skill?.slug || 'skill',
      score,
      level: certLevel,
      skillLevelText: skillLevelLabel(skillLevel),
      issueDate: new Date().toISOString(),
      status: 'valid',
      verificationUrl: `${process.env.SITE_URL || 'https://tieedu.in'}/skill-test/certificates/${certId}`,
      templateVersion: 'v1.0',
      issuedFrom: 'tieedu',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.skillCertificates = db.skillCertificates || [];
    db.skillCertificates.push(certificate);
    attempt.certificateId = certificate.id;
  }

  // Generate recommendations (weak topics < 70%)
  const weakTopics = topicPerf.filter((t) => t.percentage < 70);
  const recommendation: Recommendation | null = weakTopics.length > 0 ? {
    id: newId('rec'),
    userId: attempt.userId,
    attemptId: attempt.id,
    skillId: attempt.skillId,
    weakTopics: weakTopics.map((t) => ({
      topicId: t.topicId,
      topicName: t.topicName,
      percentage: t.percentage,
      priority: t.percentage < 50 ? 'high' : 'medium',
    })),
    recommendedCourses: weakTopics.map((t) => ({
      courseTitle: `${t.topicName} Improvement`,
      reason: `Your performance in ${t.topicName} was ${t.percentage}% — below recommended level.`,
      matchScore: 100 - t.percentage,
    })),
    nextSteps: [
      `Review ${weakTopics.map((t) => t.topicName).join(', ')} concepts`,
      'Attempt a practice assessment',
      'Retake this skill test after improvement',
    ],
    isViewed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null;
  if (recommendation) {
    db.recommendations = db.recommendations || [];
    db.recommendations.push(recommendation);
  }

  saveDb(db);
  {
    const skill = (db.skills || []).find((s: Skill) => s.id === attempt.skillId);
    void sendToUser(attempt.userId, msgEvents.skillTestResult({
      attemptId: attempt.id,
      skillName: skill?.name || 'Skill',
      score,
      passed: passFail === 'pass',
      certificateId: certificate?.certificateId || null,
      weakTopics: weakTopics.map((t) => t.topicName),
    }));
  }

  res.json({
    attempt: sanitizeAttempt(attempt, db.questions || []),
    certificate,
    recommendation,
  });
});

// ─── GET /attempts/:attemptId/result ────────────────────────────────────────────
skillTestRouter.get('/attempts/:attemptId/result', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const attempt = (db.attempts || []).find((a: Attempt) => a.id === req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.userId !== req.userId) return res.status(403).json({ error: 'Not your attempt' });

  const certificate = attempt.certificateId
    ? (db.skillCertificates || []).find((c: SkillCertificate) => c.id === attempt.certificateId)
    : null;
  const recommendation = (db.recommendations || []).find(
    (r: Recommendation) => r.attemptId === attempt.id
  );

  // Answer review after submit (when the test allows it): each question with the
  // student's pick, the right answer and the explanation, in paper order.
  const assessment = (db.assessments || []).find((a: Assessment) => a.id === attempt.assessmentId);
  let review: any[] = [];
  if (attempt.status === 'submitted' && assessment?.showExplanationAfterSubmit) {
    const qMap = new Map<string, any>((db.questions || []).map((q: any) => [q.id, q]));
    const aMap = new Map<string, any>((attempt.answers || []).map((a: any) => [a.questionId, a]));
    review = attempt.questionOrder.map((qid: string) => {
      const q = qMap.get(qid);
      if (!q) return null;
      const sel: string[] = aMap.get(qid)?.selectedOptions || [];
      const picked = sel[0];
      const kind = q.type === 'fill_blank' ? 'fill' : q.type === 'ordering' ? 'order' : 'mcq';
      return {
        id: q.id, topicId: q.topicId, question: q.question, code: !!q.code, kind,
        options: (q.options || []).map((o: any) => o.text),
        correct: kind === 'mcq' ? (q.options || []).findIndex((o: any) => o.isCorrect) : -1,
        selected: kind !== 'mcq' || picked == null || picked === '' ? null : Number(picked),
        // fill: what they typed; order: the item indices in their order.
        ...(kind === 'fill' ? { typed: picked ?? null } : {}),
        ...(kind === 'order' ? { order: sel.length ? sel.map(Number) : null } : {}),
        right: !!aMap.get(qid)?.isCorrect,
        explanation: q.explanation || '',
        ...(q.hint ? { trick: q.hint } : {}),
      };
    }).filter(Boolean);
  }

  res.json({ attempt, certificate, recommendation, review });
});

// ─── GET /my-attempts ───────────────────────────────────────────────────────────
skillTestRouter.get('/my-attempts', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const attempts = (db.attempts || [])
    .filter((a: Attempt) => a.userId === req.userId && a.status === 'submitted')
    .sort((a: Attempt, b: Attempt) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  res.json(attempts);
});

// ─── GET /my-attempts/:skillSlug ────────────────────────────────────────────────
skillTestRouter.get('/my-attempts/:skillSlug', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const skill = (db.skills || []).find((s: Skill) => s.slug === req.params.skillSlug);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  const attempts = (db.attempts || [])
    .filter((a: Attempt) => a.userId === req.userId && a.skillId === skill.id && a.status === 'submitted')
    .sort((a: Attempt, b: Attempt) => (a.submittedAt || '').localeCompare(b.submittedAt || ''));
  res.json(attempts);
});

// ─── GET /certificates/my ───────────────────────────────────────────────────────
skillTestRouter.get('/certificates/my', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const certs = (db.skillCertificates || []).filter((c: SkillCertificate) => c.userId === req.userId);
  res.json(certs);
});

// ─── GET /certificates/:certificateId/verify (PUBLIC) ───────────────────────────
skillTestRouter.get('/certificates/:certificateId/verify', (req: Request, res: Response) => {
  const db = loadDb();
  const cert = (db.skillCertificates || []).find(
    (c: SkillCertificate) => c.certificateId === req.params.certificateId.toUpperCase()
  );
  if (!cert) return res.status(404).json({ verified: false, error: 'Certificate not found' });

  res.json({
    verified: cert.status === 'valid',
    status: cert.status,
    studentName: cert.studentName,
    skillName: cert.skillName,
    skillSlug: cert.skillSlug,
    level: cert.level,
    skillLevelText: cert.skillLevelText,
    score: cert.score,
    issueDate: cert.issueDate,
    certificateId: cert.certificateId,
    revokedAt: cert.revokedAt,
    revokeReason: cert.revokeReason,
  });
});

// ─── GET /certificates/:certificateId/pdf (PUBLIC) ─────────────────────────────
skillTestRouter.get('/certificates/:certificateId/pdf', async (req: Request, res: Response) => {
  const db = loadDb();
  const cert = (db.skillCertificates || []).find(
    (c: SkillCertificate) => c.certificateId === req.params.certificateId.toUpperCase()
  );
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });

  try {
    const pdf = await buildSkillCertPdf(cert);
    const filename = `TiEEdu-Skill-Certificate-${cert.certificateId}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, max-age=60',
    });
    res.send(pdf);
  } catch (err: any) {
    console.error('[SkillTest] Certificate PDF generation failed:', err?.message);
    res.status(500).json({ error: 'Could not generate certificate PDF' });
  }
});

// ─── GET /passport ──────────────────────────────────────────────────────────────
skillTestRouter.get('/passport', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const userId = req.userId!;

  const certs = (db.skillCertificates || []).filter((c: SkillCertificate) => c.userId === userId && c.status === 'valid');
  const attempts = (db.attempts || []).filter((a: Attempt) => a.userId === userId && a.status === 'submitted');

  // Latest score per skill
  const skillMap: Record<string, { skillSlug: string; skillName: string; score: number; level: string; attemptId: string; date: string }> = {};
  for (const a of attempts) {
    const skill = (db.skills || []).find((s: Skill) => s.id === a.skillId);
    if (!skill) continue;
    if (!skillMap[skill.slug] || (a.submittedAt || '') > (skillMap[skill.slug].date || '')) {
      skillMap[skill.slug] = {
        skillSlug: skill.slug,
        skillName: skill.name,
        score: a.score,
        level: skillLevelLabel(a.skillLevel),
        attemptId: a.id,
        date: a.submittedAt || '',
      };
    }
  }

  const skills = Object.values(skillMap);
  const avgScore = skills.length > 0 ? Math.round(skills.reduce((s, x) => s + x.score, 0) / skills.length) : 0;

  res.json({
    skills,
    certificates: certs,
    avgScore,
    totalCertificates: certs.length,
    totalAttempts: attempts.length,
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

function sanitizeAttempt(attempt: Attempt, allQuestions: Question[]) {
  const qMap: Record<string, Question> = {};
  for (const q of allQuestions) qMap[q.id] = q;

  const safeQuestions = attempt.questionOrder
    .map((qid) => qMap[qid])
    .filter(Boolean)
    .map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      questionHtml: q.questionHtml || undefined,
      imageUrl: q.imageUrl || undefined,
      // NO isCorrect — never leak answers to frontend. Typed answers send no options at all;
      // ordering sends the items shuffled (same order every time this attempt is opened).
      options: q.type === 'fill_blank' ? []
        : q.type === 'ordering' ? shownOrder(`${attempt.id}:${q.id}`, (q.options || []).length).map((i) => ({ index: i, text: (q.options || [])[i].text }))
          : (q.options || []).map((o, i) => ({ index: i, text: o.text })),
      topicId: q.topicId,
      difficulty: q.difficulty,
      // Code questions (Swift output, pseudocode) are shown with their code in a block.
      code: (q as any).code ? true : undefined,
    }));

  const answersByQid: Record<string, any> = {};
  for (const a of attempt.answers) answersByQid[a.questionId] = a;

  const safeAnswers = safeQuestions.map((q) => ({
    questionId: q.id,
    selectedOptions: answersByQid[q.id]?.selectedOptions || [],
    markedForReview: answersByQid[q.id]?.markedForReview || false,
  }));

  return {
    id: attempt.id,
    assessmentId: attempt.assessmentId,
    skillId: attempt.skillId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    timeLimitMinutes: attempt.timeLimitMinutes,
    timeRemainingSec: attempt.timeRemainingSec,
    totalQuestions: attempt.totalQuestions,
    questions: safeQuestions,
    answers: safeAnswers,
    // Only include results if submitted
    ...(attempt.status === 'submitted' ? {
      score: attempt.score,
      correctAnswers: attempt.correctAnswers,
      incorrectAnswers: attempt.incorrectAnswers,
      unanswered: attempt.unanswered,
      passFail: attempt.passFail,
      skillLevel: attempt.skillLevel,
      topicPerformance: attempt.topicPerformance,
      difficultyPerformance: attempt.difficultyPerformance,
      isEligibleForCertificate: attempt.isEligibleForCertificate,
      certificateId: attempt.certificateId,
      submittedAt: attempt.submittedAt,
    } : {}),
  };
}

function evaluateAnswer(q: Question, ans: any): boolean {
  if (!ans) return false;
  const selected: string[] = ans.selectedOptions || [];
  if (selected.length === 0) return false;

  if (q.type === 'fill_blank') return typedRight((q.options || []).map((o) => o.text), selected[0]);
  if (q.type === 'ordering') return orderRight((q.options || []).length, selected);

  if (q.type === 'single_choice' || q.type === 'true_false' || q.type === 'output_prediction' || q.type === 'debugging_mcq' || q.type === 'scenario_based') {
    const correctIdx = (q.options || []).map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i >= 0);
    return correctIdx.length > 0 && selected.length === 1 && selected[0] === String(correctIdx[0]);
  }

  if (q.type === 'multiple_choice') {
    const correctIdx = (q.options || []).map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i >= 0);
    const selectedSet = new Set(selected.map(Number));
    const correctSet = new Set(correctIdx);
    if (selectedSet.size !== correctSet.size) return false;
    for (const c of correctSet) if (!selectedSet.has(c)) return false;
    return true;
  }

  return false;
}

function scoreLevel(score: number): Attempt['skillLevel'] {
  if (score >= 90) return 'expert';
  if (score >= 75) return 'advanced';
  if (score >= 60) return 'intermediate';
  if (score >= 40) return 'developing';
  return 'beginner';
}

function skillLevelLabel(level: string): string {
  const map: Record<string, string> = {
    beginner: 'Beginner', developing: 'Developing', intermediate: 'Intermediate',
    advanced: 'Advanced', expert: 'Expert',
  };
  return map[level] || level;
}

function generateCertificateId(skillSlug: string): string {
  const year = new Date().getFullYear();
  const code = skillSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `TIE-${code}-${year}-${rand}`;
}

function selectByBlueprint(
  pool: Question[],
  assessment: Assessment,
  allTopics: Topic[]
): Question[] {
  const selected: Question[] = [];
  const used = new Set<string>();

  // 1. Topic blueprint
  for (const bp of assessment.topicBlueprint) {
    const topicPool = shuffle(pool.filter((q) => q.topicId === bp.topicId && !used.has(q.id)));
    for (let i = 0; i < Math.min(bp.questionCount, topicPool.length); i++) {
      selected.push(topicPool[i]);
      used.add(topicPool[i].id);
    }
  }

  // 2. Difficulty blueprint fill
  const difficultyOrder: Array<keyof Assessment['difficultyBlueprint']> = ['beginner', 'intermediate', 'advanced', 'expert'];
  for (const diff of difficultyOrder) {
    const need = assessment.difficultyBlueprint[diff] || 0;
    const have = selected.filter((q) => q.difficulty === diff).length;
    if (have >= need) continue;
    const diffPool = shuffle(pool.filter((q) => q.difficulty === diff && !used.has(q.id)));
    for (let i = 0; i < Math.min(need - have, diffPool.length); i++) {
      selected.push(diffPool[i]);
      used.add(diffPool[i].id);
    }
  }

  // 3. Fill remaining to totalQuestions
  if (selected.length < assessment.totalQuestions) {
    const remaining = shuffle(pool.filter((q) => !used.has(q.id)));
    for (let i = 0; i < Math.min(assessment.totalQuestions - selected.length, remaining.length); i++) {
      selected.push(remaining[i]);
      used.add(remaining[i].id);
    }
  }

  // 4. A topic blueprint that oversubscribes must not exceed totalQuestions —
  // the contract shown to the student (30 Q) is the one that has to hold.
  const capped = selected.slice(0, assessment.totalQuestions);

  return assessment.shuffleQuestions ? shuffle(capped) : capped;
}
