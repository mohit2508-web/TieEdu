import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Play, Send, Terminal, CheckCircle2, XCircle, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import {
  LANG_LABEL, VERDICT_LABEL, runCustom, runSamples, submitCode, CodeApiError,
  type CodeLang, type CodeProblemView, type CustomRun, type SuiteResult,
} from '@/lib/codeApi';

const CodeEditor = dynamic(() => import('./CodeEditor'), {
  ssr: false,
  loading: () => <div className="flex h-[420px] items-center justify-center rounded-xl border border-line bg-surface text-sm text-muted">Loading editor…</div>,
});

const LANG_KEY = 'tieedu_code_lang';
const store = {
  get: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* private mode */ } },
  del: (k: string) => { try { window.localStorage.removeItem(k); } catch { /* ignore */ } },
};

/** Tracks the site theme (data-theme on <html>) so the editor matches it. */
function useDark() {
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

/**
 * Write → Run samples / custom input → Submit (all tests). Used on the code
 * practice page and in the mock's coding section (with `attemptId`). The code
 * is kept per problem and language in this browser, so a reload loses nothing.
 */
export function CodeWorkspace({ view, attemptId, onSubmitted, onLocked, height }: {
  view: CodeProblemView; attemptId?: string; height?: string;
  onSubmitted?: (r: SuiteResult) => void; onLocked?: () => void;
}) {
  const dark = useDark();
  const p = view.problem;
  const draftKey = (l: CodeLang) => `tieedu_code_${attemptId || 'practice'}_${p.id}_${l}`;
  const [lang, setLang] = useState<CodeLang>('cpp');
  const [code, setCode] = useState('');
  const [custom, setCustom] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<'' | 'run' | 'submit'>('');
  const [suite, setSuite] = useState<(SuiteResult & { kind: 'samples' | 'submit' }) | null>(null);
  const [out, setOut] = useState<CustomRun | null>(null);
  const [error, setError] = useState('');

  // Restore the language, then this problem's draft (or the starter).
  useEffect(() => {
    const saved = store.get(LANG_KEY) as CodeLang | null;
    const l = saved && view.languages.includes(saved) ? saved : 'cpp';
    setLang(l);
    setCode(store.get(draftKey(l)) ?? view.starter[l]);
    setSuite(null); setOut(null); setError('');
    setInput(p.samples[0]?.input || '');
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (v: string) => { setCode(v); store.set(draftKey(lang), v); };
  const switchLang = (l: CodeLang) => {
    setLang(l); store.set(LANG_KEY, l);
    setCode(store.get(draftKey(l)) ?? view.starter[l]);
  };
  const reset = () => { store.del(draftKey(lang)); setCode(view.starter[lang]); };

  const fail = useCallback((e: unknown) => {
    if (e instanceof CodeApiError && e.code === 'pack_required') { onLocked?.(); return; }
    setError(e instanceof Error ? e.message : 'Something went wrong');
  }, [onLocked]);

  const run = async () => {
    setBusy('run'); setError(''); setSuite(null); setOut(null);
    try {
      if (custom) setOut(await runCustom(p.id, lang, code, input, attemptId));
      else setSuite({ ...(await runSamples(p.id, lang, code, attemptId)), kind: 'samples' });
    } catch (e) { fail(e); } finally { setBusy(''); }
  };
  const submit = async () => {
    setBusy('submit'); setError(''); setSuite(null); setOut(null);
    try {
      const r = await submitCode(p.id, lang, code, attemptId);
      setSuite({ ...r, kind: 'submit' });
      onSubmitted?.(r);
    } catch (e) { fail(e); } finally { setBusy(''); }
  };

  const off = !view.runner;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`lang-${p.id}`} className="sr-only">Language</label>
        <select id={`lang-${p.id}`} value={lang} onChange={(e) => switchLang(e.target.value as CodeLang)}
          className="min-h-[40px] rounded-lg border border-line bg-card px-3 text-sm font-semibold text-heading">
          {view.languages.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
        </select>
        {lang === 'java' && <span className="text-xs text-muted">Class must be named <code>Main</code></span>}
        <button type="button" onClick={reset} className="btn btn-ghost focus-ring ml-auto min-h-[40px] px-3 text-sm">
          <RotateCcw className="h-4 w-4" aria-hidden /> Reset code
        </button>
      </div>

      <CodeEditor value={code} onChange={change} lang={lang} dark={dark} height={height} label={`Your ${LANG_LABEL[lang]} code for ${p.title}`} />

      <label className="flex items-center gap-2 text-sm text-body">
        <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
        Run with my own input
      </label>
      {custom && (
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={4} spellCheck={false} aria-label="Custom input"
          className="w-full rounded-xl border border-line bg-card p-3 font-mono text-sm text-heading focus:border-signal focus:outline-none" />
      )}

      {off && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> The code runner is offline right now. Your code is saved in this browser; run it when the runner is back.
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={run} disabled={!!busy || off} className="btn btn-ghost focus-ring min-h-[48px] flex-1">
          {busy === 'run' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          {custom ? 'Run' : 'Run samples'}
        </button>
        <button type="button" onClick={submit} disabled={!!busy || off} className="btn btn-primary focus-ring min-h-[48px] flex-1">
          {busy === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          Submit
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {out && <CustomOutput r={out} />}
      {suite && <SuiteView r={suite} kind={suite.kind} />}
    </div>
  );
}

function CustomOutput({ r }: { r: CustomRun }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold text-heading"><Terminal className="h-4 w-4" aria-hidden /> Output · {VERDICT_LABEL[r.status] || (r.status === 'ok' ? 'Ran' : r.status)} · {r.ms} ms</p>
      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-surface p-3 text-sm text-heading">{r.stdout || '(no output)'}</pre>
      {r.stderr && <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-700">{r.stderr}</pre>}
    </div>
  );
}

function SuiteView({ r, kind }: { r: SuiteResult; kind: 'samples' | 'submit' }) {
  const ok = r.verdict === 'accepted';
  const samples = r.tests.filter((t) => t.sample);
  const hidden = r.tests.filter((t) => !t.sample);
  return (
    <div className={`rounded-xl border p-4 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-line bg-card'}`} aria-live="polite">
      <p className={`flex items-center gap-2 text-base font-bold ${ok ? 'text-emerald-800' : 'text-heading'}`}>
        {ok ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <XCircle className="h-5 w-5 text-danger" aria-hidden />}
        {kind === 'samples' && ok ? 'Samples passed' : VERDICT_LABEL[r.verdict] || r.verdict}
        {r.verdict !== 'compile_error' && <span className="ml-auto text-sm font-semibold tabular-nums">{r.passed}/{r.total} tests</span>}
      </p>
      {kind === 'samples' && ok && <p className="mt-1 text-sm text-body">Now press Submit to run the hidden tests.</p>}
      {r.compile_error && <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-700">{r.compile_error}</pre>}
      {samples.map((t) => (
        <details key={t.index} open={!t.passed} className="mt-3 rounded-lg border border-line bg-card p-3">
          <summary className="cursor-pointer text-sm font-semibold text-heading">
            {t.passed ? '✓' : '✗'} Sample {t.index} {t.status !== 'ok' && `· ${VERDICT_LABEL[t.status] || t.status}`} · {t.ms} ms
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Box title="Input" text={t.input} />
            <Box title="Expected" text={t.expected} />
            <Box title="Your output" text={t.actual} bad={!t.passed} />
          </div>
          {t.stderr && <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-red-50 p-2 text-xs text-red-700">{t.stderr}</pre>}
        </details>
      ))}
      {hidden.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-heading">Hidden tests: {hidden.filter((t) => t.passed).length}/{hidden.length} passed</p>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
            {hidden.map((t) => (
              <span key={t.index} title={`Test ${t.index}: ${t.passed ? 'passed' : VERDICT_LABEL[t.status] || 'wrong answer'}`}
                className={`h-3 w-6 rounded-full ${t.passed ? 'bg-emerald-500' : t.status === 'time_limit' ? 'bg-amber-500' : 'bg-red-500'}`} />
            ))}
          </div>
          {!ok && <p className="mt-2 text-xs text-muted">Hidden tests check edge cases: N = 1, equal values, zeros, negatives, the largest input. Re-read the constraints.</p>}
        </div>
      )}
    </div>
  );
}

function Box({ title, text, bad }: { title: string; text?: string; bad?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <pre className={`mt-1 max-h-40 overflow-auto rounded-lg p-2 text-xs ${bad ? 'bg-red-50 text-red-800' : 'bg-surface text-heading'}`}>{text || '(empty)'}</pre>
    </div>
  );
}
