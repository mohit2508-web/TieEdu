/**
 * Job-offer scam checker (D3). Pure and client-side: the pasted message never
 * leaves the student's device, because offer messages carry names, phone
 * numbers and sometimes ID numbers.
 *
 * It is a checklist of the patterns behind fake campus and fresher offers in
 * India, not a verdict. Each signal carries a weight and a plain reason; a few
 * are "critical" (money, OTPs) and decide the result on their own, because one
 * of those is enough to walk away.
 */

export type RiskLevel = 'high' | 'medium' | 'low';

export interface Signal {
  id: string;
  label: string;
  why: string;
  weight: number;
  critical?: boolean;
  /** The text that triggered it, to show the student where to look. */
  match?: string;
}

export interface ScamResult {
  level: RiskLevel;
  score: number;
  signals: Signal[];
  /** Official domains of a company the message names but does not come from. */
  claimed: { company: string; official: string[] } | null;
}

export interface ScamInput {
  text: string;
  senderEmail?: string;
  link?: string;
}

/** Official domains of employers students most often see impersonated. */
export const OFFICIAL_DOMAINS: Record<string, string[]> = {
  TCS: ['tcs.com'],
  Infosys: ['infosys.com'],
  Wipro: ['wipro.com'],
  Accenture: ['accenture.com'],
  Cognizant: ['cognizant.com'],
  Capgemini: ['capgemini.com'],
  HCLTech: ['hcltech.com', 'hcl.com'],
  'Tech Mahindra': ['techmahindra.com'],
  IBM: ['ibm.com'],
  Deloitte: ['deloitte.com'],
  Amazon: ['amazon.com', 'amazon.in', 'amazon.jobs'],
  Google: ['google.com'],
  Microsoft: ['microsoft.com'],
  Zscaler: ['zscaler.com'],
  'Palo Alto Networks': ['paloaltonetworks.com'],
  Razorpay: ['razorpay.com'],
  Flipkart: ['flipkart.com'],
  Zoho: ['zoho.com'],
  LTIMindtree: ['ltimindtree.com'],
};

const FREE_MAIL = ['gmail.com', 'yahoo.com', 'yahoo.in', 'outlook.com', 'hotmail.com', 'rediffmail.com', 'ymail.com', 'proton.me', 'protonmail.com', 'aol.com', 'icloud.com'];
const SHORTENERS = ['bit.ly', 'tinyurl.com', 'goo.gl', 'cutt.ly', 'rb.gy', 'is.gd', 't.ly', 'shorturl.at', 'tiny.cc'];

interface Rule {
  id: string;
  label: string;
  why: string;
  weight: number;
  critical?: boolean;
  re: RegExp;
}

const RULES: Rule[] = [
  {
    id: 'fee',
    label: 'Asks you to pay',
    why: 'Real employers never charge a registration, training, security or "refundable" fee. This is the single surest sign of a fake offer.',
    weight: 6,
    critical: true,
    re: /\b(registration|processing|training|security|joining|verification|interview|onboarding|kit|laptop|documentation)\s*(fee|fees|charges?|deposit|amount)\b|\brefundable\s+(deposit|amount|fee)\b|\bpay\s+(rs\.?|inr|₹)\s*\d|\b(deposit|transfer)\s+(rs\.?|inr|₹)\s*\d/i,
  },
  {
    id: 'upi',
    label: 'Gives a UPI ID or payment details',
    why: 'An offer message with a UPI ID or bank account to pay into is asking for money, however it is worded.',
    weight: 6,
    critical: true,
    re: /\b[\w.-]{2,}@(ybl|okaxis|oksbi|okicici|okhdfcbank|paytm|apl|ibl|axl|upi|icici|sbi|hdfcbank|freecharge)\b/i,
  },
  {
    id: 'otp',
    label: 'Asks for an OTP, password or bank details',
    why: 'No recruiter needs an OTP, your password or your bank login. Sharing one hands over your account.',
    weight: 6,
    critical: true,
    re: /\b(share|send|tell|provide)\b[^.\n]{0,40}\b(otp|one[- ]time password|password|pin|cvv|net ?banking)\b|\b(otp|cvv)\b[^.\n]{0,30}\b(share|send|provide)\b/i,
  },
  {
    id: 'id-docs',
    label: 'Wants ID documents before any interview',
    why: 'Aadhaar, PAN and bank details are collected after a real offer, through the company’s own portal — not over chat up front.',
    weight: 3,
    re: /\b(aadhaar|aadhar|pan card|bank (account|details|passbook)|cancelled cheque)\b/i,
  },
  {
    id: 'no-interview',
    label: 'Selected without an interview',
    why: 'Genuine campus and fresher hiring always has a test or an interview. "Direct selection" is a hook.',
    weight: 4,
    re: /\b(no interview|without (any )?interview|direct (selection|joining|offer)|selected directly|100% (placement|job|selection) guarantee|guaranteed (job|placement|selection))\b/i,
  },
  {
    id: 'urgency',
    label: 'Pressures you to act fast',
    why: 'Deadlines of hours, "limited seats" and "last chance" are there to stop you checking.',
    weight: 2,
    re: /\b(within (24|48) hours|immediately|urgent(ly)?|limited (seats|slots|vacancies)|last (chance|date today)|today only|expires? (today|tonight)|act now)\b/i,
  },
  {
    id: 'chat-only',
    label: 'Moves you to WhatsApp or Telegram',
    why: 'Real HR teams use company email and portals. "Contact HR on WhatsApp" with a personal number is a common scam pattern.',
    weight: 3,
    re: /\b(whatsapp|telegram|t\.me\/|wa\.me\/)\b/i,
  },
  {
    id: 'too-good',
    label: 'Pay that is too good for the role',
    why: 'A fresher offer of lakhs per month, or big money for little work, is bait.',
    weight: 3,
    re: /(₹|rs\.?|inr)\s*[1-9]\d?(,\d{2})?,?\d{3}\s*(\/-)?\s*(per|a|\/)\s*day|\b([5-9]\d|\d{3})\s*lpa\b.*\b(fresher|no experience)\b|\b(fresher|no experience)\b.*\b([5-9]\d|\d{3})\s*lpa\b|\bearn\b[^.\n]{0,30}\b(daily|per day|from home)\b/i,
  },
  {
    id: 'task-scam',
    label: 'Paid for likes, reviews or simple tasks',
    why: 'Being paid to like videos, rate hotels or "complete tasks" is the task scam: small payouts first, then you are asked to invest.',
    weight: 5,
    re: /\b(like (videos|posts)|rate (hotels|products)|subscribe to (channels|youtube)|youtube likes|google reviews?|prepaid task|task (based|completion) (job|income)|part[- ]time (job|work) (from home )?earn)\b/i,
  },
  {
    id: 'offer-first',
    label: 'An offer letter before you applied or interviewed',
    why: 'If you did not apply, or never interviewed, an offer letter is not real.',
    weight: 3,
    re: /\b(you have been (shortlisted|selected)|congratulations[!, ]+you (are|have been) (selected|hired))\b/i,
  },
];

const domainOf = (s: string): string | null => {
  const m = s.trim().toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})$/) || s.trim().toLowerCase().match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/);
  return m ? m[1] : null;
};
const sameOrSub = (domain: string, official: string) => domain === official || domain.endsWith(`.${official}`);

export function checkOffer(input: ScamInput): ScamResult {
  const text = (input.text || '').slice(0, 20000);
  const signals: Signal[] = [];

  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) signals.push({ id: r.id, label: r.label, why: r.why, weight: r.weight, critical: r.critical, match: m[0].trim().slice(0, 80) });
  }

  // Links: shorteners, and domains found in the text or given separately.
  const links = [...(text.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?/gi) || []), input.link || ''].filter(Boolean);
  const linkDomains = links.map(domainOf).filter((d): d is string => !!d && !/^\d+(\.\d+)+$/.test(d));
  const short = linkDomains.find((d) => SHORTENERS.includes(d));
  if (short) signals.push({ id: 'short-link', label: 'Hides the real link', why: 'Shortened links hide where they go. A real employer links to its own careers site.', weight: 2, match: short });

  const senderDomain = input.senderEmail ? domainOf(input.senderEmail) : null;

  // Which well-known employer does it claim to be?
  const claimedName = Object.keys(OFFICIAL_DOMAINS).find((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
  let claimed: ScamResult['claimed'] = null;
  if (claimedName) {
    const official = OFFICIAL_DOMAINS[claimedName];
    const offDomains = [senderDomain, ...linkDomains].filter((d): d is string => !!d && !FREE_MAIL.includes(d) && !SHORTENERS.includes(d));
    const lookalike = offDomains.find((d) => !official.some((o) => sameOrSub(d, o)) && d.includes(claimedName.toLowerCase().replace(/\s+/g, '').slice(0, 4)));
    if (lookalike) {
      signals.push({ id: 'lookalike', label: `Uses a look-alike of ${claimedName}’s domain`, why: `${claimedName} writes only from ${official.join(' or ')}. "${lookalike}" is a different site, made to look official.`, weight: 5, match: lookalike });
      claimed = { company: claimedName, official };
    } else if (offDomains.length && !offDomains.some((d) => official.some((o) => sameOrSub(d, o)))) {
      claimed = { company: claimedName, official };
    }
    if (senderDomain && FREE_MAIL.includes(senderDomain)) {
      signals.push({ id: 'free-mail', label: `Claims to be ${claimedName} but writes from ${senderDomain}`, why: `Recruiters at ${claimedName} use ${official.join(' or ')} email addresses, never a free personal mailbox.`, weight: 4, match: input.senderEmail });
      claimed = { company: claimedName, official };
    }
  } else if (senderDomain && FREE_MAIL.includes(senderDomain) && /\b(offer|selected|hr|recruit|joining)\b/i.test(text)) {
    signals.push({ id: 'free-mail', label: `An offer from a free ${senderDomain} address`, why: 'A company hiring you writes from its own domain, not a free personal mailbox.', weight: 3, match: input.senderEmail });
  }

  const exclaims = (text.match(/!/g) || []).length;
  if (exclaims >= 5) signals.push({ id: 'tone', label: 'Over-excited tone', why: 'Lots of exclamation marks and capitals are typical of mass scam messages, not HR teams.', weight: 1 });

  const score = signals.reduce((s, x) => s + x.weight, 0);
  const level: RiskLevel = signals.some((s) => s.critical) || score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
  signals.sort((a, b) => Number(!!b.critical) - Number(!!a.critical) || b.weight - a.weight);
  return { level, score, signals, claimed };
}
