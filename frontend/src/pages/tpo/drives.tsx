import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Activity, ArrowLeft, BarChart3, ClipboardList, ListChecks, Target, Users } from 'lucide-react';
import { API_BASE_URL, apiFetch } from '@/lib/api';
import { AdminDrive } from '@/lib/drivesApi';
import StatusPill, { driveStatusTone } from '@/components/apple/StatusPill';
import { SegmentedControl } from '@/components/apple/SegmentedControl';
import OverviewTab from '@/components/tpo/drives/OverviewTab';
import DrivesTab from '@/components/tpo/drives/DrivesTab';
import RegistrationsTab from '@/components/tpo/drives/RegistrationsTab';
import ResultsTab from '@/components/tpo/drives/ResultsTab';

type Grant = { access_id: string; college_id: string; role: string; role_label: string };
type Tab = 'overview' | 'drives' | 'registrations' | 'results';

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'overview', label: 'Overview', icon: <BarChart3 size={14} strokeWidth={2.2} /> },
  { value: 'drives', label: 'Drives', icon: <Target size={14} strokeWidth={2.2} /> },
  { value: 'registrations', label: 'Registrations', icon: <Users size={14} strokeWidth={2.2} /> },
  { value: 'results', label: 'Results', icon: <ListChecks size={14} strokeWidth={2.2} /> },
];

export default function TpoDrivesPage() {
  const [grant, setGrant] = useState<Grant | null>(null);
  const [drives, setDrives] = useState<AdminDrive[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const collegeId = grant?.college_id ?? '';

  const load = async (cid: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE_URL}/placement/drives`, { headers: { 'x-college-id': cid } });
      if (!res.ok) throw new Error(`drives ${res.status}`);
      const d = await res.json();
      const list: AdminDrive[] = d.drives || [];
      setDrives(list);
      setSelectedId((cur) => {
        if (cur && list.some((x) => x.drive_id === cur)) return cur;
        return list[0]?.drive_id ?? null;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selected = useMemo(() => drives.find((d) => d.drive_id === selectedId) ?? null, [drives, selectedId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch(`${API_BASE_URL}/placement/me`);
        if (!me.ok) throw new Error('No placement access');
        const data = await me.json();
        const chosen = data.grants?.find((g: Grant) => g.college_id) || data.grants?.[0];
        if (!chosen || !cancelled && !chosen.college_id) {
          if (!chosen) throw new Error('No college grant');
        }
        if (cancelled) return;
        setGrant(chosen);
        if (chosen.college_id) await load(chosen.college_id);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panel = (
    <>
      {error ? <div className="mb-4 rounded-2xl px-4 py-3 text-[13px] font-medium" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>{error}</div> : null}
      {notice ? (
        <div className="mb-4 rounded-2xl px-4 py-3 text-[13px] font-medium" style={{ background: 'var(--apple-green-soft)', color: 'var(--apple-green)' }}>{notice}</div>
      ) : null}

      {tab === 'drives' ? (
        <DrivesTab
          collegeId={collegeId}
          drives={drives}
          onReload={() => load(collegeId)}
          onSelect={(id) => { if (selectedId !== id) setNotice(null); setSelectedId(id); }}
          selectedId={selectedId}
          busy={busy}
          setBusy={setBusy}
          error={error}
          setError={setError}
          notice={notice}
          setNotice={setNotice}
        />
      ) : tab === 'overview' ? (
        <OverviewTab collegeId={collegeId} driveId={selectedId} />
      ) : tab === 'registrations' ? (
        <RegistrationsTab collegeId={collegeId} driveId={selectedId} notice={notice} setNotice={setNotice} />
      ) : (
        <ResultsTab collegeId={collegeId} driveId={selectedId} busy={busy} setBusy={setBusy} notice={notice} setNotice={setNotice} error={error} setError={setError} />
      )}
    </>
  );

  return (
    <>
      <Head><title>Mock Drives · TPO · TieEdu</title></Head>
      <main className="min-h-screen" style={{ background: 'var(--apple-bg)' }}>
        <div className="mx-auto flex min-h-screen w-full max-w-6xl">
          {/* Desktop rail */}
          <aside className="hidden w-[232px] shrink-0 border-r md:block" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-bg)' }}>
            <div className="sticky top-24 px-4 py-6">
              <Link href="/tpo" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--apple-blue)' }}>
                <ArrowLeft size={14} /> TPO portal
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--apple-label-3)' }}>Mock drives</p>
              <div className="mt-3">
                <p className="text-[15px] font-semibold" style={{ color: 'var(--apple-label)' }}>{grant?.role_label ?? 'TPO'}</p>
                <p className="text-[12px] tabular-nums" style={{ color: 'var(--apple-label-2)' }}>{grant?.college_id ?? 'loading…'}</p>
              </div>
              <nav className="mt-6 space-y-1">
                {TABS.map((t) => {
                  const active = t.value === tab;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTab(t.value)}
                      className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors"
                      style={
                        active
                          ? { background: 'var(--apple-surface)', color: 'var(--apple-label)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                          : { color: 'var(--apple-label-2)' }
                      }
                    >
                      <span style={{ color: active ? 'var(--apple-blue)' : 'var(--apple-label-3)' }}>{t.icon}</span>
                      {t.label}
                      {t.value === 'overview' ? <Activity size={12} className="ml-auto" style={{ color: selected ? 'var(--apple-green)' : 'var(--apple-label-3)' }} /> : null}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
            <header className="flex items-center gap-3 pb-1">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}>
                <ClipboardList size={22} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--apple-label)' }}>Mock Drives</h1>
                <p className="text-[13px]" style={{ color: 'var(--apple-label-2)' }}>{drives.length} drive{drives.length === 1 ? '' : 's'} · live analytics</p>
              </div>
            </header>

            {/* Drive picker */}
            {drives.length > 0 ? (
              <div className="apple-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
                {drives.map((d) => {
                  const active = selectedId === d.drive_id;
                  return (
                    <button
                      key={d.drive_id}
                      type="button"
                      onClick={() => { setNotice(null); setSelectedId(d.drive_id); }}
                      className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all active:scale-[0.97]"
                      style={
                        active
                          ? { background: 'var(--apple-blue)', color: '#fff' }
                          : { background: 'var(--apple-surface)', color: 'var(--apple-label-2)' }
                      }
                    >
                      <span className="max-w-[140px] truncate">{d.company_name || d.title}</span>
                      {active ? null : <StatusPill label={String(d.registration_count ?? 0)} tone="blue" />}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Mobile segmented tabs */}
            <div className="mt-4 md:hidden">
              <SegmentedControl
                options={TABS.map((t) => ({ value: t.value, label: t.label }))}
                value={tab}
                onChange={setTab}
              />
            </div>

            <div className="mt-5 apple-fade-up" key={tab}>{panel}</div>
          </div>
        </div>
      </main>
    </>
  );
}