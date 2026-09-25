import React, { useEffect, useState, useCallback } from 'react';
import { fetchAdminUsersApi, setUserDisabledApi, grantUnlockApi, revokeUnlockApi, fetchUnlocksApi, AdminUserRow } from '@/lib/api';
import { Company } from '@/types';
import { Ban, KeyRound, RefreshCw, Search, ShieldCheck, Unlock, UserPlus, X } from 'lucide-react';

const fmtInr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const UsersTab: React.FC<{ companies: Company[] }> = ({ companies }) => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [modalUser, setModalUser] = useState<AdminUserRow | null>(null);
  const [unlockedFor, setUnlockedFor] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsersApi(search);
      setUsers(data.users || []);
      setMeta(data.meta || null);
    } catch (e: any) {
      setError(e?.message || 'Accounts could not be loaded');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleDisabled = async (u: AdminUserRow) => {
    setBusy(true);
    setNotice(null);
    try {
      await setUserDisabledApi(u.id, !u.disabled);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, disabled: !u.disabled } : x)));
      setNotice(`${u.name} is now ${u.disabled ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      setNotice(e?.message || 'Status change failed');
    } finally {
      setBusy(false);
    }
  };

  const openModal = async (u: AdminUserRow) => {
    setModalUser(u);
    setUnlockedFor([]);
    try {
      const data = await fetchUnlocksApi(u.id);
      setUnlockedFor(data.unlocked_company_ids || []);
    } catch { setUnlockedFor([]); }
  };

  const grant = async (companyId: string) => {
    if (!modalUser) return;
    setBusy(true);
    setNotice(null);
    try {
      await grantUnlockApi(companyId);
      setUnlockedFor((prev) => [...prev, companyId]);
      setNotice(`${companies.find((c) => c.id === companyId)?.name} unlocked for ${modalUser.name}`);
    } catch (e: any) {
      setNotice(e?.message || 'Grant failed');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (companyId: string) => {
    if (!modalUser) return;
    setBusy(true);
    setNotice(null);
    try {
      await revokeUnlockApi(modalUser.id, companyId);
      setUnlockedFor((prev) => prev.filter((id) => id !== companyId));
      setNotice(`Unlock revoked (${companies.find((c) => c.id === companyId)?.name})`);
    } catch (e: any) {
      setNotice(e?.message || 'Revoke failed');
    } finally {
      setBusy(false);
    }
  };

  const notUnlocked = companies.filter((c) => !unlockedFor.includes(c.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow">#03 — Users</p>
          <h2 className="text-xl font-extrabold text-[#10151C] mt-1">Accounts & access control</h2>
          {meta && (
            <p className="text-xs text-gray-500 mt-1">{meta.total} accounts · {meta.active} active · {meta.disabled} disabled</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(q.trim())}
              placeholder="Search name or email…"
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 w-56"
            />
          </div>
          <button onClick={() => load(q.trim())} className="px-3 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="px-4 py-3 rounded-2xl bg-[#E8F4FB] text-[#0271B5] text-xs font-semibold border border-[#B8E3F7]">{notice}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-14 text-center text-sm text-gray-400 italic">Loading accounts…</div>
        ) : error ? (
          <div className="p-14 text-center">
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <p className="text-xs text-gray-400 mt-1">Check the backend (GET /api/admin/users).</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-14 text-center">
            <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No accounts found yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF9] text-gray-500 uppercase font-mono text-[10px]">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">XP / Streak</th>
                  <th className="text-center px-4 py-3">Orders (paid)</th>
                  <th className="text-right px-4 py-3">Revenue</th>
                  <th className="text-center px-4 py-3">Unlocks</th>
                  <th className="text-center px-4 py-3">Reports</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEB]">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-[#FAFAF9] ${u.disabled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#1E293B] flex items-center gap-2">
                        {u.name}
                        {u.badge && <span className="text-[10px] font-mono bg-[#FBF1E1] text-[#B7791F] px-1.5 py-0.5 rounded-full">{u.badge}</span>}
                      </p>
                      <p className="text-[11px] text-gray-400">{u.email}{u.college ? ` · ${u.college}` : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-[#1F3A5F] text-white' : 'bg-[#E8F4FB] text-[#0284C7]'}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600">{u.xp} XP · {u.streak}🔥</td>
                    <td className="px-4 py-3 text-center font-semibold">{u.orders_count}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-[#10151C]">{fmtInr(u.revenue_inr)}</td>
                    <td className="px-4 py-3 text-center">{u.unlocks_count}</td>
                    <td className="px-4 py-3 text-center">{u.reports_count}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => openModal(u)}
                            disabled={busy}
                            className="px-2.5 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                            title="Grant / revoke vault unlock"
                          >
                            <KeyRound className="w-3 h-3" /> Access
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => toggleDisabled(u)}
                            disabled={busy}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${u.disabled ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'}`}
                          >
                            {u.disabled ? <ShieldCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />} {u.disabled ? 'Enable' : 'Disable'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setModalUser(null)}>
          <div className="bg-white rounded-3xl shadow-float w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#10151C]">Vault access — {modalUser.name}</h3>
                <p className="text-xs text-gray-500">{modalUser.email}</p>
              </div>
              <button onClick={() => setModalUser(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-6 py-4 border-t border-[#EDEDEB]">
              <p className="text-[11px] font-bold font-mono text-gray-400 uppercase tracking-wider mb-2">Unlocked ({unlockedFor.length})</p>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {unlockedFor.length === 0 && <span className="text-xs text-gray-400 italic">No unlocked vaults yet</span>}
                {unlockedFor.map((cid) => {
                  const c = companies.find((x) => x.id === cid);
                  return (
                    <span key={cid} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-[#E8F4FB] text-[#0271B5] text-xs font-bold border border-[#B8E3F7]">
                      {c?.name || cid}
                      <button onClick={() => revoke(cid)} disabled={busy} className="p-0.5 rounded-full hover:bg-red-100 text-red-500" title="Revoke"><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
              </div>

              <p className="text-[11px] font-bold font-mono text-gray-400 uppercase tracking-wider mt-5 mb-2">Grant new unlock</p>
              <div className="flex items-center gap-2">
                <select
                  value=""
                  onChange={(e) => e.target.value && grant(e.target.value)}
                  disabled={busy || notUnlocked.length === 0}
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30"
                >
                  <option value="" disabled>Select vault…</option>
                  {notUnlocked.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <span className="text-[11px] text-gray-400 flex items-center gap-1"><Unlock className="w-3.5 h-3.5 text-[#B45309]" /> admin grant</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#EDEDEB] flex items-center justify-between">
              <p className="text-[11px] text-gray-400 font-mono">unlock grant/revoke → /api/unlocks (admin)</p>
              <button onClick={() => setModalUser(null)} className="btn btn-primary px-4 py-2 text-xs">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};