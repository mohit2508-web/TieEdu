import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CheckCircle2, Circle, CircleDot, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchCodeProblems, type CodeProblemRow } from '@/lib/codeApi';

const LEVELS: Record<number, { name: string; blurb: string }> = {
  1: { name: 'Level 1 · Number basics', blurb: 'Digits, primes, GCD. The Ninja warm-up.' },
  2: { name: 'Level 2 · Arrays', blurb: 'One-pass patterns, two pointers, hashing.' },
  3: { name: 'Level 3 · Strings', blurb: 'Words, characters, ciphers, sliding window.' },
  4: { name: 'Level 4 · Number systems and bits', blurb: 'Base conversion and XOR tricks.' },
  5: { name: 'Level 5 · TCS story problems', blurb: 'Easy logic in a long story. Validate and print exactly.' },
  6: { name: 'Level 6 · Digital and Prime', blurb: 'Prefix sums, binary search, greedy and DP.' },
};

/** The TCS NQT coding ladder: every problem by level, with the student's progress. */
export default function CodeIndex() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CodeProblemRow[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetchCodeProblems().then((r) => setRows(r.problems)).catch((e) => setError(e.message)); }, [user]);

  const solved = (rows || []).filter((r) => r.best?.solved).length;
  return (
    <>
      <Head><title>TCS NQT coding practice · TieEdu</title></Head>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <h1 className="font-display text-3xl font-bold text-heading">TCS NQT coding practice</h1>
        <p className="mt-2 text-base text-body">Part B gives you 2 problems in 90 minutes. Climb the ladder level by level: each problem runs on real test cases in C, C++, Java or Python.</p>
        {rows && <p className="mt-3 text-sm font-semibold text-heading">{solved} of {rows.length} solved</p>}
        {error && <p className="mt-6 text-sm text-red-700">{error}</p>}
        {!rows && !error && <p className="mt-6 text-muted">Loading…</p>}
        {rows && Object.entries(LEVELS).map(([lv, meta]) => {
          const list = rows.filter((r) => r.level === Number(lv));
          if (!list.length) return null;
          return (
            <section key={lv} className="mt-8">
              <h2 className="font-display text-xl font-bold text-heading">{meta.name}</h2>
              <p className="text-sm text-muted">{meta.blurb}</p>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                {list.map((r) => (
                  <li key={r.id}>
                    <Link href={`/code/${r.id}`} className="flex min-h-[56px] items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                      {r.best?.solved ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Solved" />
                        : r.best ? <CircleDot className="h-5 w-5 shrink-0 text-amber-deep" aria-label="Attempted" />
                        : <Circle className="h-5 w-5 shrink-0 text-muted" aria-label="Not tried" />}
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-heading">{r.title}</span>
                        <span className="block text-xs text-muted">{r.topic}{r.kind === 'pyq' ? ' · reported TCS question' : ''}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${r.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' : r.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{r.difficulty}</span>
                      {!r.free && <Lock className="h-4 w-4 shrink-0 text-muted" aria-label="Solutions in the pack" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </>
  );
}
