import React, { useEffect, useState } from 'react';
import { Copy, ExternalLink, IdCard } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { fetchMyPassport, MyPassport, passportUrl, saveMyPassport } from '@/lib/passportApi';
import { cn } from '@/lib/cn';

/**
 * The student's control for their Placement Passport (§6.2).
 *
 * Off by default. The card says exactly what turning it on publishes — and
 * what it never does — before the switch, because "make my profile public" is
 * a decision the student should make knowing the consequences.
 */
export const PassportCard: React.FC<{ ready: boolean }> = ({ ready }) => {
  const [data, setData] = useState<MyPassport | null>(null);
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready) return;
    fetchMyPassport()
      .then((d) => {
        setData(d);
        setHandle(d.settings.handle || d.suggestion);
      })
      .catch(() => setError('Your passport settings could not be loaded.'));
  }, [ready]);

  if (!data) return error ? <Card><p className="text-sm text-danger">{error}</p></Card> : null;

  const on = data.settings.public;
  const p = data.preview;
  const certs = p.certificates.length + p.skills.filter((s) => s.certificate).length;

  const save = async (makePublic: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const next = await saveMyPassport({ public: makePublic, handle: handle.trim().toLowerCase() });
      setData(next);
      setHandle(next.settings.handle || handle);
    } catch (e: any) {
      setError(e?.message || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="lg:col-span-3">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="eyebrow text-muted">Placement Passport</p>
          <h2 className="mt-2 flex items-center gap-2 font-display text-xl font-bold text-heading">
            <IdCard className="h-5 w-5 text-signal" aria-hidden /> One link for everything you have proved
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your best skill-test scores, your certificates with their verification links, and your readiness for the companies
            you are preparing for. It never shows your email, your college or individual attempts.
            {` Right now it would show ${certs} certificate${certs === 1 ? '' : 's'} and ${p.skills.length} skill${p.skills.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        <div className="w-full md:max-w-sm">
          <label className="block text-sm font-semibold text-heading" htmlFor="passport-handle">
            Your address
          </label>
          <div className="mt-1.5 flex items-center rounded-xl border border-line-strong bg-card focus-within:border-signal focus-within:ring-4 focus-within:ring-signal/10">
            <span className="pl-3 text-sm text-muted">/p/</span>
            <input
              id="passport-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              maxLength={30}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-h-[44px] w-full min-w-0 rounded-r-xl bg-transparent pr-3 text-sm text-heading focus:outline-none"
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={on}
              disabled={saving}
              onClick={() => save(!on)}
              className={cn(
                'focus-ring inline-flex min-h-[44px] items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition-colors',
                on ? 'border-success/40 bg-success-soft text-success' : 'border-line bg-card text-heading'
              )}
            >
              <span className={cn('relative h-5 w-9 rounded-full transition-colors', on ? 'bg-success' : 'bg-line-strong')} aria-hidden>
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', on ? 'translate-x-4' : 'translate-x-0.5')} />
              </span>
              {on ? 'Public' : 'Private'}
            </button>
            {on && handle !== data.settings.handle && (
              <Button size="sm" kind="secondary" disabled={saving} onClick={() => save(true)}>
                Save address
              </Button>
            )}
          </div>

          {on && data.settings.handle && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" href={`/p/${data.settings.handle}`} icon={ExternalLink} target="_blank" rel="noopener">
                View
              </Button>
              <Button
                size="sm"
                kind="secondary"
                icon={Copy}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(passportUrl(data.settings.handle!));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    /* clipboard blocked */
                  }
                }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PassportCard;
