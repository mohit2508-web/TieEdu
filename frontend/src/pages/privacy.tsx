import React from 'react';
import Link from 'next/link';
import { LegalPage, LegalList, LegalTable, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

const mail = (e: string) => <a className="font-semibold text-link underline" href={`mailto:${e}`}>{e}</a>;

const sections: LegalSection[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <>
        <p>
          {LEGAL.brand} ({LEGAL.siteUrl.replace('https://', '')}) is run by {LEGAL.companyName}
          {LEGAL.address ? `, ${LEGAL.address}` : ''}. We help students prepare for placements: courses, skill tests,
          company preparation, mock drives and mock interviews. For your personal data we are the &ldquo;data
          fiduciary&rdquo; under India&apos;s Digital Personal Data Protection Act, 2023.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <LegalTable
        head={['What', 'Examples', 'Where it comes from']}
        rows={[
          ['Account', 'Name, email, password (stored hashed), college, graduation year, branch', 'You, when you sign up or edit your profile'],
          ['Learning activity', 'Lessons opened and completed, test answers and scores, XP, streaks, certificates, mock interview answers and feedback', 'Created as you use the site'],
          ['Preferences', 'Target company, interests, notification choices, language, theme, cookie choice', 'You'],
          ['Purchases', 'What you bought, amount, order and payment ids, UPI reference you share with us', 'You and our payment partner (we never see your card or UPI PIN)'],
          ['Device', 'Browser and device type, push notification token, installed-app status, approximate time zone', 'Your browser'],
          ['Messages', 'Emails we sent you and whether they were opened or clicked; support requests you send us', 'Our email system and you'],
          ['Contacts you add', 'A parent’s email or WhatsApp number, only if you add one', 'You'],
        ]}
      />
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    body: (
      <LegalList
        items={[
          'To run your account, keep you signed in and keep your progress safe across devices.',
          'To teach and test: unlock lessons in order, grade tests, issue verifiable certificates, show your readiness for a company.',
          'To show what fits you: courses and companies for your year, interests and what you looked at recently.',
          'To keep you informed: results, receipts, drive updates and reminders by in-app message, push, email or WhatsApp, as you choose in your notification settings.',
          'To process payments and refunds, and to prevent fraud and abuse.',
          'To improve the product with aggregated, de-identified statistics.',
          'To meet legal duties, such as tax records for purchases.',
        ]}
      />
    ),
  },
  {
    id: 'share',
    title: 'Who we share it with',
    body: (
      <>
        <p>We never sell your personal data. We share only what each service needs to do its job for us:</p>
        <LegalTable
          head={['Partner', 'Why']}
          rows={[
            ['Razorpay', 'Taking payments and refunds'],
            ['Resend', 'Sending emails'],
            ['Meta (WhatsApp Business)', 'WhatsApp messages you or your parent opted in to'],
            ['Anthropic', 'AI feedback on mock interview and English practice answers'],
            ['Cloud hosting, database and file storage providers (including CockroachDB and Cloudflare)', 'Running the site and storing data securely'],
            ['Assessment partners for mock drives', 'Running a drive test you registered for'],
            ['Google', 'Sign in with Google, and ads on public pages if you allow advertising cookies'],
          ]}
        />
        <p>
          <strong>Your college</strong> sees only what our college rules allow: batch-level numbers and reports, never your
          private answers. <strong>Recruiters</strong> see an anonymous profile; your contact details are shared only if you
          accept their request.
        </p>
        <p>We may disclose data if the law requires it, for example a valid order from a court or government authority.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: (
      <p>
        We use necessary cookies to keep you signed in, and optional cookies for personalisation, analytics and
        advertising only if you allow them. You can change your choice any time from &ldquo;Cookie settings&rdquo; in the
        footer. Details are in our <Link className="font-semibold text-link underline" href="/cookies">Cookie Policy</Link>.
      </p>
    ),
  },
  {
    id: 'keep',
    title: 'How long we keep it',
    body: (
      <LegalList
        items={[
          'Account and learning data: while your account is open. If you delete your account, we delete or anonymise it within 30 days.',
          'Certificates: the public verification record stays so employers can check a certificate you shared, unless you ask us to revoke it.',
          'Purchase records: as long as tax law requires (usually 8 years).',
          'Email engagement and support messages: up to 2 years.',
        ]}
      />
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <LegalList
          items={[
            'See the personal data we hold about you and how it is used.',
            'Correct or update it (most of it you can edit yourself in Account).',
            'Delete your account and data.',
            'Withdraw consent at any time: notification settings, cookie settings, or the unsubscribe link in every email.',
            'Nominate someone to exercise these rights for you if you cannot.',
            'Complain to our Grievance Officer, and then to the Data Protection Board of India.',
          ]}
        />
        <p>Write to {mail(LEGAL.supportEmail)} from your account email and we will act within 30 days.</p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Students under 18',
    body: (
      <p>
        TieEdu is made for college students. If you are under 18, please use it with a parent&apos;s or guardian&apos;s
        consent. If we learn that we hold a minor&apos;s data without that consent, we will delete it.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Passwords are hashed, connections are encrypted (HTTPS), sign-in uses secure http-only cookies, and staff
        access is limited by role and logged. No system is perfectly secure; if a breach affects you, we will tell you
        and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: 'grievance',
    title: 'Grievance Officer',
    body: (
      <>
        <p>
          {LEGAL.grievanceOfficer.name ? <><strong>{LEGAL.grievanceOfficer.name}</strong>, </> : null}
          Grievance Officer, {LEGAL.companyName}. Email: {mail(LEGAL.grievanceOfficer.email)}.
          {LEGAL.address ? ` Address: ${LEGAL.address}.` : ''}
        </p>
        <p>We acknowledge complaints within 24 hours and resolve them within 15 days.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        When we change this policy we update the date at the top. For important changes we tell you by email or an
        in-app message, and ask for your cookie choice again where it matters.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      path="/privacy"
      title="Privacy Policy"
      description="What TieEdu collects, why, who it is shared with, how long it is kept, and your rights."
      summary={
        <p>
          We collect what we need to teach you, test you and track your progress. We never sell your data. Optional
          cookies and marketing messages are off until you allow them, and you can delete your account any time.
        </p>
      }
      sections={sections}
    />
  );
}
