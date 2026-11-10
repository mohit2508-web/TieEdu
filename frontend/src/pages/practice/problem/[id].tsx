import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { Ide } from '@/components/ide/Ide';
import { fetchCodeProblem, type CodeProblemView } from '@/lib/codeApi';

/**
 * The practice IDE page. Full screen (no site header: navConfig SHELL_EXCLUDED_ROUTES).
 * ?company=<slug> or ?topic=<key> decides the problem list and prev/next.
 */
export default function PracticeProblemPage() {
  const router = useRouter();
  const { user } = useAuth();
  const id = String(router.query.id || '');
  const company = router.query.company ? String(router.query.company) : undefined;
  const topic = router.query.topic ? String(router.query.topic) : undefined;
  const [view, setView] = useState<CodeProblemView | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    fetchCodeProblem(id, { company, topic }).then((v) => { setView(v); setError(''); }).catch((e) => setError(e.message));
  }, [id, company, topic]);
  useEffect(() => { setView(null); load(); }, [load, user?.id]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-lg text-heading">{error}</p>
        <Link href="/practice/dsa" className="btn btn-primary mt-6 inline-flex min-h-[48px] px-6">Back to practice</Link>
      </main>
    );
  }
  if (!view) return <main className="flex min-h-screen items-center justify-center text-base text-muted">Loading the problem…</main>;
  return (
    <>
      <Head><title>{`${view.problem.title} · Practice · TieEdu`}</title></Head>
      <Ide view={view} onReload={load} query={{ company, topic }} />
    </>
  );
}
