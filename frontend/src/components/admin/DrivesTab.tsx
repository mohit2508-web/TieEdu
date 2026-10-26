import React, { useEffect, useState } from 'react';
import {
  ClipboardList, Plus, RefreshCw, Upload, Download, Send, Trash2, Pencil, Check, X,
  ChevronUp, ChevronDown, Rocket, EyeOff, CreditCard, CalendarClock, ExternalLink, Zap, Link2, Mail,
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
  adminListPaymentsApi,
  adminApprovePaymentApi,
  adminRejectPaymentApi,
  adminOpenPaymentProofApi,
  adminListSlotsApi,
  adminGenerateSlotsApi,
  adminUpdateSlotApi,
  adminDeleteSlotApi,
  adminListBookingsApi,
  adminAssignBookingApi,
  adminActivateBookingApi,
  adminDeactivateBookingApi,
  adminCancelBookingApi,
  adminAssignSlotBulkApi,
  adminActivateSlotBulkApi,
  adminDeactivateSlotBulkApi,
  adminSendDriveEmailApi,
  AdminDrive,
  AdminDriveTest,
  AdminProvider,
  AdminPaymentRow,
  AdminSlotRow,
  AdminBookingRow,
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
  'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-heading focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15 transition';
const btn =
  'inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-ink transition disabled:opacity-50';
const ghost =
  'inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-bold text-body hover:bg-surface-hover transition disabled:opacity-50';
const danger =
  'inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 transition disabled:opacity-50';

/** Slot list helpers: group by day so 35 slots read as days, not one wall. */
const groupSlotsByDay = (rows: AdminSlotRow[]): [string, AdminSlotRow[]][] => {
  const map = new Map<string, AdminSlotRow[]>();
  for (const s of rows) {
    // Group by the IST calendar day of the slot. `slot_date` may arrive as a
    // bare date or an ISO timestamp (pg DATE → JS Date), so derive the day
    // from starts_at in IST instead of string-slicing it.
    const d = new Date(s.starts_at);
    const key = isNaN(d.getTime()) ? String(s.slot_date || '').slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};
const formatSlotDay = (day: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date(day);
  if (isNaN(d.getTime())) return day;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

type Section = 'details' | 'rounds' | 'roster' | 'payments' | 'slots' | 'results' | 'notify' | 'help';

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
      <div>
        <p className="eyebrow">Placement operations</p>
        <h2 className="mt-1 text-xl font-extrabold text-heading">Mock drives</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['drives', 'tests', 'providers'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl border px-4 py-1.5 text-xs font-bold capitalize transition ${
              tab === t
                ? 'border-brand-ink bg-brand-ink text-white shadow-sm'
                : 'border-gray-200 bg-white text-body hover:bg-surface-hover'
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
        <h3 className="text-sm font-extrabold text-heading">Register a provider</h3>
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
      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
        <h3 className="text-sm font-extrabold text-heading">Providers</h3>
        <div className="mt-3 space-y-2">
          {providers.map((p) => (
            <div key={p.provider_id} className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-ink">{p.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-gray-500">{p.code} · {p.launch_url}</p>
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
        <h3 className="text-sm font-extrabold text-heading">Create a test</h3>
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
      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
        <h3 className="text-sm font-extrabold text-heading">Tests</h3>
        <div className="mt-3 space-y-2">
          {tests.map((t) => (
            <div key={t.test_id} className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-ink">{t.name}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold uppercase text-gray-500">{t.mode}</span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-gray-500">{t.provider_name || t.skill_slug || '—'}</p>
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

  // Payments (₹99 ledger)
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [payCounts, setPayCounts] = useState({ submitted: 0, approved: 0, rejected: 0 });
  const [payFilter, setPayFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('all');

  // Slots + bookings
  const [slots, setSlots] = useState<AdminSlotRow[]>([]);
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [gen, setGen] = useState({ start_date: '', days: '5', times: '10:00,12:00,14:00,16:00,18:00,20:00,22:00', capacity: '50', duration_minutes: '60' });
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignDraft, setAssignDraft] = useState({ round_name: '', test_url: '', access_code: '' });
  // Slot-level bulk release: one assign form shared across slots
  const [slotAssignId, setSlotAssignId] = useState<string | null>(null);
  const [slotDraft, setSlotDraft] = useState({ round_name: '', test_url: '', access_code: '' });

  // Email compose (manual scope: all / one slot / one student)
  const [emailScope, setEmailScope] = useState<'all' | 'slot' | 'student'>('all');
  const [emailSlotId, setEmailSlotId] = useState('');
  const [emailRegId, setEmailRegId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  const [busy, setBusy] = useState(false);

  const loadPayments = async (driveId: string, f = payFilter) => {
    try {
      const r = await adminListPaymentsApi(driveId, f);
      setPayments(r.payments);
      setPayCounts(r.counts);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const loadSlots = async (driveId: string) => {
    try {
      setSlots((await adminListSlotsApi(driveId)).slots);
    } catch { /* section can retry on refresh */ }
  };
  const loadBookings = async (driveId: string) => {
    try {
      setBookings((await adminListBookingsApi(driveId)).bookings);
    } catch { /* section can retry on refresh */ }
  };

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

  // Lazy-load the payment/slot ledgers when their section opens.
  useEffect(() => {
    if (!selected) return;
    if (section === 'payments') loadPayments(selected.drive_id);
    if (section === 'slots') {
      loadSlots(selected.drive_id);
      loadBookings(selected.drive_id);
    }
    // The email composer's slot scope needs the slot list too.
    if (section === 'notify') loadSlots(selected.drive_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, selected?.drive_id, payFilter]);

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
      round_description: r.round_description || '',
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
        round_description: roundDraft.round_description ?? '',
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

  /** Email compose — queued server-side, `queued` is the recipient count. */
  const sendEmail = async () => {
    if (!selected || !emailSubject.trim() || !emailBody.trim()) return;
    if (emailScope === 'slot' && !emailSlotId) return;
    if (emailScope === 'student' && !emailRegId) return;
    setEmailBusy(true);
    try {
      const r = await adminSendDriveEmailApi(selected.drive_id, {
        scope: emailScope,
        slot_id: emailScope === 'slot' ? emailSlotId : undefined,
        registration_id: emailScope === 'student' ? emailRegId : undefined,
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      });
      setNotice(`Email queued to ${r.queued} student${r.queued === 1 ? '' : 's'}.`);
      setEmailSubject('');
      setEmailBody('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEmailBusy(false);
    }
  };

  /**
   * Roster CSV — every column the drive team asks for on a call: who they are,
   * how to reach them, what they paid, and when they sit.
   */
  const exportRoster = () => {
    const cols = ['name', 'email', 'phone', 'roll_no', 'branch', 'batch', 'status', 'payment_status', 'slot_time', 'booking_status', 'completed_tests'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.join(',')].concat(
      regsLocal.map((r) =>
        [
          r.name,
          r.email,
          r.contact_phone,
          r.roll_no,
          r.branch,
          r.batch,
          r.status,
          r.payment_status,
          r.slot_starts_at ? new Date(r.slot_starts_at).toLocaleString('en-IN') : '',
          r.booking_status,
          r.completed_tests,
        ].map(esc).join(',')
      )
    );
    const blob = new Blob(['' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drive-${selected?.drive_id || 'roster'}-roster.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ---------------------- payments & slots actions ---------------------- */

  const decidePayment = async (p: AdminPaymentRow, approve: boolean) => {
    if (!selected) return;
    const note = approve ? undefined : window.prompt('Reason for rejecting (shown to the student):') || undefined;
    if (!approve && note === undefined) return;
    setBusy(true);
    try {
      if (approve) await adminApprovePaymentApi(selected.drive_id, p.payment_id, note);
      else await adminRejectPaymentApi(selected.drive_id, p.payment_id, note);
      setNotice(approve ? 'Payment approved — student can book a slot now.' : 'Payment rejected — student notified.');
      await loadPayments(selected.drive_id);
      await loadBookings(selected.drive_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openProof = async (p: AdminPaymentRow) => {
    if (!selected) return;
    try {
      await adminOpenPaymentProofApi(selected.drive_id, p.payment_id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const generateSlots = async () => {
    if (!selected) return;
    const times = gen.times.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
    setBusy(true);
    try {
      const r = await adminGenerateSlotsApi(selected.drive_id, {
        start_date: gen.start_date,
        days: Number(gen.days) || 5,
        times,
        capacity: Number(gen.capacity) || 50,
        duration_minutes: Number(gen.duration_minutes) || 120,
      });
      setNotice(`Created ${r.created} slot${r.created === 1 ? '' : 's'}.`);
      await loadSlots(selected.drive_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleSlot = async (s: AdminSlotRow) => {
    if (!selected) return;
    setBusy(true);
    try {
      await adminUpdateSlotApi(selected.drive_id, s.slot_id, { status: s.status === 'open' ? 'closed' : 'open' });
      await loadSlots(selected.drive_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteSlot = async (s: AdminSlotRow) => {
    if (!selected) return;
    if (!window.confirm(`Delete the ${new Date(s.starts_at).toLocaleString()} slot?`)) return;
    setBusy(true);
    try {
      await adminDeleteSlotApi(selected.drive_id, s.slot_id);
      setNotice('Slot deleted.');
      await loadSlots(selected.drive_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** One bulk slot call → refresh both ledgers; the formatter gets the count. */
  const slotRun = async (msg: (n: number) => string, fn: () => Promise<{ updated: number }>) => {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await fn();
      setNotice(msg(r?.updated ?? 0));
      await Promise.all([loadSlots(selected.drive_id), loadBookings(selected.drive_id)]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const bulkAssign = async (slotId: string) => {
    if (!selected) return;
    if (!slotDraft.round_name.trim() && !slotDraft.test_url.trim()) {
      setError('Enter a round name or test URL first.');
      return;
    }
    await slotRun((n) => `Link assigned to ${n} student${n === 1 ? '' : 's'}.`, () =>
      adminAssignSlotBulkApi(selected.drive_id, slotId, {
        round_name: slotDraft.round_name.trim() || undefined,
        test_url: slotDraft.test_url.trim() || undefined,
        access_code: slotDraft.access_code.trim() || undefined,
      })
    );
    setSlotAssignId(null);
    setSlotDraft({ round_name: '', test_url: '', access_code: '' });
  };

  const bulkActivate = (slotId: string) =>
    slotRun((n) => `${n} link${n === 1 ? '' : 's'} released — students notified.`, () => adminActivateSlotBulkApi(selected!.drive_id, slotId));

  const bulkDeactivate = (slotId: string) =>
    slotRun((n) => `${n} link${n === 1 ? '' : 's'} deactivated.`, () => adminDeactivateSlotBulkApi(selected!.drive_id, slotId));

  /** Per-slot link tallies, derived from the bookings list. */
  const slotStats = (slotId: string) => {
    const bs = bookings.filter((b) => b.slot_id === slotId && b.status !== 'cancelled');
    return {
      assigned: bs.filter((b) => b.link_assigned_at && !b.link_active_at).length,
      active: bs.filter((b) => b.link_active_at).length,
    };
  };

  const assignLink = async (b: AdminBookingRow) => {
    if (!selected) return;
    if (!assignDraft.round_name.trim() && !assignDraft.test_url.trim()) {
      setError('Enter a round name or test URL for this booking.');
      return;
    }
    setBusy(true);
    try {
      await adminAssignBookingApi(selected.drive_id, b.booking_id, {
        round_name: assignDraft.round_name.trim() || undefined,
        test_url: assignDraft.test_url.trim() || undefined,
        access_code: assignDraft.access_code.trim() || undefined,
      });
      setNotice('Link assigned — the student has been notified. Release it when you are ready.');
      setAssigningId(null);
      setAssignDraft({ round_name: '', test_url: '', access_code: '' });
      await loadBookings(selected.drive_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const bookingAction = async (
    b: AdminBookingRow,
    fn: () => Promise<any>,
    msg: string
  ) => {
    if (!selected) return;
    setBusy(true);
    try {
      await fn();
      setNotice(msg);
      await loadBookings(selected.drive_id);
      await loadSlots(selected.drive_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* ----------------------------- left column ---------------------------- */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-heading">New drive</h3>
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

        <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
          <h3 className="text-sm font-extrabold text-heading">Drives</h3>
          <div className="mt-3 space-y-2">
            {drives.map((d) => (
              <button
                key={d.drive_id}
                type="button"
                onClick={() => onSelect(d.drive_id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selected?.drive_id === d.drive_id ? 'border-signal bg-signal-soft' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-bold text-brand-ink">{d.title}</span>
                  <span className="ml-2 flex-none rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold uppercase text-gray-500">{d.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
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
          <div className="rounded-3xl border border-dashed border-line bg-white p-12 text-center text-sm italic text-muted">
            Select a drive to manage its details, rounds, roster and results.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header + lifecycle actions */}
            <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="mr-auto text-base font-extrabold text-heading">{selected.title}</h3>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold uppercase text-gray-500">{status}</span>
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
                {(['details', 'rounds', 'roster', 'payments', 'slots', 'results', 'notify', 'help'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition ${
                      section === s
                        ? 'border-brand-ink bg-brand-ink text-white shadow-sm'
                        : 'border-gray-200 bg-white text-body hover:bg-surface-hover'
                    }`}
                  >
                    {s}
                    {s === 'rounds' && rounds.length > 0 ? ` (${rounds.length})` : ''}
                    {s === 'roster' && regsLocal.length > 0 ? ` (${regsLocal.length})` : ''}
                    {s === 'payments' && payCounts.submitted > 0 ? ` (${payCounts.submitted})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* --------------------------- details --------------------------- */}
            {section === 'details' && detail && (
              <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Drive details</h4>
                <DriveFormFields form={editForm} setForm={setEditForm} disabled={savingDetail} />

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <label>
                    <span className="text-xs font-medium text-gray-500">Status</span>
                    <select className={input + ' mt-1'} value={status} onChange={(e) => setStatus(e.target.value)} disabled={savingDetail}>
                      <option value="draft">Draft (hidden from students)</option>
                      <option value="published">Published (open)</option>
                      <option value="live">Live</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <span className="text-xs font-medium text-gray-500">Eligibility (JSON — branches, years, cgpa, backlogs…)</span>
                  <textarea
                    className={input + ' mt-1 h-28 font-mono text-xs'}
                    value={eligibilityText}
                    onChange={(e) => setEligibilityText(e.target.value)}
                    disabled={savingDetail}
                    spellCheck={false}
                  />
                </div>

                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500">Other info (JSON)</span>
                  <textarea
                    className={input + ' mt-1 h-20 font-mono text-xs'}
                    value={otherInfoText}
                    onChange={(e) => setOtherInfoText(e.target.value)}
                    disabled={savingDetail}
                    spellCheck={false}
                  />
                </div>

                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500">Documents</span>
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
                <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Attach a round</h4>
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

                <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Workflow rounds ({rounds.length})</h4>
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
                            <span className="block truncate font-bold text-brand-ink">
                              {r.round_name || `Round ${i + 1}`} — {r.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500">
                              {r.kind || r.mode} · {r.mandatory ? 'mandatory' : 'optional'} · {r.max_attempts} attempt(s)
                              {r.opens_at ? ` · opens ${new Date(r.opens_at).toLocaleString()}` : ''}
                              {r.closes_at ? ` · closes ${new Date(r.closes_at).toLocaleString()}` : ''}
                            </span>
                          </span>
                          <button
                            type="button"
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-body transition hover:bg-surface-hover"
                            onClick={() => openRoundEditor(r)}
                          >
                            {editingRoundId === r.test_id ? 'Close' : <><Pencil className="mr-1 inline h-3 w-3" />Edit</>}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                            onClick={() => detachRound(r.test_id)}
                            disabled={busy}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {editingRoundId === r.test_id && roundDraft && (
                          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-gray-100 pt-3 sm:grid-cols-2">
                            <label>
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">Round name</span>
                              <input className={input + ' mt-1'} value={roundDraft.round_name} onChange={(e) => setRoundDraft({ ...roundDraft, round_name: e.target.value })} />
                            </label>
                            <label>
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">Kind</span>
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
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">Max attempts</span>
                              <input type="number" min="1" className={input + ' mt-1'} value={roundDraft.max_attempts} onChange={(e) => setRoundDraft({ ...roundDraft, max_attempts: e.target.value })} />
                            </label>
                            <label className="flex items-end gap-2 pb-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={roundDraft.mandatory}
                                onChange={(e) => setRoundDraft({ ...roundDraft, mandatory: e.target.checked })}
                              />
                              <span className="text-sm font-medium text-gray-600">Mandatory round</span>
                            </label>
                            <label>
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">Opens at</span>
                              <input type="datetime-local" className={input + ' mt-1'} value={roundDraft.opens_at} onChange={(e) => setRoundDraft({ ...roundDraft, opens_at: e.target.value })} />
                            </label>
                            <label>
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">Closes at</span>
                              <input type="datetime-local" className={input + ' mt-1'} value={roundDraft.closes_at} onChange={(e) => setRoundDraft({ ...roundDraft, closes_at: e.target.value })} />
                            </label>
                            <label className="sm:col-span-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">Round structure shown to students</span>
                              <textarea
                                className={input + ' mt-1 h-20 text-sm'}
                                value={roundDraft.round_description}
                                onChange={(e) => setRoundDraft({ ...roundDraft, round_description: e.target.value })}
                                placeholder={'AI-assisted Coding — 2 questions\nDebugging Coding — 2 questions\nPseudo Code — 15 questions\nHands-on DSA — 1 question'}
                              />
                              <span className="mt-1 block text-xs text-gray-400">Students see this text on the round card instead of a duration / question count.</span>
                            </label>
                            <label className="sm:col-span-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">Unlock rule (JSON, e.g. {'{"kind":"open"}'})</span>
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
              <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Roster ({regsLocal.length})</h4>
                  <button className={ghost} onClick={exportRoster} disabled={!regsLocal.length}>
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <h4 className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">Import roster (roll numbers, one per line)</h4>
                <textarea className={input + ' mt-2 h-24 font-mono'} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'GLA-2026-001\nGLA-2026-002'} />
                <button className={btn + ' mt-2'} disabled={busy || !importText.trim()} onClick={importRoster}>
                  <Upload className="h-3.5 w-3.5" /> Import
                </button>
                <div className="mt-3 max-h-96 overflow-auto text-xs text-gray-600">
                  {regsLocal.map((r) => (
                    <div key={r.registration_id} className="border-b border-gray-50 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-bold text-brand-ink">
                          {r.name || r.roll_no || r.user_id}
                          {r.status && <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-bold uppercase text-gray-500">{String(r.status).replace('_', ' ')}</span>}
                          {r.payment_status && (
                            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold uppercase ${
                              r.payment_status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                              : r.payment_status === 'rejected' ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-700'
                            }`}>₹ {r.payment_status}</span>
                          )}
                          {r.booking_status && r.booking_status !== 'cancelled' && (
                            <span className="ml-1.5 rounded-full bg-signal-soft px-1.5 py-0.5 text-xs font-bold uppercase text-signal-hover">slot booked</span>
                          )}
                        </span>
                        {r.slot_starts_at && (
                          <span className="shrink-0 font-mono text-xs text-signal">
                            {new Date(r.slot_starts_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        {r.email && <span>{r.email}</span>}
                        {r.contact_phone && <span className="font-mono">+91 {r.contact_phone}</span>}
                        {r.roll_no && <span className="font-mono">{r.roll_no}</span>}
                        {r.branch && <span>{r.branch}</span>}
                        {r.batch && <span>{r.batch}</span>}
                      </div>
                    </div>
                  ))}
                  {regsLocal.length === 0 && <p className="italic text-gray-400">No registrations.</p>}
                </div>
              </div>
            )}

            {/* ---------------------------- payments --------------------------- */}
            {section === 'payments' && (
              <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Payments
                    {payCounts.submitted > 0 && (
                      <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        {payCounts.submitted} pending
                      </span>
                    )}
                  </h4>
                  <div className="flex gap-1">
                    {(['all', 'submitted', 'approved', 'rejected'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setPayFilter(f)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold capitalize transition ${
                          payFilter === f
                            ? 'border-brand-ink bg-brand-ink text-white shadow-sm'
                            : 'border-gray-200 bg-white text-body hover:bg-surface-hover'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {payments.map((p) => (
                    <div key={p.payment_id} className="rounded-xl border border-gray-100 px-3 py-2.5 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <CreditCard className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-brand-ink">
                            ₹{Math.round(p.amount_paise / 100)} · {p.user_email || p.roll_no || p.user_id}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-500">
                            UTR {p.utr || '—'} · {new Date(p.created_at).toLocaleString()} · {p.registration_status}
                            {p.reviewer_note ? ` · note: ${p.reviewer_note}` : ''}
                          </span>
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                          p.status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                          : p.status === 'rejected' ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-700'
                        }`}>
                          {p.status}
                        </span>
                        <button type="button" className={ghost} onClick={() => openProof(p)}>
                          <ExternalLink className="h-3.5 w-3.5" /> Proof
                        </button>
                        {p.status === 'submitted' && (
                          <>
                            <button type="button" className={btn} disabled={busy} onClick={() => decidePayment(p, true)}>
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button type="button" className={danger} disabled={busy} onClick={() => decidePayment(p, false)}>
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && <p className="text-xs italic text-gray-400">No payments for this drive yet.</p>}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  Approving unlocks the student&apos;s open rounds and lets them book a slot; the student gets a notification either way.
                </p>
              </div>
            )}

            {/* ----------------------------- slots ----------------------------- */}
            {section === 'slots' && (
              <>
                <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Generate slots</h4>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    One slot per day per start time. Times are IST. Defaults: 5 days × 10 AM/12/2/4/6/8/10 PM, 50 seats, 1h each.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
                    <label>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">Start date</span>
                      <input type="date" className={input + ' mt-1'} value={gen.start_date} onChange={(e) => setGen({ ...gen, start_date: e.target.value })} />
                    </label>
                    <label>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">Days</span>
                      <input type="number" min="1" max="14" className={input + ' mt-1'} value={gen.days} onChange={(e) => setGen({ ...gen, days: e.target.value })} />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">Times (comma-separated, IST)</span>
                      <input className={input + ' mt-1'} value={gen.times} onChange={(e) => setGen({ ...gen, times: e.target.value })} />
                    </label>
                    <label>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">Seats / slot</span>
                      <input type="number" min="1" className={input + ' mt-1'} value={gen.capacity} onChange={(e) => setGen({ ...gen, capacity: e.target.value })} />
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
                    <label>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">Duration (min)</span>
                      <input type="number" min="15" className={input + ' mt-1'} value={gen.duration_minutes} onChange={(e) => setGen({ ...gen, duration_minutes: e.target.value })} />
                    </label>
                    <div className="flex items-end sm:col-span-4">
                      <button className={btn} disabled={busy || !gen.start_date} onClick={generateSlots}>
                        <CalendarClock className="h-3.5 w-3.5" /> Generate slots
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Slots ({slots.length})</h4>
                    <p className="text-sm text-gray-500">
                      Slot bhar jaye to ek click me poore slot ke links assign aur release karein — 50 alag-alag nahi.
                    </p>
                  </div>
                  <div className="mt-4 max-h-[560px] space-y-6 overflow-auto pr-1">
                    {groupSlotsByDay(slots).map(([day, list]) => (
                      <div key={day}>
                        <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-white/95 pb-2 pt-1 backdrop-blur">
                          <span className="text-sm font-extrabold text-brand-ink">{formatSlotDay(day)}</span>
                          <span className="text-xs font-semibold text-gray-500">{list.length} slots</span>
                        </div>
                        <div className="space-y-2.5">
                          {list.map((s) => {
                            const st = slotStats(s.slot_id);
                            const full = s.booked >= s.capacity;
                            const pct = Math.min(100, Math.round((s.booked / Math.max(1, s.capacity)) * 100));
                            const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                            return (
                              <div key={s.slot_id} className={`rounded-2xl border p-4 transition ${full ? 'border-red-200 bg-red-50/40' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                                  <div className="min-w-[170px]">
                                    <p className="text-base font-extrabold text-heading">{time(s.starts_at)} – {time(s.ends_at)}</p>
                                    <p className="mt-0.5 text-xs font-semibold text-gray-500">{s.status === 'open' ? 'Open' : 'Paused'}{full ? ' · Full' : ''}</p>
                                  </div>
                                  <div className="min-w-[150px] flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <span className={`text-sm font-extrabold ${full ? 'text-red-600' : 'text-heading'}`}>{s.booked} / {s.capacity}</span>
                                      <span className="text-xs font-semibold text-gray-500">booked</span>
                                    </div>
                                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                      <div className={`h-2 rounded-full ${full ? 'bg-red-500' : 'bg-brand-ink'}`} style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {st.assigned > 0 && (
                                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{st.assigned} assigned</span>
                                    )}
                                    {st.active > 0 && (
                                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{st.active} live</span>
                                    )}
                                    {full && <span className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">FULL</span>}
                                  </div>
                                  <div className="ml-auto flex flex-wrap items-center gap-2">
                                    <button type="button" className={ghost} disabled={busy || s.booked === 0} onClick={() => setSlotAssignId(slotAssignId === s.slot_id ? null : s.slot_id)}>
                                      <Link2 className="h-4 w-4" /> Assign all
                                    </button>
                                    <button type="button" className={btn} disabled={busy || st.assigned === 0} onClick={() => bulkActivate(s.slot_id)}>
                                      <Zap className="h-4 w-4" /> Release all
                                    </button>
                                    <button type="button" className={ghost} disabled={busy || st.active === 0} onClick={() => bulkDeactivate(s.slot_id)}>
                                      Pause links
                                    </button>
                                    <button type="button" className={ghost} disabled={busy} onClick={() => toggleSlot(s)}>
                                      {s.status === 'open' ? 'Close' : 'Open'}
                                    </button>
                                    <button type="button" className={danger} disabled={busy} onClick={() => deleteSlot(s)} aria-label="Delete slot">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                                {slotAssignId === s.slot_id && (
                                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
                                    <label className="block">
                                      <span className="text-xs font-semibold text-gray-600">Round name (same for everyone)</span>
                                      <input
                                        className={input + ' mt-1'}
                                        placeholder="e.g. Round 1 — AI-assisted Coding"
                                        value={slotDraft.round_name}
                                        onChange={(e) => setSlotDraft({ ...slotDraft, round_name: e.target.value })}
                                      />
                                    </label>
                                    <label className="block">
                                      <span className="text-xs font-semibold text-gray-600">Test URL (optional — Link tab reference)</span>
                                      <input
                                        className={input + ' mt-1'}
                                        placeholder="https://…"
                                        value={slotDraft.test_url}
                                        onChange={(e) => setSlotDraft({ ...slotDraft, test_url: e.target.value })}
                                      />
                                    </label>
                                    <label className="block">
                                      <span className="text-xs font-semibold text-gray-600">Access code (test ka, e.g. CAPG99)</span>
                                      <input
                                        className={input + ' mt-1'}
                                        placeholder="CAPG99"
                                        value={slotDraft.access_code}
                                        onChange={(e) => setSlotDraft({ ...slotDraft, access_code: e.target.value })}
                                      />
                                    </label>
                                    <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                                      <button className={btn} disabled={busy} onClick={() => bulkAssign(s.slot_id)}>
                                        <Check className="h-4 w-4" /> Assign to all {s.booked} in this slot
                                      </button>
                                      <span className="text-xs text-gray-500">Link tab tak dead rehta hai jab tak aap Release na karein. Student Launch button se hi test kholega.</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {slots.length === 0 && <p className="italic text-gray-400">No slots yet — generate them above.</p>}
                  </div>
                </div>

                <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Bookings ({bookings.length})</h4>
                    <p className="text-sm text-gray-500">
                      Assign the round + URL, then <b>Release</b> — tab tak student ko link dikhta hi nahi.
                    </p>
                  </div>
                  <div className="mt-4 max-h-[560px] space-y-3 overflow-auto pr-1">
                    {bookings.map((b) => (
                      <div key={b.booking_id} className={`rounded-2xl border p-4 ${b.status === 'cancelled' ? 'border-gray-100 bg-gray-50 opacity-70' : 'border-gray-200 bg-white'}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-extrabold text-heading">
                                {b.user_name || b.roll_no || b.user_id}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                                b.status === 'active' ? 'bg-emerald-50 text-emerald-700'
                                : b.status === 'link_assigned' ? 'bg-amber-50 text-amber-700'
                                : b.status === 'cancelled' ? 'bg-gray-100 text-gray-400'
                                : 'bg-signal-soft text-signal-hover'
                              }`}>
                                {b.status.replace('_', ' ')}
                              </span>
                              {b.link_active_at && (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700">● Link live</span>
                              )}
                            </div>
                            <p className="mt-1 break-all text-sm text-gray-600">
                              {b.user_email}{b.contact_phone ? ` · +91 ${b.contact_phone}` : ''}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {b.payment_status && (
                                <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                                  /reject/.test(b.payment_status) ? 'bg-red-50 text-red-700'
                                  : /approv/.test(b.payment_status) ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                                }`}>
                                  ₹ {b.payment_status.replace('payment_', '')}
                                </span>
                              )}
                              <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                <CalendarClock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                                {new Date(b.starts_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                              </span>
                              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${b.round_name ? 'border border-gray-200 bg-white text-gray-700' : 'bg-amber-50 text-amber-700'}`}>
                                {b.round_name || 'Round not set'}
                              </span>
                              {b.access_code && (
                                <span className="rounded-lg border border-gray-200 bg-indigo-50 px-2.5 py-1 font-mono text-xs font-bold text-indigo-700">
                                  Code: {b.access_code}
                                </span>
                              )}
                              <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${b.link_active_at ? 'bg-emerald-50 text-emerald-700' : b.link_assigned_at ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                {b.link_active_at ? 'Link: live' : b.link_assigned_at ? 'Link: assigned' : 'Link: not set'}
                              </span>
                            </div>
                          </div>

                          {b.status !== 'cancelled' && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className={ghost}
                                onClick={() => {
                                  if (assigningId === b.booking_id) { setAssigningId(null); return; }
                                  setAssigningId(b.booking_id);
                                  setAssignDraft({ round_name: b.round_name || '', test_url: b.test_url || '', access_code: b.access_code || '' });
                                }}
                              >
                                <Link2 className="h-4 w-4" /> {b.link_assigned_at ? 'Edit' : 'Assign'}
                              </button>
                              {!b.link_active_at && b.link_assigned_at && (
                                <button
                                  type="button"
                                  className={btn}
                                  disabled={busy}
                                  onClick={() => bookingAction(b, () => adminActivateBookingApi(selected!.drive_id, b.booking_id), 'Link ACTIVATED — student notified.')}
                                >
                                  <Zap className="h-4 w-4" /> Release
                                </button>
                              )}
                              {b.link_active_at && (
                                <button
                                  type="button"
                                  className={ghost}
                                  disabled={busy}
                                  onClick={() => bookingAction(b, () => adminDeactivateBookingApi(selected!.drive_id, b.booking_id), 'Link deactivated.')}
                                >
                                  Pause
                                </button>
                              )}
                              <button
                                type="button"
                                className={danger}
                                disabled={busy}
                                onClick={() => {
                                  if (window.confirm('Cancel this booking? The seat frees up and the student can rebook.')) {
                                    bookingAction(b, () => adminCancelBookingApi(selected!.drive_id, b.booking_id), 'Booking cancelled.');
                                  }
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        {assigningId === b.booking_id && (
                          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
                            <label className="block">
                              <span className="text-xs font-semibold text-gray-600">Round name</span>
                              <input
                                className={input + ' mt-1'}
                                placeholder="e.g. Round 1 — AI-assisted Coding"
                                value={assignDraft.round_name}
                                onChange={(e) => setAssignDraft({ ...assignDraft, round_name: e.target.value })}
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold text-gray-600">Test URL (optional — Link tab reference)</span>
                              <input
                                className={input + ' mt-1'}
                                placeholder="https://…"
                                value={assignDraft.test_url}
                                onChange={(e) => setAssignDraft({ ...assignDraft, test_url: e.target.value })}
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold text-gray-600">Access code (test ka, e.g. CAPG99)</span>
                              <input
                                className={input + ' mt-1'}
                                placeholder="CAPG99"
                                value={assignDraft.access_code}
                                onChange={(e) => setAssignDraft({ ...assignDraft, access_code: e.target.value })}
                              />
                            </label>
                            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                              <button className={btn} disabled={busy} onClick={() => assignLink(b)}>
                                <Check className="h-4 w-4" /> Save assignment
                              </button>
                              <button type="button" className="text-xs font-bold text-signal hover:underline" onClick={() => setSection('help')}>
                                URL kahan se milega? Help dekhein →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {bookings.length === 0 && <p className="text-sm italic text-gray-400">No bookings yet — students book after payment approval.</p>}
                  </div>
                </div>
              </>
            )}

            {/* ---------------------------- results --------------------------- */}
            {section === 'results' && (
              <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Results ({results.length})</h4>
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
              <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Send update to registered students</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Appears in every registrant&apos;s in-app notifications (and push, where enabled).
                </p>
                <label className="mt-3 block">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Title</span>
                  <input
                    className={input + ' mt-1'}
                    placeholder="e.g. Slot bookings open tonight"
                    value={notifyTitle}
                    onChange={(e) => setNotifyTitle(e.target.value)}
                    maxLength={120}
                  />
                </label>
                <label className="mt-2 block">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Message</span>
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

                <div className="mt-6 border-t border-gray-100 pt-5">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                    <Mail className="h-3.5 w-3.5" /> Send email
                  </h4>
                  <p className="mt-1 text-xs text-gray-500">
                    Email to everyone, one slot, or one student. Payment approval, slot booking aur link-live pe automatic email jaata hai — yeh manual wala hai.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">Send to</span>
                      <select className={input + ' mt-1'} value={emailScope} onChange={(e) => setEmailScope(e.target.value as any)}>
                        <option value="all">All registered ({regsLocal.length})</option>
                        <option value="slot">One slot</option>
                        <option value="student">One student</option>
                      </select>
                    </label>
                    {emailScope === 'slot' && (
                      <label className="sm:col-span-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted">Slot</span>
                        <select className={input + ' mt-1'} value={emailSlotId} onChange={(e) => setEmailSlotId(e.target.value)}>
                          <option value="">Pick a slot…</option>
                          {slots.map((s) => (
                            <option key={s.slot_id} value={s.slot_id}>
                              {new Date(s.starts_at).toLocaleString()} ({s.booked}/{s.capacity})
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {emailScope === 'student' && (
                      <label className="sm:col-span-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted">Student</span>
                        <select className={input + ' mt-1'} value={emailRegId} onChange={(e) => setEmailRegId(e.target.value)}>
                          <option value="">Pick a student…</option>
                          {regsLocal.map((r) => (
                            <option key={r.registration_id} value={r.registration_id}>
                              {r.name || r.roll_no || r.user_id} · {r.email || r.user_id}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <label className="mt-2 block">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Subject</span>
                    <input className={input + ' mt-1'} placeholder="e.g. Your Capgemini slot is confirmed" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} maxLength={150} />
                  </label>
                  <label className="mt-2 block">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Message</span>
                    <textarea className={input + ' mt-1 h-28'} placeholder={'Slot time, payment receipt, ya test link ka detail — blank line se paragraph banta hai.'} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} maxLength={4000} />
                  </label>
                  <button className={btn + ' mt-3'} disabled={emailBusy || !emailSubject.trim() || !emailBody.trim()} onClick={sendEmail}>
                    <Mail className="h-3.5 w-3.5" /> {emailBusy ? 'Queueing…' : 'Send email'}
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------ help ------------------------------ */}
            {section === 'help' && <DriveHelp onTab={setSection} />}
          </div>
        )}
      </div>
    </div>
  );
}

/** Step-by-step operating manual for a mock drive — the drive editor's Help tab. */
const DRIVE_STEPS: { n: number; title: string; tab: string; body: string }[] = [
  {
    n: 1,
    title: 'Drive banao aur Publish karo',
    tab: 'details',
    body: 'Company, fee (₹99), registration dates, eligibility aur description bharo — phir Status ko “Published” kar do. Students ko drive apne portal par dikhne lagti hai.',
  },
  {
    n: 2,
    title: 'Students register karke ₹99 pay karte hain',
    tab: 'roster',
    body: 'Student UPI se payment karke screenshot + UTR upload karta hai. Uski registration “payment pending” dikhti hai.',
  },
  {
    n: 3,
    title: 'Payment approve karo',
    tab: 'payments',
    body: 'Proof kholkar check karo → Approve. Approve hote hi student ko notification + email jaata hai aur uska “Book slot” button unlock ho jaata hai. Galat proof ho to Reject + note likho — student dobara upload kar sakta hai.',
  },
  {
    n: 4,
    title: 'Student slot book karta hai',
    tab: 'slots',
    body: 'Aapke generate kiye hue slots (day + time) me se student apni seat choose karta hai. Uski booking yahan Slots → Bookings me dikhti hai.',
  },
  {
    n: 5,
    title: 'Round + access code assign karo',
    tab: 'slots',
    body: 'Bookings me ek student ke liye “Assign”, ya poore slot ke liye “Assign all” — round name, access code (Kryptavia OS ka test code, jaise CAPG99) aur agar ho to URL paste karke save karo. URL sirf aapke reference ke liye hai; student kabhi URL paste karke nahi khelta.',
  },
  {
    n: 6,
    title: 'Release karo — link live hota hai',
    tab: 'slots',
    body: 'Assign ke baad bhi link DEAD rehta hai. “Release” (ek student) ya “Release all” (poora slot) dabate hi link student ke slot window me open ho jaata hai — start se 5 min pehle se, slot end par hard close.',
  },
  {
    n: 7,
    title: 'Results publish karo',
    tab: 'results',
    body: 'Exam khatam hone ke baad Results publish karo — students ko scores dikh jaate hain. CSV se sab data download bhi kar sakte ho.',
  },
  {
    n: 8,
    title: 'Zaroori update bhejo',
    tab: 'notify',
    body: 'Reminder, reschedule ya koi bhi announcement — sab registered students ko email + in-app notification ek saath bhejo.',
  },
];

const HELP_FAQ: [string, string][] = [
  ['Link open nahi ho raha', 'Booking ka status live hona chahiye aur time slot window ke andar hona chahiye. Bookings card par “Link: live” chip check karo, warna Release karo.'],
  ['Student ko login maang raha hai', 'Usne raw test URL khola hai. Student ko sirf apne drive page ka Start test button use karne ko bolo — TieEdu auto-login se andar kar deta hai. Raw URL kabhi mat bhejo.'],
  ['“Link already used / expired” aa raha hai', 'Link ek hi baar khulta hai aur 5 min valid hota hai. Wapas drive page par Start test button dabao — naya link khud ban jaata hai.'],
  ['Student ko doosra slot chahiye', 'Bookings me uski booking Cancel karo — seat turant free ho jaayegi, student dobara book kar lega.'],
  ['Payment reject ho gaya', 'Student portal se dobara upload kar sakta hai — Payments section me naya proof approve kar dena.'],
  ['Slot bhar gaya', 'Card par FULL dikhega. Naya slot generate karo ya kisi booking ko cancel karke seat chhodo.'],
  ['Email nahi ja raha', 'Server par RESEND_API_KEY set hona chahiye — uske bina sirf in-app notification + push chalte hain.'],
];

export function DriveHelp({ onTab }: { onTab: (s: Section) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">How a mock drive runs — end to end</h4>
        <p className="mt-1.5 text-sm text-gray-500">Har step ka tab wahan likha hai jahan wo hota hai. Upar wale section tabs se wahi tab kholein.</p>
        <ol className="mt-4 space-y-4">
          {DRIVE_STEPS.map((s) => (
            <li key={s.n} className="flex gap-3.5">
              <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-ink text-sm font-extrabold text-white">
                {s.n}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-bold text-heading">{s.title}</p>
                  <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-gray-500">{s.tab}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Students ko test link kahan se milega?</h4>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">
          <p>
            <b>1.</b> Assign karte waqt <b>round name + access code</b> do (URL optional hai — sirf aapki reference ke liye).
          </p>
          <p>
            <b>2.</b> Phir <b>Release</b> karo. Release hote hi student ko notification chala jaata hai aur uske drive page par
            <b> “Start test”</b> button uske slot window me khul jaata hai — start se 5 min pehle se, slot end tak.
          </p>
          <p>
            <b>3.</b> Student sirf <b>Start test</b> button dabata hai — TieEdu usko seedha exam platform par bina login ke
            pahuncha deta hai (auto-login). Button dikh raha hai matlab sab set hai.
          </p>
          <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800">
            ⚠ Raw test URL kabhi student ko mat bhejo. Link ek baar ka hai (5 min valid) aur URL se kholne par exam platform
            login maangega — student atak jaayega. Sirf Start test button hi sahi rasta hai.
          </p>
          <p className="rounded-xl bg-signal-soft px-3.5 py-2.5 text-sm font-medium text-brand-ink">
            Ek hi round + code poore slot ko de sakte ho — “Assign all” se sabko ek saath, phir “Release all”.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Problem? — quick fixes</h4>
        <dl className="mt-3 space-y-3.5">
          {HELP_FAQ.map(([q, a]) => (
            <div key={q}>
              <dt className="text-sm font-bold text-heading">{q}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-gray-600">{a}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className={ghost + ' mt-4'} onClick={() => onTab('slots')}>
          <CalendarClock className="h-4 w-4" /> Slots section par le jao
        </button>
      </div>
    </div>
  );
}
