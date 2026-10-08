import type { Company, MyCoursesResponse } from '@/types';
import type { SkillTestAttempt, SkillTestSkill } from '@/lib/skillTestApi';
import type { DropFeedPage } from '@/lib/dropsApi';

export type BriefingKind =
  | 'greeting'
  | 'study_plan'
  | 'course'
  | 'skill_test'
  | 'free_course'
  | 'vault'
  | 'drops'
  | 'plan_progress';

export interface BriefingItem {
  id: string;
  kind: BriefingKind;
  title: string;
  body: string;
  cta: string | null;
  href: string | null;
  tone: string;
  dropIds?: string[];
  vaultId?: string;
}

export interface StudyPlanPhaseShape {
  id: string;
  order: number;
  title: string;
  dayLabel: string;
  summary?: string;
  completed: boolean;
}

export interface StudyPlanShape {
  targetCompany: string;
  targetRole: string;
  interviewDate: string | null;
  progress: { completed: number; total: number; percent: number };
  phases: StudyPlanPhaseShape[];
}

export interface StudyPlanEnvelope {
  enrollment: unknown | null;
  plan: StudyPlanShape | null;
}

export interface InterviewModuleShape {
  id: number;
  title: string;
  is_free: boolean;
  unlocked?: boolean;
}

export interface InterviewModulesPayload {
  success?: boolean;
  data?: InterviewModuleShape[];
}

export interface InterviewProgressPayload {
  success?: boolean;
  progress?: { completed_module_ids?: number[] };
}

export interface BriefingSources {
  plan: StudyPlanEnvelope | null;
  myCourses: MyCoursesResponse | null;
  skills: SkillTestSkill[] | null;
  attempts: SkillTestAttempt[] | null;
  interviewModules: InterviewModulesPayload | null;
  interviewProgress: InterviewProgressPayload | null;
  companies: Company[] | null;
  drops: DropFeedPage | null;
}

export interface BriefingContext {
  userName: string;
  streak: number;
  now: Date;
  dropsSeen: Set<string>;
  vaultSeen: Set<string>;
}

export const MAX_BRIEFING_ITEMS = 6;

const TONE: Record<BriefingKind, string> = {
  greeting: '#B45309',
  study_plan: '#0369A1',
  course: '#0E7C66',
  skill_test: '#7C3AED',
  free_course: '#15803D',
  vault: '#4F46E5',
  drops: '#BE185D',
  plan_progress: '#C77B12',
};

const firstName = (name: string): string => name.trim().split(/\s+/)[0] || 'there';

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

const buildGreeting = (count: number, ctx: BriefingContext): BriefingItem => {
  const hour = ctx.now.getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const what = count === 1 ? '1 thing to catch up on' : `${count} things to catch up on`;
  const streak = ctx.streak > 0 ? ` · ${ctx.streak}-day streak` : '';
  return {
    id: 'greeting',
    kind: 'greeting',
    title: `Good ${part}, ${firstName(ctx.userName)}`,
    body: `${what}${streak}`,
    cta: null,
    href: null,
    tone: TONE.greeting,
  };
};

const buildPlanPhase = (sources: BriefingSources): BriefingItem | null => {
  const plan = sources.plan?.plan;
  if (!plan || plan.phases.length === 0) return null;
  const pending = plan.phases.filter((phase) => !phase.completed).sort((a, b) => a.order - b.order);
  const current = pending[0];
  if (!current) return null;
  return {
    id: `plan:${current.id}`,
    kind: 'study_plan',
    title: current.title,
    body: `${current.dayLabel} · ${plan.progress.completed}/${plan.progress.total} phases done`,
    cta: 'Continue',
    href: `/study-plan#phase-${current.order}`,
    tone: TONE.study_plan,
  };
};

const buildPlanProgress = (sources: BriefingSources): BriefingItem | null => {
  const plan = sources.plan?.plan;
  if (!plan) return null;
  const pendingCount = plan.phases.filter((phase) => !phase.completed).length;
  if (pendingCount === 0 || plan.progress.completed === 0) return null;
  return {
    id: 'plan:progress',
    kind: 'plan_progress',
    title: `Your plan is ${plan.progress.percent}% done`,
    body: `${plan.progress.completed} of ${plan.progress.total} phases · target ${plan.targetCompany} ${plan.targetRole}`,
    cta: 'View plan',
    href: '/study-plan',
    tone: TONE.plan_progress,
  };
};

const buildCourse = (sources: BriefingSources): BriefingItem | null => {
  const inProgress = sources.myCourses?.in_progress ?? [];
  if (inProgress.length === 0) return null;
  const latest = [...inProgress].sort((a, b) =>
    (b.last_activity_at || '').localeCompare(a.last_activity_at || '')
  )[0];
  const progress = latest.progress;
  const resume = progress.next_lesson_id
    ? `/courses/${latest.slug}?lesson=${encodeURIComponent(progress.next_lesson_id)}`
    : `/courses/${latest.slug}`;
  return {
    id: `course:${latest.id}`,
    kind: 'course',
    title: `Continue: ${latest.title}`,
    body: `${progress.completed}/${progress.total} lessons · ${progress.percent}% complete`,
    cta: 'Resume',
    href: resume,
    tone: TONE.course,
  };
};

const buildSkillTest = (sources: BriefingSources): BriefingItem | null => {
  const skills = (sources.skills ?? []).filter((skill) => skill.status === 'active');
  if (skills.length === 0) return null;
  const attempted = new Set((sources.attempts ?? []).map((attempt) => attempt.skillId));
  const pending = skills.filter((skill) => !attempted.has(skill.id));
  if (pending.length === 0) return null;
  const best =
    pending.find((skill) => skill.isPopular) ??
    [...pending].sort((a, b) => a.displayOrder - b.displayOrder)[0];
  return {
    id: `test:${best.id}`,
    kind: 'skill_test',
    title: `${best.name} test is waiting`,
    body: `${best.totalQuestions} questions · about ${best.avgCompletionTime} min · not attempted`,
    cta: 'Start test',
    href: `/skill-test/${best.slug}`,
    tone: TONE.skill_test,
  };
};

const buildFreeCourse = (sources: BriefingSources): BriefingItem | null => {
  const modules = (sources.interviewModules?.data ?? []).filter(
    (module) => module.unlocked !== false
  );
  if (modules.length === 0) return null;
  const completed = new Set(
    sources.interviewProgress?.progress?.completed_module_ids ?? []
  );
  if (completed.size === 0) return null;
  const next = modules.find((module) => !completed.has(module.id));
  if (!next) return null;
  return {
    id: `free:${next.id}`,
    kind: 'free_course',
    title: next.title,
    body: `Module ${next.id} of ${modules.length} · Interview Masterclass`,
    cta: 'Open',
    href: '/interview-course',
    tone: TONE.free_course,
  };
};

const buildVault = (sources: BriefingSources, ctx: BriefingContext): BriefingItem | null => {
  const unlocked = (sources.companies ?? []).filter(
    (company) => company.is_unlocked && !ctx.vaultSeen.has(company.id)
  );
  if (unlocked.length === 0) return null;
  const best = [...unlocked].sort(
    (a, b) => (b.owned_module_count ?? b.module_count ?? 0) - (a.owned_module_count ?? a.module_count ?? 0)
  )[0];
  const count = best.owned_module_count ?? best.module_count ?? 0;
  return {
    id: `vault:${best.id}`,
    kind: 'vault',
    title: `New material: ${best.name}`,
    body:
      count > 0
        ? `${count} modules in your unlocked pack — none opened yet`
        : 'Your unlocked pack has material you have not opened yet',
    cta: 'Open pack',
    href: `/company/${best.slug}`,
    tone: TONE.vault,
    vaultId: best.id,
  };
};

const buildDrops = (sources: BriefingSources, ctx: BriefingContext): BriefingItem | null => {
  const unseen = (sources.drops?.items ?? []).filter(
    (drop) => !drop.sponsored && !ctx.dropsSeen.has(drop.id)
  );
  if (unseen.length === 0) return null;
  const count = unseen.length;
  return {
    id: 'drops:new',
    kind: 'drops',
    title: count === 1 ? '1 new drop today' : `${count} new drops today`,
    body: truncate(unseen[0].headline, 80),
    cta: 'See what’s new',
    href: '/drops',
    tone: TONE.drops,
    dropIds: unseen.map((drop) => drop.id),
  };
};

export const buildBriefingItems = (
  sources: BriefingSources,
  ctx: BriefingContext
): BriefingItem[] => {
  const content: (BriefingItem | null)[] = [
    buildPlanPhase(sources),
    buildCourse(sources),
    buildSkillTest(sources),
    buildFreeCourse(sources),
    buildVault(sources, ctx),
    buildDrops(sources, ctx),
    buildPlanProgress(sources),
  ];

  const items = content.filter((item): item is BriefingItem => item !== null).slice(0, MAX_BRIEFING_ITEMS - 1);
  if (items.length === 0) return [];
  return [buildGreeting(items.length, ctx), ...items];
};
