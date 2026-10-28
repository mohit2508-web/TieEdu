import React, { useEffect, useState } from 'react';
import { Copy, HeartHandshake, RefreshCw, X } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { createParentLink, deleteParentLink, getParentLink, getStudentWhatsapp, ParentLink, setStudentWhatsapp, type StudentWaStatus } from '@/lib/parentApi';

/**
 * "Share with a parent" (UI_REDESIGN_PLAN_V2 §8). The student decides: a
 * private link they can replace (the old one stops working) or turn off. The
 * card says what the parent sees — and what they don't — before the button.
 */
export const ParentLinkCard: React.FC<{ ready: boolean }> = ({ ready }) => {
  const [link, setLink] = useState<ParentLink | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wa, setWa] = useState<StudentWaStatus | null>(null);

  useEffect(() => {
    if (!ready) return;
    getParentLink()
      .then((r) => setLink(r.link))
      .catch(() => setError('Could not load your parent link.'));
    getStudentWhatsapp().then(setWa).catch(() => { /* the switch stays hidden */ });
  }, [ready]);

  if (link === undefined) return error ? <Card><p className="text-sm text-danger">{error}</p></Card> : null;

  const url = link && typeof window !== 'undefined' ? `${window.location.origin}/parent/${link.token}` : '';
  const run = async (op: () => Promise<{ link: ParentLink | null }>) => {
    setBusy(true);
    setError(null);
    try {
      setLink((await op()).link);
      // A new or removed link ends any WhatsApp subscription made through the old one.
      getStudentWhatsapp().then(setWa).catch(() => {});
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="lg:col-span-3">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="eyebrow text-muted">For your parents</p>
          <h2 className="mt-2 flex items-center gap-2 font-display text-xl font-bold text-heading">
            <HeartHandshake className="h-5 w-5 text-signal" aria-hidden /> Show them how you are doing
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A private page with your last four weeks of lessons and tests, your streak, your certificates and your readiness
            for your companies. It does not show your answers, your scores on each attempt, or when you log in. Only people
            with the link can open it, and you can turn it off.
          </p>
        </div>
        <div className="w-full md:max-w-sm">
          {link ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-paper p-2 pl-3">
                <span className="min-w-0 flex-1 truncate text-sm text-body">{url}</span>
                <Button
                  size="sm"
                  kind="secondary"
                  icon={Copy}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      /* clipboard blocked */
                    }
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" kind="secondary" icon={RefreshCw} disabled={busy} onClick={() => run(createParentLink)}>
                  New link
                </Button>
                <Button size="sm" kind="text" icon={X} disabled={busy} onClick={() => run(deleteParentLink)}>
                  Turn off
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted">A new link stops the old one from working.</p>
              {wa && (
                <div className="mt-4 rounded-xl border border-line p-3">
                  <label className="flex items-start gap-2 text-sm text-body">
                    <input
                      type="checkbox"
                      checked={wa.allowed}
                      disabled={busy}
                      onChange={async (e) => {
                        try { setWa(await setStudentWhatsapp(e.target.checked)); } catch { setError('Could not change WhatsApp updates. Try again.'); }
                      }}
                      className="mt-0.5 h-4 w-4 accent-signal"
                    />
                    <span>
                      <span className="font-semibold text-heading">Let my parent get a weekly update</span>
                      <span className="block text-xs text-muted">A short Sunday message on WhatsApp or by email, in Hindi or English, with the same numbers as this page. Your parent signs up on the page with their own number or email, and either of you can stop it.</span>
                    </span>
                  </label>
                  {wa.subscribed && (
                    <p className="mt-2 text-xs text-success">Signed up: {wa.subscribed.phone}, in {wa.subscribed.lang === 'hi' ? 'Hindi' : 'English'}.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <Button disabled={busy} onClick={() => run(createParentLink)}>
              Create a private link
            </Button>
          )}
          {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
        </div>
      </div>
    </Card>
  );
};

export default ParentLinkCard;
