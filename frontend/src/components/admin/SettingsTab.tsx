import React, { useEffect, useState } from 'react';
import { fetchAdminSettingsApi, updateAdminSettingsApi, fetchAnalyticsApi, fetchAdminAuditApi, changePasswordApi, PlatformSettings, AnalyticsSnapshot } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Database, KeyRound, LogOut, Save, Settings2, QrCode, Upload } from 'lucide-react';

const inputCls = "w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 min-w-[220px]";

const emptySettings: PlatformSettings = {
  platform_name: '',
  support_email: '',
  upi_id: '',
  upi_qr: '',
  merchant_name: 'TieEdu',
  upi_instructions: 'Scan with any UPI app (Paytm, GPay, PhonePe) and transfer the exact amount.',
};

export const SettingsTab: React.FC = () => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [form, setForm] = useState<PlatformSettings>(emptySettings);
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [audit, setAudit] = useState<{ entries: any[]; total: number } | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, a, au] = await Promise.all([fetchAdminSettingsApi(), fetchAnalyticsApi(), fetchAdminAuditApi()]);
        if (!active) return;
        setSettings(s.settings);
        setForm({ ...emptySettings, ...s.settings });
        setAnalytics(a);
        setAudit(au);
      } catch {
        if (active) setSettings(null);
      }
    })();
    return () => { active = false; };
  }, []);

  const save = async () => {
    if (!form.platform_name.trim() || !form.support_email.trim()) return;
    setBusy(true);
    setSaved(null);
    try {
      const data = await updateAdminSettingsApi(form);
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(null), 2500);
    } catch {
      setSaved(false);
    } finally {
      setBusy(false);
    }
  };

  const onQrFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, upi_qr: String(reader.result || '') });
    reader.readAsDataURL(file);
  };

  const changePw = async () => {
    setPwErr(null);
    setPwMsg(null);
    try {
      await changePasswordApi(curPw, newPw);
      setCurPw(''); setNewPw('');
      setPwMsg('Password changed — sign in with the new password next time.');
    } catch (e: any) {
      setPwErr(e?.message || 'Password change failed');
    }
  };

  const signOut = async () => {
    await logout();
    window.location.href = '/admin/login';
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">#08 — Settings</p>
        <h2 className="text-xl font-extrabold text-[#10151C] mt-1">Platform configuration</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-extrabold text-[#1E293B] flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#0284C7]" /> Platform identity
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Platform name</label>
              <input value={form.platform_name} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Support email</label>
              <input value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} className={inputCls} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={save} disabled={busy} className="btn btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> {busy ? 'Saving…' : 'Save settings'}
              </button>
              {saved === true && <span className="text-xs font-semibold text-emerald-600">Saved ✓</span>}
              {saved === false && <span className="text-xs font-semibold text-red-600">Save failed</span>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#1E293B] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#0284C7]" /> System status
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-2xl bg-[#FAFAF9]"><p className="text-[10px] font-mono font-bold text-gray-400 uppercase">Storage</p><p className="font-bold text-[#1E293B] mt-0.5">{analytics?.system.storage || 'local-json-repository'}</p></div>
              <div className="p-3 rounded-2xl bg-[#FAFAF9]"><p className="text-[10px] font-mono font-bold text-gray-400 uppercase">Uptime</p><p className="font-bold text-[#1E293B] mt-0.5">{analytics ? `${Math.floor(analytics.system.uptime_seconds / 60)} min` : '—'}</p></div>
              <div className="p-3 rounded-2xl bg-[#FAFAF9]"><p className="text-[10px] font-mono font-bold text-gray-400 uppercase">Payment gateway</p><p className="font-bold text-[#1E293B] mt-0.5">UPI + manual verify</p></div>
              <div className="p-3 rounded-2xl bg-[#FAFAF9]"><p className="text-[10px] font-mono font-bold text-gray-400 uppercase">Logged in</p><p className="font-bold text-[#1E293B] mt-0.5 truncate">{user?.email}</p></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#1E293B] flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#B45309]" /> UPI merchant details
            </h3>
            <p className="text-xs text-gray-400 -mt-2">Shown to students at checkout. Every transfer is verified manually by you before the vault unlocks.</p>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Merchant name</label>
              <input value={form.merchant_name} onChange={(e) => setForm({ ...form, merchant_name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">UPI ID (e.g. tieedu@okhdfcbank)</label>
              <input value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} className={inputCls} placeholder="yourname@upi" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">UPI QR code (image upload)</label>
              <div className="flex items-center gap-3">
                {form.upi_qr ? (
                  <img src={form.upi_qr} alt="UPI QR preview" className="w-20 h-20 rounded-xl border border-gray-200 object-contain bg-white" />
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                    <QrCode className="w-7 h-7" />
                  </div>
                )}
                <label className="cursor-pointer px-4 py-2 bg-[#FAFAF9] hover:bg-[#F0EFEC] border border-gray-200 rounded-xl text-xs font-bold text-[#1E293B] inline-flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> {form.upi_qr ? 'Replace QR' : 'Upload QR'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onQrFile(e.target.files[0])} />
                </label>
                {form.upi_qr && (
                  <button onClick={() => setForm({ ...form, upi_qr: '' })} className="text-xs font-bold text-red-600 hover:underline">Remove</button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payment instructions</label>
              <textarea value={form.upi_instructions} onChange={(e) => setForm({ ...form, upi_instructions: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={save} disabled={busy} className="btn btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> {busy ? 'Saving…' : 'Save UPI details'}
              </button>
              {saved === true && <span className="text-xs font-semibold text-emerald-600">Saved ✓</span>}
              {saved === false && <span className="text-xs font-semibold text-red-600">Save failed</span>}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#1E293B] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#B45309]" /> Admin password
            </h3>
            <input type="password" placeholder="Current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30" />
            <input type="password" placeholder="New password (min 8 chars)" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30" />
            <button onClick={changePw} disabled={!curPw || newPw.length < 8} className="px-4 py-2 bg-[#1F3A5F] hover:bg-[#2b4d75] text-white rounded-xl text-xs font-bold">Change password</button>
            {pwMsg && <p className="text-xs font-semibold text-emerald-600">{pwMsg}</p>}
            {pwErr && <p className="text-xs font-semibold text-red-600">{pwErr}</p>}
          </div>

          <div className="bg-white border border-red-100 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-extrabold text-red-600 flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Session
            </h3>
            <p className="text-xs text-gray-400 mt-1 mb-3">Sign out of the admin control plane. The student site stays public.</p>
            <button onClick={signOut} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold">Sign out</button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-[#1E293B] flex items-center gap-2">
          <Database className="w-4 h-4 text-[#0284C7]" /> Payments & activity ledger
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-2xl bg-[#FAFAF9]">
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase">Flow</p>
            <p className="font-bold text-[#1E293B] mt-0.5">UPI QR → manual verify</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Student pays via QR, confirms, admin verifies in the Payments tab — then unlocks.</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#FAFAF9]">
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase">Orders</p>
            <p className="font-bold text-[#1E293B] mt-0.5">statuses</p>
            <p className="text-[10px] text-gray-400 mt-0.5">created → awaiting_verification → paid | rejected</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#FAFAF9]">
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase">Razorpay</p>
            <p className="font-bold text-[#1E293B] mt-0.5">optional via env</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Set PAYMENT_MODE=razorpay + RZP keys on the server to auto-verify.</p>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase mb-2">Recent audit ({audit?.total || 0} events)</p>
          {audit && audit.entries.length > 0 ? (
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#FAFAF9] text-left text-gray-400">
                    <th className="px-3 py-2 font-bold">When</th>
                    <th className="px-3 py-2 font-bold">Event</th>
                    <th className="px-3 py-2 font-bold hidden md:table-cell">Detail</th>
                    <th className="px-3 py-2 font-bold hidden sm:table-cell">Order</th>
                    <th className="px-3 py-2 font-bold">Gateway</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.entries.map((e: any) => (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{new Date(e.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-3 py-2 font-semibold text-[#1E293B]">{e.action}</td>
                      <td className="px-3 py-2 text-gray-500 hidden md:table-cell max-w-[260px] truncate">{e.detail}</td>
                      <td className="px-3 py-2 font-mono text-gray-400 hidden sm:table-cell">{e.order_id || '—'}</td>
                      <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${e.gateway === 'razorpay' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>{e.gateway || 'upi'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No payment events recorded yet — the first created/completed order will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
};