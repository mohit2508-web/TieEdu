import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Bell, Flame, HandHeart, Lock, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Chip, Skeleton } from '@/components/ui';
import { fetchCompanies } from '@/lib/api';
import {
  fetchGroup, fetchMyGroups, joinGroup, leaveGroup, markNudgesSeen, sendNudge, updateGroupSettings,
  type GroupMember, type GroupSettings, type GroupView, type MyGroups,
} from '@/lib/studyGroupsApi';

/*
 * Company study groups (C3). Students preparing for the same company see each
 * other's practice and nudge each other. Opt-in, a chosen display name, and
 * preset nudges only (backend lib/studyGroups).
 */

const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const fmtDay = (d: string) => shortDate.format(new Date(`${d}T00:00:00+05:30`));

export default function StudyGroupsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const slug = typeof router.query.c === 'string' ? router.query.c : '';

  return (
    <>
      <Head>
        <title>Study groups · TieEdu</title>
        <meta name="description" content="Prepare for a company together: see who else is practising and nudge each other to keep going." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        {!loading && !user && (
          <>
            <Intro />
            <Card pad="lg" className="mt-6 text-center">
              <p className="font-display text-xl font-bold text-heading">Sign in to join a study group</p>
              <p className="mt-1 text-sm text-muted">You choose the name others see. Nobody sees your email or college.</p>
              <Button href={`/login?next=${encodeURIComponent(slug ? `/study-groups?c=${slug}` : '/study-groups')}`} className="mt-4">Sign in</Button>
            </Card>
          </>
        )}
        {user && router.isReady && (slug ? <Group slug={slug} /> : <Index />)}
      </main>
    </>
  );
}

function Intro() {
  return (
    <>
      <p className="eyebrow text-signal">Study groups</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Prepare together, keep each other going</h1>
      <p className="mt-2 text-base text-body">
        Join the group for a company you are preparing for. See who practised this week, and send a friendly nudge when someone goes quiet.
      </p>
    </>
  );
}

function Index() {
  const [data, setData] = useState<MyGroups | null>(null);
  const [companies, setCompanies] = useState<Array<{ name: string; slug: string }>>([]);
  const [pick, setPick] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchMyGroups()
      .then((d) => {
        setData(d);
        // Shown once; mark read so the count clears next time.
        if (d.inbox.unread > 0) markNudgesSeen().catch(() => { /* stays unread; harmless */ });
      })
      .catch(() => setErr('Your groups could not be loaded. Check your connection and try again.'));
    fetchCompanies()
      .then((cs) => setCompanies((cs || []).map((c: any) => ({ name: c.name, slug: c.slug })).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => { /* the select shows its placeholder */ });
  }, []);

  return (
    <>
      <Intro />
      {err && <p className="mt-4 text-sm text-danger">{err}</p>}
      {!data && !err && <Skeleton className="mt-6 h-32 w-full rounded-[14px]" />}

      {data && data.inbox.items.length > 0 && (
        <section className="mt-6" aria-labelledby="nudges-h">
          <h2 id="nudges-h" className="flex items-center gap-2 font-display text-lg font-bold text-heading">
            <Bell className="h-5 w-5 text-signal" aria-hidden /> Nudges for you
            {data.inbox.unread > 0 && <span className="rounded-full bg-signal px-2 py-0.5 text-xs font-bold text-white">{data.inbox.unread} new</span>}
          </h2>
          <ul className="mt-3 space-y-2">
            {data.inbox.items.slice(0, 5).map((n) => (
              <li key={n.id} className={`rounded-[14px] border p-3.5 text-sm ${n.seen ? 'border-line bg-card text-body' : 'border-signal/40 bg-signal-soft text-heading'}`}>
                {n.text}
                <span className="mt-1 flex flex-wrap items-center gap-x-3 text-muted">
                  {shortDate.format(new Date(n.created_at))}
                  <Link href="/daily" className="inline-flex min-h-[32px] items-center font-semibold text-signal hover:underline">Practise now</Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && (
        <section className="mt-8" aria-labelledby="mine-h">
          <h2 id="mine-h" className="font-display text-lg font-bold text-heading">Your groups</h2>
          {data.groups.length === 0 && <p className="mt-2 text-sm text-muted">You have not joined a group yet.</p>}
          <ul className="mt-3 space-y-2">
            {data.groups.map((g) => (
              <li key={g.company.slug}>
                <Link href={`/study-groups?c=${encodeURIComponent(g.company.slug)}`} className="focus-ring group flex items-center gap-3 rounded-[14px] border border-line bg-card p-4 hover:border-line-strong">
                  <Users className="h-5 w-5 shrink-0 text-signal" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-heading group-hover:text-signal">{g.company.name}</span>
                    <span className="block text-sm text-muted">{g.members} member{g.members === 1 ? '' : 's'} · {g.practised_today} other{g.practised_today === 1 ? '' : 's'} practised today</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.suggestions.length > 0 && (
        <section className="mt-8" aria-labelledby="sugg-h">
          <h2 id="sugg-h" className="font-display text-lg font-bold text-heading">For companies on your calendar</h2>
          <ul className="mt-3 space-y-2">
            {data.suggestions.map((s) => (
              <li key={s.company.slug}>
                <Link href={`/study-groups?c=${encodeURIComponent(s.company.slug)}`} className="focus-ring group flex items-center gap-3 rounded-[14px] border border-dashed border-line bg-card p-4 hover:border-line-strong">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-heading group-hover:text-signal">{s.company.name}</span>
                    <span className="block text-sm text-muted">{s.members === 0 ? 'Be the first to join' : `${s.members} preparing together`}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && (
        <Card pad="lg" className="mt-8">
          <label className="block">
            <span className="text-sm font-semibold text-heading">Find a company’s group</span>
            <select value={pick} onChange={(e) => setPick(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading">
              <option value="">Choose a company</option>
              {companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
          <Button href={pick ? `/study-groups?c=${encodeURIComponent(pick)}` : undefined} disabled={!pick} className="mt-3">Open the group</Button>
        </Card>
      )}
    </>
  );
}

function Group({ slug }: { slug: string }) {
  const [view, setView] = useState<GroupView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<GroupSettings>({ name_mode: 'first_name', share_test_date: false, nudges_ok: true });
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setView(null);
    setErr(null);
    fetchGroup(slug).then(setView).catch((e) => setErr((e as Error).message));
  }, [slug]);

  const run = async (fn: () => Promise<GroupView | void>, done?: string) => {
    setBusy(true);
    setErr(null);
    try {
      const v = await fn();
      if (v) setView(v);
      if (done) { setFlash(done); setTimeout(() => setFlash(null), 3000); }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <Link href="/study-groups" className="inline-flex min-h-[36px] items-center gap-1 text-sm font-semibold text-signal hover:underline">
      <ArrowLeft className="h-4 w-4" aria-hidden /> All study groups
    </Link>
  );

  if (err && !view) return <>{back}<p className="mt-4 text-sm text-danger">{err}</p></>;
  if (!view) return <>{back}<Skeleton className="mt-4 h-48 w-full rounded-[14px]" /></>;

  const s = view.summary;
  return (
    <>
      {back}
      <p className="eyebrow mt-3 text-signal">Study group</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">{view.company.name}</h1>
      <p className="mt-2 text-base text-body">
        {s.members === 0 ? 'Nobody has joined yet. Start the group and the next student to prepare will find you.'
          : `${s.members} preparing together · ${s.practised_today} practised today · ${s.days_this_week} practice days between them this week.`}
      </p>

      {!view.joined && (
        <Card pad="lg" className="mt-6">
          <p className="font-display text-lg font-bold text-heading">Join the group</p>
          <p className="mt-1 flex items-start gap-2 text-sm text-muted">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            Members see the name you pick and how many days you practised this week. Never your email, college or scores. You can leave any time.
          </p>
          <SettingsFields form={form} setForm={setForm} hasTestDate={!!view.my_test_date} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => run(() => joinGroup(slug, form), 'You joined the group.')} disabled={busy}>{busy ? 'Joining…' : 'Join the group'}</Button>
            <Button kind="secondary" href={`/company/${encodeURIComponent(slug)}`}>See the company</Button>
          </div>
          {err && <p className="mt-3 text-sm text-danger">{err}</p>}
        </Card>
      )}

      {view.joined && (
        <>
          {flash && <p className="mt-4 rounded-xl bg-surface-hover px-3.5 py-2.5 text-sm text-heading" role="status">{flash}</p>}
          {err && <p className="mt-4 text-sm text-danger" role="alert">{err}</p>}
          <ul className="mt-6 space-y-3" aria-label="Members">
            {view.members.map((m) => (
              <MemberRow key={m.handle} m={m} kinds={view.nudge_kinds} busy={busy} onNudge={(kind, label) => run(() => sendNudge(slug, m.handle, kind), `Nudge sent to ${m.name}: “${label}”.`)} />
            ))}
          </ul>
          {view.hidden_members > 0 && <p className="mt-2 text-sm text-muted">And {view.hidden_members} more.</p>}

          <details className="mt-8 rounded-[14px] border border-line bg-card p-4">
            <summary className="focus-ring cursor-pointer font-bold text-heading">Your settings in this group</summary>
            <GroupSettingsForm initial={view.settings} busy={busy} onSave={(f) => run(() => updateGroupSettings(slug, f), 'Settings saved.')} />
            <Button kind="text" className="mt-4 text-danger" onClick={() => run(async () => { await leaveGroup(slug); setView(await fetchGroup(slug)); }, 'You left the group.')} disabled={busy}>
              Leave the group
            </Button>
          </details>
        </>
      )}
    </>
  );
}

function MemberRow({ m, kinds, busy, onNudge }: { m: GroupMember; kinds: Array<{ id: string; label: string }>; busy: boolean; onNudge: (kind: string, label: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <Card>
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${m.active_today ? 'bg-success/15 text-success' : 'bg-surface-hover text-muted'}`} aria-hidden>
            {m.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-heading">{m.name}{m.me && <span className="font-normal text-muted"> (you)</span>}</p>
            <p className="text-sm text-muted">
              {m.last_active} · {m.days_this_week} of 7 days this week
              {m.streak >= 2 && <span className="ml-1 inline-flex items-center gap-0.5 text-heading"><Flame className="h-3.5 w-3.5 text-money" aria-hidden />{m.streak}-day streak</span>}
              {m.test_date && ` · test on ${fmtDay(m.test_date)}`}
            </p>
            {open && m.can_nudge && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Nudge ${m.name}`}>
                {kinds.map((k) => (
                  <Chip key={k.id} onClick={() => { setOpen(false); onNudge(k.id, k.label); }}>{k.label}</Chip>
                ))}
              </div>
            )}
            {!m.me && !m.can_nudge && m.nudge_note && <p className="mt-1 text-xs text-muted">{m.nudge_note}</p>}
          </div>
          {m.can_nudge && (
            <button type="button" onClick={() => setOpen((o) => !o)} disabled={busy} aria-expanded={open} className="focus-ring inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-heading hover:bg-surface-hover">
              <HandHeart className="h-4 w-4 text-signal" aria-hidden /> Nudge
            </button>
          )}
        </div>
      </Card>
    </li>
  );
}

function SettingsFields({ form, setForm, hasTestDate }: { form: GroupSettings; setForm: (f: GroupSettings) => void; hasTestDate: boolean }) {
  return (
    <div className="mt-4 space-y-3">
      <fieldset>
        <legend className="text-sm font-semibold text-heading">Show me as</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip selected={form.name_mode === 'first_name'} onClick={() => setForm({ ...form, name_mode: 'first_name' })}>My first name</Chip>
          <Chip selected={form.name_mode === 'initials'} onClick={() => setForm({ ...form, name_mode: 'initials' })}>My initials</Chip>
        </div>
      </fieldset>
      <label className="flex items-start gap-2 text-sm text-body">
        <input type="checkbox" checked={form.share_test_date} onChange={(e) => setForm({ ...form, share_test_date: e.target.checked })} className="mt-0.5 h-4 w-4 accent-signal" />
        <span>Show my test date to the group{!hasTestDate && <span className="text-muted"> (add one on your calendar first)</span>}</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-body">
        <input type="checkbox" checked={form.nudges_ok} onChange={(e) => setForm({ ...form, nudges_ok: e.target.checked })} className="mt-0.5 h-4 w-4 accent-signal" />
        <span>Members can nudge me (at most three a day)</span>
      </label>
    </div>
  );
}

function GroupSettingsForm({ initial, busy, onSave }: { initial: GroupSettings; busy: boolean; onSave: (f: GroupSettings) => void }) {
  const [form, setForm] = useState(initial);
  return (
    <>
      <SettingsFields form={form} setForm={setForm} hasTestDate />
      <Button kind="secondary" className="mt-4" onClick={() => onSave(form)} disabled={busy}>Save settings</Button>
    </>
  );
}
