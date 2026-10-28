import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { EyeOff, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Chip, Skeleton } from '@/components/ui';
import { API_BASE_URL, apiFetch } from '@/lib/api';

/*
 * College leaderboard (F2). This week's points among students of your own
 * college who chose to appear, by first name or initials. Resets every
 * Monday (backend lib/collegeBoard).
 */
interface Board {
  college: string;
  week_start: string;
  entries: Array<{ rank: number; name: string; points: number; me: boolean }>;
  me: { on: boolean; name_mode: 'first_name' | 'initials'; points: number; rank: number | null };
}

const call = async (init?: RequestInit) => {
  const res = await apiFetch(`${API_BASE_URL}/me/college-board`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || 'The leaderboard could not be loaded.');
  return body;
};
const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function CollegeLeaderboardPage() {
  const { user, loading } = useAuth();
  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'first_name' | 'initials'>('first_name');

  const load = () => call().then((d) => { setBoard(d.board); if (d.board) setMode(d.board.me.name_mode); }).catch((e) => setErr(e.message));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = async (on: boolean) => {
    setBusy(true);
    try {
      await call({ method: 'PUT', body: JSON.stringify({ on, name_mode: mode }) });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>College leaderboard · TieEdu</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="mx-auto w-full max-w-[680px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">This week</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">{board?.college ? `${board.college} leaderboard` : 'College leaderboard'}</h1>
        <p className="mt-2 text-base text-body">Points earned this week by students of your college who chose to appear. It starts again every Monday, so anyone can top it.</p>

        {!loading && !user && <Card pad="lg" className="mt-6 text-center"><Button href="/login?next=%2Fcollege-leaderboard">Sign in</Button></Card>}
        {user && board === undefined && !err && <Skeleton className="mt-6 h-64 w-full rounded-[14px]" />}
        {err && <p className="mt-4 text-sm text-danger" role="alert">{err}</p>}
        {user && board === null && <Card pad="lg" className="mt-6"><p className="text-body">This needs your college on TieEdu. Once your placement cell adds your batch, your college’s board appears here.</p></Card>}

        {board && (
          <>
            <Card pad="lg" className="mt-6">
              <p className="text-sm text-body">
                You have <strong className="text-heading">{board.me.points} points</strong> this week
                {board.me.rank ? <>, which would place you <strong className="text-heading">#{board.me.rank}</strong></> : ''}.
              </p>
              {!board.me.on ? (
                <>
                  <fieldset className="mt-3">
                    <legend className="text-sm font-semibold text-heading">Show me as</legend>
                    <div className="mt-2 flex gap-2">
                      <Chip selected={mode === 'first_name'} onClick={() => setMode('first_name')}>My first name</Chip>
                      <Chip selected={mode === 'initials'} onClick={() => setMode('initials')}>My initials</Chip>
                    </div>
                  </fieldset>
                  <Button className="mt-3" icon={Trophy} onClick={() => choose(true)} disabled={busy}>Show me on the board</Button>
                  <p className="mt-2 text-xs text-muted">Only students of your college see it, and you can leave any time.</p>
                </>
              ) : (
                <Button kind="secondary" className="mt-3" icon={EyeOff} onClick={() => choose(false)} disabled={busy}>Take me off the board</Button>
              )}
            </Card>

            <ol className="mt-6 divide-y divide-line rounded-[14px] border border-line bg-card" aria-label={`Week from ${dayMonth.format(new Date(`${board.week_start}T00:00:00Z`))}`}>
              {board.entries.length === 0 && <li className="p-4 text-sm text-muted">Nobody on the board yet this week. Be the first.</li>}
              {board.entries.map((e, i) => (
                <li key={`${e.rank}-${e.name}-${i}`} className={`flex items-center gap-3 px-4 py-3 ${e.me ? 'bg-signal-soft' : ''}`}>
                  <span className="w-8 shrink-0 text-center font-display text-lg font-bold tabular-nums text-heading">{e.rank}</span>
                  <span className="min-w-0 flex-1 font-semibold text-heading">{e.name}{e.me && <span className="font-normal text-muted"> (you)</span>}</span>
                  <span className="tabular-nums text-body">{e.points}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
    </>
  );
}
