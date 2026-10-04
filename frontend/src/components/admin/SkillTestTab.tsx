import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus, RefreshCcw, Pencil, Trash2, CheckCircle2, XCircle, Search,
  BrainCircuit, BarChart3, FileText, ClipboardList, Award,
} from 'lucide-react';
import {
  adminFetchSkillsApi, adminCreateSkillApi, adminUpdateSkillApi, adminDeleteSkillApi,
  adminFetchTopicsApi, adminCreateTopicApi, adminDeleteTopicApi,
  adminFetchQuestionsApi, adminCreateQuestionApi, adminUpdateQuestionApi,
  adminReviewQuestionApi, adminRetireQuestionApi, adminDeleteQuestionApi,
  adminFetchAssessmentsApi, adminCreateAssessmentApi, adminUpdateAssessmentApi, adminDeleteAssessmentApi,
  adminFetchCertificatesApi, adminRevokeCertificateApi, adminRestoreCertificateApi,
  adminFetchSkillAnalyticsApi,
  SkillTestSkill, SkillTestTopic, SkillTestAssessment, SkillTestCertificate,
  AdminQuestion, AdminQuestionOption, AdminSkillAnalytics,
} from '@/lib/skillTestApi';
import {
  Panel, Btn, Field, TextInput, TextArea, Select, Toggle,
  ErrorNote, OkNote, Loading, Empty, Pill,
} from './course/CourseAdminUi';

type Section = 'analytics' | 'skills' | 'topics' | 'questions' | 'assessments' | 'certificates';

const SECTIONS: { id: Section; label: string; icon: any }[] = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'skills', label: 'Skills', icon: BrainCircuit },
  { id: 'topics', label: 'Topics', icon: ClipboardList },
  { id: 'questions', label: 'Questions', icon: FileText },
  { id: 'assessments', label: 'Assessments', icon: ClipboardList },
  { id: 'certificates', label: 'Certificates', icon: Award },
];

const CATEGORIES = ['Programming', 'Core CS', 'Web Development', 'DevOps & Cloud', 'Databases', 'Others'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'];
const Q_TYPES = [
  'single_choice', 'multiple_choice', 'true_false', 'output_prediction',
  'debugging_mcq', 'scenario_based', 'match_following', 'ordering',
  'image_diagram', 'assertion_reason',
];
const STATUS_TONES: Record<string, 'green' | 'red' | 'gray' | 'amber'> = {
  approved: 'green', draft: 'gray', review: 'amber', retired: 'red', active: 'green', valid: 'green', revoked: 'red',
};

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const SkillTestTab: React.FC = () => {
  const [section, setSection] = useState<Section>('analytics');

  const [skills, setSkills] = useState<SkillTestSkill[]>([]);
  const [topics, setTopics] = useState<SkillTestTopic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const flash = (msg: string) => { setNote(msg); setError(null); setTimeout(() => setNote(null), 4000); };
  const fail = (e: unknown) => { setError(e instanceof Error ? e.message : 'Request failed'); setNote(null); };

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([adminFetchSkillsApi(), adminFetchTopicsApi()]);
      setSkills(s); setTopics(t);
      setError(null);
    } catch (e) { fail(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  const topicName = (id: string) => topics.find((t) => t.id === id)?.name || '—';
  const skillName = (id: string) => skills.find((s) => s.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      {/* Section switcher */}
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => { setSection(s.id); setError(null); setNote(null); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                section === s.id
                  ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]'
                  : 'bg-white text-[#3E4754] border-gray-300 hover:bg-[#F3F2EE]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          );
        })}
        <div className="ml-auto">
          <Btn onClick={loadBase} busy={loading}><RefreshCcw className="w-3.5 h-3.5" /> Reload</Btn>
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {note && <OkNote>{note}</OkNote>}
      {loading && section === 'analytics' && <Loading label="Loading skill test data" />}

      {!loading && section === 'analytics' && <AnalyticsSection />}
      {section === 'skills' && (
        <SkillsSection skills={skills} reload={loadBase} flash={flash} fail={fail} />
      )}
      {section === 'topics' && (
        <TopicsSection skills={skills} topics={topics} reload={loadBase} flash={flash} fail={fail} />
      )}
      {section === 'questions' && (
        <QuestionsSection skills={skills} topics={topics} reloadBase={loadBase} flash={flash} fail={fail} />
      )}
      {section === 'assessments' && (
        <AssessmentsSection skills={skills} topics={topics} flash={flash} fail={fail} />
      )}
      {section === 'certificates' && <CertificatesSection flash={flash} fail={fail} />}
    </div>
  );
};

// ─── Analytics ─────────────────────────────────────────────────────────────

const AnalyticsSection: React.FC = () => {
  const [data, setData] = useState<AdminSkillAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetchSkillAnalyticsApi().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading label="Loading analytics" />;

  const cards = [
    { label: 'Total attempts', value: data.totalAttempts },
    { label: 'Completed', value: data.completedAttempts },
    { label: 'In progress', value: data.inProgress },
    { label: 'Avg score', value: `${data.avgScore}%` },
    { label: 'Pass rate', value: `${data.passRate}%` },
    { label: 'Certificates', value: data.certificatesValid },
    { label: 'Skills', value: data.totalSkills },
    { label: 'Approved Qs', value: `${data.approvedQuestions}/${data.totalQuestions}` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-[#E9E7E1] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{c.label}</p>
            <p className="text-2xl font-extrabold text-[#10151C] mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <Panel title="Attempts by skill" subtitle="Which assessments students actually take">
        {Object.keys(data.skillAttempts).length === 0 ? (
          <Empty>No attempts recorded yet.</Empty>
        ) : (
          <div className="space-y-2">
            {Object.entries(data.skillAttempts).map(([skillId, count]) => (
              <div key={skillId} className="flex items-center justify-between text-[12.5px] py-1.5 border-b border-[#F3F2EE] last:border-0">
                <span className="font-mono text-[#6B7280]">{skillId}</span>
                <span className="font-mono font-bold text-[#0E2A44]">{count}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

// ─── Skills ────────────────────────────────────────────────────────────────

interface BaseProps {
  flash: (msg: string) => void;
  fail: (e: unknown) => void;
}

const SkillsSection: React.FC<{ skills: SkillTestSkill[]; reload: () => Promise<void> } & BaseProps> = ({ skills, reload, flash, fail }) => {
  const emptyForm = { name: '', slug: '', category: 'Programming', description: '', shortDescription: '', totalQuestions: 30, avgCompletionTime: 30, certificateAvailable: true, displayOrder: 0 };
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setForm(emptyForm); setEditingId(null); };
  const openEdit = (s: SkillTestSkill) => {
    setForm({ name: s.name, slug: s.slug, category: s.category, description: s.description, shortDescription: s.shortDescription, totalQuestions: s.totalQuestions, avgCompletionTime: s.avgCompletionTime, certificateAvailable: s.certificateAvailable, displayOrder: s.displayOrder });
    setEditingId(s.id);
  };

  const save = async () => {
    if (!form) return;
    if (!form.name || !form.slug) return fail(new Error('Name and slug are required'));
    setBusy(true);
    try {
      if (editingId) { await adminUpdateSkillApi(editingId, form); flash('Skill updated'); }
      else { await adminCreateSkillApi(form); flash('Skill created'); }
      setForm(null); setEditingId(null);
      await reload();
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const remove = async (s: SkillTestSkill) => {
    if (!window.confirm(`Archive "${s.name}"? It will disappear from the public listing.`)) return;
    setBusy(true);
    try { await adminDeleteSkillApi(s.id); flash('Skill archived'); await reload(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  return (
    <Panel
      title="Skills"
      subtitle={`${skills.length} total`}
      actions={<Btn variant="primary" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> New skill</Btn>}
    >
      {form && (
        <div className="mb-5 rounded-xl border border-[#B8E3F7] bg-[#F7FBFE] p-4 space-y-3">
          <p className="text-[12px] font-extrabold text-[#1F3A5F]">{editingId ? 'Edit skill' : 'New skill'}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : slugify(e.target.value) })} placeholder="Java Programming" /></Field>
            <Field label="Slug" hint="Unique — used in the public URL">
              <TextInput value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="java" />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Display order"><TextInput type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} /></Field>
            <Field label="Total questions"><TextInput type="number" value={form.totalQuestions} onChange={(e) => setForm({ ...form, totalQuestions: Number(e.target.value) })} /></Field>
            <Field label="Avg minutes"><TextInput type="number" value={form.avgCompletionTime} onChange={(e) => setForm({ ...form, avgCompletionTime: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Description"><TextArea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Toggle checked={form.certificateAvailable} onChange={(v) => setForm({ ...form, certificateAvailable: v })} label="Certificate available" hint="Students earn a verified certificate on passing" />
          <div className="flex gap-2 pt-1">
            <Btn variant="primary" onClick={save} busy={busy}>{editingId ? 'Save' : 'Create'}</Btn>
            <Btn onClick={() => setForm(null)}>Cancel</Btn>
          </div>
        </div>
      )}

      {skills.length === 0 ? (
        <Empty>No skills yet — create the first one.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] border-b border-[#EDEDEB]">
                <th className="py-2 pr-3">Skill</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Slug</th>
                <th className="py-2 pr-3 text-right">Qs</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Cert</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F2EE]">
              {skills.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 pr-3 font-bold text-[#10151C]">{s.name}</td>
                  <td className="py-2.5 pr-3 text-[#6B7280]">{s.category}</td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-[#9CA3AF]">{s.slug}</td>
                  <td className="py-2.5 pr-3 text-right font-mono">{s.totalQuestions}</td>
                  <td className="py-2.5 pr-3"><Pill tone={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Pill></td>
                  <td className="py-2.5 pr-3">{s.certificateAvailable ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}</td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <Btn onClick={() => openEdit(s)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Btn>{' '}
                    <Btn variant="danger" onClick={() => remove(s)} busy={busy} title="Archive"><Trash2 className="w-3.5 h-3.5" /></Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

// ─── Topics ────────────────────────────────────────────────────────────────

const TopicsSection: React.FC<{ skills: SkillTestSkill[]; topics: SkillTestTopic[]; reload: () => Promise<void> } & BaseProps> = ({ skills, topics, reload, flash, fail }) => {
  const [skillId, setSkillId] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const effectiveSkill = skillId || skills[0]?.id || '';
  const list = topics.filter((t) => t.skillId === effectiveSkill);

  const add = async () => {
    if (!effectiveSkill || !name.trim()) return;
    setBusy(true);
    try {
      await adminCreateTopicApi({ skillId: effectiveSkill, name: name.trim(), slug: slugify(name) });
      flash('Topic added'); setName('');
      await reload();
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const remove = async (t: SkillTestTopic) => {
    if (!window.confirm(`Remove topic "${t.name}"?`)) return;
    setBusy(true);
    try { await adminDeleteTopicApi(t.id); flash('Topic removed'); await reload(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  if (skills.length === 0) return <Panel title="Topics"><Empty>Create a skill first.</Empty></Panel>;

  return (
    <Panel
      title="Topics"
      subtitle={`${list.length} topic${list.length === 1 ? '' : 's'} in ${skillNameOf(skills, effectiveSkill)}`}
      actions={
        <Select value={effectiveSkill} onChange={(e) => setSkillId(e.target.value)} className="min-w-[180px]">
          {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      }
    >
      <div className="flex gap-2 mb-4">
        <TextInput value={name} placeholder="New topic name (e.g. Multithreading)" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        <Btn variant="primary" onClick={add} busy={busy}><Plus className="w-3.5 h-3.5" /> Add</Btn>
      </div>
      {list.length === 0 ? (
        <Empty>No topics yet for this skill.</Empty>
      ) : (
        <div className="divide-y divide-[#F3F2EE]">
          {list.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-[13px] font-bold text-[#10151C]">{t.name}</p>
                <p className="text-[11px] font-mono text-[#9CA3AF]">{t.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={t.isActive ? 'green' : 'gray'}>{t.isActive ? 'active' : 'hidden'}</Pill>
                <Btn variant="danger" onClick={() => remove(t)} busy={busy}><Trash2 className="w-3.5 h-3.5" /></Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
};

const skillNameOf = (skills: SkillTestSkill[], id: string) => skills.find((s) => s.id === id)?.name || '';

// ─── Questions ─────────────────────────────────────────────────────────────

const QUESTIONS_PER_PAGE = 25;

const QuestionsSection: React.FC<{ skills: SkillTestSkill[]; topics: SkillTestTopic[]; reloadBase: () => Promise<void> } & BaseProps> = ({ skills, topics, reloadBase, flash, fail }) => {
  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingQ, setLoadingQ] = useState(true);
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<AdminQuestion> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effSkill = skillFilter || skills[0]?.id || '';
  const effTopics = topics.filter((t) => t.skillId === effSkill);
  const topicName = (id: string) => topics.find((t) => t.id === id)?.name || '—';

  const load = useCallback(async () => {
    setLoadingQ(true);
    try {
      const res = await adminFetchQuestionsApi({
        skillId: effSkill || undefined,
        status: statusFilter || undefined,
        difficulty: diffFilter || undefined,
        page, limit: QUESTIONS_PER_PAGE,
      });
      setItems(res.items); setTotal(res.total);
    } catch (e) { fail(e); }
    finally { setLoadingQ(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effSkill, statusFilter, diffFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [effSkill, statusFilter, diffFilter]);

  const visible = search
    ? items.filter((q) => q.question.toLowerCase().includes(search.toLowerCase()))
    : items;

  const blankQuestion = (): Partial<AdminQuestion> => ({
    skillId: effSkill,
    topicId: effTopics[0]?.id || '',
    type: 'single_choice',
    difficulty: 'beginner',
    question: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    explanation: '',
    tags: [],
    status: 'draft',
  });

  const openCreate = () => { setEditing(blankQuestion()); setEditingId(null); };
  const openEdit = (q: AdminQuestion) => { setEditing({ ...q, options: q.options.map((o) => ({ ...o })) }); setEditingId(q.id); };

  const setOpt = (idx: number, patch: Partial<AdminQuestionOption>) => {
    if (!editing?.options) return;
    const next = editing.options.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    // single-correct types: choosing one correct clears the others
    const single = editing.type !== 'multiple_choice';
    if (patch.isCorrect === true && single) next.forEach((o, i) => { if (i !== idx) o.isCorrect = false; });
    setEditing({ ...editing, options: next });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.question?.trim()) return fail(new Error('Question text is required'));
    if (!editing.topicId) return fail(new Error('Pick a topic'));
    const opts = (editing.options || []).filter((o) => o.text.trim());
    if (opts.length < 2) return fail(new Error('At least two options with text are required'));
    if (!opts.some((o) => o.isCorrect)) return fail(new Error('Mark at least one correct option'));
    setBusy(true);
    try {
      const payload = { ...editing, options: opts };
      if (editingId) { await adminUpdateQuestionApi(editingId, payload); flash('Question updated'); }
      else { await adminCreateQuestionApi(payload as any); flash('Question created as draft'); }
      setEditing(null); setEditingId(null);
      await load(); await reloadBase();
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const review = async (q: AdminQuestion, action: 'approve' | 'reject') => {
    setBusy(true);
    try { await adminReviewQuestionApi(q.id, action); flash(action === 'approve' ? 'Question approved' : 'Sent back to draft'); await load(); await reloadBase(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const retire = async (q: AdminQuestion) => {
    if (!window.confirm('Retire this question? It will no longer be served in assessments.')) return;
    setBusy(true);
    try { await adminRetireQuestionApi(q.id); flash('Question retired'); await load(); await reloadBase(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const remove = async (q: AdminQuestion) => {
    if (!window.confirm('Permanently delete this question? This cannot be undone.')) return;
    setBusy(true);
    try { await adminDeleteQuestionApi(q.id); flash('Question deleted'); await load(); await reloadBase(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const pages = Math.max(1, Math.ceil(total / QUESTIONS_PER_PAGE));

  return (
    <div className="space-y-4">
      <Panel
        title="Question bank"
        subtitle={`${total} question${total === 1 ? '' : 's'} matched`}
        actions={<Btn variant="primary" onClick={openCreate} disabled={skills.length === 0}><Plus className="w-3.5 h-3.5" /> New question</Btn>}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <Select value={effSkill} onChange={(e) => setSkillFilter(e.target.value)}>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="retired">Retired</option>
          </Select>
          <Select value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)}>
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <TextInput value={search} placeholder="Search this page…" onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>

        {editing && (
          <div className="mb-5 rounded-xl border border-[#B8E3F7] bg-[#F7FBFE] p-4 space-y-3">
            <p className="text-[12px] font-extrabold text-[#1F3A5F]">{editingId ? 'Edit question' : 'New question'}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Skill">
                <Select value={editing.skillId} onChange={(e) => {
                  const sid = e.target.value;
                  const firstTopic = topics.find((t) => t.skillId === sid);
                  setEditing({ ...editing, skillId: sid, topicId: firstTopic?.id || '' });
                }}>
                  {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Topic">
                <Select value={editing.topicId} onChange={(e) => setEditing({ ...editing, topicId: e.target.value })}>
                  <option value="">Select topic…</option>
                  {topics.filter((t) => t.skillId === editing.skillId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
              <Field label="Type">
                <Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                  {Q_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </Select>
              </Field>
              <Field label="Difficulty">
                <Select value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value as any })}>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Question">
              <TextArea rows={3} value={editing.question || ''} onChange={(e) => setEditing({ ...editing, question: e.target.value })} placeholder="Which keyword is used to inherit a class in Java?" />
            </Field>

            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">
                Options — check the correct one{editing.type === 'multiple_choice' ? 's' : ''}
              </span>
              <div className="space-y-2">
                {(editing.options || []).map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type={editing.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                      name="correct-opt"
                      checked={!!o.isCorrect}
                      onChange={() => setOpt(i, { isCorrect: !o.isCorrect })}
                      className="w-4 h-4 accent-[#0284C7]"
                      aria-label={`Option ${i + 1} correct`}
                    />
                    <TextInput value={o.text} placeholder={`Option ${i + 1}`} onChange={(e) => setOpt(i, { text: e.target.value })} />
                    <Btn variant="danger" onClick={() => setEditing({ ...editing, options: (editing.options || []).filter((_, j) => j !== i) })} title="Remove option">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Btn>
                  </div>
                ))}
              </div>
              <Btn className="mt-2" onClick={() => setEditing({ ...editing, options: [...(editing.options || []), { text: '', isCorrect: false }] })}>
                <Plus className="w-3.5 h-3.5" /> Add option
              </Btn>
            </div>

            <Field label="Explanation" hint="Shown after submission when the assessment allows it">
              <TextArea rows={2} value={editing.explanation || ''} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} />
            </Field>

            <div className="flex gap-2 pt-1">
              <Btn variant="primary" onClick={save} busy={busy}>{editingId ? 'Save' : 'Create draft'}</Btn>
              <Btn onClick={() => setEditing(null)}>Cancel</Btn>
            </div>
          </div>
        )}

        {loadingQ ? (
          <Loading label="Loading questions" />
        ) : visible.length === 0 ? (
          <Empty>No questions match these filters.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] border-b border-[#EDEDEB]">
                  <th className="py-2 pr-3">Question</th>
                  <th className="py-2 pr-3">Topic</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Difficulty</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F2EE]">
                {visible.map((q) => (
                  <tr key={q.id}>
                    <td className="py-2.5 pr-3 max-w-[420px]">
                      <p className="text-[#10151C] font-medium line-clamp-2">{q.question}</p>
                      <p className="text-[10.5px] text-[#9CA3AF] font-mono">v{q.version} · {q.options.length} options</p>
                    </td>
                    <td className="py-2.5 pr-3 text-[#6B7280]">{topicName(q.topicId)}</td>
                    <td className="py-2.5 pr-3 text-[#6B7280] whitespace-nowrap">{q.type.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 pr-3"><Pill tone={q.difficulty === 'expert' ? 'amber' : 'gray'}>{q.difficulty}</Pill></td>
                    <td className="py-2.5 pr-3"><Pill tone={STATUS_TONES[q.status] || 'gray'}>{q.status}</Pill></td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {q.status !== 'approved' && q.status !== 'retired' && (
                        <Btn onClick={() => review(q, 'approve')} title="Approve" className="!text-emerald-700 !border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /></Btn>
                      )}{' '}
                      <Btn onClick={() => openEdit(q)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Btn>{' '}
                      {q.status === 'approved' && (
                        <Btn onClick={() => retire(q)} title="Retire"><XCircle className="w-3.5 h-3.5" /></Btn>
                      )}{' '}
                      <Btn variant="danger" onClick={() => remove(q)} busy={busy} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#EDEDEB]">
            <span className="text-[11px] text-[#9CA3AF]">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Btn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Btn>
              <Btn disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Btn>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
};

// ─── Assessments ───────────────────────────────────────────────────────────

const AssessmentsSection: React.FC<{ skills: SkillTestSkill[]; topics: SkillTestTopic[] } & BaseProps> = ({ skills, topics, flash, fail }) => {
  const [skillId, setSkillId] = useState('');
  const [list, setList] = useState<SkillTestAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<SkillTestAssessment> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effSkill = skillId || skills[0]?.id || '';

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await adminFetchAssessmentsApi(effSkill || undefined)); }
    catch (e) { fail(e); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effSkill]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ skillId: effSkill, title: '', durationMinutes: 30, totalQuestions: 30, passingScore: 60, allowRetake: true, maxRetakes: 10, isActive: true });
    setEditingId(null);
  };
  const openEdit = (a: SkillTestAssessment) => { setForm({ ...a }); setEditingId(a.id); };

  const save = async () => {
    if (!form?.title || !form.skillId) return fail(new Error('Skill and title are required'));
    setBusy(true);
    try {
      if (editingId) { await adminUpdateAssessmentApi(editingId, form); flash('Assessment updated'); }
      else { await adminCreateAssessmentApi(form as any); flash('Assessment created'); }
      setForm(null); setEditingId(null); await load();
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const remove = async (a: SkillTestAssessment) => {
    if (!window.confirm(`Delete assessment "${a.title}"?`)) return;
    setBusy(true);
    try { await adminDeleteAssessmentApi(a.id); flash('Assessment deleted'); await load(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  if (skills.length === 0) return <Panel title="Assessments"><Empty>Create a skill first.</Empty></Panel>;

  return (
    <Panel
      title="Assessments"
      subtitle={`${list.length} for ${skillNameOf(skills, effSkill)}`}
      actions={
        <>
          <Select value={effSkill} onChange={(e) => setSkillId(e.target.value)} className="min-w-[170px]">
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Btn variant="primary" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> New</Btn>
        </>
      }
    >
      {form && (
        <div className="mb-5 rounded-xl border border-[#B8E3F7] bg-[#F7FBFE] p-4 space-y-3">
          <p className="text-[12px] font-extrabold text-[#1F3A5F]">{editingId ? 'Edit assessment' : 'New assessment'}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Title" className="sm:col-span-2"><TextInput value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Duration (minutes)"><TextInput type="number" value={form.durationMinutes ?? 30} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></Field>
            <Field label="Total questions"><TextInput type="number" value={form.totalQuestions ?? 30} onChange={(e) => setForm({ ...form, totalQuestions: Number(e.target.value) })} /></Field>
            <Field label="Passing score (%)"><TextInput type="number" value={form.passingScore ?? 60} onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })} /></Field>
            <Field label="Max retakes"><TextInput type="number" value={form.maxRetakes ?? 10} onChange={(e) => setForm({ ...form, maxRetakes: Number(e.target.value) })} /></Field>
          </div>
          <div className="flex flex-wrap gap-5">
            <Toggle checked={form.allowRetake !== false} onChange={(v) => setForm({ ...form, allowRetake: v })} label="Allow retakes" />
            <Toggle checked={form.isActive !== false} onChange={(v) => setForm({ ...form, isActive: v })} label="Active" hint="Inactive assessments cannot be started" />
          </div>
          <div className="flex gap-2 pt-1">
            <Btn variant="primary" onClick={save} busy={busy}>{editingId ? 'Save' : 'Create'}</Btn>
            <Btn onClick={() => setForm(null)}>Cancel</Btn>
          </div>
        </div>
      )}

      {loading ? (
        <Loading label="Loading assessments" />
      ) : list.length === 0 ? (
        <Empty>No assessments for this skill.</Empty>
      ) : (
        <div className="divide-y divide-[#F3F2EE]">
          {list.map((a) => {
            const bpSum = (a.topicBlueprint || []).reduce((s, x) => s + x.questionCount, 0);
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#10151C]">{a.title} {a.isDefault && <Pill tone="green">default</Pill>}</p>
                  <p className="text-[11.5px] text-[#6B7280]">
                    {a.totalQuestions} Q · {a.durationMinutes} min · pass {a.passingScore}% ·{' '}
                    blueprint {bpSum} Q · {topics.filter((t) => (a.topicBlueprint || []).some((b) => b.topicId === t.id)).length} topics
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={a.isActive ? 'green' : 'gray'}>{a.isActive ? 'active' : 'inactive'}</Pill>
                  <Btn onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Btn>
                  <Btn variant="danger" onClick={() => remove(a)} busy={busy}><Trash2 className="w-3.5 h-3.5" /></Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
};

// ─── Certificates ──────────────────────────────────────────────────────────

const CertificatesSection: React.FC<BaseProps> = ({ flash, fail }) => {
  const [certs, setCerts] = useState<SkillTestCertificate[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCerts(await adminFetchCertificatesApi({ status: status || undefined })); }
    catch (e) { fail(e); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const revoke = async (c: SkillTestCertificate) => {
    const reason = window.prompt('Reason for revoking this certificate?') || 'Revoked by admin';
    setBusy(true);
    try { await adminRevokeCertificateApi(c.id, reason); flash('Certificate revoked'); await load(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const restore = async (c: SkillTestCertificate) => {
    setBusy(true);
    try { await adminRestoreCertificateApi(c.id); flash('Certificate restored'); await load(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  return (
    <Panel
      title="Skill certificates"
      subtitle={`${certs.length} certificate${certs.length === 1 ? '' : 's'}`}
      actions={
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="valid">Valid</option>
          <option value="revoked">Revoked</option>
        </Select>
      }
    >
      {loading ? (
        <Loading label="Loading certificates" />
      ) : certs.length === 0 ? (
        <Empty>No certificates issued yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] border-b border-[#EDEDEB]">
                <th className="py-2 pr-3">Certificate ID</th>
                <th className="py-2 pr-3">Student</th>
                <th className="py-2 pr-3">Skill</th>
                <th className="py-2 pr-3 text-right">Score</th>
                <th className="py-2 pr-3">Level</th>
                <th className="py-2 pr-3">Issued</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F2EE]">
              {certs.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-[#0E2A44]">{c.certificateId}</td>
                  <td className="py-2.5 pr-3 font-bold text-[#10151C]">{c.studentName}</td>
                  <td className="py-2.5 pr-3 text-[#6B7280]">{c.skillName}</td>
                  <td className="py-2.5 pr-3 text-right font-mono font-bold">{c.score}</td>
                  <td className="py-2.5 pr-3 text-[#6B7280]">{c.skillLevelText || c.level}</td>
                  <td className="py-2.5 pr-3 text-[#6B7280] whitespace-nowrap">{(c.issueDate || '').slice(0, 10)}</td>
                  <td className="py-2.5 pr-3"><Pill tone={STATUS_TONES[c.status] || 'gray'}>{c.status}</Pill></td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    {c.status === 'valid' ? (
                      <Btn variant="danger" onClick={() => revoke(c)} busy={busy}>Revoke</Btn>
                    ) : (
                      <Btn onClick={() => restore(c)} busy={busy}>Restore</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};
