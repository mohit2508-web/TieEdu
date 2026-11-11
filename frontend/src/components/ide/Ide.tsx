import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  ArrowLeft, ChevronLeft, ChevronRight, List, Play, Send, Settings2, Maximize2, Minimize2, RotateCcw, Lock,
  CheckCircle2, Circle, CircleDot, X, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BuyPackSheet } from '@/components/prep/BuyPackSheet';
import { ProblemPanel } from './ProblemPanel';
import { ConsolePanel, type ConsoleCase, type ConsoleResult, type ConsoleTab } from './ConsolePanel';
import { DEFAULT_SETTINGS, type IdeSettings } from './ideSettings';
import { parseDiagnostics, type CodeDiagnostic } from '@/lib/compileErrors';
import { CodeApiError, LANG_LABEL, runCases, submitCode, type CodeLang, type CodeProblemView } from '@/lib/codeApi';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { BrandMark } from '@/components/brand/BrandMark';

const IdeEditor = dynamic(() => import('./IdeEditor'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center"><BrandLoader caption="Loading the editor…" /></div>,
});

const store = {
  get: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* private mode */ } },
  del: (k: string) => { try { window.localStorage.removeItem(k); } catch { /* ignore */ } },
};
const LANG_KEY = 'tieedu_code_lang';
const SETTINGS_KEY = 'tieedu_ide_settings';

function useSiteDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.getAttribute('data-theme') === 'dark');
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return dark;
}
function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setWide(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

const StatusIcon = ({ s }: { s: string }) => s === 'solved' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Solved" />
  : s === 'attempted' ? <CircleDot className="h-4 w-4 shrink-0 text-warning" aria-label="Attempted" /> : <Circle className="h-4 w-4 shrink-0 text-muted" aria-label="Not started" />;

/**
 * The practice IDE (PRACTICE_MODE_PLAN.md §6): full screen, resizable panes,
 * console with editable test cases, compiler errors on the line, settings,
 * shortcuts (Ctrl+' run, Ctrl+Enter submit), a problem drawer, and a phone
 * layout with Problem / Code / Console tabs and a sticky Run / Submit bar.
 */
/** Test mode (the coding section of a company test): problem tabs, timer and Finish instead of navigation. */
export interface IdeTest {
  attemptId: string; problems: Array<{ id: string; title: string; done?: boolean }>; onSwitch: (id: string) => void;
  secondsLeft: number; onFinish: () => void; submitting: boolean;
}

const clock = (s: number) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ''}${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function Ide({ view, onReload, query, test, onSubmitted }: {
  view: CodeProblemView; onReload: () => void; query: { company?: string; topic?: string };
  test?: IdeTest; onSubmitted?: (r: import('@/lib/codeApi').SuiteResult) => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const siteDark = useSiteDark();
  const wide = useWide();
  const p = view.problem;
  const draftKey = useCallback((l: CodeLang) => `tieedu_ide_${test ? `${test.attemptId}_` : ''}${p.id}_${l}`, [p.id, test]);
  const attemptId = test?.attemptId;

  const [lang, setLang] = useState<CodeLang>('cpp');
  const [code, setCode] = useState('');
  const [settings, setSettings] = useState<IdeSettings>(DEFAULT_SETTINGS);
  const [cases, setCases] = useState<ConsoleCase[]>([]);
  const [active, setActive] = useState(0);
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('cases');
  const [result, setResult] = useState<ConsoleResult>(null);
  const [busy, setBusy] = useState<'' | 'run' | 'submit'>('');
  const [error, setError] = useState('');
  const [diags, setDiags] = useState<CodeDiagnostic[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pack, setPack] = useState(false);
  const [full, setFull] = useState(false);
  const [mobileTab, setMobileTab] = useState<'problem' | 'code' | 'console'>('problem');

  // Restore settings, language, this problem's draft and its example cases.
  useEffect(() => {
    try { const s = JSON.parse(store.get(SETTINGS_KEY) || 'null'); if (s) setSettings({ ...DEFAULT_SETTINGS, ...s }); } catch { /* defaults */ }
    const saved = store.get(LANG_KEY) as CodeLang | null;
    const l = saved && view.languages.includes(saved) ? saved : 'cpp';
    setLang(l);
    setCode(store.get(draftKey(l)) ?? store.get(`tieedu_code_practice_${p.id}_${l}`) ?? view.starter[l]);
    setCases(p.samples.map((s) => ({ input: s.input, expected: s.output, sample: true })));
    setActive(0); setResult(null); setError(''); setDiags([]); setConsoleTab('cases'); setMobileTab('problem');
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const change = (v: string) => { setCode(v); store.set(draftKey(lang), v); if (diags.length) setDiags([]); };
  const switchLang = (l: CodeLang) => { setLang(l); store.set(LANG_KEY, l); setCode(store.get(draftKey(l)) ?? view.starter[l]); setDiags([]); };
  const loadCode = (l: CodeLang, c: string) => { setLang(l); store.set(LANG_KEY, l); setCode(c); store.set(draftKey(l), c); setMobileTab('code'); };
  const reset = () => { if (window.confirm('Reset to the starter code? Your current code for this language is lost.')) { store.del(draftKey(lang)); setCode(view.starter[lang]); setDiags([]); } };
  const saveSettings = (s: IdeSettings) => { setSettings(s); store.set(SETTINGS_KEY, JSON.stringify(s)); };

  const needLogin = () => router.push(`/login?next=${encodeURIComponent(router.asPath)}`);
  const fail = (e: unknown) => {
    if (e instanceof CodeApiError && e.code === 'pack_required') { setPack(true); return; }
    setError(e instanceof Error ? e.message : 'Something went wrong');
  };
  const guard = () => {
    if (!user) { needLogin(); return false; }
    if (!view.access.open) { setPack(true); return false; }
    if (!code.trim()) { setError('Write some code first'); return false; }
    return true;
  };

  const run = async () => {
    if (busy || !guard()) return;
    setBusy('run'); setError(''); setConsoleTab('result'); if (!wide) setMobileTab('console');
    try {
      const r = await runCases(p.id, lang, code, cases.map((c) => ({ input: c.input, expected: c.expected.trim() ? c.expected : null })), attemptId);
      setResult({ kind: 'run', data: r });
      setDiags(r.compile_error ? parseDiagnostics(lang, r.compile_error) : r.verdict === 'runtime_error' ? parseDiagnostics(lang, r.cases.find((c) => c.stderr)?.stderr || '') : []);
    } catch (e) { fail(e); setConsoleTab('cases'); } finally { setBusy(''); }
  };
  const submit = async () => {
    if (busy || !guard()) return;
    setBusy('submit'); setError(''); setConsoleTab('result'); if (!wide) setMobileTab('console');
    try {
      const r = await submitCode(p.id, lang, code, attemptId);
      setResult({ kind: 'submit', data: r });
      onSubmitted?.(r);
      setDiags(r.compile_error ? parseDiagnostics(lang, r.compile_error) : []);
      if (r.verdict === 'accepted') onReload();
    } catch (e) { fail(e); } finally { setBusy(''); }
  };
  // The editor handles its own shortcuts; this covers focus outside it.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "'") { e.preventDefault(); run(); }
      else if (e.key === 'Enter') { e.preventDefault(); submit(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const back = view.context?.kind === 'company' ? `/practice/companies/${view.context.key}` : `/practice/dsa${view.context ? `#${view.context.key}` : ''}`;
  const ctxQuery = query.company ? `?company=${query.company}` : query.topic ? `?topic=${query.topic}` : '';
  const go = (id: string | null) => id && router.push(`/practice/problem/${id}${ctxQuery}`);
  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen().catch(() => {}); };
  const pos = view.context ? view.context.items.findIndex((x) => x.id === p.id) + 1 : 0;

  const testHeader = test && (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-card px-3">
      <div role="tablist" aria-label="Coding problems" className="flex min-w-0 gap-1 overflow-x-auto">
        {test.problems.map((x, i) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === p.id} onClick={() => test.onSwitch(x.id)}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-body-md font-semibold focus-ring ${x.id === p.id ? 'bg-surface-hover text-heading' : 'text-muted hover:text-heading'}`}>
            {x.done && <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />}Problem {i + 1}
          </button>
        ))}
      </div>
      {wide && (
        <div className="mx-auto flex items-center gap-2">
          <button type="button" onClick={run} disabled={!!busy} title="Run (Ctrl + ')" className="btn btn-ghost focus-ring h-10 px-4 text-body-md">
            {busy === 'run' ? <BrandMark mode="pulse" size={18} /> : <Play className="h-4 w-4" aria-hidden />} Run
          </button>
          <button type="button" onClick={submit} disabled={!!busy} title="Submit (Ctrl + Enter)" className="btn btn-primary focus-ring h-10 px-5 text-body-md">
            {busy === 'submit' ? <BrandMark mode="pulse" size={18} /> : <Send className="h-4 w-4" aria-hidden />} Submit
          </button>
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        <span className={`inline-flex h-10 items-center rounded-lg px-3 font-mono text-base font-semibold tabular-nums ${test.secondsLeft < 300 ? 'bg-danger-soft text-danger' : 'bg-surface-hover text-heading'}`} aria-label="Time left">{clock(test.secondsLeft)}</span>
        <button type="button" disabled={test.submitting} onClick={test.onFinish} className="btn btn-ghost focus-ring h-10 px-4 text-body-md">{test.submitting ? 'Submitting…' : 'Finish test'}</button>
      </div>
    </header>
  );

  const header = testHeader || (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-card px-3">
      <Link href={back} className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-body-md font-semibold text-heading hover:bg-surface-hover focus-ring" aria-label="Back to the problem list">
        <ArrowLeft className="h-5 w-5" aria-hidden /><span className="hidden sm:inline">{view.context?.name || 'Practice'}</span>
      </Link>
      {view.context && (
        <div className="flex items-center">
          <button type="button" onClick={() => setDrawer(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-body-md font-semibold text-heading hover:bg-surface-hover focus-ring">
            <List className="h-5 w-5" aria-hidden /><span className="hidden md:inline">Problems</span><span className="text-sm font-medium text-muted">{pos}/{view.context.items.length}</span>
          </button>
          <button type="button" aria-label="Previous problem" disabled={!view.prev} onClick={() => go(view.prev)} className="h-10 w-10 rounded-lg text-heading hover:bg-surface-hover disabled:opacity-40 focus-ring"><ChevronLeft className="mx-auto h-5 w-5" aria-hidden /></button>
          <button type="button" aria-label="Next problem" disabled={!view.next} onClick={() => go(view.next)} className="h-10 w-10 rounded-lg text-heading hover:bg-surface-hover disabled:opacity-40 focus-ring"><ChevronRight className="mx-auto h-5 w-5" aria-hidden /></button>
        </div>
      )}
      {wide && (
        <div className="mx-auto flex items-center gap-2">
          <button type="button" onClick={run} disabled={!!busy} title="Run (Ctrl + ')" className="btn btn-ghost focus-ring h-10 px-4 text-body-md">
            {busy === 'run' ? <BrandMark mode="pulse" size={18} /> : <Play className="h-4 w-4" aria-hidden />} Run
          </button>
          <button type="button" onClick={submit} disabled={!!busy} title="Submit (Ctrl + Enter)" className="btn btn-primary focus-ring h-10 px-5 text-body-md">
            {busy === 'submit' ? <BrandMark mode="pulse" size={18} /> : view.access.open ? <Send className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />} {view.access.open ? 'Submit' : 'Unlock to submit'}
          </button>
        </div>
      )}
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'} className="hidden h-10 w-10 rounded-lg text-heading hover:bg-surface-hover focus-ring md:block">
          {full ? <Minimize2 className="mx-auto h-5 w-5" aria-hidden /> : <Maximize2 className="mx-auto h-5 w-5" aria-hidden />}
        </button>
      </div>
    </header>
  );

  const toolbar = (
    <div className="relative flex h-11 shrink-0 items-center gap-2 border-b border-line bg-card px-3">
      <label htmlFor="ide-lang" className="sr-only">Language</label>
      <select id="ide-lang" value={lang} onChange={(e) => switchLang(e.target.value as CodeLang)} className="h-9 rounded-lg border border-line bg-card px-2 text-body-md font-semibold text-heading focus-ring">
        {view.languages.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
      </select>
      {lang === 'java' && <span className="hidden text-sm text-muted xl:inline">Class name must be <code className="font-mono">Main</code></span>}
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={reset} aria-label="Reset to starter code" title="Reset" className="h-9 w-9 rounded-lg text-muted hover:bg-surface-hover hover:text-heading focus-ring"><RotateCcw className="mx-auto h-4 w-4" aria-hidden /></button>
        <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Editor settings" title="Settings" className="h-9 w-9 rounded-lg text-muted hover:bg-surface-hover hover:text-heading focus-ring"><Settings2 className="mx-auto h-4 w-4" aria-hidden /></button>
      </div>
      {menu && (
        <div className="absolute right-2 top-11 z-20 w-72 space-y-3 rounded-xl border border-line bg-card p-4 shadow-lg" role="dialog" aria-label="Editor settings">
          <div className="flex items-center justify-between"><p className="text-base font-semibold text-heading">Editor settings</p><button type="button" aria-label="Close" onClick={() => setMenu(false)} className="rounded p-1 text-muted hover:text-heading focus-ring"><X className="h-4 w-4" aria-hidden /></button></div>
          <div className="flex items-center justify-between text-body-md text-body">Font size
            <span className="flex items-center gap-1">
              <button type="button" className="h-8 w-8 rounded-md border border-line focus-ring" aria-label="Smaller font" onClick={() => saveSettings({ ...settings, fontSize: Math.max(12, settings.fontSize - 1) })}>−</button>
              <span className="w-8 text-center font-semibold tabular-nums text-heading">{settings.fontSize}</span>
              <button type="button" className="h-8 w-8 rounded-md border border-line focus-ring" aria-label="Larger font" onClick={() => saveSettings({ ...settings, fontSize: Math.min(22, settings.fontSize + 1) })}>+</button>
            </span>
          </div>
          <label className="flex items-center justify-between text-body-md text-body">Tab size
            <select value={settings.tabSize} onChange={(e) => saveSettings({ ...settings, tabSize: Number(e.target.value) as 2 | 4 })} className="h-8 rounded-md border border-line bg-card px-2 focus-ring"><option value={2}>2 spaces</option><option value={4}>4 spaces</option></select>
          </label>
          <label className="flex items-center justify-between text-body-md text-body">Theme
            <select value={settings.theme} onChange={(e) => saveSettings({ ...settings, theme: e.target.value as IdeSettings['theme'] })} className="h-8 rounded-md border border-line bg-card px-2 focus-ring"><option value="auto">Same as site</option><option value="light">Light</option><option value="dark">Dark</option></select>
          </label>
          <label className="flex items-center justify-between text-body-md text-body">Wrap long lines
            <input type="checkbox" checked={settings.wrap} onChange={(e) => saveSettings({ ...settings, wrap: e.target.checked })} />
          </label>
          <p className="border-t border-line pt-3 text-sm text-muted">Run: Ctrl + &apos; · Submit: Ctrl + Enter</p>
        </div>
      )}
    </div>
  );

  const notices = (
    <>
      {!view.runner && <p className="flex shrink-0 items-center gap-2 border-b border-line bg-warning-soft px-3 py-2 text-body-md text-heading"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> The code runner is offline. Your code is saved in this browser.</p>}
      {!view.access.open && (
        <p className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 text-body-md text-heading">
          <Lock className="h-4 w-4 shrink-0" aria-hidden /> Running and submitting this problem is in the {view.access.company?.name || 'company'} pack.
          <button type="button" onClick={() => setPack(true)} className="font-semibold text-link underline">Unlock</button>
        </p>
      )}
      {error && <p role="alert" className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-danger-soft px-3 py-2 text-body-md text-danger">{error}<button type="button" aria-label="Dismiss" onClick={() => setError('')}><X className="h-4 w-4" aria-hidden /></button></p>}
    </>
  );

  const editor = (
    <div className="min-h-0 flex-1 overflow-hidden">
      <IdeEditor value={code} onChange={change} lang={lang} settings={settings} siteDark={siteDark} diagnostics={diags} onRun={run} onSubmit={submit} label={`Your ${LANG_LABEL[lang]} code for ${p.title}`} />
    </div>
  );
  const consolePanel = <ConsolePanel tab={consoleTab} onTab={setConsoleTab} cases={cases} onCases={setCases} active={active} onActive={setActive} result={result} busy={busy} />;
  const problemPanel = <ProblemPanel view={view} signedIn={!!user} onUnlock={() => setPack(true)} onLoadCode={loadCode} />;

  const handle = (dir: 'v' | 'h') => (
    <PanelResizeHandle className={`group relative bg-line ${dir === 'h' ? 'w-1.5' : 'h-1.5'} hover:bg-signal/40 data-[resize-handle-state=drag]:bg-signal`}>
      <span className="sr-only">Resize</span>
    </PanelResizeHandle>
  );

  const drawerEl = drawer && view.context && (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-label={`${view.context.name} problems`}>
      <div className="flex h-full w-full max-w-sm flex-col bg-card shadow-xl">
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <p className="text-base font-semibold text-heading">{view.context.name}</p>
          <button type="button" aria-label="Close" onClick={() => setDrawer(false)} className="rounded p-1 text-muted hover:text-heading focus-ring"><X className="h-5 w-5" aria-hidden /></button>
        </div>
        <ol className="min-h-0 flex-1 overflow-y-auto py-2">
          {view.context.items.map((x, i) => (
            <li key={x.id}>
              <Link href={`/practice/problem/${x.id}${ctxQuery}`} onClick={() => setDrawer(false)}
                className={`flex min-h-[48px] items-center gap-3 px-4 py-2 text-body-md hover:bg-surface-hover ${x.id === p.id ? 'bg-surface-hover font-semibold text-heading' : 'text-body'}`}>
                <span className="w-6 text-right text-sm tabular-nums text-muted">{i + 1}</span>
                <StatusIcon s={x.status} />
                <span className="min-w-0 flex-1 truncate">{x.title}</span>
                {!x.open && <Lock className="h-4 w-4 shrink-0 text-muted" aria-label="In the pack" />}
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <button type="button" aria-label="Close the problem list" className="flex-1 bg-black/40" onClick={() => setDrawer(false)} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-surface">
      {header}
      {wide ? (
        <PanelGroup direction="horizontal" autoSaveId="tieedu-ide-h" className="min-h-0 flex-1">
          <Panel defaultSize={42} minSize={25}>{problemPanel}</Panel>
          {handle('h')}
          <Panel minSize={35}>
            <PanelGroup direction="vertical" autoSaveId="tieedu-ide-v">
              <Panel defaultSize={62} minSize={25}>
                <div className="flex h-full flex-col bg-card">{toolbar}{notices}{editor}</div>
              </Panel>
              {handle('v')}
              <Panel defaultSize={38} minSize={12} collapsible>{consolePanel}</Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      ) : (
        <>
          <div role="tablist" aria-label="IDE" className="flex shrink-0 border-b border-line bg-card">
            {(['problem', 'code', 'console'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={mobileTab === t} onClick={() => setMobileTab(t)}
                className={`relative h-11 flex-1 text-body-md font-semibold ${mobileTab === t ? 'text-heading' : 'text-muted'}`}>
                {t === 'problem' ? 'Problem' : t === 'code' ? 'Code' : 'Console'}
                {mobileTab === t && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-signal" aria-hidden />}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {mobileTab === 'problem' && problemPanel}
            {mobileTab === 'code' && <div className="flex h-full flex-col bg-card">{toolbar}{notices}{editor}</div>}
            {mobileTab === 'console' && consolePanel}
          </div>
          <div className="flex shrink-0 gap-2 border-t border-line bg-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={run} disabled={!!busy} className="btn btn-ghost focus-ring min-h-[48px] flex-1 text-base">
              {busy === 'run' ? <BrandMark mode="pulse" size={18} /> : <Play className="h-4 w-4" aria-hidden />} Run
            </button>
            <button type="button" onClick={submit} disabled={!!busy} className="btn btn-primary focus-ring min-h-[48px] flex-1 text-base">
              {busy === 'submit' ? <BrandMark mode="pulse" size={18} /> : view.access.open ? <Send className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />} {view.access.open ? 'Submit' : 'Unlock'}
            </button>
          </div>
        </>
      )}
      {drawerEl}
      <BuyPackSheet open={pack} onClose={() => setPack(false)} slug={view.access.company?.slug || view.company} what="This problem" />
    </div>
  );
}

export default Ide;
