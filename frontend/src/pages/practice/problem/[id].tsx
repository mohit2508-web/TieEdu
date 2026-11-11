import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { Ide } from '@/components/ide/Ide';
import { fetchCodeProblem, type CodeProblemView } from '@/lib/codeApi';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorScreen } from '@/components/common/ErrorScreen';
import { ErrorState } from '@/components/common/ErrorState';

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
      <main className="mx-auto max-w-xl px-4 py-16">
        <ErrorState kind={/not found|no such|404/i.test(error) ? 'notfound' : 'network'} message={error} action={{ label: 'All problems', href: '/practice/dsa' }} />
      </main>
    );
  }
  if (!view) return <BrandLoader variant="fullscreen" caption="Opening the code editor…" />;
  return (
    <>
      <Head><title>{`${view.problem.title} · Practice · TieEdu`}</title></Head>
      <ErrorBoundary
        area="ide"
        resetKey={view.problem.id}
        fallback={({ errorRef, reset }) => (
          <ErrorScreen
            errorRef={errorRef || undefined}
            title="The editor crashed"
            message="Your code is saved in this browser. Reload the editor to carry on where you were."
            onRetry={reset}
          />
        )}
      >
        <Ide view={view} onReload={load} query={{ company, topic }} />
      </ErrorBoundary>
    </>
  );
}
