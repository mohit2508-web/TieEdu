import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Award, CheckCircle2, Download, Linkedin, Copy,
  ArrowLeft, QrCode, Calendar, User, XCircle, Loader2,
} from 'lucide-react';
import { verifyCertificateApi } from '@/lib/skillTestApi';
import { API_BASE_URL } from '@/lib/api';

interface VerifyResult {
  verified: boolean;
  status: 'valid' | 'revoked';
  studentName: string;
  skillName: string;
  skillSlug: string;
  level: string;
  skillLevelText: string;
  score: number;
  issueDate: string;
  certificateId: string;
  revokedAt?: string;
  revokeReason?: string;
}

const fmtMonth = (iso: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 7);
  }
};

const fmtLong = (iso: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
};

export default function CertificatePage() {
  const router = useRouter();
  const { certificateId } = router.query;
  const [cert, setCert] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const certId = String(certificateId || '');

  useEffect(() => {
    if (!router.isReady || !certId) return;
    verifyCertificateApi(certId)
      .then((data) => setCert(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [router.isReady, certId]);

  const copyLink = () => {
    const url = `${window.location.origin}/skill-test/certificates/${certId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinkedIn = () => {
    if (!cert) return;
    const url = encodeURIComponent(`${window.location.origin}/skill-test/certificates/${cert.certificateId}`);
    const title = encodeURIComponent(`${cert.skillName} — ${cert.skillLevelText} (${cert.score}/100) | TieEdu`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener');
    void title;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F7BFF]" />
      </div>
    );
  }

  if (notFound || !cert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border-2 border-red-200 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-red-600">Certificate Not Found</h1>
          <p className="mt-2 text-sm text-gray-600">No certificate exists with ID {certId}.</p>
          <Link href="/skill-test" className="mt-4 inline-block text-sm font-medium text-[#0F7BFF]">
            Back to Skill Test
          </Link>
        </div>
      </div>
    );
  }

  if (cert.status === 'revoked' || !cert.verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border-2 border-red-200 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-red-600">Certificate Revoked</h1>
          <p className="mt-2 text-sm text-gray-600">This certificate has been revoked by TieEdu and is no longer valid.</p>
          {cert.revokeReason && <p className="mt-1 text-xs text-gray-500">Reason: {cert.revokeReason}</p>}
          <p className="mt-4 text-xs text-gray-400">ID: {cert.certificateId}</p>
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
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Verified Badge */}
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 mb-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-none" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Verified Certificate</p>
            <p className="text-xs text-emerald-600">Issued by TieEdu · Status: Valid</p>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-4 border-double border-gray-200 m-3 rounded-xl p-6 sm:p-8 text-center relative">
            <div className="absolute top-2 left-2 h-6 w-6 border-t-2 border-l-2 border-[#0F7BFF]" />
            <div className="absolute top-2 right-2 h-6 w-6 border-t-2 border-r-2 border-[#0F7BFF]" />
            <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-[#0F7BFF]" />
            <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-[#0F7BFF]" />

            <div className="flex items-center justify-center gap-2 mb-4">
              <Award className="h-6 w-6 text-[#0F7BFF]" />
              <span className="text-lg font-bold text-[#0F7BFF] tracking-wider">TieEdu</span>
            </div>

            <p className="text-xs font-medium tracking-[0.3em] text-gray-400 uppercase">Certificate of Skill Proficiency</p>
            <p className="mt-4 text-sm text-gray-500">This certifies that</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">{cert.studentName}</h2>
            <p className="mt-3 text-sm text-gray-500">has successfully demonstrated proficiency in</p>
            <h3 className="mt-2 text-xl font-bold text-[#0F7BFF]">{cert.skillName}</h3>
            <p className="mt-1 text-sm font-medium text-gray-600">{cert.skillLevelText} Level</p>

            <div className="mt-5 inline-flex items-center gap-4 rounded-full bg-gray-50 border border-gray-200 px-6 py-2.5">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Score</p>
                <p className="text-lg font-bold text-gray-900">{cert.score}<span className="text-sm text-gray-400">/100</span></p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Issued</p>
                <p className="text-sm font-semibold text-gray-700">{fmtMonth(cert.issueDate)}</p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Certificate ID</p>
                <p className="text-xs font-mono font-semibold text-gray-700">{cert.certificateId}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 border border-gray-200">
                  <QrCode className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Verified by</p>
                  <p className="text-sm font-semibold text-gray-700">TieEdu</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Details */}
        <div className="mt-4 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Verification Details</h2>
          <div className="mt-3 space-y-2">
            {[
              { icon: User, label: 'Student', value: cert.studentName },
              { icon: Award, label: 'Skill', value: cert.skillName },
              { icon: Calendar, label: 'Issue Date', value: fmtLong(cert.issueDate) },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 text-sm">
                  <Icon className="h-4 w-4 text-gray-400 flex-none" />
                  <span className="text-gray-500 w-24 flex-none">{item.label}:</span>
                  <span className="text-gray-900 font-medium">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={shareLinkedIn}
            className="flex items-center justify-center gap-2 rounded-full bg-[#0A66C2] py-3 text-sm font-semibold text-white hover:bg-[#0854a0] transition-colors min-h-[48px]"
          >
            <Linkedin className="h-4 w-4" /> Share on LinkedIn
          </button>
          <a
            href={`${API_BASE_URL}/skill-test/certificates/${cert.certificateId}/pdf`}
            download
            className="flex items-center justify-center gap-2 rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[48px]"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
          <button
            onClick={copyLink}
            className="flex items-center justify-center gap-2 rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[48px]"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/skill-test/skill-passport" className="text-sm font-medium text-[#0F7BFF] hover:underline">
            View Skill Passport →
          </Link>
        </div>
      </div>
    </div>
  );
}
