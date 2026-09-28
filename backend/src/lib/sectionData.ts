/**
 * Validation and normalisation for a company pack's `section_data`.
 *
 * The admin save route used to assign the request body straight onto the module:
 *
 *   module.section_data = req.body || {};
 *
 * That accepted any shape at all â€” unknown keys, non-string values where the reader
 * expects a string, a body that was an array or a bare string, and content of any
 * size. Those get persisted and only fail much later, when a student opens the
 * pack. This module is the single place that decides what a valid pack is, so the
 * route stays small and the rules are testable.
 *
 * The policy is deliberately lenient about *missing* data (an admin saving a
 * half-finished pack is normal) and strict about *mistyped or oversized* data.
 * Anything dropped or clamped is reported back in `warnings` rather than silently
 * discarded, so the admin can see what did not make it.
 */

import {
  normaliseRichText, RICH_TEXT_MAX, looksLikeHtml, RICH_TEXT_PATHS, resolveRichTextValues,
} from './richText';

/** Long-form markdown fields. Generous, but finite. */
const TEXT_LIMITS = {
  overview: 20000,
  reviewText: 5000,
  label: 500,
  summary: 1000,
  code: 40000,
  answer: 40000,
  topicContent: 60000,
} as const;

const MAX_ITEMS = 500;
const MAX_SUBJECTS = 100;
const MAX_TOPICS_PER_SUBJECT = 200;
const MAX_PYQS_PER_TOPIC = 100;
const MAX_POINTS = 100;
const MAX_TIPS = 50;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Coerces a value to a bounded, single-line-safe-ish string.
 * Returns '' for anything that is not a string/number/boolean, so a stray object or
 * array never reaches the reader as `[object Object]`.
 */
const asText = (value: unknown, limit: number): string => {
  if (typeof value === 'string') {
    return value
      // CRLF and lone CR would otherwise show up as odd glyphs in the browser.
      .replace(/\r\n?/g, '\n')
      // Strip C0 control characters except tab and newline.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .slice(0, limit);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).slice(0, limit);
  }
  return '';
};

/**
 * A markdown field: same coercion and control-character stripping as `asText`,
 * then HTML is converted to markdown.
 *
 * The reader renders these through the markdown pipeline with `rehype-raw`
 * deliberately disabled, so raw HTML is escaped and shown to the student as
 * literal `<br>` and `<p>` tags. Normalising on the way in means a paste that
 * reached the server from anywhere — not just the editor, which normalises
 * client-side — is stored as markdown instead of tag soup. The preformatted
 * fields deliberately do not come through here.
 */
const asRichText = (value: unknown, limit: number = RICH_TEXT_MAX): string =>
  normaliseRichText(stripControlChars(asText(value, limit)), limit);

/** Strips C0 control characters except tab and newline. */
const stripControlChars = (input: string): string =>
  input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

/** Clamps a numeric rating, keeping it inside 1..5. */
const asRating = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n * 10) / 10));
};

const asStringList = (value: unknown, maxItems: number, limit: number): string[] =>
  asArray(value)
    .slice(0, maxItems)
    .map((item) => asText(item, limit))
    // Whitespace-only entries are dropped, but real points keep their spacing.
    .filter((s) => s.trim().length > 0);

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export interface ValidationResult {
  data: Record<string, unknown>;
  warnings: string[];
}

/**
 * Normalises a `section_data` payload. Unknown top-level keys are dropped and
 * unknown per-item keys are never copied through, so the stored shape always
 * matches what the reader and the editor expect.
 */
export const validateSectionData = (input: unknown): ValidationResult => {
  const warnings: string[] = [];
  const body = asObject(input);

  const unknownKeys = Object.keys(body).filter(
    (k) => ![
      'overview',
      'core_subjects',
      'interview_questions',
      'cheatsheets',
      'never_skip_topics',
      'last_minute_revision',
      'hr_round',
    ].includes(k)
  );
  if (unknownKeys.length) {
    warnings.push(`Ignored unknown section(s): ${unknownKeys.join(', ')}`);
  }

  // --- overview -------------------------------------------------------------
  const ov = asObject(body.overview);
  const reviews = asArray(ov.reviews).slice(0, MAX_ITEMS).map((r) => {
    const review = asObject(r);
    return {
      name: asText(review.name, TEXT_LIMITS.label),
      role: asText(review.role, TEXT_LIMITS.label),
      rating: asRating(review.rating),
      text: asRichText(review.text, TEXT_LIMITS.reviewText),
    };
  });

  // --- core_subjects --------------------------------------------------------
  const subjects = asArray(body.core_subjects).slice(0, MAX_SUBJECTS).map((s) => {
    const subject = asObject(s);
    const topics = asArray(subject.topics).slice(0, MAX_TOPICS_PER_SUBJECT).map((t) => {
      const topic = asObject(t);
      const pyqs = asArray(topic.pyqs).slice(0, MAX_PYQS_PER_TOPIC).map((p) => {
        const pyq = asObject(p);
        return {
          year: Number.isFinite(Number(pyq.year)) ? Number(pyq.year) : 0,
          question: asRichText(pyq.question, TEXT_LIMITS.overview),
          answer: asRichText(pyq.answer, TEXT_LIMITS.answer),
          frequency: oneOf(pyq.frequency, ['High', 'Medium', 'Low'] as const, 'Medium'),
        };
      });
      return {
        title: asText(topic.title, TEXT_LIMITS.label),
        content: asRichText(topic.content, TEXT_LIMITS.topicContent),
        pyqs,
      };
    });
    return {
      subject: asText(subject.subject, TEXT_LIMITS.label),
      topics,
    };
  });

  // --- interview_questions --------------------------------------------------
  const questions = asArray(body.interview_questions).slice(0, MAX_ITEMS).map((q) => {
    const item = asObject(q);
    return {
      category: oneOf(
        item.category,
        ['Technical', 'Coding', 'System Design', 'Pseudocode'] as const,
        'Technical'
      ),
      title: asText(item.title, TEXT_LIMITS.label),
      question: asRichText(item.question, TEXT_LIMITS.overview),
      solution: asRichText(item.solution, TEXT_LIMITS.answer),
      code: asText(item.code, TEXT_LIMITS.code),
      language: asText(item.language, TEXT_LIMITS.label),
    };
  });

  // --- cheatsheets ----------------------------------------------------------
  const cheatsheets = asArray(body.cheatsheets).slice(0, MAX_ITEMS).map((c) => {
    const sheet = asObject(c);
    return {
      title: asText(sheet.title, TEXT_LIMITS.label),
      summary: asRichText(sheet.summary, TEXT_LIMITS.summary),
      // Kept verbatim apart from control characters: this field is preformatted
      // text whose alignment matters, so it is not trimmed or reflowed.
      content: asText(sheet.content, TEXT_LIMITS.topicContent),
    };
  });

  // --- never_skip_topics ----------------------------------------------------
  const neverSkip = asArray(body.never_skip_topics).slice(0, MAX_ITEMS).map((t) => {
    const topic = asObject(t);
    return {
      topic: asText(topic.topic, TEXT_LIMITS.label),
      priority: oneOf(topic.priority, ['High', 'Must Do', 'Frequent'] as const, 'High'),
      notes: asRichText(topic.notes, TEXT_LIMITS.overview),
    };
  });

  // --- last_minute_revision -------------------------------------------------
  const revision = asArray(body.last_minute_revision).slice(0, MAX_ITEMS).map((p) => {
    const point = asObject(p);
    return {
      title: asText(point.title, TEXT_LIMITS.label),
      points: asStringList(point.points, MAX_POINTS, TEXT_LIMITS.summary),
    };
  });

  // --- hr_round -------------------------------------------------------------
  const hr = asArray(body.hr_round).slice(0, MAX_ITEMS).map((h) => {
    const item = asObject(h);
    return {
      question: asRichText(item.question, TEXT_LIMITS.overview),
      answer: asRichText(item.answer, TEXT_LIMITS.answer),
      tips: asStringList(item.tips, MAX_TIPS, TEXT_LIMITS.summary),
    };
  });

  if (!body.overview) warnings.push('No overview supplied; it will be left empty.');
  if (!Array.isArray(body.core_subjects)) warnings.push('core_subjects was not a list; it has been emptied.');

  // If any rich field arrived as HTML, say so. Otherwise an admin who pastes from
  // a word processor gets silently reformatted content back and has no way to
  // tell that is what happened.
  const htmlFields = RICH_TEXT_PATHS.filter((path) =>
    resolveRichTextValues(body, path).some((v) => typeof v === 'string' && looksLikeHtml(v)),
  );
  if (htmlFields.length) {
    warnings.push(
      `Converted pasted web/word formatting to markdown in: ${htmlFields.join(', ')}`
    );
  }

  return {
    data: {
      overview: {
        companyInfo: asRichText(ov.companyInfo, TEXT_LIMITS.overview),
        eligibility: asRichText(ov.eligibility, TEXT_LIMITS.overview),
        salaryBreakdown: asRichText(ov.salaryBreakdown, TEXT_LIMITS.overview),
        reviews,
      },
      core_subjects: subjects,
      interview_questions: questions,
      cheatsheets,
      never_skip_topics: neverSkip,
      last_minute_revision: revision,
      hr_round: hr,
    },
    warnings,
  };
};
