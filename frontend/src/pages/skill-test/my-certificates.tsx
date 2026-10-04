import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, ArrowLeft, ExternalLink, Calendar, CheckCircle2, LogIn } from 'lucide-react';
import { isSignedIn } from '@/lib/auth';
import { fetchMyCertificatesApi, SkillTestCertificate } from '@/lib/skillTestApi';

const fmtDate = (iso: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 7);
  }
};

export default function MyCertificates() {
  const [certs, setCerts] = useState<SkillTestCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) { setSignedOut(true); setLoading(false); return; }
    fetchMyCertificatesApi()
      .then((data) => setCerts(data.filter((c) => c.status === 'valid')))
      .catch(() => setCerts([]))
      .finally(() => setLoading(false));
  }, []);

  if (signedOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0F7BFF]">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Sign in required</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to see your earned certificates.</p>
          <Link
            href="/login?next=/skill-test/my-certificates"
            className="mt-6 block w-full rounded-full bg-[#0F7BFF] py-3.5 text-sm font-semibold text-white hover:bg-[#0C5AD9] transition-colors"
          >
            Sign In / Sign Up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/skill-test"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Skill Test
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0F7BFF]">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Certificates</h1>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${certs.length} verified certificate${certs.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
            ))}
          </div>
        )}

        {!loading && certs.length > 0 && (
          <div className="space-y-4">
            {certs.map((cert) => (
              <Link
                key={cert.id}
                href={`/skill-test/certificates/${cert.certificateId}`}
                className="block rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-gray-900">{cert.skillName}</h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Valid
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-medium text-[#0F7BFF]">{cert.skillLevelText || cert.level}</span>
                      <span>Score: {cert.score}/100</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(cert.issueDate)}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-mono text-gray-400">{cert.certificateId}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 flex-none mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && certs.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center">
            <Award className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No certificates yet. Take an assessment to earn your first!</p>
            <Link
              href="/skill-test"
              className="mt-4 inline-block rounded-full bg-[#0F7BFF] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0C5AD9] transition-colors"
            >
              Explore Skills
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
