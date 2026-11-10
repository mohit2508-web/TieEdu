/**
 * Project Pulse — sample data for the Phase 0 design (PROJECT_PULSE_PLAN.md §3).
 *
 * Nothing here talks to GitHub or the API. A seeded generator builds one class
 * doing one C task, so every screen has realistic, stable numbers. Each
 * student's source code is assembled from the parts of the task they finished,
 * so the code viewer, the evidence lines and the diff all agree with the
 * checklist. When Phase 3 lands, these types become the API's payload shape.
 */

export type Verdict = 'met' | 'partial' | 'missing' | 'unreviewed';
export type PulseStatus = 'done' | 'progress' | 'submitted' | 'unverified' | 'notStarted' | 'noRepo';

export interface Requirement { id: string; title: string; detail: string }
export interface TestCase { id: string; name: string; input: string; expected: string; reqId: string | null }
export type Requirement2 = Requirement;
export interface Evidence { file: string; from: number; to: number }
export interface ReqResult { verdict: Verdict; reason: string; evidence: Evidence | null }
export interface TestResult { pass: boolean; got: string }
export interface Commit { sha: string; at: string; pushed?: string; message: string; add: number; del: number }
export interface SourceFile { path: string; code: string }
export type FlagKind = 'similar' | 'bulk' | 'backdated' | 'inactive' | 'failing' | 'late' | 'workflow' | 'unverified' | 'claimed';
export interface Flag { kind: FlagKind; text: string; withId?: string; score?: number }

export interface PulseStudent {
  id: string;
  name: string;
  roll: string;
  email: string;
  github: string | null;
  repo: string | null;
  verified: boolean;
  status: PulseStatus;
  reqs: Record<string, ReqResult>;
  tests: Record<string, TestResult>;
  compiles: boolean;
  score: number;
  commits: Commit[];
  lastActivity: string | null;
  files: SourceFile[];
  flags: Flag[];
  feedback: string | null;
  // Live data only (the API); the sample leaves them out.
  feedback_list?: { body: string; at: string }[];
  sync?: { at: string | null; error: string | null; review?: null; workflow_ok: boolean | null } | null;
  folder?: string;
  folder_hint?: string | null;
  reviewed?: boolean;
  override?: { score: number; reason: string; at: string } | null;
  notes?: { body: string; at: string }[];
  verify_code?: string | null;
  verified_owner?: string | null;
  roster_status?: string;
}

export interface PulseTask {
  id: string;
  title: string;
  language: 'c' | 'swift';
  summary: string;
  assignedAt: string;
  deadlineAt: string;
  requirements: Requirement2[];
  tests: TestCase[];
  starter: SourceFile[];
  class_id?: string;
  folder?: string;
  auto_tests?: boolean;
  all_tests?: TestCase[];
  weights?: { tests: number; reqs: number; activity: number };
  published?: boolean;
}

export interface PulseClass { id: string; name: string; subject: string; teacher: string; /** Lab pack the class was set up with (e.g. wipro-ios). */ pack?: string | null }

/** "Now" is pinned so the sample reads the same on every visit. */
export const DEMO_NOW = new Date('2026-11-03T15:30:00+05:30');

export const DEMO_CLASS: PulseClass = { id: 'cse-2a', name: 'CSE 2A · 2026', subject: 'Programming in C', teacher: 'Prof. A. Sharma' };

export const DEMO_TASK: PulseTask = {
  id: 'task-3',
  title: 'Task 3 — Student Record Manager',
  language: 'c',
  folder: 'task-3',
  auto_tests: true,
  summary:
    'A menu-driven C program that keeps student records (roll, name, marks): add, list, search by roll number, save to a file and load it back, rejecting bad input.',
  assignedAt: '2026-10-24T10:00:00+05:30',
  deadlineAt: '2026-11-10T23:59:00+05:30',
  requirements: [
    { id: 'R1', title: 'Student struct', detail: 'A typedef struct with roll (int), name (char array) and marks (float), declared in records.h.' },
    { id: 'R2', title: 'Add & list records', detail: 'Menu options to add a record and print every record in a table.' },
    { id: 'R3', title: 'Search by roll number', detail: 'Find a record by roll; print "Not found" when it is missing.' },
    { id: 'R4', title: 'Save & load from file', detail: 'Write all records to records.dat on exit and read them back on start.' },
    { id: 'R5', title: 'Input validation', detail: 'Read input with fgets, reject marks outside 0–100 and non-numbers, never overflow the name.' },
  ],
  tests: [
    { id: 'T1', name: 'Compiles with gcc -Wall -Wextra -Werror', input: '—', expected: 'exit code 0, no warnings', reqId: null },
    { id: 'T2', name: 'Add two records, list them', input: '1 ↵ 101 ↵ Asha ↵ 88 ↵ 1 ↵ 102 ↵ Ravi ↵ 72 ↵ 2 ↵ 0', expected: '101  Asha  88.00\n102  Ravi  72.00', reqId: 'R2' },
    { id: 'T3', name: 'Search finds roll 102', input: '… 3 ↵ 102 ↵ 0', expected: 'Found: 102  Ravi  72.00', reqId: 'R3' },
    { id: 'T4', name: 'Search for a missing roll', input: '… 3 ↵ 999 ↵ 0', expected: 'Not found', reqId: 'R3' },
    { id: 'T5', name: 'Records survive a restart', input: 'run 1: add 101 · run 2: 2 ↵ 0', expected: '101  Asha  88.00', reqId: 'R4' },
    { id: 'T6', name: 'Rejects marks = 140 and "abc"', input: '1 ↵ 103 ↵ Meena ↵ 140 ↵ abc ↵ 65', expected: 'Marks must be 0-100 (twice), then saved', reqId: 'R5' },
  ],
  starter: [
    { path: 'main.c', code: '#include <stdio.h>\n\nint main(void) {\n    // TODO: build the student record manager\n    return 0;\n}\n' },
    { path: 'README.md', code: '# Task 3 — Student Record Manager\n\nSee the task sheet on TiEEdu Project Pulse.\n' },
  ],
};

// ---------------------------------------------------------------------------
// Seeded random, so the sample is identical on server and client renders.
// ---------------------------------------------------------------------------
const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const NAMES = [
  'Aarav Mehta', 'Ananya Singh', 'Rohit Verma', 'Neha Gupta', 'Kabir Khan', 'Priya Nair', 'Aman Yadav', 'Sneha Iyer',
  'Vikram Joshi', 'Ishita Rao', 'Arjun Patel', 'Diya Kapoor', 'Rahul Chauhan', 'Meera Pillai', 'Karan Malhotra', 'Pooja Bansal',
  'Siddharth Jain', 'Tanvi Desai', 'Harsh Tiwari', 'Riya Saxena', 'Yash Agarwal', 'Kavya Reddy', 'Nikhil Dubey', 'Sana Sheikh',
  'Aditya Kulkarni', 'Muskan Arora', 'Varun Bhatt', 'Simran Kaur', 'Dev Mishra', 'Aisha Qureshi', 'Manav Sinha', 'Nidhi Pandey',
  'Ritesh Goyal', 'Zoya Ahmed', 'Parth Shah', 'Lavanya Menon',
];

// ---------------------------------------------------------------------------
// Code assembly. Each requirement contributes a block; we track its lines.
// ---------------------------------------------------------------------------
const HEADER_FULL = `#ifndef RECORDS_H
#define RECORDS_H

#define MAX_STUDENTS 100
#define NAME_LEN 50

typedef struct {
    int roll;
    char name[NAME_LEN];
    float marks;
} Student;

int  add_student(Student list[], int count);
void list_students(const Student list[], int count);
int  find_by_roll(const Student list[], int count, int roll);
int  save_records(const char *path, const Student list[], int count);
int  load_records(const char *path, Student list[]);

#endif
`;
const HEADER_PARTIAL = `#ifndef RECORDS_H
#define RECORDS_H

#define MAX_STUDENTS 100

typedef struct {
    int roll;
    char *name;      /* TODO: allocate? */
    int marks;
} Student;

#endif
`;

const BLOCKS: Record<string, { met: string; partial: string; missing?: string }> = {
  R5: {
    met: `/* Reads one line and parses an int; returns 0 on bad input. */
static int read_int(const char *prompt, int *out) {
    char buf[32];
    char *end;
    printf("%s", prompt);
    if (!fgets(buf, sizeof buf, stdin)) return 0;
    long v = strtol(buf, &end, 10);
    if (end == buf || (*end != '\\n' && *end != '\\0')) return 0;
    *out = (int)v;
    return 1;
}

static void read_name(char *dst, size_t size) {
    printf("Name: ");
    if (fgets(dst, (int)size, stdin)) dst[strcspn(dst, "\\n")] = '\\0';
}

static float read_marks(void) {
    int m;
    while (!read_int("Marks (0-100): ", &m) || m < 0 || m > 100)
        printf("Marks must be 0-100\\n");
    return (float)m;
}
`,
    partial: `static int read_int(const char *prompt, int *out) {
    printf("%s", prompt);
    return scanf("%d", out) == 1;
}

static void read_name(char *dst, size_t size) {
    (void)size;
    printf("Name: ");
    scanf("%s", dst);            /* can overflow */
}

static float read_marks(void) {
    float m;
    printf("Marks (0-100): ");
    scanf("%f", &m);             /* no check for letters */
    if (m < 0 || m > 100) printf("Marks must be 0-100\\n");
    return m;
}
`,
    missing: `static int read_int(const char *prompt, int *out) {
    printf("%s", prompt);
    scanf("%d", out);
    return 1;
}

static void read_name(char *dst, size_t size) {
    (void)size;
    printf("Name: ");
    scanf("%s", dst);
}

static float read_marks(void) {
    float m;
    printf("Marks: ");
    scanf("%f", &m);
    return m;
}
`,
  },
  R2: {
    met: `int add_student(Student list[], int count) {
    if (count >= MAX_STUDENTS) { printf("List is full\\n"); return count; }
    Student *s = &list[count];
    read_int("Roll: ", &s->roll);
    read_name(s->name, sizeof s->name);
    s->marks = read_marks();
    printf("Saved %d\\n", s->roll);
    return count + 1;
}

void list_students(const Student list[], int count) {
    printf("%-6s %-20s %s\\n", "Roll", "Name", "Marks");
    for (int i = 0; i < count; i++)
        printf("%-6d %-20s %.2f\\n", list[i].roll, list[i].name, list[i].marks);
}
`,
    partial: `int add_student(Student list[], int count) {
    printf("Roll: ");
    scanf("%d", &list[count].roll);
    printf("Name: ");
    scanf("%s", list[count].name);
    list[count].marks = read_marks();
    return count + 1;
}
/* TODO: list_students */
`,
  },
  R3: {
    met: `int find_by_roll(const Student list[], int count, int roll) {
    for (int i = 0; i < count; i++)
        if (list[i].roll == roll) return i;
    return -1;
}

static void search(const Student list[], int count) {
    int roll;
    if (!read_int("Roll to find: ", &roll)) return;
    int i = find_by_roll(list, count, roll);
    if (i < 0) printf("Not found\\n");
    else printf("Found: %d  %s  %.2f\\n", list[i].roll, list[i].name, list[i].marks);
}
`,
    partial: `static void search(Student list[], int count) {
    int roll;
    printf("Roll to find: ");
    scanf("%d", &roll);
    for (int i = 0; i < count; i++)
        if (list[i].roll == roll)
            printf("Found: %d  %s  %.2f\\n", list[i].roll, list[i].name, list[i].marks);
    /* missing roll prints nothing */
}
`,
  },
  R4: {
    met: `int save_records(const char *path, const Student list[], int count) {
    FILE *f = fopen(path, "wb");
    if (!f) { perror("save"); return 0; }
    fwrite(&count, sizeof count, 1, f);
    fwrite(list, sizeof(Student), (size_t)count, f);
    fclose(f);
    return 1;
}

int load_records(const char *path, Student list[]) {
    FILE *f = fopen(path, "rb");
    int count = 0;
    if (!f) return 0;
    if (fread(&count, sizeof count, 1, f) != 1 || count > MAX_STUDENTS) count = 0;
    count = (int)fread(list, sizeof(Student), (size_t)count, f);
    fclose(f);
    return count;
}
`,
    partial: `int save_records(const char *path, const Student list[], int count) {
    FILE *f = fopen(path, "w");
    for (int i = 0; i < count; i++)
        fprintf(f, "%d %s %f\\n", list[i].roll, list[i].name, list[i].marks);
    fclose(f);               /* never read back on start */
    return 1;
}
`,
  },
};

const REASONS: Record<string, Record<Exclude<Verdict, 'unreviewed'>, string>> = {
  R1: {
    met: 'Student is a typedef struct with int roll, char name[NAME_LEN] and float marks, declared in records.h as asked.',
    partial: 'A struct exists, but name is a char * that is never allocated, and marks is an int, not a float.',
    missing: 'No Student struct found in any file; records are not modelled yet.',
  },
  R2: {
    met: 'add_student() fills a record through the validated readers; list_students() prints every record as a table. Menu options 1 and 2 call them.',
    partial: 'Records can be added, but there is no list function yet, and scanf("%s") stops at the first space in a name.',
    missing: 'There is no code to add or list records.',
  },
  R3: {
    met: 'find_by_roll() does a linear search and search() prints "Not found" for a missing roll, which matches the task sheet.',
    partial: 'search() finds a matching roll but prints nothing when the roll is missing; the task asks for "Not found".',
    missing: 'No search by roll number found.',
  },
  R4: {
    met: 'save_records() writes the count and the array in binary; load_records() reads them back on start and guards against a count above MAX_STUDENTS.',
    partial: 'Records are written to a text file, but nothing reads them back on start, so data does not survive a restart. fopen is not checked for NULL.',
    missing: 'No file handling (fopen / fwrite / fread) found.',
  },
  R5: {
    met: 'Input goes through fgets + strtol; marks outside 0–100 and non-numbers are rejected in a loop; the name uses sizeof, so it cannot overflow.',
    partial: 'Marks are range-checked, but scanf("%f") loops forever on letters, and the bad value is still stored after the message.',
    missing: 'Input is read with bare scanf and never checked.',
  },
};

interface Built { files: SourceFile[]; evidence: Record<string, Evidence | null> }

const buildCode = (v: Record<string, Verdict>): Built => {
  const evidence: Record<string, Evidence | null> = { R1: null, R2: null, R3: null, R4: null, R5: null };
  const files: SourceFile[] = [];
  if (v.R1 !== 'missing') {
    const h = v.R1 === 'met' ? HEADER_FULL : HEADER_PARTIAL;
    files.push({ path: 'records.h', code: h });
    const lines = h.split('\n');
    const from = lines.findIndex((l) => l.includes('struct')) + 1;
    const to = lines.findIndex((l, i) => i >= from && l.startsWith('}')) + 1;
    evidence.R1 = { file: 'records.h', from, to };
  }

  const out: string[] = [];
  const push = (s: string) => out.push(...s.replace(/\n$/, '').split('\n'));
  push('#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>');
  push(v.R1 !== 'missing' ? '#include "records.h"' : '');
  out.push('');
  if (v.R1 === 'missing') push('int rolls[100];\nint count = 0;\n');
  for (const id of ['R5', 'R2', 'R3', 'R4'] as const) {
    if (v[id] === 'missing') {
      // The readers are needed by everything else; without R5 they are bare scanf.
      const fallback = BLOCKS[id].missing;
      if (fallback) { push(fallback); out.push(''); }
      continue;
    }
    const from = out.length + 1;
    push(BLOCKS[id][v[id] === 'met' ? 'met' : 'partial']);
    evidence[id] = { file: 'main.c', from, to: out.length };
    out.push('');
  }
  // main(): the menu offers only what exists.
  const opts: string[] = [];
  if (v.R2 !== 'missing') opts.push('            case 1: count = add_student(list, count); break;');
  if (v.R2 === 'met') opts.push('            case 2: list_students(list, count); break;');
  if (v.R3 !== 'missing') opts.push('            case 3: search(list, count); break;');
  if (v.R1 === 'missing') {
    push('int main(void) {\n    printf("Student records\\n");\n    // TODO: menu\n    return 0;\n}');
  } else {
    push('int main(void) {\n    Student list[MAX_STUDENTS];');
    push(v.R4 === 'met' ? '    int count = load_records("records.dat", list);' : '    int count = 0;');
    push('    int choice = -1;\n    while (choice != 0) {\n        printf("\\n1 Add  2 List  3 Search  0 Exit\\n");');
    push(v.R5 === 'met' ? '        if (!read_int("> ", &choice)) continue;' : '        scanf("%d", &choice);');
    push('        switch (choice) {');
    out.push(...opts);
    push('            case 0: break;\n            default: printf("Unknown option\\n");\n        }\n    }');
    if (v.R4 !== 'missing') push('    save_records("records.dat", list, count);');
    push('    return 0;\n}');
  }
  files.unshift({ path: 'main.c', code: out.join('\n') + '\n' });
  files.push({ path: 'README.md', code: '# Task 3 — Student Record Manager\n\nBuild: `gcc -Wall -Wextra -o records main.c`\nRun: `./records`\n' });
  if (v.R4 === 'met') files.push({ path: 'Makefile', code: 'records: main.c records.h\n\tgcc -Wall -Wextra -Werror -o records main.c\n\nclean:\n\trm -f records records.dat\n' });
  return { files, evidence };
};

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
const COMMIT_MSGS = [
  'add Student struct', 'menu loop', 'add_student and list', 'search by roll', 'fix name overflow', 'save records to file',
  'load records on start', 'validate marks', 'use fgets instead of scanf', 'Makefile', 'fix warning', 'update README', 'refactor readers',
  'handle not found', 'wip', 'fix', 'final',
];

const hex = (r: () => number) => Array.from({ length: 7 }, () => '0123456789abcdef'[Math.floor(r() * 16)]).join('');

const build = (): PulseStudent[] => {
  const r = mulberry32(20261103);
  const assigned = new Date(DEMO_TASK.assignedAt).getTime();
  const now = DEMO_NOW.getTime();

  const students = NAMES.map((name, i): PulseStudent => {
    const first = name.split(' ')[0].toLowerCase();
    const handle = `${first}${name.split(' ')[1][0].toLowerCase()}${10 + i}`;
    const roll = `22CS${String(101 + i).padStart(3, '0')}`;
    const noRepo = i === 6 || i === 21 || i === 33;
    const notStarted = !noRepo && (i === 2 || i === 12 || i === 18 || i === 27 || i === 30);
    const level = noRepo || notStarted ? 0 : 0.25 + r() * 0.85;

    const v: Record<string, Verdict> = {};
    DEMO_TASK.requirements.forEach((req, k) => {
      const threshold = [0.18, 0.32, 0.5, 0.72, 0.86][k];
      const x = level + (r() - 0.5) * 0.18;
      v[req.id] = level === 0 ? 'missing' : x >= threshold + 0.08 ? 'met' : x >= threshold - 0.06 ? 'partial' : 'missing';
    });
    if (level > 0 && v.R1 === 'missing') v.R1 = 'partial';

    const compiles = level > 0 && r() > 0.12;
    const tests: Record<string, TestResult> = {};
    for (const t of DEMO_TASK.tests) {
      let pass: boolean;
      if (level === 0) pass = false;
      else if (t.id === 'T1') pass = compiles;
      else if (!compiles) pass = false;
      else if (t.id === 'T3') pass = v.R3 !== 'missing';
      else pass = t.reqId ? v[t.reqId] === 'met' : false;
      const got = level === 0 ? 'not run: no code' : !compiles && t.id !== 'T1' ? 'not run: build failed' : pass
        ? 'as expected'
        : t.id === 'T1' ? "main.c:41: error: implicit declaration of function 'list_students'"
        : t.id === 'T4' ? '(no output)'
        : t.id === 'T5' ? '(empty list after restart)'
        : t.id === 'T6' ? 'stored 140.00 · loops on "abc"'
        : t.id === 'T2' ? 'Unknown option' : 'Unknown option';
      tests[t.id] = { pass, got };
    }

    // Commits
    const commits: Commit[] = [];
    const n = level === 0 ? 0 : Math.round(2 + level * 13 + r() * 4);
    const spreadDays = level === 0 ? 0 : Math.max(1, Math.round(level * 9 + r() * 2));
    const startAt = assigned + r() * 3 * 86400000;
    for (let k = 0; k < n; k++) {
      const at = Math.min(now - 3600000 * (1 + r() * 20), startAt + (k / Math.max(1, n - 1)) * spreadDays * 86400000 + r() * 6 * 3600000);
      commits.push({ sha: hex(r), at: new Date(at).toISOString(), message: COMMIT_MSGS[Math.floor(r() * COMMIT_MSGS.length)], add: 4 + Math.floor(r() * 40), del: Math.floor(r() * 9) });
    }
    commits.sort((a, b) => b.at.localeCompare(a.at));
    if (commits.length) { commits[commits.length - 1].message = 'add Student struct'; }

    const built = level === 0 ? { files: DEMO_TASK.starter, evidence: {} as Record<string, Evidence | null> } : buildCode(v);
    const reqs: Record<string, ReqResult> = {};
    for (const req of DEMO_TASK.requirements) {
      reqs[req.id] = { verdict: v[req.id], reason: level === 0 ? 'No code yet; only the starter file is in the repo.' : REASONS[req.id][v[req.id] as Exclude<Verdict, 'unreviewed'>], evidence: built.evidence[req.id] ?? null };
    }

    const passed = Object.values(tests).filter((t) => t.pass).length;
    const reqPts = Object.values(v).reduce((s, x) => s + (x === 'met' ? 1 : x === 'partial' ? 0.5 : 0), 0);
    const activeDays = new Set(commits.map((c) => c.at.slice(0, 10))).size;
    const score = level === 0 ? 0 : Math.round((50 * passed) / DEMO_TASK.tests.length + (40 * reqPts) / 5 + 10 * Math.min(activeDays / 3, 1));
    const allMet = Object.values(v).every((x) => x === 'met');
    const status: PulseStatus = noRepo ? 'noRepo' : commits.length === 0 ? 'notStarted' : allMet && passed === DEMO_TASK.tests.length ? 'done' : 'progress';

    return {
      id: `s${i + 1}`,
      name,
      roll,
      email: `${first}.${roll.toLowerCase()}@college.edu.in`,
      github: noRepo ? null : handle,
      repo: noRepo ? null : `${handle}/c-task-3`,
      // r() still drawn so the rest of the sample stays the same; every linked sample repo is verified.
      verified: (r(), !noRepo),
      status,
      reqs,
      tests,
      compiles,
      score,
      commits,
      lastActivity: commits[0]?.at ?? null,
      files: noRepo ? [] : built.files,
      flags: [],
      feedback: status === 'done' && r() > 0.5 ? 'Clean work. Next time, split the readers into their own file.' : null,
      folder: 'task-3',
      reviewed: level > 0,
    };
  });

  // Flags: inactivity, failing build, a bulk commit, a backdated commit, two similar pairs.
  for (const s of students) {
    if (s.lastActivity && now - new Date(s.lastActivity).getTime() > 5 * 86400000 && s.status !== 'done') {
      s.flags.push({ kind: 'inactive', text: `No commits for ${Math.floor((now - new Date(s.lastActivity).getTime()) / 86400000)} days` });
    }
    if (s.commits.length && !s.compiles) s.flags.push({ kind: 'failing', text: 'Build fails: gcc reports an error' });
  }
  const pair = (a: number, b: number, score: number) => {
    students[a].flags.push({ kind: 'similar', text: `${score}% similar to ${students[b].name} (main.c)`, withId: students[b].id, score });
    students[b].flags.push({ kind: 'similar', text: `${score}% similar to ${students[a].name} (main.c)`, withId: students[a].id, score });
  };
  pair(3, 16, 91);
  pair(9, 25, 78);
  const bulk = students[23];
  if (bulk.commits.length) { bulk.commits[0].add = 182; bulk.flags.push({ kind: 'bulk', text: '86% of the code arrived in one commit' }); }
  if (students[14].commits.length) students[14].flags.push({ kind: 'backdated', text: 'Commit 2 dates differ from push time by 3 days' });
  return students;
};

let cache: PulseStudent[] | null = null;
export const demoStudents = (): PulseStudent[] => (cache ??= build());
export const demoStudent = (id: string) => demoStudents().find((s) => s.id === id) ?? null;

// ---------------------------------------------------------------------------
// Derived figures for the dashboard
// ---------------------------------------------------------------------------
export const STATUS_META: Record<PulseStatus, { label: string; color: string; soft: string; ink: string }> = {
  done: { label: 'Done', color: 'rgb(var(--rgb-success))', soft: 'bg-success-soft', ink: 'text-success' },
  submitted: { label: 'Submitted · to review', color: 'rgb(var(--rgb-info))', soft: 'bg-info-soft', ink: 'text-info' },
  progress: { label: 'In progress', color: 'rgb(var(--rgb-signal))', soft: 'bg-warning-soft', ink: 'text-warning' },
  unverified: { label: 'Not verified', color: 'rgb(var(--rgb-rose))', soft: 'bg-rose-soft', ink: 'text-rose' },
  notStarted: { label: 'Not started', color: 'rgb(var(--rgb-danger))', soft: 'bg-danger-soft', ink: 'text-error' },
  noRepo: { label: 'No repo', color: 'rgb(var(--rgb-series-other))', soft: 'bg-surface-hover', ink: 'text-muted' },
};

export const dayKey = (iso: string) => {
  const d = new Date(iso);
  // India time, so "a day" matches the classroom's day.
  return new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
};

/** Every day from assignment to deadline, with commit counts (future days null). */
export const commitsPerDay = (list: PulseStudent[], task: Pick<PulseTask, 'assignedAt' | 'deadlineAt'> = DEMO_TASK, now: Date = DEMO_NOW) => {
  const start = new Date(task.assignedAt);
  // Long tasks: show at most the last 45 days up to the deadline.
  const end = new Date(task.deadlineAt);
  if (end.getTime() - start.getTime() > 45 * 86400000) start.setTime(Math.max(start.getTime(), Math.min(now.getTime(), end.getTime()) - 44 * 86400000));
  const today = dayKey(now.toISOString());
  const counts = new Map<string, number>();
  for (const s of list) for (const c of s.commits) counts.set(dayKey(c.at), (counts.get(dayKey(c.at)) ?? 0) + 1);
  const days: { key: string; label: string; value: number | null; today: boolean }[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const key = dayKey(new Date(t).toISOString());
    const d = new Date(`${key}T12:00:00`);
    days.push({ key, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: key > today ? null : counts.get(key) ?? 0, today: key === today });
  }
  return days;
};

export const relTime = (iso: string | null, now: Date = DEMO_NOW) => {
  if (!iso) return 'never';
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export const reqPoints = (s: PulseStudent) =>
  Object.values(s.reqs).reduce((n, r) => n + (r.verdict === 'met' ? 1 : r.verdict === 'partial' ? 0.5 : 0), 0);
export const testsPassed = (s: PulseStudent) => Object.values(s.tests).filter((t) => t.pass).length;

/** Everything a Pulse screen needs, from the sample or the API. */
export interface RepoInfo { repo: string | null; verified: boolean; verify_code: string | null; synced_at: string | null; error: string | null; workflow_ok: boolean | null; workflow_needed: boolean }
export interface PulseBundle { cls: PulseClass; task: PulseTask; students: PulseStudent[]; now: Date; lastSync?: string | null; repo?: RepoInfo; position?: number; total?: number }
export const demoBundle = (): PulseBundle => ({ cls: DEMO_CLASS, task: DEMO_TASK, students: demoStudents(), now: DEMO_NOW, lastSync: '2026-11-03T15:18:00+05:30' });

/** Line diff (LCS) between the starter file and the student's file. */
export type DiffLine = { kind: 'same' | 'add' | 'del'; text: string; n: number | null };
export const lineDiff = (before: string, after: string): DiffLine[] => {
  const a = before.replace(/\n$/, '').split('\n');
  const b = after.replace(/\n$/, '').split('\n');
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { out.push({ kind: 'same', text: b[j], n: j + 1 }); i++; j++; }
    else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) { out.push({ kind: 'add', text: b[j], n: j + 1 }); j++; }
    else { out.push({ kind: 'del', text: a[i], n: null }); i++; }
  }
  return out;
};
