import React from 'react';
import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';

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
        <Link href="/courses?bucket=a&src=faq" className="font-semibold text-link hover:underline">
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
        <Link href="/verify" className="font-semibold text-link hover:underline">
          verification page
        </Link>{' '}
        showing who it was issued to, for which course, and when. Anyone can check it.
      </>
    ),
  },
  {
    q: 'What if a round was different from what TieEdu showed?',
    a: (
      <>
        The{' '}
        <Link href="/guarantee" className="font-semibold text-link hover:underline">
          accuracy guarantee
        </Link>{' '}
        covers it: if a round&apos;s pattern was different, you get your money back for that company&apos;s content.
      </>
    ),
  },
  {
    q: 'Can my parents see how I am doing?',
    a: (
      <>
        Only if you choose to. You can create a parent link from your Today screen; it shows your progress, and you can
        turn it off at any time.
      </>
    ),
  },
  {
    q: 'Can I use TieEdu in Hinglish?',
    a: <>Yes. Switch the language from the header (or the menu on a phone), and the app follows.</>,
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
        <Link href="/colleges" className="font-semibold text-link hover:underline">
          TieEdu for colleges
        </Link>
        .
      </>
    ),
  },
];

/*
 * Warm Paper E14: a left-aligned "Questions" heading and stacked white rows
 * with an edge and +/−. Still native <details>, so it works without JavaScript.
 */
export const HomeFaq: React.FC = () => (
  <section className="py-16 sm:py-24" aria-labelledby="faq-title">
    <div className="mx-auto w-full max-w-[860px] px-4 sm:px-6">
      <p className="eyebrow mb-3">Before you start</p>
      <h2 id="faq-title" className="font-display text-section text-heading">
        Questions
      </h2>
      <div className="mt-8 flex flex-col gap-3">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group rounded-cell border border-line bg-card shadow-edge-neutral">
            <summary className="focus-ring flex min-h-[56px] list-none items-center justify-between gap-4 rounded-cell px-5 py-4 font-display text-base font-semibold text-heading [&::-webkit-details-marker]:hidden">
              {q}
              <Plus className="h-5 w-5 shrink-0 text-muted group-open:hidden" aria-hidden />
              <Minus className="hidden h-5 w-5 shrink-0 text-muted group-open:block" aria-hidden />
            </summary>
            <p className="px-5 pb-5 pr-10 text-body-md text-muted">{a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

export default HomeFaq;
