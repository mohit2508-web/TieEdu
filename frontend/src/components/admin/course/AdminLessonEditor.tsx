import React, { useEffect, useState } from 'react';
import { Plus, Trash2, PlayCircle, Link2, ArrowUp, ArrowDown, Save, Eye } from 'lucide-react';
import type { AdminLesson, CourseLessonBlock, AdminLessonQuiz } from '@/types';
import { resolveVideoUrl, setLessonVideo, setLessonQuiz, updateLesson } from '@/lib/coursesApi';
import { Btn, Field, TextInput, TextArea, Select, ErrorNote, OkNote, Pill } from './CourseAdminUi';
import { AdminQuizEditor } from './AdminQuizEditor';

/**
 * Block types the learner renderer actually knows how to draw.
 *
 * Kept in step with the `case` list in ContentBlockRenderer. `steps` and
 * `video_link` used to be accepted by the admin API while the renderer had no
 * case for them, so an author could add a block that silently showed nothing.
 */
const BLOCK_TYPES = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'code', label: 'Code' },
  { value: 'callout', label: 'Callout' },
  { value: 'diagram', label: 'Mermaid diagram' },
  { value: 'image', label: 'Image' },
  { value: 'table', label: 'Table' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'resources', label: 'Links' },
  { value: 'steps', label: 'Numbered steps' },
  { value: 'video_link', label: 'Video link' },
] as const;

type BlockType = (typeof BLOCK_TYPES)[number]['value'];

const emptyPayload = (type: BlockType): Record<string, any> => {
  switch (type) {
    case 'markdown':
      return { text: '' };
    case 'code':
      return { code: '', language: 'javascript', filename: '' };
    case 'callout':
      return { style: 'tip', title: '', text: '' };
    case 'diagram':
      return { title: '', source: 'flowchart TD\n  A[Start] --> B[End]' };
    case 'image':
      return { url: '', caption: '', alt: '' };
    case 'table':
      return { title: '', headers: ['Column A', 'Column B'], rows: [['', '']] };
    case 'checklist':
      return { title: '', items: [''] };
    case 'resources':
      return { title: '', links: [{ label: '', url: '' }] };
    case 'steps':
      return { title: '', steps: [{ title: '', desc: '' }] };
    case 'video_link':
      return { title: '', url: '' };
    default:
      return {};
  }
};

const BlockCard: React.FC<{
  block: CourseLessonBlock;
  index: number;
  total: number;
  onChange: (next: CourseLessonBlock) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}> = ({ block, index, total, onChange, onRemove, onMove }) => {
  const [type, setType] = useState<string>(block.block_type);
  const p = block.payload || {};
  const set = (patch: Record<string, any>) => onChange({ ...block, payload: { ...p, ...patch } });
  // `rows` is typed `unknown[]` because only the API knows the shape — it once
  // shipped rows as objects keyed by index. Narrowed once here, so a malformed
  // row is repaired on the next edit instead of throwing mid-edit and losing the
  // block the admin was writing.
  const tableRows: string[][] =
    type === 'table' && Array.isArray(p.rows)
      ? (p.rows as unknown[])
          .filter((r): r is unknown[] => Array.isArray(r))
          .map((r) => r.map((c) => (c == null ? '' : String(c))))
      : [];

  return (
    <div className="rounded-xl border border-[#E9E7E1] bg-white p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <Select
          value={type}
          onChange={(e) => {
            const next = e.target.value;
            // Switching type resets the payload: the old keys mean nothing to the
            // new renderer and would render as an empty block.
            setType(next);
            onChange({ ...block, block_type: next as CourseLessonBlock['block_type'], payload: emptyPayload(next as BlockType) });
          }}
          className="w-auto text-[12px] py-1"
        >
          {BLOCK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <span className="text-[10px] font-mono text-[#9CA3AF]">block {index + 1}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Btn onClick={() => onMove(-1)} disabled={index === 0} title="Move up">
            <ArrowUp className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => onMove(1)} disabled={index === total - 1} title="Move down">
            <ArrowDown className="w-3.5 h-3.5" />
          </Btn>
          <Btn variant="danger" onClick={onRemove} title="Remove block">
            <Trash2 className="w-3.5 h-3.5" />
          </Btn>
        </div>
      </div>

      {type === 'markdown' && (
        <TextArea
          rows={6}
          value={p.text || ''}
          placeholder="## Heading\n\nProse. **bold** and `code` work."
          onChange={(e) => set({ text: e.target.value })}
        />
      )}

      {type === 'code' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <TextInput
              value={p.filename || ''}
              placeholder="filename.js"
              onChange={(e) => set({ filename: e.target.value })}
            />
            <Select
              value={p.language || 'javascript'}
              onChange={(e) => set({ language: e.target.value })}
              className="w-36"
            >
              {['c', 'cpp', 'javascript', 'typescript', 'python', 'java', 'sql', 'bash', 'json', 'html', 'css'].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </div>
          <TextArea rows={8} value={p.code || ''} onChange={(e) => set({ code: e.target.value })} className="text-[#E6EDF3] bg-[#1E1E1E]" />
        </div>
      )}

      {type === 'callout' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={p.style || 'tip'} onChange={(e) => set({ style: e.target.value })} className="w-32">
              {['tip', 'warning', 'info', 'success', 'danger'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <TextInput value={p.title || ''} placeholder="Callout title" onChange={(e) => set({ title: e.target.value })} />
          </div>
          <TextArea rows={3} value={p.text || ''} onChange={(e) => set({ text: e.target.value })} />
        </div>
      )}

      {type === 'diagram' && (
        <div className="space-y-2">
          <TextInput value={p.title || ''} placeholder="Diagram title" onChange={(e) => set({ title: e.target.value })} />
          <TextArea
            rows={7}
            value={p.source || ''}
            placeholder={'flowchart TD\n  A[Input] --> B{Valid?}\n  B -->|yes| C[Accept]\n  B -->|no| D[Reject]'}
            onChange={(e) => set({ source: e.target.value })}
          />
          <p className="text-[11px] text-[#9CA3AF]">Mermaid syntax. It is drawn live on the learner page.</p>
        </div>
      )}

      {type === 'image' && (
        <div className="space-y-2">
          <TextInput value={p.url || ''} placeholder="https://... or /uploads/..." onChange={(e) => set({ url: e.target.value })} />
          <TextInput value={p.caption || ''} placeholder="Caption" onChange={(e) => set({ caption: e.target.value })} />
          <TextInput value={p.alt || ''} placeholder="Alt text (screen readers)" onChange={(e) => set({ alt: e.target.value })} />
        </div>
      )}

      {type === 'table' && (
        <div className="space-y-2">
          <TextInput value={p.title || ''} placeholder="Table title" onChange={(e) => set({ title: e.target.value })} />
          <div className="flex gap-2">
            {(p.headers || []).map((h: string, hi: number) => (
              <TextInput
                key={hi}
                value={h}
                placeholder={`H${hi + 1}`}
                onChange={(e) => {
                  const headers = (p.headers || []).slice();
                  headers[hi] = e.target.value;
                  set({ headers });
                }}
              />
            ))}
            <Btn onClick={() => set({ headers: [...(p.headers || []), ''] })} title="Add column">
              <Plus className="w-3.5 h-3.5" />
            </Btn>
          </div>
          <div className="space-y-1.5">
            {tableRows.map((row, ri) => (
              <div key={ri} className="flex gap-2">
                {row.map((cell, ci) => (
                  <TextInput
                    key={ci}
                    value={cell}
                    onChange={(e) => {
                      const rows = tableRows.map((r) => r.slice());
                      rows[ri][ci] = e.target.value;
                      set({ rows });
                    }}
                  />
                ))}
                <Btn
                  variant="danger"
                  onClick={() => set({ rows: tableRows.filter((_, x) => x !== ri) })}
                  title="Remove row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Btn>
              </div>
            ))}
          </div>
          <Btn onClick={() => set({ rows: [...tableRows, (p.headers || ['', '']).map(() => '')] })}>
            <Plus className="w-3.5 h-3.5" /> Row
          </Btn>
        </div>
      )}

      {type === 'checklist' && (
        <div className="space-y-2">
          <TextInput value={p.title || ''} placeholder="Checklist title" onChange={(e) => set({ title: e.target.value })} />
          {(p.items || []).map((item: string, ii: number) => (
            <div key={ii} className="flex gap-2">
              <TextInput
                value={item}
                placeholder={`Item ${ii + 1}`}
                onChange={(e) => {
                  const items = (p.items || []).slice();
                  items[ii] = e.target.value;
                  set({ items });
                }}
              />
              <Btn variant="danger" onClick={() => set({ items: (p.items || []).filter((_: string, x: number) => x !== ii) })}>
                <Trash2 className="w-3.5 h-3.5" />
              </Btn>
            </div>
          ))}
          <Btn onClick={() => set({ items: [...(p.items || []), ''] })}>
            <Plus className="w-3.5 h-3.5" /> Item
          </Btn>
        </div>
      )}

      {type === 'resources' && (
        <div className="space-y-2">
          <TextInput value={p.title || ''} placeholder="Resources title" onChange={(e) => set({ title: e.target.value })} />
          {(p.links || []).map((l: { label: string; url: string }, li: number) => (
            <div key={li} className="flex gap-2">
              <TextInput
                value={l.label || ''}
                placeholder="Label"
                onChange={(e) => {
                  const links = (p.links || []).map((x: any) => ({ ...x }));
                  links[li].label = e.target.value;
                  set({ links });
                }}
              />
              <TextInput
                value={l.url || ''}
                placeholder="https://..."
                onChange={(e) => {
                  const links = (p.links || []).map((x: any) => ({ ...x }));
                  links[li].url = e.target.value;
                  set({ links });
                }}
              />
              <Btn variant="danger" onClick={() => set({ links: (p.links || []).filter((_: any, x: number) => x !== li) })}>
                <Trash2 className="w-3.5 h-3.5" />
              </Btn>
            </div>
          ))}
          <Btn onClick={() => set({ links: [...(p.links || []), { label: '', url: '' }] })}>
            <Plus className="w-3.5 h-3.5" /> Link
          </Btn>
        </div>
      )}

      {type === 'video_link' && (
        <div className="space-y-2">
          <TextInput value={p.title || ''} placeholder="What this video covers" onChange={(e) => set({ title: e.target.value })} />
          <TextInput
            value={p.url || ''}
            placeholder="https://... (opens in a new tab)"
            onChange={(e) => set({ url: e.target.value })}
          />
          <p className="text-[11px] text-[#9CA3AF]">
            A plain link, not an embedded player. To make watching this count towards lesson completion, attach it
            as the lesson video instead.
          </p>
        </div>
      )}

      {type === 'steps' && (
        <div className="space-y-2">
          <TextInput value={p.title || ''} placeholder="Steps title" onChange={(e) => set({ title: e.target.value })} />
          {(p.steps || []).map((s: any, si: number) => (
            <div key={si} className="rounded-lg border border-gray-200 p-2.5 space-y-2">
              <div className="flex gap-2">
                <TextInput
                  value={s.title || ''}
                  placeholder="Step title"
                  onChange={(e) => {
                    const steps = (p.steps || []).map((x: any) => ({ ...x }));
                    steps[si].title = e.target.value;
                    set({ steps });
                  }}
                />
                <Btn
                  variant="danger"
                  onClick={() => set({ steps: (p.steps || []).filter((_: any, x: number) => x !== si) })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Btn>
              </div>
              <TextArea
                rows={2}
                value={s.desc || ''}
                placeholder="What happens at this step"
                onChange={(e) => {
                  const steps = (p.steps || []).map((x: any) => ({ ...x }));
                  steps[si].desc = e.target.value;
                  set({ steps });
                }}
              />
            </div>
          ))}
          <Btn onClick={() => set({ steps: [...(p.steps || []), { title: '', desc: '' }] })}>
            <Plus className="w-3.5 h-3.5" /> Step
          </Btn>
        </div>
      )}
    </div>
  );
};

export const AdminLessonEditor: React.FC<{
  lesson: AdminLesson;
  courseSlug: string;
  onSaved: () => Promise<void> | void;
}> = ({ lesson, courseSlug, onSaved }) => {
  const [title, setTitle] = useState(lesson.title);
  const [summary, setSummary] = useState(lesson.summary);
  const [duration, setDuration] = useState(lesson.duration_minutes);
  const [blocks, setBlocks] = useState<CourseLessonBlock[]>(lesson.blocks || []);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [videoUrl, setVideoUrl] = useState('');
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoOk, setVideoOk] = useState<string | null>(null);

  useEffect(() => {
    setTitle(lesson.title);
    setSummary(lesson.summary);
    setDuration(lesson.duration_minutes);
    setBlocks(lesson.blocks || []);
    setError(null);
    setSaved(false);
  }, [lesson.id, lesson.title, lesson.summary, lesson.duration_minutes, lesson.blocks]);

  const save = async () => {
    if (title.trim().length < 2) {
      setError('Lesson title is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateLesson(lesson.id, {
        title: title.trim(),
        summary,
        duration_minutes: duration,
        blocks,
      });
      setSaved(true);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the lesson');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Resolve before saving. The server re-checks reachability, but resolving here
   * shows the author which video they actually pasted (a channel reupload, an
   * unlisted clip) instead of silently attaching the wrong thing.
   */
  const attachVideo = async () => {
    const url = videoUrl.trim();
    if (!url) return;
    setVideoBusy(true);
    setVideoError(null);
    setVideoOk(null);
    try {
      const info = await resolveVideoUrl(url);
      setVideoOk(`${info.provider}: ${info.title}${info.channel ? ` — ${info.channel}` : ''}`);
      await setLessonVideo(lesson.id, { url });
      setVideoUrl('');
      await onSaved();
    } catch (e) {
      setVideoError(e instanceof Error ? e.message : 'That link could not be resolved');
    } finally {
      setVideoBusy(false);
    }
  };

  const detachVideo = async () => {
    setVideoBusy(true);
    setVideoError(null);
    try {
      await setLessonVideo(lesson.id, { remove: true });
      await onSaved();
    } catch (e) {
      setVideoError(e instanceof Error ? e.message : 'Could not remove the video');
    } finally {
      setVideoBusy(false);
    }
  };

  const saveQuiz = async (quiz: AdminLessonQuiz) => {
    await setLessonQuiz(lesson.id, { quiz });
    await onSaved();
  };

  const removeQuiz = async () => {
    await setLessonQuiz(lesson.id, { remove: true });
    await onSaved();
  };

  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };

  const hasBody = blocks.length > 0;

  return (
    <div className="space-y-5">
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Lesson title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Duration (minutes)" hint="Shown on the course card. The server clamps 1–600.">
          <TextInput
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 1)}
          />
        </Field>
        <Field label="Summary" className="sm:col-span-2">
          <TextInput value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
      </div>

      {/*
        A lesson with no blocks and no video is a dead end for a learner: the
        read timer needs a duration to count against, so warn before publishing.
      */}
      {!hasBody && !lesson.video && (
        <ErrorNote>
          This lesson has no content blocks and no video. Learners will see an empty page and the read timer will
          have nothing to measure.
        </ErrorNote>
      )}

      {/* Video */}
      <div className="rounded-xl border border-[#E9E7E1] p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#6B7280] mb-2.5 flex items-center gap-2">
          <PlayCircle className="w-3.5 h-3.5 text-[#0284C7]" /> Video
        </h3>

        {lesson.video ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Pill tone="green">{lesson.video.provider}</Pill>
              <span className="text-[13px] font-bold text-[#10151C]">{lesson.video.title}</span>
            </div>
            <div className="text-[12px] text-[#6B7280] font-mono break-all">{lesson.video.url}</div>
            <p className="text-[12px] text-[#6B7280]">
              {lesson.video.duration_minutes
                ? `Author estimate ${lesson.video.duration_minutes} min. `
                : ''}
              A learner must watch 90% of it before the lesson counts, and the server clamps what they report against
              this estimate so it cannot be faked.
            </p>
            <Btn onClick={detachVideo} busy={videoBusy}>Remove video</Btn>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <TextInput
              value={videoUrl}
              placeholder="Paste a YouTube or Vimeo link"
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') attachVideo();
              }}
            />
            <Btn variant="primary" onClick={attachVideo} busy={videoBusy} disabled={!videoUrl.trim()}>
              <Link2 className="w-3.5 h-3.5" /> Resolve &amp; attach
            </Btn>
          </div>
        )}

        {videoOk && <div className="mt-2.5"><OkNote>{videoOk}</OkNote></div>}
        {videoError && (
          <div className="mt-2.5">
            <ErrorNote>{videoError}</ErrorNote>
          </div>
        )}
      </div>

      {/* Blocks */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#6B7280]">Content blocks</h3>
          <Btn
            onClick={() =>
              setBlocks([...blocks, { id: `new-${blocks.length}`, block_type: 'markdown', block_order: blocks.length + 1, payload: { text: '' } }])
            }
          >
            <Plus className="w-3.5 h-3.5" /> Add block
          </Btn>
        </div>

        {blocks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#E9E7E1] p-5 text-center text-[13px] text-[#6B7280]">
            No blocks yet. Add prose, code, a diagram or a table.
          </p>
        ) : (
          <div className="space-y-2.5">
            {blocks.map((b, i) => (
              <BlockCard
                key={b.id || i}
                block={b}
                index={i}
                total={blocks.length}
                onChange={(next) => setBlocks(blocks.map((x, xi) => (xi === i ? { ...next, block_order: i + 1 } : x)))}
                onRemove={() => setBlocks(blocks.filter((_, xi) => xi !== i))}
                onMove={(dir) => moveBlock(i, dir)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quiz */}
      <div>
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#6B7280] mb-2.5">Quiz</h3>
        <AdminQuizEditor quiz={lesson.quiz} onSave={saveQuiz} onRemove={removeQuiz} />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Btn variant="primary" onClick={save} busy={busy}>
          <Save className="w-3.5 h-3.5" /> Save lesson
        </Btn>
        {saved && <span className="text-[12px] text-emerald-700 font-semibold">Saved.</span>}
        <a
          href={`/courses/${courseSlug}?lesson=${encodeURIComponent(lesson.id)}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0284C7] hover:underline"
        >
          <Eye className="w-3.5 h-3.5" /> Preview as learner
        </a>
      </div>
    </div>
  );
};
