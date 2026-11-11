import React, { useEffect, useState } from 'react';
import { fetchMessageLogApi, type MessageLogRowView } from '@/lib/api';
import { BrandLoader } from '@/components/brand/BrandLoader';

/**
 * Every decision the messaging rulebook made (lib/messaging): what went out
 * on which channel, and why anything was held back — so "why did this student
 * not get an email?" has an answer.
 */
const REASON_LABEL: Record<string, string> = {
  topic_off: 'Student turned this topic off',
  channel_off: 'Student turned this channel off',
  email_unverified: 'Email not confirmed yet',
  cap_day: 'Daily limit reached',
  cap_week: 'Weekly limit reached',
  quiet_hours: 'Quiet hours (10 pm–8 am)',
  duplicate: 'Already sent in the last 24h',
  no_email: 'No email on the account',
  number_unverified: 'WhatsApp number not confirmed',
  whatsapp_not_ready: 'WhatsApp not set up yet',
};

export const MessageLogTab: React.FC = () => {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMessageLogApi>> | null>(null);
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMessageLogApi({ ...(status ? { status } : {}), ...(channel ? { channel } : {}) })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [status, channel]);

  const select = 'rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-heading';
  const rows: MessageLogRowView[] = data?.rows || [];

  return (
    <div className="space-y-5">
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(['email', 'push', 'whatsapp'] as const).map((ch) => {
            const t = data.week.totals[ch] || { sent: 0, skipped: 0 };
            return (
              <div key={ch} className="rounded-2xl border border-line bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{ch} · last 7 days</p>
                <p className="mt-1 text-2xl font-extrabold text-heading">{t.sent} <span className="text-sm font-semibold text-gray-500">sent</span></p>
                <p className="text-xs text-gray-500">{t.skipped} held back</p>
              </div>
            );
          })}
        </div>
      )}
      {data && Object.keys(data.week.reasons).length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Why messages were held back (7 days)</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {Object.entries(data.week.reasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
              <li key={r} className="rounded-full bg-app-warm px-3 py-1 text-xs font-semibold text-gray-700">{REASON_LABEL[r] || r}: {n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select className={select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All results</option>
          <option value="sent">Sent</option>
          <option value="skipped">Held back</option>
        </select>
        <select className={select} value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Channel">
          <option value="">All channels</option>
          <option value="email">Email</option>
          <option value="push">App</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-app-warm text-xs uppercase tracking-wider text-gray-500">
            <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Message</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Result</th></tr>
          </thead>
          <tbody>
            {data === null ? (
              <tr><td colSpan={5}><BrandLoader caption="Loading the message log…" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No messages yet. Receipts, certificates and results appear here as they happen.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{new Date(r.at).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5">{r.email || r.user_id}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.type}</td>
                  <td className="px-4 py-2.5 capitalize">{r.channel}</td>
                  <td className="px-4 py-2.5">
                    {r.status === 'sent' ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Sent</span>
                    ) : (
                      <span className="text-xs text-gray-500">{REASON_LABEL[r.reason || ''] || r.reason || 'Held back'}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
