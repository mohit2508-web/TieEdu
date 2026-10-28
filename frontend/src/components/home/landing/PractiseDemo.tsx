import React, { useRef, useState } from 'react';
import { ArrowRight, GraduationCap, Keyboard, Mic, SpellCheck, UserRound, Users } from 'lucide-react';
import { Button, IconTile } from '@/components/ui';
import { cn } from '@/lib/cn';
import { LandingHead, LandingSection } from './LandingHead';

/**
 * E9 · "Practise out loud, get feedback" (UI_REDESIGN_PLAN_V3 §9): tabs as
 * cards, then a demo conversation on graph paper — the student's answer, the
 * feedback card, and the next step. The conversation is an example of the
 * feedback format, labelled as one; each tab opens the real tool.
 */

type TabId = 'speak' | 'type' | 'mock' | 'english';

const TABS: Array<{ id: TabId; title: string; caption: string; icon: React.ComponentType<{ className?: string }>; href: string; cta: string }> = [
  { id: 'speak', title: 'Speak', caption: 'Answer out loud', icon: Mic, href: '/mock-interview', cta: 'Do a full mock HR interview' },
  { id: 'type', title: 'Type', caption: 'Write your answer', icon: Keyboard, href: '/mock-interview', cta: 'Practise five HR questions' },
  { id: 'mock', title: 'Mock interview', caption: 'A full round', icon: Users, href: '/peer-mock', cta: 'Book a peer mock interview' },
  { id: 'english', title: 'English coach', caption: 'Say it better', icon: SpellCheck, href: '/english-coach', cta: 'Open the English coach' },
];

const QUESTION: Record<TabId, string> = {
  speak: 'Tell me about yourself.',
  type: 'Why do you want to join us?',
  mock: 'Walk me through a project you built.',
  english: 'Describe a challenge you faced.',
};

const ANSWER: Record<TabId, string> = {
  speak: 'I am a final-year ECE student. I did a project on a smart irrigation system and I like coding in Python.',
  type: 'Because it is a big company and I will learn a lot.',
  mock: 'I made a college events app with React. Me and my friend did it in two months.',
  english: 'In my internship the deadline was very less, so I worked extra.',
};

const TRY: Record<TabId, [string, string]> = {
  speak: ['I like coding in Python', 'I used Python to read the soil sensors and cut water use in our test bed'],
  type: ['it is a big company', 'your training programme for freshers fits how I want to start'],
  mock: ['Me and my friend did it', 'A friend and I built it'],
  english: ['the deadline was very less', 'the deadline was very tight'],
};

export const PractiseDemo: React.FC = () => {
  const [tab, setTab] = useState<TabId>('speak');
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = TABS.find((t) => t.id === tab)!;
  const [said, better] = TRY[tab];

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <LandingSection labelledBy="demo-title" className="border-y border-line bg-app-warm">
      <LandingHead
        id="demo-title"
        eyebrow="Interview practice"
        title="Practise out loud, get feedback"
        lead="Say or type your answer. You get what worked, and one thing to say differently."
      />

      <div role="tablist" aria-label="Ways to practise" className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 lg:grid-cols-4">
        {TABS.map((t, i) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`demo-tab-${t.id}`}
              aria-selected={on}
              aria-controls="demo-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'focus-ring flex items-center gap-3 rounded-card border bg-card p-3 text-left transition-shadow duration-flip',
                on ? 'border-signal shadow-[inset_0_0_0_2px_rgb(var(--rgb-signal))]' : 'border-line shadow-edge-neutral hover:bg-surface-hover'
              )}
            >
              <IconTile icon={t.icon} tone={on ? 'primary' : 'neutral'} size="sm" />
              <span className="min-w-0">
                <span className="block font-display text-label text-heading">{t.title}</span>
                <span className="block text-caption text-muted">{t.caption}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="demo-panel"
        role="tabpanel"
        aria-labelledby={`demo-tab-${tab}`}
        className="grid-paper mx-auto mt-6 max-w-4xl rounded-band border border-line bg-card p-4 sm:p-8"
      >
        <p className="eyebrow mb-4 text-center">Example feedback</p>

        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-secondary-soft text-secondary" aria-hidden>
            <GraduationCap className="h-4 w-4" />
          </span>
          <p className="rounded-bubble border border-line bg-card px-4 py-3 text-body-md text-heading">{QUESTION[tab]}</p>
        </div>

        <div className="mt-4 flex items-start justify-end gap-3">
          <p className="max-w-[80%] rounded-bubble bg-signal-soft px-4 py-3 text-body-md text-signal-ink">{ANSWER[tab]}</p>
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-highlight text-heading" aria-hidden>
            <UserRound className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4 rounded-card border border-line bg-card p-5 sm:ml-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-success-soft px-2.5 py-0.5 font-display text-chip font-semibold text-success">Clear answer</span>
            <span className="rounded-full bg-info-soft px-2.5 py-0.5 text-chip font-medium text-info">One thing to change</span>
          </div>
          <p className="mt-3 font-display text-label text-heading">What worked</p>
          <p className="text-body-md text-body">You answered the question directly and kept it short.</p>
          <p className="mt-3 font-display text-label text-heading">Try this</p>
          <p className="text-body-md text-body">
            You said <span className="rounded bg-danger-soft px-1 text-danger line-through">{said}</span>, try{' '}
            <span className="rounded bg-success-soft px-1 text-success">{better}</span>.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-card border border-line bg-app p-4 sm:ml-12 sm:flex-row sm:items-center sm:justify-between">
          <span>
            <span className="block font-display text-label text-heading">{active.cta}</span>
            <span className="block text-caption text-muted">Free to try</span>
          </span>
          <Button href={active.href} icon={ArrowRight} iconEnd size="sm">
            Start
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-2">
        <span className="eyebrow mr-1">The app speaks</span>
        <span className="rounded-full border border-line bg-card px-3 py-1 text-chip">English</span>
        <span className="rounded-full border border-signal/40 bg-signal-soft px-3 py-1 text-chip font-medium text-signal-ink shadow-edge-selected">Hinglish</span>
      </div>
    </LandingSection>
  );
};

export default PractiseDemo;
