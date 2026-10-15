// Module 3 — Remotes, Collaboration & GitHub
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Remotes, Collaboration & GitHub',
  summary:
    'origin vs upstream, clone/fork/pull/push, fetch vs pull, and a checklist that prevents "it works on my machine".',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'git-3-1',
      1,
      'Remotes: clone, fork, fetch, pull, push',
      'How origin and upstream map onto GitHub; what pull really runs; keeping branches in sync.',
      11,
      nineBlocks({
        objectives: [
          'Explain origin, upstream and the fork workflow',
          'Use clone, remote -v, fetch, pull and push correctly',
          'Distinguish fetch (safe) from pull (fetch + merge/rebase)',
        ],
        hook: 'Interviews love asking: "What is the difference between git pull and git fetch?" If you can only say "one is safe", you are halfway there. This lesson finishes the map.',
        concept: `**clone** — full local copy of a remote repo including history and a default remote named origin.

**remote -v** — lists URLs; origin is the default name for "your" remote. In a fork workflow, origin may be your fork and upstream the official repo.

**fetch** — downloads new commits/refs; does NOT change your working tree or current branch. Safe anytime.

**pull** — fetch + integrate (merge by default, or rebase with --rebase). It can create a merge commit or conflicts in your working tree.

**push** — uploads commits to a remote branch. Fails if remote is ahead (non-fast-forward); pull first, or force-push only on personal branches you own.

**Fork flow:** fork on GitHub → clone your fork → add upstream → push to origin → PR from your fork to upstream.

**Tags:** git push origin v1.0.0 ships release markers.`,
        extras: [
          table('Command map', ['Command', 'Touches history?', 'Changes working tree?'], [
            ['git fetch', 'Remote refs only', 'No'],
            ['git pull', 'Local branch after integrate', 'Yes (may conflict)'],
            ['git push', 'Remote branch', 'No'],
            ['git clone', 'Creates local repo', 'Yes (checkout)'],
          ]),
          tip(
            'pull --rebase on linear personal branches',
            'Keeps history clean; leave merge commits to team policy.',
          ),
          warn(
            'git pull on a dirty tree',
            'Uncommitted edits can block or mix into the merge — commit or stash first.',
          ),
        ],
        worked: {
          title: 'Fork + upstream workflow',
          problem: 'Contribute to a project you do not have write access to.',
          steps: [
            {
              title: 'Step 1 - fork',
              desc: 'Fork on GitHub.',
            },
            {
              title: 'Step 2 - clone your fork',
              desc: 'git clone git@github.com:you/repo.git',
            },
            {
              title: 'Step 3 - add upstream',
              desc: 'git remote add upstream git@github.com:org/repo.git',
            },
            {
              title: 'Step 4 - push a feature',
              desc: 'git switch -c feat/patch; edit; commit; git push -u origin feat/patch.',
            },
            {
              title: 'Step 5 - PR',
              desc: 'Open PR from you:feat/patch to org:main.',
            },
            {
              title: 'Step 6 - stay current',
              desc: 'Later: git fetch upstream && git switch main && git merge upstream/main.',
            },
          ],
          solution: 'PR opened from your fork; local main can be refreshed from upstream.',
        },
        practice: {
          title: 'fetch then compare',
          prompt:
            'Run git fetch; then git log HEAD..origin/main --oneline to see what you do not have yet.',
          hint: 'fetch first so origin/main is current.',
        },
        mistakes: [
          {
            mistake: 'Force-pushing main to "sync"',
            fix: 'Destructive for everyone; pull/rebase your feature, never rewrite shared main.',
          },
          {
            mistake: 'Confusing origin with upstream forever',
            fix: 'remote -v; name them deliberately in fork workflows.',
          },
        ],
        exam: {
          question: 'fetch vs pull?',
          answer: 'fetch downloads refs only; pull fetches then integrates into your current branch.',
          source: 'Most repeated Git collaboration question.',
        },
        summary: [
          'origin = default remote; upstream = optional official in fork flow.',
          'fetch is safe; pull integrates and can conflict.',
          'push updates remote branches; non-fast-forward needs pull or coordinated force.',
        ],
      }),
      [
        [
          'git fetch changes your working tree:',
          ['Always', 'Never', 'Only with --force', 'On main only'],
          1,
          'Updates remote-tracking refs only.',
        ],
        [
          'In a fork workflow, upstream usually points to:',
          ['Your fork', 'The official repo', 'A tag', 'CI'],
          1,
          'Official project repository.',
        ],
        [
          'git remote -v shows:',
          ['File diffs', 'Remote URLs', 'Branch list only', 'Commit messages'],
          1,
          'Fetch/push URLs per remote name.',
        ],
      ]
    ),
    lesson(
      M3,
      'git-3-2',
      2,
      'Issues, Releases & Collaboration Hygiene',
      'Issue templates, README hygiene, CODEOWNERS, release notes and keeping a public repo trustworthy.',
      10,
      nineBlocks({
        objectives: [
          'Structure issues and PRs so strangers can contribute',
          'Maintain README, LICENSE and changelog as living project surfaces',
          'Use tags and GitHub Releases to ship versioned software',
        ],
        hook: 'A repo without a README is a locked drawer with no label. Most open-source maintainers reject PRs that ignore issue templates — not out of meanness, but because unclear work costs them hours.',
        concept: `**Issue hygiene:** bug template (steps, expected, actual, environment); feature template (problem, proposal, alternatives). Label with area + kind. Link PRs with "Fixes #12".

**README:** what it is, who it is for, install in three commands, minimal usage example, link to docs/contributing. Update in the same PR that changes behavior.

**LICENSE:** without one, default copyright applies — people cannot legally reuse. Pick intentionally (MIT, Apache-2.0, GPL...).

**Releases:** tag vX.Y.Z (semver: breaking/feature/fix), GitHub Release notes from the tag, attach artifacts if needed.

**CODEOWNERS:** auto-request reviewers for paths. CONTRIBUTING.md: how to run tests and the PR bar.

**Security:** never commit secrets; SECURITY.md for private vulnerability reports; rotate if leaked.`,
        extras: [
          table('Semver signal', ['Bump', 'When'], [
            ['Major X', 'Breaking API/behavior'],
            ['Minor X.Y', 'Backward-compatible features'],
            ['Patch X.Y.Z', 'Backward-compatible fixes'],
          ]),
          tip(
            'Link work to issues',
            '"Fixes #12" auto-closes on merge — audit trail without ceremony.',
          ),
        ],
        worked: {
          title: 'Cut a clean v1.0.0',
          problem: 'Ship first public release from main.',
          steps: [
            {
              title: 'Step 1 - stabilize main',
              desc: 'Ensure main is green; update README and CHANGELOG.',
            },
            {
              title: 'Step 2 - annotated tag',
              desc: 'git tag -a v1.0.0 -m "First stable API".',
            },
            {
              title: 'Step 3 - push tag',
              desc: 'git push origin v1.0.0.',
            },
            {
              title: 'Step 4 - GitHub Release',
              desc: 'GitHub → Releases → draft from tag; paste notes; publish.',
            },
          ],
          solution: 'Immutable tag + human-readable release notes.',
        },
        practice: {
          title: 'Bug report draft',
          prompt:
            'Write a 5-line bug issue: title, steps, expected, actual, environment — as if for a stranger.',
          hint: 'No "it broke" without steps to reproduce.',
        },
        mistakes: [
          {
            mistake: 'Release notes that only say "misc fixes"',
            fix: 'List user-visible changes and breaking notes; links to issues.',
          },
          {
            mistake: 'No LICENSE on a "public" repo',
            fix: 'Legal ambiguity blocks adoption; choose one.',
          },
        ],
        exam: {
          question: 'What does "Fixes #42" in a PR description do on GitHub?',
          answer: 'On merge it closes issue #42 automatically.',
          source: 'Collaboration tooling question.',
        },
        summary: [
          'Issues and PRs need templates and labels for outsiders.',
          'README/LICENSE/CHANGELOG are part of the product.',
          'Tag + Release notes for every version people depend on.',
        ],
      }),
      [
        [
          'Without a LICENSE file, public code is:',
          ['Freely reusable commercially', 'Default all-rights-reserved', 'Public domain', 'MIT'],
          1,
          'No license means no permission grant.',
        ],
        [
          'Semver minor bump means:',
          ['Breaking change', 'Backward-compatible feature', 'Docs only', 'Hotfix only'],
          1,
          'X.Y+1 features.',
        ],
        [
          'Best first line of a bug report:',
          ['"Please fix"', 'Title + one-sentence symptom', 'Your resume', 'A rant'],
          1,
          'Scannable symptom.',
        ],
      ]
    ),
  ],
};
