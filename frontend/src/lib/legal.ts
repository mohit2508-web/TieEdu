/**
 * The facts every legal and trust page quotes, kept in one place so Privacy,
 * Terms, Refunds, Cookies, About and Contact can never disagree.
 *
 * `null` means "not supplied yet": pages leave that line out rather than print
 * a placeholder. Fill these in before launch (PROFESSIONAL_PLATFORM_PLAN §14).
 */
export const LEGAL = {
  brand: 'TiEEdu',
  companyName: 'TiEEdu Technologies',
  siteUrl: 'https://tieedu.in',
  supportEmail: 'contact@tieedu.in',
  /** Registered office address, one line. */
  address: null as string | null,
  /** Grievance Officer under the IT Rules / DPDP Act. Falls back to support email. */
  grievanceOfficer: { name: null as string | null, email: 'contact@tieedu.in' },
  /** Days within which a purchase can be refunded (matches the promise in our emails). */
  refundWindowDays: 7,
  /** How fast support replies, in working days. */
  replyWithinDays: 1,
  /** Shown as "Last updated" on every policy page. Bump with the policy version. */
  updated: '1 November 2026',
  /** Bumping this re-asks cookie consent (PROFESSIONAL_PLATFORM_PLAN §2.2). */
  policyVersion: 1,
} as const;

/** Legal links, in footer order. */
export const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Refunds' },
  { href: '/cookies', label: 'Cookies' },
] as const;
