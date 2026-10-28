import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, ProgressBar, RouteLine, Stamp } from '@/components/ui';
import { LandingHead, LandingSection } from './LandingHead';

/**
 * E6 · "Your route to the offer" (UI_REDESIGN_PLAN_V3 §9): a company's rounds
 * as TieEdu's own route line, ending at the offer stamp, beside a test-day
 * card with a readiness bar and its goal tick. Sample data, labelled.
 */
export const RoutePath: React.FC = () => (
  <LandingSection labelledBy="route-title" className="border-y border-line bg-app-warm">
    <LandingHead
      id="route-title"
      eyebrow="Exam prep"
      title="Tell TieEdu the drive date. Get a plan for every day."
      lead="Your company's rounds, in order, with the days between them filled in."
    />

    <div className="mx-auto mt-12 max-w-5xl rounded-band border border-line bg-card p-6 shadow-pop sm:p-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Sample route · Infosys</p>
          <p className="mt-1 font-display text-h2 text-heading">Systems engineer, 2026 drive</p>
        </div>
        <div className="w-full rounded-card border border-line bg-app p-4 sm:w-72">
          <p className="eyebrow">Test day</p>
          <p className="font-display text-h3 text-heading">In 6 days</p>
          <ProgressBar value={77} goal={90} label="Ready now" className="mt-3" />
          <p className="mt-2 text-caption text-muted">
            Ready <span className="font-semibold text-heading">77%</span> now · goal 90%
          </p>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto pb-2">
        <div className="min-w-[640px]">
          <RouteLine
            stations={[
              { label: 'Aptitude', note: 'Done', state: 'done' },
              { label: 'Coding', note: 'Done', state: 'done' },
              { label: 'Technical', note: 'Start · 9 min', state: 'current' },
              { label: 'HR', note: 'Next 3 days', state: 'next' },
              { label: 'Offer', state: 'next' },
            ]}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col items-start gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Stamp kind="pending">Sample plan · yours uses your company and date</Stamp>
        <Button href="/study-plan" icon={ArrowRight} iconEnd>
          Make my plan
        </Button>
      </div>
    </div>
  </LandingSection>
);

export default RoutePath;
