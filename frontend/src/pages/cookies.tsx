import React from 'react';
import { LegalPage, LegalList, LegalTable, type LegalSection } from '@/components/legal/LegalPage';
import { OPEN_COOKIE_SETTINGS_EVENT } from '@/lib/legalEvents';

const sections: LegalSection[] = [
  {
    id: 'what',
    title: 'What cookies are',
    body: (
      <p>
        Cookies are small files a website stores in your browser. We also use similar browser storage (local storage)
        for things like your theme. Below, &ldquo;cookies&rdquo; means both.
      </p>
    ),
  },
  {
    id: 'kinds',
    title: 'The four kinds we use',
    body: (
      <LegalTable
        head={['Kind', 'Can you turn it off?', 'What it does']}
        rows={[
          ['Strictly necessary', 'No — the site cannot work without it', 'Keeps you signed in, protects forms, remembers your cart and your cookie choice'],
          ['Personalisation', 'Yes', 'Remembers courses and companies you looked at so we can show them first next time'],
          ['Analytics', 'Yes', 'Counts page views and which campaign or email brought you, so we can improve'],
          ['Advertising', 'Yes', 'Lets Google show ads on public pages; with it off, any ads shown are not personalised'],
        ]}
      />
    ),
  },
  {
    id: 'list',
    title: 'Cookies by name',
    body: (
      <LegalTable
        head={['Name', 'Kind', 'Lasts']}
        rows={[
          ['tieedu_refresh (sign-in session)', 'Strictly necessary', 'Until you sign out, up to 30 days'],
          ['tieedu_consent', 'Strictly necessary', '12 months'],
          ['Theme and language (local storage)', 'Strictly necessary', 'Until you clear it'],
          ['tieedu_lead (set only when you arrive from one of our emails)', 'Analytics', '90 days'],
          ['Recently viewed (local storage)', 'Personalisation', 'Until you clear it'],
          ['Google AdSense cookies (if ads are on)', 'Advertising', 'Set by Google, see Google’s policy'],
        ]}
      />
    ),
  },
  {
    id: 'choice',
    title: 'Changing your choice',
    body: (
      <>
        <p>
          On your first visit we ask before setting any optional cookie. You can change your mind any time:
        </p>
        <LegalList
          items={[
            <button
              key="b"
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
              className="font-semibold text-link underline"
            >
              Open cookie settings
            </button>,
            'Or use “Cookie settings” in the footer of any page.',
            'You can also block or delete cookies in your browser settings; the site may then sign you out.',
          ]}
        />
      </>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      path="/cookies"
      title="Cookie Policy"
      description="Which cookies TieEdu uses, why, how long they last, and how to change your choice."
      summary={<p>Only necessary cookies are on by default. Personalisation, analytics and advertising cookies are used only if you allow them.</p>}
      sections={sections}
    />
  );
}
