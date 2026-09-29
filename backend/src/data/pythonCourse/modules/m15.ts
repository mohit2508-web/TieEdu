// Module 15 — Capstone and final assessment.
//
// The closing module. Lesson 1 is a specification, lesson 2 is a build plan
// with two complete reference files, and lesson 3 is a twelve-question exam
// across the whole course plus the reading list for what comes after it.
//
// The capstone is a real project rather than a toy: a command-line task
// tracker with a JSON file behind it, because every requirement in it maps
// onto something taught earlier and nothing in it requires a framework.

import { mod } from '../blocks';

export const M15 = mod(
  'crs-python-programming',
  'py-m15',
  15,
  'Module 15 — Capstone and Final Assessment',
  'One real multi-module project built from spec to tests, and a twelve-question exam over everything the course covered.',
  [
    {
      title: 'The capstone brief: a task tracker you would actually ship',
      summary: 'The full specification for a CLI task tracker with JSON persistence — commands, data model, validation, and the boundaries between modules.',
      duration: 18,
      build: (b) => [
        b.md(`## Why a task tracker

You have written a function, a class, a loop, an exception and a generator. What you have not done is put them in a program that somebody else has to use, and the distance between those two things is where software projects are won or lost.

So the capstone is a **command-line task tracker** that keeps its data in a JSON file:

\`\`\`bash
python -m tracker add "buy milk" --tag home --due 2026-04-02
python -m tracker list
python -m tracker done 4
python -m tracker delete 2
\`\`\`

\`\`\`text
$ python -m tracker list --all
ID  DONE  TAG     DUE         TEXT
3         home    2026-04-02  buy milk
4    x    work    2026-04-01  send the invoice
2 task(s), 1 done
\`\`\`

It is deliberately small enough to finish and deliberately shaped to require everything: a real data model with validation, persistence you must not corrupt, an argument parser, sorted and filtered output, error messages a human can act on, and a test suite. It uses no third-party package, so anything that goes wrong is your code and not a dependency.

**The shape of the answer matters more than the features.** A version of this that lives in one 400-line file and works will lose to a version split across four modules with tests, every time. The brief is deliberately structured to force the split.`),
        b.anim('pipeline', {
          title: 'One command, end to end: argv in, stdout and JSON out',
          badge: 'capstone data flow',
          stages: [
            {
              name: 'Shell',
              tool: 'argv',
              in: '$ python -m tracker add "buy milk" --tag home',
              out: 'sys.argv[1:]',
              detail: 'The shell hands you a list of strings and nothing else. Quoting is the shell’s job: "buy milk" arrives as one argument, which is why the parser must never try to re-split it.',
              tone: 'io',
            },
            {
              name: 'Parse',
              tool: 'argparse',
              in: 'sys.argv[1:]',
              out: "Namespace(command='add', text='buy milk', tag='home', due=None)",
              detail: 'argparse turns four strings into a typed namespace, and it has already enforced the choices list for --tag. Anything it rejects exits with code 2 and a message naming the bad flag.',
              tone: 'code',
            },
            {
              name: 'Dispatch',
              tool: 'cli.COMMANDS',
              in: "Namespace(command='add', text='buy milk', tag='home', due=None)",
              out: "Task(id=4, text='buy milk', tag='home', done=False, due=None)",
              detail: 'A dict lookup turns the command name into a function. Constructing the Task is also where validation happens: __post_init__ raises TaskError on bad text, tag or date, and that exception is caught one frame up.',
              tone: 'data',
            },
            {
              name: 'Load',
              tool: 'storage.load',
              in: 'tasks.json',
              out: 'list[Task] — 3 existing tasks',
              detail: 'The file the previous command wrote is read back and every row is re-validated on the way in. A hand-edited file with a bad row fails loudly here rather than three commands later.',
              tone: 'io',
            },
            {
              name: 'Mutate',
              tool: 'storage.add',
              in: 'list[Task] — 3 existing tasks',
              out: 'list[Task] — 4 after append',
              detail: 'Ids are assigned from the highest existing id plus one, so a deleted task never causes an id to be reused and a stale id never points at a different task.',
              tone: 'warn',
            },
            {
              name: 'Save',
              tool: 'storage.save',
              in: 'list[Task] — 4 after append',
              out: 'tasks.json — 4 tasks, 548 bytes',
              detail: 'Write to tasks.json.tmp, then Path.replace() over the real file. The rename is atomic on both POSIX and Windows, so an interrupted write loses the new command and never the old data.',
              tone: 'ok',
            },
            {
              name: 'Render',
              tool: 'cli._render',
              in: 'list[Task] — 4 after append',
              out: 'four padded text rows',
              detail: 'Column widths are computed from the data, not hard-coded, so a 90-character task does not break the table. Formatting is a pure function of a list and belongs in the CLI, not in storage.',
              tone: 'int',
            },
            {
              name: 'Print',
              tool: 'print',
              in: 'four padded text rows',
              out: 'the table on stdout',
              detail: 'Results go to stdout, diagnostics go to stderr, and the process exit code says whether the command worked. That split is what makes the tool composable in a shell pipeline.',
              tone: 'ok',
            },
          ],
          artifacts: {
            '$ python -m tracker add "buy milk" --tag home': '$ python -m tracker add "buy milk" --tag home\n#4 added: buy milk',
            'sys.argv[1:]': "['add', 'buy milk', '--tag', 'home']",
            "Namespace(command='add', text='buy milk', tag='home', due=None)":
              "sub = parser.add_subparsers(dest='command', required=True)\n\np = sub.add_parser('add', help='add a task')\np.add_argument('text')\np.add_argument('--tag', default='errand', choices=TAGS)\np.add_argument('--due', default=None, metavar='YYYY-MM-DD')",
            "Task(id=4, text='buy milk', tag='home', done=False, due=None)":
              '{\n  "text": "buy milk",\n  "tag": "home",\n  "due": null,\n  "done": false,\n  "id": 4\n}',
            'tasks.json':
              '[\n  {\n    "text": "send the invoice",\n    "tag": "work",\n    "due": "2026-04-01",\n    "done": true,\n    "id": 2\n  },\n  {\n    "text": "renew passport",\n    "tag": "errand",\n    "due": null,\n    "done": false,\n    "id": 3\n  },\n  {\n    "text": "buy milk",\n    "tag": "home",\n    "due": "2026-04-02",\n    "done": false,\n    "id": 4\n  }\n]',
            'list[Task] — 4 after append':
              "[Task(text='renew passport', tag='errand', due=None, done=False, id=3),\n Task(text='send the invoice', tag='work', due='2026-04-01', done=True, id=2),\n Task(text='buy milk', tag='home', due='2026-04-02', done=False, id=4)]",
            'four padded text rows':
              'ID  DONE  TAG      DUE        TEXT\n3          errand  -          renew passport\n2     x    work     2026-04-01 send the invoice\n4          home     2026-04-02 buy milk',
          },
        }),
        b.lead('The requirements'),
        b.checklist('Functional — the program must do all of this', [
          '`add TEXT [--tag TAG] [--due YYYY-MM-DD]` creates a task, assigns it an id, appends it, and prints one confirmation line',
          '`list [--tag TAG] [--all] [--sort due|text|id]` prints a table; finished tasks are hidden unless `--all` is given',
          '`done ID` toggles a task between open and finished and prints the new state',
          '`delete ID` removes a task permanently, after which that id reports "no such task"',
          'A `--file PATH` global option chooses the data file, defaulting to `tasks.json` in the working directory',
          '`--help` works at every level: bare, and under every subcommand',
          'Every task is a `Task` dataclass in `models.py` — not a dict, not a tuple',
          'Unknown ids exit 2 with a message on stderr, not a traceback and not a silent success',
          'An unknown `--tag` is rejected by `argparse` itself, via `choices=`, before any code of yours runs',
          'Text is whitespace-normalised, must be non-empty, and is capped at 120 characters',
          'A due date must match `YYYY-MM-DD` **and** be a real date — `2026-02-30` is rejected, not accepted and then ignored',
          'Tasks are sorted by `key=lambda t: (t.done, t.due is None, t.due or "", t.id)`: open first, then soonest due, then a deterministic id tie-break',
          'No task id is ever reused after a delete, even within the same file',
          'Loading a file that does not exist yet creates an empty store rather than crashing',
          'Loading a file containing a row that fails validation raises an error naming the row and the field',
        ]),
        b.md(`## The data file

One JSON array, one object per task, keys matching the dataclass fields. Human-readable, greppable, and readable by anything else you might want to point at it.

\`\`\`json
[
  {
    "text": "send the invoice",
    "tag": "work",
    "due": "2026-04-01",
    "done": true,
    "id": 2
  },
  {
    "text": "renew passport",
    "tag": "errand",
    "due": null,
    "done": false,
    "id": 3
  }
]
\`\`\`

Two decisions worth defending. **The array is not sorted by id** — the file stores insertion order and \`list\` sorts on the way out, so reordering the display never rewrites the file. And **\`id\` is stored rather than derived from position**, because a derived id changes meaning the moment you delete something, and a user who memorised "#4" would then be looking at a different task.

The round trip is the contract: \`json.load\` gives you plain dicts, \`dataclasses.asdict\` turns a \`Task\` back into one, and a single \`Store.load()\` / \`Store.save()\` pair owns the whole format. Nothing outside \`storage.py\` is allowed to know what a key in this file is called.`),
        b.checklist('Non-functional — the things that decide whether it is finished', [
          '`models.py` has no `import json`, no `import argparse`, and no `print` — it is the domain, not the program',
          '`storage.py` never imports `cli.py`; dependencies point from the entry point inward',
          '`cli.py` never calls `json.load` or `json.dumps`; it goes through `Store`',
          'Every module can be imported without side effects, so importing one in a test prints nothing',
          'Every function that returns a value has a docstring saying what it returns, not what it does',
          'Invalid input produces a one-line message naming the problem and the fix, never a traceback',
          'Results go to stdout, diagnostics to stderr, and the exit code is 0 only when the command succeeded',
          'Saving is atomic: a temp file plus `Path.replace`, never an in-place truncate',
          'The test suite runs with one command and needs no fixtures on disk beyond `tmp_path`',
          'No line over 100 characters; the formatter and linter pass with no warnings',
        ]),
        b.diagram(
          'Module layout and who may import whom',
          `flowchart TD
    subgraph pkg["tracker/ — the package"]
        MAIN["__main__.py<br/>raise SystemExit(main())"]
        CLI["cli.py<br/>argparse, dispatch, table rendering<br/>knows storage — never knows JSON"]
        STO["storage.py<br/>load, save, add, delete<br/>knows JSON — never knows argparse"]
        MOD["models.py<br/>Task dataclass, TaskError, validation<br/>knows nothing at all"]
    end

    subgraph ts["tests/"]
        T1["test_models.py<br/>validation rules"]
        T2["test_storage.py<br/>round trip, atomic save"]
        T3["test_cli.py<br/>argv in, stdout and exit code out"]
    end

    DATA[("tasks.json")]

    MAIN --> CLI
    CLI --> STO
    CLI --> MOD
    STO --> MOD
    STO --> DATA
    T1 --> MOD
    T2 --> STO
    T3 --> CLI`
        ),
        b.md(`## Why the arrows point that way

The diagram is the design, and it is worth being able to state the rule that produces it: **dependencies point inward, from the entry point toward the domain.**

\`models.py\` knows nothing — not about files, not about the command line, not about the other modules. That is what makes it trivially testable: \`test_models.py\` imports it and starts testing in one line. \`storage.py\` knows about files and about \`Task\`, but not about \`argparse\`, so a test can construct a \`Store\` pointed at \`tmp_path\` and exercise the whole persistence layer with no output capture. \`cli.py\` knows about arguments and about the other two, and is the only module allowed to print.

The practical test for a boundary is simple: **can you import the module and use it with no side effects?** If importing \`storage\` prints a banner, or if you cannot test persistence without capturing stdout, the arrows are wrong.

## The commands, in full

\`\`\`text
$ python -m tracker --help
usage: tracker [-h] [--file FILE] {add,list,done,delete} ...

positional arguments:
  {add,list,done,delete}

options:
  -h, --help            show this help message and exit
  --file FILE           data file to use (default: tasks.json)

$ python -m tracker add
usage: tracker add [-h] [--tag {home,work,errand}] [--due YYYY-MM-DD] text
tracker add: error: the following arguments are required: text

$ python -m tracker done 99
error: no task with id 99
$ echo $?
2

$ python -m tracker add "" --tag nonsense
error: task text cannot be empty
\`\`\`

The second one is the important one: \`required=True\` on the subparser means a bare \`add\` with no text exits before a line of your code runs, with usage text that tells the user what they owe you. The third shows the error path — a message on stderr and a non-zero exit code, with no traceback, and no change to the file.`),
        b.info(
          'What you are being assessed on',
          'Not on how clever the implementation is. On whether the boundaries hold: whether a test can exercise storage without touching the CLI, whether a bad date is rejected at the boundary instead of corrupting the file, and whether every command has one obvious way to invoke it and one obvious thing to print. A boring, well-factored solution here beats a beautiful one with a bug in the save path.',
        ),
        b.tip(
          'Build it in the order the next lesson gives you',
          'Model first, then storage, then commands, then the CLI, then tests — with a test written before each layer is finished. Starting at the CLI is the single most common way to end up with a 400-line file and no way to check any of it.',
        ),
      ],
      questions: [
        [
          'Why does the tracker read the whole JSON file, change the list, and write the whole file back, rather than seeking to one task?',
          [
            'A JSON document is a single value, so there is no addressable position inside it — `json.load` parses the entire document into one object graph',
            '`json.load` can only be called on a complete document',
            '`pathlib.Path` does not support partial writes',
            'It is measurably faster on small files',
          ],
          0,
          'JSON has no random access. `json.load` turns the file into the whole Python structure, you edit that, and `json.dump` writes it all back. Read-modify-write is the honest shape for a single-file store; the moment you need partial updates or concurrent writers you outgrow the format, not the API.',
        ],
        [
          'Why does `add_subparsers(dest="command", required=True)` beat reading `sys.argv[1]` yourself?',
          [
            'It parses faster',
            'It gives every subcommand its own `--help`, validates types and required arguments, and turns a typo into a message naming the bad flag',
            'It is the only way to make a module importable without side effects',
            'It is the only way to return a non-zero exit code',
          ],
          1,
          'argparse is a parsing layer, not a splitter. Each subparser owns its flags, so `tracker add --tag` alone prints the help for `add` and exits 2. The exit code is also handled for you — `parser.error()` calls `sys.exit(2)`. Parsing `sys.argv` by hand means re-implementing all of it, badly.',
        ],
        [
          'What does `@dataclass` give you in this project?',
          [
            'Compile-time checking of the field types',
            'A generated `__init__`, `__repr__` and `__eq__` from the annotated fields, plus `asdict` for the JSON row',
            'Automatic validation that the text is non-empty',
            'Immutability, if you pass `frozen=True`',
          ],
          1,
          'A dataclass reads the annotated fields and writes the boilerplate you would otherwise type by hand: the constructor, a `repr` you can paste into a debugger, and field-wise equality. `dataclasses.asdict` then produces exactly the plain dict `json.dump` needs. It validates nothing — that is `__post_init__`, which you write — and `frozen=True` gives immutability, a separate feature.',
        ],
        [
          'Why store the data file as a `pathlib.Path` rather than a string?',
          [
            '`Path` objects are faster to concatenate',
            '`Path` carries the filesystem operations — `exists`, `parent.mkdir`, `read_text`, `with_suffix` — so you stop doing string surgery on separators',
            'JSON cannot serialise a string that contains a path separator',
            '`pathlib` is the only way to open a file in Python',
          ],
          1,
          '`Path` is an object that knows about paths: `p.parent.mkdir(parents=True, exist_ok=True)`, `p.read_text(encoding="utf-8")`, `p.replace(tmp)` — each one line, each handling the awkward cases. `os.path.join` on strings works fine too; `pathlib` is simply the modern default, and it is what makes the atomic-replace save pattern readable.',
        ],
      ],
    },
    {
      title: 'Building it',
      summary: 'The build order, where each requirement came from, the acceptance criteria, and two complete reference files written the way a good answer would be.',
      duration: 20,
      build: (b) => [
        b.md(`## Build order, and why this order

Six steps. Each one leaves the program runnable, and each one is testable before the next begins. The order is not a preference — trying to build the CLI before the model means writing the validation rules twice, once in \`argparse\` and once in the code that actually needs them.`),
        b.steps('The build order', [
          {
            title: '1. Scaffold the package and the guard',
            desc: 'Create the directory, the four files and the tests directory, put `raise SystemExit(main())` behind `if __name__ == "__main__":` in `__main__.py`, and confirm `python -m tracker --help` runs and prints nothing else. Every later step is built on the ability to run the thing.',
            code_snippet: 'tracker/\n  __init__.py      # empty, or a docstring\n  __main__.py      # the guard\n  models.py\n  storage.py\n  cli.py\ntests/\n  test_models.py\n  test_storage.py\n  test_cli.py',
          },
          {
            title: '2. The model, with its tests written first',
            desc: 'Write the failing tests for `Task` validation before the class. You are pinning down what "valid" means — empty text, over-long text, unknown tag, a badly shaped date, a real-but-nonexistent date — and every one of those is a one-line test. Then make them pass.',
            code_snippet: 'def test_empty_text_is_rejected():\n    with pytest.raises(TaskError, match="cannot be empty"):\n        Task(text="   ")\n\n\ndef test_february_30_is_rejected():\n    with pytest.raises(TaskError):\n        Task(text="book a flight", due="2026-02-30")',
          },
          {
            title: '3. Storage, with a round-trip test',
            desc: '`load()` on a missing file returns an empty list; `save()` then `load()` returns an equal list. Write that test before the implementation. The atomic write — temp file plus `Path.replace` — is part of the first version, not a later improvement.',
            code_snippet: 'def test_round_trip(tmp_path):\n    path = tmp_path / "tasks.json"\n    original = [Task(text="buy milk", tag="home", id=1)]\n\n    store = Store(path)\n    for task in original:\n        store.add(task)\n    store.save()\n\n    assert Store(path).all() == original',
          },
          {
            title: '4. The four command functions',
            desc: 'Write `cmd_add`, `cmd_list`, `cmd_done` and `cmd_delete` as plain functions taking `(store, args)`. They do not parse anything — that is \`argparse\`’s job — and they do not touch JSON — that is \`Store`’s job. If a command function needs \`import json\`, something has leaked.',
            code_snippet: 'def cmd_done(store, args) -> int:\n    task = store.get(args.id)\n    if task is None:\n        print(f"no task with id {args.id}", file=sys.stderr)\n        return EXIT_ERROR\n    task.toggle()\n    store.save()\n    print(f"#{task.id} marked {\'done\' if task.done else \'open\'}")\n    return EXIT_OK',
          },
          {
            title: '5. The parser and the dispatcher',
            desc: 'Build the subparsers, wire them into a `COMMANDS` dict, and write `main(argv=None)` so it takes an argument list. That one parameter is what makes the CLI testable: a test calls `main(["add", "buy milk"])` and never spawns a subprocess.',
            code_snippet: 'COMMANDS = {"add": cmd_add, "list": cmd_list,\n           "done": cmd_done, "delete": cmd_delete}\n\n\ndef main(argv=None) -> int:\n    args = build_parser().parse_args(argv)\n    return COMMANDS[args.command](store, args)',
          },
          {
            title: '6. Tests for the CLI, end to end',
            desc: 'Use pytest\'s `capsys` to capture stdout and assert on the exit code. Cover the happy path, an unknown id, a bad tag, and an empty store. These are the tests that would catch a regression a month from now, and they take about twenty minutes to write.',
            code_snippet: 'def test_unknown_id_exits_two(capsys, tmp_path):\n    code = main(["--file", str(tmp_path / "t.json"), "done", "99"])\n    captured = capsys.readouterr()\n    assert code == 2\n    assert "no task with id 99" in captured.err',
          },
        ]),
        b.anim('callstack', {
          title: 'Every frame of `tracker add "buy milk" --tag home`',
          badge: 'one command, five frames',
          steps: [
            {
              caption: 'main() parses argv and builds the store',
              note: 'Everything happens under one function that takes argv as an argument. That single choice is what makes the rest of this trace testable without a subprocess.',
              frames: [
                {
                  fn: 'main(argv)',
                  args: "['add', 'buy milk', '--tag', 'home']",
                  line: 'cli.py:118',
                  locals: ['args = Namespace(command="add", ...)', 'store = Store(Path("tasks.json"))'],
                },
              ],
            },
            {
              caption: 'build_parser() — pure, and called on every run',
              note: 'The parser tree is rebuilt each time, which costs microseconds and buys you a function with no state and no side effects. Hoisting it to module level saves nothing and makes the function untestable.',
              frames: [
                {
                  fn: 'main(argv)',
                  line: 'cli.py:118',
                  locals: ['args = Namespace(command="add", ...)'],
                },
                {
                  fn: 'build_parser()',
                  line: 'cli.py:26',
                  locals: ['parser = ArgumentParser(prog="tracker")', 'sub = parser.add_subparsers(dest="command")'],
                },
              ],
            },
            {
              caption: 'cmd_add() constructs the Task — and this is where validation happens',
              note: 'Task.__post_init__ collapses whitespace, rejects empty or over-long text, checks the tag, and parses the due date. Anything wrong raises TaskError, which unwinds straight to the handler in main.',
              frames: [
                {
                  fn: 'main(argv)',
                  line: 'cli.py:118',
                  locals: ['args = Namespace(command="add", ...)'],
                },
                {
                  fn: 'cmd_add(store, args)',
                  line: 'cli.py:62',
                  locals: ['args.text = "buy milk"', 'args.tag = "home"'],
                },
                {
                  fn: 'Task.__post_init__()',
                  args: 'self',
                  line: 'models.py:29',
                  locals: ['text = "buy milk"  (whitespace collapsed)', 'tag = "home"  in TAGS'],
                },
              ],
            },
            {
              caption: 'Store.add() assigns an id from the maximum seen',
              note: 'max(existing ids) + 1, never len(tasks). A deleted task leaves a gap, and a gap is exactly what keeps an id from ever pointing at a different task later.',
              frames: [
                {
                  fn: 'main(argv)',
                  line: 'cli.py:118',
                  locals: ['args = Namespace(command="add", ...)'],
                },
                {
                  fn: 'cmd_add(store, args)',
                  line: 'cli.py:64',
                  locals: ['task = Task(text="buy milk", tag="home")'],
                },
                {
                  fn: 'Store.add(task)',
                  args: 'task',
                  line: 'storage.py:47',
                  locals: ['self._load() -> 3 tasks', 'task.id = 4  (max id was 3)'],
                },
              ],
            },
            {
              caption: 'Store.save() writes a temp file, then renames it over the real one',
              note: 'The rename is atomic on POSIX and on Windows. If the process dies halfway through, tasks.json is either the old file or the new one — never half of each, and never empty.',
              frames: [
                {
                  fn: 'main(argv)',
                  line: 'cli.py:118',
                  locals: ['args = Namespace(command="add", ...)'],
                },
                {
                  fn: 'cmd_add(store, args)',
                  line: 'cli.py:65',
                  locals: ['task = Task(text="buy milk", id=4)'],
                },
                {
                  fn: 'Store.save()',
                  line: 'storage.py:63',
                  locals: ['tmp = tasks.json.tmp', 'json.dump(4 tasks, tmp, indent=2)', 'tmp.replace(self.path)'],
                },
              ],
            },
            {
              caption: 'Unwinding: four frames return, one line is printed',
              note: 'cmd_add prints its confirmation and returns 0. main returns that, __main__ passes it to SystemExit, and the shell gets 0. The Task object stays mutable the whole way up — that is why done and delete can work on the same instances.',
              frames: [
                {
                  fn: 'main(argv)',
                  line: 'cli.py:118',
                  locals: ['args = Namespace(command="add", ...)'],
                },
                {
                  fn: 'cmd_add(store, args)',
                  phase: 'returning',
                  line: 'cli.py:66',
                  locals: ['print("#4 added: buy milk")'],
                  note: 'returns 0',
                },
              ],
            },
          ],
        }),
        b.lead('Where each requirement came from'),
        b.table(
          'Requirement, and the module that taught it',
          ['What you are building', 'What you needed from earlier on'],
          [
            ['`Task` as a dataclass with a `__post_init__` validator', 'Classes, the object model, `__init__` and validation, dataclasses'],
            ['One exception type, `TaskError`, for every user-input failure', 'Exception hierarchies, `raise ... from`, catching at a boundary'],
            ['Idempotent ids from `max(ids) + 1`', 'Comprehensions, `max` with a default, and thinking about empty collections'],
            ['`json.load` / `json.dump` round trip, re-validated on the way in', 'Files and JSON, `pathlib`, exception handling for corrupt input'],
            ['Atomic save via a temp file and `Path.replace`', '`pathlib`, `os.replace` semantics, and why half-written files are worse than stale ones'],
            ['`argparse` subparsers with `choices` and `required`', 'Modules and the command line, `argparse`, exit codes and stderr'],
            ['Sorting with a `key` that encodes the product rule', 'Sorting, lambdas as keys, tuples as sort keys, and `None` in comparisons'],
            ['Table rendering computed from the data', 'Strings, f-strings, `str.ljust`, `str.join`'],
            ['A `COMMANDS` dict dispatching to functions', 'Dictionaries, functions as values, and why a dict beats a chain of `elif`'],
            ['Tests with `tmp_path`, `capsys` and `pytest.raises`', 'Testing, fixtures, temporary directories, capturing output'],
            ['Keeping the module boundaries honest', 'Packages, `__init__.py`, `__main__.py`, relative imports, the import system'],
          ]
        ),
        b.lead('The acceptance criteria'),
        b.checklist('You are done when all of these are true', [
          '`python -m tracker --help` and `python -m tracker add --help` both print correct, distinct usage',
          'All four commands work end to end, and the file on disk is valid JSON afterwards',
          '`python -m tracker add` with no text exits 2 and prints usage',
          '`python -m tracker done 99` prints one line to stderr and exits 2',
          '`python -m tracker list` on an empty store prints "nothing to do" and exits 0',
          'Deleting task 2 and adding a new one produces id 5, not id 2',
          'A `--file` in a directory that does not exist yet either creates the directory or fails with a clear message — your choice, but it is deliberate and consistent',
          '`grep -c "" tasks.json` shows the file is indented, and `python -m json.tool tasks.json` accepts it',
          '`from tracker.storage import Store` at the REPL prints nothing',
          '`pytest` is green, and there is at least one test per command and one per validation rule',
          'No line is longer than 100 characters, and your linter is silent',
          'You can explain, out loud, why `storage.py` does not import `cli.py`',
        ]),
        b.warn(
          'When you get stuck — do this, in this order',
          'Do not rewrite the file. Write the failing test first, with a literal fixture: a hand-written `tasks.json` sitting in `tmp_path`, and an assertion about what `load()` should return. That fixture is a specification you can read; it turns "build persistence" from an open-ended problem into "make this one assertion pass". If the assertion passes and the command still misbehaves, the bug is in the CLI layer and you now know that for certain — which is worth more than the twenty minutes you spent finding out.',
        ),
        b.lead('Reference file 1 — the domain model, complete'),
        b.code(`"""Domain objects for the tracker.

Nothing here knows about JSON, about argparse, or about printing. That is the
point: every rule about what a valid task is can be tested without a file
and without capturing output.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from datetime import date

TAGS = ("home", "work", "errand")

DATE_PATTERN = re.compile(r"\\d{4}-\\d{2}-\\d{2}")


class TaskError(ValueError):
    """Raised when user input cannot become a valid Task."""


@dataclass
class Task:
    text: str
    tag: str = "errand"
    due: str | None = None
    done: bool = False
    id: int = 0

    def __post_init__(self) -> None:
        # Collapse internal whitespace runs, then reject whatever is left.
        self.text = " ".join(self.text.split())
        if not self.text:
            raise TaskError("task text cannot be empty")
        if len(self.text) > 120:
            raise TaskError(f"task text is {len(self.text)} chars, limit is 120")

        if self.tag not in TAGS:
            raise TaskError(f"unknown tag {self.tag!r}; choose one of {TAGS}")

        if self.due is not None:
            if not DATE_PATTERN.fullmatch(self.due):
                raise TaskError(f"due date must be YYYY-MM-DD, got {self.due!r}")
            try:
                date.fromisoformat(self.due)
            except ValueError as exc:
                raise TaskError(str(exc)) from exc

    @property
    def is_overdue(self) -> bool:
        if self.due is None or self.done:
            return False
        return self.due < date.today().isoformat()

    def toggle(self) -> None:
        self.done = not self.done

    def to_row(self) -> dict:
        """A plain dict in exactly the shape tasks.json uses."""
        return asdict(self)

    @classmethod
    def from_row(cls, row: dict) -> "Task":
        """Rebuild a Task from a JSON row, re-running every validation rule.

        A hand-edited file is untrusted input, so each field is type-checked
        before the dataclass ever sees it. Naming the offending field is the
        difference between a two-second fix and an afternoon.
        """
        if not isinstance(row, dict):
            raise TaskError(f"each task must be a JSON object, got {type(row).__name__}")

        if "text" not in row:
            raise TaskError("task is missing required field: text")
        if not isinstance(row["text"], str):
            raise TaskError(f"field 'text' must be a string, got {type(row['text']).__name__}")

        due = row.get("due")
        if due is not None and not isinstance(due, str):
            raise TaskError(f"field 'due' must be a string or null, got {type(due).__name__}")

        raw_id = row.get("id", 0)
        if isinstance(raw_id, bool) or not isinstance(raw_id, int):
            raise TaskError(f"field 'id' must be an integer, got {type(raw_id).__name__}")

        return cls(
            text=row["text"],
            tag=row.get("tag", "errand"),
            due=due,
            done=bool(row.get("done", False)),
            id=raw_id,
        )`, 'models.py'),
        b.lead('Reference file 2 — the entry point, complete'),
        b.code(`"""The command line interface.

Every function here either handles arguments or renders text. Nothing in
this module knows what a key in tasks.json is called -- it goes through
Store, which is the only place that is allowed to know.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .models import TAGS, Task, TaskError
from .storage import Store

EXIT_OK = 0
EXIT_ERROR = 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="tracker",
        description="A small task tracker stored in a JSON file.",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=Path("tasks.json"),
        help="data file to use (default: tasks.json)",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    add = sub.add_parser("add", help="add a task")
    add.add_argument("text", help="what needs doing")
    add.add_argument("--tag", default="errand", choices=TAGS)
    add.add_argument("--due", default=None, metavar="YYYY-MM-DD")

    listing = sub.add_parser("list", help="list tasks")
    listing.add_argument("--tag", default=None, choices=TAGS)
    listing.add_argument("--all", action="store_true", help="include done tasks")
    listing.add_argument("--sort", default="due", choices=["due", "text", "id"])

    done = sub.add_parser("done", help="mark a task finished")
    done.add_argument("id", type=int)

    delete = sub.add_parser("delete", help="delete a task")
    delete.add_argument("id", type=int)

    return parser


def _sort_key(task: Task, how: str):
    """One readable line that states the product rule for ordering."""
    if how == "text":
        return task.text.lower()
    if how == "id":
        return task.id
    # Open first, then tasks with a due date before those without.
    return (task.done, task.due is None, task.due or "", task.id)


def _render(rows: list) -> str:
    """Left-align every column to the width of its widest cell."""
    if not rows:
        return ""
    header, body = rows[0], rows[1:]
    widths = [
        max([len(header[i])] + [len(r[i]) for r in body])
        for i in range(len(header))
    ]
    lines = [
        "  ".join(c.ljust(w) for c, w in zip(header, widths)).rstrip()
    ]
    for row in body:
        lines.append("  ".join(c.ljust(w) for c, w in zip(row, widths)).rstrip())
    return "\\n".join(lines)


def cmd_add(store: Store, args: argparse.Namespace) -> int:
    task = Task(text=args.text, tag=args.tag, due=args.due)
    store.add(task)
    store.save()
    print(f"#{task.id} added: {task.text}")
    return EXIT_OK


def cmd_list(store: Store, args: argparse.Namespace) -> int:
    tasks = store.all(
        tag=args.tag, include_done=args.all, sort=args.sort
    )
    if not tasks:
        print("nothing to do")
        return EXIT_OK

    rows = [["ID", "DONE", "TAG", "DUE", "TEXT"]]
    for task in tasks:
        rows.append([
            str(task.id),
            "x" if task.done else "",
            task.tag,
            task.due or "-",
            task.text,
        ])
    print(_render(rows))
    done_count = sum(1 for t in tasks if t.done)
    print(f"{len(tasks)} task(s), {done_count} done")
    return EXIT_OK


def cmd_done(store: Store, args: argparse.Namespace) -> int:
    task = store.get(args.id)
    if task is None:
        print(f"no task with id {args.id}", file=sys.stderr)
        return EXIT_ERROR
    task.toggle()
    store.save()
    print(f"#{task.id} marked {'done' if task.done else 'open'}")
    return EXIT_OK


def cmd_delete(store: Store, args: argparse.Namespace) -> int:
    if not store.delete(args.id):
        print(f"no task with id {args.id}", file=sys.stderr)
        return EXIT_ERROR
    store.save()
    print(f"#{args.id} deleted")
    return EXIT_OK


COMMANDS = {
    "add": cmd_add,
    "list": cmd_list,
    "done": cmd_done,
    "delete": cmd_delete,
}


def main(argv: list | None = None) -> int:
    """Parse argv, run the command, and translate failures into exit codes.

    Taking argv as a parameter -- rather than reading sys.argv directly --
    is what lets a test call main(["add", "buy milk"]) in-process.
    """
    args = build_parser().parse_args(argv)
    try:
        store = Store(args.file)
        return COMMANDS[args.command](store, args)
    except TaskError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return EXIT_ERROR
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return EXIT_ERROR


if __name__ == "__main__":
    raise SystemExit(main())`, 'cli.py'),
        b.md(`## Two details in \`cli.py\` worth arguing for

**\`main(argv=None)\` takes the argument list as a parameter.** Every command becomes a one-line test with no subprocess, no shell, and no \`sys.argv\` monkeypatching. This is the single highest-leverage design decision in the whole project and it costs four characters.

**\`_sort_key\` is a named function, not an inline lambda.** The ordering rule — open before done, dated before undated, earliest first, id as the final tie-break — is a product decision, and it deserves a name and a docstring rather than being buried in a \`sorted(tasks, key=lambda t: ...)\` at the call site. The tuple is also what makes it *total*: comparing \`None\` against a string would raise \`TypeError\`, so \`t.due is None\` has to become a boolean before the due date is compared at all.

**\`EXIT_ERROR = 2\`, matching argparse.** The shell, a Makefile, and every CI system key on 0 versus non-zero. Using the same code for "bad flag" and "no such task" means a caller can treat every usage failure identically.

Everything else follows from the module boundaries. \`cmd_add\` does not know what JSON looks like; \`Store\` does not know what a command is; \`Task\` knows only what a valid task is. If a change to the file format touched \`cmd_add\`, a boundary had already been crossed.`),
      ],
      questions: [
        [
          'Why does `storage.py` not import `cli.py`?',
          [
            'To keep every file under 100 lines',
            'Because dependencies should point inward: the CLI knows about storage, and storage knows about neither the CLI nor argparse',
            'Because `argparse` cannot be imported from a module other than `__main__`',
            'To avoid a circular import, which is the only reason it matters',
          ],
          1,
          'Dependencies point from the entry point toward the domain. If `storage` imported `cli`, you could not test the store without dragging in argument parsing and `sys.exit`. The test for a clean boundary is simple: `from tracker.storage import Store` in a test file must work, with no output and no side effects.',
        ],
        [
          'Which acceptance criterion actually catches a store that silently writes nothing?',
          [
            '`store.save()` completes without raising',
            'A round trip: write a list of tasks, reopen the file through a fresh `Store`, and get an equal list back',
            'The file is valid JSON when opened in a text editor',
            '`python -m tracker add "x"` exits 0',
          ],
          1,
          '"Does not raise" and "is valid JSON" are both satisfied by a store that writes `[]` every time. Only a round trip through a fresh object proves persistence, and it should use pytest\'s `tmp_path` fixture so it never touches your real data file. Write that test first — it is the test that defines the whole layer.',
        ],
        [
          'Why sort with an explicit key rather than comparing `Task` objects directly?',
          [
            'Dataclasses cannot be compared at all, so `sorted()` always raises',
            'The order is a product decision — open first, then soonest due, then id — and a `key` function states that rule in one readable, named line',
            '`key=` is faster than the default comparison',
            'A key function is the only way to sort more than 100 items',
          ],
          1,
          'A `Task` has no natural ordering, and the *order* is the requirement, not an accident. `key=lambda t: (t.done, t.due is None, t.due or "", t.id)` encodes unfinished-first, dated-before-undated, earliest-first, and a deterministic tie-break — and the `t.due is None` term is what stops a `None` from being compared against a string. A dataclass without `order=True` is also simply not orderable, but that is the symptom.',
        ],
        [
          'You are stuck on the storage layer three hours in. What is the fastest way forward?',
          [
            'Rewrite the project as one `main.py` with everything inline and split it up at the end',
            'Write the failing test first, with a hand-written JSON fixture in `tmp_path` — it makes the expected shape concrete and shrinks the problem to one function',
            'Hard-code an empty list so the rest of the project can proceed',
            'Install a database package and use that instead',
          ],
          1,
          'A test with a literal JSON fixture is a specification you can read. It tells you exactly what `load` must accept, gives you a passing target, and turns an open-ended "build persistence" into "make this one assertion true". The other three options all avoid the difficulty by relocating it to somewhere you have not solved yet.',
        ],
      ],
    },
    {
      title: 'Final assessment',
      summary: 'Twelve questions across the whole course, a map of where each topic lived, and where to go once this is over.',
      duration: 25,
      build: (b) => [
        b.md(`## Twelve questions, one for each thing that matters

No new material in this lesson. This is the whole course, compressed: mechanics, the object model, scoping, generators, exceptions, modules, and the design trade-offs in the capstone. Every question is answerable from what you have already been taught, and every explanation is written to teach the answer rather than restate the option.

Take them without the notes. Where you get one wrong, go back to the module in the table below rather than memorising the letter.

## What changed about how you write code

The single biggest thing this course tried to do was move a set of reflexes from other languages into Python ones.

You used to think about *values*; you now think about **objects and the names pointing at them**. You used to assume assignment copied; you now check **what kind of object is behind the name** before you let a function touch it. You used to read a default parameter as a value; you now know it is **an expression evaluated once**, which is the difference between a correct signature and a bug that only appears on the second call.

You used to add a \`for\` loop; you now ask whether a comprehension, a dict, a set, or \`itertools\` already says it in one line. You used to catch exceptions broadly at the top; you now catch them **where you can do something about them** and let the rest carry a message. You used to optimise because the code felt slow; you now **measure, then fix one thing, then measure again**.

None of that is Python-specific style. It is what it feels like to know a language, and it is the part that transfers to the next one you learn.

## The six reflexes, and where each one came from

If you keep one thing from this course, keep these. Each is a rule that predicts behaviour you would otherwise have to memorise case by case, and each is the reason a piece of code that surprised you did what it did.

## What is deliberately not covered

Type checking at scale, async programming in depth, C extension authoring, web frameworks, packaging and distribution, and anything specific to a third-party library. Each is a whole field. The foundations here are what make those fields learnable rather than merely copyable — and most of them assume exactly the object model, the import system, and the testing habits you now have.`),
        b.code(
          `# The same function, written the way you would have written it before
# this course, and then the way you would write it now. The second version is
# not "more Pythonic" as a style rule — each change is one of the six reflexes
# above, and each one exists because a specific bug would otherwise happen.
from collections.abc import Iterable

WORDS = ["ant", "bee", "cat", "dog", "antelope", "fox", "owl"]


# --- version 1: the one you would have written first -------------------------
def unique_lengths_v1(items):
    result = []
    for item in items:
        if len(item) not in result:      # reflex 2: a list used as a set, O(n) per test
            result.append(len(item))
    return result


# --- version 2: the container that makes the test cheap ---------------------
def unique_lengths_v2(items):
    seen = set()                        # reflex 2: the container that makes the test cheap
    result = []
    for item in items:
        n = len(item)
        if n not in seen:               # reflex 6: O(1) test, measured, not assumed
            seen.add(n)
            result.append(n)            # reflex 2: never mutate a list another name holds
    return result


# --- version 3: what you would actually ship --------------------------------
def unique_lengths(items: Iterable[str]) -> list[int]:
    """Lengths of the given strings, first-seen order, no duplicates.

    Reflex 1 (a name binds to an object, not a box) is what makes the "seen" set
    safe to mutate here: the function owns it, nothing else can reach in.
    """
    seen: set[int] = set()
    result: list[int] = []
    for item in items:                  # reflex 4: lazy over whatever iterable is passed
        n = len(item)
        if n not in seen:
            seen.add(n)
            result.append(n)
    return result


print(unique_lengths_v1(WORDS))   # [3, 8]  correct, but O(n) per test
print(unique_lengths_v2(WORDS))   # [3, 8]  correct, and linear
print(unique_lengths(WORDS))      # [3, 8]  correct, and says what it accepts
`,
          'before-and-after.py'
        ),
        b.anim('step', {
          title: 'Six reflexes, and the module that gave you each one',
          badge: 'the whole course',
          steps: [
            {
              title: '1. A name binds to an object — it is a label, not a box (module 2)',
              desc: '`a = b` makes two names for one object. Nothing is copied, ever, unless you call a copy function. Every aliasing bug in Python, and the whole design of pass-by-assignment, falls out of this one rule.',
              code_snippet: 'a = [1, 2]\nb = a        # same object, two names\nb.append(3)  # a is now [1, 2, 3]',
            },
            {
              title: '2. Mutation is the only thing that matters for data (module 5)',
              desc: 'Lists, dicts and sets mutate in place; ints, floats, strings, tuples and frozensets do not. Which container you pick changes which bugs are possible, so pick the immutable one until you have a reason not to.',
              code_snippet: 'TUPLE = ("a", "b")   # safe to share\nLIST = ["a", "b"]    # shared means your bug',
            },
            {
              title: '3. Late binding is the default, and a default argument is evaluated once (modules 8 and 14)',
              desc: 'A closure reads the variable, not a snapshot of it, so a loop variable seen by a callback is whatever the loop left behind. And `def f(x=[])` is one list shared by every call that omits the argument — the two most-reported Python bugs both come from these two sentences.',
              code_snippet: 'def f(x=[]):      # one list, forever\n    x.append(1)\n    return x',
            },
            {
              title: '4. Laziness is a design choice with a cost, not a free win (module 9)',
              desc: 'A generator consumes its source one item at a time and holds one item in memory, which is why it beats a list over a stream. Used twice, or indexed, or measured, it is slower. Reach for it when the data does not fit, not by reflex.',
              code_snippet: 'with open("huge.log") as f:\n    lines = (l for l in f if "ERROR" in l)  # lazy\n    first = next(lines)  # reads one line',
            },
            {
              title: '5. Errors are data, and the message is the point (module 10)',
              desc: 'An exception carries a type and a message and travels up the stack until something handles it. `else` for the happy path and `finally` for cleanup are the two clauses people skip and then wonder why. A traceback names the line: read it bottom-up.',
              code_snippet: 'try:\n    value = parse(raw)\nexcept ValueError as exc:\n    raise ConfigError(f"line {n}: {exc}") from exc',
            },
            {
              title: '6. Measure before you optimise, and structure before you micro-tune (module 14)',
              desc: 'Almost every "Python is slow" claim is an O(n²) loop, a list used as a set, or a re-computed invariant. Fix the algorithm and the language stops mattering. Reach for a linter, a profiler and a test before you reach for a faster construct.',
              code_snippet: 'seen = set()        # O(n), not\nfor row in rows:   # `in []` at O(n)\n    if row not in seen:\n        seen.add(row)',
            },
          ],
        }),
        b.lead('Where everything lived'),
        b.table(
          'Topic, module, and what you should be able to do now',
          ['Topic', 'Where', 'What you can do'],
          [
            [
              'Running Python: the compile pipeline, the REPL, venv, the import search path',
              '1',
              'Explain where a traceback comes from, and keep two projects from sharing a broken environment',
            ],
            [
              'Values, types, names, numbers, integers vs floats, and the float gotcha',
              '2–3',
              'Choose the right numeric type for a problem, and know when `==` on floats is the wrong question',
            ],
            [
              'Strings, f-strings, slicing, `str` methods, Unicode and encoding',
              '3–4',
              'Build a formatted report without a loop, and stop a `UnicodeDecodeError` before it happens',
            ],
            [
              'Lists, tuples, dicts, sets, slices, comprehensions, sorting',
              '4–5',
              'Pick the container that makes the operation you need cheap, and say why',
            ],
            [
              'Control flow, iteration, the iteration protocol, generators and `yield`',
              '5–6, 10',
              'Write a lazy pipeline that does not materialise an intermediate list, and explain when laziness is worth it',
            ],
            [
              'Functions: arguments, defaults, `*args`/`**kwargs`, scope, closures, recursion, `nonlocal`',
              '6–7',
              'Write a signature that cannot be misused, and reason about late binding without being surprised by it',
            ],
            [
              'Classes: attributes, methods, properties, dunder methods, descriptors, dataclasses, operators',
              '7–8',
              'Model a domain object with validation, equality and a `repr` worth reading',
            ],
            [
              'Modules, packages, `__init__`, `__main__`, relative imports, entry points',
              '8–9',
              'Split a program so each module can be imported with no side effects and tested in isolation',
            ],
            [
              'Exceptions: raising, custom hierarchies, chaining, `try`/`else`/`finally`, logging',
              '9–10',
              'Turn a user mistake into one line on stderr and an exit code, instead of a traceback',
            ],
            [
              'Decorators, context managers, `with`, and the protocols behind them',
              '10–11',
              'Write a `@contextmanager` resource guard and explain what `with` desugars to',
            ],
            [
              'Files, `pathlib`, JSON, CSV, archives, and atomic writes',
              '11–12',
              'Persist data that cannot be corrupted by a crash halfway through writing it',
            ],
            [
              'Testing: `pytest`, fixtures, `tmp_path`, `capsys`, coverage, and what not to assert',
              '12–13',
              'Write a round-trip test that proves persistence, and a CLI test that runs in-process',
            ],
            [
              'Mutability, aliasing, copying, the gotcha catalogue, the GIL, and measuring performance',
              '14',
              'Find the aliasing bug in code you did not write, and profile before you optimise',
            ],
            [
              'A complete multi-module project, and the boundaries inside it',
              '15',
              'Say why `storage` must not import `cli`, and defend it in a code review',
            ],
          ]
        ),
        b.md(`## After this course

The most common way people fail after finishing a programming course is stopping. The second most common is reading. What actually works is **building the next thing that is slightly too hard**, and writing down what you had to look up.

Concretely, in the order that tends to work:

1. **Rebuild something you already use badly.** A better grep, a script that renames 400 files safely, a cron job that fails loudly. Small, complete, and immediately useful.
2. **Take a real codebase and fix one issue in it.** Not write one — fix one. Reading other people's code, matching their conventions, and having your change accepted teaches more than any tutorial.
3. **Learn the toolchain you have been avoiding.** \`git\` properly, a real debugger, a linter configured to your taste, type checking with \`mypy\` even on code you never annotated. These pay for themselves within a week.

And one habit worth more than all three: **when a program does not do what you expected, do not fix it by guessing.** Print the values. Read the traceback from the bottom. Write the failing test. That habit is the difference between someone who is slowed down by Python and someone who is not.`),
        b.resources('Where to go next', [
          { label: 'The official Python tutorial — the reference for the language itself', url: 'https://docs.python.org/3/tutorial/' },
          { label: 'The Python standard library reference', url: 'https://docs.python.org/3/library/' },
          { label: 'PEP 8 — the style guide, and the shortest useful thing to read twice', url: 'https://peps.python.org/pep-0008/' },
          { label: 'Real Python — the best long-form tutorials on the web, free', url: 'https://realpython.com/' },
          { label: 'pytest documentation — fixtures, parametrisation, and the plugins worth having', url: 'https://docs.pytest.org/en/stable/' },
          { label: 'Python Enhancement Proposals — how the language actually changes', url: 'https://peps.python.org/' },
          { label: 'Think Python 2 — a free online book that reads like a course', url: 'https://runestone.academy/ns/books/published/thinkpython2/index.html' },
          { label: 'Classic Computer Science Problems in Python — problem sets to sharpen against', url: 'https://www.danielzingaro.com/free-books/' },
          { label: 'Project Euler — infinite, escalating, and the fastest way to get genuinely good', url: 'https://projecteuler.net/' },
        ]),
      ],
      questions: [
        [
          'Inside a function, `print(x)` is on line 2 and `x = 1` is on line 4, and there is a module-level `x = 0`. What happens when the function is called?',
          [
            'It prints `0` and then creates a local `x`',
            'It prints `0` and assigns 1 to the module-level `x`',
            'It raises `NameError`, because `x` does not exist in any local scope',
            'It raises `UnboundLocalError` before printing anything',
          ],
          3,
          'Python decides a name is local for the entire function the moment an assignment to it appears in the body — not from the line of the assignment onward. So the `x` on line 2 is a local slot that has not been filled, and the read fails before `print` runs. Fix it with `global x` or, far better, by taking `x` as a parameter.',
        ],
        [
          'When Python evaluates `obj.name`, and the class defines `name` as a `property` while the instance dictionary also has a `name` entry, which one is used?',
          [
            'The instance dictionary, because instance data is always checked before the class',
            'The property, because data descriptors found on the type take priority over the instance dictionary',
            'Whichever was assigned most recently',
            'The class attribute, and the instance entry is silently ignored',
          ],
          1,
          'The full rule is: data descriptors on the type first, then the instance `__dict__`, then non-data descriptors and plain class attributes. Because a `property` is a data descriptor, defining one makes the attribute read-only no matter what is in the instance dictionary — while a plain function attribute loses to the instance dictionary. `__getattribute__` is the hook that implements the whole search.',
        ],
        [
          'What does `nonlocal` let you do that `global` does not?',
          [
            'Rebind a name in the nearest enclosing function scope, so an inner function can update an outer function’s local without touching the module namespace',
            'Make a name global from inside a class body',
            'Remove the need for `return` in a generator function',
            'Delete a name as well as assign to it',
          ],
          0,
          '`global` reaches the module namespace. `nonlocal` reaches the nearest enclosing *function* scope, skipping the current one. It exists for closures and accumulators — `def make_accumulator(): total = 0; def add(n): nonlocal total; total += n; return add` — and reading a name you never assign does not need either declaration.',
        ],
        [
          'What does `gen.send(value)` do, and when is it legal?',
          [
            'It raises `value` as an exception inside the generator',
            'It replaces the generator object with a new one',
            'It resumes a suspended generator and makes the `yield` expression that suspended it evaluate to `value`',
            'It returns the generator’s `return` value immediately',
          ],
          2,
          'The argument of `send` becomes the result of the `yield` expression that the generator is currently sitting on — which is what makes it the basis of coroutines. `send(None)` is exactly `next(gen)`, and calling `send` on a just-started generator raises `TypeError: can\'t send non-None value to a just-started generator`, because there is no suspended `yield` to deliver it to.',
        ],
        [
          'Which of these builds the whole list immediately, and which defers all work until iteration?',
          [
            '`list(f(x) for x in data)` defers; `f(x) for x in data` is eager',
            '`[f(x) for x in data]` is eager; `f(x) for x in data` is lazy',
            'Both are eager, because both fully evaluate `f` before continuing',
            'Both are lazy, because the parentheses are only grouping',
          ],
          1,
          'The brackets construct a real `list`, running every element right now. The parentheses construct a generator object that merely holds the loop. Over a large or unbounded source that is the difference between exhausting memory and holding a constant footprint, and `sum(f(x) for x in data)` avoids the intermediate list entirely. If you want eager, use a list comprehension — never `list()` over a generator, which is just a slower comprehension.',
        ],
        [
          'Inside an `except` block, `raise TaskError(msg) from exc` does what?',
          [
            'Suppresses `exc` so that only the new error is reported',
            'Retries the `except` block using the new exception type',
            'Converts `exc` into a `TaskError` in place',
            'Raises a new `TaskError` and sets its `__cause__` to `exc`, so the traceback shows both and names the new error as the direct cause',
          ],
          3,
          'Even without `from`, Python chains the two exceptions: the new one gets `__context__` pointing at the old one, and the traceback prints "During handling of the above exception, another exception occurred". The explicit `from` sets `__cause__` instead and changes the wording to "The above exception was the direct cause". Use it when the new failure is *caused by* the old; leave it implicit when the old is only background context.',
        ],
        [
          'Why does a `with` block call `__exit__` when the body raises?',
          [
            'The statement is compiled as `try`/`finally`; `__exit__` receives the exception info, and returning a truthy value from it suppresses the exception',
            '`__exit__` is called before the body runs, so resources are ready in advance',
            'The interpreter catches the exception, runs the block, and re-raises it afterwards',
            'Only when `__exit__` returns `True`',
          ],
          0,
          '`with` desugars to `__enter__`, a `try`, and a `finally` that calls `__exit__` with the exception info. A falsy return from `__exit__` lets the exception propagate; a truthy one swallows it. That suppression is the only way a `with` block hides an error, and returning `True` from `__exit__` to "handle everything" is a well-worn way to swallow a bug and debug it three hours later.',
        ],
        [
          'A module inside a package `app` does `import data`, and there is both a top-level `data.py` and an `app/data.py`. Which one is imported?',
          [
            '`app/data.py`, because a package’s own directory is searched first',
            'Neither — Python 3 raises `ImportError` for an ambiguous module name',
            'The top-level `data.py`, because Python 3 resolves imports absolutely; you need `from . import data` for the sibling',
            'Whichever was imported first, decided once and then cached in `sys.modules` forever',
          ],
          2,
          'Python 3 dropped implicit relative imports. Inside a package, a plain `import data` looks in the top-level namespace, not in the package directory, so the sibling requires the explicit relative form `from . import data`. The related trap is still live: the *script’s* directory is `sys.path[0]`, so a local `json.py` or `random.py` in your project really does shadow the standard library for that run.',
        ],
        [
          'Why is `assert result == [3, 1, 2]` a weak test for a function that returns a list of ids?',
          [
            '`==` on lists compares identity rather than contents, so the comparison is meaningless',
            'It pins the ordering into the contract, so a correct reordering fails a correct implementation — assert on a set, a length, or membership instead',
            '`assert` cannot be used with lists at all',
            'pytest rewrites `assert` into a form that only records the failure',
          ],
          1,
          'Assert the requirement, not one particular arrangement of it. If order matters, say so in a named constant and sort both sides; if it does not, assert on `set(result)`, on `len(result)`, or on membership. Separately worth knowing: `python -O` strips every `assert` from the bytecode, so assertions are for tests and internal invariants, never for validating user input in production.',
        ],
        [
          'When does the single JSON file stop being the right storage choice for the tracker?',
          [
            'As soon as the file passes about 100 KB',
            'Never — JSON files scale indefinitely',
            'When the program is installed as a package rather than run from a checkout',
            'When you need concurrent writers, partial updates, queries across the whole dataset, or transactional guarantees',
          ],
          3,
          'The honest limit of a single JSON document is not size but access pattern. Whole-file read-and-write is O(n) per operation, which is fine for hundreds of tasks and wrong for tens of thousands, and it gives you no concurrency and no atomicity unless you build them. The migration path is a repository interface with two implementations — which is only possible if the CLI never touches JSON directly, which is exactly why that boundary exists in the capstone.',
        ],
        [
          'The tracker is asked to finish task 99, which does not exist. What should the process do?',
          [
            'Print `no task with id 99` to stderr and exit non-zero, using the code `argparse` already uses for bad input',
            'Print the message to stdout and exit 0, because the program itself ran successfully',
            'Let the failure propagate as an uncaught exception so the traceback is visible',
            'Print the message to stderr and exit 0, because no data was harmed',
          ],
          0,
          'Exit code 0 means success and anything else means failure, and both a shell and every CI system key on that distinction. `argparse` already reserves 2 for bad input, so using it for "no such task" is consistent, and stderr keeps diagnostics out of a pipeline consuming stdout. An uncaught traceback is a bug report about your program, not an answer to the user’s question.',
        ],
        [
          'Why does `save()` write to `tasks.json.tmp` and then `Path.replace()` it over the real file?',
          [
            'It is faster, because a small file is written from the page cache',
            '`json.dump` can only write to a file that does not already exist',
            'The rename is atomic on POSIX and on Windows, so the data file is always either the old version or the new one, never half of each',
            'It avoids holding the whole document in memory while writing',
          ],
          2,
          'This is the write-temp-then-rename pattern, and it is the difference between losing one command and losing the entire store. `Path.replace` maps to the atomic rename syscall on POSIX and to a replace-semantics `MoveFileEx` on Windows, so the target path is swapped in one step. Opening the real file for writing in place would leave a truncated file if the process died, filled the disk, or lost power mid-write.',
        ],
      ],
    },
  ]
);
