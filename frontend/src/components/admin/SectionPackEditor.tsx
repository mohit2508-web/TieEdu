import React, { useState } from 'react';
import { ContentModule, ModuleSectionData } from '@/types';
import { saveSectionDataApi } from '@/lib/api';
import { MarkdownContent } from '@/components/blocks/MarkdownContent';
import { MarkdownEditor as MdEditor, clearEditorDraftsWithPrefix } from '@/components/editor/MarkdownEditor';
import {
  pipeTextToMarkdownTable, RICH_TEXT_MAX, clampRichFields, overLimitRichTextPaths,
} from '@/lib/richText';
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

  /**
   * The last state known to be on the server. Every field is compared against
   * this to decide whether to show its "unsaved" dot, so it has to be updated
   * exactly when a save succeeds and nowhere else.
   */
  const [savedSnapshot, setSavedSnapshot] = useState<ModuleSectionData>(module.section_data || emptySection());

  /**
   * Stable prefix for this module's per-field localStorage drafts. Includes the
   * module id so two companies' packs never read each other's drafts.
   */
  const draftPrefix = `pack-${module.id}`;

  const set = (patch: any) => setDraft((prev: any) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      // Clamp before sending, so what the admin sees after the save is what the
      // server kept. Letting the backend truncate silently would leave the
      // student page disagreeing with the editor the admin is looking at.
      const payload = clampRichFields(draft);
      const overLimit = overLimitRichTextPaths(draft);
      if (overLimit.length > 0) {
        setError(`${overLimit.length} field${overLimit.length > 1 ? 's were' : ' was'} over the ${RICH_TEXT_MAX}-character limit and the end was cut off.`);
      }
      await saveSectionDataApi(module.id, payload);
      setDraft(payload);
      setSavedSnapshot(payload);
      // Saved content is now the server's content, so any stored unsaved draft
      // for these fields is stale. Leaving it behind would repopulate a field
      // the admin deliberately cleared, on the next visit.
      clearEditorDraftsWithPrefix(draftPrefix);
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

  /**
   * One markdown field: the shared editor plus a per-field unsaved marker.
   *
   * `path` is a dotted route into the draft (`core_subjects.0.topics.1.content`).
   * It doubles as the storage key, so it must be derived from the item's own
   * identity and its position, never from a counter that shifts when an earlier
   * item is deleted — otherwise a delete would move every later field's key and
   * orphan the drafts that were already saved against them.
   */
  const PackField = ({
    path,
    value,
    onChange,
    minHeight,
    placeholder,
    ariaLabel,
  }: {
    path: string;
    value: string | undefined;
    onChange: (next: string) => void;
    minHeight?: number;
    placeholder?: string;
    ariaLabel?: string;
  }) => {
    const baseline = (path.split('.').reduce<any>(
      (acc, part) => (acc == null ? acc : acc[part]),
      savedSnapshot as any,
    ));
    const isDirty = String(baseline ?? '') !== String(value ?? '');

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {isDirty && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"
              title="Edited but not saved yet"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              Unsaved
            </span>
          )}
        </div>
        <MdEditor
          compact
          maxChars={RICH_TEXT_MAX}
          minHeight={minHeight}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          draftKey={`${draftPrefix}-${path}`}
        />
      </div>
    );
  };

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
              <PackField path={`overview.companyInfo`} minHeight={150} ariaLabel="Company profile and target roles" value={ov.companyInfo} onChange={(v) => set({ overview: { ...ov, companyInfo: v } })}
                placeholder={`${companyName} is a leading... Roles include SDE-1, Security Engineer...`} />
            </div>
            <div>
              <label className={labelCls}>Eligibility Criteria</label>
              <PackField path={`overview.eligibility`} minHeight={110} ariaLabel="Eligibility criteria" value={ov.eligibility} onChange={(v) => set({ overview: { ...ov, eligibility: v } })}
                placeholder="B.Tech / M.Tech with 60% or 6.5 CGPA..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + ' mb-0'}>Salary & CTC Breakdown</label>
                <button type="button" onClick={() => set({ overview: { ...ov, salaryBreakdown: pipeTextToMarkdownTable(ov.salaryBreakdown) } })}
                  className="text-[11px] font-bold text-[#0284C7] hover:underline" title="Turn a 'Label: value | Label: value' line into a table">
                  Make it a table
                </button>
              </div>
              <PackField path={`overview.salaryBreakdown`} minHeight={150} ariaLabel="Salary and CTC breakdown" value={ov.salaryBreakdown} onChange={(v) => set({ overview: { ...ov, salaryBreakdown: v } })}
                placeholder={'SDE-1 Base: ₹12L - ₹22L\nFixed Bonus: ₹2L\nJoining Stocks: ₹4L - ₹8L\n\nOr a markdown table:\n| Component | Amount |\n| --- | --- |\n| Base | ₹12L |'} />
            </div>

            <SectionCard title={`Candidate Reviews (${ov.reviews?.length || 0})`} onAdd={() => set({ overview: { ...ov, reviews: [...(ov.reviews || []), { name: '', role: '', rating: 5, text: '' }] } })} addLabel="Add Review">
              {(ov.reviews || []).map((r: any, idx: number) => (
                <ItemShell key={idx} onRemove={() => set({ overview: { ...ov, reviews: (ov.reviews || []).filter((_: any, i: number) => i !== idx) } })}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input className={inputCls} placeholder="Student name" value={r.name} onChange={(e) => set({ overview: { ...ov, reviews: (ov.reviews || []).map((x: any, i: number) => i === idx ? { ...x, name: e.target.value } : x) } })} />
                    <input className={inputCls} placeholder="Role (SDE @ Co)" value={r.role} onChange={(e) => set({ overview: { ...ov, reviews: (ov.reviews || []).map((x: any, i: number) => i === idx ? { ...x, role: e.target.value } : x) } })} />
                    <input className={inputCls} type="number" min={1} max={5} placeholder="Rating" value={r.rating} onChange={(e) => set({ overview: { ...ov, reviews: (ov.reviews || []).map((x: any, i: number) => i === idx ? { ...x, rating: Number(e.target.value) } : x) } })} />
                  </div>
                  <PackField path={`overview.reviews.${idx}.text`} minHeight={90} ariaLabel="Review text" value={r.text} onChange={(v) => set({ overview: { ...ov, reviews: (ov.reviews || []).map((x: any, i: number) => i === idx ? { ...x, text: v } : x) } })} />
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
                      <PackField path={`core_subjects.${sIdx}.topics.${tIdx}.content`} minHeight={190} ariaLabel={`Topic content for ${topic.title || 'topic'}`} value={topic.content} onChange={(v) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, content: v } : t) } : x) })}
                        placeholder={'Explain the concept. Use the toolbar for headings, bold and lists, or paste straight from a document.'} />

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
                            </div>
                            {/*
                              The question is a markdown field — the reader renders it through
                              `MarkdownContent`. It used to be a single-line `<input>`, which
                              silently flattened every newline on save: an author who pasted a
                              multi-line question (or whose existing data had one) got it joined
                              into one run-on line the first time they touched the answer.
                            */}
                            <PackField path={`core_subjects.${sIdx}.topics.${tIdx}.pyqs.${pIdx}.question`} minHeight={90} ariaLabel="PYQ question" value={pyq.question} onChange={(v) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, pyqs: (t.pyqs || []).map((p, k) => k === pIdx ? { ...p, question: v } : p) } : t) } : x) })} />
                            <PackField path={`core_subjects.${sIdx}.topics.${tIdx}.pyqs.${pIdx}.answer`} minHeight={110} ariaLabel="PYQ answer" value={pyq.answer} onChange={(v) => set({ core_subjects: subjects.map((x, i) => i === sIdx ? { ...x, topics: x.topics.map((t, j) => j === tIdx ? { ...t, pyqs: (t.pyqs || []).map((p, k) => k === pIdx ? { ...p, answer: v } : p) } : t) } : x) })} />
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
                <PackField path={`interview_questions.${idx}.question`} minHeight={100} ariaLabel="Interview question" value={q.question} onChange={(v) => set({ interview_questions: qs.map((x, i) => i === idx ? { ...x, question: v } : x) })} />
                <PackField path={`interview_questions.${idx}.solution`} minHeight={170} ariaLabel="Solution or explanation" value={q.solution} onChange={(v) => set({ interview_questions: qs.map((x, i) => i === idx ? { ...x, solution: v } : x) })}
                  placeholder={'Explain the approach. Lists, code fences and bold all work here.'} />
                {/*
                  A monospace textarea, not an input and not a MarkdownEditor. The reader
                  renders this inside a `<pre>` with a copy button, and the plan calls for
                  it to stay plain preformatted: an ASCII layout or an aligned complexity
                  table would be destroyed by markdown reflow. A single-line input was
                  worse still — an author could not type a second line, and pasting a whole
                  function joined it into one line.
                */}
                <textarea
                  rows={6}
                  spellCheck={false}
                  className={inputCls + ' font-mono text-xs leading-relaxed resize-y'}
                  placeholder={'Optional code. Plain text — newlines and indentation are preserved exactly.'}
                  aria-label="Code sample"
                  value={q.code || ''}
                  onChange={(e) => set({ interview_questions: qs.map((x, i) => i === idx ? { ...x, code: e.target.value } : x) })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                  <input className={inputCls} placeholder="Title (e.g. TCP/IP Ports Cheatsheet)" aria-label="Cheatsheet title" value={s.title}
                    onChange={(e) => set({ cheatsheets: sheets.map((x, i) => i === idx ? { ...x, title: e.target.value } : x) })} />
                  {/* The reader renders the summary through `MarkdownContent`, so it is authored
                      as markdown. As a single-line input it flattened newlines on save, and an
                      author had no way to bold the one fact the sheet exists to convey. */}
                  <div className="sm:col-span-2">
                    <PackField path={`cheatsheets.${idx}.summary`} minHeight={70} ariaLabel="Cheatsheet summary" value={s.summary || ''}
                      onChange={(v) => set({ cheatsheets: sheets.map((x, i) => i === idx ? { ...x, summary: v } : x) })}
                      placeholder="One line on what this sheet covers." />
                  </div>
                </div>
                {/* Deliberately a plain monospace textarea, not a MarkdownEditor. This field holds
                    ASCII-art and fixed-width reference tables whose alignment is the whole point, and
                    the reader renders it in a <pre> block, so markdown formatting would only get in
                    the way. */}
                <textarea rows={4} spellCheck={false} aria-label="Cheatsheet content" className={inputCls + ' font-mono'} placeholder="Cheatsheet content (formulas, complexity tables...)" value={s.content}
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
                <PackField path={`never_skip_topics.${idx}.notes`} minHeight={110} ariaLabel="Why this topic matters" value={t.notes} onChange={(v) => set({ never_skip_topics: topics.map((x, i) => i === idx ? { ...x, notes: v } : x) })} />
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
                <PackField path={`hr_round.${idx}.question`} minHeight={90} ariaLabel="HR question" value={hr.question} onChange={(v) => set({ hr_round: hrs.map((x, i) => i === idx ? { ...x, question: v } : x) })}
                  placeholder="Question (e.g. Why do you want to join us?)" />
                <PackField path={`hr_round.${idx}.answer`} minHeight={190} ariaLabel="Sample STAR answer" value={hr.answer} onChange={(v) => set({ hr_round: hrs.map((x, i) => i === idx ? { ...x, answer: v } : x) })}
                  placeholder={'Sample STAR answer...\n\n**Situation:** ...\n**Task:** ...\n**Action:** ...\n**Result:** ...'} />
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

  /**
   * How much of each section is filled, shown in the editor header.
   *
   * `overview` used to be a hardcoded `1`, so a brand-new pack reported
   * "7 / 7 sections filled" before the admin had typed a single character, and
   * the one section with no items in it (so no other signal that it is empty)
   * was the only one that looked done. It is counted from its actual fields now.
   */
  const ovFilled = draft.overview || { companyInfo: '', eligibility: '', salaryBreakdown: '', reviews: [] as Array<{ text?: string }> };
  const overviewFilled = [
    ovFilled.companyInfo, ovFilled.eligibility, ovFilled.salaryBreakdown,
    ...(ovFilled.reviews || []).map((r) => r.text || ''),
  ].filter((v) => String(v ?? '').trim().length > 0).length;

  const counts: Record<SectionId, number> = {
    overview: overviewFilled,
    core_subjects: draft.core_subjects?.length || 0,
    interview_questions: draft.interview_questions?.length || 0,
    cheatsheets: draft.cheatsheets?.length || 0,
    never_skip_topics: draft.never_skip_topics?.length || 0,
    last_minute_revision: draft.last_minute_revision?.length || 0,
    hr_round: draft.hr_round?.length || 0,
  };

  const filledCount = Object.keys(counts).filter((k) => (counts as any)[k] > 0).length;

  /**
   * Which sections differ from the last saved copy. This covers the plain
   * single-line inputs too, not just the markdown fields, so switching section
   * tabs can warn before an admin walks away from a half-typed salary field.
   */
  const dirtySections = sections
    .map((s) => s.id)
    .filter((id) => JSON.stringify((draft as any)[id] ?? null) !== JSON.stringify((savedSnapshot as any)[id] ?? null));

  const isDirty = dirtySections.length > 0;

  // A pack can be a few thousand words of hand-written CTC tiers and PYQs. Losing
  // that to an accidental tab close or refresh is the worst failure this screen
  // has, so the browser's own confirm is the only backstop.
  React.useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  return (
    // `overflow-clip`, not `overflow-hidden`: `hidden` establishes a scroll
    // container that never scrolls, and the sticky mobile save bar would then
    // resolve against a zero-scroll-range ancestor and never actually stick.
    <div className="bg-white border border-gray-200 rounded-3xl overflow-clip shadow-xs">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pack Editor
          </div>
          <h3 className="text-base font-extrabold text-[#1E293B]">{module.title}</h3>
          <p className="text-xs text-gray-500">{filledCount} / 7 sections filled</p>
          {isDirty && (
            <p className="text-xs font-bold text-amber-700 mt-0.5">
              Unsaved changes in {dirtySections.length} section{dirtySections.length > 1 ? 's' : ''} — save to keep them
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-600 font-semibold">{error}</span>}
          {saved && <span className="text-xs text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved!</span>}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            title={isDirty ? undefined : 'No unsaved changes'}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : isDirty ? 'Save Full Pack' : 'Saved'}
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
                {dirtySections.includes(s.id) && (
                  <span
                    className={`w-2 h-2 shrink-0 rounded-full ${isActive ? 'bg-amber-300' : 'bg-amber-500'}`}
                    title="This section has unsaved changes"
                    aria-label="This section has unsaved changes"
                  />
                )}
                {counts[s.id] > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    {counts[s.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Form Pane. Uncapped on mobile: a `max-h` + `overflow-y-auto` pane
            inside an already-scrolling page is a nested-scroll trap, and it is
            what pushed the save button out of reach on a phone. The pane still
            becomes a bounded scroll region from `lg` up, where the side-by-side
            layout needs the vertical space back. */}
        <div className="flex-1 p-5 lg:max-h-[70vh] lg:overflow-y-auto">
          {renderForm()}
        </div>
      </div>

      {/* Live Preview */}
      <div className="border-t border-gray-200 p-5 bg-[#F8FAFC]">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          <Eye className="w-4 h-4 text-[#0284C7]" /> Live Student Preview — Calibre, 18px body
        </div>
        {/* No prose-article here on purpose: each field below renders its own
            MarkdownContent, and nesting both would apply the prose rules twice. */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 max-h-[45vh] overflow-y-auto" style={{ fontFamily: "'Calibre','Calibri','Inter',sans-serif" }}>
          <PackPreview data={draft} active={active} companyName={companyName} />
        </div>
      </div>

      {/* Sticky save bar (mobile only).
          The only save button lived in this card's header, above a form pane that
          is itself a 70vh scroll region — so on a phone you had to scroll back up
          past seven sections to reach it. This pins the same action inside thumb
          reach and only shows while there is something to save, so it does not
          permanently cover the preview. */}
      <div className="lg:hidden sticky bottom-0 z-20 px-5 py-3 bg-white/95 backdrop-blur border-t border-gray-200 safe-bottom">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {error ? (
              <p className="text-[12px] font-bold text-red-600 truncate">{error}</p>
            ) : saved ? (
              <p className="text-[12px] font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 shrink-0" /> Saved</p>
            ) : isDirty ? (
              <p className="text-[12px] font-bold text-amber-700 truncate">
                Unsaved in {dirtySections.length} section{dirtySections.length > 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-[12px] text-gray-400 truncate">All changes saved</p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            title={isDirty ? undefined : 'No unsaved changes'}
            className="shrink-0 inline-flex items-center gap-2 px-5 min-h-[2.75rem] bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors focus-ring"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Pack'}
          </button>
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
          {ov.companyInfo && <div className="p-5 bg-sky-50/70 border border-sky-200 rounded-2xl"><h3 className="font-bold text-sky-950 text-lg mb-2">Company Profile & Target Roles</h3><MarkdownContent className="text-sky-900">{ov.companyInfo}</MarkdownContent></div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ov.eligibility && <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl"><h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">Eligibility</h4><MarkdownContent className="text-base text-gray-700">{ov.eligibility}</MarkdownContent></div>}
            {ov.salaryBreakdown && <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl"><h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">CTC Package</h4><MarkdownContent className="text-base text-gray-700">{ov.salaryBreakdown}</MarkdownContent></div>}
          </div>
          {(ov.reviews || []).filter((r: any) => r.name || r.text).slice(0, 3).map((r: any, i: number) => (
            <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
              <div className="flex items-center justify-between font-bold text-gray-900 text-sm">{r.name} ({r.role})<span className="text-amber-500 text-base">★ {r.rating}/5</span></div>
              <MarkdownContent compact>{`"${r.text}"`}</MarkdownContent>
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
                    <MarkdownContent className="text-base text-gray-800 mt-1">{t.content}</MarkdownContent>
                    {(t.pyqs || []).map((p, pIdx) => (
                      <div key={pIdx} className="mt-3 p-3 bg-white border border-gray-200 rounded-xl">
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-xs mr-2">Year {p.year}</span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-xs">{p.frequency}</span>
                        <MarkdownContent compact className="font-bold text-gray-900 text-base mt-1.5">{p.question}</MarkdownContent>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-900 mt-2">Answer</span>
                        <MarkdownContent compact className="text-gray-700 text-base">{p.answer}</MarkdownContent>
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
              <MarkdownContent className="text-base text-gray-900 font-bold">{q.question}</MarkdownContent>
              <div className="p-3 bg-white border border-gray-200 rounded-xl text-base text-gray-800">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-sky-900 mb-1">Solution</span>
                <MarkdownContent className="text-gray-800">{q.solution}</MarkdownContent>
              </div>
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
              <MarkdownContent compact className="text-base text-amber-900">{s.summary}</MarkdownContent>
              {/* Plain on purpose: cheatsheets hold aligned ASCII tables / complexity
                  charts, and font-mono + pre-line is what preserves the columns. */}
              <div className="p-4 bg-white border border-amber-200 rounded-xl text-base text-gray-800 font-mono whitespace-pre-line overflow-x-auto">{s.content}</div>
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
                <MarkdownContent compact className="text-base text-gray-700 mt-1">{t.notes}</MarkdownContent>
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
                  <li key={pIdx} className="flex items-start gap-2 text-base text-gray-800"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /><MarkdownContent compact>{pt}</MarkdownContent></li>
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
              <div className="p-3 bg-white border border-sky-100 rounded-xl text-base text-gray-800 mt-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-sky-950 mb-1">Sample STAR answer</span>
                <MarkdownContent className="text-gray-800">{hr.answer}</MarkdownContent>
              </div>
              {hr.tips?.length > 0 && (
                <div className="mt-2 text-base text-gray-700">
                  <span className="font-bold text-gray-900">Pro Tips:</span>
                  <ul className="space-y-1.5 pl-2">{hr.tips.map((tip, tIdx) => <li key={tIdx} className="list-disc list-inside"><MarkdownContent compact>{tip}</MarkdownContent></li>)}</ul>
                </div>
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
