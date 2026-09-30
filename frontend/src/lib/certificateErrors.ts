/**
 * Which certificate errors a learner is allowed to read.
 *
 * A 503 from the certificate service is an *operator* problem: a signing key that
 * was never generated, an env var that is unset. The server answers it with a note
 * written for whoever is deploying - it names `CERT_SIGNING_PRIVATE_KEY`, the
 * encoding it expects, and which half to keep. That is genuinely useful in a log
 * and genuinely wrong on a course page. It was reaching the learner verbatim: a
 * paragraph of setup instructions directly beneath a button they had just pressed,
 * on the one screen reached by finishing every lesson in the course.
 *
 * The backend already guards the wire format - `backend/src/scripts/
 * certificate-http.test.ts` asserts that body names no environment variable. That
 * test was green while the page still rendered the text, because the leak happened
 * in the frontend on the way to the screen. This module is the other half of that
 * guard, and `scripts/certificate-error.test.ts` holds it shut.
 *
 * Two rules, and the second is the one that is easy to get wrong:
 *
 *  1. Operator detail never reaches the learner. It is preserved for the console.
 *  2. Learner detail always does. "You have already been issued a certificate" and
 *     "this course does not award one" are written *for* the learner and are the
 *     entire point of the message. Replacing those with "temporarily unavailable"
 *     would send someone to retry something that can never succeed - a lie told to
 *     look considerate. So the sanitiser is deliberately narrow: it triggers on
 *     server faults and on deployment vocabulary, and leaves 4xx alone.
 *
 * The function takes the status and body rather than a `Response` so it stays free
 * of DOM types, which is what lets the unit suite import the real module instead of
 * a copy of the logic.
 */

/** Words that belong in a deploy log and not on a course page. */
const OPERATOR_VOCABULARY = [
  'cert_signing',
  'private_key',
  'public_key',
  'base64',
  'pkcs#8',
  'pkcs8',
  'ed25519',
  'keypair',
  'key pair',
  'process.env',
  'not configured',
];

/** Server-side faults. These are ours, transient, and not the learner's doing. */
const FAULT_STATUSES = [500, 502, 503, 504];

/**
 * True when a message is a deployment note rather than an explanation for the
 * learner. Exported for the test's negative cases.
 */
export const isOperatorDetail = (message: string): boolean => {
  const haystack = message.toLowerCase();
  return OPERATOR_VOCABULARY.some((word) => haystack.includes(word));
};

/**
 * Turn a failed certificate response into an error safe to put on screen.
 *
 * @param status HTTP status of the failed response.
 * @param serverMessage The server's own `error` string, or '' if it sent none or
 *   sent something that was not JSON.
 * @param action What was being attempted, for the fallback wording. Pass a phrase
 *   that reads correctly in "Could not ${action} the certificate" — 'Issue',
 *   'Download'.
 * @param onOperatorDetail Optional sink for the deployment note. Production
 *   passes a console.error; the test passes a collector. When omitted the detail
 *   is dropped, which is the safe default for a server-rendered path that should
 *   not write to a browser console.
 */
export const certificateError = (
  status: number,
  serverMessage: string,
  action: string,
  onOperatorDetail?: (detail: string) => void
): Error => {
  if (FAULT_STATUSES.includes(status) || isOperatorDetail(serverMessage)) {
    if (serverMessage) onOperatorDetail?.(serverMessage);

    // A fault is not the learner's fault and retrying will not fix it, so the copy
    // does not tell them to try again. It does have to answer the question they
    // actually have, which is whether the lessons they finished still count.
    return new Error(
      'Certificates are temporarily unavailable, so this one has not been issued yet. ' +
        'Your course completion is safe and nothing has been lost — try again shortly, ' +
        'and if it keeps happening, contact us and we will issue it by hand.'
    );
  }

  // Not a fault and not deployment vocabulary, so the server wrote this for the
  // learner. Pass it through untouched.
  return new Error(serverMessage || `Could not ${action.toLowerCase()} the certificate`);
};
