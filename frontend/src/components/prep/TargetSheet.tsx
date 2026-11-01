import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Sheet } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { fetchTarget, saveTarget, OPEN_TARGET_EVENT } from '@/lib/prepApi';

/**
 * "Which company are you preparing for?" (INFOSYS_SE_3T_UX_PLAN §1). Asked
 * once after sign-in; reopened from the Today screen or the header chip via
 * OPEN_TARGET_EVENT. Only companies with a full prep plan can be picked.
 */
const READY = [{ slug: 'infosys-systems-engineer', name: 'Infosys Systems Engineer (SE)', meta: 'Online test 54 Qs · Technical · HR · ₹3.6–4.2 LPA' }];
const SOON = ['TCS NQT', 'Accenture', 'Wipro Elite NTH', 'Cognizant GenC'];

export const TargetSheet: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(READY[0].slug);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = (user as { role?: string } | null)?.role === 'admin';

  useEffect(() => {
    if (!user || isAdmin) return;
    fetchTarget().then((t) => { if (!t.slug && !t.asked) setOpen(true); }).catch(() => {});
    const on = () => setOpen(true);
    window.addEventListener(OPEN_TARGET_EVENT, on);
    return () => window.removeEventListener(OPEN_TARGET_EVENT, on);
  }, [user, isAdmin]);

  const save = async (s: string | null) => {
    setBusy(true);
    await saveTarget(s, date || undefined).catch(() => {});
    setBusy(false);
    setOpen(false);
    if (s) window.location.assign(`/prep/${s}`);
  };

  return (
    <Sheet open={open} onClose={() => save(null)} title="Which company are you preparing for?" side="bottom">
      <div className="space-y-5 p-5 sm:p-6">
        <p className="text-base text-body">Pick one. Your plan, tests, readiness and days left will all be for this company.</p>
        <ul className="space-y-2">
          {READY.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => setSlug(c.slug)}
                aria-pressed={slug === c.slug}
                className={`flex w-full items-center gap-3 rounded-card border-2 p-4 text-left ${slug === c.slug ? 'border-signal bg-signal-soft' : 'border-line bg-card'}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold text-heading">{c.name}</span>
                  <span className="block text-sm text-muted">{c.meta}</span>
                </span>
                {slug === c.slug && <Check className="h-6 w-6 text-amber-deep" aria-hidden />}
              </button>
            </li>
          ))}
          {SOON.map((n) => (
            <li key={n} className="flex items-center justify-between rounded-card border border-line bg-surface-hover p-4 text-muted">
              <span className="font-semibold">{n}</span><span className="text-sm">Plan coming soon</span>
            </li>
          ))}
        </ul>
        <label className="block text-base font-semibold text-heading">
          When is your test? <span className="font-normal text-muted">(leave empty for a 50-day plan)</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 block min-h-[48px] w-full rounded-lg border border-line bg-card px-3 text-heading" />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={busy} onClick={() => save(slug)} className="btn btn-primary min-h-[48px] flex-1">Start my plan</button>
          <button type="button" disabled={busy} onClick={() => save(null)} className="btn btn-ghost min-h-[48px] px-6">Not sure yet</button>
        </div>
      </div>
    </Sheet>
  );
};
