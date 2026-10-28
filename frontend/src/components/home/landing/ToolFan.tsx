import React from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, CalendarCheck, HeartHandshake, Mic, SpellCheck, Timer, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { LandingHead, LandingSection } from './LandingHead';

/**
 * E5 · "8 ways to practise" (UI_REDESIGN_PLAN_V3 §9): tall tinted cards fanned
 * with a slight rotation on desktop, one swipeable row on phones. Every card
 * is a link to the real tool; the preview inside is a drawing, not data.
 */

interface Tool {
  title: string;
  caption: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Card surface and its text colour, from the tint set. */
  tone: string;
  /** Icon tile on that surface. */
  tile: string;
  preview: 'bars' | 'chat' | 'steps' | 'check' | 'clock' | 'grid';
}

const TOOLS: Tool[] = [
  { title: 'Skill test', caption: 'Free, scored, with a certificate', href: '/skill-test', icon: BadgeCheck, tone: 'bg-signal-soft text-signal-ink', tile: 'bg-signal text-on-primary', preview: 'bars' },
  { title: 'Mock interview', caption: 'Answer out loud, get feedback', href: '/mock-interview', icon: Mic, tone: 'bg-info-soft text-info', tile: 'bg-info text-white', preview: 'chat' },
  { title: 'Company rounds', caption: 'Every round, in order', href: '/companies', icon: Building2, tone: 'bg-hero text-hero-on', tile: 'bg-signal text-on-primary', preview: 'steps' },
  { title: 'English coach', caption: 'Fix how you say it', href: '/english-coach', icon: SpellCheck, tone: 'bg-secondary-soft text-secondary', tile: 'bg-secondary text-white', preview: 'chat' },
  { title: 'Daily challenge', caption: 'Three questions a day', href: '/daily', icon: CalendarCheck, tone: 'bg-app-warm text-heading border border-line', tile: 'bg-highlight text-heading', preview: 'check' },
  { title: 'Mock drive', caption: 'A full test day, timed', href: '/drives', icon: Timer, tone: 'bg-heading text-card', tile: 'bg-signal text-on-primary', preview: 'clock' },
  { title: 'Peer interview', caption: 'Practise with another student', href: '/peer-mock', icon: Users, tone: 'bg-success-soft text-success', tile: 'bg-success text-white', preview: 'chat' },
  { title: 'After a rejection', caption: 'What to fix before the next one', href: '/debrief', icon: HeartHandshake, tone: 'bg-rose-soft text-rose', tile: 'bg-rose text-white', preview: 'grid' },
];

// Rotation per card, fanning out from the middle (desktop only).
const FAN = ['lg:-rotate-[9deg]', 'lg:-rotate-[6deg]', 'lg:-rotate-[3deg]', 'lg:-rotate-1', 'lg:rotate-1', 'lg:rotate-[3deg]', 'lg:rotate-[6deg]', 'lg:rotate-[9deg]'];
const LIFT = ['lg:translate-y-6', 'lg:translate-y-3', 'lg:translate-y-1', 'lg:translate-y-0', 'lg:translate-y-0', 'lg:translate-y-1', 'lg:translate-y-3', 'lg:translate-y-6'];

const Preview: React.FC<{ kind: Tool['preview'] }> = ({ kind }) => {
  const line = 'h-2 rounded-full bg-current opacity-20';
  switch (kind) {
    case 'bars':
      return (
        <div className="flex h-20 items-end gap-2">
          {[40, 70, 55, 90, 65].map((h, i) => (
            <span key={i} className="flex-1 rounded-t-md bg-current opacity-25" style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    case 'chat':
      return (
        <div className="space-y-2">
          <span className="ml-auto block h-6 w-3/4 rounded-bubble bg-current opacity-15" />
          <span className="block h-6 w-2/3 rounded-bubble bg-current opacity-25" />
          <span className="ml-auto block h-6 w-1/2 rounded-bubble bg-current opacity-15" />
        </div>
      );
    case 'steps':
      return (
        <div className="flex items-center gap-1.5 pt-6">
          {[0, 1, 2, 3].map((i) => (
            <React.Fragment key={i}>
              <span className={cn('h-4 w-4 flex-none rounded-full', i < 2 ? 'bg-signal' : 'border-2 border-current opacity-40')} />
              {i < 3 ? <span className="h-0.5 flex-1 bg-current opacity-30" /> : null}
            </React.Fragment>
          ))}
        </div>
      );
    case 'check':
      return (
        <div className="space-y-2.5">
          {[1, 1, 0].map((done, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={cn('h-4 w-4 flex-none rounded', done ? 'bg-success' : 'border-2 border-current opacity-40')} />
              <span className={cn(line, 'flex-1')} />
            </div>
          ))}
        </div>
      );
    case 'clock':
      return <p className="pt-4 font-mono text-h2 tabular-nums opacity-80">01:29:58</p>;
    default:
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-7 rounded-md bg-current opacity-15" />
          ))}
        </div>
      );
  }
};

export const ToolFan: React.FC = () => (
  <LandingSection labelledBy="tools-title" className="overflow-hidden">
    <LandingHead id="tools-title" eyebrow="Practise" title="8 ways to practise" lead="Each one is the real tool. Tap a card to open it." />

    <ul className="rail-track mt-12 pb-4 lg:justify-center lg:!gap-0 lg:!overflow-visible lg:!pb-10" role="list">
      {TOOLS.map((t, i) => {
        const Icon = t.icon;
        return (
          <li key={t.title} className={cn('w-[230px] flex-none lg:-mx-4 lg:w-[172px]', 'lg:transition-transform lg:duration-flip lg:ease-paper lg:hover:z-10 lg:hover:-translate-y-3 lg:hover:rotate-0', FAN[i], LIFT[i])}>
            <Link href={t.href} className={cn('tk-inherit-p focus-ring flex h-[300px] flex-col rounded-card p-4 shadow-pop', t.tone)}>
              <span className="flex items-center gap-2.5">
                <span className={cn('inline-flex h-9 w-9 flex-none items-center justify-center rounded-well', t.tile)} aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-display text-h3 leading-tight">{t.title}</span>
              </span>
              <span className="mt-6 flex-1" aria-hidden>
                <Preview kind={t.preview} />
              </span>
              <span className="text-sm opacity-90">{t.caption}</span>
            </Link>
          </li>
        );
      })}
    </ul>

    <div className="mt-8 flex justify-center">
      <Button href="/skill-test" icon={ArrowRight} iconEnd size="lg">
        Try a tool free
      </Button>
    </div>
  </LandingSection>
);

export default ToolFan;
