import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Footer } from '@/components/layout/Footer';
import { ShieldCheck } from 'lucide-react';

/**
 * The serial entry point for verification.
 *
 * Deliberately a form that hands off to `/verify/[serial]` rather than a second
 * copy of the result rendering. The genuine / tampered / revoked / unknown
 * distinction is the load-bearing part of this feature, and duplicating that
 * state machine in two files is how the two would drift into disagreeing about
 * whether a certificate is real.
 *
 * Like the result page it has no session dependency: an employer opens this
 * cold, in a private window, with no cookies.
 */
export default function VerifyIndexPage() {
  const router = useRouter();
  const [serial, setSerial] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Accept what people actually paste — a PDF line, a screenshot filename, a
    // serial typed in the wrong case. The alphabet has no case-sensitive
    // meaning and the API already upper-cases before matching, so normalising
    // here saves a pointless 404.
    const clean = serial.trim().toUpperCase().replace(/\s+/g, '');
    if (!clean) {
      setError('Enter the serial printed on the certificate.');
      return;
    }
    if (clean.length > 64) {
      setError('That is longer than any serial we issue. Check for a stray paste.');
      return;
    }
    setError(null);
    router.push(`/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <>
      <Head>
        <title>Verify a certificate · TieEdu</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="mx-auto w-full max-w-2xl px-6 pb-24 pt-16">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} className="text-[var(--brand-sky)]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ink)]">
            Certificate verification
          </h1>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">
          Every certificate TieEdu issues is signed. Enter the serial printed on it and we will
          check that signature against the record we hold — no account needed.
        </p>

        <form
          onSubmit={submit}
          className="mt-8 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6"
        >
          <label
            htmlFor="serial"
            className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
          >
            Certificate serial
          </label>
          <input
            id="serial"
            name="serial"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="TIEEDU-2026-7QK4M2XB"
            className="mt-2 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-page)] px-3.5 py-2.5 font-mono text-sm outline-none focus:border-[var(--brand-sky)]"
          />
          {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-sky-strong)] sm:w-auto"
          >
            Check this certificate
          </button>

          <p className="mt-5 text-xs leading-relaxed text-[var(--text-muted)]">
            The serial is on the certificate itself, in the form shown above. If a serial is reported
            as genuine but the holder cannot produce the course work behind it, treat it with the
            usual suspicion and contact us.
          </p>
        </form>
      </main>
      <Footer />
    </>
  );
}
