import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { PrepNav } from '@/components/prep/PrepNav';
import { LabBriefs } from '@/components/prep/LabBriefs';
import { PulseGate, PulseLoadState, usePulseLoad } from '@/components/pulse/PulseGate';
import { PulseScope } from '@/lib/pulse/scope';
import { pulseApi } from '@/lib/pulse/api';
import { fetchPrep, type PrepView } from '@/lib/prepApi';
import PulseStudentHome from '@/pages/project-pulse/student';
import PulseJoin from '@/pages/project-pulse/join';
import PulseTeacherHome from '@/pages/project-pulse/teacher';
import PulseClassPage from '@/pages/project-pulse/teacher/class/[classId]';
import PulseNewTask from '@/pages/project-pulse/teacher/class/[classId]/new';
import PulseTaskDashboard from '@/pages/project-pulse/teacher/task/[taskId]';
import PulseEditTask from '@/pages/project-pulse/teacher/task/[taskId]/edit';
import PulseReviewPage from '@/pages/project-pulse/teacher/task/[taskId]/review';
import PulseStudentPage from '@/pages/project-pulse/teacher/task/[taskId]/[studentId]';

/**
 * The Lab tab: Project Pulse inside the program, scoped to its lab pack.
 * A teacher lands on their lab classes and gets the whole teacher flow
 * (dashboard, student code, review, edit); a student gets the lab briefs with
 * their own Pulse status and their own progress page. Nothing else of Pulse,
 * and no other class, shows here. Access is still decided by the Pulse API.
 */

const route = (path: string[]): { view: React.ComponentType; params: Record<string, string> } | null => {
  const [a, b, c, d] = path;
  if (a === 'student' && !b) return { view: PulseStudentHome, params: {} };
  if (a === 'join' && !b) return { view: PulseJoin, params: {} };
  if (a !== 'teacher') return null;
  if (!b) return { view: PulseTeacherHome, params: {} };
  if (b === 'class' && c) return d === 'new' ? { view: PulseNewTask, params: { classId: c } } : d ? null : { view: PulseClassPage, params: { classId: c } };
  if (b === 'task' && c) {
    if (!d) return { view: PulseTaskDashboard, params: { taskId: c } };
    if (d === 'edit') return { view: PulseEditTask, params: { taskId: c } };
    if (d === 'review') return { view: PulseReviewPage, params: { taskId: c } };
    return { view: PulseStudentPage, params: { taskId: c, studentId: d } };
  }
  return null;
};

/** No sub-path: teachers get their lab classes, everyone else the lab briefs. */
const Landing: React.FC<{ prep: PrepView; base: string }> = ({ prep, base }) => {
  const { data: me, error, reload } = usePulseLoad(() => pulseApi.me(), []);
  if (!me) return <PulseLoadState title="Lab" error={error} onRetry={reload} />;
  if (me.is_teacher || me.is_admin) return <PulseTeacherHome />;
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-8">
      <h1 className="mb-1 font-display text-3xl font-bold text-heading sm:text-4xl">Lab</h1>
      <p className="mb-6 text-base text-muted">Every hands-on lab from the handbook, with your progress in Project Pulse.</p>
      <LabBriefs lab={prep.lab!} sections={prep.sections} base={base} />
    </div>
  );
};

export default function PrepLabPage() {
  const router = useRouter();
  const { user } = useAuth();
  const slug = String(router.query.slug || '');
  const path = Array.isArray(router.query.path) ? router.query.path : [];
  const [prep, setPrep] = useState<PrepView | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (user && slug) fetchPrep(slug).then(setPrep).catch((e) => setError(e.message)); }, [user, slug]);

  const base = `/prep/${slug}/lab`;
  const page = path.length ? route(path) : null;
  const { slug: _s, path: _p, ...rest } = router.query;
  const body = !prep
    ? <main className="mx-auto max-w-5xl px-4 py-16 text-center text-base text-muted" aria-busy={!error}>{error || 'Loading the lab…'}</main>
    : !prep.lab
      ? <main className="mx-auto max-w-xl px-4 py-16 text-center text-base text-muted">This program has no lab.</main>
      : (
        <PulseScope value={{ base, pack: prep.lab.pack, query: { ...rest, ...(page?.params || {}) } }}>
          {path.length && !page
            ? <main className="mx-auto max-w-xl px-4 py-16 text-center text-base text-muted">This lab page does not exist.</main>
            : page ? <page.view /> : <PulseGate title="Lab"><div className="pt-6"><Landing prep={prep} base={base} /></div></PulseGate>}
        </PulseScope>
      );

  return (
    <>
      <Head><title>{`${prep?.company.name || 'Lab'} lab | TiEEdu`}</title></Head>
      {prep && <PrepNav slug={slug} name={prep.company.name} active="lab" lab={!!prep.lab} wide />}
      {user ? body : <PulseGate title="Lab">{null}</PulseGate>}
    </>
  );
}
