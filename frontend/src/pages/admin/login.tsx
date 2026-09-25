import React, { useState, useEffect, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const { user, loading, login, logout } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user?.role === 'admin') router.replace('/admin');
  }, [loading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter admin email and password');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      if (user?.role !== 'admin') {
        const check = await import('@/lib/auth').then(async ({ apiVerifyAdmin }) => {
          const ok = await apiVerifyAdmin();
          if (!ok) await logout();
          return ok;
        });
        if (!check) {
          setError('This is the admin portal — only admin accounts can access it');
          setSubmitting(false);
          return;
        }
        router.replace('/admin');
      }
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed — please try again');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Portal — TieEdu</title>
      </Head>

      <div className="min-h-screen hero-mesh flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="flex justify-center mb-8">
            <TieEduLogo size="sm" showTagline />
          </div>

          <div className="vault-card p-8 shadow-float border-[#E8CFA7]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E2A44] text-white text-[11px] font-extrabold uppercase tracking-widest mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E8A33D]" /> Restricted
            </div>
            <h1 className="display-2 mb-1.5">Platform admin portal</h1>
            <p className="text-[15px] text-[--text-muted] mb-7">
              This surface is only for TieEdu platform owners. Guest access is not allowed.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-[#FDEDE9] border border-[#F2C9BC] text-[#A63D28] text-[13px] font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">
                  Admin email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tieedu.in"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full py-3.5 text-sm focus-ring disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                  Access admin console <ArrowRight className="w-4 h-4" />
                </>}
              </button>
            </form>

            <p className="mt-6 text-center text-[14px] text-[#3E4754]">
              Student ho?{' '}
              <Link href="/login" className="font-bold text-[#0284C7] hover:text-[#0271B5]">
                User sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}