// Module 2 — Branching & Merging
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Branching & Merging',
  summary:
    'Branches as cheap pointers, merge vs rebase, conflict resolution and a workflow that survives team code review.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'git-2-1',
      1,
      'Branches, Merge and Rebase',
      'Create, switch and merge branches; understand fast-forward, true merge commits and rebase.',
      12,
      nineBlocks({
        objectives: [
          'Create and switch branches; explain what a branch pointer actually is',
          'Perform a fast-forward vs three-way merge and read the result',
          'Rebase a feature branch onto main and state when rebase is unsafe',
        ],
        hook: 'A branch in Git is a 41-byte pointer, not a copy of the repo. That is why branching is instant and why "merge" is just pointer arithmetic plus a possible merge commit. Interviews ask this constantly.',
        concept: `**Branch = movable pointer** to a commit. HEAD names the current branch. git switch -c feature makes a new pointer at HEAD and moves HEAD there.

**Fast-forward merge:** if main has not diverged, the branch pointer simply moves forward — no merge commit.

**Three-way merge:** when both sides advanced, Git finds a common ancestor and creates a merge commit with two parents. Conflicts appear when the same lines changed on both sides.

**Rebase:** replays your commits on top of another base as new commits (new hashes). History looks linear. Golden rule: do not rebase commits that are already public on a shared branch.

**merge vs rebase:** merge preserves true history including the branch shape; rebase gives linear history for local cleanup. Team policy wins — follow the repo.`,
        extras: [
          table('Merge outcomes', ['Situation', 'Result'], [
            ['Other side unchanged', 'Fast-forward'],
            ['Both sides changed same lines', 'Conflict — you resolve'],
            ['Both sides changed different lines', 'Clean three-way merge'],
            ['Unrelated histories', 'Refuse unless forced'],
          ]),
          tip(
            'switch vs checkout',
            'git switch is for branches; git restore is for files. Newer Git prefers this split.',
          ),
          warn(
            'Do not rebase pushed work without team agreement',
            'It rewrites hashes and will require force-push, breaking others.',
          ),
        ],
        worked: {
          title: 'Feature branch then merge',
          problem: 'Add a feature on a branch; merge into main after review.',
          steps: [
            {
              title: 'Step 1 - branch',
              desc: 'git switch main && git switch -c feature/login.',
            },
            {
              title: 'Step 2 - commit on feature',
              desc: 'Edit, add, commit on feature/login.',
            },
            {
              title: 'Step 3 - merge',
              desc: 'git switch main; git merge feature/login (fast-forward if main idle).',
            },
            {
              title: 'Step 4 - inspect',
              desc: 'git log --oneline --graph shows the line of work.',
            },
            {
              title: 'Step 5 - cleanup',
              desc: 'Optionally git branch -d feature/login after merge.',
            },
          ],
          solution: 'Feature integrated; branch pointer deleted locally.',
        },
        practice: {
          title: 'Force a three-way merge',
          prompt:
            'Diverge main and a feature by editing different parts of the same file; merge cleanly; then edit the same line and merge with a conflict.',
          hint: 'Commit on both sides before merging.',
        },
        mistakes: [
          {
            mistake: 'Committing on main when a feature branch was intended',
            fix: 'Check git branch and HEAD before the first edit.',
          },
          {
            mistake: 'Resolving conflicts by taking "all theirs" blindly',
            fix: 'Open the conflict markers; keep both intents correctly.',
          },
        ],
        exam: {
          question: 'When is a merge a fast-forward?',
          answer:
            'When the target branch has no commits the source lacks — only the pointer needs to move.',
          source: 'Standard branching interview question.',
        },
        summary: [
          'Branches are cheap pointers; HEAD is "you are here".',
          'Fast-forward when possible; merge commit when histories diverge.',
          'Rebase for local linearization; never rewrite published history casually.',
        ],
      }),
      [
        [
          'A Git branch is mainly:',
          ['A full copy of files', 'A pointer to a commit', 'A remote server', 'A tag only'],
          1,
          'Movable ref to a commit.',
        ],
        [
          'Rebase rewrites:',
          ['Only remote config', 'Commit identities (new hashes)', 'File contents only', 'Nothing'],
          1,
          'Commits are recreated on a new base.',
        ],
        [
          'A conflict occurs when:',
          ['Branches exist', 'Same lines changed on both sides', 'You push', 'You tag'],
          1,
          'Git cannot auto-merge those hunks.',
        ],
      ]
    ),
    lesson(
      M2,
      'git-2-2',
      2,
      'Team Workflow: PR, Review and Hotfix',
      'GitHub flow, pull requests, code review etiquette and releasing a fix without chaos.',
      11,
      nineBlocks({
        objectives: [
          'Describe a GitHub-flow branch/PR/main cycle for a small team',
          'Push a branch, open a PR and respond to review comments productively',
          'Ship a hotfix and keep main releasable',
        ],
        hook: 'The PR is where careers are made or delayed. Clean commits, a useful description and small diffs get you merged; mystery force-pushes get you ignored.',
        concept: `**GitHub flow (small teams):**
1. main always releasable.
2. Branch from main for each change.
3. Commit in small reviewable units; push to the fork or origin branch.
4. Open a PR: what, why, how to test, screenshots if UI.
5. Review; address comments with new commits (not silent force-pushes unless agreed).
6. Merge (squash, merge commit, or rebase — team policy).
7. Delete the merged branch.

**Push:** git push origin feature/login — updates the remote branch. First push: -u to set upstream.

**Review etiquette:** keep diffs small; separate mechanical reformat from logic changes; reply to every comment (done / question / push-back with reason).

**Hotfix:** branch from the released main (or a release tag), minimal fix, PR, deploy, cherry-pick or merge back to develop if you use one.

**Tags:** lightweight markers for releases: git tag -a v1.0.0 -m "First release"; git push origin v1.0.0.`,
        extras: [
          tip(
            'PR description template',
            'Problem, solution, risk, test plan — four short sections beat a one-liner.',
          ),
          warn(
            'Force-pushing a shared branch mid-review',
            'Rewrites what reviewers already read; coordinate or avoid.',
          ),
        ],
        worked: {
          title: 'Open a clean PR',
          problem: 'Ship a bugfix through a PR with useful review context.',
          steps: [
            {
              title: 'Step 1 - branch from main',
              desc: 'git switch main && git pull && git switch -c fix/cart-total.',
            },
            {
              title: 'Step 2 - fix and commit',
              desc: 'Make the fix; run tests locally; commit "Fix cart total ignoring discount".',
            },
            {
              title: 'Step 3 - push',
              desc: 'git push -u origin fix/cart-total.',
            },
            {
              title: 'Step 4 - open PR',
              desc: 'Open PR into main: problem, root cause, fix, how tested.',
            },
            {
              title: 'Step 5 - land it',
              desc: 'Address review with follow-up commits; merge with team policy.',
            },
          ],
          solution: 'Merged fix with traceable discussion and tests noted.',
        },
        practice: {
          title: 'Upstream tracking',
          prompt: 'Explain what -u origin branch does and what plain git push does afterwards.',
          hint: 'Sets upstream; later pushes know the default remote/branch.',
        },
        mistakes: [
          {
            mistake: 'One giant PR mixing refactor + feature',
            fix: 'Split; reviewers cannot safely approve what they cannot finish reading.',
          },
          {
            mistake: 'Force-push after review without comment',
            fix: 'Reviewers lose line comments; prefer new commits or say why history was rewritten.',
          },
        ],
        exam: {
          question: 'What does git push -u origin feature do?',
          answer: 'Pushes the branch and sets origin/feature as its upstream for future pushes.',
          source: 'Every take-home Git quiz.',
        },
        summary: [
          'Branch → commit → push → PR → review → merge.',
          'Small diffs and honest PR descriptions get faster merges.',
          'main stays releasable; hotfixes are minimal branches.',
        ],
      }),
      [
        [
          'Purpose of a pull request:',
          [
            'Deploy automatically only',
            'Propose, discuss and review changes before merging',
            'Create tags',
            'Ignore CI',
          ],
          1,
          'Collaboration gate.',
        ],
        [
          'Best PR size is:',
          ['As large as possible', 'Small and reviewable', 'Always one file only', 'Undefined'],
          1,
          'Reviewability beats heroism.',
        ],
        [
          'git tag -a v1.0 is used to:',
          ['Delete main', 'Mark a release point with metadata', 'Branch', 'Ignore files'],
          1,
          'Annotated release marker.',
        ],
      ]
    ),
  ],
};
