import React from 'react';
import Link from 'next/link';
import { LegalPage, LegalList, LegalTable, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

const days = LEGAL.refundWindowDays;
const mail = <a className="font-semibold text-link underline" href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>;

const sections: LegalSection[] = [
  {
    id: 'window',
    title: `${days}-day refund`,
    body: (
      <>
        <p>
          If a course or company pack is not right for you, write to us within <strong>{days} days</strong> of
          purchase and we refund it in full. No long forms.
        </p>
        <LegalTable
          head={['Product', 'Refundable', 'Notes']}
          rows={[
            ['Paid course', `Within ${days} days`, 'Not after the certificate for that course has been issued'],
            ['Company pack / vault', `Within ${days} days`, 'Not if most of the pack has already been opened or downloaded'],
            ['Mock drive fee', 'Until registration closes', 'After the drive test starts, only if the drive is cancelled by us'],
            ['Accuracy guarantee', 'As per the guarantee', <>See the <Link className="font-semibold text-link underline" href="/guarantee">guarantee page</Link></>],
          ]}
        />
      </>
    ),
  },
  {
    id: 'how',
    title: 'How to ask for a refund',
    body: (
      <LegalList
        items={[
          <>Write to {mail} or use the <Link className="font-semibold text-link underline" href="/contact">contact form</Link> (topic: Payment) from your account email.</>,
          'Include your order id or the UPI reference (UTR), and a line on why.',
          `We reply within ${LEGAL.replyWithinDays} working day.`,
        ]}
      />
    ),
  },
  {
    id: 'timing',
    title: 'When the money arrives',
    body: (
      <p>
        Approved refunds go back to the original payment method within <strong>5–7 working days</strong>. Your bank may
        take a little longer to show it. Access to the refunded product ends when the refund is made.
      </p>
    ),
  },
  {
    id: 'failed',
    title: 'Failed or double payments',
    body: (
      <p>
        If money left your account but the purchase did not unlock, or you were charged twice, write to us with the UTR.
        We confirm it with the payment partner and either unlock the product or refund the extra amount in full.
      </p>
    ),
  },
  {
    id: 'cancel',
    title: 'Cancellation',
    body: (
      <p>
        Purchases on TieEdu are one-time payments, not subscriptions, so there is nothing to cancel and no automatic
        renewal. If we ever add a subscription, you will be able to cancel it from your account at any time.
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      path="/refund-policy"
      title="Refund & Cancellation Policy"
      description={`TieEdu refunds courses and company packs within ${days} days of purchase. How to ask, and when the money arrives.`}
      summary={<p>Not right for you? Ask within {days} days and we refund in full. Refunds reach your account in 5–7 working days.</p>}
      sections={sections}
    />
  );
}
