import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Search, Save, ExternalLink } from 'lucide-react';
import type { AdminCourseListItem, AdminCourseForEditor, CourseInstructor, CourseLevel } from '@/types';
import {
  fetchAdminCourses,
  fetchAdminCourse,
  createAdminCourse,
  updateAdminCourse,
  fetchInstructors,
  createInstructor,
  updateInstructor,
  deleteInstructor,
} from '@/lib/coursesApi';
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
    about_course: course.about_course || '',
    prerequisites: listLabel(course.prerequisites),
    audience: listLabel(course.audience),
    audio_language: course.audio_language || '',
    caption_language: course.caption_language || '',
    instructor_id: course.instructor_id || '',
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
    about_course: course.about_course || '',
    prerequisites: listLabel(course.prerequisites),
    audience: listLabel(course.audience),
    audio_language: course.audio_language || '',
    caption_language: course.caption_language || '',
    instructor_id: course.instructor_id || '',
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
        // Sent on every save, including as empty. That is what makes "clear this
        // section" work: omitting the key would leave the old prose in place,
        // because the server only assigns a field that was actually sent.
        about_course: form.about_course.trim(),
        prerequisites: toList(form.prerequisites),
        audience: toList(form.audience),
        audio_language: form.audio_language.trim(),
        caption_language: form.caption_language.trim(),
        // `null`, not `''`. The picker also offers "none", which is a real state
        // meaning "unassign the teacher", and sending an empty string would look
        // like a malformed id to the server instead of an explicit unassignment.
        instructor_id: form.instructor_id || null,
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

      {/* ---------------------------------------------------------------------
          The long-form page sections.
          These are the fields behind the "About this course", "Pre-requisites"
          and "Who should learn" blocks on the public page. Leaving one empty is a
          legitimate state, and it is not the same as deleting it: an empty value
          is sent as `''`/an empty list, which the server stores, and the page then
          omits the heading. The hint says so, because an admin who has never
          written these would otherwise assume a bug.
          --------------------------------------------------------------------- */}
      <Panel title="Course page sections" subtitle="Leave a section empty and its heading is hidden on the public page.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="About this course"
            hint="Long prose. Leave a blank line between paragraphs. Empty hides the section."
            className="sm:col-span-2"
          >
            <TextArea rows={8} value={form.about_course} onChange={(e) => set({ about_course: e.target.value })} />
          </Field>
          <Field
            label="Pre-requisites"
            hint="One per line or comma separated. Empty hides the section."
            className="sm:col-span-2"
          >
            <TextArea rows={3} value={form.prerequisites} onChange={(e) => set({ prerequisites: e.target.value })} />
          </Field>
          <Field
            label="Who should learn this"
            hint="One per line or comma separated. Empty hides the section."
            className="sm:col-span-2"
          >
            <TextArea rows={3} value={form.audience} onChange={(e) => set({ audience: e.target.value })} />
          </Field>
          <Field label="Audio language" hint="e.g. English. Empty means unrecorded, which is shown as nothing.">
            <TextInput value={form.audio_language} onChange={(e) => set({ audio_language: e.target.value })} />
          </Field>
          <Field label="Caption language" hint="e.g. English. Leave empty if there are no captions.">
            <TextInput value={form.caption_language} onChange={(e) => set({ caption_language: e.target.value })} />
          </Field>
          <InstructorPicker
            value={form.instructor_id}
            onChange={(id) => set({ instructor_id: id })}
            className="sm:col-span-2"
          />
        </div>
      </Panel>

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
  const [draft, setDraft] = useState({
    title: '',
    subtitle: '',
    category: 'Engineering',
    // Free by default because that is the safe direction: a course published by
    // mistake as free gives the content away, whereas one left paid by mistake
    // just refuses to let anyone in until an admin looks at it. The toggle below
    // makes the choice explicit, because the previous hardcoded `is_free: true`
    // meant an admin creating a paid course had to remember to switch it, and
    // forgetting published a paid course for nothing.
    is_free: true,
    price_inr: 0,
    instructor_id: '',
  });
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
    if (!draft.is_free && draft.price_inr < 1) {
      setError('A paid course needs a price of at least ₹1, or switch it to free.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await createAdminCourse({
        title: draft.title.trim(),
        subtitle: draft.subtitle,
        category: draft.category,
        is_free: draft.is_free,
        // A paid course with no price is a course nobody can buy. The backend
        // treats 0 as free, so sending 0 here would quietly contradict the
        // toggle; refuse it in the form instead of storing a lie.
        price_inr: draft.is_free ? 0 : draft.price_inr,
        instructor_id: draft.instructor_id || null,
        certificate_eligible: true,
        // Always created as a draft: a half-built course must not be reachable.
        published: false,
      });
      setShowCreate(false);
      setDraft({
        title: '',
        subtitle: '',
        category: 'Engineering',
        is_free: true,
        price_inr: 0,
        instructor_id: '',
      });
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

            {/*
              Price is asked here rather than left to the editor because the
              editor opens straight afterwards and is where an admin is most
              likely to publish before noticing. Answering it at creation makes
              "free" a decision instead of an accident.
            */}
            <div className="grid sm:grid-cols-2 gap-3">
              <Toggle
                label="Free course"
                checked={draft.is_free}
                onChange={(v) => setDraft({ ...draft, is_free: v })}
              />
              <Field
                label="Price (INR)"
                hint={draft.is_free ? 'Not used while the course is free.' : 'What a learner pays, once.'}
              >
                <TextInput
                  value={draft.price_inr || ''}
                  disabled={draft.is_free}
                  onChange={(e) => setDraft({ ...draft, price_inr: Number(e.target.value) || 0 })}
                  placeholder="1299"
                />
              </Field>
            </div>

            {/* The picker owns its own fetch, so reusing it here is free of
                duplication and gives create the same assignment behaviour as
                edit - including the rule that a course with no instructor shows
                no instructor section rather than inventing one. */}
            <InstructorPicker
              value={draft.instructor_id}
              onChange={(id) => setDraft({ ...draft, instructor_id: id })}
            />

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

/**
 * Assign a teacher to a course, and create one if none exist yet.
 *
 * The instructor list starts out empty, so this cannot be a plain `<select>` with
 * static options: on a fresh install there is nothing to select and no way to add
 * a record, which would make the whole instructor field unreachable. So the
 * create form is inline and always available rather than hidden behind a modal or
 * a separate admin tab that the admin has to discover first.
 *
 * It is a separate component from the course form because it owns its own async
 * lifecycle. Fetching the list inside `CourseMetaForm` would put a second
 * request's loading and error state next to the course's own, and a failure to
 * list instructors would then block saving an unrelated course field.
 */
const InstructorPicker: React.FC<{
  value: string;
  onChange: (id: string) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const [rows, setRows] = useState<CourseInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', title: '', bio: '', photo_url: '' });
  // Which instructor the open form is editing, or null when it is adding a new
  // one. The same form serves both so the fields cannot drift apart between
  // "create" and "fix a typo someone already spotted on the live page".
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyDraft = { name: '', title: '', bio: '', photo_url: '' };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchInstructors());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load instructors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeForm = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
  };

  const startEdit = (instructor: CourseInstructor) => {
    setEditingId(instructor.id);
    setAdding(false);
    setError(null);
    setDraft({
      name: instructor.name || '',
      title: instructor.title || '',
      bio: instructor.bio || '',
      photo_url: instructor.photo_url || '',
    });
  };

  const create = async () => {
    const name = draft.name.trim();
    if (name.length < 2) {
      setError('Instructor name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createInstructor({
        name,
        title: draft.title.trim(),
        bio: draft.bio.trim(),
        photo_url: draft.photo_url.trim(),
      });
      closeForm();
      await load();
      // Select it immediately: the admin just described this person, so leaving
      // the picker unassigned and making them hunt for the new row would invite a
      // save that assigns the wrong person or none at all.
      onChange(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the instructor');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = draft.name.trim();
    if (name.length < 2) {
      setError('Instructor name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateInstructor(editingId, {
        name,
        title: draft.title.trim(),
        bio: draft.bio.trim(),
        photo_url: draft.photo_url.trim(),
      });
      const id = editingId;
      closeForm();
      await load();
      // The assignment is by id, so an edit does not disturb which person this
      // course points at. Re-asserting it would be a no-op, but leaving the select
      // untouched is the honest statement of that.
      onChange(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the instructor');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await deleteInstructor(id);
      // Clearing the field matters: if the deleted instructor was the assigned
      // one, leaving the id in the select would let the admin save a course
      // pointing at a person who no longer exists.
      if (value === id) onChange('');
      if (editingId === id) closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the instructor');
    }
  };

  return (
    <Field
      label="Instructor"
      className={className}
      hint="Only real people. A course with no instructor shows no instructor section - it never invents one."
    >
      {loading ? (
        <Loading label="Loading instructors" />
      ) : (
        <div className="space-y-3">
          {error && <ErrorNote>{error}</ErrorNote>}

          {rows.length === 0 ? (
            <p className="text-[13px] text-[#6B7280]">
              No instructors yet. Add the person who actually teaches this course.
            </p>
          ) : (
            <>
              <Select value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">No instructor - hide the section</option>
                {rows.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                    {i.title ? ` - ${i.title}` : ''}
                  </option>
                ))}
              </Select>

              {/*
                Edit and delete are per row, not just for the assigned instructor.
                Restricting them to the assigned one made a typo in an unassigned
                record unfixable: the admin could only delete it by first assigning
                it to this course and then saving, which pointed the course at a
                person they did not want. The list is the record; the course is a
                separate assignment.
              */}
              <ul className="divide-y divide-[#EDEDEB] rounded-lg border border-[#EDEDEB]">
                {rows.map((i) => {
                  const isAssigned = value === i.id;
                  const isEditing = editingId === i.id;
                  return (
                    <li key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#1F2937]">
                          {i.name}
                          {i.title ? <span className="font-normal text-[#6B7280]"> - {i.title}</span> : null}
                        </span>
                        {isAssigned ? (
                          <span className="block text-[11px] font-semibold text-[#0E7490]">Assigned to this course</span>
                        ) : (
                          <span className="block text-[11px] text-[#6B7280]">
                            {i.course_count ?? 0} course{(i.course_count ?? 0) === 1 ? '' : 's'}
                          </span>
                        )}
                      </span>
                      {isEditing ? null : (
                        <>
                          <Btn variant="ghost" onClick={() => startEdit(i)}>
                            Edit
                          </Btn>
                          {!isAssigned ? (
                            <Btn variant="ghost" onClick={() => onChange(i.id)}>
                              Assign
                            </Btn>
                          ) : null}
                          <Btn variant="danger" onClick={() => remove(i.id)}>
                            Delete
                          </Btn>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/*
                Always reachable. This used to sit behind `value &&`, so on a site
                that had instructors but had not assigned one to this course there
                was no way to add a second person at all - the only reachable
                action was deleting the one you had.
              */}
              <div className="flex flex-wrap items-center gap-2">
                <Btn variant="ghost" onClick={() => (adding ? closeForm() : (setAdding(true), setEditingId(null), setDraft(emptyDraft), setError(null)))}>
                  {adding ? 'Cancel new instructor' : '+ New instructor'}
                </Btn>
              </div>
            </>
          )}

          {rows.length === 0 || adding || editingId ? (
            <div className="rounded-lg border border-[#EDEDEB] bg-[#FAFAF8] p-3 space-y-3">
              <p className="text-[12px] text-[#6B7280]">
                Use a real name, role and bio. These appear on the public course page, so
                write what is true rather than what fills the space.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Name">
                  <TextInput
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Full name"
                  />
                </Field>
                <Field label="Role / title">
                  <TextInput
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="e.g. Senior Instructor"
                  />
                </Field>
                <Field
                  label="Photo URL"
                  className="sm:col-span-2"
                  hint="Optional. A monogram is shown when empty."
                >
                  <TextInput
                    value={draft.photo_url}
                    onChange={(e) => setDraft({ ...draft, photo_url: e.target.value })}
                    placeholder="/api/course-admin/thumbnail/..."
                  />
                </Field>
                <Field label="Bio" className="sm:col-span-2">
                  <TextArea rows={3} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
                </Field>
              </div>
              {editingId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Btn variant="primary" busy={saving} onClick={saveEdit}>
                    Save changes
                  </Btn>
                  <Btn variant="ghost" onClick={closeForm}>
                    Cancel
                  </Btn>
                </div>
              ) : (
                <Btn variant="primary" busy={saving} onClick={create}>
                  Add instructor
                </Btn>
              )}
            </div>
          ) : null}
        </div>
      )}
    </Field>
  );
};
