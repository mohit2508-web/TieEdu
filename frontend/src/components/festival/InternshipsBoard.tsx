import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Clock, ExternalLink, IndianRupee, MapPin } from 'lucide-react';
import { API_BASE_URL } from '@/lib/assetUrl';
import { getAccessToken } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { useFestival } from '@/lib/festival';

interface Listing {
  id: string; title: string; company: string; is_tieedu: boolean; mode: string; location: string;
  stipend: string; duration: string; eligibility: string; description: string; deadline: string | null;
  external: boolean; apply_url: string | null; applied: boolean;
}

const auth = (): Record<string, string> => {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/**
 * Real internship listings an admin has opened (never invented). Members
 * apply in one tap; external listings link to the company's own page.
 */
export const InternshipsBoard: React.FC = () => {
  const { user } = useAuth();
  const f = useFestival();
  const [items, setItems] = useState<Listing[] | null>(null);
  const [member, setMember] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = () =>
    fetch(`${API_BASE_URL}/festival/internships`, { headers: auth(), credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { internships: [], member: false }))
      .then((d) => { setItems(d.internships || []); setMember(!!d.member); })
      .catch(() => setItems([]));

  useEffect(() => { load(); }, [user?.id, f.membership?.granted_at]);

  const apply = async (id: string) => {
    setBusy(id);
    try {
      const r = await fetch(`${API_BASE_URL}/festival/internships/${encodeURIComponent(id)}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, credentials: 'include', body: JSON.stringify({}),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setMsg((m) => ({ ...m, [id]: d.error || 'Could not apply' }));
      else { setMsg((m) => ({ ...m, [id]: 'Applied! The team will reach out on your email.' })); load(); }
    } finally {
      setBusy(null);
    }
  };

  if (items === null) return <p className="text-sm text-muted">Loading internships…</p>;
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-6 text-center">
        <Briefcase className="mx-auto text-muted" aria-hidden />
        <p className="mt-2 font-bold text-heading">Internship listings are coming soon</p>
        <p className="mt-1 text-sm text-muted">Claim your free membership now — you&apos;ll be first to apply when new listings go live.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((i) => (
        <article key={i.id} className="rounded-card flex flex-col rounded-2xl border border-line bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-extrabold text-heading">{i.title}</h3>
              <p className="text-sm font-semibold text-muted">{i.is_tieedu ? 'at TieEdu' : i.company}</p>
            </div>
            <span className="rounded-full bg-signal-soft px-2.5 py-1 text-xs font-bold capitalize text-signal-ink">{i.mode}</span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-body">
            {i.location && <li className="flex items-center gap-1"><MapPin size={13} aria-hidden />{i.location}</li>}
            {i.stipend && <li className="flex items-center gap-1"><IndianRupee size={13} aria-hidden />{i.stipend}</li>}
            {i.duration && <li className="flex items-center gap-1"><Clock size={13} aria-hidden />{i.duration}</li>}
            {i.deadline && <li>Apply by {new Date(`${i.deadline}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</li>}
          </ul>
          {i.description && <p className="mt-3 text-sm text-body">{i.description}</p>}
          {i.eligibility && <p className="mt-2 text-xs text-muted"><b>Eligibility:</b> {i.eligibility}</p>}
          <div className="mt-auto pt-4">
            {i.external && i.apply_url ? (
              <a href={i.apply_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-signal px-4 py-2.5 text-sm font-extrabold text-on-primary">
                Apply on company site <ExternalLink size={14} aria-hidden />
              </a>
            ) : i.applied ? (
              <span className="inline-block rounded-xl bg-success-soft px-4 py-2.5 text-sm font-bold text-success">✓ Applied</span>
            ) : !user ? (
              <Link href="/signup?next=/diwali" className="inline-block rounded-xl bg-signal px-4 py-2.5 text-sm font-extrabold text-on-primary">Sign up to apply</Link>
            ) : !member ? (
              <a href="#membership" className="inline-block rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-link">Claim free membership to apply</a>
            ) : (
              <button type="button" onClick={() => apply(i.id)} disabled={busy === i.id}
                className="rounded-xl bg-signal px-4 py-2.5 text-sm font-extrabold text-on-primary disabled:opacity-60">
                {busy === i.id ? 'Applying…' : 'Apply in one tap'}
              </button>
            )}
            {msg[i.id] && <p role="status" className="mt-2 text-xs font-semibold text-body">{msg[i.id]}</p>}
          </div>
        </article>
      ))}
    </div>
  );
};
