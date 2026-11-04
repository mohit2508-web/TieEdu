import React from 'react';

export interface CourseFrameworkData {
  title: string;
  intro: string;
  pillars: {
    letter: string;
    name: string;
    tagline: string;
    color: string;
    modules: { id: string; title: string; sort_order: number }[];
  }[];
  steps: { title: string; text: string }[];
  principles: { title: string; text: string }[];
}

/**
 * The course's teaching framework (e.g. AI.FIRST's F.I.R.S.T.), shown at the
 * top of the course page so a learner sees what the name means before the
 * syllabus. The server resolves each pillar's modules from the real syllabus,
 * so the counts and module numbers here cannot drift from it.
 */
export const CourseFramework: React.FC<{ framework: CourseFrameworkData }> = ({ framework }) => {
  const numbersOf = (ms: { sort_order: number }[]) => ms.map((m) => m.sort_order).sort((a, b) => a - b);
  const range = (ns: number[]) => (ns.length === 0 ? '' : ns.length === 1 ? `Module ${ns[0]}` : `Modules ${ns[0]}–${ns[ns.length - 1]}`);

  return (
    <section className="mb-10" aria-labelledby="course-framework-title">
      <h2 id="course-framework-title" className="font-serif text-2xl font-bold text-[var(--ink)] sm:text-3xl">
        {framework.title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">{framework.intro}</p>

      <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {framework.pillars.map((p) => {
          const ns = numbersOf(p.modules);
          return (
            <li
              key={p.letter}
              className="flex flex-col rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
              style={{ borderTop: `5px solid ${p.color}` }}
            >
              <span className="font-serif text-4xl font-bold leading-none" style={{ color: p.color }} aria-hidden>
                {p.letter}
              </span>
              <h3 className="mt-3 text-base font-bold text-[var(--ink)]">{p.name}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--text-body)]">{p.tagline}</p>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {ns.length} module{ns.length === 1 ? '' : 's'} · {range(ns)}
              </p>
              <ul className="mt-2 space-y-0.5">
                {p.modules.map((m) => (
                  <li key={m.id} className="truncate text-xs text-[var(--text-muted)]" title={m.title}>
                    {m.title.replace(/^Module (\d+) — /, '$1. ')}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      {framework.steps.length > 0 && (
        <>
          <h3 className="mt-10 font-serif text-xl font-bold text-[var(--ink)] sm:text-2xl">How every module runs</h3>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {framework.steps.map((s, i) => (
              <li key={s.title} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 text-center">
                <p className="font-serif text-lg font-bold text-[#3E8A8A]">
                  {i + 1} {s.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-body)]">{s.text}</p>
              </li>
            ))}
          </ol>
        </>
      )}

      {framework.principles.length > 0 && (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {framework.principles.map((p) => (
            <li key={p.title} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
              <p className="text-base font-bold text-[var(--ink)]">{p.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-body)]">{p.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
