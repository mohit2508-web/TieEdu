import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StudyPlanTemplateMeta, StudyPlanPhase } from '@/types';
import { StudyPlanPhaseEditor } from '@/components/admin/StudyPlanPhaseEditor';
import {
  adminListStudyPlansApi, adminGetStudyPlanApi, adminCreateStudyPlanApi,
  adminUpdateStudyPlanApi, adminDeleteStudyPlanApi, fetchAdminCompaniesApi,
} from '@/lib/api';
import { ContentBlockRenderer } from '@/components/blocks/ContentBlockRenderer';
import {
  Plus, Search, Save, Loader2, AlertTriangle, Trash2, CalendarRange,
  CheckCircle2, FileEdit, Archive, Send, Layers, Eye, X,
} from 'lucide-react';

const inputCls =
  'w-full p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]';

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-amber-100 text-amber-900',
  archived: 'bg-gray-200 text-gray-700',
};

/**
 * Client-side mirror of the server's `slugify`. Used only to preview what will be
 * saved; the server is the authority and re-slugifies, so a drift between the
 * two would show a slightly wrong preview and nothing worse.
 */
const slugify = (input: string): string =>
  input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const StudyPlansTab: React.FC = () => {
  const [templates, setTemplates] = useState<StudyPlanTemplateMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [phases, setPhases] = useState<StudyPlanPhase[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [meta, setMeta] = useState({ title: '', slug: '', company_id: '', role: '', status: 'draft' });
  /**
   * Once the admin edits the slug by hand it stops tracking the title, otherwise
   * every keystroke in the title would silently rewrite a URL they had already
   * chosen. Cleared when a different template is opened.
   */
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [previewOpen, setPreviewOpen] = useState(false);
  /**
   * Set when the server refuses a slug because another plan already owns it. The
   * alternative it suggests is offered as one click, because the alternative to
   * a one-click fix is the admin guessing at hyphenated variants until one is
   * free.
   */
  const [slugConflict, setSlugConflict] = useState<string>('');
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('list');

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListStudyPlansApi();
      setTemplates(res.templates || []);
    } catch (e: any) {
      setError(e?.message || 'Could not load study plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
    fetchAdminCompaniesApi()
      .then((list) => setCompanies((list || []).map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, [loadList]);

  const openTemplate = useCallback(async (id: string) => {
    if (!id) return;
    setError('');
    setNotice('');
    setSaveState('idle');
    try {
      const res = await adminGetStudyPlanApi(id);
      setPhases(res.phases || []);
      setMeta({
        title: res.template.title || '',
        slug: res.template.slug || '',
        company_id: res.template.company_id || '',
        role: res.template.role || '',
        status: res.template.status,
      });
      setSlugTouched(false);
      setSelectedId(id);
    } catch (e: any) {
      setError(e?.message || 'Could not open that plan');
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPhases([]);
      return;
    }
    openTemplate(selectedId);
  }, [selectedId, openTemplate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.company_name || '').toLowerCase().includes(q) ||
        (t.role || '').toLowerCase().includes(q)
      );
    });
  }, [templates, query, filter]);

  /**
   * Every mutation goes through here so the three admin affordances the plan
   * asks for are impossible to skip: a visible saving state, and — when the
   * caller supplies an optimistic patch — local state that reflects the intent
   * immediately and is reverted if the request fails.
   *
   * `optimistic.apply()` runs before the await, `optimistic.rollback()` on
   * rejection. On success `loadList()` replaces local state with the server's
   * version anyway, so no separate commit step is needed.
   */
  const run = async (
    fn: () => Promise<any>,
    ok?: string,
    optimistic?: { apply: () => void; rollback: () => void },
    onError?: (e: any) => void
  ) => {
    setBusy(true);
    setSaveState('saving');
    setError('');
    setNotice('');
    optimistic?.apply();
    try {
      await fn();
      setSaveState('saved');
      if (ok) setNotice(ok);
      await loadList();
    } catch (e: any) {
      optimistic?.rollback();
      setSaveState('idle');
      setError(e?.message || 'Request failed');
      onError?.(e);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Patches one row of the list in place. Used for optimistic updates, where the
   * admin should see the new status or title immediately instead of waiting for
   * a round trip, and should see it snap back if the server refuses.
   */
  const patchTemplate = (id: string, patch: Partial<StudyPlanTemplateMeta>) => {
    setTemplates((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  /**
   * `run` with the slug-clash case handled. The 409 carries the free alternative
   * the server computed; without this it would reach the admin as a bare error
   * string with no way to act on it.
   */
  const runSavingDetails = (
    id: string,
    payload: Record<string, unknown>,
    patch: Partial<StudyPlanTemplateMeta>,
    before: StudyPlanTemplateMeta | null
  ) =>
    run(
      async () => {
        const res = await adminUpdateStudyPlanApi(id, payload);
        setPhases(res.phases || []);
        setMeta((m) => ({
          ...m,
          slug: res.template?.slug || m.slug,
          title: res.template?.title || m.title,
        }));
        setSlugTouched(false);
        setSlugConflict('');
      },
      'Saved',
      {
        apply: () => patchTemplate(id, patch),
        rollback: () => before && patchTemplate(id, before),
      },
      (e: any) => {
        // A 409 is the server saying this slug is taken and naming a free one.
        // Anything else is a plain failure and the error banner already covers it.
        if (e?.status === 409 && e?.body?.suggested_slug) {
          setSlugConflict(e.body.suggested_slug);
        }
      }
    );

  /** A slug that lost a race is fixed by accepting the server's alternative. */
  const acceptSuggestedSlug = () => {
    if (!slugConflict) return;
    setMeta((m) => ({ ...m, slug: slugConflict }));
    setSlugConflict('');
    setSlugTouched(true);
  };

  const createTemplate = () =>
    run(async () => {
      const res = await adminCreateStudyPlanApi({ title: 'Untitled Study Plan', status: 'draft' });
      setSelectedId(res.template.id);
    }, 'Template created');

  const selected = templates.find((t) => t.id === selectedId) || null;

  /**
   * The slug that will be sent on the next save, or `undefined` when the admin
   * has not chosen one.
   *
   * An untouched slug is deliberately NOT sent: the server then derives it from
   * the title itself, which is the only path that can de-duplicate. Sending a
   * locally-derived value instead would make the server treat it as an explicit
   * choice and reject the second plan whose title slugifies to the same string.
   * It also made non-Latin titles unsaveable — `slugify('Привет')` is `''` here,
   * which the server rejects outright, while its own fallback would have stored
   * `study-plan`. Omitting the field sidesteps that whole class of divergence.
   */
  const explicitSlug = slugTouched ? slugify(meta.slug) : undefined;

  /**
   * What the admin will see stored. Mirrors the server, including its
   * `study-plan` fallback for titles with no ASCII letters or digits.
   */
  const slugPreview = explicitSlug || slugify(meta.title) || 'study-plan';

  /** Warnings worth showing before a publish, rather than after a student complains. */
  const publishWarnings = useMemo(() => {
    const out: string[] = [];
    if (phases.length === 0) out.push('This plan has no phases, so students would see an empty plan.');
    const totalBlocks = phases.reduce((n, p) => n + (p.blocks?.length || 0), 0);
    if (phases.length > 0 && totalBlocks === 0) {
      out.push('None of the phases contain content blocks yet.');
    }
    // Only an explicit slug can be un-saveable. An auto one always has the
    // server's fallback behind it.
    if (slugTouched && !explicitSlug) {
      out.push('This slug has no letters or numbers, so it cannot be saved. Clear the field to follow the title instead.');
    }
    if (!slugTouched && !slugify(meta.title)) {
      out.push(`This title has no ASCII letters or digits, so the slug will be "${slugPreview}" rather than the title.`);
    }
    const emptyPhase = phases.find((p) => !p.title?.trim());
    if (emptyPhase) out.push(`Phase ${emptyPhase.phase_order} has no title.`);
    return out;
  }, [phases, slugTouched, explicitSlug, slugPreview, meta.title]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="text-base font-extrabold text-[#10151C] flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-[#0284C7]" /> Study Plan Templates
          </h3>
          <p className="text-[11px] text-gray-500">
            Author preparation plans students see on the Study Plan page. Published templates are matched by
            company and role, then fall back to a generic plan.
          </p>
        </div>
        <button
          type="button"
          onClick={createTemplate}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0284C7] text-white text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem]"
        >
          <Plus className="w-4 h-4" /> New plan
        </button>
      </div>

      {error && (
        <p className="flex items-start gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {error}
        </p>
      )}
      {notice && (
        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <CheckCircle2 className="w-4 h-4" /> {notice}
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
            {t === 'list' ? 'All plans' : selected ? selected.title : 'Editor'}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[19rem_1fr] gap-4 items-start">
        <div className={`space-y-2 ${mobilePane === 'list' ? '' : 'hidden lg:block'}`}>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className={inputCls + ' pl-9'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plans"
              aria-label="Search study plans"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {(['all', 'draft', 'published', 'archived'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase min-h-[2rem] ${
                  filter === f ? 'bg-[#1F3A5F] text-white' : 'bg-white border border-gray-200 text-gray-500'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading && <p className="text-xs text-gray-500 flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}

          {!loading && filtered.length === 0 && (
            <p className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl p-6 text-center">
              No plans match. Create one to get started.
            </p>
          )}

          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setSelectedId(t.id); setMobilePane('detail'); }}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${
                t.id === selectedId ? 'border-[#0284C7] bg-[#0284C7]/5' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_STYLES[t.status]}`}>
                  {t.status}
                </span>
                <span className="ml-auto text-[10px] font-mono text-gray-400">v{t.version}</span>
              </span>
              <span className="block text-[13px] font-bold text-[#10151C] leading-snug">{t.title}</span>
              <span className="block text-[11px] text-gray-500 mt-0.5 truncate">
                {t.company_name || 'Generic'} · {t.role || 'Any role'} · {t.phase_count ?? 0} phases
              </span>
              {t.slug && (
                <span className="block text-[10px] font-mono text-gray-400 truncate mt-0.5">/{t.slug}</span>
              )}
            </button>
          ))}
        </div>

        <div className={`min-w-0 ${mobilePane === 'detail' ? '' : 'hidden lg:block'}`}>
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <Layers className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-600">Select a plan to edit</p>
              <p className="text-xs text-gray-500 mt-1">Or create a new one to start authoring.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Title</label>
                    <input className={inputCls} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="plan-slug" className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">
                      Slug
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        id="plan-slug"
                        className={inputCls}
                        value={meta.slug}
                        placeholder="auto from title"
                        aria-describedby="plan-slug-preview"
                        onChange={(e) => {
                          setMeta({ ...meta, slug: e.target.value });
                          setSlugTouched(true);
                          setSlugConflict('');
                        }}
                      />
                      {slugTouched && (
                        <button
                          type="button"
                          onClick={() => {
                            setMeta((m) => ({ ...m, slug: m.title }));
                            setSlugTouched(false);
                            setSlugConflict('');
                          }}
                          title="Follow the title again"
                          className="shrink-0 px-2.5 rounded-xl border border-gray-200 text-[10px] font-bold uppercase text-gray-500 hover:bg-gray-50 min-h-[2.5rem]"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                    <p id="plan-slug-preview" className="mt-1 text-[10px] font-mono text-gray-400 truncate">
                      {slugTouched ? 'Saves as ' : 'Follows title: '}
                      <span className="text-gray-600">{slugPreview}</span>
                    </p>
                    {slugConflict && (
                      <p className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                        <span className="truncate">Taken — try “{slugConflict}”</span>
                        <button
                          type="button"
                          onClick={acceptSuggestedSlug}
                          className="ml-auto shrink-0 font-bold uppercase text-amber-900 underline hover:no-underline"
                        >
                          Use it
                        </button>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Company</label>
                    <select className={inputCls} value={meta.company_id} onChange={(e) => setMeta({ ...meta, company_id: e.target.value })}>
                      <option value="">Generic (all companies)</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Role</label>
                    <input
                      className={inputCls}
                      value={meta.role}
                      onChange={(e) => setMeta({ ...meta, role: e.target.value })}
                      placeholder="Leave blank for any role"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Status</label>
                    <select className={inputCls} value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value })}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const patch = {
                        title: meta.title,
                        company_id: meta.company_id || null,
                        company_name: companies.find((c) => c.id === meta.company_id)?.name || null,
                        role: meta.role || null,
                        // Only sent when the admin picked a slug; otherwise the
                        // server derives and de-duplicates one from the title.
                        ...(explicitSlug ? { slug: explicitSlug } : {}),
                      };
                      // The list preview has no slug to show when the field is
                      // untouched, so it keeps whatever is already stored.
                      const optimisticPatch: Partial<StudyPlanTemplateMeta> = explicitSlug
                        ? patch
                        : { title: patch.title, company_id: patch.company_id, company_name: patch.company_name, role: patch.role };
                      runSavingDetails(selectedId, patch, optimisticPatch, selected);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1F3A5F] text-white text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem] disabled:opacity-60"
                  >
                    {saveState === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save details'}
                  </button>

                  {meta.status !== 'published' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPreviewOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem]"
                      >
                        <Eye className="w-4 h-4" /> Preview
                      </button>
                      <button
                        type="button"
                        disabled={busy || phases.length === 0}
                        title={phases.length === 0 ? 'Add at least one phase first' : undefined}
                        onClick={() => {
                          const before = selected;
                          run(async () => {
                            const res = await adminUpdateStudyPlanApi(selectedId, { status: 'published' });
                            setPhases(res.phases || []);
                            setMeta((m) => ({ ...m, status: 'published' }));
                          }, 'Published — students now see this plan', {
                            apply: () => {
                              patchTemplate(selectedId, { status: 'published' });
                              setMeta((m) => ({ ...m, status: 'published' }));
                            },
                            rollback: () => {
                              if (before) patchTemplate(selectedId, { status: before.status });
                              setMeta((m) => ({ ...m, status: 'draft' }));
                            },
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem] disabled:opacity-40"
                      >
                        <Send className="w-4 h-4" /> Publish
                      </button>
                    </>
                  )}

                  {meta.status === 'published' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const before = selected;
                        run(async () => {
                          const res = await adminUpdateStudyPlanApi(selectedId, { status: 'draft' });
                          setPhases(res.phases || []);
                          setMeta((m) => ({ ...m, status: 'draft' }));
                        }, 'Moved back to draft', {
                          apply: () => {
                            patchTemplate(selectedId, { status: 'draft' });
                            setMeta((m) => ({ ...m, status: 'draft' }));
                          },
                          rollback: () => {
                            if (before) patchTemplate(selectedId, { status: before.status });
                            setMeta((m) => ({ ...m, status: 'published' }));
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem]"
                    >
                      <FileEdit className="w-4 h-4" /> Unpublish
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm('Archive this plan? Students will stop seeing it.')) return;
                      run(async () => {
                        await adminDeleteStudyPlanApi(selectedId, false);
                        setSelectedId('');
                      }, 'Archived');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem] ml-auto"
                  >
                    <Archive className="w-4 h-4" /> Archive
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm('Permanently delete this plan and all its phases?')) return;
                      run(async () => {
                        await adminDeleteStudyPlanApi(selectedId, true);
                        setSelectedId('');
                      }, 'Deleted');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-700 text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem]"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>

              <StudyPlanPhaseEditor
                templateId={selectedId}
                phases={phases}
                readOnly={false}
                onChanged={(next) => {
                  setPhases(next);
                  setTemplates((prev) => prev.map((t) => (t.id === selectedId ? { ...t, phase_count: next.length } : t)));
                }}
              />
            </div>
          )}
        </div>
      </div>

      {previewOpen && selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${meta.title}`}
            className="relative w-full max-w-3xl bg-white rounded-2xl my-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white rounded-t-2xl">
              <Eye className="w-4 h-4 text-[#0284C7]" />
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-[#10151C] leading-tight">Student preview</p>
                <p className="text-[10px] font-mono text-gray-500 truncate">{slugPreview || 'no-slug'}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Close preview"
                className="ml-auto shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-100 min-h-[2.5rem] min-w-[2.5rem] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {publishWarnings.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase text-amber-900 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Before you publish
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {publishWarnings.map((w) => (
                      <li key={w} className="text-xs text-amber-900">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-lg font-extrabold text-[#10151C]">{meta.title || 'Untitled Study Plan'}</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {companies.find((c) => c.id === meta.company_id)?.name || selected.company_name || 'Generic'} ·{' '}
                  {meta.role || selected.role || 'Any role'}
                </p>
              </div>

              {phases.length === 0 ? (
                <p className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl p-6 text-center">
                  No phases yet. Students would see an empty plan.
                </p>
              ) : (
                phases.map((p) => (
                  <section key={p.id} className="border-t border-gray-100 pt-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
                        {p.day_from === p.day_to || !p.day_to ? `Day ${p.day_from}` : `Days ${p.day_from}–${p.day_to}`}
                      </span>
                      <h5 className="text-[15px] font-bold text-[#10151C]">{p.title || 'Untitled phase'}</h5>
                    </div>
                    {p.summary && (
                      <p className="text-[13px] text-gray-600 leading-relaxed mb-2 whitespace-pre-line">{p.summary}</p>
                    )}
                    {(p.blocks || []).length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No content in this phase.</p>
                    ) : (
                      p.blocks.map((b) => (
                        <ContentBlockRenderer
                          key={b.id}
                          block={b}
                          companyName={companies.find((c) => c.id === meta.company_id)?.name || 'Target Company'}
                        />
                      ))
                    )}
                  </section>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end px-5 py-3.5 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem]"
              >
                Keep editing
              </button>
              {meta.status !== 'published' && (
                <button
                  type="button"
                  disabled={busy || phases.length === 0}
                  onClick={() => {
                    setPreviewOpen(false);
                    const before = selected;
                    run(async () => {
                      const res = await adminUpdateStudyPlanApi(selectedId, { status: 'published' });
                      setPhases(res.phases || []);
                      setMeta((m) => ({ ...m, status: 'published' }));
                    }, 'Published — students now see this plan', {
                      apply: () => {
                        patchTemplate(selectedId, { status: 'published' });
                        setMeta((m) => ({ ...m, status: 'published' }));
                      },
                      rollback: () => {
                        if (before) patchTemplate(selectedId, { status: before.status });
                        setMeta((m) => ({ ...m, status: 'draft' }));
                      },
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider min-h-[2.5rem] disabled:opacity-40"
                >
                  <Send className="w-4 h-4" /> Publish from preview
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlansTab;
