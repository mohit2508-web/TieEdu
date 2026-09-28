import React, { useEffect, useState } from 'react';
import { ContentBlock, BlockType, StudyPlanPhase } from '@/types';
import { MarkdownEditor, clearEditorDraft } from '@/components/editor/MarkdownEditor';
import { ContentBlockRenderer } from '@/components/blocks/ContentBlockRenderer';
import {
  adminAddStudyPlanPhaseApi, adminAddStudyPlanBlockApi, adminUpdateStudyPlanBlockApi,
  adminDeleteStudyPlanBlockApi, adminReorderStudyPlanPhasesApi,
  adminUpdateStudyPlanPhaseApi, adminDeleteStudyPlanPhaseApi,
} from '@/lib/api';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Eye, Pencil,
  Code, FileText, Image as ImageIcon, MessageSquare, Layers,
  Table2, Video, Music, ListChecks, Link2, AlertTriangle, Loader2,
} from 'lucide-react';

const inputCls =
  'w-full p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]';

const BLOCK_TYPES: { type: BlockType; label: string; icon: any }[] = [
  { type: 'markdown', label: 'Rich Text', icon: FileText },
  { type: 'checklist', label: 'Checklist', icon: ListChecks },
  { type: 'resources', label: 'Resources', icon: Link2 },
  { type: 'callout', label: 'Callout', icon: MessageSquare },
  { type: 'table', label: 'Table', icon: Table2 },
  { type: 'code', label: 'Code', icon: Code },
  { type: 'diagram', label: 'Diagram', icon: Layers },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'video', label: 'Video', icon: Video },
  { type: 'audio', label: 'Audio', icon: Music },
];

interface Props {
  templateId: string;
  phases: StudyPlanPhase[];
  onChanged: (phases: StudyPlanPhase[]) => void;
  readOnly?: boolean;
}

const BlockForm: React.FC<{
  block: ContentBlock | null;
  onSave: (block_type: BlockType, payload: any) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  draftKey: string;
}> = ({ block, onSave, onCancel, saving, draftKey }) => {
  const [type, setType] = useState<BlockType>(block?.block_type || 'markdown');
  const [text, setText] = useState(String(block?.payload?.text || ''));
  const [title, setTitle] = useState(String(block?.payload?.title || ''));
  const [caption, setCaption] = useState(String(block?.payload?.caption || ''));
  const [url, setUrl] = useState(String(block?.payload?.url || ''));
  const [videoUrl, setVideoUrl] = useState(String(block?.payload?.video_url || ''));
  const [calloutStyle, setCalloutStyle] = useState<string>(String(block?.payload?.style || 'tip'));
  const [items, setItems] = useState<string[]>(
    Array.isArray(block?.payload?.items) ? (block!.payload.items as string[]) : ['']
  );
  const [links, setLinks] = useState<{ label: string; url: string }[]>(
    Array.isArray(block?.payload?.links) ? (block!.payload.links as any[]) : [{ label: '', url: '' }]
  );
  const [tableText, setTableText] = useState(() => {
    const headers: string[] = block?.payload?.headers || [];
    const rows: string[][] = block?.payload?.rows || [];
    return [headers.join(', '), ...rows.map((r) => r.join(', '))].join('\n');
  });

  const buildPayload = (): any => {
    switch (type) {
      case 'checklist':
        return { title: title || 'Checklist', items: items.map((s) => s.trim()).filter(Boolean) };
      case 'resources':
        return {
          title: title || 'Resources',
          links: links.filter((l) => l.url.trim()).map((l) => ({ label: l.label.trim() || l.url.trim(), url: l.url.trim() })),
        };
      case 'callout':
        return { title: title || 'Pro tip', text, style: calloutStyle };
      case 'table': {
        const [head, ...rest] = tableText.split('\n');
        return {
          title: title || 'Reference Table',
          headers: (head || '').split(',').map((h) => h.trim()).filter(Boolean),
          rows: rest
            .filter((l) => l.trim())
            .map((l) => l.split(',').map((c) => c.trim())),
        };
      }
      case 'code':
        return { code: text, language: 'cpp', filename: title || 'Solution' };
      case 'diagram':
        return { source: text, title: title || 'Diagram' };
      case 'image':
        return { url, alt: caption, caption };
      case 'video':
        return { video_url: videoUrl, video_type: 'youtube', title: title || 'Video' };
      case 'audio':
        return { url, title: title || 'Audio' };
      default:
        return { text };
    }
  };

  const preview: ContentBlock = {
    id: 'preview',
    block_type: type,
    block_order: 1,
    payload: buildPayload(),
  };

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5 bg-[#FAFAF9] border-b border-[#E2E8F0]">
        <span className="text-[10px] font-mono font-bold uppercase text-gray-500 mr-1">
          {block ? 'Edit block' : 'New block'}
        </span>
        {BLOCK_TYPES.map((b) => (
          <button
            key={b.type}
            type="button"
            onClick={() => setType(b.type)}
            aria-pressed={type === b.type}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors min-h-[2rem] ${
              type === b.type
                ? 'bg-[#0284C7] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <b.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{b.label}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 p-4">
        <div className="space-y-3 min-w-0">
          {type === 'markdown' && (
            <MarkdownEditor
              value={text}
              onChange={setText}
              draftKey={draftKey}
              minHeight={200}
              placeholder="Write phase content… use the toolbar for bullets and checklists."
            />
          )}

          {type === 'checklist' && (
            <div className="space-y-2">
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Checklist title" />
              {items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputCls}
                    value={it}
                    onChange={(e) => setItems((p) => p.map((s, idx) => (idx === i ? e.target.value : s)))}
                    placeholder={`Item ${i + 1}`}
                  />
                  <button
                    type="button"
                    aria-label={`Remove item ${i + 1}`}
                    disabled={items.length === 1}
                    onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 disabled:opacity-30 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems((p) => [...p, ''])}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-gray-500 font-bold text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" /> Add item
              </button>
            </div>
          )}

          {type === 'resources' && (
            <div className="space-y-2">
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Section title" />
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputCls}
                    value={l.label}
                    onChange={(e) => setLinks((p) => p.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))}
                    placeholder="Label"
                  />
                  <input
                    className={inputCls}
                    value={l.url}
                    onChange={(e) => setLinks((p) => p.map((x, idx) => (idx === i ? { ...x, url: e.target.value } : x)))}
                    placeholder="https://"
                  />
                  <button
                    type="button"
                    aria-label={`Remove link ${i + 1}`}
                    disabled={links.length === 1}
                    onClick={() => setLinks((p) => p.filter((_, idx) => idx !== i))}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 disabled:opacity-30 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLinks((p) => [...p, { label: '', url: '' }])}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-gray-500 font-bold text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" /> Add link
              </button>
            </div>
          )}

          {type === 'callout' && (
            <div className="space-y-2">
              <select className={inputCls} value={calloutStyle} onChange={(e) => setCalloutStyle(e.target.value)}>
                <option value="tip">Pro tip</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Callout title" />
              <textarea rows={4} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="Callout text" />
            </div>
          )}

          {type === 'table' && (
            <div className="space-y-2">
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Table title" />
              <textarea
                rows={5}
                className={inputCls + ' font-mono'}
                value={tableText}
                onChange={(e) => setTableText(e.target.value)}
                placeholder={'Topic, Complexity\nBinary search, O(log N)'}
              />
              <p className="text-[10px] text-gray-400 font-mono">First line = headers, one row per line after that.</p>
            </div>
          )}

          {(type === 'code' || type === 'diagram') && (
            <div className="space-y-2">
              {type === 'code' && (
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Filename" />
              )}
              <textarea
                rows={8}
                className={inputCls + ' font-mono'}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={type === 'code' ? 'int main() { return 0; }' : 'flowchart LR\n  A[Start] --> B[Done]'}
              />
            </div>
          )}

          {(type === 'image' || type === 'audio') && (
            <div className="space-y-2">
              <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https:// asset URL" />
              <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption / alt text" />
            </div>
          )}

          {type === 'video' && (
            <div className="space-y-2">
              <input className={inputCls} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video title" />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                await onSave(type, buildPayload());
                if (!block) clearEditorDraft(draftKey);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {block ? 'Save block' : 'Add block'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-[11px] font-bold min-h-[2.5rem]"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="bg-[#FAFAF9] border border-gray-200 rounded-2xl p-3 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-[#1F3A5F] pb-2 mb-2 border-b border-gray-200">
            <Eye className="w-3.5 h-3.5 text-[#0284C7]" /> Student preview
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 max-h-[28rem] overflow-y-auto">
            <ContentBlockRenderer block={preview} isLocked={false} companyName="Target Company" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudyPlanPhaseEditor: React.FC<Props> = ({ templateId, phases, onChanged, readOnly }) => {
  const [selectedId, setSelectedId] = useState<string>(phases[0]?.id || '');
  const [draft, setDraft] = useState({ title: '', summary: '', day_from: 1, day_to: '' as string | number });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('list');

  const selected = phases.find((p) => p.id === selectedId) || phases[0] || null;

  // Seed the draft from the selected phase.
  //
  // This used to key on `selected?.id` alone, so when the server returned
  // updated values for the *same* phase - after a save, or after a reorder that
  // renumbered `day_from` - the form kept showing the values it had been seeded
  // with. The admin would reorder two phases, save, and be looking at the old
  // day numbers while the plan on the server disagreed. Depending on the values
  // themselves means the response is the source of truth.
  const { id: seedId, title: seedTitle, summary: seedSummary, day_from: seedFrom, day_to: seedTo } = selected ?? {};
  useEffect(() => {
    if (!seedId) return;
    setSelectedId(seedId);
    setDraft({
      title: seedTitle ?? '',
      summary: seedSummary ?? '',
      day_from: seedFrom ?? 1,
      day_to: seedTo === null || seedTo === undefined ? '' : seedTo,
    });
  }, [seedId, seedTitle, seedSummary, seedFrom, seedTo]);

  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      return true;
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...phases];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(async () => {
      const res = await adminReorderStudyPlanPhasesApi(templateId, next.map((p) => p.id));
      onChanged(res.phases);
    });
  };

  const editingBlock = selected?.blocks.find((b) => b.id === editingBlockId) || null;

  if (phases.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
        <p className="text-sm font-bold text-gray-600">No phases yet</p>
        <p className="text-xs text-gray-500 mt-1 mb-4">Add the first phase to start authoring content.</p>
        <button
          type="button"
          disabled={readOnly}
          onClick={() =>
            run(async () => {
              const res = await adminAddStudyPlanPhaseApi(templateId, { title: 'Phase 1', day_from: 1 });
              onChanged(res.phases);
              setSelectedId(res.phase.id);
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold min-h-[2.5rem]"
        >
          <Plus className="w-4 h-4" /> Add first phase
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="flex items-start gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {error}
        </p>
      )}

      <div className="lg:hidden flex gap-1 p-1 bg-[#F1F5F9] rounded-xl" role="tablist">
        {(['list', 'detail'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={mobilePane === t}
            onClick={() => setMobilePane(t)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg min-h-[2.5rem] ${
              mobilePane === t ? 'bg-white text-[#0284C7] shadow-sm' : 'text-gray-500'
            }`}
          >
            {t === 'list' ? 'Phases' : 'Content'}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[18rem_1fr] gap-4 items-start">
        <div className={`space-y-2 ${mobilePane === 'list' ? '' : 'hidden lg:block'}`}>
          {phases.map((p, i) => (
            <div
              key={p.id}
              className={`rounded-xl border p-3 transition-colors ${
                p.id === selected?.id ? 'border-[#0284C7] bg-[#0284C7]/5' : 'border-gray-200 bg-white'
              }`}
            >
              <button type="button" onClick={() => { setSelectedId(p.id); setMobilePane('detail'); }} className="w-full text-left">
                <span className="block text-[10px] font-mono uppercase text-gray-500">
                  {p.day_to ? `Day ${p.day_from}–${p.day_to}` : `Day ${p.day_from}+`}
                </span>
                <span className="block text-[13px] font-bold text-[#10151C] mt-0.5 leading-snug">{p.title}</span>
                <span className="block text-[11px] text-gray-500 mt-0.5">
                  {p.blocks.length} block{p.blocks.length === 1 ? '' : 's'}
                </span>
              </button>
              {!readOnly && (
                <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                  <button type="button" aria-label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#0284C7] disabled:opacity-30">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === phases.length - 1 || busy} onClick={() => move(i, 1)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#0284C7] disabled:opacity-30">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete phase"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Delete phase "${p.title}"?`)) return;
                      run(async () => {
                        const res = await adminDeleteStudyPlanPhaseApi(templateId, p.id);
                        onChanged(res.phases);
                      });
                    }}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 disabled:opacity-30 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {!readOnly && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const last = phases[phases.length - 1];
                  const res = await adminAddStudyPlanPhaseApi(templateId, {
                    title: `Phase ${phases.length + 1}`,
                    day_from: (last?.day_to || last?.day_from || 0) + 1,
                    day_to: null,
                  });
                  onChanged(res.phases);
                  setSelectedId(res.phase.id);
                  setMobilePane('detail');
                })
              }
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-500 font-bold text-[11px] min-h-[2.5rem] hover:border-[#0284C7] hover:text-[#0284C7]"
            >
              <Plus className="w-3.5 h-3.5" /> Add phase
            </button>
          )}
        </div>

        {selected && (
          <div className={`space-y-4 min-w-0 ${mobilePane === 'detail' ? '' : 'hidden lg:block'}`}>
            {!readOnly && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Phase title</label>
                    <input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">From day</label>
                      <input
                        type="number"
                        min={1}
                        className={inputCls}
                        value={draft.day_from}
                        onChange={(e) => setDraft({ ...draft, day_from: Number(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">To day</label>
                      <input
                        type="number"
                        min={1}
                        className={inputCls}
                        value={draft.day_to}
                        onChange={(e) => setDraft({ ...draft, day_to: e.target.value })}
                        placeholder="open"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Summary</label>
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={draft.summary}
                    onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                    placeholder="One line shown when the phase is collapsed"
                  />
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const res = await adminUpdateStudyPlanPhaseApi(templateId, selected.id, {
                        title: draft.title,
                        summary: draft.summary,
                        day_from: draft.day_from,
                        day_to: draft.day_to === '' ? null : Number(draft.day_to),
                      });
                      onChanged(res.phases);
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1F3A5F] text-white text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem]"
                >
                  <Save className="w-4 h-4" /> Save phase
                </button>
              </div>
            )}

            <div className="space-y-3">
              {selected.blocks.length === 0 && (
                <p className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-2xl p-6 text-center">
                  No content blocks in this phase yet.
                </p>
              )}

              {selected.blocks.map((b) => (
                <div key={b.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAF9] border-b border-gray-200">
                    <span className="text-[10px] font-mono font-bold uppercase text-gray-500">
                      {b.block_type} · #{b.block_order}
                    </span>
                    <div className="ml-auto flex gap-1">
                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            aria-label="Edit block"
                            onClick={() => { setEditingBlockId(b.id); setMobilePane('detail'); }}
                            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#0284C7]"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete block"
                            onClick={() =>
                              run(async () => {
                                const res = await adminDeleteStudyPlanBlockApi(templateId, selected.id, b.id);
                                onChanged(res.phases);
                              })
                            }
                            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <ContentBlockRenderer block={b} isLocked={false} companyName="Target Company" />
                  </div>
                </div>
              ))}

              {editingBlockId && editingBlockId !== '__new__' && (
                <BlockForm
                  key={editingBlockId}
                  block={editingBlock}
                  draftKey={`sp-${templateId}-${selected.id}-${editingBlockId}`}
                  saving={busy}
                  onCancel={() => setEditingBlockId(null)}
                  onSave={async (block_type, payload) => {
                    const ok = await run(async () => {
                      const res = await adminUpdateStudyPlanBlockApi(templateId, selected.id, editingBlockId, {
                        block_type,
                        payload,
                      });
                      onChanged(res.phases);
                    });
                    if (ok) setEditingBlockId(null);
                  }}
                />
              )}

              {!readOnly && !editingBlockId && (
                <button
                  type="button"
                  onClick={() => { setEditingBlockId('__new__'); setMobilePane('detail'); }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-dashed border-gray-300 text-gray-500 font-bold text-xs min-h-[3rem] hover:border-[#0284C7] hover:text-[#0284C7]"
                >
                  <Plus className="w-4 h-4" /> Add content block
                </button>
              )}

              {editingBlockId === '__new__' && (
                <BlockForm
                  block={null}
                  draftKey={`sp-${templateId}-${selected.id}-new`}
                  saving={busy}
                  onCancel={() => setEditingBlockId(null)}
                  onSave={async (block_type, payload) => {
                    const ok = await run(async () => {
                      const res = await adminAddStudyPlanBlockApi(templateId, selected.id, { block_type, payload });
                      onChanged(res.phases);
                    });
                    if (ok) setEditingBlockId(null);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlanPhaseEditor;
