import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Megaphone, Trash2, Loader2, CheckCircle2, ShieldAlert, Star,
  ArrowUp, ArrowDown, Pencil, Plus, ExternalLink, ImageIcon, X, Eye
} from 'lucide-react';
import { HeroPosterAdmin } from '@/types';
import {
  apiAssetUrl, fetchAdminPostersApi, createHeroPosterApi, updateHeroPosterApi,
  deleteHeroPosterApi, uploadPosterImageApi
} from '@/lib/api';

/*
 * Admin control plane for the landing hero's rotating posters.
 *
 * The whole point of this tab is that the owner decides which ad is on the
 * homepage — the image, the copy burned over it, the link, the order and the run
 * window. Nothing here is cosmetic: every control maps to a field the public
 * GET /api/posters actually honours, and the status pill is the server's own
 * liveness verdict rather than a client guess.
 */

const MAX_SIZE = 6 * 1024 * 1024;
const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]";
const labelCls = "block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1";

/** Fastest in-app destinations an admin usually points a poster at. */
const LINK_PRESETS = [
  { label: 'Compare Companies', href: '/compare' },
  { label: 'Auto Study Plan', href: '/study-plan' },
  { label: 'Course Catalog', href: '/courses' },
  { label: 'Campus Dashboard', href: '/campus' },
];

const EMPTY_FORM = {
  image_stored_name: '',
  image_file_name: '',
  badge: '',
  title: '',
  subtitle: '',
  cta_label: '',
  href: '',
  alt_text: '',
  is_active: true,
  is_featured: false,
  sort_order: '',
  start_at: '',
  end_at: '',
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

const fmtSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const fmtStamp = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const PostersTab: React.FC = () => {
  const [posters, setPosters] = useState<HeroPosterAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingImage, setPendingImage] = useState<{ file: File; url: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Object URLs for the just-picked file have to be revoked on unmount, and the
  // cleanup below cannot read state from the render that registered it.
  const pendingRef = useRef<{ file: File; url: string } | null>(null);

  const flash = (text: string, type: 'ok' | 'err') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = async () => {
    try {
      setPosters(await fetchAdminPostersApi());
    } catch (e: any) {
      flash(e?.message || 'Poster list load nahi hui', 'err');
    } finally {
      setLoading(false);
    }
  };

  // `load` reads the auth token, so it must not be a dependency of the mount
  // effect: a refresh triggered while the session was still resolving would
  // render the signed-out view. A ref keeps the identity stable, the same fix
  // AdminCmsView uses for its store sync.
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
    setProgress(null);
    setPending(null);
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return flash('Sirf image file (JPG / PNG / WEBP / AVIF) allowed hai', 'err');
    if (f.size > MAX_SIZE) return flash('Image 6MB se bada hai', 'err');
    setPending({ file: f, url: URL.createObjectURL(f) });
    setForm(prev => ({ ...prev, alt_text: prev.alt_text || f.name.replace(/\.[a-z0-9]+$/i, '') }));
  };

  const startEdit = (p: HeroPosterAdmin) => {
    setPending(null);
    setProgress(null);
    setEditingId(p.id);
    setForm({
      image_stored_name: p.image_stored_name,
      image_file_name: p.image_file_name,
      badge: p.badge,
      title: p.title,
      subtitle: p.subtitle,
      cta_label: p.cta_label,
      href: p.href,
      alt_text: p.alt_text,
      is_active: p.is_active,
      is_featured: p.is_featured,
      sort_order: String(p.sort_order),
      start_at: toLocalInput(p.start_at),
      end_at: toLocalInput(p.end_at),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadImage = async (): Promise<{ stored_name: string; file_name: string }> => {
    if (!pendingImage) return { stored_name: '', file_name: '' };
    setBusy(true);
    setProgress(0);
    try {
      const res = await uploadPosterImageApi(pendingImage.file, setProgress);
      setPending(null);
      flash('Image upload ho gayi — ab poster save karein', 'ok');
      return { stored_name: res.stored_name, file_name: res.file_name };
    } catch (e: any) {
      flash(e?.message || 'Image upload fail hui', 'err');
      return { stored_name: '', file_name: '' };
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() && !form.cta_label.trim() && !pendingImage && !form.image_stored_name) {
      return flash('Creative ya title — kuch to chahiye', 'err');
    }
    setBusy(true);
    try {
      // The picked file is uploaded first so the poster row can reference a
      // stored name; a failure there must not create a text-only poster.
      const uploaded = pendingImage ? await uploadImage() : { stored_name: '', file_name: '' };
      if (pendingImage && !uploaded.stored_name) return;

      const payload: any = {
        badge: form.badge,
        title: form.title,
        subtitle: form.subtitle,
        cta_label: form.cta_label,
        href: form.href,
        alt_text: form.alt_text,
        is_active: form.is_active,
        is_featured: form.is_featured,
        sort_order: form.sort_order === '' ? undefined : Number(form.sort_order),
        start_at: fromLocalInput(form.start_at),
        end_at: fromLocalInput(form.end_at),
      };
      if (uploaded.stored_name) {
        payload.image_stored_name = uploaded.stored_name;
        payload.image_file_name = uploaded.file_name;
      }

      if (editingId) {
        await updateHeroPosterApi(editingId, payload);
        flash('Poster update ho gaya', 'ok');
      } else {
        await createHeroPosterApi(payload);
        flash('Poster live ho gaya — abhi homepage par dikhega', 'ok');
      }
      resetForm();
      await load();
    } catch (e: any) {
      flash(e?.message || 'Save fail hua', 'err');
    } finally {
      setBusy(false);
    }
  };

  const patch = async (p: HeroPosterAdmin, changes: any) => {
    try {
      await updateHeroPosterApi(p.id, changes);
      await load();
    } catch (e: any) {
      flash(e?.message || 'Update fail hua', 'err');
    }
  };

  const remove = async (p: HeroPosterAdmin) => {
    if (!confirm(`"${p.title || p.image_file_name}" delete karein? Image file bhi permanently hat jayegi.`)) return;
    try {
      await deleteHeroPosterApi(p.id);
      if (editingId === p.id) resetForm();
      flash('Poster delete ho gaya', 'ok');
      await load();
    } catch (e: any) {
      flash(e?.message || 'Delete fail hua', 'err');
    }
  };

  /** Swap sort_order with the neighbour so the admin never types raw numbers. */
  const move = async (p: HeroPosterAdmin, dir: -1 | 1) => {
    const i = posters.findIndex(x => x.id === p.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= posters.length) return;
    const a = posters[i];
    const b = posters[j];
    if (a.sort_order === b.sort_order) return;
    await patch(a, { sort_order: b.sort_order });
    await patch(b, { sort_order: a.sort_order });
  };

  const previewSrc = pendingImage?.url || (form.image_stored_name ? apiAssetUrl(`/api/posters/file/${encodeURIComponent(form.image_stored_name)}`) : '');
  const liveCount = useMemo(() => posters.filter(p => p.is_live).length, [posters]);

  const statusOf = (p: HeroPosterAdmin) => {
    if (p.is_live) return { text: 'LIVE', cls: 'bg-emerald-100 text-emerald-800' };
    if (!p.is_active) return { text: 'PAUSED', cls: 'bg-gray-200 text-gray-600' };
    const now = Date.now();
    if (p.start_at && !Number.isNaN(Date.parse(p.start_at)) && now < Date.parse(p.start_at)) {
      return { text: 'SCHEDULED', cls: 'bg-amber-100 text-amber-800' };
    }
    return { text: 'EXPIRED', cls: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#1E293B] flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#B45309]" /> Hero Posters — Landing Page Big Banners
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-3xl">
              Yehi creatives homepage ke hero mein 3D orbit ki jagah rotate hoti hain. Image + text + link —
              sab aapke control mein. Sirf <strong>LIVE</strong> posters students ko dikhte hain.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0284C7] border border-[#B8E3F7] bg-white hover:bg-[#E8F4FB]">
              <ExternalLink className="w-3.5 h-3.5" /> Homepage par dekhein
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold font-mono">
              {liveCount} live / {posters.length} total
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

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
        {/* ===== EDITOR ===== */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-extrabold text-[#1E293B] flex items-center gap-2">
              {editingId ? <Pencil className="w-4 h-4 text-[#0284C7]" /> : <Plus className="w-4 h-4 text-[#0284C7]" />}
              {editingId ? 'Edit Poster' : 'New Poster'}
            </h4>
            {editingId && (
              <button onClick={resetForm} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-500 hover:bg-gray-100">
                <X className="w-3 h-3" /> Cancel
              </button>
            )}
          </div>

          {/* Image */}
          <div>
            <label className={labelCls}>Poster Image</label>
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
                  {/*
                   * A local preview of the file the admin has just picked, held as
                   * a data URL from `FileReader` — it is not on any origin yet, so
                   * there is nothing for the optimizer to fetch. The sibling row
                   * above is a real `/api/posters` URL and *is* optimised; this one
                   * cannot be, which is the difference rather than an inconsistency.
                   */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL file preview, see above */}
                  <img src={previewSrc} alt="Poster preview" width={640} height={800} className="w-full aspect-[4/5] object-cover" />
                  <span className="absolute bottom-2 inset-x-0 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 text-white text-[11px] font-bold backdrop-blur">
                      {pendingImage ? `${pendingImage.file.name} (${fmtSize(pendingImage.file.size)})` : form.image_file_name || 'Current image'} — click to replace
                    </span>
                  </span>
                </>
              ) : (
                <div className="py-10 px-4">
                  <ImageIcon className="w-7 h-7 text-[#0284C7] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#1E293B]">Drag & drop, ya click karke choose karein</p>
                  <p className="text-[12px] text-gray-500 mt-1">JPG / PNG / WEBP / AVIF • 6MB max</p>
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              Recommended: <strong>1200 × 1500 px (4:5)</strong>. Mobile par 16:10 crop hota hai — important text
              frame ke beech-middle mein rakhein, corners par nahi.
            </p>
            {progress !== null && (
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-2">
                <div className="h-full bg-[#0284C7] transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          {/* Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className={labelCls}>Badge</label>
              <input className={inputCls} maxLength={24} placeholder="NEW" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Button Text (CTA)</label>
              <input className={inputCls} maxLength={32} placeholder="Explore Vault" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Headline</label>
            <input className={inputCls} maxLength={80} placeholder="2026 Google Drive — Full Vault" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <label className={labelCls}>Sub-line</label>
            <textarea className={`${inputCls} min-h-[70px] resize-y`} maxLength={160} placeholder="Round-by-round questions, DSA code aur system-design flowcharts." value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>

          <div>
            <label className={labelCls}>Click Link</label>
            <input className={inputCls} placeholder="/company/google  ya  https://partner.com" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {LINK_PRESETS.map(preset => (
                <button
                  key={preset.href}
                  type="button"
                  onClick={() => setForm({ ...form, href: preset.href })}
                  className="px-2 py-1 rounded-lg bg-[#FAFAF9] border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-[#0284C7] hover:text-[#0284C7]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Link khaali chhodne par poster click nahi hoga. External link naya tab mein khulta hai.
            </p>
          </div>

          <div>
            <label className={labelCls}>Alt Text (screen readers ke liye)</label>
            <input className={inputCls} maxLength={160} placeholder="Google drive vault offer" value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Starts</label>
              <input type="datetime-local" className={inputCls} value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Ends</label>
              <input type="datetime-local" className={inputCls} value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <input type="number" className={inputCls} placeholder="auto" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 -mt-2">Chhota number = pehle dikhta hai. Date khaali = koi limit nahi.</p>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-[#0284C7] w-4 h-4" />
              Active
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700" title="Featured on = sirf yehi poster rotate hoga">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-[#E8A33D] w-4 h-4" />
              Featured only
            </label>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {editingId ? 'Save Changes' : (pendingImage ? 'Upload & Publish' : 'Publish Poster')}
            </button>
          </div>
        </div>

        {/* ===== LIST ===== */}
        <div className="xl:col-span-3 space-y-3">
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Posters load ho rahe hain…
            </div>
          ) : posters.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center space-y-2">
              <Megaphone className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-[#1E293B]">Abhi koi poster nahi hai</p>
              <p className="text-[13px] text-gray-500 max-w-md mx-auto">
                Left side se image upload karke pehla poster publish karein. Jab tak koi LIVE poster nahi hoga,
                homepage par 3D orbit fallback chalega.
              </p>
            </div>
          ) : (
            posters.map((p, i) => {
              const st = statusOf(p);
              return (
                <div key={p.id} className={`bg-white border rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row gap-4 ${editingId === p.id ? 'border-[#0284C7] ring-2 ring-[#0284C7]/15' : 'border-gray-200'}`}>
                  {/*
                   * The height lives on THIS div now, and it has to.
                   *
                   * `h-40 sm:h-full` used to sit on the `<img>` itself, which was
                   * the only thing giving the box a height. `fill` positions the
                   * image absolutely, so it contributes nothing to layout, and
                   * moving the classes here is what keeps the thumbnail from
                   * collapsing to a 0px sliver. `relative` is what makes `fill` have
                   * something to measure against.
                   */}
                  <div className="relative w-full sm:w-28 h-40 sm:h-full shrink-0 rounded-2xl overflow-hidden bg-[#0E2A44]">
                    {/*
                     * Optimised after all. The old comment here said "not an
                     * optimisable next/image source", which was only true while
                     * `images.remotePatterns` was inert. Posters are uploaded
                     * through `POST /api/posters`, which accepts only
                     * `.jpg/.jpeg/.png/.webp/.avif`, so the source is always a
                     * raster on our own origin.
                     *
                     * Worth it here because a poster is a full-size marketing
                     * creative — often a 1000px+ PNG — painted into a 112px admin
                     * thumbnail. The grid was pulling the original for every row.
                     * `fill` on the already-`relative` parent avoids a second
                     * wrapper element just to supply dimensions.
                     */}
                    <Image
                      src={apiAssetUrl(p.image_url)}
                      alt={p.alt_text || 'Poster'}
                      fill
                      sizes="(min-width: 640px) 112px, 100vw"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${st.cls}`}>{st.text}</span>
                          {p.is_featured && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-600" /> FEATURED
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-mono font-bold">#{i + 1}</span>
                        </div>
                        <p className="font-extrabold text-[#1E293B] text-sm mt-1.5 truncate">
                          {p.badge && <span className="text-[#B45309] mr-1.5">{p.badge}</span>}
                          {p.title || <span className="text-gray-400 italic">No headline</span>}
                        </p>
                        {p.subtitle && <p className="text-[12px] text-gray-500 line-clamp-1 mt-0.5">{p.subtitle}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 font-mono">
                      <span className="inline-flex items-center gap-1 max-w-full">
                        <Eye className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.href || 'no link'}</span>
                      </span>
                      {p.cta_label && <span>CTA: {p.cta_label}</span>}
                      {p.start_at && <span>From {fmtStamp(p.start_at)}</span>}
                      {p.end_at && <span>To {fmtStamp(p.end_at)}</span>}
                      {p.image_file_name && <span className="truncate">{p.image_file_name}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        onClick={() => patch(p, { is_active: !p.is_active })}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${p.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {p.is_active ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => patch(p, { is_featured: !p.is_featured })}
                        title="Sirf is poster ko homepage par dikhayein"
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${p.is_featured ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-700'}`}
                      >
                        {p.is_featured ? 'Unfeature' : 'Feature only'}
                      </button>
                      <button onClick={() => startEdit(p)} className="p-1.5 text-gray-500 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => move(p, -1)} disabled={i === 0} className="p-1.5 text-gray-500 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent" title="Move up">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => move(p, 1)} disabled={i === posters.length - 1} className="p-1.5 text-gray-500 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent" title="Move down">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(p)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg ml-auto" title="Delete">
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

export default PostersTab;
