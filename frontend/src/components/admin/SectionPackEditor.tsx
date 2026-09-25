import React, { useState } from 'react';
import { ContentModule, ModuleSectionData } from '@/types';
import { saveSectionDataApi } from '@/lib/api';
import {
  Save, Building2, BookOpen, Lightbulb, FileSpreadsheet, Flame,
  Zap, UserCheck, Plus, Trash2, CheckCircle2, Sparkles, ChevronDown, Eye
} from 'lucide-react';

interface SectionPackEditorProps {
  module: ContentModule;
  companyName: string;
  onSaved: () => void;
}

type SectionId = 'overview' | 'core_subjects' | 'interview_questions' | 'cheatsheets' | 'never_skip_topics' | 'last_minute_revision' | 'hr_round';

const emptySection = (): ModuleSectionData => ({
  overview: { companyInfo: '', eligibility: '', salaryBreakdown: '', reviews: [] },
  core_subjects: [],
  interview_questions: [],
  cheatsheets: [],
  never_skip_topics: [],
  last_minute_revision: [],
  hr_round: [],
});

const sections: { id: SectionId; label: string; icon: any; desc: string }[] = [
  { id: 'overview', label: '1. Company Overview', icon: Building2, desc: 'Info, eligibility, salary, reviews' },
  { id: 'core_subjects', label: '2. Core Subjects & PYQs', icon: BookOpen, desc: 'DBMS / OS / Networks / DSA topic-wise' },
  { id: 'interview_questions', label: '3. Technical & Coding Qs', icon: Lightbulb, desc: 'High-frequency question bank' },
  { id: 'cheatsheets', label: '4. Quick Cheatsheets', icon: FileSpreadsheet, desc: 'Formula & reference cards' },
  { id: 'never_skip_topics', label: '5. Never-Skip Topics', icon: Flame, desc: 'Must-do high weightage concepts' },
  { id: 'last_minute_revision', label: '6. Last-Minute Revision', icon: Zap, desc: '24-hr express revision points' },
  { id: 'hr_round', label: '7. HR & Behavioral', icon: UserCheck, desc: 'STAR model answers + tips' },
];

const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]";
const labelCls = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1";

export const SectionPackEditor: React.FC<SectionPackEditorProps> = ({ module, companyName, onSaved }) => {
  const [draft, setDraft] = useState<ModuleSectionData>(module.section_data || emptySection());
  const [active, setActive] = useState<SectionId>('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: any) => setDraft((prev: any) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      await saveSectionDataApi(module.id, draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Save failed');
    }
    setIsSaving(false);
  };

  const SectionCard = ({ title, onAdd, addLabel, children }: any) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">{title}</h3>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg text-xs font-bold transition-colors"
          type="button"
        >
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      </div>
      {children}
    </div>
  );

  const ItemShell = ({ onRemove, children, accent = 'border-gray-200 bg-white' }: any) => (
    <div className={`relative p-4 border rounded-2xl ${accent} space-y-3`}>
      <button
        onClick={onRemove}
        type="button"
        className="absolute top-2.5 right-2.5 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Remove item"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {children}
    </div>
  );

  const renderForm = () => {
    switch (active) {
      case 'overview': {
        const ov = draft.overview || { companyInfo: '', eligibility: '', salaryBreakdown: '', reviews: [] };
        return (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Company Profile & Target Roles</label>
              <textarea rows={3} value={ov.companyInfo} onChange={(e) => set({ overview: { ...ov, companyInfo: e.target.value } })} className={inputCls}
                placeholder={`${companyName} is a leading... Roles include SDE-1, Security Engineer...`} />
            </div>
            <div>
              <label className={labelCls}>Eligibility Criteria</label>
              <textarea rows={2} value={ov.eligibility} onChange={(e) => set({ overview: { ...ov, eligibility: e.target.value } })} className={inputCls}
                placeholder="B.Tech / M.Tech with 60% or 6.5 CGPA..." />
            </div>
            <div>
              <label className={labelCls}>Salary & CTC Breakdown</label>
              <textarea rows={2} value={ov.salaryBreakdown} onChange={(e) => set({ overview: { ...ov, salaryBreakdown: e.target.value } })} className={inputCls}
                placeholder="SDE-1 Base: ₹18L | Stocks: ₹6L | Bonus: ₹2L" />
            </div>

            <SectionCard title={`Candidate Reviews (${ov.reviews?.length || 0})`} onAdd={() => set({ overview: { ...ov, reviews: [...(ov.reviews || []), { name: '', role: '', rating: 5, text: '' }] } })} addLabel="Add Review">
              {(ov.reviews || []).map((r: any, idx: number) => (
                <ItemShell key={idx} onRemove={() => set({ overview: { ...ov, reviews: (ov.reviews || []).filter((_: any, i: number) => i !== idx) } })}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input className={inputCls} placeholder="Student name" value={r.name} onChange={(e) => set({ overview: { ...ov, reviews: (ov.reviews || []).map((x: any, i: number) => i === idx ? { ...x, name: e.target.value } : x) } })} />
                    <input className={inputCls} placeholder="Role (SDE @ Co)" value={r.role} onChange={(e) => set({ overview: { ...ov, reviews: (ov.reviews || []).map((x: any, i: number) => i === idx ? { ...x, role: e.target.value } : x) } })} />
                    <input className={inputCls} type="number" min={1} max={5} placeholder="Rating" value={r.rating} onChange={(e) => set({ overview: { ...ov, reviews: (ov.reviews || []).map((x: any, i: number) => i === idx ? { ...x, rating: Number(e.target.value) } : x) } })} />
                  </div>
                  <textarea rows={2} className={inputCls} placeholder="Review text" value={r.text} onChange={(e) => set({ overview: { ...ov, reviews: (ov.reviews || []).map((x: any, i: number) => i === idx ? { ...x, text: e.target.value } : x) } })} />
                </ItemShell>
              ))}
              {(ov.reviews || []).length === 0 && <p className="text-xs text-gray-400 italic">No reviews yet — add one.</p>}
            </SectionCard>
          </div>
        );
      }

      case 'core_subjects': {
        const subjects = draft.core_subjects || [];
        return (
          <SectionCard title={`Core Subjects (${subjects.length})`} onAdd={() => set({ core_subjects: [...subjects, { subject: '', topics: [] }] })} addLabel="Add Subject">
            {subjects.map((sub, sIdx) => (
              <ItemShell key={sIdx} accent="border-sky-200 bg-sky-50/40">
                <input className={inputCls} placeholder="Subject (e.g. Database Management Systems)" value={sub.subject}
                  onChange={(e) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, subject: e.target.value } : x) })} />

                <div className="space-y-3">
                  {sub.topics.map((topic, tIdx) => (
                    <div key={tIdx} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Topic #{tIdx + 1}</span>
                        <button type="button" className="text-xs text-red-500 hover:underline font-semibold"
                          onClick={() => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.filter((_: any, j: number) => j !== tIdx) } : x) })}>
                          Remove Topic
                        </button>
                      </div>
                      <input className={inputCls} placeholder="Topic title (e.g. ACID Properties & Transactions)" value={topic.title}
                        onChange={(e) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, title: e.target.value } : t) } : x) })} />
                      <textarea rows={2} className={inputCls} placeholder="Topic content / explanation..." value={topic.content}
                        onChange={(e) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, content: e.target.value } : t) } : x) })} />

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">PYQs ({topic.pyqs?.length || 0})</span>
                          <button type="button" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0284C7] hover:underline"
                            onClick={() => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, pyqs: [...(t.pyqs || []), { year: 2026, question: '', answer: '', frequency: 'High' }] } : t) } : x) })}>
                            <Plus className="w-3 h-3" /> Add PYQ
                          </button>
                        </div>
                        {(topic.pyqs || []).map((pyq: any, pIdx: number) => (
                          <div key={pIdx} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 relative">
                            <button type="button" className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600"
                              onClick={() => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, pyqs: (t.pyqs || []).filter((_: any, k: number) => k !== pIdx) } : t) } : x) })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pr-8">
                              <input className={inputCls} type="number" placeholder="Year" value={pyq.year}
                                onChange={(e) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, pyqs: (t.pyqs || []).map((p, k) => k === pIdx ? { ...p, year: Number(e.target.value) } : p) } : t) } : x) })} />
                              <select className={inputCls} value={pyq.frequency}
                                onChange={(e) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, pyqs: (t.pyqs || []).map((p, k) => k === pIdx ? { ...p, frequency: e.target.value } : p) } : t) } : x) })}>
                                {['High', 'Medium', 'Low'].map((f) => <option key={f}>{f}</option>)}
                              </select>
                              <input className={inputCls + ' col-span-2'} placeholder="Question" value={pyq.question}
                                onChange={(e) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, pyqs: (t.pyqs || []).map((p, k) => k === pIdx ? { ...p, question: e.target.value } : p) } : t) } : x) })} />
                            </div>
                            <textarea rows={1.5} className={inputCls} placeholder="Answer" value={pyq.answer}
                              onChange={(e) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, pyqs: (t.pyqs || []).map((p, k) => k === pIdx ? { ...p, answer: e.target.value } : p) } : t) } : x) })} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:underline"
                    onClick={() => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: [...x.topics, { title: '', content: '', pyqs: [] }] } : x) })}>
                    <Plus className="w-3.5 h-3.5" /> Add Topic
                  </button>
                </div>
              </ItemShell>
            ))}
            {subjects.length === 0 && <p className="text-xs text-gray-400 italic">No core subjects yet — add DBMS/OS/Networks/DSA/Aptitude.</p>}
          </SectionCard>
        );
      }

      case 'interview_questions': {
        const qs = draft.interview_questions || [];
        return (
          <SectionCard title={`Interview Questions (${qs.length})`} onAdd={() => set({ interview_questions: [...qs, { category: 'Technical', title: '', question: '', solution: '', code: '', language: 'cpp' }] })} addLabel="Add Question">
            {qs.map((q, idx) => (
              <ItemShell key={idx} accent="border-blue-200 bg-blue-50/30">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select className={inputCls} value={q.category}
                    onChange={(e) => set({ interview_questions: qs.map((x, i) => i === idx ? { ...x, category: e.target.value } : x) })}>
                    {['Technical', 'Coding', 'System Design', 'Pseudocode'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input className={inputCls + ' sm:col-span-2'} placeholder="Question title" value={q.title}
                    onChange={(e) => set({ interview_questions: qs.map((x, i) => i === idx ? { ...x, title: e.target.value } : x) })} />
                </div>
                <textarea rows={2} className={inputCls} placeholder="Full question..." value={q.question}
                  onChange={(e) => set({ interview_questions: qs.map((x, i) => i === idx ? { ...x, question: e.target.value } : x) })} />
                <textarea rows={2} className={inputCls} placeholder="Solution / explanation" value={q.solution}
                  onChange={(e) => set({ interview_questions: qs.map((x, i) => i === idx ? { ...x, solution: e.target.value } : x) })} />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input className={inputCls} placeholder="Code (optional)" value={q.code || ''}
                    onChange={(e) => set({ interview_questions: qs.map((x, i) => i === idx ? { ...x, code: e.target.value } : x) })} />
                  <select className={inputCls} value={q.language || 'cpp'}
                    onChange={(e) => set({ interview_questions: qs.map((x, i) => i === idx ? { ...x, language: e.target.value } : x) })}>
                    {['cpp', 'java', 'python', 'javascript', 'typescript', 'go'].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </ItemShell>
            ))}
            {qs.length === 0 && <p className="text-xs text-gray-400 italic">No interview questions yet.</p>}
          </SectionCard>
        );
      }

      case 'cheatsheets': {
        const sheets = draft.cheatsheets || [];
        return (
          <SectionCard title={`Cheatsheets (${sheets.length})`} onAdd={() => set({ cheatsheets: [...sheets, { title: '', summary: '', content: '' }] })} addLabel="Add Cheatsheet">
            {sheets.map((s, idx) => (
              <ItemShell key={idx} accent="border-amber-200 bg-amber-50/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className={inputCls} placeholder="Title (e.g. TCP/IP Ports Cheatsheet)" value={s.title}
                    onChange={(e) => set({ cheatsheets: sheets.map((x, i) => i === idx ? { ...x, title: e.target.value } : x) })} />
                  <input className={inputCls} placeholder="Summary line" value={s.summary}
                    onChange={(e) => set({ cheatsheets: sheets.map((x, i) => i === idx ? { ...x, summary: e.target.value } : x) })} />
                </div>
                <textarea rows={4} className={inputCls + ' font-mono'} placeholder="Cheatsheet content (formulas, complexity tables...)" value={s.content}
                  onChange={(e) => set({ cheatsheets: sheets.map((x, i) => i === idx ? { ...x, content: e.target.value } : x) })} />
              </ItemShell>
            ))}
            {sheets.length === 0 && <p className="text-xs text-gray-400 italic">No cheatsheets yet.</p>}
          </SectionCard>
        );
      }

      case 'never_skip_topics': {
        const topics = draft.never_skip_topics || [];
        return (
          <SectionCard title={`Never-Skip Topics (${topics.length})`} onAdd={() => set({ never_skip_topics: [...topics, { topic: '', priority: 'High', notes: '' }] })} addLabel="Add Topic">
            {topics.map((t, idx) => (
              <ItemShell key={idx} accent="border-red-200 bg-red-50/30">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input className={inputCls + ' sm:col-span-2'} placeholder="Topic (e.g. TCP 3-Way Handshake)" value={t.topic}
                    onChange={(e) => set({ never_skip_topics: topics.map((x, i) => i === idx ? { ...x, topic: e.target.value } : x) })} />
                  <select className={inputCls} value={t.priority}
                    onChange={(e) => set({ never_skip_topics: topics.map((x, i) => i === idx ? { ...x, priority: e.target.value } : x) })}>
                    {['High', 'Must Do', 'Frequent'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <textarea rows={2} className={inputCls} placeholder="Why it matters / notes" value={t.notes}
                  onChange={(e) => set({ never_skip_topics: topics.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x) })} />
              </ItemShell>
            ))}
            {topics.length === 0 && <p className="text-xs text-gray-400 italic">No never-skip topics yet.</p>}
          </SectionCard>
        );
      }

      case 'last_minute_revision': {
        const lmrs = draft.last_minute_revision || [];
        return (
          <SectionCard title={`Last-Minute Packs (${lmrs.length})`} onAdd={() => set({ last_minute_revision: [...lmrs, { title: '', points: [] }] })} addLabel="Add Pack">
            {lmrs.map((lmr, idx) => (
              <ItemShell key={idx} accent="border-amber-200 bg-white">
                <input className={inputCls} placeholder="Pack title (e.g. 24-Hour Express Notes)" value={lmr.title}
                  onChange={(e) => set({ last_minute_revision: lmrs.map((x, i) => i === idx ? { ...x, title: e.target.value } : x) })} />
                <div className="space-y-2">
                  {lmr.points.map((pt, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <input className={inputCls} placeholder="Revision point..." value={pt}
                        onChange={(e) => set({ last_minute_revision: lmrs.map((x, i) => i === idx ? { ...x, points: x.points.map((p, j) => j === pIdx ? e.target.value : p) } : x) })} />
                      <button type="button" className="p-1.5 text-gray-400 hover:text-red-600"
                        onClick={() => set({ last_minute_revision: lmrs.map((x, i) => i === idx ? { ...x, points: x.points.filter((_: any, j) => j !== pIdx) } : x) })}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                    onClick={() => set({ last_minute_revision: lmrs.map((x, i) => i === idx ? { ...x, points: [...x.points, ''] } : x) })}>
                    <Plus className="w-3.5 h-3.5" /> Add Point
                  </button>
                </div>
              </ItemShell>
            ))}
            {lmrs.length === 0 && <p className="text-xs text-gray-400 italic">No revision packs yet.</p>}
          </SectionCard>
        );
      }

      case 'hr_round': {
        const hrs = draft.hr_round || [];
        return (
          <SectionCard title={`HR Questions (${hrs.length})`} onAdd={() => set({ hr_round: [...hrs, { question: '', answer: '', tips: [] }] })} addLabel="Add HR Q">
            {hrs.map((hr, idx) => (
              <ItemShell key={idx} accent="border-sky-200 bg-sky-50/30">
                <textarea rows={2} className={inputCls} placeholder="Question (e.g. Why do you want to join us?)" value={hr.question}
                  onChange={(e) => set({ hr_round: hrs.map((x, i) => i === idx ? { ...x, question: e.target.value } : x) })} />
                <textarea rows={3} className={inputCls} placeholder="Sample STAR answer..." value={hr.answer}
                  onChange={(e) => set({ hr_round: hrs.map((x, i) => i === idx ? { ...x, answer: e.target.value } : x) })} />
                <div className="space-y-2">
                  {hr.tips.map((tip, tIdx) => (
                    <div key={tIdx} className="flex items-center gap-2">
                      <input className={inputCls} placeholder="Pro tip..." value={tip}
                        onChange={(e) => set({ hr_round: hrs.map((x, i) => i === idx ? { ...x, tips: x.tips.map((t, j) => j === tIdx ? e.target.value : t) } : x) })} />
                      <button type="button" className="p-1.5 text-gray-400 hover:text-red-600"
                        onClick={() => set({ hr_round: hrs.map((x, i) => i === idx ? { ...x, tips: x.tips.filter((_: any, j) => j !== tIdx) } : x) })}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 hover:underline"
                    onClick={() => set({ hr_round: hrs.map((x, i) => i === idx ? { ...x, tips: [...x.tips, ''] } : x) })}>
                    <Plus className="w-3.5 h-3.5" /> Add Tip
                  </button>
                </div>
              </ItemShell>
            ))}
            {hrs.length === 0 && <p className="text-xs text-gray-400 italic">No HR questions yet.</p>}
          </SectionCard>
        );
      }

      default:
        return null;
    }
  };

  const counts: Record<SectionId, number> = {
    overview: 1,
    core_subjects: draft.core_subjects?.length || 0,
    interview_questions: draft.interview_questions?.length || 0,
    cheatsheets: draft.cheatsheets?.length || 0,
    never_skip_topics: draft.never_skip_topics?.length || 0,
    last_minute_revision: draft.last_minute_revision?.length || 0,
    hr_round: draft.hr_round?.length || 0,
  };

  const filledCount = Object.keys(counts).filter((k) => (counts as any)[k] > 0).length;

  return (
    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pack Editor
          </div>
          <h3 className="text-base font-extrabold text-[#1E293B]">{module.title}</h3>
          <p className="text-xs text-gray-500">{filledCount} / 7 sections filled</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-600 font-semibold">{error}</span>}
          {saved && <span className="text-xs text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved!</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Full Pack'}
          </button>
        </div>
      </div>

      {/* Body: nav + form + preview */}
      <div className="flex flex-col lg:flex-row">
        {/* Section Nav */}
        <div className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 p-3 space-y-1 bg-gray-50/40">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button key={s.id} onClick={() => setActive(s.id)} type="button"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-[13px] font-bold ${
                  isActive ? 'bg-[#0284C7] text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                }`}>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="flex-1 truncate">{s.label}</span>
                {counts[s.id] > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    {counts[s.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Form Pane */}
        <div className="flex-1 p-5 max-h-[70vh] overflow-y-auto">
          {renderForm()}
        </div>
      </div>

      {/* Live Preview */}
      <div className="border-t border-gray-200 p-5 bg-[#F8FAFC]">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          <Eye className="w-4 h-4 text-[#0284C7]" /> Live Student Preview — Calibre, 18px body
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 max-h-[45vh] overflow-y-auto prose-article" style={{ fontFamily: "'Calibre','Calibri','Inter',sans-serif" }}>
          <PackPreview data={draft} active={active} companyName={companyName} />
        </div>
      </div>
    </div>
  );
};

// ------- Compact live preview mirrors CompanyModuleReader rendering -------
const PackPreview: React.FC<{ data: ModuleSectionData; active: SectionId; companyName: string }> = ({ data, active, companyName }) => {
  const SectionTitle = ({ children }: any) => (
    <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight mb-3">{children}</h2>
  );

  switch (active) {
    case 'overview': {
      const ov = data.overview;
      if (!ov || (!ov.companyInfo && !ov.eligibility && !ov.salaryBreakdown && !(ov.reviews?.length))) {
        return <p className="text-base text-gray-400">Overview content is empty — fill it on the left, it will render live here.</p>;
      }
      return (
        <div className="space-y-5 text-base sm:text-lg leading-relaxed text-gray-800">
          <SectionTitle><Building2 className="w-6 h-6 text-[#0284C7]" /> Company Overview</SectionTitle>
          {ov.companyInfo && <div className="p-5 bg-sky-50/70 border border-sky-200 rounded-2xl"><h3 className="font-bold text-sky-950 text-lg mb-2">Company Profile & Target Roles</h3><p className="text-sky-900">{ov.companyInfo}</p></div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ov.eligibility && <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl"><h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">Eligibility</h4><p className="text-base text-gray-700">{ov.eligibility}</p></div>}
            {ov.salaryBreakdown && <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl"><h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">CTC Package</h4><p className="text-base text-gray-700">{ov.salaryBreakdown}</p></div>}
          </div>
          {(ov.reviews || []).filter((r: any) => r.name || r.text).slice(0, 3).map((r: any, i: number) => (
            <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
              <div className="flex items-center justify-between font-bold text-gray-900 text-sm">{r.name} ({r.role})<span className="text-amber-500 text-base">★ {r.rating}/5</span></div>
              <p className="text-gray-700 italic text-base">&quot;{r.text}&quot;</p>
            </div>
          ))}
        </div>
      );
    }
    case 'core_subjects': {
      const subjects = data.core_subjects || [];
      if (subjects.length === 0) return <p className="text-base text-gray-400">No core subjects added yet.</p>;
      return (
        <div className="space-y-6">
          <SectionTitle><BookOpen className="w-6 h-6 text-[#0284C7]" /> Core Subjects & PYQs</SectionTitle>
          {subjects.map((sub, sIdx) => (
            <div key={sIdx}>
              <h3 className="text-xl font-bold text-gray-900 border-l-4 border-[#0284C7] pl-4 py-1">{sub.subject || 'Untitled'}</h3>
              <div className="mt-3 space-y-4">
                {sub.topics.map((t, tIdx) => (
                  <div key={tIdx} className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl">
                    <h4 className="font-bold text-gray-900 text-lg">{t.title}</h4>
                    <p className="text-base text-gray-800 mt-1 whitespace-pre-line">{t.content}</p>
                    {(t.pyqs || []).map((p, pIdx) => (
                      <div key={pIdx} className="mt-3 p-3 bg-white border border-gray-200 rounded-xl">
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-xs mr-2">Year {p.year}</span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-xs">{p.frequency}</span>
                        <p className="font-bold text-gray-900 text-base mt-1.5">{p.question}</p>
                        <p className="text-gray-700 text-base mt-1"><strong>Answer:</strong> {p.answer}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'interview_questions': {
      const qs = data.interview_questions || [];
      if (qs.length === 0) return <p className="text-base text-gray-400">No interview questions yet.</p>;
      return (
        <div className="space-y-5">
          <SectionTitle><Lightbulb className="w-6 h-6 text-[#0284C7]" /> Technical & Coding Questions</SectionTitle>
          {qs.map((q, idx) => (
            <div key={idx} className="p-5 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-0.5 rounded-md text-xs font-bold uppercase bg-blue-100 text-blue-800">{q.category}</span>
                <h3 className="font-bold text-gray-900 text-lg">{q.title}</h3>
              </div>
              <p className="text-base text-gray-900 font-bold">Q: {q.question}</p>
              <div className="p-3 bg-white border border-gray-200 rounded-xl text-base text-gray-800"><strong>Solution: </strong>{q.solution}</div>
              {q.code && <pre className="bg-[#0F172A] text-gray-100 rounded-xl p-4 font-mono text-sm overflow-x-auto">{q.code}</pre>}
            </div>
          ))}
        </div>
      );
    }
    case 'cheatsheets': {
      const sheets = data.cheatsheets || [];
      if (sheets.length === 0) return <p className="text-base text-gray-400">No cheatsheets yet.</p>;
      return (
        <div className="space-y-4">
          <SectionTitle><FileSpreadsheet className="w-6 h-6 text-[#0284C7]" /> Quick Cheatsheets</SectionTitle>
          {sheets.map((s, idx) => (
            <div key={idx} className="p-5 bg-amber-50/60 border border-amber-200 rounded-2xl">
              <h3 className="font-bold text-amber-950 text-xl">{s.title}</h3>
              <p className="text-base text-amber-900">{s.summary}</p>
              <div className="p-4 bg-white border border-amber-200 rounded-xl text-base text-gray-800 whitespace-pre-line">{s.content}</div>
            </div>
          ))}
        </div>
      );
    }
    case 'never_skip_topics': {
      const topics = data.never_skip_topics || [];
      if (topics.length === 0) return <p className="text-base text-gray-400">No never-skip topics yet.</p>;
      return (
        <div className="space-y-3">
          <SectionTitle><Flame className="w-6 h-6 text-amber-600" /> Never-Skip Topics</SectionTitle>
          {topics.map((t, idx) => (
            <div key={idx} className="p-4 bg-red-50/70 border border-red-200 rounded-2xl flex items-start gap-3">
              <Flame className="w-5 h-5 text-red-600 shrink-0 mt-1" />
              <div>
                <span className="font-extrabold text-gray-900 text-lg mr-2">{t.topic}<span className="ml-2 px-2.5 py-0.5 bg-red-600 text-white rounded-md text-xs font-extrabold uppercase">{t.priority}</span></span>
                <p className="text-base text-gray-700 mt-1">{t.notes}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'last_minute_revision': {
      const lmrs = data.last_minute_revision || [];
      if (lmrs.length === 0) return <p className="text-base text-gray-400">No revision items yet.</p>;
      return (
        <div className="space-y-4">
          <SectionTitle><Zap className="w-6 h-6 text-amber-500" /> Last-Minute Revision</SectionTitle>
          {lmrs.map((lmr, idx) => (
            <div key={idx} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl">
              <h3 className="font-bold text-gray-900 text-lg">{lmr.title}</h3>
              <ul className="mt-2 space-y-2">
                {lmr.points.map((pt, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-2 text-base text-gray-800"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />{pt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }
    case 'hr_round': {
      const hrs = data.hr_round || [];
      if (hrs.length === 0) return <p className="text-base text-gray-400">No HR round content yet.</p>;
      return (
        <div className="space-y-4">
          <SectionTitle><UserCheck className="w-6 h-6 text-[#0284C7]" /> HR & Behavioral Blueprint</SectionTitle>
          {hrs.map((hr, idx) => (
            <div key={idx} className="p-5 bg-sky-50/60 border border-sky-200 rounded-2xl">
              <h3 className="font-bold text-sky-950 text-lg">Q: {hr.question}</h3>
              <div className="p-3 bg-white border border-sky-100 rounded-xl text-base text-gray-800 mt-2"><strong>STAR Answer: </strong>{hr.answer}</div>
              {hr.tips?.length > 0 && (
                <ul className="mt-2 space-y-1.5 text-base text-gray-700"><strong className="text-gray-900">Pro Tips:</strong>{hr.tips.map((tip, tIdx) => <li key={tIdx} className="list-disc list-inside">{tip}</li>)}</ul>
              )}
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
};