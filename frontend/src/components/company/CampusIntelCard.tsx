import React, { useEffect, useState } from 'react';
import { GraduationCap, MessageSquareQuote, Trash2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { API_BASE_URL, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';

/*
 * "At your college" (D1 + D2, backend lib/campusIntel). A signed-in student
 * linked to a college sees that college's placement history for this company
 * and notes from seniors (approved by the placement cell, shown without names).
 * Anyone else — signed out, not linked, or the college data unreachable —
 * sees nothing: no empty box.
 */

interface Intel {
  linked: boolean;
  history: Array<{ id: string; year: number; selected: number | null; cgpa_cutoff: number | null; backlogs_allowed: number | null; note: string }>;
  notes: Array<{ id: string; label: string; body: string; created_at: string }>;
  my_notes: Array<{ id: string; label: string; body: string; status: 'pending' | 'approved' | 'rejected' }>;
}

const STATUS = { pending: 'Waiting for your placement cell', approved: 'Visible to juniors', rejected: 'Not published' } as const;

export const CampusIntelCard: React.FC<{ slug: string; company: string }> = ({ slug, company }) => {
  const [intel, setIntel] = useState<Intel | null>(null);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () =>
    apiFetch(`${API_BASE_URL}/me/campus-intel/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => setIntel(v))
      .catch(() => setIntel(null));

  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps -- reload per company only

  if (!intel || !intel.linked) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiFetch(`${API_BASE_URL}/me/campus-notes`, { method: 'POST', body: JSON.stringify({ company_slug: slug, body, label }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'Your note could not be sent.');
      setBody(''); setLabel(''); setOpen(false);
      setMsg({ ok: true, text: 'Sent. Your placement cell checks notes before juniors see them.' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await apiFetch(`${API_BASE_URL}/me/campus-notes/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
    load();
  };

  return (
    <Card pad="lg" aria-labelledby="campus-intel-h">
      <p className="eyebrow text-signal">At your college</p>
      <h2 id="campus-intel-h" className="mt-1 font-display text-xl font-bold text-heading">{company} on your campus</h2>

      {intel.history.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {intel.history.map((h) => (
            <li key={h.id} className="rounded-xl border border-line p-3.5">
              <p className="text-sm font-bold text-heading">{h.year}</p>
              <p className="mt-0.5 text-sm text-body">
                {[h.selected !== null && `${h.selected} selected`, h.cgpa_cutoff !== null && `CGPA cut-off ${h.cgpa_cutoff}`, h.backlogs_allowed !== null && (h.backlogs_allowed === 0 ? 'no backlogs' : `up to ${h.backlogs_allowed} backlogs`)].filter(Boolean).join(' · ') || 'Visited'}
              </p>
              {h.note && <p className="mt-1 text-sm text-muted">{h.note}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">Your placement cell has not added {company}’s history yet.</p>
      )}

      <h3 className="mt-6 flex items-center gap-2 text-base font-bold text-heading"><MessageSquareQuote className="h-4 w-4 text-signal" aria-hidden /> From your seniors</h3>
      {intel.notes.length > 0 ? (
        <ul className="mt-2 space-y-3">
          {intel.notes.map((n) => (
            <li key={n.id} className="rounded-xl bg-surface-hover px-4 py-3">
              <p className="whitespace-pre-line text-sm leading-relaxed text-body">{n.body}</p>
              <p className="mt-1.5 text-xs font-semibold text-muted">— {n.label}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">No notes yet. Seniors placed at {company} can leave one below.</p>
      )}

      {intel.my_notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {intel.my_notes.map((n) => (
            <li key={n.id} className="flex items-start gap-3 rounded-xl border border-line px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className={cn('text-xs font-bold', n.status === 'approved' ? 'text-success' : n.status === 'rejected' ? 'text-danger' : 'text-muted')}>Your note · {STATUS[n.status]}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-body">{n.body}</p>
              </div>
              <button type="button" onClick={() => remove(n.id)} aria-label="Delete your note" className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:text-danger">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {msg && <p className={cn('mt-3 text-sm', msg.ok ? 'text-success' : 'text-danger')}>{msg.text}</p>}

      {!open ? (
        <Button kind="secondary" size="sm" icon={GraduationCap} className="mt-4" onClick={() => setOpen(true)}>Placed here? Leave a tip for juniors</Button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-heading">Your tip</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} minLength={20} maxLength={800} required placeholder="What surprised you, what to practise, what they asked…" className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-heading">Shown as <span className="font-normal text-muted">(no name — e.g. “2025 batch, CSE”)</span></span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} autoComplete="off" placeholder="2025 batch, CSE" className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading placeholder:text-light" />
          </label>
          <p className="text-xs text-muted">Your placement cell checks every note before juniors see it. Leave out phone numbers and links.</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy || body.trim().length < 20}>{busy ? 'Sending…' : 'Send for review'}</Button>
            <Button kind="text" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
};

export default CampusIntelCard;
