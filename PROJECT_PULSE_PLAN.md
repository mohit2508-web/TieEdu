# Project Pulse — GitHub task tracker for teachers and students

> **Status (2026-11-03):** Phases 0–6 and 8 are built. Phase 7 (GitHub App) is replaced by a repo
> collaborator bot plus a `PULSE.txt` ownership code. The whole feature is linked only from the
> footer. It is not committed yet.
>
> **Server settings:** `PULSE_GITHUB_TOKEN` (needed: without it GitHub allows only 60 requests an
> hour), `PULSE_API_URL` (the public API address written into the autograder workflow; defaults to
> the request host), `ANTHROPIC_API_KEY` + the admin switch for AI review, `PULSE_SYNC=0` to stop
> the 20-minute background sync.

---

## 1. What it is

A teacher gives a class a coding task (C programming first). Each student works in their own GitHub
repo. **Project Pulse** shows, per student and for the whole class:

- whether they started, how much they did, and when;
- **whether each requirement of the task is actually done**, with the exact lines of code as proof;
- whether the code **compiles and passes the test cases**;
- **their full source code and what changed**, readable inside TieEdu;
- **integrity signals**: copied code, one bulk commit just before the deadline, commits after the
  deadline.

**Name.** "Project Pulse" (rejected: "GitHub Tracker", "Code Tracker"). It says what it measures, the
pulse of each student's project, and doesn't tie the feature to GitHub, so GitLab can be added later.

---

## 2. Roles and access (the rule everything else follows)

| Role | Who creates them | How many | What they see | What they can do |
|---|---|---|---|---|
| **Admin** (TieEdu staff) | already exists (`users.role = 'admin'`) | — | everything | create teacher logins, approve co-teachers, remove teachers, AI switch |
| **Teacher** | **only the admin**, from Teacher portal → Admin · teachers | unlimited | **only their own classes** (each teacher has their own portal) | classes, tasks, invite students, email the join code, request co-teachers, marks, feedback, CSV |
| **Co-teacher** | requested by a class owner; **approved by the admin** if they have no teacher login yet | unlimited per class | that class only, the same as its owner | the same as the owner, except adding more co-teachers or archiving the class |
| **Student** | invited by a teacher (email) or by join code (teacher approves) | unlimited | **only their own work** | link repo, see progress, re-check |

### 2.1 Teacher logins (admin only)
1. Teachers **cannot register**. The normal TieEdu sign-up never makes anyone a teacher.
2. The admin enters the teacher's **name, email and college** and clicks *Create teacher login*.
   - If no TieEdu account has that email, one is created **without a password**. The teacher gets
     an email: "Set my password". It's a one-time link valid for **7 days** that uses the normal
     reset page. The link is also shown to the admin, so it can be shared on WhatsApp.
   - If the email already has an account, it is made a teacher and they sign in as usual.
3. Teachers whose password isn't set show **"Password not set yet"** with a *Send login link* button.
4. The admin can remove a teacher at any time. They lose the teacher portal immediately; their
   classes stay.
5. **The admin can set the password themselves** (current setup). Type it in the *Password* box
   when creating the login, or use **Set password** on any teacher in the list (8+ characters), then
   give it to the teacher. With the box empty, the emailed set-password link is used instead. An
   admin-typed password is applied only to a login created there, never to an existing account
   (use Set password for that). Every password set is written to the audit log.

### 2.2 Co-teachers (unlimited)
- The class owner enters the co-teacher's name and email.
  - **Already a teacher:** added at once.
  - **Not a teacher:** a **request goes to the admin** and shows on the class page as "waiting for
    admin". When the admin clicks **Approve**, the login is created (set-password email, as in
    §2.1) and the person is added to the class. **Reject** discards the request.
- So every teacher login, including co-teachers', is approved by an admin.

### 2.3 Students
1. **Invite by email:** the teacher pastes "email, name, roll no" lines. Each student gets an email
   with a **one-time join link** and the **class join code**. They sign in with that same email.
2. **Join code:** students enter it at `/project-pulse/join`. If the teacher invited their email,
   they get in at once; anyone else waits for the teacher's approval.
3. Students never see another student's name, code, score or rank. Removing a student cuts access
   immediately.

### 2.4 Server rule
Every API call checks access on the server: admin, `teacher ∈ class owner/co-teachers`, or
`student = this roster row, active`. The frontend only hides things. Every teacher login created,
appointment, co-teacher decision, override and code view goes into the audit log.

## 3. Screens (Phase 0 builds all of them on sample data)

### 3.1 `/project-pulse`, landing page
What Pulse is, two role cards (Teacher / Student), a note that access is invite-only, and a
"design preview" banner.

### 3.2 `/project-pulse/teacher`, class dashboard
- **Top bar:** class picker, task picker, deadline countdown, "last synced", **Sync now**, **Export CSV**.
- **KPI tiles:** students · repos linked · completed · average requirements met · tests passing ·
  integrity flags.
- **Charts:**
  - *Status donut*: Done / In progress / Not started / No repo, with counts and percentages.
  - *Commits per day*: column chart from the assignment date to today, with a deadline marker. It
    answers "is the class working, or waiting for the last night?"
  - *Requirement completion*: horizontal bars, % of the class that met each requirement. It shows
    which part of the task is hard for everyone, so the teacher knows what to re-teach.
  - *Score distribution*: histogram, 0–100 in bands of 10.
- **Needs attention:** a short list that names who is behind: not started, no activity in 5+ days,
  failing tests, copy flags.
- **Student × requirement matrix:** every student as a row and every requirement as a column,
  marked ✓ / ~ / ✗. The whole class on one screen.
- **Student table:** search, filter by status, sort by any column. Columns: name, status,
  requirements bar, tests passed, score, commits, last activity, flags. Each row opens the student.
- **Integrity panel:** student pairs with code similarity ≥ 70%.

### 3.3 `/project-pulse/teacher/[studentId]`, one student, every detail
Tabs:
1. **Overview:** score, status, repo link, requirement checklist (each item: done/partial/missing,
   the AI's reasoning, **evidence file:line**), test-case table (input, expected, got, pass/fail).
2. **Code:** file tree and source viewer with line numbers. The evidence lines of the selected
   requirement are highlighted. The code is read-only.
3. **Changes:** diff of everything the student added or changed since the task was assigned.
4. **Timeline:** commits per day, plus every commit with its time, message, and +/− lines.
5. **Integrity:** similarity matches (with whom, %, which file), timeline flags (bulk commit, after
   deadline, backdated commit).
6. **Teacher panel**, always visible: override marks, private note, feedback to the student
   (visible to them), "Request resubmission".

### 3.4 `/project-pulse/student`, the student's own view
- **Repo card:** linked repo with its sync status. If no repo is linked yet, a "Link your repo"
  form takes its place.
- **My tasks:** every task assigned to them, with deadline and status.
- **Current task:** progress ring (requirements met), checklist with "what's missing and why",
  test results, and the teacher's feedback.
- **My activity:** their own commits per day and commit list.
- **Request re-check** button, rate-limited to 1 every 10 minutes.
- No other student's data, anywhere.

---

## 4. How completion is checked (three layers)

| Layer | Checks | Source | Trust |
|---|---|---|---|
| **1. Activity** | commits after assigned date, files required by the task exist, last activity | GitHub REST: commits, contents, compare | shows *effort*, not correctness |
| **2. Autograder** | `gcc -Wall -Wextra -Werror` compiles; test cases (stdin → expected stdout); optional `valgrind` leak check | **GitHub Actions in the student's repo** (workflow we supply), read via Checks API | shows the code *works* |
| **3. AI review** | each requirement read against the code: met / partial / missing, plus file:line evidence and a one-line reason | Claude (latest Sonnet) on the repo snapshot at a given commit | shows *what exactly* is done, gives the teacher a fast read |

**Score** = 50% tests + 40% requirements (AI, overridable by the teacher) + 10% activity
(spread over at least 3 days and meaningful commit messages). The teacher can change the weights per
task.

**Why tests run on GitHub Actions, not on our server:** student C code is untrusted. Running it on
our API server is a security hole: fork bombs, infinite loops, filesystem reads. GitHub's runners
are isolated and free for public repos. **Fallback** for private repos or students without Actions:
a sandboxed worker (Docker, `--network none`, 256 MB memory, 1 CPU, 5 s per test, read-only fs,
non-root user). The worker is a separate service and is never the API process.

**Status rules**

- *No repo:* the student hasn't linked a repo.
- *Not started:* the repo is linked, but there are no commits after the assigned date.
- *In progress:* at least one commit, and either tests fail or a requirement is missing.
- *Done:* all tests pass **and** all requirements are met (or overridden by the teacher).
- *Late:* a flag, not a status. It applies when the last meaningful commit is after the deadline.

---

## 5. Integrity checks

1. **Similarity (copy detection):** strip comments and whitespace, then tokenise the C source and
   rename identifiers to `ID`, so renaming variables doesn't hide a copy. Fingerprint it with k-gram
   winnowing (MOSS-style, k=25, w=4) and compare every pair in the class with Jaccard similarity.
   Pairs at ≥ 70% get flagged. The starter code the teacher provides is subtracted first, so
   everyone isn't flagged for sharing it.
2. **Bulk commit:** more than 80% of final lines arrived in one commit.
3. **Last-minute:** more than 70% of lines arrived in the last 6 hours before the deadline.
4. **Backdated commits:** the author date differs from the time GitHub received the push (taken
   from the push webhook) by more than 1 hour.
5. **Starter unchanged:** the final code is the same as the starter.

6. **Someone else's repo.** Each student gets a personal code. A repo counts only after its
   `PULSE.txt` contains that code, which only someone who can push to the repo can add, or after
   the teacher verifies it in person. Until then the status is **Not verified** and the score is 0.
   An unverified link never blocks the real owner. When the owner verifies, everyone else's link to
   that repo is removed, and their teacher sees "Linked another student's repo". After verification,
   a student can only link repos from the same GitHub account; the teacher can reset this.

Flags are **signals for the teacher, never automatic penalties.** The UI says so.

---

## 6. GitHub integration

**Preferred: a GitHub App ("TieEdu Project Pulse").**
- The student installs the app on their repo through "Connect GitHub". This proves the repo is
  theirs and gives read access to private repos.
- Permissions: `contents:read`, `metadata:read`, `checks:read`, `actions:read`. Nothing else.
- It receives a `push` webhook, which gives instant syncs and real push times for the backdating
  check.
- Rate limit: 5,000 requests per hour per installation, which is enough for very large classes.

**Fallback: public repo URL plus a server token.** The student just pastes the URL; Pulse polls
every 30 minutes. It can't verify ownership, so the UI shows "unverified".

**Sync job** (per submission, on webhook or poll):
1. Read the head commit SHA. If it hasn't changed since the last sync, stop.
2. Read the commit list since the assigned date, with author, dates, message and stats.
3. Read the tree and files (only extensions `.c .h Makefile .txt .md` under 200 KB, 60 files max).
4. Read check runs for the SHA (autograder results).
5. Similarity fingerprints, then re-compare with the class.
6. AI review, **cached by SHA**: the same commit is never reviewed twice.
7. Compute score and status, write the snapshot, and notify on status change.

We also provide **`pulse-autograde.yml`**, the workflow file the teacher adds to the starter repo
(or Pulse opens a PR with it). It compiles, runs the teacher's test cases, and reports one check
per test.

---

## 7. Data model (Postgres, new tables only, prefixed `pulse_`)

```
pulse_teachers      (user_id PK, granted_by, granted_at, revoked_at)
pulse_classes       (id, name, subject, owner_teacher_id, join_code, created_at, archived_at)
pulse_class_teachers(class_id, teacher_id, role 'owner'|'co', approved_at)
pulse_roster        (id, class_id, email, name, roll_no, student_user_id NULL, status 'invited'|'active'|'removed', invited_at, joined_at)
pulse_tasks         (id, class_id, title, description_md, language 'c', assigned_at, deadline_at,
                     starter_repo, required_files jsonb, weights jsonb, published_at)
pulse_requirements  (id, task_id, ordinal, title, detail, rubric_md)
pulse_test_cases    (id, task_id, name, stdin, expected_stdout, timeout_ms, requirement_id NULL, hidden bool)
pulse_submissions   (id, task_id, roster_id, repo_full_name, verified bool, installation_id, linked_at)
pulse_snapshots     (id, submission_id, head_sha, synced_at, status, score, commits int, last_commit_at,
                     files jsonb, tests jsonb, flags jsonb)
pulse_req_results   (snapshot_id, requirement_id, verdict 'met'|'partial'|'missing', reason, evidence jsonb, source 'ai'|'teacher')
pulse_commits       (submission_id, sha, author_date, pushed_at, message, additions, deletions)
pulse_similarity    (task_id, sub_a, sub_b, score, top_file, computed_at)
pulse_feedback      (id, submission_id, teacher_id, body, visible_to_student bool, created_at)
pulse_overrides     (submission_id, requirement_id NULL, field, value, teacher_id, reason, created_at)
```

Source code is **not stored permanently.** The files of the latest snapshot are cached (compressed,
under 2 MB per student). Older snapshots keep only hashes and results.

---

## 8. API (Express, `backend/src/routes/pulse.ts`, all under `/api/pulse`)

| Method & path | Who | Purpose |
|---|---|---|
| `GET /me` | any signed-in | returns `{ isTeacher, classes[], studentOf[] }` |
| `POST /admin/teachers` · `DELETE /admin/teachers/:id` | admin | appoint or remove a teacher |
| `POST /classes` · `GET /classes/:id` | teacher | create or read a class |
| `POST /classes/:id/roster` (CSV/emails) · `DELETE /roster/:id` | teacher | invite or remove students |
| `POST /join` `{token \| code}` | student | accept an invite |
| `POST /classes/:id/tasks` · `PUT /tasks/:id` | teacher | create or edit a task, its requirements and its tests |
| `GET /tasks/:id/dashboard` | teacher | everything on the class dashboard, in one payload |
| `GET /tasks/:id/students/:rosterId` | teacher | student detail (code, diff, timeline, integrity) |
| `GET /tasks/:id/export.csv` | teacher | the table, as CSV |
| `POST /submissions/:id/override` · `/feedback` | teacher | marks and feedback |
| `POST /tasks/:id/sync` | teacher | sync the whole class now (queued) |
| `GET /student/tasks` · `GET /student/tasks/:id` | student | own progress only |
| `POST /student/tasks/:id/repo` | student | link a repo |
| `POST /student/tasks/:id/recheck` | student | re-sync, max 1 every 10 minutes |
| `POST /github/webhook` | GitHub | push and installation events (HMAC verified) |

Middleware: `requirePulseTeacher(classId)` and `requirePulseStudent(taskId)`, each with a test in
`scripts/pulse-access.test.ts`. The test proves that a student of class A can't read class B, and
that a student can't read another student's submission.

---

## 9. Build phases

| Phase | What | Done when |
|---|---|---|
| **0 — Design** ✅ | All four screens on sample data; footer link; noindex | pages look right in light and dark, desktop and mobile |
| **1 — Access** | tables `pulse_teachers/classes/roster`, admin appoints teacher, invites, join flow, `/me`, route guards | the access tests pass; a non-invited user gets a 403 |
| **2 — Tasks** | teacher creates a task: requirements, test cases, deadline, required files | a task shows up on the student view |
| **3 — GitHub sync** | repo link (URL), poll sync, commits, files, activity status, timeline, code viewer, diff | real repos show real commits and code |
| **4 — Autograder** | `pulse-autograde.yml`, check-runs read-back, test table; sandbox worker fallback | the test pass/fail matches a local run |
| **5 — AI review** | requirement verdicts with evidence, cached by SHA, teacher override | the verdicts agree with teacher marks on 20 sample repos |
| **6 — Integrity** | similarity, timeline flags, integrity panel | a planted copy is flagged, renamed variables included |
| **7 — GitHub App** | ownership verification, private repos, webhooks | a push shows up in under 1 minute |
| **8 — Polish** | CSV export, emails (invite, deadline reminder, feedback), notifications | — |

---

## 10. Risks and limits (stated plainly to teachers)

- The AI review can be wrong. It is a fast first read, the teacher has the final say, and every
  verdict can be overridden.
- Tests prove only what they test, so the teacher should write tests per requirement.
- Similarity catches copy-paste and renaming, but not code retyped by hand from a friend's.
- Private repos need the GitHub App, or the student must add the teacher as a collaborator.
- Students can rewrite git history. Pulse keeps its own record of every head SHA it has seen, so
  rewriting doesn't erase what was already synced.

---

## 11. What was built

**Backend** (`backend/src`)
- `lib/pulse/store.ts`: data under `db.pulse` in the JSON store, with files in `data/pulse/<sub>.json`.
  Also access rules, invites and join codes, task validation, scoring, status, and the views for
  each role.
- `lib/pulse/github.ts`: REST reads (commits, stats, tree, blobs, commit statuses), cached by sha.
  Also the autograder workflow, the grader script, and the check that the workflow is unchanged.
- `lib/pulse/review.ts`: AI review (Claude, JSON schema, file:line evidence), with the teacher's
  hints as the fallback.
- `lib/pulse/similarity.ts`: token normalising, winnowing and Jaccard comparison, with starter
  code subtracted.
- `lib/pulse/sync.ts`: one sync per submission, flags, a class-wide similarity refresh, and the
  20-minute scheduler.
- `routes/pulse.routes.ts`: the `/api/pulse` routes in §8. The autograder endpoints are public;
  everything else needs sign-in and goes through the store's access checks.
- Tests: `scripts/pulse.test.ts` (42 unit checks, part of `npm test`) and `scripts/pulse.live.ts`
  (32 HTTP checks on a throwaway store, including a real GitHub read).

**How tests run.** The teacher puts `.github/workflows/pulse-autograde.yml` (downloadable from
Pulse) in the starter repo. On each push, GitHub Actions fetches the task's tests from Pulse,
compiles with `gcc -Wall -Wextra -Werror`, runs each test (5 s limit), and posts the commit statuses
`pulse/build` and `pulse/T1…`. Then it pings Pulse to sync. If a student edits the workflow, Pulse
flags it and marks their results untrusted.

**Frontend** (`frontend/src`)
- Pages under `pages/project-pulse/`:
  - `index` (landing)
  - `demo` (sample data)
  - `join` (invite token or class code)
  - `student` (my tasks, then one task)
  - `teacher/index` (my classes, plus admin teacher appointments and the AI switch)
  - `teacher/class/[classId]` (roster, invites, join code, co-teachers, tasks)
  - `teacher/class/[classId]/new` and `teacher/task/[taskId]/edit` (task editor)
  - `teacher/task/[taskId]` (dashboard)
  - `teacher/task/[taskId]/[studentId]` (student detail)
- Components in `components/pulse/`: TaskDashboard, StudentDetail, StudentProgress, TaskEditor,
  PulseGate, PulseUi, charts.
- The API client is `lib/pulse/api.ts`.
- The only change outside Pulse is one footer link, plus the mount line and scheduler start in
  `server.ts`.

**Not built:** the GitHub App (instant private-repo access without a bot collaborator) and a
server-side sandbox runner. Tests rely on the student's GitHub Actions, which is free for public
repos.

---

## 12. Pulse v2: simpler, no AI (built, 2026-11-03)

> **Built.** What changed in code:
> - `review.ts` was deleted.
> - `store.ts` keeps repos per class (`p.repos`) and the teacher's marks per task
>   (`p.results`). It filters each task by folder (`folderCommits` / `folderFiles` /
>   `folderHint`), migrates v1 data once (`migrateV2`), and has `saveReview` and
>   `duplicateTask`.
> - `sync.ts` has `syncRepo` / `syncClass`.
> - `github.ts` records the files each commit touched, and the grader runs tests per folder.
> - `templates.ts` holds 5 C tasks.
> - New routes: `/student/classes/:id/repo|recheck`, `/tasks/:id/students/:rid/review`,
>   `/tasks/:id/duplicate`, `/templates`, `/teacher/tasks`, `/me/comments`. The AI settings
>   route was removed.
> - Frontend: Review mode (`components/pulse/ReviewMode.tsx`,
>   `teacher/task/[taskId]/review`), a New-task chooser (template, copy or blank), the
>   *Auto-run tests* switch, clickable dashboard grid cells, a "Reviewed" tile, a
>   *Submitted · to review* status, and one-time class repo setup on the student page.
> - Tests: 68 unit and 51 live.

**Owner's direction:** no AI anywhere. The teacher does the analysis by hand, but everything must
be visible and take little effort. Setup must not repeat for every task, for the teacher or the
student.

### 12.1 What is too heavy today
| Who | Today, for **every task** |
|---|---|
| Teacher | write hints, write test cases, make a starter repo, add the workflow file, mark it as a template, share the link |
| Student | make a new repo from the template, link it in Pulse, add `PULSE.txt`, push |

### 12.2 The changes
1. **No AI.** Remove the AI review, the admin switch and the `ANTHROPIC_API_KEY` dependency.
   Requirement verdicts come only from the teacher.
2. **One repo per student per class, not per task.** The student links their GitHub repo **once**
   for the whole class (for example `c-lab-2026`). Each task is a **folder** in that repo, such as
   `task-1/` and `task-2/`, which Pulse names automatically. Pulse reads only that folder for that
   task: its code, commits that touched it, and its changes. Verification (`PULSE.txt`) and the
   autograder file are also done **once**.
3. **The teacher sets up a class repo once.** Pulse shows one ready-made "class template" page with
   the exact two files to copy (the workflow and a README listing task folders), or the teacher
   skips tests entirely (see 4). There is no per-task GitHub work.
4. **Tests become optional for each task.** The *Auto-run tests* toggle is off by default. When
   it's off, nothing on GitHub is needed beyond the repo; the teacher reviews by reading the code.
   Hints are also optional, as a hint "found / not found" signal shown to the teacher, never a
   verdict.
5. **Fast manual review (Review mode).** One screen per student:
   - the code of that task's folder on the left
   - the requirement checklist on the right, with one click per item for ✓ Done / ~ Partly /
     ✗ Missing
   - a score box (filled in automatically from the ticks, editable)
   - a feedback box with **saved comments** (the teacher's own one-click lines, such as "Check
     fopen for NULL")
   - **Save & next →**, with keyboard shortcuts 1/2/3 for verdicts and N for next
   The dashboard shows **Reviewed 18/36**. The grid on the dashboard is also clickable: each cell
   cycles ✓ ~ ✗.
6. **Reuse instead of retyping.**
   - **Duplicate task** (within the class or from another class), so last year's tasks are one
     click away.
   - A small built-in library of **C task templates** (title, description, requirements, optional
     tests) to start from.
7. **The student does setup once (a 3-step wizard).**
   - Join (invite link or code)
   - Paste the repo link (copy buttons for the two files)
   - Push
   After that, a new task appears as "create folder `task-3/` and push". Nothing else to do.
8. **Kept as they are:** commits per day, timeline, code viewer, changes, copy detection (the
   plain token comparison is not AI), bulk / late / backdated flags, CSV export, invites, join
   code, co-teachers, and admin-made teacher logins.

### 12.3 Effort after v2
| | Once per class | Per task |
|---|---|---|
| Teacher | create class, invite students, (only if tests are wanted) set up the class repo once | title, description, deadline, requirements (or duplicate a task), optional tests, then review students with one click each |
| Student | join, link one repo, add `PULSE.txt` | make a folder `task-N/` and push |

### 12.4 Build notes
- Data: `submission` moves from per task to per class (`pulse_class_repos`). Task results are
  computed by filtering files and commits on `task.folder`. The grader runs only the tests of the
  folder that changed.
- Status *Not reviewed* is added for requirements the teacher hasn't marked yet. Score =
  teacher ticks + (optional) tests + activity.
- Existing live data is one test class, so it can be migrated or reset.
