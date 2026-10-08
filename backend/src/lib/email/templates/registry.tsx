/**
 * The template registry — one entry per distinct email the platform can send.
 *
 * Distinctness is the point. A "buy course", a vault unlock, a skill test and
 * an offer are four different conversations with different asks; sending them
 * as one generic blast with a swapped subject line is what makes marketing
 * email feel like marketing email. Each entry owns its copy, its structure and
 * its subject so it can be reviewed, previewed and improved independently.
 *
 * Copy rules baked in here: subjects ≤ 50 characters, no ALL-CAPS, no fake
 * urgency, no invented testimonials (the `proof` template renders testimonials
 * only when the caller supplies real ones in `vars`), at most five links per
 * email, every site link through `p.href()` so it is tracked.
 */
import React from 'react';
import { Button, Check, FAQ, H2, Layout, Note, P, PriceRow, TemplateDef, TemplateProps, V, greeting } from './base';
import type { EmailTemplateId } from '../../../data/db';

const DEFAULTS = {
  course_title: 'Advanced Data Structures',
  course_path: '/courses/advanced-data-structures',
  course_tagline: 'Hashing, trees, heaps and graphs — built, benchmarked, and chosen with a procedure you can defend',
  course_price: '₹1,299',
  coupon: 'TYEAR20',
  vault_company: 'TCS',
  vault_path: '/company/tcs',
  vault_price: '₹99',
  skill_path: '/skill-test',
  free_course_path: '/courses/coding-foundations',
};

const vars = (p: TemplateProps): Record<string, string> =>
  Object.fromEntries(Object.entries(DEFAULTS).map(([k, d]) => [k, V(p, k, d)]));

/* ------------------------------------------------------------------ welcome */

const Welcome: React.FC<TemplateProps> = (p) => {
  const v = vars(p);
  return (
    <Layout preview="Free resources to start placement prep from second year." unsubUrl={p.unsubUrl}>
      <P>{greeting(p)}</P>
      <P>
        Most students start thinking about placements in third year — and then discover the prep
        actually takes a year. Starting now, in second, is the entire advantage. Here is what you
        can use today, free:
      </P>
      <H2>Start with these</H2>
      <Check>
        <a href={p.href(v.free_course_path)} style={{ color: '#0284C7' }}>Coding Foundations</a> — programming
        fundamentals, zero cost, start this week.
      </Check>
      <Check>
        <a href={p.href('/skill-test')} style={{ color: '#0284C7' }}>Free skill test</a> — 20 questions,
        instant score, a certificate for your resume.
      </Check>
      <Check>
        <a href={p.href(v.vault_path)} style={{ color: '#0284C7' }}>{v.vault_company} prep vault</a> — see the
        actual round pattern before you ever sit for it.
      </Check>
      <P>
        Over the next few days I will send you the two things worth paying attention to: the course
        that covers the part of placements nobody self-studies well, and how the company-specific
        prep works. Nothing else.
      </P>
      <Note>If any of this is not relevant to you, one click below and you are out.</Note>
    </Layout>
  );
};

/* ---------------------------------------------------------------- course-buy */

const CourseBuy: React.FC<TemplateProps> = (p) => {
  const v = vars(p);
  return (
    <Layout preview="The part of placements that is hard to self-study." unsubUrl={p.unsubUrl}>
      <P>{greeting(p)}</P>
      <P>
        Placement rounds do not test whether you have read a book. They test whether you can choose
        the right structure under a 40-minute timer. That skill is what{' '}
        <strong>{v.course_title}</strong> teaches — built, benchmarked and defended, not memorised.
      </P>
      <H2>What you will actually learn</H2>
      <Check>Complexity — and how to read it honestly instead of quoting big-O at interviews</Check>
      <Check>Hashing, trees, heaps: the structures that hold data under pressure</Check>
      <Check>Graphs, and the procedure for choosing one you can defend out loud</Check>
      <Check>Every module ends with benchmarked trade-offs, not trivia questions</Check>
      <PriceRow label={`${v.course_title} · lifetime access · certificate included`} price={v.course_price} />
      <P>
        Use code <strong>{v.coupon}</strong> at checkout for 20% off. It is how we track this
        campaign — and it is the only discount on this course.
      </P>
      <Button href={p.href(v.course_path)}>View the course</Button>
      <Note>
        Not sure yet? The course page shows the full module breakdown before you pay anything.
      </Note>
    </Layout>
  );
};

/* --------------------------------------------------------- course-buy-later */

const CourseBuyLater: React.FC<TemplateProps> = (p) => {
  const v = vars(p);
  return (
    <Layout preview="You checked this out — here is the one thing worth knowing." unsubUrl={p.unsubUrl}>
      <P>{greeting(p)}</P>
      <P>
        You opened the page for <strong>{v.course_title}</strong> and did not enrol. Fair — second
        year is busy. One thing worth knowing before you decide:
      </P>
      <P>
        This is a self-paced course. There are no live class timings to attend, and the modules are
        sized so one per week fits around college. The people who finish it are not the ones with
        more free time — they are the ones who started earlier than everyone else. You already did
        that part by clicking.
      </P>
      <PriceRow label={`${v.course_title} · lifetime access`} price={v.course_price} />
      <P>
        Code <strong>{v.coupon}</strong> still applies at checkout.
      </P>
      <Button href={p.href(v.course_path)}>Continue to the course</Button>
      <Note>
        If you would rather not hear about this again, the unsubscribe link is at the bottom — it
        works without logging in.
      </Note>
    </Layout>
  );
};

/* --------------------------------------------------------------------- vault */

const Vault: React.FC<TemplateProps> = (p) => {
  const v = vars(p);
  return (
    <Layout preview="The actual round pattern, before you sit for it." unsubUrl={p.unsubUrl}>
      <P>{greeting(p)}</P>
      <P>
        Every {v.vault_company} drive runs the same rounds — and every candidate walks in having
        practised the wrong things. The prep vault is organised around what that company actually
        asks, not generic question banks.
      </P>
      <H2>What is inside</H2>
      <Check>Round-by-round pattern: online assessment, coding round, interview rounds</Check>
      <Check>Topic weightage drawn from recent drives, so you revise what is tested</Check>
      <Check>Preparation guides with sample questions and expected difficulty</Check>
      <PriceRow label={`${v.vault_company} prep vault · entry pack`} price={v.vault_price} />
      <Button href={p.href(v.vault_path)}>Open the {v.vault_company} vault</Button>
      <Note>Premium packs (₹99–₹249) unlock the full vault — the entry pack gets you started.</Note>
    </Layout>
  );
};

/* ---------------------------------------------------------------- skill test */

const SkillTest: React.FC<TemplateProps> = (p) => {
  const v = vars(p);
  return (
    <Layout preview="20 questions, an instant score, a certificate." unsubUrl={p.unsubUrl}>
      <P>{greeting(p)}</P>
      <P>
        Resume lines are cheap. A verified score with a link anyone can check is not. The TieEdu
        skill test is free: answer the questions, get your score immediately, and if you clear the
        threshold, a signed certificate you can put on your resume and share.
      </P>
      <H2>How it works</H2>
      <Check>Pick a skill — programming, data, design, business</Check>
      <Check>Timed assessment with real questions, not multiple-choice filler</Check>
      <Check>Instant result with a topic-by-topic breakdown of weak areas</Check>
      <Check>Clear it, and the certificate comes with a public verification link</Check>
      <Button href={p.href(v.skill_path)}>Take a free test</Button>
      <Note>No payment details needed. The first attempt on every skill is free.</Note>
    </Layout>
  );
};

/* -------------------------------------------------------------------- proof */

const Proof: React.FC<TemplateProps> = (p) => {
  const v = vars(p);
  // Testimonials are rendered only when the caller passes real ones. Inventing
  // student quotes would be a fabricated claim — see the note in base.tsx.
  const t1 = V(p, 'testimonial_1', '');
  const t2 = V(p, 'testimonial_2', '');
  return (
    <Layout preview="What is actually inside — before you spend anything." unsubUrl={p.unsubUrl}>
      <P>{greeting(p)}</P>
      <P>
        Before deciding on {v.course_title}, it is fair to want to see the thing itself. Here is
        exactly what is in it:
      </P>
      <Check>Three modules — complexity, structures under pressure, and choosing well</Check>
      <Check>Every concept built from first principles, then benchmarked with real numbers</Check>
      <Check>Quizzes and assignments per module, with solutions explained</Check>
      <Check>Certificate on completion, verifiable from a public link</Check>
      {t1 || t2 ? (
        <>
          <H2>From students</H2>
          {t1 ? <P>&ldquo;{t1}&rdquo;</P> : null}
          {t2 ? <P>&ldquo;{t2}&rdquo;</P> : null}
        </>
      ) : null}
      <H2>Questions we get asked</H2>
      <FAQ q="Is it recorded? Can I go at my own pace?" a="Fully self-paced. Buy once, watch and rewatch — there is no expiry." />
      <FAQ q="Will this help in second year, or only in final-year placements?" a="The concepts are semester-one material for most colleges. Starting in second year is exactly why it works." />
      <FAQ q="What if it is not for me?" a="Write to support@tieedu.in within 7 days of purchase and we refund it. No forms." />
      <Button href={p.href(v.course_path)}>See the full breakdown</Button>
    </Layout>
  );
};

/* -------------------------------------------------------------------- offer */

const Offer: React.FC<TemplateProps> = (p) => {
  const v = vars(p);
  const deadline = V(p, 'deadline', 'tonight');
  return (
    <Layout preview="Last call — the code stops working soon." unsubUrl={p.unsubUrl}>
      <P>{greeting(p)}</P>
      <P>
        The code <strong>{v.coupon}</strong> on <strong>{v.course_title}</strong> expires{' '}
        {deadline}. After that the course goes back to its regular price and this code stops
        working — that is the whole offer, no catch and no countdown timer.
      </P>
      <PriceRow label={`${v.course_title} · with ${v.coupon}`} price={v.course_price} />
      <Button href={p.href(v.course_path)}>Claim it before {deadline}</Button>
      <Note>
        Already decided against it? Ignore this — the unsubscribe link below removes you from the
        list entirely, not just this campaign.
      </Note>
    </Layout>
  );
};

/* ----------------------------------------------------------------- reengage */

const Reengage: React.FC<TemplateProps> = (p) => {
  const v = vars(p);
  return (
    <Layout preview="Different subject line, same thing worth seeing." unsubUrl={p.unsubUrl}>
      <P>{greeting(p)}</P>
      <P>
        This is the last email about <strong>{v.course_title}</strong> — if it is not relevant to
        you, you will not hear about it again.
      </P>
      <P>{v.course_tagline}.</P>
      <Check>Three modules, self-paced, lifetime access</Check>
      <Check>Certificate with a public verification link</Check>
      <Check>Code {v.coupon} for 20% off at checkout</Check>
      <Button href={p.href(v.course_path)}>Take a look</Button>
      <Note>One click below and you are off the list for good.</Note>
    </Layout>
  );
};

/* ------------------------------------------------------------------ registry */

export const TEMPLATES: Record<EmailTemplateId, TemplateDef> = {
  welcome: {
    subject: () => 'Your 2nd-year toolkit for placements',
    preheader: () => 'Free resources first — the paid stuff later, if it fits.',
    Component: Welcome,
  },
  'course-buy': {
    subject: () => 'The DSA prep that starts in 2nd year',
    preheader: () => 'Built, benchmarked, defended — not memorised.',
    Component: CourseBuy,
  },
  'course-buy-later': {
    subject: () => 'Still on the fence about DSA?',
    preheader: () => 'You checked it out. One thing worth knowing.',
    Component: CourseBuyLater,
  },
  vault: {
    subject: (p) => `How ${V(p, 'vault_company', DEFAULTS.vault_company)} rounds really go`,
    preheader: () => 'The actual round pattern, before you sit for it.',
    Component: Vault,
  },
  'skill-test': {
    subject: () => 'Free skill test to proof your resume',
    preheader: () => '20 questions, instant score, verifiable certificate.',
    Component: SkillTest,
  },
  proof: {
    subject: () => 'What is actually inside the course',
    preheader: () => 'Full breakdown, FAQs, and a 7-day refund promise.',
    Component: Proof,
  },
  offer: {
    subject: (p) => `${V(p, 'coupon', DEFAULTS.coupon)} expires soon`,
    preheader: () => 'Last call — no countdown timer, just a real deadline.',
    Component: Offer,
  },
  reengage: {
    subject: () => 'The course link you saved',
    preheader: () => 'Last email about this — then we stop.',
    Component: Reengage,
  },
};

export const TEMPLATE_LIST: { id: EmailTemplateId; label: string }[] = [
  { id: 'welcome', label: 'Welcome (value first)' },
  { id: 'course-buy', label: 'Course buy (flagship)' },
  { id: 'course-buy-later', label: 'Course nudge (after page view)' },
  { id: 'vault', label: 'Vault unlock (company prep)' },
  { id: 'skill-test', label: 'Skill test (free attempt)' },
  { id: 'proof', label: 'Proof / FAQ (objections)' },
  { id: 'offer', label: 'Offer (coupon deadline)' },
  { id: 'reengage', label: 'Re-engage (non-openers)' },
];
