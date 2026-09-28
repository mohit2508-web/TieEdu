import React, { useMemo, useState } from 'react';
import { Company, MetricProvenance, ProvenanceMap } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import { createCompanyApi, updateCompanyApi, deleteCompanyApi } from '@/lib/api';
import { Plus, Edit3, Trash2, Building, X, CheckCircle2, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';

interface CompanyHubManagerProps {
  companies: Company[];
  onRefresh: () => void;
  onSelect: (companyId: string) => void;
}

const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]";
const labelCls = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1";

/** Matches the RoundType union the compare pipeline normalises to. */
const ROUND_TYPE_OPTIONS = ['OA', 'Technical', 'System Design', 'HR'] as const;

/** The editorial metrics that require provenance, keyed the same way the API stores them. */
const METRIC_KEYS = ['ctc', 'process_days', 'rounds', 'difficulty', 'round_1_oa', 'round_2_tech', 'round_3_system_design', 'round_4_hr'] as const;

type FormState = {
  name: string; slug: string; logo_url: string; industry: string; tags: string;
  tagline: string; about: string; hq: string; founded_year: string; employee_band: string;
  careers_link: string; fact_checked_at: string;
  ctc_min: string; ctc_max: string; avg_rounds: string; avg_process_days: string; difficulty_rating: string;
  round_1_oa: string; round_2_tech: string; round_3_system_design: string; round_4_hr: string;
  metric_sources: ProvenanceMap;
  rounds_pipeline: PipelineStepForm[];
  seo_title: string; seo_description: string;
  status: 'draft' | 'published' | 'archived';
};

/** One row of the recruitment pipeline. `round_type` must match a RoundType. */
type PipelineStepForm = {
  round_type: string;
  title: string;
  subtitle: string;
  module_count: string;
};

const emptyForm = (): FormState => ({
  name: '', slug: '', logo_url: '', industry: '', tags: '',
  tagline: '', about: '', hq: '', founded_year: '', employee_band: '',
  careers_link: '', fact_checked_at: '',
  ctc_min: '', ctc_max: '', avg_rounds: '', avg_process_days: '', difficulty_rating: '',
  round_1_oa: '', round_2_tech: '', round_3_system_design: '', round_4_hr: '',
  metric_sources: {},
  rounds_pipeline: [],
  seo_title: '', seo_description: '',
  status: 'draft',
});

const toForm = (c: Company): FormState => ({
  name: c.name || '', slug: c.slug || '', logo_url: c.logo_url || '',
  industry: c.industry || '', tags: (c.tags || []).join(', '),
  tagline: c.tagline || '', about: c.about || '', hq: c.hq || '',
  founded_year: c.founded_year != null ? String(c.founded_year) : '',
  employee_band: c.employee_band || '', careers_link: c.careers_link || '',
  fact_checked_at: c.fact_checked_at ? c.fact_checked_at.slice(0, 10) : '',
  ctc_min: c.ctc_min != null ? String(c.ctc_min) : '',
  ctc_max: c.ctc_max != null ? String(c.ctc_max) : '',
  avg_rounds: c.avg_rounds != null ? String(c.avg_rounds) : '',
  avg_process_days: c.avg_process_days != null ? String(c.avg_process_days) : '',
  difficulty_rating: c.difficulty_rating ? String(c.difficulty_rating) : '',
  round_1_oa: c.comparison_metrics?.round_1_oa || '',
  round_2_tech: c.comparison_metrics?.round_2_tech || '',
  round_3_system_design: c.comparison_metrics?.round_3_system_design || '',
  round_4_hr: c.comparison_metrics?.round_4_hr || '',
  metric_sources: c.metric_sources || {},
  rounds_pipeline: (c.rounds_pipeline || []).map((r) => ({
    round_type: r.round_type || '',
    title: r.title || '',
    subtitle: r.subtitle || '',
    module_count: r.module_count != null ? String(r.module_count) : '',
  })),
  seo_title: c.seo_title || '', seo_description: c.seo_description || '',
  status: c.status,
});

const numOrUndef = (v: string) => (v.trim() === '' ? null : Number(v));

export const CompanyHubManager: React.FC<CompanyHubManagerProps> = ({ companies, onRefresh, onSelect }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);

  const sourcedCount = useMemo(
    () => METRIC_KEYS.filter((k) => !!form.metric_sources?.[k]?.source).length,
    [form.metric_sources]
  );

  const openNew = () => { setEditing(null); setForm(emptyForm()); setError(''); setShowModal(true); };

  const openEdit = (c: Company) => { setEditing(c); setForm(toForm(c)); setError(''); setShowModal(true); };

  const setProv = (key: string, patch: Partial<MetricProvenance> | null) => {
    setForm((f) => {
      const next: ProvenanceMap = { ...(f.metric_sources || {}) };
      if (patch === null) next[key] = null;
      else next[key] = { source: '', verified_at: '', note: '', ...(next[key] || {}), ...patch } as MetricProvenance;
      return { ...f, metric_sources: next };
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Company name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        logo_url: form.logo_url.trim(),
        industry: form.industry.trim(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        tagline: form.tagline.trim(),
        about: form.about.trim(),
        hq: form.hq.trim(),
        founded_year: numOrUndef(form.founded_year),
        employee_band: form.employee_band.trim(),
        careers_link: form.careers_link.trim(),
        fact_checked_at: form.fact_checked_at.trim() || null,
        ctc_min: numOrUndef(form.ctc_min),
        ctc_max: numOrUndef(form.ctc_max),
        avg_rounds: numOrUndef(form.avg_rounds),
        avg_process_days: numOrUndef(form.avg_process_days),
        difficulty_rating: numOrUndef(form.difficulty_rating),
        comparison_metrics: {
          round_1_oa: form.round_1_oa.trim() || null,
          round_2_tech: form.round_2_tech.trim() || null,
          round_3_system_design: form.round_3_system_design.trim() || null,
          round_4_hr: form.round_4_hr.trim() || null,
        },
        metric_sources: form.metric_sources,
        // Only steps with a round_type survive — a half-typed row would render
        // as a blank card on the public vault.
        rounds_pipeline: form.rounds_pipeline
          .filter((r) => r.round_type.trim() !== '')
          .map((r, i) => ({
            step_number: i + 1,
            round_type: r.round_type.trim(),
            title: r.title.trim() || r.round_type.trim(),
            subtitle: r.subtitle.trim(),
            difficulty: 'medium' as const,
            module_count: numOrUndef(r.module_count) ?? 0,
          })),
        seo_title: form.seo_title.trim(),
        seo_description: form.seo_description.trim(),
        status: form.status,
      };
      if (payload.slug === undefined) delete payload.slug;

      if (editing) {
        await updateCompanyApi(editing.id, payload);
      } else {
        await createCompanyApi(payload);
      }
      setShowModal(false);
      onRefresh();
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Company) => {
    if (!confirm(`Delete ${c.name}? This permanently removes all its modules and content.`)) return;
    await deleteCompanyApi(c.id);
    onRefresh();
  };

  /** How many of this company's editorial metrics have a recorded source. */
  const coverageOf = (c: Company) => {
    const srcs = c.metric_sources || {};
    return METRIC_KEYS.filter((k) => !!srcs[k]?.source).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-extrabold text-[#1E293B] flex items-center gap-2">
            <Building className="w-5 h-5 text-[#0284C7]" /> Company Hub Directory
          </h3>
          <p className="text-xs text-gray-500">
            {companies.length} companies · every profile field and editorial metric is yours to write
          </p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors">
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[820px]">
          <thead className="bg-[#FAFAF9] border-b border-gray-200 text-gray-500 uppercase font-mono text-[10px]">
            <tr>
              <th className="p-4">Company Hub</th>
              <th className="p-4">Profile</th>
              <th className="p-4">CTC</th>
              <th className="p-4">Sourced</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDEDEB]">
            {companies.map((c) => {
              const profileFilled = ['tagline', 'about', 'hq', 'founded_year', 'employee_band', 'careers_link']
                .filter((f) => {
                  const v = (c as any)[f];
                  return v != null && v !== '' && !(typeof v === 'number' && v <= 0);
                }).length;
              const sourced = coverageOf(c);
              return (
                <tr key={c.id} className="hover:bg-[#FAFAF9]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <BrandTile name={c.name} src={c.logo_url} className="w-9 h-9 rounded-xl p-1" />
                      <div>
                        <span className="font-bold text-[#1E293B] text-sm block">{c.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">/{c.slug} · {c.modules?.length || 0} modules</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-14 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full bg-sky-600" style={{ width: `${Math.max(4, (profileFilled / 6) * 100)}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-gray-500">{profileFilled}/6</span>
                    </div>
                  </td>
                  <td className="p-4 text-emerald-700 font-bold font-mono">
                    {c.ctc_min != null && c.ctc_max != null ? `₹${c.ctc_min}–${c.ctc_max}L` : '—'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      sourced === METRIC_KEYS.length ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sourced}/{METRIC_KEYS.length}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      c.status === 'published' ? 'bg-emerald-100 text-emerald-800' : c.status === 'draft' ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg" title="Edit company profile">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onSelect(c.id)} className="px-3 py-1 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg text-xs font-bold" title="Manage content">
                        Manage
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete company">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {companies.length === 0 && (
              <tr><td className="p-10 text-center text-gray-400 italic" colSpan={6}>No companies yet — add your first company.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-gray-200 space-y-5 my-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="font-bold text-base text-[#1E293B]">
                {editing ? `Edit ${editing.name}` : 'Add New Company'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>

            {/* ------- Identity ------- */}
            <Section title="Identity" blurb="What this company is and where it lives.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Company Name *</label>
                  <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Slug (URL)</label>
                  <input
                    className={inputCls}
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().trim().replace(/\s+/g, '-') })}
                    placeholder="auto from name"
                  />
                </div>
                <div>
                  <label className={labelCls}>Logo URL</label>
                  <input className={inputCls} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
                </div>
                <div>
                  <label className={labelCls}>Industry</label>
                  <input className={inputCls} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Leave blank if unknown" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Tagline</label>
                  <input className={inputCls} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="One line shown under the company name" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>About this company</label>
                  <textarea rows={4} className={inputCls} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} placeholder="What the company does, and what its hiring process is like. Written from real knowledge — the site shows an honest gap if you leave this blank." />
                </div>
                <div>
                  <label className={labelCls}>Headquarters</label>
                  <input className={inputCls} value={form.hq} onChange={(e) => setForm({ ...form, hq: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Founded (year)</label>
                  <input className={inputCls} type="number" value={form.founded_year} onChange={(e) => setForm({ ...form, founded_year: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Company size</label>
                  <input className={inputCls} value={form.employee_band} onChange={(e) => setForm({ ...form, employee_band: e.target.value })} placeholder="1,000–5,000" />
                </div>
                <div>
                  <label className={labelCls}>Official careers link</label>
                  <input className={inputCls} value={form.careers_link} onChange={(e) => setForm({ ...form, careers_link: e.target.value })} placeholder="https://careers.company.com" />
                </div>
                <div>
                  <label className={labelCls}>Profile fact-checked on</label>
                  <input className={inputCls} type="date" value={form.fact_checked_at} onChange={(e) => setForm({ ...form, fact_checked_at: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Tags (comma separated)</label>
                  <input className={inputCls} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
              </div>
            </Section>

            {/* ------- Hiring metrics + provenance ------- */}
            <Section
              title="Hiring metrics"
              blurb="These are your claims, not measured facts. Record where each number came from and it becomes sourced; leave the source empty and the public page labels it unverified."
              right={
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                  sourcedCount === METRIC_KEYS.length ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {sourcedCount}/{METRIC_KEYS.length} sourced
                </span>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>CTC Min (LPA)</label>
                  <input className={inputCls} type="number" value={form.ctc_min} onChange={(e) => setForm({ ...form, ctc_min: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>CTC Max (LPA)</label>
                  <input className={inputCls} type="number" value={form.ctc_max} onChange={(e) => setForm({ ...form, ctc_max: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Avg rounds</label>
                  <input className={inputCls} type="number" min={1} max={8} value={form.avg_rounds} onChange={(e) => setForm({ ...form, avg_rounds: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Process days</label>
                  <input className={inputCls} type="number" value={form.avg_process_days} onChange={(e) => setForm({ ...form, avg_process_days: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricField
                  label="CTC range"
                  hasValue={form.ctc_min.trim() !== '' || form.ctc_max.trim() !== ''}
                  value={form.metric_sources.ctc}
                  onChange={(p) => setProv('ctc', p)}
                />
                <MetricField
                  label="Process duration"
                  hasValue={form.avg_process_days.trim() !== ''}
                  value={form.metric_sources.process_days}
                  onChange={(p) => setProv('process_days', p)}
                />
                <MetricField
                  label="Round count"
                  hasValue={form.avg_rounds.trim() !== ''}
                  value={form.metric_sources.rounds}
                  onChange={(p) => setProv('rounds', p)}
                />
                <div className="rounded-xl border border-gray-200 p-2.5 space-y-2 bg-white">
                  <label className={labelCls}>Difficulty (1–5)</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={5}
                    value={form.difficulty_rating}
                    onChange={(e) => setForm({ ...form, difficulty_rating: e.target.value })}
                  />
                </div>
                <MetricField
                  label="Difficulty"
                  hasValue={Number(form.difficulty_rating) > 0}
                  value={form.metric_sources.difficulty}
                  onChange={(p) => setProv('difficulty', p)}
                />
              </div>

              {/* ------- Round-by-round notes ------- */}
              <div className="space-y-3 mt-4">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Round notes are compared side by side on the compare page. A note with no source is shown in
                  muted text and badged &ldquo;Unverified&rdquo; — it is never presented as a confirmed format.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NoteField
                    label="Round 1 · Online assessment"
                    value={form.round_1_oa} onChange={(v) => setForm({ ...form, round_1_oa: v })}
                    prov={form.metric_sources.round_1_oa} onProv={(p) => setProv('round_1_oa', p)}
                  />
                  <NoteField
                    label="Round 2 · Technical core"
                    value={form.round_2_tech} onChange={(v) => setForm({ ...form, round_2_tech: v })}
                    prov={form.metric_sources.round_2_tech} onProv={(p) => setProv('round_2_tech', p)}
                  />
                  <NoteField
                    label="Round 3 · System design"
                    value={form.round_3_system_design} onChange={(v) => setForm({ ...form, round_3_system_design: v })}
                    prov={form.metric_sources.round_3_system_design} onProv={(p) => setProv('round_3_system_design', p)}
                  />
                  <NoteField
                    label="Round 4 · HR & values"
                    value={form.round_4_hr} onChange={(v) => setForm({ ...form, round_4_hr: v })}
                    prov={form.metric_sources.round_4_hr} onProv={(p) => setProv('round_4_hr', p)}
                  />
                </div>
              </div>
            </Section>

            {/* ------- Recruitment pipeline ------- */}
            <Section
              title="Recruitment pipeline"
              blurb="The stepper shown on the public vault. Every line here renders on the company page, so only add a step you can defend. Leave the whole list empty and the page falls back to the rounds its modules declare — or shows nothing."
            >
              <div className="space-y-3">
                {form.rounds_pipeline.length === 0 && (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-3 py-3 text-[11.5px] text-gray-500">
                    No custom pipeline. The public page will derive steps from the vault&apos;s own modules, so the
                    stepper can never claim a round the vault does not contain.
                  </p>
                )}

                {form.rounds_pipeline.map((step, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold text-[#1E293B] uppercase tracking-wider shrink-0">
                        Step {i + 1}
                      </span>
                      <select
                        className={inputCls}
                        value={step.round_type}
                        onChange={(e) => {
                          const next = [...form.rounds_pipeline];
                          next[i] = { ...step, round_type: e.target.value };
                          setForm({ ...form, rounds_pipeline: next });
                        }}
                      >
                        <option value="">Choose a round…</option>
                        {ROUND_TYPE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, rounds_pipeline: form.rounds_pipeline.filter((_, x) => x !== i) })}
                        className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors shrink-0"
                        title="Remove this step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        className={inputCls}
                        value={step.title}
                        onChange={(e) => {
                          const next = [...form.rounds_pipeline];
                          next[i] = { ...step, title: e.target.value };
                          setForm({ ...form, rounds_pipeline: next });
                        }}
                        placeholder={`Title (defaults to "${step.round_type || 'the round'}")`}
                      />
                      <input
                        className={inputCls}
                        value={step.subtitle}
                        onChange={(e) => {
                          const next = [...form.rounds_pipeline];
                          next[i] = { ...step, subtitle: e.target.value };
                          setForm({ ...form, rounds_pipeline: next });
                        }}
                        placeholder="Subtitle (duration, format)"
                      />
                      <input
                        className={inputCls}
                        type="number"
                        min={0}
                        value={step.module_count}
                        onChange={(e) => {
                          const next = [...form.rounds_pipeline];
                          next[i] = { ...step, module_count: e.target.value };
                          setForm({ ...form, rounds_pipeline: next });
                        }}
                        placeholder="Modules"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    rounds_pipeline: [...form.rounds_pipeline, { round_type: '', title: '', subtitle: '', module_count: '' }],
                  })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-[11.5px] font-bold text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add pipeline step
                </button>
              </div>
            </Section>

            <Section title="Search & sharing" blurb="Leave blank to publish no meta description — an empty tag beats a claim you cannot back.">
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>SEO Title</label>
                  <input className={inputCls} value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>SEO Description</label>
                  <textarea rows={2} className={inputCls} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Visibility</label>
                  <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState['status'] })}>
                    <option value="published">Published — visible to everyone</option>
                    <option value="draft">Draft — hidden from the public site</option>
                    <option value="archived">Archived — hidden</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-500 flex items-start gap-1.5 leading-relaxed">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  Accuracy, rating and unlock counts cannot be set here. They are counted from real candidate
                  reports and orders on every request.
                </p>
              </div>
            </Section>

            {error && (
              <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? 'Saving…' : editing ? 'Save Company' : 'Create Company'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; blurb?: string; right?: React.ReactNode; children: React.ReactNode }> = ({
  title, blurb, right, children,
}) => (
  <div className="space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="text-[13px] font-extrabold text-[#1E293B]">{title}</h4>
        {blurb && <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5 max-w-xl">{blurb}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

/**
 * A metric value's provenance. An empty source is stored as an explicit null, so
 * the public page shows an honest "unverified" state instead of inheriting a
 * stale source from a previous edit.
 */
const MetricField: React.FC<{
  label: string;
  hasValue: boolean;
  value?: MetricProvenance | null;
  onChange: (patch: Partial<MetricProvenance> | null) => void;
}> = ({ label, hasValue, value, onChange }) => {
  if (!hasValue) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-3 py-2.5">
        <p className="text-[11px] font-bold text-gray-500">{label} — no value entered</p>
        <p className="text-[10.5px] text-gray-400 mt-0.5">The public page will say &ldquo;not recorded&rdquo; for this.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold text-[#1E293B] uppercase tracking-wider">{label} · source</span>
        {value?.source
          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><ShieldCheck className="w-3 h-3" /> Sourced</span>
          : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700"><ShieldAlert className="w-3 h-3" /> Unverified</span>}
      </div>
      <input
        className={inputCls}
        value={value?.source || ''}
        onChange={(e) => onChange({ source: e.target.value, verified_at: value?.verified_at || '', note: value?.note || '' })}
        placeholder="Where did this number come from? (URL, offer letter, notice)"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          className={inputCls}
          type="date"
          value={(value?.verified_at || '').slice(0, 10)}
          onChange={(e) => onChange({ source: value?.source || '', verified_at: e.target.value, note: value?.note || '' })}
        />
        <input
          className={inputCls}
          value={value?.note || ''}
          onChange={(e) => onChange({ source: value?.source || '', verified_at: value?.verified_at || '', note: e.target.value })}
          placeholder="Note (optional)"
        />
      </div>
    </div>
  );
};

const NoteField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  prov?: MetricProvenance | null;
  onProv: (patch: Partial<MetricProvenance> | null) => void;
}> = ({ label, value, onChange, prov, onProv }) => (
  <div className="rounded-xl border border-gray-200 p-2.5 space-y-2 bg-white">
    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
    <textarea
      rows={3}
      className={inputCls}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Describe the actual format. Leave blank if you do not know it."
    />
    {value.trim() !== '' && (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Source</span>
          {prov?.source
            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><ShieldCheck className="w-3 h-3" /> Sourced</span>
            : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700"><ShieldAlert className="w-3 h-3" /> Unverified</span>}
        </div>
        <input
          className={inputCls}
          value={prov?.source || ''}
          onChange={(e) => onProv({ source: e.target.value, verified_at: prov?.verified_at || '', note: prov?.note || '' })}
          placeholder="Where did you learn this format?"
        />
        <input
          className={inputCls}
          type="date"
          value={(prov?.verified_at || '').slice(0, 10)}
          onChange={(e) => onProv({ source: prov?.source || '', verified_at: e.target.value, note: prov?.note || '' })}
        />
      </div>
    )}
  </div>
);
