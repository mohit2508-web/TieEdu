import React, { useState, useEffect, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { Mail, Lock, User, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const { user, loading, signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError('Name must be at least 2 characters');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setSubmitting(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), password, college: college.trim() || undefined });
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Signup failed — please try again');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create account — TieEdu</title>
      </Head>

      <div className="min-h-screen hero-mesh flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          <div className="flex justify-center mb-8">
            <TieEduLogo size="sm" showTagline />
          </div>

          <div className="vault-card p-8 shadow-raised">
            <span className="eyebrow">Join the Vault</span>
            <h1 className="display-2 mt-1 mb-1.5">Create your account</h1>
            <p className="text-[15px] text-[--text-muted] mb-7">
              Free account — unlocks, purchases aur progress hamesha tumhare saath.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-[#FDEDE9] border border-[#F2C9BC] text-[#A63D28] text-[13px] font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">Full name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Priya Sharma"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">College (optional)</label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="IIT Delhi, NIT Trichy…"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">Confirm password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type again"
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
                  Create account <ArrowRight className="w-4 h-4" />
                </>}
              </button>
            </form>

            <p className="mt-6 text-center text-[14px] text-[#3E4754]">
              Already have account?{' '}
              <Link href="/login" className="font-bold text-[#0284C7] hover:text-[#0271B5]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}