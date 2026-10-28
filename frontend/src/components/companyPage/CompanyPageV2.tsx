import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import localFont from 'next/font/local';
import type { Company } from '@/types';
import type { CpContent, CpMe, CpRadarItem, CpSection } from '@/types/companyPage';
import {
  CpApiError,
  confirmCpRadar,
  cpMediaUrl,
  fetchCpMe,
  recordCpDaily,
  reportCpRadar,
  setCpWatching,
  trackCpEvent,
  updateCpMe,
} from '@/lib/companyPagesApi';
import { CpContextValue, CpHandlers, CpLang, CpLink, CpMeActions, CpProvider, RoundOffer, buildAnchors, cx, formatRupees, localizeContent, makeT, makeUi } from './shared';
import { SectionBoundary } from './SectionBoundary';
import { Hero, SectionNav, StatStrip } from './HeroSections';
import { AlsoPreparing, CommunityOffer, EligibilityApply, Experiences, Faq, RichText, RoleCompare, RoundsRoute } from './ContentSections';
import { Comeback, Countdown, DriveRadar, Onboarding, PrepPack } from './InteractiveSections';
import s from './companyPage.module.css';
import { useLang } from '@/lib/lang';

/**
 * Accent swatches. The server owns the palette (`ACCENT_PALETTE` in
 * backend/src/lib/companyPage.ts) and only ever stores one of these keys; the
 * hex values are repeated here because the public page does not fetch the
 * studio schema. Unknown keys fall back to violet.
 */
const ACCENT_HEX: Record<string, string> = {
  violet: '#6D28D9',
  indigo: '#4338CA',
  sky: '#0369A1',
  teal: '#0F766E',
  green: '#15803D',
  rust: '#C2410C',
  crimson: '#BE123C',
  slate: '#334155',
};

/** The same accents lifted for the dark theme, where they sit on a dark page. */
const ACCENT_HEX_DARK: Record<string, string> = {
  violet: '#C4A7FF',
  indigo: '#A5B4FC',
  sky: '#7DD3FC',
  teal: '#5EEAD4',
  green: '#86EFAC',
  rust: '#FDBA74',
  crimson: '#FDA4AF',
  slate: '#CBD5E1',
};

/**
 * The display face, through next/font so it is self-hosted, preloaded on this
 * route only, and given a size-matched fallback (no layout jump when it
 * swaps in). The files are the ones @fontsource ships; nothing is fetched from
 * Google.
 */
const display = localFont({
  src: [
    { path: '../../../node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../../node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--cp-display-font',
  fallback: ['Carlito', 'Calibri', 'Arial', 'sans-serif'],
});

const SITE_URL = 'https://tieedu.com';
// Stable default: a fresh [] per render would re-run the radar sync effect forever.
const NO_RADAR: CpRadarItem[] = [];

/*
 * Sections are memoised: the page re-renders for reasons that do not concern
 * most of them (the company list arriving, the cart changing, the sticky bar
 * toggling), and re-rendering every section each time was the bulk of this
 * page's main-thread cost on slow phones. With a stable context value, a
 * section now re-renders only when its own data or the shared state changes.
 */
const MHero = React.memo(Hero);
const MStatStrip = React.memo(StatStrip);
const MSectionNav = React.memo(SectionNav);
const MEligibilityApply = React.memo(EligibilityApply);
const MRoundsRoute = React.memo(RoundsRoute);
const MCountdown = React.memo(Countdown);
const MRoleCompare = React.memo(RoleCompare);
const MPrepPack = React.memo(PrepPack);
const MCommunityOffer = React.memo(CommunityOffer);
const MFaq = React.memo(Faq);
const MAlsoPreparing = React.memo(AlsoPreparing);
const MRichText = React.memo(RichText);
const MDriveRadar = React.memo(DriveRadar);
const MOnboarding = React.memo(Onboarding);
const MComeback = React.memo(Comeback);

/** Sections that sit side by side when placed next to each other. */
const SIDE_TYPES = new Set<CpSection['type']>(['onboarding', 'comeback']);

export interface CompanyPageV2Props extends CpHandlers {
  content: CpContent;
  company: Company;
  companies?: Company[];
  /** Remaining pack price in rupees; null when nothing is for sale. */
  packPrice: number | null;
  packOwned: boolean;
  /** The existing experiences component, supplied by the page. */
  experiencesSlot?: React.ReactNode;
  /** "At your college" (campus intel), shown under the hero figures for a linked student. */
  campusSlot?: React.ReactNode;
  /** Admin studio preview: no sticky chrome, no head tags, inert links. */
  preview?: boolean;
  /** Preview only: outline this section and report clicks on any section. */
  selectedSectionId?: string | null;
  onSelectSection?: (id: string) => void;
  /** A signed-in student: their plan, streak and Track scores load from the server. */
  signedIn?: boolean;
  /** Student-reported Drive Radar updates from the public payload. */
  initialRadar?: CpRadarItem[];
  /** Studio only: render in this language regardless of the visitor's choice. */
  forceLang?: CpLang;
  /** Premium modules still for sale on their own, by module id (single-round buying). */
  roundOffers?: Record<string, RoundOffer>;
}

const NO_OFFERS: Record<string, RoundOffer> = {};

export function CompanyPageV2({
  content,
  company,
  companies = [],
  packPrice,
  packOwned,
  experiencesSlot,
  campusSlot,
  preview = false,
  selectedSectionId = null,
  onSelectSection,
  signedIn = false,
  initialRadar = NO_RADAR,
  forceLang,
  roundOffers = NO_OFFERS,
  ...handlers
}: CompanyPageV2Props) {
  const slug = company.slug;
  const hinglishOn = content.settings?.hinglish_enabled === true;

  // ---- language: the site-wide choice (lib/lang), so the page and the rest of the site agree
  const [chosenLang, setLang] = useLang();
  const lang: CpLang = forceLang || (hinglishOn ? chosenLang : 'en');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const langToggle = useMemo(() => (hinglishOn && !forceLang ? { lang, setLang } : null), [hinglishOn, forceLang, lang]);
  const localized = useMemo(() => localizeContent(content, lang), [content, lang]);

  const settings = localized.settings || {};
  const t = useMemo(() => makeT(company.name), [company.name]);
  const ui = useMemo(() => makeUi(lang), [lang]);
  const visible = useMemo(() => localized.sections.filter((x) => x.visible), [localized.sections]);
  const anchors = useMemo(() => buildAnchors(visible), [visible]);
  const anchorOf = useMemo(() => (sec: CpSection) => anchors.get(sec.id) || `section-${sec.id}`, [anchors]);

  // ---- analytics
  const event = useCallback((name: string) => {
    if (!preview) trackCpEvent(slug, name);
  }, [preview, slug]);
  const viewed = useRef('');
  useEffect(() => {
    if (preview || viewed.current === slug) return;
    viewed.current = slug;
    trackCpEvent(slug, 'view');
  }, [preview, slug]);

  // ---- the signed-in student's state
  const [me, setMe] = useState<CpMe | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState(false);
  const [meAttempt, setMeAttempt] = useState(0);
  const [radar, setRadar] = useState<CpRadarItem[]>(initialRadar);
  useEffect(() => setRadar(initialRadar), [initialRadar]);
  useEffect(() => {
    if (preview || !signedIn) {
      setMe(null);
      setMeLoading(false);
      setMeError(false);
      return;
    }
    let cancelled = false;
    setMeLoading(true);
    setMeError(false);
    fetchCpMe(slug)
      .then((m) => !cancelled && setMe(m))
      .catch(() => !cancelled && setMeError(true))
      .finally(() => !cancelled && setMeLoading(false));
    return () => {
      cancelled = true;
    };
  }, [preview, signedIn, slug, meAttempt]);
  const retryMe = useCallback(() => setMeAttempt((n) => n + 1), []);

  // Parent handlers arrive as fresh inline functions on every render. Calls go
  // through a ref so the context can stay referentially stable.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const has = {
    getPack: !!handlers.onGetPack,
    openModule: !!handlers.onOpenModule,
    preview: !!handlers.onPreview,
    share: !!handlers.onShareExperience,
    auth: !!handlers.onRequireAuth,
    openItem: !!handlers.onOpenItem,
    buyModules: !!handlers.onBuyModules,
  };
  const stableHandlers = useMemo<CpHandlers>(
    () => ({
      onGetPack: has.getPack ? () => handlersRef.current.onGetPack?.() : undefined,
      onOpenModule: has.openModule ? (id: string) => handlersRef.current.onOpenModule?.(id) : undefined,
      onPreview: has.preview ? () => handlersRef.current.onPreview?.() : undefined,
      onShareExperience: has.share ? () => handlersRef.current.onShareExperience?.() : undefined,
      onRequireAuth: has.auth ? () => handlersRef.current.onRequireAuth?.() : undefined,
      onOpenItem: has.openItem ? (id: string) => handlersRef.current.onOpenItem?.(id) : undefined,
      onBuyModules: has.buyModules ? (ids: string[]) => handlersRef.current.onBuyModules?.(ids) : undefined,
    }),
    [has.getPack, has.openModule, has.preview, has.share, has.auth, has.openItem, has.buyModules]
  );
  const onRequireAuth = stableHandlers.onRequireAuth;
  // Writes can overlap (two quick role changes). Only the reply to the newest
  // write is adopted; an older reply arriving late would otherwise overwrite
  // the newer choice already shown on screen.
  const writeSeq = useRef(0);
  /** Runs a write, adopts the server's view, and turns a lost session into a sign-in prompt. */
  const run = useCallback(
    async (op: () => Promise<CpMe>): Promise<string | null> => {
      const seq = ++writeSeq.current;
      try {
        const next = await op();
        if (seq === writeSeq.current) setMe(next);
        if (next.radar) setRadar(next.radar);
        return null;
      } catch (e: any) {
        if (e instanceof CpApiError && e.status === 401) onRequireAuth?.();
        return e?.message || 'Something went wrong. Try again.';
      }
    },
    [onRequireAuth]
  );

  const patchProfile = useCallback(
    (patch: Partial<CpMe['profile']>) =>
      setMe((m) => (m ? { ...m, profile: { ...m.profile, ...patch } } : m)),
    []
  );

  const actions: CpMeActions = useMemo(
    () => ({
      setTestDate: (date) => {
        patchProfile({ test_date: date });
        void run(() => updateCpMe(slug, { test_date: date }));
      },
      setRole: (role) => {
        patchProfile({ target_role: role });
        void run(() => updateCpMe(slug, { target_role: role }));
      },
      setOnboarding: (ids) => {
        patchProfile({ onboarding_done: ids });
        void run(() => updateCpMe(slug, { onboarding_done: ids }));
      },
      markDaily: () => {
        void run(() => recordCpDaily(slug));
      },
      setWatching: async (on) => (await run(() => setCpWatching(slug, on))) === null,
      report: (kind, text) => run(() => reportCpRadar(slug, kind, text)),
      confirm: (id) => {
        void run(() => confirmCpRadar(slug, id));
      },
    }),
    [run, patchProfile, slug]
  );

  // ---- target role: shared by Role compare and the rounds it adds or removes.
  // Signed in, the account decides (1-based on the server); otherwise this device.
  const roleSection = visible.find((x) => x.type === 'role_compare');
  const roleCount = ((roleSection?.data.roles as any[]) || []).length;
  const defaultRole = Math.min(Math.max((Number(roleSection?.data.default_role) || 1) - 1, 0), Math.max(roleCount - 1, 0));
  const roleKey = `cp-role:${company.id}`;
  const [localRole, setLocalRole] = useState<number | null>(null);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(roleKey);
      if (raw !== null && Number.isInteger(Number(raw))) setLocalRole(Number(raw));
    } catch {
      /* storage unavailable */
    }
  }, [roleKey]);
  const serverRole = signedIn && me?.profile.target_role ? me.profile.target_role - 1 : null;
  const chosenRole = serverRole ?? localRole ?? defaultRole;
  const selectedRole = chosenRole >= 0 && chosenRole < Math.max(roleCount, 1) ? chosenRole : defaultRole;
  const setSelectedRole = useCallback(
    (i: number) => {
      setLocalRole(i);
      try {
        window.localStorage.setItem(roleKey, String(i));
      } catch {
        /* storage unavailable */
      }
      if (signedIn && !preview) actions.setRole(i + 1);
    },
    [roleKey, signedIn, preview, actions]
  );

  const trackById = useMemo(() => new Map((me?.track.stations || []).map((x) => [x.station_id, x])), [me]);
  const stationTrack = useCallback((id: string) => trackById.get(id) || null, [trackById]);

  const ctx: CpContextValue = useMemo(
    () => ({
      company,
      companies,
      t,
      ui,
      lang,
      preview,
      packPrice,
      packOwned,
      roundOffers,
      anchorOf,
      sections: visible,
      signedIn: signedIn && !preview,
      me,
      actions,
      radar,
      stationTrack,
      event,
      selectedRole,
      setSelectedRole,
      meLoading,
      meError,
      retryMe,
      ...stableHandlers,
    }),
    [company, companies, t, ui, lang, preview, packPrice, packOwned, roundOffers, anchorOf, visible, signedIn, me, actions, radar,
     stationTrack, event, selectedRole, setSelectedRole, meLoading, meError, retryMe, stableHandlers]
  );

  // Sticky bar appears once the hero has scrolled away.
  const hero = visible.find((x) => x.type === 'hero');
  const heroAnchor = hero ? anchorOf(hero) : '';
  // The sticky bar follows the student: no score yet → the free check; a
  // score → the pack; pack owned → nothing to sell, so no bar.
  const readinessHref = String(hero?.data.card_cta_href || '');
  const stickyMode: 'readiness' | 'pack' | null = packOwned
    ? null
    : readinessHref && !me?.track.attempted
      ? 'readiness'
      : packPrice
        ? 'pack'
        : null;
  const stickyWanted = !preview && settings.sticky_enabled === true && stickyMode !== null;
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    if (!stickyWanted) return;
    const el = heroAnchor ? document.getElementById(heroAnchor) : null;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setPastHero(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [stickyWanted, heroAnchor]);

  const faqItems = useMemo(
    () => visible.filter((x) => x.type === 'faq').flatMap((x) => (x.data.items as any[]) || []),
    [visible]
  );

  const rendered: React.ReactNode[] = [];
  // The campus card goes under the hero figures (or the hero, when a page has none).
  const campusAfter = visible.some((v) => v.type === 'stat_strip') ? 'stat_strip' : 'hero';
  for (let i = 0; i < visible.length; i++) {
    const sec = visible[i];
    const start = i;
    const blocks: React.ReactNode[] = [];
    switch (sec.type) {
      case 'hero':
        blocks.push(
          <MHero
            key={sec.id}
            section={sec}
            heroStyle={String(settings.hero_style || 'ink')}
            showLogo={settings.show_logo === true}
            langToggle={langToggle}
          />
        );
        break;
      case 'stat_strip':
        blocks.push(<MStatStrip key={sec.id} section={sec} />);
        break;
      case 'section_nav':
        blocks.push(<MSectionNav key={sec.id} section={sec} />);
        break;
      case 'eligibility_apply':
        blocks.push(<MEligibilityApply key={sec.id} section={sec} />);
        break;
      case 'rounds_route':
        blocks.push(<MRoundsRoute key={sec.id} section={sec} />);
        break;
      case 'countdown':
        blocks.push(<MCountdown key={sec.id} section={sec} />);
        break;
      case 'role_compare':
        blocks.push(<MRoleCompare key={sec.id} section={sec} />);
        break;
      case 'prep_pack':
        blocks.push(<MPrepPack key={sec.id} section={sec} />);
        break;
      case 'community_offer':
        blocks.push(<MCommunityOffer key={sec.id} section={sec} />);
        break;
      case 'experiences':
        blocks.push(<Experiences key={sec.id} section={sec} slot={experiencesSlot} />);
        break;
      case 'faq':
        blocks.push(<MFaq key={sec.id} section={sec} />);
        break;
      case 'also_preparing':
        blocks.push(<MAlsoPreparing key={sec.id} section={sec} />);
        break;
      case 'rich_text':
        blocks.push(<MRichText key={sec.id} section={sec} />);
        break;
      case 'drive_radar': {
        // Radar takes the wide column; any onboarding/comeback sections that
        // directly follow it stack in the narrow column beside it.
        const side: CpSection[] = [];
        while (i + 1 < visible.length && SIDE_TYPES.has(visible[i + 1].type)) side.push(visible[++i]);
        blocks.push(
          <section key={sec.id} id={anchorOf(sec)} className={s.section}>
            <div className={s.wrap}>
              <div className={side.length > 0 ? s.pairGrid : undefined}>
                <MDriveRadar section={sec} />
                {side.length > 0 && (
                  <div className={s.pairSide}>
                    {side.map((x) => (
                      <div key={x.id} id={anchorOf(x)} data-cp-sub={x.id}>
                        {x.type === 'onboarding' ? <MOnboarding section={x} /> : <MComeback section={x} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        );
        break;
      }
      case 'onboarding':
      case 'comeback': {
        // Not next to a radar: onboarding/comeback siblings share one row.
        const group: CpSection[] = [sec];
        while (i + 1 < visible.length && SIDE_TYPES.has(visible[i + 1].type)) group.push(visible[++i]);
        blocks.push(
          <section key={sec.id} id={anchorOf(sec)} className={s.section}>
            <div className={s.wrap}>
              <div className={group.length > 1 ? s.split : undefined}>
                {group.map((x) => (
                  <div key={x.id} id={x.id === sec.id ? undefined : anchorOf(x)} data-cp-sub={x.id}>
                    {x.type === 'onboarding' ? <MOnboarding section={x} /> : <MComeback section={x} />}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
        break;
      }
    }
    if (campusSlot && !preview && sec.type === campusAfter) {
      blocks.push(
        <div key="campus" className={s.wrap}>
          {campusSlot}
        </div>
      );
    }

    // One broken section must not take the page down: each renders inside
    // its own boundary and degrades to an inline notice.
    const guarded = blocks.map((b, k) => (
      <SectionBoundary key={`b-${sec.id}-${k}`} label={sec.type}>
        {b}
      </SectionBoundary>
    ));
    if (!preview) {
      rendered.push(...guarded);
      continue;
    }
    // Studio preview: a click anywhere in a section selects it in the editor.
    // Grouped sections (radar + side cards) select the one under the pointer.
    const ids = visible.slice(start, i + 1).map((x) => x.id);
    const selectedHere = selectedSectionId !== null && ids.includes(selectedSectionId);
    rendered.push(
      <div
        key={`pv-${sec.id}`}
        data-cp-section={sec.id}
        onClickCapture={(e) => {
          const inner = (e.target as HTMLElement).closest('[data-cp-sub]') as HTMLElement | null;
          onSelectSection?.(inner?.dataset.cpSub || sec.id);
        }}
        style={{
          outline: selectedHere ? '2px solid #0284C7' : undefined,
          outlineOffset: -2,
          cursor: 'pointer',
        }}
      >
        {guarded}
      </div>
    );
  }

  const skipSection = visible.find((x) => x.type === 'rounds_route') || visible.find((x) => x.type !== 'hero' && x.type !== 'stat_strip' && x.type !== 'section_nav');
  const skipTarget = skipSection ? anchorOf(skipSection) : '';
  const skipLabel = skipSection?.type === 'rounds_route' ? 'the rounds' : 'the content';

  const accentKey = ACCENT_HEX[String(settings.accent)] ? String(settings.accent) : 'violet';
  const disclaimer = t(settings.disclaimer);

  const ogTitle = t(settings.seo_title);
  const ogDescription = t(settings.seo_description);
  const ogImage = settings.og_image ? `${SITE_URL}${cpMediaUrl(String(settings.og_image)).replace(/^https?:\/\/[^/]+/, '')}` : '';

  return (
    <CpProvider value={ctx}>
      {!preview && (
        <Head>
          {ogTitle && <meta property="og:title" content={ogTitle} />}
          {ogDescription && <meta property="og:description" content={ogDescription} />}
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`${SITE_URL}/company/${slug}`} />
          <link rel="canonical" href={`${SITE_URL}/company/${slug}`} />
          {ogImage && <meta property="og:image" content={ogImage} />}
          <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
        </Head>
      )}
      {!preview && (
        <Head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Companies', item: `${SITE_URL}/` },
                  { '@type': 'ListItem', position: 2, name: company.name, item: `${SITE_URL}/company/${slug}` },
                ],
              }).replace(/</g, '\\u003c'),
            }}
          />
        </Head>
      )}
      {!preview && faqItems.length > 0 && (
        <Head>
          <script
            type="application/ld+json"
            // `<` is escaped so admin copy containing "</script>" cannot break
            // out of the tag.
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: faqItems.map((it) => ({
                  '@type': 'Question',
                  name: t(it.q),
                  acceptedAnswer: { '@type': 'Answer', text: t(it.a) },
                })),
              }).replace(/</g, '\\u003c'),
            }}
          />
        </Head>
      )}

      <div className={cx(s.root, display.variable, preview && s.previewMode)} style={{ ['--accent-l' as any]: ACCENT_HEX[accentKey], ['--accent-d' as any]: ACCENT_HEX_DARK[accentKey] }}>
        {!preview && skipTarget && (
          <a className={s.skipLink} href={`#${skipTarget}`}>
            Skip to {skipLabel}
          </a>
        )}
        {rendered}

        {disclaimer && (
          <div className={s.wrap}>
            <p className={s.disclaimer}>{disclaimer}</p>
          </div>
        )}

        {stickyWanted && (
          <>
            <div className={s.stickySpacer} aria-hidden />
            <div className={cx(s.sticky, pastHero && s.stickyOn)}>
              <div className={cx(s.wrap, s.stickyInner)}>
                {stickyMode === 'readiness' ? (
                  <>
                    <span className={s.stickyText}>{t(hero?.data.card_title) || ui('start_check')}</span>
                    <CpLink href={readinessHref} className={cx(s.btn, s.btnMoney)} onClick={() => event('readiness_start')}>
                      {/* Same words as the hero card's button: one link, one label. */}
                      {t(hero?.data.card_cta_label) || ui('start_check')}
                    </CpLink>
                  </>
                ) : (
                  <>
                    <span className={s.stickyText}>{t(settings.sticky_text) || `Get the full ${company.name} pack`}</span>
                    <button
                      type="button"
                      className={cx(s.btn, s.btnMoney)}
                      onClick={() => {
                        event('pack_cta');
                        stableHandlers.onGetPack?.();
                      }}
                    >
                      {t(settings.sticky_label) || 'Get the pack'} — {formatRupees(packPrice!)}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </CpProvider>
  );
}

export default CompanyPageV2;
