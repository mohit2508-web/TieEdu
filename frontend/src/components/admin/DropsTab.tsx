import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Zap, Trash2, Loader2, CheckCircle2, ShieldAlert, Pin,
  Pencil, Plus, ExternalLink, Image as ImageIcon, X, Eye, BarChart3
} from 'lucide-react';
import { apiAssetUrl } from '@/lib/api';
import {
  DROP_TYPE_META, DROP_TYPES, adminFetchDropsApi, adminDropAnalyticsApi,
  adminCreateDropApi, adminUpdateDropApi, adminDeleteDropApi, uploadDropImageApi,
  type AdminDrop, type DropAnalytics, type DropStatus, type DropType, type DropWriteInput
} from '@/lib/dropsApi';

/*
 * Admin control plane for the Drops feed.
 *
 * Every control maps to a field `POST/PUT /api/drops/admin` actually honours,
 * the status pill is the server's own `is_live` verdict (liveness is computed
 * from status + publish window + deadline + caps — a client guess would lie),
 * and the analytics numbers come from the same endpoint the Overview uses so
 * there is one source of truth for "how did that drop do".
 */

const MAX_SIZE = 6 * 1024 * 1024;
const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]";
const labelCls = "block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1";

const EMPTY_FORM = {
  type: 'company' as DropType,
  headline: '',
  bullet1: '',
  bullet2: '',
  bullet3: '',
  body_md: '',
  image_stored_name: '',
  image_file_name: '',
  image_alt: '',
  cta_label: 'Open',
  cta_route: '',
  cta_url: '',
  target_slug: '',
  deadline_at: '',
  sponsored: false,
  sponsor_name: '',
  pinned: false,
  priority: '',
  status: 'draft' as DropStatus,
  publish_at: '',
  expires_at: '',
  tags: '',
  grad_years: '',
  branches: '',
  colleges: '',
};

type FormState = typeof EMPTY_FORM;

/** ISO -> value for <input type="datetime-local">, in the admin's own timezone. */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (value: string): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const csv = (value: string): string[] =>
  value.split(',').map((s) => s.trim()).filter(Boolean);

const fmtStamp = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const DropsTab: React.FC = () => {
  const [drops, setDrops] = useState<AdminDrop[]>([]);
  const [caps, setCaps] = useState({ max_live: 30, max_per_day: 10 });
  const [analytics, setAnalytics] = useState<DropAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingImage, setPendingImage] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<{ file: File; url: string } | null>(null);

  const flash = (text: string, type: 'ok' | 'err') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = async () => {
    try {
      const [list, stats] = await Promise.all([adminFetchDropsApi(), adminDropAnalyticsApi()]);
      setDrops(list.items);
      setCaps(list.caps);
      setAnalytics(stats);
    } catch (e: any) {
      flash(e?.message || 'Drops could not be loaded', 'err');
    } finally {
      setLoading(false);
    }
  };

  // `load` reads the auth token, so its identity must not gate the mount
  // effect: a refresh while the session was still resolving would render the
  // signed-out view. Ref pattern copied from PostersTab/AdminCmsView.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });
  useEffect(() => { loadRef.current(); }, []);
  useEffect(() => () => { if (pendingRef.current) URL.revokeObjectURL(pendingRef.current.url); }, []);

  const setPending = (next: { file: File; url: string } | null) => {
    if (pendingRef.current) URL.revokeObjectURL(pendingRef.current.url);
    pendingRef.current = next;
    setPendingImage(next);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPending(null);
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return flash('Only image files are allowed (JPG / PNG / WEBP / AVIF)', 'err');
    if (f.size > MAX_SIZE) return flash('Image must be 6MB or smaller', 'err');
    setPending({ file: f, url: URL.createObjectURL(f) });
    setForm(prev => ({ ...prev, image_alt: prev.image_alt || f.name.replace(/\.[a-z0-9]+$/i, '') }));
  };

  const startEdit = (d: AdminDrop) => {
    setPending(null);
    setEditingId(d.id);
    setForm({
      type: d.type,
      headline: d.headline,
      bullet1: d.bullets[0] || '',
      bullet2: d.bullets[1] || '',
      bullet3: d.bullets[2] || '',
      body_md: d.body_md || '',
      image_stored_name: d.image_stored_name || '',
      image_file_name: d.image_file_name || '',
      image_alt: d.image_alt || '',
      cta_label: d.cta_label,
      cta_route: d.cta_route || '',
      cta_url: d.cta_url || '',
      target_slug: d.target_slug || '',
      deadline_at: toLocalInput(d.deadline_at),
      sponsored: d.sponsored,
      sponsor_name: d.sponsor_name || '',
      pinned: d.pinned,
      priority: String(d.priority ?? ''),
      status: d.status,
      publish_at: toLocalInput(d.publish_at),
      expires_at: toLocalInput(d.expires_at),
      tags: d.tags.join(', '),
      grad_years: (d.audience?.grad_years || []).join(', '),
      branches: (d.audience?.branches || []).join(', '),
      colleges: (d.audience?.colleges || []).join(', '),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const headline = form.headline.trim();
    if (headline.length < 10) return flash('Headline must be at least 10 characters', 'err');
    if (headline.length > 100) return flash('Headline must be 100 characters or fewer', 'err');

    setBusy(true);
    try {
      let image_stored_name: string | undefined;
      let image_file_name: string | undefined;
      if (pendingImage) {
        // Upload first so the row can reference the stored name; a failure
        // must not create a drop that points at a file that never landed.
        const res = await uploadDropImageApi(pendingImage.file);
        // A 2xx with no stored_name would otherwise sail straight through and
        // save a card with no creative at all — the one failure mode that looks
        // like success in the console and only shows up as a blank well later.
        if (!res?.stored_name) throw new Error('Image upload did not return a stored name — save aborted, try again');
        setPending(null);
        image_stored_name = res.stored_name;
        image_file_name = res.file_name;
      }

      const audience: DropWriteInput['audience'] = {};
      const years = csv(form.grad_years);
      if (years.length) audience.grad_years = years;
      const branches = csv(form.branches);
      if (branches.length) audience.branches = branches;
      const colleges = csv(form.colleges);
      if (colleges.length) audience.colleges = colleges;

      const payload: DropWriteInput = {
        type: form.type,
        headline,
        bullets: [form.bullet1, form.bullet2, form.bullet3].map((b) => b.trim()).filter(Boolean),
        body_md: form.body_md,
        cta_label: form.cta_label.trim() || 'Open',
        cta_route: form.cta_route.trim() || undefined,
        cta_url: form.cta_url.trim() || undefined,
        target_slug: form.target_slug.trim() || undefined,
        deadline_at: fromLocalInput(form.deadline_at) || undefined,
        sponsored: form.sponsored,
        sponsor_name: form.sponsor_name.trim() || undefined,
        pinned: form.pinned,
        priority: form.priority === '' ? undefined : Number(form.priority),
        status: form.status,
        publish_at: fromLocalInput(form.publish_at) || undefined,
        expires_at: fromLocalInput(form.expires_at) || undefined,
        tags: csv(form.tags),
        audience,
        image_alt: form.image_alt.trim() || undefined,
      };
      if (image_stored_name) {
        payload.image_stored_name = image_stored_name;
        payload.image_file_name = image_file_name;
      }

      if (editingId) {
        await adminUpdateDropApi(editingId, payload);
        flash('Drop updated', 'ok');
      } else {
        await adminCreateDropApi(payload);
        flash('Drop created — it joins the feed once published and inside the caps', 'ok');
      }
      resetForm();
      await load();
    } catch (e: any) {
      flash(e?.message || 'Save failed', 'err');
    } finally {
      setBusy(false);
    }
  };

  const patch = async (d: AdminDrop, changes: Partial<DropWriteInput>) => {
    try {
      await adminUpdateDropApi(d.id, changes);
      await load();
    } catch (e: any) {
      flash(e?.message || 'Update failed', 'err');
    }
  };

  const remove = async (d: AdminDrop) => {
    if (!window.confirm(`Delete "${d.headline}"? Its image and stats go too.`)) return;
    try {
      await adminDeleteDropApi(d.id);
      if (editingId === d.id) resetForm();
      flash('Drop deleted', 'ok');
      await load();
    } catch (e: any) {
      flash(e?.message || 'Delete failed', 'err');
    }
  };

  const previewSrc = pendingImage?.url || (form.image_stored_name ? apiAssetUrl(`/api/drops/file/${encodeURIComponent(form.image_stored_name)}`) : '');
  const liveCount = useMemo(() => drops.filter((d) => d.is_live).length, [drops]);

  const statusPill = (d: AdminDrop) => {
    if (d.is_live) return { text: 'LIVE', cls: 'bg-emerald-100 text-emerald-800' };
    if (d.status === 'archived') return { text: 'ARCHIVED', cls: 'bg-gray-200 text-gray-500' };
    if (d.status === 'draft') return { text: 'DRAFT', cls: 'bg-gray-200 text-gray-600' };
    if (d.status === 'scheduled') return { text: 'SCHEDULED', cls: 'bg-amber-100 text-amber-800' };
    return { text: 'OFFLINE', cls: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#1E293B] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#B45309]" /> Drops — Career Feed
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-3xl">
              Vertical swipe cards on <code>/drops</code>. The feed shows at most{' '}
              <strong>{caps.max_live} live</strong> drops and <strong>{caps.max_per_day} published per day</strong> —
              the server enforces both, so an over-cap publish simply stays out of the feed.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/drops" target="_blank" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0284C7] border border-[#B8E3F7] bg-white hover:bg-[#E8F4FB]">
              <ExternalLink className="w-3.5 h-3.5" /> Open the feed
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold font-mono">
              {liveCount} live / {drops.length} total
            </span>
          </div>
        </div>

        {msg && (
          <div className={`mt-4 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {msg.text}
          </div>
        )}
      </div>

      {/* ===== ANALYTICS ===== */}
      {analytics && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs">
          <h4 className="text-sm font-extrabold text-[#1E293B] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0284C7]" /> Feed analytics
          </h4>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              ['Views', analytics.totals.views],
              ['CTA clicks', analytics.totals.cta_clicks],
              ['CTR %', analytics.totals.views ? Math.round((analytics.totals.cta_clicks / analytics.totals.views) * 1000) / 10 : 0],
              ['Saves', analytics.totals.saves],
              ['Shares', analytics.totals.shares],
              ['Avg dwell (s)', analytics.totals.views ? Math.round(analytics.totals.dwell_ms_total / analytics.totals.views / 1000) : 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-[#FAFAF9] border border-gray-100 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
                <p className="text-lg font-extrabold text-[#1E293B] font-mono">{value}</p>
              </div>
            ))}
          </div>
          {analytics.top_drops.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {analytics.top_drops.slice(0, 5).map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8F4FB] text-[11px] font-bold text-[#0271B5]">
                  <span className="truncate max-w-[220px]">{t.headline}</span>
                  <span className="font-mono">{t.views}v · {t.ctr}%</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
        {/* ===== EDITOR ===== */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-extrabold text-[#1E293B] flex items-center gap-2">
              {editingId ? <Pencil className="w-4 h-4 text-[#0284C7]" /> : <Plus className="w-4 h-4 text-[#0284C7]" />}
              {editingId ? 'Edit Drop' : 'New Drop'}
            </h4>
            {editingId && (
              <button onClick={resetForm} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-500 hover:bg-gray-100">
                <X className="w-3 h-3" /> Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DropType })}>
                {DROP_TYPES.map((t) => (
                  <option key={t} value={t}>{DROP_TYPE_META[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState['status'] })}>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Headline (10–100 chars)</label>
            <input className={inputCls} maxLength={100} placeholder="Zscaler off-campus drive opens for 2026 grads" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
            <p className={`text-[11px] mt-1 ${form.headline.length > 0 && form.headline.length < 10 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              {form.headline.length}/100
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Bullets (shown on the card, max 3 × 120 chars)</label>
            {([1, 2, 3] as const).map((n) => (
              <input
                key={n}
                className={inputCls}
                maxLength={120}
                placeholder={n === 1 ? 'Applications close 30 Nov' : ''}
                value={form[`bullet${n}` as 'bullet1' | 'bullet2' | 'bullet3']}
                onChange={(e) => setForm({ ...form, [`bullet${n}`]: e.target.value } as FormState)}
              />
            ))}
          </div>

          {/* Image */}
          <div>
            <label className={labelCls}>Creative (9:16-ish, optional)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
              onClick={() => inputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer overflow-hidden ${dragOver ? 'border-[#0284C7] bg-sky-50' : 'border-gray-300 bg-white hover:border-[#0284C7]/50'}`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              {previewSrc ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview / API asset */}
                  <img src={previewSrc} alt="Drop preview" className="w-full aspect-[4/5] object-cover" />
                  <span className="absolute bottom-2 inset-x-0 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 text-white text-[11px] font-bold backdrop-blur">
                      {pendingImage ? pendingImage.file.name : form.image_file_name || 'Current image'} — click to replace
                    </span>
                  </span>
                </>
              ) : (
                <div className="py-8 px-4">
                  <ImageIcon className="w-7 h-7 text-[#0284C7] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#1E293B]">Drag & drop, or click to choose</p>
                  <p className="text-[12px] text-gray-500 mt-1">JPG / PNG / WEBP / AVIF · 6MB max</p>
                </div>
              )}
            </div>
            <div className="mt-2">
              <label className={labelCls}>Alt text</label>
              <input className={inputCls} maxLength={160} placeholder="Students at a drive registration desk" value={form.image_alt} onChange={(e) => setForm({ ...form, image_alt: e.target.value })} />
            </div>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Button text</label>
              <input className={inputCls} maxLength={32} placeholder="View vault" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Target slug</label>
              <input className={inputCls} placeholder="google" value={form.target_slug} onChange={(e) => setForm({ ...form, target_slug: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Internal route</label>
              <input className={inputCls} placeholder="/company/google" value={form.cta_route} onChange={(e) => setForm({ ...form, cta_route: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>External URL (wins over route)</label>
              <input className={inputCls} placeholder="https://…" value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} />
            </div>
          </div>

          {/* Body */}
          <div>
            <label className={labelCls}>Full article (markdown — opens on “Read More”)</label>
            <textarea className={`${inputCls} min-h-[110px] resize-y`} placeholder={"## Why this matters\n\nOne or two paragraphs…"} value={form.body_md} onChange={(e) => setForm({ ...form, body_md: e.target.value })} />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Publish at</label>
              <input type="datetime-local" className={inputCls} value={form.publish_at} onChange={(e) => setForm({ ...form, publish_at: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Expires at</label>
              <input type="datetime-local" className={inputCls} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Deadline</label>
              <input type="datetime-local" className={inputCls} value={form.deadline_at} onChange={(e) => setForm({ ...form, deadline_at: e.target.value })} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 -mt-2">
            Past deadlines and expired windows are hidden automatically — no manual unpublish needed.
          </p>

          {/* Tags + audience */}
          <div>
            <label className={labelCls}>Tags (comma separated)</label>
            <input className={inputCls} placeholder="campus, off-campus, 2026" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Grad years</label>
              <input className={inputCls} placeholder="2026, 2027" value={form.grad_years} onChange={(e) => setForm({ ...form, grad_years: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Branches</label>
              <input className={inputCls} placeholder="CSE, ECE" value={form.branches} onChange={(e) => setForm({ ...form, branches: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Colleges</label>
              <input className={inputCls} placeholder="IIT-B, NIT-T" value={form.colleges} onChange={(e) => setForm({ ...form, colleges: e.target.value })} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 -mt-2">Blank = everyone. Audience narrows the feed per viewer.</p>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="accent-[#0284C7] w-4 h-4" />
              Pin to top
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
              <input type="number" className="w-20 p-1.5 border border-gray-200 rounded-lg bg-[#FAFAF9] text-sm" placeholder="pri" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
              Priority
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
              <input type="checkbox" checked={form.sponsored} onChange={(e) => setForm({ ...form, sponsored: e.target.checked })} className="accent-[#B45309] w-4 h-4" />
              Sponsored
            </label>
            {form.sponsored && (
              <input className="w-40 p-1.5 border border-gray-200 rounded-lg bg-[#FAFAF9] text-sm" placeholder="Sponsor name" maxLength={40} value={form.sponsor_name} onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })} />
            )}
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {editingId ? 'Save Changes' : 'Create Drop'}
            </button>
          </div>
        </div>

        {/* ===== LIST ===== */}
        <div className="xl:col-span-3 space-y-3">
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading drops…
            </div>
          ) : drops.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center space-y-2">
              <Zap className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-[#1E293B]">No drops yet</p>
              <p className="text-[13px] text-gray-500 max-w-md mx-auto">
                Create the first card — a company update, an application deadline, a contest.
                Published drops appear on <code>/drops</code> immediately.
              </p>
            </div>
          ) : (
            drops.map((d) => {
              const st = statusPill(d);
              const meta = DROP_TYPE_META[d.type];
              return (
                <div key={d.id} className={`bg-white border rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row gap-4 ${editingId === d.id ? 'border-[#0284C7] ring-2 ring-[#0284C7]/15' : 'border-gray-200'}`}>
                  <div className="relative w-full sm:w-24 h-32 sm:h-auto shrink-0 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: meta.chip }}>
                    <span className="text-white text-[11px] font-extrabold uppercase tracking-wide px-2 text-center">{meta.label}</span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${st.cls}`}>{st.text}</span>
                      {d.pinned && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold"><Pin className="w-3 h-3" /> PINNED</span>}
                      {d.sponsored && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">AD</span>}
                      {d.source?.kind === 'auto' && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">AUTO</span>}
                    </div>
                    <p className="font-extrabold text-[#1E293B] text-sm mt-1">{d.headline}</p>
                    {d.bullets[0] && <p className="text-[12px] text-gray-500 line-clamp-1">{d.bullets[0]}</p>}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 font-mono">
                      <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {d.stats?.views || 0}</span>
                      <span>CTR {d.stats?.views ? Math.round(((d.stats?.cta_clicks || 0) / d.stats.views) * 100) : 0}%</span>
                      <span>{d.stats?.saves || 0} saves</span>
                      {d.publish_at && <span>Pub {fmtStamp(d.publish_at)}</span>}
                      {d.deadline_at && <span>Due {fmtStamp(d.deadline_at)}</span>}
                      {d.target_slug && <span>→ {d.target_slug}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        onClick={() => patch(d, { status: d.status === 'published' ? 'draft' : 'published' })}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${d.status === 'published' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {d.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => patch(d, { pinned: !d.pinned })}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${d.pinned ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-500 hover:bg-sky-50 hover:text-sky-700'}`}
                      >
                        {d.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <Link href={`/drops/${d.id}`} target="_blank" className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-500 hover:bg-sky-50 hover:text-sky-700">
                        View
                      </Link>
                      <button onClick={() => startEdit(d)} className="p-1.5 text-gray-500 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(d)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg ml-auto" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DropsTab;
