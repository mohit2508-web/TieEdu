import React, { useEffect, useState } from 'react';
import { Sheet } from '@/components/common/Sheet';
import { CalendarDays, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchDriveSlotsApi, bookDriveSlotApi, type DriveSlot } from '@/lib/drivesApi';

const istTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

const istDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });

/**
 * Slot picker shown after the ₹99 payment is approved (and for free drives).
 * Capacity comes precomputed as `remaining` by the server; a full or stale slot
 * answers 409 slot_full and we surface it rather than optimistically faking it.
 */
export const SlotPicker: React.FC<{
  driveId: string;
  open: boolean;
  onClose: () => void;
  onBooked?: () => void;
}> = ({ driveId, open, onClose, onBooked }) => {
  const [slots, setSlots] = useState<DriveSlot[]>([]);
  const [booking, setBooking] = useState<any>(null);
  const [canBook, setCanBook] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySlot, setBusySlot] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetchDriveSlotsApi(driveId)
      .then((r) => {
        if (!alive) return;
        setSlots(r.slots);
        setBooking(r.booking);
        setCanBook(r.can_book);
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, driveId]);

  const book = async (slot: DriveSlot) => {
    setBusySlot(slot.slot_id);
    setError(null);
    try {
      const res = await bookDriveSlotApi(driveId, slot.slot_id);
      setBooking(res.booking);
      setCanBook(false);
      setSlots((prev) => prev.map((s) => (s.slot_id === slot.slot_id ? { ...s, remaining: Math.max(0, (s.remaining ?? 1) - 1) } : s)));
      onBooked?.();
    } catch (e) {
      setError((e as Error).message || 'Could not book this slot.');
      try {
        const fresh = await fetchDriveSlotsApi(driveId);
        setSlots(fresh.slots);
        setBooking(fresh.booking);
        setCanBook(fresh.can_book);
      } catch { /* keep the error already shown */ }
    } finally {
      setBusySlot(null);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Book your test slot">
      <div className="px-5 pb-5 pt-1">
        {booking ? (
          <div className="rounded-[12px] px-4 py-3" style={{ background: 'var(--apple-green-soft)' }}>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--apple-green)' }}>
              <CheckCircle2 size={15} /> Slot booked
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--apple-label-2)' }}>
              {booking.starts_at ? `${istDay(booking.starts_at)} · ${istTime(booking.starts_at)}` : ''}
              {' — '}
              {booking.link_active_at ? 'Your link is active.' : 'The link opens once the admin activates it. The countdown runs on your drive page.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3.5 w-full rounded-[12px] py-2.5 text-base font-semibold text-white"
              style={{ background: 'var(--apple-blue)' }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm" style={{ color: 'var(--apple-label-2)' }}>
              Pick a slot — seats are limited per slot and the countdown starts as soon as you book.
            </p>

            {loading ? (
              <p className="py-5 text-center text-sm" style={{ color: 'var(--apple-label-2)' }}>Loading slots…</p>
            ) : !slots.length ? (
              <div className="rounded-[12px] px-4 py-5 text-center" style={{ background: 'var(--apple-fill)' }}>
                <CalendarDays size={20} className="mx-auto mb-1.5" style={{ color: 'var(--apple-label-2)' }} />
                <p className="text-sm" style={{ color: 'var(--apple-label-2)' }}>
                  No slots are open yet — the admin will publish them soon.
                </p>
              </div>
            ) : !canBook ? (
              <div className="rounded-[12px] px-4 py-4 text-sm" style={{ background: 'var(--apple-orange-soft, rgba(255,149,0,.12))', color: 'var(--apple-label-2)' }}>
                {booking ? 'You already have a slot booked.' : 'Slot booking opens after your payment is approved.'}
              </div>
            ) : (
              <div className="max-h-[46vh] space-y-2 overflow-y-auto">
                {slots.map((s) => {
                  const full = (s.remaining ?? 0) <= 0;
                  return (
                    <button
                      key={s.slot_id}
                      type="button"
                      disabled={full || busySlot === s.slot_id}
                      onClick={() => book(s)}
                      className="flex w-full items-center justify-between rounded-[12px] border px-3.5 py-3 text-left transition-transform active:scale-[0.99] disabled:opacity-60"
                      style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}
                    >
                      <span>
                        <span className="block text-sm font-semibold" style={{ color: 'var(--apple-label)' }}>
                          {istDay(s.starts_at)} · {istTime(s.starts_at)}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--apple-label-2)' }}>
                          ends {istTime(s.ends_at)}
                        </span>
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                        style={{
                          background: full ? 'var(--apple-red-soft)' : (s.remaining ?? 0) <= 5 ? 'var(--apple-orange-soft, rgba(255,149,0,.12))' : 'var(--apple-green-soft)',
                          color: full ? 'var(--apple-red)' : (s.remaining ?? 0) <= 5 ? 'var(--apple-orange, #FF9500)' : 'var(--apple-green)',
                        }}
                      >
                        <Users size={11} />
                        {full ? 'Full' : `${s.remaining} left`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {error && (
              <p className="mt-3 inline-flex items-start gap-1.5 rounded-[10px] px-3 py-2 text-sm" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};

export default SlotPicker;
