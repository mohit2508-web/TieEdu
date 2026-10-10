import { API_BASE_URL, apiFetch } from '@/lib/api';
import { DriveStats, RegQuery } from './drivesApi';

/**
 * TPO scoped client for the mock-drive bridge. The SAME endpoints the platform
 * admin hits via /api/admin/drives are mounted for TPO under
 * /api/placement/drives; every call carries `x-college-id` so the server only
 * touches that college's rows.
 */
export const tpoDriveFetch = (collegeId: string, path: string, options: RequestInit = {}) => {
  const res = apiFetch(`${API_BASE_URL}/placement/drives${path}`, {
    headers: {
      'x-college-id': collegeId,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...options,
  });
  return res;
};

const json = async (res: Promise<Response>): Promise<any> => {
  const r = await res;
  if (!r.ok) {
    let msg = `Request failed (${r.status})`;
    try {
      const b = await r.json();
      if (b?.error) msg = b.error;
    } catch {
      /* default */
    }
    throw new Error(msg);
  }
  return r.json();
};

export const tpoListDrives = (collegeId: string, path = '') =>
  json(tpoDriveFetch(collegeId, path)).then((d) => d.drives as any[]);

export const tpoDriveStats = (collegeId: string, driveId: string): Promise<DriveStats> =>
  json(tpoDriveFetch(collegeId, `/${encodeURIComponent(driveId)}/stats`));

export const tpoRegistrations = (collegeId: string, driveId: string, q: RegQuery = {}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const suffix = qs.toString() ? `?${qs}` : '';
  return json(tpoDriveFetch(collegeId, `/${encodeURIComponent(driveId)}/registrations${suffix}`));
};

export const tpoAttempts = (
  collegeId: string,
  driveId: string,
  q: { test_id?: string; result?: string; page?: number; limit?: number } = {}
) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const suffix = qs.toString() ? `?${qs}` : '';
  return json(tpoDriveFetch(collegeId, `/${encodeURIComponent(driveId)}/attempts${suffix}`));
};

export const tpoImportRoster = (collegeId: string, driveId: string, rows: { roll_no: string }[]) =>
  json(tpoDriveFetch(collegeId, `/${encodeURIComponent(driveId)}/registrations/import`, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  }));

export const tpoDownloadCsv = async (collegeId: string, driveId: string) => {
  const res = await tpoDriveFetch(collegeId, `/${encodeURIComponent(driveId)}/results.csv`);
  if (!res.ok) throw new Error(`CSV ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drive-${driveId}-results.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** Parse a pasted roster block: one roll number per line, trimmed, deduped. */
export const parseRosterText = (text: string): string[] => {
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n|,|;/)) {
    const roll = raw.trim();
    if (roll) seen.add(roll);
  }
  return [...seen];
};