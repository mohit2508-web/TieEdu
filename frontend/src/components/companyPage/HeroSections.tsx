import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CpSection } from '@/types/companyPage';
import { CpLang, CpLink, DEFAULT_NAV_LABEL, Stamp, cx, roundKey, stationsForRole, useCp } from './shared';
import s from './companyPage.module.css';

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export function Hero({
  section,
  heroStyle,
  showLogo,
  langToggle,
}: {
  section: CpSection;
  heroStyle: string;
  showLogo: boolean;
  langToggle: { lang: CpLang; setLang: (l: CpLang) => void } | null;
}) {
  const { t, ui, company, sections, anchorOf, me, stationTrack, event, selectedRole, meLoading, meError, retryMe } = useCp();
  const d = section.data;

  const rounds = sections.find((x) => x.type === 'rounds_route' && x.visible);
  const allStations: any[] = (rounds?.data.stations as any[]) || [];
  const stations = stationsForRole(allStations, selectedRole);
  const roundsHref = rounds ? `#${anchorOf(rounds)}` : '';

  // Once the student has a score, the next step is their weakest round —
  // computed by the server from real attempts, never guessed.
  const weakest = me?.track.weakest_station_id ? stations.find((st) => st.id === me.track.weakest_station_id) : null;
  const weakestScore = weakest ? stationTrack(weakest.id)?.score : null;
  const nextText = weakest && weakestScore !== null && weakestScore !== undefined
    ? ui('next_weak', { round: t(weakest.short_label) || t(weakest.title), score: weakestScore })
    : t(d.next_step_text);
  // The weakest round links straight to its loop on this page (#round-<key>),
  // where the Track breakdown and its mock sit together.
  const nextHref = weakest
    ? `#round-${roundKey(weakest, allStations.indexOf(weakest))}`
    : d.next_step_href || d.card_cta_href || roundsHref;
  const overall = me?.track.overall ?? null;

  const title = t(d.title) || `${company.name} placement prep`;

  return (
    <header id={anchorOf(section)} className={cx(s.hero, heroStyle === 'paper' && s.heroPaper)}>
      <div className={cx(s.wrap, s.heroInner)}>
        <div>
          <div className={s.heroTop}>
            <nav className={s.crumbs} aria-label="Breadcrumb">
              <CpLink href="/">Companies</CpLink> <span aria-hidden>/</span> {company.name}
            </nav>
            {langToggle && (
              <div className={s.langToggle} role="radiogroup" aria-label="Language">
                {(['en', 'hi'] as CpLang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={langToggle.lang === l}
                    className={cx(s.langBtn, langToggle.lang === l && s.langBtnOn)}
                    onClick={() => langToggle.setLang(l)}
                  >
                    {l === 'en' ? 'EN' : 'Hinglish'}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showLogo && company.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied logo URL, may be any host
            <img className={s.heroLogo} src={company.logo_url} alt={`${company.name} logo`} />
          )}
          {d.show_chips && (
            <div className={s.tChips} aria-label="Train, Test, Track">
              <span className={s.tChip}>Train</span>
              <span className={s.tChip}>Test</span>
              <span className={s.tChip}>Track</span>
            </div>
          )}
          <h1 className={s.h1}>{title}</h1>
          {d.subtitle && <p className={s.heroSub}>{t(d.subtitle)}</p>}

          {nextText && (
            nextHref ? (
              <CpLink href={nextHref} className={s.nextStep}>
                <span>
                  <span className={s.nextStepLabel}>{t(d.next_step_label) || ui('your_next_step')}</span>
                  <span className={s.nextStepText}>{nextText}</span>
                </span>
                <span className={s.arrowBtn} aria-hidden>
                  <ArrowRight size={20} />
                </span>
              </CpLink>
            ) : (
              <div className={s.nextStep}>
                <span>
                  <span className={s.nextStepLabel}>{t(d.next_step_label) || ui('your_next_step')}</span>
                  <span className={s.nextStepText}>{nextText}</span>
                </span>
              </div>
            )
          )}
        </div>

        {(d.card_title || d.card_eyebrow) && (
          <aside className={s.readyCard} aria-label="Readiness check">
            {d.card_eyebrow && <span className={cx(s.eyebrow, s.readyEyebrow)}>{t(d.card_eyebrow)}</span>}
            {d.card_title && <h2 className={s.readyTitle}>{t(d.card_title)}</h2>}
            {overall !== null ? (
              <p className={s.readyMeta}>
                <strong className={s.readyOverall}>{ui('overall_ready', { score: overall })}</strong>
              </p>
            ) : (
              d.card_meta && <p className={s.readyMeta}>{t(d.card_meta)}</p>
            )}

            {meError && (
              <p className={s.readyNote} role="status">
                Couldn’t load your scores.{' '}
                <button type="button" className={s.textLink} onClick={retryMe}>
                  Retry
                </button>
              </p>
            )}

            {stations.length > 0 && (
              <div className={cx(s.ghostBars, meLoading && s.loadingBars)} aria-busy={meLoading || undefined} aria-label={overall !== null ? ui('your_score') : undefined} aria-hidden={overall === null}>
                {stations.slice(0, 5).map((st) => {
                  const score = stationTrack(st.id)?.score;
                  const has = score !== null && score !== undefined;
                  return (
                    <div key={st.id} className={s.ghostBar}>
                      <span>{t(st.short_label) || t(st.title)}</span>
                      {has ? (
                        <span className={s.scoreTrack}>
                          <span className={s.scoreFill} style={{ width: `${Math.max(4, score!)}%` }} />
                        </span>
                      ) : (
                        <span className={s.ghostTrack} />
                      )}
                      <span className={s.scoreNum}>{has ? `${score}%` : ''}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {d.card_cta_href && d.card_cta_label ? (
              <CpLink href={d.card_cta_href} className={cx(s.btn, s.btnMoney, s.btnBlock)} onClick={() => event('readiness_start')}>
                {t(d.card_cta_label)} <ArrowRight size={18} aria-hidden />
              </CpLink>
            ) : null}
            {d.card_note && <p className={s.readyNote}>{t(d.card_note)}</p>}
          </aside>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Stat strip
// ---------------------------------------------------------------------------

export function StatStrip({ section }: { section: CpSection }) {
  const { t, anchorOf } = useCp();
  const stats: any[] = (section.data.stats as any[]) || [];
  if (stats.length === 0) return null;

  return (
    <section id={anchorOf(section)} className={s.statBand} aria-label="Key facts">
      <div className={s.wrap}>
        <dl className={s.stats} style={{ margin: 0 }}>
          {stats.map((st) => {
            const value = t(st.value);
            // An empty value is never presented as a fact: it always carries a
            // stamp, defaulting to "Being verified" when the admin chose none.
            const stamp = !value && (!st.stamp || st.stamp === 'none') ? 'being_verified' : st.stamp;
            return (
              <div key={st.id} className={s.stat}>
                <dt className={s.statLabel}>{t(st.label)}</dt>
                <dd style={{ margin: 0 }}>
                  <div className={cx(s.statValue, !value && s.statValueEmpty)}>{value || '—'}</div>
                  <Stamp
                    kind={stamp}
                    text={t(st.stamp_text)}
                    date={st.verified_at}
                    href={stamp === 'verified' ? st.source_url : ''}
                  />
                  {st.link_href && st.link_label && (
                    <CpLink href={st.link_href} className={s.statLink}>
                      {t(st.link_label)}
                    </CpLink>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section nav — sticky chips with scroll-spy
// ---------------------------------------------------------------------------

export function SectionNav({ section }: { section: CpSection }) {
  const { t, sections, anchorOf, preview } = useCp();

  const items = useMemo(
    () =>
      sections
        .filter((x) => x.visible && x.id !== section.id)
        .map((x) => ({ anchor: anchorOf(x), label: t(x.data.nav_label) || DEFAULT_NAV_LABEL[x.type] || '' }))
        .filter((x) => x.label),
    [sections, section.id, anchorOf, t]
  );

  const [active, setActive] = useState<string>('');
  const chipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview || typeof IntersectionObserver === 'undefined') return;
    const targets = items
      .map((i) => document.getElementById(i.anchor))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;
    // A thin band across the upper middle of the viewport: whichever section
    // crosses it is the one being read.
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-35% 0px -60% 0px' }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items, preview]);

  // Keep the active chip in view inside the horizontal scroller without ever
  // scrolling the page itself.
  useEffect(() => {
    const box = chipsRef.current;
    const chip = box?.querySelector<HTMLElement>(`[data-anchor="${active}"]`)?.closest('a');
    if (!box || !chip) return;
    const left = chip.offsetLeft - box.clientWidth / 2 + chip.clientWidth / 2;
    box.scrollTo({ left, behavior: 'smooth' });
  }, [active]);

  if (items.length === 0) return null;

  return (
    <nav className={s.navBar} aria-label="On this page">
      <div className={cx(s.wrap, s.navInner)}>
        {section.data.eyebrow && <span className={s.navLabel}>{t(section.data.eyebrow)}</span>}
        <div className={s.navChips} ref={chipsRef}>
          {items.map((i) => (
            <CpLink key={i.anchor} href={`#${i.anchor}`} className={cx(s.navChip, active === i.anchor && s.navChipActive)}>
              <span data-anchor={i.anchor}>{i.label}</span>
            </CpLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
