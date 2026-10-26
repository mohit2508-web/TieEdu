import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Radio,
  Users,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  LayoutTemplate,
  Loader2,
  Monitor,
  Plus,
  Settings2,
  Smartphone,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { Company } from '@/types';
import type { CpAdminDoc, CpAdminRadarReport, CpContent, CpIssue, CpSchema, CpSection, CpSectionType, CpStats } from '@/types/companyPage';
import {
  CpApiError,
  fetchCpAdminDoc,
  fetchCpRadarReports,
  fetchCpRadarSuggestion,
  fetchCpSchema,
  fetchCpStats,
  moderateCpRadar,
  pingCpPresence,
  publishCp,
  resetCpDraft,
  restoreCpVersion,
  saveCpDraft,
  scheduleCp,
  setCpEnabled,
  unscheduleCp,
  uploadCpMedia,
} from '@/lib/companyPagesApi';
import { CompanyPageV2 } from '@/components/companyPage/CompanyPageV2';
import { packPrice } from '@/lib/packPricing';
import { SchemaForm, SchemaFormContext } from './SchemaForm';

/*
 * Company Page Studio — edit, preview and publish a company's redesigned page.
 *
 * - Forms are generated from the server's section catalogue (SchemaForm).
 * - The preview is the real page component rendered with the draft; layout
 *   follows container width, so the phone frame shows the genuine mobile page.
 * - The draft autosaves. Saves carry the `updated_at` they were based on, and
 *   the server refuses (409) if someone else saved in between.
 * - Publishing and switching the page on are separate, deliberate steps; the
 *   public site never sees a draft.
 */

const AUTOSAVE_MS = 2500;
const DESKTOP_WIDTH = 1280;
const PHONE_WIDTH = 390;

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
type Selection = 'settings' | string;
type MobileTab = 'sections' | 'edit' | 'preview';

const newSectionId = () => `s-${Math.random().toString(16).slice(2, 12)}`;

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Renders children at a fixed width, scaled down to fit the available width. */
function ScaledFrame({ width, children }: { width: number; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const sc = Math.min(1, o.clientWidth / width);
      setScale(sc);
      setHeight(i.scrollHeight * sc);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    measure();
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={outer} style={{ width: '100%', height }}>
      <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}

/** How a Google result would show this page, truncated at Google's usual lengths. */
function SearchSnippet({ title, description, slug }: { title: string; description: string; slug: string }) {
  const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  return (
    <div className="mb-5 rounded-xl border border-gray-200 p-3.5 bg-white" aria-label="Search result preview">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Google preview</div>
      <div className="text-xs text-gray-600">tieedu.com › company › {slug}</div>
      <div className="text-lg leading-snug text-[#1a0dab] mt-0.5">{cut(title || 'Untitled page', 60)}</div>
      <div className="text-sm leading-snug text-gray-700 mt-0.5">{cut(description || 'No description — Google will pick text from the page.', 158)}</div>
    </div>
  );
}

type Change = { kind: 'added' | 'removed' | 'changed' | 'moved'; text: string };

/** A readable list of what publishing the draft would change on the live page. */
function describeChanges(
  live: CpContent | null,
  draft: CpContent,
  defs: Map<string, { label: string }>,
  settingsFields: { key: string; label: string }[]
): Change[] {
  if (!live) return [];
  const out: Change[] = [];
  const label = (sec: CpSection) => {
    const base = defs.get(sec.type)?.label || sec.type;
    const title = String(sec.data?.title || '').trim();
    return title ? `${base} — “${title}”` : base;
  };
  for (const f of settingsFields) {
    if (JSON.stringify(live.settings?.[f.key] ?? null) !== JSON.stringify(draft.settings?.[f.key] ?? null)) {
      out.push({ kind: 'changed', text: `Setting: ${f.label}` });
    }
  }
  const liveById = new Map(live.sections.map((x) => [x.id, x]));
  const draftIds = new Set(draft.sections.map((x) => x.id));
  for (const sec of draft.sections) {
    const was = liveById.get(sec.id);
    if (!was) out.push({ kind: 'added', text: label(sec) });
    else if (was.visible !== sec.visible) out.push({ kind: 'changed', text: `${label(sec)} is now ${sec.visible ? 'shown' : 'hidden'}` });
    else if (JSON.stringify(was.data) !== JSON.stringify(sec.data)) out.push({ kind: 'changed', text: label(sec) });
  }
  for (const sec of live.sections) if (!draftIds.has(sec.id)) out.push({ kind: 'removed', text: label(sec) });
  const liveOrder = live.sections.filter((x) => draftIds.has(x.id)).map((x) => x.id).join('|');
  const draftOrder = draft.sections.filter((x) => liveById.has(x.id)).map((x) => x.id).join('|');
  if (liveOrder !== draftOrder) out.push({ kind: 'moved', text: 'Section order' });
  return out;
}

export default function CompanyPageStudio({
  company,
  companies,
  onClose,
}: {
  company: Company;
  companies: Company[];
  onClose: () => void;
}) {
  const [schema, setSchema] = useState<CpSchema | null>(null);
  const [doc, setDoc] = useState<CpAdminDoc | null>(null);
  const [content, setContent] = useState<CpContent | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [publishIssues, setPublishIssues] = useState<CpIssue[] | null>(null);
  const [busy, setBusy] = useState<'' | 'publish' | 'enable' | 'restore' | 'reset'>('');

  const [selected, setSelected] = useState<Selection>('settings');
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const [menu, setMenu] = useState<'' | 'add' | 'history' | 'template' | 'issues' | 'schedule' | 'radar' | 'stats' | 'publish'>('');
  const [suggestion, setSuggestion] = useState<{ status: 'Open' | 'Closed' | null; basis: { kind: string; date: string; text: string } | null; count: number } | null>(null);
  const [editLang, setEditLang] = useState<'en' | 'hi'>('en');
  const [others, setOthers] = useState<{ name: string; seconds_ago: number }[]>([]);
  const [radarReports, setRadarReports] = useState<CpAdminRadarReport[]>([]);
  const [stats, setStats] = useState<CpStats | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');

  const versionRef = useRef(0);
  const savingRef = useRef(false);
  const previewPane = useRef<HTMLDivElement>(null);
  const scrollToSelection = useRef(false);

  // ------------------------------------------------------------------ load
  const adopt = useCallback((d: CpAdminDoc, replaceContent: boolean) => {
    setDoc(d);
    setBase(d.persisted ? d.updated_at : null);
    if (replaceContent) setContent(d.draft);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCpSchema(), fetchCpAdminDoc(company.id)])
      .then(([sc, d]) => {
        if (cancelled) return;
        setSchema(sc);
        adopt(d, true);
      })
      .catch((e) => !cancelled && setLoadError(e?.message || 'Could not load the studio.'));
    return () => {
      cancelled = true;
    };
  }, [company.id, adopt]);

  // Presence: a courtesy warning when another admin has this page open. The
  // 409 on save is what actually prevents overwrites.
  useEffect(() => {
    let alive = true;
    const ping = () =>
      pingCpPresence(company.id)
        .then((r) => alive && setOthers(r.others))
        .catch(() => {});
    ping();
    const timer = setInterval(ping, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
      void pingCpPresence(company.id, true).catch(() => {});
    };
  }, [company.id]);

  const loadRadar = useCallback(() => {
    fetchCpRadarReports(company.id).then(setRadarReports).catch(() => {});
  }, [company.id]);
  useEffect(() => loadRadar(), [loadRadar]);
  useEffect(() => {
    if (menu === 'radar') {
      loadRadar();
      fetchCpRadarSuggestion(company.id).then(setSuggestion).catch(() => setSuggestion(null));
    }
    if (menu === 'stats') fetchCpStats(company.id).then(setStats).catch(() => setStats(null));
  }, [menu, company.id, loadRadar]);
  const pendingRadar = radarReports.filter((r) => r.status === 'pending').length;

  const moderate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const updated = await moderateCpRadar(company.id, id, status);
      setRadarReports((list) => list.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.message || 'Could not update that report' });
    }
  };

  // --------------------------------------------------------------- editing
  const edit = useCallback((fn: (c: CpContent) => CpContent) => {
    setContent((c) => (c ? fn(c) : c));
    versionRef.current += 1;
    setDirty(true);
    setSaveState('idle');
  }, []);

  const save = useCallback(
    async (opts?: { force?: boolean }): Promise<boolean> => {
      if (!content || savingRef.current) return false;
      savingRef.current = true;
      setSaveState('saving');
      const version = versionRef.current;
      try {
        const res = await saveCpDraft(company.id, content, opts?.force ? doc?.updated_at ?? base : base);
        // Only adopt the server's normalised copy if nothing changed meanwhile —
        // otherwise it would overwrite what the admin typed during the save.
        const unchanged = versionRef.current === version;
        adopt(res, unchanged);
        if (unchanged) setDirty(false);
        // The saved draft carries fresh issues; a refused publish's list is now stale.
        setPublishIssues(null);
        setSaveState('saved');
        return true;
      } catch (e: any) {
        if (e instanceof CpApiError && e.status === 409) {
          setSaveState('conflict');
          if (doc) setDoc({ ...doc, updated_at: e.body?.updated_at || doc.updated_at });
        } else {
          setSaveState('error');
          setBanner({ kind: 'error', text: e?.message || 'Save failed' });
        }
        return false;
      } finally {
        savingRef.current = false;
      }
    },
    [content, company.id, base, doc, adopt]
  );

  useEffect(() => {
    if (!dirty || saveState === 'conflict' || saveState === 'error') return;
    const timer = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, content, save, saveState]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const close = useCallback(() => {
    if (dirty && !confirm('You have unsaved changes. Close anyway?')) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !menu) close();
      if (e.key === 'Escape' && menu) setMenu('');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [close, menu]);

  // ------------------------------------------------------------- sections
  const defs = useMemo(() => new Map((schema?.sections || []).map((d) => [d.type, d])), [schema]);
  const sections = content?.sections || [];
  const current = selected === 'settings' ? null : sections.find((x) => x.id === selected) || null;

  const select = (id: Selection, fromList = true) => {
    setSelected(id);
    setMobileTab('edit');
    scrollToSelection.current = fromList;
  };

  // Scroll the preview to the section picked in the list (not to one clicked in the preview).
  useEffect(() => {
    if (!scrollToSelection.current || selected === 'settings') return;
    scrollToSelection.current = false;
    const pane = previewPane.current;
    const el = pane?.querySelector(`[data-cp-section="${selected}"], [data-cp-sub="${selected}"]`);
    if (!pane || !el) return;
    const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 12;
    pane.scrollTo({ top, behavior: 'smooth' });
  }, [selected, content]);

  const moveSection = (id: string, dir: -1 | 1) =>
    edit((c) => {
      const i = c.sections.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.sections.length) return c;
      const next = c.sections.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return { ...c, sections: next };
    });

  const toggleSection = (id: string) =>
    edit((c) => ({ ...c, sections: c.sections.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)) }));

  const duplicateSection = (id: string) =>
    edit((c) => {
      const i = c.sections.findIndex((x) => x.id === id);
      if (i < 0) return c;
      const copy: CpSection = { ...JSON.parse(JSON.stringify(c.sections[i])), id: newSectionId() };
      const next = c.sections.slice();
      next.splice(i + 1, 0, copy);
      return { ...c, sections: next };
    });

  const deleteSection = (id: string) => {
    const sec = sections.find((x) => x.id === id);
    const label = sec ? defs.get(sec.type)?.label || sec.type : 'this section';
    if (!confirm(`Delete the ${label} section? You can undo by restoring a published version.`)) return;
    edit((c) => ({ ...c, sections: c.sections.filter((x) => x.id !== id) }));
    if (selected === id) setSelected('settings');
  };

  const addSection = (type: CpSectionType) => {
    const id = newSectionId();
    edit((c) => {
      const at = selected !== 'settings' ? c.sections.findIndex((x) => x.id === selected) + 1 : c.sections.length;
      const next = c.sections.slice();
      next.splice(at > 0 ? at : next.length, 0, { id, type, visible: true, data: {} });
      return { ...c, sections: next };
    });
    setMenu('');
    select(id);
  };

  const updateSectionData = (id: string, data: Record<string, any>) =>
    edit((c) => ({ ...c, sections: c.sections.map((x) => (x.id === id ? { ...x, data } : x)) }));

  // ---------------------------------------------------------- publishing
  const issues = useMemo(() => publishIssues ?? doc?.issues ?? [], [publishIssues, doc]);
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  const issuesBySection = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of issues) if (i.section_id) m.set(i.section_id, (m.get(i.section_id) || 0) + 1);
    return m;
  }, [issues]);

  const publish = async () => {
    if (dirty && !(await save())) return;
    setBusy('publish');
    setPublishIssues(null);
    try {
      const res = await publishCp(company.id);
      adopt(res, false);
      setBanner({
        kind: 'ok',
        text: res.enabled
          ? 'Published. The live page is updated.'
          : 'Published. Turn the page on when you want students to see it.',
      });
    } catch (e: any) {
      if (e instanceof CpApiError && e.status === 422) {
        setPublishIssues(e.body?.issues || []);
        setMenu('issues');
      } else {
        setBanner({ kind: 'error', text: e?.message || 'Publish failed' });
      }
    } finally {
      setBusy('');
    }
  };

  const toggleEnabled = async () => {
    if (!doc) return;
    const next = !doc.enabled;
    if (next && !confirm(`Turn on the new page for ${company.name}? Students will see it instead of the current page.`)) return;
    if (!next && !confirm(`Turn off the new page? ${company.name} will go back to the current page.`)) return;
    setBusy('enable');
    try {
      adopt(await setCpEnabled(company.id, next), false);
      setBanner({ kind: 'ok', text: next ? 'The new page is live.' : 'The new page is off. The current page is showing.' });
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.message || 'Could not change the page state' });
    } finally {
      setBusy('');
    }
  };

  const restore = async (index: number) => {
    if (dirty && !confirm('Restoring replaces your unsaved changes. Continue?')) return;
    if (!confirm('Copy this version into the draft? The live page does not change until you publish.')) return;
    setBusy('restore');
    setMenu('');
    try {
      adopt(await restoreCpVersion(company.id, index), true);
      versionRef.current += 1;
      setDirty(false);
      setBanner({ kind: 'ok', text: 'Version restored into the draft. Publish to make it live.' });
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.message || 'Restore failed' });
    } finally {
      setBusy('');
    }
  };

  const reset = async (opts: { template?: string; from_company_id?: string }, label: string) => {
    if (!confirm(`Replace the whole draft with ${label}? The live page does not change until you publish.`)) return;
    setBusy('reset');
    setMenu('');
    try {
      adopt(await resetCpDraft(company.id, opts), true);
      versionRef.current += 1;
      setDirty(false);
      setSelected('settings');
      setBanner({ kind: 'ok', text: `Draft replaced with ${label}.` });
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.message || 'Could not replace the draft' });
    } finally {
      setBusy('');
    }
  };

  const schedule = async () => {
    if (!scheduleAt) return;
    if (dirty && !(await save())) return;
    setBusy('publish');
    try {
      adopt(await scheduleCp(company.id, new Date(scheduleAt).toISOString()), false);
      setMenu('');
      setBanner({ kind: 'ok', text: 'Scheduled. The draft as it is now will go live at that time.' });
    } catch (e: any) {
      if (e instanceof CpApiError && e.status === 422) {
        setPublishIssues(e.body?.issues || []);
        setMenu('issues');
      } else {
        setBanner({ kind: 'error', text: e?.message || 'Could not schedule' });
      }
    } finally {
      setBusy('');
    }
  };

  const cancelSchedule = async () => {
    if (!confirm('Cancel the scheduled publish?')) return;
    try {
      adopt(await unscheduleCp(company.id), false);
      setBanner({ kind: 'ok', text: 'Scheduled publish cancelled.' });
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.message || 'Could not cancel' });
    }
  };

  /** Writes the suggested drive status into the stat that tracks it. */
  const applySuggestion = (status: string) => {
    let applied = false;
    edit((c) => ({
      ...c,
      sections: c.sections.map((sec) => {
        if (sec.type !== 'stat_strip' || applied) return sec;
        const stats = ((sec.data.stats as any[]) || []).slice();
        const i = stats.findIndex((st) => st.link_href === '#drive-radar' || /drive|applications|hiring/i.test(String(st.label || '')));
        if (i === -1) return sec;
        applied = true;
        stats[i] = { ...stats[i], value: status };
        return { ...sec, data: { ...sec.data, stats } };
      }),
    }));
    setMenu('');
    setBanner(
      applied
        ? { kind: 'ok', text: `Drive status set to “${status}” in the draft. Publish to make it live.` }
        : { kind: 'error', text: 'No stat in the Stat strip tracks the drive (label it “Off-campus drive” or link it to #drive-radar).' }
    );
  };

  const reloadFromServer = async () => {
    try {
      adopt(await fetchCpAdminDoc(company.id), true);
      versionRef.current += 1;
      setDirty(false);
      setSaveState('idle');
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.message || 'Reload failed' });
    }
  };

  // ---------------------------------------------------------------- render
  const hinglishOn = content?.settings?.hinglish_enabled === true;
  const formLang = hinglishOn ? editLang : 'en';
  const formCtx: SchemaFormContext = {
    company,
    companies,
    accentPalette: schema?.accent_palette || [],
    skills: schema?.skills || [],
    uploadImage: (file) => uploadCpMedia(company.id, file),
    lang: formLang,
  };

  const premiumCount = (company.modules || []).filter((m) => m.is_premium).length;
  const previewPrice = premiumCount > 0 ? packPrice(premiumCount) : null;

  if (loadError) {
    return (
      <div className="fixed inset-0 z-[70] bg-gray-100 grid place-items-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md text-center space-y-3">
          <XCircle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm text-gray-800">{loadError}</p>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!schema || !doc || !content) {
    return (
      <div className="fixed inset-0 z-[70] bg-gray-100 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  const statusText =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'conflict'
        ? 'Save blocked — someone else edited'
        : saveState === 'error'
          ? 'Save failed'
          : dirty
            ? 'Unsaved changes'
            : doc.persisted
              ? `Draft saved ${fmtTime(doc.updated_at)}`
              : 'New page — not saved yet';

  const panelCls = (tab: MobileTab) => `${mobileTab === tab ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`;

  return (
    <div className="fixed inset-0 z-[70] bg-gray-100 flex flex-col text-gray-900" role="dialog" aria-label={`${company.name} page studio`}>
      {/* ------------------------------------------------------------ top bar */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap">
        <button onClick={close} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Companies
        </button>
        <div className="min-w-0">
          <div className="text-sm font-bold truncate">
            {company.name} · Page Studio
          </div>
          <div className={`text-xs ${saveState === 'conflict' || saveState === 'error' ? 'text-red-700' : 'text-gray-500'}`}>{statusText}</div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              doc.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${doc.enabled ? 'bg-emerald-600' : 'bg-gray-400'}`} />
            {doc.enabled ? 'Live on site' : 'Not live'}
          </span>

          {(errors.length > 0 || warnings.length > 0) && (
            <button
              onClick={() => setMenu(menu === 'issues' ? '' : 'issues')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                errors.length ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {errors.length > 0 && `${errors.length} error${errors.length === 1 ? '' : 's'}`}
              {errors.length > 0 && warnings.length > 0 && ' · '}
              {warnings.length > 0 && `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
            </button>
          )}

          <button onClick={() => setMenu(menu === 'radar' ? '' : 'radar')} className="relative p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Drive Radar reports from students">
            <Radio className="w-4 h-4" />
            {pendingRadar > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-xs font-bold grid place-items-center">
                {pendingRadar}
              </span>
            )}
          </button>
          <button onClick={() => setMenu(menu === 'stats' ? '' : 'stats')} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Page analytics">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button onClick={() => setMenu(menu === 'schedule' ? '' : 'schedule')} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Schedule a publish">
            <CalendarClock className="w-4 h-4" />
          </button>
          <button onClick={() => setMenu(menu === 'history' ? '' : 'history')} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Version history">
            <History className="w-4 h-4" />
          </button>
          <button onClick={() => setMenu(menu === 'template' ? '' : 'template')} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Start from a template or copy another page">
            <LayoutTemplate className="w-4 h-4" />
          </button>
          {company.status === 'published' && (
            <a href={`/company/${company.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Open the public page">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={() => void save()}
            disabled={!dirty || saveState === 'saving'}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            onClick={() => setMenu(menu === 'publish' ? '' : 'publish')}
            disabled={!!busy || saveState === 'conflict'}
            className="px-3.5 py-2 rounded-lg bg-signal-hover hover:bg-signal-hover text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {busy === 'publish' && <Loader2 className="w-4 h-4 animate-spin" />} Publish
          </button>
          <button
            onClick={() => void toggleEnabled()}
            disabled={!!busy || !doc.published}
            title={doc.published ? '' : 'Publish first'}
            className={`px-3.5 py-2 rounded-lg text-sm font-bold disabled:opacity-40 ${
              doc.enabled ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            {doc.enabled ? 'Turn off' : 'Turn on'}
          </button>
        </div>
      </header>

      {/* ------------------------------------------------- banners and menus */}
      {saveState === 'conflict' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-sm text-red-900 flex items-center gap-3 flex-wrap">
          <span>Another admin saved this page after you opened it. Your edits are still here, but not saved.</span>
          <button onClick={() => void reloadFromServer()} className="font-bold underline">
            Load their version (discard mine)
          </button>
          <button onClick={() => void save({ force: true })} className="font-bold underline">
            Keep mine (overwrite theirs)
          </button>
        </div>
      )}
      {others.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 flex items-center gap-2">
          <Users className="w-4 h-4 shrink-0" />
          <span>
            {others.map((o) => o.name).join(', ')} {others.length === 1 ? 'also has' : 'also have'} this page open. If you both save, the second save is blocked.
          </span>
        </div>
      )}
      {doc.scheduled && (
        <div className="bg-signal-soft border-b border-signal/30 px-4 py-2 text-sm text-brand-ink flex items-center gap-3 flex-wrap">
          <CalendarClock className="w-4 h-4 shrink-0" />
          <span>Scheduled to go live {fmtTime(doc.scheduled.at)}. Edits made after scheduling are not included.</span>
          <button onClick={() => void cancelSchedule()} className="font-bold underline">
            Cancel schedule
          </button>
        </div>
      )}
      {banner && (
        <div
          className={`px-4 py-2.5 text-sm flex items-center justify-between gap-3 border-b ${
            banner.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {menu && (
        <div className="fixed inset-0 z-[80]" onClick={() => setMenu('')}>
          <div
            className="absolute right-3 top-14 w-[min(420px,calc(100vw-24px))] max-h-[70vh] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-2xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            {menu === 'issues' && (
              <div className="space-y-1.5">
                <div className="text-sm font-bold px-1 pb-1">Before you publish</div>
                {issues.length === 0 && <p className="text-sm text-gray-500 px-1">No issues.</p>}
                {issues.map((iss, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (iss.section_id) select(iss.section_id);
                      setMenu('');
                    }}
                    className="w-full text-left flex gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    {iss.level === 'error' ? (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span>{iss.message}</span>
                  </button>
                ))}
                <p className="text-xs text-gray-500 px-1 pt-1">Errors block publishing. Warnings don’t, but read them.</p>
              </div>
            )}

            {menu === 'history' && (
              <div className="space-y-1">
                <div className="text-sm font-bold px-1 pb-1">Published versions</div>
                {doc.published_at && (
                  <div className="px-2 py-2 text-sm rounded-lg bg-emerald-50 text-emerald-900">
                    Current: published {fmtTime(doc.published_at)}
                  </div>
                )}
                {doc.history.length === 0 && <p className="text-sm text-gray-500 px-1">Older versions appear here after you publish more than once.</p>}
                {doc.history.map((h) => (
                  <div key={h.index} className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 text-sm">
                    <span>
                      {fmtTime(h.at)} <span className="text-gray-500">· {h.sections} sections</span>
                    </span>
                    <button disabled={!!busy} onClick={() => void restore(h.index)} className="text-xs font-bold text-signal-hover hover:underline">
                      Restore to draft
                    </button>
                  </div>
                ))}
              </div>
            )}

            {menu === 'template' && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-bold px-1 pb-1">Start from a template</div>
                  {schema.templates.map((tpl) => (
                    <button
                      key={tpl.value}
                      disabled={!!busy}
                      onClick={() => void reset({ template: tpl.value }, `the ${tpl.label} template`)}
                      className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className="text-sm font-semibold">{tpl.label}</div>
                      <div className="text-xs text-gray-500">{tpl.description}</div>
                    </button>
                  ))}
                </div>
                <div>
                  <div className="text-sm font-bold px-1 pb-1">Copy another company’s page</div>
                  <p className="text-xs text-gray-500 px-1 pb-1">Copies the structure and wording. Numbers, sources, drive updates and module links are cleared.</p>
                  {companies
                    .filter((c) => c.id !== company.id)
                    .map((c) => (
                      <button
                        key={c.id}
                        disabled={!!busy}
                        onClick={() => void reset({ from_company_id: c.id }, `${c.name}’s page`)}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {menu === 'publish' && (
              <div className="space-y-3">
                <div className="text-sm font-bold px-1">Publish — what changes</div>
                {(() => {
                  const changes = describeChanges(doc.published, content, defs, schema.settings_fields);
                  return changes.length === 0 ? (
                    <p className="text-sm text-gray-500 px-1">{doc.published ? 'No changes since the last publish.' : 'First publish — the whole page goes out.'}</p>
                  ) : (
                    <ul className="text-sm space-y-1 px-1 max-h-60 overflow-y-auto">
                      {changes.map((c, i) => (
                        <li key={i} className="flex gap-2">
                          <span className={`shrink-0 w-16 text-xs font-bold uppercase ${c.kind === 'added' ? 'text-emerald-700' : c.kind === 'removed' ? 'text-red-700' : 'text-signal-hover'}`}>{c.kind}</span>
                          <span>{c.text}</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
                {errors.length > 0 && (
                  <p className="text-xs text-red-700 px-1">
                    {errors.length} error{errors.length === 1 ? '' : 's'} must be fixed first — see the badge at the top.
                  </p>
                )}
                {errors.length === 0 && warnings.length > 0 && (
                  <p className="text-xs text-amber-800 px-1">
                    {warnings.length} warning{warnings.length === 1 ? '' : 's'} — publishing is allowed.
                  </p>
                )}
                <button
                  disabled={!!busy || errors.length > 0}
                  onClick={() => {
                    setMenu('');
                    void publish();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-signal-hover hover:bg-signal-hover text-white text-sm font-bold disabled:opacity-50"
                >
                  Publish now{doc.enabled ? ' (the live page updates)' : ''}
                </button>
              </div>
            )}

            {menu === 'schedule' && (
              <div className="space-y-3">
                <div className="text-sm font-bold px-1">Schedule a publish</div>
                <p className="text-xs text-gray-500 px-1">
                  The draft is saved and snapshotted now, then goes live at the time you pick. If the page is turned on, students see it from then.
                </p>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                />
                <button
                  disabled={!scheduleAt || !!busy}
                  onClick={() => void schedule()}
                  className="w-full px-3 py-2 rounded-lg bg-signal-hover hover:bg-signal-hover text-white text-sm font-bold disabled:opacity-50"
                >
                  Schedule publish
                </button>
              </div>
            )}

            {menu === 'radar' && (
              <div className="space-y-2">
                <div className="text-sm font-bold px-1">Drive Radar — student reports</div>
                {suggestion?.status && (
                  <div className="rounded-lg bg-signal-soft border border-signal/30 p-2.5 text-sm text-brand-ink">
                    Recent updates suggest the drive is <strong>{suggestion.status}</strong>
                    {suggestion.basis && (
                      <span className="block text-xs text-signal-hover mt-0.5">
                        Newest: “{suggestion.basis.text}” ({suggestion.basis.date}) · {suggestion.count} update{suggestion.count === 1 ? '' : 's'} in the last 3 weeks
                      </span>
                    )}
                    <button onClick={() => applySuggestion(suggestion.status!)} className="mt-2 px-2.5 py-1 rounded-md bg-signal-hover text-white text-xs font-bold">
                      Set drive status to {suggestion.status}
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 px-1">
                  Approve to show an update on the page and alert students who asked to be notified. Reject removes it.
                </p>
                {radarReports.length === 0 && <p className="text-sm text-gray-500 px-1">No reports yet.</p>}
                {radarReports.map((r) => (
                  <div key={r.id} className="border border-gray-200 rounded-lg p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{r.kind}</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : r.status === 'rejected' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-900">{r.text}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.user_name} · {fmtTime(r.created_at)} · {r.confirmed} confirmation{r.confirmed === 1 ? '' : 's'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {r.status !== 'approved' && (
                        <button onClick={() => void moderate(r.id, 'approved')} className="px-2.5 py-1 rounded-md bg-emerald-700 text-white text-xs font-bold">
                          Approve
                        </button>
                      )}
                      {r.status !== 'rejected' && (
                        <button onClick={() => void moderate(r.id, 'rejected')} className="px-2.5 py-1 rounded-md border border-gray-300 text-xs font-bold">
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {menu === 'stats' && (
              <div className="space-y-3">
                <div className="text-sm font-bold px-1">Last 30 days</div>
                {!stats ? (
                  <p className="text-sm text-gray-500 px-1">Loading…</p>
                ) : (
                  <>
                    <div className="flex items-end gap-[2px] h-16 px-1" aria-label="Daily page views">
                      {(() => {
                        const max = Math.max(1, ...stats.series.map((p) => p.views));
                        return stats.series.map((p) => (
                          <span
                            key={p.day}
                            title={`${p.day}: ${p.views} views`}
                            className="flex-1 rounded-sm bg-signal/80"
                            style={{ height: `${Math.max(2, (p.views / max) * 100)}%` }}
                          />
                        ));
                      })()}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm px-1">
                      {[
                        ['view', 'Page views'],
                        ['readiness_start', 'Readiness checks started'],
                        ['test_start', 'Round mocks started'],
                        ['test_date_set', 'Test dates set'],
                        ['pack_cta', 'Pack button clicks'],
                        ['preview_open', 'Previews opened'],
                        ['radar_report', 'Radar reports'],
                        ['notify_on', 'Alerts turned on'],
                        ['share_experience', 'Experience form opened'],
                        ['faq_open', 'FAQ opens'],
                      ].map(([key, label]) => (
                        <React.Fragment key={key}>
                          <dt className="text-gray-500">{label}</dt>
                          <dd className="text-right font-semibold tabular-nums">{stats.totals[key] || 0}</dd>
                        </React.Fragment>
                      ))}
                      <dt className="text-gray-500">Watching for alerts</dt>
                      <dd className="text-right font-semibold tabular-nums">{stats.watchers}</dd>
                      <dt className="text-gray-500">Students with a plan</dt>
                      <dd className="text-right font-semibold tabular-nums">{stats.prep_profiles}</dd>
                    </dl>
                    <p className="text-xs text-gray-500 px-1">Counts are recorded per day (India time); today’s update within a minute.</p>
                  </>
                )}
              </div>
            )}

            {menu === 'add' && (
              <div className="space-y-0.5">
                <div className="text-sm font-bold px-1 pb-1">Add a section</div>
                {schema.sections.map((d) => (
                  <button key={d.type} onClick={() => addSection(d.type)} className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50">
                    <div className="text-sm font-semibold">{d.label}</div>
                    <div className="text-xs text-gray-500">{d.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------- mobile tab switcher */}
      <div className="lg:hidden bg-white border-b border-gray-200 grid grid-cols-3 text-sm font-semibold">
        {(['sections', 'edit', 'preview'] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`py-2.5 capitalize ${mobileTab === tab ? 'text-signal-hover border-b-2 border-signal-hover' : 'text-gray-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_400px_minmax(0,1fr)]">
        {/* Section list */}
        <aside className={`${panelCls('sections')} bg-white border-r border-gray-200`}>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <button
              onClick={() => select('settings')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold ${
                selected === 'settings' ? 'bg-signal-soft text-signal-hover' : 'hover:bg-gray-50'
              }`}
            >
              <Settings2 className="w-4 h-4" /> Page settings
            </button>
            <div className="px-2.5 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Sections</div>
            {sections.map((sec, i) => {
              const def = defs.get(sec.type);
              const count = issuesBySection.get(sec.id) || 0;
              const subtitle = String(sec.data?.title || sec.data?.eyebrow || '').replace(/\{company\}/g, company.name);
              return (
                <div
                  key={sec.id}
                  className={`group flex items-center gap-1 pl-2.5 pr-1 py-1.5 rounded-lg ${
                    selected === sec.id ? 'bg-signal-soft' : 'hover:bg-gray-50'
                  } ${sec.visible ? '' : 'opacity-50'}`}
                >
                  <button onClick={() => select(sec.id)} className="flex-1 min-w-0 text-left">
                    <div className={`text-sm font-semibold truncate ${selected === sec.id ? 'text-signal-hover' : ''}`}>
                      {def?.label || sec.type}
                      {count > 0 && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 align-middle" />}
                    </div>
                    {subtitle && <div className="text-xs text-gray-500 truncate">{subtitle}</div>}
                  </button>
                  <button onClick={() => toggleSection(sec.id)} className="p-1 text-gray-400 hover:text-gray-800" title={sec.visible ? 'Hide' : 'Show'}>
                    {sec.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <div className="flex flex-col">
                    <button disabled={i === 0} onClick={() => moveSection(sec.id, -1)} className="text-gray-400 hover:text-gray-800 disabled:opacity-20" title="Move up">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button disabled={i === sections.length - 1} onClick={() => moveSection(sec.id, 1)} className="text-gray-400 hover:text-gray-800 disabled:opacity-20" title="Move down">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={() => setMenu('add')}
              disabled={sections.length >= schema.limits.max_sections}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm font-semibold text-gray-700 hover:border-signal hover:text-signal-hover disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Add section
            </button>
          </div>
        </aside>

        {/* Form */}
        <section className={`${panelCls('edit')} bg-white border-r border-gray-200`}>
          {hinglishOn && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-xs font-semibold text-gray-600">Editing language</span>
              <div className="inline-flex rounded-lg bg-white border border-gray-200 p-0.5">
                {(['en', 'hi'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setEditLang(l)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${editLang === l ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
                  >
                    {l === 'en' ? 'English' : 'Hinglish'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4">
            {current === null ? (
              <>
                <h2 className="text-base font-bold">Page settings</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Colour, search listing, sticky bar and disclaimer. Use <code className="bg-gray-100 px-1 rounded">{'{company}'}</code> in any text to insert the company name.
                </p>
                <SearchSnippet
                  title={String(content.settings.seo_title || '').replace(/\{company\}/g, company.name)}
                  description={String(content.settings.seo_description || '').replace(/\{company\}/g, company.name)}
                  slug={company.slug}
                />
                <SchemaForm
                  fields={schema.settings_fields}
                  value={content.settings}
                  ctx={formCtx}
                  onChange={(v) => edit((c) => ({ ...c, settings: v }))}
                />
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold">{defs.get(current.type)?.label}</h2>
                    <p className="text-xs text-gray-500">{defs.get(current.type)?.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => duplicateSection(current.id)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteSection(current.id)} className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {issues.filter((iss) => iss.section_id === current.id).length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {issues
                      .filter((iss) => iss.section_id === current.id)
                      .map((iss, i) => (
                        <li
                          key={i}
                          className={`text-xs px-2.5 py-1.5 rounded-lg ${iss.level === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}
                        >
                          {iss.message}
                        </li>
                      ))}
                  </ul>
                )}

                {!current.visible && (
                  <p className="mt-3 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700">This section is hidden and won’t appear on the page.</p>
                )}

                <div className="mt-4">
                  <SchemaForm
                    fields={[...schema.common_fields, ...(defs.get(current.type)?.fields || [])].filter(
                      // The nav label only matters for sections that can appear in the nav.
                      (f) => f.key !== 'nav_label' || !['hero', 'stat_strip', 'section_nav'].includes(current.type)
                    )}
                    value={current.data}
                    ctx={formCtx}
                    onChange={(v) => updateSectionData(current.id, v)}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Preview */}
        <section className={`${panelCls('preview')} bg-gray-200/70`}>
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-300/70 bg-gray-100">
            <span className="text-xs font-semibold text-gray-600">Preview · draft{dirty ? ' (unsaved)' : ''}</span>
            <div className="inline-flex rounded-lg bg-white border border-gray-200 p-0.5">
              <button
                onClick={() => setDevice('desktop')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 ${device === 'desktop' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button
                onClick={() => setDevice('phone')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 ${device === 'phone' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Phone
              </button>
            </div>
          </div>
          <div ref={previewPane} className="flex-1 overflow-y-auto p-3 sm:p-4">
            {(() => {
              const page = (
                <CompanyPageV2
                  preview
                  content={content}
                  company={company}
                  companies={companies}
                  packPrice={previewPrice}
                  packOwned={false}
                  selectedSectionId={selected === 'settings' ? null : selected}
                  onSelectSection={(id) => select(id, false)}
                  onShareExperience={() => {}}
                  onPreview={() => {}}
                  forceLang={formLang}
                />
              );
              return device === 'desktop' ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <ScaledFrame width={DESKTOP_WIDTH}>{page}</ScaledFrame>
                </div>
              ) : (
                <div className="mx-auto rounded-[28px] border-[10px] border-gray-900 bg-white overflow-hidden shadow-xl" style={{ width: PHONE_WIDTH + 20 }}>
                  {page}
                </div>
              );
            })()}
          </div>
        </section>
      </div>
    </div>
  );
}
