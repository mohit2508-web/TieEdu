import React, { useEffect, useState } from 'react';
import { BellOff, MessageCircle } from 'lucide-react';
import { Button, Card, Chip } from '@/components/ui';
import { getParentWhatsapp, stopParentWhatsapp, subscribeParentWhatsapp, type ParentWaStatus } from '@/lib/parentApi';

/**
 * The parent's own opt-in to a weekly WhatsApp summary (backend
 * lib/parentWhatsapp). Shown only when the student has allowed it. Hindi
 * first, English beside it: this box is for the parent, not the student.
 * Opened from a message's stop link (`?stop=1`), it leads with stopping.
 */
export const ParentWhatsappBox: React.FC<{ token: string; name: string; stop: boolean }> = ({ token, name, stop }) => {
  const [st, setSt] = useState<ParentWaStatus | null>(null);
  const [phone, setPhone] = useState('');
  const [lang, setLang] = useState<'hi' | 'en'>('hi');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    getParentWhatsapp(token).then(setSt).catch(() => { /* the box stays hidden */ });
  }, [token]);

  const run = async (fn: () => Promise<ParentWaStatus>) => {
    setBusy(true);
    setErr(null);
    try {
      setSt(await fn());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!st) return null;
  if (stopped) {
    return (
      <Card role="status">
        <p className="font-semibold text-heading">WhatsApp संदेश बंद कर दिए गए। · WhatsApp updates are off.</p>
        <p className="mt-1 text-sm text-muted">यह पेज पहले की तरह खुला रहेगा। · This page still works as before.</p>
      </Card>
    );
  }
  if (st.subscribed) {
    return (
      <Card>
        <p className="flex items-center gap-2 font-display text-lg font-bold text-heading">
          <MessageCircle className="h-5 w-5 text-success" aria-hidden /> हर रविवार WhatsApp पर अपडेट · Weekly WhatsApp update
        </p>
        <p className="mt-1 text-sm text-body">
          {st.subscribed.phone} पर {st.subscribed.lang === 'hi' ? 'हिंदी' : 'English'} में। · To {st.subscribed.phone}, in {st.subscribed.lang === 'hi' ? 'Hindi' : 'English'}.
          {!st.sending && <span className="text-muted"> संदेश जल्द शुरू होंगे। · Messages will start soon.</span>}
        </p>
        <Button kind={stop ? 'primary' : 'secondary'} icon={BellOff} className="mt-3" disabled={busy} onClick={() => run(async () => { const s = await stopParentWhatsapp(token); setStopped(true); return s; })}>
          संदेश बंद करें · Stop messages
        </Button>
        {err && <p className="mt-2 text-sm text-danger" role="alert">{err}</p>}
      </Card>
    );
  }
  if (stop) {
    return <Card role="status"><p className="text-sm text-body">इस नंबर पर कोई WhatsApp अपडेट नहीं जा रहा। · No WhatsApp updates are being sent from this page.</p></Card>;
  }
  if (!st.allowed) return null;

  return (
    <Card>
      <p className="flex items-center gap-2 font-display text-lg font-bold text-heading">
        <MessageCircle className="h-5 w-5 text-success" aria-hidden /> हर हफ़्ते WhatsApp पर अपडेट पाएँ
      </p>
      <p className="mt-1 text-sm text-body">
        हर रविवार एक छोटा संदेश: {name} ने इस हफ़्ते कितना अभ्यास किया और तैयारी कहाँ तक पहुँची। Get one short message every Sunday about {name}’s week.
      </p>
      <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => subscribeParentWhatsapp(token, { phone, lang, consent })); }}>
        <label className="block">
          <span className="text-sm font-semibold text-heading">आपका WhatsApp नंबर · Your WhatsApp number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="98765 43210" className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 sm:max-w-xs" />
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
          <span>मैं TieEdu से हफ़्ते में एक WhatsApp संदेश पाने के लिए सहमत हूँ। हर संदेश में बंद करने का लिंक होगा। · I agree to one WhatsApp message a week from TieEdu. Every message has a link to stop.</span>
        </label>
        <Button type="submit" disabled={busy || !consent || phone.replace(/\D/g, '').length < 10}>शुरू करें · Start updates</Button>
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      </form>
    </Card>
  );
};

export default ParentWhatsappBox;
