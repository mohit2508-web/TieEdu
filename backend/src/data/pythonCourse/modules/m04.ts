// Module 4 — Strings.
//
// Strings are where Python stops being a toy language and starts being a
// language you can do real work in, because `str` is a full Unicode-aware text
// type with 50-odd methods, not a pointer to a char array with `strlen` bolted
// on. The cost of that richness is a set of distinctions that have bitten
// everyone at least once: code points versus bytes versus grapheme clusters,
// and `str` versus `bytes` as a hard type boundary rather than a convention.
//
// Every lesson here is anchored in something you can run in the REPL, because
// string bugs are almost never found by reading — they are found by printing
// the object, the length, and the bytes.

import { mod } from '../blocks';

export const M4 = mod(
  'crs-python-programming',
  'py-m4',
  4,
  'Module 4 — Strings',
  'Indexing, slicing, the fifty string methods, f-strings, and the str-vs-bytes wall you will hit in production.',
  [
    {
      title: 'Creating, indexing and slicing',
      summary: 'Literals, quotes and escapes, why str is immutable, and exactly what a slice costs.',
      duration: 16,
      build: (b) => [
        b.md(`## What a str actually is

A \`str\` is an **immutable sequence of Unicode code points**. Three of those words carry weight:

- **Unicode code points**, not bytes and not letters. \`"é"\` is one code point (U+00E9) and therefore \`len() == 1\`, even though it occupies two bytes in UTF-8. A family emoji is five code points and one *visible* character. \`len\` will never agree with your eyes, and that is not a bug you can fix — it is a question of which unit you asked about.
- **Sequence**, so indexing, slicing, \`in\`, \`for\`, \`len()\` and \`enumerate()\` all work.
- **Immutable**, so it can be shared freely, used as a dict key, and interned. This is why every method returns a new string and why \`s[0] = "J"\` is a \`TypeError\` rather than a silent failure.

## Literals, quotes and escapes

\`\`\`python
single = 'it is'
double = "it is"
triple = """a docstring
that spans lines
and keeps its indentation"""

# PEP 8: prefer double quotes, unless the content contains a double quote.
message = 'He said "hello"'
other = "it's fine"

# Adjacent literals concatenate at compile time — no runtime cost.
key = "content-type" "application/json"   # one constant: "content-typeapplication/json"

print("tab:\tnewline:\\nbackslash:\\\\quote:\"")     # tab:\tnewline:\nbackslash:\backslash:quote:"
print("\x41é\U0001F600")             # Aé😀 — hex, code point, full escape
print("pi: \U0001D70B")               # pi: 𝜋

raw = r"C:\Users\new\table"           # no escape processing at all
print(raw)                           # C:\Users\new\table
path = r"C:\Users\new\table"
print(len(path))                     # 18 — the backslashes are characters
\`\`\`

Three things about escapes that surprise people:

- A raw string still cannot end in an odd number of backslashes, because the closing quote would be escaped: \`r"abc\\\\"\` is a SyntaxError. Fix it by ending with an even number, or by concatenating \`"\\\\" + r"..."\`.
- Inside a raw string, a backslash still escapes a quote for the purposes of *finding* the end of the literal, even though the backslash is kept. \`r"\\""\` is two characters.
- \`"""..."""\` and \`'''...'''\` are identical. Pick one per file, and use it for docstrings. A raw triple-quoted string (\`r"""..."""\`) is the right choice for regex and for Windows paths in a block of text.

## Indexing and slicing

\`\`\`python
word = "Python"

word[0]        # 'P'   first character
word[-1]       # 'n'   last character — negative indices count from the end
word[-6]       # 'P'   the first again
word[2:5]      # 'tho' start inclusive, stop exclusive
word[:2]       # 'Py'  an omitted start means 0
word[4:]       # 'on'  an omitted stop means len(word)
word[:]        # 'Python'  — but a COPY, not the same object
word[::2]      # 'Pto'  step of 2
word[1::2]     # 'yto'
word[::-1]     # 'nohtyP'  a negative step reverses
word[10:20]    # ''    slice bounds are CLAMPED, not an error
word[20]       # IndexError: string index out of range — indexing is not clamped
\`\`\`

The asymmetry on the last two lines is the single most useful thing to know about slicing: **a slice never raises \`IndexError\`**, it just returns whatever is in range, and a single index always does. \`word[:1000]\` is a perfectly good way to take a prefix and will not blow up on a short string.

For a step, the rules are: \`range(start, stop, step)\` semantics with the default start and stop filled in as \`0\` and \`len\`, so the step counts from the start bound, not from zero. \`"abcd"[1:4:2]\` is \`"bd"\` — index 1, then index 3, because index 2 is skipped and index 4 is outside the half-open bound. Reach past the end and you simply get fewer characters, never an error: \`"abcde"[1:99:2]\` is \`"bd"\`.`),
        b.anim('trace', {
          title: 'Every slice bound, one at a time',
          badge: 'slicing',
          code: `# slices.py
word = "Python"
print(len(word))                    # 6 characters
print(word[0], word[-1])            # P n
print(word[1:4])                    # yth
print(word[:2], word[4:])           # Py on
print(word[::2])                    # Pto
print(word[::-1])                   # nohtyP
print("empty:", repr(word[10:20]))  # empty: ''`,
          steps: [
            {
              caption: 'The name word is bound to a str object',
              note: 'Six code points, stored compactly. The object has no knowledge of the name word, and it cannot be modified in place — that is what makes it safe to share and to use as a dict key.',
              line: 2,
              vars: [{ name: 'word', value: '"Python"', tone: 'char' }],
              output: '',
            },
            {
              caption: 'len(word) is 6',
              note: 'len counts code points, not bytes and not visible characters. A string of six accented letters is also 6, and a string of six family emoji is 30.',
              line: 3,
              vars: [
                { name: 'word', value: '"Python"', tone: 'char' },
                { name: 'len(word)', value: '6', tone: 'int' },
              ],
              output: '6',
            },
            {
              caption: 'Negative indices count back from the end',
              note: 'word[-1] is word[len(word) - 1], so -1 is index 5. Once Python has added len to a negative index it treats it exactly like a positive one, and raises IndexError if it is still out of range.',
              line: 4,
              vars: [
                { name: 'word[0]', value: "'P'", tone: 'ok' },
                { name: 'word[-1]', value: "'n'", tone: 'ok' },
                { name: 'offset of -1', value: 'len - 1 = 5', tone: 'int' },
              ],
              output: 'P n',
            },
            {
              caption: 'Start inclusive, stop exclusive — the half-open interval',
              note: 'word[1:4] is indices 1, 2 and 3. This is the rule that lets adjacent slices tile perfectly: word[:4] and word[4:] share no boundary character and lose nothing.',
              line: 5,
              vars: [
                { name: 'word[1:4]', value: "'yth'", tone: 'ok' },
                { name: 'bounds', value: 'start=1, stop=4', tone: 'int' },
                { name: 'indices used', value: '1, 2, 3', tone: 'int' },
              ],
              output: 'yth',
            },
            {
              caption: 'Omitted bounds mean 0 and len',
              note: 'A slice always produces a NEW string object, even word[:] which has identical contents. CPython will hand back the same object for some no-op methods, but a slice of a non-trivial length is a fresh allocation of k characters.',
              line: 6,
              vars: [
                { name: 'word[:2]', value: "'Py'", tone: 'ok' },
                { name: 'word[4:]', value: "'on'", tone: 'ok' },
                { name: 'word[:]', value: "'Python'  (a copy, not the same object)", tone: 'warn' },
              ],
              output: 'Py on',
            },
            {
              caption: 'A step of 2 keeps indices 0, 2 and 4',
              note: 'Index 6 would be the next one and it is past the end, so the slice stops. Nothing is rounded and nothing is padded — the slice is simply shorter than you might have guessed.',
              line: 7,
              vars: [
                { name: 'word[::2]', value: "'Pto'", tone: 'ok' },
                { name: 'indices used', value: '0, 2, 4', tone: 'int' },
              ],
              output: 'Pto',
            },
            {
              caption: 'A negative step reverses',
              note: 'word[::-1] starts at the last index and walks backwards with a step of -1. This is the idiomatic reversal — there is no reverse() for strings, and unlike list.reverse() this leaves the original alone.',
              line: 8,
              vars: [
                { name: 'word[::-1]', value: "'nohtyP'", tone: 'ok' },
                { name: 'equivalent', value: 'word[5:None:-1]', tone: 'text' },
              ],
              output: 'nohtyP',
            },
            {
              caption: 'Out-of-range slice bounds are clamped to empty',
              note: 'Start 10 is past the end, so the slice is empty. word[20] on the next line would be an IndexError instead. That difference is the whole reason `text[:100]` is safe and `text[100]` is not.',
              line: 9,
              vars: [
                { name: 'word[10:20]', value: "''", tone: 'warn' },
                { name: 'word[20]', value: 'IndexError', tone: 'bad' },
              ],
              output: "empty: ''",
            },
          ],
        }),
        b.lead('The cost, and the alternatives'),
        b.md(`## Slicing is a copy, and that matters in a loop

Every slice allocates a new string of length k and copies k code points. That is fine once. In a loop over a large body of text it is the difference between O(n) and O(n²):

\`\`\`python
text = "x" * 2_000_000

# O(n^2): every iteration copies the whole remaining string
out = ""
for ch in text:
    out += ch

# O(n): iterate over the original, build a new string
out = "".join(text)          # the str itself, so a for loop is the honest version
out = "".join(c for c in text)

# Fastest, and safe for huge inputs
from io import StringIO
buf = StringIO()
for i in range(100_000):
    buf.write(f"row {i}\\n")
out = buf.getvalue()
\`\`\`

The rule is the one you already know from C: **never build a string in a loop with \`+=\` or \`str\` concatenation in a hot path.** Use a list and \`join\`, or \`StringIO\`, or \`str.join\` over a generator. Small loops do not care; 200 000 iterations absolutely do.

## Iterating, joining and the things strings do not have

\`\`\`python
word = "Python"

for index, ch in enumerate(word):
    print(index, ch, ord(ch))     # 0 P 80 ... — ord() is the code point

print([c for c in word if c.isupper()])   # ['P']
print(sorted(word))                       # ['P', 'n', 'o', 't', 'h', 'y']
print(sorted(word, key=str.lower))        # ['n', 'o', 'P', 't', 'h', 'y']

# Sorting is by code point, so uppercase sorts before lowercase
print("Z" < "a")                 # True — 90 < 97
print("apple" < "banana")        # True — lexicographic, not alphabetical-by-locale

# Adjacent string literals are folded at compile time
print("total: " "42")            # total: 42
\`\`\`

There is no \`str.reverse()\`, no \`str.sort()\`, and no \`str.pop()\` — all of them would need to mutate. Use \`s[::-1]\`, \`sorted(s)\`, and slicing. That is the practical cost of immutability, and it is a cost you pay once to gain strings that can be shared across threads, cached, and used as dictionary keys without copying.

## Multi-line strings, and the indentation trap

\`\`\`python
sql = """
    SELECT id, name
    FROM users
    WHERE active = 1
"""
print(sql)
# (prints a leading newline and 4 spaces of indentation on every line)

from textwrap import dedent
print(dedent(sql))
# SELECT id, name
# FROM users
# WHERE active = 1

# Or dodge it entirely: the backslash on the first line suppresses the leading newline
print("""\\
SELECT id, name
FROM users
""")
\`\`\`

Multi-line strings are the right tool for embedded SQL, HTML, regexes and prompts, and \`dedent\` is the standard first line of any function that accepts one. Just be aware that \`dedent\` requires *every* line to share the common prefix, so a single unindented blank line or a stray tab makes it a no-op — which is exactly the kind of failure that only shows up in production formatting.`),
        b.code(`# str immutability, in practice
word = "Python"

try:
    word[0] = "J"
except TypeError as exc:
    print(exc)
# 'str' object does not support item assignment

# So every "modification" is a new object, and the old one is untouched
cleaned = word.strip().lower().replace(" ", "_")
print(word, cleaned)          # Python python  — word is unchanged

# Which is exactly why these are safe
cache = {}
for name in ["ada", "ada", "alan"]:
    cache[name] = cache.get(name, 0) + 1
print(cache)                   # {'ada': 2, 'alan': 1}

# A common real mistake: expecting a method to mutate
path = "  report.csv  "
path.strip()                   # the result is discarded — path still has spaces
path = path.strip()            # rebind, or you have done nothing
print(repr(path))              # 'report.csv'
`, 'immutable.py'),
        b.table(
          'Slicing rules, complete',
          ['Expression', 'Result for `word = "Python"`', 'Rule'],
          [
            ['`word[0]`', "'P'", 'First character. `word[6]` is an IndexError'],
            ['`word[-1]`', "'n'", 'Negative indices are added to `len(word)`, then bounds-checked'],
            ['`word[1:4]`', "'yth'", 'Half-open: start included, stop excluded'],
            ['`word[:2]`', "'Py'", 'Omitted start is 0'],
            ['`word[4:]`', "'on'", 'Omitted stop is `len(word)`'],
            ['`word[:]`', "'Python'", 'A copy, not the same object. Slicing never raises'],
            ['`word[::2]`', "'Pto'", '`range` semantics with a step; the last reachable index may be missed'],
            ['`word[::-1]`', "'nohtyP'", 'A negative step reverses. The idiomatic reversal'],
            ['`word[10:20]`', "''", 'Slice bounds are clamped; an empty result is not an error'],
            ['`word[1:4:5]`', "'y'", 'A step larger than the range yields at most one character'],
            ['`word[::2][::-1]`', "'otP'", 'Slices compose, and each one is another copy'],
          ]
        ),
        b.tip(
          's[a:b] is not s[b:a], and the fix is a slice object',
          'When you are assembling a slice from variables, compute the bounds first. `s[end - window:end]` is right; `s[end:end + window]` is the bug, because it slices past the end and returns a short string rather than raising — so you never find out. The `slice(start, stop, step)` constructor exists for exactly this and is the clearest thing to pass to a function that takes a range.'
        ),
        b.info(
          'Why len() will never match what you see',
          '`len` counts code points. A precomposed "é" is 1; the same character written as "e" plus a combining accent is 2, and the two are not `==` even though every font on your screen renders them identically. This is not a Python quirk — it is the Unicode model, and it is why text handling code has to state which unit it means. Module 4 lesson 3 covers the fix.'
        ),
      ],
      questions: [
        [
          'What does `"Python"[1:4]` return, and why?',
          [
            'The four-character string Pyth, because the stop bound is inclusive',
            'The three-character string yth, because slicing is half-open: start included, stop excluded',
            'The one-character string y, because the step defaults to something',
            'The four-character string ytho, because negative indices wrap',
          ],
          1,
          'The three-character string yth, because slicing is half-open: start included, stop excluded. `word[1:4]` takes indices 1, 2 and 3. This is what lets `word[:4]` and `word[4:]` tile a string with no overlap and no gap.',
        ],
        [
          'What does `"Python"[100:200]` do?',
          ['Raises IndexError, because 100 is out of range', 'Raises ValueError, because the stop exceeds the length', "Returns the empty string, because slice bounds are clamped", 'Returns the whole string, because the start is ignored'],
          2,
          'Slices clamp their bounds and return an empty string. Single-index access is the opposite: `word[100]` raises IndexError. That asymmetry is why `text[:100]` is a safe way to take a prefix.',
        ],
        [
          'What happens when you run `word[0] = "J"` on a str?',
          ['The first character is replaced', 'A TypeError, because str is immutable', 'A new string is silently created and discarded', 'A SyntaxError, caught at parse time'],
          1,
          'Assignment to an index is a runtime TypeError, not a syntax error, because Python cannot know the type of `word` until it runs. Immutability is what makes strings safe to share and hashable.',
        ],
        [
          'What does `r"C:\\Users\\new"` contain, and how long is it?',
          ['`C:Usersnew`, length 10 — a raw string drops backslashes', '`C:\\Users\\new`, length 12 — a raw string keeps every backslash as an ordinary character', '`C:\\Users\\new`, length 12 — the leading backslash of each pair is consumed as an escape', 'It is a SyntaxError, because a raw string cannot contain a backslash'],
          1,
          'A raw string disables escape processing, so both backslashes survive and `len(r"C:\\Users\\new")` is 12. The third option reaches the right number by the wrong reasoning: escapes are only processed in a non-raw string. This is exactly why raw strings are the default choice for Windows paths and regular expressions — and why one still cannot end a raw string with an odd number of backslashes.',
        ],
      ],
    },
    {
      title: 'String methods',
      summary: 'The fifty methods that matter, grouped by the problem they solve, and why every one of them returns a new string.',
      duration: 15,
      build: (b) => [
        b.md(`## The mental model for methods

\`str\` has around fifty methods. You do not memorise them; you group them into six families and recognise the family from the problem you are solving. Every single one of them **returns a new string** — none of them modify the receiver, because a \`str\` cannot be modified.

\`\`\`python
word = "  Hello, World  "

trimmed = word.strip()       # "Hello, World"
shouted = trimmed.upper()    # "HELLO, WORLD"
replaced = trimmed.replace("World", "Python")   # "Hello, Python"
folded = trimmed.casefold()  # "hello, world" — Unicode-aware, unlike lower()

print(word)                  # "  Hello, World  " — still exactly as it was
\`\`\`

The consequence people get wrong constantly:

\`\`\`python
path = "  report.csv  "
path.strip()                 # computes "report.csv" and throws it away
print(repr(path))            # '  report.csv  ' — nothing happened

path = path.strip()          # rebind
print(repr(path))            # 'report.csv'
\`\`\`

If you have a linter enabled, it will tell you about this. If not, the symptom is usually a test that fails with a string that is *almost* right, and no amount of staring at the assertion will help.

Two implementation notes worth having, because they explain behaviour you will otherwise find mysterious:

- **CPython often returns the receiver unchanged when nothing changed.** \`"abc".strip() is "abc"\` can be True, because \`strip\` short-circuits when the first and last characters are already stripped. \`"ABC".lower() is <that object>\` likewise. This is a pure optimisation: your code must never depend on it, but it explains why \`id()\` sometimes surprises you.
- **None of this makes a method useless.** \`len(s)\` is O(1) even for a million characters, because the length is stored in the object header. \`s[i]\` is O(1). Slicing is O(k) and always copies. \`in\` is O(n) unless there is a substring in the string, in which case CPython uses a two-way algorithm and it is fast.`),
        b.anim('step', {
          title: 'The six families of str method',
          badge: 'method families',
          steps: [
            {
              title: 'Splitting and joining',
              desc: 'The pair that turns a string into a list and back. split(sep) splits on a literal separator or on runs of whitespace if you give none; str.join(iterable) is the reverse and accepts any iterable. Always use join to build a big string, never += in a loop. partition gives you exactly three pieces and a separator, which is usually faster than a two-way split when you only want "before / at / after".',
              code_snippet: '"a,b,c".split(",")        # [\'a\', \'b\', \'c\']\n", ".join(["a", "b", "c"])  # \'a, b, c\'\n"a=b=c".partition("=")     # (\'a\', \'=\', \'b=c\')\n"a\\nb\\nc".splitlines()    # [\'a\', \'b\', \'c\']',
            },
            {
              title: 'Trimming',
              desc: 'strip() removes whitespace from both ends; lstrip and rstrip from one. Crucially they also accept a character set, not a prefix: "xxaxx".lstrip("x") is "axx", not "axx" minus the trailing x. That catches everyone, because most people assume prefix-stripping behaviour from a trim function.',
              code_snippet: '"  pad  ".strip()        # \'pad\'\n"xxaxx".lstrip("x")       # \'axx\'\n"abcabc".rstrip("c")     # \'abcab\'\n"  a  ".strip() or "d"  # \'d\'  — empty string is falsy',
            },
            {
              title: 'Finding',
              desc: 'find returns -1 when there is no match; index raises ValueError. Same information, different failure policy — pick index when absence is a bug, find when it is expected. count takes an optional start and end, so you can count occurrences in a region. startswith and endswith accept a tuple, which makes a chain of extensions a one-liner.',
              code_snippet: '"hello".find("l")        # 1\n"hello".rfind("l")       # 3\n"hello".index("z")       # ValueError\n"report.csv".endswith((".csv", ".tsv"))   # True',
            },
            {
              title: 'Replacing',
              desc: 'replace(old, new) replaces every occurrence unless you give a count. It is a literal replace — no regex, no glob, no backreferences. removeprefix and removesuffix (3.9+) do the single-prefix version without the "what if it appears twice" hazard, and they leave the string alone when the prefix is absent, which makes them ideal for optional affixes.',
              code_snippet: '"a-b-a".replace("a", "X")     # \'X-b-X\'\n"a-b-a".replace("a", "X", 1)   # \'X-b-a\'\n"v1.2.3".removeprefix("v")    # \'1.2.3\'\n"file.txt".removesuffix(".txt")  # \'file\'',
            },
            {
              title: 'Case and padding',
              desc: 'upper and lower are the obvious two. casefold is the one that matters: it is the aggressive, locale-independent, Unicode-aware fold used for caseless matching, and it does things lower() will not — "ß".casefold() is "ss". title and capitalize are for display headers, not for identity. zfill, rjust, ljust and center pad to a width, which is the only built-in way to align text in a fixed column.',
              code_snippet: '"Straße".casefold()      # \'strasse\'\n"Straße".lower()         # \'straße\'\n"007".zfill(5)            # \'00007\'\nf"{7:>5}|"                 # \'    7|\'',
            },
            {
              title: 'Testing and inspecting',
              desc: 'The is* family returns a bool and never raises: isdigit, isalpha, isalnum, isspace, isupper, islower, istitle, isascii, isidentifier, isprintable, isdecimal. Useful for validation, with two warnings: str.isdigit() is True for characters like ² that int() will reject, and isspace() is False for the empty string, so "" passes no filter. Most of these are Unicode-aware, so "²".isdigit() is True — check with a try/int() if you are about to convert.',
              code_snippet: '"abc".isalpha()    # True\n"123".isdigit()    # True\n"a1".isalnum()     # True\n"".isspace()       # False — empty is not space\n"2²".isdigit()     # True, but int("2²") raises',
            },
          ],
        }),
        b.lead('Problem to method'),
        b.table(
          'Find the method by the problem you have, not by the method name',
          ['The problem', 'The call', 'Gotcha'],
          [
            ['Turn a delimited blob into a list', '`parts = raw.split(",")`', 'Omit the separator and it splits on runs of whitespace and discards empty strings — a different operation, not a default'],
            ['Build a string from many pieces', '`sep.join(pieces)`', 'The separator goes first. It is the only correct way to build a string in a loop'],
            ['Remove surrounding whitespace', '`s.strip()`', 'Also strips `\\n` and `\\t`, which is usually what you want and occasionally not'],
            ['Remove a known prefix or suffix', '`s.removeprefix("v")` / `s.removesuffix(".tmp")`', 'Available since 3.9. Cleaner and safer than `s[2:]` or `s[:-4]`, which slice unconditionally'],
            ['Swap a character or a token', '`s.replace(" ", "_")`', 'Literal only. It does not take a regex — that is `re.sub`'],
            ['Check a character class', '`s.isdigit()`, `s.isalpha()`, `s.isalnum()`', 'Unicode-aware, so `isdigit()` accepts ² and Arabic-Indic digits. Convert with `int()` in a try block'],
            ['Look for a substring, tolerate absence', '`i = s.find(needle)`', 'Returns -1. Forgetting that `-1` is truthy and `0` is not is a classic bug — test `if i == -1`'],
            ['Look for a substring, absence is a bug', '`i = s.index(needle)`', 'Raises ValueError. Wrap it, or use find, deliberately'],
            ['Match a prefix from a set', '`s.endswith((".csv", ".tsv"))`', 'A tuple, not a list, and not a regex. Also `startswith`'],
            ['Caseless comparison', '`a.casefold() == b.casefold()`', 'Use casefold, not lower. For 3-letter country codes and ASCII, lower is fine'],
            ['Pad to a column width', '`f"{s:<20}"` or `s.ljust(20)`', 'Prefer the f-string; you can combine it with `:` specifiers you will meet next lesson'],
            ['Reformat a long paragraph', '`textwrap.fill(s, width=72)`', 'Collapses all whitespace first. `textwrap.dedent` is the one for triple-quoted blocks'],
          ]
        ),
        b.md(`## Three methods worth more than the rest

**\`splitlines\`** is the one you will use most and think about least. It splits on any of the Unicode line boundaries — \`\\n\`, \`\\r\\n\`, \`\\r\`, and about twenty others — which is exactly what you want when reading a file that might have come from Windows, a Mac, or a 1987 terminal. \`s.split("\\n")\` leaves a stray \`\\r\` on Windows input. \`s.splitlines()\` does not.

\`\`\`python
"a\\nb\\r\\nc".split("\\n")     # ['a', 'b\\r', 'c']   — Windows junk survives
"a\\nb\\r\\nc".splitlines()     # ['a', 'b', 'c']     — handled
"a\\nb".splitlines()           # ['a', 'b']
"trailing\\n".splitlines()     # ['trailing']        — no empty final element
\`\`\`

**\`removeprefix\` and \`removesuffix\`** exist because the manual version is wrong more often than you would think. \`s[len("v"):]\` raises on a short string and produces nonsense on a long one; \`s[:-4]\` on \`"file"\` gives \`"fi"\`. These were added in 3.9 precisely because that footgun had no safe expression.

**\`casefold\`** is the correct way to compare text for equality when case should be ignored, and it is not the same as \`lower()\`. German eszett is the canonical example: \`"straße".lower()\` is \`"straße"\` and \`"STRASSE".lower()\` is \`"strasse"\`, so the two never match. \`"straße".casefold()\` is \`"strasse"\` and matches. The \`lower()\`/\`upper()\` pair is a character-by-character mapping; \`casefold()\` is a folding designed to make comparison succeed.

\`\`\`python
print("Straße".casefold() == "STRASSE".casefold())   # True
print("Straße".lower() == "STRASSE".lower())         # False
print("ﬁle".casefold() == "file".casefold())   # True — the ligature folds too
\`\`\``),
        b.code(`# A realistic cleanup pipeline, and what it costs
import re

raw = "  Ada  Lovelace\\n\\tAda   Byron  \\n"

cleaned = re.sub(r"\\s+", " ", raw).strip()
print(repr(cleaned))            # 'Ada Lovelace Ada Byron'

# The same thing with str methods only — faster when that is all you need
cleaned = " ".join(raw.split())
print(repr(cleaned))            # 'Ada Lovelace Ada Byron'

# Whitespace-only values must be caught explicitly
name = "   "
if not name.strip():            # "" is falsy, so "if not name" is not enough
    print("blank name rejected")

# removeprefix is the safe version of the manual slice
version = "v1.2.3"
print(version.removeprefix("v"))          # '1.2.3'
print(version[len("v"):] if version.startswith("v") else version)   # '1.2.3' — but ugly
print(len("v"))                           # 1 — the length of the prefix you removed

# find returns -1, and -1 is truthy while 0 is falsy — the classic bug
haystack = "user:admin"
i = haystack.find(":")
if i != -1:                  # correct
    key, value = haystack[:i], haystack[i + 1:]
print(key, value)             # user admin
if i:                        # WRONG: fails when the match is at index 0
    print("never printed for a leading colon")
`, 'methods.py'),
        b.checklist('Before you reach for str methods', [
          'Have you rebound the result? `s.strip()` alone does nothing — check the linter, this is the single most common string bug',
          'Do you need a regex? `replace` is literal; `re.sub` is the pattern version, and it is an order of magnitude slower',
          'Have you used `splitlines()` rather than `split("\\n")` for anything read from a file?',
          'Is absence expected? `find` returns -1 and `index` raises — pick on purpose, and remember `if i` is not `if i != -1`',
          'Are you comparing caselessly with `casefold()` rather than `lower()`?',
          'Are you building a string with `join` over a list or generator instead of `+=` inside a loop?',
        ]),
        b.tip(
          'The performance numbers worth memorising',
          '`len`, `s[i]`, `str.upper()` on ASCII and `str.join` are all effectively constant or single-pass in C. `s in big_text` uses CPython\'s two-way search and is very fast — faster than `str.find` on some inputs, and there is no "use KMP" advice you need. The genuinely slow operations are repeated concatenation in a loop, and `re` patterns with backtracking. Optimise those two and ignore the rest until a profiler says otherwise.'
        ),
      ],
      questions: [
        [
          'What does `"xxaxx".lstrip("x")` return?',
          ['"axx", because lstrip removes leading x characters', "'axx', because lstrip removes characters in the given set", "'axx' minus the trailing x, so 'ax'", "A ValueError, because the set is ambiguous"],
          1,
          '`lstrip(chars)` removes any leading characters that are *in* the set, not a repeated prefix. It is a character-set trim, not a prefix strip. `removeprefix("x")` is the one that removes a single literal prefix.',
        ],
        [
          'Why is `"a\\nb".split("\\n")` a worse choice than `"a\\nb".splitlines()`?',
          [
            '`split` is slower',
            '`split("\\n")` leaves a trailing `\\r` on Windows-style CRLF input, and produces an empty final element for a trailing newline',
            '`splitlines()` also splits on spaces',
            '`split` requires a separator argument',
          ],
          1,
          '`splitlines()` splits on every Unicode line boundary including `\\r\\n`, so it handles input from any platform. `split("\\n")` splits only on the two-character sequence, leaving a stray carriage return at the end of each line on Windows input.',
        ],
        [
          'Which comparison is correct for ignoring case in a language-aware way?',
          ['`a.lower() == b.lower()`', '`a.upper() == b.upper()`', '`a.casefold() == b.casefold()`', '`a == b.upper()`'],
          2,
          '`casefold()` is the aggressive, locale-independent fold designed for caseless comparison: "ß".casefold() is "ss", so "Straße" and "STRASSE" match. `lower()` is a per-character mapping and does not make that comparison succeed.',
        ],
        [
          'What is the bug in `path.strip()` when `path` is `"  report.csv  "`?',
          [
            'It raises a ValueError on the whitespace',
            'It modifies `path` in place, so the filename loses its extension',
            'It returns a new string that is discarded, leaving `path` unchanged',
            'It returns None and clears `path`',
          ],
          2,
          'Strings are immutable, so no method can modify the receiver. `strip()` computes and returns a new object; if you do not rebind, the work is thrown away and `path` still has its surrounding spaces.',
        ],
      ],
    },
    {
      title: 'f-strings, formatting and Unicode',
      summary: 'The format spec mini-language, the self-documenting `=` f-string, textwrap, and the str-versus-bytes wall.',
      duration: 19,
      build: (b) => [
        b.md(`## f-strings, and why they won

The f-string prefix was added in Python 3.6 and has completely displaced \`%\` formatting and \`str.format\`. All three do the same job; only the f-string is worth using in new code, because it evaluates real expressions, allows any quote style inside, and is faster.

\`\`\`python
name, score, attempts = "ada", 0.256, 3

# str.format — still supported, still everywhere in old code
"{} scored {:.1%} over {} attempts".format(name, score, attempts)

# %-formatting — C-style, and a common source of KeyError and TypeError
"%s scored %.1f%% over %d attempts" % (name, score * 100, attempts)

# f-string — the one to write
f"{name} scored {score:.1%} over {attempts} attempts"
\`\`\`

The f-string evaluates arbitrary expressions, including calls, ternaries, and attribute access, and it is the only one of the three where a debugger can tell you the variable name. Inside the braces you may reuse the same quote character you opened the string with (3.12+ relaxed this further, allowing backslashes and the same quote).

\`\`\`python
d = {"name": "ada"}
f"{d['name']}"                   # 'ada' — nested quotes are fine
f"{len(d)}"                      # '1' — calls allowed
f"{'yes' if d else 'no'}"        # 'yes' — any expression at all
\`\`\`

## The self-documenting \`=\` specifier

New in 3.8, and the single most useful formatting feature since 3.6:

\`\`\`python
x = 7
print(f"{x + 1=}")
# x + 1=8

name = "report.csv"
print(f"{name=}")
# name='report.csv'   — repr, so quotes and whitespace are visible
print(f"{name=!s}")
# name=report.csv     — str, no quotes
\`\`\`

This turns a debugging \`print\` into something you can leave in production: the value *and* the expression that produced it, with the expression in source rather than in your head. Combined with a format spec, \`f"{elapsed / 60:.2f=}"\` gives you \`elapsed / 60=3.42\` with units in the label.

## The format spec mini-language

The full grammar is \`[[fill]align][sign][#][0][width][,][.precision][type]\`, and it appears after a colon. It works on f-strings, \`format()\`, and \`str.format()\`, so once you know it you know it everywhere.

\`\`\`python
value = 3.14159
n = 1234567

print(f"{n:>10}|")        # '   1234567|'  — right align, width 10
print(f"{n:<10}|")        # '1234567   |'  — left align (the default for numbers is right)
print(f"{'pi':^10}|")     # '    pi     |'  — centre
print(f"{'pi':*^10}|")    # '****pi****|'  — * is the fill character
print(f"{n:,}")           # '1,234,567'     — thousands separator
print(f"{n:_}")           # '1_234_567'     — any of , _ or space
print(f"{value:.2f}")     # '3.14'          — 2 digits after the point
print(f"{value:.0f}")     # '3'             — 0 digits, still round-half-to-even
print(f"{value:8.2f}")    # '    3.14'      — width and precision together
print(f"{value:08.3f}")   # '0003.142'      — the 0 flag pads with zeros
print(f"{value:+.2f}")    # '+3.14'         — always show the sign
print(f"{0.256:.1%}")     # '25.6%'         — percentage
print(f"{1234.5:e}")      # '1.234500e+03'  — scientific
print(f"{255:#x}")        # '0xff'          — the # flag shows the base prefix
print(f"{255:b}")         # '11111111'
print(f"{65:c}")         # 'A'             — a character from a code point
print(f"{3.14159:g}")     # '3.14159'       — pick fixed or scientific, whichever is shorter
print(f"{1234.5678:.3}")  # '1.23e+03'      — precision means significant digits for g
\`\`\`

The alignment defaults are the one asymmetry to remember: **numbers right-align, strings left-align**, because that is what looks right in a table. If you want a number left-aligned in a column, say \`{n:<10}\`.

## Conversions, and textwrap

The three conversion flags come before the colon and are about *how Python renders the object before formatting it*:

\`\`\`python
class Point:
    def __repr__(self): return "Point(x=1, y=2)"
    def __str__(self):  return "Point(1, 2)"

p = Point()
print(f"{p!r}")    # Point(x=1, y=2)  — repr
print(f"{p!s}")    # Point(1, 2)       — str
print(f"{p!a}")    # Point(x=1, y=2)  — ascii(), escapes non-ASCII; ideal for logs
print(f"{p}")      # str, the default
\`\`\`

And for text that came from a file, a triple-quoted string, or a user:

\`\`\`python
import textwrap

paragraph = "word " * 12
print(textwrap.fill(paragraph, width=30, initial_indent="> ", subsequent_indent="  "))

sql = """
    SELECT id
    FROM users
"""
print(textwrap.dedent(sql))       # strips the COMMON leading whitespace
print(textwrap.indent("a\\nb", "    "))   # '    a\\n    b' — the reverse
print(textwrap.shorten(paragraph, width=20, placeholder="..."))   # never breaks a word
\`\`\`

\`textwrap.fill\` first collapses all internal whitespace, so it is the right tool for a paragraph and the wrong tool for anything where the spacing is data.`),
        b.anim('memory', {
          title: '"héllo" is 5 characters and 6 bytes',
          badge: 'str vs bytes',
          base: 140737488355328,
          cell_bytes: 1,
          cells: [
            { bytes: ['68'], label: 'h', tone: 'char' },
            { bytes: ['C3'], label: 'é', tone: 'char' },
            { bytes: ['A9'], label: 'é', tone: 'char' },
            { bytes: ['6C'], label: 'l', tone: 'char' },
            { bytes: ['6C'], label: 'l', tone: 'char' },
            { bytes: ['6F'], label: 'o', tone: 'char' },
          ],
          steps: [
            {
              caption: 'Python holds a str: five code points, one per character',
              note: 'A str stores code points, and internally it uses a compact representation — one, two or four bytes per code point, chosen by the smallest that fits. The memory cost is a variable number of bytes per character, decided per string.',
              vars: [
                { name: 's', type: 'str', value: '"héllo"  (5 code points)', pointsTo: 0, tone: 'char' },
              ],
            },
            {
              caption: 'Encode to UTF-8 and the shape changes completely',
              note: 'Every code point above U+007F becomes two or more bytes. é is U+00E9, which is 0xC3 0xA9 in UTF-8. Now there are six bytes where there were five characters, and the two byte offsets no longer match the character indices.',
              cells: {
                '1': { label: 'é · 1 of 2', tone: 'warn', note: '0xC3 is the lead byte' },
                '2': { label: 'é · 2 of 2', tone: 'warn', note: '0xA9 is the continuation byte' },
              },
              highlight: [1, 2],
              vars: [
                { name: 's', type: 'str', value: '"héllo"  len 5', pointsTo: 0, tone: 'char' },
                { name: 'b', type: 'bytes', value: 'b\'h\\xc3\\xa9llo\'  len 6', pointsTo: 0, tone: 'data' },
              ],
            },
            {
              caption: 'Character index 1 and byte offset 1 are different places',
              note: 's[1] is the whole character é. b[1] is the single lead byte 0xC3, and b[1:3] is the complete é. If you slice bytes by character offsets — because the offsets came from str — you corrupt the data. This is the bug behind every "UnicodeDecodeError in a CSV parser" you will ever see.',
              vars: [
                { name: 's[1]', type: 'str', value: "'é'", tone: 'ok' },
                { name: 'b[1]', type: 'int', value: '195  (0xC3 alone)', tone: 'bad' },
                { name: 'b[1:3]', type: 'bytes', value: "b'\\xc3\\xa9'  — the real é", tone: 'ok' },
              ],
            },
            {
              caption: 'len() answers different questions for each type',
              note: 'len(s) is 5 code points. len(b) is 6 bytes. Neither is the number of things a human sees, which for this string happens to be 5 — but for a family emoji it is 1 visible character, 5 code points, and 25 bytes. Always name the unit you mean.',
              highlight: [3, 4, 5],
              vars: [
                { name: 'len(s)', type: 'int', value: '5  code points', tone: 'int' },
                { name: 'len(b)', type: 'int', value: '6  bytes', tone: 'int' },
                { name: 'len(s.encode("utf-8"))', type: 'int', value: '6  bytes', tone: 'int' },
              ],
            },
            {
              caption: 'You cannot mix them, which is the point',
              note: '"x" + b"y" raises TypeError: can only concatenate str (not "bytes") to str. The type boundary is what stops a str sneaking into a binary socket. Convert explicitly at the edges: s.encode() one way, b.decode() the other, and decide which one your data actually is.',
              vars: [
                { name: 's.encode("utf-8")', type: 'bytes', value: '6 bytes — text becomes bytes', pointsTo: 0, tone: 'data' },
                { name: 'b.decode("utf-8")', type: 'str', value: "'héllo' — bytes become text", pointsTo: 0, tone: 'char' },
                { name: '"x" + b"y"', type: 'TypeError', value: 'no implicit conversion, ever', tone: 'bad' },
              ],
            },
          ],
        }),
        b.lead('Three units, and the normalisation trap'),
        b.md(`## Code point, byte, grapheme cluster

Every text bug is one of these three units being confused:

- **Code point** — what \`len()\` counts and what \`str\` stores. \`"👨‍👩‍👧"\` is 5: U+1F468, U+200D, U+1F469, U+200D, U+1F467.
- **Byte** — what \`bytes\` stores, and what goes over a wire. In UTF-8 that emoji is 25 bytes.
- **Grapheme cluster** — what a human perceives as one character. That emoji is 1 cluster, because the zero-width joiners bind the three people together.

Python gives you the first two natively. The third is what you want for user-facing text limits, and the honest answer is that you need a library for it — a validation message saying "no more than 10 characters" and accepting 11 emoji is a bug report someone will file.

\`\`\`python
family = "\U0001F468‍\U0001F469‍\U0001F467"
print(len(family))                              # 5   code points
print(len(family.encode("utf-8")))              # 25  bytes
print(family[0])                                # 👨 — slicing breaks the cluster
\`\`\`

## Normalisation: the bug that survives code review

The same visible character has two encodings. \`"é"\` can be U+00E9 (one code point, "NFC") or U+0065 followed by U+0301 (two code points, "NFD"). They render identically. They are **not** \`==\`. And they hash differently, so they are different dict keys, different set members, and different database rows.

\`\`\`python
import unicodedata

composed = "h\\u00e9llo"        # NFC: precomposed é
decomposed = "he\\u0301llo"     # NFD: e + a combining acute accent

print(len(composed), len(decomposed))    # 5 6
print(composed == decomposed)            # False
print(composed.encode("utf-8").hex())    # 68c3a96c6c6f    — 6 bytes
print(decomposed.encode("utf-8").hex())  # 6865cc816c6c6f   — 7 bytes

print(unicodedata.normalize("NFC", decomposed) == composed)   # True
print(unicodedata.is_normalized("NFC", decomposed))           # False
print(unicodedata.normalize("NFKC", "\\ufb01") == "fi")       # True — ligature folds
\`\`\`

NFKC is the compatibility form: it also folds ligatures, full-width characters, and superscripts, which is what you want for **search** — a user typing "fi" should find "ﬁ". NFC is what you want for **storage** — it makes strings that look the same actually be the same, without destroying anything. macOS filesystems normalise to NFD, which is why the same file name typed on Windows and macOS can fail to match on a case-sensitive Linux server.

The one rule: **normalise on the way in, once, at the boundary.** Normalise user input before storing or comparing it, and never normalise on the way out. Normalising twice is not idempotent for every form, and normalising output breaks round-trips.

\`\`\`python
import unicodedata

def canonical(text):
    return unicodedata.normalize("NFC", text)

usernames = {canonical(name) for name in submitted_names}   # "José" and "José" collapse
if canonical(candidate) in usernames:
    ...
\`\`\``),
        b.diagram(
          'Where text turns into bytes, and where it is safe to change it',
          `flowchart LR
    A["str — a sequence of code points"] -->|"s.encode('utf-8')"| B["bytes — a sequence of 0..255"]
    B -->|"write to a binary file or a socket"| C["the file or the network"]
    C -->|"read"| D["bytes"]
    D -->|"b.decode('utf-8')"| E["str"]
    A -->|"read with open(path, encoding='utf-8')"| E
    A --> F["display, len, and string methods — all code points"]
    B --> G["hashing, socket writes, binary formats — all bytes"]
    E -.->|"errors='replace' loses data silently"| H["str with U+FFFD in it"]
    E -.->|"the default, and usually right"| I["UnicodeDecodeError — fail loudly"]`
        ),
        b.md(`## Files, and the default that is almost always right

\`open()\` defaults to \`encoding="locale.getpreferredencoding()\`, which is **not** UTF-8 on every machine, and has changed between Windows releases. Always pass it:

\`\`\`bash
python -c "import locale, sys; print(locale.getpreferredencoding(), sys.getdefaultencoding())"
\`\`\`

\`\`\`python
from pathlib import Path

# Text mode: the default, and what you want for everything human-facing
with Path("notes.txt").open("w", encoding="utf-8", newline="\\n") as fh:
    fh.write("héllo\\n")

# Binary mode: no decoding, no newline translation, byte for byte
with Path("logo.png").open("rb") as fh:
    header = fh.read(8)

# Universal newlines is on by default in text mode, which is why splitlines()
# and read() behave consistently across platforms
with Path("notes.txt").open(encoding="utf-8") as fh:
    print(repr(fh.read()))    # 'héllo\\n' — CRLF became LF on read
\`\`\`

\`newline="\\n"\` on write stops Windows from turning your \`\\n\` into \`\\r\\n\`, which matters if anything downstream diffs the file or hashes it. Newline translation on *read* is on by default and is almost always what you want.

## Choosing a format, finally

| Situation | Use | Why |
| --- | --- | --- |
| A short label in a log line | f-string with a spec | Readable, fast, and the spec keeps the padding out of your logic |
| User-facing text of unknown length | \`textwrap.fill(s, width=72)\` | Wraps at a column instead of a character count |
| Tabular output | \`" ".join(f"{v:>12}" for v in row)\` or a table library | The width spec does the alignment; \`str.ljust\` is the fallback |
| Structured data going over a wire | \`json\`, not a formatted string | Never parse a formatted string back. Never. |
| Money, to a human | \`Decimal\` formatted with \`f"{d:,.2f}"\` | Comma grouping and 2dp without touching the arithmetic |
| A machine-readable log line | \`json.dumps(..., ensure_ascii=False)\` or \`!a\` in an f-string | Escaping is handled for you; \`!a\` is the quick version |

That last row is the practical summary of this lesson: **formatting is for humans, and anything a machine will read back should be a data structure, not a string you formatted.**`),
        b.code(`# The str/bytes boundary, in the four places it actually bites
import json

# 1. Binary files. Never decode these; a truncated image is not text.
with open("logo.png", "rb") as fh:
    magic = fh.read(4)
assert magic[:3] == b"\\x89PNG"
print(magic)                  # b'\\x89PNG\\r\\n\\x1a\\n' — an int sequence, not a str

# 2. Text files. Always say the encoding.
with open("notes.txt", "w", encoding="utf-8") as fh:
    fh.write("héllo\\n")

with open("notes.txt", "rb") as fh:
    raw = fh.read()
print(raw.hex())              # 68c3a96c6c6f0a — 7 bytes, exactly what went on the wire
print(len(raw))               # 7
print(raw.decode("utf-8"))    # 'héllo\\n' — and back again, losslessly

# 3. Sockets and subprocesses speak bytes
import subprocess
result = subprocess.run(["echo", "héllo"], capture_output=True)
print(result.stdout)          # b'h\\xc3\\xa9llo\\n'
print(result.stdout.decode("utf-8").strip())   # héllo

# 4. They never mix
try:
    "text" + b"bytes"
except TypeError as exc:
    print(exc)
# can only concatenate str (not "bytes") to str
`, 'str_vs_bytes.py'),
        b.code(`# Formatting, assembled into something you would actually ship
def report(name, rows, elapsed_s, balance):
    width = max(len(r[0]) for r in rows)
    lines = [
        f"{name:<20} {elapsed_s:8.2f}s",
        "-" * 32,
    ]
    for label, count in rows:
        lines.append(f"  {label:<{width}}  {count:>8,}")
    lines.append("-" * 32)
    lines.append(f"  {'balance':<{width}}  {balance:>8,.2f}")
    return "\\n".join(lines)


print(report("quarterly", [("apac", 1284), ("emea", 993), ("amer", 15007)], 3.42, 184302.5))
# quarterly              3.42s
# --------------------------------
#   apac                     1,284
#   emea                       993
#   amer                    15,007
# --------------------------------
#   balance                184,302.50
`, 'formatting.py'),
        b.tip(
          'The `=` f-string is the highest-value trick in this module',
          'Debug prints that show the expression as well as the value survive code review and end up in production logs, because they are self-explanatory to whoever reads the log at 3am. `f"{elapsed / 60:.2f=}"` prints `elapsed / 60=3.42`, which tells the reader both the number and the unit without you writing a single label. It costs one character and it replaces the two-thirds of debugging print statements that say `DEBUG: 3.42`.'
        ),
        b.warn(
          'Never use %-formatting or .format() in new code',
          'Both are still supported and both appear in every library you will read. `%` formatting is C-style and fails at runtime with unhelpful errors — `"%(a)s" % {"a": 1}` works but `"%a" % {"a": 1}` raises, and mixing argument types gives a TypeError several characters from the mistake. `.format()` is better but cannot evaluate expressions, is slower, and puts the format spec in a second argument far from the value. All three produce the same output; only one of them is a good idea.'
        ),
        b.info(
          'The one Unicode question to answer before you ship',
          'Ask what a "character" means to the person who will use this. For a database column sized `VARCHAR(50)`, a CSV field limit, or a "username too long" message, the answer is almost always the code point count — which is `len()` — and is wrong for anyone typing emoji. For a password field or a search index, the answer is normalisation, not length. Decide which, write it in a comment, and stop revisiting it.'
        ),
        b.resources('Text is deceptively hard — worth reading', [
          { label: 'Unicode, the standard: chapters 2 and 3 explain code points, graphemes and normalisation', url: 'https://www.unicode.org/unicode/standard/standard.html' },
          { label: 'The Python Unicode HOWTO — the practical version', url: 'https://docs.python.org/3/howto/unicode.html' },
          { label: 'PEP 3101 — the format spec mini-language, in full', url: 'https://peps.python.org/pep-3101/' },
          { label: 'textwrap — the standard library reference for paragraph formatting', url: 'https://docs.python.org/3/library/textwrap.html' },
        ]),
      ],
      questions: [
        [
          'What does `f"{3.14159:08.3f}"` produce?',
          ['`3.142`', '`0003.142`', '`3.14159`', '`00008.142`'],
          1,
          'The `0` flag pads with zeros to the total width of 8, and `.3` limits the digits after the point. Zero padding goes in front of the sign, and the width counts every character produced, so you get exactly eight of them.',
        ],
        [
          'Why can `len("héllo")` differ from `len("héllo".encode("utf-8"))`?',
          [
            'They cannot differ; encoding is lossless',
            '`str` stores Unicode code points and `len` counts those, while UTF-8 uses one to four bytes per code point — é is one code point but two bytes',
            '`encode` adds a byte-order mark',
            '`str` stores UTF-16 internally so the counts differ by design',
          ],
          1,
          'A str is a sequence of code points, so len counts characters as Python defines them. UTF-8 is a variable-width byte encoding: ASCII is one byte per code point and é is two. Both are true statements about the same text, answering different questions.',
        ],
        [
          'Two strings both display as "é" but `a == b` is False. What is going on?',
          [
            'One of them is a bytes object, not a str',
            'One is in NFC and one is in NFD — a precomposed é versus e followed by a combining accent — so they are different code point sequences',
            'Python compares str by address, not by value',
            'One of them has a trailing invisible character',
          ],
          1,
          'Unicode allows both a precomposed U+00E9 and the two-code-point sequence U+0065 U+0301. They render identically, have different lengths, different UTF-8 bytes, and different hashes, so they are different dict keys. `unicodedata.normalize("NFC", b) == a` fixes it — normalise on input, once.',
        ],
        [
          'What is the advantage of the f-string `{expr=}` form?',
          [
            'It is faster than a plain f-string',
            'It prints both the expression as written and its value, so a debug log is self-explanatory',
            'It evaluates the expression lazily',
            'It allows expressions that normal f-strings reject',
          ],
          1,
          '`f"{x + 1=}"` prints `x + 1=8`. The expression text is taken from the source at compile time, so the log line carries the formula with it. Add `!s` to print with str instead of repr, or a spec after the `=` to format the value.',
        ],
      ],
    },
  ]
);
