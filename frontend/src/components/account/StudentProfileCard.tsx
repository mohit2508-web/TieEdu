import React, { useEffect, useState } from 'react';
import { GraduationCap, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  fetchMyProfilesApi, saveMyProfileApi, StudentProfile,
} from '@/lib/drivesApi';

/**
 * Placement / student profile editor.
 *
 * Mock-drive eligibility is computed from `student_profile` (roll number,
 * branch, batch, CGPA, backlogs…). Without a saved profile the drive page shows
 * "Not eligible — Add your student profile" and blocks registration. This card
 * is the single place a student fills that profile in.
 */
export function StudentProfileCard({ initialCollege }: { initialCollege?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [collegeId, setCollegeId] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [branch, setBranch] = useState('');
  const [batch, setBatch] = useState('');
  const [degree, setDegree] = useState('B.Tech');
  const [cgpa, setCgpa] = useState('');
  const [class10, setClass10] = useState('');
  const [class12, setClass12] = useState('');
  const [backlogs, setBacklogs] = useState('0');

  useEffect(() => {
    let active = true;
    fetchMyProfilesApi()
      .then((profiles) => {
        if (!active) return;
        const p: StudentProfile | undefined = profiles?.[0];
        if (p) {
          setCollegeId(p.college_id || initialCollege || '');
          setRollNo(p.roll_no || '');
          setBranch(p.branch || '');
          setBatch(p.batch || '');
          setDegree(p.degree || 'B.Tech');
          setCgpa(p.cgpa != null && p.cgpa !== '' ? String(p.cgpa) : '');
          setClass10(p.class10_pct != null && p.class10_pct !== '' ? String(p.class10_pct) : '');
          setClass12(p.class12_pct != null && p.class12_pct !== '' ? String(p.class12_pct) : '');
          setBacklogs(String(p.backlogs ?? 0));
        } else if (initialCollege) {
          setCollegeId(initialCollege);
        }
      })
      .catch(() => {
        // leave the form blank; the student can still fill and save it
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [initialCollege]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeId.trim() || !rollNo.trim()) {
      setMsg({ kind: 'err', text: 'College and roll number are required.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await saveMyProfileApi({
        college_id: collegeId.trim(),
        roll_no: rollNo.trim(),
        branch: branch.trim() || null,
        batch: batch.trim() || null,
        degree: degree.trim() || null,
        cgpa: cgpa.trim() ? Number(cgpa) : null,
        class10_pct: class10.trim() ? Number(class10) : null,
        class12_pct: class12.trim() ? Number(class12) : null,
        backlogs: Number.isFinite(Number(backlogs)) ? Number(backlogs) : 0,
      });
      setMsg({ kind: 'ok', text: 'Student profile saved — you can now register for eligible drives.' });
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message || 'Could not save your profile.' });
    } finally {
      setBusy(false);
    }
  };

  const numField = (
    label: string,
    value: string,
    set: (v: string) => void,
    opts: { min?: number; max?: number; step?: string; placeholder?: string } = {}
  ) => {
    // Whole numbers get the numeric keypad. Decimals (CGPA, percentages) need a
    // decimal point, which iOS's numeric keypad does not have, so they are text
    // with the decimal keypad; save() parses them with Number() either way.
    const whole = opts.step === '1';
    return (
    <label className="block">
      <span className="block text-xs font-bold text-heading mb-1">{label}</span>
      <input
        {...(whole
          ? { type: 'number', inputMode: 'numeric' as const, min: opts.min, max: opts.max, step: opts.step }
          : { type: 'text', inputMode: 'decimal' as const, pattern: '[0-9]*[.]?[0-9]*' })}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={opts.placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm text-heading placeholder:text-text-light focus:border-signal focus:ring-2 focus:ring-signal/20 outline-none"
      />
    </label>
    );
  };

  // The <label> wraps its input so a screen reader names the field (it was a
  // sibling with no htmlFor, which announced every field as "edit text").
  const textField = (label: string, value: string, set: (v: string) => void, required = false, placeholder = '') => (
    <label className="block">
      <span className="block text-xs font-bold text-heading mb-1">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm text-heading placeholder:text-text-light focus:border-signal focus:ring-2 focus:ring-signal/20 outline-none"
      />
    </label>
  );

  return (
    <div className="vault-card p-6">
      <h3 className="text-base font-extrabold text-heading flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-signal" /> Placement / student profile
      </h3>
      <p className="text-sm text-[--text-muted] mt-2">
        Drives check your roll number, branch, batch and CGPA to decide eligibility. Fill this once to unlock registration.
      </p>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-[--text-muted]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your profile…
        </div>
      ) : (
        <form onSubmit={save} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {textField('Roll number', rollNo, setRollNo, true, 'e.g. 21UCS001')}
          {textField('College', collegeId, setCollegeId, true, 'Your college / university')}
          {textField('Branch', branch, setBranch, false, 'e.g. CSE')}
          {textField('Batch / graduation year', batch, setBatch, false, 'e.g. 2026')}
          {textField('Degree', degree, setDegree, false, 'e.g. B.Tech')}
          {numField('CGPA (0–10)', cgpa, setCgpa, { min: 0, max: 10, step: '0.01', placeholder: 'e.g. 8.4' })}
          {numField('Class 10 %', class10, setClass10, { min: 0, max: 100, step: '0.01', placeholder: 'e.g. 88' })}
          {numField('Class 12 %', class12, setClass12, { min: 0, max: 100, step: '0.01', placeholder: 'e.g. 91' })}
          {numField('Active backlogs', backlogs, setBacklogs, { min: 0, max: 50, step: '1', placeholder: '0' })}

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary px-4 py-2.5 text-sm disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {busy ? 'Saving…' : 'Save profile'}
            </button>
            {msg && (
              <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${msg.kind === 'ok' ? 'text-emerald-700' : 'text-danger'}`}>
                {msg.kind === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default StudentProfileCard;
