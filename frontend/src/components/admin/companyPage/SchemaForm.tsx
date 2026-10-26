import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { Company } from '@/types';
import type { CpFieldDef } from '@/types/companyPage';
import { cpMediaUrl } from '@/lib/companyPagesApi';

/*
 * Renders an editing form from the server's field definitions. Nothing here
 * knows about any particular section: a new field added to the server
 * catalogue appears in the studio with no frontend change.
 *
 * Values are kept loosely typed on purpose — the server sanitiser is the
 * authority on shape and will coerce anything this form produces.
 */

export interface SchemaFormContext {
  company: Company;
  companies: Company[];
  accentPalette: { value: string; label: string; hex: string }[];
  skills: { slug: string; name: string; category: string }[];
  uploadImage: (file: File) => Promise<string>;
  /**
   * 'hi' edits the Hinglish variants: only words are shown, each with its
   * English text for reference, and list structure is locked (rows are added,
   * removed and reordered in English).
   */
  lang: 'en' | 'hi';
}

/** Kinds with words a student reads — the ones that get a Hinglish variant. Mirrors the server. */
const LOCALIZABLE = new Set(['text', 'markdown', 'tags']);
const hasLocalizable = (fields: CpFieldDef[] = []): boolean =>
  fields.some((f) => LOCALIZABLE.has(f.kind) || (f.kind === 'list' && hasLocalizable(f.item)));

const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-signal focus:border-signal';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1';
const helpCls = 'mt-1 text-xs text-gray-500';

export const newRowId = () => `r-${Math.random().toString(16).slice(2, 10)}`;

const LINK_OK = /^(#[A-Za-z0-9_-]{1,60}|\/(?!\/)|https?:\/\/|mailto:)/i;

function Counter({ value, max }: { value: string; max?: number }) {
  if (!max) return null;
  const n = value.length;
  return (
    <span className={`text-xs tabular-nums ${n > max * 0.9 ? 'text-amber-700' : 'text-gray-400'}`}>
      {n}/{max}
    </span>
  );
}

function FieldShell({ field, children, right }: { field: CpFieldDef; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className={labelCls}>
          {field.label}
          {field.required && <span className="text-red-600"> *</span>}
        </label>
        {right}
      </div>
      {children}
      {field.help && <p className={helpCls}>{field.help}</p>}
    </div>
  );
}

function TagsInput({ value, onChange, max }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || value.includes(v) || (max && value.length >= max)) return;
    onChange([...value, v]);
    setDraft('');
  };
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag, i) => (
            <span key={tag} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-gray-100 text-sm text-gray-800">
              {tag}
              {i > 0 && (
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-700"
                  title="Move left"
                  onClick={() => {
                    const next = value.slice();
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    onChange(next);
                  }}
                >
                  ‹
                </button>
              )}
              <button type="button" className="p-0.5 text-gray-400 hover:text-red-600" title="Remove" onClick={() => onChange(value.filter((x) => x !== tag))}>
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="w-full text-sm outline-none px-1"
        value={draft}
        placeholder={max && value.length >= max ? `Maximum ${max} reached` : 'Type and press Enter'}
        disabled={!!max && value.length >= max}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
  );
}

function RefPicker({
  options,
  value,
  onChange,
  max,
  empty,
}: {
  options: { id: string; label: string; meta?: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
  empty: string;
}) {
  if (options.length === 0) return <p className="text-sm text-gray-500 italic">{empty}</p>;
  return (
    <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 max-h-56 overflow-y-auto">
      {options.map((o) => {
        const on = value.includes(o.id);
        const full = !on && !!max && value.length >= max;
        return (
          <label key={o.id} className={`flex items-center gap-2.5 px-3 py-2 text-sm ${full ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}>
            <input
              type="checkbox"
              checked={on}
              disabled={full}
              onChange={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
            />
            <span className="flex-1 text-gray-900">{o.label}</span>
            {o.meta && <span className="text-xs text-gray-500">{o.meta}</span>}
            {on && <span className="text-xs font-semibold text-signal-hover">#{value.indexOf(o.id) + 1}</span>}
          </label>
        );
      })}
    </div>
  );
}

function ImageField({ value, onChange, ctx }: { value: string; onChange: (v: string) => void; ctx: SchemaFormContext }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      onChange(await ctx.uploadImage(file));
    } catch (e: any) {
      setErr(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className="flex items-start gap-3">
      <div className="w-40 aspect-[1200/630] rounded-lg border border-gray-200 bg-gray-50 overflow-hidden grid place-items-center shrink-0">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file
          <img src={cpMediaUrl(value)} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-5 h-5 text-gray-400" />
        )}
      </div>
      <div className="space-y-1.5">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-semibold hover:border-signal disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {value ? 'Replace image' : 'Upload image'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="block text-xs font-semibold text-red-700 hover:underline">
            Remove
          </button>
        )}
        <p className="text-xs text-gray-500">JPG, PNG or WebP, under 3 MB.</p>
        {err && <p className="text-xs text-red-700">{err}</p>}
      </div>
    </div>
  );
}

function ListField({
  field,
  value,
  onChange,
  ctx,
}: {
  field: CpFieldDef;
  value: any[];
  onChange: (v: any[]) => void;
  ctx: SchemaFormContext;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const titleKey = field.itemTitleKey || field.item?.[0]?.key || '';
  const atMax = !!field.max && value.length >= field.max;
  const locked = ctx.lang === 'hi';

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <FieldShell field={field} right={field.max ? <span className="text-xs text-gray-400">{value.length}/{field.max}</span> : undefined}>
      <div className="space-y-2">
        {value.map((row, i) => {
          const id = row.id || `idx-${i}`;
          const isOpen = open === id;
          const title = String(row[titleKey] || '').trim() || `Item ${i + 1}`;
          return (
            <div key={id} className="border border-gray-200 rounded-lg bg-gray-50/60">
              <div className="flex items-center gap-1 px-2 py-1.5">
                <button type="button" className="flex-1 flex items-center gap-1.5 text-left text-sm font-medium text-gray-900 min-w-0" onClick={() => setOpen(isOpen ? null : id)}>
                  <ChevronRight className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <span className="truncate">{title}</span>
                </button>
                {!locked && (
                  <>
                    <button type="button" title="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" title="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Remove"
                      onClick={() => {
                        if (confirm(`Remove “${title}”?`)) onChange(value.filter((_, k) => k !== i));
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              {isOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-200 bg-white rounded-b-lg">
                  <SchemaForm
                    fields={field.item || []}
                    value={row}
                    onChange={(nextRow) => onChange(value.map((r, k) => (k === i ? nextRow : r)))}
                    ctx={ctx}
                  />
                </div>
              )}
            </div>
          );
        })}
        {!locked && <button
          type="button"
          disabled={atMax}
          onClick={() => {
            const row = { id: newRowId() };
            onChange([...value, row]);
            setOpen(row.id);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-sm font-semibold text-gray-700 hover:border-signal hover:text-signal-hover disabled:opacity-40"
        >
          {/* "Rounds (stations)" → "Add round" */}
          <Plus className="w-4 h-4" /> Add {field.label.replace(/\s*\(.*\)\s*$/, '').toLowerCase().replace(/s$/, '')}
        </button>}
      </div>
    </FieldShell>
  );
}

function Field({ field, value, onChange, ctx }: { field: CpFieldDef; value: any; onChange: (v: any) => void; ctx: SchemaFormContext }) {
  switch (field.kind) {
    case 'text':
    case 'markdown': {
      const v = typeof value === 'string' ? value : '';
      const multi = field.kind === 'markdown' || field.multiline;
      return (
        <FieldShell field={field} right={<Counter value={v} max={field.max} />}>
          {multi ? (
            <textarea
              className={inputCls}
              rows={field.kind === 'markdown' ? 5 : 3}
              value={v}
              maxLength={field.max}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input className={inputCls} value={v} maxLength={field.max} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          )}
        </FieldShell>
      );
    }
    case 'int':
      return (
        <FieldShell field={field}>
          <input
            type="number"
            className={inputCls}
            min={field.min}
            max={field.max}
            value={value === null || value === undefined ? '' : value}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          />
        </FieldShell>
      );
    case 'date':
      return (
        <FieldShell field={field}>
          <input type="date" className={inputCls} value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </FieldShell>
      );
    case 'url': {
      const v = typeof value === 'string' ? value : '';
      const bad = v.trim() !== '' && !LINK_OK.test(v.trim());
      return (
        <FieldShell field={field}>
          <input className={`${inputCls} ${bad ? 'border-amber-500' : ''}`} value={v} placeholder="/path, #section or https://…" onChange={(e) => onChange(e.target.value)} />
          {bad && <p className="mt-1 text-xs text-amber-700">This link isn’t allowed and will be cleared on save. Use /path, #anchor, https:// or mailto:.</p>}
        </FieldShell>
      );
    }
    case 'bool':
      return (
        <label className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      );
    case 'select':
      if (field.key === 'accent') {
        return (
          <FieldShell field={field}>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={field.label}>
              {ctx.accentPalette.map((sw) => (
                <button
                  key={sw.value}
                  type="button"
                  role="radio"
                  aria-checked={value === sw.value}
                  title={sw.label}
                  onClick={() => onChange(sw.value)}
                  className={`w-9 h-9 rounded-full border-2 transition-transform ${value === sw.value ? 'border-gray-900 scale-110' : 'border-white shadow'}`}
                  style={{ background: sw.hex }}
                >
                  <span className="sr-only">{sw.label}</span>
                </button>
              ))}
            </div>
          </FieldShell>
        );
      }
      return (
        <FieldShell field={field}>
          <select className={inputCls} value={value ?? field.options?.[0]?.value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {(field.options || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldShell>
      );
    case 'tags':
      return (
        <FieldShell field={field} right={field.max ? <span className="text-xs text-gray-400">{(value || []).length}/{field.max}</span> : undefined}>
          <TagsInput value={Array.isArray(value) ? value : []} onChange={onChange} max={field.max} />
        </FieldShell>
      );
    case 'module_refs':
      return (
        <FieldShell field={field}>
          <RefPicker
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            max={field.max}
            empty="This company has no modules yet. Add them under Manage."
            options={(ctx.company.modules || []).map((m) => ({ id: m.id, label: m.title, meta: m.is_premium ? 'Premium' : 'Free' }))}
          />
        </FieldShell>
      );
    case 'company_refs':
      return (
        <FieldShell field={field}>
          <RefPicker
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            max={field.max}
            empty="No other companies yet."
            options={ctx.companies
              .filter((c) => c.id !== ctx.company.id)
              .map((c) => ({ id: c.slug, label: c.name, meta: c.status === 'published' ? undefined : c.status }))}
          />
        </FieldShell>
      );
    case 'skill_refs':
      return (
        <FieldShell field={field}>
          <RefPicker
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            max={field.max}
            empty="No skill tests exist yet. Create them under Skill Test."
            options={ctx.skills.map((sk) => ({ id: sk.slug, label: sk.name, meta: sk.category }))}
          />
        </FieldShell>
      );
    case 'item_refs':
      return (
        <FieldShell field={field}>
          <RefPicker
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            max={field.max}
            empty="This company has no questions yet. Add them under Manage."
            options={(ctx.company.modules || []).flatMap((m) =>
              (m.items || []).map((it) => ({
                id: it.id,
                label: it.question_text || 'Untitled question',
                meta: it.is_free_preview ? 'Free preview' : 'Locked',
              }))
            )}
          />
        </FieldShell>
      );
    case 'image':
      return (
        <FieldShell field={field}>
          <ImageField value={typeof value === 'string' ? value : ''} onChange={onChange} ctx={ctx} />
        </FieldShell>
      );
    case 'list':
      return <ListField field={field} value={Array.isArray(value) ? value : []} onChange={onChange} ctx={ctx} />;
    default:
      return null;
  }
}

export function SchemaForm({
  fields,
  value,
  onChange,
  ctx,
}: {
  fields: CpFieldDef[];
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
  ctx: SchemaFormContext;
}) {
  if (ctx.lang === 'hi') {
    const shown = fields.filter((f) => LOCALIZABLE.has(f.kind) || (f.kind === 'list' && hasLocalizable(f.item)));
    if (shown.length === 0) return <p className="text-sm text-gray-500 italic">Nothing to translate here.</p>;
    return (
      <div className="space-y-4">
        {shown.map((f) => {
          if (f.kind === 'list') {
            return <Field key={f.key} field={f} value={value?.[f.key]} ctx={ctx} onChange={(v) => onChange({ ...value, [f.key]: v })} />;
          }
          const english = value?.[f.key];
          const englishText = Array.isArray(english) ? english.join(', ') : String(english || '');
          return (
            <Field
              key={f.key}
              field={{
                ...f,
                required: false,
                placeholder: englishText.slice(0, 120) || f.placeholder,
                help: englishText ? `English: ${englishText}` : 'No English text yet.',
              }}
              value={value?.hi?.[f.key]}
              ctx={ctx}
              onChange={(v) => onChange({ ...value, hi: { ...(value?.hi || {}), [f.key]: v } })}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <Field key={f.key} field={f} value={value?.[f.key]} ctx={ctx} onChange={(v) => onChange({ ...value, [f.key]: v })} />
      ))}
    </div>
  );
}
