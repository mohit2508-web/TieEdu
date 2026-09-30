/**
 * Certificate error copy: the operator's problem is not the learner's news.
 *
 * The bug this guards: the course page's "Claim my certificate" button surfaced
 * the server's 503 body verbatim. That body is a deployment note - it names
 * CERT_SIGNING_PRIVATE_KEY, the encoding it expects, and what else to keep - so a
 * learner who had just finished every lesson was told, in a paragraph of setup
 * instructions, how to fix our server. On top of being useless to them, it read
 * as though the certificate itself was broken and that they had to act.
 *
 * The wire format is guarded server-side by backend/src/scripts/certificate-http.test.ts,
 * which asserts the body names no environment variable. That test passed while this
 * page still rendered the text, because the leak happened in the frontend on the way
 * to the screen. This suite is the other half.
 *
 * The policy under test is `lib/certificateErrors`, imported as shipped rather than
 * reimplemented. It takes a status and a message instead of a `Response` precisely
 * so it can be checked here without a DOM.
 */

import { certificateError, isOperatorDetail } from '@/lib/certificateErrors';

let passed = 0;
let failed = 0;

const check = (name: string, condition: boolean, detail = ''): void => {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

/** The exact remediation text the server sends, including the env var name. */
const OPERATOR_DETAIL =
  'Certificate signing is not configured. Generate an Ed25519 keypair and set ' +
  'CERT_SIGNING_PRIVATE_KEY (base64 PKCS#8 DER) before issuing or verifying ' +
  'certificates in production. Keep the public half too - it is what verifiers check against.';

/**
 * Words that are fine in a server log and wrong on a course page: the variable the
 * operator has to set, and the key material itself.
 */
const LEAKS = [
  'CERT_SIGNING',
  'PRIVATE_KEY',
  'PUBLIC_KEY',
  'base64',
  'pkcs#8',
  'ed25519',
  'keypair',
  'process.env',
];

/** Build the error, collecting anything the policy offers to hand to an operator. */
const build = (status: number, serverMessage: string, action = 'Issue') => {
  const forOperator: string[] = [];
  const error = certificateError(status, serverMessage, action, (d) => forOperator.push(d));
  return { error, message: error.message, forOperator };
};

// --- the actual bug: a 503 carrying the deployment note ------------------

{
  const { message, forOperator } = build(503, OPERATOR_DETAIL);

  const leaks = LEAKS.filter((w) => message.toLowerCase().includes(w.toLowerCase()));
  check(
    '503: the learner sees no env var, key format, or key material',
    leaks.length === 0,
    `leaked: ${leaks.join(', ')}`
  );
  check(
    '503: the message says the certificate has not been issued, rather than implying the learner lost it',
    /has not been issued/i.test(message),
    message
  );
  check(
    '503: the message reassures that completion is intact',
    /completion is safe|nothing has been lost/i.test(message),
    message
  );
  check(
    '503: the message offers a way forward',
    /try again|contact us/i.test(message),
    message
  );
  check(
    '503: the message is short enough to read — a paragraph of setup is what broke this',
    message.length < 260,
    `${message.length} chars`
  );

  // The operator still needs the cause. Dropping it would move the problem rather
  // than fix it: a 503 that no longer names anything is harder to diagnose.
  check(
    '503: the deployment detail is still handed to the operator sink',
    forOperator.length === 1 && forOperator[0] === OPERATOR_DETAIL
  );
}

// --- the same note arriving without a 503 --------------------------------
//
// The leak was not only about the status code. A 400 carrying deployment
// vocabulary would have rendered just the same, so the vocabulary check has to
// stand on its own.

{
  const { message } = build(400, OPERATOR_DETAIL);
  check(
    '400 + deployment note: still sanitised, because the note is the problem',
    LEAKS.every((w) => !message.toLowerCase().includes(w.toLowerCase())),
    message
  );
}

// --- isOperatorDetail, which is the trigger ------------------------------

check('vocabulary: the real server note is recognised', isOperatorDetail(OPERATOR_DETAIL));
check('vocabulary: a bare env var name is recognised', isOperatorDetail('set CERT_SIGNING_PRIVATE_KEY first'));
check('vocabulary: a generic fault with no detail is not mistaken for one', !isOperatorDetail('Internal Server Error'));
check('vocabulary: an empty message is not operator detail', !isOperatorDetail(''));
check('vocabulary: a learner error is not operator detail', !isOperatorDetail('This course does not award a certificate.'));

// --- the line that must not be crossed: the learner's own errors ----------
//
// This is the case that stops the sanitiser from being well-intentioned and
// useless. "You have already been issued a certificate" is written for the
// learner and is the whole point of the message; replacing it with "temporarily
// unavailable" would tell someone to retry something that can never succeed.

{
  const { message } = build(409, 'A certificate has already been issued for this course.');
  check(
    '409: an already-certified conflict keeps its own wording',
    /already been issued/i.test(message),
    message
  );
  check(
    '409: it is not mislabelled as an outage',
    !/temporarily unavailable/i.test(message),
    message
  );
}
{
  const { message } = build(403, 'This course does not award a certificate.');
  check(
    '403: a not-eligible refusal is reported accurately, not as an outage',
    message === 'This course does not award a certificate.',
    message
  );
}
{
  const { message } = build(401, 'Your session has expired. Please sign in again.');
  check(
    '401: an expired session is reported accurately',
    /session has expired/i.test(message),
    message
  );
}

// --- every other server fault behaves the same way -----------------------

for (const status of [500, 502, 504]) {
  const { message } = build(status, 'Internal Server Error');
  check(
    `${status}: reported as a temporary outage`,
    /temporarily unavailable/i.test(message),
    message
  );
}

// --- a response with no usable message -----------------------------------

{
  // `res.json()` rejects on an HTML gateway page, and the wiring falls back to ''.
  // That must still produce something a person can read.
  const { message } = build(502, '');
  check(
    '502 with no body: still produces a usable message rather than an empty one',
    message.length > 0,
    'empty message'
  );
  check('502 with no body: the outage copy is used', /temporarily unavailable/i.test(message), message);
}
{
  const { message } = build(422, '');
  check(
    '422 with no body: falls back to naming the action, not to silence',
    /could not issue the certificate/i.test(message),
    message
  );
}
{
  const { message } = build(422, '', 'Download');
  check(
    '422 with no body on the download path: names the download action',
    /could not download the certificate/i.test(message),
    message
  );
}

// --- the operator sink is optional ---------------------------------------

{
  // The wiring always passes one, but a server-rendered caller might not, and
  // that must not throw — losing the course page to a logging bug is worse than
  // losing the log line.
  const error = certificateError(503, OPERATOR_DETAIL, 'Issue');
  check(
    'omitting the operator sink does not throw',
    error instanceof Error && error.message.length > 0
  );
}

console.log(`\ncertificate-error: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
