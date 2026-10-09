import React, { useState } from 'react';
import { lookupSchool, schoolLogin } from '@/lib/schoolApi';
import { setAuthSession } from '@/lib/auth';
import { useRouter } from 'next/router';
import { Pressable } from '@/components/common/Pressable';

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<'code' | 'login'>('code');
  const [code, setCode] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await lookupSchool(code);
      setSchool(res.school);
      setStep('login');
    } catch (e: any) {
      setError(e?.message || 'Could not find school');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await schoolLogin({ schoolCode: code.toUpperCase(), rollNo, password });
      setAuthSession(res.accessToken, res.user.id);
      router.push('/school');
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingLeft: 'max(16px, var(--safe-left))',
        paddingRight: 'max(16px, var(--safe-right))',
        paddingBottom: 'calc(var(--safe-bottom) + 12px)',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>TieEdu School</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {step === 'code' ? 'Enter your school code' : `Signing in to ${school?.name || 'your school'}`}
        </span>
      </div>

      {step === 'code' ? (
        <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="DEMO2026"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid var(--border-subtle)',
              fontSize: 16,
            }}
          />
          <Pressable as="button" type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 16px', borderRadius: 12 }}>
            {loading ? 'Checking...' : 'Continue'}
          </Pressable>
          {error && <span style={{ color: '#DC2626', fontSize: 13 }}>{error}</span>}
        </form>
      ) : (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            placeholder="Roll number (e.g. 2026-05-RS)"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid var(--border-subtle)',
              fontSize: 16,
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid var(--border-subtle)',
              fontSize: 16,
            }}
          />
          <Pressable as="button" type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 16px', borderRadius: 12 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Pressable>
          {error && <span style={{ color: '#DC2626', fontSize: 13 }}>{error}</span>}
        </form>
      )}
    </div>
  );
};

export default LoginScreen;