import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import {
  Zap, Trash2, Loader2, CheckCircle2, ShieldAlert, Pin, Pencil, Plus, ExternalLink,
  Image as ImageIcon, X, Eye, BarChart3, Copy, Archive, RotateCcw, Search, Film,
  Music, Volume2, Sparkles, CalendarClock, Send, FileText, Wand2, Heart, HelpCircle, Link2,
} from 'lucide-react';
import { apiAssetUrl } from '@/lib/api';
import {
  DROP_TYPE_META, DROP_TYPES, DROP_ARTS, DROP_MOTIONS, DROP_EFFECTS, DROP_TEXT_ANIMS, DROP_SOUNDS,
  adminFetchDropsApi, adminDropAnalyticsApi, adminCreateDropApi, adminUpdateDropApi, adminDeleteDropApi,
  uploadDropMediaApi,
  type AdminDrop, type DropAnalytics, type DropArt, type DropEffect, type DropFeedItem, type DropMotion,
  type DropSound, type DropTextAnim, type DropType, type DropWriteInput,
} from '@/lib/dropsApi';
import { playDropSound, unlockDropSound, stopDropSound } from '@/lib/dropSound';
import { DropCard } from '@/components/drops/DropCard';
import { DropMediaFitter, type FittedImage } from './DropMediaFitter';

/*
 * Admin control plane for Drops.
 *
 * Flow: write the copy → pick the look (upload a photo, which is fitted to the
 * 9:16 card before upload, or use a generated animated creative) → choose
 * motion, particle effect, headline entrance and sound → publish now, schedule
 * or keep as a draft. The phone on the right is the real <DropCard> with the
 * form's values, so what the admin sees is what students get.
 *
 * Liveness in the list is the server's own verdict (`list_status`), never a
 * client guess.
 */

const VIDEO_MAX = 40 * 1024 * 1024;
const AUDIO_MAX = 5 * 1024 * 1024;
const GIF_MAX = 10 * 1024 * 1024;
const RAW_IMAGE_MAX = 30 * 1024 * 1024;

const inputCls = 'w-full p-2.5 border border-gray-200 rounded-xl bg-app-warm text-sm focus:outline-none focus:ring-2 focus:ring-signal';
const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1';
const cardCls = 'bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4';

type When = 'now' | 'schedule' | 'draft';

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
  video_stored_name: '',
  audio_stored_name: '',
  art: 'auto' as DropArt,
  art_text: '',
  art_sub: '',
  motion: 'kenburns' as DropMotion,
  effect: 'none' as DropEffect,
  text_anim: 'rise' as DropTextAnim,
  sound: 'none' as DropSound,
  cta_label: '',
  cta_route: '',
  cta_url: '',
  video_url: '',
  target_slug: '',
  deadline_at: '',
  sponsored: false,
  sponsor_name: '',
  pinned: false,
  priority: '0',
  when: 'now' as When,
  keepStatus: '' as '' | 'published' | 'archived',
  publish_at: '',
  expires_at: '',
  tags: '',
  batches: '',
  branches: '',
  colleges: '',
  facts: [] as { label: string; value: string }[],
  source_name: '',
  source_url: '',
  quiz_question: '',
  quiz_options: ['', '', '', ''],
  quiz_answer: 0,
  quiz_explain: '',
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

const csv = (value: string): string[] => value.split(',').map((s) => s.trim()).filter(Boolean);

const fmtStamp = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** Quick schedule presets, computed in the admin's local time. */
const presetAt = (kind: 'hour' | 'tonight' | 'tomorrow' | 'week'): string => {
  const d = new Date();
  d.setSeconds(0, 0);
  if (kind === 'hour') d.setHours(d.getHours() + 1, 0);
  if (kind === 'tonight') { d.setHours(19, 0); if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1); }
  if (kind === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(9, 0); }
  if (kind === 'week') { d.setDate(d.getDate() + 7); d.setHours(9, 0); }
  return toLocalInput(d.toISOString());
};

const artPreviewUrl = (f: FormState) =>
  apiAssetUrl(
    `/api/covers/drop-art.svg?art=${encodeURIComponent(f.art)}&type=${encodeURIComponent(f.type)}&text=${encodeURIComponent(f.art_text)}&sub=${encodeURIComponent(f.art_sub)}&seed=${encodeURIComponent(f.headline.slice(0, 40))}`
  );

type ListTab = 'all' | 'live' | 'scheduled' | 'draft' | 'expired' | 'archived';
const LIST_TABS: { id: ListTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'draft', label: 'Drafts' },
  { id: 'expired', label: 'Expired' },
  { id: 'archived', label: 'Archived' },
];

const STATUS_PILL: Record<string, { text: string; cls: string }> = {
  live: { text: 'LIVE', cls: 'bg-emerald-100 text-emerald-800' },
  scheduled: { text: 'SCHEDULED', cls: 'bg-amber-100 text-amber-800' },
  draft: { text: 'DRAFT', cls: 'bg-gray-200 text-gray-600' },
  expired: { text: 'EXPIRED', cls: 'bg-red-100 text-red-700' },
  archived: { text: 'ARCHIVED', cls: 'bg-gray-200 text-gray-500' },
};

const noop = () => {};

/** The quiz as the API wants it: blank options dropped, answer re-indexed. */
const quizOf = (f: FormState) => {
  const filled = f.quiz_options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
  const answer = Math.max(0, filled.findIndex((x) => x.i === f.quiz_answer));
  return { question: f.quiz_question.trim(), options: filled.map((x) => x.o), answer, explain: f.quiz_explain.trim() || undefined };
};

const pct = (part?: number, whole?: number) => (whole ? Math.round(((part || 0) / whole) * 100) : 0);

export const DropsTab: React.FC = () => {
  const [drops, setDrops] = useState<AdminDrop[]>([]);
  const [caps, setCaps] = useState({ max_live: 100, max_per_day: 50 });
  const [analytics, setAnalytics] = useState<DropAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<'' | 'image' | 'video' | 'audio'>('');
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [fitting, setFitting] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string>('');
  const [tab, setTab] = useState<ListTab>('all');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DropType | ''>('');
  const [previewKey, setPreviewKey] = useState(0);
  const [articleTab, setArticleTab] = useState<'write' | 'preview'>('write');
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<number | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const flash = (text: string, type: 'ok' | 'err') => {
    setMsg({ text, type });
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setMsg(null), 6000);
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
  // effect (ref pattern copied from PostersTab/AdminCmsView).
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });
  useEffect(() => { loadRef.current(); }, []);
  useEffect(() => () => { stopDropSound(); }, []);
  useEffect(() => () => { if (localPreview.startsWith('blob:')) URL.revokeObjectURL(localPreview); }, [localPreview]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLocalPreview('');
  };

  // ─── uploads ────────────────────────────────────────────────────────────
  const uploadNow = async (file: File | Blob, name: string, kind: 'image' | 'video' | 'audio') => {
    setUploading(kind);
    try {
      const res = await uploadDropMediaApi(file, name);
      if (!res?.stored_name) throw new Error('Upload did not return a stored name — try again');
      if (kind === 'image') {
        setForm((prev) => ({ ...prev, image_stored_name: res.stored_name, image_file_name: res.file_name }));
      } else if (kind === 'video') {
        setForm((prev) => ({ ...prev, video_stored_name: res.stored_name }));
      } else {
        setForm((prev) => ({ ...prev, audio_stored_name: res.stored_name, sound: 'custom' }));
      }
      flash(`${kind === 'image' ? 'Image' : kind === 'video' ? 'Video' : 'Sound'} uploaded (${fmtSize(res.size_bytes)})`, 'ok');
    } catch (e: any) {
      flash(e?.message || 'Upload failed', 'err');
    } finally {
      setUploading('');
    }
  };

  const pickImage = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return flash('Choose an image file (JPG, PNG, WEBP, AVIF or GIF)', 'err');
    if (f.type === 'image/gif') {
      // Re-encoding would freeze the animation, so a GIF goes up as it is.
      if (f.size > GIF_MAX) return flash('GIF must be 10 MB or smaller', 'err');
      setLocalPreview(URL.createObjectURL(f));
      setForm((prev) => ({ ...prev, image_alt: prev.image_alt || prev.headline }));
      void uploadNow(f, f.name, 'image');
      return;
    }
    if (f.size > RAW_IMAGE_MAX) return flash('Image must be 30 MB or smaller', 'err');
    setFitting(f);
  };

  const onFitted = (out: FittedImage) => {
    setFitting(null);
    setLocalPreview(out.url);
    setForm((prev) => ({ ...prev, image_alt: prev.image_alt || prev.headline }));
    void uploadNow(out.blob, out.name, 'image');
  };

  const pickVideo = (f: File | undefined) => {
    if (!f) return;
    if (!/^video\/(mp4|webm)$/.test(f.type) && !/\.(mp4|webm)$/i.test(f.name)) return flash('Video must be MP4 or WEBM', 'err');
    if (f.size > VIDEO_MAX) return flash('Video must be 40 MB or smaller — trim it to 15–30 seconds', 'err');
    void uploadNow(f, f.name, 'video');
  };

  const pickAudio = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(mp3|wav|ogg|m4a)$/i.test(f.name)) return flash('Sound must be MP3, WAV, OGG or M4A', 'err');
    if (f.size > AUDIO_MAX) return flash('Sound must be 5 MB or smaller', 'err');
    void uploadNow(f, f.name, 'audio');
  };

  // ─── edit / save ────────────────────────────────────────────────────────
  const fromDrop = (d: AdminDrop): FormState => ({
    type: d.type,
    headline: d.headline,
    bullet1: d.bullets[0] || '',
    bullet2: d.bullets[1] || '',
    bullet3: d.bullets[2] || '',
    body_md: d.body_md || '',
    image_stored_name: d.image_stored_name || '',
    image_file_name: d.image_file_name || '',
    image_alt: d.image_alt || '',
    video_stored_name: d.video_stored_name || '',
    audio_stored_name: d.audio_stored_name || '',
    art: (d.art || 'auto') as DropArt,
    art_text: d.art_text || '',
    art_sub: d.art_sub || '',
    motion: (d.motion || 'kenburns') as DropMotion,
    effect: (d.effect || 'none') as DropEffect,
    text_anim: (d.text_anim || 'rise') as DropTextAnim,
    sound: (d.sound || 'none') as DropSound,
    cta_label: d.cta_label || '',
    cta_route: d.cta_route || '',
    cta_url: d.cta_url || '',
    video_url: d.video_url || '',
    target_slug: d.target_slug || '',
    deadline_at: toLocalInput(d.deadline_at),
    sponsored: d.sponsored,
    sponsor_name: d.sponsor_name || '',
    pinned: d.pinned,
    priority: String(d.priority ?? 0),
    when: d.status === 'draft' ? 'draft' : d.status === 'scheduled' ? 'schedule' : 'now',
    keepStatus: d.status === 'archived' ? 'archived' : d.status === 'published' ? 'published' : '',
    publish_at: toLocalInput(d.publish_at),
    expires_at: toLocalInput(d.expires_at),
    tags: d.tags.join(', '),
    batches: (d.audience?.batches || []).join(', '),
    branches: (d.audience?.branches || []).join(', '),
    colleges: (d.audience?.colleges || []).join(', '),
    facts: (d.facts || []).map((f) => ({ ...f })),
    source_name: d.source_name || '',
    source_url: d.source_url || '',
    quiz_question: d.quiz?.question || '',
    quiz_options: [0, 1, 2, 3].map((i) => d.quiz?.options[i] || ''),
    quiz_answer: d.quiz?.answer ?? 0,
    quiz_explain: d.quiz?.explain || '',
  });

  const startEdit = (d: AdminDrop) => {
    setEditingId(d.id);
    setForm(fromDrop(d));
    setLocalPreview('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildPayload = (f: FormState): DropWriteInput & Record<string, unknown> => {
    const audience: DropWriteInput['audience'] = {};
    const batches = csv(f.batches);
    if (batches.length) audience.batches = batches;
    const branches = csv(f.branches);
    if (branches.length) audience.branches = branches;
    const colleges = csv(f.colleges);
    if (colleges.length) audience.colleges = colleges;

    let status: DropWriteInput['status'] = 'published';
    let publish_at: string | null = fromLocalInput(f.publish_at);
    if (f.when === 'draft') status = 'draft';
    else if (f.when === 'schedule') status = 'scheduled';
    else {
      // "Now" — keep an existing past publish time, otherwise stamp the present.
      if (!publish_at || Date.parse(publish_at) > Date.now()) publish_at = new Date().toISOString();
    }
    if (f.keepStatus === 'archived' && f.when !== 'schedule') status = 'archived';

    return {
      type: f.type,
      headline: f.headline.trim(),
      bullets: [f.bullet1, f.bullet2, f.bullet3].map((b) => b.trim()).filter(Boolean),
      body_md: f.body_md,
      cta_label: f.cta_label.trim() || undefined,
      cta_route: f.cta_route.trim(),
      cta_url: f.cta_url.trim(),
      video_url: f.video_url.trim(),
      target_slug: f.target_slug.trim(),
      // null (not undefined) so clearing a date in the form clears it on the server.
      deadline_at: fromLocalInput(f.deadline_at) as string | undefined,
      expires_at: fromLocalInput(f.expires_at) as string | undefined,
      publish_at: publish_at as string | undefined,
      sponsored: f.sponsored,
      sponsor_name: f.sponsor_name.trim() || undefined,
      pinned: f.pinned,
      priority: Number(f.priority) || 0,
      status,
      tags: csv(f.tags),
      audience,
      image_alt: f.image_alt.trim() || undefined,
      image_stored_name: f.image_stored_name,
      image_file_name: f.image_file_name,
      video_stored_name: f.video_stored_name,
      audio_stored_name: f.audio_stored_name,
      art: f.art,
      art_text: f.art_text.trim(),
      art_sub: f.art_sub.trim(),
      motion: f.motion,
      effect: f.effect,
      text_anim: f.text_anim,
      sound: f.sound,
      facts: f.facts.map((x) => ({ label: x.label.trim(), value: x.value.trim() })).filter((x) => x.label && x.value),
      source_name: f.source_name.trim(),
      source_url: f.source_url.trim(),
      ...(f.type === 'quiz' ? { quiz: quizOf(f) } : {}),
    };
  };

  const validate = (f: FormState): string | null => {
    const h = f.headline.trim();
    if (h.length < 10) return 'Headline must be at least 10 characters';
    if (h.length > 100) return 'Headline must be 100 characters or fewer';
    if (f.type === 'quiz') {
      const q = quizOf(f);
      if (q.question.length < 5) return 'Write the quiz question';
      if (q.options.length < 2) return 'A quiz needs at least 2 options';
      if (!f.quiz_options[f.quiz_answer]?.trim()) return 'Mark which option is correct';
    } else {
      if (![f.bullet1, f.bullet2, f.bullet3].some((b) => b.trim())) return 'Add at least one bullet';
      if (!f.cta_route.trim() && !f.cta_url.trim() && !f.target_slug.trim() && !f.body_md.trim()) {
        return 'Add a button destination (route, URL or slug) or a Read More article';
      }
    }
    if (f.source_url.trim() && !/^https?:\/\//i.test(f.source_url.trim())) return 'The source link must start with https://';
    if (f.when === 'schedule') {
      const at = fromLocalInput(f.publish_at);
      if (!at) return 'Pick the date and time to publish';
      if (Date.parse(at) <= Date.now()) return 'The schedule time must be in the future';
    }
    if (f.sound === 'custom' && !f.audio_stored_name) return 'Upload a sound file for the custom sound';
    if (uploading) return 'Wait for the upload to finish';
    return null;
  };

  const handleSubmit = async () => {
    const problem = validate(form);
    if (problem) return flash(problem, 'err');
    setBusy(true);
    try {
      const payload = buildPayload(form);
      if (editingId) {
        await adminUpdateDropApi(editingId, payload);
        flash('Drop saved', 'ok');
      } else {
        await adminCreateDropApi(payload);
        flash(form.when === 'schedule' ? `Scheduled for ${fmtStamp(fromLocalInput(form.publish_at))}` : form.when === 'draft' ? 'Saved as draft' : 'Published — it is in the feed now', 'ok');
      }
      resetForm();
      await load();
    } catch (e: any) {
      flash(e?.message || 'Save failed', 'err');
    } finally {
      setBusy(false);
    }
  };

  const patch = async (d: AdminDrop, changes: Partial<DropWriteInput>, ok?: string) => {
    try {
      await adminUpdateDropApi(d.id, changes);
      if (ok) flash(ok, 'ok');
      await load();
    } catch (e: any) {
      flash(e?.message || 'Update failed', 'err');
    }
  };

  const duplicate = async (d: AdminDrop) => {
    try {
      const f = fromDrop(d);
      const payload = buildPayload({ ...f, when: 'draft', keepStatus: '', pinned: false });
      payload.headline = `Copy: ${d.headline}`.slice(0, 100);
      await adminCreateDropApi(payload);
      flash('Copied as a draft — edit and publish it', 'ok');
      await load();
    } catch (e: any) {
      flash(e?.message || 'Copy failed', 'err');
    }
  };

  const remove = async (d: AdminDrop) => {
    if (!window.confirm(`Delete "${d.headline}"? Its media and stats go too.`)) return;
    try {
      await adminDeleteDropApi(d.id);
      if (editingId === d.id) resetForm();
      flash('Drop deleted', 'ok');
      await load();
    } catch (e: any) {
      flash(e?.message || 'Delete failed', 'err');
    }
  };

  const previewSound = async () => {
    await unlockDropSound();
    playDropSound(form.sound, form.audio_stored_name ? apiAssetUrl(`/api/drops/file/${encodeURIComponent(form.audio_stored_name)}`) : null);
  };

  // ─── live preview item ──────────────────────────────────────────────────
  const imageSrc = localPreview || (form.image_stored_name ? `/api/drops/file/${encodeURIComponent(form.image_stored_name)}` : '');
  const previewItem: DropFeedItem = {
    id: editingId || 'preview',
    type: form.type,
    headline: form.headline || 'Your headline appears here',
    bullets: [form.bullet1, form.bullet2, form.bullet3].map((b) => b.trim()).filter(Boolean),
    image_url: imageSrc || artPreviewUrl(form),
    image_alt: form.image_alt || form.headline,
    cta_label: form.cta_label || 'Open',
    cta_route: null,
    cta_url: null,
    video_url: form.video_url || null,
    video_file_url: form.video_stored_name ? `/api/drops/file/${encodeURIComponent(form.video_stored_name)}` : null,
    target_slug: null,
    deadline_at: fromLocalInput(form.deadline_at),
    sponsored: form.sponsored,
    sponsor_name: form.sponsor_name || null,
    is_generated_art: !imageSrc,
    motion: form.motion,
    effect: form.effect,
    text_anim: form.text_anim,
    sound: form.sound,
    quiz: form.type === 'quiz' ? quizOf(form) : null,
    has_body: !!form.body_md.trim() || form.facts.some((x) => x.label && x.value),
  };

  // ─── list ───────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<ListTab, number> = { all: drops.length, live: 0, scheduled: 0, draft: 0, expired: 0, archived: 0 };
    for (const d of drops) {
      const s = d.list_status as ListTab;
      if (s in c) c[s] += 1;
    }
    return c;
  }, [drops]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = drops.filter((d) => {
      if (tab !== 'all' && d.list_status !== tab) return false;
      if (typeFilter && d.type !== typeFilter) return false;
      if (q && !`${d.headline} ${d.bullets.join(' ')} ${d.tags.join(' ')} ${d.target_slug || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (tab === 'scheduled') rows.sort((a, b) => String(a.publish_at).localeCompare(String(b.publish_at)));
    return rows;
  }, [drops, tab, query, typeFilter]);

  const whenLabel = form.when === 'schedule' ? 'Schedule drop' : form.when === 'draft' ? 'Save draft' : editingId ? 'Save & keep live' : 'Publish now';

  return (
    <div className="space-y-5">
      {fitting && <DropMediaFitter file={fitting} onCancel={() => setFitting(null)} onDone={onFitted} />}

      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-ink-soft flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-deep" /> Drops
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-3xl">
              Full-screen swipe cards on <code>/drops</code>. Upload a photo, GIF or short video — or use a generated animated
              poster — add motion, effects and sound, then publish now or schedule. Up to <strong>{caps.max_live} live</strong> at once
              and <strong>{caps.max_per_day} per day</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/drops" target="_blank" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-link border border-signal/30 bg-white hover:bg-signal-soft">
              <ExternalLink className="w-3.5 h-3.5" /> Open Drops
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold font-mono">
              {counts.live} live · {counts.scheduled} scheduled · {drops.length} total
            </span>
          </div>
        </div>

        {msg && (
          <div role="status" className={`mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {msg.text}
          </div>
        )}
      </div>

      {analytics && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs">
          <h4 className="text-sm font-extrabold text-ink-soft flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-link" /> Analytics
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
              <div key={String(label)} className="rounded-xl bg-app-warm border border-gray-100 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
                <p className="text-lg font-extrabold text-ink-soft font-mono">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== EDITOR + PHONE PREVIEW ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 px-1">
            <h4 className="text-sm font-extrabold text-ink-soft flex items-center gap-2">
              {editingId ? <Pencil className="w-4 h-4 text-link" /> : <Plus className="w-4 h-4 text-link" />}
              {editingId ? 'Edit drop' : 'New drop'}
            </h4>
            {editingId && (
              <button onClick={resetForm} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100">
                <X className="w-3 h-3" /> Cancel edit
              </button>
            )}
          </div>

          {/* 1. Content */}
          <section className={cardCls}>
            <h5 className="text-xs font-extrabold uppercase tracking-wide text-ink-soft flex items-center gap-1.5"><FileText className="w-4 h-4" /> 1 · Content</h5>
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.type} onChange={(e) => set('type', e.target.value as DropType)}>
                {DROP_TYPES.map((t) => <option key={t} value={t}>{DROP_TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Headline (10–100 characters)</label>
              <input className={inputCls} maxLength={100} placeholder="TCS NQT registrations are open for the 2026 batch" value={form.headline} onChange={(e) => set('headline', e.target.value)} />
              <p className={`text-xs mt-1 ${form.headline.length > 0 && form.headline.length < 10 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{form.headline.length}/100</p>
            </div>
            {form.type === 'quiz' ? (
              <div className="space-y-2 rounded-2xl border border-purple-200 bg-purple-50/50 p-3">
                <label className={labelCls}><HelpCircle className="inline w-3.5 h-3.5 mr-1" />Quiz question (shown on the card)</label>
                <textarea className={`${inputCls} min-h-[70px] font-mono`} maxLength={300} placeholder="What is the output of …" value={form.quiz_question} onChange={(e) => set('quiz_question', e.target.value)} />
                <p className="text-xs text-gray-500">Options — tick the correct one. Leave extra rows blank for 2 or 3 options.</p>
                {form.quiz_options.map((opt, i) => (
                  <label key={i} className="flex items-center gap-2">
                    <input type="radio" name="quiz-answer" className="accent-signal w-4 h-4" checked={form.quiz_answer === i} onChange={() => set('quiz_answer', i)} aria-label={`Option ${String.fromCharCode(65 + i)} is correct`} />
                    <span className="w-5 text-xs font-bold text-gray-500">{String.fromCharCode(65 + i)}</span>
                    <input className={inputCls} maxLength={100} value={opt} onChange={(e) => set('quiz_options', form.quiz_options.map((o, j) => (j === i ? e.target.value : o)))} />
                  </label>
                ))}
                <label className={labelCls}>Explanation (shown after answering)</label>
                <textarea className={`${inputCls} min-h-[60px]`} maxLength={400} value={form.quiz_explain} onChange={(e) => set('quiz_explain', e.target.value)} />
                <p className="text-xs text-gray-500">Label practice questions as practice — never call them previous-year questions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className={labelCls}>Bullets (1–3, up to 120 characters each)</label>
                {(['bullet1', 'bullet2', 'bullet3'] as const).map((k, i) => (
                  <input key={k} className={inputCls} maxLength={120} placeholder={i === 0 ? 'Applications close 30 Nov' : ''} value={form[k]} onChange={(e) => set(k, e.target.value)} />
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Button text</label>
                <input className={inputCls} maxLength={32} placeholder="Default for the category" value={form.cta_label} onChange={(e) => set('cta_label', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Opens page (route)</label>
                <input className={inputCls} placeholder="/company/tcs-nqt" value={form.cta_route} onChange={(e) => set('cta_route', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Or external link</label>
                <input className={inputCls} placeholder="https://…" value={form.cta_url} onChange={(e) => set('cta_url', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Company slug (for mutes)</label>
                <input className={inputCls} placeholder="tcs-nqt" value={form.target_slug} onChange={(e) => set('target_slug', e.target.value)} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={labelCls}>Story article (markdown — opens on “Read story”)</label>
                <div className="flex gap-1 mb-1">
                  {(['write', 'preview'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setArticleTab(t)} className={`px-2.5 py-1 rounded-lg text-xs font-bold ${articleTab === t ? 'bg-ink-soft text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {t === 'write' ? 'Write' : 'Preview'}
                    </button>
                  ))}
                </div>
              </div>
              {articleTab === 'write' ? (
                <textarea className={`${inputCls} min-h-[160px] resize-y font-mono text-[13px]`} placeholder={'## What is new\n\nOne or two short paragraphs.\n\n| Role | CTC |\n|---|---|\n| SE | ₹3.6 LPA |'} value={form.body_md} onChange={(e) => set('body_md', e.target.value)} />
              ) : (
                <div className="drop-story__article min-h-[160px] rounded-xl border border-gray-200 bg-white px-4 py-2">
                  {form.body_md.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.body_md}</ReactMarkdown> : <p className="text-sm text-gray-400">Nothing written yet.</p>}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Use ## headings, - lists and | tables |. About 150–250 words reads well.</p>
            </div>

            <div>
              <label className={labelCls}>Key facts (up to 6 — shown as tiles on the story page)</label>
              <div className="space-y-1.5">
                {form.facts.map((f, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input className={`${inputCls} w-2/5`} maxLength={24} placeholder="CTC" value={f.label} onChange={(e) => set('facts', form.facts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <input className={inputCls} maxLength={80} placeholder="₹4.5 LPA" value={f.value} onChange={(e) => set('facts', form.facts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                    <button type="button" onClick={() => set('facts', form.facts.filter((_, j) => j !== i))} className="px-2 text-gray-400 hover:text-red-600" aria-label="Remove fact"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {form.facts.length < 6 && (
                  <button type="button" onClick={() => set('facts', [...form.facts, { label: '', value: '' }])} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-600 hover:bg-gray-200">
                    <Plus className="inline w-3 h-3" /> Add fact
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><Link2 className="inline w-3.5 h-3.5 mr-1" />Official source link</label>
                <input className={inputCls} placeholder="https://careers.company.com" value={form.source_url} onChange={(e) => set('source_url', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Source name</label>
                <input className={inputCls} maxLength={60} placeholder="TCS careers" value={form.source_name} onChange={(e) => set('source_name', e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">Outside links always open through the “You are leaving TieEdu” page, never directly.</p>
          </section>

          {/* 2. Visual */}
          <section className={cardCls}>
            <h5 className="text-xs font-extrabold uppercase tracking-wide text-ink-soft flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> 2 · Visual</h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pickImage(e.dataTransfer.files?.[0]); }}
                className="rounded-2xl border-2 border-dashed border-gray-300 p-4 text-center hover:border-signal/60"
              >
                <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ''; }} />
                <ImageIcon className="w-6 h-6 text-link mx-auto" />
                <p className="mt-1.5 text-sm font-bold text-ink-soft">Photo, poster or GIF</p>
                <p className="text-xs text-gray-500">Auto-fitted to 1080×1920 · any size up to 30 MB · GIF up to 10 MB</p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  <button type="button" onClick={() => imageInput.current?.click()} className="px-3 py-1.5 rounded-lg bg-signal text-on-primary text-xs font-bold">
                    {uploading === 'image' ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : form.image_stored_name ? 'Replace image' : 'Choose image'}
                  </button>
                  {form.image_stored_name && (
                    <button type="button" onClick={() => { setForm((p) => ({ ...p, image_stored_name: '', image_file_name: '' })); setLocalPreview(''); }} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">
                      Remove — use generated art
                    </button>
                  )}
                </div>
                {form.image_file_name && <p className="mt-2 text-xs text-gray-500 truncate">{form.image_file_name}</p>}
              </div>

              <div className="rounded-2xl border-2 border-dashed border-gray-300 p-4 text-center">
                <input ref={videoInput} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => { pickVideo(e.target.files?.[0]); e.target.value = ''; }} />
                <Film className="w-6 h-6 text-link mx-auto" />
                <p className="mt-1.5 text-sm font-bold text-ink-soft">Short video (optional)</p>
                <p className="text-xs text-gray-500">MP4/WEBM up to 40 MB · vertical 9:16 looks best · loops on the card</p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  <button type="button" onClick={() => videoInput.current?.click()} className="px-3 py-1.5 rounded-lg bg-signal text-on-primary text-xs font-bold">
                    {uploading === 'video' ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : form.video_stored_name ? 'Replace video' : 'Choose video'}
                  </button>
                  {form.video_stored_name && (
                    <button type="button" onClick={() => set('video_stored_name', '')} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">Remove</button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Or YouTube / .mp4 link</label>
              <input className={inputCls} placeholder="https://youtu.be/…" value={form.video_url} onChange={(e) => set('video_url', e.target.value)} />
            </div>

            <div className="rounded-2xl bg-app-warm border border-gray-100 p-4 space-y-3">
              <p className="text-xs font-bold text-ink-soft flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-link" /> Generated animated poster {form.image_stored_name ? '(used only if you remove the image)' : '(used now — no image uploaded)'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Scene</label>
                  <select className={inputCls} value={form.art} onChange={(e) => set('art', e.target.value as DropArt)}>
                    {Object.entries(DROP_ARTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Big word (≤ 24)</label>
                  <input className={inputCls} maxLength={24} placeholder="50% OFF" value={form.art_text} onChange={(e) => set('art_text', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Small line (≤ 48)</label>
                  <input className={inputCls} maxLength={48} placeholder="Diwali Sale · till 10 Nov" value={form.art_sub} onChange={(e) => set('art_sub', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Alt text (for screen readers)</label>
              <input className={inputCls} maxLength={160} placeholder="Diyas and fireworks over a 50% off banner" value={form.image_alt} onChange={(e) => set('image_alt', e.target.value)} />
            </div>
          </section>

          {/* 3. Animation & sound */}
          <section className={cardCls}>
            <h5 className="text-xs font-extrabold uppercase tracking-wide text-ink-soft flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> 3 · Animation & sound</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Picture motion</label>
                <select className={inputCls} value={form.motion} onChange={(e) => set('motion', e.target.value as DropMotion)}>
                  {Object.entries(DROP_MOTIONS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Effect on top</label>
                <select className={inputCls} value={form.effect} onChange={(e) => set('effect', e.target.value as DropEffect)}>
                  {Object.entries(DROP_EFFECTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Headline entrance</label>
                <select className={inputCls} value={form.text_anim} onChange={(e) => set('text_anim', e.target.value as DropTextAnim)}>
                  {Object.entries(DROP_TEXT_ANIMS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className={labelCls}>Sound (plays when the card opens, if the student has sound on)</label>
                <select className={inputCls} value={form.sound} onChange={(e) => set('sound', e.target.value as DropSound)}>
                  {Object.entries(DROP_SOUNDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
              <button type="button" onClick={previewSound} disabled={form.sound === 'none'} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                <Volume2 className="w-4 h-4" /> Play
              </button>
              <input ref={audioInput} type="file" accept=".mp3,.wav,.ogg,.m4a,audio/*" className="hidden" onChange={(e) => { pickAudio(e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" onClick={() => audioInput.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-200">
                {uploading === 'audio' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                {form.audio_stored_name ? 'Replace sound file' : 'Upload sound'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs font-bold text-gray-500 mr-1 self-center">Quick looks:</span>
              {[
                { label: 'Diwali', v: { art: 'diwali-sale', motion: 'zoom', effect: 'fireworks', text_anim: 'pop', sound: 'diwali' } },
                { label: 'Celebration', v: { art: 'trophy', motion: 'zoom', effect: 'confetti', text_anim: 'pop', sound: 'success' } },
                { label: 'Hiring', v: { art: 'hiring', motion: 'kenburns', effect: 'stars', text_anim: 'rise', sound: 'whoosh' } },
                { label: 'Urgent deadline', v: { art: 'countdown', motion: 'pulse', effect: 'none', text_anim: 'pop', sound: 'alert' } },
                { label: 'Calm', v: { motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'chime' } },
              ].map((p) => (
                <button key={p.label} type="button" onClick={() => setForm((prev) => ({ ...prev, ...(p.v as Partial<FormState>) }))} className="px-2.5 py-1 rounded-lg bg-signal-soft text-link text-xs font-bold hover:bg-signal/20">
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* 4. Publish & schedule */}
          <section className={cardCls}>
            <h5 className="text-xs font-extrabold uppercase tracking-wide text-ink-soft flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> 4 · Publish</h5>
            {form.keepStatus === 'archived' && (
              <p className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">
                This drop is archived. Saving keeps it archived — use “Restore” in the list to bring it back.
              </p>
            )}
            <div className="grid grid-cols-3 gap-1.5">
              {([['now', 'Publish now'], ['schedule', 'Schedule'], ['draft', 'Draft']] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => set('when', k)} className={`rounded-xl px-3 py-2.5 text-xs font-bold ${form.when === k ? 'bg-signal text-on-primary' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            {form.when === 'schedule' && (
              <div className="space-y-2">
                <label className={labelCls}>Goes live at</label>
                <input type="datetime-local" className={inputCls} value={form.publish_at} onChange={(e) => set('publish_at', e.target.value)} />
                <div className="flex flex-wrap gap-1.5">
                  {([['hour', 'In 1 hour'], ['tonight', 'Tonight 7 PM'], ['tomorrow', 'Tomorrow 9 AM'], ['week', 'Next week']] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => set('publish_at', presetAt(k))} className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-bold text-gray-600 hover:bg-gray-200">{label}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Take down at (optional)</label>
                <input type="datetime-local" className={inputCls} value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Deadline countdown (optional)</label>
                <input type="datetime-local" className={inputCls} value={form.deadline_at} onChange={(e) => set('deadline_at', e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">Expired drops and passed job/deadline drops leave the feed on their own.</p>

            <details className="rounded-2xl border border-gray-100 bg-app-warm p-3">
              <summary className="cursor-pointer text-xs font-bold text-gray-600">Audience, tags and priority</summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Batches</label>
                    <input className={inputCls} placeholder="2026, 2027" value={form.batches} onChange={(e) => set('batches', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Branches</label>
                    <input className={inputCls} placeholder="CSE, ECE" value={form.branches} onChange={(e) => set('branches', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Colleges</label>
                    <input className={inputCls} placeholder="GLA University Mathura" value={form.colleges} onChange={(e) => set('colleges', e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 -mt-1">Blank = everyone.</p>
                <div>
                  <label className={labelCls}>Tags (comma separated)</label>
                  <input className={inputCls} placeholder="diwali, offer" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input type="checkbox" checked={form.pinned} onChange={(e) => set('pinned', e.target.checked)} className="accent-signal w-4 h-4" /> Pin to top
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Priority
                    <select className="p-1.5 border border-gray-200 rounded-lg bg-white text-sm" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                      <option value="0">Normal</option>
                      <option value="1">Important</option>
                      <option value="2">Urgent</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input type="checkbox" checked={form.sponsored} onChange={(e) => set('sponsored', e.target.checked)} className="accent-amber-deep w-4 h-4" /> Sponsored
                  </label>
                  {form.sponsored && (
                    <input className="w-40 p-1.5 border border-gray-200 rounded-lg bg-white text-sm" placeholder="Sponsor name" maxLength={40} value={form.sponsor_name} onChange={(e) => set('sponsor_name', e.target.value)} />
                  )}
                </div>
              </div>
            </details>

            <button
              onClick={handleSubmit}
              disabled={busy || !!uploading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-signal text-on-primary rounded-cell text-sm font-bold transition-colors disabled:opacity-60 shadow-edge-primary active:translate-y-0.5 active:shadow-edge-selected"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : form.when === 'schedule' ? <CalendarClock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {whenLabel}
            </button>
          </section>
        </div>

        {/* Phone preview — the real card component. */}
        <aside className="xl:sticky xl:top-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">Live preview</p>
            <button type="button" onClick={() => setPreviewKey((k) => k + 1)} className="inline-flex items-center gap-1 text-xs font-bold text-link">
              <RotateCcw className="w-3.5 h-3.5" /> Replay
            </button>
          </div>
          <div className="mx-auto w-[340px] rounded-[2.4rem] border-[10px] border-gray-900 bg-gray-900 shadow-xl">
            <div className="h-[600px] overflow-hidden rounded-[1.7rem]" key={previewKey}>
              <DropCard
                item={previewItem}
                saved={false}
                active
                onCta={noop}
                onReadMore={noop}
                onSave={noop}
                onShare={noop}
                onNotInterested={noop}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* ===== LIST ===== */}
      <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {LIST_TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${tab === t.id ? 'bg-ink-soft text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t.label} <span className="font-mono opacity-75">{counts[t.id]}</span>
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select className="p-2 border border-gray-200 rounded-xl bg-app-warm text-xs" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as DropType | '')}>
              <option value="">All categories</option>
              {DROP_TYPES.map((t) => <option key={t} value={t}>{DROP_TYPE_META[t].label}</option>)}
            </select>
            <label className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl bg-app-warm text-xs w-48" placeholder="Search drops" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading drops…
          </div>
        ) : shown.length === 0 ? (
          <div className="p-10 text-center space-y-1">
            <Zap className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-ink-soft">{drops.length === 0 ? 'No drops yet' : 'Nothing matches'}</p>
            <p className="text-sm text-gray-500">{drops.length === 0 ? 'Create the first one above.' : 'Change the tab, category or search.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {shown.map((d, i) => {
              const st = STATUS_PILL[d.list_status] || STATUS_PILL.draft;
              // Scheduled tab reads as a calendar: a header for each new day.
              const day = d.publish_at ? new Date(d.publish_at).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '';
              const prevDay = i > 0 && shown[i - 1].publish_at ? new Date(shown[i - 1].publish_at!).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '';
              const dayHeader = tab === 'scheduled' && day && day !== prevDay;
              const thumb = d.image_url || d.art_url;
              return (
                <React.Fragment key={d.id}>
                {dayHeader && (
                  <p className="lg:col-span-2 mt-2 text-xs font-extrabold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" /> {day}
                  </p>
                )}
                <div className={`border rounded-2xl p-3 flex gap-3 ${editingId === d.id ? 'border-signal ring-2 ring-signal/15' : 'border-gray-200'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- API asset / generated SVG */}
                  <img src={apiAssetUrl(thumb)} alt="" className="w-[72px] h-[128px] shrink-0 rounded-xl object-cover bg-gray-900" loading="lazy" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide ${st.cls}`}>{st.text}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: DROP_TYPE_META[d.type]?.chip }}>{DROP_TYPE_META[d.type]?.label}</span>
                      {d.pinned && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-soft text-link text-[11px] font-bold"><Pin className="w-3 h-3" /> PINNED</span>}
                      {d.video_stored_name && <Film className="w-3.5 h-3.5 text-gray-500" aria-label="Has video" />}
                      {d.sound && d.sound !== 'none' && <Music className="w-3.5 h-3.5 text-gray-500" aria-label="Has sound" />}
                      {d.effect && d.effect !== 'none' && <Sparkles className="w-3.5 h-3.5 text-gray-500" aria-label="Has effect" />}
                    </div>
                    <p className="font-extrabold text-ink-soft text-sm leading-snug line-clamp-2">{d.headline}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500 font-mono">
                      <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {d.stats?.views || 0}</span>
                      <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" /> {d.stats?.likes || 0}</span>
                      <span title="Opened the story">Read {pct(d.stats?.reads, d.stats?.views)}%</span>
                      <span title="Swiped past in under 1.5 s">Skip {pct(d.stats?.skips, d.stats?.views)}%</span>
                      <span title="Average time on the card">{d.stats?.views ? Math.round((d.stats.dwell_ms_total || 0) / d.stats.views / 100) / 10 : 0}s</span>
                      <span>CTR {pct(d.stats?.cta_clicks, d.stats?.views)}%</span>
                      {(d.stats?.outbound || 0) > 0 && <span title="Continued to the outside site">Out {d.stats?.outbound}</span>}
                      {d.publish_at && <span>{d.list_status === 'scheduled' ? 'Goes live' : 'Pub'} {fmtStamp(d.publish_at)}</span>}
                      {d.expires_at && <span>Ends {fmtStamp(d.expires_at)}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {d.status === 'archived' ? (
                        <button onClick={() => patch(d, { status: 'draft' }, 'Restored as a draft')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                      ) : d.status === 'published' ? (
                        <button onClick={() => patch(d, { status: 'draft' }, 'Unpublished')} className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Unpublish</button>
                      ) : (
                        <button onClick={() => patch(d, { status: 'published', publish_at: new Date().toISOString() }, 'Published')} className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700">Publish now</button>
                      )}
                      <button onClick={() => patch(d, { pinned: !d.pinned })} className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-signal-soft hover:text-link">
                        {d.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <Link href={`/drops/${d.id}`} target="_blank" className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-signal-soft hover:text-link">View</Link>
                      <button onClick={() => startEdit(d)} className="p-1.5 text-gray-500 hover:text-link hover:bg-signal-soft rounded-lg" title="Edit" aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => duplicate(d)} className="p-1.5 text-gray-500 hover:text-link hover:bg-signal-soft rounded-lg" title="Duplicate" aria-label="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                      {d.status !== 'archived' && (
                        <button onClick={() => patch(d, { status: 'archived' }, 'Archived')} className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg" title="Archive" aria-label="Archive"><Archive className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => remove(d)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg ml-auto" title="Delete" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DropsTab;
