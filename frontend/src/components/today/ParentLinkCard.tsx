import React, { useEffect, useState } from 'react';
import { Copy, HeartHandshake, RefreshCw, X } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { createParentLink, deleteParentLink, getParentLink, ParentLink } from '@/lib/parentApi';

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

  useEffect(() => {
    if (!ready) return;
    getParentLink()
      .then((r) => setLink(r.link))
      .catch(() => setError('Could not load your parent link.'));
  }, [ready]);

  if (link === undefined) return error ? <Card><p className="text-sm text-danger">{error}</p></Card> : null;

  const url = link && typeof window !== 'undefined' ? `${window.location.origin}/parent/${link.token}` : '';
  const run = async (op: () => Promise<{ link: ParentLink | null }>) => {
    setBusy(true);
    setError(null);
    try {
      setLink((await op()).link);
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
