// Module 11 — Files, serialisation, and the import system.
// The three lessons here are the boundary between a program that computes and a
// program that *persists*. By the end of the module a learner can write a file
// that a stranger on another machine can read, round-trip data through a text
// format without silently losing types, and explain what `import` actually does
// when it fails.

import { mod } from '../blocks';

export const M11 = mod(
  'crs-python-programming',
  'py-m11',
  11,
  'Module 11 — Files, Modules and Packages',
  'Persisting data with text and binary files, serialising it safely, and how Python actually finds and runs your modules.',
  [
    {
      title: 'Reading and writing files',
      summary: 'open() modes, encodings, the with statement, buffered-IO gotchas, and the pathlib API that replaces most of it.',
      duration: 18,
      build: (b) => [
        b.md(`## Every program eventually needs to remember

Up to this point your data has lived in a variable, which means it dies the instant the process exits. A file is the cheapest durable thing Python gives you: named bytes on disk that survive a reboot, a crash, and a deploy.

\`open()\` is the single function that matters. It returns a **file object** — a stream with a position, a buffer, and a mode — and everything else in this lesson is a variation on how you create that object and how you pull bytes out of it.

## The modes, and what they actually do

The word that matters in the table below is **truncate**. Opening an existing file with mode \`"w"\` sets its length to zero *before* your first character is written. There is no undo, no backup, no prompt. This is the most destructive single line in Python and it is the default, so it is worth being deliberate about.

Two more facts that save real bugs:

- \`"r"\` on a file that does not exist raises \`FileNotFoundError\` immediately. That is correct behaviour, and catching it is a normal part of writing to a config file the user may not have.
- \`"a"\` positions the write cursor at the **end** regardless of anything you have done with \`seek()\`. Every write in append mode goes to the end. That is the point of the mode.`),
        b.table(
          'The six modes you need',
          ['Mode', 'Meaning', 'File missing?', 'Fails if it exists?', 'Reads?'],
          [
            ['`"r"`', 'read, text', 'raises FileNotFoundError', 'no', 'yes'],
            ['`"r+"`', 'read and write, no truncate', 'raises FileNotFoundError', 'no', 'yes'],
            ['`"w"`', 'write, truncating', 'creates it', 'no — erases it', 'no'],
            ['`"w+"`', 'read and write, truncating', 'creates it', 'no — erases it', 'yes'],
            ['`"a"`', 'append only, writes at the end', 'creates it', 'no', 'no'],
            ['`"a+"`', 'read and append', 'creates it', 'no', 'yes'],
          ]
        ),
        b.md(`## Text mode is not the default in the sense that matters

Every mode above is a **text** mode, and it is text mode in Python 3 because of the \`"b"\` suffix you did not write. \`open("f.txt", "w")\` and \`open("f.txt", "wb")\` are different beasts:

- **Text mode** encodes \`str\` to bytes on the way out and decodes bytes to \`str\` on the way in. It gives you newline translation (\`\\r\\n\` becomes \`\\n\`), and it is wrong for anything that is not human-readable.
- **Binary mode** (\`"b"\`) hands you \`bytes\`, which are immutable sequences of integers 0–255. No decoding, no newline translation, no surprise. This is the only correct mode for images, audio, \`.zip\`, \`.sqlite\`, \`.parquet\`, or a pickle stream.

\`shutil.copyfile\` is four lines long and every one of them is about picking the right mode:`),
        b.code(`import shutil

with open("src.dat", "rb") as src:
    with open("dst.dat", "wb") as dst:
        shutil.copyfileobj(src, dst)`, 'copy_file.py'),
        b.md(`Read \`rb\`, write \`wb\`. Copying a binary file in text mode with \`"r"\`/\`"w"\` corrupts it, because text mode will try to decode bytes that are not valid UTF-8 and will silently mangle \`\\r\\n\` on Windows.

## Always pass encoding="utf-8"

This is not optional advice, it is the difference between a program that works on your machine and a program that works.

\`open()\` picks a default encoding from \`locale.getpreferredencoding(False)\`. On a modern Linux container that is usually \`UTF-8\`. On a Windows machine with a legacy code page it can be \`cp1252\`, and on a Japanese Windows install it can be \`shift_jis\` or \`cp932\`. Your file will be written in one encoding and read back in another, and the failure is a \`UnicodeDecodeError\` or a file full of mojibake — on someone else's machine, at 2am, in production.`),
        b.code(`# Always explicit, on both sides.
with open("config.ini", "w", encoding="utf-8") as f:
    f.write("author = Renee Dubois\\n")

with open("config.ini", encoding="utf-8") as f:
    text = f.read()

print(text.strip())
# author = Renee Dubois`, 'read_config.py'),
        b.md(`There is one more encoding rule worth knowing: **JSON files, CSV files, and source files are all read as UTF-8 by default in every well-behaved tool on earth**, so writing them in anything else guarantees a mismatch. If you need to read a legacy \`latin-1\` file, pass \`encoding="latin-1"\` explicitly so at least the choice is visible in the source.

## The with statement is not sugar

\`open()\` gives you a file object that must be closed by hand if you do not use \`with\`.`),
        b.code(`# Do not ship this.
f = open("data.txt", "w", encoding="utf-8")
f.write("half a record")
raise ValueError("something went wrong downstream")
f.close()          # never runs`, 'leak.py'),
        b.md(`The exception propagates, \`f.close()\` is skipped, and the buffered data is lost. In CPython the object is eventually finalised and the file closes, but "eventually" is at the mercy of the garbage collector, and a long-running process may keep the descriptor open for minutes.`),
        b.code(`# Ship this.
with open("data.txt", "w", encoding="utf-8") as f:
    f.write("half a record")
    raise ValueError("something went wrong downstream")
# f.close() ran anyway, on the way out, and the bytes hit the disk.`, 'no_leak.py'),
        b.md(`\`with\` is a context manager. On entry it calls \`f.__enter__()\` and binds the result to the target; on exit — normal return, \`return\`, \`break\`, or exception — it calls \`f.__exit__()\`, and for a file object that means flush and close. This is the reason the idiom is universal: it is the only construct where cleanup cannot be skipped by an early exit or a crash in the middle.`),
        b.steps(
          'What the with statement actually does',
          [
            {
              title: 'Evaluate the call',
              desc: 'open(path, "w", encoding="utf-8") runs and creates a TextIOWrapper. It is a buffered object: writes accumulate in a block buffer, currently 8192 bytes on CPython, and are not on the disk yet.',
              code_snippet: 'f = open("data.txt", "w", encoding="utf-8")',
            },
            {
              title: 'Enter the block',
              desc: '__enter__ is called and its return value is bound to the target name. For a file object __enter__ returns the file itself, so `as f` gives you the stream. It also checks the file is still usable.',
              code_snippet: 'with open(...) as f:   # f is the TextIOWrapper',
            },
            {
              title: 'Run the body',
              desc: 'Ordinary code. If it raises, Python jumps straight past the end of the block to __exit__ with the exception information attached.',
              code_snippet: 'f.write("half a record")',
            },
            {
              title: 'Exit, either way',
              desc: '__exit__ flushes the buffer to the OS and closes the descriptor. This happens on the normal path, on return, and on the exception path — which is the entire reason the idiom exists.',
              code_snippet: '# <- always runs. buffer flushed, fd released.',
            },
          ]
        ),
        b.lead('Whole file, line by line, or a fixed-size chunk'),
        b.md(`\`read()\` pulls the entire remaining contents into one \`str\`. It is one line and it is wrong for anything large, because the file is now in memory *and* you still hold the original data structure you were trying to avoid duplicating.`),
        b.code(`from pathlib import Path

log = Path("access.log")
text = log.read_text(encoding="utf-8")

# Careful: a 4 GB log becomes a 4 GB string, plus whatever you do next with it.
for line in text.splitlines():
    print(len(line))`, 'whole_file.py'),
        b.md(`Line by line is the default for anything that might not fit. Iterating the file object directly is the right default: it reads in chunks internally, yields one line at a time, and stops at end-of-file. Memory stays flat regardless of file size, and there is no list of everything.`),
        b.code(`from pathlib import Path

log = Path("access.log")
total = 0
with log.open(encoding="utf-8") as f:
    for line in f:
        if " 500 " in line:
            total += 1
        # line is discarded at the top of the next iteration

print(f"server errors: {total}")`, 'line_by_line.py'),
        b.md(`The three single-call readers you should still know:

| Call | Returns | Cost | Use it when |
| --- | --- | --- | --- |
| \`f.read()\` | one \`str\`, rest of file | whole file in memory | small files, or you genuinely need it all |
| \`f.readline()\` | one line, \`""\` at EOF | one line | peeking, skipping a header, protocols |
| \`f.readlines()\` | list of every line | whole file in memory | you really want random access and the file is small |

And the important footgun in that table: **a file object at EOF stays at EOF.** Once \`readline()\` returns \`""\`, every later \`readline()\` and \`read()\` returns \`""\` too. Nothing rewinds for you. To go back you must call \`f.seek(0)\`, and if you opened in append mode, \`seek()\` cannot move the write cursor — you have to reopen. This is the most common cause of "my loop runs once and then stops".

\`writelines()\` writes an iterable of strings, and it adds **no separators**: it is a loop of \`write()\` calls. Forgetting the newline is why so many generated files come out as one enormous line.`),
        b.code(`rows = ["ada,42\\n", "grace,37\\n", "alan,41\\n"]

with open("visitors.csv", "w", encoding="utf-8") as f:
    f.writelines(rows)          # three writes, no newlines added by us

# Same result, but explicit about what ends up on disk:
with open("visitors.csv", "w", encoding="utf-8") as f:
    for row in rows:
        f.write(row)`, 'writelines.py'),
        b.anim('trace', {
          title: 'Writing a file, then reading it back',
          badge: 'open / write / read',
          code: `from pathlib import Path

path = Path("visitors.txt")
with path.open("w", encoding="utf-8") as f:
    f.write("Ada 42\\n")
    f.write("Grace 37\\n")

with path.open("r", encoding="utf-8") as f:
    first = f.readline()
    rest = f.readlines()

print(len(first), len(rest))`,
          steps: [
            {
              caption: 'Module loaded, nothing bound yet',
              note: 'The file is compiled to bytecode and a module-level frame is created. No name in this program exists until its assignment line runs.',
              line: 1,
              vars: [],
              output: '',
            },
            {
              caption: 'path is bound to a Path object',
              note: 'Path() does not touch the filesystem. It is a pure string wrapper plus a set of path operations, which is why constructing one is free and cannot fail.',
              line: 3,
              vars: [{ name: 'path', value: "PosixPath('visitors.txt')", tone: 'ptr' }],
              output: '',
            },
            {
              caption: 'mode "w" truncates before anything is written',
              note: 'The file is created if missing, or truncated to zero bytes if it exists. The TextIOWrapper has a position and an 8192-byte buffer; the file itself is still empty.',
              line: 4,
              vars: [
                { name: 'path', value: "PosixPath('visitors.txt')", tone: 'ptr' },
                { name: 'f', value: "<TextIOWrapper name='visitors.txt' mode='w'>", tone: 'io' },
              ],
              output: 'visitors.txt on disk -> 0 bytes   (mode "w" truncated it)',
            },
            {
              caption: 'write() returns a count; the bytes are still buffered',
              note: 'write returns how many characters it accepted, not how many reached the disk. "Ada 42\\n" is 6 characters and went into the buffer, not the file.',
              line: 5,
              vars: [
                { name: 'path', value: "PosixPath('visitors.txt')", tone: 'ptr' },
                { name: 'f', value: "<TextIOWrapper mode='w'>  buffer: 6 ch", tone: 'io' },
              ],
              output: 'f.write("Ada 42\\\\n") -> 6        file on disk: 0 bytes',
            },
            {
              caption: 'Second write, same buffer',
              note: 'Nothing has been flushed, because 14 characters is far below the 8192-byte buffer size. A file being "written" and a file containing data are different states.',
              line: 6,
              vars: [
                { name: 'path', value: "PosixPath('visitors.txt')", tone: 'ptr' },
                { name: 'f', value: "<TextIOWrapper mode='w'>  buffer: 14 ch", tone: 'io' },
              ],
              output: 'f.write("Grace 37\\\\n") -> 8      file on disk: 0 bytes',
            },
            {
              caption: 'The with-block exits, so close() runs and flushes',
              note: 'This is the step that makes the previous two steps safe. Leaving the with-block on any path — including an exception — flushes the buffer and releases the file descriptor.',
              line: 8,
              vars: [{ name: 'path', value: "PosixPath('visitors.txt')", tone: 'ptr' }],
              output: 'close() flushed 14 chars -> visitors.txt = "Ada 42\\nGrace 37\\n"',
            },
            {
              caption: 'readline() consumes the first line, newline included',
              note: 'Universal newlines means the carriage-return-plus-line-feed pair that Windows writes is delivered to you as a single line feed. len() is 7, not 8, on every platform.',
              line: 9,
              vars: [
                { name: 'path', value: "PosixPath('visitors.txt')", tone: 'ptr' },
                { name: 'first', value: "'Ada 42\\n'   (7 chars)", tone: 'ok' },
              ],
              output: 'first = "Ada 42\\\\n"      7 characters',
            },
            {
              caption: 'readlines() drains the rest and lands on EOF',
              note: 'A second variable, same stream. The position is now at end-of-file, so any further read returns "" until you seek(0) or reopen.',
              line: 10,
              vars: [
                { name: 'path', value: "PosixPath('visitors.txt')", tone: 'ptr' },
                { name: 'first', value: "'Ada 42\\n'   (7 chars)", tone: 'ok' },
                { name: 'rest', value: "['Grace 37\\n']", tone: 'ok' },
              ],
              output: 'rest = ["Grace 37\\\\n"]       position: EOF',
            },
            {
              caption: 'Both lengths come from the strings, not the file',
              note: 'len(first) is 7 because the newline counts. len(rest) is 1 because readlines() returns a list of one element.',
              line: 12,
              vars: [
                { name: 'path', value: "PosixPath('visitors.txt')", tone: 'ptr' },
                { name: 'first', value: "'Ada 42\\n'   (7 chars)", tone: 'ok' },
                { name: 'rest', value: "['Grace 37\\n']", tone: 'ok' },
              ],
              output: '7 1',
            },
          ],
        }),
        b.lead('pathlib: the modern API, and the one to reach for'),
        b.md(`The \`os.path\` functions are string-surgery helpers from an era when \`os.path\` *was* the filesystem interface. \`pathlib\` replaces them with small objects that carry the operations as methods, and it composes: \`/\` builds a new path, so you never concatenate with \`+\` or write \`"../"\` by hand.`),
        b.code(`from pathlib import Path

data_dir = Path("data") / "2026" / "09"
data_dir.mkdir(parents=True, exist_ok=True)

report = data_dir / "summary.txt"
report.write_text("rows: 41\\nerrors: 0\\n", encoding="utf-8")

print(report.exists(), report.stat().st_size)
# True 19

for entry in sorted(data_dir.glob("*.txt")):
    print(entry.name, entry.stat().st_size, "bytes")
# summary.txt 19 bytes

print(Path("report.pdf").with_suffix(".json"))   # report.json
print(Path(".").iterdir())                      # every child, as Path objects`, 'make_dirs.py'),
        b.md(`The mapping you need:

| What you want | \`pathlib\` | \`os.path\` equivalent |
| --- | --- | --- |
| whole text out | \`p.read_text(encoding="utf-8")\` | no direct equivalent |
| whole text in | \`p.write_text(s, encoding="utf-8")\` | no direct equivalent |
| line-by-line | \`p.open(encoding="utf-8")\` | \`open(p)\` |
| does it exist | \`p.exists()\` | \`os.path.exists(p)\` |
| make a directory | \`p.mkdir(parents=True, exist_ok=True)\` | \`os.makedirs(p, exist_ok=True)\` |
| list children | \`p.iterdir()\` | \`os.listdir(p)\` |
| glob | \`p.glob("**/*.txt")\` | \`glob.glob(str(p / "**" / "*.txt"), recursive=True)\` |
| delete a tree | \`shutil.rmtree(p)\` | \`shutil.rmtree(p)\` |

The one real ergonomic difference: \`Path.open("w", encoding="utf-8")\` is exactly \`open(path, "w", encoding="utf-8")\`, just as an object you already have. So \`pathlib\` does not remove \`open()\`; it removes the string-manipulation around it.

The other difference worth naming: \`Path.read_text()\` with no argument honours the locale, while \`json\` and \`tomllib\` and every other text format in the standard library assume UTF-8. Passing \`encoding="utf-8"\` explicitly keeps you in step with all of them.`),
        b.warn(
          'The three file bugs you will actually hit',
          '1) Opening with "w" on a file you meant to extend, which erases it with no warning. 2) Forgetting `encoding="utf-8"`, which works on your machine and fails in CI or on a colleague\'s Windows box. 3) Calling `read()` after `readline()` and being baffled that you got everything from the current position onward — file objects have a cursor and it does not reset.'
        ),
        b.tip(
          'When you genuinely want speed',
          'Text mode decodes and re-encodes on every read and write. For multi-gigabyte files, reading in fixed-size binary chunks and decoding each chunk yourself is measurably faster: `with p.open("rb") as f: while chunk := f.read(1 << 20): process(chunk.decode("utf-8"))`. Measure it — the crossover depends on your line length and your disk.'
        ),
        b.info(
          'Atomic writes: how you avoid a half-written file',
          'A crash between the truncate and the flush leaves you with an empty file where your data used to be. The fix is to write to a temporary file in the same directory and rename it over the original, because `os.replace` is atomic on POSIX and on Windows: write to `name.tmp`, then `os.replace(tmp, name)`. Do not skip it on Windows because of antivirus scanners — it still works, and it is the difference between a crash and data loss.'
        ),
      ],
      questions: [
        [
          'You run `open("report.csv", "w", encoding="utf-8")` on a file that already has 5,000 rows. What happens, and when?',
          [
            'The new rows are appended after the existing ones',
            'The file is truncated to zero bytes the moment open() returns, before any of your writes',
            'The file is truncated when the first write exceeds the 8 KB buffer',
            'The file is truncated when the file object is garbage collected',
          ],
          1,
          'Mode "w" truncates during open(), not on first write. That is why an exception between open() and the first write has already cost you the old file. If you want to keep the old contents while writing, use "a" (always writes at the end) or write to a temp file and os.replace it over the original.',
        ],
        [
          'Why does the `with open(...) as f:` idiom exist rather than people just remembering to call close()?',
          [
            'close() is slow, and `with` batches it',
            'Because cleanup must happen even when an exception or an early return unwinds the block, and `with` guarantees it',
            'Because `open()` without it leaks the file descriptor permanently',
            'It is purely stylistic and PEP 8 recommends it',
          ],
          1,
          'A hand-written close() is skipped by any non-local exit — exception, return, break, raise inside a called function. __exit__ runs on all of those paths, which is what makes the cleanup unconditional rather than a thing you must remember.',
        ],
        [
          'You have read a file to the end with read() and now need the first ten lines again. What must you do?',
          [
            'Nothing — read() rewinds to the start automatically',
            'Call f.seek(0), because the stream position stays at end-of-file once you reach it',
            'Call f.close() and reopen with mode "r+"',
            'Call f.readlines(10)',
          ],
          1,
          'A file object is a stream with a cursor. Reaching EOF leaves the cursor at the end and every subsequent read returns "" — that empty string is the main reason "my loop only ran once" bugs happen. seek(0) rewinds a seekable stream (any regular file is seekable; stdin and a socket may not be).',
        ],
        [
          'Which pair of choices makes a copy operation corrupt a binary file such as an image or a .zip?',
          [
            'Using mode "rb" and "wb"',
            'Using text mode ("r" and "w") with no encoding argument, so the bytes get decoded and newline-translated',
            'Using mode "x" instead of "w"',
            'Using a larger buffer size',
          ],
          1,
          'Text mode applies an encoding and universal-newline translation, neither of which is meaningful for arbitrary bytes. Either pass "b" in the mode, or use shutil.copyfile, which does exactly that for you.',
        ],
      ],
    },
    {
      title: 'Serialising data: JSON and CSV',
      summary: 'Why text formats win, what survives a JSON round trip, the traps (tuples, NaN, dates), and correct CSV writing.',
      duration: 17,
      build: (b) => [
        b.md(`## Why text formats

Everything in this lesson is about **interchange**: getting an object out of one process and into another, possibly on another machine, possibly in three years when the language has moved on.

A binary serialisation — Python's own \`pickle\`, or \`.parquet\`, or \`.sqlite\` — is smaller and faster. But it binds you to a language version and to the code that produced it. A JSON file written today can be read by JavaScript, Go, a shell script with \`jq\`, a database's \`json\` column, and the next version of your own program. That property is worth a lot of bytes, and it is why text formats are the default for anything crossing a boundary.`),
        b.md(`\`\`\`bash
# The single most useful command for inspecting what a program wrote.
cat settings.json | jq .
# Or, on a machine with Python and nothing else:
python3 -m json.tool settings.json
\`\`\``),
        b.md(`## The whole JSON API in four calls`),
        b.code(`import json

record = {
    "name": "visitors.csv",
    "rows": 2,
    "encoding": "utf-8",
    "checksum": None,
    "verbose": False,
}

text = json.dumps(record, indent=2, sort_keys=True)
print(text)

back = json.loads(text)
print(back["rows"], type(back["rows"]))`, 'json_round_trip.py'),
        b.md(`\`\`\`text
{
  "checksum": null,
  "encoding": "utf-8",
  "name": "visitors.csv",
  "rows": 2,
  "verbose": false
}
2 <class 'int'>
\`\`\`

- \`json.dumps(obj)\` — Python object to \`str\`.
- \`json.loads(str)\` — \`str\` back to a Python object. It takes a **string**, not a file object, which trips people up constantly; if you have a file, pass \`json.load(f)\` which does the read for you.
- \`indent=2\` — pretty-print. Costs bytes, buys a diffable file and a human who can fix a broken config by hand. Use it for anything committed to git.
- \`sort_keys=True\` — stable key order, so a file with no semantic change produces no diff. This one line eliminates a whole class of noisy code review.
- \`ensure_ascii=False\` — keep non-ASCII characters as themselves instead of escaping to \`\\uXXXX\`. Human-readable and smaller for most non-English text; only matters if a downstream consumer cannot handle UTF-8.

## What survives the round trip, and what does not

This table is the whole lesson. JSON has seven types. Everything else you will try to serialise is either converted, rejected, or silently changed.`),
        b.table(
          'Type → JSON → back again',
          ['Python value', 'json.dumps produces', 'json.loads returns', 'Lossy?'],
          [
            ['`42`', '`42`', '`int` 42', 'no'],
            ['`3.5`', '`3.5`', '`float` 3.5', 'no, but a large float may lose precision through the text form'],
            ['`"Ada"`', '`"Ada"`', '`str` "Ada"', 'no'],
            ['`True` / `False`', '`true` / `false`', '`bool`', 'no'],
            ['`None`', '`null`', '`None`', 'no'],
            ['`[1, 2]`', '`[1, 2]`', '`list`', 'no'],
            ['`(1, 2)`', '`[1, 2]`', '`list` [1, 2]', '**yes — the tuple is gone**'],
            ['`{"a": 1}`', '`{"a": 1}`', '`dict` (string keys only)', '**yes — int keys become strings**'],
            ['`{1, 2}`', '`TypeError`', '—', 'set is not JSON-serialisable'],
            ['bytes', '`TypeError`', '—', 'must be base64 or hex encoded first'],
            ['`datetime(2026, 9, 29)`', '`TypeError`', '—', 'call `.isoformat()` yourself'],
            ['`float("nan")`', '`NaN` (invalid JSON)', '`float nan`', '**yes — strict parsers reject the file**'],
            ['`complex(1, 2)`', '`TypeError`', '—', 'no JSON type for it'],
          ]
        ),
        b.md(`## Four traps that cost real debugging time

**1. Tuples become lists, permanently.** Round-tripping a config file through JSON will silently convert every tuple into a list. Code that then does \`point[0] = 5\` or unpacks into three names behaves differently. This is not a bug in \`json\`; JSON has no tuple.

**2. \`NaN\`, \`Infinity\` and \`-Infinity\` are not JSON.** Python's encoder emits them anyway (it follows JavaScript's number grammar), and its own decoder accepts them back. The strict RFC 8259 grammar does not include them. So a file written by Python with a NaN in it is *not readable by a strict JSON parser in another language*, and the error you get there names the offending character and its offset. Fix it at the boundary with \`json.dumps(..., allow_nan=False)\`, which raises \`ValueError\` in Python instead of producing a file other languages cannot read.

**3. Dictionary keys must be strings.** \`json.dumps({1: "a"})\` succeeds and produces a file with the key as a string. Reading it back gives you a string key, so \`d[1]\` raises \`KeyError\`. Convert your keys first, or use \`str(k)\` explicitly so the transformation is visible in your code.

**4. There is no comment syntax and no trailing comma.** JSON has exactly one value, and that value must be the entire file. A hand-edited config with a comment in it produces an "Expecting value" error at line 1 column 1. If you want comments in a config file, that is a signal you want a different format — \`tomllib\` for reading, \`configparser\` for INI.`),
        b.lead('A round trip that actually works'),
        b.code(`import json
from pathlib import Path


def save_report(rows, path):
    """Write rows as UTF-8 JSON, one stable file."""
    path = Path(path)
    path.write_text(
        json.dumps(rows, indent=2, sort_keys=True) + "\\n",
        encoding="utf-8",
    )


def load_report(path):
    text = Path(path).read_text(encoding="utf-8")
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError(f"expected a list of rows, got {type(data).__name__}")
    return data


report = [
    {"name": "ada", "visits": 42, "active": True},
    {"name": "grace", "visits": 37, "active": False},
]

save_report(report, "report.json")
loaded = load_report("report.json")
print(loaded == report)             # True
print(type(loaded[0]["visits"]))    # <class 'int'>`, 'safe_round_trip.py'),
        b.md(`Two things in there are deliberate and both are the kind of thing a reviewer should ask for: the **validate after load** step, because a file on disk can be edited by a human and \`json.loads\` will happily return a dict when your code expected a list; and the **trailing newline**, because POSIX text files end in one and it stops every diff tool and every shell pipeline from complaining.

## CSV: the format that is genuinely fiddly

\`csv\` exists in the standard library and you should still use it rather than \`line.split(",")\`, because it handles the three things that break naive splitting: quoting, embedded newlines, and dialects with a different delimiter.`),
        b.code(`import csv
from pathlib import Path

path = Path("people.csv")

# Reading. DictReader uses the header row to name the fields for you.
with path.open(newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
print(rows[0]["name"], rows[0]["visits"])

# Writing. newline="" is mandatory, and the reason is subtle but important.
with path.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "visits", "active"])
    writer.writeheader()
    writer.writerows(rows)`, 'read_write_csv.py'),
        b.md(`\`newline=""\` on **both** sides, always. Text mode normally translates a line feed into \`os.linesep\` on write and back on read. The \`csv\` module does its own quoting, and if the file layer is also translating newlines you get doubled carriage returns on Windows and corrupt round trips. Passing \`newline=""\` hands newline handling entirely to \`csv\`, which is the only layer that understands the format. This is the rule that gets forgotten, and the bug shows up as a file that works on Linux and breaks on Windows.

Three more CSV facts worth having:

- \`DictReader\` puts the leftover columns under the key \`None\` as a list. That is how you detect a malformed row with more fields than the header.
- A row with *fewer* fields than the header gets \`None\` for the missing keys, so \`int(row["visits"])\` raises \`TypeError\` on the missing one rather than a clear "row is short" message.
- \`csv.DictWriter\` raises \`ValueError: dict contains fields not in fieldnames\` on extra keys. That strictness is a feature: it means your source dict and your header cannot drift apart silently.`),
        b.anim('step', {
          title: 'What a JSON round trip actually does',
          steps: [
            {
              title: 'You start with a real object',
              desc: 'Not a JSON document — a set of live Python objects: a dict holding a list, which holds dicts, which hold ints, bools and None. The structure is arbitrary and can nest as deeply as you like.',
              code_snippet: 'report = [\n    {"name": "ada",    "visits": 42, "active": True},\n    {"name": "grace", "visits": 37, "active": False},\n]',
            },
            {
              title: 'dumps walks the object recursively',
              desc: 'For every value it asks "is there a JSON type for this?". Integers, floats, strings, bools, None, lists and dicts map directly. Everything else raises TypeError — including sets, bytes, datetimes and complex numbers, which is why real code calls .isoformat() or base64 first.',
              code_snippet: 'text = json.dumps(report, indent=2, sort_keys=True)',
            },
            {
              title: 'You get text, and text is the whole point',
              desc: 'UTF-8 JSON with sorted keys and a stable two-space indent. It diffs cleanly, it is readable without the producing program, and any language can read it. That portability is what you are paying the extra bytes for.',
              code_snippet: '[\n  {\n    "active": true,\n    "name": "ada",\n    "visits": 42\n  },\n  {\n    ...\n  }\n]',
            },
            {
              title: 'loads walks it back, and the types are reconstructed',
              desc: 'true becomes True, null becomes None, 42 comes back as int and 3.5 as float. This is the part that always works.',
              code_snippet: 'back = json.loads(text)\nback[0]["visits"]   # 42  -> <class \'int\'>',
            },
            {
              title: 'And this is the part that does not',
              desc: 'A tuple was written as [1, 2] because JSON has no tuple type, so it comes back as a list. Integer dict keys were written as "1" because JSON object keys are strings, so they come back as strings. NaN round-trips inside Python and is rejected by every strict parser outside it. Test your assumptions with equality after a round trip, not by eye.',
              code_snippet: 'json.loads(json.dumps((1, 2)))   # [1, 2]  not (1, 2)\njson.loads(json.dumps({1: "a"}))  # {"1": "a"}  not {1: "a"}',
            },
          ],
        }),
        b.warn(
          'Never unpickle data you did not create',
          '`pickle.loads` executes arbitrary code inside your process by design — that is how it reconstructs objects. A pickle file is a program, not a document. Load pickles only from sources you would trust to run as code, which in practice means: your own machine, your own CI artifacts, and files a user explicitly pointed at.'
        ),
        b.tip(
          'Two settings worth turning on from day one',
          '`json.dumps(obj, allow_nan=False)` turns a file that other languages cannot parse into a ValueError you can catch at the boundary. `json.dumps(obj, default=...)` lets you teach it about your own types — usually a one-liner: `default=lambda o: o.isoformat() if isinstance(o, datetime) else None`.'
        ),
        b.info(
          'When not to use JSON',
          'If you need to preserve tuples, sets, bytes or exact float bit patterns, JSON is the wrong tool: use `pickle` (trusted data only), `msgpack` (compact, typed), or `tomllib` plus `tomli-w` for configuration where comments matter and the schema is simple.'
        ),
      ],
      questions: [
        [
          'What does `json.loads(json.dumps((1, 2)))` return?',
          [
            '`(1, 2)` — a tuple',
            '`[1, 2]` — a list, because JSON has no tuple type',
            'It raises TypeError',
            'It returns `{"0": 1, "1": 2}`',
          ],
          1,
          'The encoder writes any sequence as a JSON array, which the decoder has no way to know was a tuple. Round-tripping configuration through JSON is therefore lossy for tuples, and code that relied on tuple immutability or on slicing semantics comes back subtly different.',
        ],
        [
          'Why must you pass `newline=""` when writing CSV with the csv module?',
          [
            'It makes the output use a line feed instead of a carriage-return-plus-line-feed pair on Windows',
            'Text mode would otherwise translate newlines on write and read back, doubling them and corrupting quoted fields that contain embedded newlines',
            'It is required so the csv module knows to quote fields',
            'It speeds up writing large CSVs considerably',
          ],
          1,
          'The csv module implements the quoting and record layout itself, including multi-line quoted fields. If the file layer also translates newlines, those records get extra characters inserted and the round trip stops being stable. newline="" means "the csv layer owns newlines".',
        ],
        [
          'A Python program writes a JSON file containing NaN. Another system, written in Go or Rust, fails to parse it. Why?',
          [
            'The other system does not support floating point numbers',
            'NaN and Infinity are not part of the JSON grammar, even though Python\'s encoder emits them by default',
            'Python writes them as integers, so the other system sees a type mismatch',
            'The other system requires indent=2',
          ],
          1,
          'Python\'s json module follows a JavaScript-flavoured grammar that permits NaN and Infinity, and its own decoder accepts them back — which hides the problem in testing. Strict parsers elsewhere reject the document. json.dumps(..., allow_nan=False) makes Python raise instead of producing a file nobody else can read.',
        ],
        [
          'What does `json.dumps({"a": 1, 2: "b"})` do?',
          [
            'Raises TypeError because JSON keys must be strings',
            'Succeeds and produces {"a": 1, "2": "b"}, silently converting the integer key',
            'Succeeds and produces {"a": 1, 2: "b"}',
            'Drops the entry with the integer key',
          ],
          1,
          'The encoder coerces keys with str() rather than complaining, so the file is valid and the round trip is lossy: the key comes back as the string "2" and d[2] raises KeyError. Validating or converting your keys before dumping makes the loss visible.',
        ],
      ],
    },
    {
      title: 'Modules, imports and packages',
      summary: 'Import forms, sys.path, the __main__ guard, relative imports, packages, python -m, caching and circular imports.',
      duration: 20,
      build: (b) => [
        b.md(`## What a module is

A module is a **file** that Python has executed and whose namespace it has kept. That is the entire definition — there is no separate concept of a module for \`math\` versus for \`accounts.py\`. When the import machinery finishes, it hands you back an object with a \`__dict__\`, and that object is the module.`),
        b.code(`import math

print(math.__name__)          # 'math'
print(math.__file__)          # '/usr/lib/python3.12/math.py'
print(len(math.__dict__))     # 40-ish: every public and private name
print(sorted(math.__all__)[:6])
# ['__doc__', '__loader__', '__name__', '__package__', '__spec__', 'acos']`, 'what_is_a_module.py'),
        b.md(`Because a module is just an object, you can do things to it that surprise people coming from C — including removing names from it, which is legal and which you should never do in a real program. It is here to make the point that there is nothing magic about a module beyond "executed file with a namespace".

## The four import forms, and when each is right

| Form | Binds | Cost | Reach for it when |
| --- | --- | --- | --- |
| \`import validators\` | the **module** as \`validators\` | you must prefix every use | the module has many names you use often; it reads better qualified |
| \`import validators as v\` | the module as \`v\` | same | the module name is long or clashes with a local variable |
| \`from validators import check\` | the **function** as \`check\` | extra bytes on every use of that name | you use one or two names from the module |
| \`from validators import *\` | everything public | pollutes the namespace | essentially never |

The anti-pattern worth naming is \`import *\`. It silently shadows your own names, hides where a function came from, breaks static analysis, and — for a module with no \`__all__\` — imports names beginning with an underscore too. A real traceback where the offending line is \`x = min(...)\` and the bug is a \`min\` from a wildcard-imported module has taken hours off people.

\`from x import y\` also has a genuine performance cost, and it is the reason for a rule you will meet in every Python codebase: **import modules at the top of the file, not inside functions or loops.** \`from os import path\` inside a hot function runs a \`sys.modules\` dictionary lookup and a \`getattr\` on every call; \`import os\` at the top binds a name once and turns \`os.path\` into a single attribute access on a local or global slot.

## Where Python looks: sys.path

\`import json\` makes Python walk a list of directories called \`sys.path\`. The list is built from, in order:

1. the directory containing the script you ran (or the working directory in the REPL),
2. \`PYTHONPATH\` entries,
3. the stdlib directory,
4. \`site-packages\` from every \`.pth\` file and virtual environment on the path.`),
        b.md(`\`\`\`bash
python3 -c "import sys; [print(p) for p in sys.path]"
\`\`\``),
        b.md(`\`\`\`text
/srv/app                      <- the script's directory, searched FIRST
/home/dev/study
/usr/lib/python312.zip
/usr/lib/python3.12
/usr/lib/python3.12/lib-dynload
/home/dev/study/.venv/lib/python3.12/site-packages
\`\`\`

The first entry is why \`import mymodule\` works when you run \`python3 app.py\` from the project folder and mysteriously fails once you move the file. It is also the mechanism behind most "shadowed by a local file" bugs: if you have a file called \`random.py\` in your project, it wins over the stdlib's \`random\` for that run, and the error you get is about a missing attribute deep inside an unrelated library.

## The __name__ guard

Every module has a \`__name__\` attribute. It is \`"__main__"\` when Python executed that module as *your program*, and it is the dotted path (\`"validators"\`, \`"pkg.helpers"\`) when Python executed it because something else imported it. That difference is the entire purpose of the guard:`),
        b.code(`# validators.py
from collections import Counter


def summarise(words):
    return Counter(w.lower() for w in words).most_common(3)


def _self_test():
    assert summarise("a b a c a") == [("a", 3), ("b", 1), ("c", 1)]


if __name__ == "__main__":
    print(summarise("the quick brown fox jumps over the lazy dog"))
    # [('the', 3), ('brown', 1), ('fox', 1)]`, 'validators.py'),
        b.md(`Without the guard, importing the module would run the \`print\`. That is not a style preference: it means every test that imports your module pays for its top-level side effects, your CLI prints banners during test collection, and any expensive setup (reading a config, opening a database connection, downloading a model) happens on *import* rather than on use. The guard is the standard library's way of letting one file be both a library and a program.

A useful bonus: \`python3 -m validators\` runs the file as \`__main__\` *with the current directory on \`sys.path\`*, which is exactly what you want for a module inside a package. That is the correct way to run your own package's entry point.

## __all__ and what from-import-* obeys

\`__all__\` is a list of names that \`from x import *\` is allowed to bring in. It is a public API declaration, and it is also what documentation tooling reads. If your module defines \`_helper\`, \`VERSION\`, and \`summarise\`, and only \`summarise\` is meant to be public, say so with \`__all__ = ["summarise", "Rule"]\`.

\`__all__\` also matters for \`__init__.py\` in a package: it controls what \`from mypkg import *\` exposes, which is how you decide whether re-exporting is intentional.

## Relative imports and the error everyone hits once

Inside a package, a module can refer to its siblings relatively. The number of leading dots is the number of levels up:

| Written in | Means |
| --- | --- |
| \`from . import helpers\` | the \`helpers\` module in **my own** package |
| \`from .models import Record\` | \`Record\` from \`mypkg/models.py\` |
| \`from ..shared import util\` | from the package **one level above** mine |
| \`from ...top import thing\` | two levels above; keep this out of real code |

The rule of thumb: **absolute for what you install, relative for what you wrote.** If you are importing your own package's internals, a relative import means the code keeps working when someone renames the top-level package or installs two copies of it.

The error message, verbatim, is the one you will see:`),
        b.md(`\`\`\`text
$ python3 validators.py
Traceback (most recent call last):
  File "/srv/app/validators.py", line 3, in <module>
    from .models import Record
ImportError: attempted relative import with no known parent package
\`\`\``),
        b.md(`It means the file was executed as a *script*, not imported as part of a package. A relative import needs to know its package, which comes from \`__package__\`, which is only set when the module was located by the import machinery through a package. Running \`python3 validators.py\` makes \`__name__\` \`"__main__"\` and \`__package__\` empty, so "." has nothing to resolve against. The fix is to not run library files as scripts — run the package entry point with \`python3 -m app.validators\`, or put the entry point in the package's \`__init__.py\` or a dedicated \`__main__.py\`.

## Packages, __init__.py, and namespace packages

A package is a **directory with an \`__init__.py\`** — that is the traditional rule, and the \`__init__.py\` is what tells the finder "this directory is a package, not just somewhere to look for files".`),
        b.md(`\`\`\`text
app/
├── __init__.py          # marks the directory as a package
├── __main__.py          # python3 -m app runs this
├── config.py
└── services/
    ├── __init__.py
    ├── mailer.py
    └── importer.py
\`\`\``),
        b.code(`from app.services.mailer import send          # absolute — works anywhere
from .services.mailer import send            # relative — works only inside app
from app.services import mailer               # binds the module`, 'import_forms.py'),
        b.md(`**Namespace packages** break the rule. Since Python 3.3, a directory with *no* \`__init__.py\` is still importable as a package, as long as several such directories appear on \`sys.path\`. This is how \`~/.local/lib/python3.12/site-packages\` and the system site-packages can both contribute modules without shadowing each other, and it is what makes \`pip install\` "just work" across system and user installs.

The cost of namespace packages is that they have no code — no \`__init__.py\` means no \`__init__.py\` — so you cannot export names, you cannot run code at package init, and tooling that relies on \`__init__.py\` (older linters, some build backends) is unhappy. For a package you author, **ship an \`__init__.py\`**; for a directory of modules you never import as a package, do not add one.

## Caching, and the circular import problem

The very first thing the import system does is check a dictionary called \`sys.modules\`, keyed by module name. A module is executed **once per process, ever**. Every later \`import json\` is a dictionary lookup, which is why \`import math\` inside a million-iteration loop costs nothing.`),
        b.code(`import sys

print("json" in sys.modules)          # False, before you import it
import json
print("json" in sys.modules)          # True
print(json is sys.modules["json"])    # True — the same object, not a copy`, 'module_cache.py'),
        b.md(`The consequence is the circular import. If \`a\` imports \`b\` and \`b\` imports \`a\`, then when \`a\` starts executing it is placed in \`sys.modules\` **before** its body runs (so the name resolves), but its body is only half-finished — any name defined *below* the import statement is not there yet. So \`b\` gets a partially initialised \`a\`, and the error is:

\`\`\`text
AttributeError: module 'a' has no attribute 'Thing'
\`\`\`

The three fixes, in order of preference:

1. **Move the shared code into a third module** that neither imports the other. This is the actual solution; everything else is a workaround.
2. **Move the import down**, inside the function that needs it, so the cycle is broken at module-init time.
3. **Import the module, not the name**: \`import a\` and use \`a.Thing\` at call time, rather than \`from a import Thing\`, which snapshots the value at that moment.`),
        b.code(`# b.py — the deferred import breaks the cycle at init time
def helper():
    from a import Thing        # by call time, a is fully initialised
    return Thing


# a.py — imports b at the top, safely
from b import helper


class Thing:
    def run(self):
        return helper()        # only touched when run() is called`, 'circular_fix.py'),
        b.md(`An import cycle is a design signal. The dependency graph has a cycle in it, and the fix is almost always to pull the shared piece out into its own module.`),
        b.anim('pipeline', {
          title: 'What import validators actually does',
          badge: 'import machinery',
          stages: [
            {
              name: 'Statement',
              tool: 'import',
              in: 'import validators',
              out: 'the name "validators"',
              detail:
                'The statement is compiled to an IMPORT_NAME opcode carrying the module name and a fromlist. Python first checks sys.modules — the caching stage means this whole pipeline only runs once per process.',
              tone: 'code',
            },
            {
              name: 'Search',
              tool: 'sys.path',
              in: 'the name "validators"',
              out: 'a ModuleSpec',
              detail:
                'Each entry of sys.path is tried in order: the script directory, PYTHONPATH, the stdlib, site-packages. The FileFinder for each directory returns a spec describing what it found — which loader to use, which file it came from, and whether it is a package.',
              tone: 'int',
            },
            {
              name: 'Create',
              tool: 'module_from_spec',
              in: 'a ModuleSpec',
              out: 'an empty module object',
              detail:
                'The loader creates a module and registers it in sys.modules BEFORE any of its code runs. That early registration is what makes recursive imports terminate, and it is also why a circular import hands you a half-built module instead of a second copy.',
              tone: 'data',
            },
            {
              name: 'Execute',
              tool: 'exec_module',
              in: 'an empty module object',
              out: 'a populated namespace',
              detail:
                'The loader compiles validators.py to bytecode and runs it, which populates module.__dict__. Every name assigned at the top level lands here. If anything raises, the entry is pulled out of sys.modules again and the exception propagates.',
              tone: 'warn',
            },
            {
              name: 'Bind',
              tool: 'STORE_NAME',
              in: 'a populated namespace',
              out: 'validators in your globals',
              detail:
                'The import statement finishes by binding a name in the calling frame. `import validators` binds the module; `from validators import check` binds one attribute out of it — which is why the second form re-does a getattr on every use.',
              tone: 'ok',
            },
            {
              name: 'Cache',
              tool: 'sys.modules',
              in: 'validators in your globals',
              out: 'a dict hit from now on',
              detail:
                'Every later `import validators` anywhere in the process is one dictionary lookup. This is why importing inside a function is not free, and why circular imports produce "module has no attribute" rather than infinite recursion.',
              tone: 'heap',
            },
          ],
          artifacts: {
            'import validators': 'IMPORT_NAME  validators\n  level = 0\n  fromlist = None',
            'a ModuleSpec': "ModuleSpec(name='validators',\n        loader=<class '_frozen_importlib_external.SourceFileLoader'>,\n        origin='/srv/app/validators.py',\n        submodule_search_locations=None,\n        has_location=True)",
            'a populated namespace': "Traceback (most recent call last):\n  File \"/srv/app/main.py\", line 2, in <module>\n    import validators\n  File \"/srv/app/validators.py\", line 1, in <module>\n    import settings\nModuleNotFoundError: No module named 'settings'",
            'a dict hit from now on': ">>> sys.modules['validators']\n<module 'validators' from '/srv/app/validators.py'>\n>>> import validators as v2\n>>> v2 is validators\nTrue",
          },
        }),
        b.diagram(
          'How Python resolves an import',
          `flowchart TD
    A["import validators"] --> B{"'validators' in sys.modules?"}
    B -- "yes" --> Z["Return the cached module"]
    B -- "no" --> C["Walk sys.path in order<br/>script dir → PYTHONPATH → stdlib → site-packages"]
    C --> D{"A candidate found?"}
    D -- "no" --> E["ModuleNotFoundError<br/>with the full search path in the message"]
    D -- "yes: a directory" --> F["Package<br/>__init__.py, or a namespace portion"]
    D -- "yes: a .py file" --> G["ModuleSpec<br/>loader + origin + location"]
    F --> G
    G --> H["module_from_spec<br/>empty module, registered in sys.modules"]
    H --> I{"Extension (.so / .pyd)?"}
    I -- "yes" --> J["Call the init function directly<br/>no Python body to execute"]
    I -- "no" --> K["Read source → compile to bytecode<br/>reused from __pycache__"]
    K --> L["exec_module<br/>the body runs, __dict__ fills"]
    J --> L
    L --> M{"Raised?"}
    M -- "yes" --> N["Remove from sys.modules<br/>re-raise with the full traceback"]
    M -- "no" --> O["Bind the name in the caller<br/>import x / from x import y"]
    O --> P["sys.modules keeps it<br/>every later import is a dict lookup"]`
        ),
        b.checklist('Before you file a bug about imports', [
          'Run `python3 -c "import sys; print(sys.path[0])"` — is the directory you expect actually first?',
          'Check `python3 -m pip --version` and `python3 -c "import sys; print(sys.executable)"` point at the same environment',
          'Search for a local file that shadows a stdlib name (`random.py`, `types.py`, `json.py`, `email.py`)',
          'Never run a library file with `python3 foo.py` if it uses relative imports — use `python3 -m package.foo`',
          'Put `if __name__ == "__main__":` around anything that runs, prints, or connects at import time',
          'If you have hit a circular import, extract the shared module rather than deferring the import',
          'Declare `__all__` in modules that others import from, and never use `from x import *` in a real file',
        ]),
        b.resources('The import system, from the source', [
          { label: 'Python reference — the import system', url: 'https://docs.python.org/3/reference/import.html' },
          { label: 'PEP 328 — imports with explicit relative names', url: 'https://peps.python.org/pep-0328/' },
          { label: 'PEP 420 — namespace packages', url: 'https://peps.python.org/pep-0420/' },
          { label: 'Python Packaging User Guide — structuring your project', url: 'https://packaging.python.org/en/latest/tutorials/packaging-projects/' },
        ]),
        b.tip(
          'A layout that scales past a dozen files',
          'Put code in `src/`, tests in `tests/`, one top-level package directory inside `src/`, and use absolute imports everywhere inside it plus a `pyproject.toml` that declares the entry points. If you find yourself writing `sys.path.append(...)` anywhere, the layout is fighting you and `pip install -e .` is the fix.'
        ),
      ],
      questions: [
        [
          'Why does `python3 validators.py` fail with "attempted relative import with no known parent package" while `python3 -m app.validators` works?',
          [
            'The -m flag compiles the file differently',
            'A relative import needs __package__, which is only set when the file is located by the import machinery as part of a package; running it as a script leaves __package__ empty',
            'Relative imports are removed in Python 3 and must be rewritten as absolute ones',
            'The -m flag adds the package directory to sys.path and the script form does not',
          ],
          1,
          '"." is resolved relative to __package__. When Python runs a file directly, the module is __main__ and has no package, so there is nothing for the leading dot to anchor to. Running the module through the import system (via -m) sets __package__ correctly and also puts the current directory on sys.path.',
        ],
        [
          'Why is `from x import *` discouraged in library code?',
          [
            'It is slower than other import forms',
            'It copies unknown names into your namespace, shadowing your own variables and hiding where a name came from',
            'It only imports public names, which is what makes it unpredictable',
            'It requires x to be a package',
          ],
          1,
          'The wildcard import binds whatever __all__ lists — or, without __all__, every name not starting with an underscore — at import time. Those names then compete with your locals and globals, so a subtle bug can come from `min`, `input` or `id` being something other than the builtin you expected. Static analysers cannot see where any of it came from.',
        ],
        [
          'Module a imports module b, and b imports module a at the top level. Both are run. What does b see?',
          [
            'A second, complete copy of module a',
            'Module a registered in sys.modules but only partially executed, so names defined after the import statement in a are missing',
            'An ImportError is raised immediately',
            'Nothing — Python detects the cycle and skips the second import',
          ],
          1,
          'a is inserted into sys.modules before its body runs, which is what stops infinite recursion. When b imports a it gets that partially initialised object, and an attribute error on a name below the import statement is the classic symptom. The fix is to extract the shared code into a third module that neither imports the other.',
        ],
        [
          'What is the practical difference between `import validators` and `from validators import check` in the hot path?',
          [
            'There is none; they compile to the same thing',
            '`from x import y` binds a single value once, while `import x` binds the module and each use is an attribute lookup on it',
            '`import x` copies the whole module into your namespace',
            '`from x import y` is faster because it skips sys.modules',
          ],
          1,
          'Both pay the same one-time cost of executing the module. Afterwards `from x import y` gives you a name bound directly in your frame — very cheap to read. `import x` gives you one name and requires an attribute lookup for each use of x.y, and those lookups happen on every single call. That is why the common guidance is to import modules at the top and use them qualified.',
        ],
      ],
    },
  ]
);
