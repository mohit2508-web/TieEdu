// Module 4 — Advanced Patterns: Stash, Tags, Hooks & Recovery
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Stash, Tags, Hooks & Recovery',
  summary:
    'stash, cherry-pick, bisect, worktrees, hooks and reflog recovery — the toolkit that separates "uses Git" from "owns Git".',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'git-4-1',
      1,
      'Stash, Cherry-pick, Bisect, Worktree',
      'Park work, move single commits, binary-search history, and run two branches without switching chaos.',
      12,
      nineBlocks({
        objectives: [
          'Use stash to park dirty work and restore it safely',
          'Cherry-pick a single good commit onto another branch',
          'Binary-search a regression with bisect; parallelize with worktree',
        ],
        hook: 'Production is on fire on Friday. You need one commit from last month, not the whole feature branch. Stash, cherry-pick and bisect are the emergency tools — and they show up in senior interviews.',
        concept: `**stash:** git stash push -m "wip" saves tracked changes and reverts the tree; git stash list / pop / apply restores. Prefer push -m over bare stash. Untracked files need -u.

**cherry-pick:** git cherry-pick <sha> applies one commit's diff as a new commit on HEAD (new hash). Good for hotfixing a release branch.

**bisect:** git bisect start; git bisect bad HEAD; git bisect good v1.0; checkout middle commits; Git halves the search. Automate with git bisect run ./test.sh.

**worktree:** git worktree add ../fix-branch hotfix — second directory, same repo, different branch. No more stashing mid-review to jump branches.

**range-diff / log -S:** find when a string appeared: git log -S "functionName" --oneline.`,
        extras: [
          table('Pick the tool', ['Need', 'Tool'], [
            ['Park WIP for an hour', 'stash'],
            ['Move one commit', 'cherry-pick'],
            ['Which commit broke it?', 'bisect'],
            ['Two checkouts at once', 'worktree'],
          ]),
          tip(
            'stash is not a backup',
            'Fogotten stashes rot; pop promptly or commit a WIP branch instead.',
          ),
        ],
        worked: {
          title: 'Emergency cherry-pick onto release',
          problem: 'A critical fix landed on main; release-1.x needs only that commit.',
          steps: [
            {
              title: 'Step 1 - switch release',
              desc: 'git switch release-1.x.',
            },
            {
              title: 'Step 2 - find the fix',
              desc: 'git log main --oneline -n 20; note the fix SHA.',
            },
            {
              title: 'Step 3 - cherry-pick',
              desc: 'git cherry-pick <sha>.',
            },
            {
              title: 'Step 4 - resolve if needed',
              desc: 'Resolve conflicts if any; git cherry-pick --continue.',
            },
            {
              title: 'Step 5 - ship patch',
              desc: 'Push release-1.x; tag patch release.',
            },
          ],
          solution: 'One commit ported; history on release stays minimal.',
        },
        practice: {
          title: 'stash round-trip',
          prompt: 'Edit a file; stash with a message; confirm clean status; pop; confirm edits return.',
          hint: 'git stash push -m "msg" then git stash pop.',
        },
        mistakes: [
          {
            mistake: 'Cherry-picking a merge commit by accident',
            fix: 'Pick the real fix commits; use -m if you truly mean a merge parent.',
          },
          {
            mistake: 'Ignoring stash conflicts on pop',
            fix: 'Read conflicts; git stash drop only after you are done with the entry.',
          },
        ],
        exam: {
          question: 'When would you use git bisect?',
          answer: 'To binary-search history for the commit that introduced a regression.',
          source: 'Debugging interview favorite.',
        },
        summary: [
          'stash parks WIP; cherry-pick moves single commits; bisect finds culprits.',
          'worktree gives a second checkout of the same repository.',
          'All three beat "copy the folder into a new folder".',
        ],
      }),
      [
        [
          'git stash is best for:',
          ['Permanent backup', 'Temporarily parking tracked WIP', 'Cloning', 'Tagging releases'],
          1,
          'Temporary index+worktree save.',
        ],
        [
          'bisect uses:',
          ['Linear binary search over history', 'Random commits only', 'Remote branches only', 'Hooks'],
          0,
          'Halves the range each step.',
        ],
        [
          'worktree allows:',
          ['Two working directories for one repo', 'Double disk clones only', 'Nothing new', 'CI only'],
          0,
          'Same .git, multiple checkouts.',
        ],
      ]
    ),
    lesson(
      M4,
      'git-4-2',
      2,
      'Hooks, .gitignore & Disaster Recovery',
      'Client hooks that block bad commits, ignore rules that keep secrets out, and reflog playbooks when everything seemed lost.',
      12,
      nineBlocks({
        objectives: [
          'Configure pre-commit and commit-msg hooks for quality gates',
          'Write a correct .gitignore (and avoid ignoring files that should be tracked)',
          'Recover from reset --hard, bad merges and orphaned commits with reflog',
        ],
        hook: 'Hooks are the seatbelt that stops a secret or a red test from entering history. Recovery is the knowledge that even after panic-clicks, Git usually still has your bytes — for a while.',
        concept: `**Hooks:** scripts in .git/hooks (or configured via core.hooksPath). Common:
- pre-commit — lint/tests; non-zero exit blocks the commit.
- commit-msg — validate message format (conventional commits).
- pre-push — last gate before remote.
Hooks are local by default; teams share them via a tracked hooks/ dir or a tool (Husky, pre-commit framework).

**.gitignore:** patterns for build output, IDE files, .env. Tracked files are not ignored until untracked — git rm --cached path. Never rely on ignore for secrets you already committed; rotate keys.

**.gitattributes:** force LF, mark binary files, export-ignore.

**Recovery playbook:**
1. Stop committing.
2. git reflog — find the last good SHA.
3. git switch -c rescue <sha> or git reset --hard <sha> once sure.
4. For pushed mistakes: revert commits on public branches instead of rewriting history.
5. fsck / dangling objects if reflog was expired — last resort.`,
        extras: [
          table('Recovery scenario', ['First move'], [
            ['reset --hard too far', 'reflog → reset --hard <good-sha>'],
            ['Bad merge pushed', 'git revert -m 1 <merge-sha>'],
            ['Commit missing after rebase', 'reflog or ORIG_HEAD'],
            [
              'Secret committed',
              'Rotate credential; rewrite only if policy requires + force-push coordination',
            ],
          ]),
          tip(
            'Shared hooks',
            'Track hooks under scripts/git-hooks and set core.hooksPath so CI and laptops agree.',
          ),
          warn(
            'reflog is not infinite insurance',
            'Expired entries and gc can delete unreachable objects; commit or branch promptly.',
          ),
        ],
        worked: {
          title: 'Blocked bad commit with hooks',
          problem: 'Team wants no commits with "wip" in the subject and failing lint blocked.',
          steps: [
            {
              title: 'Step 1 - commit-msg hook',
              desc: 'Create .git/hooks/commit-msg that greps for ^wip.',
            },
            {
              title: 'Step 2 - make executable',
              desc: 'chmod +x on Unix; or use hooksPath to a tracked script.',
            },
            {
              title: 'Step 3 - test the gate',
              desc: 'Attempt a bad message; hook exits non-zero; commit aborted.',
            },
            {
              title: 'Step 4 - good commit',
              desc: 'Fix message; commit succeeds.',
            },
          ],
          solution: 'Local quality gate without a full CI cycle.',
        },
        practice: {
          title: 'reflog rescue drill',
          prompt:
            'On a scratch repo: make a commit, reset --hard HEAD~1, then recover the commit via reflog.',
          hint: 'git reflog; note SHA; git reset --hard <sha> or branch from it.',
        },
        mistakes: [
          {
            mistake: 'Putting .env in .gitignore after it is already tracked',
            fix: 'git rm --cached .env, commit, then ignore; rotate the secret.',
          },
          {
            mistake: 'Rewriting public history to "clean" a secret',
            fix: 'Rotate first; rewriting is optional and coordinated; old clones still leak.',
          },
        ],
        exam: {
          question: 'You accidentally reset --hard and lost an unpushed commit. What is the first command?',
          answer: 'git reflog — locate the previous HEAD SHA, then reset or branch from it.',
          source: 'Classic recovery question.',
        },
        summary: [
          'Hooks enforce standards before commit/push.',
          'Ignore and attributes keep trees clean; never ignore away already-leaked secrets.',
          'reflog is the first recovery tool; public mistakes get revert, not silent rewrite.',
        ],
      }),
      [
        [
          'pre-commit hook non-zero exit:',
          ['Pushes anyway', 'Aborts the commit', 'Deletes the branch', 'Runs CI only'],
          1,
          'Blocks the commit.',
        ],
        [
          'After git reset --hard lost an unpushed commit, check:',
          ['git stash list', 'git reflog', 'git remote -v', 'git tag'],
          1,
          'HEAD history is in the reflog.',
        ],
        [
          'To stop tracking a committed .env going forward:',
          ['Only edit .gitignore', 'git rm --cached .env then ignore + rotate', 'Delete the repo', 'git pull'],
          1,
          'Tracked files are not auto-ignored.',
        ],
      ]
    ),
  ],
};
