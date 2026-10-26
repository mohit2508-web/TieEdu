import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, Check, Plus } from 'lucide-react';
import type { CpSection } from '@/types/companyPage';
import { CpLink, Markdown, SectionHead, Stamp, cx, roundKey, stationsForRole, useCp, useLocalState } from './shared';
import s from './companyPage.module.css';

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Eligibility + How to apply
// ---------------------------------------------------------------------------

export function EligibilityApply({ section }: { section: CpSection }) {
  const { t, anchorOf, company } = useCp();
  const d = section.data;
  const rows: any[] = d.rows || [];
  const steps: any[] = d.steps || [];
  const checkRows = rows.filter((r) => r.check);
  const [checking, setChecking] = useState(false);
  // Answers stay on this device: they are the student's private assessment,
  // and nothing on the server needs them.
  const [answers, setAnswers] = useLocalState<Record<string, 'yes' | 'no'>>(`cp-elig:${company.id}`, {});
  const answered = checkRows.filter((r) => answers[r.id]);
  const failing = checkRows.filter((r) => answers[r.id] === 'no');

  return (
    <section id={anchorOf(section)} className={s.section}>
      <div className={s.wrap}>
        <SectionHead data={d} />
        <div className={s.split}>
          <div className={s.card}>
            <h3 className={s.h3}>{t(d.eligibility_title) || 'Eligibility'}</h3>
            {rows.length > 0 && checking ? (
              <div className={s.selfCheck}>
                {checkRows.map((r) => (
                  <div key={r.id} className={s.checkQ} role="group" aria-label={t(r.check)}>
                    <div>
                      <div className={s.checkQText}>{t(r.check)}</div>
                      {r.value && <div className={cx(s.small, s.muted)}>{t(r.label)}: {t(r.value)}</div>}
                    </div>
                    <div className={s.yesNo}>
                      {(['yes', 'no'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={answers[r.id] === v}
                          className={cx(s.ynBtn, answers[r.id] === v && (v === 'yes' ? s.ynYes : s.ynNo))}
                          onClick={() => setAnswers((prev) => ({ ...prev, [r.id]: v }))}
                        >
                          {v === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className={s.checkResult} aria-live="polite">
                  {answered.length < checkRows.length ? (
                    <span className={s.muted}>
                      {answered.length} of {checkRows.length} answered
                    </span>
                  ) : failing.length === 0 ? (
                    <span className={s.resultOk}>You meet every listed requirement. Confirm on the official notice before you apply.</span>
                  ) : (
                    <span className={s.resultNo}>
                      Check before applying: {failing.map((r) => t(r.label)).join(', ')}. Rules can change between drives.
                    </span>
                  )}
                </div>
                <button type="button" className={s.textLink} onClick={() => setChecking(false)}>
                  Back to the rules
                </button>
              </div>
            ) : rows.length > 0 ? (
              <>
                <dl className={s.dl}>
                  {rows.map((r) => (
                    <div key={r.id} className={s.dlRow}>
                      <dt>{t(r.label)}</dt>
                      <dd>{t(r.value) || <Stamp kind="being_verified" />}</dd>
                    </div>
                  ))}
                </dl>
                {checkRows.length > 0 && d.self_check_label && (
                  <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} style={{ marginTop: 16 }} onClick={() => setChecking(true)}>
                    {t(d.self_check_label)}
                  </button>
                )}
              </>
            ) : (
              <p className={s.empty}>Eligibility rules are being verified from the official notice.</p>
            )}
            {(d.last_confirmed || d.source_url) && (
              <p className={s.cardFoot}>
                {d.last_confirmed && <>Last confirmed {formatDate(d.last_confirmed)}</>}
                {d.last_confirmed && d.source_url && ' · '}
                {d.source_url && (
                  <CpLink href={d.source_url} className={s.textLink}>
                    {t(d.source_label) || 'Official source'}
                  </CpLink>
                )}
              </p>
            )}
          </div>

          <div className={s.card}>
            <h3 className={s.h3}>{t(d.apply_title) || 'How to apply'}</h3>
            {steps.length > 0 ? (
              <ol className={s.steps}>
                {steps.map((st, i) => (
                  <li key={st.id} className={s.step}>
                    <span className={s.stepNum} aria-hidden>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className={s.stepTitle}>{t(st.title)}</div>
                      {st.body && <div className={s.stepBody}>{t(st.body)}</div>}
                      {st.link_href && st.link_label && (
                        <CpLink href={st.link_href} className={s.textLink}>
                          {t(st.link_label)}
                        </CpLink>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={s.empty}>Application steps will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Rounds — the route line
// ---------------------------------------------------------------------------

export function RoundsRoute({ section }: { section: CpSection }) {
  const { t, ui, anchorOf, company, onOpenModule, preview, stationTrack, event, selectedRole } = useCp();
  const d = section.data;
  const allStations: any[] = d.stations || [];
  // Role-specific rounds (e.g. advanced coding for AASE) appear only for that role.
  const stations = stationsForRole(allStations, selectedRole);
  const keyOf = (st: any) => roundKey(st, allStations.indexOf(st));
  const [sel, setSel] = useState(0);
  const current = stations[Math.min(sel, stations.length - 1)];

  // #round-<key> opens that round — from the hero's "weakest round" link, a
  // shared URL, or a hash change on this page.
  useEffect(() => {
    if (preview) return;
    const apply = () => {
      const m = /^#round-([a-z0-9-]+)$/.exec(window.location.hash);
      if (!m) return;
      const i = stations.findIndex((st) => keyOf(st) === m[1]);
      if (i === -1) return;
      setSel(i);
      document.getElementById(anchorOf(section))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, stations.map((st) => st.id).join('|')]);

  const choose = (i: number) => {
    setSel(i);
    event('round_select');
    if (!preview && stations[i]) history.replaceState(null, '', `#round-${keyOf(stations[i])}`);
  };

  // A round is cleared at the pass mark; the line fills through the leading
  // run of cleared rounds, so it reads as progress along the route.
  const passMark = Number(d.pass_mark) || 70;
  const cleared = stations.map((st) => {
    const sc = stationTrack(st.id)?.score;
    return typeof sc === 'number' && sc >= passMark;
  });
  let done = 0;
  while (done < cleared.length && cleared[done]) done++;

  const moduleTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of company.modules || []) map.set(m.id, m.title);
    return map;
  }, [company.modules]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (sel + (e.key === 'ArrowRight' ? 1 : -1) + stations.length) % stations.length;
    choose(next);
    const btn = (e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    btn?.focus();
  };

  const tabId = (i: number) => `${section.id}-tab-${i}`;
  const panelId = `${section.id}-panel`;

  return (
    <section id={anchorOf(section)} className={s.section}>
      <div className={s.wrap}>
        <SectionHead data={d} />
        {stations.length === 0 ? (
          <div className={s.card}>
            <p className={s.empty}>The round-by-round route is being prepared.</p>
          </div>
        ) : (
          <div className={s.routeCard}>
            <div className={s.routeScroll}>
              <div
                className={s.route}
                role="tablist"
                aria-label="Rounds"
                onKeyDown={onKey}
                style={{ ['--n' as any]: stations.length, ['--fill' as any]: Math.max(done - 1, 0) }}
              >
                <span className={s.routeLine} aria-hidden />
                <span className={s.routeFill} aria-hidden />
                {stations.map((st, i) => (
                  <button
                    key={st.id}
                    id={tabId(i)}
                    type="button"
                    role="tab"
                    aria-selected={i === sel}
                    aria-controls={panelId}
                    tabIndex={i === sel ? 0 : -1}
                    className={cx(s.station, cleared[i] && s.stationCleared, i === sel && s.stationActive)}
                    onClick={() => choose(i)}
                    aria-label={cleared[i] ? `${t(st.title)} — cleared` : undefined}
                  >
                    <span className={s.stationDot}>{cleared[i] && i !== sel ? <Check size={16} strokeWidth={3} aria-hidden /> : i + 1}</span>
                    <span className={s.stationName}>
                      <span className={s.stationShort}>{t(st.short_label) || t(st.title)}</span>
                      <span className={s.stationLong}>{t(st.title)}</span>
                    </span>
                    {typeof stationTrack(st.id)?.score === 'number' && (
                      <span className={s.stationScore}>{stationTrack(st.id)!.score}%</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {current && (
              <div key={current.id} id={panelId} role="tabpanel" aria-labelledby={tabId(sel)} className={s.routePanel}>
                <div className={s.patternCard}>
                  <div className={s.patternHead}>
                    <h3 className={s.h3}>{t(current.title)}</h3>
                    {current.eliminatory === 'yes' && <span className={s.elimTag}>{ui('eliminatory')}</span>}
                  </div>
                  {(current.pattern || []).length > 0 ? (
                    <table className={s.patternTable}>
                      <thead>
                        <tr>
                          <th scope="col">Section</th>
                          <th scope="col">Qs</th>
                          <th scope="col">Min</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(current.pattern as any[]).map((p) => (
                          <tr key={p.id}>
                            <td>{t(p.name)}</td>
                            <td>{p.questions ?? '—'}</td>
                            <td>{p.minutes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className={s.empty}>{ui('pattern_verifying')}</p>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <Stamp
                      kind={current.last_drive_date ? 'candidate_reports' : 'being_verified'}
                      text={
                        current.last_drive_date
                          ? `Seen in ${formatDate(current.last_drive_date)} drive`
                          : t(current.status_note) || undefined
                      }
                    />
                  </div>
                  {(current.topics || []).length > 0 && (
                    <div className={s.topics}>
                      {(current.topics as string[]).map((tp) => (
                        <span key={tp} className={s.topic}>
                          {t(tp)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={s.loop}>
                  <div className={s.loopRow} style={{ ['--t' as any]: 'var(--train)' }}>
                    <span className={s.loopTag}>Train</span>
                    <div className={s.loopText}>{t(current.train_text) || 'Notes and worked examples for this round.'}</div>
                    {(current.module_ids || []).length > 0 && (
                      <div className={s.loopActions}>
                        {(current.module_ids as string[])
                          .filter((id) => moduleTitle.has(id))
                          .map((id) => (
                            <button
                              key={id}
                              type="button"
                              className={s.moduleChip}
                              onClick={() => !preview && onOpenModule?.(id)}
                            >
                              <BookOpen size={15} aria-hidden /> {moduleTitle.get(id)}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className={s.loopRow} style={{ ['--t' as any]: 'var(--test)' }}>
                    <span className={s.loopTag}>Test</span>
                    <div className={s.loopText}>{t(current.test_text) || 'A timed mock in the real pattern.'}</div>
                    {current.test_href && current.test_label && (
                      <div className={s.loopActions}>
                        <CpLink href={current.test_href} className={cx(s.btn, s.btnT)} onClick={() => event('test_start')}>
                          {t(current.test_label)} <ArrowUpRight size={16} aria-hidden />
                        </CpLink>
                      </div>
                    )}
                  </div>

                  <TrackRow stationId={current.id} fallback={t(current.track_text) || 'Take the mock to see your weakest topics here.'} />

                  {current.tip && (
                    <p className={s.tip}>
                      <strong>{ui('from_seniors')}</strong>
                      {t(current.tip)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** The Track row: the student's real score and weakest topics, or the admin's line. */
function TrackRow({ stationId, fallback }: { stationId: string; fallback: string }) {
  const { ui, stationTrack, meLoading } = useCp();
  const tr = stationTrack(stationId);
  const score = tr?.score;
  return (
    <div className={s.loopRow} style={{ ['--t' as any]: 'var(--track)' }} aria-busy={meLoading || undefined}>
      <span className={s.loopTag}>Track</span>
      {meLoading ? (
        <span className={s.skeletonLine} />
      ) : typeof score === 'number' ? (
        <>
          <div className={s.trackScore}>
            <span className={s.trackNum}>{score}%</span>
            <span className={s.trackBar}>
              <span style={{ width: `${Math.max(3, score)}%` }} />
            </span>
          </div>
          {tr!.weak_topics.length > 0 && (
            <div className={s.loopActions}>
              <span className={cx(s.small, s.muted)}>{ui('weak_topics')}:</span>
              {tr!.weak_topics.map((w) => (
                <span key={w.name} className={s.weakChip}>
                  {w.name} · {w.percentage}%
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className={cx(s.loopText, s.muted)}>{fallback}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role compare
// ---------------------------------------------------------------------------

export function RoleCompare({ section }: { section: CpSection }) {
  const { t, anchorOf, selectedRole, setSelectedRole } = useCp();
  const d = section.data;
  const roles: any[] = (d.roles || []).slice(0, 3);
  const rows: any[] = d.rows || [];
  // The role lives on the page root, so the rounds above follow the choice.
  const sel = selectedRole < roles.length ? selectedRole : 0;
  const setStored = setSelectedRole;

  if (roles.length === 0) {
    return (
      <section id={anchorOf(section)} className={s.section}>
        <div className={s.wrap}>
          <SectionHead data={d} />
          <div className={s.card}>
            <p className={s.empty}>Role details are being verified.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={anchorOf(section)} className={s.section}>
      <div className={s.wrap}>
        <div className={s.roleHead}>
          <SectionHead data={d} className="" />
          {roles.length > 1 && (
            <div className={s.segmented} role="radiogroup" aria-label="Target role">
              {roles.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={i === sel}
                  className={cx(s.segBtn, i === sel && s.segBtnOn)}
                  onClick={() => setStored(i)}
                >
                  {t(d.picker_label) ? `${t(d.picker_label)} ${t(r.short)}` : t(r.short)}
                </button>
              ))}
            </div>
          )}
        </div>

        <table className={s.compare}>
          <thead>
            <tr>
              <th scope="col">
                <span className={s.srOnly}>Attribute</span>
              </th>
              {roles.map((r, i) => (
                <th key={r.id} scope="col" className={cx(i === sel ? s.colOn : s.colOff)}>
                  <span className={s.roleTitle}>{t(r.title)}</span>
                  <span className={s.roleCtc}>{t(r.ctc) || '—'}</span>
                  <Stamp kind={!r.ctc && (!r.stamp || r.stamp === 'none') ? 'being_verified' : r.stamp} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{t(row.attribute)}</th>
                {roles.map((r, i) => (
                  <td key={r.id} className={cx(i === sel ? s.colOn : s.colOff)}>
                    {t(row[`role_${i + 1}`]) || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Community offer
// ---------------------------------------------------------------------------

export function CommunityOffer({ section }: { section: CpSection }) {
  const { t, anchorOf, onShareExperience, preview, event } = useCp();
  const d = section.data;
  return (
    <section id={anchorOf(section)} className={s.wrap} style={{ paddingBlock: 8 }}>
      <div className={s.offer}>
        <div>
          {d.title && <h2 className={s.offerTitle}>{t(d.title)}</h2>}
          {d.body && <p className={s.offerBody}>{t(d.body)}</p>}
        </div>
        {onShareExperience && (
          <button
            type="button"
            className={cx(s.btn, s.btnTeal)}
            onClick={() => {
              if (preview) return;
              event('share_experience');
              onShareExperience();
            }}
          >
            {t(d.cta_label) || 'Share my experience'}
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Experiences — wraps the existing component, passed in by the page
// ---------------------------------------------------------------------------

export function Experiences({ section, slot }: { section: CpSection; slot?: React.ReactNode }) {
  const { anchorOf } = useCp();
  return (
    <section id={anchorOf(section)} className={s.section}>
      <div className={s.wrap}>
        <SectionHead data={section.data} />
        <div className={s.card}>{slot || <p className={s.empty}>Published candidate experiences appear here.</p>}</div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ — native <details>, server-rendered so answers are indexable
// ---------------------------------------------------------------------------

export function Faq({ section }: { section: CpSection }) {
  const { t, anchorOf, event } = useCp();
  const items: any[] = section.data.items || [];
  return (
    <section id={anchorOf(section)} className={s.section}>
      <div className={cx(s.wrap, s.narrow)}>
        <SectionHead data={section.data} />
        {items.length === 0 ? (
          <p className={s.empty}>Questions will appear here.</p>
        ) : (
          <div className={s.faqList}>
            {items.map((it, i) => (
              <details
                key={it.id}
                className={s.faqItem}
                open={i === 0}
                onToggle={(e) => {
                  if (i > 0 && (e.currentTarget as HTMLDetailsElement).open) event('faq_open');
                }}
              >
                <summary className={s.faqQ}>
                  {t(it.q)}
                  <Plus size={20} className={s.faqIcon} aria-hidden />
                </summary>
                <div className={s.faqA}>
                  <Markdown text={t(it.a)} />
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Also preparing for
// ---------------------------------------------------------------------------

export function AlsoPreparing({ section }: { section: CpSection }) {
  const { t, anchorOf, companies } = useCp();
  const d = section.data;
  const picked = ((d.company_slugs as string[]) || [])
    .map((slug) => companies.find((c) => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <section id={anchorOf(section)} className={s.section} style={{ paddingTop: 24 }}>
      <div className={s.wrap}>
        <SectionHead data={d} />
        <div className={s.chipsRow}>
          {picked.map((c) => (
            <CpLink key={c.slug} href={`/company/${c.slug}`} className={s.coChip}>
              {c.name}
            </CpLink>
          ))}
          <CpLink href="/compare" className={cx(s.coChip, s.coChipInk)}>
            {t(d.compare_label) || 'Compare drives'}
          </CpLink>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Text block
// ---------------------------------------------------------------------------

export function RichText({ section }: { section: CpSection }) {
  const { t, anchorOf } = useCp();
  const d = section.data;
  const tone = ['note', 'tip', 'warning'].includes(d.tone) ? d.tone : 'plain';
  if (!d.title && !d.body) return null;
  return (
    <section id={anchorOf(section)} className={s.section}>
      <div className={cx(s.wrap, s.narrow)}>
        <SectionHead data={d} />
        {d.body && (
          <div className={tone !== 'plain' ? s[`tone_${tone}`] : undefined}>
            <Markdown text={t(d.body)} />
          </div>
        )}
      </div>
    </section>
  );
}
