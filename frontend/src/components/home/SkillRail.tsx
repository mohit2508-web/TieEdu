import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BrainCircuit, Clock, FileCheck, Flame } from 'lucide-react';
import { Rail } from '@/components/home/Rail';
import { fetchSkillsApi, SkillTestSkill } from '@/lib/skillTestApi';

const CARD_W = 'w-[70vw] max-w-[260px] sm:w-[240px] lg:w-[260px]';

/* Deterministic tint per category — same category, same colour, every render. */
const TINTS = [
  'text-signal bg-signal-soft',
  'text-success bg-surface-hover',
  'text-amber-deep bg-warning-soft',
  'text-[#7C3AED] bg-[#F1EBFE]',
];
const tintFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
};

/**
 * A skill test in the rail: icon, name, the two numbers that decide a click
 * (questions, minutes) and the certificate promise. No description — the
 * detail page owns prose; the rail only has to earn the tap.
 */
const SkillRailCard: React.FC<{ skill: SkillTestSkill }> = ({ skill }) => (
  <Link
    href={`/skill-test/${skill.slug}`}
    className={`vault-card group flex flex-col gap-3 p-4 ${CARD_W}`}
  >
    <div className="flex items-start justify-between gap-2">
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tintFor(skill.category || skill.name)}`}
      >
        <BrainCircuit className="w-5 h-5" aria-hidden />
      </span>
      {skill.isPopular && (
        <span className="inline-flex items-center gap-1 rounded-full bg-signal-soft border border-signal/30 px-2 py-0.5 text-xs font-extrabold text-danger">
          <Flame className="w-3 h-3" aria-hidden /> Popular
        </span>
      )}
    </div>

    <div>
      <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-heading transition-colors group-hover:text-signal">
        {skill.name}
      </h3>
      <p className="mt-0.5 text-xs font-semibold text-[var(--text-muted)]">{skill.category}</p>
    </div>

    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-1 text-xs font-bold text-body">
        <FileCheck className="w-3.5 h-3.5" aria-hidden /> {skill.totalQuestions} Q
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-1 text-xs font-bold text-body">
        <Clock className="w-3.5 h-3.5" aria-hidden /> {skill.avgCompletionTime} min
      </span>
      {skill.certificateAvailable && (
        <span className="inline-flex items-center rounded-full bg-surface-hover border border-line px-2 py-1 text-xs font-bold text-success">
          Certificate
        </span>
      )}
    </div>

    <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-bold text-signal">
      Start test
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </span>
  </Link>
);

/**
 * Self-fetching "Free skill tests" rail. `isPopular` (a field the server has
 * always returned and nothing ever rendered) leads the row — it is the only
 * trending signal the test catalogue has. Silent on failure, like every other
 * homepage rail.
 */
export const SkillRail: React.FC = () => {
  const [skills, setSkills] = useState<SkillTestSkill[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchSkillsApi()
      .then((all) => {
        if (!active) return;
        const list = all
          .filter((s) => s.status === 'active')
          .sort(
            (a, b) =>
              Number(b.isPopular) - Number(a.isPopular) || a.displayOrder - b.displayOrder
          )
          .slice(0, 12);
        setSkills(list);
      })
      .catch(() => {
        if (active) setSkills([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (skills !== null && skills.length === 0) return null;

  return (
    <Rail
      id="skill-tests"
      eyebrow="Free"
      title="Skill tests"
      seeAllHref="/skill-test"
      seeAllLabel="See all"
      loading={skills === null}
      tone="white"
      skeletonWidth={CARD_W}
      skeletonHeight="h-[236px]"
    >
      {skills?.map((s) => (
        <SkillRailCard key={s.id} skill={s} />
      ))}
    </Rail>
  );
};

export default SkillRail;
