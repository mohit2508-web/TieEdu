// Module 13 — The standard library, and how to prove the code works.
// Two halves. The first is a lookup table for "which module do I already have
// for this?" so nobody writes a regex parser or an HTTP client from scratch
// again. The second is testing: what a test is for, why a bare assert is not
// enough in production, and the discipline that keeps a suite worth running.

import { mod } from '../blocks';

export const M13 = mod(
  'crs-python-programming',
  'py-m13',
  13,
  'Module 13 — The Standard Library and Testing',
  'The modules you will actually reach for, the collections and itertools toolbox, and a real test suite with its output.',
  [
    {
      title: 'Everyday modules',
      summary: 'pathlib, os and shutil, timezone-aware datetimes, random versus secrets, argparse, subprocess and urllib, sys.',
      duration: 18,
      build: (b) => [
        b.md(`## The rule this module exists to teach

**Before you write a utility, check whether it is already in the standard library.** Python ships roughly 200 modules covering files, dates, archives, compression, HTTP, email, calendars, statistics, decimal arithmetic, unicode normalisation, and more. Most of what people install a dependency for is in there, correctly implemented and tested against two decades of edge cases.

The rule has one important caveat: knowing a module exists is different from knowing which one to pick. The lookup table below is the "which one" part.`),
        b.table(
          'Task → module',
          ['The task', 'Reach for', 'The one thing to know'],
          [
            ['Paths, joining, globbing, reading text', '`pathlib`', 'Pure string manipulation until you actually touch the disk; `/` composes'],
            ['List a directory with sizes and types', '`os.scandir()`', 'Returns an iterator of DirEntry; `entry.is_dir()` is a cached stat on most platforms'],
            ['Copy, move, delete trees; make archives', '`shutil`', '`shutil.rmtree` is the only sane recursive delete'],
            ['Environment variables', '`os.environ`', 'A mapping; changing it does not change an already-started child process'],
            ['Dates, times, durations', '`datetime`', 'Store timezone-aware datetimes; naive ones compare with an error'],
            ['The clock, sleeping, benchmarking', '`time`', '`time.monotonic()` for durations, `time.time()` only for a wall-clock timestamp'],
            ['Shuffling, sampling, random numbers', '`random`', 'Mersenne Twister — reproducible with a seed, and **not** cryptographically secure'],
            ['Tokens, passwords, keys', '`secrets`', 'Same interface as `random`, drawn from the OS entropy pool'],
            ['Command-line arguments', '`argparse`', 'Declarative: types, defaults, help text and validation from one declaration'],
            ['Running another program', '`subprocess`', 'Pass a list, never `shell=True`; always set `check=True` or inspect the return code'],
            ['An HTTP GET or POST', '`urllib.request`', 'No dependency; always pass `timeout=` and a `User-Agent`'],
            ['argv, exit code, stdout/stderr', '`sys`', '`sys.exit(0)` for success, `sys.exit(2)` for a usage error'],
            ['Identifiers that must not collide', '`uuid`', '`uuid.uuid4()` is random; `uuid.uuid1()` leaks your MAC address'],
            ['Zip and tar archives', '`zipfile`, `tarfile`', 'Use `shutil.make_archive` unless you need per-member control'],
            ['Recurring and delayed work', '`sched`, `asyncio`', 'Blocking sleeps are not scheduling'],
          ]
        ),
        b.md(`## Files and directories: pathlib, os.scandir, shutil

\`pathlib\` was covered in module 11. The parts worth adding here are the ones that only appear in real maintenance work:`),
        b.code(`from pathlib import Path


def rotate_logs(directory: Path, keep: int = 5) -> list[Path]:
    """Keep the 'keep' newest matching files; unlink the rest."""
    logs = sorted(
        p for p in directory.glob("app-*.log") if p.is_file()
    )
    doomed = logs[:-keep] if keep > 0 else logs
    for path in doomed:
        path.unlink()
    return doomed


print(rotate_logs(Path("/var/log/app"), keep=2))
print(Path("report.pdf").with_suffix(".json"))      # report.json
print(Path("./a/b/../c.txt").resolve())             # absolute, normalised
print(Path("app").joinpath("services", "mail.py"))  # app/services/mail.py`, 'rotate_logs.py'),
        b.md(`
\`resolve()\` resolves against the **current working directory** and collapses \`..\`, and it does not require the path to exist. \`absolute()\` does not collapse \`..\` but also never touches the disk — if you are on a filesystem where even \`stat\` is expensive or dangerous, use \`absolute()\`.

For listing, \`os.scandir()\` is the fast path and the reason a naive \`os.listdir\` + \`os.path.isdir\` loop is slow:`),
        b.code(`import os

for entry in os.scandir("project"):
    if entry.is_dir():
        print(entry.name, "<dir>")
    elif entry.name.endswith(".py"):
        print(entry.name, entry.stat().st_size, "bytes")
# On Windows and Linux, entry.stat() is cached from the directory read,
# so this loop stats each entry once instead of twice.`, 'scandir.py'),
        b.md(`And \`shutil\` for anything that moves bytes between trees:`),
        b.code(`# The three calls that replace a hundred lines of error handling.
import shutil

shutil.copytree("src", "backup/src", dirs_exist_ok=True)
shutil.rmtree("build", ignore_errors=True)
shutil.make_archive("dist/app-2026-09-29", "gztar", "dist/app")`, 'shutil_calls.py'),
        b.md(`
\`rmtree\` is the only reason to prefer Python over \`rm -rf\` for deletion: it is a single documented call with a clear name, and it fails loudly on a permission problem rather than leaving you to wonder which half-finished state you are in.`),
        b.lead('datetime: the module that will bite you if you are careless'),
        b.md(`There are two kinds of \`datetime\` object and mixing them raises \`TypeError\`:

- **Naive** — \`datetime(2026, 9, 29, 14, 30)\`. It has a date and a time and no idea what time zone it is in.
- **Aware** — \`datetime(2026, 9, 29, 14, 30, tzinfo=timezone.utc)\`. It carries an offset and a zone, so arithmetic and comparison are meaningful.`),
        b.code(`from datetime import datetime, timedelta, timezone

now = datetime.now(timezone.utc)          # aware: the correct default
print(now.isoformat())                   # 2026-09-29T14:30:05.123456+00:00
print(now.tzinfo)                        # datetime.timezone.utc

stamp = now.astimezone(timezone(timedelta(hours=5, minutes=30)))
print(stamp.isoformat())                 # 2026-09-29T20:00:05.123456+05:30

later = now + timedelta(hours=3, minutes=15)
print((later - now).total_seconds())      # 11700.0

when = datetime.fromisoformat("2026-09-29T14:30:05+00:00")   # parse, aware
print(when > now - timedelta(hours=1))    # True

print(datetime(2026, 9, 29, tzinfo=timezone.utc).strftime("%Y-%m-%d %H:%M %Z"))
# 2026-09-29 00:00 UTC`, 'datetime_aware.py'),
        b.md(`
Two traps to know by name:

**1. \`datetime.utcnow()\` is deprecated.** It was deprecated in Python 3.12 because it returns a *naive* object that claims to be UTC — exactly the kind of datetime that causes bugs later. The warning is:

\`\`\`text
DeprecationWarning: datetime.datetime.utcnow() is deprecated and scheduled for
removal in a future version. Use timezone-aware objects to represent datetimes
in UTC: datetime.datetime.now(datetime.UTC).
\`\`\`

The replacement is \`datetime.now(timezone.utc)\`, which returns an aware object. \`datetime.utcfromtimestamp()\` is deprecated for the same reason.

**2. Naive and aware datetimes cannot be compared.** This is not a silent wrong answer; it is a loud one, which is the good case:`),
        b.code(`from datetime import datetime, timezone

try:
    datetime(2026, 9, 29) < datetime.now(timezone.utc)
except TypeError as exc:
    print(exc)
# can't compare offset-naive and offset-aware datetimes`, 'naive_aware.py'),
        b.md(`
**The rule: store aware datetimes in UTC, convert to local only for display.** Anything else means your database rows are incomparable, your API payloads are ambiguous, and somebody eventually subtracts an offset by hand.

One more everyday distinction: \`datetime.now()\` reads the system clock, which can jump backwards if NTP adjusts it. For measuring how long something took, use \`time.monotonic()\`, which cannot:`),
        b.code(`import time

start = time.monotonic()
total = sum(range(1_000_000))
print(f"{time.monotonic() - start:.4f}s")   # 0.0287s — always positive, always right`, 'monotonic.py'),
        b.anim('step', {
          title: 'Choosing a module in five seconds',
          steps: [
            {
              title: '"I need to parse this file"',
              desc: 'Reach for the module that already knows the format. json, csv, configparser, tomllib, zipfile, tarfile, sqlite3, email, xml.etree — a hand-rolled parser is always worse than the one that has been fuzz-tested for fifteen years.',
              code_snippet: 'import json, csv, configparser, tomllib, zipfile\n# there is no reason to write any of these parsers yourself',
            },
            {
              title: '"I need an HTTP request"',
              desc: 'urllib.request is a real client with redirects, cookies, TLS verification, timeouts and gzip. Use it when adding a dependency for a GET is not worth it — which is most of the time. Reach for requests or httpx when you want ergonomics, connection pooling across many calls, or async.',
              code_snippet: 'from urllib.request import Request, urlopen\n\nreq = Request(url, headers={"User-Agent": "tieedu/1.0"})\nwith urlopen(req, timeout=5) as resp:\n    body = resp.read().decode("utf-8")',
            },
            {
              title: '"I need randomness"',
              desc: 'Two different jobs. random is fast, reproducible with a seed, and backed by a Mersenne Twister whose output is entirely predictable from 624 outputs. secrets draws from the operating system entropy pool. Choosing wrong is a security bug, not a style bug.',
              code_snippet: 'import random, secrets\n\nrandom.shuffle(deck)              # fine\nrandom.Random(42).choice(xs)    # fine, reproducible\nsecrets.token_hex(32)           # required\nsecrets.compare_digest(a, b)    # constant-time comparison',
            },
            {
              title: '"I need a command-line interface"',
              desc: 'argparse turns a declaration into parsing, type conversion, validation, defaults and a help screen. Hand-rolling sys.argv handling gets --help, -h, --version, abbreviations, error messages on bad input, and shell completion wrong.',
              code_snippet: 'parser = argparse.ArgumentParser(prog="ingest")\nparser.add_argument("path", type=Path)\nparser.add_argument("--batch", type=int, default=500)\nparser.add_argument("--dry-run", action="store_true")\nargs = parser.parse_args()',
            },
            {
              title: '"I need to call another program"',
              desc: 'subprocess with a list argument and check=True gives you a non-zero exit as an exception instead of a value you have to remember to inspect. shell=True is a string-injection vulnerability the moment any argument contains a space or a semicolon.',
              code_snippet: 'import subprocess\n\nout = subprocess.run(\n    ["git", "rev-parse", "--short", "HEAD"],\n    capture_output=True, text=True, check=True,\n).stdout.strip()\nprint(out)   # a1b2c3d',
            },
            {
              title: '"I need to exit with a code"',
              desc: 'sys.exit raises SystemExit, which the interpreter turns into an exit status. It is a function call in library code that raises, and it propagates — so use return for library functions and sys.exit only in main().',
              code_snippet: 'import sys\n\ndef main():\n    if not args.input.exists():\n        print("error: no such file", file=sys.stderr)\n        return 2\n    return 0\n\nif __name__ == "__main__":\n    sys.exit(main())',
            },
            {
              title: '"Nothing fits"',
              desc: 'That happens, and it is fine — write the 20 lines yourself rather than learning a whole library for one function. Two rules: check PyPI for an existing, maintained package first, and once you take a dependency, pin it and record why you needed it.',
              code_snippet: '# 20 lines you fully understand beats 200 lines\n# you are depending on for one function.',
            },
          ],
        }),
        b.md(`## argparse: a real command-line tool`),
        b.code(`import argparse
from pathlib import Path

# \`load\` is your own function, imported from the module you would write next to
# this script. Everything except that one call is argparse plumbing, and it is
# the same plumbing in every command-line tool you will ever write.


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="ingest",
        description="Load a CSV of rows into the database.",
        epilog="Run inside the project virtual environment.",
    )
    parser.add_argument("path", type=Path, help="CSV file to load")
    parser.add_argument(
        "--batch", type=int, default=500,
        help="rows per transaction (default: %(default)s)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="validate the file without writing anything",
    )
    parser.add_argument(
        "--timeout", type=float, default=30.0,
        help="seconds to allow per row (default: %(default)s)",
    )
    args = parser.parse_args(argv)

    if not args.path.is_file():
        parser.error(f"no such file: {args.path}")     # exits 2 with a usage message
    if args.batch < 1:
        parser.error("--batch must be at least 1")

    rows = load(args.path, dry_run=args.dry_run, batch=args.batch)
    print(f"{'validated' if args.dry_run else 'loaded'} {len(rows)} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())`, 'ingest.py'),
        b.md(`Running it:`),
        b.md(`\`\`\`bash
python3 ingest.py --help
usage: ingest [-h] [--batch BATCH] [--dry-run] [--timeout TIMEOUT] path

Load a CSV of rows into the database.

positional arguments:
  path                  CSV file to load

options:
  -h, --help            show this help message and exit
  --batch BATCH         rows per transaction (default: 500)
  --dry-run             validate the file without writing anything
  --timeout TIMEOUT     seconds to allow per row (default: 30.0)

Run inside the project virtual environment.
\`\`\`

Four things that make this good rather than merely working: \`type=\` converts and rejects bad input before your code runs, \`%(default)s\` in the help string keeps the documented default in sync with the real one, \`action="store_true"\` gives a flag with no argument, and \`parser.error()\` exits with status 2 and the standard usage block — the convention every shell script expects from a bad invocation.

## subprocess, done safely`),
        b.code(`import subprocess

# A list, never a string. Never shell=True with user input.
result = subprocess.run(
    ["python3", "-c", "print(2 ** 16)"],
    capture_output=True,
    text=True,
    check=True,          # non-zero exit raises CalledProcessError
    timeout=10,          # and a hang raises TimeoutExpired
)
print(result.stdout.strip())          # 65536
print(result.returncode)              # 0

# When you need a pipe rather than a result, Popen is the interface.
with subprocess.Popen(
    ["tail", "-n", "100", "app.log"],
    stdout=subprocess.PIPE,
    text=True,
) as proc:
    for line in proc.stdout:
        if "ERROR" in line:
            print(line.rstrip())`, 'subprocess.py'),
        b.md(`
The failure modes are worth naming because they are silent in a different sense: a missing \`timeout\` means a wedged child wedges your process forever; forgetting \`check=True\` means a failed command looks successful unless you remember to look at \`returncode\`; and \`shell=True\` with any interpolated value is a shell injection.

## urllib: an HTTP call with no dependency`),
        b.code(`import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

url = "https://api.example.com/v1/status"

try:
    req = Request(url, headers={"User-Agent": "tieedu/1.0 (+ops@example.com)"})
    with urlopen(req, timeout=5) as resp:
        print(resp.status, resp.headers.get_content_type())
        payload = json.loads(resp.read().decode("utf-8"))
except HTTPError as exc:
    print(f"http {exc.code}: {exc.reason}")
except URLError as exc:
    print(f"network: {exc.reason}")

print(payload.get("state", "unknown"))`, 'urllib_get.py'),
        b.md(`
Three details that are not optional in real code: \`timeout=\` because the default is no timeout at all, a \`User-Agent\` because several CDNs reject the urllib default outright, and \`get_content_type()\` rather than trusting a \`Content-Type\` string you are about to split on a semicolon. \`urlopen\` returns a response object that is itself a context manager, and closing it releases the connection.`),
        b.warn(
          'Three standard-library footguns',
          '1) `datetime.utcnow()` is deprecated and returns a naive object that silently claims to be UTC — use `datetime.now(timezone.utc)`. 2) `random` is not secure: `random.choice` on a token, password or session id is a real vulnerability, use `secrets`. 3) `open()` without `encoding="utf-8"` picks a locale-dependent default that differs between your laptop and your server. All three produce code that passes on one machine and fails on another.',
        ),
        b.tip(
          'The five-command tour',
          'Before you read documentation for an unfamiliar module, run `python3 -m module -h` (json, zipfile, base64, calendar, difflib, trace, pdb all answer), `python3 -c "import module; help(module.first_thing)"`, and `dir(module)` in the REPL. Most of the standard library explains itself better than its docs page does, because the docstring is the documentation.',
        ),
        b.resources('The parts of the docs worth bookmarking', [
          { label: 'Standard library reference (browse by task, not by module)', url: 'https://docs.python.org/3/library/index.html' },
          { label: 'datetime — objects, types and API', url: 'https://docs.python.org/3/library/datetime.html' },
          { label: 'argparse — tutorial and reference', url: 'https://docs.python.org/3/library/argparse.html' },
          { label: 'How to use argparse (official howto)', url: 'https://docs.python.org/3/howto/argparse.html' },
          { label: 'Regular Expression HOWTO', url: 'https://docs.python.org/3/howto/regex.html' },
        ]),
      ],
      questions: [
        [
          'Why is `datetime.utcnow()` deprecated?',
          [
            'It is slower than datetime.now(timezone.utc)',
            'It returns a naive datetime that claims to be UTC, so downstream code cannot tell it apart from local time and comparisons fail',
            'It does not work on Windows',
            'It was replaced by the time module for timestamps',
          ],
          1,
          'The problem is not speed, it is the return type. A naive datetime carrying UTC values looks identical to a naive datetime carrying local values, so the ambiguity is unrecoverable downstream — and comparing it to an aware datetime raises TypeError rather than giving a wrong answer you would notice. datetime.now(timezone.utc) returns an aware object that records the zone.',
        ],
        [
          'You need a 256-bit API token. Which call is correct?',
          [
            'random.randbytes(32).hex()',
            'random.getrandbits(256).to_bytes(32, "big").hex()',
            'secrets.token_hex(32)',
            'uuid.uuid4().hex repeated twice',
          ],
          2,
          'random is a Mersenne Twister: its entire state is recoverable from 624 observed outputs, so anything it produces is predictable to an attacker who has seen enough of it. secrets draws from the operating system CSPRNG. The other options are fast and fine for shuffling or for sampling, and are the wrong tool for a credential.',
        ],
        [
          'Why does the guidance say to pass a list to subprocess rather than a string?',
          [
            'Lists are faster to spawn',
            'A string requires shell=True, which re-parses the command through a shell and turns any argument containing a space, quote or semicolon into an injection vector',
            'subprocess cannot accept strings at all in Python 3',
            'A string form does not capture stdout',
          ],
          1,
          'With a list, each element becomes one argv entry passed straight to execve, so the shell never sees it. With a string, Python hands the whole thing to /bin/sh, which performs word splitting, glob expansion and command substitution on whatever you interpolated. subprocess does accept strings, but only safely when you wrote every character yourself.',
        ],
        [
          'What does `argparse` give you that hand-parsing `sys.argv` does not?',
          [
            'Faster startup, because it is implemented in C',
            'Type conversion, validation, standard usage and error output, --help, and shell-friendly exit codes, all from a single declaration',
            'Support for subcommands with nested parsers only',
            'Automatic handling of Unicode arguments',
          ],
          1,
          'argparse builds the parser object, converts and validates types, exits with status 2 and a usage message on bad input, generates a consistent --help screen, and handles unambiguous long-option abbreviation. None of that exists in a hand-rolled loop, and every script that reinvents it reinvents it slightly wrong.',
        ],
      ],
    },
    {
      title: 'The collections and itertools toolbox',
      summary: 'Counter, defaultdict, deque, namedtuple, the lazy itertools generators, functools memoisation, and the sorted(key=) idiom that replaces most of it.',
      duration: 19,
      build: (b) => [
        b.md(`## collections: containers that know their job

A \`dict\` is right most of the time. These are the cases where something else is right, and the difference is usually measured in both lines and milliseconds.`),
        b.code(`from collections import Counter, defaultdict, deque, namedtuple

words = "the quick brown fox jumps over the lazy dog the end".split()

counts = Counter(words)
print(counts.most_common(3))
# [('the', 3), ('quick', 1), ('brown', 1)]
print(counts["the"], counts["absent"])       # 3 0   <- a missing key is 0, not KeyError
print(counts.total())                       # 11
print(sorted(counts.items(), key=lambda kv: kv[1]))
# [('brown', 1), ..., ('the', 3)]  -> any order for the ties

# Counting with a plain dict is this much worse:
manual = {}
for w in words:
    manual[w] = manual.get(w, 0) + 1
# Counter(words) is that loop, correct, and with .most_common() attached.`, 'counter_basics.py'),
        b.md(`
\`Counter\` is not only a shortcut. It supports arithmetic (\`c1 - c2\` gives the difference, dropping non-positive counts), \`.most_common(n)\` which is implemented in C, and \`.elements()\` which repeats each element as many times as its count — a clean way to expand a histogram back into data.`),
        b.code(`from collections import Counter

alice = Counter("aabbbc")
bob = Counter("bcddd")

print((alice + bob).most_common())     # [('b', 4), ('d', 3), ('a', 2), ('c', 2)]
print((alice - bob).most_common())     # [('a', 2), ('b', 2)]  non-positive counts are dropped
print(list((alice + alice).elements())[:5])   # ['a', 'a', 'a', 'a', 'b'] — multiset doubling
print(list(alice.elements()))          # ['a', 'a', 'b', 'b', 'b', 'c'] — each element, repeated`, 'counter_algebra.py'),
        b.md(`
\`defaultdict\` turns "read, then maybe create" into one expression, and it is the standard way to group:`),
        b.code(`from collections import defaultdict

rows = [("ada", 42), ("bob", 37), ("ada", 19), ("cleo", 51), ("bob", 8)]

by_name = defaultdict(list)
for name, count in rows:
    by_name[name].append(count)

print(dict(by_name))
# {'ada': [42, 19], 'bob': [37, 8], 'cleo': [51]}

# The factory is the first argument, so defaultdict(int) zeroes missing keys,
# defaultdict(set) makes empty sets, defaultdict(list) makes empty lists.
totals = defaultdict(int)
for name, count in rows:
    totals[name] += count
print(dict(totals))       # {'ada': 61, 'bob': 45, 'cleo': 51}`, 'defaultdict_grouping.py'),
        b.md(`
The one rule: \`defaultdict\` creates the key on **read**, not just on write. A loop that does \`if key not in d: continue\` over a \`defaultdict\` will materialise entries for keys you never wanted, and the resulting dict grows without bound. If a missing key is an error, use a plain \`dict\` and \`d[key]\` deliberately.

\`deque\` is a list that is fast at both ends. \`list.pop(0)\` is O(n) because every remaining element shifts down — which is exactly the wrong complexity for a queue or a breadth-first search, where you pop from the front on every iteration:`),
        b.code(`from collections import deque

# BFS with a list is quadratic before it is correct.
graph = {"a": ["b", "c"], "b": ["d"], "c": ["d"], "d": []}

def bfs(start):
    queue, seen = deque([start]), {start}
    order = []
    while queue:
        node = queue.popleft()      # O(1); list.pop(0) is O(n)
        order.append(node)
        for nxt in graph[node]:
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return order


print(bfs("a"))                     # ['a', 'b', 'c', 'd']

# maxlen turns it into a bounded ring buffer — the sliding-window trick.
recent = deque(maxlen=3)
for value in range(10):
    recent.append(value)
print(list(recent))                # [7, 8, 9]`, 'deque_bfs.py'),
        b.md(`
\`namedtuple\` is a tuple with names. It is a real tuple — indexable, unpackable, hashable, and about as cheap as one — with attribute access bolted on:`),
        b.code(`from collections import namedtuple

Point = namedtuple("Point", "x y")
p = Point(1.0, 2.0)
print(p.x, p.y, tuple(p), p == (1.0, 2.0))
# 1.0 2.0 (1.0, 2.0) True

Record = namedtuple("Record", "name visits")
r = Record("ada", 42)
print(r._asdict())                  # {'name': 'ada', 'visits': 42}
print(r._replace(visits=43))        # Record(name='ada', visits=43)`, 'namedtuple.py'),
        b.md(`
\`OrderedDict\` deserves a demotion note: since Python 3.7 the plain \`dict\` preserves insertion order, so \`OrderedDict\` is only worth reaching for when you need \`move_to_end()\` (an LRU cache by hand) or when two mappings should compare equal only if their key *orders* match. \`ChainMap\` lets you treat several dicts as one lookup that writes to the first — a cheap, effective way to layer defaults over overrides.`),
        b.lead('itertools: lazy, composable, C-fast'),
        b.md(`\`itertools\` generators produce one item at a time and never build the intermediate list. That matters when the intermediate would be ten billion items, and it matters for memory even when it would not — a list comprehension over \`product(range(1000), repeat=2)\` tries to allocate a million tuples; the loop underneath produces one at a time.`),
        b.code(`import itertools

# chain flattens any number of iterables — nested loops become one loop.
matrix = [[1, 2], [3, 4], [5, 6]]
print(list(itertools.chain.from_iterable(matrix)))   # [1, 2, 3, 4, 5, 6]
print(list(itertools.chain([1, 2], "ab", (3,))))     # [1, 2, 'a', 'b', 3]

# islice is a lazy slice: it never builds the list it is cutting.
src = range(1_000_000)
print(list(itertools.islice(src, 10, 20, 2)))       # [10, 12, 14, 16, 18]

# accumulate is running totals, and with a function it is running products.
prices = [10, 20, 30, 40]
print(list(itertools.accumulate(prices)))                      # [10, 30, 60, 100]
print(list(itertools.accumulate(prices, initial=1)))           # [1, 11, 31, 61, 101]
print(list(itertools.accumulate([1, 2, 3, 4], lambda a, b: a * b)))
# [1, 2, 6, 24]  -- factorials

# product, permutations, combinations: no nested loops, no itertools import
# needed for most of them because comprehensions are clearer.
print(list(itertools.combinations("abcd", 2))[:3])
# [('a', 'b'), ('a', 'c'), ('a', 'd')]
print(list(itertools.permutations("abc")))
# [('a', 'b', 'c'), ('a', 'c', 'b'), ('b', 'a', 'c'), ...]

# zip_longest pads instead of truncating — the silent data-loss fix.
a, b = [1, 2, 3], [10, 20]
print(list(itertools.zip_longest(a, b, fillvalue=0)))
# [(1, 10), (2, 20), (3, 0)]
print(list(zip(a, b)))                              # [(1, 10), (2, 20)]  <- 3 is lost`, 'itertools_core.py'),
        b.md(`
That last pair is the one to internalise. \`zip\` stops at the shortest sequence and returns no indication that anything was dropped. When you are joining two datasets keyed or positional by row, \`zip_longest\` turns a silent data-loss bug into a loud one.

\`groupby\` is the one to be careful with, because it does not do what its name suggests:`),
        b.code(`import itertools

rows = [("b", 2), ("a", 1), ("b", 9), ("c", 3), ("b", 5)]

# WRONG: groupby groups CONSECUTIVE equal keys, it does not sort or collect.
groups = itertools.groupby(rows, key=lambda r: r[0])
print([(k, len(list(g))) for k, g in groups])
# [('b', 1), ('a', 1), ('b', 1), ('c', 1), ('b', 1)]   five groups!

# RIGHT: sort first, and the groups are what you expected.
rows.sort(key=lambda r: r[0])
groups = itertools.groupby(rows, key=lambda r: r[0])
print([(k, len(list(g))) for k, g in groups])
# [('a', 1), ('b', 3), ('c', 1)]

# And groupby yields LAZY sub-iterators that die at the next group — the
# single most common groupby bug is keeping a group and reading it later.
groups = itertools.groupby(rows, key=lambda r: r[0])
first = next(groups)
print(next(first[1]))
# ('a', 1)
print(next(first[1]))
# StopIteration  <- the sub-iterator is exhausted and invalid`, 'groupby.py'),
        b.md(`
The second \`groupby\` block is exactly the situation the animation below walks through, and it is worth internalising that \`groupby\` is a *streaming* tool over sorted input. If your data is not sorted, \`defaultdict(list)\` is clearer, allocation is trivial, and nothing surprises you.`),
        b.anim('nodes', {
          title: 'Building buckets, then grouping them',
          badge: 'defaultdict / groupby',
          steps: [
            {
              caption: 'The first row creates a bucket',
              note: 'defaultdict(list) calls its factory on first read, so buckets["ada"] becomes an empty list and append hits it immediately. No setdefault, no try/except KeyError, no membership test.',
              nodes: [
                { id: 'ada', data: "'ada': [42]", note: "buckets['ada']", pointsTo: 'nil', tone: 'int' },
              ],
              tail: 'ada',
            },
            {
              caption: 'A new key appends a new bucket, in first-seen order',
              note: 'Dicts have been insertion-ordered since Python 3.7, so the bucket order is the order the keys first appeared in the data — which is rarely the order you want to report in, and is exactly why you sort before you iterate.',
              nodes: [
                { id: 'ada', data: "'ada': [42]", note: "buckets['ada']", pointsTo: 'bob', tone: 'int' },
                { id: 'bob', data: "'bob': [37]", note: "buckets['bob']", tone: 'int' },
              ],
              tail: 'ada',
            },
            {
              caption: 'A repeat key finds its bucket in O(1) and appends',
              note: 'This is the payoff of the dict: the grouping loop costs one hash lookup plus an append, and it is the same cost whether the bucket holds one item or a million.',
              nodes: [
                { id: 'ada', data: "'ada': [42, 19]", note: "buckets['ada']", pointsTo: 'bob', tone: 'int' },
                { id: 'bob', data: "'bob': [37]", note: "buckets['bob']", tone: 'int' },
              ],
              tail: 'ada',
            },
            {
              caption: 'Five rows in, three buckets out',
              note: 'dict(buckets) is a plain dict now, with the values replaced by real lists. Order is first-seen, not sorted — that is the one thing you must fix yourself.',
              nodes: [
                { id: 'ada', data: "'ada': [42, 19]", note: "buckets['ada']", pointsTo: 'bob', tone: 'int' },
                { id: 'bob', data: "'bob': [37, 8]", note: "buckets['bob']", pointsTo: 'cleo', tone: 'int' },
                { id: 'cleo', data: "'cleo': [51]", note: "buckets['cleo']", tone: 'int' },
              ],
              tail: 'ada',
            },
            {
              caption: 'groupby walks the chain and yields each bucket once',
              note: 'Only after sorting by key, because groupby groups CONSECUTIVE equal keys and nothing else. Each yielded group is a lazy sub-iterator that is exhausted the moment you move to the next key.',
              nodes: [
                { id: 'ada', data: "'ada': [42, 19]", note: 'group 1 of 3', pointsTo: 'bob', tone: 'ok' },
                { id: 'bob', data: "'bob': [37, 8]", note: 'group 2 of 3', pointsTo: 'cleo', tone: 'warn' },
                { id: 'cleo', data: "'cleo': [51]", note: 'group 3 of 3', tone: 'ok' },
              ],
              tail: 'ada',
            },
            {
              caption: 'Or skip groupby entirely',
              note: 'sorted(buckets.items()) gives the same three (key, values) pairs with one sort and no lazy-iterator subtleties. Buckets are the data structure; groupby is a streaming convenience. Reach for it when the input is already ordered and too large to sort.',
              nodes: [
                { id: 'ada', data: "'ada': [42, 19]", note: 'sorted items', pointsTo: 'bob', tone: 'data' },
                { id: 'bob', data: "'bob': [37, 8]", note: 'sorted items', pointsTo: 'cleo', tone: 'data' },
                { id: 'cleo', data: "'cleo': [51]", note: 'sorted items', tone: 'data' },
              ],
              tail: 'ada',
            },
          ],
        }),
        b.md(`## functools: remember the result, freeze the arguments, keep the metadata`),
        b.code(`import functools
import time


@functools.cache
def collatz(n: int) -> int:
    """Steps to reach 1. Pure function of n, so the answer is worth keeping."""
    steps = 0
    while n != 1:
        n = 3 * n + 1 if n % 2 else n // 2
        steps += 1
    return steps


start = time.perf_counter()
for n in range(1, 500):
    collatz(n)
print(f"{time.perf_counter() - start:.4f}s   (first pass, no cache hits)")

start = time.perf_counter()
for n in range(1, 500):
    collatz(n)
print(f"{time.perf_counter() - start:.6f}s  (second pass, all cached)")

print(collatz.cache_info())
# CacheInfo(hits=499, misses=499, maxsize=None, currsize=499)`, 'memoise_collatz.py'),
        b.md(`
\`@functools.cache\` (3.9+) is \`@functools.lru_cache(maxsize=None)\` without the LRU bookkeeping. The rule: only cache **pure** functions of **hashable** arguments. Caching something that reads a file, a clock, or a database turns your test suite into a race condition and your production system into a stale-data incident. \`cache_info()\` and \`cache_clear()\` exist because you will need the second one in a test.`),
        b.code(`import functools


def retry(attempts, *, on_retry=None):
    """Build a decorator with some arguments already bound."""
    def decorate(fn):
        @functools.wraps(fn)          # preserves __name__, __doc__, __qualname__
        def wrapper(*args, **kwargs):
            last = None
            for i in range(attempts):
                try:
                    return fn(*args, **kwargs)
                except Exception as exc:
                    last = exc
                    if on_retry:
                        on_retry(i, exc)
            raise last
        return wrapper
    return decorate


@retry(3)
def fetch(url):
    ...


print(fetch.__name__)     # 'fetch'  <- functools.wraps, not 'wrapper'
print(fetch.__doc__)`, 'decorator_factory.py'),
        b.md(`
\`@functools.wraps(fn)\` is not optional decoration. Without it the decorated function is named \`wrapper\`, its docstring is gone, and every traceback through it points at the wrong line. This is the one decorator bug that is guaranteed to happen.

\`functools.partial(f, arg)\` binds leading arguments, which is more useful than a lambda for the cases where the lambda would need to forward \`*args\`:`),
        b.code(`import functools


def connect(host, port, *, timeout=5.0, retries=3):
    return f"{host}:{port} (timeout={timeout}, retries={retries})"


connect_prod = functools.partial(connect, "db.internal", 5432)
print(connect_prod(timeout=1.5))
# db.internal:5432 (timeout=1.5, retries=3)

# reduce is a fold; sum, min, max and any/all cover almost every real use.
print(functools.reduce(lambda a, b: a * b, [1, 2, 3, 4, 5]))
# 120`, 'partial_and_reduce.py'),
        b.md(`
\`functools.cmp_to_key\` deserves one line because it solves a problem people write horrible workarounds for: \`sorted\` only takes a \`key\`, but sometimes you have a three-way comparison function and want it honoured.`),
        b.code(`import functools


def by_distance(a, b):
    """Three-way comparator: negative if a sorts first."""
    return (a[1] > b[1]) - (a[1] < b[1])


rows = [("cleo", 51), ("ada", 42), ("bob", 37), ("dan", 37)]
print(sorted(rows, key=functools.cmp_to_key(by_distance)))
# [('bob', 37), ('dan', 37), ('ada', 42), ('cleo', 51)]`, 'cmp_to_key.py'),
        b.table(
          'Module → what it fixes',
          ['Tool', 'Replaces', 'Reach for it when'],
          [
            ['`Counter`', 'A `get(w, 0) + 1` loop', 'You are counting things and want most_common, arithmetic, or a zero for missing keys'],
            ['`defaultdict(list)`', '`setdefault` inside a grouping loop', 'You are building groups or sums and the missing-key case has a sane default'],
            ['`deque`', '`list.pop(0)` in a queue or BFS', 'You pop from the front in a loop, or want a `maxlen` sliding window'],
            ['`namedtuple`', 'Indexing `row[0], row[1]` everywhere', 'You want names on a tuple that is still a cheap immutable tuple'],
            ['`itertools.chain`', 'Nested for loops', 'You are flattening a list of lists lazily'],
            ['`itertools.islice`', 'Building a list then slicing it', 'You only want part of a huge or infinite iterator'],
            ['`itertools.groupby`', 'Grouping a sorted list', 'The input is already sorted by the key and you want lazy groups'],
            ['`itertools.product`', 'Nested loops over ranges', 'You want the Cartesian product of two or more small iterables'],
            ['`itertools.accumulate`', 'A running-total for loop', 'You want prefix sums, or `initial=` for an inclusive product'],
            ['`itertools.zip_longest`', '`zip`, which silently truncates', 'Two sequences might have different lengths and losing the tail is a bug'],
            ['`functools.cache`', 'A hand-rolled memo dict', 'The function is pure and its arguments are hashable'],
            ['`functools.partial`', 'A lambda that forwards `*args`', 'You want to pre-bind leading arguments of a function'],
            ['`functools.wraps`', 'Nothing — it adds the missing metadata', 'You write any decorator, without exception'],
            ['`sorted(key=...)`', 'Half of itertools and both `itemgetter` tricks', 'Almost always: build a tuple key, including `-value` to reverse'],
          ]
        ),
        b.lead('The idiom that replaces most of the table above'),
        b.md(`Before you import anything, write the sort. Most "I need a library for this" moments are a sort with a compound key:`),
        b.code(`people = [("ada", 42), ("bob", 37), ("cleo", 51), ("dan", 37)]

print(sorted(people))
# alphabetical by name: ada, bob, cleo, dan
print(sorted(people, key=lambda p: -p[1]))
# by score, descending: cleo 51, ada 42, bob 37, dan 37
print(sorted(people, key=lambda p: (-p[1], p[0])))
# score descending, name ascending as the tie-break — stable and total
print(max(people, key=lambda p: p[1]))
# ('cleo', 51)
print(sorted(people, key=lambda p: p[0])[:2])
# [('ada', 42), ('bob', 37)]`, 'sort_key.py'),
        b.md(`
The three things to internalise:

1. **A tuple key is a multi-level sort.** \`key=lambda p: (-p[1], p[0])\` says "descending by score, then ascending by name", and it does it in one pass. Negating the number is the descending trick for numeric fields; for strings use \`reverse=True\` on a separate pass, because you cannot negate a string.
2. **\`sorted\` is stable.** Equal keys keep their original relative order, so \`sorted(rows, key=lambda r: r[1])\` then \`sorted(..., key=lambda r: r[0])\` is a legitimate two-pass approach — though the tuple key is clearer.
3. **\`min\` and \`max\` take the same \`key\`.** "The best row" is one line, not a loop.

This works because \`key\` is *any* callable returning *any* orderable value — a tuple, a string, a float, even a \`__lt__\`-implementing object. Once you reach for that, most of \`itertools\` and \`operator\` is unnecessary.`),
        b.warn(
          'Where the toolbox hurts',
          '`itertools.groupby` on unsorted data silently produces more groups than you expect, and its sub-iterators die at the next group. `tee` duplicates an iterator, which for an unbounded one is an unbounded memory leak. `reduce` obscures a two-line loop and cannot early-exit. `functools.cache` on a function that touches the filesystem, the clock or a socket converts a correctness problem into a heisenbug. Every tool here is fine; the failure mode is reaching for the clever one where the obvious one would have worked.',
        ),
        b.tip(
          'Measure before you optimise',
          'A `list.pop(0)` loop is quadratic and `deque` is linear, but on a 200-element list the difference is unmeasurable and you have made the code harder to read. Profile with `cProfile` first, confirm the deque or the accumulate, and keep the simple version everywhere else.',
        ),
      ],
      questions: [
        [
          'Why does `itertools.groupby` on unsorted data return more groups than there are distinct keys?',
          [
            'Because it compares keys by identity rather than value',
            'Because groupby groups only CONSECUTIVE runs of equal keys; it never sorts and never collects non-adjacent matches',
            'Because the key function is called once per element rather than once per key',
            'Because the input list is copied',
          ],
          1,
          'groupby is a streaming operation: it hands you an iterator over the run of elements with the current key and then moves on. Without sorting first, "b, a, b, c, b" is five runs and therefore five groups. Sort by the key before grouping, or use defaultdict(list), which does not care about order.',
        ],
        [
          'What happens when you apply `@functools.cache` to a function that reads the current time?',
          [
            'Nothing — the decorator is aware of impure functions',
            'The first result is cached and returned forever, so callers see a stale value and the behaviour depends on test order',
            'A TypeError is raised because the argument is not hashable',
            'The cache is bypassed automatically for any function with no arguments',
          ],
          1,
          'cache keys on the arguments only, so a zero-argument function has exactly one cache entry, created on the first call and never refreshed. The result is a function whose output is frozen at first use. Memoisation is only correct for pure functions of hashable arguments; anything that reads the clock, a file, the network or a database is disqualified.',
        ],
        [
          'Why do you write `@functools.wraps(fn)` on every decorator?',
          [
            'It makes the wrapper run faster',
            'It copies __name__, __doc__ and friends onto the wrapper, so tracebacks, help() and introspection point at the real function',
            'It is required for the decorator syntax to parse',
            'It marks the function as a generator',
          ],
          1,
          'Without it the decorated function reports itself as "wrapper", its docstring is the wrapper\'s, and every stack frame through it names the wrapper\'s line rather than the function\'s. Debugging output and generated documentation both degrade silently, which is why wraps is the one decorator rule with no exceptions.',
        ],
        [
          'You need "the two highest rows by score, ties broken by name ascending". What is the clearest way?',
          [
            '`heapq.nlargest(2, rows, key=lambda r: r[1])`',
            '`sorted(rows, key=lambda r: (-r[1], r[0]))[:2]`',
            '`itertools.combinations(rows, 2)`',
            'A nested loop over every pair, comparing pairwise',
          ],
          1,
          'The compound tuple key expresses a multi-level sort in one pass: negating the numeric field sorts descending, and the second element breaks ties ascending. heapq.nlargest is the right choice for a huge list where you do not want to sort everything, but for a few dozen rows the sort is clearer and the tie-break has to be written either way.',
        ],
      ],
    },
    {
      title: 'Writing tests',
      summary: 'What a test is for, assert versus unittest, fixtures, pytest, test doubles and when not to mock, and a real suite with its output.',
      duration: 20,
      build: (b) => [
        b.md(`## What a test actually is

A test is a **falsifiable claim about behaviour, checked automatically**. Three words in that sentence carry all the weight:

- **Falsifiable** — it can fail. A test that cannot fail is not a test; it is an \`assert True\`.
- **Behaviour** — what the code does, not how it does it. \`assert result == 42\` is a test. \`assert self.callee.was_called_with(42)\` is a test that breaks every time you refactor without changing behaviour.
- **Automatic** — it runs without you, so it can run on every save and in CI.

The value is not that tests find bugs. It is that they let you **change code safely**. The reason people skip them is that the first twenty tests cost more than they save, and the first twenty are always the same: your domain logic. Everything past that gets cheaper, because the tests keep working while you rewrite the parts underneath.

## Why not just use assert?`),
        b.code(`from cart import Cart


def test_total():
    cart = Cart()
    cart.add("widget", 3, 9.99)
    assert cart.subtotal() == 29.97`, 'test_total.py'),
        b.md(`
That works, and \`pytest\` runs bare asserts natively and gives you a much better traceback than \`unittest\`. But \`python3 -O my_test.py\` — the optimise flag — **strips every \`assert\` statement from the bytecode**. \`-O\` is used in some deployment images to remove docstrings and \`__debug__\` blocks. Your entire test suite would silently do nothing and exit 0.

The rule that resolves it: use \`assert\` in application code freely, but never *only* assert. Either run under \`pytest\`, where a \`-O\` build is not the way you ship tests, or use a framework whose assertion methods are ordinary function calls that \`-O\` cannot remove.

## unittest, end to end

Two files. The code under test:`),
        b.code(`# cart.py
from dataclasses import dataclass


@dataclass(frozen=True)
class Line:
    sku: str
    qty: int
    unit_price: float

    @property
    def total(self) -> float:
        return round(self.qty * self.unit_price, 2)


class Cart:
    def __init__(self):
        self._lines: list[Line] = []

    def add(self, sku: str, qty: int, unit_price: float) -> None:
        if qty < 1:
            raise ValueError(f"quantity must be at least 1, got {qty}")
        self._lines.append(Line(sku, qty, float(unit_price)))

    def subtotal(self) -> float:
        return round(sum(line.total for line in self._lines), 2)


def apply_discount(cart: Cart, rate: float) -> float:
    return round(cart.subtotal() * (1 - rate), 2)`, 'cart.py'),
        b.md(`And the test:`),
        b.code(`# test_cart.py
import unittest

from cart import Cart, apply_discount


class CartTotalTests(unittest.TestCase):
    def setUp(self):
        """A fresh cart before every single test — never shared state."""
        self.cart = Cart()
        self.cart.add("widget", 3, 9.99)
        self.cart.add("sprocket", 1, 24.50)

    def test_empty_cart_subtotals_zero(self):
        self.assertEqual(Cart().subtotal(), 0.0)

    def test_subtotal_is_the_sum_of_lines(self):
        self.assertAlmostEqual(self.cart.subtotal(), 54.47)

    def test_discount_applies_to_the_subtotal(self):
        self.assertAlmostEqual(apply_discount(self.cart, 0.10), 49.02)

    def test_discount_of_zero_changes_nothing(self):
        self.assertAlmostEqual(apply_discount(self.cart, 0.0), 54.47)

    def test_zero_quantity_is_rejected(self):
        with self.assertRaises(ValueError):
            self.cart.add("bolt", 0, 0.10)


if __name__ == "__main__":
    unittest.main()`, 'test_cart.py'),
        b.md(`Running it:`),
        b.md(`\`\`\`bash
python3 -m unittest -v test_cart
\`\`\`

\`\`\`text
test_discount_applies_to_the_subtotal (test_cart.CartTotalTests.test_discount_applies_to_the_subtotal) ... ok
test_discount_of_zero_changes_nothing (test_cart.CartTotalTests.test_discount_of_zero_changes_nothing) ... ok
test_empty_cart_subtotals_zero (test_cart.CartTotalTests.test_empty_cart_subtotals_zero) ... ok
test_subtotal_is_the_sum_of_lines (test_cart.CartTotalTests.test_subtotal_is_the_sum_of_lines) ... ok
test_zero_quantity_is_rejected (test_cart.CartTotalTests.test_zero_quantity_is_rejected) ... ok

----------------------------------------------------------------------
Ran 5 tests in 0.002s

OK
\`\`\`

Every piece of that is worth naming:

- **\`setUp\` runs before every test method**, on a brand-new instance of the \`TestCase\`. That is the fixture mechanism, and it is why these tests cannot pass in one order and fail in another. The matching \`tearDown\` runs after each, \`setUpClass\`/\`tearDownClass\` once per class for expensive shared setup.
- **\`assertAlmostEqual\` rather than \`assertEqual\` for money.** \`54.47 * 0.9\` is \`49.022999999999996\` in binary floating point. \`assertAlmostEqual\` rounds to 7 decimal places by default; pass \`places=2\` when that is the domain precision.
- **\`assertRaises\` as a context manager** is the correct form because it also asserts that nothing *else* was raised, and it gives a clean failure rather than an \`AttributeError\` when the exception never happens.
- **The test name is a sentence.** \`test_discount_applies_to_the_subtotal\` tells you the assertion if it ever fails in CI, six months from now, when you have forgotten everything. The test file is documentation that cannot go stale.

A failing run looks like this, and the message is the whole point of the framework:

\`\`\`text
======================================================================
FAIL: test_discount_applies_to_the_subtotal (test_cart.CartTotalTests.test_discount_applies_to_the_subtotal)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/srv/app/test_cart.py", line 19, in test_discount_applies_to_the_subtotal
    self.assertAlmostEqual(apply_discount(self.cart, 0.10), 49.02)
AssertionError: 44.12 != 49.02 within 7 places (4.900000000000006 difference)

----------------------------------------------------------------------
Ran 1 test in 0.001s

FAILED (failures=1)
\`\`\`

\`44.12\` is \`54.47 * 0.9 * 0.9\`: a rate applied twice. The test cost four lines to write and named the bug in one run. This is the entire argument for having a suite — every subsequent discount change is now a one-second check instead of a manual calculation you do in your head and trust.`),
        b.anim('trace', {
          title: 'What the test runner is actually doing',
          badge: 'python -m unittest -v',
          code: `import unittest

from cart import Cart, apply_discount


class CartTotalTests(unittest.TestCase):
    def setUp(self):
        self.cart = Cart()
        self.cart.add("widget", 3, 9.99)
        self.cart.add("sprocket", 1, 24.50)

    def test_empty_cart_subtotals_zero(self):
        self.assertEqual(Cart().subtotal(), 0.0)

    def test_subtotal_is_the_sum_of_lines(self):
        self.assertAlmostEqual(self.cart.subtotal(), 54.47)

    def test_discount_applies_to_the_subtotal(self):
        self.assertAlmostEqual(apply_discount(self.cart, 0.10), 49.02)

    def test_zero_quantity_is_rejected(self):
        with self.assertRaises(ValueError):
            self.cart.add("bolt", 0, 0.10)


if __name__ == "__main__":
    unittest.main()`,
          steps: [
            {
              caption: 'The module is imported; nothing has run yet',
              note: 'Defining the class does not run any test. unittest.main() at the bottom is what starts the machinery, and the __name__ guard is what stops pytest from also running it on import.',
              line: 1,
              vars: [],
              output: '',
            },
            {
              caption: 'unittest.main() builds a loader and discovers the class',
              note: 'The loader imports the module, finds every subclass of TestCase, and collects every method whose name starts with test_. Discovery is reflection — there is no registry to maintain.',
              line: 26,
              vars: [{ name: 'loader', value: '<TestLoader test_cart>', tone: 'code' }],
              output: 'TestLoader: 1 TestCase subclass, 4 test methods',
            },
            {
              caption: 'Methods are sorted alphabetically, then run one at a time',
              note: 'Sorting is why the run order is not the file order. Each test gets its own TestCase instance, so nothing it does to self can leak into the next one.',
              line: 7,
              vars: [
                { name: 'loader', value: '<TestLoader test_cart>', tone: 'code' },
                { name: 'self', value: '<CartTotalTests>', tone: 'ptr' },
              ],
              output: 'test_discount_applies_to_the_subtotal (test_cart.CartTotalTests.test_discount_applies_to_the_subtotal) ... ',
            },
            {
              caption: 'setUp runs before every single test',
              note: 'A brand new Cart every time, on a brand new TestCase instance. If setUp were module-level shared state, each test would silently depend on whatever the previous one left behind.',
              line: 7,
              vars: [
                { name: 'self', value: '<CartTotalTests>', tone: 'ptr' },
                { name: 'self.cart', value: '<Cart 0x…7f21>', tone: 'data' },
                { name: 'self.cart._lines', value: '[Line(widget,3,9.99), Line(sprocket,1,24.50)]', tone: 'int' },
              ],
              output: 'setUp: 2 lines added to a fresh Cart',
            },
            {
              caption: 'apply_discount rounds 54.47 * 0.90 to 49.02',
              note: 'assertAlmostEqual compares to 7 decimal places, so the binary-floating-point residue never becomes a failure. Comparing floats for exact equality is the most common false alarm in a Python test suite.',
              line: 19,
              vars: [
                { name: 'self.cart.subtotal()', value: '54.47', tone: 'int' },
                { name: 'apply_discount(0.10)', value: '49.02', tone: 'ok' },
              ],
              output: 'ok',
            },
            {
              caption: 'A fresh cart again for the next test',
              note: 'setUp is not once per class. Four tests means four carts and four TestCase objects, and tearDown has already run for the previous one. This is the single reason unittest suites stay order-independent as they grow.',
              line: 7,
              vars: [
                { name: 'self', value: '<CartTotalTests>', tone: 'ptr' },
                { name: 'self.cart', value: '<Cart 0x…9c04>', tone: 'data' },
                { name: 'self.cart._lines', value: '[Line(widget,3,9.99), Line(sprocket,1,24.50)]', tone: 'int' },
              ],
              output: 'test_empty_cart_subtotals_zero (test_cart.CartTotalTests.test_empty_cart_subtotals_zero) ... ',
            },
            {
              caption: 'A new object, not the fixture: Cart().subtotal()',
              note: 'This test deliberately ignores self.cart and builds an empty one. Asserting on the fixture rather than on a fresh object is a common way to write a test that cannot fail — it would still pass if add() were broken.',
              line: 13,
              vars: [
                { name: 'self', value: '<CartTotalTests>', tone: 'ptr' },
                { name: 'Cart().subtotal()', value: '0.0', tone: 'ok' },
              ],
              output: 'ok',
            },
            {
              caption: '29.97 + 24.50, checked against the fixture this time',
              note: 'This one does use self.cart, because the sum of the lines is the behaviour under test. Two lines, both from setUp, 3 x 9.99 and 1 x 24.50.',
              line: 16,
              vars: [
                { name: 'self.cart.subtotal()', value: '54.47', tone: 'int' },
                { name: 'assertAlmostEqual', value: 'places=7 (default)', tone: 'code' },
              ],
              output: 'test_subtotal_is_the_sum_of_lines (test_cart.CartTotalTests.test_subtotal_is_the_sum_of_lines) ... ok',
            },
            {
              caption: 'assertRaises as a context manager, then the summary',
              note: 'The with-block asserts that a ValueError was raised AND that nothing else was, which a bare assertRaises call would not. At the end the runner prints the count, the wall time and a verdict, and sets the process exit code from it — so CI needs no extra wiring to know whether you passed.',
              line: 22,
              vars: [
                { name: 'self', value: '<CartTotalTests>', tone: 'ptr' },
                { name: 'raised', value: 'ValueError: quantity must be at least 1, got 0', tone: 'bad' },
              ],
              output: 'test_zero_quantity_is_rejected (test_cart.CartTotalTests.test_zero_quantity_is_rejected) ... ok\n\n----------------------------------------------------------------------\nRan 4 tests in 0.002s\n\nOK',
            },
          ],
        }),
        b.lead('The pytest flavour, and why most people use it'),
        b.md(`\`pytest\` is not a different kind of testing. It is the same tests with less ceremony: plain functions, plain \`assert\`, no base class, no \`self\`, and a much better failure report.`),
        b.code(`# test_cart_pytest.py
import pytest

from cart import Cart, apply_discount


@pytest.fixture
def cart():
    """Rebuilt for every test that asks for it — the same role as setUp."""
    c = Cart()
    c.add("widget", 3, 9.99)
    c.add("sprocket", 1, 24.50)
    return c


def test_subtotal_is_the_sum_of_lines(cart):
    assert cart.subtotal() == pytest.approx(54.47)


def test_discount_applies_to_the_subtotal(cart):
    assert apply_discount(cart, 0.10) == pytest.approx(49.02)


def test_zero_quantity_is_rejected(cart):
    with pytest.raises(ValueError, match="at least 1"):
        cart.add("bolt", 0, 0.10)


def test_empty_cart_subtotals_zero():
    assert Cart().subtotal() == 0.0`, 'test_cart_pytest.py'),
        b.md(`\`\`\`bash
pytest -q
\`\`\`

\`\`\`text
....                                                        [100%]
4 passed in 0.01s
\`\`\`

What you gained, concretely:

- **No class.** A module of test functions with descriptive names is the same information as a class of test methods with descriptive names, minus the \`self\` noise.
- **\`pytest.approx\`** instead of \`assertAlmostEqual\`, and it works for dicts, lists and sets, not just numbers.
- **\`match=\` on \`pytest.raises\`** asserts the message contains a pattern, so a test cannot pass on an unrelated \`ValueError\` thrown by a different line.
- **Parametrisation**: one test, many cases, and you get one failure line per case with the offending input.`),
        b.code(`import pytest

from cart import Cart, apply_discount


@pytest.mark.parametrize(
    ("rate", "expected"),
    [(0.0, 54.47), (0.1, 49.02), (0.25, 40.85), (1.0, 0.0)],
)
def test_discount_table(rate, expected):
    cart = Cart()
    cart.add("widget", 3, 9.99)
    cart.add("sprocket", 1, 24.50)
    assert apply_discount(cart, rate) == pytest.approx(expected)`, 'test_parametrised.py'),
        b.md(`\`\`\`bash
pytest -q test_cart_pytest.py::test_discount_table
\`\`\`

\`\`\`text
....                                                        [100%]
4 passed in 0.01s
\`\`\`

The value of parametrisation shows up on failure, not on success. \`pytest\` names the test id, and for a parametrised case that id includes both inputs, so you never have to work out which case broke:

\`\`\`text
FAILED test_cart_pytest.py::test_discount_table[0.25-40.85]
    assert 40.8525 == pytest.approx(40.85, rel=1e-06, abs=1e-12)
\`\`\`

That is the same coverage as four assertions in a loop, except each one now reports its own inputs when it breaks.

What you gave up: \`unittest\` is in the standard library, so it runs anywhere Python does with no install, and \`unittest.mock\` is available without a dependency. \`pytest\` is an external package — worth it in almost every real project, but know that \`python -m unittest\` is always available as a fallback.`),
        b.md(`## Test doubles, and when not to use them

Three words that are used interchangeably and should not be:

| Double | What it does | When |
| --- | --- | --- |
| **Stub** | Returns canned data | You need the *result* to be predictable (a clock, a random number) |
| **Spy** | Records how it was called | You are checking that a collaborator was asked to do the right thing |
| **Mock** | Returns a configured value *and* asserts the call | The value matters **and** the call signature matters |
| **Fake** | A working, simplified implementation | An in-memory store instead of a database |

The governing principle is the one that decides every borderline case: **mock only what you do not own.** Everything you wrote is better tested for real, because a real object cannot drift out of sync with its collaborators and because a test built entirely from mocks only proves that you call your own mocks correctly.`),
        b.code(`from unittest.mock import Mock

from cart import apply_discount


def test_apply_discount_reads_the_subtotal_once():
    """A mock for code you own. Justified here only because subtotal() is trivial."""
    fake_cart = Mock()
    fake_cart.subtotal.return_value = 100.0

    assert apply_discount(fake_cart, 0.10) == 90.00
    fake_cart.subtotal.assert_called_once_with()`, 'mock_you_own.py'),
        b.md(`And the version you should write instead — a fake for the thing you do not own, injected rather than patched, so no module state has to be rewritten and undone:`),
        b.code(`from dataclasses import dataclass, field


@dataclass
class Invoice:
    order_id: int
    mailer: object                 # anything with .send(message)
    dry_run: bool = False
    drafted: list[str] = field(default_factory=list)

    def emit(self):
        message = f"invoice for order {self.order_id}"
        self.drafted.append(message)
        if not self.dry_run:
            self.mailer.send(message)


class RecordingMailer:
    """A working stand-in for SMTP. No network, no flake, instant."""

    def __init__(self):
        self.outbox = []

    def send(self, message):
        self.outbox.append(message)


def test_dry_run_sends_nothing():
    mailer = RecordingMailer()
    Invoice(order_id=41, mailer=mailer, dry_run=True).emit()
    assert mailer.outbox == []


def test_live_run_sends_one_invoice():
    mailer = RecordingMailer()
    Invoice(order_id=41, mailer=mailer).emit()
    assert mailer.outbox == ["invoice for order 41"]`, 'fake_mailer.py'),
        b.md(`
Both tests are the same assertions you would write against the real thing, and neither one knows whether the mailer is SMTP.

The rules that keep doubles from eating the test suite:

- **Never assert on how many times something was called unless the count is the behaviour.** \`assert_called_once_with\` is a real assertion about a real contract; \`assert mock.called\` is usually a substitute for testing the return value.
- **Never mock the type you are testing.** Mocking your own class under test tests nothing.
- **Prefer injecting to patching.** A function that takes a \`mailer\` parameter can be given a fake in the test and left alone in production. \`patch("cart.MAILER")\` rewrites module state and needs to be undone correctly.
- **Do not mock stdlib types you could construct.** \`datetime\` has a real \`now()\`; use \`freezegun\` if you need control over time rather than mocking the whole module.
- **If a test needs more than two or three mocks, the design is wrong.** That many collaborators is a function with too many responsibilities.

## Naming, and what to test first

A test name is the only documentation that is guaranteed to be read at the moment it matters, which is in CI, months later:

- \`test_<unit>_<behaviour>_<condition>\` — \`test_discount_applies_to_the_subtotal\`, \`test_zero_quantity_is_rejected\`. The name should read as an English sentence about behaviour, with no "test that" and no "should".
- The order in the file is the order a reader reads them. Group by unit, not by test type.

What to test first, in the order that actually pays:

1. **Domain rules with a wrong answer.** A percentage that rounds wrongly, a shipping tier boundary, a tax rule. These are the things that are hard to fix retroactively and expensive to get wrong.
2. **Edge cases of your own data structures.** Empty input, one element, the largest thing you have seen, duplicates, unicode, a \`None\` where you did not expect it.
3. **Bug fixes.** Every time you fix a bug, write the test that would have caught it *before* you fix it, and watch it fail. This is the one habit that makes a suite grow in a way that pays for itself.
4. **Boundaries between your units.** The function that consumes what the other function produces.
5. **Getters, setters and framework glue.** Almost never. They are the code with the fewest interesting branches.

## Coverage is a hint, not a goal

\`pytest --cov=cart --cov-report=term-missing\` produces a number, and that number is genuinely useful for one thing: **finding the code nobody exercises**. It is not useful as a target.

Chasing 100% produces tests that execute lines without asserting anything (\`assert isinstance(result, object)\` covers six lines and catches zero bugs), and it produces tests that break on every refactor because they assert on internals. A suite that runs in four seconds and covers 78% of the lines that matter is worth more than one that takes six minutes to cover 100% and still misses your rounding rule.

Use coverage to ask *"which function has zero tests?"*, not *"which line is red?"*.`),
        b.checklist('A testing routine that survives contact with a deadline', [
          'Write the test first for every bug fix, and run it to watch it fail before you change the code',
          'One test, one behaviour, and a name that reads as a sentence about behaviour',
          'Assert on the value a caller would observe, never on which internal helper ran',
          'Rebuild every fixture per test — no module-level mutable state, no test-order dependency',
          'Mock only what you do not own; prefer a real object, then a fake, then a mock',
          'Keep the suite under ten seconds; if it is slower, something reaches a network, a clock or a real filesystem',
          'Make randomness deterministic: seed `random`, pass an injectable `now`, use `tmp_path` instead of `/tmp`',
          'Never sleep. If you are waiting for an event, poll with a timeout or restructure the code to expose the event',
          'Read coverage for untested functions, never as a percentage to optimise',
          'A failing test is information: read the assertion message before touching the implementation',
        ]),
        b.diagram(
          'The runner lifecycle, and where fixtures plug in',
          `flowchart TD
    A["pytest / unittest.main()"] --> B["Collect<br/>import every test_*.py<br/>reflect over TestCase subclasses"]
    B --> C["Sort<br/>by class then method name<br/>so runs are reproducible"]
    C --> D{"Next test"}
    D --> E["setUpClass / module setup<br/>once per class"]
    E --> F["setUp / fixture setup<br/>once per test — a fresh object every time"]
    F --> G["Run the test body<br/>the only place that touches production code"]
    G --> H{"Assertion fails?"}
    H -- "no" --> I["tearDown / fixture finalise"]
    H -- "yes" --> J["Record the failure<br/>with the full traceback"]
    J --> I
    I --> K{"More tests?"}
    K -- "yes" --> D
    K -- "no" --> L["Summary: counts, duration, verdict<br/>exit code drives CI"]`
        ),
        b.warn(
          'The tests that lie to you',
          'A test with no assertions passes. A test that asserts `assert result is not None` passes while the result is wrong. A test that mocks everything passes while nothing real is exercised. A test that shares a fixture object between cases passes in the order you wrote and fails in the order CI chose. A test with a `time.sleep()` in it passes on your laptop and fails once a build machine is under load. Every one of these is faster to prevent when you write the test than to debug when it lies.',
        ),
        b.tip(
          'The 20-minute version',
          'Pick the module with the most rules and no tests. Write five tests: the happy path, empty input, a boundary value, one known-wrong case, and one that reproduces the last bug you shipped. Run them on every save. That is a testing habit. Aiming at full coverage before you have any tests is how suites get abandoned.',
        ),
      ],
      questions: [
        [
          'Why is a bare `assert` statement risky in a test suite even under pytest?',
          [
            'pytest cannot discover assert statements inside functions',
            'The Python -O optimisation flag strips assert statements from the bytecode, so an optimised run reports success without testing anything',
            'assert is slower than assertEqual',
            'assert does not work outside a class',
          ],
          1,
          'assert is a statement, and -O tells the compiler to remove all assert statements along with docstrings. A suite run with -O executes the calls, executes no assertions, and exits 0 — the worst possible failure, because it looks like a pass. pytest restores assert behaviour via its own assertion rewriting, but the robust answer is a framework whose assertions are ordinary function calls.',
        ],
        [
          'What is the practical difference between `setUp` and a pytest fixture?',
          [
            'setUp is faster',
            'A fixture can be shared across test files, requested per test at several levels, or built once per module/session',
            'pytest fixtures cannot create objects',
            'setUp runs once per class, fixtures run per test',
          ],
          1,
          'setUp is per-test and per-class, which is all it does. Fixtures are dependency-injected: a test declares what it needs by parameter name, pytest resolves it, and the same fixture can be overridden per module or shared project-wide. Scoping (function, class, module, session) is what replaces setUpClass.',
        ],
        [
          'You need to test a function that sends an email. What should you do?',
          [
            'Patch the smtplib module with a Mock and assert it was called',
            'Inject the mailer as a parameter and pass a recording fake in the test',
            'Send a real email to yourself and check your inbox',
            'Skip the test, since it needs the network',
          ],
          1,
          'Email is a dependency you do not own, so it is a legitimate thing to fake — but injection beats patching, because it removes the need to mutate module state and to undo that mutation. Patching smtplib specifically is also testing your assumption that the smtplib code path is the only thing that sends mail, which stops being true the moment someone swaps in a different transport.',
        ],
        [
          'A function `charge(amount)` should reject a negative amount with ValueError. Which test is strongest?',
          [
            '`assert charge(-5) is not None`',
            '`assert charge(-5) == 0`',
            '`with pytest.raises(ValueError, match="non-negative"): charge(-5)`',
            '`charge(-5)` on its own, with no assertion',
          ],
          2,
          'The context manager asserts that a ValueError was raised and that its message matches, so the test fails both when the guard is missing and when some unrelated ValueError is thrown from a different line. Options one, two and four pass regardless of whether the guard exists — option four because an exception there would propagate and fail, but option one and two pass whether the function returns an error, returns zero, or returns garbage.',
        ],
      ],
    },
  ]
);
