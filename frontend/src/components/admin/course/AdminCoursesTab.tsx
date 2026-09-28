import React, { useEffect, useRef, useState } from 'react';
import { Plus, Search, Save, ExternalLink } from 'lucide-react';
import type { AdminCourseListItem, AdminCourseForEditor, CourseLevel } from '@/types';
import { fetchAdminCourses, fetchAdminCourse, createAdminCourse, updateAdminCourse } from '@/lib/coursesApi';
import { Btn, Panel, Field, TextInput, TextArea, Select, Toggle, ErrorNote, OkNote, Loading, Empty, Pill } from './CourseAdminUi';
import { AdminCourseEditor } from './AdminCourseEditor';

const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];

const listLabel = (v?: string[] | null) => (v || []).join(', ');

/** Comma text <-> string[] without losing the author's spacing mid-edit. */
const toList = (raw: string) =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const CourseMetaForm: React.FC<{
  course: AdminCourseForEditor;
  onSaved: () => Promise<void> | void;
}> = ({ course, onSaved }) => {
  const [form, setForm] = useState({
    title: course.title,
    slug: course.slug,
    subtitle: course.subtitle,
    description: course.description,
    category: course.category,
    level: course.level,
    is_free: course.is_free,
    price_inr: course.price_inr,
    thumbnail_url: course.thumbnail_url,
    tags: listLabel(course.tags),
    outcomes: listLabel(course.outcomes),
    prerequisite_course_id: course.prerequisite_course_id || '',
    certificate_eligible: course.certificate_eligible,
    published: course.published,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Re-seed the form whenever the *server's* view of the course changes.
  //
  // This keyed on `course.id` and `course.updated_at`, which assumed the server
  // always bumps `updated_at` when it changes a field. When it does not, the
  // admin saves a change, the response comes back with a corrected value, and the
  // form keeps showing what they typed — so a second save re-submitted the stale
  // text. Comparing the seeded snapshot itself is the direct statement of intent
  // and does not depend on the backend's bookkeeping.
  const seed = {
    title: course.title,
    slug: course.slug,
    subtitle: course.subtitle,
    description: course.description,
    category: course.category,
    level: course.level,
    is_free: course.is_free,
    price_inr: course.price_inr,
    thumbnail_url: course.thumbnail_url,
    tags: listLabel(course.tags),
    outcomes: listLabel(course.outcomes),
    prerequisite_course_id: course.prerequisite_course_id || '',
    certificate_eligible: course.certificate_eligible,
    published: course.published,
  };
  const seedKey = JSON.stringify(seed);
  const lastSeedKey = useRef<string | null>(null);

  useEffect(() => {
    if (lastSeedKey.current === seedKey) return;
    lastSeedKey.current = seedKey;
    setForm(seed);
    setOk(false);
    // `seed` is derived from `seedKey`, so keying on the serialised form is the
    // precise dependency: it changes exactly when the server's values do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const set = (patch: Partial<typeof form>) => {
    setForm({ ...form, ...patch });
    setOk(false);
  };

  const save = async () => {
    if (form.title.trim().length < 3) {
      setError('Title needs at least 3 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateAdminCourse(course.id, {
        title: form.title.trim(),
        slug: form.slug.trim(),
        subtitle: form.subtitle,
        description: form.description,
        category: form.category,
        level: form.level,
        is_free: form.is_free,
        price_inr: form.is_free ? 0 : form.price_inr,
        thumbnail_url: form.thumbnail_url,
        tags: toList(form.tags),
        outcomes: toList(form.outcomes),
        prerequisite_course_id: form.prerequisite_course_id || null,
        certificate_eligible: form.certificate_eligible,
        published: form.published,
      });
      setOk(true);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the course');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Title">
          <TextInput value={form.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="URL slug" hint="Lowercase, hyphens. Appears as /courses/<slug>.">
          <TextInput value={form.slug} onChange={(e) => set({ slug: e.target.value })} className="font-mono" />
        </Field>
        <Field label="Subtitle" className="sm:col-span-2">
          <TextInput value={form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
        </Field>
        <Field label="Description (markdown)" className="sm:col-span-2">
          <TextArea rows={5} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="Category">
          <TextInput value={form.category} onChange={(e) => set({ category: e.target.value })} />
        </Field>
        <Field label="Level">
          <Select value={form.level} onChange={(e) => set({ level: e.target.value as CourseLevel })}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tags" hint="Comma separated." className="sm:col-span-2">
          <TextInput value={form.tags} onChange={(e) => set({ tags: e.target.value })} />
        </Field>
        <Field label="Outcomes" hint="One per line or comma separated." className="sm:col-span-2">
          <TextArea rows={3} value={form.outcomes} onChange={(e) => set({ outcomes: e.target.value })} />
        </Field>
        <Field label="Thumbnail URL">
          <TextInput value={form.thumbnail_url} onChange={(e) => set({ thumbnail_url: e.target.value })} />
        </Field>
        <Field label="Prerequisite course id" hint="Leave empty for none. Locks this course until that one is 100% complete.">
          <TextInput
            value={form.prerequisite_course_id}
            onChange={(e) => set({ prerequisite_course_id: e.target.value })}
            className="font-mono"
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 pt-1">
        <Toggle
          checked={form.is_free}
          onChange={(v) => set({ is_free: v, price_inr: v ? 0 : form.price_inr })}
          label="Free course"
          hint="Free courses are open to every signed-in student with no checkout."
        />
        <Field label="Price (INR)" hint="Forced to 0 while the course is free.">
          <TextInput
            type="number"
            min={0}
            value={form.price_inr}
            disabled={form.is_free}
            onChange={(e) => set({ price_inr: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <div className="space-y-3 pt-1">
        <Toggle
          checked={form.certificate_eligible}
          onChange={(v) => set({ certificate_eligible: v })}
          label="Award a certificate on completion"
          hint="Turn off for practice-only material. Existing certificates are unaffected."
        />
        <Toggle
          checked={form.published}
          onChange={(v) => set({ published: v })}
          label="Published"
          hint="Unpublished courses are invisible in the catalogue and cannot be enrolled in."
        />
      </div>

      <div className="flex items-center gap-3">
        <Btn variant="primary" onClick={save} busy={busy}>
          <Save className="w-3.5 h-3.5" /> Save course
        </Btn>
        {ok && <span className="text-[12px] text-emerald-700 font-semibold">Saved.</span>}
      </div>
    </div>
  );
};

export const AdminCoursesTab: React.FC = () => {
  const [courses, setCourses] = useState<AdminCourseListItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminCourseForEditor | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ title: '', subtitle: '', category: 'Engineering' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminCourses(q || undefined);
      setCourses(data.courses || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const open = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setError(null);
    try {
      const data = await fetchAdminCourse(id);
      setDetail(data.course);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the course');
    }
  };

  const create = async () => {
    if (draft.title.trim().length < 3) {
      setError('Give the course a title of at least 3 characters.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await createAdminCourse({
        title: draft.title.trim(),
        subtitle: draft.subtitle,
        category: draft.category,
        is_free: true,
        certificate_eligible: true,
        // Always created as a draft: a half-built course must not be reachable.
        published: false,
      });
      setShowCreate(false);
      setDraft({ title: '', subtitle: '', category: 'Engineering' });
      await load();
      const id = res?.course?.id;
      if (id) {
        setOpenId(id);
        setDetail(res.course);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the course');
    } finally {
      setCreating(false);
    }
  };

  const totalLessons = courses.reduce((s, c) => s + c.stats.lesson_count, 0);
  const totalEnrolled = courses.reduce((s, c) => s + c.enrolled, 0);

  return (
    <div className="space-y-4">
      <Panel
        title="Courses"
        subtitle={`${courses.length} courses · ${totalLessons} lessons · ${totalEnrolled} enrolments`}
        actions={
          <Btn variant="primary" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="w-3.5 h-3.5" /> New course
          </Btn>
        }
      >
        {showCreate && (
          <div className="rounded-xl border border-[#E9E7E1] bg-[#FCFBF8] p-4 mb-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Title" className="sm:col-span-2">
                <TextInput
                  value={draft.title}
                  placeholder="Systems Design: Foundations"
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </Field>
              <Field label="Category">
                <TextInput value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              </Field>
            </div>
            <Field label="Subtitle">
              <TextInput
                value={draft.subtitle}
                placeholder="One line a student sees on the card"
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <Btn variant="primary" onClick={create} busy={creating}>
                Create draft
              </Btn>
              <Btn onClick={() => setShowCreate(false)}>Cancel</Btn>
            </div>
          </div>
        )}

        <div className="relative mb-4 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <TextInput value={q} placeholder="Search title, category, tags" onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>

        {error && (
          <div className="mb-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        {loading ? (
          <Loading label="Loading courses" />
        ) : courses.length === 0 ? (
          <Empty>No courses yet. Create the first one.</Empty>
        ) : (
          <div className="space-y-2">
            {courses.map((c) => (
              <div key={c.id} className="rounded-xl border border-[#E9E7E1] overflow-hidden">
                <button
                  onClick={() => open(c.id)}
                  className="w-full text-left px-4 py-3 hover:bg-[#F8F7F4] flex items-center gap-3 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[#10151C]">{c.title}</p>
                    <p className="text-[12px] text-[#6B7280]">
                      {c.category} · {c.module_count} modules · {c.stats.lesson_count} lessons · {c.stats.total_minutes} min ·{' '}
                      {c.enrolled} enrolled
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.published ? <Pill tone="green">Live</Pill> : <Pill tone="amber">Draft</Pill>}
                    {c.is_free ? <Pill>Free</Pill> : <Pill>₹{c.price_inr}</Pill>}
                    {c.certificates > 0 && <Pill tone="green">{c.certificates} certs</Pill>}
                    <a
                      href={`/courses/${c.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0284C7] hover:text-[#0271B5]"
                      title="Open the learner page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </button>

                {openId === c.id && (
                  <div className="border-t border-[#EDEDEB] bg-white p-4">
                    {detail && detail.id === c.id ? (
                      <div className="space-y-6">
                        <AdminCourseEditor course={detail} onChanged={load} onBack={() => { setOpenId(null); setDetail(null); }} />
                        <hr className="border-[#EDEDEB]" />
                        <div>
                          <h3 className="text-[13px] font-bold text-[#10151C] mb-3">Course details</h3>
                          <CourseMetaForm course={detail} onSaved={load} />
                        </div>
                      </div>
                    ) : (
                      <Loading label="Loading course" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
