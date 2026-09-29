// Module 10 — Errors and Exceptions.
//
// The last module of the core language. Everything here is about one idea:
// a program that fails should fail *loudly, immediately, and with a message
// that names the cause* — and a program that cannot fail should not pretend
// it can.
//
// The three lessons run in the order you actually need them: catching what
// goes wrong, then raising it properly, then working out why it happened.

import { mod } from '../blocks';

export const M10 = mod(
  'crs-python-programming',
  'py-m10',
  10,
  'Module 10 — Errors and Exceptions',
  'Catch, raise, chain and debug failures so that a wrong program stops quickly and says why.',
  [
    /* ====================================================================== */
    /* 1. try / except / else / finally                                       */
    /* ====================================================================== */
    {
      title: 'try / except / else / finally',
      summary: 'The four clauses and what each is for, which exceptions to catch, and why return inside finally is a bug.',
      duration: 17,
      build: (b) => [
        b.md(`## Errors are the normal path, not the exceptional one

In Python an error is an **object** — an exception instance — that travels up the call stack until something catches it. Nothing is thrown in the C sense; the interpreter raises an object and unwinds frames until a \`except\` block claims it.

\`\`\`python
try:
    risky()
except SomeError as exc:
    recover(exc)
\`\`\`

Four clauses, each with a distinct job, and the fact that they are four rather than two is the single most useful thing in this lesson:

| Clause | Runs when | For |
| --- | --- | --- |
| \`try\` | always | the code that might fail — and nothing else |
| \`except\` | an exception was raised and matches | turning a failure into a decision |
| \`else\` | the \`try\` block finished with no exception | the *success* path, outside the protected zone |
| \`finally\` | always, exception or not | cleanup that must happen either way |

The \`else\` clause is the one everyone skips and the one that most improves your code. Code in \`try\` that does not need protection belongs in \`else\`, because anything in \`try\` runs under the exception handler:

\`\`\`python
# BAD: a bug in the processing is silently swallowed as if it were bad input.
try:
    raw = read_config(path)
    settings = process(raw)          # this is not I/O; why is it protected?
except IOError:
    settings = DEFAULT_SETTINGS
\`\`\`

\`\`\`python
# GOOD: only the I/O is guarded, so a bug in process() still crashes loudly.
try:
    raw = read_config(path)
except OSError:
    raw = None

settings = process(raw) if raw else DEFAULT_SETTINGS
\`\`\`

The general rule: **\`try\` should be as small as it can be while still covering the operation that can genuinely fail.**`),
        b.anim('pipeline', {
          title: 'One function, four clauses, two outcomes',
          badge: 'clause by clause',
          stages: [
            {
              name: 'try',
              tool: 'protected',
              in: 'load("config.toml")',
              out: 'either a parsed dict, or an exception object',
              detail: 'Everything inside try runs under the handler. Keep it to the one call that can actually fail — a try block that covers twenty lines will one day hide a bug in line fifteen.',
              tone: 'code',
            },
            {
              name: 'except',
              tool: 'match',
              in: 'either a parsed dict, or an exception object',
              out: 'handled, or re-raised untouched',
              detail: 'The handler tests the exception against each except clause in order and runs the first match. A clause with no type — `except:` — matches everything, which is almost always wrong. An unmatched exception is not swallowed; it propagates.',
              tone: 'warn',
            },
            {
              name: 'else',
              tool: 'happy path',
              in: 'try finished with no exception',
              out: 'the success work runs',
              detail: 'else runs only when the try block completed. Because the success work lives outside the protected region, a TypeError in your parsing code is a crash, not a silently-reverted default. This is the clause that makes try blocks safe to write.',
              tone: 'ok',
            },
            {
              name: 'finally',
              tool: 'always',
              in: 'whatever happened above',
              out: 'cleanup runs exactly once',
              detail: 'finally runs on the normal path, on the handled path, and on the unhandled path as the exception unwinds. It is the right place for close(), unlock(), rollback() and temp-file cleanup. It should not raise and should not return.',
              tone: 'auto',
            },
          ],
          artifacts: {
            'load("config.toml")': 'def load(path):\n    """Read a TOML config, falling back to defaults when absent."""\n    try:\n        with open(path, "rb") as handle:      # <- the only call that can fail\n            return tomllib.load(handle)\n    except FileNotFoundError:\n        return {}\n    except OSError as exc:\n        raise ConfigError(f"cannot read {path}") from exc\n    else:\n        print(f"loaded {path}")                # only on success',
            'either a parsed dict, or an exception object': 'class ConfigError(Exception):\n    """Raised when configuration cannot be loaded."""\n\n# The object carries the message, the type, and the traceback\n# of every frame it passed through on the way up.\n>>> exc = FileNotFoundError(2, "No such file or directory")\n>>> exc.args\n(2, \'No such file or directory\')\n>>> str(exc)\n"[Errno 2] No such file or directory: \'nope.toml\'"',
            'handled, or re-raised untouched': '# What each shape of except clause means.\n\ntry:\n    risky()\nexcept FileNotFoundError:\n    ...          # one specific type. Good.\n\ntry:\n    risky()\nexcept (OSError, ValueError):\n    ...          # a tuple of types. Good, when they get the same treatment.\n\ntry:\n    risky()\nexcept Exception as exc:\n    ...          # almost every runtime error. Usually a smell.\n\ntry:\n    risky()\nexcept:\n    ...          # EVERYTHING, including KeyboardInterrupt. Almost always a bug.',
            'try finished with no exception': '>>> import dis\n>>> help(parse)\n\n# else and finally are not "extra" — they are control flow, and\n# the bytecode shows them: the try block sets up a block manager,\n# else becomes a jump target, and finally is duplicated inline\n# on the normal path and again on the exception path so it runs\n# exactly once either way.',
            'the success work runs': '>>> parse("1,2,3")\n[1, 2, 3]\n>>> parse("a,b")\nTraceback (most recent call last):\n  File "csv.py", line 11, in parse\n    return [int(x) for x in text.split(",")]\nValueError: invalid literal for int() with base 10: \'a\'\n\n# No handler claimed ValueError, so it propagated. The caller now\n# knows its input was malformed instead of silently getting [].',
            'whatever happened above': 'def process(path):\n    """Always close the file, whether or not parsing worked."""\n    handle = open(path, "rb")\n    try:\n        return tomllib.load(handle)\n    finally:\n        handle.close()\n\n# After any return, raise, or break, finally runs first.\n# That is the whole contract, and it is why with-statement\n# exists: `with open(path) as h:` is this, written once.',
            'cleanup runs exactly once': '# The anti-pattern: a return inside finally.\n\ndef bad_parse(text):\n    try:\n        return [int(x) for x in text.split(",")]\n    except ValueError as exc:\n        raise ParseError(text) from exc\n    finally:\n        return []          # <-- swallows EVERY exception above\n\n>>> bad_parse("a,b")\n[]                          # the ValueError is discarded entirely\n>>> bad_parse("1,2")\n[]                          # even the success case is wrong\n\n# CPython emits SyntaxWarning: return in finally for exactly this.',
          },
        }),
        b.lead('Which exception should you catch?'),
        b.md(`Catching the wrong breadth is the number one way people write error handling that hides bugs instead of fixing them.

**Catch the narrowest type you can name.** If you know the failure is a missing key, catch \`KeyError\`. If you know it is a bad integer, catch \`ValueError\`. Every level of specificity is a level of false confidence removed.

\`\`\`python
# BAD: every failure becomes the same silent default.
def parse_port(text):
    try:
        return int(text)
    except Exception:
        return 8080

print(parse_port("not a number"))   # 8080
print(parse_port(None))            # 8080

# GOOD: only the two things we can name are handled, and neither
# is papered over — the caller gets a loud, typed failure.
def parse_port(text):
    try:
        return int(text)
    except (ValueError, TypeError):
        raise ValueError(f"port must be an integer, got {text!r}") from None
\`\`\`

The difference is the whole point of the second version. The first one **invents** a port: \`parse_port(None)\` quietly returns 8080 and the bug that produced the \`None\` is gone forever, wearing a plausible number. The second one **translates** it — \`None\` was a caller bug, and the caller gets an exception that says so instead of a service listening on a port nobody chose.

Neither version defaults, and that is deliberate. Defaulting is a decision about what a missing value should mean, and it belongs to the caller, not to the parser. \`except (ValueError, TypeError)\` also adds a message and uses \`from None\`, which is covered in the next lesson.

**\`except Exception\` is sometimes right.** It is the right choice when:

- you are a **library boundary** and must not let an implementation detail from a third-party package escape — a plugin loader that logs and falls back, or a framework's top-level request handler that must return a 500 rather than dying;
- you are **retrying**, and the failure is genuinely "any kind of I/O problem";
- you are **converting to a different abstraction**, and you will log the original with \`logger.exception\` so nothing is lost.

It is wrong when you cannot name what you are catching. \`except Exception: pass\` is a code smell with a name: it is a bug that reports success.

**\`except:\` with no type is nearly always a bug.** It catches \`BaseException\`, which includes \`KeyboardInterrupt\` and \`SystemExit\` — so your program becomes uncancellable with Ctrl-C, and \`sys.exit()\` inside anything you call becomes a no-op. If you genuinely need it, you almost certainly want \`except Exception:\` instead.`),
        b.code(`import json


def load_config(path, *, strict=False):
    """Return the parsed config, or an empty dict if it cannot be read.

    The except clauses are ordered narrow to broad, which is the
    convention: the most specific handling goes first and the general
    one is the safety net at the bottom.
    """
    try:
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
    except FileNotFoundError:
        if strict:
            raise
        return {}
    except UnicodeDecodeError as exc:
        raise ValueError(f"{path} is not valid UTF-8") from exc
    except OSError as exc:
        if strict:
            raise
        print(f"warning: cannot read {path}: {exc}")
        return {}

    # Everything below is the success path, guarded by the else clause.
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        # json.JSONDecodeError is a subclass of ValueError, and the
        # message already names the line and column, so just add context.
        raise ValueError(f"{path} is not valid JSON: {exc}") from exc
    else:
        print(f"loaded {path} ({len(text)} bytes)")`, 'load_config.py'),
        b.lead('except E as e, and what str(e) gives you'),
        b.md(`\`except SomeError as exc:\` binds the exception object to a name. Three things you can do with it:

\`\`\`python
try:
    int("abc")
except ValueError as exc:
    print(exc)             # invalid literal for int() with base 10: 'abc'
    print(str(exc))        # the same thing — str() is what print() calls
    print(repr(exc))       # ValueError("invalid literal for int() with base 10: 'abc'")
    print(exc.args)        # ('invalid literal for int() with base 10: 'abc'',)
    print(type(exc).__name__, exc.args[0])   # ValueError invalid literal ...
\`\`\`

The useful habit: \`print(exc)\` in a test, and **\`raise ... from exc\`** in production, because it keeps the original error visible in the traceback instead of replacing it. That is the next lesson.

One scoping detail worth knowing, because it trips people up: **\`exc\` is deleted at the end of the \`except\` block.** Python does this deliberately, so a reference to the exception cannot keep a large traceback alive for the rest of the program. It means this is an error:

\`\`\`python
try:
    risky()
except ValueError as exc:
    pass

print(exc)        # NameError: name 'exc' is not defined
\`\`\`

If you need the object after the block, assign it to a different name inside the block. Almost nobody does, and the fact that you cannot is usually a sign you should not need to.`),
        b.md(`## finally, and the one thing you must never put in it

\`finally\` runs on all three paths: normal completion, a handled exception, and an unhandled exception on its way out of the function. It is the right place for anything that must happen regardless — closing a file, releasing a lock, rolling back a transaction, deleting a temporary file.

\`\`\`python
def read_first_line(path):
    """Return the first line of a file, always closing it."""
    handle = open(path, encoding="utf-8")
    try:
        return handle.readline()
    finally:
        handle.close()
\`\`\`

That is exactly what the \`with\` statement does, so prefer \`with\`:

\`\`\`python
def read_first_line(path):
    """Return the first line of a file. with closes it for us."""
    with open(path, encoding="utf-8") as handle:
        return handle.readline()
\`\`\`

**The rule: never \`return\`, \`break\` or \`continue\` from a \`finally\` block.** It does not merely "work with a warning" — it *replaces* whatever the block was about to do, including an in-flight exception. The exception does not just get suppressed; it is discarded, and the function returns normally.

\`\`\`python
def parse(text):
    try:
        return int(text)
    except ValueError:
        return 0
    finally:
        return -1        # <-- every call returns -1


print(parse("42"))       # -1, not 42
print(parse("oops"))     # -1, and the ValueError vanished
\`\`\`

CPython emits a \`SyntaxWarning: return in finally\` for exactly this, and linters flag it. If you feel the need to return from a \`finally\`, you want one of these instead:

- **To override a return value** — restructure so the \`finally\` does not return, and put the override in the \`else\` clause or after the \`try\`.
- **To suppress an exception deliberately** — catch it in an \`except\` block and return there, explicitly, where the intent is visible.
- **To translate an exception** — \`raise NewError(...) from exc\` in the \`except\` block, never a \`return\` in \`finally\`.`),
        b.table('Choosing the right clause', ['Situation', 'Use', 'Why'], [
          ['Reading a file that may not exist', 'except FileNotFoundError', 'Naming the exact failure means a permissions error still crashes'],
          ['Two unrelated errors with identical handling', 'except (KeyError, IndexError):', 'A tuple documents the intent better than a bare Exception'],
          ['A library boundary or a plugin loader', 'except Exception as exc: log...', 'You must not let an implementation detail escape; log it so nothing is lost'],
          ['Retrying an I/O operation', 'except OSError:', 'OSError is the family that actually means "the machine said no"'],
          ['Cleaning up regardless', 'finally, or a with block', 'It runs on every path, and `with` says it in one line'],
          ['The success path', 'else', 'Keeps the happy path out of the protected region'],
          ['Cleanup that must not be interrupted', 'finally with no return', 'A return there swallows whatever was in flight'],
          ['Catching literally anything', 'Never `except:`', 'It also catches KeyboardInterrupt, so Ctrl-C stops working'],
        ]),
        b.tip(
          'Try to make the failure impossible before you catch it',
          'Most `try` blocks exist to paper over a type check that could have been done once, earlier. `if not isinstance(value, str): raise TypeError(...)` at the top of a function is a better investment than wrapping the whole body in `except (TypeError, AttributeError, ValueError)`. Exceptions are for the cases you genuinely cannot check in advance — a network that went down, a disk that filled, a file that a concurrent process deleted.',
        ),
        b.warn(
          'Catching too much, then swallowing it',
          'The pattern that hides real bugs: a broad `except Exception`, and inside it a `pass` or a `return None`. Now a typo in an attribute name produces a wrong answer instead of a crash, and the traceback you would have needed is gone. If you must catch broadly, at minimum log it with `logger.exception(...)` so the original is recoverable — that is the subject of the last lesson.'
        ),
      ],
      questions: [
        [
          'When does the `else` clause of a `try` statement run?',
          ['Whenever the try block finishes, with or without an exception', 'Only when the try block completes without raising', 'Only when an exception was raised and caught', 'After the finally block, always'],
          1,
          'else is the success path. Putting the success work there keeps it outside the protected region, so a bug in your own processing is not mistaken for a failure of the operation you were guarding.',
        ],
        [
          'What does `except:` with no exception type catch?',
          ['Every Exception subclass', 'Only ValueError and TypeError', 'Everything, including KeyboardInterrupt and SystemExit', 'Nothing, because a type is required'],
          2,
          'A bare except catches BaseException, which is the root of the hierarchy. That is why Ctrl-C stops working inside the block and sys.exit becomes a no-op. `except Exception:` is nearly always what was meant.',
        ],
        [
          'Which of these does `finally` run after?',
          ['Only a normal return', 'Only an unhandled exception', 'A normal return, a handled exception, and an unhandled exception', 'Only a return statement inside the try block'],
          2,
          'finally runs on all three exits, which is what makes it the correct place for cleanup. That guarantee is also what makes a `return` inside it dangerous: it replaces all three outcomes with its own.',
        ],
        [
          'A function has `except ValueError: return 0` and `finally: return -1`. What does `parse("42")` return?',
          [
            '42, because the try block succeeded',
            '0, because the finally value is ignored on the normal path',
            '-1, because the return in finally overrides both the return and any exception',
            'A TypeError, because returning twice is illegal',
          ],
          2,
          'A return in finally discards whatever the block was about to do, including an exception still in flight. It is legal Python and a genuine bug; CPython warns about it with SyntaxWarning.',
        ],
      ],
    },
    /* ====================================================================== */
    /* 2. Raising, custom exceptions and chaining                              */
    /* ====================================================================== */
    {
      title: 'Raising, custom exceptions and chaining',
      summary: 'raise, raise ... from, custom exception hierarchies, the exception tree, assert, and why BaseException is off limits.',
      duration: 18,
      build: (b) => [
        b.md(`## raise is the other half of the mechanism

\`try\`/\`except\` is half of error handling. The other half is deciding that something is wrong and saying so, in your own words, at the point where you still know what the problem was.

\`\`\`python
raise ValueError("port must be between 1 and 65535")
raise RuntimeError                       # legal, but says nothing
raise                                    # legal: re-raise the exception being handled
\`\`\`

**Always include a message.** \`raise ValueError\` produces \`ValueError\` in the traceback, which tells the person reading it nothing about which of the four hundred \`ValueError\`s in your program fired. This is the single highest-value habit in this module, and it costs one string.

The message is not only for humans. \`ValueError(f"port must be between 1 and 65535, got {port!r}")\` is what a user sees in a form validation error, what ends up in a log line, and what you will grep for when the bug comes back. Use \`{value!r}\` for user-supplied values so that an empty string or a \`None\` is visible rather than invisible.

**\`raise\` with no argument re-raises**, and it only makes sense inside an \`except\` block:

\`\`\`python
def read_config(path):
    try:
        with open(path) as handle:
            return json.load(handle)
    except json.JSONDecodeError:
        log.error("%s is malformed", path)
        raise                      # re-raises the JSONDecodeError, traceback intact
\`\`\`

This is the correct way to "handle and continue" — do your cleanup or logging, then re-raise. A bare \`raise\` preserves the original traceback exactly; \`raise exc\` also works but resets the traceback's starting point, which loses the frames that led to the error.

## Chaining: the traceback of a traceback

When an exception passes through several frames, Python records every frame it visited in \`exc.__traceback__\`. If you catch it and raise something new, the original is normally **chained** as the *context*:

\`\`\`python
def parse_int(raw):
    """Return raw as an int, or raise a friendlier error."""
    return int(raw)                 # ValueError from here


def load_rows(reader):
    """Return the parsed rows, or raise a report-friendly error."""
    return [parse_int(row[1]) for row in reader]


def main():
    load_rows(csv.reader(open("sales.csv")))
\`\`\`

\`\`\`text
Traceback (most recent call last):
  File "report.py", line 24, in <module>
    load_rows(csv.reader(open("sales.csv")))
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "report.py", line 19, in load_rows
    return [parse_int(row[1]) for row in reader]
           ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "report.py", line 12, in parse_int
    return int(raw)
           ^^^^^^^
ValueError: invalid literal for int() with base 10: '12x'
\`\`\`

Now add a handler, and the picture changes:

\`\`\`python
def parse_int(raw):
    try:
        return int(raw)
    except ValueError:
        raise ValueError(f"quantity {raw!r} is not a number") from None
\`\`\`

The message is now aimed at whoever reads the report, and \`from None\` suppresses the confusing inner \`invalid literal for int()\` frame. The three chaining forms:

| Form | Sets | Traceback shows |
| --- | --- | --- |
| \`raise NewError(msg)\` inside \`except\` | \`__context__\` | "During handling of the above exception, another exception occurred" |
| \`raise NewError(msg) from exc\` | \`__cause__\` | "The above exception was the direct cause" — the chain is explicit |
| \`raise NewError(msg) from None\` | \`__cause__ = None\`, \`__suppress_context__\` | Only the new exception |

The rule: **\`from exc\` when the original is genuinely the cause, \`from None\` when the original was just noise.** A \`KeyError: 'port'\` while looking something up in a dict is usually noise; a \`ConnectionError\` that causes a \`TimeoutError\` in your own client is the cause.

The wording matters because it is what a reader sees. Python's two phrases are "The above exception was the direct cause of..." and "During handling of the above exception, another exception occurred..." — and the difference is a direct statement about whether you knew the original was the reason.`),
        b.anim('pipeline', {
          title: 'One raise, four frames, one traceback',
          badge: 'unwinding and chaining',
          stages: [
            {
              name: 'main',
              tool: 'call',
              in: 'main() calls load_rows(reader)',
              out: 'a frame for load_rows, and the __traceback__ grows',
              detail: 'Each frame that the exception passes through appends itself to __traceback__ as it unwinds. That linked list of frames is what the traceback printer walks when the exception reaches the top level uncaught.',
              tone: 'code',
            },
            {
              name: 'load_rows',
              tool: 'call',
              in: 'a frame for load_rows, and the __traceback__ grows',
              out: 'a frame for parse_int, and the __traceback__ grows',
              detail: 'A list comprehension creates a frame just like any other code, so it appears in the traceback too. This is why a one-line comprehension can produce a four-line traceback.',
              tone: 'code',
            },
            {
              name: 'parse_int',
              tool: 'int(raw)',
              in: 'a frame for parse_int, and the __traceback__ grows',
              out: 'ValueError, with a 3-deep __traceback__',
              detail: 'int() raises. Nothing here catches it, so the frame of parse_int is appended to __traceback__ and the search for a handler begins. Python searches the *current* frame first, then walks outward.',
              tone: 'warn',
            },
            {
              name: 'Chained or unchained',
              tool: 'raise ... from ...',
              in: 'ValueError, with a 3-deep __traceback__',
              out: 'either one exception, or two linked by __cause__',
              detail: 'A bare re-raise keeps a single exception with its full traceback. `raise Better(msg) from exc` produces a new exception whose __cause__ points at the old one, and the printer shows both, with the phrase naming the relationship.',
              tone: 'ptr',
            },
            {
              name: 'Top level',
              tool: 'sys.excepthook',
              in: 'either one exception, or two linked by __cause__',
              out: 'a traceback on stderr, exit code 1',
              detail: 'Nothing claimed it, so the interpreter prints the traceback and the process exits non-zero. Read it bottom-up: the last line is the exception type and message, and each line above it is the call that led there.',
              tone: 'bad',
            },
          ],
          artifacts: {
            'main() calls load_rows(reader)': '>>> load_rows(csv.reader(open("sales.csv")))\nTraceback (most recent call last):\n  File "report.py", line 31, in <module>\n    load_rows(csv.reader(open("sales.csv")))\n  File "report.py", line 24, in load_rows\n    return [parse_int(row[1]) for row in reader]',
            'a frame for load_rows, and the __traceback__ grows': '>>> exc.__cause__\nNone\n>>> exc.__context__\nNone\n>>> len(traceback.extract_tb(exc.__traceback__))\n2',
            'a frame for parse_int, and the __traceback__ grows': '>>> exc.__traceback__ is exc.__cause__.__traceback__\nTrue\n\n# The same frame is NOT the same object on every re-raise;\n# extract_tb() is the supported way to walk it.',
            'ValueError, with a 3-deep __traceback__': 'Traceback (most recent call last):\n  File "report.py", line 31, in <module>\n    load_rows(csv.reader(open("sales.csv")))\n  File "report.py", line 24, in load_rows\n    return [parse_int(row[1]) for row in reader]\n  File "report.py", line 17, in parse_int\n    return int(raw)\nValueError: invalid literal for int() with base 10: \'12x\'',
            'either one exception, or two linked by __cause__': '# Unchained: raise, with the same traceback as above.\nValueError: invalid literal for int() with base 10: \'12x\'\n\n# Chained: `raise ValueError(f"bad qty {raw!r}") from exc`\nTraceback (most recent call last):\n  File "report.py", line 17, in parse_int\n    raise ValueError(f"bad quantity {raw!r}") from exc\nValueError: bad quantity \'12x\'\n\nThe above exception was the direct cause of the following exception:\n\nTraceback (most recent call last):\n  ... (the three frames above, unchanged) ...\nValueError: invalid literal for int() with base 10: \'12x\'\n\n# Suppressed: `from None`\nValueError: bad quantity \'12x\'\n\n# Read the phrase. "direct cause" means you know why.\n# "during handling" means the two are related but not causal.',
            'a traceback on stderr, exit code 1': 'Traceback (most recent call last):\n  File "report.py", line 31, in <module>\n    load_rows(csv.reader(open("sales.csv")))\n  File "report.py", line 24, in load_rows\n    return [parse_int(row[1]) for row in reader]\n  File "report.py", line 17, in parse_int\n    return int(raw)\nValueError: invalid literal for int() with base 10: \'12x\'\n\n$ echo $?\n1\n\n# Read it bottom-up: the exception type and message, then the\n# innermost frame, then outward to main. The innermost frame is\n# where it happened; the outermost is how you got there.',
          },
        }),
        b.diagram(
          'The exception hierarchy',
          `flowchart TD
    BE["BaseException<br/>the root; do not catch it"]
    BE -->     EX["Exception<br/>the one to catch"]
    BE --> KI["KeyboardInterrupt<br/>Ctrl-C"]
    BE --> SY["SystemExit<br/>sys.exit()"]
    BE --> GE["GeneratorExit<br/>generator.close()"]
    EX --> VE["ValueError<br/>right type, wrong value"]
    EX --> TE["TypeError<br/>wrong type entirely"]
    EX --> KE["KeyError<br/>missing dict key"]
    EX --> IE["IndexError<br/>out of range on a sequence"]
    EX --> AE["AttributeError<br/>no such attribute"]
    EX --> OE["OSError<br/>the machine said no"]
    OE --> FNFE["FileNotFoundError"]
    OE --> PE["PermissionError"]
    EX --> RE["RuntimeError<br/>generic runtime failure"]
    EX --> ARE["ArithmeticError"]
    ARE --> ZDE["ZeroDivisionError"]
    EX --> IMP["ImportError"]
    IMP --> MNAE["ModuleNotFoundError"]
    APP["your app base<br/>class AppError(Exception)"]
    EX --> APP
    APP --> CFG["ConfigError"]
    APP --> VAL["ValidationError"]`
        ),
        b.md(`## Writing your own exceptions

A custom exception is a class. That is the whole mechanism, and you should write them the moment your library grows a second error.

\`\`\`python
class AppError(Exception):
    """Base class for every error this package raises."""


class ConfigError(AppError):
    """Configuration could not be loaded or is invalid."""


class ValidationError(AppError):
    """A value failed a documented rule.

    Attributes:
        field: the name of the offending field, if known.
    """

    def __init__(self, message, *, field=None):
        super().__init__(message)
        self.field = field


raise ValidationError("port must be 1..65535", field="port")
\`\`\`

The hierarchy decision, in the order you should make it:

- **Subclass \`Exception\`, not \`BaseException\`.** A \`BaseException\` subclass can be caught by a bare \`except:\` somewhere you do not control, which means your errors can be swallowed by a Ctrl-C handler. \`Exception\` is the contract: "this is a normal thing that can go wrong."
- **Subclass a specific builtin if one fits.** \`ValueError\` for a bad value, \`KeyError\` for a missing key, \`OSError\` for I/O. Then \`except ValueError:\` in a caller catches yours too, and you have not invented a taxonomy.
- **Give the package one base of your own**, and put every custom error under it. \`except AppError:\` in a caller then catches the whole family, and adding a new error later does not break anyone.
- **Give it extra attributes only when a caller will actually use them.** \`ValidationError.field\` is worth it because a form handler can put the message next to the right input. \`MyError.internal_code_3\` is not.

\`\`\`python
def load_port(settings):
    """Return the configured port, or raise ValidationError."""
    port = settings.get("port")
    if not isinstance(port, int):
        raise ValidationError(
            f"port must be an int, got {type(port).__name__}",
            field="port",
        )
    if not 1 <= port <= 65535:
        raise ValidationError(f"port {port} is out of range 1..65535", field="port")
    return port
\`\`\``),
        b.code(`class DataError(Exception):
    """Base class for every error in this package."""


class SchemaError(DataError):
    """The input did not match the expected shape."""


class RowError(DataError):
    """One row was bad. Carries the row number and the original text.

    Attributes:
        row_number: 1-based index of the offending row.
        raw: the original line, kept for the error message.
    """

    def __init__(self, row_number, raw, reason):
        self.row_number = row_number
        self.raw = raw
        super().__init__(f"row {row_number}: {reason} ({raw!r})")


def parse_rows(lines, *, strict=True):
    """Return [(int, str)] pairs, raising DataError subclasses on bad input.

    strict=True raises on the first bad row; strict=False collects them
    and re-raises once, so the user sees every problem in one go.
    """
    rows = []
    problems = []
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            qty, name = line.split(",", 1)
            rows.append((int(qty), name.strip()))
        except ValueError:
            # from None: the int() message is noise once we add row context.
            problem = RowError(number, line, "expected 'quantity,name'")
            if strict:
                raise problem
            problems.append(problem)

    if problems:
        # One exception, many problems: the user fixes them in one pass.
        summary = "; ".join(str(p) for p in problems)
        raise SchemaError(f"{len(problems)} bad rows: {summary}")
    return rows


print(parse_rows(["2,widget", "bad line", "x,thing"]))
# DataError: 2 bad rows: row 2: expected 'quantity,name' ('bad line'); row 3: ...`, 'errors.py'),
        b.lead('assert, and the -O flag that removes it'),
        b.md(`\`assert\` raises \`AssertionError\` when an expression is false. It is a **debugging and invariant tool**, not input validation.

\`\`\`python
def normalise(values):
    """Return values scaled so the maximum is 1.0."""
    assert values, "normalise() needs at least one value"
    biggest = max(values)
    return [v / biggest for v in values]
\`\`\`

Two properties you must know:

**1. \`python -O\` removes them.** The \`-O\` flag sets the interpreter's optimisation mode, and \`assert\` statements are not executed at all. Worse, many teams run production with \`PYTHONOPTIMIZE=1\`, so the check silently disappears and you find out from a customer.

**2. An \`assert\` cannot be used as input validation**, because a user can turn it off:

\`\`\`python
# WRONG: with -O, the validation vanishes and callers get corrupt data.
def parse_age(text):
    age = int(text)
    assert 0 <= age < 150
    return age


# RIGHT: always runs, and carries a message the user can act on.
def parse_age(text):
    try:
        age = int(text)
    except ValueError as exc:
        raise ValueError(f"age must be a whole number, got {text!r}") from exc
    if not 0 <= age < 150:
        raise ValueError(f"age {age} is out of range 0..149")
    return age
\`\`\`

Where \`assert\` *is* right:

- **Internal invariants.** "This must be true and is my code's fault if it is not." After a normalisation step: \`assert 0.0 <= ratio <= 1.0\`.
- **Type narrowing for a checker.** \`assert isinstance(x, Node)\` lets mypy treat \`x\` as a \`Node\` in the rest of the function.
- **Unreachable code.** \`assert False, "unreachable"\` after a branch that cannot be reached, so adding a case later fails loudly.
- **Tests.** \`assert result == 42\` is the standard library test idiom, because an \`assert\` that never fails is a test that passes.`),
        b.warn(
          'Never catch BaseException',
          '`except BaseException:` catches KeyboardInterrupt, SystemExit and GeneratorExit as well as every ordinary error. The consequences are concrete: Ctrl-C stops working, `sys.exit()` inside anything you call becomes a no-op, so a CLI cannot exit early, and context managers using `__exit__` misbehave. `except Exception:` catches every *error* and leaves every *control-flow signal* alone. If you believe you need BaseException, you almost certainly need `finally` instead, which runs without swallowing anything.'
        ),
        b.tip(
          'Check the exception, do not parse the message',
          'It is tempting to detect an error by matching its text — `if "not found" in str(exc)`. Never. Messages change between Python versions, are localised in some builds, and are not part of any compatibility promise. Match the type: `except FileNotFoundError:`. If no type fits what you need, raise your own exception with the data as attributes, and match on those.'
        ),
      ],
      questions: [
        [
          'What is the difference between `raise NewError(msg) from exc` and `raise NewError(msg) from None`?',
          [
            '`from exc` re-raises exc; `from None` re-raises NewError',
            '`from exc` marks the original as the direct cause and shows both; `from None` suppresses the original so only the new one is shown',
            'They are identical; `from None` is a style preference',
            '`from None` is only valid in Python 3.11 and later',
          ],
          1,
          'Both set __cause__, but `from None` also sets __suppress_context__, so the traceback printer hides the original. Use `from exc` when the original is genuinely the cause and `from None` when it was noise.',
        ],
        [
          'What does a custom exception class inherit from, and why?',
          [
            'BaseException, so it can be caught by any handler',
            'Exception, so ordinary `except Exception` handlers work but Ctrl-C and sys.exit are unaffected',
            'object, because exceptions are not classes',
            'ValueError, because every error is a bad value',
          ],
          1,
          'Exception is the contract for "a normal thing that went wrong". Inheriting BaseException means a bare `except:` can swallow your errors, and the package base class gives callers one place to catch the whole family.',
        ],
        [
          'What happens to `assert` statements when Python runs with `-O`?',
          [
            'They are checked but warnings are suppressed',
            'They are removed entirely and never execute',
            'They raise AssertionError instead of their condition',
            'They are converted into logging calls',
          ],
          1,
          'Optimisation mode does not execute assert statements at all, and production deployments frequently set PYTHONOPTIMIZE. Anything that must hold for correct behaviour has to be a real `if` and a real `raise`.',
        ],
        [
          'Why is `raise ValueError` with no message a bad habit?',
          [
            'It is a syntax error without a message',
            'The traceback then says only `ValueError`, which does not say which of hundreds of raises fired',
            'The exception is not caught by `except ValueError`',
            'It converts the exception into a warning',
          ],
          1,
          'The type tells you the category of the problem; the message tells you the actual problem. Include the offending value with !r so that None, an empty string or a nested object is visible in the log.',
        ],
      ],
    },
    /* ====================================================================== */
    /* 3. Debugging and defensive programming                                  */
    /* ====================================================================== */
    {
      title: 'Debugging and defensive programming',
      summary: 'Reading a traceback bottom-up, assert for invariants, breakpoint and pdb, logging instead of print, and what to do when you cannot reproduce.',
      duration: 20,
      build: (b) => [
        b.md(`## Read a traceback from the bottom

A traceback is printed newest frame first, which is the wrong order to read it in. The frame at the **bottom** is where the exception was raised; each line above it is a caller that was on the stack at that moment; the topmost line is your \`__main__\` call that started everything.

So the reading order is:

1. **The last line** — the exception type and its message. This is the fact.
2. **The bottom-most \`File\` line** — the exact line that raised. Read the source; the error message usually quotes the expression.
3. **Work upward** — each frame is how execution got to the line below. Stop when the frame is a *function you wrote and control*.

Most people read top-down, see their own \`main()\`, and conclude it is fine. It is the deepest library frame and your own innermost call that matter. In a \`KeyError\`, the bottom line names the key. In an \`IndexError\` from a third-party library, the message is useless and you need the source line to understand the index arithmetic.

Two traceback habits worth building immediately:

- **Read the exception type before the message.** \`KeyError: 'port'\` is a dict lookup that missed. \`TypeError: can only concatenate str\` is a type error. The type tells you the family and therefore where to look.
- **The \`^^^^^\` carets under the failing expression are new and genuinely useful.** Python 3.11+ points at the sub-expression, not the whole line:

\`\`\`text
  File "report.py", line 17, in parse_int
    return int(raw)
           ^^^^^^^
ValueError: invalid literal for int() with base 10: '12x'
\`\`\`

The \`str(exc)\` message is often the whole diagnosis for a \`ValueError\`, a \`KeyError\` or an \`IndexError\`, and it is worth ten seconds of reading before you open the file.

## The bug that is not a bug

The most valuable debugging lesson is that many "bugs" are correct code operating on data that is not what you assumed. Walking through a run line by line is how you see it.`),
        b.anim('trace', {
          title: 'A deduplication loop that deduplicates nothing',
          badge: 'watch the data',
          code: `log = ["00:00 GET /", "00:01 GET /a", "00:02 GET /b", "00:03 GET /c"]


def first_request(line):
    return line.split()[2]


seen = []
for line in log:
    if first_request(line) not in seen:
        seen.append(first_request(line))

print(seen)
print("requests:", len(seen))`,
          steps: [
            {
              caption: 'The raw log is one list of four strings.',
              note: 'Every request in this sample is unique, so a deduplication loop has nothing to deduplicate. Nothing is wrong yet — the assumption is.',
              line: 1,
              vars: [{ name: 'log', value: '4 entries, all distinct paths', tone: 'auto' }],
            },
            {
              caption: 'The helper is defined. No frame is created yet.',
              note: 'A def statement creates a function object; it does not run anything. The body of first_request has not executed a single line.',
              line: 2,
              vars: [
                { name: 'log', value: '4 entries', tone: 'auto' },
                { name: 'first_request', value: '<function>', tone: 'code' },
              ],
            },
            {
              caption: 'seen = [] — the accumulator starts empty',
              note: 'The list is a brand new object with zero elements. The loop below will test membership in it and append on a miss.',
              line: 5,
              vars: [
                { name: 'log', value: '4 entries', tone: 'auto' },
                { name: 'seen', value: '[]', tone: 'auto' },
              ],
            },
            {
              caption: 'Iteration 1: line is the first entry, seen is empty',
              note: 'first_request splits on whitespace and takes index 2, giving "/". The `not in` test against an empty list is always True, so the append happens.',
              line: 7,
              vars: [
                { name: 'line', value: '"00:00 GET /"', tone: 'char' },
                { name: 'first_request(line)', value: '"/"', tone: 'ok' },
                { name: 'seen', value: '[]  (test: "/" not in [])', tone: 'auto' },
              ],
            },
            {
              caption: 'The append runs. seen grows to one element.',
              note: 'Note that first_request is called twice per surviving line — once for the test and once for the append. That is a real inefficiency, and it is invisible until you count the calls.',
              line: 8,
              vars: [
                { name: 'seen', value: '["/"]', tone: 'ok' },
                { name: 'len(seen)', value: '1', tone: 'int' },
              ],
            },
            {
              caption: 'Iteration 2: "/a" is also not in seen',
              note: 'A different path, so it is also "new". The logic is behaving exactly as written; the input just has no duplicates for it to find.',
              line: 8,
              vars: [
                { name: 'seen', value: '["/", "/a"]', tone: 'ok' },
                { name: 'len(seen)', value: '2', tone: 'int' },
              ],
            },
            {
              caption: 'Iteration 3: "/b" joins the list',
              note: 'Same story. A fifth entry with a repeated path would be the first one filtered, and the count would finally drop below the number of lines.',
              line: 8,
              vars: [
                { name: 'seen', value: '["/", "/a", "/b"]', tone: 'ok' },
                { name: 'len(seen)', value: '3', tone: 'int' },
              ],
            },
            {
              caption: 'Iteration 4: "/c" joins, the loop ends with four entries',
              note: 'seen has exactly as many elements as log. The deduplication did nothing at all, because there was nothing to deduplicate. The bug is in the sample data, not the code.',
              line: 8,
              vars: [
                { name: 'seen', value: '["/", "/a", "/b", "/c"]', tone: 'warn' },
                { name: 'len(seen)', value: '4  == len(log)', tone: 'warn' },
              ],
            },
            {
              caption: 'The first print reveals the whole problem in one line',
              note: 'If the report is supposed to show unique paths and it shows all of them, the next question is not "why is the loop broken" but "are these actually distinct". Comparing len(seen) to len(log) is the check that answers it.',
              line: 10,
              vars: [
                { name: 'seen', value: '4 elements', tone: 'warn' },
              ],
              output: "['/', '/a', '/b', '/c']",
            },
            {
              caption: 'The count confirms it',
              note: 'Four in, four out. The fix is to test with data containing a repeat — "00:04 GET /a" — at which point seen stays at four and the loop does what it was written to do.',
              line: 11,
              vars: [
                { name: 'seen', value: '4 elements', tone: 'warn' },
              ],
              output: 'requests: 4',
            },
          ],
        }),
        b.lead('breakpoint() and pdb'),
        b.md(`\`breakpoint()\` is a function call that does nothing in normal operation. When it runs, it starts \`pdb\`, the standard-library debugger, and drops you into the frame that called it.

\`\`\`python
def normalise(values):
    breakpoint()                      # the interpreter stops here in a REPL
    biggest = max(values)
    return [v / biggest for v in values]
\`\`\`

\`\`\`text
(Pdb) l
  1  def normalise(values):
  2      breakpoint()
  3      biggest = max(values)
-> 4      return [v / biggest for v in values]
(Pdb) n                          # step over the current line
(Pdb) s                          # step into a call
(Pdb) c                          # continue to the next breakpoint
(Pdb) l 1, 4                     # list lines 1 to 4
(Pdb) p biggest                  # print an expression
(Pdb) pp values                  # pretty-print a container
(Pdb) a len(values)              # show an argument
(Pdb) w                          # the whole call stack
(Pdb) u 2                        # go up one frame
(Pdb) d                          # go down one frame
(Pdb) b 12                       # set a breakpoint on line 12
(Pdb) q                          # quit
\`\`\`

Two ways to get a post-mortem session, both worth memorising. Note that \`post_mortem()\` reads \`sys.exc_info()\`, so it only does anything when an exception is actually being handled.

\`\`\`python
# 1. Inside the handler, on the exception you just caught.
import pdb

try:
    risky(5)                  # 10 // (5 - 5)
except ZeroDivisionError:
    pdb.post_mortem()      # stops on the raising line, frames intact


# 2. Uncaught, at the very top of the entry-point script: it starts
#    pdb on the first exception that escapes, with the full stack.
import pdb
pdb.post_mortem()
main()
\`\`\`

\`\`\`python
# 3. For a loop too hot to step through, set a breakpoint that only
#    fires on the case you care about, and run to a count.
pdb.runcall(load_rows, rows)     # run a function under the debugger

# Inside pdb:
#   (Pdb) b 24, countmatch
#   24        if row["qty"] == 0:
#   countmatch
#   (Pdb) run 5               # stop on the 5th time this line is hit
#   (Pdb) condition 24 int(row["qty"]) > 1000
\`\`\`

A plain \`breakpoint()\` left in committed code is a nuisance, so make it swappable: \`breakpoint()\` looks up \`PYTHONBREAKPOINT\`, and setting that environment variable to \`0\` turns every \`breakpoint()\` in the codebase into a no-op. That is the standard way to disable debugger calls in production without editing the source.

In an editor the same thing is one keystroke: VS Code and PyCharm both give you a breakpoints gutter, and a debugger attached there gives you \`w\`, variable inspection and hot reload without leaving the IDE. **The debugger is not a sign that you cannot reason about code; it is a tool for when the reasoning has failed.**`),
        b.code(`import logging
import pdb

log = logging.getLogger(__name__)


def risky(n):
    """A function that fails, for the sake of the demo.

    n == 5 divides by zero, so risky(5) raises ZeroDivisionError.
    """
    log.debug("entering risky with n=%d", n)
    return 10 // (n - 5)


# 1. Print debugging, done properly.
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
)
log.info("about to call risky(5)")
try:
    risky(5)
except ZeroDivisionError:
    # logger.exception logs the message AND the traceback, at ERROR level.
    log.exception("risky failed")
    log.info("continuing anyway")

# 2. The three levels people actually need:
#    DEBUG  - detail, off in production
#    INFO   - normal milestones, visible in production
#    ERROR  - something failed, with a traceback
#    The default level is WARNING, so logging.basicConfig() with no
#    level shows you nothing at all until you set it. That is the
#    number one "logging is not working" cause.

# 3. Lazy formatting: the %s substitution happens only if the
#    record is actually emitted. f-strings are always evaluated.
log.debug("rows=%d", len(range(1000)))       # cheap when DEBUG is off
# log.debug(f"rows={len(range(1000))}")      # always computed

# Console output from the run above:
#   INFO    __main__: about to call risky(5)
#   DEBUG   __main__: entering risky with n=5
#   ERROR   __main__: risky failed
#   Traceback (most recent call last):
#     File "debugging.py", line 21, in <module>
#       risky(5)
#     File "debugging.py", line 12, in risky
#       return 10 // (n - 5)
#              ~~~^^~~~~~~~~
#   ZeroDivisionError: integer division or modulo by zero
#   INFO    __main__: continuing anyway
#   DEBUG   __main__: rows=1000
#
# The ERROR record carries the traceback and the exact expression
# that failed. That is the whole difference from print().

# 4. A post-mortem, on demand, at the crash site.
def guarded():
    try:
        risky(5)
    except ZeroDivisionError:
        pdb.post_mortem()          # comment this out when done`, 'debugging.py'),
        b.lead('The else clause as a clean happy path'),
        b.md(`The \`else\` block from the first lesson is the quiet hero of defensive programming. It lets you write validation that raises, a function that does one risky thing, and a success path that is completely unprotected:

\`\`\`python
def load_port(path):
    """Return the port from a config file, or 8080 when it is absent."""
    try:
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
    except OSError:
        # Only the I/O is guarded. Any bug in the parsing below
        # is a bug, not a missing file, and must crash loudly.
        return DEFAULT_PORT
    else:
        # Not covered by the handler at all: a KeyError here is a bug.
        return int(text.strip())
\`\`\`

Contrast with the version that hides bugs:

\`\`\`python
def load_port_broken(path):
    try:
        with open(path, encoding="utf-8") as handle:
            return int(handle.read().strip())
    except Exception:
        return DEFAULT_PORT
\`\`\`

The second one is shorter and worse. \`int()\` on malformed content raises \`ValueError\` and gets swallowed into a default port, so a typo in a config file silently becomes a service that listens somewhere nobody expected. The first version fails on a bad file and survives a missing one, which is the correct division.

## Validating at the boundary, once

The rule that keeps defensive programming cheap: **validate where data enters your system, and trust it everywhere inside.**

\`\`\`python
from decimal import Decimal, InvalidOperation


def parse_money(text, *, currency="INR"):
    """Return a Decimal. Raises ValueError with a usable message."""
    try:
        amount = Decimal(text.strip())
    except (InvalidOperation, AttributeError) as exc:
        raise ValueError(f"{text!r} is not an amount") from exc

    if not amount.is_finite():
        raise ValueError(f"{text!r} is not a finite amount")
    if amount < 0:
        raise ValueError(f"amount {amount} is negative")
    return amount, currency


# One place, one rule, one message. Every internal function can
# then assume a Decimal and will never need its own check.
print(parse_money(" 19.99 "))       # (Decimal('19.99'), 'INR')
print(parse_money("-1"))            # ValueError: amount -1 is negative
\`\`\`

Three properties of a good validator, all visible above:

- It **names the offending value** with \`!r\`, so a \`None\` or an empty string is distinguishable from a number.
- It **raises a type the caller can handle** — here a plain \`ValueError\`, which any caller already knows how to catch.
- It **does not fix things silently**. Clamping, truncating and defaulting are decisions the caller should make, not the parser. If you must fix it up, do it in a separate, explicitly named function like \`clamp_port()\` so the policy is visible at the call site.

## When you cannot reproduce the bug

This is the situation most people handle worst. A reasonable order of operations:

1. **Get the exact input.** Ask for the data, the environment, the version, and the exact command. A bug that depends on a 200 MB file is not reproducible without it, and nobody can guess.
2. **Read the traceback before changing anything.** Most "can't reproduce" reports contain the line number and the exception type, which is 80% of the diagnosis.
3. **Write a failing test from the report.** If the report says "empty list gives IndexError", the test is three lines. Once it fails in CI, the bug is fixed or it is not.
4. **Bisect the data.** If the input is huge, halve it until the bug disappears, then halve the other half. Ten or eleven rounds gets you to the single bad record, and \`bisect\` on a list of line numbers is fifteen lines of code.
5. **Suspect the environment** before the code. Timezone, locale, \`PYTHONHASHSEED\`, a \`__pycache__\` from an older version, a dependency that got upgraded by a \`>=\`, a different C library. Half of all "works on my machine" bugs are here, and \`pip freeze\` plus the Python version is 90% of the diagnosis.
6. **Suspect time.** Race conditions, \`dict\` ordering assumptions, cache expiry, timezone-naive datetimes, and anything that works in a test and fails at scale.
7. **Instrument rather than guess.** A \`log.debug\` at each stage boundary, deployed to the one environment that misbehaves, beats an afternoon of reasoning about code you can already run.
8. **Write it down.** If it took a day, the answer belongs in a comment, an issue, or a test. The same bug will come back, and it will come back as a different bug that looks unrelated.`),
        b.checklist('A debugging routine that works', [
          'Reproduce it first — an unreproducible bug cannot be fixed, only guessed at',
          'Read the traceback bottom-up: exception type, then the deepest `File` line, then work outward',
          'Read the exception *type* before the message; it narrows the search more than the text does',
          'Bisect the input before you bisect the code — one bad record beats one bad function',
          'Check the environment before the logic: Python version, `pip freeze`, timezone, locale, `PYTHONHASHSEED`',
          'Add one `log.debug` at each stage boundary rather than rewriting code to find the answer',
          'Capture `sys.exc_info()` or use `logger.exception` so the original traceback is never lost',
          'Turn the report into a failing test before you fix anything, so it cannot come back',
          'Once it is fixed, delete the temporary prints and keep the test',
        ]),
        b.resources('Debugging and error handling, further reading', [
          { label: 'The standard library docs for the logging module', url: 'https://docs.python.org/3/library/logging.html' },
          { label: 'The pdb debugger reference — every command in one page', url: 'https://docs.python.org/3/library/pdb.html' },
          { label: 'The traceback module, for reading and formatting tracebacks programmatically', url: 'https://docs.python.org/3/library/traceback.html' },
        ]),
        b.warn(
          'The three debugging mistakes that cost the most time',
          'First: fixing the symptom. `if len(items) == 0: return []` in three places, none of which explains why the list was empty, is three new bugs. Second: adding a broad `except Exception: pass` to make the symptom go away — the traceback you destroyed was the only copy of the evidence. Third: deleting the failing test because it is flaky. A flaky test is a real defect report about real-world nondeterminism, and it is frequently the actual bug you are chasing.'
        ),
        b.tip(
          'Keep the exception, not just the message',
          'When you log an error, `log.error(str(exc))` throws away the most useful part. `log.exception("could not load config")` logs the message, the exception type, and the full traceback of where it came from — at ERROR level, so it is visible in production. Use `log.warning(..., exc_info=True)` when the error is expected and you still want the traceback, and `log.debug(..., exc_info=True)` in a loop that might fire many times.'
        ),
      ],
      questions: [
        [
          'In a traceback, which line tells you where the exception was actually raised?',
          ['The first line, at the top', 'The last line, containing the exception type and message, paired with the bottom-most File line', 'The longest line', 'The line inside your `if __name__ == "__main__"` block'],
          1,
          'Tracebacks print newest frame first, so the bottom-most `File` entry is the raising line and the final line is its type and message. Everything above it is the call chain that got you there.',
        ],
        [
          'Why is `assert` the wrong tool for validating user input?',
          [
            'assert runs too slowly for user input',
            '`python -O` removes assert statements entirely, and production deployments often set PYTHONOPTIMIZE',
            'assert cannot compare strings',
            'assert must be the first statement in a function',
          ],
          1,
          'Optimisation mode does not execute asserts at all. If a check must hold for the program to be correct, it has to be a real `if` with a real `raise` — which is also what lets you attach a message the user can act on.',
        ],
        [
          'What does `breakpoint()` do?',
          [
            'It exits the program with status 0 if the condition is met',
            'It starts pdb at that point, pausing execution with every frame still intact',
            'It prints the current call stack to stdout',
            'It compiles the module with optimisation enabled'],
          1,
          'breakpoint() is a no-op that starts the standard debugger when reached, so you can inspect and step through the surrounding code. Setting PYTHONBREAKPOINT=0 disables it in environments where it must not fire.',
        ],
        [
          'Which is the correct use of the logging module over print()?',
          [
            'print() is faster, so use it for debugging and log only in production',
            'Logging gives levels, timestamps, and a traceback via logger.exception, so a failure is recorded in a file rather than lost in a stream',
            'Logging writes to stdout, so it is the same thing with extra steps',
            'Logging cannot be configured, so print() is the only flexible option',
          ],
          1,
          'Logging is configurable, filterable by level, timestamped, and redirectable to a file. `logger.exception` attaches the traceback that `print(str(exc))` throws away — which is usually the whole diagnosis.',
        ],
      ],
    },
  ]
);
