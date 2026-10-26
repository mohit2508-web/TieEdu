import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BookOpen, Check, Clock, MapPin, Pause, Play, Wind } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { fetchCompanyPage } from '@/lib/companyPagesApi';
import { fetchCompanyBySlug } from '@/lib/api';
import { cn } from '@/lib/cn';

/*
 * Drive-day mode (B6). One screen for the day of a company's test: when and
 * where to report, a documents checklist, a 15-minute revision list from the
 * company's own rounds, and a breathing timer.
 *
 * Everything the student types is kept on this device only (localStorage):
 * nothing here needs an account or the network once the page has loaded,
 * which is exactly the situation on a campus with bad signal.
 */

const DOCUMENTS = [
  'College ID card',
  'Government photo ID (Aadhaar, PAN or passport)',
  'Two printed copies of your resume',
  'Registration email or admit card (printed or screenshot)',
  '10th, 12th and semester marksheets (copies)',
  'Two passport-size photos',
  'Pen, and a charged phone or power bank',
];

const TIPS = [
  'Reach 30 minutes early. Late entry is the most common avoidable rejection.',
  'Keep your introduction to 60 seconds: name, branch, one project, why this company.',
  'In the online test, attempt every question you can before the hard ones.',
  'If you do not know an answer, say how you would find out. Never bluff.',
  'Ask one real question at the end of every interview round.',
];

interface DayState { time: string; venue: string; done: string[] }
const EMPTY: DayState = { time: '', venue: '', done: [] };
const storageKey = (slug: string) => `tieedu_driveday_${slug || 'general'}`;

function readState(slug: string): DayState {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export default function DriveDayPage() {
  const router = useRouter();
  const slug = typeof router.query.company === 'string' ? router.query.company : '';
  const [state, setState] = useState<DayState>(EMPTY);
  const [company, setCompany] = useState<string | null>(null);
  const [revision, setRevision] = useState<Array<{ title: string; href: string }>>([]);

  useEffect(() => {
    if (!router.isReady) return;
    setState(readState(slug));
    if (!slug) return;
    fetchCompanyBySlug(slug).then((c: any) => setCompany(c?.name || null)).catch(() => { /* the generic title stands */ });
    fetchCompanyPage(slug).then((cp: any) => {
      const sec = cp?.page?.sections?.find((s: any) => s.type === 'rounds_route');
      const items = ((sec?.data?.stations as any[]) || []).flatMap((st: any) =>
        (st.module_ids || []).slice(0, 1).map((m: string) => ({ title: `Skim: ${st.title}`, href: `/company/${slug}?m=${encodeURIComponent(m)}` }))
      );
      setRevision(items.slice(0, 4));
    }).catch(() => { /* the company link below still works */ });
  }, [router.isReady, slug]);

  const update = (patch: Partial<DayState>) => {
    setState((s) => {
      const next = { ...s, ...patch };
      try { window.localStorage.setItem(storageKey(slug), JSON.stringify(next)); } catch { /* private mode: lasts for this visit */ }
      return next;
    });
  };
  const toggle = (doc: string) => update({ done: state.done.includes(doc) ? state.done.filter((d) => d !== doc) : [...state.done, doc] });
  const packed = DOCUMENTS.filter((d) => state.done.includes(d)).length;
  const title = company ? `${company} test day` : 'Drive day';

  return (
    <>
      <Head>
        <title>{`${title} · TieEdu`}</title>
        <meta name="description" content="Everything for the day of a placement test: reporting time, documents checklist, 15-minute revision and a breathing timer." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">Drive-day mode</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">{title}</h1>
        <p className="mt-2 text-base text-body">You have prepared. This page is for the day itself. What you type here stays on this phone.</p>

        {/* When and where */}
        <Card pad="lg" className="mt-6">
          <h2 className="font-display text-lg font-bold text-heading">When and where</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-heading"><Clock className="h-4 w-4 text-signal" aria-hidden /> Reporting time</span>
              <input type="time" value={state.time} onChange={(e) => update({ time: e.target.value })} autoComplete="off" className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading" />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-heading"><MapPin className="h-4 w-4 text-signal" aria-hidden /> Venue or test link</span>
              <input type="text" value={state.venue} onChange={(e) => update({ venue: e.target.value })} autoComplete="off" placeholder="e.g. Seminar hall, block B" className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading placeholder:text-light" />
            </label>
          </div>
        </Card>

        {/* Documents */}
        <Card pad="lg" className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-heading">Documents</h2>
            <span className={cn('text-sm font-bold', packed === DOCUMENTS.length ? 'text-success' : 'text-muted')}>{packed} of {DOCUMENTS.length} packed</span>
          </div>
          <ul className="mt-3 space-y-1.5">
            {DOCUMENTS.map((doc) => {
              const on = state.done.includes(doc);
              return (
                <li key={doc}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(doc)}
                    className={cn('focus-ring flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-base leading-snug transition-colors', on ? 'border-success bg-success-soft text-heading' : 'border-line bg-card text-body')}
                  >
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2', on ? 'border-success bg-success text-white' : 'border-line-strong')}>
                      {on && <Check className="h-4 w-4" aria-hidden />}
                    </span>
                    <span className={cn('min-w-0', on && 'line-through decoration-success/60')}>{doc}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Revision */}
        <Card pad="lg" className="mt-4">
          <h2 className="font-display text-lg font-bold text-heading">15-minute revision</h2>
          <p className="mt-1 text-sm text-muted">One skim per round. Not new topics today: only what you already know.</p>
          <ul className="mt-3 space-y-1.5">
            {revision.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="focus-ring flex min-h-[44px] items-center gap-3 rounded-xl border border-line px-3.5 text-sm font-semibold text-heading hover:border-line-strong">
                  <BookOpen className="h-4 w-4 shrink-0 text-signal" aria-hidden /> {r.title}
                </Link>
              </li>
            ))}
            {slug && (
              <li>
                <Link href={`/company/${slug}`} className="focus-ring flex min-h-[44px] items-center gap-3 rounded-xl border border-line px-3.5 text-sm font-semibold text-heading hover:border-line-strong">
                  <BookOpen className="h-4 w-4 shrink-0 text-signal" aria-hidden /> {company ? `${company}’s rounds at a glance` : 'The company’s rounds at a glance'}
                </Link>
              </li>
            )}
            {!slug && (
              <li><Link href="/calendar" className="text-sm font-semibold text-signal hover:underline">Pick a company from your calendar</Link></li>
            )}
          </ul>
        </Card>

        <Breathing />

        {/* Reminders */}
        <Card pad="lg" className="mt-4">
          <h2 className="font-display text-lg font-bold text-heading">Five things to remember</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base text-body marker:font-bold marker:text-signal">
            {TIPS.map((t) => <li key={t}>{t}</li>)}
          </ol>
        </Card>
      </main>
    </>
  );
}

/** Box breathing, 4-4-4-4. With reduced motion the circle does not move; the words still lead. */
const PHASES = ['Breathe in', 'Hold', 'Breathe out', 'Hold'] as const;

function Breathing() {
  const [on, setOn] = useState(false);
  const [tick, setTick] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!on) return;
    timer.current = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [on]);

  const phase = Math.floor(tick / 4) % 4;
  const count = 4 - (tick % 4);
  const big = phase === 0 || phase === 1;

  return (
    <Card variant="ink" pad="lg" className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white"><Wind className="h-5 w-5 text-money" aria-hidden /> One minute to calm down</h2>
        <Button kind="secondary" size="sm" icon={on ? Pause : Play} onClick={() => { setOn((v) => !v); if (on) setTick(0); }}>{on ? 'Stop' : 'Start'}</Button>
      </div>
      <div className="mt-6 flex flex-col items-center">
        <div
          aria-hidden
          className={cn('rounded-full bg-money/25 ring-2 ring-money/60 transition-transform duration-[4000ms] ease-in-out motion-reduce:transition-none', on && big ? 'scale-100' : 'scale-50')}
          style={{ width: 160, height: 160 }}
        />
        <p className="mt-4 font-display text-2xl font-bold text-white" aria-live="polite">{on ? `${PHASES[phase]} · ${count}` : 'Four counts in, hold, out, hold'}</p>
        <p className="mt-1 text-sm text-white/70">Four rounds is about a minute.</p>
      </div>
    </Card>
  );
}
