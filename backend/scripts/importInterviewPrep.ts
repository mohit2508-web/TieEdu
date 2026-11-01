/**
 * Adds interview-prep modules (src/data/interviewPrep/*) to a company page.
 * Each module is tied to a round (Technical / HR), so it shows in that round's
 * Train box. Upserts by module id; re-running replaces the items.
 *
 *   npx ts-node --transpile-only scripts/importInterviewPrep.ts
 */
import { loadDb, safeSaveDb } from '../src/data/db';
import { TECHNICAL, HR, type PrepItem } from '../src/data/interviewPrep/infosysSE';
import { LESSONS, type Lesson } from '../src/data/interviewPrep/infosysSELessons';

// Lessons become items too: title as the question, notes as the answer block.
const lessonAsItem = ([section, title, rules, example, trap]: Lesson): PrepItem =>
  [`${section}: ${title}`, 'medium', 'high', rules, example, trap];

const SETS: Array<{ slug: string; id: string; type: string; round: string; title: string; order: number; items: PrepItem[]; lesson?: boolean }> = [
  { slug: 'infosys-systems-engineer', id: 'mod-prep-infosys-se-oa', type: 'preparation_guide', round: 'OA', title: 'Online assessment: topic lessons', order: 1, items: LESSONS.map(lessonAsItem), lesson: true },
  { slug: 'infosys-systems-engineer', id: 'mod-prep-infosys-se-tech', type: 'technical_question', round: 'Technical', title: 'Technical interview: questions and model answers', order: 2, items: TECHNICAL },
  { slug: 'infosys-systems-engineer', id: 'mod-prep-infosys-se-hr', type: 'hr_question', round: 'HR', title: 'HR interview: questions and model answers', order: 3, items: HR },
];

const FREE_PREVIEW = 3;

const md = ([, , , covers, sample, follow]: PrepItem, lesson = false) => lesson
  ? `**Key rules**\n${covers.map((c) => `- ${c}`).join('\n')}\n\n**Worked example**\n\n> ${sample}\n\n**Common trap:** ${follow}`
  : `**What a good answer covers**\n${covers.map((c) => `- ${c}`).join('\n')}\n\n**Sample answer**\n\n> ${sample}\n\n**Follow-up to expect:** ${follow}`;

const db: any = loadDb();
for (const set of SETS) {
  const company = (db.companies || []).find((c: any) => c.slug === set.slug);
  if (!company) { console.warn(`skip: no company ${set.slug} (import profiles first)`); continue; }
  company.modules = Array.isArray(company.modules) ? company.modules : [];
  const module = {
    id: set.id, company_id: company.id, module_type: set.type, round_type: set.round, title: set.title,
    // Topic lessons are free (design: Free = topic notes); interview answers are in the pack, first FREE_PREVIEW readable.
    sort_order: set.order, is_premium: !set.lesson,
    items: set.items.map((it, i) => ({
      id: `${set.id}-${i + 1}`, module_id: set.id, question_text: it[0], is_free_preview: set.lesson || i < FREE_PREVIEW,
      difficulty: it[1], role_tag: 'Systems Engineer', frequency_tag: it[2], round_type: set.round, status: 'published',
      comments_count: 0, upvotes_count: 0,
      blocks: [{ id: `${set.id}-${i + 1}-b1`, block_type: 'markdown', block_order: 1, payload: { text: md(it, set.lesson) } }],
    })),
  };
  const at = company.modules.findIndex((m: any) => m.id === set.id);
  if (at >= 0) company.modules[at] = module; else company.modules.push(module);
  company.module_count = company.modules.length;
  console.log(`${set.slug}: ${set.title} (${set.items.length} questions)`);
}
safeSaveDb(db);
