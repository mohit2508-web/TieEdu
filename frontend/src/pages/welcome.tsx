import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Bell, Check, Loader2, Mail, MessageCircle } from 'lucide-react';
import { AuthAlert, AuthShell, authInputCls } from '@/components/auth/AuthShell';
import { useAuth } from '@/context/AuthContext';
import { BRANCHES, INTERESTS, saveOnboarding, yearOptions } from '@/lib/onboardingApi';
import { cn } from '@/lib/cn';

/**
 * First-run onboarding (PROFESSIONAL_PLATFORM_PLAN §1.3): three short steps —
 * year and branch, what you want, how to stay updated. Every step can be
 * skipped; the answers drive what the site shows first and which messages go
 * out, and can be changed later in Account.
 */
const STEPS = ['Your year', 'Your goals', 'Stay updated'] as const;

const chip = (on: boolean) =>
  cn(
    'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors focus-ring',
    on ? 'border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white' : 'border-line bg-card text-body hover:border-[var(--brand-sky)]'
  );

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading, updateUser } = useAuth();
  const next = typeof router.query.next === 'string' && router.query.next.startsWith('/') && !router.query.next.startsWith('//') ? router.query.next : '/';
  const years = useMemo(() => yearOptions(), []);

  const [step, setStep] = useState(0);
  const [gradYear, setGradYear] = useState<number | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [notify, setNotify] = useState({ email: true, push: true, whatsapp: false });
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent('/welcome')}`);
  }, [loading, user, router]);

  // Start from whatever the account already knows.
  useEffect(() => {
    if (!user) return;
    if (user.grad_year) setGradYear(user.grad_year);
    if (user.branch) setBranch(user.branch);
    if (user.interests?.length) setInterests(user.interests);
    if (user.notify) setNotify(user.notify);
    if (user.whatsapp?.number) setPhone(user.whatsapp.number.replace(/^\+91/, ''));
  }, [user]);

  const save = async (finish: boolean, skip = false) => {
    setError(null);
    setBusy(true);
    try {
      const updated = await saveOnboarding(
        skip
          ? { skip: true }
          : {
              grad_year: gradYear,
              branch,
              interests,
              ...(finish ? { notify, whatsapp_number: notify.whatsapp ? phone : undefined } : {}),
              finish,
            }
      );
      updateUser(updated);
      if (finish || skip) router.replace(next);
      else setStep((s) => s + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleInterest = (id: string) =>
    setInterests((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const firstName = (user?.name || '').split(/\s+/)[0];

  return (
    <AuthShell
      wide
      title="Welcome"
      eyebrow={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
      heading={step === 0 ? `Welcome${firstName ? `, ${firstName}` : ''}! Which year are you in?` : step === 1 ? 'What do you want from TieEdu?' : 'How should we keep you updated?'}
      lede={
        step === 0
          ? 'We show first-years foundations and final-years company prep — so you only see what helps you now.'
          : step === 1
            ? 'Pick as many as you like. We use this to put the right courses and tests first.'
            : 'Only useful things: results, receipts, drive updates and reminders you can turn off any time.'
      }
    >
      <div className="mb-6 flex gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-[var(--brand-accent)]' : 'bg-line')} />
        ))}
      </div>

      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      {step === 0 && (
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-body">Year</legend>
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <button key={y.grad_year} type="button" aria-pressed={gradYear === y.grad_year} onClick={() => setGradYear(y.grad_year)} className={chip(gradYear === y.grad_year)}>
                  {gradYear === y.grad_year && <Check size={15} />} {y.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-body">Branch</legend>
            <div className="flex flex-wrap gap-2">
              {BRANCHES.map((b) => (
                <button key={b.id} type="button" aria-pressed={branch === b.id} onClick={() => setBranch(b.id)} className={chip(branch === b.id)}>
                  {branch === b.id && <Check size={15} />} {b.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <button key={i.id} type="button" aria-pressed={interests.includes(i.id)} onClick={() => toggleInterest(i.id)} className={chip(interests.includes(i.id))}>
              {interests.includes(i.id) && <Check size={15} />} {i.label}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {[
            { key: 'email' as const, icon: Mail, title: 'Email', text: 'Results, receipts, certificates and a weekly summary.' },
            { key: 'push' as const, icon: Bell, title: 'App notifications', text: 'Reminders and drive updates on this device.' },
            { key: 'whatsapp' as const, icon: MessageCircle, title: 'WhatsApp', text: 'Only important updates, like drive slots and results.' },
          ].map((o) => (
            <label key={o.key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-card p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-ink)] text-white"><o.icon size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-heading">{o.title}</span>
                <span className="block text-sm text-body">{o.text}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="mt-2 h-5 w-5 shrink-0 accent-[var(--brand-accent)]"
                checked={notify[o.key]}
                onChange={(e) => setNotify((n) => ({ ...n, [o.key]: e.target.checked }))}
              />
            </label>
          ))}
          {notify.whatsapp && (
            <label className="block text-xs font-bold uppercase tracking-wide text-body">
              WhatsApp number
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-xl border border-line bg-card px-3 py-3 text-sm font-semibold normal-case tracking-normal text-heading">+91</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  maxLength={14}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className={`normal-case tracking-normal font-normal ${authInputCls}`}
                />
              </div>
            </label>
          )}
          <p className="text-xs text-[--text-muted]">You can change these any time in Account. We never share your number.</p>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" disabled={busy} onClick={() => (step === 0 ? save(false, true) : setStep((s) => s - 1))} className="min-h-[44px] text-sm font-bold text-[--text-muted] hover:text-link">
          {step === 0 ? 'Skip for now' : 'Back'}
        </button>
        <button
          type="button"
          disabled={busy || (step === 0 && !gradYear)}
          onClick={() => save(step === STEPS.length - 1)}
          className="btn btn-primary min-h-[48px] px-8 text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : step === STEPS.length - 1 ? 'Finish' : 'Continue'}
        </button>
      </div>
    </AuthShell>
  );
}
