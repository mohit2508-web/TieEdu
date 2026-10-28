import React, { useEffect, useState } from 'react';
import { AlarmClock } from 'lucide-react';
import { API_BASE_URL, apiFetch } from '@/lib/api';

/**
 * Study-time reminders (F4, backend lib/studyReminders): at most one a day,
 * at the hour this student usually studies, never late at night, skipped on
 * days they already practised. Pauses itself after seven ignored in a row;
 * switching on again clears that.
 */
interface State { on: boolean; paused: boolean; usual_hour: number | null }
const call = async (init?: RequestInit): Promise<State> => {
  const res = await apiFetch(`${API_BASE_URL}/me/study-reminders`, init);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
};
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? ' am' : ' pm'}`;

export const StudyReminderToggle: React.FC = () => {
  const [st, setSt] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { call().then(setSt).catch(() => {}); }, []);
  if (!st) return null;
  return (
    <div className="rounded-xl border border-line p-4">
      <label className="flex items-start gap-2 text-sm text-body">
        <input
          type="checkbox"
          checked={st.on}
          disabled={busy}
          onChange={async (e) => { setBusy(true); try { setSt(await call({ method: 'PUT', body: JSON.stringify({ on: e.target.checked }) })); } catch { /* keeps its state */ } finally { setBusy(false); } }}
          className="mt-0.5 h-4 w-4 accent-signal"
        />
        <span>
          <span className="flex items-center gap-1.5 font-bold text-heading"><AlarmClock className="h-4 w-4 text-signal" aria-hidden /> Remind me at my usual study time</span>
          <span className="block text-xs text-muted">
            At most one a day{st.usual_hour !== null ? `, around ${hourLabel(st.usual_hour)}` : ' once we know when you usually study'}. Skipped on days you already practised, never at night.
            {st.paused && ' Paused after a week of reminders you did not need — tick to turn them back on.'}
          </span>
        </span>
      </label>
    </div>
  );
};

export default StudyReminderToggle;
