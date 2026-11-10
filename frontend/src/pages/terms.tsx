import React from 'react';
import Link from 'next/link';
import { LegalPage, LegalList, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

const link = (href: string, text: string) => <Link className="font-semibold text-link underline" href={href}>{text}</Link>;

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement',
    body: (
      <p>
        These terms are an agreement between you and {LEGAL.companyName} (&ldquo;{LEGAL.brand}&rdquo;, &ldquo;we&rdquo;). By
        creating an account or using {LEGAL.siteUrl.replace('https://', '')} you accept them, together with our{' '}
        {link('/privacy', 'Privacy Policy')}, {link('/refund-policy', 'Refund Policy')} and {link('/cookies', 'Cookie Policy')}.
      </p>
    ),
  },
  {
    id: 'account',
    title: 'Your account',
    body: (
      <LegalList
        items={[
          'Give true details and keep your password private. You are responsible for activity on your account.',
          'One account per person. Accounts cannot be sold, shared or transferred.',
          'If you are under 18, use TiEEdu with a parent’s or guardian’s consent.',
          'Tell us at once at ' + LEGAL.supportEmail + ' if you think someone else has used your account.',
        ]}
      />
    ),
  },
  {
    id: 'content',
    title: 'Paid content and your licence',
    body: (
      <>
        <p>
          When you buy a course, a company pack or a drive, you get a personal, non-transferable licence to use it for
          your own preparation, for as long as the product stays available on TiEEdu.
        </p>
        <LegalList
          items={[
            'Do not copy, record, screenshot in bulk, resell, or share paid lessons, questions, PDFs or solutions.',
            'Downloaded PDFs are watermarked with your details; leaked copies can be traced to the account.',
            'We may suspend an account that shares paid content, without refund.',
          ]}
        />
      </>
    ),
  },
  {
    id: 'tests',
    title: 'Tests, certificates and fair play',
    body: (
      <LegalList
        items={[
          'Take tests yourself, without outside help unless the test allows it.',
          'Certificates are issued for work you really completed and carry a public serial anyone can verify.',
          'We may revoke a certificate or reset a score obtained by cheating, automation or someone else taking the test.',
          'Company preparation reflects patterns reported by students and public sources. Real hiring processes change; we cannot guarantee a job or an interview call.',
        ]}
      />
    ),
  },
  {
    id: 'payments',
    title: 'Prices and payments',
    body: (
      <>
        <p>
          Prices are shown in Indian rupees and include applicable taxes unless stated. Payments are processed by our
          payment partner. A purchase is confirmed only after the payment is verified.
        </p>
        <p>Refunds follow our {link('/refund-policy', 'Refund Policy')}.</p>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'Acceptable use',
    body: (
      <LegalList
        items={[
          'No harassment, hate, spam or illegal content in anything you post (experiences, reviews, study groups, debriefs).',
          'No scraping, automated access, attempts to break security, or overloading the service.',
          'Do not post another person’s personal data or a company’s confidential material.',
          'We may remove content and suspend accounts that break these rules.',
        ]}
      />
    ),
  },
  {
    id: 'your-posts',
    title: 'What you post',
    body: (
      <p>
        You own what you write. By posting an interview experience, review or answer on TiEEdu you let us show it on
        TiEEdu (anonymously where the feature says so), and edit it for length, clarity or privacy.
      </p>
    ),
  },
  {
    id: 'availability',
    title: 'Service changes',
    body: (
      <p>
        We keep improving TiEEdu, so features may change. If we stop offering something you paid for before you could
        use it, we will offer an equivalent product or a fair refund.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limits of liability',
    body: (
      <p>
        TiEEdu is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for indirect losses, and our
        total liability for any claim is limited to the amount you paid us in the 12 months before it.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law and disputes',
    body: (
      <p>
        These terms are governed by the laws of India. Please contact us first so we can try to fix the problem; if we
        cannot, the courts of India have jurisdiction.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these terms: {link('/contact', 'contact us')} or write to{' '}
        <a className="font-semibold text-link underline" href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      path="/terms"
      title="Terms of Service"
      description="The rules for using TiEEdu: accounts, paid content, tests and certificates, payments and acceptable use."
      summary={
        <p>
          Use TiEEdu for your own preparation, keep paid content to yourself, take tests honestly, and be respectful.
          We keep your progress safe, issue honest certificates and refund fairly.
        </p>
      }
      sections={sections}
    />
  );
}
