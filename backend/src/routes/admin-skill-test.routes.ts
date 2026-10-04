import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { loadDb, saveDb } from '../data/db';
import type { Skill, Topic, Question, Assessment, Attempt, SkillCertificate } from '../data/skillTestTypes';

export const adminSkillTestRouter = Router();

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

// ─── SKILLS CRUD ────────────────────────────────────────────────────────────────

adminSkillTestRouter.get('/skills', (_req: Request, res: Response) => {
  const db = loadDb();
  res.json(db.skills || []);
});

adminSkillTestRouter.post('/skills', (req: Request, res: Response) => {
  const db = loadDb();
  const { name, slug, category, description, shortDescription, icon, displayOrder, tags, certificateAvailable, totalQuestions, avgCompletionTime } = req.body;
  if (!name || !slug || !category) return res.status(400).json({ error: 'name, slug, category required' });

  db.skills = db.skills || [];
  if (db.skills.some((s: Skill) => s.slug === slug)) return res.status(409).json({ error: 'Slug already exists' });

  const skill: Skill = {
    id: newId('skl'),
    name, slug, category,
    description: description || '',
    shortDescription: shortDescription || '',
    icon: icon || '',
    status: 'active',
    isPopular: false,
    certificateAvailable: certificateAvailable !== false,
    displayOrder: displayOrder || 0,
    tags: tags || [],
    totalQuestions: totalQuestions || 0,
    avgCompletionTime: avgCompletionTime || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.skills.push(skill);
  saveDb(db);
  res.status(201).json(skill);
});

adminSkillTestRouter.put('/skills/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const skill = (db.skills || []).find((s: Skill) => s.id === req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  Object.assign(skill, req.body, { updated_at: new Date().toISOString() });
  saveDb(db);
  res.json(skill);
});

adminSkillTestRouter.delete('/skills/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const skill = (db.skills || []).find((s: Skill) => s.id === req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  skill.status = 'inactive';
  skill.updated_at = new Date().toISOString();
  saveDb(db);
  res.json({ ok: true });
});

// ─── TOPICS CRUD ────────────────────────────────────────────────────────────────

adminSkillTestRouter.get('/topics', (req: Request, res: Response) => {
  const db = loadDb();
  let topics = db.topics || [];
  if (req.query.skillId) topics = topics.filter((t: Topic) => t.skillId === req.query.skillId);
  res.json(topics);
});

adminSkillTestRouter.post('/topics', (req: Request, res: Response) => {
  const db = loadDb();
  const { skillId, name, slug, description, displayOrder } = req.body;
  if (!skillId || !name) return res.status(400).json({ error: 'skillId, name required' });

  db.topics = db.topics || [];
  const topic: Topic = {
    id: newId('top'),
    skillId, name,
    slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
    description: description || '',
    displayOrder: displayOrder || 0,
    isActive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.topics.push(topic);
  saveDb(db);
  res.status(201).json(topic);
});

adminSkillTestRouter.put('/topics/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const topic = (db.topics || []).find((t: Topic) => t.id === req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  Object.assign(topic, req.body, { updated_at: new Date().toISOString() });
  saveDb(db);
  res.json(topic);
});

adminSkillTestRouter.delete('/topics/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const topic = (db.topics || []).find((t: Topic) => t.id === req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  topic.isActive = false;
  saveDb(db);
  res.json({ ok: true });
});

// ─── QUESTIONS CRUD ─────────────────────────────────────────────────────────────

adminSkillTestRouter.get('/questions', (req: Request, res: Response) => {
  const db = loadDb();
  let questions = db.questions || [];
  const { skillId, topicId, status, difficulty, type, page = '1', limit = '50' } = req.query;

  if (skillId) questions = questions.filter((q: Question) => q.skillId === skillId);
  if (topicId) questions = questions.filter((q: Question) => q.topicId === topicId);
  if (status) questions = questions.filter((q: Question) => q.status === status);
  if (difficulty) questions = questions.filter((q: Question) => q.difficulty === difficulty);
  if (type) questions = questions.filter((q: Question) => q.type === type);

  const total = questions.length;
  const p = Math.max(1, Number(page));
  const l = Math.max(1, Math.min(100, Number(limit)));
  const start = (p - 1) * l;

  res.json({
    items: questions.slice(start, start + l),
    total,
    page: p,
    limit: l,
    pages: Math.ceil(total / l),
  });
});

adminSkillTestRouter.post('/questions', (req: Request, res: Response) => {
  const db = loadDb();
  const body = req.body;
  if (!body.skillId || !body.topicId || !body.question) {
    return res.status(400).json({ error: 'skillId, topicId, question required' });
  }

  db.questions = db.questions || [];
  const question: Question = {
    id: newId('qst'),
    skillId: body.skillId,
    topicId: body.topicId,
    subtopic: body.subtopic || '',
    type: body.type || 'single_choice',
    difficulty: body.difficulty || 'beginner',
    question: body.question,
    questionHtml: body.questionHtml || '',
    imageUrl: body.imageUrl || '',
    imageAlt: body.imageAlt || '',
    options: body.options || [],
    matchPairs: body.matchPairs || [],
    orderItems: body.orderItems || [],
    correctOrder: body.correctOrder || [],
    assertion: body.assertion || '',
    reason: body.reason || '',
    assertionReasonAnswer: body.assertionReasonAnswer || '',
    correctAnswer: body.correctAnswer,
    explanation: body.explanation || '',
    explanationHtml: body.explanationHtml || '',
    tags: body.tags || [],
    status: 'draft',
    version: 1,
    usageCount: 0,
    correctCount: 0,
    difficultyScore: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.questions.push(question);
  saveDb(db);
  res.status(201).json(question);
});

adminSkillTestRouter.put('/questions/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const question = (db.questions || []).find((q: Question) => q.id === req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  const allowed = ['question', 'questionHtml', 'type', 'difficulty', 'options', 'explanation', 'explanationHtml', 'tags', 'subtopic', 'imageUrl', 'imageAlt', 'matchPairs', 'orderItems', 'correctOrder', 'assertion', 'reason', 'assertionReasonAnswer', 'correctAnswer'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) (question as any)[key] = req.body[key];
  }
  question.version += 1;
  question.updated_at = new Date().toISOString();
  saveDb(db);
  res.json(question);
});

adminSkillTestRouter.patch('/questions/:id/review', (req: Request, res: Response) => {
  const db = loadDb();
  const question = (db.questions || []).find((q: Question) => q.id === req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  const { action, reviewedBy } = req.body;
  if (action === 'approve') {
    question.status = 'approved';
    question.reviewedBy = reviewedBy || 'admin';
    question.reviewedAt = new Date().toISOString();
  } else if (action === 'reject') {
    question.status = 'draft';
  } else if (action === 'review') {
    question.status = 'review';
  } else {
    return res.status(400).json({ error: 'action must be approve|reject|review' });
  }
  question.updated_at = new Date().toISOString();
  saveDb(db);
  res.json(question);
});

adminSkillTestRouter.patch('/questions/:id/retire', (req: Request, res: Response) => {
  const db = loadDb();
  const question = (db.questions || []).find((q: Question) => q.id === req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  question.status = 'retired';
  question.retiredAt = new Date().toISOString();
  question.retiredReason = req.body.reason || 'Retired by admin';
  question.updated_at = new Date().toISOString();
  saveDb(db);
  res.json(question);
});

adminSkillTestRouter.delete('/questions/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const idx = (db.questions || []).findIndex((q: Question) => q.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Question not found' });
  db.questions.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

// ─── ASSESSMENTS CRUD ───────────────────────────────────────────────────────────

adminSkillTestRouter.get('/assessments', (req: Request, res: Response) => {
  const db = loadDb();
  let assessments = db.assessments || [];
  if (req.query.skillId) assessments = assessments.filter((a: Assessment) => a.skillId === req.query.skillId);
  res.json(assessments);
});

adminSkillTestRouter.post('/assessments', (req: Request, res: Response) => {
  const db = loadDb();
  const { skillId, title, description, durationMinutes, totalQuestions, passingScore, topicBlueprint, difficultyBlueprint, certificateThresholds, instructions } = req.body;
  if (!skillId || !title) return res.status(400).json({ error: 'skillId, title required' });

  db.assessments = db.assessments || [];
  const assessment: Assessment = {
    id: newId('asm'),
    skillId,
    title,
    description: description || '',
    durationMinutes: durationMinutes || 30,
    totalQuestions: totalQuestions || 30,
    passingScore: passingScore || 60,
    topicBlueprint: topicBlueprint || [],
    difficultyBlueprint: difficultyBlueprint || { beginner: 8, intermediate: 14, advanced: 6, expert: 2 },
    certificateThresholds: certificateThresholds || { pass: 60, proficient: 75, advanced: 85, expert: 90 },
    isActive: true,
    isDefault: true,
    allowRetake: true,
    maxRetakes: 10,
    shuffleQuestions: true,
    shuffleOptions: true,
    showExplanationAfterSubmit: true,
    requireFullScreen: false,
    tabSwitchLimit: 0,
    instructions: instructions || ['Do not refresh during assessment', 'Ensure stable internet connection', 'Submit only when ready'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.assessments.push(assessment);
  saveDb(db);
  res.status(201).json(assessment);
});

adminSkillTestRouter.put('/assessments/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const assessment = (db.assessments || []).find((a: Assessment) => a.id === req.params.id);
  if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
  Object.assign(assessment, req.body, { updated_at: new Date().toISOString() });
  saveDb(db);
  res.json(assessment);
});

adminSkillTestRouter.delete('/assessments/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const idx = (db.assessments || []).findIndex((a: Assessment) => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Assessment not found' });
  db.assessments.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

// ─── CERTIFICATES ───────────────────────────────────────────────────────────────

adminSkillTestRouter.get('/certificates', (req: Request, res: Response) => {
  const db = loadDb();
  let certs = db.skillCertificates || [];
  const { status, skillId } = req.query;
  if (status) certs = certs.filter((c: SkillCertificate) => c.status === status);
  if (skillId) certs = certs.filter((c: SkillCertificate) => c.skillId === skillId);
  res.json(certs.sort((a: SkillCertificate, b: SkillCertificate) => (b.issueDate || '').localeCompare(a.issueDate || '')));
});

adminSkillTestRouter.patch('/certificates/:id/revoke', (req: Request, res: Response) => {
  const db = loadDb();
  const cert = (db.skillCertificates || []).find((c: SkillCertificate) => c.id === req.params.id || c.certificateId === req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  cert.status = 'revoked';
  cert.revokedAt = new Date().toISOString();
  cert.revokedBy = req.userId || '';
  cert.revokeReason = req.body.reason || 'Administrative correction';
  cert.updated_at = new Date().toISOString();
  saveDb(db);
  res.json(cert);
});

adminSkillTestRouter.patch('/certificates/:id/restore', (req: Request, res: Response) => {
  const db = loadDb();
  const cert = (db.skillCertificates || []).find((c: SkillCertificate) => c.id === req.params.id || c.certificateId === req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  cert.status = 'valid';
  cert.revokedAt = undefined;
  cert.revokeReason = undefined;
  cert.updated_at = new Date().toISOString();
  saveDb(db);
  res.json(cert);
});

// ─── ANALYTICS ──────────────────────────────────────────────────────────────────

adminSkillTestRouter.get('/analytics', (_req: Request, res: Response) => {
  const db = loadDb();
  const attempts: Attempt[] = db.attempts || [];
  const submitted = attempts.filter((a: Attempt) => a.status === 'submitted');
  const certs: SkillCertificate[] = db.skillCertificates || [];
  const validCerts = certs.filter((c: SkillCertificate) => c.status === 'valid');

  const skillCounts: Record<string, number> = {};
  for (const a of submitted) skillCounts[a.skillId] = (skillCounts[a.skillId] || 0) + 1;

  const avgScore = submitted.length > 0
    ? Math.round(submitted.reduce((s, a) => s + a.score, 0) / submitted.length)
    : 0;
  const passRate = submitted.length > 0
    ? Math.round((submitted.filter((a) => a.passFail === 'pass').length / submitted.length) * 100)
    : 0;

  res.json({
    totalAttempts: attempts.length,
    completedAttempts: submitted.length,
    inProgress: attempts.filter((a) => a.status === 'in_progress').length,
    avgScore,
    passRate,
    certificatesIssued: certs.length,
    certificatesValid: validCerts.length,
    certificatesRevoked: certs.filter((c) => c.status === 'revoked').length,
    totalSkills: (db.skills || []).filter((s: Skill) => s.status === 'active').length,
    totalQuestions: (db.questions || []).length,
    approvedQuestions: (db.questions || []).filter((q: Question) => q.status === 'approved').length,
    skillAttempts: skillCounts,
  });
});
