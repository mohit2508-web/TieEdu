import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { Check, RotateCw, Trash2, X } from 'lucide-react';
import { RequirePlacement } from '@/components/placement/RequirePlacement';
import { TpoShell } from '@/components/tpo/TpoShell';
import { usePlacement } from '@/context/PlacementContext';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { fetchCompanies } from '@/lib/api';
import {
  CampusHistoryRow,
  SeniorNoteRow,
  deleteCampusHistory,
  getCampusIntel,
  moderateSeniorNote,
  saveCampusHistory,
} from '@/lib/placementApi';
import { cn } from '@/lib/cn';

/**
 * Campus intel (D1 + D2) for the placement officer: record past placement
 * results per company and year, and check notes seniors leave for juniors.
 * Students of this college see both on each company's page. Stored outside
 * the placement database (backend lib/campusIntel).
 */

const IntelBody: React.FC = () => {
  const { activeCollegeId } = usePlacement();
  const [data, setData] = useState<{ history: CampusHistoryRow[]; notes: SeniorNoteRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ name: string; slug: string }>>([]);
  const [form, setForm] = useState({ company_slug: '', year: String(new Date().getFullYear() - 1), selected: '', cgpa_cutoff: '', backlogs_allowed: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = () => {
    setError(null);
    getCampusIntel(activeCollegeId).then(setData).catch((e) => setError(e?.message || 'Campus intel could not be loaded.'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the officer switches college
  useEffect(load, [activeCollegeId]);
  useEffect(() => {
    fetchCompanies().then((cs) => setCompanies((cs || []).map((c: any) => ({ name: c.name, slug: c.slug })).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => { /* free-text fallback not needed: the select explains itself */ });
  }, []);
  const nameOf = useMemo(() => new Map(companies.map((c) => [c.slug, c.name])), [companies]);
  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormErr(null);
    try {
      await saveCampusHistory({ company_slug: form.company_slug, year: Number(form.year), selected: num(form.selected), cgpa_cutoff: num(form.cgpa_cutoff), backlogs_allowed: num(form.backlogs_allowed), note: form.note }, activeCollegeId);
      setForm((f) => ({ ...f, selected: '', cgpa_cutoff: '', backlogs_allowed: '', note: '' }));
      load();
    } catch (err: any) {
      setFormErr(err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <EmptyState icon={RotateCw} title="Campus intel could not be loaded." note={error} action={{ label: 'Try again', onClick: load }} />;
  if (!data) return <Skeleton className="h-80 w-full" />;
  const pending = data.notes.filter((n) => n.status === 'pending');

  const field = 'mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading';
  return (
    <div className="space-y-6">
      <Card pad="lg">
        <h2 className="font-display text-lg font-bold text-heading">Placement history</h2>
        <p className="mt-1 text-sm text-muted">Students of your college see this on each company’s page. Saving the same company and year again updates it.</p>
        <form onSubmit={save} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-heading">Company</span>
            <select required value={form.company_slug} onChange={(e) => setForm({ ...form, company_slug: e.target.value })} className={field}>
              <option value="">Choose</option>
              {companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-sm font-semibold text-heading">Year</span><input required type="number" inputMode="numeric" min={2000} max={new Date().getFullYear()} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} autoComplete="off" className={field} /></label>
          <label className="block"><span className="text-sm font-semibold text-heading">Selected</span><input type="number" inputMode="numeric" min={0} value={form.selected} onChange={(e) => setForm({ ...form, selected: e.target.value })} autoComplete="off" className={field} /></label>
          <label className="block"><span className="text-sm font-semibold text-heading">CGPA cut-off</span><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" value={form.cgpa_cutoff} onChange={(e) => setForm({ ...form, cgpa_cutoff: e.target.value })} autoComplete="off" className={field} /></label>
          <label className="block"><span className="text-sm font-semibold text-heading">Backlogs allowed</span><input type="number" inputMode="numeric" min={0} value={form.backlogs_allowed} onChange={(e) => setForm({ ...form, backlogs_allowed: e.target.value })} autoComplete="off" className={field} /></label>
          <label className="block sm:col-span-6"><span className="text-sm font-semibold text-heading">Note for students <span className="font-normal text-muted">(optional)</span></span><input value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} autoComplete="off" placeholder="e.g. Online test had two coding questions" className={field} /></label>
          <div className="flex items-center gap-3 sm:col-span-6">
            <Button type="submit" disabled={busy || !form.company_slug}>{busy ? 'Saving…' : 'Save'}</Button>
            {formErr && <span className="text-sm text-danger">{formErr}</span>}
          </div>
        </form>
        {data.history.length > 0 && (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {data.history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">{nameOf.get(h.company_slug) || h.company_slug} · {h.year}</p>
                  <p className="text-sm text-muted">
                    {[h.selected !== null && `${h.selected} selected`, h.cgpa_cutoff !== null && `cut-off ${h.cgpa_cutoff}`, h.backlogs_allowed !== null && `${h.backlogs_allowed} backlogs`, h.note].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button type="button" aria-label={`Delete ${h.company_slug} ${h.year}`} onClick={() => deleteCampusHistory(h.id, activeCollegeId).then(load)} className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:text-danger">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card pad="lg">
        <h2 className="font-display text-lg font-bold text-heading">Notes from seniors {pending.length > 0 && <span className="ml-2 rounded-full bg-signal px-2 py-0.5 text-xs font-bold text-white">{pending.length} to check</span>}</h2>
        <p className="mt-1 text-sm text-muted">Placed students leave these for juniors. Nothing is shown until you approve it, and juniors never see who wrote it.</p>
        {data.notes.length === 0 && <p className="mt-4 text-sm text-muted">No notes yet.</p>}
        <ul className="mt-4 space-y-3">
          {data.notes.map((n) => (
            <li key={n.id} className={cn('rounded-xl border p-4', n.status === 'pending' ? 'border-signal' : 'border-line')}>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{nameOf.get(n.company_slug) || n.company_slug} · {n.label || 'No label'} · {n.status}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-body">{n.body}</p>
              {n.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" icon={Check} onClick={() => moderateSeniorNote(n.id, 'approved', activeCollegeId).then(load)}>Approve</Button>
                  <Button size="sm" kind="secondary" icon={X} onClick={() => moderateSeniorNote(n.id, 'rejected', activeCollegeId).then(load)}>Reject</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default function TpoCampusIntelPage() {
  return (
    <RequirePlacement>
      <Head>
        <title>Campus intel — Campus TPO Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <TpoShell title="Campus intel">
        <div className="mx-auto max-w-[1180px] px-4 py-6">
          <IntelBody />
        </div>
      </TpoShell>
    </RequirePlacement>
  );
}
