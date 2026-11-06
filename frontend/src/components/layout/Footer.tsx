import React from 'react';
import Link from 'next/link';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { SOCIAL_LINKS } from '@/lib/socialLinks';
import { useLang } from '@/lib/lang';
import { navLabel } from '@/lib/navHinglish';
import { LEGAL, LEGAL_LINKS } from '@/lib/legal';
import { OPEN_COOKIE_SETTINGS_EVENT } from '@/lib/legalEvents';
import { useFestival } from '@/lib/festival';
import { DiyaRow } from '@/components/festival/Ornaments';

/** Diwali 2026: a row of lit diyas above the footer, only during the sale. */
const FooterDiyas: React.FC = () => (useFestival().active ? <div className="-mt-8 mb-6"><DiyaRow /></div> : null);

/**
 * The site footer (PROFESSIONAL_PLATFORM_PLAN §8.1).
 *
 * It used to print every destination in navConfig — Admin and TPO included — in
 * one long row, plus a privacy paragraph. A footer is where people look for the
 * few things the header does not carry: who we are, how to reach us, the
 * policies. So it is four short columns and a legal bar; the cookie note now
 * lives in the Cookie Policy, one tap away.
 */
type Col = { title: string; links: { href: string; label: string; navId?: string }[] };

const COLUMNS: Col[] = [
  {
    title: 'Learn',
    links: [
      { href: '/courses', label: 'Courses', navId: 'courses' },
      { href: '/companies', label: 'Companies', navId: 'companies' },
      { href: '/drops', label: 'Drops', navId: 'drops' },
      { href: '/interview-course', label: 'Free interview course', navId: 'freeCourse' },
    ],
  },
  {
    title: 'Practise',
    links: [
      { href: '/skill-test', label: 'Skill tests', navId: 'skillTest' },
      { href: '/mock-drive', label: 'Mock drives', navId: 'drives' },
      { href: '/mock-interview', label: 'Mock interview', navId: 'mockInterview' },
      { href: '/verify', label: 'Verify a certificate' },
    ],
  },
  {
    title: 'For',
    links: [
      { href: '/colleges', label: 'Colleges & TPOs' },
      { href: '/recruiters', label: 'Recruiters' },
      { href: '/project-pulse', label: 'Project Pulse' },
      { href: '/guarantee', label: 'Accuracy guarantee', navId: 'guarantee' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/contact', label: 'Contact & support' },
      { href: '/refund-policy', label: 'Refunds' },
    ],
  },
];

const linkCls =
  'inline-flex min-h-[32px] items-center text-sm text-body transition-colors hover:text-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]';

export const Footer: React.FC = () => {
  const [lang] = useLang();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-line bg-app pb-8 pt-12">
      <FooterDiyas />
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <div className="col-span-2 md:col-span-1">
            <TieEduLogo size="sm" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Train · Test · Track for placements. Know you are ready before the test day.
            </p>
            <nav aria-label="Social media" className="mt-4 flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-body transition-colors hover:border-[var(--brand-sky)] hover:text-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                >
                  {social.icon}
                </a>
              ))}
            </nav>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-xs font-extrabold uppercase tracking-widest text-heading">{col.title}</p>
              <ul className="mt-3 space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={linkCls}>
                      {l.navId ? navLabel(lang, l.navId, l.label) : l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <p>© {year} {LEGAL.companyName}. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkCls}>{l.label}</Link>
            ))}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
              className={linkCls}
            >
              Cookie settings
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
