import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { RequireAdmin } from '@/components/auth/RequireAdmin';
import { AdminCmsView } from '@/components/admin/AdminCmsView';
import { useAuth } from '@/context/AuthContext';
import { apiVerifyAdmin } from '@/lib/auth';
import { ShieldX } from 'lucide-react';

const AdminBootGate: React.FC = () => {
  const { logout } = useAuth();
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    apiVerifyAdmin().then((ok) => {
      if (active) setVerified(ok);
    });
    return () => { active = false; };
  }, []);

  if (verified === null) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4 bg-app-warm min-h-screen">
        <div className="w-9 h-9 border-[3px] border-money/40 border-t-signal rounded-full animate-spin" />
        <p className="text-sm font-semibold text-[--text-muted]">Authorizing admin token…</p>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-app-warm flex items-center justify-center p-4">
        <div className="max-w-md w-full vault-card p-8 text-center shadow-float">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-signal-soft text-danger mb-4">
            <ShieldX className="w-6 h-6" />
          </span>
          <h2 className="text-lg font-extrabold text-heading">Admin token rejected</h2>
          <p className="text-sm text-[--text-muted] mt-1.5 mb-5">
            Your session is no longer valid for the admin surface — please sign in again.
          </p>
          <button onClick={async () => { await logout(); }} className="btn btn-primary px-5 py-2.5 text-sm">
            Back to admin login
          </button>
        </div>
      </div>
    );
  }

  return <AdminCmsView />;
};

export default function AdminPage() {
  return (
    <RequireAdmin>
      <Head>
        <title>TieEdu Admin — Control Plane</title>
      </Head>
      <AdminBootGate />
    </RequireAdmin>
  );
}