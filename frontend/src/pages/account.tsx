import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BrandTile } from '@/components/common/BrandTile';
import {
  UserRound, Flame, Trophy, Package, FolderOpen, FileText, LockKeyhole,
  LogOut, ArrowUpRight, CheckCircle2, Clock, XCircle, GraduationCap, KeyRound,
  Camera, Pencil, Save, X, BrainCircuit,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { RequireAuth } from '@/components/auth/RequireAuth';
import NotificationSettings from '@/components/account/NotificationSettings';
import { CollegeNudgesCard } from '@/components/today/CollegeNudgesCard';
import { StudyReminderToggle } from '@/components/account/StudyReminderToggle';
import StudentProfileCard from '@/components/account/StudentProfileCard';
import { useAuth } from '@/context/AuthContext';
import {
  fetchMyAccount, fetchMyReports, fetchCompanies, getInterviewCourseProgressApi,
  changePasswordApi, updateProfileApi, MyAccount,
} from '@/lib/api';
import {
  fetchMyAttemptsApi, fetchSkillsApi, fetchMyCertificatesApi,
  SkillTestAttempt, SkillTestSkill, SkillTestCertificate,
} from '@/lib/skillTestApi';
import { formatDate, formatDateLong } from '@/lib/date';

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
  map[status] || 'bg-surface-hover text-[--text-muted]';

function OrdersView({ orders }: { orders: MyAccount['orders'] }) {
  if (orders.length === 0) {
    return (
      <div className="vault-card p-6 text-center">
        <Package className="w-8 h-8 text-[--text-muted] mx-auto mb-2" />
        <p className="text-sm font-bold text-heading">No orders yet</p>
        <p className="text-sm text-[--text-muted] mt-1">Unlock a vault pack — your orders will appear here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {orders.map((o) => (
        <div key={o.id} className="vault-card p-4 flex items-center justify-between gap-3 hover:border-line-strong">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-heading truncate">
              {(o.items || []).map((i) => i.name).join(', ') || o.id}
            </p>
            <p className="text-xs text-[--text-muted] mt-0.5">
              {formatDate(o.created_at)}
              {o.coupon_code ? ` · coupon ${o.coupon_code}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-brand-ink">₹{o.amount ?? '—'}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wide ${statusChip(o.status, {
              paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
              created: 'bg-signal-soft text-signal border border-signal/30',
              failed: 'bg-red-50 text-danger border border-red-200',
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
        <FolderOpen className="w-8 h-8 text-[--text-muted] mx-auto mb-2" />
        <p className="text-sm font-bold text-heading">No vault unlocked yet</p>
        <p className="text-sm text-[--text-muted] mt-1 mb-4">Purchase a pack — your unlocked company vaults will appear here.</p>
        <Link href="/#pricing" className="btn btn-primary px-4 py-2 text-sm">See pricing</Link>
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
          className="vault-card p-4 group hover:border-signal hover:shadow-raised transition-all"
        >
          <div className="flex items-center gap-3">
            <BrandTile name={c.name} src={c.logo_url} className="w-10 h-10 rounded-xl" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-heading truncate group-hover:text-signal">{c.name}</p>
              <p className="text-xs text-[--text-muted] truncate">{c.industry || 'Interview Vault'}</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-text-light group-hover:text-signal ml-auto shrink-0" />
          </div>
          {typeof c.ctc_min === 'number' && (
            <p className="mt-3 text-xs font-bold text-amber-deep">₹{c.ctc_min}–{c.ctc_max} LPA</p>
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
        <FileText className="w-8 h-8 text-[--text-muted] mx-auto mb-2" />
        <p className="text-sm font-bold text-heading">No reports submitted yet</p>
        <p className="text-sm text-[--text-muted] mt-1">Submit an interview report from any company vault — published reports earn +50 XP.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {reports.map((r) => (
        <div key={r.id} className="vault-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-heading truncate">
              {r.company_name || r.company_id}
              {r.user_role ? ` · ${r.user_role}` : ''}
            </p>
            <p className="text-xs text-[--text-muted] mt-0.5">{formatDate(r.created_at)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {typeof r.accuracy_rating === 'number' && (
              <span className="text-xs font-bold text-amber-deep">{r.accuracy_rating}/5</span>
            )}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wide ${statusChip(r.status, {
              pending_review: 'bg-amber-50 text-amber-deep border border-amber-200',
              published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
              rejected: 'bg-red-50 text-danger border border-red-200',
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

function SkillTestsView({
  attempts, skills, certs, loading,
}: {
  attempts: SkillTestAttempt[];
  skills: SkillTestSkill[];
  certs: SkillTestCertificate[];
  loading: boolean;
}) {
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const validCerts = certs.filter((c) => c.status === 'valid');
  const certByAttempt = new Map(validCerts.map((c) => [c.attemptId, c]));

  if (loading) {
    return (
      <div className="vault-card p-6 text-center">
        <div className="w-8 h-8 border-[3px] border-signal-soft border-t-signal rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[--text-muted] mt-3">Loading your skill tests…</p>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="vault-card p-6 text-center">
        <BrainCircuit className="w-8 h-8 text-[--text-muted] mx-auto mb-2" />
        <p className="text-sm font-bold text-heading">No skill tests yet</p>
        <p className="text-sm text-[--text-muted] mt-1 mb-4">
          Take a free skill assessment — your scores, levels and certificates will appear here.
        </p>
        <Link href="/skill-test" className="btn btn-primary px-4 py-2 text-sm">Explore skill tests</Link>
      </div>
    );
  }

  const avg = Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length);
  const best = Math.max(...attempts.map((a) => a.score || 0));
  const passed = attempts.filter((a) => a.passFail === 'pass').length;

  const stats = [
    { label: 'Tests taken', value: attempts.length },
    { label: 'Average score', value: `${avg}%` },
    { label: 'Best score', value: `${best}%` },
    { label: 'Certificates', value: validCerts.length },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="vault-card p-4">
            <p className="font-extrabold text-heading text-base stat-num">{s.value}</p>
            <p className="text-xs text-[--text-muted]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {attempts.map((a) => {
          const skill = skillById.get(a.skillId);
          const slug = skill?.slug || '';
          const cert = certByAttempt.get(a.id);
          const score = a.score || 0;
          const isPass = a.passFail === 'pass';
          return (
            <div key={a.id} className="vault-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-heading truncate">
                  {skill?.name || a.skillId}
                </p>
                <p className="text-xs text-[--text-muted] mt-0.5">
                  {a.submittedAt ? formatDate(a.submittedAt) : '—'}
                  {' · '}{a.correctAnswers}/{a.totalQuestions} correct
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wide border ${
                  isPass
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-danger border-signal/30'
                }`}>
                  {isPass ? <CheckCircle2 className="w-3 h-3 mr-0.5" /> : <XCircle className="w-3 h-3 mr-0.5" />}
                  {isPass ? 'Passed' : 'Failed'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-surface-hover text-[--text-muted] text-xs font-extrabold uppercase tracking-wide">
                  {a.skillLevel}
                </span>
                <span className="font-extrabold text-brand-ink text-sm stat-num w-10 text-right">{score}</span>
                {slug && (
                  <Link
                    href={`/skill-test/${slug}/result/${a.id}`}
                    className="text-xs font-bold text-signal hover:underline whitespace-nowrap"
                  >
                    Result →
                  </Link>
                )}
                {cert && (
                  <Link
                    href={`/skill-test/certificates/${cert.certificateId}`}
                    className="text-xs font-bold text-amber-deep hover:underline whitespace-nowrap"
                  >
                    Certificate →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-[--text-muted]">{passed} of {attempts.length} passed</span>
        <Link href="/skill-test/my-certificates" className="font-bold text-signal hover:underline">
          My certificates →
        </Link>
        <Link href="/skill-test/skill-passport" className="font-bold text-signal hover:underline">
          Skill passport →
        </Link>
      </div>
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
  const [skillAttempts, setSkillAttempts] = useState<SkillTestAttempt[]>([]);
  const [skillSkills, setSkillSkills] = useState<SkillTestSkill[]>([]);
  const [skillCerts, setSkillCerts] = useState<SkillTestCertificate[]>([]);
  const [skillLoading, setSkillLoading] = useState(true);
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
    // Settled, not all-or-nothing: one slow or failing panel (reports, the
    // interview course) used to blank the whole account page. Only the account
    // itself is required; the rest fill in when they arrive.
    Promise.allSettled([
      fetchMyAccount(),
      fetchCompanies(),
      fetchMyReports(),
      getInterviewCourseProgressApi(),
    ]).then(([acc, comps, rep, prog]) => {
      if (!active) return;
      if (acc.status === 'rejected') {
        setError('Your account could not be loaded. Check your connection and try again.');
        return;
      }
      setAccount(acc.value);
      if (acc.value.user?.id) setUser(acc.value.user);
      setCompanies(comps.status === 'fulfilled' ? comps.value || [] : []);
      setReports(rep.status === 'fulfilled' ? rep.value?.reports || [] : []);
      if (prog.status === 'fulfilled') {
        setModules({
          completed: prog.value?.progress?.completed_module_ids?.length || 0,
          xp: prog.value?.progress?.total_xp || 0,
        });
      }
    });
    return () => { active = false; };
  }, [setUser]);

  // Skill test history — separate fetch so a skill-test API hiccup never
  // blocks the rest of the account dashboard from loading.
  useEffect(() => {
    let active = true;
    Promise.all([
      fetchMyAttemptsApi(),
      fetchSkillsApi(),
      fetchMyCertificatesApi(),
    ])
      .then(([att, sk, cr]) => {
        if (!active) return;
        setSkillAttempts(att || []);
        setSkillSkills(sk || []);
        setSkillCerts(cr || []);
      })
      .catch(() => {
        // Keep whatever we have; the section just shows the empty state.
      })
      .finally(() => {
        if (active) setSkillLoading(false);
      });
    return () => { active = false; };
  }, []);

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

  const joinedAt = formatDateLong(user?.created_at);

  return (
    <RequireAuth>
      <Head>
        <title>My Account — TiEedu</title>
      </Head>

      <div className="min-h-screen flex flex-col bg-app-warm text-heading">

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-12 py-10 space-y-10">
          {error && (
            <div className="vault-card p-5 text-center border-signal/30 bg-signal-soft">
              <p className="text-sm font-bold text-danger">{error}</p>
            </div>
          )}

          {!account && !error && (
            <div className="py-24 flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-[3px] border-signal-soft border-t-signal rounded-full animate-spin" />
              <p className="text-sm font-semibold text-[--text-muted]">Loading your dashboard…</p>
            </div>
          )}

          {account && (
            <>
              {/* 01 — Profile */}
              <section>
                <p className="eyebrow">#01 — Profile</p>
                <div className="vault-card relative overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-signal/15 via-money/10 to-transparent" />
                  <div className="p-6 flex flex-col lg:flex-row justify-between gap-6 -mt-12 lg:-mt-14">
                    <div className="flex items-end gap-5">
                      <div className="relative shrink-0">
                        {account.user.avatar ? (
                          /*
                           * Base64 data URL, so `next/image` has nothing to
                           * optimize — see the note on the header avatar. The
                           * `width`/`height` are the real win: this sits in a
                           * `flex items-end` row under the account name, and an
                           * unsized 96px image there shifts the whole block once it
                           * decodes.
                           */
                          // eslint-disable-next-line @next/next/no-img-element -- base64 data-URL avatar, see above
                          <img
                            src={account.user.avatar}
                            alt={account.user.name}
                            width={96}
                            height={96}
                            decoding="async"
                            className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-signal text-white flex items-center justify-center text-4xl font-extrabold uppercase border-4 border-white shadow-lg">
                            {account.user.name.charAt(0)}
                          </div>
                        )}
                        {account.user.avatar ? (
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={profBusy}
                            title="Remove photo"
                            className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-white border border-signal/30 text-danger hover:bg-signal-soft flex items-center justify-center shadow-sm transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                        <label
                          className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-signal hover:bg-signal text-white cursor-pointer flex items-center justify-center shadow-md transition-colors"
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning-soft text-amber-deep text-xs font-extrabold uppercase tracking-wide">
                                <Trophy className="w-3 h-3" /> {account.user.badge}
                              </span>
                            )}
                          </h1>
                          <button
                            onClick={() => { setEditName(account.user.name); setEditCollege(account.user.college || ''); setProfileOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-white hover:border-signal text-signal text-xs font-bold transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit profile
                          </button>
                        </div>
                        <p className="text-sm text-[--text-muted] mt-1">{account.user.email}</p>
                        <p className="text-sm text-[--text-muted]">
                          {account.user.college || 'No college added'}
                          {joinedAt ? ` · Joined ${joinedAt}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 lg:self-end">
                      <div className="bg-warning-soft border border-amber-200 rounded-2xl px-5 py-3 text-center">
                        <p className="font-extrabold text-amber-deep text-xl stat-num">{account.user.xp}</p>
                        <p className="text-xs font-extrabold uppercase tracking-wide text-amber-deep flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> XP</p>
                      </div>
                      <div className="bg-signal-soft border border-signal/30 rounded-2xl px-5 py-3 text-center">
                        <p className="font-extrabold text-signal text-xl stat-num">{account.user.streak}</p>
                        <p className="text-xs font-extrabold uppercase tracking-wide text-signal">DAY STREAK</p>
                      </div>
                    </div>
                  </div>

                  {profileOpen && (
                    <form onSubmit={saveProfile} className="px-6 pb-6 animate-fade-in">
                      <div className="rounded-2xl border border-line bg-app-warm p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-heading mb-1">Full name</label>
                          <input
                            value={editName ?? ''}
                            onChange={(e) => setEditName(e.target.value)}
                            required
                            minLength={2}
                            maxLength={60}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm text-heading focus:border-signal focus:ring-2 focus:ring-signal/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-heading mb-1">College</label>
                          <input
                            value={editCollege ?? ''}
                            onChange={(e) => setEditCollege(e.target.value)}
                            maxLength={120}
                            placeholder="Optional"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm text-heading placeholder:text-text-light focus:border-signal focus:ring-2 focus:ring-signal/20 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2">
                          <button type="submit" disabled={profBusy} className="btn btn-primary px-4 py-2.5 text-sm disabled:opacity-60">
                            <Save className="w-4 h-4" /> {profBusy ? 'Saving…' : 'Save changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setProfileOpen(false); setEditName(null); setEditCollege(null); }}
                            className="btn px-4 py-2.5 text-sm text-body"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {profMsg && (
                  <div className={`mt-3 vault-card px-4 py-3 text-sm font-bold ${profMsg.kind === 'ok' ? 'text-emerald-700 border-line bg-surface-hover' : 'text-danger border-signal/30 bg-signal-soft'}`}>
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
                      <span className="w-9 h-9 rounded-xl bg-surface-hover text-body flex items-center justify-center shrink-0">
                        <s.icon className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="font-extrabold text-heading text-base stat-num">{s.value}</p>
                        <p className="text-xs text-[--text-muted]">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 01b — Placement / student profile */}
              <section>
                <p className="eyebrow">#01b — Student profile</p>
                <StudentProfileCard initialCollege={account.user.college} />
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
                  <div className="flex items-center justify-between text-sm font-bold text-heading mb-2">
                    <span>{modules.completed} / 50 modules</span>
                    <span className="text-amber-deep">{modules.xp} course XP</span>
                  </div>
                  <div className="w-full bg-line h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-signal to-money h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (modules.completed / 50) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[--text-muted] mt-3">
                    Every completed module adds +50 XP to your real account — <Link href="/interview-course" className="font-bold text-signal hover:underline">continue the course</Link>.
                  </p>
                </div>
              </section>

              {/* 05 — My Reports */}
              <section>
                <p className="eyebrow">#05 — Reports</p>
                <h2 className="font-serif-heading text-2xl font-bold mb-4">My interview reports</h2>
                <ReportsView reports={reports} />
              </section>

              {/* 06 — Skill Tests */}
              <section>
                <p className="eyebrow">#06 — Skill Tests</p>
                <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
                  <h2 className="font-serif-heading text-2xl font-bold">Skill test history</h2>
                  <Link href="/skill-test" className="text-sm font-bold text-signal hover:underline">
                    Take a new test →
                  </Link>
                </div>
                <SkillTestsView
                  attempts={skillAttempts}
                  skills={skillSkills}
                  certs={skillCerts}
                  loading={skillLoading}
                />
              </section>

              {/* 07 — Settings */}
              <section>
                <p className="eyebrow">#07 — Settings</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <NotificationSettings />
                  <div className="mt-3"><CollegeNudgesCard ready settingsOnly /></div>
                  <div className="mt-3"><StudyReminderToggle /></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="vault-card p-6">
                    <h3 className="text-base font-extrabold text-heading flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-signal" /> Change password
                    </h3>
                    <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                      {/* Phase 7. Neither field declared an `autoComplete`, so this
                          form was invisible to the password manager: it could not
                          offer the stored credential for the current password, and
                          could not offer to generate and save a new one. Both are
                          the whole point of the form. */}
                      <input
                        type="password"
                        placeholder="Current password"
                        autoComplete="current-password"
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                        required
                        enterKeyHint="next"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm text-heading placeholder:text-text-light focus:border-signal focus:ring-2 focus:ring-signal/20 outline-none"
                      />
                      <input
                        type="password"
                        placeholder="New password (min 6 chars)"
                        autoComplete="new-password"
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        required
                        minLength={6}
                        enterKeyHint="go"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm text-heading placeholder:text-text-light focus:border-signal focus:ring-2 focus:ring-signal/20 outline-none"
                      />
                      {pwMsg && (
                        <p className={`text-xs font-semibold ${pwMsg.kind === 'ok' ? 'text-emerald-700' : 'text-danger'}`}>
                          {pwMsg.text}
                        </p>
                      )}
                      <button type="submit" disabled={pwBusy} className="btn btn-primary px-4 py-2.5 min-h-[46px] text-sm w-full sm:w-auto disabled:opacity-60">
                        {pwBusy ? 'Updating…' : 'Update password'}
                      </button>
                    </form>
                  </div>

                  <div className="vault-card p-6 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-heading flex items-center gap-2">
                        <LockKeyhole className="w-4 h-4 text-amber-deep" /> Session
                      </h3>
                      <p className="text-sm text-[--text-muted] mt-2">
                        Signing out revokes your refresh session. Your access token expires automatically after 15 minutes.
                      </p>
                    </div>
                    <button onClick={handleLogout} className="btn px-4 py-2.5 min-h-[46px] text-sm border border-signal/30 text-danger hover:bg-signal-soft w-full sm:w-auto">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              </section>

              <div className="flex items-center gap-2 text-xs text-text-light">
                <UserRound className="w-3.5 h-3.5" /> Signed in as {account.user.email}
                <span className="inline-block px-1.5 py-0.5 rounded-md bg-signal-soft text-signal text-xs font-extrabold uppercase tracking-wide">Student</span>
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
