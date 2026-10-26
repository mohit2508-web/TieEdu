import React, { useState, useEffect } from 'react';
import { fetchCouponsApi, createCouponApi, updateCouponApi, deleteCouponApi } from '@/lib/api';
import { Plus, Trash2, Tag, CheckCircle2, X } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  discount_flat: number;
  is_active: boolean;
  max_uses: number;
  uses: number;
  label: string;
  expires_at?: string | null;
  applies_to_course_ids?: string[];
  applies_to_branch?: string | null;
}

const BRANCH_OPTIONS = ['', 'year1', 'cse', 'ai-ds', 'ece', 'eee', 'mech', 'civil', 'career', 'tools'];

const emptyForm = () => ({
  code: '',
  label: '',
  discount_percent: 0,
  discount_flat: 0,
  max_uses: 0,
  is_active: true,
  expires_at: '',
  applies_to_course_ids: '',
  applies_to_branch: '',
});

const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl bg-app-warm text-sm focus:outline-none focus:ring-2 focus:ring-signal";

export const CouponsManager: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = () => fetchCouponsApi().then((c) => setCoupons(c));
  useEffect(() => { load(); }, []);

  const flash = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 2500);
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) return flash('Coupon code required', 'error');
    try {
      // Scope ships as the server expects it: course ids as a list (comma
      // input is a convenience), an empty branch as "unscoped". Unknown ids
      // are dropped server-side, so a typo degrades to a narrower offer,
      // never to a broken deep-link.
      const payload = {
        ...form,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        applies_to_course_ids: form.applies_to_course_ids.split(',').map((v) => v.trim()).filter(Boolean),
        applies_to_branch: form.applies_to_branch || null,
      };
      if (editingId) {
        await updateCouponApi(editingId, payload);
        flash('Coupon updated');
      } else {
        await createCouponApi(payload);
        flash('Coupon created');
      }
      setForm(emptyForm());
      setEditingId(null);
      load();
    } catch (e: any) {
      flash(e.message || 'Failed', 'error');
    }
  };

  const toggleActive = async (c: Coupon) => {
    await updateCouponApi(c.id, { ...c, is_active: !c.is_active });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await deleteCouponApi(id);
    load();
    flash('Coupon deleted');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs">
        <h3 className="text-base font-extrabold text-ink-soft flex items-center gap-2 mb-1">
          <Tag className="w-5 h-5 text-amber-deep" /> Discount Coupons
        </h3>
        <p className="text-xs text-gray-500 mb-4">Server-side validated. Frontend sirf backend se jo coupons bheje wo dikhaye.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Code</label>
            <input className={inputCls} placeholder="SAVE20" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Label</label>
            <input className={inputCls} placeholder="20% Placement Discount" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">% Off</label>
            <input className={inputCls} type="number" min={0} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Flat ₹</label>
            <input className={inputCls} type="number" min={0} value={form.discount_flat} onChange={(e) => setForm({ ...form, discount_flat: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Uses (0=∞)</label>
            <input className={inputCls} type="number" min={0} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expires (empty=never)</label>
            <input className={inputCls} type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Only these course ids (comma-separated, empty=all)</label>
            <input className={inputCls} placeholder="crs-..., crs-..." value={form.applies_to_course_ids} onChange={(e) => setForm({ ...form, applies_to_course_ids: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Only branch (empty=all)</label>
            <select className={inputCls} value={form.applies_to_branch} onChange={(e) => setForm({ ...form, applies_to_branch: e.target.value })}>
              {BRANCH_OPTIONS.map((b) => (
                <option key={b} value={b}>{b === '' ? 'All branches' : b}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Scoped offers appear in the landing strip with a deep-link to their course; at checkout they discount
          only the matching lines. Expiry hides the offer from the strip the moment it passes.
        </p>

        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-signal w-4 h-4" />
            Active
          </label>
          <button onClick={handleSubmit} className="inline-flex items-center gap-2 px-4 py-2.5 bg-signal hover:bg-signal text-white rounded-xl text-xs font-bold transition-colors">
            {editingId ? 'Update Coupon' : <><Plus className="w-4 h-4" /> Create Coupon</>}
          </button>
          {editingId && (
            <button onClick={() => { setEditingId(null); setForm(emptyForm()); }} className="text-xs font-bold text-gray-500 hover:underline">
              Cancel edit
            </button>
          )}
          {msg && <span className={`text-xs font-bold ${msg.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </div>

      {/* Coupon list */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-app-warm border-b border-gray-200 text-gray-500 uppercase font-mono text-xs">
            <tr>
              <th className="p-4">Code</th>
              <th className="p-4">Label</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Uses</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(coupons || []).map((c) => (
              <tr key={c.id} className="hover:bg-app-warm">
                <td className="p-4">
                  <span className="font-mono font-bold text-brand-ink bg-indigo-50 px-2 py-1 rounded-lg">{c.code}</span>
                  {(c.expires_at || (c.applies_to_course_ids || []).length > 0 || c.applies_to_branch) && (
                    <span className="mt-1 block max-w-[220px] text-xs font-semibold text-gray-500">
                      {c.expires_at ? `Expires ${new Date(c.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'No expiry'}
                      {(c.applies_to_course_ids || []).length > 0 ? ` · ${(c.applies_to_course_ids || []).length} course(s)` : ''}
                      {c.applies_to_branch ? ` · ${c.applies_to_branch}` : ''}
                    </span>
                  )}
                </td>
                <td className="p-4 text-gray-600">{c.label}</td>
                <td className="p-4 font-bold text-emerald-700">
                  {c.discount_percent > 0 ? `${c.discount_percent}% OFF` : `₹${c.discount_flat} OFF`}
                </td>
                <td className="p-4">
                  <button onClick={() => toggleActive(c)} className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'}`}>
                    {c.is_active ? 'ACTIVE' : 'PAUSED'}
                  </button>
                </td>
                <td className="p-4 font-mono text-gray-500">{c.uses}{c.max_uses > 0 ? ` / ${c.max_uses}` : ' / ∞'}</td>
                <td className="p-4 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button onClick={() => { setEditingId(c.id); setForm({ ...emptyForm(), code: c.code, label: c.label || '', discount_percent: c.discount_percent || 0, discount_flat: c.discount_flat || 0, max_uses: c.max_uses || 0, is_active: !!c.is_active, expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '', applies_to_course_ids: (c.applies_to_course_ids || []).join(', '), applies_to_branch: c.applies_to_branch || '' }); }} className="p-1.5 text-gray-500 hover:text-signal hover:bg-signal-soft rounded-lg" title="Edit">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => remove(c.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(coupons || []).length === 0 && (
              <tr><td className="p-8 text-center text-gray-400 italic" colSpan={6}>No coupons yet — create your first discount code above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};