import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { SectionHead } from '@/components/ui';

/**
 * The questions a student (or a parent) asks before paying for anything.
 *
 * Native <details>, so it works without JavaScript, is keyboard-operable and is
 * announced as expandable for free. Answers describe what the product does
 * today — no roadmap, no adjectives.
 */

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'What is free?',
    a: (
      <>
        Every skill test, the interview course, many of the courses, and the free pack on every company page. Paid
        items are company round packs and some courses, and the price is shown before you pay.
      </>
    ),
  },
  {
    q: 'Where does the company information come from?',
    a: (
      <>
        Each figure is either marked as checked, with its source and the date we checked it, or labelled as not yet
        verified. We would rather say “being verified” than show a number we cannot stand behind.
      </>
    ),
  },
  {
    q: 'I am in first year. Is this for me?',
    a: (
      <>
        Yes. Start with the{' '}
        <Link href="/courses?bucket=a&src=faq" className="font-semibold text-signal hover:underline">
          first-year courses
        </Link>{' '}
        and the free skill tests. The company pages matter most in your final year.
      </>
    ),
  },
  {
    q: 'Do the certificates mean anything?',
    a: (
      <>
        Each certificate has a serial number and a public{' '}
        <Link href="/verify" className="font-semibold text-signal hover:underline">
          verification page
        </Link>{' '}
        showing who it was issued to, for which course, and when. Anyone can check it.
      </>
    ),
  },
  {
    q: 'How do I pay?',
    a: <>By UPI. Your purchase unlocks as soon as the payment is verified, and it stays unlocked.</>,
  },
  {
    q: 'Can my college use TieEdu?',
    a: (
      <>
        Yes. Placement officers get a dashboard for their batch. See{' '}
        <Link href="/colleges" className="font-semibold text-signal hover:underline">
          TieEdu for colleges
        </Link>
        .
      </>
    ),
  },
];

export const HomeFaq: React.FC = () => (
  <section className="py-12 sm:py-16" aria-labelledby="faq-title">
    <div className="mx-auto w-full max-w-[760px] px-4 sm:px-6">
      <SectionHead id="faq-title" eyebrow="Questions" title="Before you start" />
      <div className="mt-6 divide-y divide-line border-y border-line">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group">
            <summary className="focus-ring flex min-h-[56px] list-none items-center justify-between gap-4 py-4 text-base font-semibold text-heading [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="pb-5 pr-8 text-base leading-relaxed text-body">{a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

export default HomeFaq;
