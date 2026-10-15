// Git & GitHub — course assembly.
// Phase 4 free Bucket C tool course (flagship-12 follow-on).
import type { Course, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { COURSE_ID } from './helpers';

const examBank: ExamQuestion[] = [
  {
    id: 'git-ex-1',
    prompt: 'The staging area in Git is also known as:',
    options: ['Working tree', 'Index', 'Remote', 'Tag store'],
    correct_index: 1,
    explanation: 'git add writes paths into the index.',
    difficulty: 'easy',
    topic: 'Basics',
  },
  {
    id: 'git-ex-2',
    prompt: 'git restore --staged file:',
    options: [
      'Deletes the file',
      'Unstages the file but keeps working-tree edits',
      'Pushes to origin',
      'Creates a branch',
    ],
    correct_index: 1,
    explanation: 'Index only; edits remain on disk.',
    difficulty: 'easy',
    topic: 'Basics',
  },
  {
    id: 'git-ex-3',
    prompt: 'git reset --soft HEAD~1:',
    options: [
      'Deletes the last commit and discards changes',
      'Undoes the last commit but keeps changes staged',
      'Only moves HEAD documentation',
      'Force-pushes main',
    ],
    correct_index: 1,
    explanation: 'soft keeps the index as it was before the commit.',
    difficulty: 'medium',
    topic: 'Basics',
  },
  {
    id: 'git-ex-4',
    prompt: 'A branch in Git is primarily:',
    options: ['A full file copy', 'A movable pointer to a commit', 'A remote server', 'A merge conflict'],
    correct_index: 1,
    explanation: 'Branches are cheap refs to commits.',
    difficulty: 'easy',
    topic: 'Branching',
  },
  {
    id: 'git-ex-5',
    prompt: 'When is a merge a fast-forward?',
    options: [
      'When both sides always conflict',
      'When the target has no commits the source lacks',
      'Only on main',
      'When you use --no-ff',
    ],
    correct_index: 1,
    explanation: 'Only the pointer needs to advance.',
    difficulty: 'medium',
    topic: 'Branching',
  },
  {
    id: 'git-ex-6',
    prompt: 'Rebase changes commit hashes because:',
    options: [
      'It only changes remotes',
      'Commits are recreated on a new base',
      'Hashes are random each run',
      'It rewrites only tags',
    ],
    correct_index: 1,
    explanation: 'New parent + new metadata => new SHAs.',
    difficulty: 'medium',
    topic: 'Branching',
  },
  {
    id: 'git-ex-7',
    prompt: 'git push -u origin feature:',
    options: [
      'Deletes origin',
      'Pushes and sets upstream tracking for future pushes',
      'Only fetches',
      'Creates a release',
    ],
    correct_index: 1,
    explanation: '-u sets upstream branch configuration.',
    difficulty: 'easy',
    topic: 'Remotes',
  },
  {
    id: 'git-ex-8',
    prompt: 'git fetch updates:',
    options: ['Your working tree always', 'Remote-tracking refs only', 'Only tags', 'CI runners'],
    correct_index: 1,
    explanation: 'No automatic integrate into your branch.',
    difficulty: 'easy',
    topic: 'Remotes',
  },
  {
    id: 'git-ex-9',
    prompt: 'git pull is equivalent to:',
    options: [
      'fetch + integrate into current branch',
      'push + merge',
      'clone + status',
      'stash + pop',
    ],
    correct_index: 0,
    explanation: 'fetch then merge or rebase.',
    difficulty: 'easy',
    topic: 'Remotes',
  },
  {
    id: 'git-ex-10',
    prompt: 'In a fork workflow, upstream usually points to:',
    options: ['Your fork', 'The official repository', 'A tag', 'GitHub Actions'],
    correct_index: 1,
    explanation: 'origin is your fork; upstream is official.',
    difficulty: 'medium',
    topic: 'Remotes',
  },
  {
    id: 'git-ex-11',
    prompt: 'A public repo with no LICENSE file means:',
    options: [
      'MIT by default',
      'Default copyright — no permission to reuse',
      'Public domain',
      'Apache-2.0',
    ],
    correct_index: 1,
    explanation: 'No license grant is not a free-for-all.',
    difficulty: 'easy',
    topic: 'Collaboration',
  },
  {
    id: 'git-ex-12',
    prompt: '"Fixes #12" in a merged PR on GitHub typically:',
    options: [
      'Deletes the branch only',
      'Closes issue #12 automatically',
      'Creates a release',
      'Blocks merge',
    ],
    correct_index: 1,
    explanation: 'Keyword linking closes the issue.',
    difficulty: 'easy',
    topic: 'Collaboration',
  },
  {
    id: 'git-ex-13',
    prompt: 'Semver patch bump signals:',
    options: [
      'Breaking change',
      'Backward-compatible fix',
      'New major API',
      'Docs-only branch delete',
    ],
    correct_index: 1,
    explanation: 'X.Y.Z+1 for fixes.',
    difficulty: 'easy',
    topic: 'Collaboration',
  },
  {
    id: 'git-ex-14',
    prompt: 'git stash is best used to:',
    options: [
      'Permanently back up the repo',
      'Temporarily park tracked WIP',
      'Tag a release',
      'Configure remotes',
    ],
    correct_index: 1,
    explanation: 'Temporary save of index/worktree state.',
    difficulty: 'easy',
    topic: 'Advanced',
  },
  {
    id: 'git-ex-15',
    prompt: 'git bisect helps you:',
    options: ['Split a repo', 'Binary-search history for a bad commit', 'Merge faster', 'Ignore files'],
    correct_index: 1,
    explanation: 'Halves the range each step.',
    difficulty: 'medium',
    topic: 'Advanced',
  },
  {
    id: 'git-ex-16',
    prompt: 'git worktree add:',
    options: [
      'Clones a second full remote',
      'Adds another working directory for the same repository',
      'Deletes branches',
      'Runs hooks',
    ],
    correct_index: 1,
    explanation: 'Shared .git database, multiple checkouts.',
    difficulty: 'medium',
    topic: 'Advanced',
  },
  {
    id: 'git-ex-17',
    prompt: 'A failing pre-commit hook will:',
    options: [
      'Force-push',
      'Abort the commit when it exits non-zero',
      'Delete untracked files',
      'Open a PR',
    ],
    correct_index: 1,
    explanation: 'Local gate before the object is written.',
    difficulty: 'medium',
    topic: 'Recovery',
  },
  {
    id: 'git-ex-18',
    prompt: 'After git reset --hard lost an unpushed commit, first try:',
    options: ['git stash', 'git reflog', 'git remote prune', 'git gc'],
    correct_index: 1,
    explanation: 'HEAD movement is recorded in the reflog.',
    difficulty: 'medium',
    topic: 'Recovery',
  },
  {
    id: 'git-ex-19',
    prompt: 'A file is already tracked and you add it to .gitignore. What still happens?',
    options: [
      'Git stops tracking it immediately',
      'Git keeps tracking it until you untrack it (e.g. rm --cached)',
      'History is rewritten',
      'It becomes a submodule',
    ],
    correct_index: 1,
    explanation: 'Ignore applies to untracked paths by default.',
    difficulty: 'medium',
    topic: 'Recovery',
  },
  {
    id: 'git-ex-20',
    prompt: 'Best practice when a secret is committed:',
    options: [
      'Only add .gitignore',
      'Rotate the secret; rewrite history only if policy requires and team agrees',
      'Delete the clone',
      'Force-push main silently',
    ],
    correct_index: 1,
    explanation: 'Rotation first; history rewrite is coordinated and optional.',
    difficulty: 'hard',
    topic: 'Recovery',
  },
  {
    id: 'git-ex-21',
    prompt: 'git cherry-pick is used to:',
    options: [
      'Delete remote branches',
      'Apply a specific commit onto the current branch',
      'Merge two remotes only',
      'Create annotated tags',
    ],
    correct_index: 1,
    explanation: 'Single-commit port with a new SHA.',
    difficulty: 'medium',
    topic: 'Advanced',
  },
  {
    id: 'git-ex-22',
    prompt: 'What does --no-ff on a merge do?',
    options: [
      'Always deletes the branch',
      'Creates a merge commit even if a fast-forward was possible',
      'Disables tests',
      'Blocks conflicts',
    ],
    correct_index: 1,
    explanation: 'Preserves explicit branch topology.',
    difficulty: 'medium',
    topic: 'Branching',
  },
  {
    id: 'git-ex-23',
    prompt: 'Conflicts appear during merge when:',
    options: [
      'You have untracked files only',
      'The same lines were changed on both sides with no auto resolution',
      'You use git status',
      'The repo is empty',
    ],
    correct_index: 1,
    explanation: 'Git needs a human decision for those hunks.',
    difficulty: 'easy',
    topic: 'Branching',
  },
  {
    id: 'git-ex-24',
    prompt: 'git log -S "text" is useful to:',
    options: [
      'Search when a string was added or removed',
      'Set a tag message',
      'Stage files',
      'Fetch all remotes',
    ],
    correct_index: 0,
    explanation: 'Pickaxe search across history.',
    difficulty: 'hard',
    topic: 'Basics',
  },
  {
    id: 'git-ex-25',
    prompt: 'core.hooksPath is used to:',
    options: [
      'Point Git at a shared hooks directory',
      'Change the default branch only',
      'Ignore large files',
      'Set push URL',
    ],
    correct_index: 0,
    explanation: 'Teams track hooks in-repo and point core.hooksPath at them.',
    difficulty: 'hard',
    topic: 'Recovery',
  },
  {
    id: 'git-ex-26',
    prompt: 'To see commits on origin/main you do not have locally after a fetch:',
    options: [
      'git log HEAD..origin/main --oneline',
      'git status',
      'git remote show',
      'git stash list',
    ],
    correct_index: 0,
    explanation: 'Range from local HEAD to the remote-tracking ref.',
    difficulty: 'medium',
    topic: 'Remotes',
  },
  {
    id: 'git-ex-27',
    prompt: 'Annotated tags are preferred for releases because they:',
    options: [
      'Are faster than lightweight tags',
      'Store a message, author and can be signed',
      'Auto-deploy',
      'Cannot be pushed',
    ],
    correct_index: 1,
    explanation: 'Real objects with metadata.',
    difficulty: 'medium',
    topic: 'Collaboration',
  },
  {
    id: 'git-ex-28',
    prompt: 'Reverting a bad merge that is already public should use:',
    options: [
      'git reset --hard and force-push',
      'git revert -m 1 <merge-sha>',
      'git rebase --root',
      'Deleting the tag',
    ],
    correct_index: 1,
    explanation: 'Append an inverse commit; do not rewrite shared history.',
    difficulty: 'hard',
    topic: 'Recovery',
  },
  {
    id: 'git-ex-29',
    prompt: 'git remote -v output shows:',
    options: [
      'File permissions',
      'Fetch/push URLs per remote name',
      'Branch protection rules only',
      'Stash entries',
    ],
    correct_index: 1,
    explanation: 'origin / upstream URLs.',
    difficulty: 'easy',
    topic: 'Remotes',
  },
  {
    id: 'git-ex-30',
    prompt: 'The safest default when unsure whether to merge or rebase on a shared branch is:',
    options: [
      'Always rebase --force',
      'Follow team policy; prefer merge for public history',
      'Delete the branch',
      'Push --force with lease randomly',
    ],
    correct_index: 1,
    explanation: 'Public history stays intact unless the team agrees otherwise.',
    difficulty: 'medium',
    topic: 'Branching',
  },
];

export function getGitGithubCourse(): Course {
  return {
    id: COURSE_ID,
    slug: 'git-github-mastery',
    title: 'Git & GitHub Mastery',
    subtitle:
      'From first commit to confident collaboration — snapshots, branching, PRs, hooks and disaster recovery',
    description: `Every engineering team runs on Git, yet most students meet it as a pile of half-remembered commands. This course builds the three-area mental model (working tree, staging area, repository) and then layers the skills you will actually use daily: clean commits, branching and merging, pull requests, remotes and forks, stash and cherry-pick, bisect, hooks and reflog recovery.

Short lessons, real command sequences, and a final exam with certificate eligibility. Free forever — Git is infrastructure for your whole career.

**Who this is for:** first-years through final-years in every branch, and anyone about to join a team that uses GitHub.

**What you need:** a machine with Git installed (or a GitHub account to follow along in the browser).`,
    category: 'Tools',
    level: 'beginner',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Git and GitHub Mastery course cover',
    tags: ['git', 'github', 'version-control', 'collaboration', 'tools', 'free', 'placement'],
    outcomes: [
      'Explain working tree, staging area and repository without hand-waving',
      'Create focused commits and read history with log, show and diff',
      'Branch, merge and rebase with a clear sense of when each is safe',
      'Run a fork + PR workflow and write PRs reviewers actually merge',
      'Use stash, cherry-pick, bisect and worktree as daily tools',
      'Recover "lost" commits with reflog and ship hotfixes with revert',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-14T09:00:00.000Z',
    updated_at: '2026-10-14T09:00:00.000Z',
    instructor_id: null,
    about_course: `University lab manuals often teach Git as a list of commands to memorize. This course teaches the model those commands sit on: three places for your files, branches as cheap pointers, and remotes as other people's copies of the same history.

Once the model is solid, the daily skills follow naturally: staging only what belongs in a commit, reviewing history before undoing, opening pull requests that get merged, and recovering from resets and bad merges without panic. The final exam draws from a 30-question bank; the certificate project is a real repository with a feature branch, a tag and a demonstrated recovery.

Each lesson is short, written for phones, and ends with a server-graded quiz.`,
    prerequisites: [
      'Comfort using a terminal or Git Bash (helpful; commands are spelled out)',
      'A free GitHub account if you want to follow along online',
    ],
    audience: [
      'First- through final-year students in every branch joining team projects',
      'Anyone about to contribute to an open-source repository',
      'Students who "use Git" only as git add . && git commit && git push',
      'Placement candidates facing Git questions in interviews',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'career',
    branch_label: 'All branches (career + tools)',
    bucket: 'C',
    certificate_tier: 'foundation',
    estimated_hours: 5,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'Campus placement Git rounds, open-source onboarding, lab vivas',
      units: [
        {
          title: 'Snapshots & History',
          summary:
            'Three areas: working tree, index, repository. Daily loop: edit → status → add → commit. restore undoes files; reset --soft/--mixed/--hard differ in what they keep. reflog tracks where HEAD has been.',
          questions: [
            'Explain the three areas with a real command sequence.',
            'What does git restore --staged do vs git restore file?',
            'How do you recover an unpushed commit after reset --hard?',
          ],
          pyqs: [],
        },
        {
          title: 'Branching & Merging',
          summary:
            'A branch is a pointer. Fast-forward when the target has not diverged; three-way merge creates a merge commit; conflicts need human resolution. Rebase rewrites hashes — never rewrite published history without agreement.',
          questions: [
            'When is a merge a fast-forward?',
            'Difference between merge and rebase?',
            'When is rebase inappropriate?',
          ],
          pyqs: [],
        },
        {
          title: 'Remotes & Collaboration',
          summary:
            'clone copies; fetch downloads without integrating; pull = fetch + integrate; push uploads. Fork flow: origin = your fork, upstream = official. PRs need small diffs and honest descriptions. Tags + Release notes for versions.',
          questions: [
            'fetch vs pull — one paragraph.',
            'What does git push -u origin feature set up?',
            'Describe fork-and-upstream in five commands.',
          ],
          pyqs: [],
        },
        {
          title: 'Advanced & Recovery',
          summary:
            'stash parks WIP; cherry-pick moves one commit; bisect finds regressions; worktree adds a second checkout. Hooks gate commit/push. Secrets: rotate first. Lost commits: reflog; public mistakes: revert.',
          questions: [
            'When would you use bisect?',
            'What does a failing pre-commit hook do?',
            'revert vs reset on a public branch?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Explain the staging area and why selective git add beats git add .',
        'fast-forward vs three-way merge vs rebase — when does each apply?',
        'fetch vs pull — what changes in your working tree?',
        'What does git push -u origin feature set up?',
        'How do you recover an unpushed commit after reset --hard?',
        'When should you use revert instead of reset or force-push?',
        'Purpose of a pre-commit hook and an annotated release tag.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question:
            'Differentiate between git merge and git rebase. State one situation where rebasing is inappropriate.',
          solution:
            'Merge preserves true history with an optional merge commit; rebase replays commits for linear history (new hashes). Inappropriate on commits already pushed to a shared branch.',
        },
        {
          year: '2023',
          question:
            'You ran git reset --hard HEAD~1 by mistake and the commit was never pushed. Outline the exact recovery steps.',
          solution:
            'git reflog → find SHA → git reset --hard <sha> or create a rescue branch from <sha>.',
        },
        {
          year: '2025',
          question:
            'Describe the fork-and-pull workflow in five commands and explain what origin and upstream point to.',
          solution:
            'Fork; clone your fork; add upstream; push feature to origin; open PR. origin = your fork, upstream = official repo.',
        },
      ],
    },
    project: {
      title: 'Team repository simulation',
      brief:
        'Create a repo with a README and LICENSE, develop a feature on a branch, open a PR-style commit history, merge, tag v1.0.0, then deliberately break main and recover it with reflog or revert. Submit the final git log --graph output and a short write-up of each recovery step.',
      submission_hint:
        'Link to your public GitHub repo plus a short write-up (markdown or PDF) covering: commit history, the merge, the tag, and the recovery drill with the exact commands used.',
      required_for_certificate: true,
    },
    exam: {
      question_count: 15,
      duration_minutes: 30,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    modules: [module1, module2, module3, module4],
  };
}
