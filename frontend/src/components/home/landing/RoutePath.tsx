import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, Stamp } from '@/components/ui';
import { StudyCircuit } from './StudyCircuit';
import { LandingHead, LandingSection } from './LandingHead';

/**
 * E6 · "Your route to the offer" (UI_REDESIGN_PLAN_V3 §9): a company's rounds
 * as TiEEdu's own route line, ending at the offer stamp, beside a test-day
 * card with a readiness bar and its goal tick. Sample data, labelled.
 */
export const RoutePath: React.FC = () => (
  <LandingSection labelledBy="route-title" className="border-y border-line bg-app-warm">
    <LandingHead
      id="route-title"
      eyebrow="Exam prep"
      title="Tell TiEEdu the drive date. Get a plan for every day."
      lead="Your company's rounds, in order, with the days between them filled in."
    />

    <div className="mx-auto mt-12 max-w-5xl rounded-band border border-line bg-card p-6 shadow-pop sm:p-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Sample route · Infosys</p>
          <p className="mt-1 font-display text-h2 text-heading">Systems engineer, 2026 drive</p>
        </div>
      </div>

      {/* The plan as a circuit: done steps lit, today's step as a ticket, readiness at the end. */}
      <div className="mt-10">
        <StudyCircuit />
      </div>

      <div className="mt-8 flex flex-col items-start gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Stamp kind="pending">Sample plan · yours uses your company and date</Stamp>
        <Button href="/signup" icon={ArrowRight} iconEnd>
          Make my plan
        </Button>
      </div>
    </div>
  </LandingSection>
);

export default RoutePath;
