import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { BellOff } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { stopParentEmail } from '@/lib/parentApi';

/** The unsubscribe link in every parent email (F3). One press; always succeeds. */
export default function ParentEmailStop() {
  const { query } = useRouter();
  const t = typeof query.t === 'string' ? query.t : '';
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Head><title>Unsubscribe · TieEdu</title><meta name="robots" content="noindex, nofollow" /></Head>
      <main className="mx-auto w-full max-w-[560px] px-4 py-16">
        <Card pad="lg">
          <p className="flex items-center gap-2 font-display text-xl font-bold text-heading"><BellOff className="h-6 w-6 text-muted" aria-hidden /> Stop weekly emails · ईमेल बंद करें</p>
          {done ? (
            <p className="mt-3 text-body" role="status">You are unsubscribed. No more weekly emails will be sent. · अब कोई ईमेल नहीं आएगी।</p>
          ) : (
            <Button className="mt-4" disabled={!t || busy} onClick={async () => { setBusy(true); try { await stopParentEmail(t); } finally { setDone(true); setBusy(false); } }}>
              Unsubscribe · बंद करें
            </Button>
          )}
        </Card>
      </main>
    </>
  );
}
