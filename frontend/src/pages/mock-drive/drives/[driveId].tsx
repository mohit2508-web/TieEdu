import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { MapPin, Building2, Clock, IndianRupee, FileText, AlertCircle, Play } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { DriveStatusLine } from '@/components/drives/DriveStatusLine';
import { WorkflowStepper } from '@/components/drives/WorkflowStepper';
import { EligibilityTable } from '@/components/drives/EligibilityTable';
import { RegisterSheet } from '@/components/drives/RegisterSheet';
import { LaunchOverlay } from '@/components/drives/LaunchOverlay';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchDriveDetailApi, launchDriveTestApi } from '@/lib/drivesApi';
import type { DriveDetail, DriveRound } from '@/types/drives';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const ctcLabel = (min: number | null, max: number | null) => {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${inr(min)} – ${inr(max)}`;
  return inr((min ?? max) as number);
};

type Tab = 'overview' | 'workflow' | 'eligibility';

export default function DriveDetailScreen() {
  const router = useRouter();
  const driveId = typeof router.query.driveId === 'string' ? router.query.driveId : '';

  const [detail, setDetail] = useState<DriveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [launching, setLaunching] = useState<{ round: DriveRound; provider?: string } | null>(null);

  const load = useCallback(async () => {
    if (!driveId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchDriveDetailApi(driveId));
    } catch (e) {
      setError((e as Error).message || 'Could not load this drive.');
    } finally {
      setLoading(false);
    }
  }, [driveId]);

  useEffect(() => { load(); }, [load]);

  const launch = async (round: DriveRound) => {
    setLaunching({ round });
    try {
      const res = await launchDriveTestApi(driveId, round.test_id);
      setLaunching({ round, provider: res.provider });
      // Same-tab redirect — a popup would be blocked on a programmatic handoff.
      window.location.href = res.launch_url;
    } catch (e) {
      setError((e as Error).message || 'Could not start this round.');
      setLaunching(null);
    }
  };

  if (loading) {
    return (
      <DriveShell title="Drive">
        <div className="mx-auto w-full max-w-[720px] space-y-4 px-4 pb-8 pt-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </DriveShell>
    );
  }

  if (error && !detail) {
    return (
      <DriveShell title="Drive">
        <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-10">
          <div className="flex items-start gap-2.5 rounded-[12px] px-4 py-3 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <Link href="/mock-drive/drives" className="mt-4 inline-block text-[14px] font-medium" style={{ color: 'var(--apple-blue)' }}>
            ← Back to drives
          </Link>
        </div>
      </DriveShell>
    );
  }

  if (!detail) return null;

  const { drive, registration, rounds, can_register, eligibility_blockers } = detail;
  const roundsList = rounds ?? detail.tests ?? [];
  const ctc = ctcLabel(drive.ctc_min, drive.ctc_max);
  const profileMissing = eligibility_blockers.includes('profile_missing');
  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'eligibility', label: 'Eligibility' },
  ];

  return (
    <DriveShell title={drive.company_name || 'Drive'}>
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {/* Header card */}
        <div className="rounded-[14px] border p-4" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
          <div className="flex items-start gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] text-[15px] font-bold"
              style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}
            >
              {drive.company_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={drive.company_logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 size={22} strokeWidth={1.9} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-[17px] font-semibold leading-tight" style={{ color: 'var(--apple-label)' }}>{drive.title}</h1>
              <p className="mt-0.5 text-[13px]" style={{ color: 'var(--apple-label-2)' }}>{drive.company_name}</p>
              <div className="mt-2">
                <DriveStatusLine statusLine={drive.status_line} registered={!!registration} registrationOpen={drive.registration_open} />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
            {drive.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{drive.location}</span>}
            {ctc && <span className="inline-flex items-center gap-1"><IndianRupee size={12} />{ctc}</span>}
            {drive.job_type && <span className="inline-flex items-center gap-1"><Clock size={12} />{drive.job_type}</span>}
          </div>

          {/* Register / registered action */}
          <div className="mt-4">
            {registration ? (
              <div className="rounded-[10px] px-3 py-2.5 text-[13px] font-medium" style={{ background: 'var(--apple-green-soft)', color: 'var(--apple-green)' }}>
                You&apos;re registered · {registration.status}
              </div>
            ) : can_register ? (
              <button
                type="button"
                onClick={() => setRegisterOpen(true)}
                className="w-full rounded-[12px] py-3 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
                style={{ background: 'var(--apple-blue)' }}
              >
                Register for this drive
              </button>
            ) : (
              <div className="rounded-[10px] px-3 py-2.5 text-[13px]" style={{ background: 'var(--apple-fill)', color: 'var(--apple-label-2)' }}>
                {drive.registration_open ? 'Complete your profile to register.' : 'Registration is closed.'}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            {error}
          </p>
        )}

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-[10px] p-1" style={{ background: 'var(--apple-fill)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex-1 rounded-[8px] py-1.5 text-[13px] font-semibold transition-colors"
              style={{
                background: tab === t.id ? 'var(--apple-surface)' : 'transparent',
                color: tab === t.id ? 'var(--apple-label)' : 'var(--apple-label-2)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="mt-4">
          {tab === 'overview' && (
            <div className="space-y-4">
              {drive.description && (
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>{drive.description}</p>
              )}

              <div className="rounded-[12px] border" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
                <Row label="Drive type" value={drive.drive_type} />
                <Row label="Category" value={drive.category} />
                <Row label="Job function" value={drive.job_function} />
                <Row label="Opens" value={drive.registration_opens_at_ist} />
                <Row label="Closes" value={drive.registration_closes_at_ist} />
                <Row label="Results" value={drive.results_visibility.replace(/_/g, ' ')} last />
              </div>

              {drive.documents?.length > 0 && (
                <div className="rounded-[12px] border p-3" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
                  <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--apple-label)' }}>Documents</p>
                  <ul className="space-y-1.5">
                    {drive.documents.map((doc, i) => (
                      <li key={i}>
                        <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--apple-blue)' }}>
                          <FileText size={13} />{doc.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {drive.tpo_contact && (drive.tpo_contact.email || drive.tpo_contact.phone) && (
                <div className="rounded-[12px] border p-3 text-[13px]" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)', color: 'var(--apple-label-2)' }}>
                  <p className="mb-1 font-semibold" style={{ color: 'var(--apple-label)' }}>TPO contact</p>
                  {drive.tpo_contact.name && <p>{drive.tpo_contact.name}</p>}
                  {drive.tpo_contact.email && <p>{drive.tpo_contact.email}</p>}
                  {drive.tpo_contact.phone && <p>{drive.tpo_contact.phone}</p>}
                </div>
              )}
            </div>
          )}

          {tab === 'workflow' && (
            <div className="rounded-[12px] border p-4" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
              {roundsList.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--apple-label-2)' }}>No rounds published yet.</p>
              ) : (
                <>
                  <WorkflowStepper rounds={roundsList} registered={!!registration} />
                  {registration && (
                    <div className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: 'var(--apple-separator)' }}>
                      {roundsList.map((r) => {
                        const launchable = r.status_label !== 'locked' && r.attempts_used < r.max_attempts;
                        if (!launchable) return null;
                        return (
                          <button
                            key={r.test_id}
                            type="button"
                            onClick={() => launch(r)}
                            className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                            style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}
                          >
                            <span className="inline-flex items-center gap-2"><Play size={13} fill="currentColor" />Start {r.round_name || r.name}</span>
                            <span className="text-[11px] font-medium opacity-70">{r.attempts_used}/{r.max_attempts}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'eligibility' && (
            <EligibilityTable
              eligibility={drive.eligibility}
              blockers={eligibility_blockers}
              profileMissing={profileMissing}
            />
          )}
        </div>
      </div>

      <RegisterSheet
        driveId={drive.drive_id}
        drive={{
          title: drive.title,
          company_name: drive.company_name,
          registration_closes_at_ist: drive.registration_closes_at_ist,
        }}
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={load}
      />
      <LaunchOverlay visible={!!launching} provider={launching?.provider} />
    </DriveShell>
  );
}

const Row: React.FC<{ label: string; value: string | null | undefined; last?: boolean }> = ({ label, value, last }) => {
  if (!value) return null;
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 text-[13px]"
      style={{ borderBottom: last ? 'none' : '0.5px solid var(--apple-separator)' }}
    >
      <span style={{ color: 'var(--apple-label-2)' }}>{label}</span>
      <span className="font-medium capitalize" style={{ color: 'var(--apple-label)' }}>{value}</span>
    </div>
  );
};
