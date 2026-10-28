import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { MailCheck } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { confirmParentEmail } from '@/lib/parentApi';

/**
 * The link in the one confirmation email (F3, backend lib/parentEmail).
 * Confirming takes a button press, not just a visit, so a mail scanner that
 * opens links cannot sign a parent up.
 */
export default function ParentEmailConfirm() {
  const { query } = useRouter();
  const t = typeof query.t === 'string' ? query.t : '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  const go = async () => {
    setState('busy');
    try {
      const r = await confirmParentEmail(t);
      setName(r.first_name);
      setState('done');
    } catch (e) {
      setErr((e as Error).message);
      setState('error');
    }
  };

  return (
    <>
      <Head><title>Confirm weekly updates · TieEdu</title><meta name="robots" content="noindex, nofollow" /></Head>
      <main className="mx-auto w-full max-w-[560px] px-4 py-16">
        <Card pad="lg">
          <p className="flex items-center gap-2 font-display text-xl font-bold text-heading"><MailCheck className="h-6 w-6 text-success" aria-hidden /> Weekly updates · हर हफ़्ते अपडेट</p>
          {state === 'done' ? (
            <p className="mt-3 text-body">Done. You will get a short email every Sunday about {name || 'your child'}’s week. Every email has an unsubscribe link.</p>
          ) : (
            <>
              <p className="mt-3 text-body">Confirm that you want one short email every Sunday about your child’s preparation on TieEdu. · हर रविवार एक छोटी ईमेल के लिए पुष्टि करें।</p>
              <Button className="mt-4" onClick={go} disabled={!t || state === 'busy'}>Yes, send weekly updates · हाँ, भेजें</Button>
              {state === 'error' && <p className="mt-3 text-sm text-danger" role="alert">{err}</p>}
              <p className="mt-4 text-xs text-muted">If you did not ask for this, close this page. You will not get another email.</p>
            </>
          )}
        </Card>
      </main>
    </>
  );
}
