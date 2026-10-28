import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { ArrowRight, BookOpen, Briefcase, CalendarCheck, Flame, Inbox, IndianRupee, Moon, ShoppingBag, Sun, Timer, Trophy, Users } from 'lucide-react';
import { RequireAdmin } from '@/components/auth/RequireAdmin';
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Cover,
  DeviceFrame,
  EmptyState,
  FloatingChip,
  IconTile,
  Marquee,
  ProgressBar,
  ProgressRing,
  RadioCard,
  RouteLine,
  SectionHead,
  SegmentedControl,
  Stamp,
  StatTile,
  Ticket,
} from '@/components/ui';

/**
 * /design — the living style guide (UI_REDESIGN_PLAN_V3 §10). Admin-only and
 * noindex. Every token and component renders here from the real code, so this
 * page cannot drift from the product; if something looks wrong here, it looks
 * wrong everywhere.
 *
 * The theme switch flips `data-theme` on <html> for this page only and puts it
 * back on unmount — dark mode has no user-facing toggle yet (Phase 5).
 */

const COLOURS: Array<{ group: string; tokens: Array<[string, string]> }> = [
  { group: 'Surfaces', tokens: [['paper', 'bg-app'], ['card', 'bg-surface'], ['hover', 'bg-surface-hover'], ['line', 'border-subtle'], ['line strong', 'border-strong']] },
  { group: 'Text', tokens: [['heading', 'text-heading'], ['body', 'text-body'], ['muted', 'text-muted'], ['light', 'text-light'], ['brand ink', 'brand-ink']] },
  { group: 'Action (amber)', tokens: [['primary', 'signal'], ['primary hover', 'signal-hover'], ['primary tint', 'signal-soft'], ['text on tint', 'signal-ink'], ['text on primary', 'on-primary'], ['highlight', 'highlight']] },
  { group: 'Teal and logo', tokens: [['link', 'link'], ['secondary tint', 'secondary-soft'], ['band', 'brand-ink'], ['on band', 'on-hero'], ['on band muted', 'on-hero-muted'], ['logo (fixed)', 'logo']] },
  { group: 'Tints', tokens: [['info', 'info'], ['info tint', 'info-soft'], ['rose', 'rose'], ['rose tint', 'rose-soft'], ['edge', 'edge'], ['paper rule', 'paper-rule']] },
  { group: 'Modes', tokens: [['train', 'train'], ['test', 'test'], ['track', 'track']] },
  { group: 'States', tokens: [['success', 'success'], ['warning', 'warning'], ['danger', 'danger'], ['info', 'info']] },
];

const TYPE: Array<[string, string, string]> = [
  ['headline', 'text-headline font-display', 'Your placement, round by round'],
  ['section', 'text-section font-display', 'Every round, explained'],
  ['display · 34', 'text-display font-display', 'Know every round'],
  ['h1 · 28', 'text-h1 font-display', 'Page title'],
  ['h2 · 22', 'text-h2 font-display', 'Section heading'],
  ['h3 · 17', 'text-h3 font-display', 'Card title'],
  ['body-lg · 17', 'text-body-lg', 'Lead paragraph text, and lessons.'],
  ['body · 15', 'text-body-md', 'Body text for reading and forms.'],
  ['label · 15', 'text-label font-display', 'Button and field labels'],
  ['chip · 13', 'text-chip font-medium', 'Chips and small UI'],
  ['caption · 12', 'text-caption', 'Captions. Nothing smaller.'],
  ['eyebrow · 11', 'eyebrow', 'Mono caps eyebrow'],
];

const Swatch: React.FC<{ name: string; channel: string }> = ({ name, channel }) => (
  <div className="min-w-0">
    <div className="h-14 rounded-lg border border-line" style={{ background: `rgb(var(--rgb-${channel}))` }} />
    <p className="mt-1.5 text-xs font-semibold text-heading">{name}</p>
    <p className="text-xs text-muted">--rgb-{channel}</p>
  </div>
);

const Block: React.FC<{ title: string; children: React.ReactNode; note?: string }> = ({ title, note, children }) => (
  <section className="border-t border-line py-10">
    <h2 className="font-display text-xl font-bold text-heading">{title}</h2>
    {note ? <p className="mt-1 max-w-2xl text-sm text-muted">{note}</p> : null}
    <div className="mt-6">{children}</div>
  </section>
);

const DesignGuide: React.FC = () => {
  const [dark, setDark] = useState(false);
  const [filter, setFilter] = useState('All');
  const [ring, setRing] = useState(64);
  const [stampKey, setStampKey] = useState(0);
  const [segment, setSegment] = useState<'oa' | 'tech' | 'hr'>('oa');
  const [plan, setPlan] = useState<'free' | 'pack'>('pack');

  useEffect(() => {
    const el = document.documentElement;
    const before = el.getAttribute('data-theme');
    if (dark) el.setAttribute('data-theme', 'dark');
    else el.removeAttribute('data-theme');
    return () => {
      if (before) el.setAttribute('data-theme', before);
      else el.removeAttribute('data-theme');
    };
  }, [dark]);

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <SectionHead
          level={1}
          eyebrow="Warm Paper"
          title="Design system"
          description="Every token and component, rendered from the real code. Use these instead of one-off classes; the design-system test fails on hand-picked sizes and colours."
          action={
            <Button kind="secondary" icon={dark ? Sun : Moon} onClick={() => setDark((d) => !d)}>
              {dark ? 'Light theme' : 'Dark theme'}
            </Button>
          }
        />

        <Block title="Colour" note="Declared once as RGB channels in globals.css, swapped wholesale for dark mode. Amber fills the one next step and carries dark ink, never white; teal is for links and the band; the logo colour never changes.">
          <div className="space-y-6">
            {COLOURS.map((g) => (
              <div key={g.group}>
                <p className="eyebrow mb-3 text-muted">{g.group}</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {g.tokens.map(([n, c]) => (
                    <Swatch key={c} name={n} channel={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Type" note="Poppins for headings, buttons and numbers; Mukta for UI and lessons (Hindi included); JetBrains Mono for eyebrows, tags and code. Sentence case; only the mono eyebrow is under 12px.">
          <div className="space-y-4">
            {TYPE.map(([label, cls, sample]) => (
              <div key={label} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="w-24 shrink-0 text-xs font-semibold text-muted tabular-nums">{label}</span>
                <span className={`${cls} text-heading`}>{sample}</span>
              </div>
            ))}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-24 shrink-0 text-xs font-semibold text-muted">lesson</span>
              <p className="max-w-[720px] font-serif text-lg leading-relaxed text-body">
                A lesson reads like a well-made exercise book: Mukta at 17px, a 720px measure, and generous line height. यह हिंदी भी उसी फ़ॉन्ट में है।
              </p>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-24 shrink-0 text-xs font-semibold text-muted">mono</span>
              <code className="font-mono text-sm text-body">for (let i = 0; i &lt; n; i++) total += a[i];</code>
            </div>
          </div>
        </Block>

        <Block title="Buttons" note="One primary per screen. Buy is the same amber; the price makes it a purchase. Press moves the button down 2px.">
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={ArrowRight} iconEnd>Start round 1</Button>
            <Button kind="buy" icon={ShoppingBag}>Get the pack — ₹99</Button>
            <Button kind="secondary">Preview</Button>
            <Button kind="text">See all rounds</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Block>

        <Block title="Chips" note="Labels by meaning; filters are buttons with aria-pressed.">
          <div className="flex flex-wrap gap-2">
            {(['neutral', 'signal', 'money', 'train', 'test', 'track', 'success', 'warning', 'danger'] as const).map((t) => (
              <Chip key={t} tone={t}>{t}</Chip>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['All', 'OA', 'Technical', 'System design', 'HR'].map((f) => (
              <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
            ))}
          </div>
        </Block>

        <Block title="Stamps" note="Where a fact came from. Every number gets one, or says it is being verified.">
          <div className="flex flex-wrap items-center gap-4">
            <Stamp kind="verified">Verified · Oct 2026</Stamp>
            <Stamp kind="source">From 41 students</Stamp>
            <Stamp kind="pending">Being verified</Stamp>
            <Stamp key={stampKey} kind="verified" animate>Test passed</Stamp>
            <Button kind="text" size="sm" onClick={() => setStampKey((k) => k + 1)}>Replay landing</Button>
          </div>
        </Block>

        <Block title="Route line" note="Stations on a line for anything with steps. An ordered list; the current station is aria-current.">
          <div className="space-y-10">
            <RouteLine
              stations={[
                { label: 'Online assessment', note: '90 min', state: 'done' },
                { label: 'Technical R1', note: 'Core CS', state: 'current' },
                { label: 'System design', state: 'next' },
                { label: 'HR', state: 'next' },
              ]}
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <RouteLine
                orientation="vertical"
                stations={[
                  { label: 'Registered', note: '12 Oct', state: 'done' },
                  { label: 'Tested', note: '18 Oct', state: 'done' },
                  { label: 'Interviewed', state: 'current' },
                  { label: 'Offered', state: 'next' },
                ]}
              />
              <Card variant="ink">
                <p className="eyebrow mb-4 !text-hero-muted">On the band</p>
                <RouteLine
                  onInk
                  stations={[
                    { label: 'Year 2', state: 'done' },
                    { label: 'Skills', state: 'current' },
                    { label: 'Company', state: 'next' },
                    { label: 'Offer', state: 'next' },
                  ]}
                />
              </Card>
            </div>
          </div>
        </Block>

        <Block title="Progress and numbers">
          <div className="flex flex-wrap items-center gap-8">
            <ProgressRing value={ring} label="Zscaler readiness" caption="ready" />
            <ProgressRing value={82} label="Course progress" tone="train" size={72} />
            <ProgressRing value={45} label="Mock score" tone="test" size={72} />
            <ProgressRing value={100} label="Plan complete" tone="success" size={72} />
            <Button kind="secondary" size="sm" onClick={() => setRing((r) => (r >= 100 ? 10 : r + 15))}>Advance</Button>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="CTC range" icon={IndianRupee} value="18–32" unit="LPA" source={<Stamp kind="source" flat>From 12 offers</Stamp>} />
            <StatTile label="Process length" icon={Timer} value="14" unit="days" source={<Stamp kind="pending" flat>Being verified</Stamp>} />
            <StatTile label="Rounds" icon={Briefcase} value="4" note="OA, two technical, HR" />
            <StatTile label="Prepared this week" icon={Users} value="128" />
          </div>
        </Block>

        <Block title="Cards and tickets" note="Hairline by default; one raised card per screen; tickets for anything bought or earned.">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <p className="font-semibold text-heading">Plain card</p>
              <p className="mt-1 text-sm text-muted">Most cards. Hairline border, 20px radius.</p>
            </Card>
            <Card variant="raised">
              <p className="font-semibold text-heading">Raised card</p>
              <p className="mt-1 text-sm text-muted">The one card the screen is about.</p>
            </Card>
            <Card variant="ink">
              <p className="font-semibold">Band card</p>
              <p className="mt-1 text-sm text-hero-muted">The page&apos;s one teal area.</p>
            </Card>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Ticket stub={<><p className="text-xs font-semibold uppercase tracking-wider">Pack</p><p className="font-display text-2xl font-bold tabular-nums">₹99</p></>}>
              <p className="font-semibold text-heading">Zscaler round pack</p>
              <p className="mt-1 text-sm text-muted">4 rounds · lifetime access</p>
            </Ticket>
            <Ticket tone="ink" stub={<><p className="text-xs font-semibold uppercase tracking-wider text-white/75">No.</p><p className="font-display text-lg font-bold tabular-nums">TE-4821</p></>}>
              <p className="font-semibold text-heading">Python certificate</p>
              <p className="mt-1 text-sm text-muted">Scored 86% · verifiable at /verify</p>
            </Ticket>
          </div>
        </Block>

        <Block title="Tints, badges and icon tiles">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(['tint-primary', 'tint-secondary', 'tint-info', 'tint-rose', 'tint-success'] as const).map((v) => (
              <Card key={v} variant={v} pad="sm">
                <p className="font-display text-label">{v.replace('tint-', '')}</p>
                <p className="mt-1 text-sm">A note in its own colour.</p>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge>New</Badge>
            <Badge tone="success">Just added</Badge>
            <Badge tone="rose">50% off</Badge>
            <Badge tone="info">Beta</Badge>
            <Badge tone="neutral">Draft</Badge>
            <IconTile icon={Flame} />
            <IconTile icon={Trophy} tone="secondary" />
            <IconTile icon={CalendarCheck} tone="info" />
            <IconTile icon={Users} tone="rose" size="sm" />
          </div>
        </Block>

        <Block title="Controls" note="Segmented control and radio cards are radio groups: one Tab stop, arrow keys move.">
          <SegmentedControl
            label="Round"
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'oa', label: 'OA' },
              { value: 'tech', label: 'Technical' },
              { value: 'hr', label: 'HR' },
            ]}
          />
          <div role="radiogroup" aria-label="Plan" className="mt-4 grid max-w-xl grid-cols-1 gap-3">
            <RadioCard checked={plan === 'free'} onSelect={() => setPlan('free')} title="Free" description="Readiness check and round 1" aside="₹0" />
            <RadioCard checked={plan === 'pack'} onSelect={() => setPlan('pack')} title="Round pack" description="Every round, with mock tests" aside="₹99" />
          </div>
          <div className="mt-6 max-w-xl space-y-2">
            <ProgressBar value={ring} goal={80} label="Readiness" />
            <p className="text-caption text-muted">{ring}% ready · goal 80%</p>
          </div>
        </Block>

        <Block title="Accordion">
          <Accordion
            className="max-w-2xl"
            defaultOpen={['free']}
            items={[
              { id: 'free', question: 'Is the readiness check free?', answer: 'Yes. Pick a company and take it in about two minutes.' },
              { id: 'hindi', question: 'Can I study in Hinglish?', answer: 'Yes. Switch language from the header; lessons and the app follow.' },
            ]}
          />
        </Block>

        <Block title="Mock-ups and floating chips" note="Decorative frames for product shots. Floating chips bob unless reduced motion is on.">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_280px]">
            <div className="relative">
              <DeviceFrame url="tieedu.in/company/tcs">
                <div className="paper-lines mask-fade-b h-56 p-6">
                  <p className="font-display text-h2 text-heading">TCS NQT</p>
                  <p className="mt-1 text-sm text-muted">4 rounds · 12 days</p>
                </div>
              </DeviceFrame>
              <FloatingChip bob icon={Flame} title="7-day streak" caption="Keep it going" className="absolute -bottom-5 left-4" />
              <FloatingChip bob icon={Trophy} tone="secondary" title="Round 1 cleared" caption="Score 82%" className="absolute -right-2 top-14 hidden sm:inline-flex" />
            </div>
            <DeviceFrame kind="phone" className="mx-auto w-[260px]">
              <div className="h-[420px] p-5 pt-10">
                <p className="eyebrow">Today</p>
                <p className="mt-1 font-display text-h2 text-heading">Good evening</p>
              </div>
            </DeviceFrame>
          </div>
          <Marquee label="Companies" className="mt-10">
            {['TCS', 'Infosys', 'Wipro', 'Accenture', 'Zscaler', 'Cognizant', 'Capgemini'].map((c) => (
              <span key={c} className="rounded-cell border border-line bg-card px-5 py-3 font-display text-label text-heading shadow-edge-neutral">
                {c}
              </span>
            ))}
          </Marquee>
        </Block>

        <Block title="Generated covers" note="Pattern from the subject, colour from the title. Same course, same cover, everywhere.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Python Programming', 'Programming', 'Course · 24 lessons'],
              ['Digital Electronics', 'ECE', 'Course · 18 lessons'],
              ['Quantitative Aptitude', 'Maths', 'Course · 30 lessons'],
              ['Thermodynamics', 'Mechanical', 'Course · 12 lessons'],
              ['SQL for Placements', 'Databases', 'Course · 16 lessons'],
              ['Communication Skills', 'Soft skills', 'Course · 8 lessons'],
            ].map(([t, s, k]) => (
              <Cover key={t} title={t} subject={s} kicker={k} className="rounded-card" />
            ))}
          </div>
        </Block>

        <Block title="People and empty states">
          <div className="flex flex-wrap items-center gap-3">
            {['Aarav Sharma', 'Priya Nair', 'Rohan Gupta', 'Sneha Reddy', 'Kabir'].map((n) => (
              <Avatar key={n} name={n} />
            ))}
            <Avatar name="Large" size="lg" />
            <Avatar name="Small" size="sm" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EmptyState icon={Inbox} title="No interview experiences yet." note="Be the first from your batch to share one." action={{ label: 'Share your experience', onClick: () => undefined }} />
            <EmptyState icon={BookOpen} title="You have not started a course." action={{ label: 'Browse courses', onClick: () => undefined }} />
          </div>
        </Block>
      </div>
    </div>
  );
};

export default function DesignPage() {
  return (
    <>
      <Head>
        <title>Design system — TieEdu</title>
        <meta name="robots" content="noindex" />
      </Head>
      <RequireAdmin>
        <DesignGuide />
      </RequireAdmin>
    </>
  );
}
