import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BellRing, Check, Eye, Flame, Lock, ShieldCheck } from 'lucide-react';
import type { CpSection } from '@/types/companyPage';
import dynamic from 'next/dynamic';
import { useWebPush } from '@/hooks/useWebPush';

// Loaded on first open: most visitors never open the preview.
const Sheet = dynamic(() => import('@/components/common/Sheet').then((m) => m.Sheet), { ssr: false });

/**
 * Mounted only after a student turns on "Notify me". The push hook checks the
 * service worker and re-syncs subscriptions when it mounts — work that has no
 * business running on every visit to this page. Once mounted, it subscribes
 * this browser if it can, then reports back.
 */
function PushEnabler({ onDone }: { onDone: () => void }) {
  const push = useWebPush();
  const started = React.useRef(false);
  useEffect(() => {
    if (started.current) return;
    if (!push.supported) {
      const t = setTimeout(onDone, 1500);
      return () => clearTimeout(t);
    }
    started.current = true;
    if (push.subscribed) {
      onDone();
      return;
    }
    void push.subscribe().finally(onDone);
  }, [push.supported, push.subscribed, push, onDone]);
  return null;
}
import { CpLink, SectionHead, UiKey, cx, formatRupees, roundKey, useCp, useLocalState } from './shared';
import s from './companyPage.module.css';

// ---------------------------------------------------------------------------
// Date helpers — local calendar days, never UTC, so "today" is the student's.
// ---------------------------------------------------------------------------

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseLocal(toIso).getTime() - parseLocal(fromIso).getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Countdown plan
// ---------------------------------------------------------------------------

type PlanDay = { date: Date; focus: string; kind: 'study' | 'mock' | 'final' | 'test' };

/**
 * Splits `studyDays` across the admin's focus areas in proportion to weight,
 * interleaved (smooth weighted round-robin) so a heavy topic is spread across
 * the plan instead of bunched at the start. Every Nth day is a full mock; the
 * last study day is light revision.
 */
export function buildPlan(
  start: Date,
  studyDays: number,
  blocks: { focus: string; weight: number }[],
  mockEvery: number,
  finalLabel: string,
  mockLabel = 'Full mock'
): PlanDay[] {
  const out: PlanDay[] = [];
  const pool = blocks.filter((b) => b.focus).map((b) => ({ ...b, weight: Math.max(1, b.weight || 1), current: 0 }));
  const total = pool.reduce((sum, b) => sum + b.weight, 0);

  for (let i = 0; i < studyDays; i++) {
    const date = addDays(start, i);
    if (i === studyDays - 1 && studyDays > 1) {
      out.push({ date, focus: finalLabel || 'Revision', kind: 'final' });
    } else if (mockEvery > 0 && (i + 1) % mockEvery === 0) {
      out.push({ date, focus: mockLabel, kind: 'mock' });
    } else if (pool.length === 0) {
      out.push({ date, focus: 'Practice', kind: 'study' });
    } else {
      for (const b of pool) b.current += b.weight;
      const pick = pool.reduce((best, b) => (b.current > best.current ? b : best), pool[0]);
      pick.current -= total;
      out.push({ date, focus: pick.focus, kind: 'study' });
    }
  }
  return out;
}

const MAX_CELLS = 60;

export function Countdown({ section }: { section: CpSection }) {
  const { t, ui, lang, anchorOf, company, signedIn, me, actions, onRequireAuth, event, preview } = useCp();
  const d = section.data;
  const [localDate, setLocalDate] = useLocalState<string>(`cp-test-date:${company.id}`, '');
  // `today` is read after mount so server and client markup agree.
  const [today, setToday] = useState<string>('');
  useEffect(() => setToday(todayIso()), []);

  // Signed in, the account holds the date. A date picked before signing in is
  // carried over once, so nothing the student entered is lost.
  const serverDate = me?.profile.test_date || '';
  useEffect(() => {
    if (signedIn && me && !serverDate && localDate) actions.setTestDate(localDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, !!me, serverDate, localDate]);
  const testDate = signedIn && me ? serverDate || localDate : localDate;

  const setDate = (v: string) => {
    setLocalDate(v);
    if (signedIn) actions.setTestDate(v);
    if (v) event('test_date_set');
  };

  const blocks = ((d.plan_blocks as any[]) || []).map((b) => ({ focus: t(b.focus), weight: Number(b.weight) || 1 }));
  const mockEvery = Number(d.mock_every_days) || 0;
  const finalLabel = t(d.final_day_label);

  const daysLeft = today && testDate ? daysBetween(today, testDate) : null;
  const personal = daysLeft !== null && daysLeft > 0;
  const studyDays = personal ? daysLeft! : Number(d.default_days) || 14;

  const plan = useMemo(() => {
    if (!today) return [] as PlanDay[];
    const start = parseLocal(today);
    const days = buildPlan(start, Math.min(studyDays, MAX_CELLS), blocks, mockEvery, finalLabel, ui('full_mock'));
    if (personal && studyDays <= MAX_CELLS) days.push({ date: parseLocal(testDate), focus: ui('test_day'), kind: 'test' });
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, studyDays, personal, testDate, JSON.stringify(blocks), mockEvery, finalLabel, lang]);

  const streak = me?.profile.daily_streak || 0;
  const doneToday = !!me?.profile.practiced_today;
  const markDone = () => {
    if (preview) return;
    if (!signedIn) return onRequireAuth?.();
    actions.markDaily();
  };

  return (
    <section id={anchorOf(section)} className={s.section}>
      <div className={s.wrap}>
        <SectionHead data={d} />
        <div className={s.countGrid}>
          <div className={s.countSide}>
            <div className={s.dateCard}>
              <label className={s.dateLabel} htmlFor={`${section.id}-date`}>
                {t(d.date_label) || 'My test date'}
              </label>
              <input
                id={`${section.id}-date`}
                type="date"
                autoComplete="off"
                className={s.dateInput}
                value={testDate}
                min={today || undefined}
                onChange={(e) => setDate(e.target.value)}
              />
              {daysLeft !== null && (
                <div className={s.daysLeft} aria-live="polite">
                  {daysLeft > 0 ? (
                    <>
                      <span className={s.daysNum}>{daysLeft}</span>
                      <span className={s.daysWord}>{daysLeft === 1 ? ui('day_to_go') : ui('days_to_go')}</span>
                    </>
                  ) : daysLeft === 0 ? (
                    <span className={s.daysWord}>{ui('test_today')}</span>
                  ) : (
                    <span className={s.daysWord}>{ui('date_passed')}</span>
                  )}
                </div>
              )}
            </div>

            {(d.daily_title || d.daily_text) && (
              <div className={cx(s.card, s.dailyCard)}>
                <div className={s.dailyBody}>
                  <div className={s.h3} style={{ fontSize: 16 }}>{t(d.daily_title)}</div>
                  {d.daily_text && <div className={cx(s.small, s.muted)}>{t(d.daily_text)}</div>}
                  {streak > 0 && (
                    <span className={s.streak}>
                      <Flame size={14} aria-hidden /> {ui('streak', { n: streak })}
                    </span>
                  )}
                  <div className={s.dailyActions}>
                    <button
                      type="button"
                      className={cx(s.btn, doneToday ? s.btnGhost : s.btnInk, s.btnSm)}
                      onClick={markDone}
                      disabled={doneToday}
                    >
                      {doneToday ? (
                        <>
                          <Check size={15} aria-hidden /> {ui('done_today')}
                        </>
                      ) : (
                        ui('mark_done')
                      )}
                    </button>
                    {d.daily_cta_href && (
                      <CpLink href={d.daily_cta_href} className={s.textLink} onClick={() => event('daily_start')}>
                        {t(d.daily_cta_label) || 'Practise now'}
                      </CpLink>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={cx(s.card, s.planCard)}>
            <div className={s.planHead}>
              <h3 className={s.h3}>{personal ? ui('your_plan', { n: studyDays }) : ui('sample_plan', { n: studyDays })}</h3>
              {!personal && <span className={cx(s.small, s.muted)}>{ui('set_date_hint')}</span>}
            </div>
            <div className={cx(s.strip, !personal && s.stripSample)} role="list" aria-label="Day-by-day plan">
              {plan.map((p, i) => (
                <div
                  key={i}
                  role="listitem"
                  className={cx(
                    s.day,
                    i === 0 && personal && s.dayToday,
                    p.kind === 'mock' && s.dayMock,
                    p.kind === 'final' && s.dayFinal,
                    p.kind === 'test' && s.dayTest
                  )}
                >
                  <span className={s.dayWeek}>
                    {i === 0 ? ui('today') : p.date.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short' })}
                  </span>
                  <span className={s.dayDate}>{p.date.getDate()}</span>
                  <span className={s.dayFocus}>{p.focus}</span>
                </div>
              ))}
            </div>
            {personal && studyDays > MAX_CELLS && (
              <p className={cx(s.small, s.muted)} style={{ marginTop: 10 }}>
                {ui('first_days', { n: MAX_CELLS })}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Prep pack — free card + ticket
// ---------------------------------------------------------------------------

export function PrepPack({ section }: { section: CpSection }) {
  const { t, ui, anchorOf, sections, packPrice, packOwned, onGetPack, onPreview, onOpenItem, preview, company, event } = useCp();
  const d = section.data;
  const [sheetOpen, setSheetOpen] = useState(false);
  // The portal target only exists in the browser; waiting for mount keeps the
  // first client render identical to the server HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const allItems = useMemo(() => (company.modules || []).flatMap((m) => m.items || []), [company.modules]);
  const pickedItems = ((d.preview_item_ids as string[]) || [])
    .map((id) => allItems.find((it) => it.id === id))
    .filter((it): it is NonNullable<typeof it> => !!it);
  const rounds = sections.find((x) => x.type === 'rounds_route' && x.visible);
  const roundsHref = rounds ? `#${anchorOf(rounds)}` : '#top';
  const freeFeatures: string[] = d.free_features || [];
  const paidFeatures: string[] = d.paid_features || [];

  return (
    <section id={anchorOf(section)} className={s.section}>
      <div className={s.wrap}>
        <SectionHead data={d} />
        <div className={s.packGrid}>
          <div className={cx(s.card, s.freeCard)}>
            <h3 className={cx(s.h3, s.muted)} style={{ fontSize: 16 }}>{t(d.free_title) || 'Free'}</h3>
            <div className={s.priceBig}>{t(d.free_price_label) || '₹0'}</div>
            <ul className={s.checks}>
              {freeFeatures.map((f) => (
                <li key={f}>
                  <Check size={16} className={s.checkIcon} aria-hidden />
                  <span>{t(f)}</span>
                </li>
              ))}
            </ul>
            <CpLink href={d.free_cta_href || roundsHref} className={cx(s.btn, s.btnGhost, s.btnBlock, s.cardPush)}>
              {t(d.free_cta_label) || 'Start free'}
            </CpLink>
          </div>

          <div className={s.ticket}>
            <div className={s.ticketMain}>
              <div className={s.ticketTop}>
                <span className={s.ticketTitle}>{t(d.paid_title) || `${company.name} Pack`}</span>
                {packOwned ? (
                  <span className={s.ownedStamp}>
                    <ShieldCheck size={14} aria-hidden /> {ui('pack_active')}
                  </span>
                ) : (
                  d.paid_badge && <span className={s.badge}>{t(d.paid_badge)}</span>
                )}
              </div>

              <div className={s.ticketPrice}>
                <span className={s.priceBig}>{packOwned ? ui('yours') : packPrice ? formatRupees(packPrice) : '—'}</span>
                {!packOwned && d.paid_price_note && <span className={s.ticketPriceNote}>{t(d.paid_price_note)}</span>}
              </div>

              <ul className={s.checks}>
                {paidFeatures.map((f) => (
                  <li key={f}>
                    <Check size={16} className={s.checkIcon} aria-hidden />
                    <span>{t(f)}</span>
                  </li>
                ))}
              </ul>

              <div className={s.ticketActions}>
                {packOwned ? (
                  <CpLink href={roundsHref} className={cx(s.btn, s.btnMoney)}>
                    {ui('go_rounds')} <ArrowRight size={18} aria-hidden />
                  </CpLink>
                ) : packPrice ? (
                  <button
                    type="button"
                    className={cx(s.btn, s.btnMoney)}
                    onClick={() => {
                      if (preview) return;
                      event('pack_cta');
                      onGetPack?.();
                    }}
                  >
                    {t(d.paid_cta_label) || 'Get the pack'} — {formatRupees(packPrice)}
                  </button>
                ) : (
                  <button type="button" className={cx(s.btn, s.btnMoney)} disabled>
                    {ui('coming_soon')}
                  </button>
                )}
                {!packOwned && d.preview_label && (pickedItems.length > 0 || d.preview_href || onPreview) && (
                  pickedItems.length > 0 ? (
                    <button
                      type="button"
                      className={cx(s.btn, s.btnGhostLight)}
                      onClick={() => {
                        if (preview) return;
                        event('preview_open');
                        setSheetOpen(true);
                      }}
                    >
                      <Eye size={17} aria-hidden /> {t(d.preview_label)}
                    </button>
                  ) : d.preview_href ? (
                    <CpLink href={d.preview_href} className={cx(s.btn, s.btnGhostLight)} onClick={() => event('preview_open')}>
                      <Eye size={17} aria-hidden /> {t(d.preview_label)}
                    </CpLink>
                  ) : (
                    <button
                      type="button"
                      className={cx(s.btn, s.btnGhostLight)}
                      onClick={() => {
                        if (preview) return;
                        event('preview_open');
                        onPreview?.();
                      }}
                    >
                      <Eye size={17} aria-hidden /> {t(d.preview_label)}
                    </button>
                  )
                )}
              </div>

              {packOwned
                ? d.owned_text && <p className={s.ticketFine}>{t(d.owned_text)}</p>
                : d.refund_text && <p className={s.ticketFine}>{t(d.refund_text)}</p>}
            </div>
            <div className={s.ticketStub} aria-hidden>
              <span>{company.name}</span>
              <span>Prep pass</span>
            </div>
          </div>
        </div>
      </div>
      {/*
        Portalled to <body>: sections use content-visibility, whose containment
        makes the section the containing block for position:fixed — the sheet
        would otherwise be placed relative to this section, not the screen.
      */}
      {!preview && mounted && pickedItems.length > 0 && createPortal(
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t(d.preview_label) || 'Preview questions'} side="bottom">
          <div className={s.previewList}>
            {pickedItems.map((it, i) => (
              <button
                key={it.id}
                type="button"
                className={s.previewItem}
                onClick={() => {
                  setSheetOpen(false);
                  onOpenItem?.(it.id);
                }}
              >
                <span className={s.previewNum}>{i + 1}</span>
                <span className={s.previewText}>{it.question_text || 'Question'}</span>
                {!it.is_free_preview && <Lock size={15} aria-label="Locked" />}
              </button>
            ))}
          </div>
        </Sheet>,
        document.body
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Drive Radar — the departures board
// ---------------------------------------------------------------------------

const KIND_COLOR: Record<string, string> = {
  applications: '#7DD3FC',
  invites: '#FDBA74',
  results: '#5EEAD4',
  onboarding: '#C4B5FD',
  other: '#CBD5E1',
};

const KINDS = ['applications', 'invites', 'results', 'onboarding', 'other'] as const;

function shortDate(iso: string, lang: string): string {
  if (!iso) return '';
  return parseLocal(iso).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' });
}

type BoardRow = {
  id: string;
  kind: string;
  text: string;
  date: string;
  confirmed: number;
  pending: boolean;
  student: boolean;
};

export function DriveRadar({ section }: { section: CpSection }) {
  const { t, ui, lang, preview, radar, me, signedIn, actions, onRequireAuth, event } = useCp();
  const d = section.data;
  const minConf = Number(d.min_confirmations) || 0;
  const [enablingPush, setEnablingPush] = useState(false);

  // Admin-entered rows and student reports share one board, newest first.
  const rows: BoardRow[] = useMemo(() => {
    const admin = ((d.updates as any[]) || []).map((u) => ({
      id: u.id,
      kind: u.kind,
      text: t(u.text),
      date: u.date || '',
      confirmed: Number(u.confirmed) || 0,
      pending: false,
      student: false,
    }));
    const students = (preview ? [] : radar).map((r) => ({ ...r, student: true }));
    return [...admin, ...students].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [d.updates, radar, preview, t]);

  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<string>('invites');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const openForm = () => {
    if (preview) return;
    if (!signedIn) return onRequireAuth?.();
    setFormOpen(true);
    setNote(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await actions.report(kind, text);
    setBusy(false);
    if (err) {
      setNote({ ok: false, text: err });
    } else {
      event('radar_report');
      setFormOpen(false);
      setText('');
      setNote({ ok: true, text: minConf > 0 ? ui('report_thanks_crowd') : ui('report_thanks_admin') });
    }
  };

  const watching = !!me?.watching;
  const toggleWatch = async () => {
    if (preview) return;
    if (!signedIn) return onRequireAuth?.();
    const next = !watching;
    const ok = await actions.setWatching(next);
    if (ok && next) {
      event('notify_on');
      // Alerts are push notifications: make sure this browser can receive one.
      setEnablingPush(true);
    }
  };

  return (
    <div className={s.card}>
      <SectionHead data={d} className="" />
      <div className={s.board} aria-live="polite">
        {rows.length === 0 ? (
          <p className={s.boardEmpty}>{t(d.empty_text) || ui('no_updates')}</p>
        ) : (
          rows.map((u, i) => {
            const mine = !!me?.radar_mine.includes(u.id);
            const confirmedByMe = !!me?.radar_confirmed.includes(u.id);
            return (
              <div
                key={u.id}
                className={cx(s.boardRow, i === 0 && !preview && s.boardFresh, u.pending && s.boardPending)}
                style={{ ['--k' as any]: KIND_COLOR[u.kind] || KIND_COLOR.other }}
              >
                <span className={s.boardDot} aria-hidden />
                <span className={s.boardKind}>{ui((KINDS as readonly string[]).includes(u.kind) ? (u.kind as UiKey) : 'other')}</span>
                <span className={s.boardText}>{u.text}</span>
                <span className={s.boardMeta}>
                  {shortDate(u.date, lang)}
                  {u.pending
                    ? ` · ${ui('unconfirmed', { n: u.confirmed, m: minConf })}`
                    : u.confirmed > 0
                      ? ` · ${ui('confirmed_by', { n: u.confirmed, s: u.confirmed === 1 ? '' : 's' })}`
                      : ''}
                </span>
                {u.student && !preview && (
                  <span className={s.boardAct}>
                    {mine ? (
                      <span className={s.boardTag}>{ui('your_report')}</span>
                    ) : confirmedByMe ? (
                      <span className={s.boardTag}>
                        <Check size={13} aria-hidden /> {ui('you_confirmed')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={s.boardConfirm}
                        onClick={() => (signedIn ? actions.confirm(u.id) : onRequireAuth?.())}
                      >
                        {ui('i_saw_this')}
                      </button>
                    )}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {formOpen && (
        <form className={s.reportForm} onSubmit={submit}>
          <label className={s.small}>
            <span className={s.fieldLabel}>{ui('report_kind')}</span>
            <select className={s.field} value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {ui(k as UiKey)}
                </option>
              ))}
            </select>
          </label>
          <label className={s.small}>
            <span className={s.fieldLabel}>{ui('report_text')}</span>
            <textarea
              className={s.field}
              rows={2}
              maxLength={160}
              minLength={10}
              required
              value={text}
              placeholder={ui('report_placeholder')}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className={s.boardActions} style={{ marginTop: 0 }}>
            <button type="submit" className={cx(s.btn, s.btnInk)} disabled={busy || text.trim().length < 10}>
              {ui('send')}
            </button>
            <button type="button" className={cx(s.btn, s.btnGhost)} onClick={() => setFormOpen(false)}>
              {ui('cancel')}
            </button>
          </div>
        </form>
      )}
      {note && (
        <p className={cx(s.small, note.ok ? s.noteOk : s.noteErr)} role="status">
          {note.text}
        </p>
      )}

      {enablingPush && <PushEnabler onDone={() => setEnablingPush(false)} />}
      {!formOpen && (
        <div className={s.boardActions}>
          {d.allow_reports ? (
            <button type="button" className={cx(s.btn, s.btnInk)} onClick={openForm}>
              {t(d.report_label) || 'Report an update'}
            </button>
          ) : (
            d.report_href &&
            d.report_label && (
              <CpLink href={d.report_href} className={cx(s.btn, s.btnInk)}>
                {t(d.report_label)}
              </CpLink>
            )
          )}
          {d.notify_label && (
            <button type="button" className={cx(s.btn, s.btnGhost)} onClick={toggleWatch} aria-pressed={watching}>
              <BellRing size={16} aria-hidden /> {watching ? ui('notifying') : t(d.notify_label)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onboarding tracker — saved to the account when signed in
// ---------------------------------------------------------------------------

export function Onboarding({ section }: { section: CpSection }) {
  const { t, ui, company, signedIn, me, actions } = useCp();
  const d = section.data;
  const steps: any[] = d.steps || [];
  const [localDone, setLocalDone] = useLocalState<string[]>(`cp-onboard:${company.id}`, []);
  const done = signedIn && me ? me.profile.onboarding_done : localDone;
  const doneCount = steps.filter((st) => done.includes(st.id)).length;

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setLocalDone(next);
    if (signedIn) actions.setOnboarding(next);
  };

  return (
    <div className={s.card}>
      {d.eyebrow && <span className={s.eyebrow}>{t(d.eyebrow)}</span>}
      <div className={s.progressHead}>
        <h3 className={s.h3} style={{ fontSize: 22, fontFamily: 'var(--display)' }}>{t(d.title) || 'Onboarding tracker'}</h3>
        {steps.length > 0 && <span className={cx(s.small, s.muted)}>{ui('done_of', { d: doneCount, n: steps.length })}</span>}
      </div>
      {steps.length > 0 && (
        <>
          <div className={s.segments} aria-hidden>
            {steps.map((st) => (
              <span key={st.id} className={cx(s.segment, done.includes(st.id) && s.segmentDone)} />
            ))}
          </div>
          <ul className={s.checkList}>
            {steps.map((st) => {
              const on = done.includes(st.id);
              return (
                <li key={st.id}>
                  <label className={s.checkRow}>
                    <input type="checkbox" className={s.srOnly} checked={on} onChange={() => toggle(st.id)} />
                    <span className={cx(s.checkBox, on && s.checkBoxOn)} aria-hidden>
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span>
                      <span className={cx(s.checkTitle, on && s.checkTitleDone)}>{t(st.title)}</span>
                      {st.hint && <span className={s.checkHint} style={{ display: 'block' }}>{t(st.hint)}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comeback
// ---------------------------------------------------------------------------

export function Comeback({ section }: { section: CpSection }) {
  const { t, ui, me, sections } = useCp();
  const d = section.data;
  const rounds = sections.find((x) => x.type === 'rounds_route');
  const stations: any[] = (rounds?.data.stations as any[]) || [];
  const weakest = me?.track.weakest_station_id ? stations.find((st) => st.id === me.track.weakest_station_id) : null;
  return (
    <div className={s.comeback}>
      <h3 className={s.h3}>{t(d.title) || 'Didn’t clear this time?'}</h3>
      {d.body && <p>{t(d.body)}</p>}
      {weakest && (
        <p style={{ fontWeight: 700 }}>
          <CpLink href={`#round-${roundKey(weakest, stations.indexOf(weakest))}`}>{ui('weakest_now', { round: t(weakest.title) })}</CpLink>
        </p>
      )}
      {d.cta_href && d.cta_label && (
        <CpLink href={d.cta_href} className={s.textLink}>
          {t(d.cta_label)}
        </CpLink>
      )}
    </div>
  );
}
