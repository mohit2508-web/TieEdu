'use client';

/**
 * Admin → Engagement → Emails.
 *
 * Four sections, because four different jobs:
 *   Leads     — import the CSV, see what landed, prune, open one person's timeline.
 *   Campaigns — pick a template, segment, preview, send-test, send, watch progress.
 *   Templates — preview every template as rendered HTML before any of it ships.
 *   Analytics — funnels, open/CTR per template, per-rule automation counts, CSV export.
 *
 * Send confirmation mirrors BroadcastTab's two-handed pattern (checkbox, then
 * retyping the campaign name): email cannot be recalled either, and a stray
 * click mailing 1,000 cold addresses is exactly the mistake that burns a
 * sending domain. The server independently requires `confirm: true`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BarChart3, CheckCircle2, Download, Eye, FileUp, History, Loader2, Mail,
  Pause, Play, Plus, RefreshCw, Search, Send, Trash2, Users, XCircle, Zap,
} from 'lucide-react';
import {
  createCampaignApi, createLeadApi, deleteCampaignApi, deleteLeadApi, downloadCsvApi,
  fetchAnalyticsApi, fetchCampaignApi, fetchCampaignsApi, fetchLeadTimelineApi,
  fetchLeadsApi, fetchQueueApi, fetchTemplatesApi, importLeadsApi, pauseCampaignApi,
  previewTemplateApi, resumeCampaignApi, runAutomationsApi, sendCampaignApi, sendTestEmailApi,
  type EmailAnalytics, type EmailCampaign, type EmailLead, type EmailMessage,
  type EmailQueueStatus, type EmailTemplateInfo, type EmailTemplateId, type LeadTimelineEvent,
} from '@/lib/emailApi';

type Section = 'leads' | 'campaigns' | 'templates' | 'analytics';

const SECTIONS: { id: Section; label: string; icon: any }[] = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'campaigns', label: 'Campaigns', icon: Send },
  { id: 'templates', label: 'Templates', icon: Eye },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unsubscribed: 'bg-gray-100 text-gray-600 border-gray-200',
  bounced: 'bg-red-50 text-red-700 border-red-200',
  complained: 'bg-red-50 text-red-700 border-red-200',
  converted: 'bg-[#E8F4FB] text-[#0284C7] border-[#B8E3F7]',
};

const CAMPAIGN_TONE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  sending: 'bg-[#E8F4FB] text-[#0284C7] border-[#B8E3F7]',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const inputCls =
  'px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30';

const Badge: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${className}`}>
    {children}
  </span>
);

export const EmailTab: React.FC = () => {
  const [section, setSection] = useState<Section>('leads');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  // Leads
  const [leads, setLeads] = useState<EmailLead[]>([]);
  const [leadTotal, setLeadTotal] = useState(0);
  const [leadAllTotal, setLeadAllTotal] = useState(0);
  const [leadByStatus, setLeadByStatus] = useState<Record<string, number>>({});
  const [leadQuery, setLeadQuery] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [leadYear, setLeadYear] = useState('');
  const [leadOffset, setLeadOffset] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; rejected_count: number; rejected: { row: number; email: string; reason: string }[] } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', name: '', college: '', year: '' });

  // Campaigns
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ campaign: EmailCampaign; recent_messages: EmailMessage[] } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', template_id: 'welcome' as EmailTemplateId, year: '' });
  const [sendFor, setSendFor] = useState<EmailCampaign | null>(null);
  const [sendAck, setSendAck] = useState(false);
  const [sendTyped, setSendTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);

  // Templates + queue
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [queue, setQueue] = useState<EmailQueueStatus | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testFor, setTestFor] = useState<EmailTemplateId | null>(null);

  // Analytics + lead timeline
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [timelineFor, setTimelineFor] = useState<EmailLead | null>(null);
  const [timeline, setTimeline] = useState<{ events: LeadTimelineEvent[]; pending: EmailMessage[] } | null>(null);
  const [exporting, setExporting] = useState<'leads' | 'messages' | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const fail = (e: any) => setNotice({ tone: 'err', text: e?.message || 'Request failed' });

  const loadLeads = useCallback(async () => {
    try {
      const r = await fetchLeadsApi({
        q: leadQuery || undefined,
        status: leadStatus || undefined,
        year: leadYear || undefined,
        limit: 50,
        offset: leadOffset,
      });
      setLeads(r.leads);
      setLeadTotal(r.total);
      setLeadAllTotal(r.all_total);
      setLeadByStatus(r.by_status || {});
    } catch (e) { fail(e); }
  }, [leadQuery, leadStatus, leadYear, leadOffset]);

  const loadCampaigns = useCallback(async () => {
    try {
      const [c, t, q] = await Promise.all([fetchCampaignsApi(), fetchTemplatesApi(), fetchQueueApi()]);
      setCampaigns(c.campaigns || []);
      setTemplates(t.templates || []);
      setQueue(q);
    } catch (e) { fail(e); }
  }, []);

  const loadAll = useCallback(() => { void loadLeads(); void loadCampaigns(); }, [loadLeads, loadCampaigns]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const loadAnalytics = useCallback(async () => {
    try { setAnalytics(await fetchAnalyticsApi()); } catch (e) { fail(e); }
  }, []);

  // Fetched on section entry rather than in loadAll: the 4s send-poll would
  // otherwise recompute the whole store every tick for a screen nobody watches.
  useEffect(() => { if (section === 'analytics') void loadAnalytics(); }, [section, loadAnalytics]);

  // Poll while anything is in flight — this is what makes the progress bar real.
  useEffect(() => {
    const inFlight =
      (queue && queue.active && queue.queued > 0) ||
      campaigns.some((c) => c.status === 'sending');
    if (!inFlight) return;
    const t = setInterval(() => { void loadAll(); }, 4000);
    return () => clearInterval(t);
  }, [queue, campaigns, loadAll]);

  const openDetail = useCallback(async (id: string) => {
    setSelected(id);
    try { setDetail(await fetchCampaignApi(id)); } catch (e) { fail(e); }
  }, []);

  // ── actions ───────────────────────────────────────────────────────────────

  /**
   * One synchronous behaviour pass: page-view nudges (A1–A3), re-subjects
   * (A4) and every elapsed drip step — the scheduler's hourly job, on demand.
   */
  const runAutomations = async () => {
    setAutoBusy(true);
    setNotice(null);
    try {
      const r = await runAutomationsApi();
      const res = r.result;
      const parts = [
        `${res.queued} rule email${res.queued === 1 ? '' : 's'}`,
        `${res.drip_queued} drip step${res.drip_queued === 1 ? '' : 's'}`,
        `${res.converted} converted`,
      ];
      const done = res.drip_completed.length ? ` — drip finished: ${res.drip_completed.length}` : '';
      setNotice({
        tone: 'ok',
        text: `Automation pass queued ${parts.join(', ')} (${res.skipped} skipped)${done}.`,
      });
      void loadAll();
    } catch (e) { fail(e); }
    finally { setAutoBusy(false); }
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setNotice(null);
    try {
      const r = await importLeadsApi(file, { source: `csv:${file.name}` });
      setImportResult(r);
      setNotice({ tone: 'ok', text: `Imported ${r.imported} lead${r.imported === 1 ? '' : 's'} — ${r.rejected_count} rejected.` });
      void loadLeads();
    } catch (e) { fail(e); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const addLead = async () => {
    setBusy(true);
    try {
      await createLeadApi({
        email: addForm.email.trim(),
        name: addForm.name.trim() || undefined,
        college: addForm.college.trim() || undefined,
        year: addForm.year.trim() || undefined,
      });
      setNotice({ tone: 'ok', text: 'Lead added.' });
      setAddForm({ email: '', name: '', college: '', year: '' });
      setShowAdd(false);
      void loadLeads();
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const removeLead = async (lead: EmailLead) => {
    if (!confirm(`Remove ${lead.email} from the list?`)) return;
    try { await deleteLeadApi(lead.id); void loadLeads(); }
    catch (e) { fail(e); }
  };

  const createCampaign = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await createCampaignApi({
        name: createForm.name.trim(),
        template_id: createForm.template_id,
        segment: createForm.year.trim() ? { year: createForm.year.trim() } : {},
      });
      setShowCreate(false);
      setCreateForm({ name: '', template_id: 'welcome', year: '' });
      setNotice({ tone: 'ok', text: `Campaign "${r.campaign.name}" created as a draft.` });
      void loadCampaigns();
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const doSend = async () => {
    if (!sendFor) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await sendCampaignApi(sendFor.id);
      setNotice({ tone: 'ok', text: `Queued to ${r.queued} recipient${r.queued === 1 ? '' : 's'}. Sending is paced — watch the progress here.` });
      setSendFor(null); setSendAck(false); setSendTyped('');
      void loadCampaigns();
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const doPause = async (id: string) => {
    try { await pauseCampaignApi(id); void loadAll(); } catch (e) { fail(e); }
  };
  const doResume = async (id: string) => {
    try { await resumeCampaignApi(id); void loadAll(); } catch (e) { fail(e); }
  };
  const doDelete = async (c: EmailCampaign) => {
    if (!confirm(`Delete campaign "${c.name}"? Sends already made are kept in the message log.`)) return;
    try {
      await deleteCampaignApi(c.id);
      if (selected === c.id) { setSelected(null); setDetail(null); }
      void loadCampaigns();
    } catch (e) { fail(e); }
  };

  const openTimeline = async (lead: EmailLead) => {
    setTimelineFor(lead);
    setTimeline(null);
    try {
      const r = await fetchLeadTimelineApi(lead.id);
      setTimeline({ events: r.events || [], pending: r.pending || [] });
    } catch (e) { fail(e); }
  };

  const doExport = async (kind: 'leads' | 'messages') => {
    setExporting(kind);
    try {
      await downloadCsvApi(kind);
      setNotice({ tone: 'ok', text: `CSV exported (${kind})` });
    } catch (e) { fail(e); }
    finally { setExporting(null); }
  };

  const openPreview = async (id: EmailTemplateId) => {
    try {
      const r = await previewTemplateApi(id, { name: 'Aarav' });
      setPreview({ subject: r.subject, html: r.html });
    } catch (e) { fail(e); }
  };

  const sendTest = async () => {
    if (!testFor || !testTo.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await sendTestEmailApi({ to: testTo.trim(), template_id: testFor });
      setNotice({ tone: 'ok', text: `Test "${testFor}" sent to ${testTo.trim()} (message ${r.message_id}).` });
      if (r.test_identity) {
        setNotice({ tone: 'err', text: `Sender is the Resend test identity — only the Resend account owner's own address will receive this. Set EMAIL_FROM to your verified domain for real sends.` });
      }
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const templateLabel = (id: EmailTemplateId) => templates.find((t) => t.id === id)?.label || id;

  const sendTargetCount = useMemo(() => {
    if (!sendFor) return 0;
    // Honest estimate from the same filters the server applies; the server is
    // still the authority at send time.
    let n = leadByStatus.active || 0;
    if (sendFor.segment?.year) return n; // year-level count not tracked; server resolves
    return n;
  }, [sendFor, leadByStatus]);

  const sendingNow = campaigns.filter((c) => c.status === 'sending');

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-[#1F3A5F] mt-0.5" />
          <div className="flex-1">
            <p className="eyebrow">Email marketing</p>
            <h2 className="text-xl font-extrabold text-[#10151C] mt-1">Leads, campaigns and templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Import a list, send a campaign, watch opens and clicks land back here. Every email carries a
              working one-click unsubscribe — the server refuses to mail anyone who used it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAutomations}
              disabled={autoBusy}
              title="Run behaviour rules (A1–A4) and every elapsed drip step now, instead of waiting for the hourly pass."
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-[#10151C] hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
            >
              {autoBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Run automations
            </button>
            <button onClick={loadAll} className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-[#10151C] hover:bg-gray-50 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 mt-4">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  section === s.id ? 'bg-[#1F3A5F] text-white' : 'border border-gray-200 hover:bg-gray-50 text-[#10151C]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {s.label}
              </button>
            );
          })}
        </div>

        {queue && !queue.configured && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Email is not configured: {queue.config_error || 'RESEND_API_KEY missing'}. Everything else works; sends will fail until the key is set in <code>backend/.env</code>.</span>
          </div>
        )}
        {queue && queue.configured && queue.queued > 0 && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[#E8F4FB] border border-[#B8E3F7] text-xs font-semibold text-[#075985] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Queue: {queue.queued} queued, {queue.sent_this_run} sent this run — one every {queue.delay_ms}ms.
            {queue.paused && <span className="text-[#C1442D]"> PAUSED: {queue.last_error}</span>}
          </div>
        )}
      </div>

      {notice && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${notice.tone === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {notice.text}
        </div>
      )}

      {/* ───────────────────────────── LEADS ───────────────────────────── */}
      {section === 'leads' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0284C7]" />
                <span className="text-sm font-extrabold text-[#10151C]">{leadTotal} matching</span>
                <span className="text-xs text-gray-500">/ {leadAllTotal} total</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(leadByStatus).map(([s, n]) => (
                  <Badge key={s} className={STATUS_TONE[s] || 'bg-gray-100 text-gray-600 border-gray-200'}>{s}: {n}</Badge>
                ))}
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setShowAdd((v) => !v)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-[#10151C] hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add one
              </button>
              <label className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${importing ? 'bg-gray-100 text-gray-400' : 'bg-[#0284C7] hover:bg-[#0369a1] text-white'}`}>
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                {importing ? 'Importing…' : 'Import CSV'}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => void onImportFile(e.target.files?.[0])}
                />
              </label>
              <button
                onClick={() => void doExport('leads')}
                disabled={exporting === 'leads'}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-[#10151C] hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
              >
                {exporting === 'leads' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Leads CSV
              </button>
              <button
                onClick={() => void doExport('messages')}
                disabled={exporting === 'messages'}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-[#10151C] hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
              >
                {exporting === 'messages' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Message log
              </button>
            </div>

            <p className="text-[11px] text-gray-500">
              CSV needs a header row — <code>email,name,college,year</code>. Existing addresses are never
              re-activated by an import: an unsubscribed or bounced row stays that way.
            </p>

            {showAdd && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 p-3 rounded-xl bg-[#FAFAF9] border border-[#EDEDEB]">
                <input placeholder="email@college.edu" className={inputCls} value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                <input placeholder="Name" className={inputCls} value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
                <input placeholder="College" className={inputCls} value={addForm.college} onChange={(e) => setAddForm({ ...addForm, college: e.target.value })} />
                <input placeholder="Year (e.g. 2)" className={inputCls} value={addForm.year} onChange={(e) => setAddForm({ ...addForm, year: e.target.value })} />
                <button onClick={addLead} disabled={busy || !addForm.email.trim()} className="px-3 py-2 bg-[#1F3A5F] text-white rounded-xl text-xs font-bold disabled:opacity-50">
                  Add lead
                </button>
              </div>
            )}

            {importResult && importResult.rejected_count > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-900">{importResult.rejected_count} row(s) rejected:</p>
                <div className="mt-1.5 max-h-32 overflow-y-auto text-[11px] text-amber-800 font-mono">
                  {importResult.rejected.slice(0, 40).map((r) => (
                    <div key={`${r.row}-${r.email}`}>row {r.row}: {r.email || '(empty)'} — {r.reason}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={leadQuery}
                  onChange={(e) => { setLeadQuery(e.target.value); setLeadOffset(0); }}
                  placeholder="Search email, name, college"
                  className={`${inputCls} w-full pl-8`}
                />
              </div>
              <select value={leadStatus} onChange={(e) => { setLeadStatus(e.target.value); setLeadOffset(0); }} className={inputCls}>
                <option value="">Any status</option>
                {['active', 'unsubscribed', 'bounced', 'complained', 'converted'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={leadYear} onChange={(e) => { setLeadYear(e.target.value); setLeadOffset(0); }} placeholder="Year" className={`${inputCls} w-24`} />
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] text-left text-[10px] font-mono font-bold text-gray-500 uppercase">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2 hidden sm:table-cell">Name</th>
                    <th className="px-3 py-2 hidden md:table-cell">College</th>
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEB]">
                  {leads.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-xs">No leads yet — import a CSV to start.</td></tr>
                  ) : leads.map((l) => (
                    <tr key={l.id} className="hover:bg-[#FAFAF9]">
                      <td className="px-3 py-2 font-semibold text-[#10151C] text-xs">{l.email}</td>
                      <td className="px-3 py-2 text-xs hidden sm:table-cell">{l.name || '—'}</td>
                      <td className="px-3 py-2 text-xs hidden md:table-cell truncate max-w-[180px]">{l.college || '—'}</td>
                      <td className="px-3 py-2 text-xs">{l.year || '—'}</td>
                      <td className="px-3 py-2"><Badge className={STATUS_TONE[l.status]}>{l.status}</Badge></td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => void openTimeline(l)} title="Timeline" className="text-gray-400 hover:text-[#0284C7]">
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeLead(l)} title="Remove" className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Showing {leads.length} of {leadTotal}</span>
              <div className="flex gap-2">
                <button disabled={leadOffset === 0} onClick={() => setLeadOffset(Math.max(0, leadOffset - 50))} className="px-3 py-1.5 border border-gray-200 rounded-lg font-bold disabled:opacity-40">Prev</button>
                <button disabled={leadOffset + 50 >= leadTotal} onClick={() => setLeadOffset(leadOffset + 50)} className="px-3 py-1.5 border border-gray-200 rounded-lg font-bold disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── CAMPAIGNS ─────────────────────────── */}
      {section === 'campaigns' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-extrabold text-[#10151C]">Campaigns</h3>
                <p className="text-xs text-gray-500 mt-0.5">Draft → send → paced by the queue. Progress updates live.</p>
              </div>
              <button onClick={() => setShowCreate((v) => !v)} className="px-3.5 py-2 bg-[#0284C7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> New campaign
              </button>
            </div>

            {showCreate && (
              <div className="mt-4 p-4 rounded-xl bg-[#FAFAF9] border border-[#EDEDEB] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input placeholder="Campaign name (e.g. 2nd-year Oct batch)" className={inputCls} value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                  <select className={inputCls} value={createForm.template_id} onChange={(e) => setCreateForm({ ...createForm, template_id: e.target.value as EmailTemplateId })}>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.label} — {t.subject}</option>)}
                  </select>
                  <input placeholder="Year segment (e.g. 2, blank = all)" className={inputCls} value={createForm.year} onChange={(e) => setCreateForm({ ...createForm, year: e.target.value })} />
                  <button onClick={createCampaign} disabled={busy || !createForm.name.trim()} className="px-3 py-2 bg-[#1F3A5F] text-white rounded-xl text-xs font-bold disabled:opacity-50">
                    Create draft
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">Segment = active leads only. Unsubscribed and bounced addresses are never included.</p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {campaigns.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-400">No campaigns yet.</div>
              )}
              {campaigns.map((c) => {
                const total = c.stats.queued + c.stats.sent + c.stats.delivered + c.stats.opened + c.stats.clicked + c.stats.bounced;
                const done = total - c.stats.queued;
                return (
                  <div key={c.id} className={`rounded-xl border p-4 transition ${selected === c.id ? 'border-[#0284C7] bg-[#F7FBFE]' : 'border-gray-200 hover:bg-[#FAFAF9]'}`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button onClick={() => void openDetail(c.id)} className="flex-1 min-w-[220px] text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-[#10151C]">{c.name}</span>
                          <Badge className={CAMPAIGN_TONE[c.status]}>{c.status}</Badge>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {templateLabel(c.template_id)} · segment {c.segment?.year ? `year ${c.segment.year}` : 'all active'} · created {c.created_at.slice(0, 10)}
                        </div>
                        {c.status === 'sending' && total > 0 && (
                          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full bg-[#0284C7] transition-all" style={{ width: `${Math.round((done / Math.max(total, 1)) * 100)}%` }} />
                          </div>
                        )}
                      </button>
                      <div className="flex items-center gap-4 text-right">
                        {([['queued', c.stats.queued], ['sent', c.stats.sent], ['opened', c.stats.opened], ['clicked', c.stats.clicked], ['bounced', c.stats.bounced]] as const).map(([k, v]) => (
                          <div key={k}>
                            <div className="text-sm font-extrabold text-[#10151C]">{v}</div>
                            <div className="text-[9px] font-mono uppercase text-gray-400">{k}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(c.status === 'draft') && (
                          <button
                            onClick={() => { setSendFor(c); setSendAck(false); setSendTyped(''); }}
                            className="px-3 py-2 bg-[#0284C7] hover:bg-[#0369a1] text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Send
                          </button>
                        )}
                        {c.status === 'sending' && (
                          <button onClick={() => doPause(c.id)} className="px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                            <Pause className="w-3 h-3" /> Pause
                          </button>
                        )}
                        {c.status === 'paused' && (
                          <button onClick={() => doResume(c.id)} className="px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                            <Play className="w-3 h-3" /> Resume
                          </button>
                        )}
                        {c.status !== 'sending' && (
                          <button onClick={() => doDelete(c)} className="p-2 text-gray-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {detail && selected && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#10151C]">{detail.campaign.name} — recent sends</h3>
                <button onClick={() => { setSelected(null); setDetail(null); }} className="p-1.5 text-gray-400 hover:text-gray-600"><XCircle className="w-4 h-4" /></button>
              </div>
              <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#FAFAF9] text-left text-[10px] font-mono font-bold text-gray-500 uppercase">
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 hidden sm:table-cell">Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDEDEB]">
                    {detail.recent_messages.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">Nothing queued yet.</td></tr>
                    )}
                    {detail.recent_messages.map((m) => (
                      <tr key={m.id}>
                        <td className="px-3 py-2 font-semibold">{m.email}</td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-[240px]">{m.subject || '—'}</td>
                        <td className="px-3 py-2">
                          <Badge className={m.status === 'failed' || m.status === 'bounced' ? 'bg-red-50 text-red-700 border-red-200' : m.status === 'queued' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                            {m.status}{m.skip_reason ? ` (${m.skip_reason})` : ''}
                          </Badge>
                          {m.error && <div className="text-[10px] text-red-600 mt-0.5">{m.error}</div>}
                        </td>
                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{m.sent_at?.slice(0, 16).replace('T', ' ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Test send */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-[#10151C] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#0284C7]" /> Send a test to yourself
            </h3>
            <p className="text-xs text-gray-500 mt-1">Renders the real template through the real send path. Do this before every campaign.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input placeholder="you@yourdomain.com" className={`${inputCls} flex-1 min-w-[220px]`} value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              <select className={inputCls} value={testFor || ''} onChange={(e) => setTestFor(e.target.value as EmailTemplateId)}>
                <option value="">Choose template…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <button onClick={sendTest} disabled={busy || !testTo.trim() || !testFor} className="px-4 py-2 bg-[#1F3A5F] text-white rounded-xl text-xs font-bold disabled:opacity-50">
                Send test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── TEMPLATES ─────────────────────────── */}
      {section === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-[#10151C]">{t.label}</div>
                  <div className="text-xs font-semibold text-[#0284C7] mt-0.5 truncate">{t.subject}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{t.preheader}</div>
                  <div className="text-[10px] font-mono text-gray-400 mt-1">cta → {t.home_path}</div>
                </div>
                <button onClick={() => void openPreview(t.id)} className="px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold hover:bg-gray-50 flex items-center gap-1 shrink-0">
                  <Eye className="w-3 h-3" /> Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────── ANALYTICS ─────────────────────────── */}
      {section === 'analytics' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-extrabold text-[#10151C]">Analytics</h3>
                <p className="text-xs text-gray-500 mt-0.5">Funnel totals, per-template open/CTR, per-rule automation counts, 14-day trend.</p>
              </div>
              <button onClick={() => void loadAnalytics()} className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            {!analytics && (
              <div className="p-6 text-center text-xs text-gray-400">Loading…</div>
            )}
            {analytics && (
              <>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                  {(['queued','sent','delivered','opened','clicked','bounced','failed'] as const).map((k) => (
                    <div key={k} className="p-3 rounded-xl border border-gray-200">
                      <div className="text-xl font-extrabold text-[#10151C]">{(analytics.totals as any)[k]}</div>
                      <div className="text-[10px] font-mono uppercase text-gray-400">{k}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl border border-[#B8E3F7] bg-[#F7FBFE]">
                    <div className="text-sm font-extrabold">Open rate (opened+clicked / accepted)</div>
                    <div className="text-lg font-extrabold text-[#0284C7]">{Math.round((analytics.totals.open_rate || 0)*100)}%</div>
                  </div>
                  <div className="p-3 rounded-xl border border-gray-200">
                    <div className="text-sm font-extrabold">CTR (clicked / accepted)</div>
                    <div className="text-lg font-extrabold">{Math.round((analytics.totals.click_rate || 0)*100)}%</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${analytics.totals.bounce_alert ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                    <div className="text-sm font-extrabold">Bounce rate</div>
                    <div className={`text-lg font-extrabold ${analytics.totals.bounce_alert ? 'text-red-700' : ''}`}>{Math.round((analytics.totals.bounce_rate || 0)*100)}%</div>
                    {analytics.totals.bounce_alert && <div className="text-[10px] text-red-700 mt-0.5">Bounce alert: attempted≥50 &gt; 3%</div>}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700 mb-2">By template</h4>
                    <div className="space-y-2">
                      {analytics.templates.length === 0 && <div className="text-xs text-gray-400">No sends yet.</div>}
                      {analytics.templates.map((t) => (
                        <div key={t.template_id} className="p-3 rounded-xl border border-gray-200">
                          <div className="text-xs font-extrabold">{t.template_id}</div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
                            <span>sent {t.sent}</span><span>deliv {t.delivered}</span><span>opened {t.opened}</span><span>clicked {t.clicked}</span><span>bounced {t.bounced}</span><span>failed {t.failed}</span>
                            <span>OR {(Math.round(t.open_rate*100))}%</span><span>CTR {(Math.round(t.click_rate*100))}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700 mb-2">Automations (A1–A5)</h4>
                    <div className="space-y-2">
                      {analytics.automations.length === 0 && <div className="text-xs text-gray-400">No automation passes yet.</div>}
                      {analytics.automations.map((a) => (
                        <div key={a.rule} className="p-3 rounded-xl border border-gray-200">
                          <div className="text-xs font-extrabold">{a.label} <span className="font-mono text-gray-400">({a.rule})</span></div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
                            <span>fires {a.fires}</span><span>queued {a.queued}</span><span>sent {a.sent}</span><span>opened {a.opened}</span><span>clicked {a.clicked}</span><span>bounced {a.bounced}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="text-xs font-extrabold text-gray-700 mb-2">Last 14 days</h4>
                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
                    {analytics.daily.map((d) => (
                      <div key={d.day} className="p-2 rounded-lg border border-gray-200 text-center">
                        <div className="text-[10px] font-mono text-gray-400">{d.day.slice(5)}</div>
                        <div className="text-sm font-extrabold">{d.sends}</div>
                        <div className="text-[10px] text-gray-500">sends</div>
                        <div className="text-xs font-bold text-[#0284C7]">{d.opens} o • {d.clicks} c</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-gray-400">Subject</div>
                <div className="text-sm font-extrabold text-[#10151C] truncate">{preview.subject}</div>
              </div>
              <button onClick={() => setPreview(null)} className="p-1.5 text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <iframe title="email-preview" sandbox="" srcDoc={preview.html} className="flex-1 w-full bg-gray-50" />
          </div>
        </div>
      )}

      {/* Send confirmation modal — two-handed, like BroadcastTab */}
      {sendFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSendFor(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-[#10151C]">Send “{sendFor.name}”?</h3>
            <p className="text-sm text-gray-600 mt-2">
              Template <strong>{templateLabel(sendFor.template_id)}</strong>, segment{' '}
              <strong>{sendFor.segment?.year ? `year ${sendFor.segment.year}` : 'all active leads'}</strong>.
              Estimated audience: <strong>{sendTargetCount}</strong> active lead{sendTargetCount === 1 ? '' : 's'}.
              Sending is paced and cannot be recalled — but it can be paused.
            </p>
            <label className="flex items-start gap-2 mt-4 text-xs font-semibold text-gray-700">
              <input type="checkbox" className="mt-0.5" checked={sendAck} onChange={(e) => setSendAck(e.target.checked)} />
              <span>I understand this emails real people and creates a permanent suppression list entry for anyone who unsubscribes.</span>
            </label>
            {sendAck && (
              <div className="mt-3">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Retype the campaign name to confirm</label>
                <input
                  value={sendTyped}
                  onChange={(e) => setSendTyped(e.target.value)}
                  placeholder={sendFor.name}
                  className={inputCls}
                />
                {sendTyped.trim() && sendTyped.trim() !== sendFor.name.trim() && (
                  <p className="mt-1 text-[10px] font-semibold text-[#C1442D]">Does not match yet.</p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setSendFor(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold">Cancel</button>
              <button
                onClick={doSend}
                disabled={!sendAck || sendTyped.trim() !== sendFor.name.trim() || busy}
                className="px-4 py-2 bg-[#C1442D] hover:bg-[#a53a26] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline modal */}
      {timelineFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setTimelineFor(null); setTimeline(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-[#10151C] truncate">{timelineFor.email}</div>
                <div className="text-[11px] text-gray-500">{timelineFor.name || '—'} • {timelineFor.college || '—'} • {timelineFor.year || '—'}</div>
              </div>
              <button onClick={() => { setTimelineFor(null); setTimeline(null); }} className="p-1.5 text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              {!timeline && <div className="text-center text-xs text-gray-400 p-6">Loading…</div>}
              {timeline && timeline.events.length === 0 && timeline.pending.length === 0 && (
                <div className="text-center text-xs text-gray-400 p-6">No timeline events yet.</div>
              )}
              {timeline && timeline.events.map((e, i) => (
                <div key={`${e.ts}-${i}`} className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-[#0284C7]" />
                  <div>
                    <div className="text-xs font-mono text-gray-500">{e.ts.slice(0, 19).replace('T', ' ')}</div>
                    <div className="text-sm font-semibold text-[#10151C]">{e.detail}</div>
                  </div>
                </div>
              ))}
              {timeline && timeline.pending.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-[10px] font-mono uppercase text-gray-400 mb-1">Pending (no timestamp)</div>
                  {timeline.pending.map((m) => (
                    <div key={m.id} className="text-[11px] text-gray-600">
                      {m.template_id} — {m.status}{m.skip_reason ? ` (${m.skip_reason})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
