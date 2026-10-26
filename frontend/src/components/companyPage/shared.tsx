import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BadgeCheck, CircleDashed, MessageSquareText, FileText } from 'lucide-react';
import type { Company } from '@/types';
import type { CpContent, CpMe, CpRadarItem, CpSection, CpStationTrack } from '@/types/companyPage';
import s from './companyPage.module.css';

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

export type CpLang = 'en' | 'hi';

/**
 * Returns the content with every Hinglish variant (`hi: { key: value }`)
 * swapped in for its English value. Sections render the result unchanged, so
 * no section needs to know about languages. A missing variant keeps English.
 */
export function localizeContent(content: CpContent, lang: CpLang): CpContent {
  if (lang === 'en') return content;
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return v;
    const out: any = {};
    for (const [k, val] of Object.entries(v)) if (k !== 'hi') out[k] = walk(val);
    if (v.hi && typeof v.hi === 'object') {
      for (const [k, val] of Object.entries(v.hi)) {
        if (val !== '' && val !== null && !(Array.isArray(val) && val.length === 0)) out[k] = val;
      }
    }
    return out;
  };
  return walk(content);
}

/** Fixed interface strings. Admin copy is translated in the studio, not here. */
const UI = {
  en: {
    being_verified: 'Being verified',
    verified: 'Verified',
    candidate_reports: 'From candidate reports',
    confirm_notice: 'Confirm from notice',
    your_next_step: 'Your next step',
    next_weak: 'Your weakest round is {round} ({score}%). Practise it next.',
    overall_ready: '{score}% ready overall',
    your_score: 'Your score',
    weak_topics: 'Work on',
    pattern_verifying: 'Section-wise pattern is being verified.',
    from_seniors: 'From seniors: ',
    eliminatory: 'Eliminatory',
    days_to_go: 'days to go',
    day_to_go: 'day to go',
    test_today: 'Your test is today. Light revision, then rest. You’ve got this.',
    date_passed: 'That date has passed. Set your next test date.',
    your_plan: 'Your {n}-day plan',
    sample_plan: 'A sample {n}-day plan',
    set_date_hint: 'Set your test date to make it yours.',
    today: 'Today',
    full_mock: 'Full mock',
    test_day: 'Test day',
    mark_done: 'Mark today done',
    done_today: 'Done for today',
    streak: '{n}-day streak',
    first_days: 'Showing the first {n} days.',
    coming_soon: 'Coming soon',
    pack_active: 'Pack active',
    yours: 'Yours',
    go_rounds: 'Go to the rounds',
    unconfirmed: 'Unconfirmed · {n} of {m} confirmations',
    confirmed_by: 'confirmed by {n} student{s}',
    i_saw_this: 'I saw this too',
    you_confirmed: 'You confirmed this',
    your_report: 'Your report',
    report_kind: 'What kind of update?',
    report_text: 'What happened?',
    report_placeholder: 'e.g. Assessment invites went out today for the 2026 batch',
    send: 'Send update',
    cancel: 'Cancel',
    report_thanks_crowd: 'Thanks. It shows here once other students confirm it.',
    report_thanks_admin: 'Thanks. We’ll check it and post it here.',
    notifying: 'Notifying you',
    no_updates: 'No updates yet this season.',
    done_of: '{d} of {n} done',
    applications: 'Applications',
    invites: 'Invites',
    results: 'Results',
    onboarding: 'Onboarding',
    other: 'Update',
    start_check: 'Start free readiness check',
    weakest_now: 'Right now your weakest round is {round}.',
  },
  hi: {
    being_verified: 'Verify ho raha hai',
    verified: 'Verified',
    candidate_reports: 'Candidates ki reports se',
    confirm_notice: 'Notice se confirm karein',
    your_next_step: 'Aapka next step',
    next_weak: 'Aapka sabse weak round {round} hai ({score}%). Pehle isko practise karo.',
    overall_ready: 'Overall {score}% ready',
    your_score: 'Aapka score',
    weak_topics: 'Inpe kaam karo',
    pattern_verifying: 'Section-wise pattern verify ho raha hai.',
    from_seniors: 'Seniors ki tip: ',
    eliminatory: 'Eliminatory',
    days_to_go: 'din baaki',
    day_to_go: 'din baaki',
    test_today: 'Aaj aapka test hai. Thoda revision, phir aaram. All the best!',
    date_passed: 'Yeh date nikal gayi. Agli test date daalo.',
    your_plan: 'Aapka {n}-din ka plan',
    sample_plan: '{n}-din ka sample plan',
    set_date_hint: 'Apni test date daalo, plan aapke hisaab se ban jayega.',
    today: 'Aaj',
    full_mock: 'Full mock',
    test_day: 'Test ka din',
    mark_done: 'Aaj ka practice ho gaya',
    done_today: 'Aaj ka ho gaya',
    streak: '{n} din ki streak',
    first_days: 'Pehle {n} din dikh rahe hain.',
    coming_soon: 'Jaldi aa raha hai',
    pack_active: 'Pack active',
    yours: 'Aapka',
    go_rounds: 'Rounds pe jao',
    unconfirmed: 'Confirm hona baaki · {m} mein se {n}',
    confirmed_by: '{n} students ne confirm kiya',
    i_saw_this: 'Maine bhi dekha',
    you_confirmed: 'Aapne confirm kiya',
    your_report: 'Aapki report',
    report_kind: 'Kis type ka update?',
    report_text: 'Kya hua?',
    report_placeholder: 'jaise: 2026 batch ke assessment invites aaj aaye',
    send: 'Update bhejo',
    cancel: 'Cancel',
    report_thanks_crowd: 'Shukriya. Doosre students confirm karenge tab yahan dikhega.',
    report_thanks_admin: 'Shukriya. Hum check karke yahan daal denge.',
    notifying: 'Notify karenge',
    no_updates: 'Is season abhi koi update nahi.',
    done_of: '{n} mein se {d} ho gaye',
    applications: 'Applications',
    invites: 'Invites',
    results: 'Results',
    onboarding: 'Onboarding',
    other: 'Update',
    start_check: 'Free readiness check shuru karo',
    weakest_now: 'Abhi aapka sabse weak round {round} hai.',
  },
} as const;

export type UiKey = keyof (typeof UI)['en'];

export function makeUi(lang: CpLang) {
  return (key: UiKey, vars?: Record<string, string | number>): string => {
    let out: string = UI[lang][key] || UI.en[key];
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    return out;
  };
}

// ---------------------------------------------------------------------------
// Page context — everything a section needs that is not its own data.
// ---------------------------------------------------------------------------

export interface CpHandlers {
  /** Adds the remaining pack to the cart and opens it. */
  onGetPack?: () => void;
  /** Opens one of this company's modules in the existing reader. */
  onOpenModule?: (moduleId: string) => void;
  /** Opens the free preview module. */
  onPreview?: () => void;
  /** Opens the existing "share your experience" form. */
  onShareExperience?: () => void;
  /** Opens the existing sign-in prompt. */
  onRequireAuth?: () => void;
  /** Opens one question in the existing reader. */
  onOpenItem?: (itemId: string) => void;
  /** Adds these premium modules to the cart as single rounds and opens it. */
  onBuyModules?: (moduleIds: string[]) => void;
}

/**
 * A premium module the student can still buy on its own. Keyed by module id in
 * `roundOffers`; owned and free modules are simply absent, so a round with no
 * entry has nothing to sell. The price is the page's single-round price — the
 * cart re-prices combinations, so the button never quotes a discount it cannot
 * guarantee.
 */
export interface RoundOffer {
  title: string;
  price: number;
  inCart: boolean;
}

/** Writes on the signed-in student's state; each updates `me` on success. */
export interface CpMeActions {
  setTestDate: (date: string) => void;
  setRole: (role: number) => void;
  setOnboarding: (ids: string[]) => void;
  markDaily: () => void;
  setWatching: (on: boolean) => Promise<boolean>;
  report: (kind: string, text: string) => Promise<string | null>;
  confirm: (id: string) => void;
}

export interface CpContextValue extends CpHandlers {
  company: Company;
  companies: Company[];
  /** Substitutes `{company}` in admin copy. */
  t: (text: unknown) => string;
  /** Fixed interface strings in the active language. */
  ui: ReturnType<typeof makeUi>;
  lang: CpLang;
  /** Rendering inside the admin studio: no sticky chrome, links inert. */
  preview: boolean;
  /** Price of the remaining pack in rupees, or null when nothing is for sale. */
  packPrice: number | null;
  packOwned: boolean;
  /** Premium modules still for sale one round at a time, by module id. */
  roundOffers: Record<string, RoundOffer>;
  anchorOf: (section: CpSection) => string;
  sections: CpSection[];
  signedIn: boolean;
  /** The signed-in student's state, or null (guest, loading or preview). */
  me: CpMe | null;
  actions: CpMeActions;
  /** Student-reported Drive Radar updates (approved, plus pending in crowd mode). */
  radar: CpRadarItem[];
  stationTrack: (stationId: string) => CpStationTrack | null;
  /** Fire-and-forget page analytics. */
  event: (name: string) => void;
  /** 0-based index of the role the student is aiming for (Role compare). */
  selectedRole: number;
  setSelectedRole: (index: number) => void;
  /** The signed-in student's data is on its way. */
  meLoading: boolean;
  /** Loading it failed; retryMe tries again. */
  meError: boolean;
  retryMe: () => void;
}

/**
 * The stable key for a round in links like #round-coding: the short label, else
 * the title, slugified; falls back to its position so a key always exists.
 */
export function roundKey(station: any, index: number): string {
  const base = String(station?.short_label || station?.title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  return base || String(index + 1);
}

/** Rounds shown for the chosen role: role-specific rounds appear only for that role. */
export function stationsForRole(stations: any[], selectedRole: number): any[] {
  return stations.filter((st) => !(Number(st?.only_for_role) > 0) || Number(st.only_for_role) === selectedRole + 1);
}

const CpContext = createContext<CpContextValue | null>(null);

export const CpProvider = CpContext.Provider;

export function useCp(): CpContextValue {
  const ctx = useContext(CpContext);
  if (!ctx) throw new Error('useCp must be used inside <CompanyPageV2>');
  return ctx;
}

export function makeT(companyName: string) {
  return (text: unknown): string =>
    typeof text === 'string' ? text.replace(/\{company\}/g, companyName) : '';
}

/** `#a-b`, never `#a b`. Mirrors the server's anchor rule. */
const ANCHOR_BY_TYPE: Partial<Record<CpSection['type'], string>> = {
  hero: 'top',
  eligibility_apply: 'eligibility',
  rounds_route: 'rounds',
  countdown: 'prep-plan',
  role_compare: 'roles',
  prep_pack: 'prep-pack',
  drive_radar: 'drive-radar',
  onboarding: 'onboarding',
  experiences: 'experiences',
  faq: 'faq',
  also_preparing: 'also-preparing',
};

export function buildAnchors(sections: CpSection[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const sec of sections) {
    let base = ANCHOR_BY_TYPE[sec.type] || `section-${sec.id.replace(/^s-/, '')}`;
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) candidate = `${base}-${n++}`;
    used.add(candidate);
    out.set(sec.id, candidate);
  }
  return out;
}

/**
 * Default nav chip labels. The server's section catalogue carries the same
 * defaults for the studio; the public page does not fetch the catalogue, so the
 * labels it needs are repeated here. An admin-set `nav_label` always wins.
 */
export const DEFAULT_NAV_LABEL: Partial<Record<CpSection['type'], string>> = {
  eligibility_apply: 'Eligibility',
  rounds_route: 'Rounds',
  countdown: 'Prep plan',
  role_compare: 'Roles',
  prep_pack: 'Prep pack',
  drive_radar: 'Drive Radar',
  experiences: 'Experiences',
  faq: 'FAQ',
};

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * One link component for admin-authored hrefs. In-app paths use next/link,
 * anchors scroll smoothly, external links open in a new tab. In the studio
 * preview every link is inert so a click cannot navigate the admin away.
 */
export function CpLink({
  href,
  className,
  children,
  ariaLabel,
  onClick,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  /** Side effect on activation (analytics, streaks); never in the studio preview. */
  onClick?: () => void;
}) {
  const { preview } = useCp();
  if (preview) {
    return (
      <a href={href || '#'} className={className} aria-label={ariaLabel} onClick={(e) => e.preventDefault()}>
        {children}
      </a>
    );
  }
  if (href.startsWith('#')) {
    return (
      <a
        href={href}
        className={className}
        aria-label={ariaLabel}
        onClick={(e) => {
          onClick?.();
          const el = document.getElementById(href.slice(1));
          if (!el) return;
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', href);
        }}
      >
        {children}
      </a>
    );
  }
  if (href.startsWith('/')) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer" onClick={onClick}>
      {children}
    </a>
  );
}

export type StampKind = 'verified' | 'being_verified' | 'candidate_reports' | 'confirm_notice' | 'none';

const STAMP_KINDS = new Set(['verified', 'being_verified', 'candidate_reports', 'confirm_notice']);

const STAMP_ICON: Record<Exclude<StampKind, 'none'>, React.ReactNode> = {
  verified: <BadgeCheck size={13} aria-hidden />,
  being_verified: <CircleDashed size={13} aria-hidden />,
  candidate_reports: <MessageSquareText size={13} aria-hidden />,
  confirm_notice: <FileText size={13} aria-hidden />,
};

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function Stamp({
  kind,
  text,
  date,
  href,
}: {
  kind: string;
  text?: string;
  date?: string;
  href?: string;
}) {
  const { ui } = useCp();
  if (!kind || !STAMP_KINDS.has(kind)) return null;
  const k = kind as Exclude<StampKind, 'none'>;
  const label = text || (k === 'verified' && date ? `${ui('verified')} · ${formatShortDate(date)}` : ui(k));
  const body = (
    <>
      {STAMP_ICON[k]}
      {label}
    </>
  );
  const cls = cx(s.stamp, s[`stamp_${k}`]);
  if (href) {
    return (
      <CpLink href={href} className={cls} ariaLabel={`${label} — view source`}>
        {body}
      </CpLink>
    );
  }
  return <span className={cls}>{body}</span>;
}

/** Fades a section title in once, the first time it enters the viewport. */
function useReveal<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return [ref, shown];
}

export function SectionHead({ data, className }: { data: Record<string, any>; className?: string }) {
  const { t, preview } = useCp();
  const [ref, shown] = useReveal<HTMLDivElement>();
  const eyebrow = t(data.eyebrow);
  const title = t(data.title);
  const intro = t(data.intro);
  if (!eyebrow && !title && !intro) return null;
  return (
    <div ref={ref} className={cx(s.sectionHead, !preview && s.reveal, (shown || preview) && s.revealed, className)}>
      {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
      {title && <h2 className={s.h2}>{title}</h2>}
      {intro && <p className={s.lead}>{intro}</p>}
    </div>
  );
}

/**
 * Admin markdown. Raw HTML is never rendered (react-markdown's default), the
 * element list is closed, and react-markdown's URL transform drops
 * `javascript:` and friends.
 */
const ALLOWED = ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'br', 'blockquote', 'h3', 'h4', 'del'];

export function Markdown({ text }: { text: string }) {
  const { preview } = useCp();
  return (
    <div className={s.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={ALLOWED}
        unwrapDisallowed
        components={{
          a: ({ href, children }) => {
            const url = String(href || '');
            const external = /^https?:/i.test(url);
            return (
              <a
                href={url}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onClick={preview ? (e) => e.preventDefault() : undefined}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** Reads/writes a small JSON value in localStorage; tolerates private mode. */
export function useLocalState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw));
    } catch {
      /* storage unavailable */
    }
  }, [key]);
  // Accepts an updater so rapid successive changes build on each other
  // instead of each one overwriting the last from a stale copy.
  const set = (v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };
  return [value, set];
}

export function formatRupees(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}
