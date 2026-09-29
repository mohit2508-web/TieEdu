// ============================================================================
// SEED COURSE — one genuinely complete, free, publishable course.
//
// Every block here is real teaching content and every video id was verified to
// resolve on YouTube's oEmbed endpoint before being committed. Nothing in this
// file is a placeholder: a learner can sit the whole course end to end and
// every lesson has something to read or watch.
//
// Lesson video durations are AUTHOR ESTIMATES shown as "~N min" on cards.
// They are never used for the completion gate — that is measured from the
// player's own reported duration and accumulated on the server.
// ============================================================================

import { Course, ContentBlockRecord } from './db';
import { getCProgrammingCourse } from './cCourse';
import { getPythonProgrammingCourse } from './pythonCourse';

let blockSeq = 0;
const blk = (
  block_type: ContentBlockRecord['block_type'],
  payload: Record<string, any>
): ContentBlockRecord => ({
  id: `seedblk-${(blockSeq += 1)}`,
  block_type,
  block_order: blockSeq,
  payload,
});

const md = (text: string) => blk('markdown', { text });
const tip = (title: string, text: string) => blk('callout', { style: 'tip', title, text });
const warn = (title: string, text: string) => blk('callout', { style: 'warning', title, text });
const info = (title: string, text: string) => blk('callout', { style: 'info', title, text });
const code = (codeText: string, filename: string, language: string) =>
  blk('code', { code: codeText, filename, language });
const table = (title: string, headers: string[], rows: string[][]) =>
  blk('table', { title, headers, rows });
const steps = (title: string, list: { title: string; desc: string; code_snippet?: string }[]) =>
  blk('steps', { title, steps: list });

export function getSeedCourses(): Course[] {
  return [
    {
      id: 'crs-coding-foundations',
      slug: 'coding-foundations',
      title: 'Coding Foundations: From Zero to Your First Program',
      subtitle: 'A free, end-to-end introduction to how programs actually work',
      description: `Most placement prep assumes you can already read code. This course starts one step earlier and walks the whole loop: what a program *is*, how a computer stores and moves data, how to express a problem as instructions, and how to debug when it does not work.

Every lesson is short, written in plain language, and ends with something you can check yourself. There is no sign-up wall, no trial, and no paid tier — finish all four modules and you get a verifiable TieEdu certificate plus your XP on the leaderboard.

**Who this is for:** first-year and second-year students, commerce and arts students switching into tech, and anyone who has been copying code without understanding it.

**What you need:** nothing. A browser and a sense of curiosity.`,
      category: 'Computer Science',
      level: 'beginner',
      is_free: true,
      price_inr: 0,
      thumbnail_url: '',
      tags: ['beginner', 'fundamentals', 'logic', 'no-code-needed'],
      outcomes: [
        'Explain in your own words what a program and a variable actually are',
        'Choose the right data type for a piece of information and explain why',
        'Break any messy problem into ordered steps a computer could follow',
        'Read and trace a small Python program by hand',
        'Find and fix a bug using a repeatable method instead of guessing',
      ],
      prerequisite_course_id: null,
      certificate_eligible: true,
      published: true,
      created_at: '2026-01-05T09:00:00.000Z',
      updated_at: '2026-01-05T09:00:00.000Z',
      modules: [
        {
          id: 'crm-cf-1',
          course_id: 'crs-coding-foundations',
          title: 'Module 1 — What a Program Actually Is',
          summary: 'Build the mental model everything else sits on top of.',
          sort_order: 1,
          lessons: [
            {
              id: 'cfl-cf-1-1',
              module_id: 'crm-cf-1',
              title: 'Instructions, not magic',
              summary: 'A program is a list of instructions. That is the whole secret.',
              sort_order: 1,
              duration_minutes: 8,
              xp_reward: 25,
              video: null,
              blocks: [
                md(`## A program is just a very precise to-do list

When people say "programming", they often picture a hacker typing green text on a black screen. That picture is unhelpful, because it hides the actual skill involved.

A **program** is an ordered list of instructions that a computer follows without improvising. That is the entire definition. Everything else — variables, loops, functions, frameworks — exists to help you write those instructions *more easily* or *more safely*.

Think of a recipe:

- A recipe lists steps in order.
- A bad recipe says "add the eggs" without saying how many. A cook can guess. A computer cannot.
- A good recipe is **unambiguous**. "Add 200 grams of flour, then whisk for 30 seconds" is executable. "Add some flour" is not.

Programming is the skill of turning a vague human intention into an unambiguous machine instruction.

### The three properties of every instruction

| Property | What it means | Bad example | Good example |
| --- | --- | --- | --- |
| **Ordered** | Position in the list changes the result | "Add sugar, then add flour" reversed changes the batter | Steps are executed top to bottom |
| **Unambiguous** | Only one valid interpretation | "Add enough salt" | "Add 5 grams of salt" |
| **Finite** | It ends | "Keep stirring" | "Stir for 60 seconds" |

If an instruction breaks any of these three, a computer will either do something you did not expect, or loop forever. Most of what people call "bugs" are really violations of these three properties.`),
                md(`## The fetch-decode-execute-repeat loop

No matter how enormous a program gets, the CPU is doing one thing in a repeating cycle:

1. **Fetch** — read the next instruction from memory.
2. **Decode** — work out what kind of instruction it is.
3. **Execute** — perform it.
4. **Repeat** — go back to step 1 with the following instruction.

A video game, a spreadsheet formula and a search engine all run this exact loop. They differ only in what instructions they are running and how many they run per second.

This is why a program that is logically correct but written with millions of steps still feels slow: the loop is unavoidable. Getting a computer to do the *same* work in *fewer* steps is most of what "optimisation" means, and it is a real skill you will practise in this course.`),
                tip('Check yourself', 'Open any recipe you follow and find one step that is not unambiguous. "Add a pinch of salt" is ambiguous because a pinch is not a unit. Rewriting it as "add 1 gram of salt" makes it executable — and makes you a better specifier, which is half of programming.'),
                warn('Common misconception', 'A programming language is not the computer. The computer executes machine code. Languages such as Python or C exist so *humans* can write machine code more easily. That is why every language ends up compiled or interpreted into something the CPU can run.'),
              ],
              quiz: {
                id: 'cql-cf-1-1',
                passing_percent: 70,
                questions: [
                  {
                    id: 'cq1',
                    prompt: 'Which statement about a computer program is correct?',
                    options: [
                      'It improvises instructions when the input is unexpected',
                      'It is an ordered list of unambiguous instructions followed without deviation',
                      'It is written only in machine code',
                      'It only runs when a human presses run',
                    ],
                    correct_index: 1,
                    explanation: 'A CPU has no concept of intent. It executes the instruction stream it is given, in order. Programs that appear to "react intelligently" are simply programs containing many conditional branches that a human wrote in advance.',
                  },
                  {
                    id: 'cq2',
                    prompt: 'A recipe says "stir until the sauce looks right". Why can a computer not follow this?',
                    options: [
                      'Computers cannot stir',
                      '"Looks right" is ambiguous, and "until" gives no bound, so the instruction is both ambiguous and not finite',
                      'It is written in the wrong language',
                      'Computers only understand numbers',
                    ],
                    correct_index: 1,
                    explanation: 'This single step breaks two of the three properties at once: "looks right" is ambiguous, and "until" makes it unbounded (not finite). Either one alone is enough to make it inexecutable.',
                  },
                  {
                    id: 'cq3',
                    prompt: 'The CPU repeats which four stages?',
                    options: [
                      'Plan, build, test, deploy',
                      'Fetch, decode, execute, repeat',
                      'Compile, link, load, run',
                      'Read, write, save, close',
                    ],
                    correct_index: 1,
                    explanation: 'Fetch-Decode-Execute is the hardware cycle. Compile/link/load/run describes what happens *before* the first cycle begins.',
                  },
                ],
              },
            },
            {
              id: 'cfl-cf-1-2',
              module_id: 'crm-cf-1',
              title: 'Values, variables and types',
              summary: 'How a computer stores information, and why the type you pick matters.',
              sort_order: 2,
              duration_minutes: 10,
              xp_reward: 25,
              video: null,
              blocks: [
                md(`## Everything a computer holds is a value

A **value** is a piece of information: the number \`42\`, the text \`"TieEdu"\`, the answer \`True\`. A computer stores billions of these, and to use one it needs two things:

- **Where** it lives (an address in memory).
- **What kind** of thing it is (its data type).

The type is not decoration. It tells the CPU *how many bytes to reserve and how to interpret those bytes*. The same 32 bits can mean the integer \`1073741824\`, the approximate float \`1.07e9\`, or eight separate booleans. The type is what removes the ambiguity.

## Why \`0.1 + 0.2\` is not \`0.3\`

This surprises everyone once. It is not a JavaScript bug — it is how binary works.

\`0.1\` cannot be represented exactly in base 2, because 0.1 in binary is \`0.0001100110011...\` repeating forever, exactly like \`1/3\` in base 10. The CPU stores the nearest 64-bit approximation, and the two approximations do not add up to exactly \`0.3\`.

\`\`\`python
print(0.1 + 0.2)        # 0.30000000000000004
print(round(0.1 + 0.2, 1))  # 0.3
\`\`\`

Never compare floating point numbers with \`==\`. Compare with a tolerance, or round first. This is a real interview question and a real source of bugs.

## Choosing a type: a practical table

| You are storing | Use | Why not the alternative |
| --- | --- | --- |
| A count of items | \`int\` | — |
| Money | Decimal / integer paise | \`float\` accumulates error across many operations |
| A name | \`str\` | — |
| Yes / no | \`bool\` | An \`int\` with 0 and 1 invites out-of-range values like \`7\` |
| A list of names | \`list\` of \`str\` | A single string forces you to split on a delimiter, which is fragile |
`),
                code(`# Types in Python, the language we use in this course
student_name: str = "Aarav"          # text
roll_number: int = 2026              # whole number
percentage: float = 87.5             # decimal, has limited precision
is_placed: bool = False              # exactly True or False
courses: list = ["DSA", "OS", "DBMS"]  # ordered collection
passed: set = {"DSA", "OS"}          # unordered, no duplicates

print(type(student_name))   # <class 'str'>
print(type(roll_number))    # <class 'int'>

# The classic float trap
print(0.1 + 0.2)            # 0.30000000000000004  <- not a bug
print(0.1 + 0.2 == 0.3)     # False                <- never do this
print(abs((0.1 + 0.2) - 0.3) < 1e-9)  # True      <- do this instead`, 'types_demo.py', 'python'),
                md(`## A variable is a label, not a box

A common and useful mental shift: a variable is a **label stuck onto a value**, not a box that contains a value.

This matters because of **aliasing**. When you write \`b = a\`, you are not copying the value — you are putting a second label on the *same* value:

\`\`\`python
a = [1, 2, 3]
b = a          # two labels, ONE list
b.append(4)
print(a)       # [1, 2, 3, 4]  <- a changed too!
\`\`\`

If you genuinely want a separate copy, copy it explicitly:

\`\`\`python
b = a.copy()        # shallow copy of a list
b.append(4)
print(a)       # [1, 2, 3]      <- untouched
\`\`\`

This is the source of an entire famous family of bugs, and understanding it now will save you hours later.`),
                steps('Trace it yourself', [
                  { title: 'Line 1: a = [1, 2, 3]', desc: 'A new list is created in memory. The label "a" points at it.' },
                  { title: 'Line 2: b = a', desc: 'No new list is created. Label "b" now points at the exact same list as "a".', code_snippet: 'b ──┐\n    ├──> [1, 2, 3]\na ──┘' },
                  { title: 'Line 3: b.append(4)', desc: 'The list is mutated in place. Both labels see the change, because there is only one list.' },
                  { title: 'Line 4: print(a)', desc: 'Prints [1, 2, 3, 4] — which surprises almost everyone the first time.' },
                ]),
                tip('Check yourself', 'Predict the output before running it: \`a = [1,2,3]\`, \`b = a\`, \`b.append(4)\`, \`print(a)\`. If you said [1,2,3,4], you understand aliasing. If you said [1,2,3], run it and see why.'),
              ],
              quiz: {
                id: 'cql-cf-1-2',
                passing_percent: 70,
                questions: [
                  {
                    id: 'cq4',
                    prompt: 'What does a data type in a program actually do?',
                    options: [
                      'It is documentation for humans and has no runtime effect',
                      'It tells the CPU how many bytes to reserve and how to interpret them',
                      'It makes the program run faster',
                      'It converts the value to text',
                    ],
                    correct_index: 1,
                    explanation: 'The type is what disambiguates raw bytes. 32 bits can be an int, a float, or eight bools — the type decides which.',
                  },
                  {
                    id: 'cq5',
                    prompt: 'Why is `0.1 + 0.2 != 0.3` on most computers?',
                    options: [
                      'Floating point types are broken and should not be used',
                      '0.1 has no exact finite binary representation, so both operands are stored as the nearest approximation',
                      'Addition is not supported for decimals',
                      'It only happens in JavaScript',
                    ],
                    correct_index: 1,
                    explanation: 'It happens in every language with binary floating point, because 0.1 in base 2 is a repeating expansion exactly like 1/3 in base 10.',
                  },
                  {
                    id: 'cq6',
                    prompt: 'Given `a = [1,2,3]` then `b = a` then `b.append(4)`, what is `a`?',
                    options: ['[1, 2, 3]', '[1, 2, 3, 4]', '4', 'An error is raised'],
                    correct_index: 1,
                    explanation: '`b = a` adds a second label to the same list rather than copying it, so the mutation is visible through both labels.',
                  },
                ],
              },
            },
          ],
        },
        {
          id: 'crm-cf-2',
          course_id: 'crs-coding-foundations',
          title: 'Module 2 — Expressing a Problem as Instructions',
          summary: 'Sequence, condition and loop: the three control structures you will use forever.',
          sort_order: 2,
          lessons: [
            {
              id: 'cfl-cf-2-1',
              module_id: 'crm-cf-2',
              title: 'Sequence and conditions',
              summary: 'Running different instructions based on a comparison.',
              sort_order: 1,
              duration_minutes: 12,
              xp_reward: 25,
              video: null,
              blocks: [
                md(`## The three control structures

Almost every program you will ever write is built from exactly three shapes:

1. **Sequence** — do this, then this, then this.
2. **Condition** — if something is true, do this; otherwise do that.
3. **Loop** — repeat this while something is true.

If you can spot these three in a problem, you can write the program. This is the single most useful thing in this module.

## Conditions come from comparisons

A condition is just an expression that evaluates to \`True\` or \`False\`.

\`\`\`python
marks = 72

if marks >= 90:
    grade = "A"
elif marks >= 60:
    grade = "B"
else:
    grade = "C"
\`\`\`

Three details that trip up beginners:

- The colon \`:\` at the end of each line is **required**. It starts an indented block.
- The indentation is **not cosmetic**. Python uses it to decide what belongs to the \`if\`. Four spaces, consistently.
- \`elif\` is short for \`else if\`, and only the **first** matching branch runs. The chain above cannot produce both \`"A"\` and \`"B"\`.`),
                code(`# Conditions: the shape of every decision in a program
marks = 72

if marks >= 90:
    grade = "A"
elif marks >= 60:
    grade = "B"
else:
    grade = "C"

print(grade)   # B

# The most common beginner bug: chained comparison
age = 20
# This does NOT work as intended:
#   if 13 <= age <= 19:
# It parses as (13 <= age) and (age <= 19) -> False
# The correct form in Python is exactly the chained version above,
# but the equivalent in C/Java would need && on both sides.

# Guard clauses often read better than deep nesting
def eligibility(age, cgpa, backlog):
    if cgpa < 7.0:
        return "CGPA too low"
    if backlog > 0:
        return "Active backlog"
    if age < 18:
        return "Not eligible yet"
    return "Eligible"`, 'conditions.py', 'python'),
                warn('Watch out', 'Python compares with `==` (two equals signs), not `=` (one). A single `=` **assigns**. Writing `if age = 18:` is a syntax error, not a comparison — so if you see that error, you typed the wrong thing.'),
              ],
              quiz: {
                id: 'cql-cf-2-1',
                passing_percent: 70,
                questions: [
                  {
                    id: 'cq7',
                    prompt: 'How many of the three control structures can run in a single if/elif/else chain?',
                    options: ['All of them', 'Exactly two', 'At most one branch runs', 'Only the else branch'],
                    correct_index: 2,
                    explanation: 'Python tests conditions top to bottom and runs the first match, then jumps past the rest of the chain.',
                  },
                  {
                    id: 'cq8',
                    prompt: 'Why does Python require indentation?',
                    options: [
                      'It is a style convention with no effect on behaviour',
                      'Indentation defines which instructions belong to the block, so it is part of the syntax',
                      'It improves performance',
                      'It is required only inside functions',
                    ],
                    correct_index: 1,
                    explanation: 'Unlike C-style languages that use braces, Python uses indentation as the block delimiter. Wrong indentation changes what the program means, not just how it looks.',
                  },
                ],
              },
            },
            {
              id: 'cfl-cf-2-2',
              module_id: 'crm-cf-2',
              title: 'Loops without accidentally looping forever',
              summary: 'The `for` / `while` choice, and the bug that hangs every program once.',
              sort_order: 2,
              duration_minutes: 14,
              xp_reward: 25,
              video: null,
              blocks: [
                md(`## \`for\` when you know the count, \`while\` when you do not

- **\`for\`** — "do this for each of these, or this many times." The count is known up front.
- **\`while\`** — "keep doing this as long as this condition holds." The count is discovered as you go.

\`\`\`python
# for — known count
for i in range(1, 6):
    print(i)      # 1 2 3 4 5

# while — discovered count
n = 1
while n < 1000:
    n = n * 2
print(n)          # 1024
\`\`\`

## The infinite loop, and why it is your friend to recognise

An **infinite loop** runs forever because the condition driving it never becomes false. It is the single most common reason a student program appears to hang.

\`\`\`python
# BROKEN: i is never incremented, so i < 5 stays True forever
i = 0
while i < 5:
    print(i)

# FIXED: the increment is the whole difference
i = 0
while i < 5:
    print(i)
    i += 1
\`\`\`

The fix is always the same shape: **make sure every loop body changes the thing the condition tests.** When your program hangs, that is the first thing to check.

\`\`\`python
# Same bug, sneakier: forgetting to move the index
names = ["Aarav", "Diya", "Kabir"]
i = 0
while i < len(names):
    print(names[i])   # i never changes -> infinite loop
\`\`\``),
                code(`# Loops: count the thing that must change, or you hang.
def total_of(numbers):
    running = 0
    for n in numbers:
        running += n
    return running

print(total_of([4, 8, 15]))   # 27

# while: driven by a condition that the body must eventually break
def countdown(start):
    while start > 0:
        print(start)
        start -= 1          # <- the line that makes the loop terminate
    print("Liftoff")

countdown(3)
# 3
# 2
# 1
# Liftoff

# break exits immediately, continue skips to the next iteration
for i in range(10):
    if i % 2 == 0:
        continue           # skip even numbers
    if i > 7:
        break              # stop entirely at 9
    print(i)                # 1 3 5 7`, 'loops.py', 'python'),
                info('Interview relevance', '"What is the time complexity of this loop?" is a standard interview question. The answer is how many times the body runs. A loop that runs once per item over n items is O(n); one nested inside another over the same items is O(n²). You will meet this properly in Module 4.'),
                tip('Check yourself', 'Write a loop that prints the first 8 multiples of 7. Then rewrite it as a `while`. Both should be about four lines. If your `while` version hangs, find the line you forgot.'),
              ],
              quiz: {
                id: 'cql-cf-2-2',
                passing_percent: 70,
                questions: [
                  {
                    id: 'cq9',
                    prompt: 'Your program hangs and prints the same line forever. What is the most likely cause?',
                    options: [
                      'A syntax error in the loop header',
                      'The loop body never changes the variable the condition tests',
                      'Too many print statements',
                      'The wrong indentation width',
                    ],
                    correct_index: 1,
                    explanation: 'If the body does not move the condition toward false, the loop can never end. Always check that one line first.',
                  },
                  {
                    id: 'cq10',
                    prompt: 'When is `while` a better fit than `for`?',
                    options: [
                      'When the number of iterations is not known before the loop starts',
                      'When you need to print something',
                      'When the loop runs exactly 10 times',
                      'When the list is empty',
                    ],
                    correct_index: 0,
                    explanation: '`for` commits to a count or a collection up front. `while` keeps going until a condition flips, which suits open-ended work like "keep reducing until the number is prime".',
                  },
                  {
                    id: 'cq11',
                    prompt: 'What does `continue` do inside a loop?',
                    options: [
                      'Exits the loop entirely',
                      'Skips the rest of the current iteration and starts the next one',
                      'Pauses the loop',
                      'Repeats the whole program',
                    ],
                    correct_index: 1,
                    explanation: '`continue` jumps to the next iteration; `break` leaves the loop. Confusing the two is common.',
                  },
                ],
              },
            },
            {
              id: 'cfl-cf-2-3',
              module_id: 'crm-cf-2',
              title: 'Functions: reuse and naming',
              summary: 'Give a chunk of instructions a name so you can use it again.',
              sort_order: 3,
              duration_minutes: 11,
              xp_reward: 25,
              video: null,
              blocks: [
                md(`## A function is a named, reusable instruction

When you find yourself pasting the same five lines for the fourth time, that is the signal to write a function.

\`\`\`python
def add_tax(amount, rate=0.18):
    """Return amount plus tax at the given rate."""
    return amount + amount * rate
\`\`\`

Four parts:

- \`def\` — the keyword that says "a function is starting".
- \`add_tax\` — the name you will call it by. Choose it so the name explains itself.
- \`amount, rate=0.18\` — **parameters**: the inputs it needs. \`rate=0.18\` is a *default*, so a caller can omit it.
- \`return ...\` — the **output**. Without a \`return\`, the function gives back \`None\`.

## Why the name matters more than you think

Compare these two:

\`\`\`python
def f(a, b):
    return a * b
    # versus
def calculate_staff_cost(working_days, rate_per_day):
    return working_days * rate_per_day
\`\`\`

Both are one line. Only one tells a reader what it does without making them trace it. Naming is not the compiler's job — it is the job of every human who reads the code later, including you in six weeks.

## Scope: where a name is visible

A variable created inside a function is **local** — it disappears when the function returns.

\`\`\`python
def compute():
    secret = 42        # local
    return secret

print(secret)   # NameError: name 'secret' is not defined
\`\`\`

That is a feature: a function cannot accidentally clobber something outside it.`),
                code(`# Functions: name it so the next reader needs no comments.
def celsius_to_fahrenheit(celsius):
    return celsius * 9 / 5 + 32

def fahrenheit_to_celsius(fahrenheit):
    return (fahrenheit - 32) * 5 / 9

def describe_temperature(celsius):
    """Return a short human-readable summary of a temperature."""
    fahrenheit = celsius_to_fahrenheit(celsius)
    if celsius <= 0:
        return f"{celsius}C ({fahrenheit:.1f}F) - freezing point"
    if celsius >= 35:
        return f"{celsius}C ({fahrenheit:.1f}F) - heat warning"
    return f"{celsius}C ({fahrenheit:.1f}F) - comfortable"

print(describe_temperature(20))    # 20C (68.0F) - comfortable
print(describe_temperature(38))    # 38C (100.4F) - heat warning

# Scope demo: \`scratch\` is local, so this would raise NameError
def tally(items):
    scratch = 0
    for item in items:
        scratch += item
    return scratch`, 'functions.py', 'python'),
                tip('Check yourself', 'Write \`is_leap_year(year)\` returning \`True\` when the year is a leap year. A leap year is divisible by 4, **except** every year divisible by 100, unless it is also divisible by 400. That is a genuine interview question and it is harder than it looks.'),
              ],
              quiz: {
                id: 'cql-cf-2-3',
                passing_percent: 70,
                questions: [
                  {
                    id: 'cq12',
                    prompt: 'What does a function return if the `return` statement is missing?',
                    options: ['Zero', 'The value of its last variable', 'None', 'It raises an error'],
                    correct_index: 2,
                    explanation: 'A function without a return statement implicitly returns None, which silently propagates if you then use the result in arithmetic.',
                  },
                  {
                    id: 'cq13',
                    prompt: 'What is the benefit of a default parameter value like `rate=0.18`?',
                    options: [
                      'It makes the function run faster',
                      'It lets the caller omit the argument while still having a sensible value when supplied',
                      'It makes the argument optional but unusable',
                      'It converts the type automatically',
                    ],
                    correct_index: 1,
                    explanation: 'Defaults let one function serve callers with and without that argument, without duplicating the function.',
                  },
                ],
              },
            },
          ],
        },
        {
          id: 'crm-cf-3',
          course_id: 'crs-coding-foundations',
          title: 'Module 3 — Watch Real Code Being Written',
          summary: 'Full-length free video courses from channels that teach properly.',
          sort_order: 3,
          lessons: [
            {
              id: 'cfl-cf-3-1',
              module_id: 'crm-cf-3',
              title: 'Python in one hour — full beginner course',
              summary: 'Programming with Mosh: variables, conditions, loops, functions, in one sitting.',
              sort_order: 1,
              duration_minutes: 62,
              xp_reward: 40,
              video: {
                provider: 'youtube',
                url: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
                video_id: 'kqtD5dpn9C8',
                title: 'Python for Beginners - Learn Coding with Python in 1 Hour',
                channel: 'Programming with Mosh',
                duration_minutes: 62,
                added_at: '2026-01-05T09:00:00.000Z',
              },
              blocks: [
                md(`## Why watch this one

Everything in Modules 1 and 2 is now in your head as theory. This lesson is the bridge: you watch someone type the same constructs and immediately run them, which is how the abstract shapes in your head attach to real keystrokes.

This is a **complete beginner course** from Programming with Mosh, free to watch. It covers the exact ground of Modules 1 and 2 in one sitting, so if any step above felt abstract, this is where it usually clicks.

**Watch it actively.** Keep a text editor open next to the player and retype the short examples yourself. Watching code is roughly three times less effective than typing it.`),
                table('What to expect, and roughly when', ['Part', 'What it covers'], [
                  ['Opening minutes', 'Setup, what Python is, why it is a good first language'],
                  ['First third', 'Variables, data types, and the same float trap from Lesson 1.2'],
                  ['Middle third', 'Conditions and loops, i.e. Modules 1 and 2 applied live'],
                  ['Final third', 'Functions, and a small complete program written end to end'],
                ]),
                tip('Finishing this lesson', 'Your watch progress is measured by this page, not by YouTube. Keep the tab in front and let it play — you need to have watched at least 90% of it for the lesson to count as complete. Seeking ahead does not count.'),
                info('Then do this', 'After Module 4, come back to this video and pause at any section you found hard. Referencing a video you have already watched is far more effective than a first watch with no context.'),
              ],
              quiz: null,
            },
            {
              id: 'cfl-cf-3-2',
              module_id: 'crm-cf-3',
              title: 'JavaScript — the language behind every website',
              summary: 'freeCodeCamp: a full-length, project-first JavaScript course.',
              sort_order: 2,
              duration_minutes: 390,
              xp_reward: 40,
              video: {
                provider: 'youtube',
                url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
                video_id: 'PkZNo7MFNFg',
                title: 'Learn JavaScript - Full Course for Beginners',
                channel: 'freeCodeCamp.org',
                duration_minutes: 390,
                added_at: '2026-01-05T09:00:00.000Z',
              },
              blocks: [
                md(`## The second language, and why it is different

JavaScript looks superficially like Python — variables, \`if\`, \`for\` — but it is a fundamentally different kind of language. Python has a \`for\` loop keyword. JavaScript has \`for\`, \`for...of\`, \`for...in\` and \`while\`, because JavaScript's \`for\` predates all of them.

The single most important difference for a beginner:

| | Python | JavaScript |
| --- | --- | --- |
| Block delimiter | Indentation | Curly braces \`{}\` |
| Variable declaration | \`x = 1\` | \`let x = 1\` or \`const x = 1\` |
| Output | \`print(x)\` | \`console.log(x)\` |
| Types | Built in, fixed per name | Everything is a value with a type that can change |

That last row surprises people. In JavaScript a \`let\` can hold a number and later hold a string, which is exactly the flexibility that makes large JavaScript programs hard to reason about — and exactly why \`const\` is recommended almost everywhere.

## How to take this course

It is a full six-and-a-half-hour course, so do not try to absorb it in one sitting. A workable plan:

1. Watch in 30-40 minute blocks across several days.
2. Type every example rather than copying with the mouse.
3. After each block, close the video and rebuild one small thing from memory.

If JavaScript is not on your immediate roadmap, you can skip ahead — but do not skip it permanently. Everything on the web runs on it.`),
                warn('A trap to avoid', 'Do not watch this on 2x speed. It feels efficient and you will retain almost nothing. Comprehension per minute is higher at 1x, and you are going to be asked to write this code, not to recognise it.'),
              ],
              quiz: null,
            },
            {
              id: 'cfl-cf-3-3',
              module_id: 'crm-cf-3',
              title: 'Stretch: what a neural network actually is',
              summary: '3Blue1Brown builds one from scratch, with no maths prerequisites.',
              sort_order: 3,
              duration_minutes: 19,
              xp_reward: 40,
              video: {
                provider: 'youtube',
                url: 'https://www.youtube.com/watch?v=aircAruvnKk',
                video_id: 'aircAruvnKk',
                title: 'But what is a neural network? | Deep learning chapter 1',
                channel: '3Blue1Brown',
                duration_minutes: 19,
                added_at: '2026-01-05T09:00:00.000Z',
              },
              blocks: [
                md(`## A deliberate stretch lesson

This is the longest lesson in the course and it is the one people skip. Do not. It is not extra credit - every lesson in this course counts towards completion and towards your certificate, so the next lesson stays locked until you have genuinely watched this one.

3Blue1Brown builds a neural network layer by layer in the browser, with animation, and requires no mathematics beyond multiplication and addition. You will finish it understanding what a layer does, what weights are, and what "training" actually means.

## The one idea worth keeping

A neural network is a **very large stack of multiplication and addition**, followed by a step that squashes the result:

1. Take the input.
2. Multiply by a matrix of numbers (the *weights*).
3. Add a number (the *bias*).
4. Squash the result into a range.
5. Repeat for many layers.

That is the entire mechanism. The impressive behaviour comes from having an enormous number of those weights, and from the training process slowly adjusting them.

## Why this matters for your placement prep

Interviews ask "what is a neural network" far more often than any theory behind it. After this lesson you can answer in one sentence and be accurate:

> A neural network is a stack of layers that multiply inputs by learned weights and add a bias, and the training process is what adjusts those weights.`),
                tip('Check yourself', 'Close the video and explain to a classmate, out loud, in one sentence, what a neural network is. If you cannot, rewatch the first six minutes.'),
              ],
              quiz: null,
            },
          ],
        },
        {
          id: 'crm-cf-4',
          course_id: 'crs-coding-foundations',
          title: 'Module 4 — Debugging and Your First Assessment',
          summary: 'The skill that separates people who can code from people who cannot.',
          sort_order: 4,
          lessons: [
            {
              id: 'cfl-cf-4-1',
              module_id: 'crm-cf-4',
              title: 'How to debug without guessing',
              summary: 'A repeatable method, plus the three errors you will see first.',
              sort_order: 1,
              duration_minutes: 13,
              xp_reward: 25,
              video: null,
              blocks: [
                md(`## Debugging is a procedure, not a mood

Most beginners debug by changing things and running again until the error disappears. That is not debugging; it is guessing, and it is slow and unreliable.

Debugging has four steps, in this order:

1. **Reproduce.** Make the bug happen reliably, on purpose, every time. A bug you cannot reproduce is a bug you cannot fix.
2. **Isolate.** Make it smaller. Cut the program in half until the wrong half is gone.
3. **Read the actual error.** The message names a line and a type. Skipping this step is why people get stuck.
4. **Form one hypothesis, change one thing, run.** Not five things at once — then you learn nothing from the result.

## The three error families

Every error you will meet belongs to one of these, and the categories tell you where to look.

| Family | Detected | Typical cause | Example |
| --- | --- | --- | --- |
| **Syntax** | Before running | Typing — missing colon, bracket, quote | \`if marks >= 90\` (no colon) |
| **Runtime** | While running | Your logic hits a case you did not consider | Dividing by zero, index past the end |
| **Logic** | Never | Your answer is wrong but valid | Loop runs one time too few |

The third is the hard one: nothing is red, nothing crashes, the program confidently returns a wrong number. This is where actually printing intermediate values beats staring at the code.`),
                code(`# The bug-hunting loop, in code.
def find_first_duplicate(numbers):
    seen = set()
    for n in numbers:
        if n in seen:
            return n
        seen.add(n)
    return None

# Reproduce first, on purpose, with a case you already know the answer to.
print(find_first_duplicate([1, 3, 2, 3, 4]))   # expect 3 -> works

# Now the edge cases. Each print is a hypothesis test, not debugging by feel.
print(find_first_duplicate([]))                 # expect None
print(find_first_duplicate([7]))                # expect None
print(find_first_duplicate([2, 2, 2]))          # expect 2

# A logic error: prints no error, returns a wrong answer.
def broken_average(numbers):
    return sum(numbers) / (len(numbers) + 1)    # <- the +1 is the bug

print(broken_average([10, 20]))   # prints 10.0. No error. Wrong.

# The fix that a logic error demands: check the answer against a known case.
def average(numbers):
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)

assert average([10, 20]) == 15, "average is wrong"
print("All checks passed.")`, 'debugging.py', 'python'),
                warn('The most wasted hour', 'Reading code line by line hoping the mistake jumps out. It almost never does. Print the value, or narrow the input until the wrong output becomes the right one on a smaller case.'),
                tip('Try it', 'Run \`broken_average([10, 20])\`. It prints a number, raises nothing, and is wrong. Write \`average\` so it is right, then test it against \`[10, 20]\` before you test it against anything harder.'),
              ],
              quiz: {
                id: 'cql-cf-4-1',
                passing_percent: 70,
                questions: [
                  {
                    id: 'cq14',
                    prompt: 'What is the first step of debugging?',
                    options: [
                      'Change the code until the error message disappears',
                      'Reproduce the bug reliably on purpose',
                      'Read the whole file from top to bottom',
                      'Ask someone else to fix it',
                    ],
                    correct_index: 1,
                    explanation: 'A bug you cannot reproduce on demand is a bug you cannot verify a fix against. Everything after step one depends on it.',
                  },
                  {
                    id: 'cq15',
                    prompt: 'A program runs without error but prints the wrong number. Which error family is this?',
                    options: ['Syntax error', 'Runtime error', 'Logic error', 'Type error'],
                    correct_index: 2,
                    explanation: 'Nothing is invalid, so no error is raised — the instructions are simply the wrong instructions. This is why you test against cases whose answers you already know.',
                  },
                  {
                    id: 'cq16',
                    prompt: 'Why change only one thing per test run?',
                    options: [
                      'It is faster to type',
                      'Otherwise you cannot tell which change fixed it, so you learn nothing',
                      'Compilers only accept one edit',
                      'It makes the code shorter',
                    ],
                    correct_index: 1,
                    explanation: 'Change five things at once and a passing run tells you that one of them mattered, not which. You then have to test all five again.',
                  },
                ],
              },
            },
            {
              id: 'cfl-cf-4-2',
              module_id: 'crm-cf-4',
              title: 'Course assessment',
              summary: 'Four questions across everything in the course. 70% to pass.',
              sort_order: 2,
              duration_minutes: 20,
              xp_reward: 60,
              video: null,
              blocks: [
                md(`## How this works

This is the final lesson. The quiz below is **graded on the server** — your answers are sent to the API, marked there, and the correct answers and explanations come back to you afterwards. Nothing is checked in your browser, so the score on your certificate is the score the server computed.

You need **70% to pass**. You may retake it as many times as you like; only your best attempt is kept, and the XP is awarded once.

**What this quiz assumes you have done:** every lesson in all four modules, including all three videos. It is deliberately cumulative — several questions combine ideas from more than one module, which is exactly how placement questions are written.

Pass this and the course is complete: you will be able to download your TieEdu certificate and leave feedback, and the next course in your sequence unlocks.`),
                table('Marking scheme', ['Rule', 'Value'], [
                  ['Pass mark', '70%'],
                  ['Attempts allowed', 'Unlimited'],
                  ['Score kept', 'Your best attempt'],
                  ['XP awarded', 'Once, on the first pass'],
                  ['Wrong answers', 'Explanation shown after submission'],
                ]),
                warn('Read every question before answering', 'Each question has exactly one correct option. Some are designed to look plausible — for example the float comparison and the scope questions. Read the wording carefully rather than pattern-matching on keywords.'),
              ],
              quiz: {
                id: 'cql-cf-4-2',
                passing_percent: 70,
                questions: [
                  {
                    id: 'cq17',
                    prompt: 'Which statement about a programming language is correct?',
                    options: [
                      'It is what the CPU executes directly',
                      'It is a notation that humans use, which is compiled or interpreted into machine code the CPU can run',
                      'It only works in one operating system',
                      'It is slower than machine code but executes the same way',
                    ],
                    correct_index: 1,
                    explanation: 'The CPU only executes machine code. A language is the layer above it that makes writing those instructions practical.',
                  },
                  {
                    id: 'cq18',
                    prompt: 'You want to run a block only when a value is inside a specific range. What is the most reliable check?',
                    options: [
                      '`value == range`',
                      '`low <= value <= high` where both comparisons are explicit in the language',
                      '`value in range` without defining what range means',
                      'Ask the user to type it correctly',
                    ],
                    correct_index: 1,
                    explanation: 'The exact syntax differs by language — Python allows the chained form, C and Java need `&&` on both sides — but the intent must be two explicit comparisons. Verify which form your language supports rather than assuming.',
                  },
                  {
                    id: 'cq19',
                    prompt: 'Given `scores = [70, 80, 90]` and `total = scores`, what does `scores.append(100)` do to `total`?',
                    options: [
                      'Nothing — `total` is a separate copy',
                      '`total` also becomes [70, 80, 90, 100], because both names point at the same list',
                      'It raises an error because `total` is read-only',
                      '`total` becomes 340',
                    ],
                    correct_index: 1,
                    explanation: 'Assignment aliased both names onto one list object. Appending mutates that shared object, so both names observe it.',
                  },
                  {
                    id: 'cq20',
                    prompt: 'What is the correct order of the four debugging steps?',
                    options: [
                      'Isolate, read the error, reproduce, hypothesise',
                      'Reproduce, isolate, read the error, form one hypothesis and test it',
                      'Read the error, change everything, run, reproduce',
                      'Reproduce, fix, isolate, test',
                    ],
                    correct_index: 1,
                    explanation: 'Reproduce first, shrink second, read the message third, then change exactly one thing and re-run. Any other order leaves you without a way to verify the fix.',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    getCProgrammingCourse(),
    getPythonProgrammingCourse(),
  ];
}
