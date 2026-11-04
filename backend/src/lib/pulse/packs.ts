/**
 * Project Pulse ready-made task packs. A teacher adds a whole course's labs to
 * a class in one go; each lab becomes a published task with its own repo
 * folder, so students only push to GitHub and the teacher reviews.
 *
 * Wipro iOS pack: the owner's Swift iOS Lab Assignment Handbook
 * (data/wiproIOS/labs.ts), 33 labs and assessments, Swift, reviewed by hand
 * (no auto-run tests: Swift apps need macOS runners).
 */
import { LABS, WIPRO_IOS_PACK, type Lab } from '../../data/wiproIOS/labs';
import { MODULES } from '../../data/wiproIOS';
import { pulseOf, newId, normaliseTask, PulseError } from './store';

export const PACKS: Record<string, { title: string; subject: string; labs: Lab[] }> = {
  [WIPRO_IOS_PACK]: { title: 'Wipro iOS (Swift) labs', subject: 'iOS Development (Swift)', labs: LABS },
};

/** 23:59 IST on a YYYY-MM-DD date. */
const endOfDayIst = (d: string) => `${d}T18:29:00.000Z`;
/** 09:00 IST on a YYYY-MM-DD date. */
const morningIst = (d: string) => `${d}T03:30:00.000Z`;

/** A handbook task as a requirement: the full text as the title; only a task too long for a title (120) keeps it in `detail`. */
const reqOf = (t: string) => {
  if (t.length <= 120) return { title: t, detail: '' };
  const cut = t.slice(0, 117);
  return { title: `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 80))}…`, detail: t };
};

export function labTaskBody(lab: Lab) {
  const start = MODULES[lab.module]?.start || lab.due;
  const assigned = start < lab.due ? start : new Date(Date.parse(lab.due) - 86400000).toISOString().slice(0, 10);
  return {
    title: `${lab.kind === 'lab' ? `Lab ${lab.code}` : lab.code === 'Capstone' ? 'Capstone' : `Milestone ${lab.code.slice(1)}`}: ${lab.title.replace(/^Assessment Milestone \d: /, '')}`,
    summary: [`Objective: ${lab.objective}`, `Submit: ${lab.submit}`, lab.extension ? `Extension (optional): ${lab.extension}` : ''].filter(Boolean).join('\n\n'),
    language: 'swift',
    folder: lab.id,
    auto_tests: false,
    assigned_at: morningIst(assigned),
    deadline_at: endOfDayIst(lab.due),
    // Each handbook task, word for word, is one requirement the teacher marks met / partly / not met.
    requirements: lab.tasks.map(reqOf),
    tests: [],
    weights: { tests: 0, reqs: 90, activity: 10 },
    published: true,
  };
}

/** Adds every pack lab the class does not have yet (matched by pack_ref). Returns how many were added. */
export function addPack(db: any, cls: any, packId: string, by: string): number {
  const pack = PACKS[packId];
  if (!pack) throw new PulseError(404, 'Unknown task pack.');
  const p = pulseOf(db);
  let added = 0;
  for (const lab of pack.labs) {
    const ref = `${packId}:${lab.id}`;
    const have = p.tasks.find((t) => t.class_id === cls.id && t.pack_ref === ref);
    if (have) {
      // Re-adding the pack refreshes the handbook wording; ids R1… stay, so marks are kept.
      if (have.requirements?.length === lab.tasks.length) have.requirements = have.requirements.map((r: any, i: number) => ({ ...r, ...reqOf(lab.tasks[i]) }));
      continue;
    }
    // A teacher may already use the folder name; keep the lab but let the class pick the next free folder.
    const clash = p.tasks.some((t) => t.class_id === cls.id && String(t.folder).toLowerCase() === lab.id);
    const body = labTaskBody(lab);
    p.tasks.push({
      id: newId('task'), class_id: cls.id, created_by: by, created_at: new Date().toISOString(), pack_ref: ref,
      ...normaliseTask(clash ? { ...body, folder: undefined } : body, {}, { db, classId: cls.id }),
    });
    added++;
  }
  if (!cls.pack) cls.pack = packId;
  return added;
}
