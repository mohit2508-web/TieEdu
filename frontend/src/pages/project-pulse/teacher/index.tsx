import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Users, ListChecks, ChevronRight, ShieldCheck, Trash2, Github, Copy, Check, Send, KeyRound } from 'lucide-react';
import { PulseShell } from '@/components/pulse/PulseUi';
import { PulseGate, PulseLoadState, usePulseLoad } from '@/components/pulse/PulseGate';
import { pulseApi, type PulseMe } from '@/lib/pulse/api';
import { usePulseNav } from '@/lib/pulse/scope';

/**
 * Project Pulse — teacher home: my classes, create a class; for admins also
 * create teacher logins and approve co-teachers (PROJECT_PULSE_PLAN.md §2). No AI.
 */

const input = 'h-10 w-full rounded-cell border border-line-strong/60 bg-card px-3 text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]';
const primary = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-cell bg-signal px-4 text-sm font-semibold text-on-primary shadow-edge-primary disabled:opacity-50';

const LinkBox: React.FC<{ title: string; link: string; emailed: boolean }> = ({ title, link, emailed }) => (
  <div className="mt-3 rounded-cell bg-secondary-soft p-3 text-sm text-secondary">
    <p className="font-semibold">{title}</p>
    <p className="mt-0.5 text-xs">{emailed ? 'We emailed this link. ' : 'The email could not be sent; '}Share it on WhatsApp if needed. It works once and expires in 7 days.</p>
    <div className="mt-2 flex gap-2">
      <input readOnly value={link} className="h-9 min-w-0 flex-1 rounded-well border border-line bg-card px-2 font-mono text-xs text-body" aria-label="Set-password link" />
      <button type="button" onClick={() => navigator.clipboard?.writeText(link)} className="inline-flex h-9 items-center gap-1 rounded-well border border-line bg-card px-3 text-xs font-semibold text-heading"><Copy className="h-3.5 w-3.5" /> Copy</button>
    </div>
  </div>
);

const AdminPanel: React.FC = () => {
  const { data, error, setData } = usePulseLoad(() => pulseApi.teachers(), []);
  const [form, setForm] = useState({ name: '', email: '', college: '', password: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<{ title: string; link: string; emailed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  if (error) return <p className="text-sm text-error">{error.message}</p>;
  if (!data) return null;
  const run = async (fn: () => Promise<Partial<typeof data> | void>) => {
    setMsg(null); setBusy(true);
    try { const out = await fn(); if (out) setData({ ...data, ...out }); } catch (e: any) { setMsg(e?.message || 'Failed'); } finally { setBusy(false); }
  };
  const create = () => run(async () => {
    const r = await pulseApi.appoint({ ...form, password: form.password || undefined });
    setForm({ name: '', email: '', college: '', password: '' });
    setLink(r.created && r.link ? { title: `Login created for ${form.email}`, link: r.link, emailed: r.emailed } : null);
    if (r.password_set) setMsg(`Login created. Give ${form.email} the password you set; they sign in at tieedu.in/login.`);
    else if (!r.created) setMsg(`${form.email} already had a TieEdu account; they are now a teacher and sign in with their own password${form.password ? ' (the password you typed was not used; use Set password if needed)' : ''}.`);
    return { teachers: r.teachers };
  });
  return (
    <section className="mt-8 rounded-card border border-line bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-h3 text-heading"><ShieldCheck className="h-4 w-4" /> Admin · teachers <span className="text-sm font-semibold text-muted">({data.teachers.length})</span></h2>
      <p className="mt-0.5 text-xs text-muted">Teachers cannot register themselves. Create each login here: type a password and give it to them, or leave it empty to email them a set-password link. Every teacher sees only their own classes. No limit on how many.</p>
      <form className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); create(); }}>
        <input className={input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Teacher’s full name" aria-label="Teacher name" />
        <input className={input} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teacher@college.edu.in" aria-label="Teacher email" />
        <input className={input} value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="College (optional)" aria-label="College" />
        <input className={input} type="text" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (8+), or empty to email a link" aria-label="Password for the teacher" />
        <button className={primary} type="submit" disabled={busy}><Plus className="h-4 w-4" /> Create teacher login</button>
      </form>
      {msg ? <p className="mt-2 text-sm text-muted">{msg}</p> : null}
      {link ? <LinkBox {...link} /> : null}

      {data.co_requests.length ? (
        <div className="mt-5 rounded-cell border border-line p-3">
          <p className="text-sm font-semibold text-heading">Co-teacher requests ({data.co_requests.length})</p>
          <ul className="mt-2 divide-y divide-line">
            {data.co_requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1"><span className="font-semibold text-heading">{r.name}</span> <span className="text-muted">· {r.email} · for {r.class_name}, asked by {r.requested_by}</span></span>
                <span className="flex gap-1.5">
                  <button type="button" disabled={busy} className={`${primary} h-8 px-3 text-xs`} onClick={() => run(async () => {
                    const x = await pulseApi.decideCo(r.id, true);
                    setLink(x.created && x.link ? { title: `Login created for ${r.email}`, link: x.link, emailed: x.emailed } : null);
                    return { co_requests: x.requests, teachers: x.teachers };
                  })}><Check className="h-3.5 w-3.5" /> Approve</button>
                  <button type="button" disabled={busy} className="h-8 rounded-cell border border-line px-3 text-xs font-semibold text-muted hover:text-error"
                    onClick={() => run(async () => { const x = await pulseApi.decideCo(r.id, false); return { co_requests: x.requests }; })}>Reject</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mt-4 divide-y divide-line">
        {data.teachers.map((t) => (
          <li key={t.user_id} className="flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1">
              <span className="font-semibold text-heading">{t.name}</span> <span className="text-muted">· {t.email} · {t.classes} classes · co-teacher in {t.co_teaching}</span>
              {!t.has_password ? <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">Password not set yet</span> : null}
            </span>
            <span className="flex gap-1">
              {!t.has_password ? (
                <button type="button" disabled={busy} className="inline-flex h-8 items-center gap-1 rounded-well border border-line px-2.5 text-xs font-semibold text-heading hover:bg-surface-hover"
                  onClick={() => run(async () => { const x = await pulseApi.loginLink(t.user_id); setLink({ title: `New login link for ${t.email}`, link: x.link, emailed: x.emailed }); })}>
                  <Send className="h-3.5 w-3.5" /> Send login link
                </button>
              ) : null}
              <button type="button" disabled={busy} className="inline-flex h-8 items-center gap-1 rounded-well border border-line px-2.5 text-xs font-semibold text-heading hover:bg-surface-hover"
                onClick={() => { const pw = window.prompt(`New password for ${t.name} (${t.email}), 8+ characters. Give it to them yourself.`); if (pw) run(async () => { const x = await pulseApi.setPassword(t.user_id, pw); setMsg(`Password set for ${t.email}.`); return { teachers: x.teachers }; }); }}>
                <KeyRound className="h-3.5 w-3.5" /> Set password
              </button>
              <button type="button" onClick={() => { if (window.confirm(`Remove ${t.name} as a teacher? They lose the teacher portal at once.`)) run(() => pulseApi.revoke(t.user_id)); }} aria-label={`Remove ${t.name}`} className="rounded-well p-2 text-muted hover:bg-danger-soft hover:text-error"><Trash2 className="h-4 w-4" /></button>
            </span>
          </li>
        ))}
        {!data.teachers.length ? <li className="py-3 text-sm text-muted">No teachers yet.</li> : null}
      </ul>
      <div className="mt-4 border-t border-line pt-4">
        <p className="flex items-start gap-3 rounded-cell bg-app-warm p-3 text-sm">
          <Github className="mt-0.5 h-4 w-4 shrink-0" />
          <span><span className="font-semibold text-heading">GitHub access: {data.github_token ? 'token set' : 'no token'}</span>
            <span className="block text-xs text-muted">{data.github_token ? '5,000 requests an hour.' : 'Set PULSE_GITHUB_TOKEN; without it GitHub allows 60 requests an hour.'}</span></span>
        </p>
      </div>
    </section>
  );
};

const Home: React.FC = () => {
  const nav = usePulseNav();
  const { data: all, error, reload } = usePulseLoad<PulseMe>(() => pulseApi.me(), []);
  // Inside a Lab tab: only classes set up with that program's lab pack; new classes get the pack.
  const pack = nav.scope?.pack;
  const me = all && pack ? { ...all, classes: all.classes.filter((c) => c.pack === pack) } : all;
  const [name, setName] = useState('');
  const [subject, setSubject] = useState(pack ? '' : 'Programming in C');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!me) return <PulseLoadState title="Teacher portal" error={error} onRetry={reload} />;

  if (!me.is_teacher) {
    return (
      <PulseShell title="Teacher portal" role={null}>
        <div className="mx-auto max-w-lg rounded-band border border-line bg-card p-8 text-center">
          <h2 className="font-display text-h2 text-heading">You are not a Pulse teacher yet</h2>
          <p className="mt-2 text-sm text-muted">Teacher logins are created only by TieEdu admins; there is no sign-up for teachers. Ask your college’s TieEdu contact, or write to us from the Contact page.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href={nav.href('/project-pulse/demo')} className={primary}>See the demo</Link>
            {me.tasks.length ? <Link href={nav.href('/project-pulse/student')} className="inline-flex h-10 items-center rounded-cell border border-line px-4 text-sm font-semibold text-heading">My tasks</Link> : null}
          </div>
        </div>
      </PulseShell>
    );
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try { const c = await pulseApi.createClass(pack ? { name, subject, pack } : { name, subject }); nav.push(`/project-pulse/teacher/class/${c.id}`); }
    catch (x: any) { setMsg(x?.message || 'Could not create the class.'); setBusy(false); }
  };

  return (
    <PulseShell title={pack ? 'Lab classes' : 'My classes'} role={null} actions={pack ? null : <Link href={nav.href('/project-pulse/demo')} className="text-sm font-semibold text-link">Demo</Link>}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {me.classes.map((c) => (
          <Link key={c.id} href={nav.href(`/project-pulse/teacher/class/${c.id}`)} className="group rounded-card border border-line bg-card p-5 transition-shadow hover:shadow-pop">
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
          <input className={`${input} mt-2`} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={pack ? 'Subject (optional)' : 'Subject'} aria-label="Subject" />
          {pack ? <p className="mt-2 text-xs text-muted">Every lab of this program is added to the class as a published task.</p> : null}
          {msg ? <p className="mt-2 text-xs text-error">{msg}</p> : null}
          <button className={`${primary} mt-3 w-full`} disabled={busy}><Plus className="h-4 w-4" /> Create class</button>
        </form>
      </div>
      {me.is_admin && !pack ? <AdminPanel /> : null}
    </PulseShell>
  );
};

export default function PulseTeacherHome() {
  return <PulseGate title="Teacher portal"><Home /></PulseGate>;
}
