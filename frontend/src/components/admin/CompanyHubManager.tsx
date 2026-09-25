import React, { useState } from 'react';
import { Company } from '@/types';
import { BrandTile } from '@/components/common/BrandTile';
import { createCompanyApi, updateCompanyApi, deleteCompanyApi } from '@/lib/api';
import { Plus, Edit3, Trash2, Building, X, CheckCircle2 } from 'lucide-react';

interface CompanyHubManagerProps {
  companies: Company[];
  onRefresh: () => void;
  onSelect: (companyId: string) => void;
}

const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]";
const labelCls = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1";

export const CompanyHubManager: React.FC<CompanyHubManagerProps> = ({ companies, onRefresh, onSelect }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    name: '', slug: '', industry: 'Tech & IT Services', tags: '', logo_url: '',
    ctc_min: null as number | null, ctc_max: null as number | null, avg_rounds: null as number | null, difficulty_rating: 0,
    avg_process_days: null as number | null, accuracy_score: null as number | null, status: 'draft',
    seo_title: '', seo_description: ''
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', slug: '', industry: 'Tech & IT Services', tags: '', logo_url: '', ctc_min: null, ctc_max: null, avg_rounds: null, difficulty_rating: 0, avg_process_days: null, accuracy_score: null, status: 'draft', seo_title: '', seo_description: '' });
    setShowModal(true);
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      name: c.name, slug: c.slug, industry: c.industry, tags: (c.tags || []).join(', '), logo_url: c.logo_url,
      ctc_min: c.ctc_min ?? null, ctc_max: c.ctc_max ?? null, avg_rounds: c.avg_rounds ?? null,
      avg_process_days: c.avg_process_days ?? null, difficulty_rating: c.difficulty_rating ?? 0,
      accuracy_score: c.accuracy_score ?? null, status: c.status,
      seo_title: c.seo_title, seo_description: c.seo_description,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setMsg('');
    try {
      const payload = { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
      if (editing) {
        await updateCompanyApi(editing.id, payload);
        setMsg('Company updated');
      } else {
        await createCompanyApi(payload);
        setMsg('Company created');
      }
      setTimeout(() => { setShowModal(false); onRefresh(); setMsg(''); setSaving(false); }, 700);
    } catch (e: any) {
      setMsg(e.message || 'Failed');
      setSaving(false);
    }
  };

  const handleDelete = async (c: Company) => {
    if (!confirm(`Delete ${c.name} hub? This removes all its modules & content.`)) return;
    await deleteCompanyApi(c.id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-[#1E293B] flex items-center gap-2">
            <Building className="w-5 h-5 text-[#0284C7]" /> Company Hub Directory
          </h3>
          <p className="text-xs text-gray-500">{companies.length} companies · full metadata CRUD</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors">
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {msg && <p className="text-xs text-emerald-700 font-bold">{msg}</p>}

      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAFAF9] border-b border-gray-200 text-gray-500 uppercase font-mono text-[10px]">
            <tr>
              <th className="p-4">Company Hub</th>
              <th className="p-4">Category</th>
              <th className="p-4">CTC</th>
              <th className="p-4">Rounds</th>
              <th className="p-4">Difficulty</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDEDEB]">
            {companies.map((c) => (
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
                <td className="p-4 text-gray-600">{c.industry}</td>
                <td className="p-4 text-emerald-700 font-bold font-mono">₹{c.ctc_min}–{c.ctc_max}L</td>
                <td className="p-4 font-mono text-gray-500">{c.avg_rounds}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.difficulty_rating >= 4 ? 'bg-red-100 text-red-700' : c.difficulty_rating >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {c.difficulty_rating}/5
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.status === 'published' ? 'bg-emerald-100 text-emerald-800' : c.status === 'draft' ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'}`}>
                    {c.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg" title="Edit company">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { onSelect(c.id); }} className="px-3 py-1 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg text-xs font-bold" title="Manage content">
                      Manage
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete company">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && <tr><td className="p-10 text-center text-gray-400 italic" colSpan={7}>No companies yet — add your first company.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="font-bold text-base text-[#1E293B]">{editing ? `Edit ${editing.name}` : 'Add New Company'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Company Name *</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Zscaler" />
              </div>
              <div>
                <label className={labelCls}>Slug (URL)</label>
                <input className={inputCls} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().trim().replace(/\s+/g, '-') })} placeholder="zscaler" />
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <input className={inputCls} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Tags (comma separated)</label>
                <input className={inputCls} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Zero Trust, Network Security" />
              </div>
              <div>
                <label className={labelCls}>Logo URL</label>
                <input className={inputCls} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>CTC Min (LPA)</label>
                  <input className={inputCls} type="number" value={form.ctc_min ?? ""} onChange={(e) => setForm({ ...form, ctc_min: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <label className={labelCls}>CTC Max (LPA)</label>
                  <input className={inputCls} type="number" value={form.ctc_max ?? ""} onChange={(e) => setForm({ ...form, ctc_max: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Avg Rounds</label>
                  <input className={inputCls} type="number" min={1} max={8} value={form.avg_rounds ?? ""} onChange={(e) => setForm({ ...form, avg_rounds: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <label className={labelCls}>Process Days</label>
                  <input className={inputCls} type="number" value={form.avg_process_days ?? ""} onChange={(e) => setForm({ ...form, avg_process_days: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div>
                  <label className={labelCls}>Difficulty (1-5)</label>
                  <input className={inputCls} type="number" min={0} max={5} value={form.difficulty_rating} onChange={(e) => setForm({ ...form, difficulty_rating: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={labelCls}>Accuracy %</label>
                  <p className="text-xs text-gray-400 leading-relaxed pt-1">Auto-derived from published candidate reports — cannot be set manually.</p>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>SEO Title</label>
                <input className={inputCls} value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>SEO Description</label>
                <textarea rows={2} className={inputCls} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={saving} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <CheckCircle2 className="w-4 h-4" />} {saving ? 'Saving...' : editing ? 'Update Company' : 'Create Company'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};