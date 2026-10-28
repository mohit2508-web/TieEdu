import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { Check, Info, RotateCw, Send, Undo2, X } from 'lucide-react';
import { RequirePlacement } from '@/components/placement/RequirePlacement';
import { TpoShell } from '@/components/tpo/TpoShell';
import { usePlacement } from '@/context/PlacementContext';
import { Button, Card, Chip, EmptyState, Skeleton } from '@/components/ui';
import { fetchCompanies } from '@/lib/api';
import {
  approveCollegeNudge, draftCollegeNudge, getCollegeNudges, rejectCollegeNudge, withdrawCollegeNudge,
  type CollegeNudgeData, type CollegeNudgeRow, type NudgeSegment,
} from '@/lib/placementApi';

/**
 * One-click nudges (E1). Pick a group from batch readiness, a preset message
 * and an optional short line. A T&P Officer's nudge waits for the T&P Head;
 * the Head's goes straight out. Students can turn college nudges off; this
 * page shows only how many have (backend lib/collegeNudges).
 */

const STATUS_LABEL: Record<CollegeNudgeRow['status'], string> = { pending: 'Waiting for the T&P Head', sent: 'Sent', rejected: 'Not approved', withdrawn: 'Withdrawn' };
const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const NudgesBody: React.FC = () => {
  const { activeCollegeId } = usePlacement();
  const [data, setData] = useState<CollegeNudgeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ name: string; slug: string }>>([]);
  const [segments, setSegments] = useState<NudgeSegment[]>(['at_risk']);
  const [branch, setBranch] = useState('');
  const [batch, setBatch] = useState('');
  const [preset, setPreset] = useState('come_back');
  const [company, setCompany] = useState('');
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setError(null);
    getCollegeNudges(activeCollegeId).then(setData).catch((e) => setError(e?.message || 'Nudges could not be loaded.'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the officer switches college
  useEffect(load, [activeCollegeId]);
  useEffect(() => {
    fetchCompanies().then((cs) => setCompanies((cs || []).map((c: any) => ({ name: c.name, slug: c.slug })).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
  }, []);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      load();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'That did not work.' });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <EmptyState icon={RotateCw} title="Nudges could not be loaded." note={error} action={{ label: 'Try again', onClick: load }} />;
  if (!data) return <Skeleton className="h-80 w-full" />;

  const p = data.presets.find((x) => x.id === preset);
  const companyName = companies.find((c) => c.slug === company)?.name;
  const previewText = `${p?.text.replace('{company}', companyName || '[company]') || ''}${line.trim() ? ` ${line.trim()}` : ''}`;
  const groupSize = data.segments.filter((s) => segments.includes(s.id)).reduce((n, s) => n + s.students, 0);
  const pending = data.nudges.filter((n) => n.status === 'pending');
  const field = 'mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    act(
      () => draftCollegeNudge({ preset, company_slug: p?.needs_company ? company : undefined, line, audience: { segments, branch: branch || null, batch: batch || null } }, activeCollegeId),
      data.can_approve ? 'Sent. Students who opted out or already had two college nudges this week were skipped.' : 'Sent to the T&P Head for approval.'
    ).then(() => setLine(''));
  };

  return (
    <div className="space-y-6">
      <Card pad="lg">
        <h2 className="font-display text-lg font-bold text-heading">Send a nudge</h2>
        <p className="mt-1 text-sm text-muted">
          {data.can_approve ? 'As T&P Head, your nudges go out when you send them.' : 'Your nudge goes to the T&P Head, who approves it before students see it.'}{' '}
          Students get it in the app and as a notification, at most {data.limits.per_student_per_week} college nudges a week.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-heading">Who</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.segments.map((s) => {
                const on = segments.includes(s.id);
                return <Chip key={s.id} selected={on} onClick={() => setSegments((cur) => (on ? cur.filter((x) => x !== s.id) : [...cur, s.id]))}>{s.label} · {s.students}</Chip>;
              })}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block"><span className="text-sm font-semibold text-heading">Branch</span>
                <select value={branch} onChange={(e) => setBranch(e.target.value)} className={field}><option value="">All branches</option>{data.branches.map((b) => <option key={b}>{b}</option>)}</select>
              </label>
              <label className="block"><span className="text-sm font-semibold text-heading">Batch</span>
                <select value={batch} onChange={(e) => setBatch(e.target.value)} className={field}><option value="">All batches</option>{data.batches.map((b) => <option key={b}>{b}</option>)}</select>
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold text-heading">Message</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.presets.map((x) => <Chip key={x.id} selected={preset === x.id} onClick={() => setPreset(x.id)}>{x.label}</Chip>)}
            </div>
            {p?.needs_company && (
              <label className="mt-3 block sm:max-w-sm"><span className="text-sm font-semibold text-heading">Company</span>
                <select required value={company} onChange={(e) => setCompany(e.target.value)} className={field}><option value="">Choose</option>{companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
              </label>
            )}
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-heading">Add a line <span className="font-normal text-muted">(optional, no links or phone numbers)</span></span>
              <input value={line} onChange={(e) => setLine(e.target.value)} maxLength={data.limits.line_max} placeholder="Mock drive on Friday at 10 am in Lab 3." className={field} />
            </label>
          </fieldset>
          <div className="rounded-xl bg-surface-hover p-3.5 text-sm">
            <p className="font-semibold text-heading">Students will see</p>
            <p className="mt-1 text-body">Your college placement cell: {previewText}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" icon={Send} disabled={busy || segments.length === 0 || (p?.needs_company && !company)}>
              {data.can_approve ? 'Send now' : 'Send for approval'}
            </Button>
            <span className="text-sm text-muted">Up to {groupSize} students in those groups{branch || batch ? ', before the branch and batch filter' : ''}.</span>
          </div>
          {msg && <p className={`text-sm ${msg.ok ? 'text-success' : 'text-danger'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
        </form>
        <p className="mt-4 flex items-start gap-2 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {data.opted_out === 0 ? 'No students have turned college nudges off.' : `${data.opted_out} student${data.opted_out === 1 ? ' has' : 's have'} turned college nudges off. They are skipped automatically.`}
        </p>
      </Card>

      {data.can_approve && (
        <Card pad="lg">
          <h2 className="font-display text-lg font-bold text-heading">Waiting for your approval</h2>
          {pending.length === 0 && <p className="mt-2 text-sm text-muted">Nothing waiting.</p>}
          <ul className="mt-3 space-y-3">
            {pending.map((n) => <PendingRow key={n.id} n={n} busy={busy} onApprove={() => act(() => approveCollegeNudge(n.id, activeCollegeId), 'Approved and sent.')} onReject={(r) => act(() => rejectCollegeNudge(n.id, r, activeCollegeId), 'Not approved. The officer can see your reason.')} />)}
          </ul>
        </Card>
      )}

      <Card pad="lg">
        <h2 className="font-display text-lg font-bold text-heading">History</h2>
        {data.nudges.length === 0 && <p className="mt-2 text-sm text-muted">No nudges yet.</p>}
        <ul className="mt-3 divide-y divide-line">
          {data.nudges.map((n) => (
            <li key={n.id} className="py-3">
              <p className="text-sm text-body">{n.preview}</p>
              <p className="mt-1 text-xs text-muted">
                {STATUS_LABEL[n.status]} · {n.audience.labels.join(', ')}{n.audience.branch ? ` · ${n.audience.branch}` : ''}{n.audience.batch ? ` · ${n.audience.batch}` : ''} · drafted by {n.drafted_by} {when.format(new Date(n.drafted_at))}
                {n.sent && ` · reached ${n.sent.delivered}${n.sent.opted_out ? `, ${n.sent.opted_out} opted out` : ''}${n.sent.capped ? `, ${n.sent.capped} already had this week’s nudges` : ''}`}
                {n.reject_reason && ` · reason: ${n.reject_reason}`}
              </p>
              {n.status === 'pending' && n.drafted_by_me && (
                <Button size="sm" kind="text" icon={Undo2} className="mt-1" disabled={busy} onClick={() => act(() => withdrawCollegeNudge(n.id, activeCollegeId), 'Withdrawn.')}>Withdraw</Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

function PendingRow({ n, busy, onApprove, onReject }: { n: CollegeNudgeRow; busy: boolean; onApprove: () => void; onReject: (reason: string) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <li className="rounded-xl border border-line p-3.5">
      <p className="text-sm text-body">{n.preview}</p>
      <p className="mt-1 text-xs text-muted">From {n.drafted_by} · {n.audience.labels.join(', ')}{n.audience.branch ? ` · ${n.audience.branch}` : ''}{n.audience.batch ? ` · ${n.audience.batch}` : ''} · about {n.preview_count} students</p>
      {!rejecting ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" icon={Check} disabled={busy} onClick={onApprove}>Approve and send</Button>
          <Button size="sm" kind="secondary" icon={X} disabled={busy} onClick={() => setRejecting(true)}>Don’t send</Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Reason for the officer (optional)" className="min-h-[36px] flex-1 rounded-lg border border-line bg-card px-3 text-sm text-heading" />
          <Button size="sm" kind="secondary" disabled={busy} onClick={() => onReject(reason)}>Confirm</Button>
          <Button size="sm" kind="text" onClick={() => setRejecting(false)}>Cancel</Button>
        </div>
      )}
    </li>
  );
}

export default function TpoNudgesPage() {
  return (
    <RequirePlacement>
      <Head>
        <title>Nudges — Campus TPO Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <TpoShell title="Nudges">
        <div className="mx-auto max-w-[1180px] px-4 py-6">
          <NudgesBody />
        </div>
      </TpoShell>
    </RequirePlacement>
  );
}
