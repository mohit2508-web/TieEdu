import React, { useEffect, useState } from 'react';
import {
  ClipboardList, Plus, RefreshCw, Upload, Download, Send, Trash2, Pencil, Check, X,
  ChevronUp, ChevronDown, Rocket, EyeOff,
} from 'lucide-react';
import {
  adminFetchDrivesApi,
  adminCreateDriveApi,
  adminPublishDriveApi,
  adminUnpublishDriveApi,
  adminDeleteDriveApi,
  adminUpdateDriveApi,
  adminGetDriveApi,
  adminAttachTestApi,
  adminDetachTestApi,
  adminUpdateRoundApi,
  adminFetchTestsApi,
  adminCreateTestApi,
  adminFetchProvidersApi,
  adminCreateProviderApi,
  adminFetchRegistrationsApi,
  adminImportRegistrationsApi,
  adminFetchResultsApi,
  adminPublishResultsApi,
  adminDownloadResultsCsv,
  adminNotifyDriveApi,
  AdminDrive,
  AdminDriveTest,
  AdminProvider,
} from '@/lib/drivesApi';
import {
  DriveFormState,
  DriveFormFields,
  emptyDriveForm,
  driveToForm,
  formToPayload,
  toLocalInput,
  fromLocalInput,
} from '@/components/drives/DriveFormEditor';

const input =
  'w-full rounded-xl border border-gray-200 bg-[#FAFAF9] px-3 py-2 text-sm text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#0284C7]';
const btn =
  'inline-flex items-center gap-1.5 rounded-xl bg-[#0284C7] px-4 py-2 text-xs font-bold text-white hover:bg-[#0369a1] disabled:opacity-50';
const ghost =
  'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-[#1F3A5F] hover:bg-gray-50 disabled:opacity-50';
const danger =
  'inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50';

type Section = 'details' | 'rounds' | 'roster' | 'results' | 'notify';

/**
 * Admin → Mock Drives. Three columns of scaffolding over the drive admin API:
 * providers (assessment platforms), tests (exams pulled from them), and drives
 * (what students see). Selecting a drive opens the full editor: every drive
 * field, its workflow rounds, roster and results.
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

/* -------------------------------------------------------------------------- */
/*  Drive editor: details / rounds / roster / results                          */
/* -------------------------------------------------------------------------- */

function DrivesPanel(props: {
  drives: AdminDrive[];
  tests: AdminDriveTest[];
  selected: AdminDrive | null;
  registrations: any[];
  results: any[];
  onSelect: (id: string | null) => void;
  onDone: () => void;
  setError: (s: string) => void;
  setNotice: (s: string) => void;
}) {
  const { drives, tests, selected, registrations, results, onSelect, onDone, setError, setNotice } = props;

  // Create form
  const [form, setForm] = useState<DriveFormState>(emptyDriveForm);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Editor state, re-synced from the server detail on every selection/save
  const [section, setSection] = useState<Section>('details');
  const [detail, setDetail] = useState<AdminDrive | null>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<DriveFormState>(emptyDriveForm);
  const [status, setStatus] = useState('draft');
  const [eligibilityText, setEligibilityText] = useState('{}');
  const [otherInfoText, setOtherInfoText] = useState('{}');
  const [docs, setDocs] = useState<{ title: string; url: string }[]>([]);
  const [savingDetail, setSavingDetail] = useState(false);

  // Round attach + inline round editor
  const [attachTestId, setAttachTestId] = useState('');
  const [attachRoundName, setAttachRoundName] = useState('');
  const [attachKind, setAttachKind] = useState('');
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [roundDraft, setRoundDraft] = useState<any>(null);

  // Roster
  const [importText, setImportText] = useState('');
  const [regsLocal, setRegsLocal] = useState<any[]>(registrations);
  useEffect(() => setRegsLocal(registrations), [registrations]);

  // Send update (in-app notification to every registrant)
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);

  const [busy, setBusy] = useState(false);

  const loadDetail = async (driveId: string) => {
    try {
      const r = await adminGetDriveApi(driveId);
      setDetail(r.drive);
      setRounds(r.tests || []);
      setEditForm(driveToForm(r.drive));
      setStatus(r.drive.status || 'draft');
      setEligibilityText(JSON.stringify(r.drive.eligibility || {}, null, 2));
      setOtherInfoText(JSON.stringify(r.drive.other_info || {}, null, 2));
      setDocs(Array.isArray(r.drive.documents) ? r.drive.documents : []);
      setEditingRoundId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    if (selected) loadDetail(selected.drive_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.drive_id]);

  const run = async (msg: string, fn: () => Promise<any>) => {
    setBusy(true);
    try {
      await fn();
      setNotice(msg);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const createDrive = async () => {
    setCreating(true);
    try {
      const d = await adminCreateDriveApi(formToPayload(form, { partial: false }) as Partial<AdminDrive>);
      setForm(emptyDriveForm());
      setShowCreate(false);
      setNotice('Drive created as draft — add rounds, then publish.');
      onDone();
      onSelect(d.drive_id);
      setSection('details');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const parseJsonField = (raw: string, label: string): Record<string, any> | null => {
    try {
      const v = JSON.parse(raw || '{}');
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
      return v;
    } catch {
      setError(`${label} must be a JSON object (like {"key": "value"}).`);
      return null;
    }
  };

  const saveDetails = async () => {
    if (!selected) return;
    const elig = parseJsonField(eligibilityText, 'Eligibility');
    if (!elig) return;
    const other = parseJsonField(otherInfoText, 'Other info');
    if (!other) return;
    if (!editForm.title.trim()) return setError('Title is required.');
    setSavingDetail(true);
    try {
      await adminUpdateDriveApi(selected.drive_id, {
        ...formToPayload(editForm, { partial: true }),
        status,
        eligibility: elig,
        other_info: other,
        documents: docs.filter((d) => d.title.trim() || d.url.trim()),
      } as Partial<AdminDrive>);
      setNotice('Drive updated.');
      onDone();
      await loadDetail(selected.drive_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingDetail(false);
    }
  };

  const publish = async () => {
    if (!selected) return;
    await run('Drive published — students can now register.', () => adminPublishDriveApi(selected.drive_id));
    await loadDetail(selected.drive_id);
  };
  const unpublish = async () => {
    if (!selected) return;
    await run('Drive unpublished — hidden from students, still a draft.', () => adminUnpublishDriveApi(selected.drive_id));
    await loadDetail(selected.drive_id);
  };
  const publishResults = async () => {
    if (!selected) return;
    await run('Results published to students.', () => adminPublishResultsApi(selected.drive_id));
    await loadDetail(selected.drive_id);
  };

  const deleteDrive = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.title}"? This cannot be undone.`)) return;
    await run('Drive deleted.', () => adminDeleteDriveApi(selected.drive_id));
    onSelect(null);
  };

  const attach = async () => {
    if (!selected || !attachTestId) return;
    await run('Round attached.', async () => {
      await adminAttachTestApi(selected.drive_id, {
        test_id: attachTestId,
        max_attempts: 1,
        unlock_rule: { kind: 'open' },
        round_name: attachRoundName.trim() || null,
        kind: attachKind.trim() || null,
      });
      setAttachTestId('');
      setAttachRoundName('');
      setAttachKind('');
      await loadDetail(selected.drive_id);
    });
  };

  const openRoundEditor = (r: any) => {
    if (editingRoundId === r.test_id) { setEditingRoundId(null); return; }
    setEditingRoundId(r.test_id);
    setRoundDraft({
      round_name: r.round_name || '',
      kind: r.kind || '',
      mandatory: !!r.mandatory,
      max_attempts: r.max_attempts ?? 1,
      opens_at: toLocalInput(r.opens_at),
      closes_at: toLocalInput(r.closes_at),
      unlock_rule: JSON.stringify(r.unlock_rule || { kind: 'open' }, null, 2),
    });
  };

  const saveRound = async (testId: string) => {
    if (!selected) return;
    let unlock: any;
    try {
      unlock = JSON.parse(roundDraft.unlock_rule || '{}');
    } catch {
      return setError('Unlock rule must be valid JSON, e.g. {"kind":"open"}');
    }
    await run('Round updated.', async () => {
      await adminUpdateRoundApi(selected.drive_id, testId, {
        round_name: roundDraft.round_name.trim() || null,
        kind: roundDraft.kind || null,
        mandatory: !!roundDraft.mandatory,
        max_attempts: Number(roundDraft.max_attempts) || 1,
        opens_at: fromLocalInput(roundDraft.opens_at),
        closes_at: fromLocalInput(roundDraft.closes_at),
        unlock_rule: unlock,
      });
      setEditingRoundId(null);
      await loadDetail(selected.drive_id);
    });
  };

  const moveRound = async (idx: number, dir: -1 | 1) => {
    if (!selected) return;
    const j = idx + dir;
    if (j < 0 || j >= rounds.length) return;
    const a = rounds[idx], b = rounds[j];
    await run('Round order updated.', async () => {
      await adminUpdateRoundApi(selected.drive_id, a.test_id, { sort_order: b.sort_order });
      await adminUpdateRoundApi(selected.drive_id, b.test_id, { sort_order: a.sort_order });
      await loadDetail(selected.drive_id);
    });
  };

  const detachRound = async (testId: string) => {
    if (!selected) return;
    if (!window.confirm('Remove this round from the drive?')) return;
    await run('Round removed.', async () => {
      await adminDetachTestApi(selected.drive_id, testId);
      await loadDetail(selected.drive_id);
    });
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

  const downloadCsv = async () => {
    if (!selected) return;
    try {
      await adminDownloadResultsCsv(selected.drive_id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const sendUpdate = async () => {
    if (!selected || !notifyTitle.trim()) return;
    setNotifyBusy(true);
    try {
      const r = await adminNotifyDriveApi(selected.drive_id, {
        title: notifyTitle.trim(),
        body: notifyBody.trim() || undefined,
      });
      setNotice(`Update sent to ${r.notified} student${r.notified === 1 ? '' : 's'}.`);
      setNotifyTitle('');
      setNotifyBody('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setNotifyBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* ----------------------------- left column ---------------------------- */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#10151C]">New drive</h3>
            <button
              type="button"
              className={ghost}
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showCreate ? 'Close' : 'Create'}
            </button>
          </div>
          {showCreate && (
            <>
              <DriveFormFields form={form} setForm={setForm} disabled={creating} />
              <button className={btn + ' mt-3'} disabled={creating || !form.title.trim()} onClick={createDrive}>
                <Plus className="h-3.5 w-3.5" /> Create drive (draft)
              </button>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-extrabold text-[#10151C]">Drives</h3>
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
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {d.company_name || '—'} · {d.registration_count ?? 0} registered · {d.test_count ?? 0} rounds
                </p>
              </button>
            ))}
            {drives.length === 0 && <p className="text-xs italic text-gray-400">No drives yet — create one above.</p>}
          </div>
        </div>
      </div>

      {/* ---------------------------- right column ---------------------------- */}
      <div className="lg:col-span-2">
        {!selected ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm italic text-gray-400">
            Select a drive to manage its details, rounds, roster and results.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header + lifecycle actions */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="mr-auto text-base font-extrabold text-[#10151C]">{selected.title}</h3>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold uppercase text-gray-500">{status}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(status === 'draft' || status === 'closed') && (
                  <button className={btn} disabled={busy} onClick={publish}>
                    <Rocket className="h-3.5 w-3.5" /> Publish
                  </button>
                )}
                {status !== 'draft' && (
                  <button className={ghost} disabled={busy} onClick={unpublish}>
                    <EyeOff className="h-3.5 w-3.5" /> Unpublish
                  </button>
                )}
                <button className={ghost} disabled={busy} onClick={publishResults}>
                  <ClipboardList className="h-3.5 w-3.5" /> Publish results
                </button>
                <button className={ghost} onClick={downloadCsv}>
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button className={danger} disabled={busy} onClick={deleteDrive}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>

              {/* Section tabs */}
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
                {(['details', 'rounds', 'roster', 'results', 'notify'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${
                      section === s ? 'bg-[#1F3A5F] text-white' : 'bg-gray-100 text-[#1F3A5F] hover:bg-gray-200'
                    }`}
                  >
                    {s}
                    {s === 'rounds' && rounds.length > 0 ? ` (${rounds.length})` : ''}
                    {s === 'roster' && regsLocal.length > 0 ? ` (${regsLocal.length})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* --------------------------- details --------------------------- */}
            {section === 'details' && detail && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h4 className="text-xs font-bold uppercase text-gray-400">Drive details</h4>
                <DriveFormFields form={editForm} setForm={setEditForm} disabled={savingDetail} />

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  <label>
                    <span className="text-[12px] font-medium text-gray-500">Status</span>
                    <select className={input + ' mt-1'} value={status} onChange={(e) => setStatus(e.target.value)} disabled={savingDetail}>
                      <option value="draft">Draft (hidden from students)</option>
                      <option value="published">Published (open)</option>
                      <option value="live">Live</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <span className="text-[12px] font-medium text-gray-500">Eligibility (JSON — branches, years, cgpa, backlogs…)</span>
                  <textarea
                    className={input + ' mt-1 h-28 font-mono text-xs'}
                    value={eligibilityText}
                    onChange={(e) => setEligibilityText(e.target.value)}
                    disabled={savingDetail}
                    spellCheck={false}
                  />
                </div>

                <div className="mt-3">
                  <span className="text-[12px] font-medium text-gray-500">Other info (JSON)</span>
                  <textarea
                    className={input + ' mt-1 h-20 font-mono text-xs'}
                    value={otherInfoText}
                    onChange={(e) => setOtherInfoText(e.target.value)}
                    disabled={savingDetail}
                    spellCheck={false}
                  />
                </div>

                <div className="mt-3">
                  <span className="text-[12px] font-medium text-gray-500">Documents</span>
                  <div className="mt-1 space-y-2">
                    {docs.map((d, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          className={input}
                          placeholder="Title (e.g. Offer letter template)"
                          value={d.title}
                          onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                          disabled={savingDetail}
                        />
                        <input
                          className={input}
                          placeholder="https://…"
                          value={d.url}
                          onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                          disabled={savingDetail}
                        />
                        <button
                          type="button"
                          className={danger}
                          onClick={() => setDocs(docs.filter((_, j) => j !== i))}
                          disabled={savingDetail}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" className={ghost} onClick={() => setDocs([...docs, { title: '', url: '' }])} disabled={savingDetail}>
                      <Plus className="h-3.5 w-3.5" /> Add document
                    </button>
                  </div>
                </div>

                <button className={btn + ' mt-4'} disabled={savingDetail || busy} onClick={saveDetails}>
                  <Check className="h-3.5 w-3.5" /> Save all changes
                </button>
              </div>
            )}

            {/* ---------------------------- rounds ---------------------------- */}
            {section === 'rounds' && (
              <>
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h4 className="text-xs font-bold uppercase text-gray-400">Attach a round</h4>
                  <div className="mt-2 flex gap-2">
                    <select className={input} value={attachTestId} onChange={(e) => setAttachTestId(e.target.value)}>
                      <option value="">Select test…</option>
                      {tests.map((t) => <option key={t.test_id} value={t.test_id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      className={input}
                      placeholder="Round name (e.g. Round 1 — Aptitude)"
                      value={attachRoundName}
                      onChange={(e) => setAttachRoundName(e.target.value)}
                    />
                    <select className={input} value={attachKind} onChange={(e) => setAttachKind(e.target.value)}>
                      <option value="">Kind (optional)</option>
                      <option value="aptitude">Aptitude</option>
                      <option value="technical">Technical</option>
                      <option value="coding">Coding</option>
                      <option value="hr">HR</option>
                      <option value="gd">Group discussion</option>
                      <option value="interview">Interview</option>
                    </select>
                  </div>
                  <button className={btn + ' mt-2'} disabled={busy || !attachTestId} onClick={attach}>
                    <Plus className="h-3.5 w-3.5" /> Attach
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h4 className="text-xs font-bold uppercase text-gray-400">Workflow rounds ({rounds.length})</h4>
                  <div className="mt-3 space-y-2">
                    {rounds.map((r, i) => (
                      <div key={r.test_id} className="rounded-xl border border-gray-100 px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="flex items-center gap-1 text-gray-300">
                            <button type="button" className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30" onClick={() => moveRound(i, -1)} disabled={i === 0 || busy} aria-label="Move up">
                              <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                            </button>
                            <button type="button" className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30" onClick={() => moveRound(i, 1)} disabled={i === rounds.length - 1 || busy} aria-label="Move down">
                              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                            </button>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold text-[#1F3A5F]">
                              {r.round_name || `Round ${i + 1}`} — {r.name}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-gray-500">
                              {r.kind || r.mode} · {r.mandatory ? 'mandatory' : 'optional'} · {r.max_attempts} attempt(s)
                              {r.opens_at ? ` · opens ${new Date(r.opens_at).toLocaleString()}` : ''}
                              {r.closes_at ? ` · closes ${new Date(r.closes_at).toLocaleString()}` : ''}
                            </span>
                          </span>
                          <button
                            type="button"
                            className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-[#1F3A5F] hover:bg-gray-200"
                            onClick={() => openRoundEditor(r)}
                          >
                            {editingRoundId === r.test_id ? 'Close' : <><Pencil className="mr-1 inline h-3 w-3" />Edit</>}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                            onClick={() => detachRound(r.test_id)}
                            disabled={busy}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {editingRoundId === r.test_id && roundDraft && (
                          <div className="mt-3 grid gap-2 border-t border-gray-100 pt-3 sm:grid-cols-2">
                            <label>
                              <span className="text-[11px] font-bold uppercase text-gray-400">Round name</span>
                              <input className={input + ' mt-1'} value={roundDraft.round_name} onChange={(e) => setRoundDraft({ ...roundDraft, round_name: e.target.value })} />
                            </label>
                            <label>
                              <span className="text-[11px] font-bold uppercase text-gray-400">Kind</span>
                              <select className={input + ' mt-1'} value={roundDraft.kind} onChange={(e) => setRoundDraft({ ...roundDraft, kind: e.target.value })}>
                                <option value="">—</option>
                                <option value="aptitude">Aptitude</option>
                                <option value="technical">Technical</option>
                                <option value="coding">Coding</option>
                                <option value="hr">HR</option>
                                <option value="gd">Group discussion</option>
                                <option value="interview">Interview</option>
                              </select>
                            </label>
                            <label>
                              <span className="text-[11px] font-bold uppercase text-gray-400">Max attempts</span>
                              <input type="number" min="1" className={input + ' mt-1'} value={roundDraft.max_attempts} onChange={(e) => setRoundDraft({ ...roundDraft, max_attempts: e.target.value })} />
                            </label>
                            <label className="flex items-end gap-2 pb-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={roundDraft.mandatory}
                                onChange={(e) => setRoundDraft({ ...roundDraft, mandatory: e.target.checked })}
                              />
                              <span className="text-[13px] font-medium text-gray-600">Mandatory round</span>
                            </label>
                            <label>
                              <span className="text-[11px] font-bold uppercase text-gray-400">Opens at</span>
                              <input type="datetime-local" className={input + ' mt-1'} value={roundDraft.opens_at} onChange={(e) => setRoundDraft({ ...roundDraft, opens_at: e.target.value })} />
                            </label>
                            <label>
                              <span className="text-[11px] font-bold uppercase text-gray-400">Closes at</span>
                              <input type="datetime-local" className={input + ' mt-1'} value={roundDraft.closes_at} onChange={(e) => setRoundDraft({ ...roundDraft, closes_at: e.target.value })} />
                            </label>
                            <label className="sm:col-span-2">
                              <span className="text-[11px] font-bold uppercase text-gray-400">Unlock rule (JSON, e.g. {'{"kind":"open"}'})</span>
                              <textarea className={input + ' mt-1 h-16 font-mono text-xs'} value={roundDraft.unlock_rule} onChange={(e) => setRoundDraft({ ...roundDraft, unlock_rule: e.target.value })} spellCheck={false} />
                            </label>
                            <div className="sm:col-span-2">
                              <button className={btn} disabled={busy} onClick={() => saveRound(r.test_id)}>
                                <Check className="h-3.5 w-3.5" /> Save round
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {rounds.length === 0 && <p className="text-xs italic text-gray-400">No rounds attached yet.</p>}
                  </div>
                </div>
              </>
            )}

            {/* ---------------------------- roster ---------------------------- */}
            {section === 'roster' && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h4 className="text-xs font-bold uppercase text-gray-400">Import roster (roll numbers, one per line)</h4>
                <textarea className={input + ' mt-2 h-24 font-mono'} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'GLA-2026-001\nGLA-2026-002'} />
                <button className={btn + ' mt-2'} disabled={busy || !importText.trim()} onClick={importRoster}>
                  <Upload className="h-3.5 w-3.5" /> Import
                </button>
                <div className="mt-3 max-h-72 overflow-auto text-xs text-gray-600">
                  {regsLocal.map((r) => (
                    <div key={r.registration_id} className="flex items-center justify-between border-b border-gray-50 py-1">
                      <span className="font-mono">{r.roll_no || r.user_id}</span>
                      <span className="capitalize text-gray-400">{r.status} · {r.completed_tests || 0} done</span>
                    </div>
                  ))}
                  {regsLocal.length === 0 && <p className="italic text-gray-400">No registrations.</p>}
                </div>
              </div>
            )}

            {/* ---------------------------- results --------------------------- */}
            {section === 'results' && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-gray-400">Results ({results.length})</h4>
                  <div className="flex gap-2">
                    <button className={ghost} onClick={downloadCsv}>
                      <Download className="h-3.5 w-3.5" /> CSV
                    </button>
                    <button className={btn} disabled={busy} onClick={publishResults}>
                      <Send className="h-3.5 w-3.5" /> Publish results
                    </button>
                  </div>
                </div>
                <div className="mt-3 max-h-80 overflow-auto text-xs text-gray-600">
                  {results.map((r) => (
                    <div key={r.user_id} className="flex items-center justify-between border-b border-gray-50 py-1">
                      <span className="font-mono">{r.roll_no || r.user_id}</span>
                      <span className="capitalize text-gray-400">{r.registration_status}</span>
                    </div>
                  ))}
                  {results.length === 0 && <p className="italic text-gray-400">No results yet.</p>}
                </div>
              </div>
            )}

            {/* ---------------------------- notify ---------------------------- */}
            {section === 'notify' && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h4 className="text-xs font-bold uppercase text-gray-400">Send update to registered students</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Appears in every registrant&apos;s in-app notifications (and push, where enabled).
                </p>
                <label className="mt-3 block">
                  <span className="text-[11px] font-bold uppercase text-gray-400">Title</span>
                  <input
                    className={input + ' mt-1'}
                    placeholder="e.g. Slot bookings open tonight"
                    value={notifyTitle}
                    onChange={(e) => setNotifyTitle(e.target.value)}
                    maxLength={120}
                  />
                </label>
                <label className="mt-2 block">
                  <span className="text-[11px] font-bold uppercase text-gray-400">Message</span>
                  <textarea
                    className={input + ' mt-1 h-24'}
                    placeholder="What should students know? Keep it one or two lines."
                    value={notifyBody}
                    onChange={(e) => setNotifyBody(e.target.value)}
                    maxLength={400}
                  />
                </label>
                <button className={btn + ' mt-3'} disabled={notifyBusy || !notifyTitle.trim()} onClick={sendUpdate}>
                  <Send className="h-3.5 w-3.5" /> {notifyBusy ? 'Sending…' : 'Send update'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
