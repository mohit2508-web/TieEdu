import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Plus, Send, Check, Trash2, Copy, KeyRound, UserPlus, ChevronRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PulseShell } from '@/components/pulse/PulseUi';
import { PulseGate, PulseLoadState, usePulseLoad } from '@/components/pulse/PulseGate';
import { pulseApi, type ClassDetail } from '@/lib/pulse/api';
import { fmtDateTime } from '@/lib/pulse/demo';

/**
 * Project Pulse — one class: tasks, roster, invites, join code, co-teachers.
 * Invites go out by email; the one-time links are also shown so the teacher
 * can share them on WhatsApp if mail is slow.
 */

const input = 'w-full rounded-cell border border-line-strong/60 bg-card px-3 text-sm text-body focus:outline focus:outline-2 focus:outline-[var(--focus)]';
const primary = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-cell bg-signal px-4 text-sm font-semibold text-on-primary shadow-edge-primary disabled:opacity-50';
const ghost = 'inline-flex h-8 items-center gap-1 rounded-well border border-line px-2.5 text-xs font-semibold text-heading hover:bg-surface-hover disabled:opacity-50';

/** "email, name, roll" per line; a header row or a bare email both work. */
const parseEntries = (text: string) => text.split(/\r?\n/).map((l) => l.split(/[,\t;]/).map((x) => x.trim())).filter((c) => c[0] && c[0].includes('@'))
  .map(([email, name, roll_no]) => ({ email, name, roll_no }));

const ClassBody: React.FC<{ id: string }> = ({ id }) => {
  const { data: cls, error, reload, setData } = usePulseLoad<ClassDetail>(() => pulseApi.cls(id), [id]);
  const [text, setText] = useState('');
  const [links, setLinks] = useState<{ email: string; link: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [co, setCo] = useState({ name: '', email: '' });
  if (!cls) return <PulseLoadState title="Class" error={error} onRetry={reload} />;

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg(ok); await reload(); } catch (e: any) { setMsg(e?.message || 'That did not work.'); } finally { setBusy(false); }
  };
  const entries = parseEntries(text);
  const invite = () => run(async () => {
    const r = await pulseApi.invite(cls.id, entries);
    setData(r); setText(''); setLinks(r.links);
    setMsg(`${r.invited} invited, ${r.emailed} emailed${r.skipped.length ? `; skipped ${r.skipped.join(', ')}` : ''}.`);
  });
  const counts = { active: 0, invited: 0, pending: 0 } as Record<string, number>;
  cls.roster.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

  return (
    <PulseShell title={cls.name} role={null} crumbs={[{ href: '/project-pulse/teacher', label: 'My classes' }]}
      actions={<Link href={`/project-pulse/teacher/class/${cls.id}/new`} className={primary}><Plus className="h-4 w-4" /> New task</Link>}>
      {msg ? <p role="status" className="mb-4 rounded-cell bg-secondary-soft px-4 py-2.5 text-sm text-secondary">{msg}</p> : null}

      <section className="rounded-card border border-line bg-card">
        <h2 className="border-b border-line px-5 py-3 font-display text-h3 text-heading">Tasks</h2>
        <ul className="divide-y divide-line">
          {cls.tasks.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
              <Link href={`/project-pulse/teacher/task/${t.id}`} className="min-w-0 flex-1">
                <span className="font-semibold text-heading hover:text-link">{t.title}</span>
                {!t.published ? <span className="ml-2 rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold text-muted">Draft</span> : null}
                <span className="block text-xs text-muted">Due {fmtDateTime(t.deadline_at)} · {t.linked} repos linked · {t.done} done</span>
              </Link>
              <div className="flex gap-1.5">
                <Link href={`/project-pulse/teacher/task/${t.id}/edit`} className={ghost}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
                <Link href={`/project-pulse/teacher/task/${t.id}`} className={ghost}>Dashboard <ChevronRight className="h-3.5 w-3.5" /></Link>
              </div>
            </li>
          ))}
          {!cls.tasks.length ? <li className="px-5 py-6 text-sm text-muted">No tasks yet. Create one, add its requirements and test cases, then publish it.</li> : null}
        </ul>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-card border border-line bg-card">
          <h2 className="flex items-center justify-between border-b border-line px-5 py-3 font-display text-h3 text-heading">
            Students <span className="text-xs font-semibold text-muted">{counts.active} joined · {counts.invited} invited · {counts.pending} to approve</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-app-warm text-left text-xs text-muted"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Roll</th><th className="px-4 py-2">Status</th><th className="px-4 py-2" /></tr></thead>
              <tbody>
                {cls.roster.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-4 py-2 font-semibold text-heading">{r.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-body">{r.email}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted">{r.roll_no || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', r.status === 'active' ? 'bg-success-soft text-success' : r.status === 'pending' ? 'bg-warning-soft text-warning' : 'bg-surface-hover text-muted')}>
                        {r.status === 'active' ? 'Joined' : r.status === 'pending' ? 'Asked to join' : 'Invited'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        {r.status === 'pending' ? <button type="button" disabled={busy} className={ghost} onClick={() => run(() => pulseApi.approve(r.id), `${r.name} approved.`)}><Check className="h-3.5 w-3.5" /> Approve</button> : null}
                        {r.status === 'invited' ? <button type="button" disabled={busy} className={ghost} onClick={() => run(async () => { const x = await pulseApi.resend(r.id); setLinks([{ email: r.email, link: x.link }]); }, `Invite sent again to ${r.email}.`)}><Send className="h-3.5 w-3.5" /> Resend</button> : null}
                        <button type="button" disabled={busy} aria-label={`Remove ${r.name}`} className="rounded-well p-1.5 text-muted hover:bg-danger-soft hover:text-error"
                          onClick={() => { if (window.confirm(`Remove ${r.name} from ${cls.name}? They lose access at once.`)) run(() => pulseApi.removeStudent(r.id)); }}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!cls.roster.length ? <tr><td colSpan={5} className="px-4 py-6 text-sm text-muted">Nobody yet. Invite students on the right.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-card border border-line bg-card p-4">
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-heading"><UserPlus className="h-4 w-4" /> Invite students</h2>
            <p className="mt-1 text-xs text-muted">One per line: <span className="font-mono">email, name, roll no</span>. Paste from a spreadsheet works.</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className={`${input} mt-2 py-2 font-mono text-xs`}
              placeholder={'asha@college.edu.in, Asha Rao, 22CS101\nravi@college.edu.in, Ravi K, 22CS102'} aria-label="Students to invite" />
            <button type="button" disabled={!entries.length || busy} onClick={invite} className={`${primary} mt-2 w-full`}><Send className="h-4 w-4" /> Invite {entries.length || ''} &amp; email the join code</button>
            {links.length ? (
              <details className="mt-3 rounded-well bg-app-warm p-2 text-xs" open>
                <summary className="cursor-pointer font-semibold text-heading">One-time join links ({links.length})</summary>
                <ul className="mt-2 space-y-1">
                  {links.map((l) => (
                    <li key={l.email} className="flex items-center gap-1">
                      <span className="min-w-0 flex-1 truncate">{l.email}</span>
                      <button type="button" className={ghost} onClick={() => navigator.clipboard?.writeText(l.link)}><Copy className="h-3 w-3" /> Copy</button>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>

          <section className="rounded-card border border-line bg-card p-4">
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-heading"><KeyRound className="h-4 w-4" /> Join code</h2>
            <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-heading">{cls.join_code}</p>
            <p className="mt-1 text-xs text-muted">Every invite email includes this code. Students you invited by email get in at once with it; anyone else who uses it waits for your approval.</p>
            <button type="button" disabled={busy} className={`${ghost} mt-2`} onClick={() => run(() => pulseApi.updateClass(cls.id, { new_code: true }), 'New code made; the old one stops working.')}>New code</button>
          </section>

          {cls.is_owner ? (
            <section className="rounded-card border border-line bg-card p-4">
              <h2 className="font-display text-h3 text-heading">Co-teachers</h2>
              <p className="mt-0.5 text-xs text-muted">As many as you need. They see and manage this class like you. Someone without a teacher login is sent to the TieEdu admin to approve.</p>
              <ul className="mt-2 space-y-1 text-sm">
                {cls.co_teachers.map((t) => <li key={t.id}>{t.name}</li>)}
                {cls.co_requests.map((r) => <li key={r.id} className="text-muted">{r.name} · <span className="text-warning">waiting for admin</span></li>)}
                {!cls.co_teachers.length && !cls.co_requests.length ? <li className="text-muted">None</li> : null}
              </ul>
              <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); run(async () => {
                const r = await pulseApi.addCoTeacher(cls.id, co); setCo({ name: '', email: '' });
                setMsg(r.result === 'added' ? `${co.email} added as co-teacher.` : `Request sent to the TieEdu admin for ${co.email}. They are added once approved.`);
              }); }}>
                <input className={`${input} h-9`} required value={co.name} onChange={(e) => setCo({ ...co, name: e.target.value })} placeholder="Co-teacher’s name" aria-label="Co-teacher name" />
                <div className="flex gap-2">
                  <input className={`${input} h-9`} type="email" required value={co.email} onChange={(e) => setCo({ ...co, email: e.target.value })} placeholder="Their email" aria-label="Co-teacher email" />
                  <button className={ghost} disabled={busy}>Add</button>
                </div>
              </form>
              <button type="button" disabled={busy} className="mt-4 text-xs font-semibold text-error hover:underline"
                onClick={() => { if (window.confirm('Archive this class? Students lose access; data is kept.')) run(() => pulseApi.updateClass(cls.id, { archived: !cls.archived }), cls.archived ? 'Class restored.' : 'Class archived.'); }}>
                {cls.archived ? 'Restore class' : 'Archive class'}
              </button>
            </section>
          ) : null}
        </aside>
      </div>
    </PulseShell>
  );
};

export default function PulseClassPage() {
  const router = useRouter();
  const id = typeof router.query.classId === 'string' ? router.query.classId : '';
  return <PulseGate title="Class">{id ? <ClassBody id={id} /> : null}</PulseGate>;
}
