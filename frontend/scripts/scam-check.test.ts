/**
 * Job-offer scam checker (src/lib/scamCheck). Real-shaped scam messages must
 * come out high risk with the right reason; ordinary genuine messages must not
 * be flagged as scams.
 */
import { checkOffer } from '../src/lib/scamCheck';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.error(`FAIL  ${name}\n      expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
const ids = (r: ReturnType<typeof checkOffer>) => r.signals.map((s) => s.id).sort();

// --- scams --------------------------------------------------------------------
{
  const r = checkOffer({
    text: 'Congratulations! You have been selected for TCS Digital without interview. Pay a refundable security deposit of Rs 2500 to tcshr@ybl within 24 hours to confirm your seat. Contact HR on WhatsApp.',
    senderEmail: 'tcs.hr.recruitment@gmail.com',
  });
  check('fee + UPI + free mail claiming TCS: high', r.level, 'high');
  check('every reason is named', ['chat-only', 'fee', 'free-mail', 'no-interview', 'offer-first', 'upi', 'urgency'].every((id) => ids(r).includes(id)), true);
  check('critical reasons come first', r.signals[0].critical, true);
  check('names the company it impersonates and its real domain', r.claimed, { company: 'TCS', official: ['tcs.com'] });
}
{
  const r = checkOffer({ text: 'Your Infosys offer is ready. Complete onboarding at https://infosys-careers-portal.in/join and upload your Aadhaar and bank details.' });
  check('look-alike domain is caught', ids(r).includes('lookalike'), true);
  check('look-alike + early ID documents: high', r.level, 'high');
}
check('task scam is high', checkOffer({ text: 'Part time job from home! Earn ₹3,000 per day. Just like videos on YouTube and rate hotels. Join our Telegram t.me/earnfast' }).level, 'high');
check('OTP request is critical on its own', checkOffer({ text: 'Please share the OTP you received to complete your HR verification.' }).level, 'high');
check('a shortened link is flagged', ids(checkOffer({ text: 'Apply here bit.ly/abc123 for the drive' })).includes('short-link'), true);

// --- genuine ----------------------------------------------------------------------
{
  const r = checkOffer({
    text: 'Dear candidate, thank you for attending the Accenture campus interview on 12 Oct. Your offer letter will be shared on the Accenture careers portal. Please log in at accenture.com to view it.',
    senderEmail: 'campus.india@accenture.com',
  });
  check('a genuine campus email from the official domain: low', r.level, 'low');
  check('and raises nothing', r.signals.length, 0);
}
check('a plain interview invitation is low', checkOffer({ text: 'Your technical interview with Zscaler is scheduled for Monday 10am. The link is on zscaler.com/careers.', senderEmail: 'recruiting@zscaler.com' }).level, 'low');
check('an official subdomain is not a look-alike', ids(checkOffer({ text: 'Amazon: complete the assessment at https://www.amazon.jobs/en/apply' })).includes('lookalike'), false);
check('empty input is low with no signals', checkOffer({ text: '' }), { level: 'low', score: 0, signals: [], claimed: null });

console.log(`\nscam-check: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
