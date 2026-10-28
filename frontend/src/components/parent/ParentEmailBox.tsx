import React, { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { Button, Card, Chip } from '@/components/ui';
import { getParentEmail, requestParentEmail, type ParentEmailStatus } from '@/lib/parentApi';

/**
 * The parent's own sign-up for a weekly email (F3, backend lib/parentEmail).
 * Shown only when the student allowed weekly updates and email is switched
 * on. Nothing weekly is sent until the parent clicks the confirmation email.
 */
export const ParentEmailBox: React.FC<{ token: string; name: string }> = ({ token, name }) => {
  const [st, setSt] = useState<ParentEmailStatus | null>(null);
  const [email, setEmail] = useState('');
  const [lang, setLang] = useState<'hi' | 'en'>('hi');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getParentEmail(token).then(setSt).catch(() => { /* box stays hidden */ });
  }, [token]);

  if (!st || (!st.offered && !st.subscribed)) return null;
  if (st.subscribed) {
    return (
      <Card>
        <p className="flex items-center gap-2 font-display text-lg font-bold text-heading"><Mail className="h-5 w-5 text-success" aria-hidden /> ईमेल अपडेट · Email update</p>
        <p className="mt-1 text-sm text-body">
          {st.subscribed.confirmed
            ? `हर रविवार ${st.subscribed.email} पर। · Every Sunday to ${st.subscribed.email}. Each email has an unsubscribe link.`
            : `${st.subscribed.email} पर पुष्टि ईमेल भेजी गई है। · We sent a confirmation to ${st.subscribed.email}. Click it to start.`}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="flex items-center gap-2 font-display text-lg font-bold text-heading"><Mail className="h-5 w-5 text-success" aria-hidden /> हर हफ़्ते ईमेल पर अपडेट पाएँ</p>
      <p className="mt-1 text-sm text-body">हर रविवार {name} के हफ़्ते के बारे में एक छोटी ईमेल। One short email every Sunday about {name}’s week.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try { setSt(await requestParentEmail(token, { email, lang, consent })); } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
        }}
      >
        <label className="block">
          <span className="text-sm font-semibold text-heading">आपका ईमेल · Your email</span>
          <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 sm:max-w-sm" />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold text-heading">भाषा · Language</legend>
          <div className="mt-1 flex gap-2">
            <Chip selected={lang === 'hi'} onClick={() => setLang('hi')}>हिंदी</Chip>
            <Chip selected={lang === 'en'} onClick={() => setLang('en')}>English</Chip>
          </div>
        </fieldset>
        <label className="flex items-start gap-2 text-sm text-body">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-signal" />
          <span>मैं हफ़्ते में एक ईमेल पाने के लिए सहमत हूँ। पहले एक पुष्टि ईमेल आएगी। · I agree to one email a week. You will first get one confirmation email.</span>
        </label>
        <Button type="submit" disabled={busy || !consent || !email.includes('@')}>पुष्टि ईमेल भेजें · Send confirmation</Button>
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      </form>
    </Card>
  );
};

export default ParentEmailBox;
