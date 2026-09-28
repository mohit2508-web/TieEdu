import { CODE_LANGS, prismName, resolveLang } from '../src/lib/codeLang';
import { formatDay, formatDate, formatDateLong } from '../src/lib/date';

let pass = 0;
let fail = 0;

function eq(name: string, actual: unknown, expected: unknown) {
  if (Object.is(actual, expected)) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// --- code language resolution -------------------------------------------------
// The renderer seeds its language switcher from the authored payload. It used to
// hardcode 'cpp', so a Python solution was highlighted as C++ on arrival and the
// reader had to notice and click the switcher themselves.
eq('an authored python solution is python', resolveLang('python'), 'python');
eq('an authored java solution is java', resolveLang('java'), 'java');
eq('an authored cpp solution is cpp', resolveLang('cpp'), 'cpp');
eq('an authored ts solution is ts', resolveLang('ts'), 'ts');

// Payloads are hand-authored and predate any validation, so be forgiving about
// capitalisation, padding and the long-form names people actually type.
eq('capitalisation is ignored', resolveLang('Python'), 'python');
eq('surrounding whitespace is ignored', resolveLang('  java  '), 'java');
eq('the full TypeScript name maps to ts', resolveLang('typescript'), 'ts');
eq('javascript maps to ts', resolveLang('javascript'), 'ts');
eq('js maps to ts', resolveLang('js'), 'ts');
eq('py maps to python', resolveLang('py'), 'python');
eq('python3 maps to python', resolveLang('python3'), 'python');
eq('c++ maps to cpp', resolveLang('c++'), 'cpp');
eq('cc maps to cpp', resolveLang('cc'), 'cpp');
eq('c maps to cpp', resolveLang('c'), 'cpp');
eq('jvm maps to java', resolveLang('jvm'), 'java');
eq('kotlin maps to java', resolveLang('kotlin'), 'java');

// Anything unrecognisable must still resolve to a real language, or the highlighter
// receives undefined and the whole block renders unstyled.
eq('a missing language falls back', resolveLang(undefined), 'cpp');
eq('a null language falls back', resolveLang(null), 'cpp');
eq('an empty language falls back', resolveLang(''), 'cpp');
eq('a whitespace language falls back', resolveLang('   '), 'cpp');
eq('a nonsense language falls back', resolveLang('brainfuck'), 'cpp');
eq('a non-string falls back', resolveLang(42), 'cpp');
eq('every resolved language is switchable', CODE_LANGS.every((l) => CODE_LANGS.includes(resolveLang(l))), true);
eq('resolution never invents a language outside the switcher', CODE_LANGS.every((l) => {
  try {
    return CODE_LANGS.includes(resolveLang(l));
  } catch {
    return false;
  }
}), true);

// The highlighter is registered under Prism's own names, and `ts` is not one of
// them, so the short key has to be expanded before it reaches Prism.
eq('ts expands to typescript for prism', prismName('ts'), 'typescript');
eq('cpp is passed through for prism', prismName('cpp'), 'cpp');
eq('python is passed through for prism', prismName('python'), 'python');

// --- timezone-stable dates ----------------------------------------------------
// A date-only string is a calendar date, not an instant. Parsing it with `new
// Date(...)` treats it as UTC midnight, which is the previous day anywhere with a
// negative UTC offset, so a "checked 12 Mar" badge read as 11 Mar for half the
// world. These assertions are written so that a UTC-based implementation still
// passes - they pin the *result*, and a correct implementation must agree with
// the components regardless of the host timezone.
eq('a date-only string formats as written', formatDay('2026-03-12'), '12 Mar 2026');
eq('a single-digit day is zero padded', formatDay('2026-01-05'), '05 Jan 2026');
eq('a december date formats', formatDay('2026-12-31'), '31 Dec 2026');
eq('a leap day is a real date', formatDay('2024-02-29'), '29 Feb 2024');

// Date-only strings carry no time, so a full timestamp is the ambiguous case and
// is read in UTC - the same instant everywhere.
eq('a utc instant is formatted in utc', formatDay('2026-03-12T00:00:00.000Z'), '12 Mar 2026');
eq('a later utc instant does not roll back', formatDay('2026-03-12T23:59:59.000Z'), '12 Mar 2026');

// Nonsense must render as nothing rather than "Invalid Date".
eq('a missing date is null', formatDay(null), null);
eq('an undefined date is null', formatDay(undefined), null);
eq('an empty date is null', formatDay(''), null);
eq('an unparseable date is null', formatDay('not a date'), null);
eq('an impossible calendar date is null', formatDay('2026-02-30'), null);
eq('a non-finite month is null', formatDay('2026-13-01'), null);
eq('a zero day is null', formatDay('2026-03-00'), null);
eq('a 31 february is null', formatDay('2026-02-31'), null);

// The Date-accepting overload is used where the value is already parsed.
eq('a Date is accepted', formatDate(new Date(Date.UTC(2026, 2, 12))), '12 Mar 2026');
eq('an invalid Date is null', formatDate(new Date('nope')), null);
eq('formatDate falls back to the string path', formatDate('2026-03-12'), '12 Mar 2026');
eq('a long month is spelled out', formatDateLong('2026-03-12'), '12 March 2026');
eq('a long month for a Date', formatDateLong(new Date(Date.UTC(2026, 11, 1))), '1 December 2026');
eq('a bad long date is null', formatDateLong('2026-02-31'), null);
eq('a missing long date is null', formatDateLong(null), null);

// Every month name must exist, in both spellings. A month index of 12 would read
// `MONTHS[12]` as undefined and print "12 undefined 2026".
for (let month = 1; month <= 12; month++) {
  const iso = `2026-${String(month).padStart(2, '0')}-15`;
  const short = formatDay(iso);
  const long = formatDateLong(iso);
  eq(`month ${month} short is a real name`, /^\d{2} [A-Z][a-z]{2} \d{4}$/.test(String(short)), true);
  eq(`month ${month} long is a real name`, /^\d{1,2} [A-Z][a-z]+ \d{4}$/.test(String(long)), true);
  eq(`month ${month} is not undefined`, String(short).includes('undefined'), false);
  eq(`month ${month} long is not undefined`, String(long).includes('undefined'), false);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
