import Anthropic from '@anthropic-ai/sdk';
import { AI_MODEL } from '../ai';
import type { ReqResult, SourceFile, Verdict } from './store';

/**
 * Project Pulse — requirement review (PROJECT_PULSE_PLAN.md §4, layer 3).
 *
 * With AI on (admin switch + ANTHROPIC_API_KEY) Claude reads the code against
 * each requirement and returns met / partial / missing with file:line evidence.
 * Otherwise — or when the call fails — the teacher's hints decide: each hint is
 * a word or /regex/ the code should contain. Either way the teacher can override.
 */

const isCode = (p: string) => /\.(c|h)$/i.test(p);

const hintMatcher = (hint: string) => {
  const m = hint.match(/^\/(.+)\/([a-z]*)$/);
  if (m) { try { const re = new RegExp(m[1], m[2].replace('g', '')); return (l: string) => re.test(l); } catch { /* fall through */ } }
  return (l: string) => l.includes(hint);
};

export function hintReview(requirements: any[], files: SourceFile[]): Record<string, ReqResult> {
  const code = files.filter((f) => isCode(f.path));
  const out: Record<string, ReqResult> = {};
  for (const r of requirements) {
    if (!r.hints?.length) {
      out[r.id] = { verdict: 'partial', reason: 'Needs the teacher’s review: no hints set and AI review is off.', evidence: null };
      continue;
    }
    const found: string[] = [];
    let evidence = null as { file: string; from: number; to: number } | null;
    for (const h of r.hints) {
      const test = hintMatcher(h);
      for (const f of code) {
        const idx = f.code.split('\n').findIndex(test);
        if (idx >= 0) {
          found.push(h);
          if (!evidence) evidence = { file: f.path, from: idx + 1, to: idx + 1 };
          else if (evidence.file === f.path) evidence = { ...evidence, from: Math.min(evidence.from, idx + 1), to: Math.max(evidence.to, idx + 1) };
          break;
        }
      }
    }
    if (evidence && evidence.to - evidence.from > 40) evidence.to = evidence.from + 40;
    const missing = r.hints.filter((h: string) => !found.includes(h));
    const verdict: Verdict = !found.length ? 'missing' : missing.length ? 'partial' : 'met';
    out[r.id] = {
      verdict,
      reason: verdict === 'met' ? `Found everything this needs: ${found.join(', ')}.`
        : verdict === 'missing' ? `None of ${r.hints.join(', ')} found in the code yet.`
        : `Found ${found.join(', ')}; still missing ${missing.join(', ')}.`,
      evidence,
    };
  }
  return out;
}

const SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['met', 'partial', 'missing'] },
          reason: { type: 'string' },
          file: { type: 'string' },
          from: { type: 'integer' },
          to: { type: 'integer' },
        },
        required: ['id', 'verdict', 'reason', 'file', 'from', 'to'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
};

const SYSTEM = `You review a student's C programming assignment for their teacher.
For each requirement decide: "met" (fully and correctly done), "partial" (attempted but incomplete or buggy), or "missing" (not attempted).
Judge the code itself, not comments that claim something is done. Starter code given by the teacher does not count as the student's work.
reason: one or two plain sentences a student can act on — say what is there and exactly what is wrong or missing. Name functions.
file/from/to: the lines that best prove your verdict (1-based, inclusive). For "missing" with no relevant code use file "" and 0, 0.
Return one result per requirement id, in order.`;

export async function aiReview(task: any, files: SourceFile[], client: Anthropic = new Anthropic()): Promise<Record<string, ReqResult>> {
  let budget = 120_000;
  const listing = files.filter((f) => isCode(f.path) || /makefile$/i.test(f.path)).map((f) => {
    const numbered = f.code.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n').slice(0, Math.max(0, budget));
    budget -= numbered.length;
    return `<file path="${f.path}">\n${numbered}\n</file>`;
  }).join('\n');
  const reqs = task.requirements.map((r: any) => `${r.id}. ${r.title} — ${r.detail}`).join('\n');
  const starter = (task.starter || []).map((f: any) => `<starter path="${f.path}">\n${f.code}\n</starter>`).join('\n');
  const response = await client.beta.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA as any } },
    system: SYSTEM,
    messages: [{ role: 'user', content: `Task: ${task.title}\n${task.summary}\n\nRequirements:\n${reqs}\n\n${starter}\n\nStudent's code:\n${listing || '(no C files)'}` }],
  } as any);
  if ((response as any).stop_reason === 'refusal') throw new Error('review declined');
  const block = (response as any).content.find((b: any) => b.type === 'text');
  const parsed = JSON.parse(block.text);
  const paths = new Set(files.map((f) => f.path));
  const out: Record<string, ReqResult> = {};
  for (const r of task.requirements) {
    const x = (parsed.results || []).find((y: any) => y.id === r.id);
    if (!x) throw new Error(`review missing ${r.id}`);
    const ok = paths.has(x.file) && x.from > 0 && x.to >= x.from;
    out[r.id] = { verdict: x.verdict, reason: String(x.reason).slice(0, 600), evidence: ok ? { file: x.file, from: x.from, to: Math.min(x.to, x.from + 80) } : null };
  }
  return out;
}

export const aiEnabled = (db: any) => db.pulse?.settings?.ai_review === true && !!process.env.ANTHROPIC_API_KEY;

export async function review(db: any, task: any, files: SourceFile[]): Promise<{ reqs: Record<string, ReqResult>; source: 'ai' | 'hints' }> {
  if (aiEnabled(db) && files.some((f) => isCode(f.path))) {
    try { return { reqs: await aiReview(task, files), source: 'ai' }; } catch (e: any) { console.warn('[Pulse] AI review failed, using hints:', e?.message); }
  }
  return { reqs: hintReview(task.requirements, files), source: 'hints' };
}
