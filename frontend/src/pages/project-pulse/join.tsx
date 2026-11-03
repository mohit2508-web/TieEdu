import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PulseShell } from '@/components/pulse/PulseUi';
import { PulseGate } from '@/components/pulse/PulseGate';
import { pulseApi } from '@/lib/pulse/api';

/**
 * Project Pulse — join a class. ?token= from the invite email joins at once
 * (same email required); a class code asks to join and the teacher approves.
 */
const Body: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [code, setCode] = useState('');
  const [roll, setRoll] = useState('');
  const [state, setState] = useState<{ ok?: 'active' | 'pending'; error?: string; busy?: boolean }>({});
  const tried = useRef(false);

  const submit = async (body: { token?: string; code?: string; roll_no?: string }) => {
    setState({ busy: true });
    try { const r = await pulseApi.join(body); setState({ ok: r.status }); if (r.status === 'active') setTimeout(() => router.push('/project-pulse/student'), 1200); }
    catch (e: any) { setState({ error: e?.message || 'Could not join.' }); }
  };
  useEffect(() => {
    if (token && !tried.current) { tried.current = true; submit({ token }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per token
  }, [token]);

  return (
    <PulseShell title="Join a class" role={null}>
      <div className="mx-auto max-w-md rounded-band border border-line bg-card p-8">
        {state.ok ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h2 className="mt-3 font-display text-h2 text-heading">{state.ok === 'active' ? 'You’re in' : 'Request sent'}</h2>
            <p className="mt-1 text-sm text-muted">{state.ok === 'active' ? 'Opening your tasks…' : 'Your teacher will approve you. Your tasks show up after that.'}</p>
            <Link href="/project-pulse/student" className="mt-4 inline-block text-sm font-semibold text-link">My tasks →</Link>
          </div>
        ) : token && !state.error ? (
          <p className="text-center text-sm text-muted">Checking your invite…</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); submit({ code, roll_no: roll }); }}>
            {state.error ? <p role="alert" className="mb-4 rounded-cell bg-danger-soft px-3 py-2 text-sm text-error">{state.error}</p> : null}
            <p className="text-sm text-muted">Signed in as <span className="font-semibold text-heading">{user?.email}</span>. Enter the code your teacher gave you.</p>
            <label className="mt-4 block text-xs font-semibold text-muted" htmlFor="code">Class code</label>
            <input id="code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12}
              className="mt-1 h-12 w-full rounded-cell border border-line-strong/60 bg-card px-3 text-center font-mono text-xl tracking-widest text-heading focus:outline focus:outline-2 focus:outline-[var(--focus)]" />
            <label className="mt-3 block text-xs font-semibold text-muted" htmlFor="roll">Roll number (optional)</label>
            <input id="roll" value={roll} onChange={(e) => setRoll(e.target.value)} className="mt-1 h-10 w-full rounded-cell border border-line-strong/60 bg-card px-3 text-sm text-body" />
            <button disabled={state.busy} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-cell bg-signal font-display text-label text-on-primary shadow-edge-primary disabled:opacity-60">
              <KeyRound className="h-4 w-4" /> {state.busy ? 'Joining…' : 'Join class'}
            </button>
          </form>
        )}
      </div>
    </PulseShell>
  );
};

export default function PulseJoin() {
  return <PulseGate title="Join a class"><Body /></PulseGate>;
}
