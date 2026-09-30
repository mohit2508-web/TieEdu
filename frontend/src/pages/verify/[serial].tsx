import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Footer } from '@/components/layout/Footer';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { verifyCertificate } from '@/lib/coursesApi';
import type { CertificateVerifyResponse } from '@/types';

/**
 * The public verification page.
 *
 * Deliberately has no Header-driven session dependency: this is the page an
 * employer opens cold, in a private window, with no cookies. It must render a
 * truthful answer with zero state from the reader.
 */
export default function VerifyPage() {
  const router = useRouter();
  const serial = typeof router.query.serial === 'string' ? router.query.serial : '';

  const [data, setData] = useState<CertificateVerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Pulled out of `router` so the dependency list names the two values this
  // effect actually reads. Listing `router` itself would satisfy the lint rule
  // too, but the whole object is a new reference on every navigation, so the
  // effect would refetch the certificate on unrelated route changes.
  const { isReady, replace } = router;

  useEffect(() => {
    // `router.query` is empty until hydration finishes, so "no serial yet" and
    // "no serial at all" are the same string. Waiting for `isReady` is what
    // keeps this page from sitting on "Checking…" forever when it is opened
    // without a serial — the reader gets the entry form instead.
    if (!isReady) return;
    if (!serial) {
      replace('/verify');
      return;
    }
    let cancelled = false;
    setLoading(true);

    verifyCertificate(serial)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {
        if (!cancelled) {
          // Network failure is reported as a truthful "we cannot vouch for
          // this" — never as a pass, and never as a definite forgery.
          setData({
            status: 'invalid',
            found: false,
            check: {
              signature_valid: false,
              record_exists: false,
              status: 'unknown',
              revoked_reason: '',
              revoked_at: null,
              // Empty, not a key id: no signature was checked, so there is no key
              // to name. This is the same value the API writes when a record has
              // none — see lib/certificate.ts — so the two never disagree.
              signing_key_id: '',
            },
            explanation: 'We could not reach the verification service, so this is unconfirmed.',
          });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [serial, isReady, replace]);

  const check = data?.check;
  // Four genuinely different answers, and the difference between "active" and
  // "signature does not match" is the whole point of the page: the first means
  // we issued it and have not withdrawn it, the second means the stored record
  // has been altered since it was signed.
  const state: 'loading' | 'unknown' | 'tampered' | 'revoked' | 'valid' = !check
    ? 'loading'
    : !check.record_exists
      ? 'unknown'
      : !check.signature_valid
        ? 'tampered'
        : check.status === 'revoked'
          ? 'revoked'
          : 'valid';

  const cert = data?.certificate;
  const explain = data?.explanation || data?.message;

  return (
    <>
      <Head>
        <title>{serial ? `Verify ${serial} · TieEdu` : 'Verify a certificate · TieEdu'}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="mx-auto w-full max-w-2xl px-6 pb-24 pt-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ink)]">
          Certificate verification
        </h1>
        <p className="mt-2 text-sm text-[var(--text-body)]">
          Every certificate TieEdu issues is signed. Enter a serial to check the signature against
          the record we hold.
        </p>

        <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          {loading && <p className="text-sm text-[var(--text-muted)]">Checking…</p>}

          {!loading && state === 'valid' && (
            <Result tone="valid">
              <ShieldCheck size={26} className="text-[var(--color-success)]" />
              <h2 className="mt-3 text-lg font-bold text-[var(--ink)]">This certificate is genuine</h2>
              <p className="mt-1 text-sm text-[var(--text-body)]">
                The signature matches the record we hold, and the certificate has not been revoked.
              </p>
            </Result>
          )}

          {!loading && state === 'revoked' && (
            <Result tone="revoked">
              <ShieldX size={26} className="text-[var(--color-error)]" />
              <h2 className="mt-3 text-lg font-bold text-[var(--ink)]">This certificate was revoked</h2>
              <p className="mt-1 text-sm text-[var(--text-body)]">
                {check?.revoked_reason || 'It should no longer be accepted as proof of completion.'}
              </p>
              {check?.revoked_at && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Revoked on {new Date(check.revoked_at).toLocaleDateString()}.
                </p>
              )}
            </Result>
          )}

          {!loading && state === 'tampered' && (
            <Result tone="tampered">
              <ShieldAlert size={26} className="text-[var(--color-error)]" />
              <h2 className="mt-3 text-lg font-bold text-[var(--ink)]">
                This certificate failed its signature check
              </h2>
              <p className="mt-1 text-sm text-[var(--text-body)]">
                A record exists for this serial, but its contents do not match the signature we
                issued. Treat it as invalid and contact us.
              </p>
            </Result>
          )}

          {!loading && state === 'unknown' && (
            <Result tone="unknown">
              <ShieldAlert size={26} className="text-[var(--color-warning)]" />
              <h2 className="mt-3 text-lg font-bold text-[var(--ink)]">No matching certificate</h2>
              <p className="mt-1 text-sm text-[var(--text-body)]">
                {explain ||
                  'We have no record of this serial. Check it for typos, or ask the holder for a fresh copy.'}
              </p>
            </Result>
          )}

          {cert && (
            <dl className="mt-6 space-y-2.5 border-t border-[var(--border-subtle)] pt-5 text-sm">
              <Row label="Serial" value={<span className="font-mono">{cert.serial}</span>} />
              <Row label="Issued to" value={cert.recipient_name} />
              {cert.college && <Row label="College" value={cert.college} />}
              <Row label="Course" value={cert.course_title} />
              <Row
                label="Lessons completed"
                value={`${cert.lessons_completed} of ${cert.lessons_required}`}
              />
              <Row label="Issued on" value={new Date(cert.issued_at).toLocaleDateString()} />
              <Row label="XP at issue" value={String(cert.xp_at_issue)} />
              {check?.signing_key_id && (
                <Row
                  label="Signing key"
                  value={<span className="font-mono text-xs">{check.signing_key_id}</span>}
                />
              )}
            </dl>
          )}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-[var(--text-muted)]">
          The name, course title, lesson count and issue date above are covered by the signature. The
          XP figure is shown for context; XP itself is recorded in a separate append-only ledger.
        </p>

        <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
          Certificates are signed with Ed25519, so the check does not rest on trusting this site: the
          matching public key is published at{' '}
          <span className="font-mono">/api/courses/verify/key</span> and anyone can verify a
          certificate themselves against it. The key id above identifies which key was used, and
          older certificates stay verifiable after we rotate to a new one.
        </p>
      </main>
      <Footer />
    </>
  );
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between gap-4">
    <dt className="shrink-0 text-[var(--text-muted)]">{label}</dt>
    <dd className="text-right font-semibold text-[var(--ink)]">{value}</dd>
  </div>
);

const Result: React.FC<{ tone: 'valid' | 'revoked' | 'unknown' | 'tampered'; children: React.ReactNode }> = ({
  children,
}) => <div>{children}</div>;
