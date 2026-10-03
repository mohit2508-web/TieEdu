'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Megaphone, Send, Users } from 'lucide-react';
import {
  fetchAdminUsersApi,
  sendBroadcastApi,
  type AdminUserRow,
  type BroadcastResult,
} from '@/lib/api';

/**
 * Staff-initiated broadcast to students.
 *
 * The confirmation here is deliberately two-handed: a checkbox, then retyping the
 * title. There is no undo — the platform cannot recall a notification already
 * delivered to phones — so a send to every student should never be one stray
 * click away. The server independently refuses a request without `confirm`, so
 * this friction is a guard rail rather than the actual control.
 */
export default function BroadcastTab() {
  const [students, setStudents] = useState<AdminUserRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [audience, setAudience] = useState<'all' | 'selected'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [query, setQuery] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [typedTitle, setTypedTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsersApi();
      const rows = (data?.users || []) as AdminUserRow[];
      setStudents(rows.filter((u) => u.role === 'user' && !u.disabled));
    } catch (e: any) {
      setNotice({ tone: 'err', text: e?.message || 'Could not load students' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (u) => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    );
  }, [students, query]);

  const targetCount = audience === 'all' ? students.length : selected.size;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAcknowledged(false);
  };

  const canSend =
    !sending &&
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    targetCount > 0 &&
    acknowledged &&
    // The typed title has to match exactly, not merely be present.
    typedTitle.trim() === title.trim();

  const send = async () => {
    setSending(true);
    setNotice(null);
    try {
      const r = await sendBroadcastApi({
        audience: audience === 'all' ? { kind: 'all_students' } : { kind: 'users', userIds: Array.from(selected) },
        title: title.trim(),
        body: body.trim(),
        url: link.trim() || '/',
        confirm: true,
      });
      setResult(r);
      setTitle('');
      setBody('');
      setLink('');
      setTypedTitle('');
      setAcknowledged(false);
      // A zero-reach send is a failure the admin needs to know about, even though
      // the request itself succeeded: nobody heard anything.
      setNotice(
        r.sent > 0
          ? { tone: 'ok', text: `Sent to ${r.recipients} device${r.recipients === 1 ? '' : 's'}.` }
          : {
              tone: 'err',
              text:
                r.recipients === 0
                  ? 'Nobody received this. No selected student has an installed app with notifications enabled.'
                  : 'Delivered to nobody. Every endpoint failed.',
            }
      );
    } catch (e: any) {
      setResult(null);
      setNotice({ tone: 'err', text: e?.message || 'Broadcast failed' });
    } finally {
      setSending(false);
    }
  };

  const input =
    'px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30';

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-[#1F3A5F] mt-0.5" />
          <div>
            <p className="eyebrow">Messaging</p>
            <h2 className="text-xl font-extrabold text-[#10151C] mt-1">Broadcast to students</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sends a notification to the phones of students who have added TieEdu to their
              Home Screen and allowed notifications. Students who have not cannot be reached —
              the message is not delivered quietly, it simply has nowhere to go.
            </p>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-semibold ${
            notice.tone === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-[#EDEDEB] bg-[#FAFAF9] p-4 text-sm">
          <div className="flex items-center gap-2 font-bold text-[#10151C]">
            {result.sent > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#C77B12]" />
            )}
            Last send
          </div>
          <dl className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              ['Students', result.resolved_users],
              ['With an app', result.recipients],
              ['Delivered', result.sent],
              ['Failed', result.failed],
              ['No device', result.skipped],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-[10px] uppercase font-mono text-gray-500">{label}</dt>
                <dd className="text-lg font-extrabold text-[#10151C]">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Audience</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setAudience('all'); setAcknowledged(false); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                audience === 'all'
                  ? 'bg-[#1F3A5F] text-white'
                  : 'border border-gray-200 hover:bg-gray-50 text-[#10151C]'
              }`}
            >
              All students ({students.length})
            </button>
            <button
              onClick={() => { setAudience('selected'); setAcknowledged(false); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                audience === 'selected'
                  ? 'bg-[#1F3A5F] text-white'
                  : 'border border-gray-200 hover:bg-gray-50 text-[#10151C]'
              }`}
            >
              Selected ({selected.size})
            </button>
          </div>
          {audience === 'all' && (
            <p className="mt-2 text-xs text-[#B45309] font-semibold">
              Sending to every student needs the super-admin permission. Without it the server
              refuses, whatever this screen shows.
            </p>
          )}
        </div>

        {audience === 'selected' && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-gray-200 bg-[#FAFAF9] flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email"
                className={`${input} flex-1`}
              />
              <button
                onClick={() =>
                  setSelected(new Set(visible.length === selected.size ? [] : visible.map((u) => u.id)))
                }
                className="px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-[#10151C] transition"
              >
                {visible.length === selected.size && selected.size > 0 ? 'Clear' : 'Select shown'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-[#EDEDEB]">
              {loading ? (
                <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading students…
                </div>
              ) : visible.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No students match that search.</div>
              ) : (
                visible.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#FAFAF9] cursor-pointer">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#10151C] truncate">{u.name}</div>
                      <div className="text-xs text-gray-500 truncate">{u.email}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Title</label>
          <input
            value={title}
            maxLength={80}
            onChange={(e) => { setTitle(e.target.value); setAcknowledged(false); }}
            placeholder="New course is live"
            className={`${input} w-full`}
          />
          <p className="mt-1 text-[10px] text-gray-400">{title.length}/80</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Message</label>
          <textarea
            value={body}
            maxLength={200}
            rows={3}
            onChange={(e) => { setBody(e.target.value); setAcknowledged(false); }}
            placeholder="Say what is new and why it is worth opening."
            className={`${input} w-full`}
          />
          <p className="mt-1 text-[10px] text-gray-400">{body.length}/200</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Link (optional)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/courses"
            className={`${input} w-full`}
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Must be a path starting with <code>/</code>. External links are rejected.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <label className="flex items-start gap-2 text-xs font-semibold text-amber-900">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>
              I understand this reaches <strong>{targetCount}</strong> student
              {targetCount === 1 ? '' : 's'} immediately and cannot be recalled.
            </span>
          </label>
          {acknowledged && (
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1.5">
                Retype the title to confirm
              </label>
              <input
                value={typedTitle}
                onChange={(e) => setTypedTitle(e.target.value)}
                placeholder={title.trim() || 'Title'}
                className={`${input} w-full`}
              />
              {typedTitle.trim() && typedTitle.trim() !== title.trim() && (
                <p className="mt-1 text-[10px] font-semibold text-[#C1442D]">
                  Does not match the title yet.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={send}
          disabled={!canSend}
          className="px-4 py-2 bg-[#C1442D] hover:bg-[#a53a26] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send to {targetCount} student{targetCount === 1 ? '' : 's'}
        </button>

        <p className="text-[10px] text-gray-500 flex items-start gap-1.5">
          <Users className="w-3 h-3 mt-0.5 shrink-0" />
          Sending is recorded in the audit ledger with the count of students reached.
        </p>
      </div>
    </div>
  );
}
