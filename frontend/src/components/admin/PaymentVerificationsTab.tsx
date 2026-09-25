import React, { useCallback, useEffect, useState } from 'react';
import { fetchPendingPaymentsApi, verifyPaymentApi, rejectPaymentApi, PendingPayment } from '@/lib/api';
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, Wallet, Hourglass } from 'lucide-react';

export const PaymentVerificationsTab: React.FC = () => {
  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPendingPaymentsApi();
      setPending(data.pending || []);
    } catch (e: any) {
      setNotice({ text: e?.message || 'Could not load pending payments', type: 'err' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const verify = async (p: PendingPayment) => {
    if (!window.confirm(`Verify this UPI payment of ₹${p.amount_inr} from ${p.user_name} (${p.user_email})?\n\nOnly confirm if this transfer appears in your UPI app.`)) return;
    setBusyId(p.id);
    setNotice(null);
    try {
      await verifyPaymentApi(p.id);
      setNotice({ text: `Verified ₹${p.amount_inr} — vault unlocked for ${p.user_name}.`, type: 'ok' });
      setPending((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      setNotice({ text: e?.message || 'Verification failed', type: 'err' });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (p: PendingPayment) => {
    setRejectingId(p.id);
    setNotice(null);
    try {
      await rejectPaymentApi(p.id, reason);
      setNotice({ text: `Rejected ${p.id} — student will see the reason.`, type: 'ok' });
      setPending((prev) => prev.filter((x) => x.id !== p.id));
      setReason('');
      setRejectingId(null);
    } catch (e: any) {
      setNotice({ text: e?.message || 'Rejection failed', type: 'err' });
      setRejectingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">#09 — Payments</p>
        <h2 className="text-xl font-extrabold text-[#10151C] mt-1">UPI payment verification</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Students confirm their transfer after paying you via UPI. Check the amount against your UPI app, then verify to unlock. Only approve payments you can actually see in your bank/UPS account.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={load} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1F3A5F] hover:bg-[#2b4d75] text-white rounded-xl text-xs font-bold">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh queue
        </button>
        {!loading && (
          <span className="text-xs font-bold text-gray-500">{pending.length} awaiting verification</span>
        )}
      </div>

      {notice && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${notice.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {notice.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading pending payments…</div>
      ) : pending.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center text-sm text-gray-400 space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FAFAF9] text-gray-300 flex items-center justify-center">
            <Wallet className="w-7 h-7" />
          </div>
          <p className="font-bold text-gray-500">No payments awaiting verification</p>
          <p className="max-w-sm mx-auto">When a student confirms a UPI transfer, the order appears here with the exact amount to check against your UPI app.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <div key={p.id} className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold uppercase tracking-wide">Awaiting verification</span>
                    <span className="text-xs font-mono text-gray-400">{p.id}</span>
                  </div>
                  <p className="mt-1.5 font-extrabold text-[#10151C]">{p.user_name} <span className="text-sm font-semibold text-gray-400">· {p.user_email}</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">Items: {p.item_names.join(', ') || '—'}{p.coupon_code ? ` · coupon ${p.coupon_code}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Confirmed {new Date(p.confirmed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-[#1F3A5F]">₹{p.amount_inr}</div>
                  <div className="text-[11px] text-gray-400 flex items-center justify-end gap-1"><Hourglass className="w-3 h-3" /> Exact amount to check</div>
                </div>
              </div>

              {rejectingId === p.id && (
                <div className="space-y-2 pt-1">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (shown to the student) — e.g. 'No matching transfer received'"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                <button
                  onClick={() => reject(p)}
                  disabled={busyId === p.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> {rejectingId === p.id ? 'Rejecting…' : 'Reject'}
                </button>
                <button
                  onClick={() => verify(p)}
                  disabled={busyId === p.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> {busyId === p.id ? 'Working…' : 'I received this — verify & unlock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-[13px] text-[#075985] flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-[#0284C7] mt-0.5 shrink-0" />
        <p>Verifying creates a real unlock record and increments revenue in Analytics. Every action is written to the audit ledger for transparency.</p>
      </div>
    </div>
  );
};