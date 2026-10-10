import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus, RefreshCw, Upload, Download, Send } from 'lucide-react';
import {
  adminFetchDrivesApi,
  adminCreateDriveApi,
  adminPublishDriveApi,
  adminAttachTestApi,
  adminFetchTestsApi,
  adminCreateTestApi,
  adminFetchProvidersApi,
  adminCreateProviderApi,
  adminFetchRegistrationsApi,
  adminImportRegistrationsApi,
  adminFetchResultsApi,
  adminPublishResultsApi,
  adminDownloadResultsCsv,
  AdminDrive,
  AdminDriveTest,
  AdminProvider,
} from '@/lib/drivesApi';

const input =
  'w-full rounded-xl border border-gray-200 bg-[#FAFAF9] px-3 py-2 text-sm text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#0284C7]';
const btn =
  'inline-flex items-center gap-1.5 rounded-xl bg-[#0284C7] px-4 py-2 text-xs font-bold text-white hover:bg-[#0369a1] disabled:opacity-50';
const ghost =
  'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-[#1F3A5F] hover:bg-gray-50';

/**
 * Admin → Mock Drives. Three columns of scaffolding over the drive admin API:
 * providers (assessment platforms), tests (exams pulled from them), and drives
 * (what students see). Selecting a drive reveals its rounds, roster and results.
 */
export function DrivesTab() {
  const [tab, setTab] = useState<'drives' | 'tests' | 'providers'>('drives');
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [tests, setTests] = useState<AdminDriveTest[]>([]);
  const [drives, setDrives] = useState<AdminDrive[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true);
    setError(null);
    try {
      const [p, t, d] = await Promise.all([adminFetchProvidersApi(), adminFetchTestsApi(), adminFetchDrivesApi()]);
      setProviders(p);
      setTests(t);
      setDrives(d);
      if (!selectedId && d.length) setSelectedId(d[0].drive_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    adminFetchRegistrationsApi(selectedId).then(setRegistrations).catch(() => setRegistrations([]));
    adminFetchResultsApi(selectedId).then((r) => setResults(r.results)).catch(() => setResults([]));
  }, [selectedId]);

  const selected = drives.find((d) => d.drive_id === selectedId) || null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(['drives', 'tests', 'providers'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize ${
              tab === t ? 'bg-[#0284C7] text-white' : 'bg-gray-100 text-[#1F3A5F] hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
        <button type="button" onClick={refresh} className={ghost + ' ml-auto'} disabled={busy}>
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {tab === 'providers' && <ProvidersPanel providers={providers} onDone={refresh} setError={setError} />}
      {tab === 'tests' && <TestsPanel tests={tests} providers={providers} onDone={refresh} setError={setError} />}
      {tab === 'drives' && (
        <DrivesPanel
          drives={drives}
          tests={tests}
          selected={selected}
          registrations={registrations}
          results={results}
          onSelect={setSelectedId}
          onDone={refresh}
          setError={setError}
          setNotice={setNotice}
        />
      )}
    </div>
  );
}

function ProvidersPanel({ providers, onDone, setError }: { providers: AdminProvider[]; onDone: () => void; setError: (s: string) => void }) {
  const [form, setForm] = useState({ code: '', name: '', base_url: '', launch_url: '', introspect_url: '', secret_env_prefix: '' });
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      await adminCreateProviderApi(form);
      setForm({ code: '', name: '', base_url: '', launch_url: '', introspect_url: '', secret_env_prefix: '' });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-extrabold text-[#10151C]">Register a provider</h3>
        <p className="mt-1 text-xs text-gray-500">
          The secret env prefix names the environment variables TieEdu reads for HMAC keys. Secret values never enter the database.
        </p>
        <div className="mt-4 space-y-2">
          <input className={input} placeholder="code (e.g. skillverify)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className={input} placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} placeholder="base_url (https://...)" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} />
          <input className={input} placeholder="launch_url (https://.../launch)" value={form.launch_url} onChange={(e) => setForm({ ...form, launch_url: e.target.value })} />
          <input className={input} placeholder="introspect_url (optional)" value={form.introspect_url} onChange={(e) => setForm({ ...form, introspect_url: e.target.value })} />
          <input className={input} placeholder="secret_env_prefix (e.g. SKILLVERIFY_BRIDGE)" value={form.secret_env_prefix} onChange={(e) => setForm({ ...form, secret_env_prefix: e.target.value })} />
          <button className={btn} disabled={busy || !form.code || !form.name || !form.base_url || !form.launch_url} onClick={create}>
            <Plus className="h-3.5 w-3.5" /> Save provider
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-extrabold text-[#10151C]">Providers</h3>
        <div className="mt-3 space-y-2">
          {providers.map((p) => (
            <div key={p.provider_id} className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1F3A5F]">{p.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-gray-500">{p.code} · {p.launch_url}</p>
            </div>
          ))}
          {providers.length === 0 && <p className="text-xs italic text-gray-400">No providers yet.</p>}
        </div>
      </div>
    </div>
  );
}

function TestsPanel({ tests, providers, onDone, setError }: { tests: AdminDriveTest[]; providers: AdminProvider[]; onDone: () => void; setError: (s: string) => void }) {
  const [form, setForm] = useState({ name: '', mode: 'external', provider_id: '', provider_exam_id: '', duration_minutes: '', total_questions: '' });
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      await adminCreateTestApi({
        name: form.name,
        mode: form.mode as 'external' | 'internal',
        provider_id: form.provider_id || undefined,
        provider_exam_id: form.provider_exam_id || undefined,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
        total_questions: form.total_questions ? Number(form.total_questions) : undefined,
      });
      setForm({ name: '', mode: 'external', provider_id: '', provider_exam_id: '', duration_minutes: '', total_questions: '' });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-extrabold text-[#10151C]">Create a test</h3>
        <div className="mt-4 space-y-2">
          <input className={input} placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={input} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            <option value="external">external (provider-hosted)</option>
            <option value="internal">internal (in-house engine)</option>
          </select>
          {form.mode === 'external' && (
            <>
              <select className={input} value={form.provider_id} onChange={(e) => setForm({ ...form, provider_id: e.target.value })}>
                <option value="">Select provider…</option>
                {providers.map((p) => <option key={p.provider_id} value={p.provider_id}>{p.name}</option>)}
              </select>
              <input className={input} placeholder="provider_exam_id" value={form.provider_exam_id} onChange={(e) => setForm({ ...form, provider_exam_id: e.target.value })} />
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input className={input} placeholder="duration (min)" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
            <input className={input} placeholder="questions" value={form.total_questions} onChange={(e) => setForm({ ...form, total_questions: e.target.value })} />
          </div>
          <button className={btn} disabled={busy || !form.name} onClick={create}>
            <Plus className="h-3.5 w-3.5" /> Save test
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-extrabold text-[#10151C]">Tests</h3>
        <div className="mt-3 space-y-2">
          {tests.map((t) => (
            <div key={t.test_id} className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1F3A5F]">{t.name}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">{t.mode}</span>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-gray-500">{t.provider_name || t.skill_slug || '—'}</p>
            </div>
          ))}
          {tests.length === 0 && <p className="text-xs italic text-gray-400">No tests yet.</p>}
        </div>
      </div>
    </div>
  );
}

function DrivesPanel(props: {
  drives: AdminDrive[];
  tests: AdminDriveTest[];
  selected: AdminDrive | null;
  registrations: any[];
  results: any[];
  onSelect: (id: string) => void;
  onDone: () => void;
  setError: (s: string) => void;
  setNotice: (s: string) => void;
}) {
  const { drives, tests, selected, registrations, results, onSelect, onDone, setError, setNotice } = props;
  const [form, setForm] = useState({ title: '', company_name: '', starts_at: '', ends_at: '', registration_mode: 'open', results_visibility: 'after_close' });
  const [attachTestId, setAttachTestId] = useState('');
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);
  // Local mirror so an import's result shows without a full page reload.
  const [regsLocal, setRegsLocal] = useState<any[]>(registrations);
  useEffect(() => setRegsLocal(registrations), [registrations]);

  const createDrive = async () => {
    setBusy(true);
    try {
      const d = await adminCreateDriveApi({
        title: form.title,
        company_name: form.company_name,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        registration_mode: form.registration_mode,
        results_visibility: form.results_visibility,
      } as any);
      setForm({ title: '', company_name: '', starts_at: '', ends_at: '', registration_mode: 'open', results_visibility: 'after_close' });
      onDone();
      onSelect(d.drive_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await adminPublishDriveApi(selected.drive_id);
      setNotice('Drive published.');
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const attach = async () => {
    if (!selected || !attachTestId) return;
    setBusy(true);
    try {
      await adminAttachTestApi(selected.drive_id, { test_id: attachTestId, max_attempts: 1, unlock_rule: { kind: 'open' } });
      setAttachTestId('');
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const importRoster = async () => {
    if (!selected) return;
    const rows = importText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((roll) => ({ roll_no: roll }));
    if (!rows.length) return;
    setBusy(true);
    try {
      const r = await adminImportRegistrationsApi(selected.drive_id, rows);
      setNotice(`Imported ${r.imported} of ${rows.length} roll numbers.`);
      setImportText('');
      setRegsLocal(await adminFetchRegistrationsApi(selected.drive_id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const publishResults = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await adminPublishResultsApi(selected.drive_id);
      setNotice('Results published to students.');
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = async () => {
    if (!selected) return;
    try {
      await adminDownloadResultsCsv(selected.drive_id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-extrabold text-[#10151C]">Create a drive</h3>
        <div className="mt-4 space-y-2">
          <input className={input} placeholder="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={input} placeholder="company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <label className="block text-[11px] font-bold uppercase text-gray-400">Opens</label>
          <input type="datetime-local" className={input} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          <label className="block text-[11px] font-bold uppercase text-gray-400">Closes</label>
          <input type="datetime-local" className={input} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          <select className={input} value={form.registration_mode} onChange={(e) => setForm({ ...form, registration_mode: e.target.value })}>
            <option value="open">open registration</option>
            <option value="roster">roster only</option>
            <option value="invite">invite only</option>
          </select>
          <select className={input} value={form.results_visibility} onChange={(e) => setForm({ ...form, results_visibility: e.target.value })}>
            <option value="after_close">results after close</option>
            <option value="immediate">results immediately</option>
            <option value="manual">results when published</option>
          </select>
          <button className={btn} disabled={busy || !form.title} onClick={createDrive}>
            <Plus className="h-3.5 w-3.5" /> Create drive
          </button>
        </div>

        <h3 className="mt-6 text-sm font-extrabold text-[#10151C]">Drives</h3>
        <div className="mt-3 space-y-2">
          {drives.map((d) => (
            <button
              key={d.drive_id}
              type="button"
              onClick={() => onSelect(d.drive_id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selected?.drive_id === d.drive_id ? 'border-[#0284C7] bg-[#F0F9FF]' : 'border-gray-100 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate font-bold text-[#1F3A5F]">{d.title}</span>
                <span className="ml-2 flex-none rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">{d.status}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500">{d.company_name || '—'} · {d.registration_count ?? 0} registered</p>
            </button>
          ))}
          {drives.length === 0 && <p className="text-xs italic text-gray-400">No drives yet.</p>}
        </div>
      </div>

      <div className="space-y-5 lg:col-span-2">
        {!selected ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm italic text-gray-400">
            Select a drive to manage its rounds, roster and results.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mr-auto text-base font-extrabold text-[#10151C]">{selected.title}</h3>
              {selected.status === 'draft' && (
                <button className={btn} disabled={busy} onClick={publish}>
                  <Send className="h-3.5 w-3.5" /> Publish
                </button>
              )}
              <button className={ghost} disabled={busy} onClick={publishResults}>
                <ClipboardList className="h-3.5 w-3.5" /> Publish results
              </button>
              <button className={ghost} onClick={downloadCsv}>
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h4 className="text-xs font-bold uppercase text-gray-400">Attach a round</h4>
              <div className="mt-2 flex gap-2">
                <select className={input} value={attachTestId} onChange={(e) => setAttachTestId(e.target.value)}>
                  <option value="">Select test…</option>
                  {tests.map((t) => <option key={t.test_id} value={t.test_id}>{t.name}</option>)}
                </select>
                <button className={btn} disabled={busy || !attachTestId} onClick={attach}>
                  <Plus className="h-3.5 w-3.5" /> Attach
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h4 className="text-xs font-bold uppercase text-gray-400">Import roster (roll numbers, one per line)</h4>
              <textarea className={input + ' mt-2 h-24 font-mono'} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'GLA-2026-001\nGLA-2026-002'} />
              <button className={btn + ' mt-2'} disabled={busy || !importText.trim()} onClick={importRoster}>
                <Upload className="h-3.5 w-3.5" /> Import
              </button>
              <div className="mt-3 max-h-40 overflow-auto text-xs text-gray-600">
                {regsLocal.map((r) => (
                  <div key={r.registration_id} className="flex items-center justify-between border-b border-gray-50 py-1">
                    <span className="font-mono">{r.roll_no || r.user_id}</span>
                    <span className="capitalize text-gray-400">{r.status} · {r.completed_tests || 0} done</span>
                  </div>
                ))}
                {regsLocal.length === 0 && <p className="italic text-gray-400">No registrations.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h4 className="text-xs font-bold uppercase text-gray-400">Results</h4>
              <div className="mt-2 max-h-52 overflow-auto text-xs text-gray-600">
                {results.map((r) => (
                  <div key={r.user_id} className="flex items-center justify-between border-b border-gray-50 py-1">
                    <span className="font-mono">{r.roll_no || r.user_id}</span>
                    <span className="capitalize text-gray-400">{r.registration_status}</span>
                  </div>
                ))}
                {results.length === 0 && <p className="italic text-gray-400">No results yet.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
