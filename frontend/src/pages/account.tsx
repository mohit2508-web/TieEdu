import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BrandTile } from '@/components/common/BrandTile';
import {
  UserRound, Flame, Trophy, Package, FolderOpen, FileText, LockKeyhole,
  LogOut, ArrowUpRight, CheckCircle2, Clock, XCircle, GraduationCap, KeyRound,
  Camera, Pencil, Save, X,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import {
  fetchMyAccount, fetchMyReports, fetchCompanies, getInterviewCourseProgressApi,
  changePasswordApi, updateProfileApi, MyAccount,
} from '@/lib/api';

interface VaultCompany {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  industry?: string;
  ctc_min?: number | null;
  ctc_max?: number | null;
}

interface MyReportRow {
  id: string;
  company_id: string;
  company_name?: string;
  user_role?: string;
  accuracy_rating?: number;
  outcome?: string;
  status: 'pending_review' | 'published' | 'rejected';
  created_at: string;
}

const statusChip = (status: string, map: Record<string, string>) =>
  map[status] || 'bg-[#EEF1F4] text-[#7D8794]';

function OrdersView({ orders }: { orders: MyAccount['orders'] }) {
  if (orders.length === 0) {
    return (
      <div className="vault-card p-6 text-center">
        <Package className="w-8 h-8 text-[#7D8794] mx-auto mb-2" />
        <p className="text-[14px] font-bold text-[#10151C]">No orders yet</p>
        <p className="text-[13px] text-[#7D8794] mt-1">Unlock a vault pack — your orders will appear here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {orders.map((o) => (
        <div key={o.id} className="vault-card p-4 flex items-center justify-between gap-3 hover:border-[#D6D2C8]">
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-[#10151C] truncate">
              {(o.items || []).map((i) => i.name).join(', ') || o.id}
            </p>
            <p className="text-[11px] text-[#7D8794] mt-0.5">
              {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {o.coupon_code ? ` · coupon ${o.coupon_code}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[14px] font-mono font-bold text-[#0E2A44]">₹{o.amount ?? '—'}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${statusChip(o.status, {
              paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
              created: 'bg-sky-50 text-[#0271B5] border border-sky-200',
              failed: 'bg-red-50 text-[#C1442D] border border-red-200',
            })}`}>
              {o.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VaultView({ unlockedIds, companies }: { unlockedIds: string[]; companies: VaultCompany[] }) {
  if (unlockedIds.length === 0) {
    return (
      <div className="vault-card p-6 text-center">
        <FolderOpen className="w-8 h-8 text-[#7D8794] mx-auto mb-2" />
        <p className="text-[14px] font-bold text-[#10151C]">No vault unlocked yet</p>
        <p className="text-[13px] text-[#7D8794] mt-1 mb-4">Purchase a pack — your unlocked company vaults will appear here.</p>
        <Link href="/#pricing" className="btn btn-primary px-4 py-2 text-[13px]">See pricing</Link>
      </div>
    );
  }
  const mine = companies.filter((c) => unlockedIds.includes(c.id));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {mine.map((c) => (
        <Link
          key={c.id}
          href={`/company/${c.slug}`}
          className="vault-card p-4 group hover:border-[#0284C7] hover:shadow-raised transition-all"
        >
          <div className="flex items-center gap-3">
            <BrandTile name={c.name} src={c.logo_url} className="w-10 h-10 rounded-xl" />
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-[#10151C] truncate group-hover:text-[#0271B5]">{c.name}</p>
              <p className="text-[11px] text-[#7D8794] truncate">{c.industry || 'Interview Vault'}</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#AEB6BE] group-hover:text-[#0284C7] ml-auto shrink-0" />
          </div>
          {typeof c.ctc_min === 'number' && (
            <p className="mt-3 text-[11px] font-bold text-[#C77B12]">₹{c.ctc_min}–{c.ctc_max} LPA</p>
          )}
        </Link>
      ))}
    </div>
  );
}

function ReportsView({ reports }: { reports: MyReportRow[] }) {
  if (reports.length === 0) {
    return (
      <div className="vault-card p-6 text-center">
        <FileText className="w-8 h-8 text-[#7D8794] mx-auto mb-2" />
        <p className="text-[14px] font-bold text-[#10151C]">No reports submitted yet</p>
        <p className="text-[13px] text-[#7D8794] mt-1">Submit an interview report from any company vault — published reports earn +50 XP.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {reports.map((r) => (
        <div key={r.id} className="vault-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-[#10151C] truncate">
              {r.company_name || r.company_id}
              {r.user_role ? ` · ${r.user_role}` : ''}
            </p>
            <p className="text-[11px] text-[#7D8794] mt-0.5">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {typeof r.accuracy_rating === 'number' && (
              <span className="text-[11px] font-bold text-[#C77B12]">{r.accuracy_rating}/5</span>
            )}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${statusChip(r.status, {
              pending_review: 'bg-amber-50 text-[#C77B12] border border-amber-200',
              published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
              rejected: 'bg-red-50 text-[#C1442D] border border-red-200',
            })}`}>
              {r.status === 'pending_review' && <Clock className="w-3 h-3" />}
              {r.status === 'published' && <CheckCircle2 className="w-3 h-3" />}
              {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
              {r.status === 'pending_review' ? 'Review' : r.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

const AccountPageContent: React.FC = () => {
  const { user, logout, setUser } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState<MyAccount | null>(null);
  const [companies, setCompanies] = useState<VaultCompany[]>([]);
  const [reports, setReports] = useState<MyReportRow[]>([]);
  const [modules, setModules] = useState({ completed: 0, xp: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [profBusy, setProfBusy] = useState(false);
  const [profMsg, setProfMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editName, setEditName] = useState<string | null>(null);
  const [editCollege, setEditCollege] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchMyAccount(),
      fetchCompanies(),
      fetchMyReports(),
      getInterviewCourseProgressApi(),
    ])
      .then(([acc, comps, rep, prog]) => {
        if (!active) return;
        setAccount(acc);
        setCompanies(comps || []);
        setReports(rep?.reports || []);
        setModules({
          completed: prog?.progress?.completed_module_ids?.length || 0,
          xp: prog?.progress?.total_xp || 0,
        });
        if (acc.user?.id) setUser(acc.user);
      })
      .catch(() => {
        if (active) setError('Dashboard data could not be loaded — check the backend/server and try again.');
      });
    return () => { active = false; };
  }, [setUser]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwBusy(true);
    setPwMsg(null);
    try {
      await changePasswordApi(pwCurrent, pwNew);
      setPwMsg({ kind: 'ok', text: 'Password updated — please sign in again.' });
      setPwCurrent('');
      setPwNew('');
      await logout();
      router.push('/login');
    } catch (err: any) {
      setPwMsg({ kind: 'err', text: err?.message || 'Password change failed' });
    } finally {
      setPwBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Avatar upload — in-house, base64 stored on the account (no cloud).
  const handleAvatarFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfMsg({ kind: 'err', text: 'Choose a PNG, JPEG or WebP image.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfMsg({ kind: 'err', text: 'Image is too large (max 5 MB).' });
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('read'));
        reader.readAsDataURL(file);
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('decode'));
          img.onload = () => {
            const max = 512;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('canvas')); return; }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.src = reader.result as string;
        };
      });
      setProfBusy(true);
      setProfMsg(null);
      const u = await updateProfileApi({ avatar: dataUrl });
      setUser(u);
      setAccount((a) => (a ? { ...a, user: u } : a));
      setProfMsg({ kind: 'ok', text: 'Profile photo updated.' });
    } catch {
      setProfMsg({ kind: 'err', text: 'Could not process that image — try another file.' });
    } finally {
      setProfBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setProfBusy(true);
      setProfMsg(null);
      const u = await updateProfileApi({ avatar: null });
      setUser(u);
      setAccount((a) => (a ? { ...a, user: u } : a));
      setProfMsg({ kind: 'ok', text: 'Profile photo removed.' });
    } catch {
      setProfMsg({ kind: 'err', text: 'Could not remove the photo right now.' });
    } finally {
      setProfBusy(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editName === null && editCollege === null) { setProfileOpen(false); return; }
    try {
      setProfBusy(true);
      setProfMsg(null);
      const name = editName !== null ? editName : account?.user.name;
      const college = editCollege !== null ? editCollege : (account?.user.college ?? '');
      const u = await updateProfileApi({ name, college });
      setUser(u);
      setAccount((a) => (a ? { ...a, user: u } : a));
      setEditName(null);
      setEditCollege(null);
      setProfileOpen(false);
      setProfMsg({ kind: 'ok', text: 'Profile updated.' });
    } catch (err: any) {
      setProfMsg({ kind: 'err', text: err?.message || 'Profile update failed.' });
    } finally {
      setProfBusy(false);
    }
  };

  const joinedAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <RequireAuth>
      <Head>
        <title>My Account — TiEedu</title>
      </Head>

      <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#10151C]">
        <Header cartCount={0} onOpenCart={() => {}} onOpenSearch={() => {}} onOpenLeaderboard={() => {}} />

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-12 py-10 space-y-10">
          {error && (
            <div className="vault-card p-5 text-center border-[#F2C9BC] bg-[#FDEDE9]">
              <p className="text-[14px] font-bold text-[#A63D28]">{error}</p>
            </div>
          )}

          {!account && !error && (
            <div className="py-24 flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-[3px] border-[#E8F4FB] border-t-[#0284C7] rounded-full animate-spin" />
              <p className="text-[13px] font-semibold text-[#7D8794]">Loading your dashboard…</p>
            </div>
          )}

          {account && (
            <>
              {/* 01 — Profile */}
              <section>
                <p className="eyebrow">#01 — Profile</p>
                <div className="vault-card relative overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-[#0284C7]/15 via-[#E8A33D]/10 to-transparent" />
                  <div className="p-6 flex flex-col lg:flex-row justify-between gap-6 -mt-12 lg:-mt-14">
                    <div className="flex items-end gap-5">
                      <div className="relative shrink-0">
                        {account.user.avatar ? (
                          <img
                            src={account.user.avatar}
                            alt={account.user.name}
                            className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center text-4xl font-extrabold uppercase border-4 border-white shadow-lg">
                            {account.user.name.charAt(0)}
                          </div>
                        )}
                        {account.user.avatar ? (
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={profBusy}
                            title="Remove photo"
                            className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-white border border-[#F2C9BC] text-[#C1442D] hover:bg-[#FDEDE9] flex items-center justify-center shadow-sm transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                        <label
                          className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-[#0284C7] hover:bg-[#0369A1] text-white cursor-pointer flex items-center justify-center shadow-md transition-colors"
                          title="Upload profile photo"
                        >
                          <Camera className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            disabled={profBusy}
                            onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                          />
                        </label>
                      </div>

                      <div className="pb-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                            {account.user.name}
                            {account.user.badge && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FBF1E1] text-[#C77B12] text-[10px] font-extrabold uppercase tracking-wide">
                                <Trophy className="w-3 h-3" /> {account.user.badge}
                              </span>
                            )}
                          </h1>
                          <button
                            onClick={() => { setEditName(account.user.name); setEditCollege(account.user.college || ''); setProfileOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E9E7E1] bg-white hover:border-[#0284C7] text-[#0271B5] text-[12px] font-bold transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit profile
                          </button>
                        </div>
                        <p className="text-[13px] text-[#7D8794] mt-1">{account.user.email}</p>
                        <p className="text-[13px] text-[#7D8794]">
                          {account.user.college || 'No college added'}
                          {joinedAt ? ` · Joined ${joinedAt}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 lg:self-end">
                      <div className="bg-[#FBF1E1] border border-amber-200 rounded-2xl px-5 py-3 text-center">
                        <p className="font-mono font-extrabold text-[#C77B12] text-xl stat-num">{account.user.xp}</p>
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#A97821] flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> XP</p>
                      </div>
                      <div className="bg-[#E8F4FB] border border-sky-200 rounded-2xl px-5 py-3 text-center">
                        <p className="font-mono font-extrabold text-[#0271B5] text-xl stat-num">{account.user.streak}</p>
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#0271B5]">DAY STREAK</p>
                      </div>
                    </div>
                  </div>

                  {profileOpen && (
                    <form onSubmit={saveProfile} className="px-6 pb-6 animate-fade-in">
                      <div className="rounded-2xl border border-[#E9E7E1] bg-[#FAFAF8] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-bold text-[#10151C] mb-1">Full name</label>
                          <input
                            value={editName ?? ''}
                            onChange={(e) => setEditName(e.target.value)}
                            required
                            minLength={2}
                            maxLength={60}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E7E1] bg-white text-[13px] text-[#10151C] focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-[#10151C] mb-1">College</label>
                          <input
                            value={editCollege ?? ''}
                            onChange={(e) => setEditCollege(e.target.value)}
                            maxLength={120}
                            placeholder="Optional"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E7E1] bg-white text-[13px] text-[#10151C] placeholder:text-[#A7AEBA] focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2">
                          <button type="submit" disabled={profBusy} className="btn btn-primary px-4 py-2.5 text-[13px] disabled:opacity-60">
                            <Save className="w-4 h-4" /> {profBusy ? 'Saving…' : 'Save changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setProfileOpen(false); setEditName(null); setEditCollege(null); }}
                            className="btn px-4 py-2.5 text-[13px] text-[#3E4754]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {profMsg && (
                  <div className={`mt-3 vault-card px-4 py-3 text-[13px] font-bold ${profMsg.kind === 'ok' ? 'text-emerald-700 border-[#CDE9D4] bg-[#E9F6EE]' : 'text-[#A63D28] border-[#F2C9BC] bg-[#FDEDE9]'}`}>
                    {profMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                  {[
                    { icon: FolderOpen, label: 'Vaults unlocked', value: account.unlocked_company_ids.length },
                    { icon: Package, label: 'Orders', value: account.orders.length },
                    { icon: FileText, label: 'Reports submitted', value: reports.length },
                    { icon: GraduationCap, label: 'Course modules', value: `${modules.completed}/50` },
                  ].map((s) => (
                    <div key={s.label} className="vault-card p-4 flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-[#F3F2EE] text-[#3E4754] flex items-center justify-center shrink-0">
                        <s.icon className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="font-mono font-extrabold text-[#10151C] text-[15px] stat-num">{s.value}</p>
                        <p className="text-[11px] text-[#7D8794]">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 02 — My Vault */}
              <section>
                <p className="eyebrow">#02 — My Vault</p>
                <h2 className="font-serif-heading text-2xl font-bold mb-4">Unlocked company vaults</h2>
                <VaultView unlockedIds={account.unlocked_company_ids} companies={companies} />
              </section>

              {/* 03 — My Orders */}
              <section>
                <p className="eyebrow">#03 — Orders</p>
                <h2 className="font-serif-heading text-2xl font-bold mb-4">My orders</h2>
                <OrdersView orders={account.orders} />
              </section>

              {/* 04 — My Progress */}
              <section>
                <p className="eyebrow">#04 — Progress</p>
                <h2 className="font-serif-heading text-2xl font-bold mb-4">Interview course progress</h2>
                <div className="vault-card p-6">
                  <div className="flex items-center justify-between text-[13px] font-bold text-[#10151C] mb-2">
                    <span>{modules.completed} / 50 modules</span>
                    <span className="text-[#C77B12]">{modules.xp} course XP</span>
                  </div>
                  <div className="w-full bg-[#EDEBE6] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#0284C7] to-[#E8A33D] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (modules.completed / 50) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-[#7D8794] mt-3">
                    Every completed module adds +50 XP to your real account — <Link href="/interview-course" className="font-bold text-[#0271B5] hover:underline">continue the course</Link>.
                  </p>
                </div>
              </section>

              {/* 05 — My Reports */}
              <section>
                <p className="eyebrow">#05 — Reports</p>
                <h2 className="font-serif-heading text-2xl font-bold mb-4">My interview reports</h2>
                <ReportsView reports={reports} />
              </section>

              {/* 06 — Settings */}
              <section>
                <p className="eyebrow">#06 — Settings</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="vault-card p-6">
                    <h3 className="text-[15px] font-extrabold text-[#10151C] flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#0284C7]" /> Change password
                    </h3>
                    <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                      <input
                        type="password"
                        placeholder="Current password"
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E7E1] bg-white text-[13px] text-[#10151C] placeholder:text-[#A7AEBA] focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none"
                      />
                      <input
                        type="password"
                        placeholder="New password (min 6 chars)"
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E7E1] bg-white text-[13px] text-[#10151C] placeholder:text-[#A7AEBA] focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none"
                      />
                      {pwMsg && (
                        <p className={`text-[12px] font-semibold ${pwMsg.kind === 'ok' ? 'text-emerald-700' : 'text-[#C1442D]'}`}>
                          {pwMsg.text}
                        </p>
                      )}
                      <button type="submit" disabled={pwBusy} className="btn btn-primary px-4 py-2.5 min-h-[46px] text-[13px] w-full sm:w-auto disabled:opacity-60">
                        {pwBusy ? 'Updating…' : 'Update password'}
                      </button>
                    </form>
                  </div>

                  <div className="vault-card p-6 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="text-[15px] font-extrabold text-[#10151C] flex items-center gap-2">
                        <LockKeyhole className="w-4 h-4 text-[#E8A33D]" /> Session
                      </h3>
                      <p className="text-[13px] text-[#7D8794] mt-2">
                        Signing out revokes your refresh session. Your access token expires automatically after 15 minutes.
                      </p>
                    </div>
                    <button onClick={handleLogout} className="btn px-4 py-2.5 min-h-[46px] text-[13px] border border-[#F2C9BC] text-[#C1442D] hover:bg-[#FDEDE9] w-full sm:w-auto">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              </section>

              <div className="flex items-center gap-2 text-[12px] text-[#A7AEBA]">
                <UserRound className="w-3.5 h-3.5" /> Signed in as {account.user.email}
                <span className="inline-block px-1.5 py-0.5 rounded-md bg-[#E8F4FB] text-[#0271B5] text-[10px] font-extrabold uppercase tracking-wide">Student</span>
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </RequireAuth>
  );
};

export default AccountPageContent;