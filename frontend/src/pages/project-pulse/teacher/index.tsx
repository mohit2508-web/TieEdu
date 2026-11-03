import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Plus, Users, ListChecks, ChevronRight, ShieldCheck, Trash2, Sparkles, Github } from 'lucide-react';
import { PulseShell } from '@/components/pulse/PulseUi';
import { PulseGate, PulseLoadState, usePulseLoad } from '@/components/pulse/PulseGate';
import { pulseApi, type PulseMe } from '@/lib/pulse/api';

/**
 * Project Pulse — teacher home: my classes, create a class; for admins also
 * appoint teachers and switch AI review on (PROJECT_PULSE_PLAN.md §2).
 */

const input = 'h-10 w-full rounded-cell border border-line-strong/60 bg-card px-3 text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]';
const primary = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-cell bg-signal px-4 text-sm font-semibold text-on-primary shadow-edge-primary disabled:opacity-50';

const AdminPanel: React.FC = () => {
  const { data, error, setData } = usePulseLoad(() => pulseApi.teachers(), []);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  if (error) return <p className="text-sm text-error">{error.message}</p>;
  if (!data) return null;
  const run = async (fn: () => Promise<Partial<typeof data>>) => {
    setMsg(null);
    try { const out = await fn(); setData({ ...data, ...out }); } catch (e: any) { setMsg(e?.message || 'Failed'); }
  };
  return (
    <section className="mt-8 rounded-card border border-line bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-h3 text-heading"><ShieldCheck className="h-4 w-4" /> Admin · teachers</h2>
      <p className="mt-0.5 text-xs text-muted">Only appointed teachers can create classes. They see only their own classes.</p>
      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await pulseApi.appoint(email); setEmail(''); return r; }); }}>
        <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@college.edu.in (must have a TieEdu account)" />
        <button className={primary} type="submit"><Plus className="h-4 w-4" /> Appoint teacher</button>
      </form>
      {msg ? <p className="mt-2 text-sm text-error">{msg}</p> : null}
      <ul className="mt-4 divide-y divide-line">
        {data.teachers.map((t) => (
          <li key={t.user_id} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="min-w-0 flex-1"><span className="font-semibold text-heading">{t.name}</span> <span className="text-muted">· {t.email} · {t.classes} classes</span></span>
            <button type="button" onClick={() => { if (window.confirm(`Remove ${t.name} as a teacher?`)) run(() => pulseApi.revoke(t.user_id)); }} aria-label={`Remove ${t.name}`} className="rounded-well p-2 text-muted hover:bg-danger-soft hover:text-error"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {!data.teachers.length ? <li className="py-3 text-sm text-muted">No teachers yet.</li> : null}
      </ul>
      <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-cell bg-app-warm p-3 text-sm">
          <input type="checkbox" className="mt-1" checked={data.ai_review} disabled={!data.ai_key} onChange={(e) => run(() => pulseApi.setAi(e.target.checked))} />
          <span><span className="flex items-center gap-1 font-semibold text-heading"><Sparkles className="h-4 w-4" /> AI requirement review</span>
            <span className="text-xs text-muted">{data.ai_key ? 'Claude reads each repo against the requirements. Off: the teacher’s hints decide.' : 'Needs ANTHROPIC_API_KEY on the server.'}</span></span>
        </label>
        <p className="flex items-start gap-3 rounded-cell bg-app-warm p-3 text-sm">
          <Github className="mt-0.5 h-4 w-4 shrink-0" />
          <span><span className="font-semibold text-heading">GitHub access: {data.github_token ? 'token set' : 'no token'}</span>
            <span className="block text-xs text-muted">{data.github_token ? '5,000 requests an hour; private repos work when the bot account is a collaborator.' : 'Set PULSE_GITHUB_TOKEN; without it GitHub allows 60 requests an hour.'}</span></span>
        </p>
      </div>
    </section>
  );
};

const Home: React.FC = () => {
  const router = useRouter();
  const { data: me, error, reload } = usePulseLoad<PulseMe>(() => pulseApi.me(), []);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Programming in C');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!me) return <PulseLoadState title="Teacher portal" error={error} onRetry={reload} />;

  if (!me.is_teacher) {
    return (
      <PulseShell title="Teacher portal" role={null}>
        <div className="mx-auto max-w-lg rounded-band border border-line bg-card p-8 text-center">
          <h2 className="font-display text-h2 text-heading">You are not a Pulse teacher yet</h2>
          <p className="mt-2 text-sm text-muted">Teachers are appointed by TieEdu. Ask your college’s TieEdu contact, or write to us from the Contact page.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/project-pulse/demo" className={primary}>See the demo</Link>
            {me.tasks.length ? <Link href="/project-pulse/student" className="inline-flex h-10 items-center rounded-cell border border-line px-4 text-sm font-semibold text-heading">My tasks</Link> : null}
          </div>
        </div>
      </PulseShell>
    );
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try { const c = await pulseApi.createClass({ name, subject }); router.push(`/project-pulse/teacher/class/${c.id}`); }
    catch (x: any) { setMsg(x?.message || 'Could not create the class.'); setBusy(false); }
  };

  return (
    <PulseShell title="My classes" role={null} actions={<Link href="/project-pulse/demo" className="text-sm font-semibold text-link">Demo</Link>}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {me.classes.map((c) => (
          <Link key={c.id} href={`/project-pulse/teacher/class/${c.id}`} className="group rounded-card border border-line bg-card p-5 transition-shadow hover:shadow-pop">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{c.subject}{c.role !== 'owner' ? ` · ${c.role === 'co' ? 'co-teacher' : 'admin view'}` : ''}</p>
            <h2 className="mt-1 font-display text-h2 text-heading group-hover:text-link">{c.name}</h2>
            <p className="mt-3 flex items-center gap-4 text-sm text-body">
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {c.students}</span>
              <span className="inline-flex items-center gap-1"><ListChecks className="h-4 w-4" /> {c.tasks} tasks</span>
              {c.pending ? <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">{c.pending} to approve</span> : null}
              <ChevronRight className="ml-auto h-4 w-4 text-muted" />
            </p>
          </Link>
        ))}
        <form onSubmit={create} className="rounded-card border border-dashed border-line-strong/60 bg-app-warm p-5">
          <p className="font-display text-h3 text-heading">New class</p>
          <input className={`${input} mt-3`} required value={name} onChange={(e) => setName(e.target.value)} placeholder="CSE 2A · 2026" aria-label="Class name" />
          <input className={`${input} mt-2`} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject" />
          {msg ? <p className="mt-2 text-xs text-error">{msg}</p> : null}
          <button className={`${primary} mt-3 w-full`} disabled={busy}><Plus className="h-4 w-4" /> Create class</button>
        </form>
      </div>
      {me.is_admin ? <AdminPanel /> : null}
    </PulseShell>
  );
};

export default function PulseTeacherHome() {
  return <PulseGate title="Teacher portal"><Home /></PulseGate>;
}
