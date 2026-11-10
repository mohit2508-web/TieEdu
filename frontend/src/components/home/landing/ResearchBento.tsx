import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LandingHead, LandingSection } from './LandingHead';

/**
 * E10 · "Why practising this way works" (UI_REDESIGN_PLAN_V3 §9, decision D5).
 *
 * Real, linked studies only. Each card states what the study found in plain
 * words, with no number we have not checked against the paper, and cites it in
 * full with its DOI. The last card says how TiEEdu uses the finding — a
 * description of the product, not a result. A TiEEdu-data card joins only when
 * we have a measured result to show.
 */

interface Study {
  big: string;
  claim: string;
  cite: string;
  doi: string;
  tone: string;
  bigTone: string;
  span?: string;
}

const STUDIES: Study[] = [
  {
    big: 'Test, don’t re-read',
    claim:
      'Students who practised recalling a passage remembered more of it a week later than students who spent the same time reading it again.',
    cite: 'Roediger & Karpicke (2006). Test-enhanced learning. Psychological Science, 17(3), 249–255.',
    doi: '10.1111/j.1467-9280.2006.01693.x',
    tone: 'bg-hero text-hero-on grid-paper-on-hero',
    bigTone: 'text-signal',
    span: 'lg:col-span-2 lg:row-span-2',
  },
  {
    big: '2 of 10',
    claim: 'A review of ten common study techniques rated only two as highly useful: practice testing and spreading practice out over time.',
    cite: 'Dunlosky et al. (2013). Improving students’ learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4–58.',
    doi: '10.1177/1529100612453266',
    tone: 'bg-signal-soft text-signal-ink',
    bigTone: 'text-heading',
  },
  {
    big: 'Spaced beats crammed',
    claim: 'Across hundreds of experiments, the same practice split over several sessions was remembered better than practice packed into one.',
    cite: 'Cepeda et al. (2006). Distributed practice in verbal recall tasks. Psychological Bulletin, 132(3), 354–380.',
    doi: '10.1037/0033-2909.132.3.354',
    tone: 'bg-secondary-soft text-secondary',
    bigTone: 'text-heading',
  },
];

export const ResearchBento: React.FC = () => (
  <LandingSection labelledBy="research-title">
    <LandingHead
      id="research-title"
      eyebrow="The research"
      title="Why practising this way works"
      lead="TiEEdu is built on two of the best-tested findings about learning."
    />

    <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-4 lg:grid-rows-2">
      {STUDIES.map((s) => (
        <figure key={s.doi} className={cn('tk-inherit-p flex flex-col rounded-band p-6 sm:p-8', s.tone, s.span)}>
          <p className={cn('font-display font-bold leading-tight tracking-[-0.03em]', s.span ? 'text-[clamp(34px,4vw,48px)]' : 'text-h1', s.bigTone)}>{s.big}</p>
          <blockquote className="mt-4 flex-1 text-body-md">{s.claim}</blockquote>
          <figcaption className="mt-5 text-caption italic opacity-90">
            {s.cite}{' '}
            <a
              href={`https://doi.org/${s.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1 font-semibold not-italic underline underline-offset-2"
            >
              doi.org/{s.doi}
              <ExternalLink className="h-3 w-3" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </figcaption>
        </figure>
      ))}

      <div className="flex flex-col rounded-band border border-line bg-card p-6 sm:p-8 lg:col-span-2">
        <p className="eyebrow">How TiEEdu uses it</p>
        <ul className="mt-4 space-y-3 text-body-md text-body">
          <li>
            <span className="font-display font-semibold text-heading">Practice testing:</span> every round has a skill test, and
            mock interviews ask you to answer, not read.
          </li>
          <li>
            <span className="font-display font-semibold text-heading">Spaced practice:</span> the daily challenge and your study
            plan spread the work over the days before the drive.
          </li>
        </ul>
      </div>
    </div>
  </LandingSection>
);

export default ResearchBento;
