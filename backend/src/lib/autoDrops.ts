/**
 * Auto-drops — a platform event becomes a row in the feed queue.
 *
 * The hooks at the four call sites (course publish, new lesson in a live
 * course, new material in a company vault, interview report approved) are one
 * line each; everything that must not go wrong lives here:
 *
 * - Dedupe: `source { kind: 'auto', event, entity_id }` + `hasAutoDrop`, so a
 *   re-publish or a retried handler never stacks a second copy of the same
 *   news, while an admin who deletes the row gets a fresh one next time.
 * - The same editorial rules as the admin form: one `validateDropInput`, so an
 *   auto-drop can never smuggle a 400-character headline or an `javascript:`
 *   CTA into the feed that a human would have been stopped for.
 * - The same caps as the admin form: a requested `published` status that would
 *   breach the 30-live or 10-a-day budget is *degraded to a draft* instead of
 *   thrown. The event that triggered this (a course publish, say) has already
 *   succeeded — an editorial budget refusal must not fail the request that
 *   caused it, and a draft waiting in the Drops tab is the honest outcome:
 *   "there is more news today than the feed should spend".
 *
 * Default status is `draft` — both this repo's comments already describe the
 * artifact as "an auto-created draft" (db.ts Drop note, hasAutoDrop). The push
 * notification for the same event goes out immediately; a feed card is durable,
 * enumerable, and capped, so it waits for a human unless a caller explicitly
 * asks for `status: 'published'`.
 *
 * This module may throw only if the document store itself fails; every
 * business refusal comes back as a `{ created: false, reason }` result, and
 * hooks are expected to ignore the result entirely.
 */
import { Drop, loadDb, saveDb } from '../data/db';
import { appendAudit } from '../store/audit';
import { checkDropCaps, hasAutoDrop, validateDropInput } from './drops';

export interface AutoDropSpec {
  /** Stable event name, e.g. `course.published`. */
  event: string;
  /**
   * What made this event unique. Repeated triggers with the same key are
   * deduped; see the call sites for how each derives its key.
   */
  entityId: string;
  type: Drop['type'];
  headline: string;
  bullets: string[];
  ctaRoute?: string;
  ctaUrl?: string;
  targetSlug?: string;
  bodyMd?: string;
  deadlineAt?: string;
  tags?: string[];
  /** The admin whose action caused this, for the audit trail. */
  actorId?: string;
  /** Defaults to `draft` — see the module note. */
  status?: 'draft' | 'published';
}

export type AutoDropResult =
  | { created: true; id: string; status: Drop['status'] }
  | { created: false; reason: 'duplicate' | 'invalid' | 'error'; detail?: string };

const newId = () => `drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyStats = () => ({ views: 0, unique_viewers: 0, cta_clicks: 0, shares: 0, saves: 0, dwell_ms_total: 0 });

export const createAutoDrop = (spec: AutoDropSpec): AutoDropResult => {
  try {
    const db = loadDb();
    const list: Drop[] = Array.isArray(db.drops) ? db.drops : [];

    if (hasAutoDrop(list, spec.event, spec.entityId)) {
      return { created: false, reason: 'duplicate' };
    }

    const validation = validateDropInput({
      type: spec.type,
      headline: spec.headline,
      bullets: spec.bullets,
      cta_route: spec.ctaRoute,
      cta_url: spec.ctaUrl,
      target_slug: spec.targetSlug,
      body_md: spec.bodyMd,
      deadline_at: spec.deadlineAt,
      tags: spec.tags,
      status: spec.status === 'published' ? 'published' : 'draft',
    });
    if (!validation.ok) return { created: false, reason: 'invalid', detail: validation.error };

    const now = new Date().toISOString();
    const drop: Drop = {
      id: newId(),
      ...(validation.value as Omit<Drop, 'id' | 'stats' | 'created_at' | 'updated_at' | 'source' | 'author_id'>),
      stats: emptyStats(),
      author_id: spec.actorId || 'system',
      source: { kind: 'auto', event: spec.event, entity_id: spec.entityId },
      created_at: now,
      updated_at: now,
    };

    // Cap refusal becomes a draft, never an error (module note).
    if (drop.status === 'published' && checkDropCaps(list, drop)) {
      drop.status = 'draft';
    }

    db.drops = [...list, drop];
    // The in-memory audit append is synchronous; the relational mirror runs
    // async and never rejects, so saveDb below already holds the entry.
    void appendAudit(db, {
      actor: spec.actorId || 'system',
      action: 'drops.auto',
      target: drop.id,
      detail: `${drop.type}: ${drop.headline.slice(0, 60)}`,
    }).catch(() => {});
    saveDb(db);

    return { created: true, id: drop.id, status: drop.status };
  } catch (e: any) {
    // A hook must never take down the request it was attached to.
    return { created: false, reason: 'error', detail: e?.message };
  }
};
