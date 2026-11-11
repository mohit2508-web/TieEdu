import React, { useState } from 'react';
import { FileSpreadsheet, FileText, FileArchive } from 'lucide-react';
import { pulseApi } from '@/lib/pulse/api';

/**
 * "Download report" for Wipro iOS lab classes (WIPRO_LAB_REPORT_PLAN.md): the
 * whole program or one class, as Excel, a CSV zip or a PDF with charts. The
 * server builds it from live data and checks access (admin: every class plus
 * learners outside one; teacher: own classes only).
 */
export const WiproReportDownload: React.FC<{ classes: { id: string; name: string }[]; isAdmin: boolean }> = ({ classes, isAdmin }) => {
  const [cls, setCls] = useState<string>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!classes.length) return null;

  const get = async (format: 'xlsx' | 'csv' | 'pdf') => {
    setBusy(format); setMsg(null);
    try {
      const { blob, name } = await pulseApi.wiproReport(format, cls === 'all' ? null : cls);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e: any) { setMsg(e?.message || 'Could not build the report.'); }
    setBusy(null);
  };
  const btn = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-cell border border-line bg-card px-4 text-sm font-semibold text-heading shadow-edge-neutral hover:bg-surface-hover disabled:opacity-60';

  return (
    <section className="mt-6 rounded-card border border-line bg-card p-5" aria-labelledby="wipro-report-h">
      <h2 id="wipro-report-h" className="font-display text-h3 text-heading">Wipro lab report</h2>
      <p className="mt-1 text-sm text-muted">
        Every student&rsquo;s labs, the teacher&rsquo;s marks, lessons and tests, with charts and findings.
        {isAdmin ? ' "All classes" also lists Wipro learners who are not in a lab class.' : ''}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <select value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Which class"
          className="h-10 rounded-cell border border-line bg-card px-3 text-sm text-heading sm:w-56">
          <option value="all">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" className={btn} disabled={!!busy} onClick={() => get('xlsx')}><FileSpreadsheet className="h-4 w-4" /> {busy === 'xlsx' ? 'Building…' : 'Excel'}</button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => get('csv')}><FileArchive className="h-4 w-4" /> {busy === 'csv' ? 'Building…' : 'CSV (zip)'}</button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => get('pdf')}><FileText className="h-4 w-4" /> {busy === 'pdf' ? 'Building…' : 'PDF with charts'}</button>
      </div>
      {msg ? <p className="mt-2 text-sm text-error" role="alert">{msg}</p> : null}
    </section>
  );
};
