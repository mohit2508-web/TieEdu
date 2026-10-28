// ============================================================================
// English confidence coach (lib/englishCoach). The pattern coach's checks and
// their false-positive guards, the gentle-tone rules (no score, positives
// first, at most three tips, English + Hinglish on every tip), validation,
// privacy, progress against one's own past, and the AI gate. No test calls
// the network; the Claude coach runs against a stub client.
// ============================================================================

import {
  aiUsedToday, attemptsOf, ATTEMPTS_KEPT, checkAttempt, claudeCoach, coachAttempt, CoachError, deleteAttempt, MAX_TIPS,
  myAttempts, patternFeedback, progress, PROMPTS, recordAttempt, SLIPS, type Coach, type CoachFeedback,
} from '../src/lib/englishCoach';
import { aiStatusFor, applyAiSettings } from '../src/lib/ai';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function rejects(name: string, fn: () => unknown) {
  try { fn(); fail++; console.log(`FAIL ${name}: accepted`); } catch (e) { check(name, e instanceof CoachError, true); }
}

const intro = PROMPTS.find((p) => p.id === 'i-intro')!;
const tipIds = (f: CoachFeedback) => f.tips.map((t) => t.id);
const tipFor = (text: string, id: string) => patternFeedback(intro, text, null).tips.find((t) => t.id === id);
const PAD = ' I enjoy building small web apps with my friends and I want to grow as a software engineer in a good team.';

// --- bank ---------------------------------------------------------------------------
{
  check('prompt ids unique', new Set(PROMPTS.map((p) => p.id)).size, PROMPTS.length);
  check('every prompt has an English and a Hinglish hint', PROMPTS.every((p) => p.hint && p.hint_hi), true);
  check('every slip explains itself in both', SLIPS.every((s) => s.en && s.hi), true);
}

// --- slips: caught, with the student's own words and a fix ------------------------------
{
  const t = tipFor('Good morning sir, myself Rahul Sharma from Kanpur.' + PAD, 'myself');
  check('"myself Rahul" caught', [t?.said, t?.try], ['myself Rahul', 'my name is Rahul']);
  check('"I did it myself" is not an introduction', tipFor('I built the whole project myself and it worked well for us.' + PAD, 'myself'), undefined);
  check('"I am having" → "I have"', tipFor('I am having two years of coding experience.' + PAD, 'having-exp')?.try, 'I have');
  check('"I am knowing" → "I know"', tipFor('I am knowing Java and Python quite well.' + PAD, 'knowing')?.try, 'I know');
  check('"passed out" → graduated', tipFor('I passed out in 2024 from GLA University.' + PAD, 'passed-out')?.try, 'graduated');
  check('"since two years" → "for two years"', tipFor('I am learning Java since two years now.' + PAD, 'since-years')?.try, 'for two years');
  check('"since last year" is correct English', tipFor('I have been learning Java since last year at college.' + PAD, 'since-years'), undefined);
  check('"since 2023" is correct English', tipFor('I have been learning Java since 2023 at college.' + PAD, 'since-years'), undefined);
  check('"didn’t went" → "didn’t go"', tipFor('I didn’t went to the class that day.' + PAD, 'did-past')?.try, 'didn’t go');
  check('"one of my friend" → plural', tipFor('One of my friend told me about this company.' + PAD, 'one-of-my')?.try, 'One of my friends');
  check('"one of my friends" is fine', tipFor('One of my friends told me about this company.' + PAD, 'one-of-my'), undefined);
  check('"discuss about" → "discuss"', tipFor('We can discuss about my project now.' + PAD, 'discuss-about')?.try, 'discuss');
  check('"today morning" → "this morning"', tipFor('Today morning I revised DBMS.' + PAD, 'today-morning')?.try, 'This morning');
}

// --- fillers, pace, hedges, length --------------------------------------------------------
{
  const f = patternFeedback(intro, 'Um so basically I am a student, um, and basically I like coding, uh, actually a lot.' + PAD, null);
  check('fillers counted', f.filler_total >= 5, true);
  check('filler tip first', f.tips[0].id, 'fillers');
  const fast = patternFeedback(intro, 'word '.repeat(120), 30);
  check('fast speech: about 240 wpm', fast.wpm, 240);
  check('fast speech gets the slow-down tip first', fast.tips[0].id, 'pace-fast');
  const typed = patternFeedback(intro, 'word '.repeat(120), null);
  check('typed text has no pace', [typed.wpm, tipIds(typed).includes('pace-fast')], [null, false]);
  check('hedge caught', tipIds(patternFeedback(intro, 'Sorry, I am not sure but I think I am good at coding.' + PAD, null)).includes('hedge'), true);
  const unpunctuated = 'my name is priya i am from lucknow i study computer science at aktu and i like making apps and i also like reading books in my free time and i want to join a good company';
  check('a spoken transcript (no full stops) is not called one long sentence', tipIds(patternFeedback(intro, unpunctuated, 40)).includes('long-sentence'), false);
  check('short answer is asked for more', tipIds(patternFeedback(intro, 'I am Priya from Lucknow.', null)).includes('say-more'), true);
}

// --- tone ---------------------------------------------------------------------------------
{
  const messy = 'Um myself Rahul, basically I am having experience, um, since two years, basically, I passed out in 2024, sorry, I didn’t went, uh, actually.';
  const f = patternFeedback(intro, messy, 20);
  check('at most three tips, however many slips', f.tips.length <= MAX_TIPS, true);
  check('always at least one positive', f.positives.length >= 1, true);
  check('no score in the feedback', 'score' in f, false);
  check('every tip has English and Hinglish', f.tips.every((t) => t.en && t.hi), true);
  const clean = patternFeedback(intro, 'I am Priya, a final-year computer science student from Lucknow. I enjoy building web apps because I like solving real problems for people. For example, I made an attendance app for my class. I want to join a team where I can keep learning.', 30);
  check('clean answer is praised for it', clean.positives.some((p) => /filler|clean|example|pace/i.test(p.en)), true);
}

// --- validation and storage ------------------------------------------------------------------
{
  rejects('unknown prompt', () => checkAttempt({ prompt_id: 'nope', text: 'one two three four five six' }));
  rejects('too short', () => checkAttempt({ prompt_id: 'i-intro', text: 'Hi I am' }));
  check('typed attempts drop timing', checkAttempt({ prompt_id: 'i-intro', text: 'one two three four five six', mode: 'typed', seconds: 30 }).seconds, null);
  check('implausible timing dropped', checkAttempt({ prompt_id: 'i-intro', text: 'one two three four five six', mode: 'voice', seconds: 9999 }).seconds, null);
  check('voice timing kept', checkAttempt({ prompt_id: 'i-intro', text: 'one two three four five six', mode: 'voice', seconds: 31.6 }).seconds, 32);

  const db: any = {};
  const input = checkAttempt({ prompt_id: 'i-intro', text: 'Um basically I am a student who likes coding a lot.', mode: 'typed' });
  for (let i = 0; i < ATTEMPTS_KEPT + 4; i++) recordAttempt(db, 'u1', input, patternFeedback(input.prompt, input.text, null), new Date(Date.UTC(2026, 9, 1, 0, i)));
  recordAttempt(db, 'u2', input, patternFeedback(input.prompt, input.text, null));
  check('attempts capped per student', myAttempts(db, 'u1').length, ATTEMPTS_KEPT);
  check('other student unaffected', myAttempts(db, 'u2').length, 1);
  const theirs = myAttempts(db, 'u2')[0].id;
  check('cannot delete another student’s', deleteAttempt(db, 'u1', theirs), false);
  check('own delete works', deleteAttempt(db, 'u2', theirs), true);

  // Progress is filler words per 100 words, own first three vs own last three.
  const p: any = {};
  const say = (t: string, day: number) => { const a = checkAttempt({ prompt_id: 'w-food', text: t }); recordAttempt(p, 'u1', a, patternFeedback(a.prompt, a.text, null), new Date(Date.UTC(2026, 9, day, 6))); };
  for (let d = 1; d <= 3; d++) say('Um basically I like biryani, um, basically because it is, uh, tasty.', d);
  check('no trend before six attempts', progress(p, 'u1').fillers_per_100_words, null);
  for (let d = 4; d <= 6; d++) say('I like biryani because my mother makes it every Sunday for the family.', d);
  const pr = progress(p, 'u1');
  check('fillers fell', pr.fillers_per_100_words!.now < pr.fillers_per_100_words!.before, true);
  check('practice days counted', pr.days, 6);
}

// --- AI gate and the Claude coach ---------------------------------------------------------------
(async () => {
  check('AI off by default', aiStatusFor({}, 'english_coach', { ANTHROPIC_API_KEY: 'k' }).enabled, false);
  check('features gated separately', aiStatusFor({ settings: { ai_mock_interview_enabled: true } }, 'english_coach', { ANTHROPIC_API_KEY: 'k' }).enabled, false);
  check('on with its own setting and a key', aiStatusFor({ settings: { ai_english_coach_enabled: true } }, 'english_coach', { ANTHROPIC_API_KEY: 'k' }).enabled, true);
  const next: any = {};
  applyAiSettings(next, { ai_english_coach_enabled: true, ai_english_coach_daily_limit: 500 }, 'english_coach');
  check('admin settings: flag saved, out-of-range limit ignored', next, { ai_english_coach_enabled: true });

  const text = 'Um myself Rahul, I am having two years of coding practice in Java and Python.';
  const aiOut = { positives: [{ en: 'Clear start.', hi: 'Achha start tha.' }], tips: [{ id: 'ai-0', title: 'Intro', en: 'Say "My name is".', hi: '"My name is" bolo.', said: 'myself Rahul', try: 'My name is Rahul' }], better_version: 'My name is Rahul.' };
  let calls = 0;
  const coach: Coach = async () => { calls++; return aiOut; };
  const on = { enabled: true, daily_limit: 1 };
  const off = await coachAttempt(intro, text, 20, { ai: { enabled: false, daily_limit: 1 }, usedToday: 0, coach });
  check('off → pattern coach, Claude not called', [off.source, calls], ['pattern', 0]);
  const viaAi = await coachAttempt(intro, text, 20, { ai: on, usedToday: 0, coach });
  check('on → AI tips and polished version', [viaAi.source, viaAi.better_version], ['ai', 'My name is Rahul.']);
  check('pace and fillers still measured by the pattern coach', [viaAi.wpm, viaAi.filler_total], [off.wpm, off.filler_total]);
  const capped = await coachAttempt(intro, text, 20, { ai: on, usedToday: 1, coach });
  check('over the daily limit → pattern with a note', [capped.source, !!capped.note], ['pattern', true]);
  const err = console.error; console.error = () => {};
  const broken = await coachAttempt(intro, text, 20, { ai: on, usedToday: 0, coach: async () => { throw new Error('down'); } });
  const empty = await coachAttempt(intro, text, 20, { ai: on, usedToday: 0, coach: async () => ({ positives: [], tips: [], better_version: null }) });
  console.error = err;
  check('AI failure → pattern with a note', [broken.source, !!broken.note], ['pattern', true]);
  check('empty AI reply → pattern', empty.source, 'pattern');

  let sent: any = null;
  const stub = (reply: any) => ({ beta: { messages: { create: async (b: any) => { sent = b; return reply; } } } }) as any;
  const raw = { positives: [{ en: 'a', hi: 'b' }, { en: 'c', hi: 'd' }, { en: 'e', hi: 'f' }, { en: 'g', hi: 'h' }], tips: [1, 2, 3, 4].map((i) => ({ title: `t${i}`, en: 'x', hi: 'y', said: '', try: '' })), better_version: 'Better.' };
  const got = await claudeCoach(stub({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(raw) }] }))(intro, text);
  check('AI positives and tips capped', [got.positives.length, got.tips.length], [3, MAX_TIPS]);
  check('empty said/try become null', [got.tips[0].said, got.tips[0].try], [null, null]);
  check('model and structured output', [sent.model, sent.output_config.format.type], ['claude-opus-5-5', 'json_schema']);
  check('spoken text fenced as data', /<spoken>\n[\s\S]*\n<\/spoken>/.test(sent.messages[0].content), true);
  let refused = false;
  try { await claudeCoach(stub({ stop_reason: 'refusal', content: [] }))(intro, text); } catch { refused = true; }
  check('refusal throws so the pattern coach takes over', refused, true);

  const db: any = {};
  const a = checkAttempt({ prompt_id: 'i-intro', text, mode: 'voice', seconds: 20 });
  const now = new Date('2026-10-28T09:00:00Z');
  recordAttempt(db, 'u1', a, viaAi, now);
  recordAttempt(db, 'u1', a, off, now);
  recordAttempt(db, 'u1', a, viaAi, new Date('2026-10-26T09:00:00Z'));
  check('AI used today counts only today’s AI attempts', aiUsedToday(db, 'u1', now), 1);
  check('stored under english_attempts', attemptsOf(db).length, 3);

  console.log(`english-coach: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
