// Module 1 — Git Basics: Snapshots, Commits, History
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Snapshots, Commits, History',
  summary:
    'Working tree, staging area and commits — the three-area mental model that makes every other command obvious.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'git-1-1',
      1,
      'Repository, Staging and Commits',
      'init, status, add, commit — and why Git has a staging area at all.',
      11,
      nineBlocks({
        objectives: [
          'Explain the working tree, staging area and repository as three places',
          'Initialize a repo, stage changes selectively and create clear commits',
          'Read git status and git log and interpret what they tell you',
        ],
        hook: 'Git is not a backup button. It is a snapshot machine: you choose what goes into the next snapshot (staging), then freeze it with a message (commit). Once that model clicks, add/commit/status stop feeling random.',
        concept: `**Three places:**
1. **Working tree** — the files you edit on disk.
2. **Staging area (index)** — the shortlist of changes for the next commit.
3. **Repository (.git)** — permanent history of committed snapshots.

**Daily loop:** edit → git status → git add (stage) → git commit → (optionally) git push later.

**Why staging?** You can commit only the related half of a messy working session. Stage file A, leave file B unstaged, commit a clean unit of work.

**Commit messages:** subject line under ~72 characters, imperative mood ("Add login form", not "Added"). Body explains why when the why is not obvious.

**git status** answers: what changed, what is staged, what is untracked. Learn to read the three sections.

**History:** git log --oneline --graph for a compact view; git show for one commit's diff.`,
        extras: [
          table('Status sections', ['Status says', 'Meaning'], [
            ['Changes not staged', 'Edited but not added yet'],
            ['Changes to be committed', 'Staged for next commit'],
            ['Untracked files', 'Git has never seen them'],
          ]),
          tip(
            'Commit often, push deliberately',
            'Small commits are reviewable; history is free. Pushing is a separate social/sync decision.',
          ),
          warn(
            'Never commit secrets',
            'API keys, .env files and tokens must stay out of history — once pushed, treat them as leaked and rotate.',
          ),
        ],
        worked: {
          title: 'First repository with a real commit',
          problem:
            'Create a project folder, make an initial commit, then add a second feature file as a separate commit.',
          steps: [
            {
              title: 'Step 1 - create and init',
              desc: 'mkdir demo && cd demo && git init.',
            },
            {
              title: 'Step 2 - first file',
              desc: 'Create README.md. git status shows it as untracked.',
            },
            {
              title: 'Step 3 - stage and commit',
              desc: 'git add README.md && git commit -m "Add project README".',
            },
            {
              title: 'Step 4 - second commit',
              desc: 'Create app.py, then git add app.py && git commit -m "Add entry script".',
            },
            {
              title: 'Step 5 - verify history',
              desc: 'git log --oneline shows two commits.',
            },
          ],
          solution: 'Two clean commits with readable messages; status clean between them.',
        },
        practice: {
          title: 'Selective staging',
          prompt: 'Edit two files, stage only one, commit, then inspect git status for the other.',
          hint: 'git add path/to/one.txt — not git add . for this drill.',
        },
        mistakes: [
          {
            mistake: 'git add . blindly every time',
            fix: 'Stages junk, secrets and half-done files. Stage paths you mean to ship.',
          },
          {
            mistake: 'Vague commit messages like "fix" or "update"',
            fix: 'Future you and reviewers need the what/why; use imperative subjects.',
          },
        ],
        exam: {
          question: 'What is the staging area for?',
          answer: 'It selects which working-tree changes go into the next commit.',
          source: 'Most common Git interview opener.',
        },
        summary: [
          'Working tree → staging → commit snapshot.',
          'Stage selectively; commit small with clear messages.',
          'Status and log are your map at all times.',
        ],
      }),
      [
        [
          'The staging area is also called:',
          ['Working tree', 'Index', 'Remote', 'Branch'],
          1,
          'git add writes into the index.',
        ],
        [
          'git commit without -m on a configured Git:',
          ['Fails always', 'Opens an editor for the message', 'Uses "auto"', 'Pushes to GitHub'],
          1,
          'Editor path for the message.',
        ],
        [
          'Untracked files are:',
          ['Deleted', 'Never committed to history yet', 'On the remote', 'Always ignored'],
          1,
          'Git has no snapshot of them.',
        ],
      ]
    ),
    lesson(
      M1,
      'git-1-2',
      2,
      'Inspecting History and Undoing Safely',
      'log, show, diff, restore and reset — travel through history without losing work.',
      11,
      nineBlocks({
        objectives: [
          'Use log, show and diff to understand what changed and when',
          'Discard unstaged edits with restore and unstage with restore --staged',
          'Choose the right reset mode (--soft, --mixed, --hard) and use reflog after mistakes',
        ],
        hook: 'The fear of Git is almost always the fear of losing work. History is append-only; almost everything destructive has a recovery path if you know the command. This lesson buys that confidence.',
        concept: `**Reading history:**
- git log --oneline --graph --decorate
- git show <commit> — full patch of that commit
- git diff — unstaged changes; git diff --staged — staged vs last commit

**Safer undos:**
- git restore file — throw away unstaged edits to that file (working tree only).
- git restore --staged file — unstage; keep edits in the working tree.
- git commit --amend — rewrite the last commit message or fold a tiny fix (never amend a commit you already pushed to a shared branch without coordination).

**reset (moves the branch pointer):**
- --soft HEAD~1 — undo last commit, keep changes staged.
- --mixed HEAD~1 (default) — undo last commit, keep changes in working tree, unstaged.
- --hard HEAD~1 — destroy staged and working-tree changes to match the previous commit. Use only when you are sure; prefer stash or branch first.

**reflog:** "where have I been" for HEAD and branches. If you reset --hard by accident, git reflog often saves you within the default 90 days.`,
        extras: [
          tip(
            'Prefer restore over reset for single files',
            'restore is scoped; reset moves history pointers — different jobs.',
          ),
          warn(
            'Avoid amend/rebase on shared branches',
            'Rewriting published history forces teammates to repair their clones.',
          ),
        ],
        worked: {
          title: 'Undo a bad last commit without losing files',
          problem: 'You committed too early and want the changes back as unstaged work.',
          steps: [
            {
              title: 'Step 1 - confirm the bad commit',
              desc: 'git log --oneline to confirm the bad commit is HEAD.',
            },
            {
              title: 'Step 2 - mixed reset',
              desc: 'git reset --mixed HEAD~1.',
            },
            {
              title: 'Step 3 - verify',
              desc: 'git status: previous commit content is now unstaged edits.',
            },
            {
              title: 'Step 4 - recommit cleanly',
              desc: 'Fix the work; git add; git commit with a better message.',
            },
          ],
          solution: 'History rewound one step; files preserved in the working tree.',
        },
        practice: {
          title: 'Diff drill',
          prompt: 'Make a change, stage half of a file if possible (or stage whole), and produce both unstaged and staged diffs.',
          hint: 'git diff then git diff --staged.',
        },
        mistakes: [
          {
            mistake: 'reset --hard when you meant --soft/--mixed',
            fix: '--hard discards work; check reflog immediately if it was a mistake.',
          },
          {
            mistake: 'Amending a pushed commit casually',
            fix: 'Needs force-push and team coordination; amend only local commits.',
          },
        ],
        exam: {
          question: 'Difference between git restore and git reset --hard for one file?',
          answer:
            'restore checks out from the index/HEAD for that path only; reset --hard overwrites the whole tree to HEAD.',
          source: 'Undo-and-recovery screening question.',
        },
        summary: [
          'log/show/diff are read-only; use them before any undo.',
          'restore = files; reset = branch pointer + optional file overwrite.',
          'reflog is the safety net after destructive resets.',
        ],
      }),
      [
        [
          'git restore --staged file does:',
          ['Delete the file', 'Unstage but keep working-tree edits', 'Commit it', 'Push it'],
          1,
          'Index only.',
        ],
        [
          'git reset --soft HEAD~1 keeps changes:',
          ['Deleted', 'Staged', 'Untracked only', 'On the remote'],
          1,
          'Commit undone; index preserved.',
        ],
        [
          'reflog is used to:',
          ['Find where HEAD has been', 'Configure remotes', 'Ignore files', 'Sign commits'],
          0,
          'Recovery after resets and bad moves.',
        ],
      ]
    ),
  ],
};
